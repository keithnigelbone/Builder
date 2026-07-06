import type { Meta, StoryObj } from '@storybook/react';
import { IndicatorBadge } from '@jds4/oneui-react';

const meta: Meta<typeof IndicatorBadge> = {
  title: 'Components/IndicatorBadge',
  component: IndicatorBadge,
};

export default meta;
type Story = StoryObj<typeof IndicatorBadge>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <IndicatorBadge size="m" appearance="negative" aria-label="Unread notifications" />
      <IndicatorBadge size="l" appearance="positive" aria-label="Online" />
    </div>
  ),
};
