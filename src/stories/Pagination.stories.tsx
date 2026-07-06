import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from '@jds4/oneui-react';

const meta: Meta<typeof Pagination> = {
  title: 'Components/Pagination',
  component: Pagination,
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  render: () => <Pagination totalPages={12} defaultPage={4} showFirstLast />,
};
