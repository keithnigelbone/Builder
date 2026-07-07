import { describe, expect, it } from 'vitest';
import { fallbackPlan } from '../../../App/src/ai/fallbackPlan';
import type { BuildPlan, CarouselFrame, SlideContent } from '../../../App/src/ai/schema';

describe('BuildPlan new fields', () => {
  it('accepts patternId, carouselFrames, qualityNotes, and stat/closing slides', () => {
    const frames: CarouselFrame[] = [{ headline: 'One' }, { headline: 'Two', body: 'Detail' }];
    const slides: SlideContent[] = [
      { slideType: 'stat', headline: 'Growth', statValue: '42%', statLabel: 'YoY' },
      { slideType: 'closing', headline: 'Thank you.' },
    ];
    const plan: BuildPlan = {
      patternId: 'campaign-hero',
      carouselFrames: frames,
      qualityNotes: 'Tightened the headline.',
      slides,
      recommendedComponentNames: [],
      reasoning: '',
    };

    expect(plan.patternId).toBe('campaign-hero');
    expect(plan.slides?.[0].statValue).toBe('42%');
  });
});

describe('fallbackPlan pattern defaults', () => {
  const input = { prompt: 'x', answers: {} };

  it.each([
    ['website', 'product-story'],
    ['app-screens', 'dashboard'],
    ['slides', 'deck'],
    ['social-media', 'announcement'],
    ['motion', 'loader'],
  ] as const)('assigns the %s default pattern %s', (category, patternId) => {
    expect(fallbackPlan({ ...input, category }, 'why').data.patternId).toBe(patternId);
  });

  it('always provides carousel frames so a carousel build never renders empty', () => {
    const frames = fallbackPlan({ ...input, category: 'social-media' }, 'why').data.carouselFrames;
    expect(frames?.length).toBeGreaterThanOrEqual(3);
    expect(frames?.[0].headline).toBeTruthy();
  });

  it('includes stat and closing slides in the fallback deck', () => {
    const slides = fallbackPlan({ ...input, category: 'slides' }, 'why').data.slides ?? [];
    expect(slides.some((s) => s.slideType === 'stat' && s.statValue)).toBe(true);
    expect(slides.at(-1)?.slideType).toBe('closing');
  });
});
