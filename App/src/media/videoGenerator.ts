import type { BuildPlan } from '../ai/schema';
import { assembleImagePrompt } from './imageGenerator';

/**
 * Client half of motion-video generation ("media/videoGenerator"). The same
 * Claude-authored art-directed scene that produced the hero image drives the
 * video prompt; the hero image itself (when present) is passed as the start
 * frame. Errors come back as a message the UI renders — never a throw.
 */
export async function requestMotionVideo(plan: BuildPlan): Promise<{ videoUrl?: string; error?: string }> {
  if (!plan.imageSubject || !plan.imageAction || !plan.imageLocation || !plan.imageFraming) {
    return { error: 'This build has no art-directed scene to animate yet.' };
  }

  try {
    const res = await fetch('/api/gemini-video', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: assembleImagePrompt(plan), startImageDataUrl: plan.heroImage }),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? `HTTP ${res.status}` };
    return { videoUrl: typeof json.result?.videoUrl === 'string' ? json.result.videoUrl : undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error reaching the local video proxy' };
  }
}
