import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const AdminSales = () => {
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "cancelled">("all");
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders", filter],
    queryFn: async () => {
      let q = supabase.from("orders").select("*, profiles!inner(display_name, email)").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const update: any = { status };
    if (status === "paid") update.paid_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(update).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const total = orders.reduce((a, o: any) => a + (o.status === "paid" ? Number(o.amount) : 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Vendas</h1>
        <p className="text-sm text-muted-foreground">{orders.length} pedidos · {fmtBRL(total)} pagos</p>
      </div>

      <div className="flex gap-2">
        {(["all", "pending", "paid", "cancelled"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
            {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : f === "paid" ? "Pagos" : "Cancelados"}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-bold uppercase text-muted-foreground">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <tr key={o.id} className="border-b border-border/50">
                <td className="px-4 py-2 text-xs">{format(new Date(o.created_at), "dd/MM HH:mm", { locale: ptBR })}</td>
                <td className="px-4 py-2 text-xs">
                  <p className="font-semibold">{o.profiles?.display_name}</p>
                  <p className="text-muted-foreground">{o.profiles?.email}</p>
                </td>
                <td className="px-4 py-2 text-xs">{o.purchase_type === "vip_global" ? "VIP" : "Modelo"}</td>
                <td className="px-4 py-2 text-xs font-bold">{fmtBRL(Number(o.amount))}</td>
                <td className="px-4 py-2 text-xs">{o.status}</td>
                <td className="px-4 py-2 text-xs">
                  {o.status === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => updateStatus(o.id, "paid")} className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Marcar pago</button>
                      <button onClick={() => updateStatus(o.id, "cancelled")} className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold">Cancelar</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">Nenhum pedido.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSales;
