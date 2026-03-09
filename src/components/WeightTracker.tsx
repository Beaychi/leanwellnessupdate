import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scale, TrendingDown, TrendingUp, Minus, Plus, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { logWeight, getWeightLogs, WeightLog, setGoalWeight, getGoalWeight } from "@/lib/storage";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

export default function WeightTracker() {
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [goalWeightValue, setGoalWeightValue] = useState("");
  const [goalWeight, setGoalWeightState] = useState<{ weight: number | null; unit: "kg" | "lbs" }>({ weight: null, unit: "kg" });
  const [showGoalInput, setShowGoalInput] = useState(false);

  const loadLogs = () => {
    setLogs(getWeightLogs());
    setGoalWeightState(getGoalWeight());
  };

  useEffect(() => {
    loadLogs();

    const handleUpdate = () => loadLogs();
    window.addEventListener("weightUpdated", handleUpdate);
    window.addEventListener("goalWeightUpdated", handleUpdate);
    return () => {
      window.removeEventListener("weightUpdated", handleUpdate);
      window.removeEventListener("goalWeightUpdated", handleUpdate);
    };
  }, []);

  const handleLogWeight = () => {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      toast.error("Please enter a valid weight");
      return;
    }

    logWeight(weightNum, unit);
    toast.success(`Weight logged: ${weightNum} ${unit}`);
    setWeight("");
  };

  const handleSetGoal = () => {
    const goalNum = parseFloat(goalWeightValue);
    if (isNaN(goalNum) || goalNum <= 0) {
      toast.error("Please enter a valid goal weight");
      return;
    }

    setGoalWeight(goalNum, unit);
    toast.success(`Goal weight set: ${goalNum} ${unit}`);
    setGoalWeightValue("");
    setShowGoalInput(false);
  };


  // Get last 30 days of data for chart
  const chartData = logs
    .filter((log) => {
      const logDate = new Date(log.date);
      const thirtyDaysAgo = subDays(new Date(), 30);
      return logDate >= thirtyDaysAgo;
    })
    .map((log) => ({
      date: format(new Date(log.date), "MMM d"),
      weight: log.unit === unit ? log.weight : unit === "kg" ? log.weight * 0.453592 : log.weight * 2.20462,
      fullDate: log.date,
    }));

  // Calculate progress
  const latestWeight = logs.length > 0 ? logs[logs.length - 1] : null;
  const previousWeight = logs.length > 1 ? logs[logs.length - 2] : null;
  const weightChange = latestWeight && previousWeight 
    ? (latestWeight.weight - previousWeight.weight).toFixed(1)
    : null;

  const startWeight = logs.length > 0 ? logs[0] : null;
  const totalChange = latestWeight && startWeight
    ? (latestWeight.weight - startWeight.weight).toFixed(1)
    : null;

  // Goal progress
  const convertedGoalWeight = goalWeight.weight 
    ? (goalWeight.unit === unit 
        ? goalWeight.weight 
        : unit === "kg" 
          ? goalWeight.weight * 0.453592 
          : goalWeight.weight * 2.20462)
    : null;

  const currentWeightInUnit = latestWeight 
    ? (latestWeight.unit === unit 
        ? latestWeight.weight 
        : unit === "kg" 
          ? latestWeight.weight * 0.453592 
          : latestWeight.weight * 2.20462)
    : null;

  const startWeightInUnit = startWeight 
    ? (startWeight.unit === unit 
        ? startWeight.weight 
        : unit === "kg" 
          ? startWeight.weight * 0.453592 
          : startWeight.weight * 2.20462)
    : null;

  const progressToGoal = convertedGoalWeight && currentWeightInUnit && startWeightInUnit
    ? Math.min(100, Math.max(0, 
        ((startWeightInUnit - currentWeightInUnit) / (startWeightInUnit - convertedGoalWeight)) * 100
      ))
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Weight Tracker
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="weight" className="sr-only">Weight</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              placeholder="Enter weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="text-lg"
            />
          </div>
          <Select value={unit} onValueChange={(v: "kg" | "lbs") => setUnit(v)}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="lbs">lbs</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleLogWeight} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Goal Weight Section */}
        {goalWeight.weight ? (
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Goal Weight</span>
              </div>
              <span className="text-lg font-bold">{convertedGoalWeight?.toFixed(1)} {unit}</span>
            </div>
            {progressToGoal !== null && progressToGoal >= 0 && (
              <>
                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div
                    className="bg-gradient-to-r from-primary to-success h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, progressToGoal)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {progressToGoal.toFixed(0)}% progress to goal
                  {currentWeightInUnit && convertedGoalWeight && (
                    <span className="ml-2">({(currentWeightInUnit - convertedGoalWeight).toFixed(1)} {unit} to go)</span>
                  )}
                </p>
              </>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 w-full text-xs"
              onClick={() => setShowGoalInput(true)}
            >
              Update Goal
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setShowGoalInput(true)}
          >
            <Target className="h-4 w-4 mr-2" />
            Set Goal Weight
          </Button>
        )}

        {/* Goal Input */}
        {showGoalInput && (
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              placeholder="Goal weight"
              value={goalWeightValue}
              onChange={(e) => setGoalWeightValue(e.target.value)}
            />
            <Button onClick={handleSetGoal}>Set</Button>
            <Button variant="ghost" onClick={() => setShowGoalInput(false)}>Cancel</Button>
          </div>
        )}

        {/* Stats */}
        {latestWeight && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-xl font-bold">{latestWeight.weight}</p>
              <p className="text-xs text-muted-foreground">{latestWeight.unit}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Last Change</p>
              <div className="flex items-center justify-center gap-1">
                {weightChange && parseFloat(weightChange) !== 0 && (
                  parseFloat(weightChange) < 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                  )
                )}
                {weightChange && parseFloat(weightChange) === 0 && (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                <p className="text-xl font-bold">
                  {weightChange ? `${parseFloat(weightChange) > 0 ? '+' : ''}${weightChange}` : '-'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{latestWeight.unit}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <div className="flex items-center justify-center gap-1">
                {totalChange && parseFloat(totalChange) !== 0 && (
                  parseFloat(totalChange) < 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                  )
                )}
                <p className="text-xl font-bold">
                  {totalChange ? `${parseFloat(totalChange) > 0 ? '+' : ''}${totalChange}` : '-'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{latestWeight.unit}</p>
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 1 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                {convertedGoalWeight && (
                  <ReferenceLine 
                    y={convertedGoalWeight} 
                    stroke="hsl(var(--success))" 
                    strokeDasharray="5 5"
                    label={{ value: 'Goal', position: 'right', fill: 'hsl(var(--success))', fontSize: 10 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Log your weight for at least 2 days<br />to see your progress chart
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
