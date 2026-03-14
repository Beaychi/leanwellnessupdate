/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// Workbox precaching (injected by VitePWA at build time)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Skip waiting and claim clients immediately
self.skipWaiting();
clientsClaim();

// SPA navigation fallback - serves index.html for all navigation requests
// This prevents 404 errors when navigating to app routes
const navigationHandler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: [/^\/~oauth/, /^\/api\//],
});
registerRoute(navigationRoute);

// Cache Unsplash images
registerRoute(
  /^https:\/\/images\.unsplash\.com\/.*/i,
  new CacheFirst({
    cacheName: 'unsplash-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  })
);

// ===== PUSH NOTIFICATION HANDLERS =====

// Handle incoming push notifications
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

  const options: any = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag,
    requireInteraction: data.requireInteraction !== false,
    data: (data as any).data || {},
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
    // Send message to all clients to handle the action
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
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

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', () => {
  console.log('[SW] Notification closed');
});
