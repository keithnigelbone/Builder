import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateBuild } from '../../../App/src/ai/orchestrator';
import * as client from '../../../App/src/ai/client';
import type { BuildPlan } from '../../../App/src/ai/schema';

vi.mock('../../../App/src/ai/client', async (importOriginal) => {
  const original = await importOriginal<typeof client>();
  return { ...original, requestPlan: vi.fn(), requestCritique: vi.fn() };
});
vi.mock('../../../App/src/media/imageGenerator', () => ({ requestHeroImage: vi.fn().mockResolvedValue(undefined) }));

const draft: BuildPlan = { headline: 'Film', patternId: 'video-storyboard', recommendedComponentNames: [], reasoning: 'draft' };

afterEach(() => {
  vi.clearAllMocks();
});

describe('generateBuild video format attach', () => {
  it('attaches the deterministic format for video builds (fallback source too)', async () => {
    vi.mocked(client.requestPlan).mockResolvedValue({ source: 'fallback', fallbackReason: 'no key', data: { ...draft } });

    const result = await generateBuild({
      category: 'video',
      prompt: 'a reel',
      answers: { 'video-destination': 'instagram-story' },
    });

    expect(result.data.videoFormat?.ratio).toBe('9:16');
    expect(result.data.videoFormat?.width).toBe(1080);
    expect(result.data.videoFormat?.veoAspectRatio).toBe('9:16');
  });

  it('attaches no format for other categories', async () => {
    vi.mocked(client.requestPlan).mockResolvedValue({ source: 'fallback', fallbackReason: 'no key', data: { ...draft } });

    const result = await generateBuild({ category: 'motion', prompt: 'a loader', answers: {} });

    expect(result.data.videoFormat).toBeUndefined();
  });

  it('the critique sees the attached format but cannot change it', async () => {
    vi.mocked(client.requestPlan).mockResolvedValue({ source: 'claude', data: { ...draft } });
    vi.mocked(client.requestCritique).mockResolvedValue({
      ok: true,
      revision: { openingShot: 'Sharper opening', videoFormat: { ratio: '1:1' }, qualityNotes: 'x' } as never,
    });

    const result = await generateBuild({
      category: 'video',
      prompt: 'an AGM film',
      answers: { 'video-destination': 'auditorium-ultrawide' },
    });

    expect(result.data.openingShot).toBe('Sharper opening');
    expect(result.data.videoFormat?.ratio).toBe('21:9');
    const critiqueDraft = vi.mocked(client.requestCritique).mock.calls[0][2];
    expect(critiqueDraft.videoFormat?.ratio).toBe('21:9');
  });
});
