import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Flame, Lightbulb } from "lucide-react";
import { getMealPlan } from "@/lib/meal-plan";

export default function RecipeDetails() {
  const { mealId } = useParams();
  const navigate = useNavigate();

  const mealPlan = getMealPlan();
  const meal = mealPlan?.plan
    .flatMap(day => day.meals)
    .find(m => m.id === mealId);

  if (!meal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Meal not found</p>
          <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="bg-gradient-to-br from-secondary via-secondary to-primary text-white p-6 rounded-b-3xl mb-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold mb-2">{meal.name}</h1>
          <p className="text-white/90">{meal.description}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Flame className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{meal.nutritionalInfo.calories}</p>
              <p className="text-xs text-muted-foreground">Calories</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{meal.nutritionalInfo.protein}</p>
              <p className="text-xs text-muted-foreground">Protein</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">{meal.nutritionalInfo.carbs}</p>
              <p className="text-xs text-muted-foreground">Carbs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-secondary">{meal.nutritionalInfo.fats}</p>
              <p className="text-xs text-muted-foreground">Fats</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold">Recommended Time:</span>
            <Badge variant="secondary">{meal.time}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ingredients</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {meal.ingredients.map((ingredient, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cooking Instructions</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {meal.instructions.map((instruction, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Badge variant="outline" className="flex-shrink-0">{idx + 1}</Badge>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="bg-accent/10 border-accent/30">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-accent" /> Important Notes</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Keep oil usage minimal</li>
              <li>• Eat slowly to aid digestion</li>
              <li>• Add extra vegetables when possible</li>
              <li>• Drink water 30 minutes before eating</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
