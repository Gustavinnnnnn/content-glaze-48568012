import { useEffect, useState } from "react";
import { Crown, Flame, X, Check } from "lucide-react";
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
        className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/70 backdrop-blur-md p-4 animate-fade-in"
        onClick={() => setOpen(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm overflow-hidden rounded-[28px] bg-card shadow-floating"
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-card transition-transform active:scale-90"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="gradient-primary relative px-6 pb-7 pt-9 text-center text-primary-foreground">
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
            <div className="relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white/20 backdrop-blur shadow-glow">
                <Crown className="h-8 w-8" />
              </div>
              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.25em] opacity-90">
                Oferta exclusiva
              </p>
              <h2 className="mt-1 text-3xl font-extrabold leading-tight">
                Libere o VIP
              </h2>
              <p className="mx-auto mt-2 max-w-[280px] text-xs opacity-95">
                Mais de <strong>10.000 vídeos</strong> exclusivos, sem propaganda e sem limite.
              </p>
              <div className="mt-4 inline-flex items-baseline gap-1.5 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur">
                <span className="text-2xl font-extrabold">
                  R$ {price.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-xs font-semibold opacity-90">/ {days} dias</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6">
            <ul className="space-y-2.5 text-sm">
              {[
                "Acervo completo desbloqueado",
                "Novos vídeos toda semana",
                "Sem anúncios, sem espera",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="font-semibold">{t}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                setOpen(false);
                setUpgradeOpen(true);
              }}
              className="gradient-primary shadow-button flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-extrabold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              <Flame className="h-4 w-4" /> Quero ser VIP agora
            </button>
            <button
              onClick={() => setOpen(false)}
              className="block w-full text-center text-[11px] font-semibold text-muted-foreground"
            >
              Continuar sem VIP
            </button>
          </div>
        </div>
      </div>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
};
