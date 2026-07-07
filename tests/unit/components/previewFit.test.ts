import { describe, expect, it } from 'vitest';
import { computeFitFrame } from '../../../App/src/components/previewFit';

describe('computeFitFrame', () => {
  it('fills the available container width for a landscape variant, even when that height would exceed the visual cap', () => {
    // website/desktop is 1440x900. A 1200px-wide panel has plenty of room to
    // show it at close to full width — it should not be shrunk down to
    // whatever width the 560px height cap happens to imply.
    const frame = computeFitFrame(1200, { width: 1440, height: 900 }, 560);

    expect(frame.frameWidth).toBeCloseTo(1200, 0);
  });

  it('still caps the visible height so a tall/portrait variant does not dominate the page', () => {
    // story/reel is 1080x1920 — at a 1200px-wide panel it would naturally
    // render ~2133px tall; the visible frame should stay capped.
    const frame = computeFitFrame(1200, { width: 1080, height: 1920 }, 560);

    expect(frame.frameHeight).toBeLessThanOrEqual(560);
    expect(frame.scrollable).toBe(true);
  });

  it('never upscales a variant past its real pixel size', () => {
    // mobile is 375 wide — a 1200px panel should not stretch it to 1200px.
    const frame = computeFitFrame(1200, { width: 375, height: 812 }, 560);

    expect(frame.scale).toBeLessThanOrEqual(1);
    expect(frame.frameWidth).toBeCloseTo(375, 0);
  });
});
