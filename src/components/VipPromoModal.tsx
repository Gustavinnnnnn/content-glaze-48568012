import { useEffect, useState } from "react";
import { Crown, X, Check, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeDialog } from "./UpgradeDialog";
import { useSiteSettings } from "@/hooks/useSiteData";

const STORAGE_KEY = "vip-promo-last-shown";
const COOLDOWN_MS = 1000 * 60 * 8;
const FIRST_DELAY_MS = 25_000;

export const VipPromoModal = () => {
  const { vip } = useAuth();
  const { data: settings } = useSiteSettings();
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (vip.isVip) return;
    const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    const wait = Math.max(FIRST_DELAY_MS, last + COOLDOWN_MS - Date.now());
    const t = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }, wait);
    return () => clearTimeout(t);
  }, [vip.isVip]);

  const price = settings?.vip_monthly_price ?? 49.9;
  const days = settings?.vip_duration_days ?? 30;

  if (!open)
    return <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/60 p-3 animate-fade-in sm:items-center"
        onClick={() => setOpen(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-card shadow-floating animate-slide-up sm:animate-fade-in"
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Clean header — no gradient */}
          <div className="border-b border-border px-5 pb-4 pt-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Crown className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Acesso completo
                </p>
                <p className="text-base font-extrabold leading-tight">Vire VIP</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-sm text-foreground/80">
              Desbloqueie todo o conteúdo das modelos sem limites.
            </p>

            <ul className="mt-3 space-y-1.5">
              {[
                "Catálogo completo desbloqueado",
                "Atualizações semanais",
                "Sem anúncios ou interrupções",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[13px]">
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} />
                  <span className="font-medium">{t}</span>
                </li>
              ))}
            </ul>

            {/* Price block */}
            <div className="mt-4 flex items-end justify-between rounded-xl bg-secondary px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Acesso por {days} dias
                </p>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">R$</span>
                  <span className="text-2xl font-extrabold leading-none">
                    {price.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                PIX
              </span>
            </div>

            <button
              onClick={() => {
                setOpen(false);
                setUpgradeOpen(true);
              }}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-foreground py-3.5 text-sm font-extrabold text-background transition-transform active:scale-[0.98]"
            >
              Quero ser VIP <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="mt-2 block w-full text-center text-[11px] font-semibold text-muted-foreground"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
};
