import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS } from './shared';

const meta: Meta<typeof Slider> = {
  title: 'Components/Slider',
  component: Slider,
  argTypes: {
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    knobStyle: { control: 'select', options: ['inside', 'outside'] },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    showSteps: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
  },
  args: {
    defaultValue: 40,
    min: 0,
    max: 100,
    step: 1,
    appearance: 'auto',
    orientation: 'horizontal',
    knobStyle: 'outside',
    showSteps: false,
    disabled: false,
    readOnly: false,
  },
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Playground: Story = {};

export const Range: Story = {
  args: {
    defaultValue: [20, 70],
  },
};
