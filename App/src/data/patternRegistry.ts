import type { BuildCategoryId } from '../types';
import type { BuildPlan } from '../ai/schema';

/**
 * Curated Reliance layout patterns — the layout-level equivalent of
 * oneuiRegistry.ts's component gating. Claude picks a pattern (website and
 * app-screens only) and authors content into it; it can never invent a
 * layout, the same way it can never invent a component or a token.
 *
 * IMPORTANT: this module is imported by App/aiServerPlugin.ts in plain Node
 * (Vite config load), so it must stay dependency-free apart from types —
 * in particular it must NOT import oneuiRegistry/storybookRegistry, which
 * rely on import.meta.glob. The "storyComponents only name story-backed
 * components" rule is enforced by tests/unit/data/patternRegistry.test.ts.
 */
export interface BuildPattern {
  id: string;
  category: BuildCategoryId;
  label: string;
  /** The one-line brief Claude chooses from — when this layout is the right call. */
  whenToUse: string;
  /** Composition summary, top to bottom — what the renderer implements. */
  sections: string[];
  /** OneUI components this pattern composes — every name must have a Storybook story. */
  storyComponents: string[];
}

export const BUILD_PATTERNS: BuildPattern[] = [
  // ---- Website (free Claude choice; first entry is the category default) ----
  {
    id: 'product-story',
    category: 'website',
    label: 'Product story',
    whenToUse: 'Product or brand pages that explain and persuade — the default marketing page.',
    sections: ['nav header', 'centered hero copy + CTA', 'hero image', 'feature grid', 'quote spotlight', 'news grid', 'contact band', 'footer'],
    storyComponents: ['Container', 'Text', 'Button', 'Image', 'Surface', 'Divider'],
  },
  {
    id: 'campaign-hero',
    category: 'website',
    label: 'Campaign hero',
    whenToUse: 'Launches and campaigns that lead with one bold image and one message.',
    sections: ['nav header', 'full-bleed image hero with scrim + headline + dual CTA', 'feature grid', 'closing CTA band', 'footer'],
    storyComponents: ['Container', 'Text', 'Button', 'Image', 'Surface', 'Badge'],
  },
  {
    id: 'editorial',
    category: 'website',
    label: 'Editorial',
    whenToUse: 'Announcements, stories, and content-led pages where reading comes first.',
    sections: ['nav header', 'kicker + left-aligned headline + lede', 'numbered article sections', 'pull-quote', 'footer'],
    storyComponents: ['Container', 'Text', 'Button', 'Image', 'Surface', 'Divider'],
  },
  {
    id: 'service-hub',
    category: 'website',
    label: 'Service hub',
    whenToUse: 'Overviews of multiple offerings, businesses, or services side by side.',
    sections: ['nav header', 'centered headline + subheadline', 'icon-led service card grid with per-card CTAs', 'contact band', 'footer'],
    storyComponents: ['Container', 'Text', 'Button', 'Icon', 'Surface', 'Badge'],
  },

  // ---- App screens (free Claude choice; mobile-only; first entry is the default) ----
  {
    id: 'dashboard',
    category: 'app-screens',
    label: 'Dashboard',
    whenToUse: 'Overview screens: greeting, key numbers, recent activity.',
    sections: ['greeting header', 'stat card row', 'activity list', 'bottom nav'],
    storyComponents: ['Container', 'Text', 'Avatar', 'BottomNavigation', 'Image', 'Icon'],
  },
  {
    id: 'onboarding',
    category: 'app-screens',
    label: 'Onboarding',
    whenToUse: 'First-run and welcome screens introducing one value proposition.',
    sections: ['brand mark', 'hero image', 'value-prop headline + body', 'pagination dots', 'primary CTA'],
    storyComponents: ['Container', 'Text', 'Button', 'Image', 'PaginationDots'],
  },
  // The renderer composes the lighter Input control; the registry claims InputField because the upstream package ships no Input meta (Input has a story but is invisible to AVAILABLE_COMPONENTS).
  {
    id: 'browse',
    category: 'app-screens',
    label: 'Browse',
    whenToUse: 'Search, discovery, and catalogue screens with filters.',
    sections: ['top bar', 'search input', 'filter chips', 'content cards', 'bottom nav'],
    storyComponents: ['Container', 'Text', 'InputField', 'Chip', 'ChipGroup', 'Image', 'BottomNavigation'],
  },
  {
    id: 'profile',
    category: 'app-screens',
    label: 'Profile',
    whenToUse: 'Account, settings, and identity screens.',
    sections: ['large avatar header', 'settings list', 'primary action', 'bottom nav'],
    storyComponents: ['Container', 'Text', 'Avatar', 'Icon', 'Button', 'BottomNavigation'],
  },
  {
    id: 'checkout',
    category: 'app-screens',
    label: 'Checkout',
    whenToUse: 'Order review, payment, and confirmation flows.',
    sections: ['top bar', 'order line items', 'total row', 'promo input', 'confirm CTA'],
    storyComponents: ['Container', 'Text', 'Divider', 'InputField', 'Button', 'Avatar'],
  },

  // ---- Slides (fixed: per-slide variety comes from slideType) ----
  {
    id: 'deck',
    category: 'slides',
    label: 'Deck',
    whenToUse: 'Every slides build — per-slide layouts come from each slide\'s slideType (cover, divider, content, split-photo, table, stat, closing).',
    sections: ['cover', 'section dividers', 'content slides', 'split-photo slides', 'data tables', 'stat slides', 'closing slide'],
    storyComponents: ['Surface', 'Text', 'Badge', 'Image', 'Container'],
  },

  // ---- Social (derived 1:1 from socialFormat) ----
  {
    id: 'announcement',
    category: 'social-media',
    label: 'Announcement (square)',
    whenToUse: 'Square 1080×1080 posts announcing one thing boldly.',
    sections: ['brand mark + badge', 'centered display headline', 'CTA'],
    storyComponents: ['Container', 'Text', 'Badge', 'Surface', 'Button'],
  },
  {
    id: 'story-vertical',
    category: 'social-media',
    label: 'Story / Reel',
    whenToUse: '1080×1920 vertical stories led by a full-bleed image.',
    sections: ['full-bleed image + scrim', 'brand mark', 'bottom stack: badge, headline, CTA'],
    storyComponents: ['Container', 'Text', 'Badge', 'Image', 'Button'],
  },
  {
    id: 'linkedin-split',
    category: 'social-media',
    label: 'LinkedIn split',
    whenToUse: '1200×627 landscape posts balancing copy and image.',
    sections: ['left copy column: brand mark, kicker, headline, body, CTA', 'right image'],
    storyComponents: ['Container', 'Text', 'Image', 'Surface', 'Button'],
  },
  {
    id: 'carousel',
    category: 'social-media',
    label: 'Carousel',
    whenToUse: 'Multi-frame square carousels telling one story across 3-5 frames.',
    sections: ['per-frame: brand mark + frame badge, headline, body, pagination dots'],
    storyComponents: ['Container', 'Text', 'Badge', 'Surface', 'PaginationDots'],
  },

  // ---- Motion (derived 1:1 from motionConcept) ----
  {
    id: 'loader',
    category: 'motion',
    label: 'Loader',
    whenToUse: 'Waiting states that stay confident and calm.',
    sections: ['brand loader stage'],
    storyComponents: ['CircularProgressIndicator', 'Container', 'Text'],
  },
  {
    id: 'transition',
    category: 'motion',
    label: 'Transition',
    whenToUse: 'Moving between views or states.',
    sections: ['two-panel slide transition stage'],
    storyComponents: ['Surface', 'Container', 'Text'],
  },
  {
    id: 'intro-animation',
    category: 'motion',
    label: 'Intro animation',
    whenToUse: 'Brand moments that open an experience.',
    sections: ['brand mark reveal stage'],
    storyComponents: ['Container', 'Text', 'Logo'],
  },
  {
    id: 'product-reveal',
    category: 'motion',
    label: 'Product reveal',
    whenToUse: 'Unveiling one product or image with drama.',
    sections: ['image wipe-reveal stage'],
    storyComponents: ['Container', 'Text', 'Image'],
  },
  {
    id: 'micro-interaction',
    category: 'motion',
    label: 'Micro-interaction',
    whenToUse: 'Small UI feedback moments — toggles, taps, confirmations.',
    sections: ['animated control stage'],
    storyComponents: ['Switch', 'Container', 'Text'],
  },

  // ---- Video (fixed: the destination step, not the model, decides the format) ----
  {
    id: 'video-storyboard',
    category: 'video',
    label: 'Storyboard',
    whenToUse: 'Every video build — a destination-formatted storyboard concept: title, opening shot, key scenes, closing frame, voiceover copy.',
    sections: ['format meta', 'true-ratio concept canvas with safe-area guides', 'key-scene strip', 'closing frame', 'voiceover copy', 'Veo-ready prompt'],
    storyComponents: ['Container', 'Text', 'Surface', 'Badge', 'Image', 'Button'],
  },
];

