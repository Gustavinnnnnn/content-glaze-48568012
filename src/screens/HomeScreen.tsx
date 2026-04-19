import { ContentCard } from "@/components/ContentCard";
import { VideoThumb } from "@/components/VideoThumb";
import { VipPromoBanner } from "@/components/VipPromoBanner";
import { Bell, Crown, Flame, Sparkles, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNav } from "@/contexts/NavContext";
import { useEffect, useRef, useState } from "react";
import { useModels, useVideos, useSiteSettings } from "@/hooks/useSiteData";
import { resolveImage } from "@/lib/imageResolver";
import { Skeleton } from "@/components/ui/skeleton";

export const HomeScreen = () => {
  const { displayName, vip } = useAuth();
  const { openVideo, openModel, setTab } = useNav();
  const { data: videos = [], isLoading } = useVideos("home");
  const { data: models = [] } = useModels();
  const { data: settings } = useSiteSettings();
  const [visible, setVisible] = useState(8);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Home shows up to 10 videos pulled from home + explore pool
  const limited = videos.slice(0, 10);
  const hero = limited.find((v) => v.is_featured) ?? limited[0];
  const trending = limited.filter((v) => v.id !== hero?.id).slice(0, 6);
  const feed = limited.slice(0, visible);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisible((v) => Math.min(v + 6, limited.length));
      },
      { rootMargin: "200px" }
    );
    if (sentinelRef.current) obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [limited.length]);

  return (
    <div className="safe-top">
      <header className="sticky top-0 z-30 glass border-b border-border/40 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Olá, {displayName} 👋</p>
            <h1 className="text-xl font-extrabold tracking-tight">
              {settings?.site_name ?? "Premium"} <span className="text-primary">·</span>{" "}
              <span className="text-primary">conteúdo</span>
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

      <div className="space-y-6 pb-4 pt-4">
        {isLoading && (
          <section className="px-4">
            <Skeleton className="aspect-[16/11] w-full rounded-3xl" />
          </section>
        )}

        {hero && (
          <section className="px-4">
            <button
              onClick={() => openVideo(hero.id)}
              className="group relative block w-full overflow-hidden rounded-3xl shadow-floating active:scale-[0.99] transition-transform"
            >
              <div className="relative aspect-[16/11] w-full overflow-hidden bg-muted">
                <VideoThumb src={hero.video_url} alt={hero.title} className="transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30 pointer-events-none" />
                <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-foreground shadow-button">
                  <Flame className="h-3.5 w-3.5" /> Em destaque
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 text-left text-white pointer-events-none">
                  {hero.categories?.name && (
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
                      {hero.categories.name}
                    </p>
                  )}
                  <h2 className="mt-1.5 text-2xl font-extrabold leading-[1.1] drop-shadow-lg">
                    {hero.title}
                  </h2>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold backdrop-blur-md">
                      <Sparkles className="h-3 w-3" /> Assistir agora
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </section>
        )}

        {/* VIP promo */}
        {!vip.isVip && (
          <section className="px-4">
            <VipPromoBanner />
          </section>
        )}

        {/* Modelos */}
        {models.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between px-5">
              <h2 className="text-sm font-bold tracking-tight">
                Modelos <span className="text-primary">populares</span>
              </h2>
              <button onClick={() => setTab("models")} className="text-[11px] font-bold text-primary">
                Ver todas →
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto px-5 pb-2 no-scrollbar">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openModel(m.id)}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                >
                  <div className="rounded-full bg-gradient-to-tr from-primary to-primary-glow p-[2px]">
                    <img
                      src={resolveImage(m.avatar_url)}
                      alt={m.name}
                      loading="lazy"
                      className="h-14 w-14 rounded-full border-2 border-background object-cover"
                    />
                  </div>
                  <span className="line-clamp-1 text-[10px] font-semibold">
                    {m.name.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {trending.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2 px-5">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight">Em alta agora</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto px-5 pb-2 no-scrollbar">
              {trending.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openVideo(item.id)}
                  className="group relative w-44 shrink-0 overflow-hidden rounded-2xl shadow-card text-left active:scale-[0.97] transition-transform"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                    <VideoThumb src={item.video_url} alt={item.title} className="transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white pointer-events-none">
                      {item.categories?.name && (
                        <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                          {item.categories.name}
                        </p>
                      )}
                      <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-tight drop-shadow">
                        {item.title}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {feed.length > 0 && (
          <section className="px-4">
            <h2 className="mb-3 px-1 text-sm font-bold tracking-tight">Para você</h2>
            <div className="space-y-4">
              {feed.map((item, i) => (
                <ContentCard key={item.id} item={item} index={i} />
              ))}
            </div>
            <div ref={sentinelRef} className="flex h-20 items-center justify-center">
              {visible < limited.length && (
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
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
