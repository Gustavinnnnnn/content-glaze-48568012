import { useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteData";
import { UpgradeDialog } from "./UpgradeDialog";

/**
 * Floating VIP CTA fixed above the BottomNav.
 * Visible on every screen for non-VIP users to constantly nudge upgrade.
 */
export const VipFloatingButton = () => {
  const { vip } = useAuth();
  const { data: settings } = useSiteSettings();
  const [open, setOpen] = useState(false);

  if (vip.isVip) return null;
  const price = settings?.vip_monthly_price ?? 19.9;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 mx-auto flex w-full max-w-[480px] justify-center px-4 animate-fade-in">
        <button
          onClick={() => setOpen(true)}
          className="pointer-events-auto group relative flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[hsl(20_95%_55%)] via-[hsl(15_92%_50%)] to-[hsl(0_85%_48%)] px-4 py-2.5 text-white shadow-floating transition-transform active:scale-[0.96]"
          aria-label="Assinar VIP"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
            <Crown className="h-4 w-4" />
          </div>
          <div className="text-left leading-tight">
            <p className="text-[9px] font-extrabold uppercase tracking-wider opacity-90">
              Acesso total
            </p>
            <p className="text-xs font-extrabold">
              VIP por R$ {price.toFixed(2).replace(".", ",")}
            </p>
          </div>
          <Sparkles className="h-3.5 w-3.5 opacity-90" />
        </button>
      </div>
      <UpgradeDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
