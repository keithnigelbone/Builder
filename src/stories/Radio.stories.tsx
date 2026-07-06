import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, Radio } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS } from './shared';

const meta: Meta<typeof RadioGroup> = {
  title: 'Components/Radio',
  component: RadioGroup,
  argTypes: {
    size: { control: 'select', options: ['s', 'm', 'l'] },
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
  },
  args: {
    size: 'm',
    appearance: 'auto',
    orientation: 'vertical',
    disabled: false,
    readOnly: false,
    defaultValue: 'b',
  },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Playground: Story = {
  render: (args) => (
    <RadioGroup {...args}>
      <Radio value="a" label="Option A" />
      <Radio value="b" label="Option B" />
      <Radio value="c" label="Option C" />
    </RadioGroup>
  ),
};
