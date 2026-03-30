import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Loader2, Sparkles, Sunrise, Sun, Moon, Droplets } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getStoredData, getCurrentDayNumber, getDefaultData } from "@/lib/storage";
import { getRegistration, COMMON_ALLERGIES } from "@/lib/registration";
import { getMealPlan, saveMealPlan, MealPlanData } from "@/lib/meal-plan";
import { FoodPhotoCapture } from "@/components/FoodPhotoCapture";
import { FoodJournal } from "@/components/FoodJournal";
import { DynamicMealCard } from "@/components/DynamicMealCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sendEventPush } from "@/lib/push-events";
import { MealPlanQuestionnaire, MealPreferences } from "@/components/MealPlanQuestionnaire";

export default function Meals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDay, setSelectedDay] = useState("1");
  const [currentDay, setCurrentDay] = useState(1);
  const [journalRefresh, setJournalRefresh] = useState(0);
  const [mealPlan, setMealPlan] = useState<MealPlanData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>(['breakfast', 'lunch', 'dinner']);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateMealTypes, setRegenerateMealTypes] = useState<string[]>([]);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [mealPreferences, setMealPreferences] = useState<MealPreferences | null>(null);

  useEffect(() => {
    const data = getStoredData() || getDefaultData();
    const dayNum = getCurrentDayNumber(data.startDate);
    setCurrentDay(dayNum);
    setSelectedDay(dayNum.toString());
    
    const existingPlan = getMealPlan();
    setMealPlan(existingPlan);
  }, []);

  const handleFoodLogged = useCallback(() => {
    setJournalRefresh(prev => prev + 1);
  }, []);

  const sendMealPlanEmail = useCallback(async (planData: MealPlanData) => {
    const registration = getRegistration();
    if (!registration?.email) return;
    
    try {
      const { error } = await supabase.functions.invoke('send-meal-plan-email', {
        body: {
          email: registration.email,
          firstName: registration.firstName || 'there',
          country: planData.country,
          plan: planData.plan,
        },
      });
      
      if (error) {
        console.error('Failed to send meal plan email:', error);
        return;
      }
      
      toast.success("Meal plan timetable sent to your email! 📧");
      
      await sendEventPush(
        "Meal Plan Emailed! 📧",
        `Your detailed 7-day ${planData.country} meal timetable has been sent to ${registration.email}`,
        "leantrack-meal-plan-email"
      );
    } catch (err) {
      console.error('Error sending meal plan email:', err);
    }
  }, []);

  const generateMealPlan = async (prefs?: MealPreferences, overrideMealTypes?: string[]) => {
    const registration = getRegistration();
    if (!registration || !registration.country) {
      toast.error("Please complete your profile setup first");
      return;
    }
    const mealsToUse = overrideMealTypes || selectedMealTypes;
    if (mealsToUse.length === 0) {
      toast.error("Please select at least one meal type");
      return;
    }

    setIsGenerating(true);
    try {
      const allergyKeywords: string[] = [];
      registration.allergies.forEach(allergyId => {
        const allergy = COMMON_ALLERGIES.find(a => a.id === allergyId);
        if (allergy) allergyKeywords.push(...allergy.keywords);
      });
      allergyKeywords.push(...registration.customAllergies.map(a => a.toLowerCase()));
      
      const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: {
          country: registration.country,
          allergies: [...new Set(allergyKeywords)],
          schedule: registration.schedule,
          mealTypes: mealsToUse,
          preferences: prefs || mealPreferences || undefined,
        },
      });

      if (error) throw error;

      const planData: MealPlanData = {
        country: registration.country,
        allergies: allergyKeywords,
        plan: data.plan,
        generatedAt: new Date().toISOString(),
      };

      saveMealPlan(planData);
      setMealPlan(planData);
      toast.success("Your personalized meal plan is ready!");
      sendMealPlanEmail(planData);
    } catch (error: any) {
      console.error('Error generating meal plan:', error);
      toast.error("Failed to generate meal plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuestionnaireSubmit = (prefs: MealPreferences) => {
    setMealPreferences(prefs);
    setShowQuestionnaire(false);
    generateMealPlan(prefs);
  };

  const isDayLocked = (day: number) => day > currentDay;

  const handleDaySelect = (day: string) => {
    const dayNum = parseInt(day);
    if (!isDayLocked(dayNum)) {
      setSelectedDay(day);
    }
  };

  const currentDayPlan = mealPlan?.plan.find(d => d.day === parseInt(selectedDay));

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="bg-secondary text-secondary-foreground p-6 rounded-b-3xl mb-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Meal Plans</h1>
          <p className="text-secondary-foreground/90">
            {mealPlan ? `Personalized ${mealPlan.country} cuisine` : 'Generate your personalized meal plan'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {isGenerating ? (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-3 py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Crafting your meal plan...</h3>
              <p className="text-sm text-muted-foreground">This may take up to 30 seconds</p>
            </div>
            {[1, 2, 3].map(i => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !mealPlan ? (
          <Card className="border-2 border-dashed border-primary/30">
            <CardContent className="p-8 text-center space-y-4">
              <div className="inline-flex p-4 rounded-full bg-primary/10 mb-2">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Generate Your Meal Plan</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We'll create a personalized 7-day meal plan based on your country's cuisine and dietary needs.
              </p>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Which meals do you want?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { id: 'breakfast', label: 'Morning', desc: 'Breakfast', Icon: Sunrise },
                    { id: 'lunch', label: 'Afternoon', desc: 'Lunch', Icon: Sun },
                    { id: 'dinner', label: 'Night', desc: 'Dinner', Icon: Moon },
                  ].map(type => {
                    const isSelected = selectedMealTypes.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          setSelectedMealTypes(prev =>
                            isSelected
                              ? prev.filter(t => t !== type.id)
                              : [...prev, type.id]
                          );
                        }}
                        className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-muted bg-muted/30 text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        <span className="text-lg flex items-center gap-1"><type.Icon className="h-4 w-4" /> {type.label}</span>
                        <span className="text-xs">{type.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={() => setShowQuestionnaire(true)} size="lg" className="min-w-48" disabled={selectedMealTypes.length === 0}>
                <Sparkles className="h-5 w-5 mr-2" />
                Generate Meal Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Regenerate button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRegenerateMealTypes([...selectedMealTypes]);
                  setShowRegenerateDialog(true);
                }}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Plan
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search meals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Day Tabs */}
            <Tabs value={selectedDay} onValueChange={handleDaySelect}>
              <TabsList className="w-full grid grid-cols-7 mb-6">
                {Array.from({ length: 7 }, (_, i) => i + 1).map(day => {
                  const locked = isDayLocked(day);
                  return (
                    <TabsTrigger
                      key={day}
                      value={day.toString()}
                      disabled={locked}
                      className={locked ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      {locked ? <Lock className="h-3 w-3" /> : `D${day}`}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {mealPlan.plan.map(day => {
                const dayMeals = day.meals.filter(meal =>
                  meal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  meal.description.toLowerCase().includes(searchTerm.toLowerCase())
                );
                return (
                  <TabsContent key={day.day} value={day.day.toString()}>
                    <div className="space-y-6">
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">
                              Day {day.day}
                              {day.day === currentDay && (
                                <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                                  Today
                                </span>
                              )}
                            </h3>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Droplets className="h-4 w-4 text-primary" /> {day.waterIntake}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{day.notes}</p>
                        </CardContent>
                      </Card>

                      <div className="space-y-3">
                        {dayMeals.length > 0 ? (
                          dayMeals.map(meal => (
                            <DynamicMealCard key={meal.id} meal={meal} />
                          ))
                        ) : (
                          <Card>
                            <CardContent className="p-8 text-center">
                              <p className="text-muted-foreground">
                                {searchTerm ? `No meals found matching "${searchTerm}"` : 'No meals for this day'}
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>

            {/* Water Reminder */}
            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="p-4 text-center">
                <Droplets className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Don't Forget Water!</h3>
                <p className="text-sm text-muted-foreground">
                  Aim for {currentDayPlan?.waterIntake || '2-3 liters'} throughout the day
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* AI Food Scanner */}
        <FoodPhotoCapture onFoodLogged={handleFoodLogged} />

        {/* Food Journal */}
        <FoodJournal refreshTrigger={journalRefresh} />
      </div>

      {/* Regenerate Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Regenerate Meal Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Want to change which meals are included, or keep the same selection?
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Meal types</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'breakfast', label: 'Morning', icon: <Sunrise className="h-4 w-4" /> },
                  { id: 'lunch', label: 'Afternoon', icon: <Sun className="h-4 w-4" /> },
                  { id: 'dinner', label: 'Night', icon: <Moon className="h-4 w-4" /> },
                ].map(type => {
                  const isSelected = regenerateMealTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setRegenerateMealTypes(prev =>
                          isSelected
                            ? prev.filter(t => t !== type.id)
                            : [...prev, type.id]
                        );
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted bg-muted/30 text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {type.icon}
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowRegenerateDialog(false);
                  generateMealPlan(mealPreferences || undefined);
                }}
              >
                Keep Same
              </Button>
              <Button
                className="flex-1"
                disabled={regenerateMealTypes.length === 0}
                onClick={() => {
                  setSelectedMealTypes(regenerateMealTypes);
                  setShowRegenerateDialog(false);
                  generateMealPlan(mealPreferences || undefined, regenerateMealTypes);
                }}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pre-generation questionnaire */}
      <MealPlanQuestionnaire
        open={showQuestionnaire}
        onOpenChange={setShowQuestionnaire}
        onSubmit={handleQuestionnaireSubmit}
        isGenerating={isGenerating}
      />
    </div>
  );
}
