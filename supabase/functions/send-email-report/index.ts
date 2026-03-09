import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import ExcelJS from "npm:exceljs@4.4.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WeightEntry { date: string; weight: number; unit?: string; }
interface MealEntry { date: string; mealsCompleted: number; }
interface ExerciseEntry { date: string; name: string; duration: number; }
interface WaterEntry { date: string; glasses: number; }

interface EmailReportRequest {
  email: string;
  reportType: string;
  subscriptionId?: string;
  reportData: {
    weight: WeightEntry[];
    meals: MealEntry[];
    exercises: ExerciseEntry[];
    water: WaterEntry[];
  };
}

const generateExcelReport = async (reportData: EmailReportRequest["reportData"], reportType: string): Promise<Uint8Array> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LeanTrack";
  workbook.created = new Date();

  const weightData = reportData?.weight || [];
  const mealsData = reportData?.meals || [];
  const exercisesData = reportData?.exercises || [];
  const waterData = reportData?.water || [];

  const latestWeight = weightData.length > 0 ? weightData[weightData.length - 1].weight : 0;
  const startWeight = weightData.length > 0 ? weightData[0].weight : 0;
  const weightChange = latestWeight - startWeight;
  const totalMeals = mealsData.reduce((sum, m) => sum + (m.mealsCompleted || 0), 0);
  const totalExercises = exercisesData.length;
  const totalExerciseMinutes = exercisesData.reduce((sum, e) => sum + (e.duration || 0), 0);
  const avgWater = waterData.length > 0 
    ? (waterData.reduce((sum, w) => sum + (w.glasses || 0), 0) / waterData.length)
    : 0;

  // ===== DASHBOARD SHEET =====
  const dashboard = workbook.addWorksheet("Dashboard", {
    properties: { tabColor: { argb: "4CAF50" } },
  });

  // Title
  dashboard.mergeCells("A1:H1");
  const titleCell = dashboard.getCell("A1");
  titleCell.value = `LeanTrack ${reportType === 'final-export' ? 'Complete Data Export' : reportType.charAt(0).toUpperCase() + reportType.slice(1) + ' Report'}`;
  titleCell.font = { size: 22, bold: true, color: { argb: "FFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "2E7D32" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  dashboard.getRow(1).height = 50;

  // Subtitle
  dashboard.mergeCells("A2:H2");
  const subCell = dashboard.getCell("A2");
  subCell.value = `Generated: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;
  subCell.font = { size: 11, italic: true, color: { argb: "666666" } };
  subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E8F5E9" } };
  subCell.alignment = { horizontal: "center" };

  // Summary KPI cards in row 4-7
  const kpiData = [
    { label: "Current Weight", value: `${latestWeight} kg`, color: "2196F3", note: weightData.length > 0 ? "Latest recorded" : "No data" },
    { label: "Weight Change", value: `${weightChange >= 0 ? "+" : ""}${weightChange.toFixed(1)} kg`, color: weightChange <= 0 ? "4CAF50" : "F44336", note: weightChange <= 0 ? "Great progress!" : "Keep going!" },
    { label: "Meals Logged", value: totalMeals.toString(), color: "FF9800", note: `${mealsData.length} days tracked` },
    { label: "Exercises Done", value: totalExercises.toString(), color: "9C27B0", note: `${totalExerciseMinutes} total minutes` },
    { label: "Avg Water/Day", value: `${avgWater.toFixed(1)} glasses`, color: "03A9F4", note: `${waterData.length} days tracked` },
  ];

  dashboard.addRow([]); // row 3

  kpiData.forEach((kpi, i) => {
    const col = 1 + (i * 2);
    // Merge cells for each KPI card
    if (col + 1 <= 10) {
      dashboard.mergeCells(4, col, 4, col + 1);
      dashboard.mergeCells(5, col, 5, col + 1);
      dashboard.mergeCells(6, col, 6, col + 1);
    }

    const labelCell = dashboard.getCell(4, col);
    labelCell.value = kpi.label;
    labelCell.font = { size: 9, color: { argb: "FFFFFF" }, bold: true };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: kpi.color } };
    labelCell.alignment = { horizontal: "center" };

    const valueCell = dashboard.getCell(5, col);
    valueCell.value = kpi.value;
    valueCell.font = { size: 18, bold: true, color: { argb: kpi.color } };
    valueCell.alignment = { horizontal: "center", vertical: "middle" };
    valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FAFAFA" } };
    valueCell.border = { left: { style: "thin", color: { argb: kpi.color } }, right: { style: "thin", color: { argb: kpi.color } } };

    const noteCell = dashboard.getCell(6, col);
    noteCell.value = kpi.note;
    noteCell.font = { size: 8, italic: true, color: { argb: "999999" } };
    noteCell.alignment = { horizontal: "center" };
    noteCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FAFAFA" } };
    noteCell.border = { bottom: { style: "thin", color: { argb: kpi.color } }, left: { style: "thin", color: { argb: kpi.color } }, right: { style: "thin", color: { argb: kpi.color } } };
  });

  // Set column widths
  for (let i = 1; i <= 10; i++) {
    dashboard.getColumn(i).width = 14;
  }
  dashboard.getRow(5).height = 35;

  // ===== Exercise breakdown summary on dashboard (row 8+) =====
  if (exercisesData.length > 0) {
    dashboard.addRow([]); // row 7
    dashboard.addRow([]); // row 8

    // Exercise type breakdown
    const exerciseMap = new Map<string, number>();
    exercisesData.forEach(e => {
      exerciseMap.set(e.name, (exerciseMap.get(e.name) || 0) + e.duration);
    });

    const startRow = 9;
    const breakdownHeader = dashboard.getRow(startRow);
    dashboard.mergeCells(startRow, 1, startRow, 3);
    const bHeaderCell = dashboard.getCell(startRow, 1);
    bHeaderCell.value = "Exercise Breakdown";
    bHeaderCell.font = { size: 14, bold: true, color: { argb: "FFFFFF" } };
    bHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "9C27B0" } };
    bHeaderCell.alignment = { horizontal: "center" };

    const colHeader = dashboard.getRow(startRow + 1);
    dashboard.getCell(startRow + 1, 1).value = "Exercise";
    dashboard.getCell(startRow + 1, 2).value = "Total Minutes";
    dashboard.getCell(startRow + 1, 3).value = "Sessions";
    [1, 2, 3].forEach(c => {
      const cell = dashboard.getCell(startRow + 1, c);
      cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "7B1FA2" } };
      cell.alignment = { horizontal: "center" };
    });

    const exerciseCountMap = new Map<string, number>();
    exercisesData.forEach(e => {
      exerciseCountMap.set(e.name, (exerciseCountMap.get(e.name) || 0) + 1);
    });

    let r = startRow + 2;
    const exerciseColors = ["E1BEE7", "F3E5F5"];
    let colorIdx = 0;
    exerciseMap.forEach((duration, name) => {
      const row = dashboard.getRow(r);
      dashboard.getCell(r, 1).value = name;
      dashboard.getCell(r, 2).value = duration;
      dashboard.getCell(r, 3).value = exerciseCountMap.get(name) || 0;
      [1, 2, 3].forEach(c => {
        const cell = dashboard.getCell(r, c);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: exerciseColors[colorIdx % 2] } };
        cell.alignment = { horizontal: "center" };
        cell.border = { bottom: { style: "thin", color: { argb: "DDDDDD" } } };
      });
      r++;
      colorIdx++;
    });

    // Water summary on right side
    if (waterData.length > 0) {
      dashboard.mergeCells(startRow, 5, startRow, 7);
      const wHeaderCell = dashboard.getCell(startRow, 5);
      wHeaderCell.value = "Daily Water Intake";
      wHeaderCell.font = { size: 14, bold: true, color: { argb: "FFFFFF" } };
      wHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0288D1" } };
      wHeaderCell.alignment = { horizontal: "center" };

      dashboard.getCell(startRow + 1, 5).value = "Date";
      dashboard.getCell(startRow + 1, 6).value = "Glasses";
      dashboard.getCell(startRow + 1, 7).value = "Status";
      [5, 6, 7].forEach(c => {
        const cell = dashboard.getCell(startRow + 1, c);
        cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0277BD" } };
        cell.alignment = { horizontal: "center" };
      });

      let wr = startRow + 2;
      waterData.slice(-10).forEach((w, idx) => {
        dashboard.getCell(wr, 5).value = w.date;
        dashboard.getCell(wr, 6).value = w.glasses;
        dashboard.getCell(wr, 7).value = w.glasses >= 8 ? "Excellent" : w.glasses >= 6 ? "Good" : "Low";
        [5, 6, 7].forEach(c => {
          const cell = dashboard.getCell(wr, c);
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? "E1F5FE" : "B3E5FC" } };
          cell.alignment = { horizontal: "center" };
          cell.border = { bottom: { style: "thin", color: { argb: "DDDDDD" } } };
          if (c === 7) {
            cell.font = { 
              bold: true, 
              color: { argb: w.glasses >= 8 ? "2E7D32" : w.glasses >= 6 ? "F57F17" : "D32F2F" } 
            };
          }
        });
        wr++;
      });
    }
  }

  // ===== WEIGHT SHEET with chart data =====
  const weightSheet = workbook.addWorksheet("Weight Tracking", {
    properties: { tabColor: { argb: "2196F3" } },
  });

  weightSheet.mergeCells("A1:E1");
  const wTitle = weightSheet.getCell("A1");
  wTitle.value = "Weight Tracking History";
  wTitle.font = { size: 18, bold: true, color: { argb: "FFFFFF" } };
  wTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1565C0" } };
  wTitle.alignment = { horizontal: "center", vertical: "middle" };
  weightSheet.getRow(1).height = 40;

  weightSheet.addRow([]);
  const wHeaders = weightSheet.addRow(["Date", "Weight (kg)", "Change", "Trend", "Notes"]);
  wHeaders.font = { bold: true, color: { argb: "FFFFFF" } };
  wHeaders.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1976D2" } };
    cell.alignment = { horizontal: "center" };
  });

  weightData.forEach((w, i) => {
    const change = i > 0 ? w.weight - weightData[i - 1].weight : 0;
    const trend = i === 0 ? "-" : change < 0 ? "Losing" : change > 0 ? "Gaining" : "Stable";
    const row = weightSheet.addRow([w.date, w.weight, i === 0 ? "-" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}`, trend, ""]);
    row.eachCell((cell, colNum) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? "E3F2FD" : "FFFFFF" } };
      cell.alignment = { horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "E0E0E0" } } };
      if (colNum === 4) {
        cell.font = { 
          bold: true,
          color: { argb: trend === "Losing" ? "2E7D32" : trend === "Gaining" ? "D32F2F" : "757575" }
        };
      }
    });
  });

  if (weightData.length === 0) {
    weightSheet.addRow(["No weight data recorded yet", "", "", "", ""]);
  }

  [20, 15, 12, 12, 20].forEach((w, i) => { weightSheet.getColumn(i + 1).width = w; });

  // ===== MEALS SHEET =====
  const mealsSheet = workbook.addWorksheet("Meals", {
    properties: { tabColor: { argb: "FF9800" } },
  });

  mealsSheet.mergeCells("A1:D1");
  const mTitle = mealsSheet.getCell("A1");
  mTitle.value = "Meals Completed";
  mTitle.font = { size: 18, bold: true, color: { argb: "FFFFFF" } };
  mTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E65100" } };
  mTitle.alignment = { horizontal: "center", vertical: "middle" };
  mealsSheet.getRow(1).height = 40;

  mealsSheet.addRow([]);
  const mHeaders = mealsSheet.addRow(["Date", "Meals Completed", "Compliance", "Rating"]);
  mHeaders.font = { bold: true, color: { argb: "FFFFFF" } };
  mHeaders.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F57C00" } };
    cell.alignment = { horizontal: "center" };
  });

  mealsData.forEach((m, i) => {
    const compliance = m.mealsCompleted >= 3 ? "100%" : `${Math.round((m.mealsCompleted / 3) * 100)}%`;
    const rating = m.mealsCompleted >= 3 ? "Perfect" : m.mealsCompleted >= 2 ? "Good" : "Needs Work";
    const row = mealsSheet.addRow([m.date, m.mealsCompleted, compliance, rating]);
    row.eachCell((cell, colNum) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? "FFF3E0" : "FFFFFF" } };
      cell.alignment = { horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "E0E0E0" } } };
      if (colNum === 4) {
        cell.font = {
          bold: true,
          color: { argb: rating === "Perfect" ? "2E7D32" : rating === "Good" ? "F57F17" : "D32F2F" }
        };
      }
    });
  });

  if (mealsData.length === 0) {
    mealsSheet.addRow(["No meals logged yet", "", "", ""]);
  }

  [20, 18, 15, 15].forEach((w, i) => { mealsSheet.getColumn(i + 1).width = w; });

  // ===== EXERCISES SHEET =====
  const exercisesSheet = workbook.addWorksheet("Exercises", {
    properties: { tabColor: { argb: "9C27B0" } },
  });

  exercisesSheet.mergeCells("A1:D1");
  const eTitle = exercisesSheet.getCell("A1");
  eTitle.value = "Exercise Log";
  eTitle.font = { size: 18, bold: true, color: { argb: "FFFFFF" } };
  eTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "6A1B9A" } };
  eTitle.alignment = { horizontal: "center", vertical: "middle" };
  exercisesSheet.getRow(1).height = 40;

  exercisesSheet.addRow([]);
  const eHeaders = exercisesSheet.addRow(["Date", "Exercise", "Duration (min)", "Intensity"]);
  eHeaders.font = { bold: true, color: { argb: "FFFFFF" } };
  eHeaders.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "7B1FA2" } };
    cell.alignment = { horizontal: "center" };
  });

  exercisesData.forEach((e, i) => {
    const intensity = e.duration >= 30 ? "High" : e.duration >= 15 ? "Medium" : "Light";
    const row = exercisesSheet.addRow([e.date, e.name, e.duration, intensity]);
    row.eachCell((cell, colNum) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? "F3E5F5" : "FFFFFF" } };
      cell.alignment = { horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "E0E0E0" } } };
      if (colNum === 4) {
        cell.font = {
          bold: true,
          color: { argb: intensity === "High" ? "D32F2F" : intensity === "Medium" ? "F57F17" : "2E7D32" }
        };
      }
    });
  });

  if (exercisesData.length === 0) {
    exercisesSheet.addRow(["No exercises logged yet", "", "", ""]);
  }

  [20, 30, 18, 15].forEach((w, i) => { exercisesSheet.getColumn(i + 1).width = w; });

  // ===== WATER SHEET =====
  const waterSheet = workbook.addWorksheet("Water Intake", {
    properties: { tabColor: { argb: "03A9F4" } },
  });

  waterSheet.mergeCells("A1:D1");
  const waterTitle = waterSheet.getCell("A1");
  waterTitle.value = "Water Intake Tracker";
  waterTitle.font = { size: 18, bold: true, color: { argb: "FFFFFF" } };
  waterTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0277BD" } };
  waterTitle.alignment = { horizontal: "center", vertical: "middle" };
  waterSheet.getRow(1).height = 40;

  waterSheet.addRow([]);
  const waterHeaders = waterSheet.addRow(["Date", "Glasses", "Goal (8)", "Status"]);
  waterHeaders.font = { bold: true, color: { argb: "FFFFFF" } };
  waterHeaders.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0288D1" } };
    cell.alignment = { horizontal: "center" };
  });

  waterData.forEach((w, i) => {
    const status = w.glasses >= 8 ? "Goal Met!" : `${8 - w.glasses} more needed`;
    const row = waterSheet.addRow([w.date, w.glasses, 8, status]);
    row.eachCell((cell, colNum) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? "E1F5FE" : "FFFFFF" } };
      cell.alignment = { horizontal: "center" };
      cell.border = { bottom: { style: "thin", color: { argb: "E0E0E0" } } };
      if (colNum === 4) {
        cell.font = { bold: true, color: { argb: w.glasses >= 8 ? "2E7D32" : "F57F17" } };
      }
    });
  });

  if (waterData.length === 0) {
    waterSheet.addRow(["No water intake logged yet", "", "", ""]);
  }

  [20, 12, 12, 20].forEach((w, i) => { waterSheet.getColumn(i + 1).width = w; });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
};

