import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStoredData, getCurrentDayNumber } from "@/lib/storage";
import { CheckCircle2, Calendar, Flame, TrendingUp, Award, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import WeightTracker from "@/components/WeightTracker";

import { AnimatedStat, AnimatedCard } from "@/components/AnimatedStat";
import { useStorageSync } from "@/hooks/use-storage-sync";

export default function Progress() {
  const [stats, setStats] = useState({
    currentDay: 1,
    streakDays: 0,
    completedMealsToday: 0,
    totalMealsToday: 2,
    startDate: "",
  });
  const celebratedRef = useRef(false);

  const milestoneIcons: Record<number, React.ReactNode> = {
    7: <Award className="h-5 w-5" />,
    14: <Flame className="h-5 w-5" />,
    21: <TrendingUp className="h-5 w-5" />,
    30: <Trophy className="h-5 w-5" />,
  };

  const milestones = [
    { day: 7, title: "First Week" },
    { day: 14, title: "Two Weeks Strong" },
    { day: 21, title: "Habit Formed" },
    { day: 30, title: "One Month!" },
  ];

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
    });
  };

  const triggerVibration = () => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  const celebrateMilestone = (milestone: { day: number; title: string }) => {
    triggerConfetti();
    triggerVibration();
    toast.success(milestone.title, {
      description: `Congratulations! You've reached ${milestone.day} days!`,
      duration: 5000,
    });
  };

  const loadData = useCallback(() => {
    const data = getStoredData();
    if (data) {
      const today = new Date().toISOString().split("T")[0];
      const mealsToday = data.completedMeals[today]?.length || 0;
      const streakDays = data.streakDays || 0;
      
      setStats({
        currentDay: getCurrentDayNumber(data.startDate),
        streakDays: streakDays,
        completedMealsToday: mealsToday,
        totalMealsToday: 2,
        startDate: data.startDate,
      });

      // Check for new milestones to celebrate
      if (!celebratedRef.current) {
        const celebratedMilestones = JSON.parse(localStorage.getItem('celebratedMilestones') || '[]');
        
        for (const milestone of milestones) {
          if (streakDays >= milestone.day && !celebratedMilestones.includes(milestone.day)) {
            setTimeout(() => celebrateMilestone(milestone), 500);
            celebratedMilestones.push(milestone.day);
            localStorage.setItem('celebratedMilestones', JSON.stringify(celebratedMilestones));
            break; // Celebrate one at a time
          }
        }
        celebratedRef.current = true;
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for real-time updates
  useStorageSync(['mealCompleted', 'dataUpdated', 'waterUpdated', 'exerciseCompleted', 'weightUpdated'], loadData);

  const completionPercentage = Math.round((stats.completedMealsToday / stats.totalMealsToday) * 100);
  
  const milestonesWithStatus = milestones.map(m => ({
    ...m,
    achieved: stats.streakDays >= m.day,
  }));

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="bg-success text-success-foreground p-6 rounded-b-3xl mb-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Progress</h1>
          <p className="text-success-foreground/90">Track your wellness journey</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Today's Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Today's Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Meals Completed</span>
                  <span className="text-sm font-bold">{stats.completedMealsToday}/{stats.totalMealsToday}</span>
                </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-success h-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
              
              {completionPercentage === 100 && (
                <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-success flex items-center justify-center gap-1"><CheckCircle2 className="h-4 w-4" /> All meals completed today! Amazing work!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          <AnimatedCard value={stats.currentDay}>
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-3 text-primary" />
                <AnimatedStat value={stats.currentDay} className="text-3xl font-bold mb-1">
                  Day {stats.currentDay}
                </AnimatedStat>
                <div className="text-sm text-muted-foreground">Current Day</div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard value={stats.streakDays}>
            <Card>
              <CardContent className="p-6 text-center">
                <Flame className="h-8 w-8 mx-auto mb-3 text-secondary" />
                <AnimatedStat value={stats.streakDays} className="text-3xl font-bold mb-1">
                  {stats.streakDays}
                </AnimatedStat>
                <div className="text-sm text-muted-foreground">Day Streak</div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard value={completionPercentage}>
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-3 text-success" />
                <AnimatedStat value={completionPercentage} className="text-3xl font-bold mb-1">
                  {completionPercentage}%
                </AnimatedStat>
                <div className="text-sm text-muted-foreground">Today's Rate</div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {milestonesWithStatus.map((milestone) => (
                <div
                  key={milestone.day}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    milestone.achieved
                      ? "border-success bg-success/10"
                      : "border-muted bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-primary">{milestoneIcons[milestone.day]}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{milestone.title}</h4>
                      <p className="text-sm text-muted-foreground">{milestone.day} days</p>
                    </div>
                    {milestone.achieved && (
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Journey Started */}
        <Card className="bg-muted/50">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Journey started on</p>
            <p className="text-xl font-bold">
              {stats.startDate ? new Date(stats.startDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) : "Just now"}
            </p>
          </CardContent>
        </Card>


        {/* Weight Tracker */}
        <WeightTracker />

        {/* Motivation */}
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-6 text-center">
            <Award className="h-10 w-10 mx-auto mb-3 text-primary" />
            <h3 className="font-bold text-lg mb-2">Keep Going!</h3>
            <p className="text-sm text-muted-foreground">
              You're building healthy habits one day at a time. Every small step counts!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
