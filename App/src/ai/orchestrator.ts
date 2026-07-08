import type { AIResult, BuildPlan } from './schema';
import { requestCritique, requestPlan, type PlanInput } from './client';
import { requestHeroImage } from '../media/imageGenerator';

/**
 * Composes the build pipeline: plan → critique → media. client.ts stays the
 * thin transport layer; this module owns sequencing, the content-only
 * critique merge, and honest stage labels for the UI. Every stage degrades:
 * a failed critique ships the draft (noted in qualityNotes), failed media
 * ships no image — the preview always renders.
 */

/** Plan fields the critique may revise — content only, mirroring the server-side CRITIQUE_TOOL. */
const CONTENT_REVISION_KEYS = [
  'headline',
  'subheadline',
  'body',
  'kicker',
  'ctaLabel',
  'navItems',
  'sections',
  'quote',
  'newsItems',
  'contactHeadline',
  'screenTitle',
  'contentBlocks',
  'screenNavItems',
  'slides',
  'carouselFrames',
  'badgeLabel',
  'motionDescription',
  'imageSubject',
  'imageAction',
  'imageLocation',
  'imageFraming',
  'imageIsAerial',
  'imageColourNotes',
] as const;

/** Fields that must be real arrays — same malformed-string defence client.ts applies to plan responses. */
const ARRAY_KEYS = new Set<string>(['navItems', 'sections', 'newsItems', 'contentBlocks', 'screenNavItems', 'slides', 'carouselFrames']);

export function mergeCritique(draft: BuildPlan, revision: Partial<BuildPlan> & { qualityNotes?: string }): BuildPlan {
  const merged: BuildPlan = { ...draft };
  for (const key of CONTENT_REVISION_KEYS) {
    const value = revision[key];
    if (value === undefined) continue;
    if (ARRAY_KEYS.has(key) && !Array.isArray(value)) continue;
    (merged as unknown as Record<string, unknown>)[key] = value;
  }
  if (typeof revision.qualityNotes === 'string') merged.qualityNotes = revision.qualityNotes;
  return merged;
}

export async function generateBuild(input: PlanInput, onStage?: (label: string) => void): Promise<AIResult<BuildPlan>> {
  onStage?.('Designing your preview…');
  const planResult = await requestPlan(input);
  let plan = planResult.data;

  // Only critique real Claude drafts — fallbackPlan.ts's deterministic
  // content is honest placeholder copy; "improving" it would only disguise
  // that Claude was unavailable.
  if (planResult.source === 'claude') {
    onStage?.('Reviewing the design…');
    const critique = await requestCritique(input.category, input.prompt, plan);
    // `=== true` (not a bare truthy check) — with this project's `strict: false`
    // tsconfig, TS's discriminated-union narrowing only kicks in on an explicit
    // literal comparison, matching the `response.ok === false` idiom in client.ts.
    plan = critique.ok === true ? mergeCritique(plan, critique.revision) : { ...plan, qualityNotes: `Quality review skipped: ${critique.error}` };
  }

  onStage?.('Art-directing the imagery…');
  plan.heroImage = await requestHeroImage(plan);

  return { ...planResult, data: plan };
}
