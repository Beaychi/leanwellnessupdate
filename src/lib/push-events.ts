import { supabase } from "@/integrations/supabase/client";
import { getSubscription } from "@/lib/push-notifications";

/**
 * Send a server-side push notification for important app events.
 * Always scoped to the CURRENT device's subscription endpoint so it
 * never broadcasts to other users' devices.
 */
export async function sendEventPush(title: string, body: string, tag: string): Promise<void> {
  try {
    // Get this device's push subscription endpoint first.
    // If no subscription exists, skip server push entirely — the caller
    // already shows a local toast/notification for the foreground case.
    const subscription = await getSubscription();
    if (!subscription) return;

    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: { title, body, tag, endpoint: subscription.endpoint },
    });
    if (error) {
      console.error('Failed to send event push:', error);
    }
  } catch (e) {
    console.error('Error sending event push:', e);
  }
}

// Pre-defined event notifications
export const pushEvents = {
  fastingComplete: (protocolName: string) =>
    sendEventPush(
      "Fast Complete! 🎉",
      `Incredible discipline! You've completed your ${protocolName} fast!`,
      "leantrack-fasting-complete"
    ),

  fastingHalfway: (protocolName: string) =>
    sendEventPush(
      "Halfway There! ⏳",
      `You're 50% through your ${protocolName} fast. Keep pushing!`,
      "leantrack-fasting-halfway"
    ),

  allMealsCompleted: () =>
    sendEventPush(
      "All Meals Done! 🏆",
      "Amazing job! You've completed all your meals for today!",
      "leantrack-all-meals"
    ),

  waterGoalReached: () =>
    sendEventPush(
      "Water Goal Reached! 💧",
      "Great job staying hydrated! You've hit your daily water goal!",
      "leantrack-water-goal"
    ),

  exerciseCompleted: (exerciseName: string) =>
    sendEventPush(
      "Exercise Done! 💪",
      `You crushed ${exerciseName}! Keep up the amazing work!`,
      "leantrack-exercise-done"
    ),

  streakMilestone: (days: number) =>
    sendEventPush(
      `${days}-Day Streak! 🔥`,
      `You've maintained a ${days}-day streak! Consistency is key!`,
      "leantrack-streak"
    ),

  weightMilestone: (lost: number, unit: string) =>
    sendEventPush(
      "Weight Milestone! 🎯",
      `You've lost ${lost} ${unit} so far! Keep going!`,
      "leantrack-weight-milestone"
    ),

  newDayStarted: (dayNumber: number) =>
    sendEventPush(
      `Day ${dayNumber} Begins! 🌅`,
      `It's Day ${dayNumber} of your 7-day plan. Let's make it count!`,
      "leantrack-new-day"
    ),
};
