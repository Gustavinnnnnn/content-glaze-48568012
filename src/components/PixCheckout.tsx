import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Copy, Check, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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

export const PixCheckout = ({ open, onOpenChange, purchaseType, modelId, title = "Pagamento PIX" }: PixCheckoutProps) => {
  const { refresh } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!open) {
      setPix(null);
      setPaid(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("paradise-create-pix", {
          body: { purchase_type: purchaseType, model_id: modelId },
        });
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
  }, [open, purchaseType, modelId]);

  // Poll for payment status
  useEffect(() => {
    if (!pix?.order_id || paid) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("orders").select("status").eq("id", pix.order_id).maybeSingle();
      if (data?.status === "paid") {
        setPaid(true);
        clearInterval(interval);
        await refresh();
        qc.invalidateQueries();
        toast.success("Pagamento confirmado! Acesso liberado.");
        setTimeout(() => onOpenChange(false), 2000);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [pix?.order_id, paid, refresh, qc, onOpenChange]);

  const copyCode = async () => {
    if (!pix?.qr_code) return;
    await navigator.clipboard.writeText(pix.qr_code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92%] gap-0 overflow-hidden rounded-3xl border-0 p-0 sm:max-w-md">
        <div className="gradient-primary relative px-6 pb-6 pt-8 text-center text-primary-foreground">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <QrCode className="h-7 w-7" />
          </div>
          <h2 className="mt-3 text-2xl font-extrabold">{title}</h2>
          {pix && (
            <p className="mt-1 text-sm opacity-90">
              R$ {(pix.amount / 100).toFixed(2).replace(".", ",")}
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

          {paid && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-8 w-8" />
              </div>
              <p className="text-base font-bold">Pagamento confirmado!</p>
              <p className="text-xs text-muted-foreground">Acesso liberado.</p>
            </div>
          )}

          {pix && !paid && (
            <>
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
