import { afterEach, describe, expect, it, vi } from 'vitest';
import { assembleImagePrompt, requestHeroImage } from '../../../App/src/media/imageGenerator';
import { RELIANCE_VISUAL_BASELINE } from '../../../App/src/ai/artDirection';
import type { BuildPlan } from '../../../App/src/ai/schema';

const scene = {
  imageSubject: 'A line engineer in a grey uniform',
  imageAction: 'both hands tightening a panel bolt',
  imageLocation: 'red-brown Rajasthan earth, dry scrubland',
  imageFraming: 'medium close-up, slight low angle',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('assembleImagePrompt', () => {
  it('joins the four scene parts with the standard visual baseline', () => {
    const prompt = assembleImagePrompt(scene);

    expect(prompt).toContain(scene.imageSubject);
    expect(prompt).toContain(scene.imageLocation);
    expect(prompt).toContain(RELIANCE_VISUAL_BASELINE);
  });

  it('swaps to the aerial baseline with colour notes for aerial shots', () => {
    const prompt = assembleImagePrompt({ ...scene, imageIsAerial: true, imageColourNotes: 'steel-blue panels' });

    expect(prompt).toContain('top-down aerial');
    expect(prompt).toContain('steel-blue panels');
    expect(prompt).not.toContain(RELIANCE_VISUAL_BASELINE);
  });
});

describe('requestHeroImage', () => {
  const plan = { ...scene, recommendedComponentNames: [], reasoning: '' } as BuildPlan;

  it('returns the data URL on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { dataUrl: 'data:image/png;base64,x' } }) } as Response),
    );

    expect(await requestHeroImage(plan)).toBe('data:image/png;base64,x');
  });

  it('returns undefined instead of throwing on any failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));

    expect(await requestHeroImage(plan)).toBeUndefined();
  });

  it('skips the network entirely when the scene is incomplete', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await requestHeroImage({ recommendedComponentNames: [], reasoning: '' } as BuildPlan)).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
