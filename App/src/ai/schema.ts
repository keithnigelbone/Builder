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
  screenTitle?: string;
  contentBlocks?: string[];
  socialFormat?: 'square' | 'story' | 'linkedin' | 'carousel';
  badgeLabel?: string;
  motionConcept?: 'loader' | 'transition' | 'intro-animation' | 'product-reveal' | 'micro-interaction';
  motionDescription?: string;
  dimensionVariant?: string;
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
