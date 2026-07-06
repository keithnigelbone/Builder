import type { Meta, StoryObj } from '@storybook/react';
import { ChipGroup, Chip } from '@jds4/oneui-react';

const meta: Meta<typeof ChipGroup> = {
  title: 'Components/ChipGroup',
  component: ChipGroup,
};

export default meta;
type Story = StoryObj<typeof ChipGroup>;

export const Default: Story = {
  render: () => (
    <ChipGroup aria-label="Filters" defaultValue={['recent']} multiple>
      <Chip value="recent">Recent</Chip>
      <Chip value="popular">Popular</Chip>
      <Chip value="trending">Trending</Chip>
    </ChipGroup>
  ),
};
