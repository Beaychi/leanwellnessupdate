import { useState, useEffect, useRef } from "react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import {
  Timer, Play, Pause, RotateCcw, Trophy, ArrowRight,
  X, AlertTriangle, Flame, Minimize2,
} from "lucide-react";
import { sendNotification } from "@/lib/notifications";
import { toast } from "sonner";
import { pushEvents } from "@/lib/push-events";
import {
  startExerciseTimerNotification,
  stopExerciseTimerNotification,
  pauseExerciseTimerNotification,
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
  const [open, setOpen]                     = useState(false);
  const [isRunning, setIsRunning]           = useState(false);
  const [timeLeft, setTimeLeft]             = useState(defaultDuration * 60);
  const [showComplete, setShowComplete]     = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState("");
  const [hasCompleted, setHasCompleted]     = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const startTimeRef       = useRef<number | null>(null);
  const pausedTimeLeftRef  = useRef<number>(defaultDuration * 60);
  const intervalRef        = useRef<number | null>(null);

  // ── Countdown loop ──────────────────────────────────────────────────────────
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
      if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [isRunning, hasCompleted]);

  // ── Notification action buttons ─────────────────────────────────────────────
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

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getTimeLeft = () => {
    if (startTimeRef.current === null) return pausedTimeLeftRef.current;
    return Math.max(0, pausedTimeLeftRef.current - Math.floor((Date.now() - startTimeRef.current) / 1000));
  };

  const handlePause = () => {
    pausedTimeLeftRef.current = timeLeft;
    startTimeRef.current = null;
    setIsRunning(false);
    pauseExerciseTimerNotification(exerciseName, timeLeft, defaultDuration * 60);
  };

  const handleResume = () => {
    startTimeRef.current = Date.now();
    setIsRunning(true);
    startExerciseTimerNotification(exerciseName, getTimeLeft, defaultDuration * 60);
  };

  const handleStartPause = () => {
    if (isRunning) handlePause(); else handleResume();
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

  const handleMinimise = () => {
    setOpen(false);
    if (isRunning) toast.info(`${exerciseName} is running — check your notifications`, { duration: 3000 });
  };

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
    setMotivationalMessage(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);
    setShowComplete(true);
    setTimeout(triggerConfetti, 200);
    sendNotification("Exercise Complete!", `Great job! You completed ${exerciseName}. Keep it up!`, undefined, true);
    toast.success(`${exerciseName} complete!`);
    pushEvents.exerciseCompleted(exerciseName);
    setOpen(true);
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

  // ── Derived display values ───────────────────────────────────────────────────
  const totalSeconds   = defaultDuration * 60;
  const timeRatio      = totalSeconds > 0 ? timeLeft / totalSeconds : 0; // used for ring dashoffset
  const elapsedSeconds = totalSeconds - timeLeft;
  const minutes        = Math.floor(timeLeft / 60);
  const seconds        = timeLeft % 60;
  const elapsedMin     = Math.floor(elapsedSeconds / 60);
  const elapsedSec     = elapsedSeconds % 60;
  const caloriesBurned = Math.max(0, Math.round((elapsedSeconds / 60) * 6)); // ~6 kcal/min

  // Use the app's primary CSS variable throughout — no dynamic color shift
  const PRIMARY = "hsl(var(--primary))";
  const PRIMARY_GLOW = "hsl(var(--primary) / 0.35)";

  // SVG ring geometry
  const cx = 112, cy = 112, r = 98;
  const circumference = 2 * Math.PI * r; // ≈ 615.8
  const strokeDashoffset = circumference * timeRatio; // remaining portion left unfilled

  const progressPct = Math.round((1 - timeRatio) * 100);

  const formatTime = (m: number, s: number) =>
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const hasStarted = elapsedSeconds > 0;

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
            "fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%]",
            "border bg-background shadow-2xl duration-200 rounded-3xl overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {showComplete ? (
            // ── Completion Screen ─────────────────────────────────────────────
            <div className="relative">
              {/* Gradient header */}
              <div className="bg-gradient-to-br from-primary via-primary/90 to-accent p-8 text-center text-primary-foreground">
                <button
                  onClick={handleContinue}
                  className="absolute right-4 top-4 rounded-full p-1 bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-3 animate-bounce">
                  <Trophy className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold">Well Done!</h2>
                <p className="text-primary-foreground/80 mt-1">{exerciseName}</p>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-center text-muted-foreground text-sm italic">"{motivationalMessage}"</p>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-2xl bg-muted/50">
                    <Timer className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{defaultDuration}</p>
                    <p className="text-xs text-muted-foreground">minutes</p>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-muted/50">
                    <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                    <p className="text-lg font-bold">~{Math.round(defaultDuration * 6)}</p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-muted/50">
                    <Trophy className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                    <p className="text-lg font-bold">100%</p>
                    <p className="text-xs text-muted-foreground">complete</p>
                  </div>
                </div>

                <Button onClick={handleContinue} className="w-full h-12 rounded-2xl text-base font-semibold" size="lg">
                  Continue <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </div>

          ) : (
            // ── Timer Screen ──────────────────────────────────────────────────
            <div className="relative">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Exercise</p>
                  <h2 className="text-lg font-bold leading-tight truncate max-w-[200px]">{exerciseName}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {isRunning && (
                    <button
                      onClick={handleMinimise}
                      className="p-2 rounded-full hover:bg-muted transition-colors"
                      aria-label="Minimise"
                    >
                      <Minimize2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={handleMinimise}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Ring + time display */}
              <div className="flex flex-col items-center px-6 py-4">
                <div className="relative">
                  {/* SVG Ring */}
                  <svg
                    width="224" height="224"
                    viewBox="0 0 224 224"
                    className="transform -rotate-90"
                  >
                    <defs>
                      <filter id="ring-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Outer decorative dashes */}
                    {Array.from({ length: 60 }, (_, i) => {
                      const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
                      const x1 = 112 + 108 * Math.cos(angle);
                      const y1 = 112 + 108 * Math.sin(angle);
                      const x2 = 112 + 113 * Math.cos(angle);
                      const y2 = 112 + 113 * Math.sin(angle);
                      const filledTicks = Math.round((1 - timeRatio) * 60);
                      return (
                        <line
                          key={i}
                          x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke={i < filledTicks ? PRIMARY : "currentColor"}
                          strokeWidth={i % 5 === 0 ? 3 : 1.5}
                          className={i >= filledTicks ? "text-muted-foreground/20" : ""}
                          opacity={i < filledTicks ? 0.8 : 1}
                        />
                      );
                    })}

                    {/* Track ring */}
                    <circle
                      cx={cx} cy={cy} r={r}
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="none"
                      className="text-muted/50"
                    />

                    {/* Pulsing outer ring when running */}
                    {isRunning && (
                      <circle cx={cx} cy={cy} r={r} stroke={PRIMARY} strokeWidth="18" fill="none" opacity="0">
                        <animate attributeName="r" values={`${r};${r + 8}`} dur="1.4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.35;0" dur="1.4s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Progress ring */}
                    <circle
                      cx={cx} cy={cy} r={r}
                      stroke={PRIMARY}
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      filter={isRunning ? "url(#ring-glow)" : undefined}
                      style={{ transition: "stroke-dashoffset 0.3s ease" }}
                    />
                  </svg>

                  {/* Center content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {/* MM : SS */}
                    <div className="flex items-end gap-1">
                      <div className="text-center">
                        <span className="text-5xl font-black tabular-nums leading-none text-primary">
                          {String(minutes).padStart(2, '0')}
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">min</p>
                      </div>
                      <span className="text-3xl font-black text-muted-foreground mb-5">:</span>
                      <div className="text-center">
                        <span className="text-5xl font-black tabular-nums leading-none text-primary">
                          {String(seconds).padStart(2, '0')}
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">sec</p>
                      </div>
                    </div>

                    {/* Status label */}
                    <div className="mt-2 flex items-center gap-1.5">
                      {isRunning && (
                        <span className="relative w-2 h-2 inline-block">
                          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                          <span className="w-2 h-2 rounded-full bg-primary animate-ping absolute inset-0" />
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground font-medium">
                        {timeLeft === 0 ? "Complete!" : isRunning ? "running" : hasStarted ? "paused" : "ready"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    <span>elapsed {formatTime(elapsedMin, elapsedSec)}</span>
                  </div>
                  {hasStarted && (
                    <div className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-400" />
                      <span>~{caloriesBurned} kcal</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-primary">{progressPct}%</span>
                  </div>
                </div>

                {/* Slim progress bar */}
                <div className="w-full mt-3 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="px-6 pb-6 space-y-3">
                <div className="flex gap-3">
                  {/* Play / Pause */}
                  <button
                    onClick={handleStartPause}
                    className="flex-1 h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200 text-primary-foreground active:scale-95 bg-primary hover:bg-primary/90"
                    style={{ boxShadow: `0 4px 20px ${PRIMARY_GLOW}` }}
                  >
                    {isRunning
                      ? <><Pause className="h-5 w-5" /> Pause</>
                      : <><Play className="h-5 w-5" /> {hasStarted ? 'Resume' : 'Start'}</>
                    }
                  </button>

                  {/* Reset */}
                  <button
                    onClick={handleReset}
                    disabled={isRunning}
                    className="w-14 h-14 rounded-2xl border-2 border-muted flex items-center justify-center transition-all duration-200 hover:border-muted-foreground/40 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  >
                    <RotateCcw className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>

                {/* End early */}
                {(isRunning || hasStarted) && (
                  <button
                    onClick={confirmEnd}
                    className="w-full text-sm text-muted-foreground hover:text-destructive transition-colors py-1"
                  >
                    End exercise early
                  </button>
                )}
              </div>

              {/* End-early confirmation overlay */}
              {showEndConfirm && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/95 rounded-3xl">
                  <div className="p-6 space-y-4 text-center max-w-xs">
                    <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertTriangle className="h-7 w-7 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">End Early?</h3>
                      <p className="text-sm text-muted-foreground mt-1">Your progress won't be saved.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowEndConfirm(false)}>
                        Keep Going
                      </Button>
                      <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleEndEarly}>
                        End
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
};
