import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateBuild, mergeCritique, CONTENT_REVISION_KEYS } from '../../../App/src/ai/orchestrator';
import * as client from '../../../App/src/ai/client';
import * as imageGenerator from '../../../App/src/media/imageGenerator';
import type { BuildPlan } from '../../../App/src/ai/schema';
import { CRITIQUE_TOOL } from '../../../App/aiServerPlugin';

vi.mock('../../../App/src/ai/client', async (importOriginal) => {
  const original = await importOriginal<typeof client>();
  return { ...original, requestPlan: vi.fn(), requestCritique: vi.fn() };
});
vi.mock('../../../App/src/media/imageGenerator', () => ({ requestHeroImage: vi.fn().mockResolvedValue(undefined) }));

const draft: BuildPlan = {
  headline: 'Draft headline',
  patternId: 'campaign-hero',
  navItems: ['One', 'Two'],
  sections: [{ title: 'Section 1', body: 'Body text' }],
  newsItems: [{ title: 'News', date: '2026-01-01' }],
  contentBlocks: [{ type: 'action', label: 'Go' }],
  screenNavItems: [{ label: 'Home', icon: 'home' }],
  slides: [{ slideType: 'content', headline: 'Headline' }],
  carouselFrames: [{ headline: 'Frame' }],
  recommendedComponentNames: ['Button'],
  reasoning: 'draft',
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('mergeCritique', () => {
  it('applies content revisions and attaches qualityNotes', () => {
    const merged = mergeCritique(draft, { headline: 'Sharper headline', qualityNotes: 'Tightened it.' });

    expect(merged.headline).toBe('Sharper headline');
    expect(merged.qualityNotes).toBe('Tightened it.');
  });

  it('never lets the critique change structural fields', () => {
    const merged = mergeCritique(draft, {
      patternId: 'editorial',
      recommendedComponentNames: ['Modal'],
      dimensionVariant: 'mobile',
      socialFormat: 'story',
      motionConcept: 'transition',
      reasoning: 'hijacked',
      qualityNotes: 'x',
    } as never);

    expect(merged.patternId).toBe('campaign-hero');
    expect(merged.recommendedComponentNames).toEqual(['Button']);
    expect(merged.dimensionVariant).toBeUndefined();
    expect(merged.socialFormat).toBeUndefined();
    expect(merged.motionConcept).toBeUndefined();
    expect(merged.reasoning).toBe('draft');
  });

  it('rejects malformed array revisions instead of crashing renderers', () => {
    const merged = mergeCritique(draft, {
      navItems: 'One", "Two' as never,
      sections: 'malformed' as never,
      newsItems: 'malformed' as never,
      contentBlocks: 'malformed' as never,
      screenNavItems: 'malformed' as never,
      slides: 'malformed' as never,
      carouselFrames: 'malformed' as never,
      qualityNotes: 'x',
    });

    expect(merged.navItems).toEqual(['One', 'Two']);
    expect(merged.sections).toEqual([{ title: 'Section 1', body: 'Body text' }]);
    expect(merged.newsItems).toEqual([{ title: 'News', date: '2026-01-01' }]);
    expect(merged.contentBlocks).toEqual([{ type: 'action', label: 'Go' }]);
    expect(merged.screenNavItems).toEqual([{ label: 'Home', icon: 'home' }]);
    expect(merged.slides).toEqual([{ slideType: 'content', headline: 'Headline' }]);
    expect(merged.carouselFrames).toEqual([{ headline: 'Frame' }]);
  });
});

describe('generateBuild', () => {
  const input = { category: 'website' as const, prompt: 'a site', answers: {} };

  it('runs plan → critique → image with stage labels, merging the revision', async () => {
    vi.mocked(client.requestPlan).mockResolvedValue({ source: 'claude', model: 'claude-fable-5', data: { ...draft } });
    vi.mocked(client.requestCritique).mockResolvedValue({ ok: true, revision: { headline: 'Better', qualityNotes: 'Improved.' } });
    const stages: string[] = [];

    const result = await generateBuild(input, (label) => stages.push(label));

    expect(result.data.headline).toBe('Better');
    expect(result.data.qualityNotes).toBe('Improved.');
    expect(stages).toEqual(['Designing your preview…', 'Reviewing the design…', 'Art-directing the imagery…']);
    expect(imageGenerator.requestHeroImage).toHaveBeenCalledTimes(1);
  });

  it('skips the critique for fallback plans', async () => {
    vi.mocked(client.requestPlan).mockResolvedValue({ source: 'fallback', fallbackReason: 'no key', data: { ...draft } });

    const result = await generateBuild(input);

    expect(client.requestCritique).not.toHaveBeenCalled();
    expect(result.source).toBe('fallback');
  });

  it('ships the draft with honest quality notes when the critique fails', async () => {
    vi.mocked(client.requestPlan).mockResolvedValue({ source: 'claude', data: { ...draft } });
    vi.mocked(client.requestCritique).mockResolvedValue({ ok: false, error: 'overloaded' });

    const result = await generateBuild(input);

    expect(result.data.headline).toBe('Draft headline');
    expect(result.data.qualityNotes).toMatch(/Quality review skipped: overloaded/);
  });
});

describe('critique field lockstep', () => {
  it('every server-revisable content field is client-mergeable', () => {
    const revisable = Object.keys(CRITIQUE_TOOL.input_schema.properties).filter((k) => k !== 'qualityNotes');
    for (const key of revisable) {
      expect(CONTENT_REVISION_KEYS, `${key} is revisable server-side but not merged client-side`).toContain(key);
    }
  });
});
