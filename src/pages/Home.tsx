import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Flame, TrendingUp, Dumbbell } from "lucide-react";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { CheatLogDialog } from "@/components/CheatLogDialog";
import { WaterTracker } from "@/components/WaterTracker";
import { DailyHistoryDialog } from "@/components/DailyHistoryDialog";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AnimatedStat, AnimatedCard } from "@/components/AnimatedStat";
import CalorieDashboard from "@/components/CalorieDashboard";
import { FastingCard } from "@/components/fasting/FastingCard";
import { DynamicMealCard } from "@/components/DynamicMealCard";
import { getCurrentDayNumber, getStoredData } from "@/lib/storage";
import { getMealPlan, getDynamicTodaysMeals, DynamicMeal } from "@/lib/meal-plan";
import { useStorageSync } from "@/hooks/use-storage-sync";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { pushEvents } from "@/lib/push-events";

export default function Home() {
  const navigate = useNavigate();
  const [dayNumber, setDayNumber] = useState(1);
  const [todaysMeals, setTodaysMeals] = useState<DynamicMeal[]>([]);
  const [streak, setStreak] = useState(0);
  const [completedMealsCount, setCompletedMealsCount] = useState(0);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [celebratedAllMeals, setCelebratedAllMeals] = useState(false);
  const [hasMealPlan, setHasMealPlan] = useState(false);

  const triggerAllMealsCelebration = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
    });
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
    toast.success("All meals completed!", {
      description: "Amazing job! You've finished all your meals for today!",
      duration: 5000,
    });
    pushEvents.allMealsCompleted();
  }, []);

  const loadData = useCallback(() => {
    const data = getStoredData();
    if (data) {
      const currentDay = getCurrentDayNumber(data.startDate);
      setDayNumber(currentDay);
      setStreak(data.streakDays || 0);
      
      const mealPlan = getMealPlan();
      setHasMealPlan(!!mealPlan);
      const meals = getDynamicTodaysMeals(currentDay);
      setTodaysMeals(meals);
      
      const today = new Date().toISOString().split('T')[0];
      const todayCompletedCount = data.completedMeals[today]?.length || 0;
      setCompletedMealsCount(todayCompletedCount);
      
      if (data.onboardingCompleted && !data.notificationsEnabled) {
        setShowNotificationPrompt(true);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleAllMealsCompleted = () => {
      if (!celebratedAllMeals) {
        setCelebratedAllMeals(true);
        triggerAllMealsCelebration();
      }
    };
    window.addEventListener('allMealsCompleted', handleAllMealsCompleted);
    return () => window.removeEventListener('allMealsCompleted', handleAllMealsCompleted);
  }, [celebratedAllMeals, triggerAllMealsCelebration]);

  useEffect(() => {
    const checkDate = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        setCelebratedAllMeals(false);
      }
    };
    const interval = setInterval(checkDate, 60000);
    return () => clearInterval(interval);
  }, []);

  useStorageSync(['mealCompleted', 'dataUpdated', 'waterUpdated', 'exerciseCompleted', 'mealPlanUpdated'], loadData);

  const getProfileName = (): string => {
    try {
      const data = localStorage.getItem("leantrack_profile");
      if (data) {
        const profile = JSON.parse(data);
        return profile.fullName?.split(" ")[0] || "";
      }
    } catch {}
    return "";
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    const name = getProfileName();
    const nameStr = name ? `, ${name}` : "";
    if (hour < 6) return `Rest well${nameStr}! Getting enough sleep is key.`;
    if (hour < 12) return `Good morning${nameStr}! Ready to crush your goals?`;
    if (hour < 14) return `Hey${nameStr}! Don't forget your midday fuel.`;
    if (hour < 17) return `Keep going${nameStr}! You're doing great today.`;
    if (hour < 20) return `Good evening${nameStr}! How was your day?`;
    return `Wind down${nameStr}. You earned some rest tonight.`;
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground p-6 rounded-b-3xl mb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">LeanTrack</h1>
              <p className="text-primary-foreground/90 text-sm">Your wellness journey</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">Day {dayNumber}</div>
              <div className="text-primary-foreground/90 text-sm">of 7</div>
            </div>
          </div>

          <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-4 mt-4">
            <p className="text-center font-medium">{getGreeting()}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <InstallPrompt />

        {showNotificationPrompt && (
          <NotificationPrompt onDismiss={() => setShowNotificationPrompt(false)} />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <AnimatedCard value={dayNumber}>
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                <AnimatedStat value={dayNumber} className="text-2xl font-bold">
                  {dayNumber}
                </AnimatedStat>
                <div className="text-xs text-muted-foreground">Current Day</div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard value={streak}>
            <Card>
              <CardContent className="p-4 text-center">
                <Flame className="h-6 w-6 mx-auto mb-2 text-secondary" />
                <AnimatedStat value={streak} className="text-2xl font-bold">
                  {streak}
                </AnimatedStat>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard value={completedMealsCount}>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-success" />
                <AnimatedStat value={completedMealsCount} className="text-2xl font-bold">
                  {completedMealsCount}/{todaysMeals.length || 3}
                </AnimatedStat>
                <div className="text-xs text-muted-foreground">Meals Done</div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>

        {/* Water Tracker & History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <WaterTracker dailyGoal={8} />
          <DailyHistoryDialog />
        </div>

        <CalorieDashboard />
        <FastingCard />

        {/* Today's Meals */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Today's Meals</h2>
            <Button variant="link" size="sm" onClick={() => navigate('/meals')}>
              {hasMealPlan ? 'View All Days' : 'Generate Plan'}
            </Button>
          </div>
          {todaysMeals.length > 0 ? (
            <div className="space-y-3">
              {todaysMeals.map((meal) => (
                <DynamicMealCard key={meal.id} meal={meal} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-3">No meal plan yet. Generate one to get started!</p>
                <Button onClick={() => navigate('/meals')} variant="outline">
                  Go to Meals
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-20" onClick={() => navigate('/exercises')}>
            <div className="text-center">
              <Dumbbell className="h-6 w-6 mx-auto mb-1 text-primary" />
              <div className="text-sm font-medium">Exercises</div>
            </div>
          </Button>
          <Button variant="outline" className="h-20" onClick={() => navigate('/progress')}>
            <div className="text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-primary" />
              <div className="text-sm font-medium">Progress</div>
            </div>
          </Button>
        </div>

        <CheatLogDialog />
      </div>
    </div>
  );
}
