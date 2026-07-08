import { Container, Text, Badge, Image, Surface, Button, PaginationDots } from '@jds4/oneui-react';
import type { BuildPlan, CarouselFrame } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';
import { BrandMark } from '../BrandMark';
import { HERO_SCRIM } from './website/shared';

/**
 * One designed composition per social canvas. The composition follows the
 * canvas actually being previewed (variantId), so switching the size picker
 * always shows a layout designed for that size — never a stretched square.
 */
export function SocialPreview({ plan, variantId, frameIndex = 0 }: { plan: BuildPlan; variantId: string; frameIndex?: number }) {
  switch (variantId) {
    case 'story':
      return <StoryVertical plan={plan} />;
    case 'linkedin':
      return <LinkedInSplit plan={plan} />;
    case 'carousel':
      return <CarouselFramePreview plan={plan} frameIndex={frameIndex} />;
    case 'square':
    default:
      return <Announcement plan={plan} />;
  }
}

function BrandRow({ plan }: { plan: BuildPlan }) {
  return (
    <Container variant="full-bleed" layout="flex" justify="space-between" align="center" width="full">
      <BrandMark size={36} onBold />
      <Badge size="s" appearance="brand-bg">
        {plan.badgeLabel || 'New'}
      </Badge>
    </Container>
  );
}

/** Square 1080×1080 — one bold statement. */
function Announcement({ plan }: { plan: BuildPlan }) {
  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      justify="space-between"
      width="full"
      padding="8"
      style={{ height: '100%', boxSizing: 'border-box', background: 'var(--Surface-Bold)' }}
    >
      <BrandRow plan={plan} />
      {plan.heroImage && <Image src={plan.heroImage} alt={describeHeroImage(plan)} aspectRatio="16:9" width="full" />}
      <Container variant="full-bleed" layout="flex" direction="column" gap="4" width="full">
        <Text variant="display" size="M" style={{ color: 'var(--Text-OnBold-High, #fff)', maxWidth: '85%' }}>
          {plan.headline}
        </Text>
        {plan.ctaLabel && (
          <Container variant="full-bleed" width="fit">
            <Button attention="high" size="l">
              {plan.ctaLabel}
            </Button>
          </Container>
        )}
      </Container>
    </Container>
  );
}

/** 1080×1920 vertical — image-led with a scrim-anchored bottom stack. */
function StoryVertical({ plan }: { plan: BuildPlan }) {
  const backdrop = plan.heroImage
    ? { backgroundImage: `${HERO_SCRIM}, url(${plan.heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'var(--Surface-Bold)' };
  return (
    <div style={{ height: '100%', position: 'relative', ...backdrop }}>
      {plan.heroImage && <div role="img" aria-label={describeHeroImage(plan)} style={{ position: 'absolute', inset: 0 }} />}
      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        justify="space-between"
        width="full"
        padding="8"
        style={{ height: '100%', boxSizing: 'border-box', position: 'relative' }}
      >
        <BrandRow plan={plan} />
        <Container variant="full-bleed" layout="flex" direction="column" gap="4" width="full">
          <Text variant="display" size="M" style={{ color: 'var(--Text-OnBold-High, #fff)' }}>
            {plan.headline}
          </Text>
          {plan.ctaLabel && (
            <Container variant="full-bleed" width="fit">
              <Button attention="high" size="l">
                {plan.ctaLabel}
              </Button>
            </Container>
          )}
        </Container>
      </Container>
    </div>
  );
}

/** 1200×627 landscape — copy left, image right. */
function LinkedInSplit({ plan }: { plan: BuildPlan }) {
  return (
    <Container variant="full-bleed" layout="flex" width="full" style={{ height: '100%', boxSizing: 'border-box' }}>
      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        justify="space-between"
        gap="3"
        padding="8"
        style={{ width: '55%', height: '100%', boxSizing: 'border-box' }}
      >
        <BrandMark size={28} />
        <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
          {plan.badgeLabel && (
            <Badge size="s" appearance="primary">
              {plan.badgeLabel}
            </Badge>
          )}
          <Text variant="title" size="L">
            {plan.headline}
          </Text>
          {plan.body && (
            <Text variant="body" size="M" appearance="neutral">
              {plan.body}
            </Text>
          )}
        </Container>
        {plan.ctaLabel ? (
          <Container variant="full-bleed" width="fit">
            <Button attention="high" size="m">
              {plan.ctaLabel}
            </Button>
          </Container>
        ) : (
          <div />
        )}
      </Container>
      {plan.heroImage ? (
        <div
          role="img"
          aria-label={describeHeroImage(plan)}
          style={{ width: '45%', height: '100%', backgroundImage: `url(${plan.heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      ) : (
        <Surface mode="bold" appearance="primary" style={{ width: '45%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrandMark size={64} onBold />
        </Surface>
      )}
    </Container>
  );
}

/** 1080×1080 per frame — a mini-slide; BuildPreview owns which frame is showing. */
function CarouselFramePreview({ plan, frameIndex }: { plan: BuildPlan; frameIndex: number }) {
  const frames: CarouselFrame[] = plan.carouselFrames?.length ? plan.carouselFrames : [{ headline: plan.headline || 'Untitled frame' }];
  const index = Math.min(Math.max(frameIndex, 0), frames.length - 1);
  const frame = frames[index];

  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      justify="space-between"
      width="full"
      padding="8"
      style={{ height: '100%', boxSizing: 'border-box', background: 'var(--Surface-Bold)' }}
    >
      <Container variant="full-bleed" layout="flex" justify="space-between" align="center" width="full">
        <BrandMark size={36} onBold />
        <Badge size="s" appearance="brand-bg">
          {`${index + 1}/${frames.length}`}
        </Badge>
      </Container>
      <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
        <Text variant="display" size="M" style={{ color: 'var(--Text-OnBold-High, #fff)', maxWidth: '85%' }}>
          {frame.headline}
        </Text>
        {frame.body && (
          <Text variant="body" size="L" style={{ color: 'var(--Text-OnBold-Medium, #fff)', maxWidth: '75%' }}>
            {frame.body}
          </Text>
        )}
      </Container>
      <PaginationDots pageCount={frames.length} activeIndex={index} aria-label="Carousel frames" />
    </Container>
  );
}
