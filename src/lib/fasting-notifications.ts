import { getFastingState } from "./fasting";

const FASTING_NOTIFICATION_KEY = "leantrack_fasting_notifications";

interface FastingNotificationState {
  sessionId: string;
  eatingWindowOpenNotified: boolean;
  eatingWindowCloseNotified: boolean;
  halfwayNotified: boolean;
}

const getNotificationState = (): FastingNotificationState | null => {
  try {
    const data = localStorage.getItem(FASTING_NOTIFICATION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const saveNotificationState = (state: FastingNotificationState) => {
  localStorage.setItem(FASTING_NOTIFICATION_KEY, JSON.stringify(state));
};

export const clearFastingNotificationState = () => {
  localStorage.removeItem(FASTING_NOTIFICATION_KEY);
};

/** Show a browser notification if permission is granted */
const showNotification = (title: string, body: string, tag: string) => {
  if (Notification.permission !== "granted") return;

  const reg = navigator.serviceWorker?.controller;
  if (reg) {
    navigator.serviceWorker.ready.then((sw) => {
      sw.showNotification(title, {
        body,
        icon: "/pwa-192x192.png",
        tag,
        requireInteraction: true,
      } as NotificationOptions);
    });
  } else {
    new Notification(title, { body, icon: "/pwa-192x192.png", tag });
  }
};

/**
 * Call this periodically (e.g. every 30s) while a fast is active.
 * It checks milestones and fires local notifications exactly once per milestone.
 */
export const checkFastingNotifications = () => {
  const state = getFastingState();
  if (!state.isActive || !state.currentSession) return;

  const session = state.currentSession;
  let notifState = getNotificationState();

  // Reset if session changed
  if (!notifState || notifState.sessionId !== session.id) {
    notifState = {
      sessionId: session.id,
      eatingWindowOpenNotified: false,
      eatingWindowCloseNotified: false,
      halfwayNotified: false,
    };
  }

  const now = Date.now();
  const startTime = new Date(session.startTime).getTime();
  const endTime = new Date(session.endTime).getTime();
  const totalDuration = endTime - startTime;
  const elapsed = now - startTime;
  const percentage = (elapsed / totalDuration) * 100;

  // Halfway milestone
  if (percentage >= 50 && !notifState.halfwayNotified) {
    notifState.halfwayNotified = true;
    showNotification(
      "Halfway There!",
      "You're 50% through your fast. Fat burning is ramping up. Keep going!",
      "fasting-halfway"
    );
  }

  // Fast complete = eating window opens
  if (percentage >= 100 && !notifState.eatingWindowOpenNotified) {
    notifState.eatingWindowOpenNotified = true;
    showNotification(
      "Eating Window Open!",
      "Congratulations! Your fast is complete. Time to refuel with nutritious food!",
      "fasting-eating-open"
    );
  }

  // Eating window close reminder — notify when eating window is about to close
  // Eating window = 24h - fasting hours. Remind 30 min before close.
  const eatingHours = 24 - session.targetDurationHours;
  const eatingWindowEndMs = endTime + eatingHours * 60 * 60 * 1000;
  const thirtyMinBefore = eatingWindowEndMs - 30 * 60 * 1000;

  if (now >= thirtyMinBefore && now < eatingWindowEndMs && !notifState.eatingWindowCloseNotified) {
    notifState.eatingWindowCloseNotified = true;
    showNotification(
      "Eating Window Closing Soon",
      "Your eating window closes in 30 minutes. Finish your last meal!",
      "fasting-eating-close"
    );
  }

  saveNotificationState(notifState);
};
