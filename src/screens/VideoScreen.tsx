import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Eye, Heart, Lock, Share2, Sparkles, Loader2 } from "lucide-react";
import { useNav } from "@/contexts/NavContext";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { ContentCard } from "@/components/ContentCard";
import { VipPromoBanner } from "@/components/VipPromoBanner";
import { useVideo, useVideos, recordView } from "@/hooks/useSiteData";
import { cn } from "@/lib/utils";

const DEFAULT_DESCRIPTION =
  "Veja completo no nosso VIP agora mesmo. Mais de 10.000 vídeos postados, sem propagandas, com novos conteúdos toda semana.";

export const VideoScreen = ({ id }: { id: string }) => {
  const { back, openVideo } = useNav();
  const { user, vip } = useAuth();
  const { data: item, isLoading } = useVideo(id);
  const { data: allVideos = [] } = useVideos();

  const related = allVideos.filter((v) => v.id !== id).slice(0, 6);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [paywall, setPaywall] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const recordedRef = useRef(false);

  const previewSeconds = item?.preview_seconds ?? 12;
  const isUnlocked = !item?.is_vip || vip.isVip;

  useEffect(() => {
    setPaywall(false);
    recordedRef.current = false;
  }, [id]);

  // Time-based paywall enforcement for VIP previews
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !item) return;
    const onTime = () => {
      if (!isUnlocked && v.currentTime >= previewSeconds) {
        v.pause();
        setPaywall(true);
        if (!recordedRef.current) {
          recordedRef.current = true;
          recordView(item.id, v.currentTime, user?.id);
        }
      }
    };
    const onEnded = () => {
      if (!recordedRef.current && item) {
        recordedRef.current = true;
        recordView(item.id, v.duration || 0, user?.id);
      }
    };
    const onPlay = () => {
      // Record a view as soon as the user starts playing (fully unlocked content)
      if (isUnlocked && !recordedRef.current && item) {
        recordedRef.current = true;
        recordView(item.id, 0, user?.id);
      }
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    v.addEventListener("play", onPlay);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("play", onPlay);
    };
  }, [item, isUnlocked, previewSeconds, user?.id]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold">Vídeo não encontrado.</p>
        <button onClick={back} className="text-xs font-bold text-primary">← Voltar</button>
      </div>
    );
  }

  const description = item.description?.trim() || DEFAULT_DESCRIPTION;

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-black">
        {item.video_url ? (
          <video
            ref={videoRef}
            src={item.video_url}
            controls={!paywall}
            playsInline
            preload="metadata"
            className={cn("h-full w-full bg-black object-contain transition-all duration-500", paywall && "scale-110 blur-2xl")}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/60 text-sm">
            Vídeo indisponível
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />

        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-3 safe-top">
          <button
            onClick={back}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white"
            aria-label="Compartilhar"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {paywall && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-full max-w-sm rounded-3xl bg-background/95 p-6 shadow-floating backdrop-blur">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-glow">
                <Lock className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold">Continue assistindo no VIP</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Você assistiu uma prévia. Desbloqueie o vídeo completo e o acervo.
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

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-5 py-4">
          {item.categories?.name && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {item.categories.name}
            </p>
          )}
          <h1 className="mt-1 text-xl font-extrabold leading-tight">{item.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {item.view_count.toLocaleString("pt-BR")} visualizações
            </span>
            <span>•</span>
            <span>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
          </div>

          <div className="mt-4 flex gap-2">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-full bg-secondary py-2.5 text-xs font-semibold">
              <Heart className="h-4 w-4" /> Curtir
            </button>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-full bg-secondary py-2.5 text-xs font-semibold">
              <Share2 className="h-4 w-4" /> Compartilhar
            </button>
          </div>

          {/* VIP promo banner — sempre visível abaixo de qualquer vídeo */}
          {!vip.isVip && (
            <div className="mt-4">
              <VipPromoBanner />
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-card p-4 shadow-card">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</h2>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{description}</p>
          </div>
        </div>

        {related.length > 0 && (
          <section className="px-4 pt-2">
            <h2 className="mb-3 px-1 text-sm font-bold text-muted-foreground">Vídeos relacionados</h2>
            <div className="space-y-4">
              {related.map((r, i) => (
                <button key={r.id} onClick={() => openVideo(r.id)} className="block w-full text-left">
                  <ContentCard item={r} index={i} />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};
