import type { BuildCategoryId, GuidedAnswers } from '../types';
import { BUILD_CATEGORIES } from '../data/buildCategories';
import { AVAILABLE_COMPONENTS } from '../data/oneuiRegistry';
import { fallbackClassify, fallbackPlan } from './fallbackPlan';
import type { AIResult, BuildPlan, ClassifyResult, FollowUpQuestion } from './schema';
import { resolvePatternId } from '../data/patternRegistry';

const VALID_CATEGORY_IDS = new Set(BUILD_CATEGORIES.map((c) => c.id));
const AVAILABLE_COMPONENT_NAMES = new Set(AVAILABLE_COMPONENTS.map((c) => c.name));

async function postToClaude(
  body: unknown,
): Promise<{ ok: true; result: unknown; model?: string } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? `HTTP ${res.status}` };
    return { ok: true, result: json.result, model: typeof json.model === 'string' ? json.model : undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error reaching the local Claude proxy' };
  }
}

/**
 * Claude's structured output isn't always schema-compliant in practice — an
 * array field can come back as a malformed string instead (observed live:
 * `navItems` arrived as `"About\", \"Businesses\", ..."` rather than a real
 * array), which would otherwise crash the first component that calls
 * `.map()` on it. Drop the field back to `undefined` rather than trust it.
 */
function asArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
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
  if (response.ok === false) return fallbackClassify(prompt, response.error);

  const raw = response.result as Partial<ClassifyResult> | null;
  const category = raw?.category && VALID_CATEGORY_IDS.has(raw.category) ? raw.category : undefined;
  if (!category) return fallbackClassify(prompt, 'Claude returned an unrecognized category.');

  return {
    source: 'claude',
    model: response.model,
    data: {
      category,
      reasoning: raw?.reasoning || 'Classified by Claude.',
      followUps: sanitizeFollowUps(raw?.followUps),
    },
  };
}

export interface PlanInput {
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
  if (response.ok === false) return fallbackPlan(input, response.error);

  const raw = response.result as Partial<BuildPlan> | null;
  if (!raw || typeof raw.headline !== 'string') {
    return fallbackPlan(input, 'Claude returned an incomplete plan.');
  }

  // Never trust component names from the model without cross-checking the real registry.
  const recommendedComponentNames = Array.isArray(raw.recommendedComponentNames)
    ? raw.recommendedComponentNames.filter((name) => AVAILABLE_COMPONENT_NAMES.has(name))
    : [];

  const data: BuildPlan = {
    ...raw,
    navItems: asArray(raw.navItems),
    sections: asArray(raw.sections),
    newsItems: asArray(raw.newsItems),
    contentBlocks: asArray(raw.contentBlocks),
    screenNavItems: asArray(raw.screenNavItems),
    slides: asArray(raw.slides),
    carouselFrames: asArray(raw.carouselFrames),
    recommendedComponentNames,
    reasoning: raw.reasoning || 'Authored by Claude.',
  };
  data.patternId = resolvePatternId(input.category, {
    patternId: typeof raw.patternId === 'string' ? raw.patternId : undefined,
    socialFormat: data.socialFormat,
    motionConcept: data.motionConcept,
  });

  return { source: 'claude', model: response.model, data };
}

export async function requestCritique(
  category: BuildCategoryId,
  prompt: string,
  draftPlan: BuildPlan,
): Promise<{ ok: true; revision: Partial<BuildPlan> & { qualityNotes?: string }; model?: string } | { ok: false; error: string }> {
  const response = await postToClaude({ type: 'critique', category, prompt, draftPlan });
  if (response.ok === false) return { ok: false, error: response.error };
  const revision = response.result;
  if (!revision || typeof revision !== 'object') return { ok: false, error: 'Claude returned an empty critique.' };
  return { ok: true, revision: revision as Partial<BuildPlan> & { qualityNotes?: string }, model: response.model };
}
