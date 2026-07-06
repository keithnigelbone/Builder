import type { Meta, StoryObj } from '@storybook/react';
import { Surface, Text } from '@jds4/oneui-react';

const meta: Meta<typeof Surface> = {
  title: 'Components/Surface',
  component: Surface,
};

export default meta;
type Story = StoryObj<typeof Surface>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      {(['subtle', 'default', 'minimal', 'moderate', 'bold', 'ghost'] as const).map((mode) => (
        <Surface key={mode} mode={mode} style={{ padding: '1rem', minWidth: 90, textAlign: 'center' }}>
          <Text variant="label" size="S">{mode}</Text>
        </Surface>
      ))}
    </div>
  ),
};
