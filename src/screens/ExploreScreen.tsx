import { Search, Eye, Lock, Flame, Crown, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useVideos } from "@/hooks/useSiteData";
import { useAuth } from "@/contexts/AuthContext";
import { useNav } from "@/contexts/NavContext";
import { VideoThumb } from "@/components/VideoThumb";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { VipHeroBanner } from "@/components/VipHeroBanner";
import { useSiteSettings } from "@/hooks/useSiteData";
import { displayViews, formatViews } from "@/lib/displayViews";
import { cn } from "@/lib/utils";

export const ExploreScreen = () => {
  const [query, setQuery] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { data: videos = [] } = useVideos("explore");
  const { data: settings } = useSiteSettings();
  const { vip } = useAuth();
  const { openVideo } = useNav();
  const vipPrice = settings?.vip_monthly_price ?? 19.9;

  const results = useMemo(() => {
    if (!query.trim()) return videos;
    const q = query.toLowerCase();
    return videos.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.categories?.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [query, videos]);

  const handleClick = (item: typeof videos[number]) => {
    if (item.is_vip && !vip.isVip) setUpgradeOpen(true);
    else openVideo(item.id);
  };

  return (
    <div className="safe-top">
      <header className="sticky top-0 z-30 glass border-b border-border/60 px-5 py-4">
        <h1 className="mb-3 text-2xl font-extrabold tracking-tight">Explorar</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="O que você procura?"
            className="w-full rounded-full border border-border bg-secondary py-3 pl-12 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </header>

      <VipHeroBanner headline="Desbloqueie todos os vídeos VIP" subline="Um único pagamento libera todo o acervo." />

      <div className="px-3 py-4">
        {query.trim() && (
          <p className="mb-3 px-2 text-xs font-semibold text-muted-foreground">
            {results.length} resultado{results.length !== 1 ? "s" : ""} para "{query}"
          </p>
        )}

        {results.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {results.map((item, i) => {
              const locked = item.is_vip && !vip.isVip;
              // Inject inline VIP promo card every 6 thumbs (only for non-VIP)
              const showPromoBefore = !vip.isVip && i > 0 && i % 6 === 0;
              return (
                <div key={item.id} className="contents">
                  {showPromoBefore && (
                    <button
                      key={`promo-${i}`}
                      onClick={() => setUpgradeOpen(true)}
                      className="group relative col-span-2 flex aspect-[16/7] items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(20_95%_55%)] via-[hsl(15_92%_50%)] to-[hsl(0_85%_48%)] p-4 text-left text-white shadow-floating active:scale-[0.98] transition-transform animate-fade-in"
                    >
                      <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
                      <span className="pointer-events-none absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-yellow-300/15 blur-2xl" />
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md">
                        <Crown className="h-7 w-7 drop-shadow" />
                      </div>
                      <div className="relative min-w-0 flex-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-95">
                          Cansou de prévias?
                        </p>
                        <p className="text-base font-extrabold leading-tight drop-shadow">
                          Libere TUDO por R$ {vipPrice.toFixed(2).replace(".", ",")}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium opacity-95">
                          Todas as modelos · vídeos completos · ativação imediata
                        </p>
                      </div>
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[hsl(15_92%_45%)] shadow-button">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    </button>
                  )}
                  <button
                    key={item.id}
                    onClick={() => handleClick(item)}
                    className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted shadow-card text-left active:scale-[0.97] transition-transform animate-fade-in"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms`, animationFillMode: "backwards" }}
                  >
                    <VideoThumb
                      src={item.video_url}
                      alt={item.title}
                      blurred={locked}
                      className={cn(
                        "transition-transform duration-500 group-hover:scale-105",
                        locked && "blur-xl scale-110"
                      )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                    {item.is_vip && (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full gradient-primary px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-button">
                        <Flame className="h-2.5 w-2.5" /> VIP
                      </span>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-2.5 text-white">
                      {item.categories?.name && (
                        <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                          {item.categories.name}
                        </p>
                      )}
                      <p className="mt-0.5 line-clamp-2 text-[11px] font-bold leading-tight drop-shadow">
                        {item.title}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] opacity-90">
                        <Eye className="h-2.5 w-2.5" />
                        <span>{formatViews(displayViews(item.id, item.view_count))}</span>
                      </div>
                    </div>

                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/95 shadow-floating">
                          <Lock className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-card p-8 text-center shadow-card">
            <p className="text-sm font-semibold">Nada encontrado</p>
            <p className="mt-1 text-xs text-muted-foreground">Tente outra palavra-chave</p>
          </div>
        )}
      </div>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};
