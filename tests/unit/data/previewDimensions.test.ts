import { describe, expect, it } from 'vitest';
import { closestImageAspectRatio } from '../../../App/src/data/previewDimensions';

describe('closestImageAspectRatio', () => {
  it('maps a square canvas to 1:1', () => {
    expect(closestImageAspectRatio(1080, 1080)).toBe('1:1');
  });

  it('maps a 1080x1920 story canvas to 9:16 exactly', () => {
    expect(closestImageAspectRatio(1080, 1920)).toBe('9:16');
  });

  it('maps a 1200x627 LinkedIn canvas to the nearest preset (2:1)', () => {
    expect(closestImageAspectRatio(1200, 627)).toBe('2:1');
  });

  it('maps a 1920x1080 landscape canvas to 16:9', () => {
    expect(closestImageAspectRatio(1920, 1080)).toBe('16:9');
  });
});
