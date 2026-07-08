import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_IMAGE_MODEL, generateImage } from '../../../App/server/geminiImageCore';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('generateImage', () => {
  it('requests the given model with IMAGE modality and returns a data URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'abc123' } }] } }],
      }),
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateImage('key', 'gemini-2.5-flash-image', 'a grounded scene');

    expect(result).toEqual({ ok: true, dataUrl: 'data:image/png;base64,abc123' });
    expect(fetchMock.mock.calls[0][0]).toContain('/models/gemini-2.5-flash-image:generateContent');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[0].text).toBe('a grounded scene');
    expect(body.generationConfig.responseModalities).toEqual(['IMAGE']);
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('key');
  });

  it('maps an API error to ok:false with the status text preserved', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'spending cap exceeded' } as unknown as Response),
    );

    const result = await generateImage('key', DEFAULT_IMAGE_MODEL, 'p');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.error).toContain('Gemini API error 429');
      expect(result.error).toContain('spending cap exceeded');
    }
  });

  it('maps a response without image data to ok:false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [] }) } as Response));

    const result = await generateImage('key', DEFAULT_IMAGE_MODEL, 'p');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Gemini response had no image data');
  });

  it('never throws — a network failure becomes ok:false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const result = await generateImage('key', DEFAULT_IMAGE_MODEL, 'p');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('offline');
  });
});
