import type { Meta, StoryObj } from '@storybook/react';
import { TouchSlider } from '@jds4/oneui-react';

const meta: Meta<typeof TouchSlider> = {
  title: 'Components/TouchSlider',
  component: TouchSlider,
};

export default meta;
type Story = StoryObj<typeof TouchSlider>;

export const Default: Story = {
  render: () => (
    <div style={{ width: 280 }}>
      <TouchSlider defaultValue={35} min={0} max={100} aria-label="Volume" />
    </div>
  ),
};
