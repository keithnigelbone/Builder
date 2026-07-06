import type { Meta, StoryObj } from '@storybook/react';
import { Image } from '@jds4/oneui-react';
import { PLACEHOLDER_IMAGE } from './shared';

const meta: Meta<typeof Image> = {
  title: 'Components/Image',
  component: Image,
};

export default meta;
type Story = StoryObj<typeof Image>;

export const Default: Story = {
  render: () => (
    <Image src={PLACEHOLDER_IMAGE} alt="Placeholder" aspectRatio="16:9" width={240} />
  ),
};
