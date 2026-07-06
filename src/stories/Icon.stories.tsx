import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from '@jds4/oneui-react';

const meta: Meta<typeof Icon> = {
  title: 'Components/Icon',
  component: Icon,
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Icon icon="home" size="8" />
      <Icon icon="search" size="8" />
      <Icon icon="settings" size="8" />
      <Icon icon="checkCircle" size="8" appearance="positive" />
    </div>
  ),
};
