import { Crown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { UpgradeDialog } from "./UpgradeDialog";
import { useSiteSettings } from "@/hooks/useSiteData";

export const VipPromoBanner = ({ compact = false }: { compact?: boolean }) => {
  const [open, setOpen] = useState(false);
  const { data: settings } = useSiteSettings();
  const price = settings?.vip_monthly_price ?? 19.9;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative w-full overflow-hidden rounded-2xl bg-card text-left ring-1 ring-border transition-transform active:scale-[0.99]"
      >
        <div className="flex items-stretch">
          {/* Left accent bar */}
          <div className="w-1 shrink-0 gradient-primary" />

          <div className="flex flex-1 items-center gap-3 px-3.5 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Crown className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Acesso completo
              </p>
              <p className="truncate text-sm font-extrabold leading-tight">
                {compact ? "Desbloqueie tudo no VIP" : "Desbloqueie todas as modelos"}
              </p>
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                A partir de R$ {price.toFixed(2).replace(".", ",")} · ativação imediata
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>
      <UpgradeDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
