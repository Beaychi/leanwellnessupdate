import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pause, Play, CheckCircle, Coffee, Droplets, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  getFastingState, 
  getFastingProgress, 
  formatDuration, 
  endFastingSession,
  FASTING_PROTOCOLS 
} from "@/lib/fasting";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { pushEvents } from "@/lib/push-events";
import { startFastingTimerNotification, stopFastingTimerNotification } from "@/lib/timer-notifications";
import { setActiveTimer } from "@/lib/active-timer";

interface FastingTimerProps {
  isOpen: boolean;
  onClose: () => void;
  onFastComplete: () => void;
}

export const FastingTimer = ({ isOpen, onClose, onFastComplete }: FastingTimerProps) => {
  const [progress, setProgress] = useState<{ elapsed: number; remaining: number; percentage: number } | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [fastingState, setFastingState] = useState(getFastingState());

  const updateProgress = useCallback(() => {
    const currentProgress = getFastingProgress();
    setProgress(currentProgress);
    setFastingState(getFastingState());

    // Check if fast is complete
    if (currentProgress && currentProgress.remaining <= 0) {
      handleFastComplete();
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      updateProgress();
      const interval = setInterval(updateProgress, 1000);

      // Start persistent fasting timer notification
      const state = getFastingState();
      const proto = state.currentSession
        ? FASTING_PROTOCOLS.find(p => p.id === state.currentSession?.protocolId)
        : null;
      const protocolName = proto?.name || 'Custom';
      const totalDuration = (proto?.fastingHours || 16) * 3600;
      
      startFastingTimerNotification(protocolName, () => {
        const p = getFastingProgress();
        return p ? { remaining: p.remaining, percentage: p.percentage } : null;
      });

      // Set active timer for floating widget
      const currentProgress = getFastingProgress();
      if (currentProgress && currentProgress.remaining > 0) {
        setActiveTimer({
          type: 'fasting',
          name: `${protocolName} Fast`,
          startedAt: Date.now(),
          totalDuration: totalDuration,
          elapsedBefore: currentProgress.elapsed,
          paused: false,
        });
      }

      return () => {
        clearInterval(interval);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, updateProgress]);

  const handleFastComplete = () => {
    endFastingSession(true);
    stopFastingTimerNotification();
    setActiveTimer(null);
    
    // Celebration!
    confetti({
      particleCount: 200,
      spread: 120,
      origin: { y: 0.5 },
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'],
    });

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }

    toast.success("Fast Complete!", {
      description: "Amazing discipline! You've completed your fast!",
      duration: 6000,
    });

    // Send background push notification
    const protocolName = protocol?.name || 'Custom';
    pushEvents.fastingComplete(protocolName);

    onFastComplete();
  };

  const handleEndEarly = () => {
    endFastingSession(false, "Ended early");
    stopFastingTimerNotification();
    setActiveTimer(null);
    toast.info("Fast ended. Great effort!", { duration: 3000 });
    onClose();
  };

  const protocol = fastingState.currentSession 
    ? FASTING_PROTOCOLS.find(p => p.id === fastingState.currentSession?.protocolId) 
    : null;

  const { hours, minutes, seconds } = progress ? formatDuration(progress.remaining) : { hours: 0, minutes: 0, seconds: 0 };
  const elapsedTime = progress ? formatDuration(progress.elapsed) : { hours: 0, minutes: 0, seconds: 0 };

  // Calculate the stroke dasharray for the circular progress
  const circumference = 2 * Math.PI * 120; // radius = 120
  const strokeDashoffset = circumference - (circumference * (progress?.percentage || 0)) / 100;

  // Fasting phases
  const getFastingPhase = (elapsedHours: number) => {
    if (elapsedHours < 4) return { name: "Fed State", description: "Body using glucose for energy", color: "text-secondary" };
    if (elapsedHours < 8) return { name: "Early Fasting", description: "Glucose depleting, fat burning starts", color: "text-secondary" };
    if (elapsedHours < 12) return { name: "Fasting State", description: "Fat burning increasing", color: "text-primary" };
    if (elapsedHours < 18) return { name: "Ketosis Zone", description: "Body in full fat-burning mode", color: "text-success" };
    return { name: "Deep Ketosis", description: "Maximum fat burning & autophagy", color: "text-success" };
  };

  const currentPhase = getFastingPhase(elapsedTime.hours);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 bottom-0 z-[100] overflow-hidden"
          style={{ touchAction: 'none', width: '100vw', height: '100vh', margin: 0, padding: 0 }}
        >
          {/* Solid background matching app theme */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-0 left-0 right-0 bottom-0 bg-background"
            style={{ width: '100vw', height: '100vh' }}
          />

          {/* Animated glow effect */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.35, 0.2],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/30 blur-3xl"
          />

          {/* Content */}
          <div className="relative flex flex-col text-foreground overflow-auto" style={{ height: '100vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-6">
              <div>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-medium text-muted-foreground"
                >
                  {protocol?.name || 'Custom'} Fast
                </motion.span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-muted"
                onClick={onClose}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Timer section */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              {/* Circular progress */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative mb-8"
              >
                <svg width="280" height="280" className="transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="140"
                    cy="140"
                    r="120"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted/50"
                  />
                  {/* Progress circle */}
                  <motion.circle
                    cx="140"
                    cy="140"
                    r="120"
                    stroke="url(#progressGradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: circumference,
                      strokeDashoffset: strokeDashoffset,
                    }}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--secondary))" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Timer text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.div
                    key={`${hours}:${minutes}:${seconds}`}
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-5xl font-extrabold tracking-tight text-foreground"
                  >
                    {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </motion.div>
                  <div className="text-muted-foreground text-sm font-medium mt-1">remaining</div>
                </div>
              </motion.div>

              {/* Progress percentage */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <div className="text-6xl font-extrabold text-primary">
                  {Math.round(progress?.percentage || 0)}%
                </div>
                <div className="text-muted-foreground font-medium">complete</div>
              </motion.div>

              {/* Current phase */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-2xl p-4 w-full max-w-sm text-center mb-6"
              >
                <div className={`font-bold text-lg ${currentPhase.color}`}>
                  {currentPhase.name}
                </div>
                <div className="text-muted-foreground text-sm font-medium">{currentPhase.description}</div>
              </motion.div>

              {/* Elapsed time */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-8"
              >
                <div className="text-muted-foreground text-sm font-medium">Time Fasted</div>
                <div className="text-xl font-bold text-foreground">
                  {elapsedTime.hours}h {elapsedTime.minutes}m
                </div>
              </motion.div>

              {/* Tips */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex gap-4 justify-center"
              >
                <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-2">
                  <Droplets className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Stay hydrated</span>
                </div>
                <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-2">
                  <Coffee className="h-4 w-4 text-secondary" />
                  <span className="text-sm font-medium text-foreground">Black coffee OK</span>
                </div>
              </motion.div>
            </div>

            {/* Actions */}
            <div className="p-6 space-y-3">
              {progress && progress.percentage >= 100 && (
                <Button
                  onClick={handleFastComplete}
                  className="w-full h-14 text-lg font-bold bg-success hover:bg-success/90 rounded-xl"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Complete Fast
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowEndConfirm(true)}
                className="w-full h-12 font-semibold"
              >
                End Fast Early
              </Button>
            </div>
          </div>

          {/* End confirmation dialog - must be outside fasting overlay z-index */}
          {showEndConfirm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
              <div className="bg-background rounded-xl p-6 max-w-sm mx-4 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground">End Fast Early?</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to end your fast? Your progress will be saved but marked as incomplete.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowEndConfirm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => { setShowEndConfirm(false); handleEndEarly(); }}>
                    End Fast
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
