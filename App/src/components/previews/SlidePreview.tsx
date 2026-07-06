import { Container, Text, Badge, Image } from '@jds4/oneui-react';
import type { BuildPlan } from '../../ai/schema';
import { BrandMark } from '../BrandMark';

export function SlidePreview({ plan }: { plan: BuildPlan }) {
  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      justify="space-between"
      width="full"
      padding="10"
      style={{ height: '100%', boxSizing: 'border-box' }}
    >
      <Container variant="full-bleed" layout="flex" align="center" justify="space-between" width="full">
        <Badge size="m" appearance="primary">
          {plan.kicker || 'Section'}
        </Badge>
        <BrandMark size={28} />
      </Container>

      <Container variant="full-bleed" layout="flex" direction="column" gap="4" width="full">
        {/* Presentation-safe: large, high-contrast type, minimal copy density. */}
        <Text variant="display" size="L">
          {plan.headline}
        </Text>
        {plan.body && (
          <Text variant="title" size="S" appearance="neutral" style={{ maxWidth: '70%' }}>
            {plan.body}
          </Text>
        )}
        {plan.heroImage && (
          <Container variant="full-bleed" width="full" style={{ maxHeight: 280 }}>
            <Image src={plan.heroImage} alt="" aspectRatio="16:9" width="full" />
          </Container>
        )}
      </Container>
    </Container>
  );
}
