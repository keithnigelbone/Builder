import { describe, expect, it } from 'vitest';
import { MAX_PROMPT_LENGTH, rejectBadRequest } from '../../../api/_guards';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function makeReq(overrides: { method?: string; headers?: Record<string, string>; body?: unknown }): VercelRequest {
  return {
    method: overrides.method ?? 'POST',
    headers: overrides.headers ?? { host: 'reliance-builder.vercel.app' },
    body: overrides.body ?? { prompt: 'a grounded scene' },
  } as unknown as VercelRequest;
}

function makeRes(): { res: VercelResponse; recorded: { status?: number; body?: unknown } } {
  const recorded: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      recorded.status = code;
      return this;
    },
    json(body: unknown) {
      recorded.body = body;
      return this;
    },
  } as unknown as VercelResponse;
  return { res, recorded };
}

describe('rejectBadRequest', () => {
  it('rejects non-POST with 405', () => {
    const { res, recorded } = makeRes();
    expect(rejectBadRequest(makeReq({ method: 'GET' }), res)).toBe(true);
    expect(recorded.status).toBe(405);
  });

  it('rejects a cross-origin request with 403', () => {
    const { res, recorded } = makeRes();
    const req = makeReq({ headers: { host: 'reliance-builder.vercel.app', origin: 'https://evil.example.com' } });
    expect(rejectBadRequest(req, res)).toBe(true);
    expect(recorded.status).toBe(403);
  });

  it('accepts a same-origin request', () => {
    const { res } = makeRes();
    const req = makeReq({ headers: { host: 'reliance-builder.vercel.app', origin: 'https://reliance-builder.vercel.app' } });
    expect(rejectBadRequest(req, res)).toBe(false);
  });

  it('accepts a request with no origin or referer header', () => {
    const { res } = makeRes();
    expect(rejectBadRequest(makeReq({}), res)).toBe(false);
  });

  it('rejects a missing prompt with 400', () => {
    const { res, recorded } = makeRes();
    expect(rejectBadRequest(makeReq({ body: {} }), res)).toBe(true);
    expect(recorded.status).toBe(400);
  });

  it('rejects an over-length prompt with 400', () => {
    const { res, recorded } = makeRes();
    expect(rejectBadRequest(makeReq({ body: { prompt: 'x'.repeat(MAX_PROMPT_LENGTH + 1) } }), res)).toBe(true);
    expect(recorded.status).toBe(400);
  });
});
