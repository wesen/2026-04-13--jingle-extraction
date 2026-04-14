/**
 * useAudioPlayer.ts — Hook for playing audio clips from the backend.
 *
 * Two modes:
 * 1. Clip preview: fetches a short clip blob from POST /api/export
 * 2. Full playback: plays a stem file from a seek position
 */

import { useCallback, useRef, useState } from 'react';

interface ExportParams {
  trackId: string;
  candidateId: number;
  stem: string;
  fmt: string;
  fade_in: number;
  fade_out: number;
  br: number | null;
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Clip preview (from export endpoint) ───────────────────────────────

  const playClip = useCallback(async (endpoint: string, params: ExportParams) => {
    // Stop any current playback
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
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error('Play clip failed:', err);
      setIsPlaying(false);
    }
  }, []);

  // ── Play from position (seek existing or create new audio) ────────────

  const playFrom = useCallback((url: string, startTime: number = 0) => {
    stop();

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.currentTime = startTime;

    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => {
      setIsPlaying(false);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setIsPlaying(false);
      audioRef.current = null;
    };

    audio.play().catch((err) => {
      console.error('Play from position failed:', err);
      setIsPlaying(false);
    });
  }, []);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  return { playClip, playFrom, seekTo, stop, pause, isPlaying };
}
