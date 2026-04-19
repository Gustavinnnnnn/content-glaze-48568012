import { Search, Eye, Lock, Flame } from "lucide-react";
import { useMemo, useState } from "react";
import { useVideos } from "@/hooks/useSiteData";
import { useAuth } from "@/contexts/AuthContext";
import { useNav } from "@/contexts/NavContext";
import { VideoThumb } from "@/components/VideoThumb";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { displayViews, formatViews } from "@/lib/displayViews";
import { cn } from "@/lib/utils";

export const ExploreScreen = () => {
  const [query, setQuery] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { data: videos = [] } = useVideos("explore");
  const { vip } = useAuth();
  const { openVideo } = useNav();

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
              return (
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
