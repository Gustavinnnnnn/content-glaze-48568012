import { useState } from "react";
import { ArrowLeft, Check, Crown, Lock, MessageCircle, Share2, Sparkles, Verified, Loader2, Image as ImageIcon, Film } from "lucide-react";
import { useNav } from "@/contexts/NavContext";
import { useAuth } from "@/contexts/AuthContext";
import { useModel, useModelVideos } from "@/hooks/useSiteData";
import { useModelPhotos } from "@/components/admin/ModelPhotosManager";
import { resolveImage } from "@/lib/imageResolver";
import { getModelBio } from "@/lib/rotatingCopy";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { PixCheckout } from "@/components/PixCheckout";

export const ModelProfileScreen = ({ id }: { id: string }) => {
  const { back, openVideo } = useNav();
  const navigate = useNavigate();
  const { user, vip, subscribedModelIds } = useAuth();
  const { data: model, isLoading } = useModel(id);
  const { data: videos = [] } = useModelVideos(id);
  const { data: photos = [] } = useModelPhotos(id);
  const [tab, setTab] = useState<"photos" | "videos">("photos");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);

  const subscribed = !!model && (vip.isVip || subscribedModelIds.includes(model.id));

  const handleConfirm = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!model) return;
    setConfirmOpen(false);
    setPixOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold">Modelo não encontrada.</p>
        <button onClick={back} className="text-xs font-bold text-primary">
          ← Voltar
        </button>
      </div>
    );
  }

  const benefits = [
    "Acesso total à galeria",
    "Novos posts toda semana",
    "Mensagens diretas",
    "Conteúdo exclusivo",
  ];

  return (
    <div className="relative flex h-full flex-col bg-background">
      <div className="relative flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="relative h-52 w-full overflow-hidden">
          <img src={resolveImage(model.cover_url)} alt="" className="h-full w-full scale-110 object-cover blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background" />
          <div className="absolute left-0 right-0 top-0 z-10 flex justify-between p-3 safe-top">
            <button
              onClick={back}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
              aria-label="Compartilhar"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="-mt-20 px-5">
          <div className="flex flex-col items-center text-center">
            <div className="relative rounded-full bg-gradient-to-tr from-primary to-primary-glow p-[3px] shadow-floating">
              <img
                src={resolveImage(model.avatar_url)}
                alt={model.name}
                className="h-28 w-28 rounded-full border-4 border-background object-cover"
              />
              {subscribed && (
                <span className="absolute -bottom-1 right-0 flex h-7 w-7 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-button">
                  <Crown className="h-3.5 w-3.5" />
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              <h1 className="text-2xl font-extrabold tracking-tight">{model.name}</h1>
              <Verified className="h-5 w-5 fill-primary text-primary-foreground" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">@{model.handle}</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed">
              {getModelBio(model.id, model.name, model.bio)}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-card p-3 shadow-card">
            <Stat label="Fotos" value={photos.length.toString()} />
            <Stat label="Vídeos" value={videos.length.toString()} />
            <Stat label="Mensal" value={`R$${Number(model.monthly_price).toFixed(0)}`} />
          </div>

          {!subscribed ? (
            <div className="mt-5 overflow-hidden rounded-3xl border border-primary/20 bg-card shadow-card">
              <div className="gradient-primary px-5 py-4 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                      Plano mensal
                    </p>
                    <p className="text-2xl font-extrabold">
                      R$ {Number(model.monthly_price).toFixed(2).replace(".", ",")}
                      <span className="text-xs font-medium opacity-90">/mês</span>
                    </p>
                  </div>
                  <Crown className="h-8 w-8 opacity-90" />
                </div>
              </div>
              <div className="space-y-2 px-5 py-4">
                {benefits.map((b) => (
                  <div key={b} className="flex items-center gap-2 text-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="font-medium">{b}</span>
                  </div>
                ))}
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="gradient-primary shadow-button mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" /> Assinar {model.name.split(" ")[0]}
                </button>
              </div>
            </div>
          ) : (
            <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3.5 text-sm font-bold">
              <MessageCircle className="h-4 w-4" /> Enviar mensagem
            </button>
          )}
        </div>

        <section className="px-4 pt-6">
          {/* Tabs */}
          <div className="mb-3 flex gap-1 rounded-full bg-secondary p-1">
            <button
              onClick={() => setTab("photos")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all",
                tab === "photos" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <ImageIcon className="h-3.5 w-3.5" /> Fotos · {photos.length}
            </button>
            <button
              onClick={() => setTab("videos")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all",
                tab === "videos" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Film className="h-3.5 w-3.5" /> Vídeos · {videos.length}
            </button>
          </div>

          {tab === "photos" && (
            photos.length === 0 ? (
              <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                Nenhuma foto na galeria ainda.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {photos.map((p, i) => {
                  const locked = (p.is_vip || i > 2) && !subscribed;
                  return (
                    <div
                      key={p.id}
                      className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                    >
                      <img
                        src={resolveImage(p.image_url)}
                        alt=""
                        loading="lazy"
                        className={cn("h-full w-full object-cover", locked && "blur-xl scale-110")}
                      />
                      {locked && (
                        <button
                          onClick={() => setConfirmOpen(true)}
                          className="absolute inset-0 flex items-center justify-center bg-foreground/20"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background/95 shadow-card">
                            <Lock className="h-4 w-4 text-primary" />
                          </div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {tab === "videos" && (
            videos.length === 0 ? (
              <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                Nenhum vídeo publicado ainda.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {videos.map((v, i) => {
                  const locked = !subscribed && i > 2;
                  return (
                    <button
                      key={v.id}
                      onClick={() => !locked && openVideo(v.id)}
                      className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                    >
                      <img
                        src={resolveImage(v.thumbnail_url)}
                        alt={v.title}
                        loading="lazy"
                        className={cn("h-full w-full object-cover", locked && "blur-md scale-110")}
                      />
                      {locked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-foreground/20">
                          <Lock className="h-5 w-5 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          )}
        </section>
      </div>

      {confirmOpen && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-background p-6 shadow-floating sm:rounded-3xl">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-muted sm:hidden" />
            <div className="mt-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-glow">
                <Crown className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="mt-3 text-lg font-extrabold">Confirmar assinatura</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Você vai assinar <span className="font-bold text-foreground">{model.name}</span> por
                <span className="font-bold text-primary">
                  {" "}
                  R$ {Number(model.monthly_price).toFixed(2).replace(".", ",")}/mês
                </span>
                .
              </p>
            </div>
            <button
              onClick={handleConfirm}
              className="gradient-primary shadow-button mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-primary-foreground"
            >
              {!user ? "Entrar e continuar" : "Pagar com PIX"}
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="mt-2 w-full py-2 text-xs font-medium text-muted-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <PixCheckout
        open={pixOpen}
        onOpenChange={setPixOpen}
        purchaseType="model_subscription"
        modelId={model.id}
        title={`Assinar ${model.name}`}
      />
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <p className="text-base font-extrabold">{value}</p>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </p>
  </div>
);
