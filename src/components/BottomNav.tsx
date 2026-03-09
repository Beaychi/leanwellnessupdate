import { NavLink } from "@/components/NavLink";
import { Home, Utensils, Dumbbell, TrendingUp, Settings, User } from "lucide-react";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/meals", icon: Utensils, label: "Meals" },
  { to: "/exercises", icon: Dumbbell, label: "Exercise" },
  { to: "/progress", icon: TrendingUp, label: "Progress" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
