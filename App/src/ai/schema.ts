import type { BuildCategoryId } from '../types';

export interface FollowUpOption {
  id: string;
  label: string;
}

export interface FollowUpQuestion {
  id: string;
  prompt: string;
  options: FollowUpOption[];
}

export interface ClassifyResult {
  category: BuildCategoryId;
  reasoning: string;
  followUps: FollowUpQuestion[];
}

export type AppScreenBlock =
  | { type: 'list-item'; icon?: string; title: string; subtitle?: string }
  | { type: 'stat'; value: string; label: string }
  | { type: 'image-card'; caption: string }
  | { type: 'action'; label: string };

/**
 * Content/structure authored by the AI layer for the chosen category. Every
 * field here is copy or structural choice — never a color, font, spacing, or
 * radius value. Those always come from Reliance's real tokens, applied by
 * the category renderers in App/src/components/previews/.
 */
export interface BuildPlan {
  headline?: string;
  subheadline?: string;
  body?: string;
  kicker?: string;
  ctaLabel?: string;
  navItems?: string[];
  sections?: { title: string; body: string }[];
  /** Website: an optional founder/customer spotlight quote below the sections grid. */
  quote?: { text: string; name: string; title: string };
  /** Website: an optional 2-3 item news/updates grid. */
  newsItems?: { title: string; date: string }[];
  /** Website: an optional closing contact/CTA band headline, e.g. "Get in touch." */
  contactHeadline?: string;
  screenTitle?: string;
  /** App screens: typed content blocks below the hero image. */
  contentBlocks?: AppScreenBlock[];
  /** App screens: dynamic bottom nav items, replacing the generic Home/Search/Settings default. */
  screenNavItems?: { label: string; icon: string }[];
  socialFormat?: 'square' | 'story' | 'linkedin' | 'carousel';
  badgeLabel?: string;
  motionConcept?: 'loader' | 'transition' | 'intro-animation' | 'product-reveal' | 'micro-interaction';
  motionDescription?: string;
  dimensionVariant?: string;
  /**
   * Claude-authored image-prompt parts, per Conversation/ART_DIRECTION_RELIANCE_v4.md.
   * Assembled together with the fixed visual baseline by App/src/ai/client.ts — never
   * sent to Gemini as raw fields, and never authored by Claude as one combined string.
   */
  imageSubject?: string;
  imageAction?: string;
  imageLocation?: string;
  imageFraming?: string;
  imageIsAerial?: boolean;
  imageColourNotes?: string;
  /** The generated image (a data URL), attached by client.ts after a successful call to /api/gemini-image. Never authored by Claude. */
  heroImage?: string;
  /** Names the AI picked — always re-validated against the real registry before use. */
  recommendedComponentNames: string[];
  reasoning: string;
}

export interface AIResult<T> {
  data: T;
  source: 'claude' | 'fallback';
  /** Present when source is 'fallback' — shown honestly in Build details, never hidden. */
  fallbackReason?: string;
}

/**
 * Descriptive alt text for a generated hero image — built from the same
 * image-prompt parts used to generate it, since the image is meaningful
 * content (what the AI actually described), not decorative.
 */
export function describeHeroImage(plan: Pick<BuildPlan, 'imageSubject' | 'imageAction' | 'imageLocation' | 'headline'>): string {
  const parts = [plan.imageSubject, plan.imageAction, plan.imageLocation].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : plan.headline || 'Generated preview image';
}
