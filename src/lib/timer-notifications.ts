/**
 * Live timer notifications — behaves like a native live activity.
 *
 * The notification sits in the system notification shade and updates
 * every second while the page is in the foreground.
 * It shows the timer name, a live countdown, and three action buttons
 * that match the screenshot reference: Pause | Stop | Cancel.
 *
 * Same tag is reused for each update so the notification replaces
 * itself in-place without stacking.
 */

const EXERCISE_TAG = "leantrack-exercise-timer";
const FASTING_TAG  = "leantrack-fasting-timer";

let exerciseInterval: number | null = null;
let fastingInterval:  number | null = null;

// ─── Formatting ──────────────────────────────────────────────────────────────

const formatCountdown = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

// ─── Core notification helper ─────────────────────────────────────────────────

const showLiveNotification = async (
  title: string,
  body: string,
  tag: string,
  isAlert: boolean,          // true = play sound/vibrate, false = silent in-place update
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
    if (reg) {
      await reg.showNotification(title, options as NotificationOptions);
      return;
    }
  } catch {}

  // Fallback (no service worker)
  try {
    new Notification(title, options);
  } catch {
    console.log('[TimerNotif] Could not show notification');
  }
};

const clearLiveNotification = async (tag: string) => {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      const list = await reg.getNotifications({ tag });
      list.forEach((n) => n.close());
    }
  } catch {}
};

// Notification action buttons — matching the screenshot (⏸ Pause | □ Stop | ✕ Cancel)
const TIMER_ACTIONS = [
  { action: 'pause',  title: '⏸ Pause'  },
  { action: 'stop',   title: '□ Stop'   },
  { action: 'cancel', title: '✕ Cancel' },
];

// ─── Exercise timer ───────────────────────────────────────────────────────────

export const startExerciseTimerNotification = (
  exerciseName: string,
  getTimeLeft: () => number,
) => {
  stopExerciseTimerNotification(false); // don't clear — we'll replace it

  const tick = (isFirst: boolean) => {
    const timeLeft = getTimeLeft();

    if (timeLeft <= 0) {
      showLiveNotification(
        `✅ ${exerciseName} — Done!`,
        'Great job! You completed your exercise! 💪',
        EXERCISE_TAG,
        true,
        [],
      );
      stopExerciseTimerNotification(false);
      return;
    }

    showLiveNotification(
      `🏋️ ${exerciseName}`,
      `${formatCountdown(timeLeft)} remaining`,
      EXERCISE_TAG,
      isFirst,
      TIMER_ACTIONS,
    );
  };

  // Show immediately on start
  tick(true);

  // Then update every second — live feel
  exerciseInterval = window.setInterval(() => tick(false), 1000);
};

export const stopExerciseTimerNotification = (clear = true) => {
  if (exerciseInterval !== null) {
    window.clearInterval(exerciseInterval);
    exerciseInterval = null;
  }
  if (clear) clearLiveNotification(EXERCISE_TAG);
};

// ─── Fasting timer ────────────────────────────────────────────────────────────

export const startFastingTimerNotification = (
  protocolName: string,
  getProgress: () => { remaining: number; percentage: number } | null,
) => {
  stopFastingTimerNotification(false);

  const tick = (isFirst: boolean) => {
    const data = getProgress();

    if (!data || data.remaining <= 0) {
      showLiveNotification(
        `✅ ${protocolName} Fast — Complete!`,
        'Amazing discipline! Your fast is done! 🎉',
        FASTING_TAG,
        true,
        [],
      );
      stopFastingTimerNotification(false);
      return;
    }

    const pct = Math.round(data.percentage);
    showLiveNotification(
      `🔥 ${protocolName} Fast — ${pct}%`,
      `${formatCountdown(data.remaining)} remaining`,
      FASTING_TAG,
      isFirst,
      TIMER_ACTIONS,
    );
  };

  tick(true);
  fastingInterval = window.setInterval(() => tick(false), 1000);
};

export const stopFastingTimerNotification = (clear = true) => {
  if (fastingInterval !== null) {
    window.clearInterval(fastingInterval);
    fastingInterval = null;
  }
  if (clear) clearLiveNotification(FASTING_TAG);
};
