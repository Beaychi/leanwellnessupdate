import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock, ChefHat, Utensils, Sun, Moon, UtensilsCrossed } from "lucide-react";
import { Meal } from "@/lib/dietPlan";
import { markMealComplete, isMealComplete, getAlternativeMealForToday } from "@/lib/storage";
import { MealLogDialog } from "./MealLogDialog";
import { toast } from "sonner";
import { useStorageSync } from "@/hooks/use-storage-sync";

interface MealCardProps {
  meal: Meal;
}

export const MealCard = ({ meal }: MealCardProps) => {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(isMealComplete(meal.id));
  const [alternativeMeal, setAlternativeMeal] = useState(getAlternativeMealForToday(meal.id));

  const refreshState = useCallback(() => {
    setCompleted(isMealComplete(meal.id));
    setAlternativeMeal(getAlternativeMealForToday(meal.id));
  }, [meal.id]);

  // Listen for real-time updates
  useStorageSync(['mealCompleted', 'dataUpdated'], refreshState);

  const handleComplete = () => {
    if (!completed) {
      markMealComplete(meal.id);
      setCompleted(true);
      toast.success(`${meal.name} marked complete!`);
    }
  };

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'meal1':
        return <Sun className="h-4 w-4" />;
      case 'meal2':
        return <Moon className="h-4 w-4" />;
      default:
        return <UtensilsCrossed className="h-4 w-4" />;
    }
  };

  const getFoodTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fruit: 'Fruit',
      vegetable: 'Vegetable',
      protein: 'Protein',
      grain: 'Grain/Carbs',
      beverage: 'Beverage',
      snack: 'Snack',
      other: 'Other'
    };
    return labels[type] || type;
  };

  // If there's an alternative meal logged, show that instead
  if (alternativeMeal) {
    return (
      <Card className="transition-all duration-300 hover:shadow-md opacity-60 border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getMealIcon(meal.type)}</span>
              <div>
                <h3 className="font-semibold text-foreground">{alternativeMeal.foodName}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Utensils className="h-3 w-3" />
                  <span>{getFoodTypeLabel(alternativeMeal.foodType)}</span>
                  {alternativeMeal.portion && <span>• {alternativeMeal.portion}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-primary text-sm font-medium">
              <Check className="h-4 w-4" />
              Alternative
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-3 space-y-1">
            {alternativeMeal.calories && (
              <p>Calories: ~{alternativeMeal.calories} kcal</p>
            )}
            {alternativeMeal.notes && (
              <p className="italic">{alternativeMeal.notes}</p>
            )}
            <p className="text-xs opacity-70">Originally: {meal.name}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`transition-all duration-300 hover:shadow-md ${completed ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getMealIcon(meal.type)}</span>
            <div>
              <h3 className="font-semibold text-foreground">{meal.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                <span>{meal.time}</span>
              </div>
            </div>
          </div>
          {completed && (
            <div className="flex items-center gap-1 text-success text-sm font-medium">
              <Check className="h-4 w-4" />
              Done
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-3">{meal.description}</p>

        <div className="space-y-2">
          <Button
            onClick={() => navigate(`/recipe/${meal.id}`)}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <ChefHat className="h-4 w-4 mr-2" />
            View Recipe
          </Button>

          {!completed && (
            <>
              <Button
                onClick={handleComplete}
                size="sm"
                className="w-full"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
              <MealLogDialog mealId={meal.id} onAlternativeLogged={refreshState} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
