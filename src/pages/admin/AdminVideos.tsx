import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllVideos, useAllModels, useCategories, VideoRow, Placement } from "@/hooks/useSiteData";
import { Plus, Pencil, Trash2, X, Loader2, FileVideo } from "lucide-react";
import { toast } from "sonner";
import { FileUpload } from "@/components/admin/FileUpload";

const AdminVideos = () => {
  const { data: videos = [], isLoading } = useAllVideos();
  const [editing, setEditing] = useState<Partial<VideoRow> | null>(null);
  const qc = useQueryClient();

  const remove = async (id: string) => {
    if (!confirm("Excluir este vídeo?")) return;
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Vídeo excluído");
    qc.invalidateQueries({ queryKey: ["videos"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold md:text-2xl">Vídeos</h1>
          <p className="text-xs text-muted-foreground md:text-sm">{videos.length} no total</p>
        </div>
        <button
          onClick={() => setEditing({ placement: "home", is_vip: false, is_active: true, preview_seconds: 12, display_order: 0 })}
          className="gradient-primary shadow-button flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-primary-foreground md:text-sm"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <div key={v.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="relative aspect-video bg-black">
              {v.video_url ? (
                <video src={v.video_url} className="h-full w-full object-cover" muted preload="metadata" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <FileVideo className="h-8 w-8" />
                </div>
              )}
              <div className="absolute left-2 top-2 flex gap-1">
                <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">{v.placement}</span>
                {v.is_vip && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">VIP</span>}
                {!v.is_active && <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white">Inativo</span>}
              </div>
            </div>
            <div className="p-3">
              <p className="line-clamp-1 text-sm font-bold">{v.title}</p>
              <p className="text-[11px] text-muted-foreground">{v.categories?.name ?? "Sem categoria"} · {v.view_count} views</p>
              <div className="mt-2 flex gap-1">
                <button onClick={() => setEditing(v)} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-secondary py-1.5 text-xs font-semibold">
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button onClick={() => remove(v.id)} className="flex items-center justify-center rounded-full bg-destructive/10 px-3 py-1.5 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && <VideoForm video={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};

const VideoForm = ({ video, onClose }: { video: Partial<VideoRow>; onClose: () => void }) => {
  const { data: models = [] } = useAllModels();
  const { data: categories = [] } = useCategories();
  const [form, setForm] = useState<any>(video);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const save = async () => {
    if (!form.title?.trim()) return toast.error("Título obrigatório");
    if (!form.video_url) return toast.error("Envie o arquivo de vídeo");
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description ?? null,
      thumbnail_url: null,
      video_url: form.video_url,
      placement: form.placement as Placement,
      is_vip: !!form.is_vip,
      is_featured: !!form.is_featured,
      is_active: form.is_active !== false,
      preview_seconds: Number(form.preview_seconds ?? 12),
      category_id: form.category_id || null,
      model_id: form.model_id || null,
      display_order: Number(form.display_order ?? 0),
    };
    const { error } = form.id
      ? await supabase.from("videos").update(payload).eq("id", form.id)
      : await supabase.from("videos").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo!");
    qc.invalidateQueries({ queryKey: ["videos"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-3 backdrop-blur-sm md:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-background p-5 shadow-floating md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{form.id ? "Editar vídeo" : "Novo vídeo"}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <Input label="Título" value={form.title ?? ""} onChange={(v) => setForm({ ...form, title: v })} />
          <Textarea label="Descrição" value={form.description ?? ""} onChange={(v) => setForm({ ...form, description: v })} />
          <FileUpload
            label="Arquivo de vídeo"
            bucket="videos"
            accept="video"
            value={form.video_url}
            onChange={(url) => setForm({ ...form, video_url: url })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Local" value={form.placement ?? "home"} onChange={(v) => setForm({ ...form, placement: v })}
              options={[{ v: "home", l: "Início" }, { v: "explore", l: "Explorar" }, { v: "shorts", l: "Shorts" }]} />
            <Select label="Categoria" value={form.category_id ?? ""} onChange={(v) => setForm({ ...form, category_id: v })}
              options={[{ v: "", l: "—" }, ...categories.map((c: any) => ({ v: c.id, l: c.name }))]} />
          </div>
          <Select label="Modelo dona" value={form.model_id ?? ""} onChange={(v) => setForm({ ...form, model_id: v })}
            options={[{ v: "", l: "—" }, ...models.map((m) => ({ v: m.id, l: m.name }))]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prévia (segundos)" type="number" value={String(form.preview_seconds ?? 12)} onChange={(v) => setForm({ ...form, preview_seconds: v })} />
            <Input label="Ordem" type="number" value={String(form.display_order ?? 0)} onChange={(v) => setForm({ ...form, display_order: v })} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Toggle label="VIP" checked={!!form.is_vip} onChange={(v) => setForm({ ...form, is_vip: v })} />
            <Toggle label="Destaque" checked={!!form.is_featured} onChange={(v) => setForm({ ...form, is_featured: v })} />
            <Toggle label="Ativo" checked={form.is_active !== false} onChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="gradient-primary shadow-button mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
      </div>
    </div>
  );
};

export const Input = ({ label, value, onChange, type = "text", placeholder }: any) => (
  <div>
    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
  </div>
);
export const Textarea = ({ label, value, onChange }: any) => (
  <div>
    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
  </div>
);
export const Select = ({ label, value, onChange, options }: any) => (
  <div>
    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
      {options.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);
export const Toggle = ({ label, checked, onChange }: any) => (
  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-primary" />
    {label}
  </label>
);

export default AdminVideos;
