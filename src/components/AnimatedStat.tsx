import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedStatProps {
  value: string | number;
  className?: string;
  children?: React.ReactNode;
}

export function AnimatedStat({ value, className, children }: AnimatedStatProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    // Only animate if value actually changed (not on initial render)
    if (prevValueRef.current !== value && prevValueRef.current !== undefined) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value]);

  return (
    <div
      className={cn(
        "transition-all duration-300",
        isAnimating && "animate-number-pop text-primary",
        className
      )}
    >
      {children ?? value}
    </div>
  );
}

interface AnimatedCardProps {
  value: string | number;
  className?: string;
  children: React.ReactNode;
}

export function AnimatedCard({ value, className, children }: AnimatedCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value && prevValueRef.current !== undefined) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 800);
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value]);

  return (
    <div
      className={cn(
        "transition-all duration-300",
        isAnimating && "animate-stat-highlight",
        className
      )}
    >
      {children}
    </div>
  );
}
