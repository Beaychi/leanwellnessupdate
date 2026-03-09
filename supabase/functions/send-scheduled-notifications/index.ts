import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOTIFICATION_MESSAGES: Record<string, { title: string; body: string }> = {
  wakeup: { title: "Good Morning! ☀️", body: "Time to wake up and start your day right! Remember to hydrate." },
  breakfast: { title: "Breakfast Time! 🍳", body: "Time for your healthy breakfast. Check your meal plan in LeanTrack!" },
  lunch: { title: "Lunch Time! 🥗", body: "Time to refuel with your healthy lunch. Stay on track!" },
  dinner: { title: "Dinner Time! 🍽️", body: "Your evening meal awaits. Keep up the great work!" },
  bedtime: { title: "Bedtime Reminder 🌙", body: "Time to wind down. Sleep is essential for your health goals!" },
  movement: { title: "Move Your Body! 🏃", body: "Time for a movement break. Stand up, stretch, or walk around!" },
  water_morning: { title: "Hydration Check 💧", body: "Have you had your morning water? Start your day hydrated!" },
  water_midday: { title: "Water Reminder 💧", body: "Stay hydrated! Aim for at least 4 glasses by midday." },
  water_afternoon: { title: "Drink Water! 💧", body: "Your body needs water to perform. Don't forget to drink up!" },
  water_evening: { title: "Evening Hydration 💧", body: "Have you hit your 8 glasses today? Stay on top of your water goal!" },
  daily_checkin: { title: "Daily Check-In ✅", body: "How's your day going? Log your meals and track your progress!" },
  exercise_reminder: { title: "Exercise Time! 💪", body: "Don't skip your workout today! Even 15 minutes makes a difference." },
  weekly_progress: { title: "Weekly Progress 📊", body: "Check your progress this week! You're building great habits." },
  streak_motivation: { title: "Keep Your Streak! 🔥", body: "Don't break your streak! Log your meals today to keep it going." },
};

// Water reminder schedule (in LOCAL hours)
const WATER_REMINDERS = [
  { hour: 7, type: 'water_morning' },
  { hour: 11, type: 'water_midday' },
  { hour: 15, type: 'water_afternoon' },
  { hour: 19, type: 'water_evening' },
];

// Additional scheduled notifications (in LOCAL hours)
const EXTRA_REMINDERS = [
  { hour: 10, minute: 0, type: 'daily_checkin' },
  { hour: 16, minute: 0, type: 'exercise_reminder' },
  { hour: 8, minute: 30, type: 'streak_motivation' },
];

/** Convert UTC hour/minute to local hour/minute given a timezone offset in minutes */
function utcToLocal(utcHour: number, utcMinute: number, offsetMinutes: number): { hour: number; minute: number } {
  const totalMinutes = utcHour * 60 + utcMinute + offsetMinutes;
  const normalized = ((totalMinutes % 1440) + 1440) % 1440; // handle negative/overflow
  return { hour: Math.floor(normalized / 60), minute: normalized % 60 };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentHourUTC = now.getUTCHours();
    const currentMinuteUTC = now.getUTCMinutes();

    console.log(`Checking scheduled notifications at ${currentHourUTC}:${String(currentMinuteUTC).padStart(2, '0')} UTC`);

    const { data: settings, error } = await supabase
      .from('notification_settings')
      .select('*, push_subscriptions!inner(id, endpoint, p256dh, auth)')
      .eq('notifications_enabled', true);

    if (error) {
      throw new Error('Failed to fetch notification settings: ' + error.message);
    }

    if (!settings || settings.length === 0) {
      console.log('No active notification settings found');
      return new Response(
        JSON.stringify({ success: true, checked: 0, sent: 0, message: 'No active notification settings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${settings.length} notification settings to check`);

    let totalSent = 0;

    for (const setting of settings) {
      const subId = (setting as any).push_subscriptions?.id;
      if (!subId) continue;

      // Get this user's timezone offset (minutes from UTC, e.g. Nigeria WAT = 60)
      const tzOffset = (setting as any).timezone_offset || 0;
      
      // Convert current UTC time to user's local time
      const local = utcToLocal(currentHourUTC, currentMinuteUTC, tzOffset);
      const localHour = local.hour;
      const localMinute = local.minute;

      console.log(`User timezone offset: ${tzOffset}min, local time: ${localHour}:${String(localMinute).padStart(2, '0')}`);

      const sendPush = async (type: string) => {
        const message = NOTIFICATION_MESSAGES[type];
        if (!message) return;

        try {
          const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              title: message.title,
              body: message.body,
              tag: `leantrack-${type}`,
              subscriptionId: subId,
            }),
          });

          if (pushResponse.ok) {
            totalSent++;
            console.log(`Sent ${type} notification`);
          } else {
            const errText = await pushResponse.text();
            console.error(`Failed to send ${type}: ${errText}`);
          }
        } catch (e: any) {
          console.error(`Error sending ${type}:`, e.message);
        }
      };

      // Check meal/sleep schedule times (stored in user's LOCAL time)
      const timesToCheck = [
        { time: setting.wakeup_time, type: 'wakeup' },
        { time: setting.breakfast_time, type: 'breakfast' },
        { time: setting.lunch_time, type: 'lunch' },
        { time: setting.dinner_time, type: 'dinner' },
        { time: setting.bedtime, type: 'bedtime' },
      ];

      for (const { time, type } of timesToCheck) {
        if (!time) continue;
        const [schedHour, schedMinute] = time.split(':').map(Number);
        // Compare against LOCAL time
        if (schedHour === localHour && Math.abs(schedMinute - localMinute) <= 1) {
          console.log(`Matched ${type} at ${time} (local ${localHour}:${localMinute})`);
          await sendPush(type);
        }
      }

      // Water reminders (LOCAL hours)
      for (const reminder of WATER_REMINDERS) {
        if (localHour === reminder.hour && localMinute === 0) {
          await sendPush(reminder.type);
        }
      }

      // Extra reminders (LOCAL hours)
      for (const reminder of EXTRA_REMINDERS) {
        if (localHour === reminder.hour && Math.abs(localMinute - reminder.minute) <= 1) {
          await sendPush(reminder.type);
        }
      }

      // Weekly progress (Sunday at 9 AM LOCAL)
      if (now.getUTCDay() === 0 && localHour === 9 && localMinute === 0) {
        await sendPush('weekly_progress');
      }

      // Movement reminders (during LOCAL work hours 9-18)
      if (setting.movement_enabled && localHour >= 9 && localHour < 18) {
        const interval = setting.movement_interval || 45;
        if (localMinute % interval === 0) {
          await sendPush('movement');
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: settings.length, sent: totalSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-scheduled-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
