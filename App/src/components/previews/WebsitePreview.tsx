import { Container, Text, Button, Image } from '@jds4/oneui-react';
import type { BuildPlan } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';
import { BrandMark } from '../BrandMark';

export function WebsitePreview({ plan }: { plan: BuildPlan }) {
  const navItems = plan.navItems?.length ? plan.navItems : ['Product', 'Pricing'];
  const sections = plan.sections ?? [];

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="0" width="full" style={{ height: '100%' }}>
      <Container
        variant="full-bleed"
        layout="flex"
        align="center"
        justify="space-between"
        width="full"
        padding="4"
        style={{ borderBottom: '1px solid var(--Neutral-Stroke-Low)' }}
      >
        <BrandMark size={22} />
        <Container variant="full-bleed" layout="flex" align="center" gap="5" width="fit">
          {navItems.map((item) => (
            <Text key={item} variant="label" size="M" appearance="neutral">
              {item}
            </Text>
          ))}
          <Button attention="high" size="m">
            {plan.ctaLabel || 'Get started'}
          </Button>
        </Container>
      </Container>

      <Container variant="full-bleed" layout="flex" direction="column" align="center" gap="4" padding="10">
        {plan.kicker && (
          <Text variant="label" size="S" appearance="primary">
            {plan.kicker}
          </Text>
        )}
        <Text variant="display" size="L" textAlign="center" style={{ maxWidth: 760 }}>
          {plan.headline}
        </Text>
        {plan.subheadline && (
          <Text variant="body" size="L" appearance="neutral" textAlign="center" style={{ maxWidth: 620 }}>
            {plan.subheadline}
          </Text>
        )}
        <Button attention="high" size="l">
          {plan.ctaLabel || 'Primary action'}
        </Button>
      </Container>

      {plan.heroImage && (
        <Container variant="full-bleed" width="full" padding="10" style={{ paddingTop: 0 }}>
          <Image src={plan.heroImage} alt={describeHeroImage(plan)} aspectRatio="16:9" width="full" />
        </Container>
      )}

      {sections.length > 0 && (
        <Container variant="full-bleed" layout="grid" columns={Math.min(sections.length, 3)} gap="6" width="full" padding="10">
          {sections.map((section) => (
            <Container key={section.title} variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
              <Text variant="title" size="S">
                {section.title}
              </Text>
              <Text variant="body" size="M" appearance="neutral">
                {section.body}
              </Text>
            </Container>
          ))}
        </Container>
      )}
    </Container>
  );
}
