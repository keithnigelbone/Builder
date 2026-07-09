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

  it('sends the assembled video prompt and aspect for video-format plans', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { videoUrl: 'blob:v' } }) } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const plan: BuildPlan = {
      imageSubject: 's',
      imageAction: 'a',
      imageLocation: 'l',
      imageFraming: 'f',
      openingShot: 'Open close.',
      videoFormat: {
        id: 'instagram-story',
        label: 'Instagram Story / Reel',
        ratio: '9:16',
        width: 1080,
        height: 1920,
        safeArea: ['Keep text large and centred.'],
        veoAspectRatio: '9:16',
      },
      recommendedComponentNames: [],
      reasoning: '',
    };

    await requestMotionVideo(plan);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.aspectRatio).toBe('9:16');
    expect(body.prompt).toContain('Deliver at 9:16 (1080×1920)');
  });

  it('sends no aspect and the plain scene prompt for motion plans (unchanged)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { videoUrl: 'blob:v' } }) } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const plan: BuildPlan = { imageSubject: 's', imageAction: 'a', imageLocation: 'l', imageFraming: 'f', recommendedComponentNames: [], reasoning: '' };
    await requestMotionVideo(plan);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.aspectRatio).toBeUndefined();
    expect(body.prompt).not.toContain('Deliver at');
  });
});
