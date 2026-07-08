import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestClassification, requestPlan } from '../../../App/src/ai/client';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestClassification', () => {
  it('returns Claude data when the proxy responds with a recognized category', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          result: { category: 'website', reasoning: 'Because', followUps: [] },
        }),
      ),
    );

    const result = await requestClassification('build me a site');

    expect(result.source).toBe('claude');
    expect(result.data.category).toBe('website');
  });

  it('falls back when the proxy call fails outright', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    const result = await requestClassification('a checkout screen');

    expect(result.source).toBe('fallback');
    expect(result.fallbackReason).toBe('boom');
    expect(result.data.category).toBe('app-screens');
  });

  it('falls back when Claude returns a category that does not exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { result: { category: 'not-a-real-category' } })),
    );

    const result = await requestClassification('something');

    expect(result.source).toBe('fallback');
    expect(result.fallbackReason).toBe('Claude returned an unrecognized category.');
  });

  it('drops follow-ups that are malformed instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          result: {
            category: 'website',
            followUps: [{ id: 'ok', prompt: 'p', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] }, { id: 'bad' }, 'not-an-object'],
          },
        }),
      ),
    );

    const result = await requestClassification('something');

    expect(result.data.followUps).toHaveLength(1);
    expect(result.data.followUps[0].id).toBe('ok');
  });
});

describe('requestPlan', () => {
  const input = { category: 'website' as const, prompt: 'a site', answers: {} };

  it('falls back when Claude response has no headline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { result: {} })));

    const result = await requestPlan(input);

    expect(result.source).toBe('fallback');
    expect(result.fallbackReason).toBe('Claude returned an incomplete plan.');
  });

  it('filters out component names Claude invents that are not in the real registry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          result: { headline: 'Hi', recommendedComponentNames: ['Button', 'TotallyMadeUpComponent'] },
        }),
      ),
    );

    const result = await requestPlan(input);

    expect(result.source).toBe('claude');
    expect(result.data.recommendedComponentNames).toEqual(['Button']);
  });

  it('drops array-shaped fields that come back malformed instead of crashing the renderer', async () => {
    // Observed live: Claude returned navItems as a mangled string
    // ('About\", \"Businesses\", ...') instead of a real array.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          result: {
            headline: 'Hi',
            navItems: 'About", "Businesses", "Sustainability", "Investors',
            sections: 'not an array either',
          },
        }),
      ),
    );

    const result = await requestPlan(input);

    expect(result.data.navItems).toBeUndefined();
    expect(result.data.sections).toBeUndefined();
  });

  it('does not request a hero image when image-prompt parts are incomplete', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { result: { headline: 'Hi' } }));
    vi.stubGlobal('fetch', fetchMock);

    await requestPlan(input);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalledWith('/api/gemini-image', expect.anything());
  });
});
