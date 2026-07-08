import { Container, Text, Avatar, BottomNavigation, BottomNavItem, Image, Icon, Button, Input, Chip, ChipGroup, InputField, PaginationDots } from '@jds4/oneui-react';
import type { AppScreenBlock, BuildPlan } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';
import { resolvePatternId } from '../../data/patternRegistry';
import { BrandMark } from '../BrandMark';

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

function TopBar({ title }: { title: string }) {
  return (
    <Container variant="full-bleed" layout="flex" align="center" gap="2" padding="4">
      <Avatar size="s" content="text" alt="User" />
      <Text variant="label" size="M" weight="high">
        {title}
      </Text>
    </Container>
  );
}

function BottomNav({ navItems }: { navItems: { label: string; icon: string }[] }) {
  return (
    <BottomNavigation aria-label="Preview navigation" defaultValue={navItems[0]?.label.toLowerCase()}>
      {navItems.map((item) => (
        <BottomNavItem key={item.label} icon={item.icon} label={item.label} value={item.label.toLowerCase()} />
      ))}
    </BottomNavigation>
  );
}

export function AppScreenPreview({ plan }: { plan: BuildPlan }) {
  const blocks = plan.contentBlocks?.length ? plan.contentBlocks : DEFAULT_BLOCKS;
  const navItems = plan.screenNavItems?.length ? plan.screenNavItems : DEFAULT_NAV_ITEMS;
  const heroAlt = describeHeroImage(plan);
  const title = plan.screenTitle || 'Home';
  const patternId = resolvePatternId('app-screens', plan);

  if (patternId === 'onboarding') {
    return (
      <Container variant="full-bleed" layout="flex" direction="column" align="center" justify="space-between" width="full" padding="6" style={{ height: '100%', boxSizing: 'border-box' }}>
        <BrandMark size={28} />
        <Container variant="full-bleed" layout="flex" direction="column" align="center" gap="4" width="full">
          {plan.heroImage && <Image src={plan.heroImage} alt={heroAlt} aspectRatio="1:1" width="full" />}
          <Text variant="display" size="S" textAlign="center">
            {plan.headline || title}
          </Text>
          {plan.body && (
            <Text variant="body" size="M" appearance="neutral" textAlign="center">
              {plan.body}
            </Text>
          )}
          <PaginationDots pageCount={3} defaultActiveIndex={0} aria-label="Onboarding steps" />
        </Container>
        <Button attention="high" size="l" fullWidth>
          {plan.ctaLabel || 'Get started'}
        </Button>
      </Container>
    );
  }

  if (patternId === 'browse') {
    const filterChips = navItems.slice(0, 3).map((item) => item.label);
    return (
      <Container variant="full-bleed" layout="flex" direction="column" width="full" style={{ height: '100%' }}>
        <TopBar title={title} />
        <Container variant="full-bleed" layout="flex" direction="column" gap="3" padding="4" grow={1} width="full">
          <Input size="m" placeholder="Search" />
          <ChipGroup aria-label="Filters" value={[filterChips[0]?.toLowerCase() ?? 'all']} onValueChange={() => {}}>
            <Container variant="full-bleed" layout="flex" gap="2" wrap>
              {filterChips.map((label) => (
                <Chip key={label} value={label.toLowerCase()} size="s" attention="medium">
                  {label}
                </Chip>
              ))}
            </Container>
          </ChipGroup>
          {plan.heroImage && <Image src={plan.heroImage} alt={heroAlt} aspectRatio="16:9" width="full" />}
          {blocks.map((block, i) => (
            <ContentBlock key={i} block={block} heroImage={plan.heroImage} heroAlt={heroAlt} />
          ))}
        </Container>
        <BottomNav navItems={navItems} />
      </Container>
    );
  }

  if (patternId === 'profile') {
    return (
      <Container variant="full-bleed" layout="flex" direction="column" width="full" style={{ height: '100%' }}>
        <Container variant="full-bleed" layout="flex" direction="column" align="center" gap="2" padding="6">
          {/* size "m" is the largest Avatar size proven by its story args — the
              generous padding around it carries the "large header" feel. */}
          <Avatar size="m" content="text" alt="User" />
          <Text variant="title" size="M">
            {title}
          </Text>
        </Container>
        <Container variant="full-bleed" layout="flex" direction="column" gap="3" padding="4" grow={1} width="full">
          {blocks.map((block, i) => (
            <ContentBlock key={i} block={block} heroImage={plan.heroImage} heroAlt={heroAlt} />
          ))}
        </Container>
        <BottomNav navItems={navItems} />
      </Container>
    );
  }

  if (patternId === 'checkout') {
    return (
      <Container variant="full-bleed" layout="flex" direction="column" width="full" style={{ height: '100%' }}>
        <TopBar title={title} />
        <Container variant="full-bleed" layout="flex" direction="column" gap="3" padding="4" grow={1} width="full">
          {blocks.map((block, i) => (
            <ContentBlock key={i} block={block} heroImage={plan.heroImage} heroAlt={heroAlt} />
          ))}
          <InputField label="Promo code" placeholder="Enter code" size="m" />
        </Container>
        <Container variant="full-bleed" layout="flex" direction="column" padding="4" width="full">
          <Button attention="high" size="l" fullWidth>
            {plan.ctaLabel || 'Confirm'}
          </Button>
        </Container>
      </Container>
    );
  }

  // dashboard — the default composition.
  return (
    <Container variant="full-bleed" layout="flex" direction="column" width="full" style={{ height: '100%' }}>
      <Container variant="full-bleed" layout="flex" align="center" justify="space-between" padding="4">
        <Container variant="full-bleed" layout="flex" direction="column" gap="0">
          <Text variant="label" size="S" appearance="neutral">
            Good morning
          </Text>
          <Text variant="title" size="S">
            {title}
          </Text>
        </Container>
        <Avatar size="s" content="text" alt="User" />
      </Container>

      <Container variant="full-bleed" layout="flex" direction="column" gap="3" padding="4" grow={1} width="full">
        {plan.heroImage && <Image src={plan.heroImage} alt={heroAlt} aspectRatio="16:9" width="full" />}
        {blocks.map((block, i) => (
          <ContentBlock key={i} block={block} heroImage={plan.heroImage} heroAlt={heroAlt} />
        ))}
      </Container>

      <BottomNav navItems={navItems} />
    </Container>
  );
}
