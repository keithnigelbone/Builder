import { Container, Text, Avatar, BottomNavigation, BottomNavItem } from '@jds4/oneui-react';
import type { BuildPlan } from '../../ai/schema';

export function AppScreenPreview({ plan }: { plan: BuildPlan }) {
  const blocks = plan.contentBlocks?.length ? plan.contentBlocks : ['Content block', 'Content block'];

  return (
    <Container variant="full-bleed" layout="flex" direction="column" width="full" style={{ height: '100%' }}>
      <Container variant="full-bleed" layout="flex" align="center" gap="2" padding="4">
        <Avatar size="s" content="text" alt="User" />
        <Text variant="label" size="M" weight="high">
          {plan.screenTitle || 'Home'}
        </Text>
      </Container>

      <Container variant="full-bleed" layout="flex" direction="column" gap="3" padding="4" grow={1} width="full">
        {blocks.map((label, i) => (
          <Container
            key={i}
            variant="full-bleed"
            layout="flex"
            align="center"
            padding="3"
            style={{ minHeight: 72, background: 'var(--Surface-Subtle)', borderRadius: 'var(--Shape-2)' }}
          >
            <Text variant="body" size="S" appearance="neutral">
              {label}
            </Text>
          </Container>
        ))}
      </Container>

      <BottomNavigation aria-label="Preview navigation" defaultValue="home">
        <BottomNavItem icon="home" label="Home" value="home" />
        <BottomNavItem icon="search" label="Search" value="search" />
        <BottomNavItem icon="settings" label="Settings" value="settings" />
      </BottomNavigation>
    </Container>
  );
}
