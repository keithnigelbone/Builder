import type { Meta, StoryObj } from '@storybook/react';
import { Container } from '@jds4/oneui-react';

const meta: Meta<typeof Container> = {
  title: 'Components/Container',
  component: Container,
};

export default meta;
type Story = StoryObj<typeof Container>;

export const Default: Story = {
  render: () => (
    <Container layout="flex" gap="3" padding="4" surface="moderate">
      <Container padding="3" surface="default">Item 1</Container>
      <Container padding="3" surface="default">Item 2</Container>
      <Container padding="3" surface="default">Item 3</Container>
    </Container>
  ),
};
