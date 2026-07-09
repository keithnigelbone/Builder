import { useState } from 'react';
import { BUILD_CATEGORIES, getBuildCategory } from './data/buildCategories';
import { requestClassification } from './ai/client';
import { generateBuild } from './ai/orchestrator';
import { StartScreen } from './components/StartScreen';
import { GuidedQuestionScreen } from './components/GuidedQuestionScreen';
import { ResultScreen } from './components/ResultScreen';
import type { AIMeta, AppStep, BuildCategory, BuildCategoryId, GuidedAnswers } from './types';

export function App() {
  const [prompt, setPrompt] = useState('');
  const [step, setStep] = useState<AppStep>({ kind: 'start' });
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  const beginGuidedFlow = async (freeformPrompt: string, categoryOverride?: BuildCategoryId) => {
    setBusyLabel('Reading your request…');
    const effectivePrompt = freeformPrompt || `I want to build a ${getBuildCategory(categoryOverride ?? 'website')?.label}.`;
    const classification = await requestClassification(effectivePrompt);
    setBusyLabel(null);

    const category = getBuildCategory(categoryOverride ?? classification.data.category) ?? BUILD_CATEGORIES[0];
    const classifyMeta = {
      source: classification.source,
      reasoning: classification.data.reasoning,
      fallbackReason: classification.fallbackReason,
      model: classification.model,
    };
    // A quick-action click already tells us the category — don't let the
    // model second-guess it, but its follow-up questions are still useful.
    const followUps = classification.data.followUps.length ? classification.data.followUps : category.questions;

    if (followUps.length === 0) {
      await generatePlan(category, {}, {}, freeformPrompt, classifyMeta);
      return;
    }

    setStep({ kind: 'question', category, followUps, questionIndex: 0, answers: {}, answerLabels: {}, freeformPrompt, classifyMeta });
  };

  const generatePlan = async (
    category: BuildCategory,
    answers: GuidedAnswers,
    answerLabels: Record<string, string>,
    freeformPrompt: string,
    classifyMeta: AIMeta,
    refinement?: string,
  ) => {
    setBusyLabel(refinement ? 'Updating your preview…' : 'Designing your preview…');
    const result = await generateBuild({ category: category.id, prompt: freeformPrompt, answers, refinement }, setBusyLabel);
    setBusyLabel(null);

    setStep((prev) => {
      const refinements = prev.kind === 'result' && refinement ? [...prev.request.refinements, refinement] : [];
      return {
        kind: 'result',
        request: {
          category,
          freeformPrompt,
          answers,
          answerLabels,
          refinements,
          plan: result.data,
          classifyMeta,
          planMeta: { source: result.source, reasoning: result.data.reasoning, fallbackReason: result.fallbackReason, model: result.model },
        },
      };
    });
  };

  const handleSelectOption = async (optionId: string) => {
    if (step.kind !== 'question') return;
    const question = step.followUps[step.questionIndex];
    const optionLabel = question.options.find((o) => o.id === optionId)?.label ?? optionId;
    const answers: GuidedAnswers = { ...step.answers, [question.id]: optionId };
    const answerLabels = { ...step.answerLabels, [question.id]: optionLabel };

    // Picking a bespoke video format needs one extra, free-text step. Injected
    // only when Custom is chosen so every other destination stays two-question.
    let followUps = step.followUps;
    if (question.id === 'video-destination' && optionId === 'custom' && !followUps.some((q) => q.id === 'video-custom-format')) {
      followUps = [
        ...followUps,
        {
          id: 'video-custom-format',
          prompt: 'Enter the ratio or size',
          input: 'text',
          placeholder: 'e.g. 16:9 or 1920 × 1080',
          options: [],
        },
      ];
    }

    if (step.questionIndex < followUps.length - 1) {
      setStep({ ...step, followUps, questionIndex: step.questionIndex + 1, answers, answerLabels });
    } else {
      await generatePlan(step.category, answers, answerLabels, step.freeformPrompt, step.classifyMeta);
    }
  };

  const handleBack = () => {
    if (step.kind !== 'question') return;
    if (step.questionIndex === 0) {
      setStep({ kind: 'start' });
    } else {
      setStep({ ...step, questionIndex: step.questionIndex - 1 });
    }
  };

  const handleRefine = async (note: string) => {
    if (step.kind !== 'result') return;
    const { category, answers, answerLabels, freeformPrompt, classifyMeta } = step.request;
    await generatePlan(category, answers, answerLabels, freeformPrompt, classifyMeta, note);
  };

  switch (step.kind) {
    case 'start':
      return (
        <StartScreen
          prompt={prompt}
          onPromptChange={setPrompt}
          busyLabel={busyLabel}
          onSubmitPrompt={() => beginGuidedFlow(prompt)}
          onSelectCategory={(categoryId) => beginGuidedFlow(prompt, categoryId)}
        />
      );
    case 'question':
      return (
        <GuidedQuestionScreen
          category={step.category}
          question={step.followUps[step.questionIndex]}
          questionIndex={step.questionIndex}
          totalQuestions={step.followUps.length}
          selectedOptionId={step.answers[step.followUps[step.questionIndex].id]}
          onSelectOption={handleSelectOption}
          onBack={handleBack}
          busyLabel={busyLabel}
        />
      );
    case 'result':
      return (
        <ResultScreen
          request={step.request}
          busyLabel={busyLabel}
          onRefine={handleRefine}
          onStartOver={() => {
            setPrompt('');
            setStep({ kind: 'start' });
          }}
        />
      );
  }
}
