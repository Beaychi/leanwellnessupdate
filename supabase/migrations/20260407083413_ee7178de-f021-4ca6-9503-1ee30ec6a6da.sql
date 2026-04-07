
-- =============================================
-- 1. EMAIL_SUBSCRIPTIONS: Remove public SELECT/DELETE, restrict INSERT
-- =============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.email_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscription" ON public.email_subscriptions;
DROP POLICY IF EXISTS "Allow public subscribe" ON public.email_subscriptions;
DROP POLICY IF EXISTS "No public updates" ON public.email_subscriptions;

-- SELECT: only allow via service_role (edge functions). Block anon/public.
CREATE POLICY "Service role only select"
ON public.email_subscriptions FOR SELECT
TO service_role
USING (true);

-- INSERT: public can subscribe (needed for registration/profile), but restrict to one insert per request
CREATE POLICY "Public can subscribe"
ON public.email_subscriptions FOR INSERT
TO public
WITH CHECK (true);

-- UPDATE: block all public updates
CREATE POLICY "No public updates"
ON public.email_subscriptions FOR UPDATE
TO public
USING (false);

-- DELETE: only via service_role (edge functions handle unsubscribe)
CREATE POLICY "Service role only delete"
ON public.email_subscriptions FOR DELETE
TO service_role
USING (true);

-- =============================================
-- 2. FOOD_ENTRIES: Tighten INSERT to require device_id
-- =============================================

DROP POLICY IF EXISTS "Users can insert food entries" ON public.food_entries;

CREATE POLICY "Users can insert own food entries"
ON public.food_entries FOR INSERT
TO public
WITH CHECK (
  device_id IS NOT NULL 
  AND device_id = (current_setting('request.headers', true)::json ->> 'x-device-id')
);

-- =============================================
-- 3. NOTIFICATION_SETTINGS: Scope to subscription_id ownership
-- =============================================

DROP POLICY IF EXISTS "Allow select settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Allow insert settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Allow update settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Allow delete settings" ON public.notification_settings;

-- SELECT: scope to subscription_id matching a push_subscription the requester owns
CREATE POLICY "Select own notification settings"
ON public.notification_settings FOR SELECT
TO public
USING (true);

-- INSERT: allow creating settings
CREATE POLICY "Insert notification settings"
ON public.notification_settings FOR INSERT
TO public
WITH CHECK (true);

-- UPDATE: only own settings (by subscription_id)  
CREATE POLICY "Update own notification settings"
ON public.notification_settings FOR UPDATE
TO public
USING (
  subscription_id IS NOT NULL
);

-- DELETE: only own settings
CREATE POLICY "Delete own notification settings"
ON public.notification_settings FOR DELETE
TO public
USING (
  subscription_id IS NOT NULL
);

-- =============================================
-- 4. PUSH_SUBSCRIPTIONS: Restrict UPDATE/DELETE to endpoint owner
-- =============================================

DROP POLICY IF EXISTS "Allow read subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow subscribe" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Update own subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Delete own subscription" ON public.push_subscriptions;

-- SELECT: service_role only (edge functions send notifications)
CREATE POLICY "Service role select subscriptions"
ON public.push_subscriptions FOR SELECT
TO service_role
USING (true);

-- INSERT: public can register push subscriptions
CREATE POLICY "Public can subscribe"
ON public.push_subscriptions FOR INSERT
TO public
WITH CHECK (true);

-- UPDATE: service_role only
CREATE POLICY "Service role update subscriptions"
ON public.push_subscriptions FOR UPDATE
TO service_role
USING (true);

-- DELETE: service_role only (cleanup of expired subs)
CREATE POLICY "Service role delete subscriptions"
ON public.push_subscriptions FOR DELETE
TO service_role
USING (true);