const generateReportHtml = (reportData: EmailReportRequest["reportData"], reportType: string, email: string, subscriptionId?: string) => {
  const weightData = reportData?.weight || [];
  const mealsData = reportData?.meals || [];
  const exercisesData = reportData?.exercises || [];
  const waterData = reportData?.water || [];

  const latestWeight = weightData.length > 0 ? weightData[weightData.length - 1].weight : null;
  const startWeight = weightData.length > 0 ? weightData[0].weight : null;
  const weightChange = latestWeight !== null && startWeight !== null 
    ? (latestWeight - startWeight).toFixed(1) 
    : "0";

  const totalMeals = mealsData.reduce((sum, m) => sum + (m.mealsCompleted || 0), 0);
  const totalExercises = exercisesData.length;
  const totalExerciseMinutes = exercisesData.reduce((sum, e) => sum + (e.duration || 0), 0);
  const avgWater = waterData.length > 0 
    ? (waterData.reduce((sum, w) => sum + (w.glasses || 0), 0) / waterData.length).toFixed(1)
    : "0";

  // Exercise breakdown for pie chart representation
  const exerciseMap: Record<string, number> = {};
  exercisesData.forEach(e => {
    exerciseMap[e.name] = (exerciseMap[e.name] || 0) + e.duration;
  });
  const exerciseBreakdown = Object.entries(exerciseMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalExMinutes = exerciseBreakdown.reduce((s, [, v]) => s + v, 0);

  const barColors = ["#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#F44336"];

  const unsubscribeUrl = reportType !== 'final-export' 
    ? `${SUPABASE_URL}/functions/v1/unsubscribe-email?email=${encodeURIComponent(email)}${subscriptionId ? `&id=${subscriptionId}` : ""}`
    : null;

  const isExport = reportType === 'final-export';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, ${isExport ? '#1565C0, #0D47A1' : '#4CAF50, #2E7D32'}); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 20px 0; }
    .stat-box { background: #f8f9fa; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e9ecef; }
    .stat-value { font-size: 28px; font-weight: bold; }
    .stat-label { color: #666; font-size: 13px; margin-top: 4px; }
    .stat-detail { color: #888; font-size: 11px; margin-top: 2px; }
    .bar-chart { margin: 20px 0; }
    .bar-row { display: flex; align-items: center; margin: 6px 0; }
    .bar-label { width: 120px; font-size: 12px; color: #555; text-align: right; padding-right: 10px; }
    .bar-track { flex: 1; height: 24px; background: #f0f0f0; border-radius: 12px; overflow: hidden; position: relative; }
    .bar-fill { height: 100%; border-radius: 12px; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; font-size: 11px; color: white; font-weight: bold; min-width: 30px; }
    .section { margin: 20px 0; padding: 15px; background: #fafafa; border-radius: 12px; border: 1px solid #eee; }
    .section h3 { margin: 0 0 12px 0; color: #333; font-size: 15px; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; }
    .positive { color: #4CAF50; }
    .negative { color: #f44336; }
    .attachment-note { background: #e3f2fd; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center; border: 1px solid #90CAF9; }
    .water-dots { display: flex; gap: 4px; justify-content: center; margin-top: 8px; }
    .water-dot { width: 16px; height: 16px; border-radius: 50%; }
    .water-dot.filled { background: #03A9F4; }
    .water-dot.empty { background: #E0E0E0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isExport ? '📦 Complete Data Export' : '📊 ' + reportType.charAt(0).toUpperCase() + reportType.slice(1) + ' Report'}</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">${isExport ? 'Your complete LeanTrack data backup' : 'Your progress summary'}</p>
    </div>
    <div class="content">
      <div class="attachment-note">
        <p style="margin:0;font-size:14px;color:#1565C0;">📎 <strong>Detailed Excel report attached!</strong></p>
        <p style="margin:4px 0 0;font-size:12px;color:#666;">Open to see full data with color-coded insights and breakdowns.</p>
      </div>
      
      <div class="stat-grid">
        <div class="stat-box">
          <div class="stat-value" style="color:#2196F3">${latestWeight !== null ? latestWeight : "—"}<span style="font-size:14px">${latestWeight !== null ? "kg" : ""}</span></div>
          <div class="stat-label">Current Weight</div>
        </div>
        <div class="stat-box">
          <div class="stat-value ${parseFloat(weightChange) <= 0 ? 'positive' : 'negative'}">${parseFloat(weightChange) > 0 ? '+' : ''}${weightChange}<span style="font-size:14px">kg</span></div>
          <div class="stat-label">Weight Change</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color:#FF9800">${totalMeals}</div>
          <div class="stat-label">Meals Logged</div>
          <div class="stat-detail">${mealsData.length} days</div>
        </div>
        <div class="stat-box">
          <div class="stat-value" style="color:#9C27B0">${totalExercises}</div>
          <div class="stat-label">Exercises</div>
          <div class="stat-detail">${totalExerciseMinutes} min total</div>
        </div>
      </div>

      ${exerciseBreakdown.length > 0 ? `
      <div class="section">
        <h3>💪 Exercise Breakdown</h3>
        <div class="bar-chart">
          ${exerciseBreakdown.map(([name, mins], i) => `
          <div class="bar-row">
            <div class="bar-label">${name}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.max(15, (mins / totalExMinutes) * 100)}%;background:${barColors[i]}">${mins}m</div>
            </div>
          </div>`).join('')}
        </div>
      </div>` : ''}

      ${waterData.length > 0 ? `
      <div class="section">
        <h3>💧 Water Intake (Last 7 Days)</h3>
        ${waterData.slice(-7).map(w => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0;">
          <span style="font-size:12px;color:#666;">${w.date}</span>
          <div class="water-dots">
            ${Array.from({length: 8}, (_, i) => `<div class="water-dot ${i < w.glasses ? 'filled' : 'empty'}"></div>`).join('')}
          </div>
          <span style="font-size:12px;font-weight:bold;color:${w.glasses >= 8 ? '#4CAF50' : '#FF9800'}">${w.glasses}/8</span>
        </div>`).join('')}
      </div>` : ''}

      ${weightData.length > 1 ? `
      <div class="section">
        <h3>📈 Weight Trend</h3>
        <div style="display:flex;align-items:flex-end;gap:4px;height:80px;padding:8px 0;">
          ${weightData.slice(-14).map((w, i, arr) => {
            const min = Math.min(...arr.map(x => x.weight));
            const max = Math.max(...arr.map(x => x.weight));
            const range = max - min || 1;
            const height = Math.max(10, ((w.weight - min) / range) * 70);
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
              <span style="font-size:8px;color:#999;">${w.weight}</span>
              <div style="width:100%;height:${height}px;background:linear-gradient(to top,#2196F3,#64B5F6);border-radius:3px;"></div>
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:#999;margin-top:4px;">
          <span>${weightData.slice(-14)[0]?.date || ''}</span>
          <span>${weightData[weightData.length - 1]?.date || ''}</span>
        </div>
      </div>` : ''}

      <p style="color: #666; text-align: center; margin-top: 20px; font-size: 14px;">
        ${isExport ? 'This is your complete data export. Your app has been reset.' : 'Keep up the great work! Every small step counts. 💪'}
      </p>
    </div>
    <div class="footer">
      <p>LeanTrack • Your Personal Health Companion</p>
      ${unsubscribeUrl ? `<p style="margin-top:8px;"><a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a></p>` : ''}
    </div>
  </div>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, reportType, reportData, subscriptionId }: EmailReportRequest = await req.json();

    console.log(`Sending ${reportType} report to ${email}`);

    const excelBuffer = await generateExcelReport(reportData, reportType);
    const excelBase64 = btoa(String.fromCharCode(...excelBuffer));

    const html = generateReportHtml(reportData, reportType, email, subscriptionId);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "LeanTrack <onboarding@resend.dev>",
        to: [email],
        subject: reportType === 'final-export' 
          ? `Your LeanTrack Data Export 📦` 
          : `Your LeanTrack ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Progress Report 📊`,
        html,
        attachments: [
          {
            filename: `LeanTrack-${reportType}-report-${new Date().toISOString().split("T")[0]}.xlsx`,
            content: excelBase64,
          },
        ],
      }),
    });

    const emailResponse = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", emailResponse);
      throw new Error(emailResponse.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
