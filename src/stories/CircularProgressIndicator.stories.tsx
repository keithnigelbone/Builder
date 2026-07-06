import type { Meta, StoryObj } from '@storybook/react';
import { CircularProgressIndicator } from '@jds4/oneui-react';

const meta: Meta<typeof CircularProgressIndicator> = {
  title: 'Components/CircularProgressIndicator',
  component: CircularProgressIndicator,
};

export default meta;
type Story = StoryObj<typeof CircularProgressIndicator>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
      <CircularProgressIndicator variant="determinate" value={65} size="L" content="text" aria-label="65% complete" />
      <CircularProgressIndicator variant="indeterminate" size="M" aria-label="Loading" />
    </div>
  ),
};
