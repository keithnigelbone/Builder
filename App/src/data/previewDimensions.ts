import type { ImageAspectRatio } from '@jds4/oneui-react';
import type { BuildCategoryId } from '../types';

export interface DimensionVariant {
  id: string;
  label: string;
  /** Real pixel size for this canvas — rendered at true scale, then visually shrunk to fit. */
  width: number;
  height: number;
}

/**
 * Real-world canvas sizes per output format, per the product spec:
 * website desktop/tablet/mobile, app screen mobile/desktop, slides 16:9 HD,
 * social square/story/LinkedIn/carousel. Motion doesn't have an export
 * dimension (it's a live preview, not a static canvas) so it gets one
 * reasonable panel size.
 */
export const DIMENSIONS: Record<BuildCategoryId, DimensionVariant[]> = {
  website: [
    { id: 'desktop', label: 'Desktop', width: 1440, height: 900 },
    { id: 'tablet', label: 'Tablet', width: 768, height: 1024 },
    { id: 'mobile', label: 'Mobile', width: 375, height: 812 },
  ],
  'app-screens': [
    { id: 'mobile', label: 'Mobile', width: 390, height: 844 },
    { id: 'desktop', label: 'Desktop', width: 1440, height: 1024 },
  ],
  slides: [{ id: 'default', label: '16:9', width: 1920, height: 1080 }],
  'social-media': [
    { id: 'square', label: 'Square post', width: 1080, height: 1080 },
    { id: 'story', label: 'Story / Reel', width: 1080, height: 1920 },
    { id: 'linkedin', label: 'LinkedIn', width: 1200, height: 627 },
    { id: 'carousel', label: 'Carousel', width: 1080, height: 1080 },
  ],
  motion: [{ id: 'panel', label: 'Preview', width: 480, height: 480 }],
};

export function getDefaultVariant(category: BuildCategoryId): DimensionVariant {
  return DIMENSIONS[category][0];
}

export function getVariant(category: BuildCategoryId, variantId: string | undefined): DimensionVariant {
  return DIMENSIONS[category].find((v) => v.id === variantId) ?? getDefaultVariant(category);
}

type FixedAspectRatio = Exclude<ImageAspectRatio, 'auto'>;

const ASPECT_RATIO_PRESETS: { id: FixedAspectRatio; ratio: number }[] = [
  { id: '1:2', ratio: 1 / 2 },
  { id: '9:21', ratio: 9 / 21 },
  { id: '9:16', ratio: 9 / 16 },
  { id: '2:3', ratio: 2 / 3 },
  { id: '3:4', ratio: 3 / 4 },
  { id: '1:1', ratio: 1 },
  { id: '4:3', ratio: 4 / 3 },
  { id: '3:2', ratio: 3 / 2 },
  { id: '16:9', ratio: 16 / 9 },
  { id: '2:1', ratio: 2 },
  { id: '21:9', ratio: 21 / 9 },
];

/**
 * @jds4/oneui-react's `Image` only accepts a fixed set of aspect-ratio
 * presets (see `ImageAspectRatio`), not an arbitrary ratio — this maps a
 * canvas's real width/height to the closest preset, so a preview's hero
 * image actually matches the canvas it's rendered on instead of being
 * hardcoded to one ratio regardless of which variant is selected.
 */
export function closestImageAspectRatio(width: number, height: number): FixedAspectRatio {
  const ratio = width / height;
  return ASPECT_RATIO_PRESETS.reduce((best, candidate) =>
    Math.abs(candidate.ratio - ratio) < Math.abs(best.ratio - ratio) ? candidate : best,
  ).id;
}
