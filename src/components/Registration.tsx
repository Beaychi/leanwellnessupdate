import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight,
  ChevronLeft,
  User,
  Globe,
  ShieldAlert,
  Clock,
  Rocket,
  Heart,
  Ruler,
  Target,
  Mail,
  Bell,
  Fish,
  Milk,
  Egg,
  Nut,
  Wheat,
  Bean,
  Shell,
  Beef,
  Bird,
  Flame,
  Banana,
  Carrot,
  X,
  Plus,
  Briefcase,
  Sunrise,
  Sun,
  Moon,
  Coffee,
  UtensilsCrossed,
  BedDouble,
} from "lucide-react";
import {
  UserRegistration,
  getDefaultRegistration,
  saveRegistration,
  COMMON_ALLERGIES,
  COUNTRIES_BY_REGION,
} from "@/lib/registration";
import { saveStoredData, logWeight, setGoalWeight } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface RegistrationProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 10;

// Fixed cheat violation items that reset your streak
const FIXED_CHEAT_ITEMS = [
  { id: 'sugary-drink', label: 'Sugary Drinks', description: 'Soda, energy drinks, sweetened beverages' },
  { id: 'alcohol', label: 'Alcohol', description: 'Beer, wine, spirits, cocktails' },
  { id: 'peanuts', label: 'Peanuts', description: 'Peanuts, groundnuts, peanut butter' },
  { id: 'pizza', label: 'Pizza', description: 'All pizza types' },
  { id: 'pasta', label: 'Pasta & Noodles', description: 'Spaghetti, noodles, macaroni, ramen' },
  { id: 'fast-food', label: 'Fast Food', description: 'McDonald\'s, KFC, Burger King, etc.' },
  { id: 'fried-food', label: 'Fried Foods', description: 'French fries, fried chicken, deep-fried items' },
  { id: 'junk-food', label: 'Junk Food & Sweets', description: 'Chips, candy, cake, ice cream, cookies' },
  { id: 'processed-meat', label: 'Processed Meat', description: 'Hot dogs, sausage, bacon, salami' },
];

const CUSTOM_CHEAT_ITEMS_KEY = 'leantrack_custom_cheat_items';

const ALLERGY_ICONS: Record<string, React.ReactNode> = {
  fish: <Fish className="h-5 w-5" />,
  dairy: <Milk className="h-5 w-5" />,
  eggs: <Egg className="h-5 w-5" />,
  nuts: <Nut className="h-5 w-5" />,
  gluten: <Wheat className="h-5 w-5" />,
  soy: <Bean className="h-5 w-5" />,
  shellfish: <Shell className="h-5 w-5" />,
  'red-meat': <Beef className="h-5 w-5" />,
  poultry: <Bird className="h-5 w-5" />,
  spicy: <Flame className="h-5 w-5" />,
  plantain: <Banana className="h-5 w-5" />,
  yam: <Carrot className="h-5 w-5" />,
};

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
    scale: 0.95,
  }),
};

