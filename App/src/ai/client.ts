import type { BuildCategoryId, GuidedAnswers } from '../types';
import { BUILD_CATEGORIES } from '../data/buildCategories';
import { AVAILABLE_COMPONENTS } from '../data/oneuiRegistry';
import { fallbackClassify, fallbackPlan } from './fallbackPlan';
import type { AIResult, BuildPlan, ClassifyResult, FollowUpQuestion } from './schema';

const VALID_CATEGORY_IDS = new Set(BUILD_CATEGORIES.map((c) => c.id));
const AVAILABLE_COMPONENT_NAMES = new Set(AVAILABLE_COMPONENTS.map((c) => c.name));

async function postToClaude(body: unknown): Promise<{ ok: true; result: unknown } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? `HTTP ${res.status}` };
    return { ok: true, result: json.result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error reaching the local Claude proxy' };
  }
}

function sanitizeFollowUps(raw: unknown): FollowUpQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (q): q is FollowUpQuestion =>
        !!q && typeof q.id === 'string' && typeof q.prompt === 'string' && Array.isArray(q.options) && q.options.length >= 2,
    )
    .slice(0, 2);
}

export async function requestClassification(prompt: string): Promise<AIResult<ClassifyResult>> {
  const response = await postToClaude({ type: 'classify', prompt });
  if (!response.ok) return fallbackClassify(prompt, response.error);

  const raw = response.result as Partial<ClassifyResult> | null;
  const category = raw?.category && VALID_CATEGORY_IDS.has(raw.category) ? raw.category : undefined;
  if (!category) return fallbackClassify(prompt, 'Claude returned an unrecognized category.');

  return {
    source: 'claude',
    data: {
      category,
      reasoning: raw?.reasoning || 'Classified by Claude.',
      followUps: sanitizeFollowUps(raw?.followUps),
    },
  };
}

interface PlanInput {
  category: BuildCategoryId;
  prompt: string;
  answers: GuidedAnswers;
  refinement?: string;
}

export async function requestPlan(input: PlanInput): Promise<AIResult<BuildPlan>> {
  const response = await postToClaude({
    type: 'plan',
    category: input.category,
    prompt: input.prompt,
    answers: input.answers,
    refinement: input.refinement,
    availableComponents: [...AVAILABLE_COMPONENT_NAMES],
  });
  if (!response.ok) return fallbackPlan(input, response.error);

  const raw = response.result as Partial<BuildPlan> | null;
  if (!raw || typeof raw.headline !== 'string') {
    return fallbackPlan(input, 'Claude returned an incomplete plan.');
  }

  // Never trust component names from the model without cross-checking the real registry.
  const recommendedComponentNames = Array.isArray(raw.recommendedComponentNames)
    ? raw.recommendedComponentNames.filter((name) => AVAILABLE_COMPONENT_NAMES.has(name))
    : [];

  return {
    source: 'claude',
    data: {
      ...raw,
      recommendedComponentNames,
      reasoning: raw.reasoning || 'Authored by Claude.',
    },
  };
}
