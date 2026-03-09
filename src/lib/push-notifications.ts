import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = 'BJoWzr4FqVutEVTKBkG7m6XvxY6Zl9GRpfIDJrTFWjKEpoLruw2N2FqGKJeVj6gUwHxGcAk7JI8Z7pVP10BaNDY';

// Sound options available for notifications
export const SOUND_OPTIONS = [
  { id: 'chime', name: 'Chime', description: 'Soft melodic tone' },
  { id: 'bell', name: 'Bell', description: 'Classic bell ring' },
  { id: 'alarm', name: 'Alarm', description: 'Urgent wake-up tone' },
  { id: 'gentle', name: 'Gentle', description: 'Calm, soothing sound' },
  { id: 'energetic', name: 'Energetic', description: 'Upbeat, motivating tone' },
] as const;

export type SoundOption = typeof SOUND_OPTIONS[number]['id'];

export interface NotificationSettings {
  id?: string;
  subscription_id?: string;
  breakfast_sound: SoundOption;
  lunch_sound: SoundOption;
  dinner_sound: SoundOption;
  bedtime_sound: SoundOption;
  wakeup_sound: SoundOption;
  movement_sound: SoundOption;
  exercise_sound: SoundOption;
  breakfast_time: string;
  lunch_time: string;
  dinner_time: string;
  bedtime: string;
  wakeup_time: string;
  movement_interval: number;
  movement_enabled: boolean;
  notifications_enabled: boolean;
}

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('Service Worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Request push notification permission and subscribe
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Use the existing VitePWA service worker
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Using service worker:', registration.scope);

    // ALWAYS unsubscribe existing subscription first to avoid VAPID key mismatch
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      console.log('[Push] Removing old subscription to avoid key mismatch');
      // Clean from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', existingSub.endpoint);
      await existingSub.unsubscribe();
    }

    // Create fresh subscription with current VAPID key
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as any,
    });
    console.log('[Push] New subscription created:', subscription.endpoint.substring(0, 60));

    // Save subscription to database
    await saveSubscription(subscription);

    return subscription;
  } catch (error) {
    console.error('[Push] Failed to subscribe:', error);
    return null;
  }
}

// Save subscription to Supabase
async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const key = subscription.toJSON().keys;
  if (!key) {
    throw new Error('Subscription keys missing');
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      endpoint: subscription.endpoint,
      p256dh: key.p256dh,
      auth: key.auth,
      user_agent: navigator.userAgent,
    }, {
      onConflict: 'endpoint',
    });

  if (error) {
    console.error('Failed to save subscription:', error);
    throw error;
  }

  console.log('Subscription saved to database');
}

// Get current subscription
export async function getSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

// Unsubscribe from push
export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getSubscription();
  if (!subscription) return;

  // Remove from database
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', subscription.endpoint);

  // Unsubscribe
  await subscription.unsubscribe();
  console.log('Unsubscribed from push notifications');
}

// Get notification settings from database
export async function getNotificationSettings(endpoint: string): Promise<NotificationSettings | null> {
  const { data: subscription } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('endpoint', endpoint)
    .maybeSingle();

  if (!subscription) return null;

  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('subscription_id', subscription.id)
    .maybeSingle();

  return settings as NotificationSettings | null;
}

// Save notification settings
export async function saveNotificationSettings(
  endpoint: string, 
  settings: Partial<NotificationSettings>
): Promise<void> {
  const { data: subscription } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('endpoint', endpoint)
    .maybeSingle();

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  // Always include timezone offset (minutes from UTC, e.g. Nigeria WAT = 60)
  const timezoneOffset = -(new Date().getTimezoneOffset()); // Convert to positive-east convention

  const { error } = await supabase
    .from('notification_settings')
    .upsert({
      subscription_id: subscription.id,
      timezone_offset: timezoneOffset,
      ...settings,
    }, {
      onConflict: 'subscription_id',
    });

  if (error) {
    console.error('Failed to save notification settings:', error);
    throw error;
  }

  console.log(`Notification settings saved with timezone offset: ${timezoneOffset} minutes`);
}

// Send a test push notification
export async function sendTestNotification(title: string, body: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: { title, body },
    });

    if (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
}

// Utility: Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
