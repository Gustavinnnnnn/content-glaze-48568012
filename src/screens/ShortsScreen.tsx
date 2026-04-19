import { useEffect, useRef, useState } from "react";
import { contentList } from "@/data/content";
import { Heart, MessageCircle, Share2, Lock, Sparkles, Crown, X } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { UpgradeDialog } from "@/components/UpgradeDialog";

export const ShortsScreen = () => {
  const shorts = contentList.slice(0, 8);
  const { plan } = useUser();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [paywallDismissed, setPaywallDismissed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 6000;
      setProgress(Math.min(elapsed * 100, 100));
      if (elapsed >= 1) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [activeIndex]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      if (idx !== activeIndex) setActiveIndex(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeIndex]);

  return (
    <div className="relative h-full bg-black">
      <div
        ref={containerRef}
        className="h-full snap-y snap-mandatory overflow-y-auto no-scrollbar"
      >
        {shorts.map((s, i) => {
          const locked = s.premium && plan === "free" && i > 1;
          const showPaywall = locked && !paywallDismissed[i];
          return (
            <section
              key={s.id}
              className="relative flex h-full w-full snap-start items-center justify-center overflow-hidden"
            >
              <img
                src={s.image}
                alt={s.title}
                loading={i < 2 ? "eager" : "lazy"}
                className={`h-full w-full object-cover ${locked ? "blur-2xl scale-110" : ""}`}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />

              {/* Right actions — sempre visíveis */}
              <div className="absolute bottom-32 right-3 z-30 flex flex-col items-center gap-5 text-white">
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-transform active:scale-90">
                    <Heart className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-semibold drop-shadow">128k</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-transform active:scale-90">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-semibold drop-shadow">2.4k</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-transform active:scale-90">
                    <Share2 className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-semibold drop-shadow">Enviar</span>
                </button>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-28 left-4 right-20 z-20 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">@{s.category.toLowerCase()}</p>
                <h2 className="mt-1 text-xl font-bold leading-tight drop-shadow">{s.title}</h2>
                <p className="mt-1 text-xs opacity-80">{s.views} visualizações</p>
              </div>

              {/* Paywall — banner inferior elegante, NÃO cobre os botões laterais */}
              {showPaywall && (
                <div className="absolute inset-x-0 bottom-24 z-20 px-4 pr-20 animate-fade-in">
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/70 p-3 backdrop-blur-xl shadow-floating">
                    <button
                      onClick={() =>
                        setPaywallDismissed((prev) => ({ ...prev, [i]: true }))
                      }
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/70"
                      aria-label="Fechar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-glow">
                        <Crown className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-primary-glow">
                          Conteúdo VIP
                        </p>
                        <p className="truncate text-sm font-bold text-white">
                          Desbloqueie sem limites
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUpgradeOpen(true)}
                      className="gradient-primary shadow-button mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-primary-foreground transition-transform active:scale-[0.98] animate-pulse-glow"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Assinar agora
                    </button>
                  </div>
                </div>
              )}

              {/* Lock badge discreto se paywall foi fechado */}
              {locked && paywallDismissed[i] && (
                <button
                  onClick={() =>
                    setPaywallDismissed((prev) => ({ ...prev, [i]: false }))
                  }
                  className="absolute left-4 top-20 z-20 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-md"
                >
                  <Lock className="h-3.5 w-3.5 text-white" />
                  <span className="text-[10px] font-bold text-white">Conteúdo VIP</span>
                </button>
              )}
            </section>
          );
        })}
      </div>

      {/* Top progress bars */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex gap-1 px-3 pt-3 safe-top">
        {shorts.map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{ width: i < activeIndex ? "100%" : i === activeIndex ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};
