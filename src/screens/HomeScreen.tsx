import { Bell, Crown, Search, BadgeCheck, Heart, Image as ImageIcon, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNav } from "@/contexts/NavContext";
import { useMemo, useState } from "react";
import { useModels, useVideos, useSiteSettings } from "@/hooks/useSiteData";
import { resolveImage } from "@/lib/imageResolver";
import { Skeleton } from "@/components/ui/skeleton";
import { VipHeroBanner } from "@/components/VipHeroBanner";
import { fakeModelStats, formatCompact } from "@/lib/fakeStats";

export const HomeScreen = () => {
  const { displayName, vip } = useAuth();
  const { openModel } = useNav();
  const { data: models = [], isLoading } = useModels();
  const { data: videos = [] } = useVideos("home");
  const { data: settings } = useSiteSettings();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return models;
    const q = query.toLowerCase();
    return models.filter(
      (m) => m.name.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q)
    );
  }, [query, models]);

  // Map modelId -> video count for social proof
  const videoCounts = useMemo(() => {
    const c: Record<string, number> = {};
    videos.forEach((v) => {
      if (v.model_id) c[v.model_id] = (c[v.model_id] ?? 0) + 1;
    });
    return c;
  }, [videos]);

  return (
    <div className="safe-top">
      <header className="sticky top-0 z-30 glass border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground">Olá, {displayName} 👋</p>
            <h1 className="truncate text-lg font-extrabold tracking-tight">
              {settings?.site_name ?? "Privacy BR"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {vip.isVip && (
              <div className="flex items-center gap-1 rounded-full gradient-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground shadow-button">
                <Crown className="h-3 w-3" /> VIP
              </div>
            )}
            <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-muted">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            </button>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar modelo..."
            className="w-full rounded-full border border-border bg-secondary py-2.5 pl-10 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </header>

      <div className="space-y-4 pb-4 pt-2">
        <VipHeroBanner />

        {/* Models grid — Privacy-style (no overlapping avatar bug) */}
        {filtered.length > 0 && (
          <section className="px-3">
            <div className="grid grid-cols-2 gap-2.5">
              {filtered.map((m, i) => {
                const stats = fakeModelStats(m.id, { posts: videoCounts[m.id] ?? 0 });
                return (
                  <div
                    key={m.id}
                    onClick={() => openModel(m.id)}
                    className="group relative flex animate-fade-in cursor-pointer flex-col overflow-hidden rounded-2xl bg-card shadow-card ring-1 ring-border/60 transition-transform active:scale-[0.98]"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms`, animationFillMode: "backwards" }}
                  >
                    {/* Cover image */}
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                      <img
                        src={resolveImage(m.cover_url ?? m.avatar_url)}
                        alt={m.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />

                      {/* Online dot */}
                      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/45 px-1.5 py-0.5 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-white">Online</span>
                      </div>

                      {/* Name overlay on cover */}
                      <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-6 text-white">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-[12px] font-extrabold leading-tight drop-shadow">{m.name}</p>
                          <BadgeCheck className="h-3 w-3 shrink-0 text-primary-glow drop-shadow" />
                        </div>
                        <p className="truncate text-[10px] font-semibold opacity-90">@{m.handle}</p>
                      </div>
                    </div>

                    {/* Info / CTA */}
                    <div className="flex flex-col px-2.5 py-2">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-2.5 w-2.5" /> {stats.posts} posts
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Heart className="h-2.5 w-2.5" /> {formatCompact(stats.likes)}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModel(m.id);
                        }}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-full gradient-primary py-1.5 text-[11px] font-extrabold text-primary-foreground shadow-button transition-transform active:scale-[0.97]"
                      >
                        {vip.isVip ? "Ver perfil" : (<><Lock className="h-2.5 w-2.5" /> Desbloquear</>)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Loading */}
        {isLoading && (
          <section className="grid grid-cols-2 gap-2.5 px-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-[3/5] rounded-2xl" />
            ))}
          </section>
        )}

        {!isLoading && models.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold">Nenhuma modelo cadastrada ainda.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              O administrador precisa adicionar modelos.
            </p>
          </div>
        )}

        {!isLoading && query.trim() && filtered.length === 0 && (
          <div className="mx-3 rounded-2xl bg-card p-8 text-center shadow-card">
            <p className="text-sm font-semibold">Nenhuma modelo encontrada</p>
            <p className="mt-1 text-xs text-muted-foreground">Tente outro nome</p>
          </div>
        )}
      </div>
    </div>
  );
};
