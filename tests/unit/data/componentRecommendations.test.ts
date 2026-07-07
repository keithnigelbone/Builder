import { describe, expect, it } from 'vitest';
import { isKnownComponent, recommendComponents } from '../../../App/src/data/componentRecommendations';
import { AVAILABLE_COMPONENTS } from '../../../App/src/data/oneuiRegistry';

describe('recommendComponents', () => {
  it('returns only components that exist in the real registry', () => {
    const recommended = recommendComponents('website', {});
    const availableNames = new Set(AVAILABLE_COMPONENTS.map((c) => c.name));

    expect(recommended.length).toBeGreaterThan(0);
    for (const { meta } of recommended) {
      expect(availableNames.has(meta.name)).toBe(true);
    }
  });

  it('adds extra components implied by an answer, on top of the category base', () => {
    const base = recommendComponents('slides', {});
    const withDataSlide = recommendComponents('slides', { 'slide-type': 'data-slide' });

    const baseNames = base.map((c) => c.meta.name);
    const withDataSlideNames = withDataSlide.map((c) => c.meta.name);

    expect(withDataSlideNames.length).toBeGreaterThanOrEqual(baseNames.length);
    expect(withDataSlideNames).toEqual(expect.arrayContaining(baseNames));
  });

  it('labels core category components differently from answer-driven additions', () => {
    const recommended = recommendComponents('social-media', { 'social-format': 'carousel' });
    const core = recommended.find((c) => c.meta.name === 'Image');
    const addition = recommended.find((c) => c.meta.name === 'PaginationDots');

    expect(core?.reason).toMatch(/Core .* component/);
    expect(addition?.reason).toBe("Matches one of your answers");
  });

  it('silently ignores answer ids with no matching addition', () => {
    expect(() => recommendComponents('website', { 'website-goal': 'inform' })).not.toThrow();
  });
});

describe('isKnownComponent', () => {
  it('is true for a component that really ships', () => {
    expect(isKnownComponent('Button')).toBe(true);
  });

  it('is false for a made-up name', () => {
    expect(isKnownComponent('DefinitelyNotARealComponent')).toBe(false);
  });
});
