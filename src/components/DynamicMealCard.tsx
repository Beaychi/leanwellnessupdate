import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock, ChefHat, ChevronDown, ChevronUp, Utensils, Sunrise, Sun, Moon, UtensilsCrossed, Lock } from "lucide-react";
import { DynamicMeal } from "@/lib/meal-plan";
import { markMealComplete, isMealComplete, getAlternativeMealForToday } from "@/lib/storage";
import { MealLogDialog } from "./MealLogDialog";
import { toast } from "sonner";
import { useStorageSync } from "@/hooks/use-storage-sync";

interface DynamicMealCardProps {
  meal: DynamicMeal;
  isLocked?: boolean;
  dayNumber?: number;
}

export const DynamicMealCard = ({ meal, isLocked = false, dayNumber }: DynamicMealCardProps) => {
  const [completed, setCompleted] = useState(isMealComplete(meal.id));
  const [alternativeMeal, setAlternativeMeal] = useState(getAlternativeMealForToday(meal.id));
  const [showRecipe, setShowRecipe] = useState(false);

  const refreshState = useCallback(() => {
    setCompleted(isMealComplete(meal.id));
    setAlternativeMeal(getAlternativeMealForToday(meal.id));
  }, [meal.id]);

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
      case 'breakfast': return <Sunrise className="h-4 w-4" />;
      case 'lunch': return <Sun className="h-4 w-4" />;
      case 'dinner': return <Moon className="h-4 w-4" />;
      default: return <UtensilsCrossed className="h-4 w-4" />;
    }
  };

  const getFoodTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fruit: 'Fruit', vegetable: 'Vegetable', protein: 'Protein',
      grain: 'Grain/Carbs', beverage: 'Beverage', snack: 'Snack', other: 'Other'
    };
    return labels[type] || type;
  };

  // Show alternative meal if one was logged
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
            {alternativeMeal.calories && <p>Calories: ~{alternativeMeal.calories} kcal</p>}
            {alternativeMeal.notes && <p className="italic">{alternativeMeal.notes}</p>}
            <p className="text-xs opacity-70">Originally: {meal.name}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`transition-all duration-300 ${isLocked ? 'opacity-50' : 'hover:shadow-md'} ${completed && !isLocked ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getMealIcon(meal.type)}</span>
            <div>
              <h3 className="font-semibold text-foreground">{meal.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                <span>{meal.time}</span>
                <span className="ml-1 capitalize">• {meal.type}</span>
              </div>
            </div>
          </div>
          {isLocked ? (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-muted-foreground text-sm font-medium">
                <Lock className="h-4 w-4" />
              </div>
              {dayNumber && (
                <span className="text-xs text-muted-foreground">Available Day {dayNumber}</span>
              )}
            </div>
          ) : completed ? (
            <div className="flex items-center gap-1 text-success text-sm font-medium">
              <Check className="h-4 w-4" />
              Done
            </div>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground mb-2">{meal.description}</p>

        {/* Nutritional info */}
        <div className="flex gap-3 text-xs text-muted-foreground mb-3">
          <span className="bg-muted px-2 py-0.5 rounded">{meal.nutritionalInfo.calories} cal</span>
          <span className="bg-muted px-2 py-0.5 rounded">P: {meal.nutritionalInfo.protein}</span>
          <span className="bg-muted px-2 py-0.5 rounded">C: {meal.nutritionalInfo.carbs}</span>
          <span className="bg-muted px-2 py-0.5 rounded">F: {meal.nutritionalInfo.fats}</span>
        </div>

        <div className="space-y-2">
          {/* View Recipe — always available, even on locked days */}
          <Button
            onClick={() => setShowRecipe(!showRecipe)}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <ChefHat className="h-4 w-4 mr-2" />
            {showRecipe ? 'Hide Recipe' : 'View Recipe'}
            {showRecipe ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>

          {showRecipe && (
            <div className="mt-3 space-y-3 p-3 bg-muted/50 rounded-lg">
              <div>
                <h4 className="font-semibold text-sm mb-1">Ingredients</h4>
                <ul className="text-sm space-y-1">
                  {meal.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{ing}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Instructions</h4>
                <ol className="text-sm space-y-1">
                  {meal.instructions.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary font-medium text-xs mt-0.5">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Mark Complete & Log Alternative — disabled on locked days */}
          {!isLocked && !completed && (
            <>
              <Button onClick={handleComplete} size="sm" className="w-full">
                <Check className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
              <MealLogDialog mealId={meal.id} onAlternativeLogged={refreshState} />
            </>
          )}

          {isLocked && (
            <p className="text-xs text-center text-muted-foreground pt-1 flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" />
              Unlocks when Day {dayNumber} begins
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
