import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Droplets, Dumbbell, History, Calendar, TrendingUp } from "lucide-react";
import { getStoredData } from "@/lib/storage";
import { format, parseISO, subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { useStorageSync } from "@/hooks/use-storage-sync";

interface DailyHistory {
  date: string;
  waterGlasses: number;
  exerciseCount: number;
  exerciseMinutes: number;
}

interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalWaterGlasses: number;
  avgWaterPerDay: number;
  totalExercises: number;
  totalExerciseMinutes: number;
  daysActive: number;
}

export function DailyHistoryDialog() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);

  const loadHistory = useCallback(() => {
    const data = getStoredData();
    if (!data) return;

    const historyMap: Record<string, DailyHistory> = {};
    
    // Get start date to only show history from when user started
    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    startDate.setHours(0, 0, 0, 0);
    
    // Get last 14 days but only from start date
    for (let i = 0; i < 14; i++) {
      const date = subDays(new Date(), i);
      date.setHours(0, 0, 0, 0);
      
      // Only include dates from startDate onwards
      if (date >= startDate) {
        const dateStr = format(date, 'yyyy-MM-dd');
        historyMap[dateStr] = {
          date: dateStr,
          waterGlasses: 0,
          exerciseCount: 0,
          exerciseMinutes: 0,
        };
      }
    }

    // Fill in water logs
    if (data.waterLogs) {
      Object.entries(data.waterLogs).forEach(([date, glasses]) => {
        if (historyMap[date]) {
          historyMap[date].waterGlasses = glasses;
        }
      });
    }

    // Fill in exercise logs
    if (data.exerciseLogs) {
      data.exerciseLogs.forEach((log) => {
        const date = log.completedAt.split('T')[0];
        if (historyMap[date]) {
          historyMap[date].exerciseCount += 1;
          historyMap[date].exerciseMinutes += log.durationMinutes;
        }
      });
    }

    // Sort by date descending
    const sortedHistory = Object.values(historyMap).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setHistory(sortedHistory);

    // Calculate weekly summary (current week)
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    let totalWater = 0;
    let totalExercises = 0;
    let totalMinutes = 0;
    let daysActive = 0;

    sortedHistory.forEach((day) => {
      const dayDate = parseISO(day.date);
      if (isWithinInterval(dayDate, { start: weekStart, end: weekEnd })) {
        totalWater += day.waterGlasses;
        totalExercises += day.exerciseCount;
        totalMinutes += day.exerciseMinutes;
        if (day.waterGlasses > 0 || day.exerciseCount > 0) {
          daysActive++;
        }
      }
    });

    const daysInWeek = Math.min(
      Math.ceil((now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      7
    );

    setWeeklySummary({
      weekStart: format(weekStart, 'MMM d'),
      weekEnd: format(weekEnd, 'MMM d'),
      totalWaterGlasses: totalWater,
      avgWaterPerDay: daysInWeek > 0 ? Math.round(totalWater / daysInWeek) : 0,
      totalExercises,
      totalExerciseMinutes: totalMinutes,
      daysActive,
    });
  }, []);

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, loadHistory]);

  // Real-time sync for all activity types
  useStorageSync(['waterUpdated', 'exerciseCompleted', 'mealCompleted', 'dataUpdated'], loadHistory);

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 text-center">
            <History className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-sm font-medium">Daily History</div>
            <div className="text-xs text-muted-foreground">View past activity</div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activity History
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekly">Weekly Summary</TabsTrigger>
            <TabsTrigger value="daily">Daily Log</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-4">
            {weeklySummary && (
              <div className="space-y-4">
                <div className="text-center p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="text-sm text-muted-foreground">
                    {weeklySummary.weekStart} - {weeklySummary.weekEnd}
                  </div>
                  <div className="text-lg font-bold">This Week's Summary</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Droplets className="h-5 w-5 mx-auto mb-1 text-accent" />
                      <div className="text-2xl font-bold">{weeklySummary.totalWaterGlasses}</div>
                      <div className="text-xs text-muted-foreground">Total Glasses</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Droplets className="h-5 w-5 mx-auto mb-1 text-accent/70" />
                      <div className="text-2xl font-bold">{weeklySummary.avgWaterPerDay}</div>
                      <div className="text-xs text-muted-foreground">Avg/Day</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Dumbbell className="h-5 w-5 mx-auto mb-1 text-secondary" />
                      <div className="text-2xl font-bold">{weeklySummary.totalExercises}</div>
                      <div className="text-xs text-muted-foreground">Exercises</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Dumbbell className="h-5 w-5 mx-auto mb-1 text-secondary/70" />
                      <div className="text-2xl font-bold">{weeklySummary.totalExerciseMinutes}</div>
                      <div className="text-xs text-muted-foreground">Total Minutes</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{weeklySummary.daysActive}</div>
                    <div className="text-sm text-muted-foreground">Days Active This Week</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="daily" className="mt-4">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2 pr-4">
                {history.map((day) => {
                  const isToday = day.date === today;
                  const dateLabel = isToday 
                    ? "Today" 
                    : format(parseISO(day.date), 'EEE, MMM d');

                  return (
                    <Card key={day.date} className={isToday ? "border-primary/50 bg-primary/5" : ""}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
                            {dateLabel}
                          </span>
                          {isToday && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <Droplets className="h-4 w-4 text-accent" />
                            <div>
                              <div className="text-sm font-medium">{day.waterGlasses}</div>
                              <div className="text-xs text-muted-foreground">glasses</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Dumbbell className="h-4 w-4 text-secondary" />
                            <div>
                              <div className="text-sm font-medium">{day.exerciseCount}</div>
                              <div className="text-xs text-muted-foreground">
                                {day.exerciseMinutes > 0 ? `${day.exerciseMinutes} min` : 'exercises'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
