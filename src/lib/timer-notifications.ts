/**
 * Live timer notifications — behaves like a native live activity.
 *
 * Foreground: updates every second via the main-thread interval.
 * Background: browsers throttle/kill main-thread timers, so we switch to
 *   a static "finishes at HH:MM" message when the page is hidden and
 *   resume the live countdown when it becomes visible again.
 *
 * Same tag is reused for each update so the notification replaces
 * itself in-place without stacking.
 */

const EXERCISE_TAG = "leantrack-exercise-timer";
const FASTING_TAG  = "leantrack-fasting-timer";

// ─── Active timer state (kept so visibility handler can resume) ──────────────

interface ExerciseState {
  name: string;
  getTimeLeft: () => number;
  totalSeconds: number;
}

interface FastingState {
  protocolName: string;
  getProgress: () => { remaining: number; percentage: number } | null;
}

let exerciseInterval: number | null = null;
let fastingInterval:  number | null = null;
let activeExercise: ExerciseState | null = null;
let activeFasting:  FastingState | null  = null;

// ─── Visibility-change handler ────────────────────────────────────────────────

function handleVisibilityChange() {
  if (document.hidden) {
    // Page went to background — stop intervals (they'd be throttled anyway)
    // and show a static "finishes at X" notification instead.
    if (exerciseInterval !== null) {
      window.clearInterval(exerciseInterval);
      exerciseInterval = null;
    }
    if (fastingInterval !== null) {
      window.clearInterval(fastingInterval);
      fastingInterval = null;
    }

    if (activeExercise) {
      const left = activeExercise.getTimeLeft();
      if (left > 0) {
        const finishAt = new Date(Date.now() + left * 1000);
        const timeStr  = finishAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        showLiveNotification(
          `🏋️ ${activeExercise.name}`,
          `Running in background · finishes at ${timeStr}`,
          EXERCISE_TAG,
          false,
          RESUME_ACTIONS,
        );
      }
    }

    if (activeFasting) {
      const data = activeFasting.getProgress();
      if (data && data.remaining > 0) {
        // data.remaining is in milliseconds — use directly with Date.now()
        const finishAt = new Date(Date.now() + data.remaining);
        const timeStr  = finishAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        showLiveNotification(
          `🔥 ${activeFasting.protocolName} Fast`,
          `Running in background · finishes at ${timeStr}`,
          FASTING_TAG,
          false,
          RESUME_ACTIONS,
        );
      }
    }
  } else {
    // Page came back to foreground — restart the live intervals.
    if (activeExercise && exerciseInterval === null) {
      const s = activeExercise;
      exerciseInterval = window.setInterval(() => tickExercise(s, false), 1000);
    }
    if (activeFasting && fastingInterval === null) {
      const s = activeFasting;
      fastingInterval = window.setInterval(() => tickFasting(s, false), 1000);
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const formatCountdown = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const makeProgressBar = (pct: number, width = 10): string => {
  const filled = Math.min(width, Math.round((pct / 100) * width));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
};

// Mirrors the in-app ring colour logic:
//   timeRatio > 0.5 → green  |  > 0.2 → amber  |  ≤ 0.2 → red
const getColorEmoji = (timeRatio: number): string =>
  timeRatio > 0.5 ? '🟢' : timeRatio > 0.2 ? '🟡' : '🔴';

const getExercisePhase = (pct: number): string => {
  if (pct < 25) return 'Warming up 🔥';
  if (pct < 50) return 'Keep pushing! 💪';
  if (pct < 75) return "In the zone ⚡";
  if (pct < 92) return 'Almost there! 🏁';
  return 'Final push! 🚀';
};

const getFastingPhase = (pct: number): string => {
  if (pct < 20) return 'Getting started 🌱';
  if (pct < 40) return 'Building momentum 💪';
  if (pct < 60) return 'Halfway there! 🔥';
  if (pct < 80) return 'In the zone ⚡';
  if (pct < 95) return 'Almost done! 🏁';
  return 'Last stretch! 🚀';
};

// ─── Core notification helper ─────────────────────────────────────────────────

const showLiveNotification = async (
  title: string,
  body: string,
  tag: string,
  isAlert: boolean,
  actions: { action: string; title: string }[] = [],
) => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const options: NotificationOptions & { actions?: any; renotify?: boolean } = {
    body,
    icon:               '/pwa-192x192.png',
    badge:              '/pwa-192x192.png',
    tag,
    silent:             !isAlert,
    renotify:           isAlert,
    requireInteraction: true,
    actions,
  };

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) { await reg.showNotification(title, options as NotificationOptions); return; }
  } catch {}

  try { new Notification(title, options); } catch {
    console.log('[TimerNotif] Could not show notification');
  }
};

const clearLiveNotification = async (tag: string) => {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) { const list = await reg.getNotifications({ tag }); list.forEach((n) => n.close()); }
  } catch {}
};

// ─── Action button sets ───────────────────────────────────────────────────────

const TIMER_ACTIONS  = [
  { action: 'pause',  title: '⏸ Pause'  },
  { action: 'stop',   title: '⏹ Stop'   },
  { action: 'cancel', title: '✕ Cancel' },
];

