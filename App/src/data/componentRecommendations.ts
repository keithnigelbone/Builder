import type { BuildCategoryId, GuidedAnswers } from '../types';
import { AVAILABLE_COMPONENTS, getComponentMeta, type ComponentMeta } from './oneuiRegistry';

/**
 * Curated starting point per build category — real component names only,
 * drawn from AVAILABLE_COMPONENTS (see oneuiRegistry.ts). This is *our*
 * recommendation logic, not brand data, so it's fine for it to be
 * hand-authored — it just must only ever point at components that really
 * ship in @jds4/oneui-react.
 */
const BASE_RECOMMENDATIONS: Record<BuildCategoryId, string[]> = {
  website: ['Container', 'Surface', 'Text', 'Button', 'Image', 'Tabs', 'Divider'],
  'app-screens': ['BottomNavigation', 'Container', 'InputField', 'Button', 'Avatar', 'Tabs'],
  slides: ['Surface', 'Text', 'Divider', 'Badge', 'Image', 'Container'],
  'social-media': ['Surface', 'Image', 'Text', 'Badge', 'Avatar', 'Logo'],
  motion: ['CircularProgressIndicator', 'Modal', 'Tooltip', 'IconButton'],
  video: ['Container', 'Text', 'Surface', 'Badge', 'Image', 'Button'],
};

/** Extra components pulled in when a specific answer is chosen — small, targeted nudges. */
const ANSWER_ADDITIONS: Record<string, string[]> = {
  dashboard: ['Pagination', 'CircularProgressIndicator', 'Chip'],
  sell: ['Chip', 'Badge', 'CounterBadge'],
  checkout: ['InputField', 'CheckboxField', 'Stepper'],
  chat: ['Avatar', 'IndicatorBadge'],
  'data-slide': ['CircularProgressIndicator', 'Badge'],
  'comparison-slide': ['ChipGroup', 'Divider'],
  carousel: ['PaginationDots'],
  'campaign-asset': ['Badge', 'Logo'],
  loader: ['CircularProgressIndicator'],
  'micro-interaction': ['Switch', 'Checkbox', 'Radio'],
};

export interface RecommendedComponent {
  meta: ComponentMeta;
  /** Why it's in this list — shown as a small caption in the UI. */
  reason: string;
}

export function recommendComponents(categoryId: BuildCategoryId, answers: GuidedAnswers): RecommendedComponent[] {
  const names = new Set(BASE_RECOMMENDATIONS[categoryId]);
  for (const answerId of Object.values(answers)) {
    for (const extra of ANSWER_ADDITIONS[answerId] ?? []) names.add(extra);
  }

  const recommended: RecommendedComponent[] = [];
  for (const name of names) {
    const meta = getComponentMeta(name);
    if (!meta) continue; // defensive: only ever recommend components that really exist
    recommended.push({
      meta,
      reason: BASE_RECOMMENDATIONS[categoryId].includes(name)
        ? `Core ${meta.category} component for this category`
        : 'Matches one of your answers',
    });
  }
  return recommended;
}

/** Used by BuildPreview.tsx to sanity-check a component name resolves before rendering it live. */
export function isKnownComponent(name: string): boolean {
  return AVAILABLE_COMPONENTS.some((meta) => meta.name === name);
}
