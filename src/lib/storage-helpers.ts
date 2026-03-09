// Helper functions for storage operations

import { getStoredData, saveStoredData, AlternativeMeal, CheatLog } from "./storage";

export const logAlternativeMeal = (meal: AlternativeMeal) => {
  const data = getStoredData();
  if (!data) return;

  const today = new Date().toISOString().split('T')[0];
  
  if (!data.alternativeMeals[today]) {
    data.alternativeMeals[today] = [];
  }
  
  data.alternativeMeals[today].push(meal);
  saveStoredData(data);
};

const getStreakResetViolations = (): string[] => {
  const fixed = ['sugary-drink', 'alcohol', 'peanuts', 'pizza', 'pasta', 'fast-food', 'fried-food', 'junk-food', 'processed-meat'];
  try {
    const custom = localStorage.getItem('leantrack_custom_cheat_items');
    if (custom) {
      const items = JSON.parse(custom) as string[];
      return [...fixed, ...items.map(item => `custom-${item.toLowerCase().replace(/\s+/g, '-')}`)];
    }
  } catch {}
  return fixed;
};

export const logCheat = (cheat: Omit<CheatLog, 'resetStreak'>): boolean => {
  const data = getStoredData();
  if (!data) return false;

  const shouldReset = getStreakResetViolations().includes(cheat.cheatType);
  
  const cheatLog: CheatLog = {
    ...cheat,
    resetStreak: shouldReset
  };

  data.cheatLogs.push(cheatLog);

  if (shouldReset) {
    // Reset streak and start date
    data.streakDays = 0;
    data.startDate = new Date().toISOString().split('T')[0];
    data.completedMeals = {};
  }

  saveStoredData(data);
  return shouldReset;
};

export const getTodayAlternativeMeals = (): AlternativeMeal[] => {
  const data = getStoredData();
  if (!data) return [];
  
  const today = new Date().toISOString().split('T')[0];
  return data.alternativeMeals[today] || [];
};

export const getTodayCalories = (): number => {
  const meals = getTodayAlternativeMeals();
  return meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
};

export const getRecentCheats = (days: number = 7): CheatLog[] => {
  const data = getStoredData();
  if (!data) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return data.cheatLogs
    .filter(cheat => new Date(cheat.timestamp) >= cutoffDate)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
