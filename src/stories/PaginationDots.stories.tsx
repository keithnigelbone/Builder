import type { Meta, StoryObj } from '@storybook/react';
import { PaginationDots } from '@jds4/oneui-react';

const meta: Meta<typeof PaginationDots> = {
  title: 'Components/PaginationDots',
  component: PaginationDots,
};

export default meta;
type Story = StoryObj<typeof PaginationDots>;

export const Default: Story = {
  render: () => <PaginationDots pageCount={8} defaultActiveIndex={2} aria-label="Carousel pages" />,
};
