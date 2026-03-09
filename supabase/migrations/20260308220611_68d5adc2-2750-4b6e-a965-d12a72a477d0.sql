ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS timezone_offset integer NOT NULL DEFAULT 0;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_settings_subscription_id_unique'
  ) THEN
    ALTER TABLE public.notification_settings ADD CONSTRAINT notification_settings_subscription_id_unique UNIQUE (subscription_id);
  END IF;
END $$;