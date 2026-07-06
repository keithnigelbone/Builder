import type { Meta, StoryObj } from '@storybook/react';
import { InputField } from '@jds4/oneui-react';
import { INPUT_APPEARANCE_OPTIONS } from './shared';

const meta: Meta<typeof InputField> = {
  title: 'Components/InputField',
  component: InputField,
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
    appearance: { control: 'select', options: INPUT_APPEARANCE_OPTIONS },
    shape: { control: 'select', options: ['default', 'pill'] },
    attention: { control: 'select', options: ['medium', 'high'] },
    label: { control: 'text' },
    description: { control: 'text' },
    error: { control: 'text' },
    invalid: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Email address',
    description: "We'll never share it.",
    placeholder: 'you@example.com',
    size: 'm',
    appearance: 'auto',
    shape: 'default',
    attention: 'medium',
    invalid: false,
    fullWidth: false,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof InputField>;

export const Playground: Story = {};

export const WithError: Story = {
  args: {
    invalid: true,
    error: 'Enter a valid email address',
  },
};
