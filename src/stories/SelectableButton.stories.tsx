import type { Meta, StoryObj } from '@storybook/react';
import { SelectableButton } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS, ATTENTION_OPTIONS } from './shared';

const meta: Meta<typeof SelectableButton> = {
  title: 'Components/SelectableButton',
  component: SelectableButton,
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
    attention: { control: 'select', options: ATTENTION_OPTIONS },
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
    children: { control: 'text' },
    contained: { control: 'boolean' },
    condensed: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    defaultSelected: { control: 'boolean' },
  },
  args: {
    children: 'Selectable option',
    size: 'm',
    attention: 'high',
    appearance: 'auto',
    contained: true,
    condensed: false,
    fullWidth: false,
    disabled: false,
    loading: false,
    defaultSelected: true,
  },
};

export default meta;
type Story = StoryObj<typeof SelectableButton>;

export const Playground: Story = {};
