import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '@jds4/oneui-react';
import { INPUT_APPEARANCE_OPTIONS } from './shared';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
    appearance: { control: 'select', options: INPUT_APPEARANCE_OPTIONS },
    shape: { control: 'select', options: ['default', 'pill'] },
    attention: { control: 'select', options: ['medium', 'high'] },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
  },
  args: {
    placeholder: 'Type something…',
    size: 'm',
    appearance: 'auto',
    shape: 'default',
    attention: 'medium',
    disabled: false,
    readOnly: false,
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Playground: Story = {};
