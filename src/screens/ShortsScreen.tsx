import { useEffect, useRef, useState } from "react";
import { contentList } from "@/data/content";
import { Heart, MessageCircle, Share2, Lock, Sparkles } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { UpgradeDialog } from "@/components/UpgradeDialog";

export const ShortsScreen = () => {
  const shorts = contentList.slice(0, 8);
  const { plan } = useUser();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Progress bar simulation per short
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

  // Detect active slide via scroll
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
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />

              {/* Right actions */}
              <div className="absolute bottom-32 right-3 z-10 flex flex-col items-center gap-5 text-white">
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-transform active:scale-90">
                    <Heart className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-semibold">128k</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-transform active:scale-90">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-semibold">2.4k</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-transform active:scale-90">
                    <Share2 className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-semibold">Enviar</span>
                </button>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-28 left-4 right-20 z-10 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">@{s.category.toLowerCase()}</p>
                <h2 className="mt-1 text-xl font-bold leading-tight drop-shadow">{s.title}</h2>
                <p className="mt-1 text-xs opacity-80">{s.views} visualizações</p>
              </div>

              {/* Lock overlay */}
              {locked && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-8 text-center">
                  <div className="rounded-3xl bg-background/95 p-6 shadow-floating">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-glow">
                      <Lock className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-foreground">Conteúdo completo no Premium</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Desbloqueie todos os shorts sem interrupção
                    </p>
                    <button
                      onClick={() => setUpgradeOpen(true)}
                      className="gradient-primary shadow-button mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground"
                    >
                      <Sparkles className="h-4 w-4" /> Desbloquear acesso
                    </button>
                  </div>
                </div>
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
