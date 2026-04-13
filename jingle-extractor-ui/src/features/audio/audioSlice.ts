/**
 * audioSlice.ts — Audio playback state.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AudioState {
  isPlaying: boolean;
  currentTime: number; // seconds
  duration: number; // seconds
  volume: number; // 0.0–1.0
}

const initialState: AudioState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1.0,
};

const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    play(state) {
      state.isPlaying = true;
    },
    pause(state) {
      state.isPlaying = false;
    },
    togglePlay(state) {
      state.isPlaying = !state.isPlaying;
    },
    setCurrentTime(state, action: PayloadAction<number>) {
      state.currentTime = action.payload;
    },
    setDuration(state, action: PayloadAction<number>) {
      state.duration = action.payload;
    },
    setVolume(state, action: PayloadAction<number>) {
      state.volume = Math.max(0, Math.min(1, action.payload));
    },
    reset(state) {
      state.isPlaying = false;
      state.currentTime = 0;
    },
  },
});

export const { play, pause, togglePlay, setCurrentTime, setDuration, setVolume, reset } =
  audioSlice.actions;

export { audioSlice };
export type { AudioState };
