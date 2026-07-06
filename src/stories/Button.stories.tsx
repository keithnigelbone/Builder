import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS, ATTENTION_OPTIONS } from './shared';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    attention: { control: 'select', options: ATTENTION_OPTIONS },
    size: { control: 'select', options: ['2xs', 'xs', 's', 'm', 'l', 'xl', '2xl'] },
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
    contained: { control: 'boolean' },
    condensed: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    children: { control: 'text' },
  },
  args: {
    children: 'Button',
    attention: 'high',
    size: 'm',
    appearance: 'auto',
    contained: true,
    condensed: false,
    fullWidth: false,
    disabled: false,
    loading: false,
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Playground: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Button {...args} attention="high">High</Button>
      <Button {...args} attention="medium">Medium</Button>
      <Button {...args} attention="low">Low</Button>
    </div>
  ),
};
