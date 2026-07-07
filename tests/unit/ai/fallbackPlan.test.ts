import { describe, expect, it } from 'vitest';
import { fallbackClassify, fallbackPlan } from '../../../App/src/ai/fallbackPlan';

describe('fallbackClassify', () => {
  it('infers app-screens from onboarding/checkout keywords', () => {
    const result = fallbackClassify('a checkout screen for our app', 'no API key');
    expect(result.source).toBe('fallback');
    expect(result.fallbackReason).toBe('no API key');
    expect(result.data.category).toBe('app-screens');
    expect(result.data.followUps).toHaveLength(2);
  });

  it('infers slides from presentation keywords', () => {
    expect(fallbackClassify('a pitch deck for investors', 'x').data.category).toBe('slides');
  });

  it('infers social-media from social keywords', () => {
    expect(fallbackClassify('an instagram carousel post', 'x').data.category).toBe('social-media');
  });

  it('infers motion from animation keywords', () => {
    expect(fallbackClassify('a loading animation', 'x').data.category).toBe('motion');
  });

  it('defaults to website when nothing matches', () => {
    expect(fallbackClassify('something vague', 'x').data.category).toBe('website');
  });
});

describe('fallbackPlan', () => {
  it('produces category-specific headline and only real component names', () => {
    const result = fallbackPlan({ category: 'app-screens', prompt: '', answers: {} }, 'network error');

    expect(result.source).toBe('fallback');
    expect(result.fallbackReason).toBe('network error');
    expect(result.data.headline).toBe('Home');
    expect(result.data.recommendedComponentNames.length).toBeGreaterThan(0);
  });

  it('folds guided answers into the recommended components', () => {
    const withoutAnswer = fallbackPlan({ category: 'website', prompt: '', answers: {} }, 'x');
    const withAnswer = fallbackPlan(
      { category: 'website', prompt: '', answers: { 'website-goal': 'sell' } },
      'x',
    );

    expect(withAnswer.data.recommendedComponentNames).toContain('Chip');
    expect(withoutAnswer.data.recommendedComponentNames).not.toContain('Chip');
  });

  it('includes generic quote, news, and contact content for every category', () => {
    const result = fallbackPlan({ category: 'website', prompt: '', answers: {} }, 'x');

    expect(result.data.quote).toEqual({ text: 'A short quote goes here.', name: 'Name', title: 'Title' });
    expect(result.data.newsItems).toHaveLength(3);
    expect(result.data.newsItems?.[0]).toEqual({ title: 'Update headline', date: 'Date' });
    expect(result.data.contactHeadline).toBe('Get in touch.');
  });
});
