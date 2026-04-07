# LeanTrack — Security Guide

> Last updated: 2026-04-06
> Status: **Pre-production hardening in progress**

---

## 1. Overview

LeanTrack is a Progressive Web App (PWA) for wellness tracking — meals, exercises, fasting, water intake, and body measurements. It handles **sensitive personal health data** and **personally identifiable information (PII)** including email addresses, body measurements, weight logs, and food diaries.

**Why security matters here:**
- Health/wellness data is considered **sensitive personal data** under GDPR, HIPAA, and similar regulations
- Email addresses are PII that can be used for phishing and identity correlation
- Food photos and dietary habits reveal private lifestyle information
- The app uses AI analysis on user-submitted images — a potential abuse vector

---

## 2. Threat Model

### 2.1 Attack Vectors

| Vector | Risk Level | Description |
|--------|-----------|-------------|
| **RLS Bypass / Open Policies** | 🔴 Critical | Tables with `USING(true)` expose all user data to any anonymous visitor |
| **Hardcoded Secrets** | 🔴 Critical | VAPID private keys embedded in edge function source code |
| **Email Enumeration** | 🔴 Critical | Public SELECT on `email_subscriptions` leaks all subscriber emails |
| **Storage Abuse** | 🟡 High | Public `food-photos` bucket allows unlimited uploads and deletions |
| **API Abuse** | 🟡 High | Edge functions callable without authentication or rate limiting |
| **XSS via User Input** | 🟡 Medium | Food names, notes, and other user-provided text rendered in UI |
| **Dependency Vulnerabilities** | 🟢 Low | Currently clean, but requires ongoing monitoring |
| **Service Worker Manipulation** | 🟡 Medium | SW handles push events and timer actions — injection risks |

### 2.2 Wellness Platform-Specific Risks

- **Data correlation attacks**: Combining food logs, exercise data, fasting patterns, and body measurements creates a detailed health profile
- **Insurance/employment discrimination**: Leaked health data could be used against users
- **Eating disorder triggers**: Exposed calorie/weight data could be weaponized
- **Photo privacy**: Food photos may contain location metadata (EXIF) or background context revealing user identity/location

---

## 3. Secure Configuration Guidelines

### 3.1 Environment Variables

```
✅ DO: Use Supabase secrets for all API keys
✅ DO: Reference secrets via Deno.env.get() in edge functions
✅ DO: Use VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (public/anon keys only)

❌ DON'T: Hardcode private keys in source code
❌ DON'T: Store secrets in .env files committed to Git
❌ DON'T: Log secret values to console
❌ DON'T: Expose service_role keys to the client
```

### 3.2 Current Violations

| File | Issue | Severity |
|------|-------|----------|
| `supabase/functions/send-push-notification/index.ts` | VAPID private key hardcoded on line 18 | 🔴 Critical |
| `supabase/functions/send-push-notification/index.ts` | VAPID public key hardcoded on line 17 | 🟡 Medium |

**Fix**: Replace hardcoded keys with `Deno.env.get('VAPID_PUBLIC_KEY')` and `Deno.env.get('VAPID_PRIVATE_KEY')` — these secrets already exist in the project.

### 3.3 API Key Management

- **Publishable/anon keys**: Safe to include in client-side code (they are designed for this)
- **Service role keys**: NEVER expose to client; use only in edge functions
- **VAPID keys**: Store in Supabase secrets; reference via `Deno.env.get()`
- **Resend API key**: Already properly stored as a secret ✅
- **Lovable API key**: Already properly stored as a secret ✅

---

## 4. Authentication & Authorization

### 4.1 Current State: ⚠️ No Authentication

LeanTrack currently operates as an **anonymous, device-based app** with no user authentication. This is the **single largest security gap** in the system.

**Implications:**
- Cannot use `auth.uid()` in RLS policies
- `device_id` is client-generated and easily spoofable
- No session management or token validation
- Any visitor can access any data in publicly-exposed tables

### 4.2 Recommended Authentication Strategy

