import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Repeat } from "lucide-react";
import { Exercise } from "@/lib/exercises";
import { ExerciseTimer } from "./ExerciseTimer";

interface ExerciseCardProps {
  exercise: Exercise;
}

export const ExerciseCard = ({ exercise }: ExerciseCardProps) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cardio':
        return 'bg-secondary/20 text-secondary-foreground';
      case 'strength':
        return 'bg-primary/20 text-primary-foreground';
      case 'office':
        return 'bg-accent/20 text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-video bg-muted relative">
        <img
          src={exercise.imageUrl}
          alt={exercise.name}
          className="w-full h-full object-cover"
        />
        <Badge className={`absolute top-2 right-2 ${getCategoryColor(exercise.category)}`}>
          {exercise.category}
        </Badge>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">{exercise.name}</h3>
        <p className="text-sm text-muted-foreground mb-3">{exercise.description}</p>

        <div className="flex items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1 text-primary">
            <Clock className="h-4 w-4" />
            <span>{exercise.duration}</span>
          </div>
          {exercise.reps && (
            <div className="flex items-center gap-1 text-secondary">
              <Repeat className="h-4 w-4" />
              <span>{exercise.reps}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Benefits:</p>
            <div className="flex flex-wrap gap-1">
              {exercise.benefits.map((benefit, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {benefit}
                </Badge>
              ))}
            </div>
          </div>

          <div className="bg-muted/50 p-2 rounded-md">
            <p className="text-xs font-medium text-foreground mb-0.5">Safety Note:</p>
            <p className="text-xs text-muted-foreground">{exercise.safetyNotes}</p>
          </div>
        </div>

        <div className="mt-4">
          <ExerciseTimer 
            exerciseId={exercise.id}
            exerciseName={exercise.name} 
            defaultDuration={exercise.durationMinutes} 
          />
        </div>
      </CardContent>
    </Card>
  );
};
