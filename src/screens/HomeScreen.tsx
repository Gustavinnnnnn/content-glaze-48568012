import { contentList } from "@/data/content";
import { ContentCard } from "@/components/ContentCard";
import { Bell, Crown } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useEffect, useRef, useState } from "react";

export const HomeScreen = () => {
  const { name, plan } = useUser();
  const [visible, setVisible] = useState(8);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
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
            <p className="text-xs font-medium text-muted-foreground">Olá, {name}</p>
            <h1 className="text-xl font-extrabold tracking-tight">
              Descubra <span className="text-primary">algo novo</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {plan === "premium" && (
              <div className="flex items-center gap-1 rounded-full gradient-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-button">
                <Crown className="h-3 w-3" /> Premium
              </div>
            )}
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-muted">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Feed */}
      <div className="space-y-4 px-4 py-4">
        {contentList.slice(0, visible).map((item, i) => (
          <ContentCard key={item.id} item={item} index={i} />
        ))}
        <div ref={sentinelRef} className="flex h-20 items-center justify-center">
          {visible < contentList.length && (
            <div className="flex gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
