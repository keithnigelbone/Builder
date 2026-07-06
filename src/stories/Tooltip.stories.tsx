import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, Button } from '@jds4/oneui-react';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  argTypes: {
    content: { control: 'text' },
    position: {
      control: 'select',
      options: [
        'top', 'topStart', 'topEnd',
        'bottom', 'bottomStart', 'bottomEnd',
        'left', 'leftStart', 'leftEnd',
        'right', 'rightStart', 'rightEnd',
      ],
    },
    trigger: { control: 'select', options: ['hover', 'click', 'focus'] },
    arrow: { control: 'boolean' },
    hoverable: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    content: 'Helpful tooltip text',
    position: 'bottom',
    trigger: 'hover',
    arrow: true,
    hoverable: true,
    disabled: false,
    defaultOpen: true,
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Playground: Story = {
  render: (args) => (
    <div style={{ paddingTop: '3rem' }}>
      <Tooltip {...args}>
        <Button>Hover me</Button>
      </Tooltip>
    </div>
  ),
};
