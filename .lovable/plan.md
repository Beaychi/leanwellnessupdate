

## Plan: Move timerStore.ts into src/store/

The file `src/timerStore.ts` needs to move to `src/store/timerStore.ts`. This will fix the existing build errors since `FloatingTimerWidget.tsx`, `use-timer-display.ts`, and `active-timer.ts` already import from `@/store/timerStore`.

### Steps

1. **Create `src/store/timerStore.ts`** — copy the contents of `src/timerStore.ts` into the new location.
2. **Delete `src/timerStore.ts`** — remove the old file.

No import updates needed — the three files that reference `@/store/timerStore` are already using the correct path. This single move resolves all 3 build errors.

