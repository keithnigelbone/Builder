import type { BuildCategoryId, GuidedAnswers } from '../types';
import { BUILD_CATEGORIES, getBuildCategory } from '../data/buildCategories';
import { recommendComponents } from '../data/componentRecommendations';
import type { AIResult, BuildPlan, ClassifyResult } from './schema';

/**
 * Deterministic, non-AI content generation — used whenever Claude is
 * unreachable (no API key, network error, bad response) so the app never
 * hard-stops. This is what "works locally even without Claude" actually
 * means: a real, functioning path, not a placeholder.
 */

/** Very small keyword match so a typed prompt still lands in a sensible guided flow. */
function inferCategoryFromPrompt(prompt: string): BuildCategoryId {
  const text = prompt.toLowerCase();
  if (/(app|screen|mobile|checkout|onboarding)/.test(text)) return 'app-screens';
  if (/(slide|deck|presentation|pitch)/.test(text)) return 'slides';
  if (/(social|post|instagram|story|carousel|linkedin)/.test(text)) return 'social-media';
  if (/(motion|animat|transition|loader|micro-interaction)/.test(text)) return 'motion';
  return 'website';
}

export function fallbackClassify(prompt: string, reason: string): AIResult<ClassifyResult> {
  const category = inferCategoryFromPrompt(prompt);
  const found = getBuildCategory(category) ?? BUILD_CATEGORIES[0];
  return {
    data: {
      category: found.id,
      reasoning: `Matched "${found.label}" from keywords in your prompt (no live reasoning available).`,
      // Reuse the existing hand-authored guided questions as the fallback follow-ups.
      followUps: found.questions,
    },
    source: 'fallback',
    fallbackReason: reason,
  };
}

interface PlanInput {
  category: BuildCategoryId;
  prompt: string;
  answers: GuidedAnswers;
  refinement?: string;
}

const HEADLINE_BY_CATEGORY: Record<BuildCategoryId, string> = {
  website: 'A headline that sells the idea',
  'app-screens': 'Home',
  slides: 'Key message goes here',
  'social-media': 'Call to action headline',
  motion: 'Motion concept',
};

export function fallbackPlan(input: PlanInput, reason: string): AIResult<BuildPlan> {
  const components = recommendComponents(input.category, input.answers);
  const base: BuildPlan = {
    headline: HEADLINE_BY_CATEGORY[input.category],
    subheadline: 'Supporting copy goes here.',
    body: 'Supporting detail goes here.',
    kicker: 'Section',
    ctaLabel: 'Get started',
    navItems: ['Product', 'Pricing'],
    sections: [],
    quote: { text: 'A short quote goes here.', name: 'Name', title: 'Title' },
    newsItems: [
      { title: 'Update headline', date: 'Date' },
      { title: 'Update headline', date: 'Date' },
      { title: 'Update headline', date: 'Date' },
    ],
    contactHeadline: 'Get in touch.',
    screenTitle: 'Home',
    contentBlocks: [
      { type: 'list-item', icon: 'list', title: 'List item', subtitle: 'Supporting detail' },
      { type: 'stat', value: '12', label: 'Stat label' },
      { type: 'image-card', caption: 'Image caption' },
      { type: 'action', label: 'Action' },
    ],
    screenNavItems: [
      { label: 'Home', icon: 'home' },
      { label: 'Search', icon: 'search' },
      { label: 'Settings', icon: 'settings' },
    ],
    slides: [
      { slideType: 'cover', headline: 'A headline that sells the idea', subheadline: 'Supporting copy goes here.' },
      { slideType: 'content', headline: 'Key message goes here', kicker: 'Section', body: 'Supporting detail goes here.' },
      {
        slideType: 'table',
        headline: 'Key message goes here',
        tableColumns: [
          { header: 'Column one', items: ['Point one', 'Point two'] },
          { header: 'Column two', items: ['Point one', 'Point two'] },
        ],
      },
    ],
    socialFormat: 'square',
    badgeLabel: 'New',
    motionConcept: 'loader',
    motionDescription: 'A steady, confident loading state.',
    recommendedComponentNames: components.map((c) => c.meta.name),
    reasoning:
      'No live reasoning available for this request — used a generic on-brand layout for this category instead of AI-authored content.',
  };
  return { data: base, source: 'fallback', fallbackReason: reason };
}
