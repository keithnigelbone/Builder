import type { Meta, StoryObj } from '@storybook/react';
import { Stepper } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS, ATTENTION_OPTIONS } from './shared';

const meta: Meta<typeof Stepper> = {
  title: 'Components/Stepper',
  component: Stepper,
  argTypes: {
    size: { control: 'select', options: ['s', 'm', 'l'] },
    attention: { control: 'select', options: ATTENTION_OPTIONS },
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
    direction: { control: 'select', options: ['ltr', 'rtl'] },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    condensed: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    error: { control: 'boolean' },
  },
  args: {
    defaultValue: 1,
    min: 0,
    max: 10,
    step: 1,
    size: 'm',
    attention: 'medium',
    appearance: 'auto',
    direction: 'ltr',
    condensed: false,
    disabled: false,
    readOnly: false,
    error: false,
  },
};

export default meta;
type Story = StoryObj<typeof Stepper>;

export const Playground: Story = {};