1. **Add Supabase Auth** with email/password signup
2. Create a `profiles` table linked to `auth.users`
3. Add `user_id UUID REFERENCES auth.users(id)` to all user-data tables
4. Rewrite RLS policies to use `auth.uid() = user_id`
5. Implement proper session handling with `onAuthStateChange`

### 4.3 Interim Measures (Without Auth)

Until authentication is added:
- Route all sensitive operations through **edge functions** that validate input
- Use `device_id` as a weak ownership signal (better than nothing)
- Never expose raw table data via the client SDK for sensitive tables
- Implement rate limiting on edge functions

---

## 5. Code Security Practices

### 5.1 Input Validation

**Current gaps:**
- `analyze-food` edge function accepts raw base64 without size validation
- `send-push-notification` accepts arbitrary JSON body without schema validation
- `generate-meal-plan` accepts user preferences without sanitization

**Required fixes:**
```typescript
// ✅ Use Zod for all edge function inputs
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const BodySchema = z.object({
  imageBase64: z.string().max(10_000_000), // ~7.5 MB limit
});

const parsed = BodySchema.safeParse(await req.json());
if (!parsed.success) {
  return new Response(JSON.stringify({ error: "Invalid input" }), {
    status: 400,
    headers: corsHeaders,
  });
}
```

### 5.2 Error Handling

```
✅ DO: Return generic error messages to clients
✅ DO: Log detailed errors server-side only
✅ DO: Use try/catch around all async operations

❌ DON'T: Expose stack traces to clients
❌ DON'T: Include internal table/column names in error responses
❌ DON'T: Log sensitive user data (emails, tokens)
```

### 5.3 XSS Prevention

- React's JSX auto-escapes by default ✅
- **Never** use `dangerouslySetInnerHTML` with user content
- Sanitize food names, notes, and AI analysis text before display
- Validate file types on upload (currently no MIME type validation)

---

## 6. Dependency & Supply Chain Security

### 6.1 Current Status

✅ No high or critical vulnerabilities detected (as of 2026-04-06)

### 6.2 Best Practices

1. **Run `npm audit` weekly** or enable Dependabot on the GitHub repository
2. **Pin exact versions** for critical dependencies (Supabase, React)
3. **Review changelogs** before major version bumps
4. **Edge function imports**: Pin Deno std library versions (currently using `@0.168.0` ✅)
5. **Avoid `npm:` imports** in edge functions where Deno-native alternatives exist

### 6.3 Supply Chain Checklist

- [ ] Enable GitHub Dependabot alerts
- [ ] Enable GitHub secret scanning
- [ ] Review `package.json` for unused dependencies
- [ ] Audit `supabase/functions/*/index.ts` imports quarterly
- [ ] Pin Supabase JS SDK version in edge functions

---

## 7. GitHub & Repository Security

### 7.1 Access Controls

- [ ] Enable 2FA for all repository collaborators
- [ ] Set up branch protection on `main` (require PR reviews, status checks)
- [ ] Restrict direct pushes to `main`
- [ ] Enable secret scanning (catches accidental key commits)
- [ ] Enable push protection (blocks commits containing secrets)

### 7.2 Code Review Requirements

- All changes to `supabase/functions/` must be reviewed by a security-aware maintainer
- RLS policy changes require explicit security review
- Storage policy changes require explicit security review
- Dependency updates should be reviewed for breaking changes

### 7.3 Git Hygiene

- Never commit `.env` files (already in `.gitignore` ✅)
- Use `.gitignore` to exclude build artifacts and local configs
- Rotate any secrets that were ever committed to Git history

---

## 8. CI/CD & Deployment Security

### 8.1 Vercel Deployment

- Environment variables are managed via Vercel dashboard — not in code ✅
- `vercel.json` rewrites all routes to `index.html` for SPA behavior ✅
- Ensure Vercel project is not publicly editable

### 8.2 Edge Function Deployment

