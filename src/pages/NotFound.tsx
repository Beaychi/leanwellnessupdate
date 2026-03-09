import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 pb-24">
      {/* Animated icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-primary/10">
          <MapPinOff className="h-14 w-14 text-primary" strokeWidth={1.5} />
        </div>
      </div>

      {/* Error text */}
      <h1 className="mb-2 text-6xl font-extrabold tracking-tight text-foreground">404</h1>
      <p className="mb-1 text-lg font-semibold text-foreground">Page Not Found</p>
      <p className="mb-8 max-w-xs text-center text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has been moved. Let's get you back on track!
      </p>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          onClick={() => navigate("/")}
          className="w-full gap-2"
          size="lg"
        >
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="w-full gap-2"
          size="lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
      </div>

      {/* Decorative path */}
      <p className="mt-10 text-xs text-muted-foreground/50 font-mono break-all max-w-xs text-center">
        {location.pathname}
      </p>
    </div>
  );
};

export default NotFound;
