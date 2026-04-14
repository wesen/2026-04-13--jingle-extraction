/**
 * useAudioPlayer.ts — Playback controller hook for previews and full-track playback.
 *
 * Playback ownership model:
 * - This hook owns the live HTMLAudioElement lifecycle.
 * - Redux stores projected UI state such as playhead and selected stem.
 * - The hook notifies the caller about time/duration changes so the UI can stay in sync.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExportFormat, StemType } from '../api/types';

interface ExportParams {
  trackId: string;
  candidateId: number;
  stem: StemType;
  fmt: ExportFormat;
  fade_in: number;
  fade_out: number;
  br: number | null;
  start?: number;
  end?: number;
}

interface UseAudioPlayerOptions {
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const { onTimeUpdate, onDurationChange } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const clearObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    sourceUrlRef.current = null;
    clearObjectUrl();
    setIsPlaying(false);
  }, [clearObjectUrl]);

  const bindAudioEvents = useCallback(
    (audio: HTMLAudioElement) => {
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
        sourceUrlRef.current = null;
        clearObjectUrl();
      };
      audio.onerror = () => {
        setIsPlaying(false);
        audioRef.current = null;
        sourceUrlRef.current = null;
        clearObjectUrl();
      };
      audio.ontimeupdate = () => {
        onTimeUpdate?.(audio.currentTime);
      };
      audio.onloadedmetadata = () => {
        onDurationChange?.(audio.duration);
      };
    },
    [clearObjectUrl, onDurationChange, onTimeUpdate]
  );

  const playClip = useCallback(
    async (endpoint: string, params: ExportParams) => {
      stop();

      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        if (!resp.ok) {
          console.error('Export failed:', resp.status);
          return;
        }

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        sourceUrlRef.current = url;
        bindAudioEvents(audio);

        await audio.play();
      } catch (err) {
        console.error('Play clip failed:', err);
        setIsPlaying(false);
      }
    },
    [bindAudioEvents, stop]
  );

  const playTrack = useCallback(
    async (url: string, startTime = 0) => {
      try {
        if (audioRef.current && sourceUrlRef.current === url) {
          if (Math.abs(audioRef.current.currentTime - startTime) > 0.05) {
            audioRef.current.currentTime = startTime;
            onTimeUpdate?.(startTime);
          }
          await audioRef.current.play();
          return;
        }

        stop();

        const audio = new Audio(url);
        audio.preload = 'auto';
        audioRef.current = audio;
        sourceUrlRef.current = url;
        bindAudioEvents(audio);

        const applyStartTime = () => {
          if (startTime > 0) {
            audio.currentTime = startTime;
            onTimeUpdate?.(startTime);
          }
        };

        audio.addEventListener('loadedmetadata', applyStartTime, { once: true });
        await audio.play();
      } catch (err) {
        console.error('Play track failed:', err);
        setIsPlaying(false);
      }
    },
    [bindAudioEvents, onTimeUpdate, stop]
  );

  const seekTo = useCallback(
    (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
      onTimeUpdate?.(time);
    },
    [onTimeUpdate]
  );

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return {
    playClip,
    playTrack,
    seekTo,
    stop,
    pause,
    isPlaying,
  };
}
