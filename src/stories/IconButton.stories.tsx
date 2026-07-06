import type { Meta, StoryObj } from '@storybook/react';
import { IconButton } from '@jds4/oneui-react';

const meta: Meta<typeof IconButton> = {
  title: 'Components/IconButton',
  component: IconButton,
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <IconButton icon="home" aria-label="Home" attention="high" />
      <IconButton icon="search" aria-label="Search" attention="medium" />
      <IconButton icon="settings" aria-label="Settings" attention="low" />
    </div>
  ),
};
