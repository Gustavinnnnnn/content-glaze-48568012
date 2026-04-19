import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Copy, Check, QrCode, ShieldCheck, ExternalLink, Send, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface PixCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseType: "vip_global" | "model_subscription";
  modelId?: string;
  title?: string;
}

interface PixData {
  order_id: string;
  qr_code: string;
  qr_code_base64: string;
  amount: number;
}

interface NextFee {
  fee_id: string;
  name: string;
  description: string | null;
  amount: number;
  step_index: number;
  total_steps: number;
}

type Stage = "main" | "main_success" | "fee" | "fee_success" | "done";

export const PixCheckout = ({ open, onOpenChange, purchaseType, modelId, title = "Pagamento PIX" }: PixCheckoutProps) => {
  const { refresh, user } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [stage, setStage] = useState<Stage>("main");
  const [parentOrderId, setParentOrderId] = useState<string | null>(null);
  const [currentFee, setCurrentFee] = useState<NextFee | null>(null);
  const [vipLink, setVipLink] = useState<string | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPix(null);
      setStage("main");
      setParentOrderId(null);
      setCurrentFee(null);
      setVipLink(null);
    }
  }, [open]);

  const loadNextFee = useCallback(async (): Promise<NextFee | null> => {
    if (!user) return null;
    const { data } = await supabase.rpc("next_pending_fee", { _user_id: user.id });
    return (data && data[0]) ?? null;
  }, [user]);

  const fetchVipLink = useCallback(async () => {
    const { data: tg } = await supabase
      .from("telegram_config")
      .select("vip_channel_invite_link")
      .eq("id", 1)
      .maybeSingle();
    setVipLink(tg?.vip_channel_invite_link ?? null);
  }, []);

  // Generate PIX whenever entering a payment stage
  useEffect(() => {
    if (!open) return;
    if (stage !== "main" && stage !== "fee") return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setPix(null);
      try {
        const body: Record<string, unknown> =
          stage === "fee" && currentFee
            ? { purchase_type: "access_fee", fee_id: currentFee.fee_id, parent_order_id: parentOrderId }
            : { purchase_type: purchaseType, model_id: modelId };
        const { data, error } = await supabase.functions.invoke("paradise-create-pix", { body });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!cancelled) setPix(data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao gerar PIX");
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, stage, currentFee, parentOrderId, purchaseType, modelId, onOpenChange]);

  // Poll order status
  useEffect(() => {
    if (!pix?.order_id) return;
    if (stage !== "main" && stage !== "fee") return;

    const interval = setInterval(async () => {
      const { data: order } = await supabase
        .from("orders")
        .select("status, id")
        .eq("id", pix.order_id)
        .maybeSingle();
      if (order?.status === "paid") {
        clearInterval(interval);
        if (stage === "main") {
          setParentOrderId(order.id);
          toast.success("Pagamento confirmado!");
          setStage("main_success");
        } else if (stage === "fee") {
          toast.success("Taxa paga!");
          setStage("fee_success");
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [pix?.order_id, stage]);

  const advance = async () => {
    setLoading(true);
    const next = await loadNextFee();
    if (next) {
      setCurrentFee(next);
      setStage("fee");
    } else {
      // Done — activate parent purchase finished, show vip link
      await refresh();
      qc.invalidateQueries();
      await fetchVipLink();
      setStage("done");
    }
    setLoading(false);
  };

  const copyCode = async () => {
    if (!pix?.qr_code) return;
    await navigator.clipboard.writeText(pix.qr_code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const headerTitle =
    stage === "fee" || stage === "fee_success"
      ? currentFee?.name ?? "Taxa de acesso"
      : stage === "done"
      ? "Acesso liberado"
      : stage === "main_success"
      ? "Pagamento confirmado"
      : title;

  const stepLabel = currentFee && (stage === "fee" || stage === "fee_success")
    ? `Etapa ${currentFee.step_index} de ${currentFee.total_steps}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92%] gap-0 overflow-hidden rounded-3xl border-0 p-0 sm:max-w-md">
        <VisuallyHidden>
          <DialogTitle>{headerTitle}</DialogTitle>
          <DialogDescription>Pagamento via PIX</DialogDescription>
        </VisuallyHidden>

        <div className="gradient-primary relative px-6 pb-6 pt-8 text-center text-primary-foreground">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            {stage === "done" || stage === "main_success" || stage === "fee_success" ? (
              <Check className="h-7 w-7" />
            ) : stage === "fee" ? (
              <ShieldCheck className="h-7 w-7" />
            ) : (
              <QrCode className="h-7 w-7" />
            )}
          </div>
          <h2 className="mt-3 text-2xl font-extrabold">{headerTitle}</h2>
          {stepLabel && (
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wider opacity-90">{stepLabel}</p>
          )}
          {pix && (stage === "main" || stage === "fee") && (
            <p className="mt-1 text-sm opacity-90">
              R$ {(pix.amount / 100).toFixed(2).replace(".", ",")}
            </p>
          )}
        </div>

        <div className="px-6 py-6">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          )}

          {/* Success between stages */}
          {!loading && (stage === "main_success" || stage === "fee_success") && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <p className="text-base font-bold text-foreground">Pagamento confirmado!</p>
              <p className="text-sm text-muted-foreground">
                Clique em continuar para a próxima etapa.
              </p>
              <button
                onClick={advance}
                className="gradient-primary shadow-button mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* All done */}
          {!loading && stage === "done" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <p className="text-base font-bold text-foreground">Acesso liberado!</p>
              <p className="text-sm text-muted-foreground">Seu acesso ao canal VIP está ativo.</p>
              {vipLink ? (
                <a
                  href={vipLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gradient-primary shadow-button mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
                >
                  <Send className="h-4 w-4" />
                  Entrar no canal VIP
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
                  O link do canal VIP ainda não foi configurado.
                </p>
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="mt-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Payment stage */}
          {!loading && pix && (stage === "main" || stage === "fee") && (
            <>
              {stage === "fee" && currentFee?.description && (
                <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
                  {currentFee.description}
                </div>
              )}
              {pix.qr_code_base64 && (
                <div className="mb-4 flex justify-center rounded-2xl bg-white p-3">
                  <img src={pix.qr_code_base64} alt="QR Code PIX" className="h-56 w-56" />
                </div>
              )}
              <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">
                Escaneie o QR Code ou copie o código abaixo
              </p>
              <div className="rounded-xl bg-secondary p-3">
                <p className="break-all text-[10px] font-mono leading-relaxed">{pix.qr_code}</p>
              </div>
              <button
                onClick={copyCode}
                className="gradient-primary shadow-button mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado!" : "Copiar código PIX"}
              </button>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Aguardando pagamento...
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
