import type { BuildPlan } from './schema';
import { assembleImagePrompt } from '../media/imageGenerator';

/**
 * The Veo-ready prompt is assembled by the app, never authored whole by the
 * model: the art-directed scene + visual baseline, the storyboard beats the
 * model DID author, and the destination format block (exact ratio and
 * dimensions — Veo generates at the nearest supported aspect, the prompt
 * composes for the true target).
 */
export function assembleVideoPrompt(plan: BuildPlan): string {
  const beats = [
    plan.openingShot ? `Opening shot: ${plan.openingShot}` : '',
    ...(plan.keyScenes ?? []).map((s, i) => `Scene ${i + 1} — ${s.title}: ${s.description}`),
    plan.closingFrame ? `Closing frame: ${plan.closingFrame}` : '',
  ].filter(Boolean);

  const f = plan.videoFormat;

  return [
    assembleImagePrompt(plan),
    plan.body ? `Visual direction: ${plan.body}` : '',
    beats.join('\n'),
    plan.voiceoverCopy ? `On-screen/voiceover copy: "${plan.voiceoverCopy}"` : '',
    f
      ? `Format: ${f.label}. Deliver at ${f.ratio} (${f.width}×${f.height}). Safe areas: ${f.safeArea.join(' ')}${
          plan.recommendedDuration ? ` Recommended duration: ${plan.recommendedDuration}.` : ''
        }`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}
