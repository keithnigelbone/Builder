import { describe, expect, it } from 'vitest';
import {
  BUILD_PATTERNS,
  getDefaultPattern,
  getPattern,
  getPatternsForCategory,
  resolvePatternId,
} from '../../../App/src/data/patternRegistry';
import { AVAILABLE_COMPONENTS } from '../../../App/src/data/oneuiRegistry';
import { BUILD_CATEGORIES } from '../../../App/src/data/buildCategories';

const AVAILABLE_NAMES = new Set(AVAILABLE_COMPONENTS.map((c) => c.name));

describe('pattern registry integrity', () => {
  it('has unique pattern ids', () => {
    const ids = BUILD_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every category at least one pattern and a default', () => {
    for (const category of BUILD_CATEGORIES) {
      expect(getPatternsForCategory(category.id).length).toBeGreaterThan(0);
      expect(getDefaultPattern(category.id).category).toBe(category.id);
    }
  });

  it('only ever composes Storybook-story-backed, released OneUI components', () => {
    for (const pattern of BUILD_PATTERNS) {
      expect(pattern.storyComponents.length).toBeGreaterThan(0);
      for (const name of pattern.storyComponents) {
        expect(AVAILABLE_NAMES.has(name), `${pattern.id} references ${name}, which has no story`).toBe(true);
      }
    }
  });

  it('declares every id fallbackPlan.ts uses as a per-category default', () => {
    for (const id of ['product-story', 'dashboard', 'deck', 'announcement', 'loader']) {
      expect(getPattern(id), `fallbackPlan default "${id}" missing from registry`).toBeDefined();
    }
  });
});

describe('resolvePatternId', () => {
  it('honors a valid free choice for website and app-screens', () => {
    expect(resolvePatternId('website', { patternId: 'campaign-hero' })).toBe('campaign-hero');
    expect(resolvePatternId('app-screens', { patternId: 'checkout' })).toBe('checkout');
  });

  it('falls back to the category default for unknown or cross-category ids', () => {
    expect(resolvePatternId('website', { patternId: 'not-real' })).toBe(getDefaultPattern('website').id);
    expect(resolvePatternId('website', { patternId: 'checkout' })).toBe(getDefaultPattern('website').id);
  });

  it('derives social patterns from socialFormat, ignoring any authored patternId', () => {
    expect(resolvePatternId('social-media', { patternId: 'campaign-hero', socialFormat: 'story' })).toBe('story-vertical');
    expect(resolvePatternId('social-media', { socialFormat: 'carousel' })).toBe('carousel');
    expect(resolvePatternId('social-media', {})).toBe('announcement');
  });

  it('derives motion patterns from motionConcept and slides is always deck', () => {
    expect(resolvePatternId('motion', { motionConcept: 'product-reveal' })).toBe('product-reveal');
    expect(resolvePatternId('motion', {})).toBe('loader');
    expect(resolvePatternId('slides', { patternId: 'whatever' })).toBe('deck');
  });
});