export const Registration = ({ onComplete }: RegistrationProps) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<UserRegistration>(getDefaultRegistration());
  const [customAllergyInput, setCustomAllergyInput] = useState("");
  const [customCheatInput, setCustomCheatInput] = useState("");
  const [customCheatItems, setCustomCheatItems] = useState<string[]>([]);
  const [agreedToRules, setAgreedToRules] = useState(false);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return true; // Welcome
      case 1: return data.firstName.trim().length >= 2 && data.lastName.trim().length >= 2;
      case 2: return !!data.age && !!data.gender;
      case 3: return !!data.height && !!data.currentWeight;
      case 4: return data.country.length > 0;
      case 5: return true; // Allergies optional
      case 6: return true; // Schedule has defaults
      case 7: return agreedToRules; // Must agree to cheat rules
      case 8: return true; // Custom cheat items optional
      case 9: return true; // Email optional
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    const finalData = { ...data, registrationCompleted: true };
    saveRegistration(finalData);

    // Save profile to localStorage
    const profileData = {
      fullName: `${data.firstName} ${data.lastName}`,
      age: data.age,
      gender: data.gender,
      height: data.height,
      heightInches: data.heightInches,
      heightUnit: data.heightUnit,
      goalWeight: data.goalWeight,
      weightUnit: data.weightUnit,
      avatar: null,
    };
    localStorage.setItem("leantrack_profile", JSON.stringify(profileData));

    // Save current weight to weight tracker
    if (data.currentWeight) {
      const weight = parseFloat(data.currentWeight);
      if (!isNaN(weight) && weight > 0) {
        logWeight(weight, data.weightUnit);
      }
    }

    // Save goal weight to weight tracker
    if (data.goalWeight) {
      const goalW = parseFloat(data.goalWeight);
      if (!isNaN(goalW) && goalW > 0) {
        setGoalWeight(goalW, data.weightUnit);
      }
    }

    // Save schedule
    saveStoredData({
      onboardingCompleted: true,
      bedtime: data.schedule.bedTime,
      wakeupTime: data.schedule.wakeUpTime,
      mealReminders: {
        breakfast: data.schedule.breakfastTime,
        lunch: data.schedule.lunchTime,
        dinner: data.schedule.dinnerTime,
      },
    });

    // Save custom cheat items if any were added
    if (customCheatItems.length > 0) {
      localStorage.setItem(CUSTOM_CHEAT_ITEMS_KEY, JSON.stringify(customCheatItems));
    }

    // Save email subscription if provided
    if (data.email.trim()) {
      try {
        await supabase.from('email_subscriptions').upsert(
          { email: data.email, weekly_reports: data.weeklyReports, monthly_reports: data.monthlyReports },
          { onConflict: 'email' }
        );
      } catch (e) {
        console.error('Failed to save email subscription:', e);
      }
    }

    onComplete();
  };

  const toggleAllergy = (id: string) => {
    setData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(id)
        ? prev.allergies.filter(a => a !== id)
        : [...prev.allergies, id],
    }));
  };

  const addCustomAllergy = () => {
    const trimmed = customAllergyInput.trim();
    if (trimmed && !data.customAllergies.includes(trimmed)) {
      setData(prev => ({
        ...prev,
        customAllergies: [...prev.customAllergies, trimmed],
      }));
      setCustomAllergyInput("");
    }
  };

  const removeCustomAllergy = (allergy: string) => {
    setData(prev => ({
      ...prev,
      customAllergies: prev.customAllergies.filter(a => a !== allergy),
    }));
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="inline-flex p-6 rounded-full bg-primary/10"
            >
              <Heart className="h-16 w-16 text-primary" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-3xl font-bold text-foreground">Welcome to LeanTrack</h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto"
            >
              Your personalized wellness journey starts here. Let's get to know you so we can build the perfect plan.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center gap-6 text-muted-foreground"
            >
              {[
                { icon: <UtensilsCrossed className="h-5 w-5" />, label: "Custom Meals" },
                { icon: <Target className="h-5 w-5" />, label: "Track Progress" },
                { icon: <Bell className="h-5 w-5" />, label: "Smart Reminders" },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.15 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="p-2 rounded-lg bg-muted">{item.icon}</div>
                  <span className="text-xs font-medium">{item.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 250, damping: 15 }}
                className="inline-flex p-4 rounded-full bg-primary/10 mb-3"
              >
                <User className="h-10 w-10 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">What's your name?</h2>
              <p className="text-muted-foreground">So we can personalize your experience</p>
            </div>
            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Enter your first name"
                  value={data.firstName}
                  onChange={e => setData(prev => ({ ...prev, firstName: e.target.value }))}
                  maxLength={50}
                  autoFocus
                  className="h-12 text-base"
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
                  value={data.lastName}
                  onChange={e => setData(prev => ({ ...prev, lastName: e.target.value }))}
                  maxLength={50}
                  className="h-12 text-base"
                />
              </motion.div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 250, damping: 15 }}
                className="inline-flex p-4 rounded-full bg-primary/10 mb-3"
              >
                <Heart className="h-10 w-10 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">About you</h2>
              <p className="text-muted-foreground">Help us tailor your health insights</p>
            </div>
            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Enter your age"
                  value={data.age}
                  onChange={e => setData(prev => ({ ...prev, age: e.target.value }))}
                  className="h-12 text-base"
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Label>Gender</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {['Male', 'Female', 'Other', 'Prefer not to say'].map((g, i) => (
                    <motion.button
                      key={g}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.25 + i * 0.05 }}
                      onClick={() => setData(prev => ({ ...prev, gender: g }))}
                      className={`p-3 rounded-xl text-sm font-medium transition-all border-2 ${
                        data.gender === g
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card hover:border-muted-foreground/30 text-foreground'
                      }`}
                    >
                      {g}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 250, damping: 15 }}
                className="inline-flex p-4 rounded-full bg-primary/10 mb-3"
              >
                <Ruler className="h-10 w-10 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">Your measurements</h2>
              <p className="text-muted-foreground">For accurate health calculations</p>
            </div>
            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <Label htmlFor="height">Height</Label>
                <div className="flex gap-2">
                  {data.heightUnit === "ft" ? (
                    <>
                      <Input id="height" type="number" min="1" max="8" placeholder="ft" value={data.height} onChange={e => setData(prev => ({ ...prev, height: e.target.value }))} className="flex-1 h-12" />
                      <Input type="number" min="0" max="11" placeholder="in" value={data.heightInches} onChange={e => setData(prev => ({ ...prev, heightInches: e.target.value }))} className="w-20 h-12" />
                    </>
                  ) : (
                    <Input id="height" type="number" placeholder="cm" value={data.height} onChange={e => setData(prev => ({ ...prev, height: e.target.value }))} className="flex-1 h-12" />
                  )}
                  <Select value={data.heightUnit} onValueChange={(v: "cm" | "ft") => setData(prev => ({ ...prev, heightUnit: v, heightInches: "" }))}>
                    <SelectTrigger className="w-24 h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cm">cm</SelectItem>
                      <SelectItem value="ft">ft/in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Label htmlFor="currentWeight">Current Weight</Label>
                <div className="flex gap-2">
                  <Input id="currentWeight" type="number" placeholder="Enter current weight" value={data.currentWeight} onChange={e => setData(prev => ({ ...prev, currentWeight: e.target.value }))} className="flex-1 h-12" />
                  <Select value={data.weightUnit} onValueChange={(v: "kg" | "lbs") => setData(prev => ({ ...prev, weightUnit: v }))}>
                    <SelectTrigger className="w-24 h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lbs">lbs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <Label htmlFor="goalWeight">Goal Weight (optional)</Label>
                <div className="flex gap-2">
                  <Input id="goalWeight" type="number" placeholder="Enter goal weight" value={data.goalWeight} onChange={e => setData(prev => ({ ...prev, goalWeight: e.target.value }))} className="flex-1 h-12" />
                </div>
              </motion.div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 250, damping: 15 }}
                className="inline-flex p-4 rounded-full bg-primary/10 mb-3"
              >
                <Globe className="h-10 w-10 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">Where are you from?</h2>
              <p className="text-muted-foreground">We'll recommend meals from your cuisine</p>
            </div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Label>Country</Label>
              <Select value={data.country} onValueChange={v => setData(prev => ({ ...prev, country: v }))}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Object.entries(COUNTRIES_BY_REGION).map(([region, countries]) => (
                    <SelectGroup key={region}>
                      <SelectLabel className="font-bold text-primary">{region}</SelectLabel>
                      {countries.map(country => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
            {data.country && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20"
              >
                <UtensilsCrossed className="h-5 w-5 text-primary" />
                <span className="text-sm text-foreground">
                  Meals inspired by <span className="font-semibold text-primary">{data.country}</span> cuisine
                </span>
              </motion.div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 250, damping: 15 }}
                className="inline-flex p-4 rounded-full bg-destructive/10 mb-3"
              >
                <ShieldAlert className="h-10 w-10 text-destructive" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">Any food allergies?</h2>
              <p className="text-muted-foreground">We'll exclude these from your meal plans</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_ALLERGIES.map((allergy, i) => (
                <motion.button
                  key={allergy.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => toggleAllergy(allergy.id)}
                  className={`p-3 rounded-xl text-left text-sm font-medium transition-all border-2 flex items-center gap-2 ${
                    data.allergies.includes(allergy.id)
                      ? 'border-destructive bg-destructive/10 text-destructive'
                      : 'border-border bg-card hover:border-muted-foreground/30 text-foreground'
                  }`}
                >
                  <span className={data.allergies.includes(allergy.id) ? 'text-destructive' : 'text-muted-foreground'}>
                    {ALLERGY_ICONS[allergy.id]}
                  </span>
                  {allergy.label}
                </motion.button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Other allergies or restrictions</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., coconut, okra..."
                  value={customAllergyInput}
                  onChange={e => setCustomAllergyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomAllergy()}
                  className="h-10"
                />
                <Button variant="outline" onClick={addCustomAllergy} disabled={!customAllergyInput.trim()} size="icon" className="h-10 w-10 shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {data.customAllergies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.customAllergies.map(allergy => (
                    <Badge
                      key={allergy}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20 gap-1"
                      onClick={() => removeCustomAllergy(allergy)}
                    >
                      {allergy}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-5">
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 250, damping: 15 }}
                className="inline-flex p-4 rounded-full bg-primary/10 mb-3"
              >
                <Clock className="h-10 w-10 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">Your daily schedule</h2>
              <p className="text-muted-foreground">We'll plan meals around your day</p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-xl border bg-card"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="font-medium">Work outside?</Label>
                  <p className="text-xs text-muted-foreground">Helps plan lunch timing</p>
                </div>
              </div>
              <Switch
                checked={data.schedule.worksOutside}
                onCheckedChange={v => setData(prev => ({ ...prev, schedule: { ...prev.schedule, worksOutside: v } }))}
              />
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'wakeUp', label: 'Wake Up', icon: <Sunrise className="h-4 w-4" />, key: 'wakeUpTime' as const },
                { id: 'breakfast', label: 'Breakfast', icon: <Coffee className="h-4 w-4" />, key: 'breakfastTime' as const },
                ...(data.schedule.worksOutside ? [{ id: 'workStart', label: 'Work Start', icon: <Briefcase className="h-4 w-4" />, key: 'workStartTime' as const }] : []),
                { id: 'lunch', label: 'Lunch', icon: <Sun className="h-4 w-4" />, key: 'lunchTime' as const },
                ...(data.schedule.worksOutside ? [{ id: 'workEnd', label: 'Work End', icon: <Briefcase className="h-4 w-4" />, key: 'workEndTime' as const }] : []),
                { id: 'dinner', label: 'Dinner', icon: <UtensilsCrossed className="h-4 w-4" />, key: 'dinnerTime' as const },
                { id: 'bedTime', label: 'Bedtime', icon: <BedDouble className="h-4 w-4" />, key: 'bedTime' as const },
              ].map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                >
                  <Label htmlFor={item.id} className="flex items-center gap-1.5 text-xs mb-1 text-muted-foreground">
                    {item.icon} {item.label}
                  </Label>
                  <Input
                    id={item.id}
                    type="time"
                    value={data.schedule[item.key]}
                    onChange={e => setData(prev => ({ ...prev, schedule: { ...prev.schedule, [item.key]: e.target.value } }))}
                    className="h-10"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-5">
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 250, damping: 15 }}
                className="inline-flex p-4 rounded-full bg-destructive/10 mb-3"
              >
                <ShieldAlert className="h-10 w-10 text-destructive" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">The "I Cheated" Rules</h2>
              <p className="text-muted-foreground">Eating or drinking any of these will reset your streak to Day 1</p>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {FIXED_CHEAT_ITEMS.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-xl border border-destructive/20 bg-destructive/5"
                >
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 cursor-pointer"
              onClick={() => setAgreedToRules(!agreedToRules)}
            >
              <Checkbox
                checked={agreedToRules}
                onCheckedChange={(checked) => setAgreedToRules(checked === true)}
              />
              <span className="text-sm font-medium text-foreground">
                I understand and agree to follow these rules
              </span>
            </motion.div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 250, damping: 15 }}
                className="inline-flex p-4 rounded-full bg-accent/10 mb-3"
              >
                <Plus className="h-10 w-10 text-accent-foreground" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">Add More Items?</h2>
              <p className="text-muted-foreground">Optionally add your own items that should also reset your streak</p>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Label>Add a custom cheat item</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="e.g., ice cream, candy..."
                  value={customCheatInput}
                  onChange={e => setCustomCheatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const trimmed = customCheatInput.trim();
                      if (trimmed && !customCheatItems.includes(trimmed)) {
                        setCustomCheatItems(prev => [...prev, trimmed]);
                        setCustomCheatInput("");
                      }
                    }
                  }}
                  className="h-12 text-base"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const trimmed = customCheatInput.trim();
                    if (trimmed && !customCheatItems.includes(trimmed)) {
                      setCustomCheatItems(prev => [...prev, trimmed]);
                      setCustomCheatInput("");
                    }
                  }}
                  disabled={!customCheatInput.trim()}
                  size="icon"
                  className="h-12 w-12 shrink-0"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>

            {customCheatItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <Label className="text-sm text-muted-foreground">Your custom items ({customCheatItems.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {customCheatItems.map(item => (
                    <Badge
                      key={item}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20 gap-1 text-sm py-1 px-3"
                      onClick={() => setCustomCheatItems(prev => prev.filter(i => i !== item))}
                    >
                      {item}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">These will be removed if you reset the app. Tap to remove.</p>
              </motion.div>
            )}

            {customCheatItems.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center text-sm text-muted-foreground py-4"
              >
                No custom items added yet. You can skip this step if you're happy with the default list.
              </motion.p>
            )}
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 250, damping: 15 }}
                className="inline-flex p-4 rounded-full bg-primary/10 mb-3"
              >
                <Mail className="h-10 w-10 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">Stay in the loop</h2>
              <p className="text-muted-foreground">Get progress reports sent to your inbox</p>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={data.email}
                onChange={e => setData(prev => ({ ...prev, email: e.target.value }))}
                className="h-12 text-base"
              />
              <p className="text-xs text-muted-foreground mt-1">Optional — we'll send your wellness reports here</p>
            </motion.div>

            {data.email.trim() && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <Label className="text-sm font-medium text-foreground">Report Preferences</Label>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center justify-between p-3 rounded-xl border bg-card"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Weekly Reports</p>
                      <p className="text-xs text-muted-foreground">Every Monday morning</p>
                    </div>
                  </div>
                  <Switch
                    checked={data.weeklyReports}
                    onCheckedChange={v => setData(prev => ({ ...prev, weeklyReports: v }))}
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-between p-3 rounded-xl border bg-card"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Monthly Reports</p>
                      <p className="text-xs text-muted-foreground">1st of every month</p>
                    </div>
                  </div>
                  <Switch
                    checked={data.monthlyReports}
                    onCheckedChange={v => setData(prev => ({ ...prev, monthlyReports: v }))}
                  />
                </motion.div>
              </motion.div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-lg my-auto">
        <CardContent className="p-6 sm:p-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="mt-6 mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Step {step + 1} of {TOTAL_STEPS}</span>
              <span>{Math.round(((step + 1) / TOTAL_STEPS) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1"
              size="lg"
              disabled={!canProceed()}
            >
              {isLastStep ? (
                <>
                  <Rocket className="h-5 w-5 mr-2" />
                  Let's Go!
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-1 h-5 w-5" />
                </>
              )}
            </Button>
          </div>

          {step === 0 && (
            <Button
              onClick={() => {
                const defaultData = getDefaultRegistration();
                defaultData.registrationCompleted = true;
                saveRegistration(defaultData);
                saveStoredData({ onboardingCompleted: true });
                onComplete();
              }}
              variant="ghost"
              className="w-full mt-2"
              size="sm"
            >
              Skip for now
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
