import type { Meta, StoryObj } from '@storybook/react';
import { SelectableIconButton } from '@jds4/oneui-react';

const meta: Meta<typeof SelectableIconButton> = {
  title: 'Components/SelectableIconButton',
  component: SelectableIconButton,
};

export default meta;
type Story = StoryObj<typeof SelectableIconButton>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <SelectableIconButton icon="home" aria-label="Home" defaultSelected />
      <SelectableIconButton icon="search" aria-label="Search" />
    </div>
  ),
};
