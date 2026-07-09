import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIDEO_FORMAT_ID,
  VIDEO_FORMATS,
  getVideoFormat,
  nearestVeoAspect,
  parseCustomFormat,
  resolveDigitalDisplay,
  resolveVideoFormatForBuild,
} from '../../../App/src/data/videoFormats';

describe('VIDEO_FORMATS', () => {
  it.each([
    ['keynote-agm', '16:9', 1920, 1080, '16:9'],
    ['auditorium-ultrawide', '21:9', 2560, 1080, '16:9'],
    ['youtube-website', '16:9', 1920, 1080, '16:9'],
    ['linkedin-feed', '1.91:1', 1200, 627, '16:9'],
    ['instagram-feed', '4:5', 1080, 1350, '9:16'],
    ['instagram-story', '9:16', 1080, 1920, '9:16'],
    ['square-social', '1:1', 1080, 1080, '16:9'],
    ['digital-display', '16:9', 1920, 1080, '16:9'],
  ] as const)('%s is %s at %d×%d (Veo %s)', (id, ratio, width, height, veo) => {
    const f = getVideoFormat(id);
    expect(f).toBeDefined();
    expect(f?.ratio).toBe(ratio);
    expect(f?.width).toBe(width);
    expect(f?.height).toBe(height);
    expect(f?.veoAspectRatio).toBe(veo);
  });

  it('every format has use-for and at least one safe-area bullet', () => {
    for (const f of VIDEO_FORMATS) {
      expect(f.useFor.length, f.id).toBeGreaterThan(10);
      expect(f.safeArea.length, f.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('defaults to the keynote format', () => {
    expect(DEFAULT_VIDEO_FORMAT_ID).toBe('keynote-agm');
  });
});

describe('nearestVeoAspect', () => {
  it('maps landscape-or-square to 16:9 and portrait to 9:16', () => {
    expect(nearestVeoAspect(2560, 1080)).toBe('16:9');
    expect(nearestVeoAspect(1080, 1080)).toBe('16:9');
    expect(nearestVeoAspect(1080, 1350)).toBe('9:16');
    expect(nearestVeoAspect(1080, 1920)).toBe('9:16');
  });
});

describe('parseCustomFormat', () => {
  it.each([
    ['16:9', 1920, 1080],
    ['9:16', 1080, 1920],
    ['1:1', 1080, 1080],
    ['4:5', 1080, 1350],
    ['21:9', 2560, 1080],
    ['1.91:1', 1200, 627],
  ] as const)('accepts the ratio form %s', (ratio, width, height) => {
    expect(parseCustomFormat(ratio)).toEqual({ ratio, width, height });
  });

  it('accepts size forms with ×, x, and loose spacing', () => {
    expect(parseCustomFormat('1920 × 1080')).toEqual({ ratio: '16:9', width: 1920, height: 1080 });
    expect(parseCustomFormat('1080x1920')).toEqual({ ratio: '9:16', width: 1080, height: 1920 });
    expect(parseCustomFormat(' 2560 X 1080 ')).toEqual({ ratio: '21:9', width: 2560, height: 1080 });
  });

  it('derives a reduced ratio label for non-standard sizes', () => {
    expect(parseCustomFormat('1000x500')).toEqual({ ratio: '2:1', width: 1000, height: 500 });
  });

  it('rejects garbage', () => {
    expect(parseCustomFormat('very wide please')).toBeUndefined();
    expect(parseCustomFormat('')).toBeUndefined();
  });
});

describe('resolveDigitalDisplay', () => {
  it('defaults to 1920×1080, honours portrait and ultra-wide mentions', () => {
    expect(resolveDigitalDisplay('a lobby screen loop')).toEqual({ ratio: '16:9', width: 1920, height: 1080 });
    expect(resolveDigitalDisplay('a portrait display in reception')).toEqual({ ratio: '9:16', width: 1080, height: 1920 });
    expect(resolveDigitalDisplay('an ultra-wide lobby wall')).toEqual({ ratio: '21:9', width: 2560, height: 1080 });
    expect(resolveDigitalDisplay('an ultrawide banner screen')).toEqual({ ratio: '21:9', width: 2560, height: 1080 });
  });
});

describe('resolveVideoFormatForBuild', () => {
  it('resolves a fixed destination', () => {
    const f = resolveVideoFormatForBuild({ 'video-destination': 'instagram-story' }, 'a reel');
    expect(f.ratio).toBe('9:16');
    expect(f.width).toBe(1080);
    expect(f.veoAspectRatio).toBe('9:16');
    expect(f.note).toBeUndefined();
  });

  it('resolves digital-display from the prompt text', () => {
    const f = resolveVideoFormatForBuild({ 'video-destination': 'digital-display' }, 'portrait display in the lobby');
    expect(f.ratio).toBe('9:16');
    expect(f.height).toBe(1920);
  });

  it('resolves custom from the free-text answer', () => {
    const f = resolveVideoFormatForBuild({ 'video-destination': 'custom', 'video-custom-format': '21:9' }, 'x');
    expect(f.ratio).toBe('21:9');
    expect(f.width).toBe(2560);
    expect(f.veoAspectRatio).toBe('16:9');
  });

  it('falls back to 16:9 with an honest note when custom input is unparseable', () => {
    const f = resolveVideoFormatForBuild({ 'video-destination': 'custom', 'video-custom-format': 'idk' }, 'x');
    expect(f.ratio).toBe('16:9');
    expect(f.width).toBe(1920);
    expect(f.note).toMatch(/defaulted to 16:9/i);
  });

  it('falls back to the keynote default when the destination is missing or unknown', () => {
    expect(resolveVideoFormatForBuild({}, 'x').id).toBe(DEFAULT_VIDEO_FORMAT_ID);
    expect(resolveVideoFormatForBuild({ 'video-destination': 'nonsense' }, 'x').id).toBe(DEFAULT_VIDEO_FORMAT_ID);
  });
});
