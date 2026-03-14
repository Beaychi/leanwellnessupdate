/**
 * Persistent timer notifications with near-real-time countdown.
 * 
 * Strategy:
 * - 1 notification on START (with sound/vibration alert)
 * - Silent in-place updates every 3s (exercise) / 5s (fasting) for real-time feel
 * - 1 notification on COMPLETE (with sound/vibration alert)
 * 
 * Compatible with Samsung, iPhone, and all major mobile browsers.
 * Uses service worker showNotification for best mobile support.
 */

const EXERCISE_TAG = "leantrack-exercise-timer";
const FASTING_TAG = "leantrack-fasting-timer";

let exerciseInterval: number | null = null;
let fastingInterval: number | null = null;

const formatTimeShort = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Show or silently update an existing notification in-place.
 * - isAlert=false → silent in-place update (no sound, no pop-up, no vibration)
 * - isAlert=true  → first show or completion → sound + vibration allowed
 * 
 * Uses same tag to replace previous notification content without stacking.
 */
const updateTimerNotification = async (
  title: string,
  body: string,
  tag: string,
  isAlert: boolean = false,
  showActions: boolean = true
) => {
  if (typeof Notification === 'undefined' || Notification.permission !== "granted") return;

  const actions = showActions ? [
    { action: 'pause', title: '⏸ Pause' },
    { action: 'cancel', title: '✕ Stop' },
  ] : [];

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: "/pwa-192x192.png",
        tag,
        silent: !isAlert,
        renotify: isAlert,
        requireInteraction: true,
        actions,
      } as NotificationOptions);
    }
  } catch (e) {
    // Fallback for browsers without service worker
    try {
      new Notification(title, {
        body,
        icon: "/pwa-192x192.png",
        tag,
        silent: !isAlert,
        requireInteraction: true,
      } as NotificationOptions);
    } catch {
      console.log("[TimerNotif] Could not show notification");
    }
  }
};

const clearTimerNotification = async (tag: string) => {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      const notifications = await reg.getNotifications({ tag });
      notifications.forEach((n) => n.close());
    }
  } catch (e) {
    console.log("[TimerNotif] Could not clear notification:", e);
  }
};

// ===== EXERCISE TIMER =====

export const startExerciseTimerNotification = (
  exerciseName: string,
  getTimeLeft: () => number
) => {
  stopExerciseTimerNotification(false);

  // Initial notification (with alert so user sees/hears it)
  const initialTime = getTimeLeft();
  updateTimerNotification(
    `🏋️ ${exerciseName}`,
    `⏱ ${formatTimeShort(initialTime)} remaining`,
    EXERCISE_TAG,
    true
  );

  // Silent updates every 3 seconds for near-real-time countdown
  exerciseInterval = window.setInterval(() => {
    const timeLeft = getTimeLeft();
    if (timeLeft <= 0) {
      // Completion alert (with sound/vibration, no actions needed)
      updateTimerNotification(
        `✅ ${exerciseName} — Done!`,
        `Great job! You completed your exercise! 💪`,
        EXERCISE_TAG,
        true,
        false
      );
      if (exerciseInterval) {
        window.clearInterval(exerciseInterval);
        exerciseInterval = null;
      }
      return;
    }
    // Silent in-place update — just changes the text
    updateTimerNotification(
      `🏋️ ${exerciseName}`,
      `⏱ ${formatTimeShort(timeLeft)} remaining`,
      EXERCISE_TAG,
      false
    );
  }, 3000);
};

export const stopExerciseTimerNotification = (clear: boolean = true) => {
  if (exerciseInterval) {
    window.clearInterval(exerciseInterval);
    exerciseInterval = null;
  }
  if (clear) {
    clearTimerNotification(EXERCISE_TAG);
  }
};

// ===== FASTING TIMER =====

export const startFastingTimerNotification = (
  protocolName: string,
  getRemaining: () => { remaining: number; percentage: number } | null
) => {
  stopFastingTimerNotification(false);

  const data = getRemaining();
  if (data && data.remaining > 0) {
    const pct = Math.round(data.percentage);
    updateTimerNotification(
      `🔥 ${protocolName} Fast — ${pct}%`,
      `⏱ ${formatTimeShort(data.remaining)} remaining`,
      FASTING_TAG,
      true
    );
  }

  // Silent updates every 5 seconds for real-time countdown
  fastingInterval = window.setInterval(() => {
    const data = getRemaining();
    if (!data || data.remaining <= 0) {
      updateTimerNotification(
        `✅ ${protocolName} Fast — Complete!`,
        `Amazing discipline! Your fast is done! 🎉`,
        FASTING_TAG,
        true,
        false
      );
      if (fastingInterval) {
        window.clearInterval(fastingInterval);
        fastingInterval = null;
      }
      return;
    }
    const pct = Math.round(data.percentage);
    updateTimerNotification(
      `🔥 ${protocolName} Fast — ${pct}%`,
      `⏱ ${formatTimeShort(data.remaining)} remaining`,
      FASTING_TAG,
      false
    );
  }, 5000);
};

export const stopFastingTimerNotification = (clear: boolean = true) => {
  if (fastingInterval) {
    window.clearInterval(fastingInterval);
    fastingInterval = null;
  }
  if (clear) {
    clearTimerNotification(FASTING_TAG);
  }
};
