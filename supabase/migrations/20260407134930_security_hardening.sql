-- =============================================================================
-- SECURITY HARDENING MIGRATION
-- Fixes all issues identified in the security audit.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PUSH_SUBSCRIPTIONS — add device_id, scope INSERT/UPDATE/DELETE to owner
-- ---------------------------------------------------------------------------

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Index for fast per-device lookups
CREATE INDEX IF NOT EXISTS push_subscriptions_device_id_idx
  ON public.push_subscriptions (device_id);

DROP POLICY IF EXISTS "Public can subscribe"           ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role select subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role update subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role delete subscriptions" ON public.push_subscriptions;
-- Legacy names
DROP POLICY IF EXISTS "Allow subscribe"                ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow read subscriptions"       ON public.push_subscriptions;
DROP POLICY IF EXISTS "Update own subscription"        ON public.push_subscriptions;
DROP POLICY IF EXISTS "Delete own subscription"        ON public.push_subscriptions;

-- SELECT: edge functions (service_role) only
CREATE POLICY "Service role select subscriptions"
ON public.push_subscriptions FOR SELECT
TO service_role
USING (true);

-- INSERT: caller must supply a non-null device_id that matches the header
CREATE POLICY "Insert own push subscription"
ON public.push_subscriptions FOR INSERT
TO public
WITH CHECK (
  device_id IS NOT NULL
  AND device_id = (current_setting('request.headers', true)::json ->> 'x-device-id')
);

-- UPDATE: only the device that created the row may update it
CREATE POLICY "Update own push subscription"
ON public.push_subscriptions FOR UPDATE
TO public
USING (
  device_id IS NOT NULL
  AND device_id = (current_setting('request.headers', true)::json ->> 'x-device-id')
);

-- DELETE: only the owning device may remove its subscription
CREATE POLICY "Delete own push subscription"
ON public.push_subscriptions FOR DELETE
TO public
USING (
  device_id IS NOT NULL
  AND device_id = (current_setting('request.headers', true)::json ->> 'x-device-id')
);

-- ---------------------------------------------------------------------------
-- 2. NOTIFICATION_SETTINGS — add device_id, scope UPDATE/DELETE to owner
-- ---------------------------------------------------------------------------

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS device_id TEXT;

CREATE INDEX IF NOT EXISTS notification_settings_device_id_idx
  ON public.notification_settings (device_id);

DROP POLICY IF EXISTS "Select own notification settings"            ON public.notification_settings;
DROP POLICY IF EXISTS "Insert notification settings"                ON public.notification_settings;
DROP POLICY IF EXISTS "Update own notification settings"            ON public.notification_settings;
DROP POLICY IF EXISTS "Delete own notification settings"            ON public.notification_settings;
DROP POLICY IF EXISTS "Service role select notification settings"   ON public.notification_settings;
DROP POLICY IF EXISTS "Insert notification settings with valid subscription" ON public.notification_settings;

-- SELECT: service_role only (edge functions read with service_role key)
CREATE POLICY "Service role select notification settings"
ON public.notification_settings FOR SELECT
TO service_role
USING (true);

-- INSERT: must supply device_id + a subscription that exists AND belongs to same device
CREATE POLICY "Insert own notification settings"
ON public.notification_settings FOR INSERT
TO public
WITH CHECK (
  device_id IS NOT NULL
  AND device_id = (current_setting('request.headers', true)::json ->> 'x-device-id')
  AND subscription_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.push_subscriptions ps
    WHERE ps.id = subscription_id
      AND ps.device_id = (current_setting('request.headers', true)::json ->> 'x-device-id')
  )
);

-- UPDATE: must own the subscription referenced by the row
CREATE POLICY "Update own notification settings"
ON public.notification_settings FOR UPDATE
TO public
USING (
  device_id IS NOT NULL
  AND device_id = (current_setting('request.headers', true)::json ->> 'x-device-id')
);

-- DELETE: same ownership check
CREATE POLICY "Delete own notification settings"
ON public.notification_settings FOR DELETE
TO public
USING (
  device_id IS NOT NULL
  AND device_id = (current_setting('request.headers', true)::json ->> 'x-device-id')
);

-- ---------------------------------------------------------------------------
-- 3. EMAIL_SUBSCRIPTIONS — add email format constraint, remove wildcard INSERT
-- ---------------------------------------------------------------------------

-- Add server-side email format validation (not just client-side)
ALTER TABLE public.email_subscriptions
  ADD CONSTRAINT IF NOT EXISTS email_format_check
  CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Tighten INSERT: reject clearly invalid rows (email must be non-empty)
DROP POLICY IF EXISTS "Public can subscribe"   ON public.email_subscriptions;
DROP POLICY IF EXISTS "Allow public subscribe" ON public.email_subscriptions;

CREATE POLICY "Public can subscribe"
ON public.email_subscriptions FOR INSERT
TO public
WITH CHECK (
  email IS NOT NULL
  AND length(trim(email)) > 0
  -- Format is enforced by the CHECK constraint above; this blocks NULLs at policy level too
);

-- ---------------------------------------------------------------------------
-- 4. FOOD_ENTRIES — ensure INSERT cannot use 'unknown' as device_id
-- ---------------------------------------------------------------------------

-- Replace the policy that accepted 'unknown' as a valid device_id
DROP POLICY IF EXISTS "Users can insert own food entries" ON public.food_entries;
DROP POLICY IF EXISTS "Users can insert food entries"     ON public.food_entries;

CREATE POLICY "Users can insert own food entries"
ON public.food_entries FOR INSERT
TO public
WITH CHECK (
  device_id IS NOT NULL
  AND length(device_id) >= 8   -- reject trivially short/stub values
  AND device_id != 'unknown'
  AND device_id = (current_setting('request.headers', true)::json ->> 'x-device-id')
);

-- ---------------------------------------------------------------------------
-- 5. STORAGE — tighten food-photos upload policy (already size/type limited)
--    Scope uploads to requests that carry a device_id header so anonymous
--    callers cannot flood the bucket.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow upload food photos" ON storage.objects;

CREATE POLICY "Allow upload food photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'food-photos'
  AND (storage.foldername(name))[1] != '..'   -- prevent path traversal
  AND (current_setting('request.headers', true)::json ->> 'x-device-id') IS NOT NULL
);
