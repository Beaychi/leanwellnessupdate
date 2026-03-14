// Browser Push Notifications Service with Alarm Sound

export interface NotificationSchedule {
  breakfast: string;
  lunch: string;
  dinner: string;
  bedtime: string;
  wakeupTime: string;
  movementInterval: number; // in minutes
}

let notificationCheckInterval: number | null = null;
let audioContext: AudioContext | null = null;

// Create alarm sound using Web Audio API
const playAlarmSound = async () => {
  try {
    // Initialize AudioContext on first use
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume context if suspended (required for mobile)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const duration = 0.5;
    const frequency = 800;
    const volume = 0.5;

    // Play a sequence of beeps for alarm effect
    for (let i = 0; i < 3; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency + (i * 100), audioContext.currentTime);

      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      const startTime = audioContext.currentTime + (i * 0.3);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    }
  } catch (error) {
    console.log('Could not play alarm sound:', error);
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.error("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const sendNotification = async (title: string, body: string, icon?: string, withSound: boolean = true, customTag?: string) => {
  if (typeof Notification === 'undefined' || Notification.permission !== "granted") return;

  // Play alarm sound
  if (withSound) {
    await playAlarmSound();
  }

  // Use a unique tag based on title + timestamp to avoid collisions with timer notifications
  const tag = customTag || `leantrack-alert-${Date.now()}`;

  try {
    // Prefer service worker for better mobile compatibility (Samsung, iPhone, etc.)
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: icon || "/pwa-192x192.png",
        tag,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        renotify: true,
        silent: false,
      } as NotificationOptions);
    } else {
      new Notification(title, {
        body,
        icon: icon || "/pwa-192x192.png",
        tag,
        requireInteraction: true,
      });
    }
  } catch (e) {
    // Final fallback
    try {
      new Notification(title, {
        body,
        icon: icon || "/pwa-192x192.png",
        requireInteraction: true,
      });
    } catch {
      console.log('[Notification] Could not show notification');
    }
  }
};

const getTimeInMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
};

const getCurrentTimeInMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const hasNotificationBeenSentToday = (key: string): boolean => {
  const today = new Date().toISOString().split("T")[0];
  const lastSent = localStorage.getItem(`notification_${key}`);
  return lastSent === today;
};

const markNotificationAsSent = (key: string) => {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(`notification_${key}`, today);
};

export const checkAndSendScheduledNotifications = (schedule: NotificationSchedule) => {
  const currentTime = getCurrentTimeInMinutes();

  // Wake-up notification
  const wakeupTime = getTimeInMinutes(schedule.wakeupTime);
  if (
    Math.abs(currentTime - wakeupTime) <= 2 &&
    !hasNotificationBeenSentToday("wakeup")
  ) {
    sendNotification(
      "Good Morning!",
      "Time to wake up and start your day right! Remember to hydrate.",
    );
    markNotificationAsSent("wakeup");
  }

  // Breakfast notification
  const breakfastTime = getTimeInMinutes(schedule.breakfast);
  if (
    Math.abs(currentTime - breakfastTime) <= 2 &&
    !hasNotificationBeenSentToday("breakfast")
  ) {
    sendNotification(
      "Breakfast Time!",
      "Time for your healthy breakfast. Check your meal plan in LeanTrack!",
    );
    markNotificationAsSent("breakfast");
  }

  // Lunch notification
  const lunchTime = getTimeInMinutes(schedule.lunch);
  if (
    Math.abs(currentTime - lunchTime) <= 2 &&
    !hasNotificationBeenSentToday("lunch")
  ) {
    sendNotification(
      "Lunch Time!",
      "Time to refuel with your healthy lunch. Stay on track!",
    );
    markNotificationAsSent("lunch");
  }

  // Dinner notification
  const dinnerTime = getTimeInMinutes(schedule.dinner);
  if (
    Math.abs(currentTime - dinnerTime) <= 2 &&
    !hasNotificationBeenSentToday("dinner")
  ) {
    sendNotification(
      "Dinner Time!",
      "Your evening meal is ready. Keep up the great work!",
    );
    markNotificationAsSent("dinner");
  }

  // Bedtime notification
  const bedTime = getTimeInMinutes(schedule.bedtime);
  if (
    Math.abs(currentTime - bedTime) <= 2 &&
    !hasNotificationBeenSentToday("bedtime")
  ) {
    sendNotification(
      "Bedtime Reminder",
      "Time to wind down for a good night's rest. Sleep is essential for weight loss!",
    );
    markNotificationAsSent("bedtime");
  }
};

let lastMovementNotification = 0;

export const checkMovementReminder = (intervalMinutes: number = 20) => {
  const now = Date.now();
  const intervalMs = intervalMinutes * 60 * 1000;

  if (now - lastMovementNotification >= intervalMs) {
    // Only send during work hours (9 AM - 6 PM)
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour < 18) {
      sendNotification(
        "Move Your Body!",
        "Time for a 2-minute movement break. Stand up, stretch, or walk around!",
      );
      lastMovementNotification = now;
    }
  }
};

export const startNotificationService = (schedule: NotificationSchedule, enableMovement: boolean = true) => {
  // Clear any existing interval
  if (notificationCheckInterval) {
    window.clearInterval(notificationCheckInterval);
  }

  // Check every minute for scheduled notifications
  notificationCheckInterval = window.setInterval(() => {
    checkAndSendScheduledNotifications(schedule);
    
    if (enableMovement) {
      checkMovementReminder(20); // Check every 20 minutes
    }
  }, 60000); // Check every 60 seconds

  // Also check immediately
  checkAndSendScheduledNotifications(schedule);
};

export const stopNotificationService = () => {
  if (notificationCheckInterval) {
    window.clearInterval(notificationCheckInterval);
    notificationCheckInterval = null;
  }
};

// Send a test notification with sound
export const sendTestNotification = () => {
  sendNotification(
    "Notifications Enabled!",
    "You'll receive reminders for meals, movement, and bedtime. Let's do this!",
  );
};

// Initialize notification tracking on page load
export const initializeNotificationTracking = () => {
  // Reset notification tracking at midnight
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const msUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    // Clear all notification flags
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('notification_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Set up next midnight reset
    initializeNotificationTracking();
  }, msUntilMidnight);
};

// Initialize audio context on user interaction (required for mobile)
export const initializeAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
};
