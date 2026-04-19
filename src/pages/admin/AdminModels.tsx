import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllModels, ModelRow } from "@/hooks/useSiteData";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resolveImage } from "@/lib/imageResolver";
import { Input, Textarea, Toggle } from "./AdminVideos";
import { FileUpload } from "@/components/admin/FileUpload";

const AdminModels = () => {
  const { data: models = [], isLoading } = useAllModels();
  const [editing, setEditing] = useState<Partial<ModelRow> | null>(null);
  const qc = useQueryClient();

  const remove = async (id: string) => {
    if (!confirm("Excluir esta modelo? Os vídeos associados ficarão sem dona.")) return;
    const { error } = await supabase.from("models").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    qc.invalidateQueries({ queryKey: ["models"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Modelos</h1>
          <p className="text-sm text-muted-foreground">{models.length} cadastradas</p>
        </div>
        <button
          onClick={() => setEditing({ is_active: true, monthly_price: 19.90, display_order: 0 })}
          className="gradient-primary shadow-button flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Nova modelo
        </button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="flex gap-3 p-3">
              <img src={resolveImage(m.avatar_url)} alt={m.name} className="h-16 w-16 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">@{m.handle}</p>
                <p className="mt-1 text-xs font-bold text-primary">R$ {Number(m.monthly_price).toFixed(2)}/mês</p>
                {!m.is_active && <span className="mt-1 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">Inativa</span>}
              </div>
            </div>
            <div className="flex gap-1 px-3 pb-3">
              <button onClick={() => setEditing(m)} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-secondary py-1.5 text-xs font-semibold">
                <Pencil className="h-3 w-3" /> Editar
              </button>
              <button onClick={() => remove(m.id)} className="flex items-center justify-center rounded-full bg-destructive/10 px-3 py-1.5 text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && <ModelForm model={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};

const ModelForm = ({ model, onClose }: { model: Partial<ModelRow>; onClose: () => void }) => {
  const [form, setForm] = useState<any>(model);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const save = async () => {
    if (!form.name?.trim() || !form.handle?.trim()) return toast.error("Nome e handle obrigatórios");
    setSaving(true);
    const payload = {
      name: form.name,
      handle: form.handle.replace(/^@/, "").toLowerCase(),
      bio: form.bio ?? null,
      avatar_url: form.avatar_url ?? null,
      cover_url: form.cover_url ?? null,
      monthly_price: Number(form.monthly_price ?? 19.9),
      is_active: form.is_active !== false,
      display_order: Number(form.display_order ?? 0),
    };
    const { error } = form.id
      ? await supabase.from("models").update(payload).eq("id", form.id)
      : await supabase.from("models").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo!");
    qc.invalidateQueries({ queryKey: ["models"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-background p-6 shadow-floating">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{form.id ? "Editar modelo" : "Nova modelo"}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <Input label="Nome" value={form.name ?? ""} onChange={(v: string) => setForm({ ...form, name: v })} />
          <Input label="Handle (sem @)" value={form.handle ?? ""} onChange={(v: string) => setForm({ ...form, handle: v })} />
          <Textarea label="Bio" value={form.bio ?? ""} onChange={(v: string) => setForm({ ...form, bio: v })} />
          <FileUpload label="Avatar" bucket="models" folder="avatars" accept="image"
            value={form.avatar_url} onChange={(url) => setForm({ ...form, avatar_url: url })} />
          <FileUpload label="Banner" bucket="models" folder="covers" accept="image"
            value={form.cover_url} onChange={(url) => setForm({ ...form, cover_url: url })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Preço mensal (R$)" type="number" value={String(form.monthly_price ?? 19.9)} onChange={(v: string) => setForm({ ...form, monthly_price: v })} />
            <Input label="Ordem" type="number" value={String(form.display_order ?? 0)} onChange={(v: string) => setForm({ ...form, display_order: v })} />
          </div>
          <Toggle label="Ativa" checked={form.is_active !== false} onChange={(v: boolean) => setForm({ ...form, is_active: v })} />
        </div>
        <button onClick={save} disabled={saving}
          className="gradient-primary shadow-button mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
      </div>
    </div>
  );
};

export default AdminModels;
