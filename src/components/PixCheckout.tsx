import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Copy, Check, ShieldCheck, ExternalLink, ChevronRight, Lock } from "lucide-react";
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

  const amountStr = pix ? (pix.amount / 100).toFixed(2).replace(".", ",") : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[94%] gap-0 overflow-hidden rounded-2xl border-0 p-0 sm:max-w-[400px]">
        <VisuallyHidden>
          <DialogTitle>{headerTitle}</DialogTitle>
          <DialogDescription>Pagamento via PIX</DialogDescription>
        </VisuallyHidden>

        {/* Clean white header — no AI gradient */}
        <div className="border-b border-border bg-card px-5 pb-3 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                <span className="text-[10px] font-black tracking-tighter">PIX</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {stepLabel ?? "Pagamento seguro"}
                </p>
                <p className="text-sm font-bold leading-tight">{headerTitle}</p>
              </div>
            </div>
            {pix && (stage === "main" || stage === "fee") && (
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase text-muted-foreground">Total</p>
                <p className="text-base font-extrabold text-foreground">R$ {amountStr}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-secondary/30 px-5 py-5">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs font-semibold text-muted-foreground">Gerando código PIX...</p>
            </div>
          )}

          {/* Success between stages */}
          {!loading && (stage === "main_success" || stage === "fee_success") && (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Check className="h-7 w-7" strokeWidth={3} />
              </div>
              <div>
                <p className="text-base font-extrabold">Pagamento confirmado</p>
                <p className="mt-1 text-xs text-muted-foreground">Avance para a próxima etapa</p>
              </div>
              <button
                onClick={advance}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-foreground py-3.5 text-sm font-bold text-background transition-transform active:scale-[0.98]"
              >
                Continuar <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Done */}
          {!loading && stage === "done" && (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-7 w-7" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-base font-extrabold">Acesso liberado</p>
                <p className="mt-1 text-xs text-muted-foreground">Tudo pronto para você aproveitar</p>
              </div>
              {vipLink ? (
                <a
                  href={vipLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-button transition-transform active:scale-[0.98]"
                >
                  Acessar conteúdo
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="rounded-lg bg-card px-4 py-3 text-xs text-muted-foreground ring-1 ring-border">
                  Link de acesso ainda não configurado.
                </p>
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Fechar
              </button>
            </div>
          )}

          {/* Payment stage */}
          {!loading && pix && (stage === "main" || stage === "fee") && (
            <div className="space-y-3">
              {stage === "fee" && currentFee?.description && (
                <div className="rounded-lg bg-card px-3 py-2.5 text-xs text-foreground ring-1 ring-border">
                  {currentFee.description}
                </div>
              )}

              {/* QR Code */}
              {pix.qr_code_base64 && (
                <div className="flex justify-center rounded-xl bg-white p-4 ring-1 ring-border">
                  <img src={pix.qr_code_base64} alt="QR Code PIX" className="h-48 w-48" />
                </div>
              )}

              {/* Copy code */}
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Código copia e cola
                </p>
                <div className="rounded-lg bg-card p-2.5 ring-1 ring-border">
                  <p className="break-all font-mono text-[10px] leading-relaxed text-foreground/80">
                    {pix.qr_code}
                  </p>
                </div>
              </div>

              <button
                onClick={copyCode}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-bold text-background transition-transform active:scale-[0.98]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Código copiado" : "Copiar código PIX"}
              </button>

              <div className="flex items-center justify-between rounded-lg bg-card px-3 py-2 ring-1 ring-border">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Pagamento criptografado
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Aguardando
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
