import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from '@jds4/oneui-react';
import { APPEARANCE_OPTIONS } from './shared';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    size: { control: 'select', options: ['s', 'm', 'l'] },
    appearance: { control: 'select', options: APPEARANCE_OPTIONS },
  },
  args: {
    orientation: 'horizontal',
    size: 'm',
    appearance: 'auto',
    defaultValue: 'overview',
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Playground: Story = {
  render: (args) => (
    <Tabs {...args}>
      <Tabs.List>
        <Tabs.Item value="overview">Overview</Tabs.Item>
        <Tabs.Item value="activity">Activity</Tabs.Item>
        <Tabs.Item value="settings">Settings</Tabs.Item>
        <Tabs.Indicator />
      </Tabs.List>
      <Tabs.Panel value="overview">Overview panel content.</Tabs.Panel>
      <Tabs.Panel value="activity">Activity panel content.</Tabs.Panel>
      <Tabs.Panel value="settings">Settings panel content.</Tabs.Panel>
    </Tabs>
  ),
};
