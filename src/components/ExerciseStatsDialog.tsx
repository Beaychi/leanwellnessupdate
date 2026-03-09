import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, Clock, Dumbbell } from "lucide-react";
import { getExerciseStats } from "@/lib/storage";

interface ExerciseStats {
  totalExercises: number;
  totalMinutes: number;
  exerciseBreakdown: {
    exerciseId: string;
    exerciseName: string;
    count: number;
    totalMinutes: number;
  }[];
}

export const ExerciseStatsDialog = () => {
  const [stats, setStats] = useState<ExerciseStats>({ totalExercises: 0, totalMinutes: 0, exerciseBreakdown: [] });
  const [open, setOpen] = useState(false);

  // Load stats on mount and when dialog opens
  useEffect(() => {
    const loadStats = () => {
      const newStats = getExerciseStats();
      setStats(newStats);
    };
    
    loadStats();
    
    // Also reload when dialog opens
    if (open) {
      loadStats();
    }
    
    // Listen for real-time exercise completion events
    const handleExerciseCompleted = () => {
      loadStats();
    };
    
    window.addEventListener('exerciseCompleted', handleExerciseCompleted);
    
    return () => {
      window.removeEventListener('exerciseCompleted', handleExerciseCompleted);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalExercises}</p>
                <p className="text-sm text-muted-foreground">Exercises Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Exercise Statistics
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-primary">{stats.totalExercises}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-accent">{stats.totalMinutes}</p>
                <p className="text-sm text-muted-foreground">Total Minutes</p>
              </CardContent>
            </Card>
          </div>

          {/* Exercise Breakdown */}
          <div>
            <h3 className="font-semibold mb-3">Exercise Breakdown</h3>
            <ScrollArea className="h-[250px]">
              {stats.exerciseBreakdown.length > 0 ? (
                <div className="space-y-2">
                  {stats.exerciseBreakdown.map((exercise) => (
                    <Card key={exercise.exerciseId}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{exercise.exerciseName}</p>
                            <p className="text-sm text-muted-foreground">
                              {exercise.count} session{exercise.count > 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{exercise.totalMinutes} min</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No exercises completed yet.</p>
                  <p className="text-sm">Start a timer to track your progress!</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
