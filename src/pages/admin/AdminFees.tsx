import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, GripVertical, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

interface Fee {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  display_order: number;
  is_active: boolean;
}

const useFees = () =>
  useQuery({
    queryKey: ["admin-fees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_fees")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Fee[];
    },
  });

const AdminFees = () => {
  const { data: fees = [], isLoading } = useFees();
  const [editing, setEditing] = useState<Fee | null>(null);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();

  const move = async (fee: Fee, dir: -1 | 1) => {
    const sorted = [...fees];
    const idx = sorted.findIndex((f) => f.id === fee.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("access_fees").update({ display_order: swap.display_order }).eq("id", fee.id),
      supabase.from("access_fees").update({ display_order: fee.display_order }).eq("id", swap.id),
    ]);
    qc.invalidateQueries({ queryKey: ["admin-fees"] });
  };

  const toggle = async (fee: Fee) => {
    await supabase.from("access_fees").update({ is_active: !fee.is_active }).eq("id", fee.id);
    qc.invalidateQueries({ queryKey: ["admin-fees"] });
  };

  const remove = async (fee: Fee) => {
    if (!confirm(`Excluir a taxa "${fee.name}"? Os pagamentos passados ficam preservados.`)) return;
    const { error } = await supabase.from("access_fees").delete().eq("id", fee.id);
    if (error) return toast.error(error.message);
    toast.success("Taxa removida");
    qc.invalidateQueries({ queryKey: ["admin-fees"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Taxas de acesso</h1>
          <p className="text-sm text-muted-foreground">
            O usuário paga as taxas ativas em ordem antes de liberar o acesso.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="gradient-primary flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-primary-foreground shadow-button"
        >
          <Plus className="h-4 w-4" /> Nova taxa
        </button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!isLoading && fees.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm font-semibold">Nenhuma taxa configurada</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sem taxas, o usuário recebe acesso direto após a compra principal.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {fees.map((fee, idx) => (
          <div
            key={fee.id}
            className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card ${!fee.is_active ? "opacity-60" : ""}`}
          >
            <div className="flex flex-col gap-1">
              <button
                onClick={() => move(fee, -1)}
                disabled={idx === 0}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <GripVertical className="h-4 w-4 rotate-180" />
              </button>
              <button
                onClick={() => move(fee, 1)}
                disabled={idx === fees.length - 1}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
              {idx + 1}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{fee.name}</p>
              {fee.description && (
                <p className="truncate text-xs text-muted-foreground">{fee.description}</p>
              )}
            </div>

            <p className="shrink-0 text-sm font-extrabold tabular-nums">
              R$ {Number(fee.amount).toFixed(2).replace(".", ",")}
            </p>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={fee.is_active}
                onChange={() => toggle(fee)}
              />
              <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
            </label>

            <button
              onClick={() => setEditing(fee)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => remove(fee)}
              className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <FeeEditor
          fee={editing}
          nextOrder={(fees[fees.length - 1]?.display_order ?? 0) + 1}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
};

const FeeEditor = ({
  fee,
  nextOrder,
  onClose,
}: {
  fee: Fee | null;
  nextOrder: number;
  onClose: () => void;
}) => {
  const qc = useQueryClient();
  const [name, setName] = useState(fee?.name ?? "");
  const [description, setDescription] = useState(fee?.description ?? "");
  const [amount, setAmount] = useState(String(fee?.amount ?? "24.90"));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error("Dê um nome à taxa");
    const value = Number(amount);
    if (!value || value <= 0) return toast.error("Valor inválido");

    setBusy(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      amount: value,
    };
    const { error } = fee
      ? await supabase.from("access_fees").update(payload).eq("id", fee.id)
      : await supabase.from("access_fees").insert({ ...payload, display_order: nextOrder, is_active: true });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(fee ? "Taxa atualizada" : "Taxa criada");
    qc.invalidateQueries({ queryKey: ["admin-fees"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-background p-6 shadow-floating">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{fee ? "Editar taxa" : "Nova taxa"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-muted-foreground">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Taxa antifraude"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-muted-foreground">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Texto exibido ao usuário"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-muted-foreground">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={busy}
          className="gradient-primary shadow-button mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {fee ? "Salvar alterações" : "Criar taxa"}
        </button>
      </div>
    </div>
  );
};

export default AdminFees;
