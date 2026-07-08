import { Container, Text, Button, Image, Surface } from '@jds4/oneui-react';
import type { BuildPlan } from '../../../ai/schema';
import { describeHeroImage } from '../../../ai/schema';
import { BrandMark } from '../../BrandMark';
import { SiteHeader, SiteFooter } from './shared';

/** "Product story": split-intent marketing page — the default website pattern. */
export function ProductStory({ plan }: { plan: BuildPlan }) {
  const sections = plan.sections ?? [];

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="0" width="full" style={{ minHeight: '100%' }}>
      <SiteHeader plan={plan} />

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

      {plan.quote && (
        <Container variant="full-bleed" width="full" padding="10" style={{ paddingTop: 0 }}>
          <Surface mode="moderate" style={{ padding: 'var(--Spacing-8)', borderRadius: 'var(--Shape-3)' }}>
            <Text variant="title" size="L">
              "{plan.quote.text}"
            </Text>
            <Text variant="label" size="M" weight="high">
              {plan.quote.name}
            </Text>
            <Text variant="body" size="S" appearance="neutral">
              {plan.quote.title}
            </Text>
          </Surface>
        </Container>
      )}

      {plan.newsItems && plan.newsItems.length > 0 && (
        <Container variant="full-bleed" layout="grid" columns={Math.min(plan.newsItems.length, 3)} gap="6" width="full" padding="10">
          {plan.newsItems.map((item) => (
            <Surface key={item.title} mode="subtle" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-3)' }}>
              {plan.heroImage ? (
                <Image src={plan.heroImage} alt={describeHeroImage(plan)} aspectRatio="16:9" width="full" />
              ) : (
                <Surface
                  mode="bold"
                  appearance="primary"
                  style={{
                    aspectRatio: '16 / 9',
                    borderRadius: 'var(--Shape-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BrandMark size={32} onBold />
                </Surface>
              )}
              <Text variant="label" size="S" appearance="neutral" style={{ marginTop: 'var(--Spacing-3)' }}>
                {item.date}
              </Text>
              <Text variant="title" size="S">
                {item.title}
              </Text>
            </Surface>
          ))}
        </Container>
      )}

      {plan.contactHeadline && (
        <Container variant="full-bleed" width="full">
          <Surface mode="moderate" style={{ padding: 'var(--Spacing-10)', textAlign: 'center' }}>
            <Text variant="display" size="M">
              {plan.contactHeadline}
            </Text>
          </Surface>
        </Container>
      )}

      <SiteFooter plan={plan} />
    </Container>
  );
}