const RESUME_ACTIONS = [
  { action: 'resume', title: '▶ Resume' },
  { action: 'stop',   title: '⏹ Stop'  },
  { action: 'cancel', title: '✕ Cancel' },
];

// ─── Exercise timer tick ──────────────────────────────────────────────────────

function tickExercise(state: ExerciseState, isFirst: boolean) {
  const timeLeft  = state.getTimeLeft();
  const pct       = Math.round(((state.totalSeconds - timeLeft) / state.totalSeconds) * 100);
  const timeRatio = state.totalSeconds > 0 ? timeLeft / state.totalSeconds : 0;
  const bar       = makeProgressBar(pct);
  const phase     = getExercisePhase(pct);
  const dot       = getColorEmoji(timeRatio);

  if (timeLeft <= 0) {
    showLiveNotification(
      `✅ ${state.name} — Done!`,
      `${makeProgressBar(100)} 100%  ·  Great job! 💪🎉`,
      EXERCISE_TAG,
      true,
      [],
    );
    stopExerciseTimerNotification(false);
    activeExercise = null;
    return;
  }

  showLiveNotification(
    `${dot} ${state.name}  ·  ${formatCountdown(timeLeft)} left`,
    `${bar}  ${pct}%  ·  ${phase}`,
    EXERCISE_TAG,
    isFirst,
    TIMER_ACTIONS,
  );
}

// ─── Fasting timer tick ───────────────────────────────────────────────────────

function tickFasting(state: FastingState, isFirst: boolean) {
  const data = state.getProgress();

  if (!data || data.remaining <= 0) {
    showLiveNotification(
      `✅ ${state.protocolName} Fast — Complete!`,
      `${makeProgressBar(100)} 100%  ·  Amazing discipline! 🎉`,
      FASTING_TAG,
      true,
      [],
    );
    stopFastingTimerNotification(false);
    activeFasting = null;
    return;
  }

  // getFastingProgress() returns remaining in MILLISECONDS — convert to seconds
  const remainingSeconds = Math.floor(data.remaining / 1000);
  const pct       = Math.round(data.percentage);
  const timeRatio = 1 - pct / 100;
  const bar       = makeProgressBar(pct);
  const phase     = getFastingPhase(pct);
  const dot       = getColorEmoji(timeRatio);

  showLiveNotification(
    `${dot} ${state.protocolName} Fast  ·  ${pct}% done`,
    `${bar}  ${formatCountdown(remainingSeconds)} left  ·  ${phase}`,
    FASTING_TAG,
    isFirst,
    TIMER_ACTIONS,
  );
}

// ─── Exercise timer — public API ──────────────────────────────────────────────

export const startExerciseTimerNotification = (
  exerciseName: string,
  getTimeLeft: () => number,
  totalSeconds?: number,
) => {
  stopExerciseTimerNotification(false);

  // Infer total from first reading if not provided
  const total = totalSeconds ?? getTimeLeft();
  activeExercise = { name: exerciseName, getTimeLeft, totalSeconds: total };

  // Show immediately, then every second (foreground only — background is
  // handled by the visibilitychange listener above).
  tickExercise(activeExercise, true);

  if (!document.hidden) {
    exerciseInterval = window.setInterval(() => {
      if (activeExercise) tickExercise(activeExercise, false);
    }, 1000);
  }
};

export const stopExerciseTimerNotification = (clear = true) => {
  if (exerciseInterval !== null) { window.clearInterval(exerciseInterval); exerciseInterval = null; }
  activeExercise = null;
  if (clear) clearLiveNotification(EXERCISE_TAG);
};

/** Show a static paused notification with the correct ▶ Resume action. */
export const pauseExerciseTimerNotification = (
  exerciseName: string,
  timeLeft: number,
  totalSeconds: number,
) => {
  stopExerciseTimerNotification(false); // clear interval, keep notification alive
  const pct = totalSeconds > 0 ? Math.round(((totalSeconds - timeLeft) / totalSeconds) * 100) : 0;
  showLiveNotification(
    `⏸ ${exerciseName} — Paused`,
    `${makeProgressBar(pct)}  ${pct}%  ·  ${formatCountdown(timeLeft)} remaining`,
    EXERCISE_TAG,
    false,
    RESUME_ACTIONS,
  );
};

// ─── Fasting timer — public API ───────────────────────────────────────────────

export const startFastingTimerNotification = (
  protocolName: string,
  getProgress: () => { remaining: number; percentage: number } | null,
) => {
  stopFastingTimerNotification(false);

  activeFasting = { protocolName, getProgress };

  tickFasting(activeFasting, true);

  if (!document.hidden) {
    fastingInterval = window.setInterval(() => {
      if (activeFasting) tickFasting(activeFasting, false);
    }, 1000);
  }
};

export const stopFastingTimerNotification = (clear = true) => {
  if (fastingInterval !== null) { window.clearInterval(fastingInterval); fastingInterval = null; }
  activeFasting = null;
  if (clear) clearLiveNotification(FASTING_TAG);
};
