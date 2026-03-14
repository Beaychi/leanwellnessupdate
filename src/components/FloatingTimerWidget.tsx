import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Flame, Pause, Play, X } from "lucide-react";
import { getActiveTimer, getActiveTimerProgress, setActiveTimer, ActiveTimerState } from "@/lib/active-timer";

const formatCompact = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const FloatingTimerWidget = () => {
  const [timer, setTimer] = useState<ActiveTimerState | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    const sync = () => setTimer(getActiveTimer());
    sync();
    window.addEventListener('activeTimerChanged', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('activeTimerChanged', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!timer) return;
    const update = () => {
      const p = getActiveTimerProgress(timer);
      setRemaining(p.remaining);
      setPercentage(p.percentage);
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [timer]);

  // Don't show if no active timer or timer complete
  if (!timer || remaining <= 0) return null;

  const isExercise = timer.type === 'exercise';
  const Icon = isExercise ? Timer : Flame;

  const handlePauseResume = () => {
    if (!timer) return;
    if (timer.paused) {
      // Resume
      setActiveTimer({
        ...timer,
        startedAt: Date.now(),
        paused: false,
      });
    } else {
      // Pause
      const progress = getActiveTimerProgress(timer);
      setActiveTimer({
        ...timer,
        elapsedBefore: progress.elapsed,
        paused: true,
      });
    }
    // Dispatch event so ExerciseTimer can sync
    window.dispatchEvent(new CustomEvent('floatingTimerAction', { detail: { action: timer.paused ? 'resume' : 'pause' } }));
  };

  const handleCancel = () => {
    setActiveTimer(null);
    window.dispatchEvent(new CustomEvent('floatingTimerAction', { detail: { action: 'cancel' } }));
  };

  // Circular progress for mini widget
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (circumference * percentage) / 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[90] select-none"
      >
        <motion.div
          layout
          className={`
            flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl
            ${isExercise 
              ? 'bg-primary/95 border-primary/30 text-primary-foreground' 
              : 'bg-secondary/95 border-secondary/30 text-secondary-foreground'}
          `}
          style={{ 
            boxShadow: `0 8px 32px -4px ${isExercise ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--secondary) / 0.4)'}` 
          }}
        >
          {/* Mini circular progress */}
          <div className="relative flex-shrink-0">
            <svg width="44" height="44" className="transform -rotate-90">
              <circle
                cx="22" cy="22" r={radius}
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="opacity-20"
              />
              <circle
                cx="22" cy="22" r={radius}
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                className="opacity-90 transition-all duration-500"
              />
            </svg>
            <Icon className="absolute inset-0 m-auto h-4 w-4" />
          </div>

          {/* Timer info */}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium opacity-80 truncate max-w-[120px]">
              {timer.name}
            </span>
            <motion.span
              key={remaining}
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              className="text-lg font-bold tabular-nums tracking-tight leading-tight"
            >
              {formatCompact(remaining)}
            </motion.span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={handlePauseResume}
              className="p-1.5 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
              aria-label={timer.paused ? "Resume" : "Pause"}
            >
              {timer.paused 
                ? <Play className="h-4 w-4" /> 
                : <Pause className="h-4 w-4" />}
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors"
              aria-label="Cancel timer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
