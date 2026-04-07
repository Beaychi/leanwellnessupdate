import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ConfirmDialog";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  RotateCcw, 
  Bell, 
  Clock,
  AlertCircle,
  Settings as SettingsIcon,
  Lightbulb,
  Download,
  Mail,
  Loader2,
  Trash2,
  FileSpreadsheet,
  Palette,
  Sun,
  Moon,
} from "lucide-react";
import { getStoredData, saveStoredData, resetCycle, getDefaultData, type SoundSettings as SoundSettingsType } from "@/lib/storage";
import { toast } from "sonner";
import { 
  requestNotificationPermission, 
  startNotificationService, 
  stopNotificationService,
  sendTestNotification 
} from "@/lib/notifications";
import { subscribeToPush, getSubscription, saveNotificationSettings, unsubscribeFromPush, type SoundOption } from "@/lib/push-notifications";
import { gatherExportData, downloadCSV } from "@/lib/export-data";
import { useTheme } from "next-themes";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState(getStoredData() || getDefaultData());
  const [showResetCycleDialog, setShowResetCycleDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isSendingExport, setIsSendingExport] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  

  useEffect(() => {
    const data = getStoredData();
    if (data) setSettings(data);
  }, []);

  const handleResetCycle = () => setShowResetCycleDialog(true);

  const confirmResetCycle = () => {
    resetCycle();
    toast.success("7-day cycle has been reset!");
    setShowResetCycleDialog(false);
    navigate("/");
  };

  const getEmailFromStorage = (): string => {
    try {
      const reg = localStorage.getItem('leantrack_registration');
      if (reg) {
        const parsed = JSON.parse(reg);
        if (parsed.email) return parsed.email;
      }
    } catch {}
    return '';
  };

  const clearAllData = async () => {
    setIsResetting(true);
    const keysToRemove = [
      'leantrack_data',
      'leantrack_profile',
      'leantrack_registration',
      'leantrack_meal_plan',
      'leantrack_fasting',
      'leantrack_fasting_notifications',
      'leantrack_device_id',
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));

    try {
      await supabase.from('food_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('notification_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // email_subscriptions and push_subscriptions DELETE restricted to service_role; skip client-side cleanup
      localStorage.removeItem('leantrack_email_prefs');
    } catch (error) {
      console.error('Error clearing cloud data:', error);
    }

    // Unregister service workers and clear caches to prevent 404
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    } catch (e) {
      console.error('Error clearing SW/caches:', e);
    }

    toast.success("App reset! Refreshing...");
    setShowResetDialog(false);
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };

  const handleExportAndReset = async () => {
    const email = getEmailFromStorage();
    if (!email) {
      toast.error("No email found. Download your data instead.");
      return;
    }

    setIsSendingExport(true);
    try {
      const reportData = gatherExportData();
      const { error } = await supabase.functions.invoke('send-email-report', {
        body: { email, reportType: 'final-export', reportData },
      });
      if (error) throw error;
      toast.success(`Report sent to ${email}! Now resetting...`);
      
      // Wait a moment then reset
      setTimeout(() => clearAllData(), 1500);
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error("Failed to send report. You can still download locally.");
      setIsSendingExport(false);
    }
  };

  const handleDownloadAndReset = () => {
    downloadCSV();
    toast.success("Data downloaded! Now resetting...");
    setTimeout(() => clearAllData(), 1500);
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        saveStoredData({ notificationsEnabled: true });
        setSettings({ ...settings, notificationsEnabled: true });
        startNotificationService({
          breakfast: settings.mealReminders.breakfast,
          lunch: settings.mealReminders.lunch,
          dinner: settings.mealReminders.dinner,
          bedtime: settings.bedtime,
          wakeupTime: settings.wakeupTime,
          movementInterval: settings.movementInterval || 45,
        }, settings.movementReminders);
        sendTestNotification();

        // Subscribe to Web Push for background notifications
        try {
          const subscription = await subscribeToPush();
          if (subscription) {
            await saveNotificationSettings(subscription.endpoint, {
              notifications_enabled: true,
              breakfast_time: settings.mealReminders.breakfast,
              lunch_time: settings.mealReminders.lunch,
              dinner_time: settings.mealReminders.dinner,
              bedtime: settings.bedtime,
              wakeup_time: settings.wakeupTime,
              movement_enabled: settings.movementReminders,
              movement_interval: settings.movementInterval || 45,
            });
            console.log('Push subscription and settings synced to backend');
          }
        } catch (e) {
          console.error('Failed to set up background push:', e);
        }

        toast.success("Notifications enabled! You'll get reminders even when the app is closed.");
      } else {
        toast.error("Please enable notifications in your browser settings to continue.");
      }
    } else {
      saveStoredData({ notificationsEnabled: false });
      setSettings({ ...settings, notificationsEnabled: false });
      stopNotificationService();

      // Disable background push
      try {
        const subscription = await getSubscription();
        if (subscription) {
          await saveNotificationSettings(subscription.endpoint, {
            notifications_enabled: false,
          });
        }
      } catch (e) {
        console.error('Failed to disable background push:', e);
      }

      toast.success("Notifications disabled");
    }
  };

  const handleMealTimeChange = (meal: 'breakfast' | 'lunch' | 'dinner', time: string) => {
    const newReminders = { ...settings.mealReminders, [meal]: time };
    saveStoredData({ mealReminders: newReminders });
    setSettings({ ...settings, mealReminders: newReminders });
    if (settings.notificationsEnabled) {
      startNotificationService({
        breakfast: meal === 'breakfast' ? time : settings.mealReminders.breakfast,
        lunch: meal === 'lunch' ? time : settings.mealReminders.lunch,
        dinner: meal === 'dinner' ? time : settings.mealReminders.dinner,
        bedtime: settings.bedtime,
        wakeupTime: settings.wakeupTime,
        movementInterval: settings.movementInterval || 45,
      }, settings.movementReminders);
    }
    toast.success(`${meal.charAt(0).toUpperCase() + meal.slice(1)} time updated!`);

    // Sync to backend for background notifications
    syncSettingsToBackend({ [`${meal}_time`]: time });
  };

  const syncSettingsToBackend = async (partialSettings: Record<string, any>) => {
    try {
      const subscription = await getSubscription();
      if (subscription) {
        await saveNotificationSettings(subscription.endpoint, partialSettings);
      }
    } catch (e) {
      console.error('Failed to sync settings to backend:', e);
    }
  };

  const handleToggleMovementReminders = (enabled: boolean) => {
    saveStoredData({ movementReminders: enabled });
    setSettings({ ...settings, movementReminders: enabled });
    if (settings.notificationsEnabled) {
      startNotificationService({
        breakfast: settings.mealReminders.breakfast,
        lunch: settings.mealReminders.lunch,
        dinner: settings.mealReminders.dinner,
        bedtime: settings.bedtime,
        wakeupTime: settings.wakeupTime,
        movementInterval: settings.movementInterval || 45,
      }, enabled);
    }
    syncSettingsToBackend({ movement_enabled: enabled });
    toast.success(enabled ? "Movement reminders enabled!" : "Movement reminders disabled");
  };

  const handleMovementIntervalChange = (interval: number) => {
    saveStoredData({ movementInterval: interval });
    setSettings({ ...settings, movementInterval: interval });
    if (settings.notificationsEnabled && settings.movementReminders) {
      startNotificationService({
        breakfast: settings.mealReminders.breakfast,
        lunch: settings.mealReminders.lunch,
        dinner: settings.mealReminders.dinner,
        bedtime: settings.bedtime,
        wakeupTime: settings.wakeupTime,
        movementInterval: interval,
      }, settings.movementReminders);
    }
    toast.success(`Movement reminder set to every ${interval} minutes`);
  };


  const savedEmail = getEmailFromStorage();

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <div className="bg-primary text-primary-foreground p-6 rounded-b-3xl mb-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-primary-foreground/90">Customize your LeanTrack experience</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications">Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">Get reminders for meals and activities</p>
              </div>
              <Switch
                id="notifications"
                checked={settings.notificationsEnabled}
                onCheckedChange={handleToggleNotifications}
              />
            </div>

            {settings.notificationsEnabled && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="breakfast-time">Breakfast Time</Label>
                    <Input id="breakfast-time" type="time" value={settings.mealReminders.breakfast} onChange={(e) => handleMealTimeChange('breakfast', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="lunch-time">Lunch Time</Label>
                    <Input id="lunch-time" type="time" value={settings.mealReminders.lunch} onChange={(e) => handleMealTimeChange('lunch', e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="dinner-time">Dinner Time</Label>
                    <Input id="dinner-time" type="time" value={settings.mealReminders.dinner} onChange={(e) => handleMealTimeChange('dinner', e.target.value)} className="mt-1" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="movement-reminders">Movement Reminders</Label>
                      <p className="text-sm text-muted-foreground">Get reminded to move during work hours (9 AM - 6 PM)</p>
                    </div>
                    <Switch id="movement-reminders" checked={settings.movementReminders} onCheckedChange={handleToggleMovementReminders} />
                  </div>
                  {settings.movementReminders && (
                    <div>
                      <Label htmlFor="movement-interval">Reminder Interval</Label>
                      <select id="movement-interval" value={settings.movementInterval || 45} onChange={(e) => handleMovementIntervalChange(parseInt(e.target.value))} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value={15}>Every 15 minutes</option>
                        <option value={20}>Every 20 minutes</option>
                        <option value={30}>Every 30 minutes</option>
                        <option value={45}>Every 45 minutes</option>
                        <option value={60}>Every 60 minutes</option>
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}

          </CardContent>
        </Card>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Cycle Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Started on: <span className="font-medium text-foreground">
                  {new Date(settings.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleResetCycle}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restart 7-Day Cycle
            </Button>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              App Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="destructive" className="w-full" onClick={() => setShowResetDialog(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset App Completely
            </Button>
            <div className="bg-muted/30 p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                LeanTrack v1.0 • Made by Beaychi
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="p-6 text-center">
            <Lightbulb className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-bold mb-2">Pro Tips</h3>
            <ul className="text-sm text-left space-y-2">
              <li>• Set meal reminders 10-15 minutes before your usual eating time</li>
              <li>• Enable bedtime alerts to maintain a consistent sleep schedule</li>
              <li>• Reset the cycle only if you need to start fresh with Day 1</li>
            </ul>
          </CardContent>
        </Card>

        {/* Confirmation Dialogs */}
        <ConfirmDialog open={showResetCycleDialog} onOpenChange={setShowResetCycleDialog} title="Restart 7-Day Cycle?" description="This will reset your progress and start from Day 1. Your meal and exercise history will be kept." confirmText="Restart Cycle" onConfirm={confirmResetCycle} variant="destructive" />

        {/* Reset App Dialog with export options */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Reset App Completely
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                This will clear <span className="font-semibold text-foreground">ALL</span> your data — meals, exercises, weight, fasting history, and settings. This cannot be undone.
              </p>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Save your data first?</p>

                {savedEmail && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-auto py-3"
                    onClick={handleExportAndReset}
                    disabled={isSendingExport || isResetting}
                  >
                    {isSendingExport ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Mail className="h-5 w-5 text-primary" />
                    )}
                    <div className="text-left">
                      <div className="font-medium">Email report & reset</div>
                      <div className="text-xs text-muted-foreground">Send Excel report to {savedEmail}</div>
                    </div>
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-auto py-3"
                  onClick={handleDownloadAndReset}
                  disabled={isSendingExport || isResetting}
                >
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Download CSV & reset</div>
                    <div className="text-xs text-muted-foreground">Save file to your device</div>
                  </div>
                </Button>

                <Separator />

                <Button
                  variant="destructive"
                  className="w-full justify-start gap-2 h-auto py-3"
                  onClick={clearAllData}
                  disabled={isSendingExport || isResetting}
                >
                  {isResetting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">Reset without saving</div>
                    <div className="text-xs text-destructive-foreground/70">All data will be permanently deleted</div>
                  </div>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
