import type { Meta, StoryObj } from '@storybook/react';
import { IconContained } from '@jds4/oneui-react';

const meta: Meta<typeof IconContained> = {
  title: 'Components/IconContained',
  component: IconContained,
};

export default meta;
type Story = StoryObj<typeof IconContained>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <IconContained icon="home" attention="high" aria-label="Home" />
      <IconContained icon="search" attention="medium" aria-label="Search" />
    </div>
  ),
};
