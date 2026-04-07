import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    webpush.setVapidDetails(
      'mailto:notifications@leantrack.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { title, body, icon, tag, subscriptionId } = await req.json();

    console.log(`Sending push notification: ${title} - ${body}`);

    let query = supabase.from('push_subscriptions').select('*');
    if (subscriptionId) {
      query = query.eq('id', subscriptionId);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      throw new Error('Failed to fetch subscriptions: ' + fetchError.message);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    // Use unique tag with timestamp so multiple notifications stack instead of replacing each other
    const uniqueTag = `${tag || 'leantrack'}-${Date.now()}`;

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: uniqueTag,
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data: { url: '/' },
    });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload, {
          TTL: 86400,
          urgency: 'high',
        });

        sent++;
        console.log(`Push sent to ${sub.endpoint.substring(0, 50)}...`);
      } catch (e: any) {
        console.error(`Error sending to subscription ${sub.id}:`, e.message, e.statusCode);
        
        // Remove expired/invalid/mismatched subscriptions
        if (e.statusCode === 410 || e.statusCode === 404 || e.statusCode === 403) {
          console.log(`Subscription invalid (${e.statusCode}), removing: ${sub.id}`);
          await supabase.from('notification_settings').delete().eq('subscription_id', sub.id);
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
        
        errors.push(`${e.statusCode || 'unknown'}: ${e.message}`);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, errors: errors.slice(0, 5) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
