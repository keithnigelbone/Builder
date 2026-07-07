import { Container, Text, Avatar, BottomNavigation, BottomNavItem, Image, Icon, Button } from '@jds4/oneui-react';
import type { AppScreenBlock, BuildPlan } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';

const DEFAULT_BLOCKS: AppScreenBlock[] = [
  { type: 'list-item', title: 'Content block' },
  { type: 'list-item', title: 'Content block' },
];

const DEFAULT_NAV_ITEMS = [
  { label: 'Home', icon: 'home' },
  { label: 'Search', icon: 'search' },
  { label: 'Settings', icon: 'settings' },
];

function ContentBlock({ block, heroImage, heroAlt }: { block: AppScreenBlock; heroImage?: string; heroAlt: string }) {
  switch (block.type) {
    case 'list-item':
      return (
        <Container
          variant="full-bleed"
          layout="flex"
          align="center"
          gap="3"
          padding="3"
          style={{ minHeight: 64, background: 'var(--Surface-Subtle)', borderRadius: 'var(--Shape-2)' }}
        >
          {block.icon && <Icon icon={block.icon} size="5" />}
          <Container variant="full-bleed" layout="flex" direction="column" gap="0" width="full">
            <Text variant="body" size="M">
              {block.title}
            </Text>
            {block.subtitle && (
              <Text variant="label" size="S" appearance="neutral">
                {block.subtitle}
              </Text>
            )}
          </Container>
        </Container>
      );
    case 'stat':
      return (
        <Container
          variant="full-bleed"
          layout="flex"
          direction="column"
          gap="1"
          padding="4"
          style={{ background: 'var(--Surface-Subtle)', borderRadius: 'var(--Shape-2)' }}
        >
          <Text variant="display" size="S">
            {block.value}
          </Text>
          <Text variant="label" size="S" appearance="neutral">
            {block.label}
          </Text>
        </Container>
      );
    case 'image-card':
      return (
        <Container variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
          {heroImage && <Image src={heroImage} alt={heroAlt} aspectRatio="16:9" width="full" />}
          <Text variant="label" size="S" appearance="neutral">
            {block.caption}
          </Text>
        </Container>
      );
    case 'action':
      return (
        <Button attention="medium" size="m" fullWidth>
          {block.label}
        </Button>
      );
  }
}

export function AppScreenPreview({ plan }: { plan: BuildPlan }) {
  const blocks = plan.contentBlocks?.length ? plan.contentBlocks : DEFAULT_BLOCKS;
  const navItems = plan.screenNavItems?.length ? plan.screenNavItems : DEFAULT_NAV_ITEMS;
  const heroAlt = describeHeroImage(plan);

  return (
    <Container variant="full-bleed" layout="flex" direction="column" width="full" style={{ height: '100%' }}>
      <Container variant="full-bleed" layout="flex" align="center" gap="2" padding="4">
        <Avatar size="s" content="text" alt="User" />
        <Text variant="label" size="M" weight="high">
          {plan.screenTitle || 'Home'}
        </Text>
      </Container>

      <Container variant="full-bleed" layout="flex" direction="column" gap="3" padding="4" grow={1} width="full">
        {plan.heroImage && <Image src={plan.heroImage} alt={heroAlt} aspectRatio="16:9" width="full" />}
        {blocks.map((block, i) => (
          <ContentBlock key={i} block={block} heroImage={plan.heroImage} heroAlt={heroAlt} />
        ))}
      </Container>

      <BottomNavigation aria-label="Preview navigation" defaultValue={navItems[0]?.label.toLowerCase()}>
        {navItems.map((item) => (
          <BottomNavItem key={item.label} icon={item.icon} label={item.label} value={item.label.toLowerCase()} />
        ))}
      </BottomNavigation>
    </Container>
  );
}
