/**
 * active-timer.ts — thin bridge between legacy call-sites and the Zustand store.
 *
 * FastingTimer, ExerciseTimer, and the App.tsx service-worker handler all call
 * setActiveTimer() / getActiveTimer().  They continue to work unchanged while
 * internally the calls are forwarded to the Zustand store so the
 * FloatingTimerWidget (which reads the store directly) stays in sync.
 */

import { useTimerStore } from '@/store/timerStore';

export interface ActiveTimerState {
  type: 'exercise' | 'fasting';
  name: string;
  /** ms timestamp when the current running segment started */
  startedAt: number;
  /** Total duration in seconds */
  totalDuration: number;
  /** Seconds already elapsed before the current running segment */
  elapsedBefore: number;
  paused: boolean;
}

/**
 * Write timer state.  Passing null clears the timer.
 */
export const setActiveTimer = (state: ActiveTimerState | null) => {
  if (!state) {
    useTimerStore.getState().clear();
    return;
  }

  if (state.paused) {
    // Caller wants a paused snapshot — write it directly then let the store
    // persist it.
    useTimerStore.setState({ timer: { ...state } });
    window.dispatchEvent(new CustomEvent('activeTimerChanged'));
  } else {
    useTimerStore.getState().start({
      type: state.type,
      name: state.name,
      startedAt: state.startedAt,
      totalDuration: state.totalDuration,
      elapsedBefore: state.elapsedBefore,
    });
  }
};

/**
 * Read the current timer snapshot.
 */
export const getActiveTimer = (): ActiveTimerState | null => {
  return useTimerStore.getState().timer;
};

/**
 * Compute elapsed / remaining / percentage from a snapshot.
 * Used by legacy callers; prefer useTimerDisplay() in React components.
 */
export const getActiveTimerProgress = (timer: ActiveTimerState) => {
  const now = Date.now();
  const elapsed = timer.paused
    ? timer.elapsedBefore
    : timer.elapsedBefore + (now - timer.startedAt) / 1000;
  const remaining = Math.max(0, timer.totalDuration - elapsed);
  const percentage = Math.min(100, (elapsed / timer.totalDuration) * 100);
  return { elapsed, remaining, percentage };
};
