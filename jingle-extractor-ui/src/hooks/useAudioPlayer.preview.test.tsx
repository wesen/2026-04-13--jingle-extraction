// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioPlayer } from './useAudioPlayer';

class FakeAudio {
  static lastInstance: FakeAudio | null = null;

  currentTime = 0;
  duration = 4;
  preload = '';
  src = '';
  onplay: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  onloadedmetadata: (() => void) | null = null;

  constructor(url: string) {
    this.src = url;
    FakeAudio.lastInstance = this;
  }

  pause() {
    this.onpause?.();
  }

  async play() {
    this.onloadedmetadata?.();
    this.onplay?.();
  }
}

function PreviewHarness() {
  const [playhead, setPlayhead] = useState(0);
  const audioPlayer = useAudioPlayer({ onTimeUpdate: setPlayhead });

  return (
    <div>
      <div data-testid="playhead">{playhead.toFixed(3)}</div>
      <button
        onClick={() => {
          void audioPlayer.playClip(
            '/api/export',
            {
              trackId: 'thrash_metal_01',
              candidateId: 9,
              stem: 'inst',
              fmt: 'mp3',
              fade_in: 20,
              fade_out: 50,
              br: 192,
              start: 23.823673469387757,
              end: 27.823673469387757,
            },
            { playbackKey: 'candidate:9' }
          );
        }}
      >
        Preview
      </button>
    </div>
  );
}

describe('useAudioPlayer preview playback', () => {
  const originalAudio = globalThis.Audio;
  const originalFetch = globalThis.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    FakeAudio.lastInstance = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.Audio = FakeAudio as any;
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['preview-audio'], { type: 'audio/mpeg' }),
    })) as unknown as typeof fetch;
    URL.createObjectURL = vi.fn(() => 'blob:preview-test');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('projects preview playback time onto the full-track timeline', async () => {
    const user = userEvent.setup();

    render(<PreviewHarness />);

    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => {
      expect(screen.getByTestId('playhead').textContent).toBe('23.824');
    });

    const audio = FakeAudio.lastInstance;
    expect(audio).not.toBeNull();

    audio!.currentTime = 1.5;
    audio!.ontimeupdate?.();

    await waitFor(() => {
      expect(screen.getByTestId('playhead').textContent).toBe('25.324');
    });
  });
});
