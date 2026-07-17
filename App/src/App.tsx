import { useEffect, useState } from 'react';
import { Container, Button } from '@jds4/oneui-react';
import { BUILD_CATEGORIES, getBuildCategory, initialFollowUps } from './data/buildCategories';
import { requestClassification } from './ai/client';
import { generateBuild } from './ai/orchestrator';
import { StartScreen } from './components/StartScreen';
import { GuidedQuestionScreen } from './components/GuidedQuestionScreen';
import { ResultScreen } from './components/ResultScreen';
import { CMSSidebar } from './components/cms/CMSSidebar';
import { nextFollowUps } from './data/videoCustomQuestion';
import * as cmsFileService from './services/cmsFileService';
import type { AIMeta, AppStep, BuildCategory, BuildCategoryId, CmsEdits, ContentTypeId, GuidedAnswers } from './types';
import styles from './App.module.css';

const CMS_CONTENT_TYPES: { id: ContentTypeId; label: string }[] = [
  { id: 'appscreen', label: 'App Screen' },
  { id: 'video', label: 'Video' },
  { id: 'social', label: 'Social Card' },
  { id: 'motion', label: 'Motion' },
  { id: 'slide', label: 'Slide' },
];

export function App() {
  const [prompt, setPrompt] = useState('');
  const [step, setStep] = useState<AppStep>({ kind: 'start' });
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [isCmsOpen, setIsCmsOpen] = useState(false);
  const [cmsContentType, setCmsContentType] = useState<ContentTypeId>('appscreen');
  // Live CMS field overrides, lifted from CMSEditor (via CMSSidebar's
  // onEditsChange) on every keystroke and mirrored straight down to
  // BuildPreview through ResultScreen — see the data-flow comment in
  // ResultScreen.tsx / BuildPreview.tsx. Undefined (not `{}`) until the
  // first edit, so BuildPreview renders the plan unchanged until then.
  const [cmsEdits, setCmsEdits] = useState<CmsEdits | undefined>(undefined);
  // Mirrors CMSEditor's own unsavedChanges flag (lifted via CMSSidebar's
  // onUnsavedChangesChange) so App can guard closing the CMS editor and
  // leaving/reloading the tab with a confirmation — CMSEditor itself has no
  // way to intercept either of those, since both originate outside it.
  const [hasUnsavedCmsEdits, setHasUnsavedCmsEdits] = useState(false);

  // Derived, not duplicated: the active build request already lives on
  // `step` once a build has been generated (step.kind === 'result'), so
  // there's nothing to keep separately in sync here — this just gives the
  // CMS layout a short, clearly-named handle on it.
  const buildRequest = step.kind === 'result' ? step.request : undefined;

  // Reload/close the browser tab with unsaved CMS edits pending -> the
  // browser shows its own native confirmation. The message string here is
  // ignored by all modern browsers, which show a fixed message of their own.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedCmsEdits) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedCmsEdits]);

  const handleToggleCms = () => {
    // Only guard the close (open -> closed) direction, and only when there's
    // something the user would actually lose.
    if (isCmsOpen && hasUnsavedCmsEdits) {
      if (!window.confirm('You have unsaved changes. Discard?')) return;
      setCmsEdits(undefined);
      setHasUnsavedCmsEdits(false);
    }
    setIsCmsOpen(!isCmsOpen);
  };

  const handleSetCmsContentType = (type: ContentTypeId) => setCmsContentType(type);

  const handleCmsSave = async (label: string, edits: CmsEdits) => {
    if (!buildRequest) return;
    const { plan, refinements } = buildRequest;
    const buildId = cmsFileService.deriveBuildId(buildRequest);
    await cmsFileService.saveVersionToFile(
      { buildId, contentType: cmsContentType, label, timestamp: new Date().toISOString() },
      edits,
      { plan, refinements }
    );
  };

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
    const followUps = initialFollowUps(category, classification.data.followUps);

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

    // A new plan (fresh build or refinement) invalidates any in-progress CMS
    // edits made against the previous content — carrying them forward would
    // silently overwrite the new plan's fields with stale values.
    setCmsEdits(undefined);

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
    // only when Custom is chosen so every other destination stays two-question,
    // and pruned again if the user backs up and switches away from Custom.
    const followUps = nextFollowUps(step.followUps, question.id, optionId);

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
        <Container variant="full-bleed" className={styles.layout}>
          <CMSSidebar
            isOpen={isCmsOpen}
            onToggle={handleToggleCms}
            buildRequest={step.request}
            contentType={cmsContentType}
            onSave={handleCmsSave}
            onEditsChange={setCmsEdits}
            onUnsavedChangesChange={setHasUnsavedCmsEdits}
          />
          <Container
            variant="full-bleed"
            layout="flex"
            direction="column"
            className={isCmsOpen ? `${styles.mainContent} ${styles.mainContentShifted}` : styles.mainContent}
          >
            <Container variant="full-bleed" className={styles.cmsToolbar}>
              <Button attention="high" onClick={handleToggleCms}>
                {isCmsOpen ? 'Hide CMS Editor' : 'Edit Content'}
              </Button>
              <select
                aria-label="CMS content type"
                value={cmsContentType}
                onChange={(e) => handleSetCmsContentType(e.target.value as ContentTypeId)}
              >
                {CMS_CONTENT_TYPES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Container>

            <ResultScreen
              request={step.request}
              busyLabel={busyLabel}
              onRefine={handleRefine}
              onStartOver={() => {
                setPrompt('');
                setStep({ kind: 'start' });
              }}
              cmsEdits={cmsEdits}
            />
          </Container>
        </Container>
      );
  }
}
