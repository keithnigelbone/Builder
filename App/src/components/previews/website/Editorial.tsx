import { Container, Text, Image } from '@jds4/oneui-react';
import type { BuildPlan } from '../../../ai/schema';
import { describeHeroImage } from '../../../ai/schema';
import { SiteHeader, SiteFooter } from './shared';

/** "Editorial": reading-first announcement/story page — left-aligned measure, numbered sections, pull-quote. */
export function Editorial({ plan }: { plan: BuildPlan }) {
  const sections = plan.sections ?? [];

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="0" width="full" style={{ minHeight: '100%' }}>
      <SiteHeader plan={plan} />

      <Container variant="full-bleed" layout="flex" direction="column" gap="4" padding="10" style={{ maxWidth: 880 }}>
        {plan.kicker && (
          <Text variant="label" size="S" appearance="primary">
            {plan.kicker}
          </Text>
        )}
        <Text variant="display" size="L" style={{ maxWidth: 820 }}>
          {plan.headline}
        </Text>
        {plan.subheadline && (
          <Text variant="title" size="S" appearance="neutral" style={{ maxWidth: 680 }}>
            {plan.subheadline}
          </Text>
        )}
      </Container>

      {plan.heroImage && (
        <Container variant="full-bleed" width="full" padding="10" style={{ paddingTop: 0 }}>
          <Image src={plan.heroImage} alt={describeHeroImage(plan)} aspectRatio="21:9" width="full" />
        </Container>
      )}

      <Container variant="full-bleed" layout="flex" direction="column" gap="8" padding="10" style={{ maxWidth: 880, paddingTop: 0 }}>
        {plan.body && (
          <Text variant="body" size="L" appearance="neutral" style={{ maxWidth: 680 }}>
            {plan.body}
          </Text>
        )}

        {sections.map((section, i) => (
          <Container key={section.title} variant="full-bleed" layout="flex" gap="6" width="full">
            <Text variant="title" size="M" appearance="primary" style={{ minWidth: 56 }}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <Container variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
              <Text variant="title" size="M">
                {section.title}
              </Text>
              <Text variant="body" size="M" appearance="neutral" style={{ maxWidth: 620 }}>
                {section.body}
              </Text>
            </Container>
          </Container>
        ))}

        {plan.quote && (
          <Container
            variant="full-bleed"
            layout="flex"
            direction="column"
            gap="2"
            width="full"
            padding="6"
            style={{ borderLeft: '4px solid var(--Primary-Bold)' }}
          >
            <Text variant="title" size="L">
              "{plan.quote.text}"
            </Text>
            <Text variant="label" size="M" weight="high">
              {plan.quote.name}
            </Text>
            <Text variant="body" size="S" appearance="neutral">
              {plan.quote.title}
            </Text>
          </Container>
        )}
      </Container>

      <SiteFooter plan={plan} />
    </Container>
  );
}
