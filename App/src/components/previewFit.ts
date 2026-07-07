export interface FitFrame {
  /** How much the variant's real pixel size is scaled down to render on screen. */
  scale: number;
  /** On-screen width of the preview frame — always fills the available container width, up to the variant's real size. */
  frameWidth: number;
  /** On-screen height of the preview frame — capped so tall/portrait formats don't dominate the page. */
  frameHeight: number;
  /** True when the variant's natural scaled height exceeds frameHeight and the excess needs to scroll instead of being shrunk away. */
  scrollable: boolean;
}

/**
 * Fits a real-pixel-size preview canvas (see data/previewDimensions.ts) into
 * an available container width. Width is always maximized — scaled up to the
 * container's width, capped only at the variant's real size so nothing is
 * upscaled past true pixel dimensions. Height is capped separately at
 * `maxVisualHeight` via clipping/scrolling, not by shrinking the scale, so a
 * wide landscape variant (e.g. website/desktop) never ends up narrower than
 * the space available just because a tall/portrait variant's height cap was
 * computed with the same formula.
 */
export function computeFitFrame(containerWidth: number, variant: { width: number; height: number }, maxVisualHeight: number): FitFrame {
  const scale = Math.min(containerWidth / variant.width, 1);
  const frameWidth = variant.width * scale;
  const naturalHeight = variant.height * scale;
  const frameHeight = Math.min(naturalHeight, maxVisualHeight);

  return { scale, frameWidth, frameHeight, scrollable: naturalHeight > frameHeight };
}
