
-- Drop existing notification_settings policies
DROP POLICY IF EXISTS "Select own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Insert notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Update own notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Delete own notification settings" ON public.notification_settings;

-- SELECT: service_role only (edge function reads with service_role)
CREATE POLICY "Service role select notification settings"
ON public.notification_settings FOR SELECT
TO service_role
USING (true);

-- INSERT: require subscription_id that exists in push_subscriptions
CREATE POLICY "Insert notification settings with valid subscription"
ON public.notification_settings FOR INSERT
TO public
WITH CHECK (
  subscription_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.push_subscriptions ps WHERE ps.id = subscription_id
  )
);

-- UPDATE: require subscription_id is set and exists
CREATE POLICY "Update own notification settings"
ON public.notification_settings FOR UPDATE
TO public
USING (
  subscription_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.push_subscriptions ps WHERE ps.id = subscription_id
  )
);

-- DELETE: require subscription_id is set and exists
CREATE POLICY "Delete own notification settings"
ON public.notification_settings FOR DELETE
TO public
USING (
  subscription_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.push_subscriptions ps WHERE ps.id = subscription_id
  )
);

-- Also tighten food_entries SELECT to remove the OR device_id IS NULL fallback
DROP POLICY IF EXISTS "Users can view own food entries" ON public.food_entries;

CREATE POLICY "Users can view own food entries"
ON public.food_entries FOR SELECT
TO public
USING (
  device_id IS NOT NULL
  AND device_id = (current_setting('request.headers', true)::json ->> 'x-device-id')
);
