import { Container, Text, Badge, Image } from '@jds4/oneui-react';
import type { BuildPlan } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';
import { closestImageAspectRatio, getVariant } from '../../data/previewDimensions';
import { BrandMark } from '../BrandMark';

export function SocialPreview({ plan, variantId }: { plan: BuildPlan; variantId: string }) {
  const variant = getVariant('social-media', variantId);
  const aspectRatio = closestImageAspectRatio(variant.width, variant.height);

  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      justify="space-between"
      width="full"
      padding="6"
      style={{ height: '100%', boxSizing: 'border-box', background: 'var(--Surface-Bold)' }}
    >
      <Container variant="full-bleed" layout="flex" justify="space-between" align="center" width="full">
        <BrandMark size={36} onBold />
        <Badge size="s" appearance="brand-bg">
          {plan.badgeLabel || 'New'}
        </Badge>
      </Container>

      {plan.heroImage && <Image src={plan.heroImage} alt={describeHeroImage(plan)} aspectRatio={aspectRatio} width="full" />}

      <Container variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
        <Text variant="display" size="S" style={{ color: 'var(--Text-OnBold-High, #fff)' }}>
          {plan.headline}
        </Text>
        {plan.ctaLabel && (
          <Text variant="label" size="M" style={{ color: 'var(--Text-OnBold-Medium, #fff)' }}>
            {plan.ctaLabel}
          </Text>
        )}
      </Container>
    </Container>
  );
}