const BY_ID = new Map(BUILD_PATTERNS.map((p) => [p.id, p]));

export function getPattern(id: string): BuildPattern | undefined {
  return BY_ID.get(id);
}

export function getPatternsForCategory(category: BuildCategoryId): BuildPattern[] {
  return BUILD_PATTERNS.filter((p) => p.category === category);
}

/** The first pattern listed for a category — the safe default when Claude's choice is invalid or absent. */
export function getDefaultPattern(category: BuildCategoryId): BuildPattern {
  return getPatternsForCategory(category)[0];
}

const SOCIAL_PATTERN_BY_FORMAT: Record<NonNullable<BuildPlan['socialFormat']>, string> = {
  square: 'announcement',
  story: 'story-vertical',
  linkedin: 'linkedin-split',
  carousel: 'carousel',
};

/**
 * The one place a plan's pattern is decided. Free (but validated) Claude
 * choice for website/app-screens; derived from fields Claude already picks
 * for social (socialFormat) and motion (motionConcept); fixed for slides.
 */
export function resolvePatternId(
  category: BuildCategoryId,
  plan: Pick<BuildPlan, 'patternId' | 'socialFormat' | 'motionConcept'>,
): string {
  if (category === 'slides') return 'deck';
  if (category === 'video') return 'video-storyboard';
  if (category === 'social-media') return SOCIAL_PATTERN_BY_FORMAT[plan.socialFormat ?? 'square'] ?? 'announcement';
  if (category === 'motion') return plan.motionConcept ?? 'loader';
  const candidate = plan.patternId ? getPattern(plan.patternId) : undefined;
  if (candidate && candidate.category === category) return candidate.id;
  return getDefaultPattern(category).id;
}
