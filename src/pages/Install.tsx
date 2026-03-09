import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Check, Smartphone, Bell, Wifi, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: Smartphone,
      title: "Works Like a Native App",
      description: "Install on your home screen for quick access",
    },
    {
      icon: Bell,
      title: "Background Notifications",
      description: "Get meal reminders and movement alerts",
    },
    {
      icon: Wifi,
      title: "Works Offline",
      description: "Access your meal plan even without internet",
    },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary via-primary to-accent text-white p-6 rounded-b-3xl mb-6">
        <div className="max-w-4xl mx-auto text-center">
          <Download className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Install LeanTrack</h1>
          <p className="text-white/90">Get the full app experience on your phone</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {isInstalled ? (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-6 text-center">
              <Check className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h2 className="text-xl font-bold mb-2">Already Installed!</h2>
              <p className="text-muted-foreground mb-4">
                LeanTrack is installed on your device. Enjoy the full app experience!
              </p>
              <Button onClick={() => navigate("/")}>
                Go to Home
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Features */}
            <div className="grid gap-4">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Install Button or Instructions */}
            {deferredPrompt ? (
              <Button onClick={handleInstall} className="w-full h-14 text-lg" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Install App
              </Button>
            ) : isIOS ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share className="h-5 w-5" />
                    Install on iPhone/iPad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">
                        1
                      </div>
                      <p className="text-sm">
                        Tap the <strong>Share</strong> button at the bottom of Safari
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">
                        2
                      </div>
                      <p className="text-sm">
                        Scroll down and tap <strong>"Add to Home Screen"</strong>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">
                        3
                      </div>
                      <p className="text-sm">
                        Tap <strong>"Add"</strong> in the top right corner
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Install from Browser</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    To install LeanTrack on Android:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">
                        1
                      </div>
                      <p className="text-sm">
                        Tap the <strong>menu icon</strong> (⋮) in your browser
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">
                        2
                      </div>
                      <p className="text-sm">
                        Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">
                        3
                      </div>
                      <p className="text-sm">
                        Confirm by tapping <strong>"Install"</strong>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Maybe Later
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
