import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, Lock, Sparkles, Crown, X, Volume2, VolumeX, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useVideos, useSiteSettings, type VideoRow } from "@/hooks/useSiteData";
import { displayViews, formatViews } from "@/lib/displayViews";

type FeedItem =
  | { kind: "video"; video: VideoRow }
  | { kind: "promo"; id: string };

export const ShortsScreen = () => {
  const { data: shorts = [] } = useVideos("shorts");
  const { data: settings } = useSiteSettings();
  const { vip } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [paywallDismissed, setPaywallDismissed] = useState<Record<number, boolean>>({});
  const [muted, setMuted] = useState(true);

  const vipPrice = settings?.vip_monthly_price ?? 19.9;

  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    shorts.forEach((v, idx) => {
      items.push({ kind: "video", video: v });
      if (!vip.isVip && (idx + 1) % 3 === 0) {
        items.push({ kind: "promo", id: `promo-${idx}` });
      }
    });
    return items;
  }, [shorts, vip.isVip]);

  // Detect active section via scroll position. Simple, deterministic, mobile-proof.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const compute = () => {
      const h = el.clientHeight;
      if (h === 0) return;
      const idx = Math.round(el.scrollTop / h);
      setActiveIndex((prev) => (prev === idx ? prev : idx));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    compute();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", compute);
    };
  }, [feed.length]);

  if (feed.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-black px-6 text-center text-white">
        <p className="text-sm font-semibold opacity-80">Nenhum vídeo disponível ainda.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-black">
      <div
        ref={containerRef}
        className="h-full snap-y snap-mandatory overflow-y-scroll no-scrollbar overscroll-contain"
      >
        {feed.map((item, i) => {
          if (item.kind === "promo") {
            return (
              <section
                key={item.id}
                className="relative flex h-full w-full snap-start snap-always items-center justify-center overflow-hidden bg-gradient-to-br from-[hsl(20_95%_55%)] via-[hsl(15_92%_50%)] to-[hsl(0_85%_48%)] text-white"
              >
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />
                <div className="relative z-10 mx-auto flex max-w-sm flex-col items-center px-6 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-md">
                    <Crown className="h-10 w-10 text-white drop-shadow-lg" />
                  </div>
                  <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.2em] opacity-95">
                    Acesso VIP · Pagamento único
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold leading-tight drop-shadow-md">
                    Pare de assistir só prévias
                  </h2>
                  <p className="mt-3 text-sm font-medium opacity-95">
                    Libere TODAS as modelos, todos os vídeos completos, sem cortes e sem limites.
                  </p>
                  <div className="mt-5 w-full space-y-2 text-left">
                    {["Acesso a todas as modelos", "Vídeos completos com som", "Conteúdo VIP exclusivo"].map((b) => (
                      <div key={b} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-md">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[hsl(15_92%_45%)]">
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-xs font-bold">{b}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setUpgradeOpen(true)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-sm font-extrabold text-[hsl(15_92%_45%)] shadow-floating transition-transform active:scale-[0.97]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Liberar tudo por R$ {vipPrice.toFixed(2).replace(".", ",")}
                  </button>
                  <p className="mt-2 text-[10px] font-semibold opacity-90">
                    Ativação imediata · Continue arrastando para ver mais prévias
                  </p>
                </div>
              </section>
            );
          }

          const s = item.video;
          const locked = s.is_vip && !vip.isVip;
          const showPaywall = locked && !paywallDismissed[i];
          const isActive = i === activeIndex;
          // Mount only the active video + the next one (for instant playback when user scrolls).
          const shouldMountVideo = !!s.video_url && (i === activeIndex || i === activeIndex + 1);

          return (
            <section
              key={s.id + "-" + i}
              className="relative flex h-full w-full snap-start snap-always items-center justify-center overflow-hidden bg-black"
            >
              {shouldMountVideo ? (
                <ShortVideo
                  key={s.id + "-v"}
                  src={s.video_url!}
                  active={isActive}
                  muted={muted}
                  locked={locked}
                  onToggleMute={() => setMuted((m) => !m)}
                />
              ) : s.thumbnail_url ? (
                <img
                  src={s.thumbnail_url}
                  alt={s.title}
                  className={`h-full w-full object-cover ${locked ? "blur-2xl scale-110" : ""}`}
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full bg-neutral-900" />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />

              <button
                onClick={() => setMuted((m) => !m)}
                className="absolute right-3 top-20 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md"
                aria-label={muted ? "Ativar som" : "Mutar"}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              <div className="absolute bottom-32 right-3 z-30 flex flex-col items-center gap-5 text-white">
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-transform active:scale-90">
                    <Heart className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-semibold drop-shadow">Curtir</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-transform active:scale-90">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-semibold drop-shadow">Coment.</span>
                </button>
                <button className="flex flex-col items-center gap-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition-transform active:scale-90">
                    <Share2 className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-semibold drop-shadow">Enviar</span>
                </button>
                {!vip.isVip && (
                  <button onClick={() => setUpgradeOpen(true)} className="flex flex-col items-center gap-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-primary shadow-glow transition-transform active:scale-90">
                      <Crown className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <span className="text-[10px] font-bold drop-shadow">VIP</span>
                  </button>
                )}
              </div>

              <div className="absolute bottom-28 left-4 right-20 z-20 text-white">
                {s.categories?.name && (
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    @{s.categories.name.toLowerCase()}
                  </p>
                )}
                <h2 className="mt-1 text-xl font-bold leading-tight drop-shadow">{s.title}</h2>
                <p className="mt-1 text-xs opacity-80">
                  {formatViews(displayViews(s.id, s.view_count))} visualizações
                </p>
              </div>

              {showPaywall && (
                <div className="absolute inset-x-0 bottom-24 z-20 px-4 animate-fade-in">
                  <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[hsl(20_95%_55%)] via-[hsl(15_92%_50%)] to-[hsl(0_85%_48%)] p-3.5 text-white shadow-floating">
                    <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
                    <span className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-yellow-300/20 blur-2xl" />
                    <button
                      onClick={() => setPaywallDismissed((prev) => ({ ...prev, [i]: true }))}
                      className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-white/90 backdrop-blur-md"
                      aria-label="Fechar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="relative flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                        <Crown className="h-6 w-6 drop-shadow" />
                      </div>
                      <div className="min-w-0 flex-1 pr-6">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-95">
                          Conteúdo VIP bloqueado
                        </p>
                        <p className="text-[15px] font-extrabold leading-tight drop-shadow">
                          Veja COMPLETO sem cortes
                        </p>
                        <p className="text-[11px] font-medium opacity-95">
                          Todas as modelos · todos os vídeos
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUpgradeOpen(true)}
                      className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white py-2.5 text-xs font-extrabold text-[hsl(15_92%_45%)] shadow-button transition-transform active:scale-[0.98]"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Liberar tudo por R$ {vipPrice.toFixed(2).replace(".", ",")}
                    </button>
                    <p className="mt-1.5 text-center text-[10px] font-semibold opacity-95">
                      Pagamento único · Ativação imediata
                    </p>
                  </div>
                </div>
              )}

              {locked && paywallDismissed[i] && (
                <button
                  onClick={() => setPaywallDismissed((prev) => ({ ...prev, [i]: false }))}
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

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};

// Isolated <video> component: the parent fully unmounts it when out of range,
// guaranteeing playback + audio stop. When `active` flips, we play/pause.
function ShortVideo({
  src,
  active,
  muted,
  locked,
  onToggleMute,
}: {
  src: string;
  active: boolean;
  muted: boolean;
  locked: boolean;
  onToggleMute: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = active ? muted : true;
    if (active) {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      v.pause();
      try { v.currentTime = 0; } catch { /* noop */ }
    }
  }, [active, muted]);

  // On unmount, force-stop everything (covers iOS audio leaks).
  useEffect(() => {
    return () => {
      const v = ref.current;
      if (!v) return;
      try {
        v.pause();
        v.removeAttribute("src");
        v.load();
      } catch {
        /* noop */
      }
    };
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      loop
      playsInline
      muted={active ? muted : true}
      preload="auto"
      autoPlay={active}
      onClick={onToggleMute}
      className={`h-full w-full object-cover ${locked ? "blur-2xl scale-110" : ""}`}
    />
  );
}
