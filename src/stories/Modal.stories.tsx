import type { Meta, StoryObj } from '@storybook/react';
import { Modal, Button } from '@jds4/oneui-react';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  argTypes: {
    size: { control: 'select', options: ['S', 'M', 'L', 'FullWidth'] },
    header: { control: 'boolean' },
    headerAlign: { control: 'select', options: ['left', 'center'] },
    title: { control: 'text' },
    showTitle: { control: 'boolean' },
    description: { control: 'text' },
    showDescription: { control: 'boolean' },
    footer: { control: 'boolean' },
    footerOrientation: { control: 'select', options: ['horizontal', 'vertical'] },
    dismissible: { control: 'boolean' },
  },
  args: {
    defaultOpen: true,
    size: 'M',
    header: true,
    headerAlign: 'left',
    title: 'Modal title',
    showTitle: true,
    description: 'A short description of what this dialog is for.',
    showDescription: true,
    footer: true,
    footerOrientation: 'horizontal',
    dismissible: true,
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Playground: Story = {
  render: (args) => (
    <Modal
      {...args}
      footerEnd={
        <>
          <Button attention="low">Cancel</Button>
          <Button attention="high">Confirm</Button>
        </>
      }
    >
      Modal body content goes here.
    </Modal>
  ),
};
