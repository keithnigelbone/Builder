import { useEffect, useState } from 'react';
import { Surface } from '@jds4/oneui-react';
import type { BuildCategoryId, GuidedAnswers } from '../types';
import type { BuildPlan } from '../ai/schema';
import { getDefaultVariant } from '../data/previewDimensions';
import { PreviewFrame } from './PreviewFrame';
import { WebsitePreview } from './previews/WebsitePreview';
import { AppScreenPreview } from './previews/AppScreenPreview';
import { SlidePreview } from './previews/SlidePreview';
import { SocialPreview } from './previews/SocialPreview';
import { MotionPreview } from './previews/MotionPreview';

const CHROME_BY_CATEGORY: Record<BuildCategoryId, 'browser' | 'phone' | 'none'> = {
  website: 'browser',
  'app-screens': 'phone',
  slides: 'none',
  'social-media': 'none',
  motion: 'none',
};

/**
 * Renders the AI-authored (or fallback) build plan through a real,
 * dimension-accurate canvas for the chosen category — assembled entirely
 * from real OneUI components under the Reliance brand, so every colour,
 * radius, and font here is genuinely Reliance's. The AI layer only ever
 * supplies content and structure (see ai/schema.ts); it never chooses
 * styling.
 */
export function BuildPreview({ category, answers, plan }: { category: BuildCategoryId; answers: GuidedAnswers; plan: BuildPlan }) {
  const [variantId, setVariantId] = useState(() => getDefaultVariant(category).id);

  // Reset to this category's default canvas when the category itself
  // changes (starting a new build), but keep the chosen variant across
  // refinements of the *same* build.
  useEffect(() => {
    setVariantId(plan.dimensionVariant ?? getDefaultVariant(category).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <Surface mode="moderate" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-3)' }}>
      <PreviewFrame category={category} variantId={variantId} onVariantChange={setVariantId} chrome={CHROME_BY_CATEGORY[category]}>
        {category === 'website' && <WebsitePreview plan={plan} />}
        {category === 'app-screens' && <AppScreenPreview plan={plan} />}
        {category === 'slides' && <SlidePreview plan={plan} />}
        {category === 'social-media' && <SocialPreview plan={plan} />}
        {category === 'motion' && <MotionPreview plan={plan} feelingAnswerId={answers['motion-feeling']} />}
      </PreviewFrame>
    </Surface>
  );
}
