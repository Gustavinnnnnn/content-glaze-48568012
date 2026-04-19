import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Copy, Check, QrCode, ShieldCheck, ExternalLink, Send } from "lucide-react";
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
  expires_at: string;
}

type Stage = "main" | "fee" | "done";

export const PixCheckout = ({ open, onOpenChange, purchaseType, modelId, title = "Pagamento PIX" }: PixCheckoutProps) => {
  const { refresh } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [stage, setStage] = useState<Stage>("main");
  const [parentOrderId, setParentOrderId] = useState<string | null>(null);
  const [vipLink, setVipLink] = useState<string | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setPix(null);
      setStage("main");
      setParentOrderId(null);
      setVipLink(null);
    }
  }, [open]);

  // Generate PIX for current stage
  useEffect(() => {
    if (!open || stage === "done") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPix(null);
      try {
        const body: Record<string, unknown> =
          stage === "fee"
            ? { purchase_type: "access_fee", parent_order_id: parentOrderId }
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
  }, [open, stage, purchaseType, modelId, parentOrderId, onOpenChange]);

  // Poll for payment status
  useEffect(() => {
    if (!pix?.order_id || stage === "done") return;
    const interval = setInterval(async () => {
      const { data: order } = await supabase
        .from("orders")
        .select("status, id")
        .eq("id", pix.order_id)
        .maybeSingle();
      if (order?.status === "paid") {
        clearInterval(interval);
        if (stage === "main") {
          // Wait briefly for webhook to create the fee order, then load it
          setParentOrderId(order.id);
          toast.success("Pagamento recebido! Agora a taxa de acesso.");
          setTimeout(() => setStage("fee"), 1500);
        } else if (stage === "fee") {
          // Fully paid — show Telegram link
          await refresh();
          qc.invalidateQueries();
          const { data: tg } = await supabase
            .from("telegram_config")
            .select("vip_channel_invite_link")
            .eq("id", 1)
            .maybeSingle();
          setVipLink(tg?.vip_channel_invite_link ?? null);
          setStage("done");
          toast.success("Acesso liberado! 🎉");
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [pix?.order_id, stage, refresh, qc]);

  const copyCode = async () => {
    if (!pix?.qr_code) return;
    await navigator.clipboard.writeText(pix.qr_code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const headerTitle = stage === "fee" ? "Taxa de acesso" : stage === "done" ? "Acesso liberado" : title;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92%] gap-0 overflow-hidden rounded-3xl border-0 p-0 sm:max-w-md">
        <VisuallyHidden>
          <DialogTitle>{headerTitle}</DialogTitle>
          <DialogDescription>Pagamento via PIX</DialogDescription>
        </VisuallyHidden>

        <div className="gradient-primary relative px-6 pb-6 pt-8 text-center text-primary-foreground">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            {stage === "done" ? <Check className="h-7 w-7" /> : stage === "fee" ? <ShieldCheck className="h-7 w-7" /> : <QrCode className="h-7 w-7" />}
          </div>
          <h2 className="mt-3 text-2xl font-extrabold">{headerTitle}</h2>
          {pix && stage !== "done" && (
            <p className="mt-1 text-sm opacity-90">
              R$ {(pix.amount / 100).toFixed(2).replace(".", ",")}
            </p>
          )}
          {stage === "fee" && (
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider opacity-95">
              💰 100% reembolsável
            </p>
          )}
        </div>

        <div className="px-6 py-6">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando PIX...</p>
            </div>
          )}

          {stage === "done" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <p className="text-base font-bold text-foreground">Pagamento confirmado!</p>
              <p className="text-sm text-muted-foreground">Seu acesso ao canal VIP está liberado.</p>
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
                  O link do canal VIP ainda não foi configurado. Entre em contato com o suporte.
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

          {pix && stage !== "done" && !loading && (
            <>
              {stage === "fee" && (
                <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
                  <strong>⚠️ Última etapa:</strong> esta taxa libera seu acesso e será 100% reembolsada.
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
