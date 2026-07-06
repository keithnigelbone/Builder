import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS } from './shared';

const meta: Meta<typeof Switch> = {
  title: 'Components/Switch',
  component: Switch,
  argTypes: {
    size: { control: 'select', options: ['s', 'm', 'l'] },
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
    accent: { control: 'select', options: ['primary', 'secondary', 'sparkle'] },
    children: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    defaultChecked: { control: 'boolean' },
  },
  args: {
    children: 'Enable notifications',
    size: 'm',
    appearance: 'auto',
    disabled: false,
    readOnly: false,
    defaultChecked: true,
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Playground: Story = {};
