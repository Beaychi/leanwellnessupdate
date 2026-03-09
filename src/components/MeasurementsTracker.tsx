import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ruler, Plus, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getStoredData, saveStoredData } from "@/lib/storage";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

export interface MeasurementLog {
  value: number;
  date: string;
  unit: "cm" | "in";
}

export interface BodyMeasurements {
  waist: MeasurementLog[];
  hips: MeasurementLog[];
  thighs: MeasurementLog[];
  arms: MeasurementLog[];
  chest: MeasurementLog[];
}

type MeasurementType = keyof BodyMeasurements;

const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  waist: "Waist",
  hips: "Hips",
  thighs: "Thighs",
  arms: "Arms",
  chest: "Chest",
};


export default function MeasurementsTracker() {
  const [measurements, setMeasurements] = useState<BodyMeasurements>({
    waist: [],
    hips: [],
    thighs: [],
    arms: [],
    chest: [],
  });
  const [activeTab, setActiveTab] = useState<MeasurementType>("waist");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const [isExpanded, setIsExpanded] = useState(false);

  const loadMeasurements = useCallback(() => {
    const data = getStoredData();
    if (data?.bodyMeasurements) {
      setMeasurements(data.bodyMeasurements);
    }
  }, []);

  useEffect(() => {
    loadMeasurements();

    const handleUpdate = () => loadMeasurements();
    window.addEventListener("measurementsUpdated", handleUpdate);
    return () => window.removeEventListener("measurementsUpdated", handleUpdate);
  }, [loadMeasurements]);

  const handleLogMeasurement = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error("Please enter a valid measurement");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const newLog: MeasurementLog = {
      value: numValue,
      date: today,
      unit,
    };

    const data = getStoredData();
    const currentMeasurements = data?.bodyMeasurements || {
      waist: [],
      hips: [],
      thighs: [],
      arms: [],
      chest: [],
    };

    // Remove existing entry for today if exists
    currentMeasurements[activeTab] = currentMeasurements[activeTab].filter(
      (log) => log.date !== today
    );
    currentMeasurements[activeTab].push(newLog);
    currentMeasurements[activeTab].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    saveStoredData({ ...data, bodyMeasurements: currentMeasurements });
    setMeasurements(currentMeasurements);
    toast.success(`${MEASUREMENT_LABELS[activeTab]} logged: ${numValue} ${unit}`);
    setValue("");

    window.dispatchEvent(new CustomEvent("measurementsUpdated"));
  };

  const getLatestMeasurement = (type: MeasurementType): MeasurementLog | null => {
    const logs = measurements[type];
    return logs.length > 0 ? logs[logs.length - 1] : null;
  };

  const getChange = (type: MeasurementType): number | null => {
    const logs = measurements[type];
    if (logs.length < 2) return null;
    return logs[logs.length - 1].value - logs[logs.length - 2].value;
  };

  const getTotalChange = (type: MeasurementType): number | null => {
    const logs = measurements[type];
    if (logs.length < 2) return null;
    return logs[logs.length - 1].value - logs[0].value;
  };

  // Chart data for the active measurement
  const chartData = measurements[activeTab]
    .filter((log) => {
      const logDate = new Date(log.date);
      const thirtyDaysAgo = subDays(new Date(), 60);
      return logDate >= thirtyDaysAgo;
    })
    .map((log) => ({
      date: format(new Date(log.date), "MMM d"),
      value: log.unit === unit ? log.value : unit === "cm" ? log.value * 2.54 : log.value / 2.54,
      fullDate: log.date,
    }));

  const latestMeasurement = getLatestMeasurement(activeTab);
  const change = getChange(activeTab);
  const totalChange = getTotalChange(activeTab);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Body Measurements
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats Overview */}
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(MEASUREMENT_LABELS) as MeasurementType[]).map((type) => {
            const latest = getLatestMeasurement(type);
            const typeChange = getTotalChange(type);
            return (
              <button
                key={type}
                onClick={() => {
                  setActiveTab(type);
                  setIsExpanded(true);
                }}
                className={`p-2 rounded-lg text-center transition-colors ${
                  activeTab === type && isExpanded
                    ? "bg-primary/20 ring-2 ring-primary"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <p className="text-xs font-medium truncate">{MEASUREMENT_LABELS[type]}</p>
                {latest ? (
                  <p className="text-sm font-bold">
                    {latest.value}
                    <span className="text-xs text-muted-foreground">{latest.unit}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">--</p>
                )}
                {typeChange !== null && (
                  <p
                    className={`text-xs ${
                      typeChange < 0 ? "text-green-500" : typeChange > 0 ? "text-orange-500" : ""
                    }`}
                  >
                    {typeChange > 0 ? "+" : ""}
                    {typeChange.toFixed(1)}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <>
            {/* Input Section */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="measurement" className="sr-only">
                  {MEASUREMENT_LABELS[activeTab]}
                </Label>
                <Input
                  id="measurement"
                  type="number"
                  step="0.1"
                  placeholder={`Enter ${MEASUREMENT_LABELS[activeTab].toLowerCase()}`}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="text-lg"
                />
              </div>
              <Select value={unit} onValueChange={(v: "cm" | "in") => setUnit(v)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="in">in</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleLogMeasurement} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Stats */}
            {latestMeasurement && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="text-xl font-bold">{latestMeasurement.value}</p>
                  <p className="text-xs text-muted-foreground">{latestMeasurement.unit}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Last Change</p>
                  <div className="flex items-center justify-center gap-1">
                    {change !== null && change !== 0 && (
                      change < 0 ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                      )
                    )}
                    {change !== null && change === 0 && (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                    <p className="text-xl font-bold">
                      {change !== null ? `${change > 0 ? "+" : ""}${change.toFixed(1)}` : "-"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{latestMeasurement.unit}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <div className="flex items-center justify-center gap-1">
                    {totalChange !== null && totalChange !== 0 && (
                      totalChange < 0 ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                      )
                    )}
                    <p className="text-xl font-bold">
                      {totalChange !== null
                        ? `${totalChange > 0 ? "+" : ""}${totalChange.toFixed(1)}`
                        : "-"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{latestMeasurement.unit}</p>
                </div>
              </div>
            )}

            {/* Chart */}
            {chartData.length > 1 ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      domain={["dataMin - 1", "dataMax + 1"]}
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [`${value} ${unit}`, MEASUREMENT_LABELS[activeTab]]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  Log your {MEASUREMENT_LABELS[activeTab].toLowerCase()} for at least 2 days
                  <br />
                  to see your progress chart
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
