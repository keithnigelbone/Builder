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

  it('still caps the visible height so a tall/narrow variant does not dominate the page', () => {
    // An arbitrary tall/narrow canvas that would naturally render much
    // taller than the visual cap at this container width — the visible
    // frame should stay capped rather than growing without bound.
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

describe('computeFitFrame with mode "contain"', () => {
  // Fixed-shape artifacts (a social post, a slide, a motion panel) must show
  // their whole proportional shape — never cropped — unlike a scrollable
  // page (the default "fill-width" mode), where only width fidelity matters.

  it('keeps a square variant visually square, scaled to fit both width and height', () => {
    const frame = computeFitFrame(1200, { width: 1080, height: 1080 }, 560, 'contain');

    expect(frame.frameWidth).toBeCloseTo(frame.frameHeight, 0);
    expect(frame.scrollable).toBe(false);
  });

  it('renders a portrait story variant distinctly narrower than a square of the same width', () => {
    const square = computeFitFrame(1200, { width: 1080, height: 1080 }, 560, 'contain');
    const story = computeFitFrame(1200, { width: 1080, height: 1920 }, 560, 'contain');

    expect(story.frameHeight).toBeCloseTo(square.frameHeight, 0);
    expect(story.frameWidth).toBeLessThan(square.frameWidth);
  });

  it('never marks a contained frame as scrollable, even when height is the binding constraint', () => {
    const frame = computeFitFrame(1200, { width: 1080, height: 1920 }, 560, 'contain');

    expect(frame.scrollable).toBe(false);
  });
});
