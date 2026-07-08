import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_VIDEO_MODEL, generateVideo } from '../../../App/server/geminiVideoCore';

const FAST = { pollIntervalMs: 1, pollTimeoutMs: 50 };

function jsonRes(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DEFAULT_VIDEO_MODEL', () => {
  it('is the fast Veo tier the key actually serves (Veo 2/3.0 are retired from the Gemini API)', () => {
    expect(DEFAULT_VIDEO_MODEL).toBe('veo-3.1-fast-generate-preview');
  });
});

describe('generateVideo', () => {
  it('starts, polls to done, downloads, and returns a data URL', async () => {
    const videoBytes = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ name: 'operations/abc' }))
      .mockResolvedValueOnce(jsonRes({ done: false }))
      .mockResolvedValueOnce(
        jsonRes({ done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: 'https://files/video1' } }] } } }),
      )
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => videoBytes } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateVideo('key', DEFAULT_VIDEO_MODEL, 'a reveal', undefined, FAST);

    expect(result).toEqual({ ok: true, videoUrl: `data:video/mp4;base64,${Buffer.from(videoBytes).toString('base64')}` });
    expect(fetchMock.mock.calls[0][0]).toContain(`/models/${DEFAULT_VIDEO_MODEL}:predictLongRunning`);
    expect(fetchMock.mock.calls[3][0]).toBe('https://files/video1');
  });

  it('attaches a parsed start image when a data URL is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'stop here' } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await generateVideo('key', DEFAULT_VIDEO_MODEL, 'p', 'data:image/jpeg;base64,QUJD', FAST);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.instances[0].image).toEqual({ mimeType: 'image/jpeg', bytesBase64Encoded: 'QUJD' });
  });

  it('maps a start failure to ok:false 502 with status text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'cap' } as unknown as Response));

    const result = await generateVideo('key', DEFAULT_VIDEO_MODEL, 'p', undefined, FAST);

    expect(result).toEqual({ ok: false, status: 502, error: 'Veo start error 429: cap' });
  });

  it('times out with 504 when the operation never completes', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonRes({ name: 'operations/abc' })).mockResolvedValue(jsonRes({ done: false }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateVideo('key', DEFAULT_VIDEO_MODEL, 'p', undefined, { pollIntervalMs: 1, pollTimeoutMs: 5 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(504);
  });

  it('surfaces an operation-level error as 502', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ name: 'operations/abc' }))
      .mockResolvedValueOnce(jsonRes({ done: true, error: { code: 3, message: 'bad prompt' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateVideo('key', DEFAULT_VIDEO_MODEL, 'p', undefined, FAST);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Veo generation failed');
  });

  it('fails loudly with the raw operation when no video URI shape matches', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ name: 'operations/abc' }))
      .mockResolvedValueOnce(jsonRes({ done: true, response: { unexpected: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateVideo('key', DEFAULT_VIDEO_MODEL, 'p', undefined, FAST);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Could not find a video URI');
  });
});
