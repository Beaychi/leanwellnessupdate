import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Volume2, Bell, Check, Sun, Egg, Salad, UtensilsCrossed, Moon, Activity, Dumbbell } from "lucide-react";
import { 
  SOUND_OPTIONS, 
  type SoundOption, 
  isPushSupported,
  subscribeToPush,
  getSubscription,
  sendTestNotification,
} from "@/lib/push-notifications";
import { toast } from "sonner";

interface SoundSettingsProps {
  sounds: {
    breakfast: string;
    lunch: string;
    dinner: string;
    bedtime: string;
    wakeup: string;
    movement: string;
    exercise: string;
  };
  onSoundChange: (type: keyof SoundSettingsProps['sounds'], sound: SoundOption) => void;
}

// Audio context for playing preview sounds
let audioContext: AudioContext | null = null;

const SOUND_FREQUENCIES: Record<SoundOption, number[]> = {
  'chime': [523, 659, 784], // C, E, G major chord
  'bell': [440, 554, 659], // A, C#, E 
  'alarm': [880, 440, 880, 440], // Alternating high/low
  'gentle': [262, 294, 330], // Low C, D, E
  'energetic': [523, 698, 880, 1047], // Fast ascending
};

function playPreviewSound(soundId: SoundOption) {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const frequencies = SOUND_FREQUENCIES[soundId];
    const duration = soundId === 'alarm' ? 0.15 : 0.2;

    frequencies.forEach((freq, index) => {
      const oscillator = audioContext!.createOscillator();
      const gainNode = audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext!.destination);

      oscillator.frequency.value = freq;
      oscillator.type = soundId === 'gentle' ? 'sine' : soundId === 'alarm' ? 'square' : 'triangle';

      const startTime = audioContext!.currentTime + (index * duration);
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.05);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch (error) {
    console.error('Error playing preview sound:', error);
  }
}

export function SoundSettings({ sounds, onSoundChange }: SoundSettingsProps) {
  const [pushSupported, setPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    setPushSupported(isPushSupported());
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const sub = await getSubscription();
    setIsSubscribed(!!sub);
  };

  const handleEnablePush = async () => {
    setIsEnabling(true);
    try {
      const subscription = await subscribeToPush();
      if (subscription) {
        setIsSubscribed(true);
        toast.success("Push notifications enabled! You'll receive alerts even when the app is closed.");
      } else {
        toast.error("Failed to enable push notifications. Please allow notifications in your browser.");
      }
    } catch (error) {
      console.error('Error enabling push:', error);
      toast.error("Failed to enable push notifications");
    } finally {
      setIsEnabling(false);
    }
  };

  const handleTestNotification = async () => {
    const success = await sendTestNotification(
      "LeanTrack Test",
      "Your push notifications are working!"
    );
    if (success) {
      toast.success("Test notification sent!");
    } else {
      toast.error("Failed to send test notification");
    }
  };

  const soundTypes = [
    { key: 'wakeup' as const, label: 'Wake-up', icon: <Sun className="h-4 w-4" /> },
    { key: 'breakfast' as const, label: 'Breakfast', icon: <Egg className="h-4 w-4" /> },
    { key: 'lunch' as const, label: 'Lunch', icon: <Salad className="h-4 w-4" /> },
    { key: 'dinner' as const, label: 'Dinner', icon: <UtensilsCrossed className="h-4 w-4" /> },
    { key: 'bedtime' as const, label: 'Bedtime', icon: <Moon className="h-4 w-4" /> },
    { key: 'movement' as const, label: 'Movement', icon: <Activity className="h-4 w-4" /> },
    { key: 'exercise' as const, label: 'Exercise Complete', icon: <Dumbbell className="h-4 w-4" /> },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Notification Sounds
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notification Status */}
        {pushSupported && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Background Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts even when app is closed
                </p>
              </div>
              {isSubscribed ? (
                <div className="flex items-center gap-2 text-success">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Enabled</span>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  onClick={handleEnablePush}
                  disabled={isEnabling}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {isEnabling ? 'Enabling...' : 'Enable'}
                </Button>
              )}
            </div>

            {isSubscribed && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleTestNotification}
              >
                Send Test Notification
              </Button>
            )}
          </div>
        )}

        {/* Sound Selection for Each Notification Type */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-muted-foreground">
            Choose alarm tone for each reminder type
          </Label>
          
          {soundTypes.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                {label}
              </Label>
              <div className="flex flex-wrap gap-2">
                {SOUND_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    variant={sounds[key] === option.id ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      onSoundChange(key, option.id);
                      playPreviewSound(option.id);
                    }}
                  >
                    {option.name}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Preview Sounds */}
        <div className="pt-2 border-t">
          <Label className="text-sm text-muted-foreground mb-2 block">
            Preview sounds
          </Label>
          <div className="flex flex-wrap gap-2">
            {SOUND_OPTIONS.map((option) => (
              <Button
                key={option.id}
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => playPreviewSound(option.id)}
              >
                <Volume2 className="h-3 w-3 mr-1" />
                {option.name}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
