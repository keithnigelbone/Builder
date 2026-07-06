import type { Meta, StoryObj } from '@storybook/react';
import { RadioField, Radio } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS } from './shared';

const meta: Meta<typeof RadioField> = {
  title: 'Components/RadioField',
  component: RadioField,
  argTypes: {
    size: { control: 'select', options: ['s', 'm', 'l'] },
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
    label: { control: 'text' },
    description: { control: 'text' },
    error: { control: 'text' },
    invalid: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Delivery method',
    description: 'Choose how you want your order delivered.',
    size: 'm',
    appearance: 'auto',
    invalid: false,
    fullWidth: false,
    disabled: false,
    defaultValue: 'standard',
  },
};

export default meta;
type Story = StoryObj<typeof RadioField>;

export const Playground: Story = {
  render: (args) => (
    <RadioField {...args}>
      <Radio value="standard" label="Standard" />
      <Radio value="express" label="Express" />
    </RadioField>
  ),
};
