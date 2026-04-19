import { VipPromoBanner } from "@/components/VipPromoBanner";
import { Bell, Crown, Search, BadgeCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNav } from "@/contexts/NavContext";
import { useMemo, useState } from "react";
import { useModels, useVideos, useSiteSettings } from "@/hooks/useSiteData";
import { resolveImage } from "@/lib/imageResolver";
import { Skeleton } from "@/components/ui/skeleton";

export const HomeScreen = () => {
  const { displayName, vip } = useAuth();
  const { openModel, setTab } = useNav();
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

  const featured = filtered.slice(0, 2);
  const rest = filtered.slice(2);

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
      <header className="sticky top-0 z-30 glass border-b border-border/60 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground">Olá, {displayName} 👋</p>
            <h1 className="truncate text-xl font-extrabold tracking-tight">
              {settings?.site_name ?? "Privacy BR"}
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

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar modelo..."
            className="w-full rounded-full border border-border bg-secondary py-2.5 pl-11 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </header>

      <div className="space-y-6 pb-4 pt-5">
        {/* VIP promo */}
        {!vip.isVip && (
          <section className="px-4">
            <VipPromoBanner />
          </section>
        )}

        {/* Featured models — large cards */}
        {featured.length > 0 && (
          <section className="px-4">
            <div className="mb-3 flex items-center gap-2 px-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-extrabold tracking-tight">Em destaque</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {featured.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openModel(m.id)}
                  className="group relative aspect-[3/4] overflow-hidden rounded-3xl bg-muted shadow-card text-left active:scale-[0.98] transition-transform"
                >
                  <img
                    src={resolveImage(m.cover_url ?? m.avatar_url)}
                    alt={m.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary/95 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-button">
                    <Sparkles className="h-2.5 w-2.5" /> Top
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-sm font-extrabold drop-shadow">{m.name}</p>
                      <BadgeCheck className="h-3.5 w-3.5 text-primary-glow" />
                    </div>
                    <p className="truncate text-[10px] font-semibold opacity-80">@{m.handle}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold opacity-90">
                        {videoCounts[m.id] ?? 0} posts
                      </span>
                      <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                        Ver
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* All models — grid */}
        {rest.length > 0 && (
          <section className="px-4">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-extrabold tracking-tight">
                Modelos <span className="text-primary">disponíveis</span>
              </h2>
              <button onClick={() => setTab("models")} className="text-[11px] font-bold text-primary">
                Ver todas →
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {rest.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openModel(m.id)}
                  className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted shadow-card text-left active:scale-[0.97] transition-transform"
                >
                  <img
                    src={resolveImage(m.avatar_url ?? m.cover_url)}
                    alt={m.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                    <div className="flex items-center gap-0.5">
                      <p className="truncate text-[11px] font-extrabold drop-shadow">{m.name.split(" ")[0]}</p>
                      <BadgeCheck className="h-3 w-3 shrink-0 text-primary-glow" />
                    </div>
                    <p className="truncate text-[9px] font-semibold opacity-80">@{m.handle}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Loading */}
        {isLoading && (
          <section className="space-y-3 px-4">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="aspect-[3/4] rounded-3xl" />
              <Skeleton className="aspect-[3/4] rounded-3xl" />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <Skeleton className="aspect-[3/4] rounded-2xl" />
              <Skeleton className="aspect-[3/4] rounded-2xl" />
              <Skeleton className="aspect-[3/4] rounded-2xl" />
            </div>
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
          <div className="rounded-2xl bg-card p-8 mx-4 text-center shadow-card">
            <p className="text-sm font-semibold">Nenhuma modelo encontrada</p>
            <p className="mt-1 text-xs text-muted-foreground">Tente outro nome</p>
          </div>
        )}
      </div>
    </div>
  );
};
