import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem("pwa_install_dismissed");
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 3) {
        return; // Don't show for 3 days after dismissal
      }
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Show on iOS after a delay
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      // iOS or other - go to install page
      navigate("/install");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-2 rounded-lg shrink-0">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Install LeanTrack</h3>
            <p className="text-xs text-muted-foreground">
              Add to home screen for notifications & offline access
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handleInstall}>
              Install
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
