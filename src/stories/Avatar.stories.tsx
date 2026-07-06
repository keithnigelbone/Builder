import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS, ATTENTION_OPTIONS, PLACEHOLDER_IMAGE } from './shared';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  argTypes: {
    content: { control: 'select', options: ['image', 'icon', 'text'] },
    size: { control: 'select', options: ['2xs', 'xs', 's', 'm', 'l', 'xl', '2xl'] },
    attention: { control: 'select', options: ATTENTION_OPTIONS },
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
    alt: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  args: {
    content: 'text',
    alt: 'Jane Doe',
    src: PLACEHOLDER_IMAGE,
    size: 'm',
    attention: 'high',
    appearance: 'auto',
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Playground: Story = {};
