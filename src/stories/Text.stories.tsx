import type { Meta, StoryObj } from '@storybook/react';
import { Text } from '@jds4/oneui-react';

const meta: Meta<typeof Text> = {
  title: 'Components/Text',
  component: Text,
};

export default meta;
type Story = StoryObj<typeof Text>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Text variant="display" size="M">Display</Text>
      <Text variant="headline" size="M">Headline</Text>
      <Text variant="title" size="M">Title</Text>
      <Text variant="body" size="M">Body text</Text>
      <Text variant="label" size="M">Label</Text>
      <Text variant="code" size="M">code()</Text>
    </div>
  ),
};
