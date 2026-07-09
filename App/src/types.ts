import type { BuildPlan, FollowUpQuestion } from './ai/schema';

export type BuildCategoryId = 'website' | 'app-screens' | 'slides' | 'social-media' | 'motion' | 'video';

export interface QuestionOption {
  id: string;
  label: string;
}

export interface GuidedQuestion {
  id: string;
  prompt: string;
  options: QuestionOption[];
}

export interface BuildCategory {
  id: BuildCategoryId;
  label: string;
  /** Short line shown on the quick-action chip / category header. */
  description: string;
  /** Default guided questions — used as the fallback follow-ups when Claude is unavailable. */
  questions: [GuidedQuestion, GuidedQuestion];
}

/** Answers collected from the guided follow-up questions, keyed by question id. */
export type GuidedAnswers = Record<string, string>;

/** Where a piece of AI output actually came from — shown honestly in Build details. */
export interface AIMeta {
  source: 'claude' | 'fallback';
  reasoning: string;
  fallbackReason?: string;
  /** Which Claude model authored this stage, when source is 'claude'. */
  model?: string;
}

export interface BuildRequest {
  category: BuildCategory;
  /** What the user typed on the start screen, if anything. */
  freeformPrompt: string;
  answers: GuidedAnswers;
  /** Human-readable label for each answer, keyed the same as `answers` — for display only. */
  answerLabels: Record<string, string>;
  /** Follow-up notes added from the result screen's "Refine prompt" field. */
  refinements: string[];
  plan: BuildPlan;
  classifyMeta: AIMeta;
  planMeta: AIMeta;
}

export type AppStep =
  | { kind: 'start' }
  | {
      kind: 'question';
      category: BuildCategory;
      followUps: FollowUpQuestion[];
      questionIndex: number;
      answers: GuidedAnswers;
      answerLabels: Record<string, string>;
      freeformPrompt: string;
      classifyMeta: AIMeta;
    }
  | { kind: 'result'; request: BuildRequest };
