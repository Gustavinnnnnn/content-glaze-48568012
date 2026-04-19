import { useEffect, useState } from "react";
import { Crown, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeDialog } from "./UpgradeDialog";

const STORAGE_KEY = "vip-promo-last-shown";
const COOLDOWN_MS = 1000 * 60 * 8; // 8 min between popups
const FIRST_DELAY_MS = 25_000; // 25s after entering site

/**
 * Random VIP promotional pop-up — surfaces while the user browses to push the VIP.
 * Skips if the user already has VIP.
 */
export const VipPromoModal = () => {
  const { vip } = useAuth();
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

  if (!open) return <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/60 backdrop-blur-sm sm:items-center">
        <div className="relative mx-3 mb-3 w-full max-w-sm overflow-hidden rounded-3xl bg-background shadow-floating animate-fade-in sm:mb-0">
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="gradient-primary px-6 py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-background/15 backdrop-blur shadow-glow">
              <Crown className="h-8 w-8 text-primary-foreground" />
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground/90">
              Oferta exclusiva
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-primary-foreground">
              Libere o VIP agora
            </h2>
            <p className="mx-auto mt-2 max-w-[260px] text-xs text-primary-foreground/90">
              Mais de <strong>10.000 vídeos</strong> exclusivos, sem propaganda e sem limite.
            </p>
          </div>
          <div className="space-y-3 p-5">
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2"><span className="text-primary">✓</span> Acervo completo desbloqueado</li>
              <li className="flex items-center gap-2"><span className="text-primary">✓</span> Novos vídeos toda semana</li>
              <li className="flex items-center gap-2"><span className="text-primary">✓</span> Sem anúncios, sem espera</li>
            </ul>
            <button
              onClick={() => {
                setOpen(false);
                setUpgradeOpen(true);
              }}
              className="gradient-primary shadow-button flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-extrabold text-primary-foreground"
            >
              <Sparkles className="h-4 w-4" /> Quero ser VIP
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
