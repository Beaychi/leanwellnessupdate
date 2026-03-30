/**
 * Global timer store powered by Zustand with localStorage persistence.
 *
 * Elapsed time is always derived from Date.now() so it stays accurate
 * even when the tab is backgrounded or requestAnimationFrame is throttled.
 *
 * Layout of time accounting:
 *   total elapsed = elapsedBefore + (Date.now() - startedAt) / 1000   [while running]
 *   total elapsed = elapsedBefore                                       [while paused]
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TimerType = 'exercise' | 'fasting';

export interface TimerData {
  type: TimerType;
  name: string;
  /** ms timestamp: when the current running segment began */
  startedAt: number;
  /** Total duration in seconds */
  totalDuration: number;
  /** Seconds already elapsed before the current running segment */
  elapsedBefore: number;
  /** Whether the timer is currently paused */
  paused: boolean;
}

interface TimerStore {
  timer: TimerData | null;

  /** Start (or restart) a timer. */
  start: (data: Omit<TimerData, 'paused'>) => void;
  /** Pause a running timer, capturing elapsed so far. */
  pause: () => void;
  /** Resume a paused timer. */
  resume: () => void;
  /** Completely clear the timer (stop / cancel). */
  clear: () => void;

  /** Compute current elapsed seconds (safe to call outside React). */
  getElapsed: () => number;
  /** Compute current remaining seconds (clamped ≥ 0). */
  getRemaining: () => number;
  /** Compute completion percentage 0-100. */
  getPercentage: () => number;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      timer: null,

      start: (data) => {
        const next: TimerData = { ...data, paused: false };
        set({ timer: next });
        window.dispatchEvent(new CustomEvent('activeTimerChanged'));
      },

      pause: () => {
        const { timer } = get();
        if (!timer || timer.paused) return;
        const now = Date.now();
        const currentSegment = (now - timer.startedAt) / 1000;
        const next: TimerData = {
          ...timer,
          elapsedBefore: timer.elapsedBefore + currentSegment,
          paused: true,
        };
        set({ timer: next });
        window.dispatchEvent(new CustomEvent('activeTimerChanged'));
      },

      resume: () => {
        const { timer } = get();
        if (!timer || !timer.paused) return;
        const next: TimerData = {
          ...timer,
          startedAt: Date.now(),
          paused: false,
        };
        set({ timer: next });
        window.dispatchEvent(new CustomEvent('activeTimerChanged'));
      },

      clear: () => {
        set({ timer: null });
        window.dispatchEvent(new CustomEvent('activeTimerChanged'));
      },

      getElapsed: () => {
        const { timer } = get();
        if (!timer) return 0;
        if (timer.paused) return timer.elapsedBefore;
        return timer.elapsedBefore + (Date.now() - timer.startedAt) / 1000;
      },

      getRemaining: () => {
        const { timer, getElapsed } = get();
        if (!timer) return 0;
        return Math.max(0, timer.totalDuration - getElapsed());
      },

      getPercentage: () => {
        const { timer, getElapsed } = get();
        if (!timer) return 0;
        return Math.min(100, (getElapsed() / timer.totalDuration) * 100);
      },
    }),
    {
      name: 'leantrack_active_timer',
      // Only persist the timer data blob, not the action functions
      partialize: (state) => ({ timer: state.timer }),
      // On rehydrate: if timer was running, reset startedAt to now minus
      // the elapsed that had accumulated — keeps time correct after a page reload.
      onRehydrateStorage: () => (state) => {
        if (!state?.timer) return;
        const t = state.timer;
        if (!t.paused) {
          // Treat the gap since last save as additional elapsed time
          // by bumping startedAt back so the math stays accurate.
          // (startedAt is already in the past; nothing needed.)
        }
      },
    }
  )
);
