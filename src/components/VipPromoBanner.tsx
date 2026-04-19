import { Crown, Sparkles } from "lucide-react";
import { useState } from "react";
import { UpgradeDialog } from "./UpgradeDialog";

export const VipPromoBanner = ({ compact = false }: { compact?: boolean }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-full overflow-hidden rounded-2xl gradient-primary p-[1.5px] text-left shadow-button transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 rounded-[15px] bg-background/95 px-4 py-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-glow">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Acesso VIP
            </p>
            <p className="truncate text-sm font-extrabold">
              {compact ? "Mais de 10.000 vídeos sem limite" : "Veja completo no nosso VIP"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Mais de 10.000 vídeos · sem propagandas · acesso total
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full gradient-primary px-3 py-1.5 text-[11px] font-extrabold text-primary-foreground">
            <Sparkles className="h-3 w-3" /> Assinar
          </div>
        </div>
      </button>
      <UpgradeDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
