import { contentList } from "@/data/content";
import { models } from "@/data/models";
import { ContentCard } from "@/components/ContentCard";
import { Bell, Crown, Flame, Sparkles, TrendingUp } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useNav } from "@/contexts/NavContext";
import { useEffect, useRef, useState } from "react";

export const HomeScreen = () => {
  const { name, plan } = useUser();
  const { openVideo, openModel, setTab } = useNav();
  const [visible, setVisible] = useState(8);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hero = contentList[0];
  const trending = contentList.slice(1, 7);
  const feed = contentList.slice(0, visible);

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisible((v) => Math.min(v + 6, contentList.length));
      }
    }, { rootMargin: "200px" });
    if (sentinelRef.current) obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="safe-top">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/40 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Olá, {name} 👋</p>
            <h1 className="text-xl font-extrabold tracking-tight">
              Conteúdo <span className="text-primary">premium</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {plan === "premium" && (
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
        {/* HERO single — destaque grande, conversível */}
        <section className="px-4">
          <button
            onClick={() => openVideo(hero.id)}
            className="group relative block w-full overflow-hidden rounded-3xl shadow-floating active:scale-[0.99] transition-transform"
          >
            <div className="relative aspect-[16/11] w-full overflow-hidden bg-muted">
              <img
                src={hero.image}
                alt={hero.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" />

              <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-foreground shadow-button">
                <Flame className="h-3.5 w-3.5" /> Em destaque
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-5 text-left text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
                  {hero.category}
                </p>
                <h2 className="mt-1.5 text-2xl font-extrabold leading-[1.1] drop-shadow-lg">
                  {hero.title}
                </h2>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold backdrop-blur-md">
                    <Sparkles className="h-3 w-3" /> Assistir agora
                  </span>
                  <span className="text-[11px] font-medium opacity-80">{hero.views} views</span>
                </div>
              </div>
            </div>
          </button>
        </section>

        {/* Modelos em destaque */}
        <section>
          <div className="mb-3 flex items-center justify-between px-5">
            <h2 className="text-sm font-bold tracking-tight">
              Modelos <span className="text-primary">populares</span>
            </h2>
            <button
              onClick={() => setTab("models")}
              className="text-[11px] font-bold text-primary"
            >
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
                    src={m.avatar}
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

        {/* Em alta — carrossel horizontal */}
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
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                      {item.category}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-tight drop-shadow">
                      {item.title}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Feed principal */}
        <section className="px-4">
          <h2 className="mb-3 px-1 text-sm font-bold tracking-tight">Para você</h2>
          <div className="space-y-4">
            {feed.map((item, i) => (
              <ContentCard key={item.id} item={item} index={i} />
            ))}
          </div>
          <div ref={sentinelRef} className="flex h-20 items-center justify-center">
            {visible < contentList.length && (
              <div className="flex gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
