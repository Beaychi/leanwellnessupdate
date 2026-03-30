/**
 * useTimerDisplay
 *
 * Drives the live counter using requestAnimationFrame so updates are
 * frame-perfect (~60 fps) when the tab is visible.
 *
 * Elapsed time is always derived from Date.now() — NOT from counting
 * RAF callbacks — so accuracy is maintained even when the browser
 * throttles RAF in background tabs.  When the user switches back to the
 * tab the counter instantly shows the correct value.
 */

import { useEffect, useRef, useState } from 'react';
import { useTimerStore } from '@/store/timerStore';

export interface TimerDisplayState {
  elapsed: number;      // seconds (fractional)
  remaining: number;    // seconds (fractional, clamped ≥ 0)
  percentage: number;   // 0-100
  /** Pre-formatted as MM:SS or H:MM:SS */
  displayTime: string;
  isRunning: boolean;
  isPaused: boolean;
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const IDLE: TimerDisplayState = {
  elapsed: 0,
  remaining: 0,
  percentage: 0,
  displayTime: '00:00',
  isRunning: false,
  isPaused: false,
};

export function useTimerDisplay(): TimerDisplayState {
  const timer = useTimerStore((s) => s.timer);
  const [state, setState] = useState<TimerDisplayState>(IDLE);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!timer) {
      setState(IDLE);
      return;
    }

    const compute = (): TimerDisplayState => {
      const now = Date.now();
      const elapsed = timer.paused
        ? timer.elapsedBefore
        : timer.elapsedBefore + (now - timer.startedAt) / 1000;

      const remaining = Math.max(0, timer.totalDuration - elapsed);
      const percentage = Math.min(100, (elapsed / timer.totalDuration) * 100);

      return {
        elapsed,
        remaining,
        percentage,
        // Show elapsed for fasting (how long you've fasted), remaining for exercise
        displayTime: timer.type === 'fasting' ? formatTime(elapsed) : formatTime(remaining),
        isRunning: !timer.paused && remaining > 0,
        isPaused: timer.paused,
      };
    };

    // Immediate render so there's no flash
    setState(compute());

    const tick = () => {
      const next = compute();
      setState(next);
      // Keep the loop alive only while the timer is running
      if (next.isRunning) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    if (!timer.paused) {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [timer]);

  return state;
}

export { formatTime };
