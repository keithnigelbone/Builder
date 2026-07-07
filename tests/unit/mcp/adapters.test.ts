import { afterEach, describe, expect, it } from 'vitest';
import { getUiUxQualityHints } from '../../../App/src/mcp/uiUxProAdapter';
import { getFramerQualityHints } from '../../../App/src/mcp/framerAdapter';

describe('uiUxProAdapter', () => {
  it('always returns shared hints plus category-specific hints', () => {
    const website = getUiUxQualityHints('website');
    const social = getUiUxQualityHints('social-media');

    expect(website.length).toBeGreaterThan(3);
    expect(social.length).toBeGreaterThan(3);
    expect(website.join(' ')).not.toBe(social.join(' '));
  });

  it('returns only shared hints for an unknown category instead of throwing', () => {
    expect(getUiUxQualityHints('not-a-category').length).toBeGreaterThan(0);
  });
});

describe('framerAdapter', () => {
  afterEach(() => {
    delete process.env.FRAMER_MCP_URL;
  });

  it('returns undefined when no Framer MCP endpoint is configured', () => {
    expect(getFramerQualityHints()).toBeUndefined();
  });

  it('still returns undefined (gracefully, without throwing) when the env var is set', () => {
    process.env.FRAMER_MCP_URL = 'http://localhost:9999';
    expect(getFramerQualityHints()).toBeUndefined();
  });
});
