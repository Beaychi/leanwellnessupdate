import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Flame, Beef, Wheat, Droplets, Settings2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getStoredData, saveStoredData, getCurrentDayNumber } from "@/lib/storage";
import { getDayPlan } from "@/lib/dietPlan";
import { getMealPlan } from "@/lib/meal-plan";
import { useStorageSync } from "@/hooks/use-storage-sync";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CalorieGoal {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const DEFAULT_GOAL: CalorieGoal = {
  dailyCalories: 1500,
  protein: 80,
  carbs: 150,
  fats: 50,
};

const MACRO_COLORS = {
  protein: "hsl(var(--chart-1))",
  carbs: "hsl(var(--chart-2))",
  fats: "hsl(var(--chart-3))",
};

export default function CalorieDashboard() {
  const [calorieGoal, setCalorieGoal] = useState<CalorieGoal>(DEFAULT_GOAL);
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [tempGoal, setTempGoal] = useState<CalorieGoal>(DEFAULT_GOAL);
  const [consumedCalories, setConsumedCalories] = useState(0);
  const [consumedMacros, setConsumedMacros] = useState({ protein: 0, carbs: 0, fats: 0 });

  const calculateConsumedNutrition = useCallback(async () => {
    const data = getStoredData();
    if (!data) return;

    const today = new Date().toISOString().split("T")[0];
    const completedMealIds = data.completedMeals[today] || [];
    const alternativeMeals = data.alternativeMeals[today] || [];

    const dayNumber = getCurrentDayNumber(data.startDate);
    const dayPlan = getDayPlan(dayNumber);

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    // Also check dynamic meal plan
    const dynamicPlan = getMealPlan();
    const dynamicDayPlan = dynamicPlan?.plan.find(d => d.day === dayNumber);

    // Add nutrition from completed planned meals
    completedMealIds.forEach((mealId) => {
      const alternative = alternativeMeals.find((alt) => alt.mealId === mealId);
      
      if (alternative) {
        // Use alternative meal data (now includes macros)
        totalCalories += alternative.calories || 0;
        totalProtein += alternative.protein || 0;
        totalCarbs += alternative.carbs || 0;
        totalFats += alternative.fats || 0;
      } else {
        // Try fixed diet plan first
        let meal = dayPlan.meals.find((m) => m.id === mealId);
        // Then try dynamic meal plan
        if (!meal && dynamicDayPlan) {
          meal = dynamicDayPlan.meals.find((m) => m.id === mealId) as any;
        }
        if (meal) {
          totalCalories += meal.nutritionalInfo.calories;
          totalProtein += parseInt(meal.nutritionalInfo.protein) || 0;
          totalCarbs += parseInt(meal.nutritionalInfo.carbs) || 0;
          totalFats += parseInt(meal.nutritionalInfo.fats) || 0;
        }
      }
    });

    // Fetch today's food entries from Supabase
    try {
      const todayStart = new Date(today);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: foodEntries, error } = await supabase
        .from('food_entries')
        .select('calories, protein, carbs, fats')
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (!error && foodEntries) {
        foodEntries.forEach((entry) => {
          totalCalories += entry.calories || 0;
          totalProtein += entry.protein || 0;
          totalCarbs += entry.carbs || 0;
          totalFats += entry.fats || 0;
        });
      }
    } catch (err) {
      console.error('Error fetching food entries:', err);
    }

    setConsumedCalories(totalCalories);
    setConsumedMacros({
      protein: totalProtein,
      carbs: totalCarbs,
      fats: totalFats,
    });
  }, []);

  const loadGoal = useCallback(() => {
    const data = getStoredData();
    if (data?.calorieGoal) {
      setCalorieGoal(data.calorieGoal);
      setTempGoal(data.calorieGoal);
    }
  }, []);

  useEffect(() => {
    loadGoal();
    calculateConsumedNutrition();
  }, [loadGoal, calculateConsumedNutrition]);

  // Listen for meal and food entry updates
  useStorageSync(["mealCompleted", "dataUpdated", "foodEntryAdded"], () => {
    calculateConsumedNutrition();
  });

  // Also listen for foodEntryAdded custom event
  useEffect(() => {
    const handleFoodEntry = () => {
      calculateConsumedNutrition();
    };
    window.addEventListener('foodEntryAdded', handleFoodEntry);
    return () => window.removeEventListener('foodEntryAdded', handleFoodEntry);
  }, [calculateConsumedNutrition]);

  const handleSaveGoal = () => {
    if (tempGoal.dailyCalories < 1000 || tempGoal.dailyCalories > 5000) {
      toast.error("Daily calories should be between 1000 and 5000");
      return;
    }

    const data = getStoredData();
    saveStoredData({ ...data, calorieGoal: tempGoal });
    setCalorieGoal(tempGoal);
    setShowGoalSettings(false);
    toast.success("Calorie goal updated!");
  };

  const calorieProgress = Math.min(100, (consumedCalories / calorieGoal.dailyCalories) * 100);
  const remainingCalories = Math.max(0, calorieGoal.dailyCalories - consumedCalories);

  const macroData = [
    { name: "Protein", value: consumedMacros.protein, color: MACRO_COLORS.protein },
    { name: "Carbs", value: consumedMacros.carbs, color: MACRO_COLORS.carbs },
    { name: "Fats", value: consumedMacros.fats, color: MACRO_COLORS.fats },
  ].filter((item) => item.value > 0);

  const totalMacroGrams = consumedMacros.protein + consumedMacros.carbs + consumedMacros.fats;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Calorie Dashboard
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGoalSettings(!showGoalSettings)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Goal Settings */}
        {showGoalSettings && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Set Daily Targets</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="calories" className="text-xs">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  value={tempGoal.dailyCalories}
                  onChange={(e) =>
                    setTempGoal({ ...tempGoal, dailyCalories: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="protein" className="text-xs">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={tempGoal.protein}
                  onChange={(e) =>
                    setTempGoal({ ...tempGoal, protein: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="carbs" className="text-xs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={tempGoal.carbs}
                  onChange={(e) =>
                    setTempGoal({ ...tempGoal, carbs: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fats" className="text-xs">Fats (g)</Label>
                <Input
                  id="fats"
                  type="number"
                  value={tempGoal.fats}
                  onChange={(e) =>
                    setTempGoal({ ...tempGoal, fats: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveGoal} size="sm" className="flex-1">
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGoalSettings(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Main Calorie Display */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl font-bold">{consumedCalories}</span>
            <span className="text-muted-foreground text-lg">/ {calorieGoal.dailyCalories}</span>
          </div>
          <p className="text-sm text-muted-foreground">calories consumed today</p>
          <Progress value={calorieProgress} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {remainingCalories > 0
              ? `${remainingCalories} calories remaining`
              : "Daily goal reached!"}
          </p>
        </div>

        {/* Macronutrient Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted rounded-lg p-3 text-center border border-border">
            <Beef className="h-5 w-5 mx-auto mb-1 text-secondary" />
            <p className="text-lg font-bold text-foreground">{consumedMacros.protein}g</p>
            <p className="text-xs font-medium text-muted-foreground">Protein</p>
            <p className="text-xs text-muted-foreground">/ {calorieGoal.protein}g</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center border border-border">
            <Wheat className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-foreground">{consumedMacros.carbs}g</p>
            <p className="text-xs font-medium text-muted-foreground">Carbs</p>
            <p className="text-xs text-muted-foreground">/ {calorieGoal.carbs}g</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center border border-border">
            <Droplets className="h-5 w-5 mx-auto mb-1 text-success" />
            <p className="text-lg font-bold text-foreground">{consumedMacros.fats}g</p>
            <p className="text-xs font-medium text-muted-foreground">Fats</p>
            <p className="text-xs text-muted-foreground">/ {calorieGoal.fats}g</p>
          </div>
        </div>

        {/* Macro Pie Chart */}
        {totalMacroGrams > 0 && (
          <div className="h-56 bg-muted/30 rounded-xl p-2 border border-border overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                  fontSize={11}
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}g`, ""]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                    fontWeight: 600,
                  }}
                  labelStyle={{
                    color: "hsl(var(--foreground))",
                    fontWeight: 600,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick Tips */}
        {consumedCalories === 0 && (
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">
              Complete your meals to see your calorie intake!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
