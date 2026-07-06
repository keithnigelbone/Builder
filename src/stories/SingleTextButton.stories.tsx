import type { Meta, StoryObj } from '@storybook/react';
import { SingleTextButton } from '@jds4/oneui-react';

const meta: Meta<typeof SingleTextButton> = {
  title: 'Components/SingleTextButton',
  component: SingleTextButton,
};

export default meta;
type Story = StoryObj<typeof SingleTextButton>;

export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <SingleTextButton attention="high">A</SingleTextButton>
      <SingleTextButton attention="medium">B</SingleTextButton>
      <SingleTextButton attention="low">C</SingleTextButton>
    </div>
  ),
};
