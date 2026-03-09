import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Sparkles, Utensils, Dumbbell, Bell, TrendingUp } from "lucide-react";
import { saveStoredData } from "@/lib/storage";

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to LeanTrack",
    description: "Your personalized journey to sustainable weight loss and healthier living starts here.",
    gradient: "from-primary to-accent",
  },
  {
    icon: Utensils,
    title: "7-Day Nigerian Diet Plan",
    description: "Follow our carefully crafted rotating meal plan designed specifically for effective weight loss while enjoying delicious Nigerian meals.",
    gradient: "from-secondary to-primary",
  },
  {
    icon: Dumbbell,
    title: "Targeted Exercises",
    description: "Access proven exercises for thigh & butt fat reduction, plus office-friendly movements to stay active throughout your day.",
    gradient: "from-accent to-secondary",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "We'll send you timely notifications for meals, movement breaks, and bedtime to keep you on track.",
    gradient: "from-primary to-secondary",
  },
  {
    icon: TrendingUp,
    title: "Track Your Progress",
    description: "Monitor your journey with daily check-ins, meal tracking, and streak counters. Small steps lead to big results!",
    gradient: "from-secondary to-accent",
  },
];

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      saveStoredData({ onboardingCompleted: true });
      onComplete();
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className={`inline-flex p-4 rounded-full bg-gradient-to-br ${step.gradient} mb-4`}>
              <Icon className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
            <p className="text-muted-foreground">{step.description}</p>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? "w-8 bg-primary"
                    : idx < currentStep
                    ? "w-2 bg-success"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          <Button onClick={handleNext} className="w-full" size="lg">
            {isLastStep ? "Let's Start!" : "Next"}
            {!isLastStep && <ChevronRight className="ml-2 h-5 w-5" />}
          </Button>

          {!isLastStep && (
            <Button
              onClick={onComplete}
              variant="ghost"
              className="w-full mt-2"
              size="sm"
            >
              Skip
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
