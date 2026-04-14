// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { TransportBar } from './TransportBar';

class FakeAudio {
  static lastInstance: FakeAudio | null = null;

  currentTime = 0;
  duration = 60;
  preload = '';
  src = '';
  onplay: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  onloadedmetadata: (() => void) | null = null;
  private listeners = new Map<string, Array<() => void>>();

  constructor(url: string) {
    this.src = url;
    FakeAudio.lastInstance = this;
  }

  addEventListener(type: string, listener: () => void) {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  pause() {
    this.onpause?.();
  }

  async play() {
    this.onplay?.();
  }

  emit(type: string) {
    if (type === 'loadedmetadata') {
      this.onloadedmetadata?.();
    }
    if (type === 'timeupdate') {
      this.ontimeupdate?.();
    }
    if (type === 'ended') {
      this.onended?.();
    }
    if (type === 'error') {
      this.onerror?.();
    }

    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}

function TransportPlaybackHarness() {
  const [playhead, setPlayhead] = useState(0);
  const audioPlayer = useAudioPlayer({ onTimeUpdate: setPlayhead });

  return (
    <div>
      <div data-testid="playhead">{playhead.toFixed(1)}</div>
      <TransportBar
        playhead={playhead}
        duration={60}
        stem="inst"
        isPlaying={audioPlayer.isPlaying}
        onStemChange={() => {}}
        onPlay={() => {
          void audioPlayer.playTrack('/api/tracks/demo/audio/inst', playhead);
        }}
        onPause={audioPlayer.pause}
        onSeekBack={() => {
          const next = Math.max(0, playhead - 5);
          setPlayhead(next);
          audioPlayer.seekTo(next);
        }}
        onSeekForward={() => {
          const next = Math.min(60, playhead + 5);
          setPlayhead(next);
          audioPlayer.seekTo(next);
        }}
      />
    </div>
  );
}

describe('Transport playback wiring', () => {
  const originalAudio = globalThis.Audio;

  beforeEach(() => {
    FakeAudio.lastInstance = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.Audio = FakeAudio as any;
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
  });

  it('advances the visible playhead after pressing play and receiving timeupdate events', async () => {
    const user = userEvent.setup();

    render(<TransportPlaybackHarness />);

    await user.click(screen.getByRole('button', { name: /play/i }));

    const audio = FakeAudio.lastInstance;
    expect(audio).not.toBeNull();

    audio!.emit('loadedmetadata');
    audio!.currentTime = 12.3;
    audio!.emit('timeupdate');

    await waitFor(() => {
      expect(screen.getByTestId('playhead').textContent).toBe('12.3');
    });

    expect(screen.getByRole('button', { name: /pause/i })).toBeTruthy();
  });
});
