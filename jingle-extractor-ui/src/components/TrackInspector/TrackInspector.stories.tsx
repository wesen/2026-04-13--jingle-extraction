import type { Meta, StoryObj } from '@storybook/react-vite';
import { currentRunFixture, currentRunTracksFixture } from '../../mocks/fixtures/studio';
import { MacWindow } from '../MacWindow';
import { WIDGET } from '../JingleExtractor/parts';
import { TrackInspector } from './TrackInspector';

const meta = {
  component: TrackInspector,
  title: 'JingleExtractor/Studio/TrackInspector',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-widget={WIDGET} data-je-theme="retro" style={{ padding: 8, maxWidth: 520 }}>
        <MacWindow title="Selected Track Inspector">
          <div style={{ padding: 8 }}>
            <Story />
          </div>
        </MacWindow>
      </div>
    ),
  ],
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
