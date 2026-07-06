import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS, ATTENTION_OPTIONS } from './shared';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l', 'xl'] },
    attention: { control: 'select', options: ATTENTION_OPTIONS },
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
    children: { control: 'text' },
  },
  args: {
    children: 'New',
    size: 'm',
    attention: 'high',
    appearance: 'auto',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Playground: Story = {};
