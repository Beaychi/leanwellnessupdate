import { getStoredData, getWeightLogs, WeightLog } from "./storage";
import { format } from "date-fns";

export interface ExportData {
  weight: WeightLog[];
  meals: { date: string; mealsCompleted: number }[];
  exercises: { date: string; name: string; duration: number }[];
  water: { date: string; glasses: number }[];
}

export const gatherExportData = (): ExportData => {
  const data = getStoredData();
  if (!data) {
    return { weight: [], meals: [], exercises: [], water: [] };
  }

  // Weight logs
  const weight = getWeightLogs();

  // Meals data
  const meals = Object.entries(data.completedMeals || {}).map(([date, mealIds]) => ({
    date,
    mealsCompleted: mealIds.length,
  }));

  // Exercise logs
  const exercises = (data.exerciseLogs || []).map((log) => ({
    date: log.completedAt.split("T")[0],
    name: log.exerciseName,
    duration: log.durationMinutes,
  }));

  // Water logs
  const water = Object.entries(data.waterLogs || {}).map(([date, glasses]) => ({
    date,
    glasses,
  }));

  return { weight, meals, exercises, water };
};

export const exportToCSV = (): string => {
  const data = gatherExportData();
  const lines: string[] = [];

  // Header
  lines.push("LeanTrack Progress Report");
  lines.push(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`);
  lines.push("");

  // Weight section
  lines.push("=== WEIGHT TRACKING ===");
  lines.push("Date,Weight,Unit");
  data.weight.forEach((w) => {
    lines.push(`${w.date},${w.weight},${w.unit}`);
  });
  lines.push("");

  // Meals section
  lines.push("=== MEALS COMPLETED ===");
  lines.push("Date,Meals Completed");
  data.meals.forEach((m) => {
    lines.push(`${m.date},${m.mealsCompleted}`);
  });
  lines.push("");

  // Exercises section
  lines.push("=== EXERCISES ===");
  lines.push("Date,Exercise,Duration (min)");
  data.exercises.forEach((e) => {
    lines.push(`${e.date},${e.name},${e.duration}`);
  });
  lines.push("");

  // Water section
  lines.push("=== WATER INTAKE ===");
  lines.push("Date,Glasses");
  data.water.forEach((w) => {
    lines.push(`${w.date},${w.glasses}`);
  });

  return lines.join("\n");
};

export const downloadCSV = () => {
  const csv = exportToCSV();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `leantrack-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
