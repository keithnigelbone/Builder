import type { BuildPlan } from '../ai/schema';
import { RELIANCE_VISUAL_BASELINE, RELIANCE_VISUAL_BASELINE_AERIAL } from '../ai/artDirection';

/**
 * Client half of image generation ("media/imageGenerator"): Claude authors
 * the scene as separate art-directed fields (see ai/artDirection.ts), this
 * module assembles them with the fixed visual baseline and calls the local
 * Gemini proxy. Failure of any kind means "no image" — never a blocked
 * preview.
 */
export function assembleImagePrompt(
  plan: Pick<BuildPlan, 'imageSubject' | 'imageAction' | 'imageLocation' | 'imageFraming' | 'imageIsAerial' | 'imageColourNotes'>,
): string {
  const baseline = plan.imageIsAerial
    ? RELIANCE_VISUAL_BASELINE_AERIAL.replace('{{colourNotes}}', plan.imageColourNotes || 'natural')
    : RELIANCE_VISUAL_BASELINE;
  return [plan.imageSubject, plan.imageAction, plan.imageLocation, plan.imageFraming, baseline].join('\n');
}

export async function requestHeroImage(plan: BuildPlan): Promise<string | undefined> {
  if (!plan.imageSubject || !plan.imageAction || !plan.imageLocation || !plan.imageFraming) return undefined;

  try {
    const res = await fetch('/api/gemini-image', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: assembleImagePrompt(plan) }),
    });
    const json = await res.json();
    if (!res.ok) return undefined;
    return typeof json.result?.dataUrl === 'string' ? json.result.dataUrl : undefined;
  } catch {
    return undefined;
  }
}
