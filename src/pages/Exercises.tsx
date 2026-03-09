import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseStatsDialog } from "@/components/ExerciseStatsDialog";
import { exercises, officeMovementTips, exercisesToAvoid } from "@/lib/exercises";
import { AlertTriangle, Dumbbell } from "lucide-react";
import * as LucideIcons from "lucide-react";

export default function Exercises() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "cardio" | "strength" | "office">("all");

  const filteredExercises = selectedCategory === "all" 
    ? exercises 
    : exercises.filter(ex => ex.category === selectedCategory);

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="bg-accent text-accent-foreground p-6 rounded-b-3xl mb-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Exercises</h1>
          <p className="text-accent-foreground/90">Targeted workouts for thigh & butt fat reduction</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Exercise Stats Dashboard */}
        <ExerciseStatsDialog />

        {/* Category Filter */}
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="cardio">Cardio</TabsTrigger>
            <TabsTrigger value="strength">Strength</TabsTrigger>
            <TabsTrigger value="office">Office</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="space-y-6 mt-6">
            {/* Exercise Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {filteredExercises.map((exercise) => (
                <ExerciseCard key={exercise.id} exercise={exercise} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Office Movement Tips */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Office Movement Strategies</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {officeMovementTips.map((tip) => {
              const IconComponent = (LucideIcons as any)[tip.icon];
              return (
                <Card key={tip.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {IconComponent && <IconComponent className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />}
                      <div>
                        <h3 className="font-semibold mb-1">{tip.title}</h3>
                        <p className="text-sm text-muted-foreground">{tip.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Exercises to Avoid */}
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Exercises to Avoid (for targeted fat loss)
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              These exercises can build muscle mass. Focus on light, high-rep movements instead.
            </p>
            <div className="flex flex-wrap gap-2">
              {exercisesToAvoid.map((exercise, idx) => (
                <Badge key={idx} variant="outline" className="border-destructive/50 text-destructive">
                  {exercise}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Motivation Card */}
        <Card className="bg-success/10 border-success/30">
          <CardContent className="p-6 text-center">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 text-success" />
            <h3 className="font-bold text-lg mb-2">Consistency is Key!</h3>
            <p className="text-sm text-muted-foreground">
              Combine these exercises with your meal plan for best results. Aim for 30 minutes of activity daily.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
