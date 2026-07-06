import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS, ATTENTION_OPTIONS } from './shared';

const meta: Meta<typeof Chip> = {
  title: 'Components/Chip',
  component: Chip,
  argTypes: {
    size: { control: 'select', options: ['s', 'm', 'l'] },
    attention: { control: 'select', options: ATTENTION_OPTIONS },
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
    children: { control: 'text' },
    disabled: { control: 'boolean' },
    defaultSelected: { control: 'boolean' },
  },
  args: {
    children: 'Filter chip',
    size: 'm',
    attention: 'high',
    appearance: 'auto',
    disabled: false,
    defaultSelected: true,
  },
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Playground: Story = {};
