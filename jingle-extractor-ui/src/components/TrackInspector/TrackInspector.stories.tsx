import type { Meta, StoryObj } from '@storybook/react-vite';
import { currentRunFixture, currentRunTracksFixture } from '../../mocks/fixtures/studio';
import { withWidgetWindow } from '../storybook/widgetStoryDecorators';
import { TrackInspector } from './TrackInspector';

const meta = {
  component: TrackInspector,
  title: 'JingleExtractor/Studio/TrackInspector',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [withWidgetWindow({ title: 'Selected Track Inspector', style: { padding: 8, maxWidth: 520 } })],
} satisfies Meta<typeof TrackInspector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    track: null,
  },
};

export const GeneratedTrack: Story = {
  args: {
    track: currentRunTracksFixture[0],
    run: currentRunFixture,
    onPreview: () => undefined,
    onAnalyze: () => undefined,
    onOpenInMining: () => undefined,
  },
};

export const AnalyzedTrack: Story = {
  args: {
    track: currentRunTracksFixture[1],
    run: currentRunFixture,
    isPreviewing: true,
    onPreview: () => undefined,
    onAnalyze: () => undefined,
    onOpenInMining: () => undefined,
  },
};
