import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { requestNotificationPermission, startNotificationService, sendTestNotification } from "@/lib/notifications";
import { saveStoredData, getStoredData } from "@/lib/storage";
import { toast } from "sonner";

interface NotificationPromptProps {
  onDismiss: () => void;
}

export const NotificationPrompt = ({ onDismiss }: NotificationPromptProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEnable = async () => {
    setIsLoading(true);
    const granted = await requestNotificationPermission();
    
    if (granted) {
      const data = getStoredData();
      if (data) {
        saveStoredData({ notificationsEnabled: true });
        
        startNotificationService({
          breakfast: data.mealReminders.breakfast,
          lunch: data.mealReminders.lunch,
          dinner: data.mealReminders.dinner,
          bedtime: data.bedtime,
          wakeupTime: data.wakeupTime || '06:00',
          movementInterval: 20,
        }, data.movementReminders);
        
        sendTestNotification();
        toast.success("Notifications enabled!");
      }
      onDismiss();
    } else {
      toast.error("Please enable notifications in your browser settings.");
    }
    
    setIsLoading(false);
  };

  return (
    <Card className="mb-6 border-primary/50 bg-gradient-to-r from-primary/10 to-accent/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Stay on Track with Reminders</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Enable notifications to receive timely reminders for:
        </p>
        <ul className="text-sm space-y-1 ml-4">
          <li>• Breakfast, lunch & dinner times</li>
          <li>• Movement breaks every 20 minutes</li>
          <li>• Bedtime wind-down reminders</li>
        </ul>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleEnable} disabled={isLoading} className="flex-1">
            {isLoading ? "Enabling..." : "Enable Notifications"}
          </Button>
          <Button variant="outline" onClick={onDismiss}>
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
