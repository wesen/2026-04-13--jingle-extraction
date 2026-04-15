import type { Meta, StoryObj } from '@storybook/react-vite';
import { withWidgetRoot } from '../storybook/widgetStoryDecorators';
import { StatusBadge } from './StatusBadge';

const meta = {
  component: StatusBadge,
  title: 'JingleExtractor/StatusBadge',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [withWidgetRoot({ style: { padding: 8, display: 'flex', gap: 8, flexWrap: 'wrap' } })],
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  args: { status: 'pending' },
};

export const Generated: Story = {
  args: { status: 'generated' },
};

export const Analyzed: Story = {
  args: { status: 'analyzed' },
};

export const Failed: Story = {
  args: { status: 'failed' },
};

export const FullSet: Story = {
  args: { status: 'pending' },
  render: () => (
    <>
      <StatusBadge status="queued" />
      <StatusBadge status="generating" />
      <StatusBadge status="uploaded" />
      <StatusBadge status="transcribing" />
      <StatusBadge status="analyzing_rhythm" />
      <StatusBadge status="mining_candidates" />
      <StatusBadge status="generated" />
      <StatusBadge status="analyzed" />
      <StatusBadge status="failed" />
    </>
  ),
};
