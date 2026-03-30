import { useState, useEffect, useRef } from "react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, RotateCcw, Trophy, ArrowRight, X, AlertTriangle } from "lucide-react";
import { sendNotification } from "@/lib/notifications";
import { toast } from "sonner";
import { pushEvents } from "@/lib/push-events";
import {
  startExerciseTimerNotification,
  stopExerciseTimerNotification,
} from "@/lib/timer-notifications";
import { logExerciseCompletion } from "@/lib/storage";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

interface ExerciseTimerProps {
  exerciseId: string;
  exerciseName: string;
  defaultDuration: number; // minutes
}

const motivationalMessages = [
  "You crushed it!",
  "Amazing work! Keep going!",
  "One step closer to your goals!",
  "You're unstoppable!",
  "Champions are made of moments like this!",
  "Incredible effort! You should be proud!",
];

export const ExerciseTimer = ({ exerciseId, exerciseName, defaultDuration }: ExerciseTimerProps) => {
  const [open, setOpen]                   = useState(false);
  const [isRunning, setIsRunning]         = useState(false);
  const [timeLeft, setTimeLeft]           = useState(defaultDuration * 60);
  const [showComplete, setShowComplete]   = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState("");
  const [hasCompleted, setHasCompleted]   = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Timing refs — Date.now()-based so accuracy is maintained even when tab is hidden
  const startTimeRef      = useRef<number | null>(null);
  const pausedTimeLeftRef = useRef<number>(defaultDuration * 60);
  const intervalRef       = useRef<number | null>(null);

  // ── Countdown loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      if (startTimeRef.current === null) startTimeRef.current = Date.now();

      intervalRef.current = window.setInterval(() => {
        if (startTimeRef.current === null) return;
        const elapsed    = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const newTimeLeft = Math.max(0, pausedTimeLeftRef.current - elapsed);
        setTimeLeft(newTimeLeft);
        if (newTimeLeft <= 0 && !hasCompleted) {
          setHasCompleted(true);
          handleTimerComplete();
        }
      }, 200);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, hasCompleted]);

  // ── Notification action buttons (Pause · Stop · Cancel from tray) ─────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { action } = (e as CustomEvent).detail;
      if (action === 'pause' && isRunning)   handlePause();
      if (action === 'resume' && !isRunning) handleResume();
      if (action === 'stop' || action === 'cancel') confirmEnd();
    };
    window.addEventListener('timerNotificationAction', handler);
    return () => window.removeEventListener('timerNotificationAction', handler);
  }, [isRunning, timeLeft]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getTimeLeft = () => {
    if (startTimeRef.current === null) return pausedTimeLeftRef.current;
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    return Math.max(0, pausedTimeLeftRef.current - elapsed);
  };

  const handlePause = () => {
    pausedTimeLeftRef.current = timeLeft;
    startTimeRef.current = null;
    setIsRunning(false);
    stopExerciseTimerNotification(false);
    // Show a paused notification
    startExerciseTimerNotification(`${exerciseName} (Paused)`, () => pausedTimeLeftRef.current);
    stopExerciseTimerNotification(false); // stop interval, keep notification visible
  };

  const handleResume = () => {
    startTimeRef.current = Date.now();
    setIsRunning(true);
    startExerciseTimerNotification(exerciseName, getTimeLeft);
  };

  const handleStartPause = () => {
    if (isRunning) {
      handlePause();
    } else {
      handleResume();
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    stopExerciseTimerNotification();
    setIsRunning(false);
    setTimeLeft(defaultDuration * 60);
    pausedTimeLeftRef.current = defaultDuration * 60;
    startTimeRef.current = null;
    setShowComplete(false);
    setHasCompleted(false);
  };

  /** Close dialog only — live notification stays in the tray */
  const handleMinimise = () => {
    setOpen(false);
    if (isRunning) {
      toast.info(`${exerciseName} is running — check your notifications`, { duration: 3000 });
    }
  };

  /** Fully end the exercise after confirmation */
  const confirmEnd = () => setShowEndConfirm(true);

  const handleEndEarly = () => {
    stopExerciseTimerNotification();
    setIsRunning(false);
    setShowComplete(false);
    setHasCompleted(false);
    setTimeLeft(defaultDuration * 60);
    pausedTimeLeftRef.current = defaultDuration * 60;
    startTimeRef.current = null;
    setShowEndConfirm(false);
    setOpen(false);
    toast.info("Exercise ended. Great effort!", { duration: 3000 });
  };

  const triggerConfetti = () => {
    try {
      const count = 200;
      const opts  = { origin: { y: 0.7 }, zIndex: 9999 };
      const fire  = (r: number, o: confetti.Options) =>
        confetti({ ...opts, ...o, particleCount: Math.floor(count * r) });
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2,  { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1,  { spread: 120, startVelocity: 45 });
    } catch {}
  };

  const handleTimerComplete = () => {
    setIsRunning(false);
    startTimeRef.current = null;
    stopExerciseTimerNotification();

    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    logExerciseCompletion(exerciseId, exerciseName, defaultDuration);
    setMotivationalMessage(
      motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
    );
    setShowComplete(true);
    setTimeout(triggerConfetti, 200);
    sendNotification("Exercise Complete!", `Great job! You completed ${exerciseName}. Keep it up!`, undefined, true);
    toast.success(`${exerciseName} complete!`);
    pushEvents.exerciseCompleted(exerciseName);
    setOpen(true); // re-open to show completion screen
  };

  const handleContinue = () => {
    setShowComplete(false);
    setHasCompleted(false);
    setTimeLeft(defaultDuration * 60);
    pausedTimeLeftRef.current = defaultDuration * 60;
    startTimeRef.current = null;
    setIsRunning(false);
    setOpen(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progress = ((defaultDuration * 60 - timeLeft) / (defaultDuration * 60)) * 100;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) setOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
          <Timer className="h-4 w-4 mr-2" />
          {isRunning ? 'View Timer' : 'Start Timer'}
        </Button>
      </DialogTrigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-2xl duration-200 rounded-3xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          )}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {showComplete ? (
            // ── Completion screen ────────────────────────────────────────────
            <div className="py-8 space-y-6 text-center">
              <button onClick={handleContinue} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
                <X className="h-4 w-4" /><span className="sr-only">Close</span>
              </button>
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center animate-bounce">
                <Trophy className="h-12 w-12 text-primary-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-primary">Well Done!</h2>
                <p className="text-lg font-medium">{exerciseName}</p>
                <p className="text-muted-foreground">{motivationalMessage}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Time completed</p>
                <p className="text-2xl font-bold">{defaultDuration} minutes</p>
              </div>
              <Button onClick={handleContinue} className="w-full" size="lg">
                Continue <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          ) : (
            // ── Timer screen ─────────────────────────────────────────────────
            <>
              {/* × = minimise, timer keeps running in notification tray */}
              <button
                onClick={handleMinimise}
                className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
                aria-label="Minimise — timer stays in notifications"
              >
                <X className="h-4 w-4" /><span className="sr-only">Minimise</span>
              </button>

              <div className="text-center sm:text-left space-y-0.5">
                <h2 className="text-lg font-semibold leading-none tracking-tight">{exerciseName}</h2>
              </div>

              <div className="py-6 space-y-6">
                {/* Circular progress */}
                <div className="relative w-48 h-48 mx-auto">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                    <circle
                      cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none"
                      strokeDasharray={`${2 * Math.PI * 88}`}
                      strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                      className="text-primary transition-all duration-200"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-5xl font-bold tabular-nums">{formatTime(timeLeft)}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {timeLeft === 0 ? "Complete!" : "remaining"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Start/Pause + Reset */}
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleStartPause} size="lg" className="px-8">
                    {isRunning
                      ? <><Pause className="h-5 w-5 mr-2" />Pause</>
                      : <><Play className="h-5 w-5 mr-2" />{timeLeft < defaultDuration * 60 ? 'Resume' : 'Start'}</>
                    }
                  </Button>
                  <Button onClick={handleReset} size="lg" variant="outline" disabled={isRunning}>
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </div>

                {/* End early */}
                {(isRunning || timeLeft < defaultDuration * 60) && (
                  <Button variant="outline" className="w-full" onClick={confirmEnd}>
                    End Exercise Early
                  </Button>
                )}
              </div>

              {/* Inline end-early confirm — same pattern as FastingTimer */}
              {showEndConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
                  <div className="bg-background rounded-xl p-6 max-w-sm mx-4 shadow-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-destructive/10">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <h3 className="font-semibold text-lg">End Exercise Early?</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to end this exercise? Your progress will not be saved.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowEndConfirm(false)}>Keep Going</Button>
                      <Button variant="destructive" onClick={handleEndEarly}>End Exercise</Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
};
