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
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  const action = event.action;

  // Timer action buttons — forward to the app so the timer can react
  if (['pause', 'resume', 'stop', 'cancel'].includes(action)) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Deliver TIMER_ACTION to every open page so ExerciseTimer / FastingTimer reacts
        clientList.forEach(client => client.postMessage({ type: 'TIMER_ACTION', action }));

        // For stop / cancel, bring the app to the foreground so the user
        // sees the result (e.g. end-early confirmation or reset state)
        if (action === 'stop' || action === 'cancel') {
          const win = clientList.find(c => 'focus' in c) as WindowClient | undefined;
          if (win) return win.focus();
          return self.clients.openWindow('/');
        }
      })
    );
    return;
  }

  if (action === 'dismiss') return;

  // Default tap — open / focus the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const win = clientList.find(c => 'focus' in c) as WindowClient | undefined;
      if (win) return win.focus();
      return self.clients.openWindow('/');
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', () => {
  console.log('[SW] Notification closed');
});
