import { describe, expect, it } from 'vitest';
import { fallbackPlan, fallbackClassify } from '../../../App/src/ai/fallbackPlan';

describe('fallback video concept', () => {
  const plan = fallbackPlan({ category: 'video', prompt: 'an AGM film', answers: {} }, 'no key').data;

  it('is a complete storyboard concept', () => {
    expect(plan.headline).toBeTruthy();
    expect(plan.recommendedDuration).toBeTruthy();
    expect(plan.openingShot).toBeTruthy();
    expect(plan.keyScenes?.length).toBeGreaterThanOrEqual(3);
    expect(plan.keyScenes?.[0].title).toBeTruthy();
    expect(plan.keyScenes?.[0].description).toBeTruthy();
    expect(plan.closingFrame).toBeTruthy();
    expect(plan.voiceoverCopy).toBeTruthy();
    expect(plan.patternId).toBe('video-storyboard');
  });

  it('carries a complete art-directed scene like the other media categories', () => {
    expect(plan.imageSubject).toBeTruthy();
    expect(plan.imageFraming).toBeTruthy();
  });
});

describe('video classification keywords', () => {
  it('routes film/AGM language to video even when app words appear', () => {
    expect(fallbackClassify('An AGM film about our energy app', 'x').data.category).toBe('video');
  });

  it('leaves motion words routing to motion (Motion unchanged)', () => {
    expect(fallbackClassify('a loader micro-interaction', 'x').data.category).toBe('motion');
  });
});
