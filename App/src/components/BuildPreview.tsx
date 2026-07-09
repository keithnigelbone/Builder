import { useEffect, useState } from 'react';
import { Container, Text, Button, Surface } from '@jds4/oneui-react';
import type { BuildCategoryId, GuidedAnswers } from '../types';
import type { BuildPlan, SlideContent } from '../ai/schema';
import { getDefaultVariant } from '../data/previewDimensions';
import { PreviewFrame } from './PreviewFrame';
import { WebsitePreview } from './previews/WebsitePreview';
import { AppScreenPreview } from './previews/AppScreenPreview';
import { SlidePreview } from './previews/SlidePreview';
import { SocialPreview } from './previews/SocialPreview';
import { MotionPreview } from './previews/MotionPreview';
import { VideoPreview, VideoConceptDetails } from './previews/VideoPreview';

const CHROME_BY_CATEGORY: Record<BuildCategoryId, 'browser' | 'phone' | 'none'> = {
  website: 'browser',
  'app-screens': 'phone',
  slides: 'none',
  'social-media': 'none',
  motion: 'none',
  video: 'none',
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
  const [slideIndex, setSlideIndex] = useState(0);

  // Reset to this category's default canvas (and the first slide, for a
  // slides build) when the category itself changes (starting a new build),
  // but keep the chosen variant/slide across refinements of the *same* build.
  useEffect(() => {
    setVariantId(plan.dimensionVariant ?? getDefaultVariant(category).id);
    setSlideIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Defensively falls back to a single generic slide if plan.slides is ever
  // empty (mirrors the navItems/sections/contentBlocks defensive-default
  // pattern used throughout this file's sibling preview components), and
  // clamps the index if the array is ever shorter than the last-viewed
  // position (e.g. after a refinement that changes the deck length).
  const slides: SlideContent[] = plan.slides?.length ? plan.slides : [{ slideType: 'content', headline: plan.headline || 'Untitled slide' }];
  const frames = plan.carouselFrames?.length ? plan.carouselFrames : [{ headline: plan.headline || 'Untitled frame' }];
  // The deck navigator serves two multi-frame formats: slide decks and
  // social carousels. Which one (if either) is active depends on the
  // category and, for social, the canvas actually being previewed.
  const navigator =
    category === 'slides'
      ? { count: slides.length, noun: 'Slide' }
      : category === 'social-media' && variantId === 'carousel'
        ? { count: frames.length, noun: 'Frame' }
        : null;
  const currentIndex = navigator ? Math.min(Math.max(slideIndex, 0), navigator.count - 1) : 0;

  return (
    <Surface mode="moderate" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-3)' }}>
      <PreviewFrame
        category={category}
        variantId={variantId}
        onVariantChange={setVariantId}
        chrome={CHROME_BY_CATEGORY[category]}
        overrideDimensions={category === 'video' ? plan.videoFormat : undefined}
      >
        {category === 'website' && <WebsitePreview plan={plan} />}
        {category === 'app-screens' && <AppScreenPreview plan={plan} />}
        {category === 'slides' && <SlidePreview slide={slides[currentIndex]} heroImage={plan.heroImage} />}
        {category === 'social-media' && <SocialPreview plan={plan} variantId={variantId} frameIndex={currentIndex} />}
        {category === 'motion' && <MotionPreview plan={plan} feelingAnswerId={answers['motion-feeling']} />}
        {category === 'video' && <VideoPreview plan={plan} />}
      </PreviewFrame>

      {navigator && navigator.count > 1 && (
        <Container variant="full-bleed" layout="flex" align="center" justify="center" gap="4" padding="4">
          <Button attention="low" size="s" disabled={currentIndex === 0} onClick={() => setSlideIndex(currentIndex - 1)}>
            Previous
          </Button>
          <Text variant="label" size="S" appearance="neutral">
            {navigator.noun} {currentIndex + 1} of {navigator.count}
          </Text>
          <Button attention="low" size="s" disabled={currentIndex === navigator.count - 1} onClick={() => setSlideIndex(currentIndex + 1)}>
            Next
          </Button>
        </Container>
      )}

      {category === 'video' && <VideoConceptDetails plan={plan} />}
    </Surface>
  );
}
