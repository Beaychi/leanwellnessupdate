import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, RotateCcw, Trophy, ArrowRight, X } from "lucide-react";
import { sendNotification } from "@/lib/notifications";
import { toast } from "sonner";
import { pushEvents } from "@/lib/push-events";
import { startExerciseTimerNotification, stopExerciseTimerNotification } from "@/lib/timer-notifications";
import { setActiveTimer } from "@/lib/active-timer";
import { logExerciseCompletion } from "@/lib/storage";
import confetti from "canvas-confetti";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";

interface ExerciseTimerProps {
  exerciseId: string;
  exerciseName: string;
  defaultDuration: number; // in minutes
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
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(defaultDuration * 60);
  const [showComplete, setShowComplete] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState("");
  const [hasCompleted, setHasCompleted] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  
  // Track actual start time for background-accurate timing
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeLeftRef = useRef<number>(defaultDuration * 60);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      // Set start time when beginning
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
      
      intervalRef.current = window.setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const newTimeLeft = Math.max(0, pausedTimeLeftRef.current - elapsed);
          
          setTimeLeft(newTimeLeft);
          
          if (newTimeLeft <= 0 && !hasCompleted) {
            setHasCompleted(true);
            handleTimerComplete();
          }
        }
      }, 100); // Check more frequently for accuracy
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

  const triggerConfetti = () => {
    try {
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999,
      };

      function fire(particleRatio: number, opts: confetti.Options) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    } catch (error) {
      console.error("Confetti error:", error);
    }
  };

  const triggerVibration = () => {
    try {
      if ('vibrate' in navigator) {
        // Vibration pattern: vibrate 200ms, pause 100ms, vibrate 200ms, pause 100ms, vibrate 200ms
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } catch (error) {
      console.log('Vibration not supported');
    }
  };

  const handleTimerComplete = () => {
    setIsRunning(false);
    startTimeRef.current = null;
    stopExerciseTimerNotification();
    
    // Trigger vibration alert
    triggerVibration();
    
    // Log the exercise completion
    logExerciseCompletion(exerciseId, exerciseName, defaultDuration);
    
    // Set motivational message
    setMotivationalMessage(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);
    
    // Show completion screen
    setShowComplete(true);
    
    // Trigger confetti animation after a small delay
    setTimeout(() => {
      triggerConfetti();
    }, 200);
    
    sendNotification(
      "Exercise Complete!",
      `Great job! You completed ${exerciseName}. Keep it up!`,
      undefined,
      true // with sound
    );
    toast.success(`${exerciseName} complete!`);
    pushEvents.exerciseCompleted(exerciseName);
    setActiveTimer(null);
  };

  const handleStartPause = () => {
    if (isRunning) {
      // Pausing - save current time left
      pausedTimeLeftRef.current = timeLeft;
      startTimeRef.current = null;
      stopExerciseTimerNotification();
      setActiveTimer({
        type: 'exercise',
        name: exerciseName,
        startedAt: Date.now(),
        totalDuration: defaultDuration * 60,
        elapsedBefore: defaultDuration * 60 - timeLeft,
        paused: true,
      });
    } else {
      // Starting - reset start time
      startTimeRef.current = Date.now();
      // Start persistent timer notification
      startExerciseTimerNotification(exerciseName, () => {
        if (startTimeRef.current === null) return pausedTimeLeftRef.current;
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        return Math.max(0, pausedTimeLeftRef.current - elapsed);
      });
      setActiveTimer({
        type: 'exercise',
        name: exerciseName,
        startedAt: Date.now(),
        totalDuration: defaultDuration * 60,
        elapsedBefore: defaultDuration * 60 - timeLeft,
        paused: false,
      });
    }
    setIsRunning(!isRunning);
  };

  // Listen for floating widget actions
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.action === 'pause' && isRunning) {
        handleStartPause();
      } else if (detail.action === 'resume' && !isRunning) {
        handleStartPause();
      } else if (detail.action === 'cancel') {
        handleCloseTimer();
      }
    };
    window.addEventListener('floatingTimerAction', handler);
    return () => window.removeEventListener('floatingTimerAction', handler);
  }, [isRunning]);

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(defaultDuration * 60);
    pausedTimeLeftRef.current = defaultDuration * 60;
    startTimeRef.current = null;
    setShowComplete(false);
    setHasCompleted(false);
    stopExerciseTimerNotification();
    setActiveTimer(null);
  };

  const handleContinue = () => {
    // Reset all state first
    setShowComplete(false);
    setHasCompleted(false);
    setTimeLeft(defaultDuration * 60);
    pausedTimeLeftRef.current = defaultDuration * 60;
    startTimeRef.current = null;
    setIsRunning(false);
    
    // Close dialog last
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    // This handles the default close button click
    if (newOpen) {
      setOpen(true);
    } else {
      // Prevent default closing behavior
      // The custom close button handler will be called instead
    }
  };

  const handleCloseButtonClick = () => {
    // Handle close button click with confirmation
    if (isRunning || timeLeft < defaultDuration * 60) {
      // Show confirmation if timer is running or has been started
      setShowStopConfirm(true);
    } else {
      // Just close if timer hasn't started
      handleCloseTimer();
    }
  };

  const handleCloseTimer = () => {
    setOpen(false);
    setIsRunning(false);
    setShowComplete(false);
    setHasCompleted(false);
    setTimeLeft(defaultDuration * 60);
    pausedTimeLeftRef.current = defaultDuration * 60;
    startTimeRef.current = null;
    setShowStopConfirm(false);
    stopExerciseTimerNotification();
    setActiveTimer(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((defaultDuration * 60 - timeLeft) / (defaultDuration * 60)) * 100;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Timer className="h-4 w-4 mr-2" />
          Start Timer
        </Button>
      </DialogTrigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
          )}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
        {showComplete ? (
          // Completion Screen
          <div className="py-8 space-y-6 text-center">
            <button 
              onClick={handleCloseButtonClick}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
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
              Continue
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        ) : (
          // Timer Screen
          <>
            <button 
              onClick={handleCloseButtonClick}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 className="text-lg font-semibold leading-none tracking-tight">{exerciseName}</h2>
            </div>
            
            <div className="py-8 space-y-6">
              {/* Circular Progress */}
              <div className="relative w-48 h-48 mx-auto">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                    className="text-primary transition-all duration-300"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-5xl font-bold">{formatTime(timeLeft)}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {timeLeft === 0 ? "Complete!" : "remaining"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleStartPause}
                  size="lg"
                  className="px-8"
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Start
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleReset}
                  size="lg"
                  variant="outline"
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      {/* Stop Exercise Confirmation */}
      <ConfirmDialog
        open={showStopConfirm}
        onOpenChange={setShowStopConfirm}
        title="Stop Exercise?"
        description="Are you sure you want to stop this exercise? Your progress will not be saved."
        confirmText="Stop Exercise"
        cancelText="Keep Going"
        onConfirm={handleCloseTimer}
        variant="destructive"
      />
    </Dialog>
  );
};
