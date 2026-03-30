# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (port 8080)
npm run build      # Production build
npm run build:dev  # Dev build (for debugging)
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

No test suite is configured in this project.

## Architecture Overview

**LeanTrack** is a mobile-first Progressive Web App (PWA) for wellness tracking — meals, exercises, fasting, water intake, and body measurements — targeted at the Nigerian 7-day diet plan. It is a pure frontend SPA with an optional Supabase backend.

**Stack:** React 18 + TypeScript + Vite (SWC) + Tailwind CSS + shadcn-ui (Radix UI) + React Router v6 + TanStack React Query + Framer Motion + Supabase

**Deployment:** Vercel (all routes rewrite to `/index.html` via `vercel.json`). Also maintained via Lovable.dev which auto-commits changes to Git.

## Key Structural Patterns

### Data Persistence
Primary storage is **browser localStorage** via [src/lib/storage.ts](src/lib/storage.ts). The central type is `UserProgress` which holds all user data: completed meals, exercise logs, water logs, weight logs, fasting history, reminders, and settings. Supabase (`src/integrations/supabase/`) is used optionally for backend sync.

### Routing
Routes are defined in [src/App.tsx](src/App.tsx):
- `/` → Home dashboard
- `/meals` → Meal management
- `/recipe/:mealId` → Recipe details
- `/exercises` → Exercise library
- `/progress` → Analytics
- `/profile`, `/settings`, `/install`

### Business Logic
The `src/lib/` directory contains all non-UI logic: diet/exercise data (`dietPlan.ts`, `exercises.ts`), notification scheduling (`notifications.ts`, `push-notifications.ts`, `fasting-notifications.ts`), active timer state (`active-timer.ts`), data export (`export-data.ts`).

### Component Structure
- `src/components/ui/` — shadcn-ui primitives (do not modify these manually; regenerate via shadcn CLI if needed)
- `src/components/fasting/` — fasting feature components
- `src/components/*.tsx` — feature components (CalorieDashboard, ExerciseTimer, FoodJournal, WaterTracker, etc.)
- `src/pages/` — page-level components mapped to routes

### Notifications & PWA
The service worker ([src/sw.ts](src/sw.ts)) handles offline capability and push notifications. `vite-plugin-pwa` injects it at build time. Notification logic is split across several files in `src/lib/` by feature domain.

### Styling
Tailwind CSS with HSL CSS variables for theming (dark mode via class strategy). Custom animation keyframes defined in [tailwind.config.ts](tailwind.config.ts). Path alias `@` maps to `./src`.

### TypeScript Config
`noImplicitAny: false` and `strictNullChecks: false` — the project uses loose TypeScript settings.
