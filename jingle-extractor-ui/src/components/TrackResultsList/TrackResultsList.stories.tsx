import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import type { TrackLibraryItem } from '../../api/types';
import { currentRunFixture, currentRunTracksFixture } from '../../mocks/fixtures/studio';
import { MacWindow } from '../MacWindow';
import { WIDGET } from '../JingleExtractor/parts';
import { TrackResultsList } from './TrackResultsList';

const meta = {
  component: TrackResultsList,
  title: 'JingleExtractor/Studio/TrackResultsList',
  tags: ['autodocs'],
  args: {
    run: currentRunFixture,
    tracks: currentRunTracksFixture,
    selectedId: currentRunTracksFixture[1]?.id ?? null,
    previewingId: null,
    onSelect: () => undefined,
    onPreview: () => undefined,
    onAnalyze: () => undefined,
  },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-widget={WIDGET} data-je-theme="retro" style={{ padding: 8, maxWidth: 720 }}>
        <MacWindow title="Current Run / Results">
          <div style={{ padding: 8 }}>
            <Story />
          </div>
        </MacWindow>
      </div>
    ),
  ],
} satisfies Meta<typeof TrackResultsList>;

export default meta;
type Story = StoryObj<typeof meta>;

function ControlledResults(props: Partial<ComponentProps<typeof TrackResultsList>>) {
  const [selected, setSelected] = useState<string | null>(currentRunTracksFixture[1]?.id ?? null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const tracks = props.tracks ?? currentRunTracksFixture;

  return (
    <TrackResultsList
      run={props.run ?? currentRunFixture}
      tracks={tracks}
      selectedId={selected}
      previewingId={previewing}
      onSelect={(track) => setSelected(track.id)}
      onPreview={(track: TrackLibraryItem) => setPreviewing((prev) => (prev === track.id ? null : track.id))}
      onAnalyze={() => undefined}
    />
  );
}

export const Default: Story = {
  render: () => <ControlledResults />,
};

export const Generating: Story = {
  render: () => (
    <ControlledResults
      run={{ ...currentRunFixture, status: 'generating', countCompleted: 2 }}
      tracks={currentRunTracksFixture.map((track, index) =>
        index < 2
          ? track
          : { ...track, generation_status: 'generating', analysis_status: 'not_started', decision: 'pending' }
      )}
    />
  ),
};
