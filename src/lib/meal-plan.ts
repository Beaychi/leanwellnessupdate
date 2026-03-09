// Dynamic meal plan types and storage
import { getRegistration, COMMON_ALLERGIES } from './registration';

export interface DynamicMeal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner';
  name: string;
  description: string;
  time: string;
  ingredients: string[];
  instructions: string[];
  nutritionalInfo: {
    calories: number;
    protein: string;
    carbs: string;
    fats: string;
  };
}

export interface DynamicDayPlan {
  day: number;
  meals: DynamicMeal[];
  waterIntake: string;
  notes: string;
}

export interface MealPlanData {
  country: string;
  allergies: string[];
  plan: DynamicDayPlan[];
  generatedAt: string;
}

const MEAL_PLAN_KEY = 'leantrack_meal_plan';

export const getMealPlan = (): MealPlanData | null => {
  try {
    const data = localStorage.getItem(MEAL_PLAN_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const saveMealPlan = (plan: MealPlanData) => {
  localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(plan));
  window.dispatchEvent(new CustomEvent('mealPlanUpdated'));
};

export const clearMealPlan = () => {
  localStorage.removeItem(MEAL_PLAN_KEY);
};

export const getAllergyKeywords = (): string[] => {
  const registration = getRegistration();
  if (!registration) return [];
  
  const keywords: string[] = [];
  
  registration.allergies.forEach(allergyId => {
    const allergy = COMMON_ALLERGIES.find(a => a.id === allergyId);
    if (allergy) {
      keywords.push(...allergy.keywords);
    }
  });
  
  keywords.push(...registration.customAllergies.map(a => a.toLowerCase()));
  
  return [...new Set(keywords)];
};

export const getDynamicDayPlan = (dayNumber: number): DynamicDayPlan | null => {
  const mealPlan = getMealPlan();
  if (!mealPlan) return null;
  return mealPlan.plan.find(d => d.day === dayNumber) || null;
};

export const getDynamicTodaysMeals = (dayNumber: number): DynamicMeal[] => {
  const dayPlan = getDynamicDayPlan(dayNumber);
  return dayPlan?.meals || [];
};
