// LeanTrack Service Worker for Push Notifications

// Sound files mapping
const SOUND_FILES = {
  'chime': '/sounds/chime.mp3',
  'bell': '/sounds/bell.mp3',
  'alarm': '/sounds/alarm.mp3',
  'gentle': '/sounds/gentle.mp3',
  'energetic': '/sounds/energetic.mp3',
};

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'LeanTrack',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    tag: 'leantrack-notification',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag,
    requireInteraction: data.requireInteraction !== false,
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action, 'tag:', event.notification.tag);
  
  const tag = event.notification.tag || '';
  const isTimerNotification = tag.startsWith('leantrack-exercise-timer') || tag.startsWith('leantrack-fasting-timer');

  // Handle timer-specific actions
  if (isTimerNotification && (event.action === 'pause' || event.action === 'cancel')) {
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'TIMER_ACTION',
            action: event.action,
            timerType: tag.includes('exercise') ? 'exercise' : 'fasting',
          });
        }
      })
    );
    return;
  }

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});
