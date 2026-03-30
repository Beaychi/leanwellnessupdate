import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, Moon, Sun, Palette, Mail, Send, Camera, Pencil, Save, CheckCircle2
} from "lucide-react";
import { getStoredData, saveStoredData, getDefaultData } from "@/lib/storage";
import { toast } from "sonner";
import { startNotificationService } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { gatherExportData } from "@/lib/export-data";
import MeasurementsTracker from "@/components/MeasurementsTracker";
import BMICalculator from "@/components/BMICalculator";

const PROFILE_STORAGE_KEY = "leantrack_profile";

interface UserProfile {
  fullName: string;
  age: string;
  gender: string;
  height: string;
  heightInches: string;
  heightUnit: "cm" | "ft";
  goalWeight: string;
  weightUnit: "kg" | "lbs";
  avatar: string | null;
}

const getProfile = (): UserProfile => {
  try {
    const data = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { fullName: "", age: "", gender: "", height: "", heightInches: "", heightUnit: "cm", goalWeight: "", weightUnit: "kg", avatar: null };
};

const saveProfile = (profile: UserProfile) => {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
};

export default function Profile() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState(getStoredData() || getDefaultData());
  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [editProfile, setEditProfile] = useState<UserProfile>(profile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Email reports state
  const [email, setEmail] = useState("");
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState(true);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [emailSubscriptionId, setEmailSubscriptionId] = useState<string | null>(null);
  const [savedEmail, setSavedEmail] = useState("");
  const [savedWeeklyReports, setSavedWeeklyReports] = useState(true);
  const [savedMonthlyReports, setSavedMonthlyReports] = useState(true);

  useEffect(() => {
    const data = getStoredData();
    if (data) setSettings(data);
    initEmail();
  }, []);

  const initEmail = async () => {
    try {
      const { data } = await supabase
        .from('email_subscriptions')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data?.email) {
        setEmail(data.email);
        setWeeklyReports(data.weekly_reports);
        setMonthlyReports(data.monthly_reports);
        setEmailSubscriptionId(data.id);
        setSavedEmail(data.email);
        setSavedWeeklyReports(data.weekly_reports);
        setSavedMonthlyReports(data.monthly_reports);
        return;
      }
    } catch (error) {
      console.error('Error loading email subscription:', error);
    }

    // Fall back to registration data if no Supabase record found
    try {
      const regData = localStorage.getItem('leantrack_registration');
      if (regData) {
        const reg = JSON.parse(regData);
        if (reg.email?.trim()) {
          setEmail(reg.email);
          setWeeklyReports(reg.weeklyReports ?? true);
          setMonthlyReports(reg.monthlyReports ?? true);
        }
      }
    } catch {}
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) { toast.error("Please enter a valid email address"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { toast.error("Please enter a valid email address"); return; }
    const isUnchanged = email === savedEmail && weeklyReports === savedWeeklyReports && monthlyReports === savedMonthlyReports;
    if (isUnchanged && emailSubscriptionId) { toast.info("Preferences already saved"); return; }
    setIsSavingEmail(true);
    try {
      const isFirstSave = !emailSubscriptionId;
      const { data, error } = await supabase
        .from('email_subscriptions')
        .upsert({ email, weekly_reports: weeklyReports, monthly_reports: monthlyReports }, { onConflict: 'email' })
        .select().single();
      if (error) throw error;
      setEmailSubscriptionId(data.id);
      setSavedEmail(email);
      setSavedWeeklyReports(weeklyReports);
      setSavedMonthlyReports(monthlyReports);
      toast.success(isFirstSave ? "Email preferences saved!" : "Preferences updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save email preferences");
    } finally { setIsSavingEmail(false); }
  };

  const handleSendReport = async (reportType: "weekly" | "monthly") => {
    if (!email.trim()) { toast.error("Please save your email first"); return; }
    setIsSendingReport(true);
    try {
      const reportData = gatherExportData();
      const { error } = await supabase.functions.invoke('send-email-report', {
        body: { email, reportType, reportData, subscriptionId: emailSubscriptionId }
      });
      if (error) throw error;
      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report sent to ${email}!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to send report");
    } finally { setIsSendingReport(false); }
  };

  const handleUnsubscribe = async () => {
    if (!emailSubscriptionId) { toast.info("No subscription to remove"); return; }
    setIsSavingEmail(true);
    try {
      const { error } = await supabase.from('email_subscriptions').delete().eq('id', emailSubscriptionId);
      if (error) throw error;
      setEmail(""); setWeeklyReports(true); setMonthlyReports(true);
      setEmailSubscriptionId(null); setSavedEmail(""); setSavedWeeklyReports(true); setSavedMonthlyReports(true);
      toast.success("Successfully unsubscribed from email reports");
    } catch (error: any) {
      toast.error(error.message || "Failed to unsubscribe");
    } finally { setIsSavingEmail(false); }
  };

  const handleBedtimeChange = (time: string) => {
    saveStoredData({ bedtime: time });
    setSettings({ ...settings, bedtime: time });
    if (settings.notificationsEnabled) {
      startNotificationService({ breakfast: settings.mealReminders.breakfast, lunch: settings.mealReminders.lunch, dinner: settings.mealReminders.dinner, bedtime: time, wakeupTime: settings.wakeupTime, movementInterval: settings.movementInterval || 45 }, settings.movementReminders);
    }
    toast.success("Bedtime updated!");
  };

  const handleWakeupTimeChange = (time: string) => {
    saveStoredData({ wakeupTime: time });
    setSettings({ ...settings, wakeupTime: time });
    if (settings.notificationsEnabled) {
      startNotificationService({ breakfast: settings.mealReminders.breakfast, lunch: settings.mealReminders.lunch, dinner: settings.mealReminders.dinner, bedtime: settings.bedtime, wakeupTime: time, movementInterval: settings.movementInterval || 45 }, settings.movementReminders);
    }
    toast.success("Wake-up time updated!");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setEditProfile(prev => ({ ...prev, avatar: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    const trimmed = { ...editProfile, fullName: editProfile.fullName.trim() };
    if (trimmed.fullName.length > 100) { toast.error("Name must be under 100 characters"); return; }
    saveProfile(trimmed);
    setProfile(trimmed);
    setIsEditing(false);
    toast.success("Profile saved!");
  };

  const startEditing = () => {
    setEditProfile({ ...profile });
    setIsEditing(true);
  };

  const initials = profile.fullName
    ? profile.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Header with avatar */}
      <div className="bg-primary text-primary-foreground p-6 rounded-b-3xl mb-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden border-2 border-primary-foreground/40">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
              )}
            </div>
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-md"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.fullName || "Your Profile"}</h1>
            <p className="text-primary-foreground/80 text-sm">
              {profile.age ? `${profile.age} yrs` : ""}{profile.age && profile.gender ? " · " : ""}{profile.gender || ""}
              {profile.height ? ` · ${profile.heightUnit === "ft" ? `${profile.height}'${profile.heightInches || 0}"` : `${profile.height} cm`}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={isEditing ? handleSaveProfile : startEditing}
          >
            {isEditing ? <Save className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Personal Info (edit mode) */}
        {isEditing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" placeholder="Enter your full name" value={editProfile.fullName} onChange={e => setEditProfile(prev => ({ ...prev, fullName: e.target.value }))} maxLength={100} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" min="1" max="120" placeholder="Age" value={editProfile.age} onChange={e => setEditProfile(prev => ({ ...prev, age: e.target.value }))} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={editProfile.gender} onValueChange={v => setEditProfile(prev => ({ ...prev, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height">Height</Label>
                  <div className="flex gap-2">
                    {editProfile.heightUnit === "ft" ? (
                      <>
                        <Input id="height" type="number" min="1" max="8" placeholder="ft" value={editProfile.height} onChange={e => setEditProfile(prev => ({ ...prev, height: e.target.value }))} className="flex-1" />
                        <Input type="number" min="0" max="11" placeholder="in" value={editProfile.heightInches} onChange={e => setEditProfile(prev => ({ ...prev, heightInches: e.target.value }))} className="w-16" />
                      </>
                    ) : (
                      <Input id="height" type="number" placeholder="cm" value={editProfile.height} onChange={e => setEditProfile(prev => ({ ...prev, height: e.target.value }))} className="flex-1" />
                    )}
                    <Select value={editProfile.heightUnit} onValueChange={(v: "cm" | "ft") => setEditProfile(prev => ({ ...prev, heightUnit: v, heightInches: "" }))}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="ft">ft/in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="goalWeight">Goal Weight</Label>
                  <div className="flex gap-2">
                    <Input id="goalWeight" type="number" placeholder="Goal" value={editProfile.goalWeight} onChange={e => setEditProfile(prev => ({ ...prev, goalWeight: e.target.value }))} className="flex-1" />
                    <Select value={editProfile.weightUnit} onValueChange={(v: "kg" | "lbs") => setEditProfile(prev => ({ ...prev, weightUnit: v }))}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="lbs">lbs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSaveProfile}>
                  <Save className="h-4 w-4 mr-2" /> Save Profile
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile summary when not editing */}
        {!isEditing && (profile.fullName || profile.goalWeight) && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {profile.age && (
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Age</p>
                    <p className="text-lg font-bold">{profile.age}</p>
                  </div>
                )}
                {profile.gender && (
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Gender</p>
                    <p className="text-lg font-bold">{profile.gender}</p>
                  </div>
                )}
                {profile.height && (
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Height</p>
                    <p className="text-lg font-bold">{profile.heightUnit === "ft" ? `${profile.height}'${profile.heightInches || 0}"` : `${profile.height} cm`}</p>
                  </div>
                )}
                {profile.goalWeight && (
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Goal Weight</p>
                    <p className="text-lg font-bold">{profile.goalWeight} <span className="text-xs">{profile.weightUnit}</span></p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* BMI Calculator */}
        <BMICalculator heightValue={profile.height} heightInches={profile.heightInches} heightUnit={profile.heightUnit} />

        {/* Body Measurements */}
        <MeasurementsTracker />

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
              </div>
              <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-full">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sleep Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Sleep Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="wakeup">Wake-up Time</Label>
              <p className="text-sm text-muted-foreground mb-2">Start your day right</p>
              <Input id="wakeup" type="time" value={settings.wakeupTime} onChange={e => handleWakeupTimeChange(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="bedtime">Bedtime</Label>
              <p className="text-sm text-muted-foreground mb-2">We'll remind you to wind down</p>
              <Input id="bedtime" type="time" value={settings.bedtime} onChange={e => handleBedtimeChange(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Email Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Your Email</Label>
              <p className="text-sm text-muted-foreground mb-2">Receive weekly and monthly progress reports</p>
              <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label htmlFor="weekly-reports">Weekly Reports</Label><p className="text-sm text-muted-foreground">Get a summary every week</p></div>
              <Switch id="weekly-reports" checked={weeklyReports} onCheckedChange={setWeeklyReports} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label htmlFor="monthly-reports">Monthly Reports</Label><p className="text-sm text-muted-foreground">Get a summary every month</p></div>
              <Switch id="monthly-reports" checked={monthlyReports} onCheckedChange={setMonthlyReports} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSaveEmail} disabled={isSavingEmail}>{isSavingEmail ? "Saving..." : "Save Email Preferences"}</Button>
              {emailSubscriptionId && <Button variant="destructive" onClick={handleUnsubscribe} disabled={isSavingEmail}>Unsubscribe</Button>}
            </div>
            {emailSubscriptionId && <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1"><CheckCircle2 className="h-4 w-4 text-success" /> Reports will be sent automatically based on your preferences</p>}
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Send Report Now</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleSendReport("weekly")} disabled={isSendingReport || !email}><Send className="mr-2 h-4 w-4" />Weekly</Button>
                <Button variant="outline" className="flex-1" onClick={() => handleSendReport("monthly")} disabled={isSendingReport || !email}><Send className="mr-2 h-4 w-4" />Monthly</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
