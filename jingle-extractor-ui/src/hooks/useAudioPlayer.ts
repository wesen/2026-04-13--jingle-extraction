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

interface PlayClipOptions {
  playbackKey?: string;
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
  const fetchAbortRef = useRef<AbortController | null>(null);
  const playbackTokenRef = useRef(0);
  const timeOffsetRef = useRef(0);
  const clipEndRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackKind, setPlaybackKind] = useState<'track' | 'clip' | null>(null);
  const [playbackKey, setPlaybackKey] = useState<string | null>(null);

  const clearObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    sourceUrlRef.current = null;
    clearObjectUrl();
  }, [clearObjectUrl]);

  const stop = useCallback(() => {
    playbackTokenRef.current += 1;
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = null;
    stopCurrentAudio();
    timeOffsetRef.current = 0;
    clipEndRef.current = null;
    setIsPlaying(false);
    setPlaybackKind(null);
    setPlaybackKey(null);
  }, [stopCurrentAudio]);

  const bindAudioEvents = useCallback(
    (audio: HTMLAudioElement, token: number) => {
      audio.onplay = () => {
        if (playbackTokenRef.current !== token) return;
        setIsPlaying(true);
      };
      audio.onpause = () => {
        if (playbackTokenRef.current !== token) return;
        setIsPlaying(false);
      };
      audio.onended = () => {
        if (playbackTokenRef.current !== token) return;
        setIsPlaying(false);
        audioRef.current = null;
        sourceUrlRef.current = null;
        timeOffsetRef.current = 0;
        clipEndRef.current = null;
        setPlaybackKind(null);
        setPlaybackKey(null);
        clearObjectUrl();
      };
      audio.onerror = () => {
        if (playbackTokenRef.current !== token) return;
        setIsPlaying(false);
        audioRef.current = null;
        sourceUrlRef.current = null;
        timeOffsetRef.current = 0;
        clipEndRef.current = null;
        setPlaybackKind(null);
        setPlaybackKey(null);
        clearObjectUrl();
      };
      audio.ontimeupdate = () => {
        if (playbackTokenRef.current !== token) return;
        onTimeUpdate?.(audio.currentTime + timeOffsetRef.current);
      };
      audio.onloadedmetadata = () => {
        if (playbackTokenRef.current !== token) return;
        onDurationChange?.(audio.duration);
      };
    },
    [clearObjectUrl, onDurationChange, onTimeUpdate]
  );

  const playClip = useCallback(
    async (endpoint: string, params: ExportParams, options: PlayClipOptions = {}) => {
      playbackTokenRef.current += 1;
      const token = playbackTokenRef.current;
      fetchAbortRef.current?.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;
      stopCurrentAudio();
      timeOffsetRef.current = params.start ?? 0;
      clipEndRef.current = params.end ?? null;
      setIsPlaying(false);
      setPlaybackKind('clip');
      setPlaybackKey(options.playbackKey ?? null);
      onTimeUpdate?.(timeOffsetRef.current);

      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: controller.signal,
        });

        if (playbackTokenRef.current !== token) return;

        if (!resp.ok) {
          console.error('Export failed:', resp.status);
          setPlaybackKind(null);
          setPlaybackKey(null);
          return;
        }

        const blob = await resp.blob();
        if (playbackTokenRef.current !== token) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        sourceUrlRef.current = url;
        bindAudioEvents(audio, token);

        await audio.play();
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Play clip failed:', err);
        if (playbackTokenRef.current === token) {
          setIsPlaying(false);
          setPlaybackKind(null);
          setPlaybackKey(null);
        }
      } finally {
        if (fetchAbortRef.current === controller) {
          fetchAbortRef.current = null;
        }
      }
    },
    [bindAudioEvents, onTimeUpdate, stopCurrentAudio]
  );

  const playTrack = useCallback(
    async (url: string, startTime = 0) => {
      try {
        if (audioRef.current && sourceUrlRef.current === url && playbackKind === 'track') {
          timeOffsetRef.current = 0;
          if (Math.abs(audioRef.current.currentTime - startTime) > 0.05) {
            audioRef.current.currentTime = startTime;
            onTimeUpdate?.(startTime);
          }
          await audioRef.current.play();
          return;
        }

        playbackTokenRef.current += 1;
        const token = playbackTokenRef.current;
        fetchAbortRef.current?.abort();
        fetchAbortRef.current = null;
        stopCurrentAudio();
        timeOffsetRef.current = 0;
        clipEndRef.current = null;
        setPlaybackKind('track');
        setPlaybackKey(null);
        setIsPlaying(false);

        const audio = new Audio(url);
        audio.preload = 'auto';
        audioRef.current = audio;
        sourceUrlRef.current = url;
        bindAudioEvents(audio, token);

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
        setPlaybackKind(null);
        setPlaybackKey(null);
      }
    },
    [bindAudioEvents, onTimeUpdate, playbackKind, stopCurrentAudio]
  );

  const seekTo = useCallback(
    (time: number) => {
      if (audioRef.current) {
        if (playbackKind === 'clip') {
          const clipStart = timeOffsetRef.current;
          const clipEnd = clipEndRef.current;
          const maxTime = clipEnd ?? clipStart + audioRef.current.duration;
          const clampedAbsolute = Math.max(clipStart, Math.min(maxTime, time));
          audioRef.current.currentTime = Math.max(0, clampedAbsolute - clipStart);
          onTimeUpdate?.(clampedAbsolute);
          return;
        }

        audioRef.current.currentTime = time;
      }
      onTimeUpdate?.(time);
    },
    [onTimeUpdate, playbackKind]
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
    playbackKind,
    playbackKey,
  };
}
