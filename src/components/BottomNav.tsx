import { Home, Compass, Zap, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MenuPanel } from "./MenuPanel";

interface BottomNavProps {
  active?: "home" | "explore" | "shorts";
  onChange?: (key: "home" | "explore" | "shorts") => void;
}

export const BottomNav = ({ active, onChange }: BottomNavProps = {}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Read active from window event-style fallback (parent controls via prop)
  const items = [
    { key: "home" as const, label: "Início", icon: Home },
    { key: "explore" as const, label: "Explorar", icon: Compass },
    { key: "shorts" as const, label: "Shorts", icon: Zap },
  ];

  return (
    <>
      <nav className="pointer-events-none fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 px-4 pb-4 safe-bottom">
        <div className="pointer-events-auto glass shadow-floating mx-auto flex items-center justify-around rounded-full border border-border/40 px-2 py-2">
          {items.map(({ key, label, icon: Icon }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => onChange?.(key)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-full px-4 py-2 transition-all duration-300",
                  isActive ? "bg-primary text-primary-foreground shadow-button scale-105" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={label}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn("text-[10px] font-semibold", isActive ? "opacity-100" : "opacity-80")}>
                  {label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 rounded-full px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
            <span className="text-[10px] font-semibold opacity-80">Menu</span>
          </button>
        </div>
      </nav>
      <MenuPanel open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
};
