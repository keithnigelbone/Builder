import type { Meta, StoryObj } from '@storybook/react';
import { Divider } from '@jds4/oneui-react';

const meta: Meta<typeof Divider> = {
  title: 'Components/Divider',
  component: Divider,
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Divider />
      <Divider>OR</Divider>
    </div>
  ),
};
