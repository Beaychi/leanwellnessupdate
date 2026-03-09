import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Timer, Play, TrendingUp, Flame, Award, StopCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FastingPortal } from "./FastingPortal";
import { FastingTimer } from "./FastingTimer";
import { FastingHistoryDialog } from "./FastingHistoryDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { 
  getFastingState, 
  startFastingSession, 
  getFastingProgress,
  formatDuration,
  endFastingSession,
  FastingProtocol 
} from "@/lib/fasting";
import { checkFastingNotifications } from "@/lib/fasting-notifications";

export const FastingCard = () => {
  const [showPortal, setShowPortal] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [fastingState, setFastingState] = useState(getFastingState());
  const [progress, setProgress] = useState<{ elapsed: number; remaining: number; percentage: number } | null>(null);

  const updateState = useCallback(() => {
    const state = getFastingState();
    const currentProgress = getFastingProgress();
    setFastingState(state);
    setProgress(currentProgress);

    // Auto-complete fast when timer reaches 0
    if (state.isActive && currentProgress && currentProgress.remaining <= 0) {
      endFastingSession(true);
      toast.success("Fast Complete!", {
        description: "Amazing discipline! You've completed your fast!",
        duration: 6000,
      });
      setFastingState(getFastingState());
      setProgress(null);
    }
  }, []);

  useEffect(() => {
    updateState();
    const interval = setInterval(() => {
      updateState();
      checkFastingNotifications();
    }, 1000);
    
    const handleFastingUpdate = () => updateState();
    window.addEventListener('fastingUpdated', handleFastingUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('fastingUpdated', handleFastingUpdate);
    };
  }, [updateState]);

  const handleStartFast = (protocol: FastingProtocol, customHours?: number) => {
    const hours = customHours || protocol.fastingHours;
    startFastingSession(protocol.id, hours);
    setShowPortal(false);
    setShowTimer(true);
    updateState();
  };

  const handleFastComplete = () => {
    setShowTimer(false);
    updateState();
  };

  const handleEndFast = () => {
    endFastingSession(false, "Ended early");
    toast.info("Fast ended. Great effort!", { duration: 3000 });
    setShowEndConfirm(false);
    updateState();
  };

  const elapsedTime = progress ? formatDuration(progress.elapsed) : null;
  const remainingTime = progress ? formatDuration(progress.remaining) : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-primary/20">
          <CardContent className="p-4">
            {fastingState.isActive ? (
              // Active fast state
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="p-2 rounded-full bg-primary/20"
                    >
                      <Timer className="h-5 w-5 text-primary" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold">Fasting Active</h3>
                      <p className="text-xs text-muted-foreground">
                        {elapsedTime?.hours}h {elapsedTime?.minutes}m elapsed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(progress?.percentage || 0)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {remainingTime?.hours}h {remainingTime?.minutes}m left
                    </p>
                  </div>
                </div>

                {/* Mini progress bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress?.percentage || 0}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={() => setShowTimer(true)}
                    className="w-full"
                    variant="default"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    View Timer
                  </Button>
                  <Button 
                    onClick={() => setShowEndConfirm(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    End Fast
                  </Button>
                </div>
              </div>
            ) : (
              // Inactive state
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/20">
                      <Timer className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Intermittent Fasting</h3>
                      <p className="text-sm text-muted-foreground">Unlock your body's potential</p>
                    </div>
                  </div>
                  <FastingHistoryDialog />
                </div>

                {/* Stats row */}
                {(fastingState.totalFastingHours > 0 || fastingState.currentStreak > 0) && (
                  <div className="grid grid-cols-3 gap-2 py-2">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <TrendingUp className="h-4 w-4 mx-auto text-primary mb-1" />
                      <div className="text-lg font-bold">{Math.round(fastingState.totalFastingHours)}</div>
                      <div className="text-xs text-muted-foreground">Hours Fasted</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <Flame className="h-4 w-4 mx-auto text-secondary mb-1" />
                      <div className="text-lg font-bold">{fastingState.currentStreak}</div>
                      <div className="text-xs text-muted-foreground">Day Streak</div>
                    </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                      <Award className="h-4 w-4 mx-auto text-primary mb-1" />
                      <div className="text-lg font-bold">{Math.round(fastingState.longestFast)}</div>
                      <div className="text-xs text-muted-foreground">Longest (h)</div>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => setShowPortal(true)}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  <motion.span
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center justify-center gap-2"
                  >
                    Start Fasting
                  </motion.span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Portal for protocol selection */}
      <FastingPortal 
        isOpen={showPortal} 
        onClose={() => setShowPortal(false)}
        onStartFast={handleStartFast}
      />

      {/* Timer view */}
      <FastingTimer 
        isOpen={showTimer} 
        onClose={() => setShowTimer(false)}
        onFastComplete={handleFastComplete}
      />

      {/* End Fast confirmation dialog */}
      <ConfirmDialog
        open={showEndConfirm}
        onOpenChange={setShowEndConfirm}
        title="End Fast Early?"
        description="Are you sure you want to end your fast? Your progress will be saved but marked as incomplete."
        confirmText="End Fast"
        onConfirm={handleEndFast}
      />
    </>
  );
};
