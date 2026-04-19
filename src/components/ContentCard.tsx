import { Flame, Sparkles, Lock, Eye } from "lucide-react";
import { ContentItem } from "@/data/content";
import { useUser } from "@/contexts/UserContext";
import { useNav } from "@/contexts/NavContext";
import { useState } from "react";
import { UpgradeDialog } from "./UpgradeDialog";
import { cn } from "@/lib/utils";

interface ContentCardProps {
  item: ContentItem;
  index: number;
}

export const ContentCard = ({ item, index }: ContentCardProps) => {
  const { plan } = useUser();
  const { openVideo } = useNav();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const locked = item.premium && plan === "free";

  const handleClick = () => {
    if (locked) {
      setUpgradeOpen(true);
    } else {
      openVideo(item.id);
    }
  };

  return (
    <>
      <article
        className="group relative animate-fade-in"
        style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, animationFillMode: "backwards" }}
      >
        <button
          onClick={handleClick}
          className="relative block w-full overflow-hidden rounded-3xl bg-card shadow-card transition-transform duration-300 active:scale-[0.98]"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              className={cn(
                "h-full w-full object-cover transition-all duration-700 group-hover:scale-105",
                locked && "blur-xl scale-110"
              )}
            />
            <div className="absolute inset-0 gradient-overlay" />

            <div className="absolute left-3 top-3 flex gap-2">
              {item.badge === "alta" && (
                <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-button">
                  <Flame className="h-3 w-3" /> Em alta
                </span>
              )}
              {item.badge === "novo" && (
                <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground shadow">
                  <Sparkles className="h-3 w-3 text-primary" /> Novo
                </span>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{item.category}</p>
              <h3 className="mt-1 text-lg font-bold leading-tight drop-shadow">{item.title}</h3>
              <div className="mt-2 flex items-center gap-1 text-xs opacity-90">
                <Eye className="h-3.5 w-3.5" />
                <span>{item.views} visualizações</span>
              </div>
            </div>

            {locked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-foreground/30 backdrop-blur-[2px]">
                <div className="rounded-2xl bg-background/95 px-5 py-4 text-center shadow-floating">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full gradient-primary shadow-glow">
                    <Lock className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-foreground">
                    Conteúdo completo no Premium
                  </p>
                  <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider text-primary">
                    Desbloquear acesso →
                  </span>
                </div>
              </div>
            )}
          </div>
        </button>
      </article>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
};
