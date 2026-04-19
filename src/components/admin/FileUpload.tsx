import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Trash2, FileVideo, ImageIcon } from "lucide-react";
import { toast } from "sonner";

type Props = {
  label: string;
  bucket: "videos" | "models" | "site";
  folder?: string;
  accept: "image" | "video";
  value?: string | null;
  onChange: (publicUrl: string | null) => void;
};

const acceptMap = { image: "image/*", video: "video/*" } as const;

export const FileUpload = ({ label, bucket, folder, accept, value, onChange }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${folder ? folder + "/" : ""}${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Arquivo enviado");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = () => onChange(null);

  const isImage = accept === "image";

  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={acceptMap[accept]}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
          {isImage ? (
            <img src={value} alt="" className="aspect-video w-full object-cover" />
          ) : (
            <video src={value} className="aspect-video w-full bg-black object-contain" controls preload="metadata" />
          )}
          <div className="flex items-center justify-between gap-2 p-2">
            <button
              type="button"
              onClick={handlePick}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Trocar
            </button>
            <button
              type="button"
              onClick={remove}
              className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePick}
          disabled={uploading}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs font-semibold">Enviando…</span>
            </>
          ) : (
            <>
              {isImage ? <ImageIcon className="h-6 w-6" /> : <FileVideo className="h-6 w-6" />}
              <span className="text-xs font-semibold">Clique para enviar</span>
              <span className="text-[10px]">{isImage ? "JPG, PNG, WEBP" : "MP4, WEBM, MOV"}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
