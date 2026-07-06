import type { Meta, StoryObj } from '@storybook/react';
import { SelectableSingleTextButton } from '@jds4/oneui-react';

const meta: Meta<typeof SelectableSingleTextButton> = {
  title: 'Components/SelectableSingleTextButton',
  component: SelectableSingleTextButton,
};

export default meta;
type Story = StoryObj<typeof SelectableSingleTextButton>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <SelectableSingleTextButton defaultSelected>A</SelectableSingleTextButton>
      <SelectableSingleTextButton>B</SelectableSingleTextButton>
    </div>
  ),
};
