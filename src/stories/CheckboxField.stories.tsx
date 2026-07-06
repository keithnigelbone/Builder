import type { Meta, StoryObj } from '@storybook/react';
import { CheckboxField } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS } from './shared';

const meta: Meta<typeof CheckboxField> = {
  title: 'Components/CheckboxField',
  component: CheckboxField,
  argTypes: {
    size: { control: 'select', options: ['s', 'm', 'l'] },
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
    label: { control: 'text' },
    description: { control: 'text' },
    error: { control: 'text' },
    invalid: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Subscribe to newsletter',
    description: 'Occasional product updates only.',
    size: 'm',
    appearance: 'auto',
    invalid: false,
    fullWidth: false,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof CheckboxField>;

export const Playground: Story = {};
