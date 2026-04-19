import { ContentCard } from "@/components/ContentCard";
import { VideoThumb } from "@/components/VideoThumb";
import { VipPromoBanner } from "@/components/VipPromoBanner";
import { Bell, Crown, Flame, TrendingUp, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNav } from "@/contexts/NavContext";
import { useEffect, useRef, useState } from "react";
import { useModels, useVideos, useSiteSettings } from "@/hooks/useSiteData";
import { resolveImage } from "@/lib/imageResolver";
import { Skeleton } from "@/components/ui/skeleton";
import { displayViews, formatViews } from "@/lib/displayViews";

export const HomeScreen = () => {
  const { displayName, vip } = useAuth();
  const { openVideo, openModel, setTab } = useNav();
  const { data: videos = [], isLoading } = useVideos("home");
  const { data: models = [] } = useModels();
  const { data: settings } = useSiteSettings();
  const [visible, setVisible] = useState(8);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const trending = videos.filter((v) => v.is_featured).slice(0, 6);
  const trendingPool = trending.length > 0 ? trending : videos.slice(0, 6);
  const feed = videos.slice(0, visible);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisible((v) => Math.min(v + 6, videos.length));
      },
      { rootMargin: "200px" }
    );
    if (sentinelRef.current) obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [videos.length]);

  return (
    <div className="safe-top">
      <header className="sticky top-0 z-30 glass border-b border-border/40 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground">Olá, {displayName} 🔥</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight">
              {settings?.site_name ?? "Premium"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {vip.isVip && (
              <div className="flex items-center gap-1 rounded-full gradient-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-button">
                <Crown className="h-3 w-3" /> VIP
              </div>
            )}
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-muted">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-7 pb-4 pt-5">
        {/* Modelos — first thing, scannable */}
        {models.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between px-5">
              <h2 className="text-sm font-extrabold tracking-tight">
                Modelos <span className="text-primary">populares</span>
              </h2>
              <button onClick={() => setTab("models")} className="text-[11px] font-bold text-primary">
                Ver todas →
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto px-5 pb-2 no-scrollbar">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openModel(m.id)}
                  className="flex w-[68px] shrink-0 flex-col items-center gap-1.5"
                >
                  <div className="rounded-full bg-gradient-to-tr from-primary via-primary-glow to-primary p-[2.5px]">
                    <img
                      src={resolveImage(m.avatar_url)}
                      alt={m.name}
                      loading="lazy"
                      className="h-16 w-16 rounded-full border-[2.5px] border-background object-cover"
                    />
                  </div>
                  <span className="line-clamp-1 w-full text-center text-[11px] font-bold">
                    {m.name.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* VIP promo */}
        {!vip.isVip && (
          <section className="px-4">
            <VipPromoBanner />
          </section>
        )}

        {/* Em alta */}
        {trendingPool.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2 px-5">
              <Flame className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-extrabold tracking-tight">Em alta agora</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto px-5 pb-2 no-scrollbar">
              {trendingPool.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openVideo(item.id)}
                  className="group relative w-44 shrink-0 overflow-hidden rounded-2xl shadow-card text-left active:scale-[0.97] transition-transform"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                    <VideoThumb src={item.video_url} alt={item.title} className="transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
                    {item.is_vip && (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full gradient-primary px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-button">
                        <Flame className="h-2.5 w-2.5" /> VIP
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white pointer-events-none">
                      {item.categories?.name && (
                        <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                          {item.categories.name}
                        </p>
                      )}
                      <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-tight drop-shadow">
                        {item.title}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] opacity-90">
                        <Eye className="h-2.5 w-2.5" />
                        <span>{formatViews(displayViews(item.id, item.view_count))}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Feed */}
        {isLoading && (
          <section className="space-y-4 px-4">
            <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
            <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
          </section>
        )}

        {feed.length > 0 && (
          <section className="px-4">
            <div className="mb-3 flex items-center gap-2 px-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-extrabold tracking-tight">Para você</h2>
            </div>
            <div className="space-y-4">
              {feed.map((item, i) => (
                <ContentCard key={item.id} item={item} index={i} />
              ))}
            </div>
            <div ref={sentinelRef} className="flex h-20 items-center justify-center">
              {visible < videos.length && (
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
                </div>
              )}
            </div>
            <div className="mt-2 text-center">
              <button
                onClick={() => setTab("explore")}
                className="rounded-full bg-secondary px-5 py-2.5 text-xs font-bold"
              >
                Ver todos no Explorar →
              </button>
            </div>
          </section>
        )}

        {!isLoading && videos.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold">Nenhum conteúdo ainda.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              O administrador precisa adicionar vídeos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
