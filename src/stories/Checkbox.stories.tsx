import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS } from './shared';

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  argTypes: {
    size: { control: 'select', options: ['s', 'm', 'l'] },
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
    label: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    defaultChecked: { control: 'boolean' },
  },
  args: {
    label: 'Accept terms and conditions',
    size: 'm',
    appearance: 'auto',
    disabled: false,
    readOnly: false,
    indeterminate: false,
    defaultChecked: false,
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Playground: Story = {};
