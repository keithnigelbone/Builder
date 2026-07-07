import { afterEach, describe, expect, it, vi } from 'vitest';
import { callAnthropicWithFallback, resolveModels, PLAN_TOOL } from '../../App/aiServerPlugin';

function anthropicResponse(marker: string): Response {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: 'tool_use', input: { headline: marker } }],
      stop_reason: 'tool_use',
    }),
  } as Response;
}

function anthropicError(status: number): Response {
  return { ok: false, status, text: async () => 'model unavailable' } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_MODEL;
  delete process.env.ANTHROPIC_FALLBACK_MODEL;
});

describe('resolveModels', () => {
  it('defaults to Fable 5 primary with Sonnet 5 fallback', () => {
    expect(resolveModels()).toEqual({ primary: 'claude-fable-5', fallback: 'claude-sonnet-5' });
  });

  it('reads env overrides at call time, not import time', () => {
    process.env.ANTHROPIC_MODEL = 'custom-primary';
    process.env.ANTHROPIC_FALLBACK_MODEL = 'custom-fallback';

    expect(resolveModels()).toEqual({ primary: 'custom-primary', fallback: 'custom-fallback' });
  });
});

describe('callAnthropicWithFallback', () => {
  it('uses the primary model when it succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue(anthropicResponse('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const { model } = await callAnthropicWithFallback('key', 'sys', 'user', PLAN_TOOL);

    expect(model).toBe('claude-fable-5');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('claude-fable-5');
  });

  it('retries once on the fallback model when the primary fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(anthropicError(500)).mockResolvedValueOnce(anthropicResponse('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const { model } = await callAnthropicWithFallback('key', 'sys', 'user', PLAN_TOOL);

    expect(model).toBe('claude-sonnet-5');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe('claude-sonnet-5');
  });

  it('retries on the fallback model when the primary response is truncated', async () => {
    const truncated = {
      ok: true,
      json: async () => ({ content: [], stop_reason: 'max_tokens' }),
    } as Response;
    const fetchMock = vi.fn().mockResolvedValueOnce(truncated).mockResolvedValueOnce(anthropicResponse('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const { model } = await callAnthropicWithFallback('key', 'sys', 'user', PLAN_TOOL);

    expect(model).toBe('claude-sonnet-5');
  });

  it('throws when both models fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(anthropicError(500)));

    await expect(callAnthropicWithFallback('key', 'sys', 'user', PLAN_TOOL)).rejects.toThrow(/Anthropic API error 500/);
  });

  it('does not retry when primary and fallback are the same model', async () => {
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-5';
    process.env.ANTHROPIC_FALLBACK_MODEL = 'claude-sonnet-5';
    const fetchMock = vi.fn().mockResolvedValue(anthropicError(500));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callAnthropicWithFallback('key', 'sys', 'user', PLAN_TOOL)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
