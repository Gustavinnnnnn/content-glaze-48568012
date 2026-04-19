import { useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { UpgradeDialog } from "./UpgradeDialog";
import { useSiteSettings } from "@/hooks/useSiteData";
import { useAuth } from "@/contexts/AuthContext";

interface VipHeroBannerProps {
  headline?: string;
  subline?: string;
}

/**
 * Hero CTA shown at the top of Home/Explore promoting the GLOBAL VIP access.
 * One payment unlocks everything (all models + all content).
 */
export const VipHeroBanner = ({
  headline = "O maior acervo de modelos do Privacy do Brasil",
  subline = "Pague uma vez e libere TUDO — todas as modelos, todos os vídeos.",
}: VipHeroBannerProps) => {
  const [open, setOpen] = useState(false);
  const { data: settings } = useSiteSettings();
  const { vip } = useAuth();
  const price = settings?.vip_monthly_price ?? 19.9;

  if (vip.isVip) return null;

  return (
    <>
      <section className="px-3 pt-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(20_95%_55%)] via-[hsl(15_92%_50%)] to-[hsl(0_85%_48%)] p-4 text-white shadow-floating">
          {/* Glow blobs */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-yellow-300/20 blur-2xl" />

          <div className="relative">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] opacity-95">
                Acesso global · 1 pagamento
              </span>
            </div>
            <h2 className="mt-1.5 text-[17px] font-extrabold leading-tight drop-shadow-sm">
              {headline}
            </h2>
            <p className="mt-1 text-[11px] font-medium leading-snug opacity-95">
              {subline}
            </p>

            <button
              onClick={() => setOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-extrabold text-[hsl(15_92%_45%)] shadow-button transition-transform active:scale-[0.98]"
            >
              <Crown className="h-4 w-4" />
              <span>Acesso VIP · R$ {price.toFixed(2).replace(".", ",")}</span>
            </button>
            <p className="mt-1.5 text-center text-[10px] font-semibold opacity-90">
              Ativação imediata · Cancele quando quiser
            </p>
          </div>
        </div>
      </section>
      <UpgradeDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
