/**
 * useAudioPlayer.ts — Hook for playing audio clips from the backend export endpoint.
 *
 * Usage:
 *   const { play, stop, isPlaying, currentUrl } = useAudioPlayer();
 *   play('/api/export', { trackId: 'thrash_metal_01', candidateId: 1, stem: 'inst', fmt: 'mp3' });
 */

import { useCallback, useRef, useState } from 'react';

interface ExportParams {
  trackId: string;
  candidateId: number;
  stem: string;
  fmt: string;
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const play = useCallback(async (endpoint: string, params: ExportParams) => {
    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      // Fetch the audio blob from the export endpoint
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!resp.ok) {
        console.error('Export failed:', resp.status, await resp.text());
        return;
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      setCurrentUrl(url);

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
        console.error('Audio playback error');
      };

      await audio.play();
    } catch (err) {
      console.error('Play failed:', err);
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      audioRef.current = null;
    }
  }, []);

  return { play, stop, isPlaying, currentUrl };
}
