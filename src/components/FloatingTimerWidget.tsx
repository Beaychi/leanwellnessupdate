/**
 * FloatingTimerWidget
 *
 * Live-activity-style pill that sits above the bottom nav.
 * - Reads display values from useTimerDisplay (requestAnimationFrame loop).
 * - Controls (pause/resume/stop/cancel) write to useTimerStore.
 * - Persists across route changes because it lives in App.tsx outside <Routes>.
 * - Cross-tab sync comes free from Zustand's persist middleware + storage events.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Flame, Pause, Play, Square, X } from 'lucide-react';
import { useTimerStore } from '@/store/timerStore';
import { useTimerDisplay } from '@/hooks/use-timer-display';
import { stopExerciseTimerNotification } from '@/lib/timer-notifications';
import { stopFastingTimerNotification } from '@/lib/timer-notifications';

// ─── Cross-tab sync ──────────────────────────────────────────────────────────
// When another tab writes to the persisted key, rehydrate the store here.
function useCrossTabSync() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'leantrack_active_timer') {
        useTimerStore.persist.rehydrate();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
}

// ─── Circular SVG progress ring ───────────────────────────────────────────────
function Ring({
  percentage,
  size = 44,
  stroke = 3,
  color = 'currentColor',
}: {
  percentage: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * percentage) / 100;
  const cx = size / 2;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={cx} cy={cx} r={r} stroke={color} strokeWidth={stroke} fill="none" className="opacity-20" />
      <circle
        cx={cx}
        cy={cx}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="transition-none"   /* RAF handles smoothness — no CSS transition needed */
      />
    </svg>
  );
}

// ─── Main widget ─────────────────────────────────────────────────────────────
export const FloatingTimerWidget = () => {
  useCrossTabSync();

  const timer   = useTimerStore((s) => s.timer);
  const pause   = useTimerStore((s) => s.pause);
  const resume  = useTimerStore((s) => s.resume);
  const clear   = useTimerStore((s) => s.clear);

  const { remaining, percentage, displayTime, isRunning, isPaused } = useTimerDisplay();

  // Auto-clear when time reaches zero
  useEffect(() => {
    if (timer && remaining <= 0 && !isPaused) {
      // Give a brief moment for completion UI if needed, then clear
      const id = setTimeout(clear, 800);
      return () => clearTimeout(id);
    }
  }, [remaining, isPaused, timer, clear]);

  const visible = !!timer && (isRunning || isPaused);

  const isExercise = timer?.type === 'exercise';
  const Icon = isExercise ? Timer : Flame;

  const handlePauseResume = () => {
    if (!timer) return;
    if (isPaused) {
      resume();
      window.dispatchEvent(new CustomEvent('floatingTimerAction', { detail: { action: 'resume' } }));
    } else {
      pause();
      window.dispatchEvent(new CustomEvent('floatingTimerAction', { detail: { action: 'pause' } }));
    }
  };

  const handleStop = () => {
    clear();
    stopExerciseTimerNotification();
    stopFastingTimerNotification();
    window.dispatchEvent(new CustomEvent('floatingTimerAction', { detail: { action: 'stop' } }));
  };

  const handleCancel = () => {
    clear();
    stopExerciseTimerNotification();
    stopFastingTimerNotification();
    window.dispatchEvent(new CustomEvent('floatingTimerAction', { detail: { action: 'cancel' } }));
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="floating-timer"
          initial={{ y: 80, opacity: 0, scale: 0.85 }}
          animate={{ y: 0,  opacity: 1, scale: 1   }}
          exit={{   y: 80, opacity: 0, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[90] select-none"
        >
          <motion.div
            layout
            className={[
              'flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl',
              isExercise
                ? 'bg-primary/95 border-primary/30 text-primary-foreground'
                : 'bg-secondary/95 border-secondary/30 text-secondary-foreground',
            ].join(' ')}
            style={{
              boxShadow: `0 8px 32px -4px ${
                isExercise
                  ? 'hsl(var(--primary) / 0.45)'
                  : 'hsl(var(--secondary) / 0.45)'
              }`,
            }}
          >
            {/* ── Progress ring + icon ── */}
            <div className="relative flex-shrink-0">
              <Ring percentage={percentage} />
              <Icon className="absolute inset-0 m-auto h-4 w-4" />
            </div>

            {/* ── Label + time ── */}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium opacity-75 truncate max-w-[130px] leading-tight">
                {timer.name}
              </span>
              {/* key=displayTime so Framer re-animates each second boundary */}
              <motion.span
                key={displayTime}
                initial={{ opacity: 0.6, y: -4 }}
                animate={{ opacity: 1,   y: 0   }}
                transition={{ duration: 0.15 }}
                className="text-lg font-bold tabular-nums tracking-tight leading-snug"
              >
                {displayTime}
              </motion.span>
              <span className="text-[10px] opacity-60 leading-tight mt-0.5">
                {isPaused
                  ? 'Paused'
                  : isExercise
                    ? 'remaining'
                    : 'elapsed'}
              </span>
            </div>

            {/* ── Controls ── */}
            <div className="flex items-center gap-0.5 ml-1">
              {/* Pause / Resume */}
              <ControlButton
                onClick={handlePauseResume}
                label={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </ControlButton>

              {/* Stop (mark complete) */}
              <ControlButton onClick={handleStop} label="Stop">
                <Square className="h-3.5 w-3.5" />
              </ControlButton>

              {/* Cancel (discard) */}
              <ControlButton onClick={handleCancel} label="Cancel">
                <X className="h-3.5 w-3.5" />
              </ControlButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="p-1.5 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
    >
      {children}
    </button>
  );
}
