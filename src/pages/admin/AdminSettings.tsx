import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteData";
import { Input, Textarea } from "./AdminVideos";
import { FileUpload } from "@/components/admin/FileUpload";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AdminSettings = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const save = async () => {
    if (!settings?.id) return;
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({
      site_name: form.site_name,
      site_tagline: form.site_tagline,
      logo_url: form.logo_url,
      vip_monthly_price: Number(form.vip_monthly_price),
      vip_duration_days: Number(form.vip_duration_days),
      payment_gateway: form.payment_gateway,
      support_email: form.support_email,
      access_fee_enabled: !!form.access_fee_enabled,
      access_fee_amount: Number(form.access_fee_amount || 0),
    }).eq("id", settings.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Configurações do site</h1>
        <p className="text-sm text-muted-foreground">Personalize nome, preços e gateway</p>
      </div>

      <div className="max-w-2xl space-y-4 rounded-3xl border border-border bg-card p-6 shadow-card">
        <Input label="Nome do site" value={form.site_name ?? ""} onChange={(v: string) => setForm({ ...form, site_name: v })} />
        <Textarea label="Subtítulo" value={form.site_tagline ?? ""} onChange={(v: string) => setForm({ ...form, site_tagline: v })} />
        <FileUpload label="Logo" bucket="site" folder="logo" accept="image"
          value={form.logo_url} onChange={(url) => setForm({ ...form, logo_url: url })} />
        <Input label="Email de suporte" value={form.support_email ?? ""} onChange={(v: string) => setForm({ ...form, support_email: v })} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Preço VIP (R$)" type="number" value={String(form.vip_monthly_price ?? "")} onChange={(v: string) => setForm({ ...form, vip_monthly_price: v })} />
          <Input label="Duração VIP (dias)" type="number" value={String(form.vip_duration_days ?? "")} onChange={(v: string) => setForm({ ...form, vip_duration_days: v })} />
        </div>

        <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Taxa de acesso reembolsável</p>
              <p className="text-[11px] text-muted-foreground">Cobrança extra após o pagamento principal. 100% reembolsável.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only"
                checked={!!form.access_fee_enabled}
                onChange={(e) => setForm({ ...form, access_fee_enabled: e.target.checked })} />
              <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>
          <Input label="Valor da taxa (R$)" type="number"
            value={String(form.access_fee_amount ?? "24.90")}
            onChange={(v: string) => setForm({ ...form, access_fee_amount: v })} />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Gateway de pagamento</label>
          <select value={form.payment_gateway ?? ""} onChange={(e) => setForm({ ...form, payment_gateway: e.target.value || null })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <option value="">— Nenhum (modo manual) —</option>
            <option value="mercadopago">Mercado Pago</option>
            <option value="stripe">Stripe</option>
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">A integração será conectada na próxima fase.</p>
        </div>

        <button onClick={save} disabled={saving}
          className="gradient-primary shadow-button mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar configurações
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
