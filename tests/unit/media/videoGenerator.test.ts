import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestMotionVideo } from '../../../App/src/media/videoGenerator';
import type { BuildPlan } from '../../../App/src/ai/schema';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestMotionVideo', () => {
  it('errors locally without calling the proxy when the plan has no art-directed scene', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestMotionVideo({} as BuildPlan);

    expect(result.error).toMatch(/no art-directed scene/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the video URL from a successful proxy response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { videoUrl: 'blob:video' } }) } as Response));

    const plan: BuildPlan = {
      imageSubject: 's',
      imageAction: 'a',
      imageLocation: 'l',
      imageFraming: 'f',
      recommendedComponentNames: [],
      reasoning: '',
    };

    expect((await requestMotionVideo(plan)).videoUrl).toBe('blob:video');
  });
});
