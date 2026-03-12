import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, ChefHat, DollarSign, Clock, ShoppingBag, Apple, ArrowRight, ArrowLeft } from "lucide-react";

export interface MealPreferences {
  dietPreference: string;
  budgetLevel: string;
  cookingSkill: string;
  foodSource: string;
  prepTime: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (prefs: MealPreferences) => void;
  isGenerating: boolean;
}

const STEPS = [
  {
    key: "dietPreference",
    title: "Diet Preference",
    description: "What type of diet do you follow?",
    icon: Apple,
    options: [
      { value: "balanced", label: "Balanced", desc: "Mix of everything" },
      { value: "vegetarian", label: "Vegetarian", desc: "No meat" },
      { value: "vegan", label: "Vegan", desc: "No animal products" },
      { value: "keto", label: "Keto / Low-Carb", desc: "High fat, low carbs" },
      { value: "high-protein", label: "High Protein", desc: "Focus on protein" },
    ],
  },
  {
    key: "foodSource",
    title: "How do you get your food?",
    description: "This helps us tailor meal complexity",
    icon: ShoppingBag,
    options: [
      { value: "cook", label: "I cook my meals", desc: "Full kitchen access" },
      { value: "buy-some", label: "Mix of cooking & buying", desc: "Cook sometimes, buy sometimes" },
      { value: "buy-mostly", label: "I mostly buy food", desc: "Limited cooking (e.g. student)" },
    ],
  },
  {
    key: "cookingSkill",
    title: "Cooking Skill Level",
    description: "How comfortable are you in the kitchen?",
    icon: ChefHat,
    options: [
      { value: "beginner", label: "Beginner", desc: "Simple recipes only" },
      { value: "intermediate", label: "Intermediate", desc: "Can follow most recipes" },
      { value: "advanced", label: "Advanced", desc: "Comfortable with complex dishes" },
    ],
  },
  {
    key: "budgetLevel",
    title: "Budget Level",
    description: "What's your food budget like?",
    icon: DollarSign,
    options: [
      { value: "budget", label: "Budget-Friendly", desc: "Affordable, everyday ingredients" },
      { value: "moderate", label: "Moderate", desc: "Balance of cost and variety" },
      { value: "premium", label: "Premium", desc: "No budget constraints" },
    ],
  },
  {
    key: "prepTime",
    title: "Prep Time Preference",
    description: "How much time can you spend per meal?",
    icon: Clock,
    options: [
      { value: "quick", label: "Quick (<15 min)", desc: "Fast and simple meals" },
      { value: "moderate", label: "Moderate (15-30 min)", desc: "Reasonable prep time" },
      { value: "elaborate", label: "Elaborate (30+ min)", desc: "Full cooking sessions" },
    ],
  },
];

export function MealPlanQuestionnaire({ open, onOpenChange, onSubmit, isGenerating }: Props) {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<MealPreferences>({
    dietPreference: "balanced",
    budgetLevel: "moderate",
    cookingSkill: "intermediate",
    foodSource: "cook",
    prepTime: "moderate",
  });

  const current = STEPS[step];
  const StepIcon = current.icon;
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onSubmit(preferences);
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleChange = (value: string) => {
    setPreferences(prev => ({ ...prev, [current.key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isGenerating) { onOpenChange(v); setStep(0); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <StepIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{current.title}</DialogTitle>
              <DialogDescription className="text-xs">{current.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <RadioGroup
          value={preferences[current.key as keyof MealPreferences]}
          onValueChange={handleChange}
          className="space-y-2"
        >
          {current.options.map(opt => (
            <Label
              key={opt.value}
              htmlFor={opt.value}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                preferences[current.key as keyof MealPreferences] === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/30"
              }`}
            >
              <RadioGroupItem value={opt.value} id={opt.value} />
              <div>
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </Label>
          ))}
        </RadioGroup>

        <div className="flex gap-2 pt-2">
          {step > 0 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1" disabled={isGenerating}>
            {isLast ? (
              <>
                <Sparkles className="h-4 w-4 mr-1" /> Generate Plan
              </>
            ) : (
              <>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