- Edge functions are auto-deployed via Lovable Cloud
- **Always redeploy** after changing any function code or templates
- Validate that `verify_jwt` settings match the function's security requirements

### 8.3 Build Integrity

- Use `npm ci` (not `npm install`) in CI pipelines for reproducible builds
- Verify `package-lock.json` is committed and up-to-date
- Consider using Subresource Integrity (SRI) for CDN-loaded scripts

---

## 9. Data Protection

### 9.1 Data Classification

| Data Type | Classification | Current Protection | Required Protection |
|-----------|---------------|-------------------|-------------------|
| Email addresses | **PII** | ❌ Public | 🔒 Encrypted at rest, restricted access |
| Body measurements | **Sensitive Health** | ✅ localStorage only | 🔒 Encrypted if cloud-synced |
| Weight logs | **Sensitive Health** | ✅ localStorage only | 🔒 Encrypted if cloud-synced |
| Food photos | **Personal** | ❌ Public bucket | 🔒 Authenticated access only |
| Food diary entries | **Sensitive Health** | ❌ Public table | 🔒 User-scoped access |
| Push subscriptions | **Device PII** | ❌ Public table | 🔒 Device-scoped access |
| Fasting history | **Sensitive Health** | ✅ localStorage only | ✅ Acceptable |

### 9.2 Encryption

- **In transit**: All traffic uses HTTPS via Vercel/Supabase ✅
- **At rest**: Supabase encrypts database at rest by default ✅
- **Application-level**: Consider encrypting sensitive fields (email) with a column-level encryption function
- **Photos**: EXIF data should be stripped before storage

### 9.3 Data Minimization

- Only collect data that is necessary for the feature
- Set retention policies for food entries and photos
- Provide users with data export and deletion capabilities
- Anonymize data used for analytics

---

## 10. Incident Response

### 10.1 If a Vulnerability Is Found

1. **Do not disclose publicly** until a fix is available
2. Contact the maintainer via email (set up a security contact)
3. Document the issue with reproduction steps
4. Classify severity (Critical / High / Medium / Low)
5. Develop and test a fix in a private branch
6. Deploy the fix and notify affected users if data was exposed

### 10.2 If a Data Breach Occurs

1. **Immediately** revoke compromised credentials (rotate VAPID keys, Resend API key, service role key)
2. Assess the scope: which tables/data were accessed
3. Check edge function logs for unauthorized access patterns
4. Notify affected users within 72 hours (GDPR requirement)
5. Document the incident timeline and remediation steps
6. Implement additional controls to prevent recurrence

### 10.3 Responsible Disclosure

```
If you discover a security vulnerability in LeanTrack, please report it
responsibly by emailing: [security contact email]

We commit to:
- Acknowledging receipt within 48 hours
- Providing a severity assessment within 5 business days
- Deploying a fix within 30 days for critical issues
- Crediting the reporter (if desired) in release notes
```

---

## 11. Security Checklist

### Before Every Code Push

- [ ] No secrets or API keys in source code
- [ ] No `console.log` of sensitive data
- [ ] User inputs are validated (client + server)
- [ ] New database tables have RLS enabled with proper policies
- [ ] New storage operations validate file type and size
- [ ] Error responses don't leak internal details
- [ ] Edge functions validate request body with Zod or similar
- [ ] Dependencies are up-to-date (`npm audit`)

### Before Production Launch

- [ ] All `USING(true)` RLS policies replaced with proper conditions
- [ ] Authentication system implemented
- [ ] VAPID keys moved from hardcoded to secrets
- [ ] Storage bucket policies restrict write/delete to owners
- [ ] Edge functions have input validation
- [ ] Rate limiting configured on public-facing functions
- [ ] EXIF stripping implemented for photo uploads
- [ ] Data retention policy defined and implemented
- [ ] Security contact email configured
- [ ] Incident response plan documented and tested
- [ ] HTTPS enforced on all endpoints
- [ ] CSP (Content Security Policy) headers configured

---

## 12. April 2026 Security Audit — Issues Fixed

