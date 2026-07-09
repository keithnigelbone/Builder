import { describe, expect, it } from 'vitest';
import { VIDEO_CUSTOM_FORMAT_QUESTION, nextFollowUps } from '../../../App/src/data/videoCustomQuestion';
import type { FollowUpQuestion } from '../../../App/src/ai/schema';

const base: FollowUpQuestion[] = [
  { id: 'video-destination', prompt: 'Where will this video be used?', options: [{ id: 'custom', label: 'Custom' }] },
  { id: 'video-feeling', prompt: 'What should the film feel like?', options: [{ id: 'grounded-real', label: 'Grounded & real' }] },
];

describe('nextFollowUps', () => {
  it('appends the custom step once when Custom is chosen', () => {
    const withCustom = nextFollowUps(base, 'video-destination', 'custom');
    expect(withCustom.map((q) => q.id)).toEqual(['video-destination', 'video-feeling', 'video-custom-format']);
    expect(nextFollowUps(withCustom, 'video-destination', 'custom')).toBe(withCustom);
  });

  it('prunes the custom step when the user backs up and switches away from Custom', () => {
    const withCustom = nextFollowUps(base, 'video-destination', 'custom');
    const pruned = nextFollowUps(withCustom, 'video-destination', 'keynote-agm');
    expect(pruned.map((q) => q.id)).toEqual(['video-destination', 'video-feeling']);
  });

  it('leaves other questions untouched', () => {
    expect(nextFollowUps(base, 'video-feeling', 'grounded-real')).toBe(base);
  });

  it('exports the exact injected question', () => {
    expect(VIDEO_CUSTOM_FORMAT_QUESTION.input).toBe('text');
    expect(VIDEO_CUSTOM_FORMAT_QUESTION.placeholder).toBe('e.g. 16:9 or 1920 × 1080');
  });
});
