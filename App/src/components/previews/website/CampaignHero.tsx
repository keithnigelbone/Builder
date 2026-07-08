import { Container, Text, Button, Surface, Badge } from '@jds4/oneui-react';
import type { BuildPlan } from '../../../ai/schema';
import { describeHeroImage } from '../../../ai/schema';
import { SiteHeader, SiteFooter, HERO_SCRIM } from './shared';

/**
 * "Campaign hero": one bold image, one message. The generated hero image is
 * the full-bleed backdrop with the scrim guaranteeing text contrast; without
 * an image the hero falls back to the brand's bold primary surface — a
 * designed absence, never an empty shell.
 */
export function CampaignHero({ plan }: { plan: BuildPlan }) {
  const sections = plan.sections ?? [];

  const heroContent = (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      justify="space-between"
      gap="4"
      width="full"
      padding="10"
      style={{ minHeight: 520, position: 'relative', boxSizing: 'border-box' }}
    >
      {/* Top spacer + one message stack: justify="space-between" then anchors
          the stack to the hero's bottom edge — the same spacer idiom
          SlidePreview's CoverSlide already uses. */}
      <div />
      <Container variant="full-bleed" layout="flex" direction="column" gap="4" width="full">
        {plan.kicker && (
          <Container variant="full-bleed" width="fit">
            <Badge size="m" appearance="brand-bg">
              {plan.kicker}
            </Badge>
          </Container>
        )}
        <Text variant="display" size="L" style={{ maxWidth: 880, color: 'var(--Text-OnBold-High, #fff)' }}>
          {plan.headline}
        </Text>
        {plan.subheadline && (
          <Text variant="body" size="L" style={{ maxWidth: 640, color: 'var(--Text-OnBold-Medium, #fff)' }}>
            {plan.subheadline}
          </Text>
        )}
        <Container variant="full-bleed" layout="flex" gap="3" width="fit">
          <Button attention="high" size="l">
            {plan.ctaLabel || 'Explore now'}
          </Button>
          <Button attention="low" size="l">
            Learn more
          </Button>
        </Container>
      </Container>
    </Container>
  );

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="0" width="full" style={{ minHeight: '100%' }}>
      <SiteHeader plan={plan} />

      {plan.heroImage ? (
        <div
          role="img"
          aria-label={describeHeroImage(plan)}
          style={{
            backgroundImage: `${HERO_SCRIM}, url(${plan.heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {heroContent}
        </div>
      ) : (
        <Surface mode="bold" appearance="primary">
          {heroContent}
        </Surface>
      )}

      {sections.length > 0 && (
        <Container variant="full-bleed" layout="grid" columns={Math.min(sections.length, 3)} gap="6" width="full" padding="10">
          {sections.map((section, i) => (
            <Container key={section.title} variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
              <Text variant="label" size="S" appearance="primary">
                {String(i + 1).padStart(2, '0')}
              </Text>
              <Text variant="title" size="M">
                {section.title}
              </Text>
              <Text variant="body" size="M" appearance="neutral">
                {section.body}
              </Text>
            </Container>
          ))}
        </Container>
      )}

      {plan.contactHeadline && (
        <Surface mode="bold" appearance="primary" style={{ padding: 'var(--Spacing-10)', textAlign: 'center' }}>
          <Text variant="display" size="M" style={{ color: 'var(--Text-OnBold-High, #fff)' }}>
            {plan.contactHeadline}
          </Text>
        </Surface>
      )}

      <SiteFooter plan={plan} />
    </Container>
  );
}