Seven issues were identified and resolved in migration `20260407134930_security_hardening.sql`
and related client-side changes.

### Ownership model — `device_id` + `x-device-id` header

All user-data tables now carry a `device_id TEXT` column. The Supabase client in
`src/integrations/supabase/client.ts` attaches `x-device-id: <uuid>` to every request
via `global.headers`. RLS policies read it with:
```sql
current_setting('request.headers', true)::json ->> 'x-device-id'
```

**Rule:** Every INSERT/UPDATE/DELETE policy on a user-data table MUST include this check.
Never fall back to `NULL` or `'unknown'` — both are now explicitly rejected.

### Fix 1 — `push_subscriptions`: wildcard INSERT, no ownership on write
- Added `device_id TEXT` column + index.
- INSERT: `device_id IS NOT NULL AND device_id = header`.
- UPDATE/DELETE: same ownership `USING(...)`.
- SELECT: `service_role` only.

### Fix 2 — `notification_settings`: INSERT didn't verify subscription ownership
- Added `device_id TEXT` column + index.
- INSERT: checks `device_id = header` AND `push_subscriptions.device_id = header`.
- UPDATE/DELETE: `device_id = header`.

### Fix 3 — `food_entries`: `'unknown'` accepted as device_id
- Client (`FoodPhotoCapture.tsx`, `MealLogDialog.tsx`): replaced `|| 'unknown'` with `getDeviceId()`.
- Migration: INSERT policy rejects `'unknown'` and values shorter than 8 chars.

### Fix 4 — `email_subscriptions`: no server-side email format validation
- Added CHECK constraint: `email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'`.
- INSERT policy: rejects NULL and whitespace-only values.

### Fix 5 — `food-photos` storage: anonymous uploads allowed
- Upload policy now requires non-null `x-device-id` header.
- Path traversal (`..`) blocked in folder name.

### Fix 6 — Supabase client: `x-device-id` header not reliably sent
- `_getOrCreateDeviceId()` called once at module load in `client.ts`.
- Stored in `global.headers` on the shared client instance — applies to all requests.

### Fix 7 — `saveSubscription` / `saveNotificationSettings`: `device_id` missing from upsert body
- Both functions in `push-notifications.ts` now include `device_id: getDeviceId()` in
  the upsert payload so the inserted value matches what RLS checks.

---

## 12. Project-Specific Recommendations

### 12.1 Critical (Fix Immediately)

1. **Add authentication** — This is the #1 security priority. Without auth, RLS policies cannot enforce real ownership. All device_id-based policies are spoofable.

2. **Remove hardcoded VAPID keys** from `send-push-notification/index.ts` — Replace lines 17-18 with:
   ```typescript
   const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
   const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
   ```

3. **Route email operations through edge functions** — The `email_subscriptions` table should never be directly queryable by the client SDK.

4. **Restrict storage bucket policies** — The `food-photos` bucket should not allow anonymous deletes or overwrites.

### 12.2 High Priority

5. **Add input validation to all edge functions** using Zod schemas
6. **Strip EXIF data** from uploaded photos before storage
7. **Add file type/size validation** for photo uploads (max 10MB, JPEG/PNG only)
8. **Implement rate limiting** on `analyze-food` and `generate-meal-plan` functions
9. **Add request logging** for security audit trails

### 12.3 Medium Priority

10. **Add CSP headers** via Vercel configuration
11. **Implement data export/deletion** for user data portability
12. **Set up monitoring** for unusual access patterns
13. **Add health check endpoints** for function availability monitoring
14. **Consider field-level encryption** for email addresses

### 12.4 Architecture Improvements

15. **Migrate from localStorage to database** — localStorage data is not encrypted, not backed up, and lost on browser clear. Health data should be stored securely in the database with proper RLS.

16. **Implement API gateway pattern** — Route all client requests through edge functions rather than direct table access. This enables validation, rate limiting, and audit logging in one place.

17. **Add webhook signature validation** — If integrating with external services, validate incoming webhook signatures.
