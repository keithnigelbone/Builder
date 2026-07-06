import { relianceTokensWithPrefix } from './relianceBrandMeta';

/**
 * Maps a "what should the motion communicate?" answer to real Reliance
 * motion tokens (see relianceBrandMeta.ts — these are only ever names
 * Reliance's own brand.css actually defines, never invented). Falls back to
 * the fastest/slowest available token if a preferred name isn't present,
 * rather than assuming an exact set.
 */
const DURATION_BY_FEELING: Record<string, string[]> = {
  speed: ['Motion-Duration-XS', 'Motion-Duration-2XS'],
  energy: ['Motion-Duration-XS', 'Motion-Duration-S'],
  confidence: ['Motion-Duration-M', 'Motion-Duration-S'],
  trust: ['Motion-Duration-M', 'Motion-Duration-L'],
  progress: ['Motion-Duration-L', 'Motion-Duration-M'],
  intelligence: ['Motion-Duration-S', 'Motion-Duration-M'],
};

const EASING_BY_FEELING: Record<string, string[]> = {
  speed: ['Motion-Easing-Bounce-Moderate', 'Motion-Easing-Entrance-Moderate'],
  energy: ['Motion-Easing-Bounce-Moderate', 'Motion-Easing-Bounce-Subtle'],
  confidence: ['Motion-Easing-Transition-Moderate'],
  trust: ['Motion-Easing-Transition-Moderate', 'Motion-Easing-Transition-Subtle'],
  progress: ['Motion-Easing-Linear'],
  intelligence: ['Motion-Easing-Entrance-Subtle', 'Motion-Easing-Transition-Subtle'],
};

function pick(preferred: string[] | undefined, available: string[]): string | undefined {
  return preferred?.find((name) => available.includes(name)) ?? available[0];
}

export interface MotionTokenChoice {
  duration?: string;
  easing?: string;
}

export function pickMotionTokens(feelingAnswerId: string | undefined): MotionTokenChoice {
  const durations = relianceTokensWithPrefix('Motion-Duration-').filter((n) => !n.includes('Subtle'));
  const easings = relianceTokensWithPrefix('Motion-Easing-');
  return {
    duration: pick(feelingAnswerId ? DURATION_BY_FEELING[feelingAnswerId] : undefined, durations),
    easing: pick(feelingAnswerId ? EASING_BY_FEELING[feelingAnswerId] : undefined, easings),
  };
}
