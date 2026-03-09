import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Info } from "lucide-react";
import { getWeightLogs } from "@/lib/storage";

interface BMICalculatorProps {
  heightValue: string;
  heightInches?: string;
  heightUnit: "cm" | "ft";
}

const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return { label: "Underweight", color: "text-blue-500", position: (bmi / 40) * 100 };
  if (bmi < 25) return { label: "Normal", color: "text-emerald-500", position: (bmi / 40) * 100 };
  if (bmi < 30) return { label: "Overweight", color: "text-amber-500", position: (bmi / 40) * 100 };
  return { label: "Obese", color: "text-red-500", position: Math.min((bmi / 40) * 100, 100) };
};

export default function BMICalculator({ heightValue, heightInches, heightUnit }: BMICalculatorProps) {
  const bmiData = useMemo(() => {
    const weightLogs = getWeightLogs();
    if (!heightValue || weightLogs.length === 0) return null;

    const latestWeight = weightLogs[weightLogs.length - 1];
    const weightKg = latestWeight.unit === "lbs" ? latestWeight.weight * 0.453592 : latestWeight.weight;

    let heightCm: number;
    if (heightUnit === "ft") {
      const feet = parseFloat(heightValue) || 0;
      const inches = parseFloat(heightInches || "0") || 0;
      const totalInches = feet * 12 + inches;
      heightCm = totalInches * 2.54;
    } else {
      heightCm = parseFloat(heightValue);
    }

    if (!heightCm || heightCm <= 0) return null;

    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    return {
      bmi: Math.round(bmi * 10) / 10,
      weight: latestWeight.weight,
      weightUnit: latestWeight.unit,
      heightDisplay: heightUnit === "ft"
        ? `${heightValue}'${heightInches || 0}"`
        : `${heightValue} cm`,
      category: getBMICategory(bmi),
    };
  }, [heightValue, heightInches, heightUnit]);

  if (!bmiData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-primary" />
            BMI Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Add your height in profile and log your weight to see your BMI.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary" />
          BMI Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`text-4xl font-bold ${bmiData.category.color}`}>
            {bmiData.bmi}
          </div>
          <div className={`text-sm font-medium ${bmiData.category.color}`}>
            {bmiData.category.label}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {bmiData.heightDisplay} · {bmiData.weight} {bmiData.weightUnit}
          </p>
        </div>

        {/* BMI Scale Bar */}
        <div className="space-y-1">
          <div className="relative h-3 rounded-full overflow-hidden flex">
            <div className="flex-1 bg-blue-400" />
            <div className="flex-1 bg-emerald-400" />
            <div className="flex-1 bg-amber-400" />
            <div className="flex-1 bg-red-400" />
          </div>
          <div className="relative h-2">
            <div
              className="absolute -top-3 w-3 h-3 rounded-full border-2 border-foreground bg-background shadow"
              style={{ left: `calc(${Math.min(bmiData.category.position, 98)}% - 6px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Under</span>
            <span>Normal</span>
            <span>Over</span>
            <span>Obese</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex gap-2 p-3 rounded-lg bg-muted/50">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            BMI is a rough estimate and doesn't account for muscle mass, bone density, age, gender, or body composition. Athletes and muscular individuals often score higher despite being healthy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
