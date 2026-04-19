import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, Heart, Lock, Play, Share2, Sparkles } from "lucide-react";
import { contentList } from "@/data/content";
import { useNav } from "@/contexts/NavContext";
import { useUser } from "@/contexts/UserContext";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { ContentCard } from "@/components/ContentCard";
import { cn } from "@/lib/utils";

const PREVIEW_SECONDS = 12;

export const VideoScreen = ({ id }: { id: string }) => {
  const { back, openVideo } = useNav();
  const { plan } = useUser();
  const item = useMemo(() => contentList.find((c) => c.id === id) ?? contentList[0], [id]);
  const related = useMemo(
    () => contentList.filter((c) => c.id !== item.id).slice(0, 6),
    [item.id]
  );

  const [elapsed, setElapsed] = useState(0);
  const [paywall, setPaywall] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const startRef = useRef<number>(Date.now());

  const isPremium = plan === "premium";

  // Simulated playback timer (only for free users)
  useEffect(() => {
    if (isPremium) return;
    startRef.current = Date.now();
    setElapsed(0);
    setPaywall(false);
    const id = setInterval(() => {
      const e = (Date.now() - startRef.current) / 1000;
      setElapsed(e);
      if (e >= PREVIEW_SECONDS) {
        setPaywall(true);
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }, [item.id, isPremium]);

  const progress = isPremium ? 35 : Math.min((elapsed / PREVIEW_SECONDS) * 100, 100);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Player */}
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-black">
        <img
          src={item.image}
          alt={item.title}
          className={cn(
            "h-full w-full object-cover transition-all duration-500",
            paywall && "scale-110 blur-2xl"
          )}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/40" />

        {/* Top bar */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-3 safe-top">
          <button
            onClick={back}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white"
            aria-label="Compartilhar"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {/* Play indicator (decorative) */}
        {!paywall && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-md">
              <Play className="h-7 w-7 fill-white text-white" />
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Paywall overlay */}
        {paywall && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-full max-w-sm rounded-3xl bg-background/95 p-6 shadow-floating backdrop-blur">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-glow">
                <Lock className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold">Continue assistindo no VIP</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Você assistiu uma prévia. Desbloqueie o vídeo completo + acervo ilimitado.
              </p>
              <button
                onClick={() => setUpgradeOpen(true)}
                className="gradient-primary shadow-button mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-primary-foreground"
              >
                <Sparkles className="h-4 w-4" /> Desbloquear acesso VIP
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable info + related */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            {item.category}
          </p>
          <h1 className="mt-1 text-xl font-extrabold leading-tight">{item.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {item.views} visualizações
            </span>
            <span>•</span>
            <span>há 2 dias</span>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-full bg-secondary py-2.5 text-xs font-semibold">
              <Heart className="h-4 w-4" /> Curtir
            </button>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-full bg-secondary py-2.5 text-xs font-semibold">
              <Share2 className="h-4 w-4" /> Compartilhar
            </button>
          </div>

          {/* Description */}
          <div className="mt-5 rounded-2xl bg-card p-4 shadow-card">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Descrição
            </h2>
            <p className="mt-2 text-sm leading-relaxed">
              {item.title}. Um conteúdo exclusivo da categoria {item.category.toLowerCase()},
              produzido com qualidade premium. Assista até o final e descubra muito mais
              em nosso acervo VIP.
            </p>
          </div>
        </div>

        {/* Related */}
        <section className="px-4 pt-2">
          <h2 className="mb-3 px-1 text-sm font-bold text-muted-foreground">
            Vídeos relacionados
          </h2>
          <div className="space-y-4">
            {related.map((r, i) => (
              <button
                key={r.id}
                onClick={() => openVideo(r.id)}
                className="block w-full text-left"
              >
                <ContentCard item={r} index={i} />
              </button>
            ))}
          </div>
        </section>
      </div>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};
