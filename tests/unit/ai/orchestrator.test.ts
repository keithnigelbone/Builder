import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateBuild, mergeCritique } from '../../../App/src/ai/orchestrator';
import * as client from '../../../App/src/ai/client';
import * as imageGenerator from '../../../App/src/media/imageGenerator';
import type { BuildPlan } from '../../../App/src/ai/schema';

vi.mock('../../../App/src/ai/client', async (importOriginal) => {
  const original = await importOriginal<typeof client>();
  return { ...original, requestPlan: vi.fn(), requestCritique: vi.fn() };
});
vi.mock('../../../App/src/media/imageGenerator', () => ({ requestHeroImage: vi.fn().mockResolvedValue(undefined) }));

const draft: BuildPlan = {
  headline: 'Draft headline',
  patternId: 'campaign-hero',
  navItems: ['One', 'Two'],
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
      qualityNotes: 'x',
    } as never);

    expect(merged.patternId).toBe('campaign-hero');
    expect(merged.recommendedComponentNames).toEqual(['Button']);
    expect(merged.dimensionVariant).toBeUndefined();
  });

  it('rejects malformed array revisions instead of crashing renderers', () => {
    const merged = mergeCritique(draft, { navItems: 'One", "Two' as never, qualityNotes: 'x' });

    expect(merged.navItems).toEqual(['One', 'Two']);
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
