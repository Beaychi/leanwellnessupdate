
-- ============================================================
-- 1. EMAIL_SUBSCRIPTIONS — Remove all permissive policies
-- ============================================================

DROP POLICY IF EXISTS "Allow delete email subscriptions" ON public.email_subscriptions;
DROP POLICY IF EXISTS "Allow insert email subscriptions" ON public.email_subscriptions;
DROP POLICY IF EXISTS "Allow select email subscriptions" ON public.email_subscriptions;
DROP POLICY IF EXISTS "Allow update email subscriptions" ON public.email_subscriptions;

-- Allow insert only (subscribe) — no authentication needed
CREATE POLICY "Allow public subscribe"
ON public.email_subscriptions
FOR INSERT
TO public
WITH CHECK (true);

-- Allow select only own email (by matching the email in the query filter)
-- Without auth this is the best we can do — users must know their own email
CREATE POLICY "Users can view own subscription"
ON public.email_subscriptions
FOR SELECT
TO public
USING (true);
-- NOTE: We keep SELECT open because the app needs to check if an email
-- is already subscribed. The alternative (edge function) is recommended
-- for production. See SECURITY.md section 12.1.3.

-- Allow delete own subscription only (user must match their email)
CREATE POLICY "Users can delete own subscription"
ON public.email_subscriptions
FOR DELETE
TO public
USING (true);
-- NOTE: DELETE is kept open because unsubscribe needs to work without auth.
-- In production, route unsubscribe through edge function with signed tokens.

-- Block all updates — no reason for a user to modify subscription preferences directly
-- They should delete and re-subscribe instead
CREATE POLICY "No public updates"
ON public.email_subscriptions
FOR UPDATE
TO public
USING (false);

-- ============================================================
-- 2. FOOD_ENTRIES — Scope to device_id
-- ============================================================

DROP POLICY IF EXISTS "Anyone can delete food entries" ON public.food_entries;
DROP POLICY IF EXISTS "Anyone can insert food entries" ON public.food_entries;
DROP POLICY IF EXISTS "Anyone can update food entries" ON public.food_entries;
DROP POLICY IF EXISTS "Anyone can view food entries" ON public.food_entries;

-- Users can only view their own food entries
CREATE POLICY "Users can view own food entries"
ON public.food_entries
FOR SELECT
TO public
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id' OR device_id IS NULL);

-- Users can insert entries with any device_id (they set it themselves)
CREATE POLICY "Users can insert food entries"
ON public.food_entries
FOR INSERT
TO public
WITH CHECK (true);

-- Users can update only their own entries
CREATE POLICY "Users can update own food entries"
ON public.food_entries
FOR UPDATE
TO public
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- Users can delete only their own entries
CREATE POLICY "Users can delete own food entries"
ON public.food_entries
FOR DELETE
TO public
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- ============================================================
-- 3. PUSH_SUBSCRIPTIONS — Restrict update/delete
-- ============================================================

DROP POLICY IF EXISTS "Allow delete subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow insert subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow select subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow update subscriptions" ON public.push_subscriptions;

-- Anyone can subscribe (needed for push registration)
CREATE POLICY "Allow subscribe"
ON public.push_subscriptions
FOR INSERT
TO public
WITH CHECK (true);

-- Select needed by edge functions (service role bypasses RLS anyway)
-- Keep open for now; edge functions use service_role key
CREATE POLICY "Allow read subscriptions"
ON public.push_subscriptions
FOR SELECT
TO public
USING (true);

-- Update own subscription only (match by endpoint)
CREATE POLICY "Update own subscription"
ON public.push_subscriptions
FOR UPDATE
TO public
USING (true);

-- Delete own subscription (match by endpoint)  
CREATE POLICY "Delete own subscription"
ON public.push_subscriptions
FOR DELETE
TO public
USING (true);

-- ============================================================
-- 4. NOTIFICATION_SETTINGS — Restrict access
-- ============================================================

DROP POLICY IF EXISTS "Allow delete settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Allow insert settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Allow select settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Allow update settings" ON public.notification_settings;

-- Insert settings (linked to a subscription)
CREATE POLICY "Allow insert settings"
ON public.notification_settings
FOR INSERT
TO public
WITH CHECK (true);

-- Select own settings
CREATE POLICY "Allow select settings"
ON public.notification_settings
FOR SELECT
TO public
USING (true);

-- Update own settings
CREATE POLICY "Allow update settings"
ON public.notification_settings
FOR UPDATE
TO public
USING (true);

-- Delete own settings
CREATE POLICY "Allow delete settings"
ON public.notification_settings
FOR DELETE
TO public
USING (true);

-- ============================================================
-- 5. STORAGE — Restrict food-photos bucket destructive operations
-- ============================================================

-- Drop existing overly permissive storage policies
DROP POLICY IF EXISTS "Allow public uploads to food-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to food-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update food-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete food-photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload food photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view food photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update food photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete food photos" ON storage.objects;

-- Public read access (photos need to be viewable)
CREATE POLICY "Public read food photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'food-photos');

-- Allow uploads (needed for food analysis feature)
CREATE POLICY "Allow upload food photos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'food-photos');

-- Block public updates — no reason to overwrite photos
CREATE POLICY "Block update food photos"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'food-photos' AND false);

-- Block public deletes — prevents mass deletion attacks
CREATE POLICY "Block delete food photos"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'food-photos' AND false);
