export type FitMode = 'fill-width' | 'contain';

export interface FitFrame {
  /** How much the variant's real pixel size is scaled down to render on screen. */
  scale: number;
  /** On-screen width of the preview frame. */
  frameWidth: number;
  /** On-screen height of the preview frame. */
  frameHeight: number;
  /** True when the variant's natural scaled height exceeds frameHeight and the excess needs to scroll instead of being shrunk away. Always false in "contain" mode. */
  scrollable: boolean;
}

/**
 * Fits a real-pixel-size preview canvas (see data/previewDimensions.ts) into
 * an available container width, in one of two modes:
 *
 * - `"fill-width"` (default): width is always maximized — scaled up to the
 *   container's width, capped only at the variant's real size. Height is
 *   capped separately at `maxVisualHeight` via clipping/scrolling, not by
 *   shrinking the scale, so a wide landscape variant (e.g. website/desktop)
 *   never ends up narrower than the space available just because a tall
 *   variant's height cap was computed with the same formula. Appropriate for
 *   previews of a scrollable page (website, app screens), where only width
 *   fidelity matters and excess height is expected to scroll.
 *
 * - `"contain"`: scales to fit both width and `maxVisualHeight` at once,
 *   like CSS `object-fit: contain` — never crops, always shows the whole
 *   shape. Appropriate for fixed-shape artifacts (a social post, a slide, a
 *   motion panel) where the aspect ratio itself is the point of the preview:
 *   a square must render visibly square, and a portrait format must render
 *   visibly narrower than a square of the same width, not identically capped.
 */
export function computeFitFrame(
  containerWidth: number,
  variant: { width: number; height: number },
  maxVisualHeight: number,
  mode: FitMode = 'fill-width',
): FitFrame {
  if (mode === 'contain') {
    const scale = Math.min(containerWidth / variant.width, maxVisualHeight / variant.height, 1);
    return { scale, frameWidth: variant.width * scale, frameHeight: variant.height * scale, scrollable: false };
  }

  const scale = Math.min(containerWidth / variant.width, 1);
  const frameWidth = variant.width * scale;
  const naturalHeight = variant.height * scale;
  const frameHeight = Math.min(naturalHeight, maxVisualHeight);

  return { scale, frameWidth, frameHeight, scrollable: naturalHeight > frameHeight };
}
