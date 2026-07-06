import type { Meta, StoryObj } from '@storybook/react';
import { CounterBadge } from '@jds4/oneui-react';

const meta: Meta<typeof CounterBadge> = {
  title: 'Components/CounterBadge',
  component: CounterBadge,
};

export default meta;
type Story = StoryObj<typeof CounterBadge>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <CounterBadge value={3} />
      <CounterBadge value={125} max={99} />
    </div>
  ),
};
