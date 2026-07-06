import type { Meta, StoryObj } from '@storybook/react';
import { Logo } from '@jds4/oneui-react';

const meta: Meta<typeof Logo> = {
  title: 'Components/Logo',
  component: Logo,
};

export default meta;
type Story = StoryObj<typeof Logo>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
      <Logo variant="mark" size="l" alt="Jio" />
      <Logo variant="full" size="l" alt="Jio" />
    </div>
  ),
};
