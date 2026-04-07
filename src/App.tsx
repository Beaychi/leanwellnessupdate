import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import Home from "./pages/Home";
import Meals from "./pages/Meals";
import RecipeDetails from "./pages/RecipeDetails";
import Exercises from "./pages/Exercises";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import { Registration } from "./components/Registration";
import { BottomNav } from "./components/BottomNav";
import { getStoredData, getDefaultData, saveStoredData } from "./lib/storage";
import { getRegistration } from "./lib/registration";
import { startNotificationService, initializeNotificationTracking } from "./lib/notifications";
import { registerServiceWorker } from "./lib/push-notifications";
import { stopExerciseTimerNotification, stopFastingTimerNotification } from "./lib/timer-notifications";

const queryClient = new QueryClient();

const App = () => {
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    const data = getStoredData();
    const registration = getRegistration();
    if (!data) {
      saveStoredData(getDefaultData());
      setShowRegistration(true);
    } else if (!data.onboardingCompleted) {
      // First time or never finished onboarding — show registration
      setShowRegistration(true);
    } else if (!registration?.registrationCompleted && !registration?.skippedRegistration) {
      // Has onboarding but somehow has no registration state — show it
      setShowRegistration(true);
    }
    // If user skipped (skippedRegistration: true), we don't auto-show.
    // They can trigger it manually from their Profile page.

    // Listen for manual re-trigger from Profile page
    const handleShowRegistration = () => setShowRegistration(true);
    window.addEventListener('showRegistration', handleShowRegistration);

    // Register service worker for push notifications
    registerServiceWorker();

    initializeNotificationTracking();

    if (data?.notificationsEnabled) {
      startNotificationService({
        breakfast: data.mealReminders.breakfast,
        lunch: data.mealReminders.lunch,
        dinner: data.mealReminders.dinner,
        bedtime: data.bedtime,
        wakeupTime: data.wakeupTime || '06:00',
        movementInterval: data.movementInterval || 45,
      }, data.movementReminders);
    }

    return () => window.removeEventListener('showRegistration', handleShowRegistration);
  }, []);

  // Listen for service worker timer action messages (from notification buttons)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'TIMER_ACTION') {
        const { action } = event.data;
        // Forward to whichever timer is active (ExerciseTimer / FastingTimer listen for this)
        window.dispatchEvent(new CustomEvent('timerNotificationAction', { detail: { action } }));
        if (action === 'stop' || action === 'cancel') {
          stopExerciseTimerNotification();
          stopFastingTimerNotification();
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {showRegistration && (
              <Registration onComplete={() => {
                setShowRegistration(false);
                window.location.href = '/';
              }} />
            )}
            <div className={showRegistration ? "hidden" : ""}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/meals" element={<Meals />} />
                <Route path="/recipe/:mealId" element={<RecipeDetails />} />
                <Route path="/exercises" element={<Exercises />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/install" element={<Install />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <BottomNav />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
