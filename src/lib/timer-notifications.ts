/**
 * Persistent timer notifications that show a live countdown.
 * Uses a single notification with the same tag + renotify:false + silent:true
 * so it updates in-place without popping up repeatedly.
 * 
 * Flow: 1 notification on start → silently updates countdown → 1 final notification on complete.
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
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
};

/**
 * Show or silently update an existing notification in-place.
 * renotify: false  → no sound/vibration/visual pop on update
 * silent: true     → no sound
 * same tag         → replaces previous notification content
 */
const updateTimerNotification = async (
  title: string,
  body: string,
  tag: string,
  isAlert: boolean = false // true = first show or completion → allow sound/vibration
) => {
  if (Notification.permission !== "granted") return;

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: "/pwa-192x192.png",
        tag,
        silent: !isAlert,
        renotify: isAlert, // only re-alert on start and completion
        requireInteraction: true,
      } as NotificationOptions);
    }
  } catch (e) {
    console.log("[TimerNotif] Could not show notification:", e);
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
  stopExerciseTimerNotification(false); // don't clear — we'll replace it

  // Initial notification (with alert so user sees it)
  const initialTime = getTimeLeft();
  updateTimerNotification(
    `🏋️ ${exerciseName}`,
    `⏱ ${formatTimeShort(initialTime)} remaining`,
    EXERCISE_TAG,
    true
  );

  // Silent updates every 15s — just updates the text in place
  exerciseInterval = window.setInterval(() => {
    const timeLeft = getTimeLeft();
    if (timeLeft <= 0) {
      // Completion alert
      updateTimerNotification(
        `🏋️ ${exerciseName} — Done!`,
        `Great job! You completed your exercise! 💪`,
        EXERCISE_TAG,
        true
      );
      if (exerciseInterval) {
        window.clearInterval(exerciseInterval);
        exerciseInterval = null;
      }
      return;
    }
    // Silent in-place update
    updateTimerNotification(
      `🏋️ ${exerciseName}`,
      `⏱ ${formatTimeShort(timeLeft)} remaining`,
      EXERCISE_TAG,
      false
    );
  }, 15000);
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

  // Silent updates every 30s
  fastingInterval = window.setInterval(() => {
    const data = getRemaining();
    if (!data || data.remaining <= 0) {
      updateTimerNotification(
        `🔥 ${protocolName} Fast — Complete!`,
        `Amazing discipline! Your fast is done! 🎉`,
        FASTING_TAG,
        true
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
  }, 30000);
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
