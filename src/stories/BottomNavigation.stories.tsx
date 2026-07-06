import type { Meta, StoryObj } from '@storybook/react';
import { BottomNavigation, BottomNavItem } from '@jds4/oneui-react';

const meta: Meta<typeof BottomNavigation> = {
  title: 'Components/BottomNavigation',
  component: BottomNavigation,
};

export default meta;
type Story = StoryObj<typeof BottomNavigation>;

export const Default: Story = {
  render: () => (
    <BottomNavigation aria-label="Primary" defaultValue="home">
      <BottomNavItem icon="home" label="Home" value="home" />
      <BottomNavItem icon="search" label="Search" value="search" />
      <BottomNavItem icon="settings" label="Settings" value="settings" />
    </BottomNavigation>
  ),
};
