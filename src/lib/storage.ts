// Local storage utilities for LeanTrack app

export interface AlternativeMeal {
  mealId: string;
  foodName: string;
  foodType: string;
  portion?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  notes?: string;
  timestamp: string;
  photoUrl?: string;
}

export interface CheatLog {
  cheatType: string;
  description: string;
  notes?: string;
  timestamp: string;
  resetStreak: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  durationMinutes: number;
  completedAt: string;
}

export interface WaterLog {
  glasses: number;
  date: string;
}

export interface WeightLog {
  weight: number;
  date: string;
  unit: 'kg' | 'lbs';
}

export interface SoundSettings {
  breakfast: string;
  lunch: string;
  dinner: string;
  bedtime: string;
  wakeup: string;
  movement: string;
  exercise: string;
}

export interface CalorieGoal {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface MeasurementLog {
  value: number;
  date: string;
  unit: 'cm' | 'in';
}

export interface BodyMeasurements {
  waist: MeasurementLog[];
  hips: MeasurementLog[];
  thighs: MeasurementLog[];
  arms: MeasurementLog[];
  chest: MeasurementLog[];
}

export interface UserProgress {
  startDate: string;
  completedMeals: Record<string, string[]>; // date -> meal ids
  alternativeMeals: Record<string, AlternativeMeal[]>; // date -> alternative meals
  cheatLogs: CheatLog[];
  exerciseLogs: ExerciseLog[];
  waterLogs: Record<string, number>; // date -> glasses count
  weightLogs: WeightLog[];
  goalWeight: number | null;
  goalWeightUnit: 'kg' | 'lbs';
  bedtime: string;
  wakeupTime: string;
  notificationsEnabled: boolean;
  mealReminders: { breakfast: string; lunch: string; dinner: string };
  movementReminders: boolean;
  movementInterval: number; // minutes between reminders
  onboardingCompleted: boolean;
  streakDays: number;
  lastActiveDate: string;
  soundSettings: SoundSettings;
  calorieGoal?: CalorieGoal;
  bodyMeasurements?: BodyMeasurements;
}

const STORAGE_KEY = 'leantrack_data';

export const getStoredData = (): UserProgress | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};

