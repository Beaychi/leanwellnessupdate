/**
 * Shared active timer state using localStorage + custom events.
 * Allows the floating widget to display timer info from any page.
 */

const ACTIVE_TIMER_KEY = 'leantrack_active_timer';

export interface ActiveTimerState {
  type: 'exercise' | 'fasting';
  name: string;
  /** Timestamp when the timer "started" for the current running segment */
  startedAt: number;
  /** Total duration in seconds */
  totalDuration: number;
  /** How many seconds were already elapsed before current segment */
  elapsedBefore: number;
  /** Whether timer is paused */
  paused: boolean;
}

export const setActiveTimer = (state: ActiveTimerState | null) => {
  if (state) {
    localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(ACTIVE_TIMER_KEY);
  }
  window.dispatchEvent(new CustomEvent('activeTimerChanged'));
};

export const getActiveTimer = (): ActiveTimerState | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_TIMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getActiveTimerProgress = (timer: ActiveTimerState) => {
  if (timer.paused) {
    const elapsed = timer.elapsedBefore;
    const remaining = Math.max(0, timer.totalDuration - elapsed);
    const percentage = Math.min(100, (elapsed / timer.totalDuration) * 100);
    return { elapsed, remaining, percentage };
  }
  const now = Date.now();
  const currentSegment = Math.floor((now - timer.startedAt) / 1000);
  const elapsed = timer.elapsedBefore + currentSegment;
  const remaining = Math.max(0, timer.totalDuration - elapsed);
  const percentage = Math.min(100, (elapsed / timer.totalDuration) * 100);
  return { elapsed, remaining, percentage };
};
