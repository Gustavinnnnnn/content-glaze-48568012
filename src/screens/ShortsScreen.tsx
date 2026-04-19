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
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const [activeIndex, setActiveIndex] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [paywallDismissed, setPaywallDismissed] = useState<Record<number, boolean>>({});
  const [muted, setMuted] = useState(true); // start muted (autoplay needs it), unmute on tap

  const vipPrice = settings?.vip_monthly_price ?? 19.9;

  // Build the feed: every 3 videos, inject a full-screen VIP promo (only for non-VIP users)
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

  // Play active, pause others. Re-query DOM each time so we always see the latest <video> nodes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const videos = el.querySelectorAll<HTMLVideoElement>("video[data-short]");
    videos.forEach((v) => {
      const idx = Number(v.dataset.index);
      if (idx === activeIndex) {
        v.muted = muted;
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } else {
        v.pause();
        if (v.currentTime > 0.1) v.currentTime = 0;
      }
    });
  }, [activeIndex, feed.length, muted]);

  if (feed.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-black px-6 text-center text-white">
        <p className="text-sm font-semibold opacity-80">Nenhum vídeo disponível ainda.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-black">
      <div ref={containerRef} className="h-full snap-y snap-mandatory overflow-y-auto no-scrollbar overscroll-contain">
        {feed.map((item, i) => {
          if (item.kind === "promo") {
            return (
              <section
                key={item.id}
                className="relative flex h-full w-full snap-start items-center justify-center overflow-hidden bg-gradient-to-br from-[hsl(20_95%_55%)] via-[hsl(15_92%_50%)] to-[hsl(0_85%_48%)] text-white"
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
          return (
            <section
              key={s.id + "-" + i}
              className="relative flex h-full w-full snap-start items-center justify-center overflow-hidden"
            >
              {s.video_url ? (
                <video
                  data-short=""
                  data-index={i}
                  src={s.video_url}
                  loop
                  playsInline
                  muted={muted}
                  preload="auto"
                  className={`h-full w-full object-cover ${locked ? "blur-2xl scale-110" : ""}`}
                  onClick={() => setMuted((m) => !m)}
                  onLoadedData={(e) => {
                    if (i === activeIndex) {
                      const v = e.currentTarget;
                      v.muted = muted;
                      const p = v.play();
                      if (p && typeof p.catch === "function") p.catch(() => {});
                    }
                  }}
                />
              ) : (
                <div className="h-full w-full bg-neutral-900" />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />

              {/* Mute toggle */}
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
                <div className="absolute inset-x-0 bottom-24 z-20 px-4 pr-20 animate-fade-in">
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/70 p-3 backdrop-blur-xl shadow-floating">
                    <button
                      onClick={() => setPaywallDismissed((prev) => ({ ...prev, [i]: true }))}
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
                      className="gradient-primary shadow-button mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-primary-foreground transition-transform active:scale-[0.98]"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Assinar agora
                    </button>
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
