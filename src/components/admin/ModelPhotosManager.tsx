import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/imageResolver";
import { FileUpload } from "./FileUpload";
import { toast } from "sonner";
import { Trash2, Crown, Loader2, ImagePlus } from "lucide-react";

interface ModelPhoto {
  id: string;
  model_id: string;
  image_url: string;
  caption: string | null;
  is_vip: boolean;
  display_order: number;
}

export const useModelPhotos = (modelId: string | null | undefined) =>
  useQuery({
    queryKey: ["model-photos", modelId],
    queryFn: async () => {
      if (!modelId) return [] as ModelPhoto[];
      const { data, error } = await supabase
        .from("model_photos")
        .select("*")
        .eq("model_id", modelId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ModelPhoto[];
    },
    enabled: !!modelId,
  });

interface Props {
  modelId: string;
}

export const ModelPhotosManager = ({ modelId }: Props) => {
  const qc = useQueryClient();
  const { data: photos = [], isLoading } = useModelPhotos(modelId);
  const [uploadingUrl, setUploadingUrl] = useState<string | null>(null);
  const [isVip, setIsVip] = useState(false);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  const addPhoto = async (url: string) => {
    setUploadingUrl(url);
  };

  const confirmAdd = async () => {
    if (!uploadingUrl) return;
    setSaving(true);
    const { error } = await supabase.from("model_photos").insert({
      model_id: modelId,
      image_url: uploadingUrl,
      caption: caption || null,
      is_vip: isVip,
      display_order: photos.length,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Foto adicionada");
    setUploadingUrl(null);
    setCaption("");
    setIsVip(false);
    qc.invalidateQueries({ queryKey: ["model-photos", modelId] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta foto?")) return;
    const { error } = await supabase.from("model_photos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removida");
    qc.invalidateQueries({ queryKey: ["model-photos", modelId] });
  };

  const toggleVip = async (p: ModelPhoto) => {
    const { error } = await supabase
      .from("model_photos")
      .update({ is_vip: !p.is_vip })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["model-photos", modelId] });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">Galeria de fotos</p>
          <p className="text-[11px] text-muted-foreground">
            {photos.length} foto{photos.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Upload area */}
      {!uploadingUrl ? (
        <FileUpload
          label=""
          bucket="models"
          folder={`gallery/${modelId}`}
          accept="image"
          value={null}
          onChange={(url) => url && addPhoto(url)}
        />
      ) : (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex gap-3">
            <img src={resolveImage(uploadingUrl)} alt="" className="h-16 w-16 rounded-lg object-cover" />
            <div className="flex-1 space-y-2">
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Legenda (opcional)"
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={isVip}
                  onChange={(e) => setIsVip(e.target.checked)}
                />
                <Crown className="h-3 w-3 text-primary" />
                Apenas para assinantes VIP
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmAdd}
              disabled={saving}
              className="flex-1 rounded-lg bg-foreground py-2 text-xs font-bold text-background disabled:opacity-60"
            >
              {saving ? <Loader2 className="mx-auto h-3 w-3 animate-spin" /> : "Adicionar à galeria"}
            </button>
            <button
              onClick={() => {
                setUploadingUrl(null);
                setCaption("");
                setIsVip(false);
              }}
              className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : photos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <ImagePlus className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Nenhuma foto ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
              <img src={resolveImage(p.image_url)} alt="" className="h-full w-full object-cover" />
              {p.is_vip && (
                <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">
                  <Crown className="h-2 w-2" /> VIP
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => toggleVip(p)}
                  className="flex-1 rounded bg-white/90 py-1 text-[9px] font-bold text-foreground"
                >
                  {p.is_vip ? "Liberar" : "VIP"}
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="rounded bg-destructive/95 px-1.5 py-1 text-destructive-foreground"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
