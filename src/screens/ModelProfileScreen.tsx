import { useMemo, useState } from "react";
import { ArrowLeft, Check, Crown, Lock, MessageCircle, Share2, Sparkles } from "lucide-react";
import { models } from "@/data/models";
import { useNav } from "@/contexts/NavContext";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const ModelProfileScreen = ({ id }: { id: string }) => {
  const { back } = useNav();
  const { isSubscribedTo, subscribeToModel } = useUser();
  const model = useMemo(() => models.find((m) => m.id === id) ?? models[0], [id]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const subscribed = isSubscribedTo(model.id);

  const handleSubscribe = () => {
    subscribeToModel(model.id);
    setConfirmOpen(false);
    toast.success(`Você assinou ${model.name}!`, {
      description: "Acesso liberado a toda a galeria.",
    });
  };

  const benefits = [
    "Acesso total à galeria",
    "Novos posts toda semana",
    "Mensagens diretas",
    "Conteúdo exclusivo de assinante",
  ];

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="relative flex-1 overflow-y-auto no-scrollbar pb-32">
        {/* Cover */}
        <div className="relative h-44 w-full overflow-hidden">
          <img src={model.cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-background" />
          <div className="absolute left-0 right-0 top-0 flex justify-between p-3 safe-top">
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

        {/* Profile header */}
        <div className="-mt-14 px-5">
          <div className="flex items-end gap-4">
            <div className="rounded-full bg-gradient-to-tr from-primary to-primary-glow p-[3px]">
              <img
                src={model.avatar}
                alt={model.name}
                className="h-24 w-24 rounded-full border-4 border-background object-cover shadow-floating"
              />
            </div>
            <div className="flex-1 pb-2">
              {subscribed && (
                <span className="inline-flex items-center gap-1 rounded-full gradient-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-button">
                  <Crown className="h-3 w-3" /> Assinante
                </span>
              )}
            </div>
          </div>

          <div className="mt-3">
            <h1 className="text-2xl font-extrabold tracking-tight">{model.name}</h1>
            <p className="text-xs font-medium text-muted-foreground">@{model.handle}</p>
            <p className="mt-2 text-sm leading-relaxed">{model.bio}</p>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-card p-3 shadow-card">
            <Stat label="Posts" value={model.posts.toString()} />
            <Stat label="Assinantes" value={model.subscribers} />
            <Stat label="Mensal" value={`R$${model.price.toFixed(0)}`} />
          </div>

          {/* Subscribe / actions */}
          {!subscribed ? (
            <div className="mt-5 overflow-hidden rounded-3xl border border-primary/20 bg-card shadow-card">
              <div className="gradient-primary px-5 py-4 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                      Plano mensal
                    </p>
                    <p className="text-2xl font-extrabold">
                      R$ {model.price.toFixed(2).replace(".", ",")}
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

        {/* Gallery */}
        <section className="px-4 pt-6">
          <h2 className="mb-3 px-1 text-sm font-bold text-muted-foreground">Galeria</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {model.gallery.map((g, i) => {
              const locked = !subscribed && i > 2;
              return (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                >
                  <img
                    src={g}
                    alt=""
                    loading="lazy"
                    className={cn("h-full w-full object-cover", locked && "blur-md scale-110")}
                  />
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/20">
                      <Lock className="h-5 w-5 text-white drop-shadow" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Confirm dialog (lightweight) */}
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
                <span className="font-bold text-primary"> R$ {model.price.toFixed(2).replace(".", ",")}/mês</span>.
              </p>
            </div>
            <button
              onClick={handleSubscribe}
              className="gradient-primary shadow-button mt-5 w-full rounded-full py-3.5 text-sm font-bold text-primary-foreground"
            >
              Confirmar e pagar
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
