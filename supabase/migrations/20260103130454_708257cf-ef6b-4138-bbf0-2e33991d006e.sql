-- Create table for push notification subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for notification settings with sound preferences
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  breakfast_sound TEXT NOT NULL DEFAULT 'chime',
  lunch_sound TEXT NOT NULL DEFAULT 'chime',
  dinner_sound TEXT NOT NULL DEFAULT 'chime',
  bedtime_sound TEXT NOT NULL DEFAULT 'gentle',
  wakeup_sound TEXT NOT NULL DEFAULT 'alarm',
  movement_sound TEXT NOT NULL DEFAULT 'bell',
  exercise_sound TEXT NOT NULL DEFAULT 'energetic',
  breakfast_time TEXT NOT NULL DEFAULT '08:00',
  lunch_time TEXT NOT NULL DEFAULT '12:30',
  dinner_time TEXT NOT NULL DEFAULT '19:00',
  bedtime TEXT NOT NULL DEFAULT '22:00',
  wakeup_time TEXT NOT NULL DEFAULT '06:30',
  movement_interval INTEGER NOT NULL DEFAULT 45,
  movement_enabled BOOLEAN NOT NULL DEFAULT true,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access for this PWA (no auth required)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to manage their own subscriptions (identified by endpoint)
CREATE POLICY "Allow insert subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow select subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (true);

CREATE POLICY "Allow update subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (true);

CREATE POLICY "Allow delete subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (true);

-- Allow anyone to manage notification settings
CREATE POLICY "Allow insert settings"
ON public.notification_settings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow select settings"
ON public.notification_settings
FOR SELECT
USING (true);

CREATE POLICY "Allow update settings"
ON public.notification_settings
FOR UPDATE
USING (true);

CREATE POLICY "Allow delete settings"
ON public.notification_settings
FOR DELETE
USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();