import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, Plus, Minus, Award } from "lucide-react";
import { getWaterIntakeToday, logWaterIntake } from "@/lib/storage";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { pushEvents } from "@/lib/push-events";

interface WaterTrackerProps {
  dailyGoal?: number;
}

export function WaterTracker({ dailyGoal = 8 }: WaterTrackerProps) {
  const [glasses, setGlasses] = useState(0);
  const [celebrated, setCelebrated] = useState(false);
  const [lastChangedIndex, setLastChangedIndex] = useState<number | null>(null);

  useEffect(() => {
    setGlasses(getWaterIntakeToday());
  }, []);

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#00BFFF', '#1E90FF', '#4169E1', '#87CEEB'],
    });
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    toast.success("Water Goal Reached!", {
      description: "Great job staying hydrated today!",
    });
  };

  const addGlass = () => {
    const newCount = glasses + 1;
    setGlasses(newCount);
    setLastChangedIndex(newCount - 1);
    logWaterIntake(newCount);
    
    // Clear animation after it completes
    setTimeout(() => setLastChangedIndex(null), 500);
    
    if (newCount >= dailyGoal && !celebrated) {
      setCelebrated(true);
      triggerCelebration();
      pushEvents.waterGoalReached();
    } else if (newCount < dailyGoal) {
      toast.success(`Glass ${newCount} logged! ${dailyGoal - newCount} more to reach your goal`);
    }
  };

  const removeGlass = () => {
    if (glasses > 0) {
      const newCount = glasses - 1;
      setGlasses(newCount);
      setLastChangedIndex(newCount);
      logWaterIntake(newCount);
      
      // Clear animation after it completes
      setTimeout(() => setLastChangedIndex(null), 500);
      
      if (newCount < dailyGoal) {
        setCelebrated(false);
      }
    }
  };

  const percentage = Math.min((glasses / dailyGoal) * 100, 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Droplets className="h-5 w-5 text-accent" />
          Water Intake
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={removeGlass}
              disabled={glasses === 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <div className="text-2xl font-bold">{glasses}</div>
              <div className="text-xs text-muted-foreground">of {dailyGoal} glasses</div>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={addGlass}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-1">
            {Array.from({ length: dailyGoal }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-6 rounded-full transition-all duration-300",
                  i < glasses ? "bg-accent" : "bg-muted",
                  lastChangedIndex === i && "animate-stat-pulse"
                )}
              />
            ))}
          </div>
        </div>

        {glasses >= dailyGoal && (
          <div className="mt-3 bg-accent/10 border border-accent/30 rounded-lg p-2 text-center flex items-center justify-center gap-1">
            <Award className="h-4 w-4 text-accent" />
            <p className="text-xs font-medium text-accent">Goal reached! Stay hydrated!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}