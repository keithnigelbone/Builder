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
