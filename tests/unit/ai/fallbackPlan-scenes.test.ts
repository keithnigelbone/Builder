import { describe, expect, it } from 'vitest';
import { fallbackPlan } from '../../../App/src/ai/fallbackPlan';

const input = { prompt: 'a rooftop solar campaign', answers: {} };

describe('fallbackPlan scene templates', () => {
  it.each(['website', 'app-screens', 'social-media', 'motion'] as const)('gives %s a complete art-directed scene', (category) => {
    const plan = fallbackPlan({ ...input, category }, 'no key').data;

    expect(plan.imageSubject).toBeTruthy();
    expect(plan.imageAction).toBeTruthy();
    expect(plan.imageLocation).toBeTruthy();
    expect(plan.imageFraming).toBeTruthy();
  });

  it('gives slides no scene', () => {
    const plan = fallbackPlan({ ...input, category: 'slides' }, 'no key').data;

    expect(plan.imageSubject).toBeUndefined();
    expect(plan.imageFraming).toBeUndefined();
  });

  it('says so honestly in the reasoning when a scene is applied', () => {
    expect(fallbackPlan({ ...input, category: 'website' }, 'no key').data.reasoning).toContain('curated art-directed scene');
    expect(fallbackPlan({ ...input, category: 'slides' }, 'no key').data.reasoning).not.toContain('curated art-directed scene');
  });

  it('keeps the same scene for the same prompt (stable across refinements)', () => {
    const a = fallbackPlan({ ...input, category: 'motion' }, 'no key').data;
    const b = fallbackPlan({ ...input, category: 'motion' }, 'no key').data;

    expect(a.imageSubject).toBe(b.imageSubject);
  });
});