export const saveStoredData = (data: Partial<UserProgress>) => {
  try {
    const existing = getStoredData() || getDefaultData();
    const updated = { ...existing, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const getDefaultData = (): UserProgress => ({
  startDate: new Date().toISOString().split('T')[0],
  completedMeals: {},
  alternativeMeals: {},
  cheatLogs: [],
  exerciseLogs: [],
  waterLogs: {},
  weightLogs: [],
  goalWeight: null,
  goalWeightUnit: 'kg',
  bedtime: '22:00',
  wakeupTime: '06:00',
  notificationsEnabled: false,
  mealReminders: {
    breakfast: '08:00',
    lunch: '13:00',
    dinner: '19:00',
  },
  movementReminders: true,
  movementInterval: 45,
  onboardingCompleted: false,
  streakDays: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  soundSettings: {
    breakfast: 'chime',
    lunch: 'chime',
    dinner: 'chime',
    bedtime: 'gentle',
    wakeup: 'alarm',
    movement: 'bell',
    exercise: 'energetic',
  },
});

// Goal weight functions
export const setGoalWeight = (weight: number, unit: 'kg' | 'lbs') => {
  const data = getStoredData() || getDefaultData();
  data.goalWeight = weight;
  data.goalWeightUnit = unit;
  saveStoredData(data);
  window.dispatchEvent(new CustomEvent('goalWeightUpdated'));
};

export const getGoalWeight = (): { weight: number | null; unit: 'kg' | 'lbs' } => {
  const data = getStoredData();
  return {
    weight: data?.goalWeight ?? null,
    unit: data?.goalWeightUnit ?? 'kg',
  };
};

// Weight tracking functions
export const logWeight = (weight: number, unit: 'kg' | 'lbs' = 'kg') => {
  const data = getStoredData() || getDefaultData();
  const today = new Date().toISOString().split('T')[0];
  
  if (!data.weightLogs) {
    data.weightLogs = [];
  }
  
  // Remove existing entry for today if exists
  data.weightLogs = data.weightLogs.filter(log => log.date !== today);
  
  data.weightLogs.push({ weight, date: today, unit });
  data.weightLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  saveStoredData(data);
  window.dispatchEvent(new CustomEvent('weightUpdated'));
};

export const getWeightLogs = (): WeightLog[] => {
  const data = getStoredData();
  return data?.weightLogs || [];
};

// Water tracking functions
export const getWaterIntakeToday = (): number => {
  const data = getStoredData();
  if (!data || !data.waterLogs) return 0;
  const today = new Date().toISOString().split('T')[0];
  return data.waterLogs[today] || 0;
};

export const logWaterIntake = (glasses: number) => {
  const data = getStoredData() || getDefaultData();
  const today = new Date().toISOString().split('T')[0];
  
  if (!data.waterLogs) {
    data.waterLogs = {};
  }
  
  data.waterLogs[today] = glasses;
  saveStoredData(data);
  
  // Dispatch custom event for real-time updates
  window.dispatchEvent(new CustomEvent('waterUpdated'));
};

export const logExerciseCompletion = (exerciseId: string, exerciseName: string, durationMinutes: number) => {
  const data = getStoredData() || getDefaultData();
  
  // Ensure exerciseLogs array exists
  if (!data.exerciseLogs) {
    data.exerciseLogs = [];
  }
  
  const exerciseLog: ExerciseLog = {
    exerciseId,
    exerciseName,
    durationMinutes,
    completedAt: new Date().toISOString(),
  };
  
  data.exerciseLogs.push(exerciseLog);
  saveStoredData(data);
  console.log('Exercise logged:', exerciseLog);
  
  // Dispatch custom event for real-time updates
  window.dispatchEvent(new CustomEvent('exerciseCompleted'));
};

export const getExerciseStats = () => {
  const data = getStoredData();
  if (!data || !data.exerciseLogs) return { totalExercises: 0, totalMinutes: 0, exerciseBreakdown: [] };
  
  const exerciseBreakdown = data.exerciseLogs.reduce((acc, log) => {
    const existing = acc.find(e => e.exerciseId === log.exerciseId);
    if (existing) {
      existing.count += 1;
      existing.totalMinutes += log.durationMinutes;
    } else {
      acc.push({
        exerciseId: log.exerciseId,
        exerciseName: log.exerciseName,
        count: 1,
        totalMinutes: log.durationMinutes,
      });
    }
    return acc;
  }, [] as { exerciseId: string; exerciseName: string; count: number; totalMinutes: number }[]);
  
  return {
    totalExercises: data.exerciseLogs.length,
    totalMinutes: data.exerciseLogs.reduce((sum, log) => sum + log.durationMinutes, 0),
    exerciseBreakdown,
  };
};

export const getCurrentDayNumber = (startDate: string): number => {
  // Get dates in user's timezone (or Nigerian time by default)
  const start = new Date(startDate + 'T00:00:00');
  const today = new Date();
  
  // Reset both to midnight for accurate day calculation
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return (diffDays % 7) + 1; // Returns 1-7
};

export const resetCycle = () => {
  const data = getStoredData() || getDefaultData();
  const today = new Date().toISOString().split('T')[0];
  
  saveStoredData({
    ...data,
    startDate: today,
    completedMeals: {},
    alternativeMeals: {},
    cheatLogs: [],
    exerciseLogs: [],
    waterLogs: {},
    weightLogs: [],
    streakDays: 0,
    lastActiveDate: today,
  });
};

export const markMealComplete = (mealId: string) => {
  const data = getStoredData() || getDefaultData();
  const today = new Date().toISOString().split('T')[0];
  
  if (!data.completedMeals[today]) {
    data.completedMeals[today] = [];
  }
  
  if (!data.completedMeals[today].includes(mealId)) {
    data.completedMeals[today].push(mealId);
  }
  
  // Update streak if this is a new day
  if (data.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Increment streak if yesterday was also active, otherwise reset
    if (data.lastActiveDate === yesterdayStr) {
      data.streakDays += 1;
    } else {
      data.streakDays = 1;
    }
    
    data.lastActiveDate = today;
  }
  
  saveStoredData(data);
  
  // Dispatch event for real-time updates
  window.dispatchEvent(new CustomEvent('mealCompleted'));
  window.dispatchEvent(new CustomEvent('dataUpdated'));
  
  // Check if all meals for today are complete (2 meals per day)
  const completedCount = data.completedMeals[today]?.length || 0;
  if (completedCount >= 2) {
    window.dispatchEvent(new CustomEvent('allMealsCompleted'));
  }
};

export const isMealComplete = (mealId: string): boolean => {
  const data = getStoredData();
  if (!data) return false;
  
  const today = new Date().toISOString().split('T')[0];
  return data.completedMeals[today]?.includes(mealId) || false;
};

export const logAlternativeMeal = (meal: AlternativeMeal) => {
  const data = getStoredData() || getDefaultData();
  const today = new Date().toISOString().split('T')[0];
  
  if (!data.alternativeMeals[today]) {
    data.alternativeMeals[today] = [];
  }
  
  // Remove any existing alternative for this meal today (replace it)
  data.alternativeMeals[today] = data.alternativeMeals[today].filter(m => m.mealId !== meal.mealId);
  data.alternativeMeals[today].push(meal);
  saveStoredData(data);
  
  // Dispatch event for real-time updates
  window.dispatchEvent(new CustomEvent('mealCompleted'));
  window.dispatchEvent(new CustomEvent('dataUpdated'));
};

export const getAlternativeMealForToday = (mealId: string): AlternativeMeal | null => {
  const data = getStoredData();
  if (!data || !data.alternativeMeals) return null;
  
  const today = new Date().toISOString().split('T')[0];
  const todayMeals = data.alternativeMeals[today];
  if (!todayMeals) return null;
  
  return todayMeals.find(m => m.mealId === mealId) || null;
};

const STREAK_RESET_VIOLATIONS = [
  'sugary-drink',
  'alcohol',
  'bread',
  'peanuts',
  'pizza',
  'pasta',
  'fast-food',
  'fried-food',
  'junk-food',
  'processed-meat',
];

export const logCheat = (cheat: Omit<CheatLog, 'resetStreak'>): boolean => {
  const data = getStoredData() || getDefaultData();
  const shouldReset = STREAK_RESET_VIOLATIONS.includes(cheat.cheatType);
  
  const cheatLog: CheatLog = {
    ...cheat,
    resetStreak: shouldReset
  };

  data.cheatLogs.push(cheatLog);

  if (shouldReset) {
    data.streakDays = 0;
    data.startDate = new Date().toISOString().split('T')[0];
    data.completedMeals = {};
  }

  saveStoredData(data);
  
  // Dispatch event for real-time updates
  window.dispatchEvent(new CustomEvent('dataUpdated'));
  
  return shouldReset;
};
