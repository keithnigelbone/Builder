import { Container, Text, Button } from '@jds4/oneui-react';
import type { BuildPlan } from '../../../ai/schema';
import { BrandMark } from '../../BrandMark';

/**
 * Shared website chrome: every website pattern gets the same real-feeling
 * header and footer so pattern variety happens in the page body, not in the
 * frame. Extracted from the original single-layout WebsitePreview.
 */

/** Text-over-image is only ever done through a scrim — art-direction rule, enforced here as the one shared gradient. */
export const HERO_SCRIM = 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 62%, rgba(0,0,0,0.7) 100%)';

export function SiteHeader({ plan }: { plan: BuildPlan }) {
  const navItems = plan.navItems?.length ? plan.navItems : ['Product', 'Pricing'];
  return (
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
        {/* Fixed, generic label — deliberately not plan.ctaLabel. The header
            CTA is a persistent nav action; the pattern's hero CTA below is
            the single message-specific, high-attention action for the plan's
            ctaLabel. Sharing the same text would also duplicate it verbatim
            on-screen whenever a plan sets ctaLabel. */}
        <Button attention="medium" size="m">
          Get started
        </Button>
      </Container>
    </Container>
  );
}

export function SiteFooter({ plan }: { plan: BuildPlan }) {
  const navItems = plan.navItems?.length ? plan.navItems : ['Product', 'Pricing'];
  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      gap="3"
      width="full"
      padding="10"
      style={{ borderTop: '1px solid var(--Neutral-Stroke-Low)', marginTop: 'auto' }}
    >
      <BrandMark size={20} />
      <Container variant="full-bleed" layout="flex" gap="4" wrap>
        {navItems.map((item) => (
          <Text key={item} variant="label" size="S" appearance="neutral">
            {item}
          </Text>
        ))}
      </Container>
      <Text variant="label" size="XS" appearance="neutral">
        © Reliance
      </Text>
    </Container>
  );
}
