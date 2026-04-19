import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Search, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const useUsers = (q: string) =>
  useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
      if (q.trim()) query = query.or(`display_name.ilike.%${q}%,email.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;

      // Get VIP status for each
      const ids = (data ?? []).map((p) => p.user_id);
      if (ids.length === 0) return [];
      const { data: vips } = await supabase
        .from("vip_subscriptions")
        .select("user_id, expires_at")
        .in("user_id", ids)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString());
      const vipMap = new Map(vips?.map((v) => [v.user_id, v.expires_at]) ?? []);
      return (data ?? []).map((p) => ({ ...p, vip_expires: vipMap.get(p.user_id) ?? null }));
    },
  });

const AdminUsers = () => {
  const [q, setQ] = useState("");
  const { data: users = [], isLoading } = useUsers(q);
  const [selected, setSelected] = useState<any>(null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Usuários</h1>
        <p className="text-sm text-muted-foreground">{users.length} encontrados</p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou email…"
          className="w-full rounded-full bg-card py-2.5 pl-10 pr-4 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-bold uppercase text-muted-foreground">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3">VIP</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="px-4 py-2 font-semibold">{u.display_name ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{u.email}</td>
                <td className="px-4 py-2 text-xs">{format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}</td>
                <td className="px-4 py-2">
                  {u.vip_expires ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      <Crown className="h-3 w-3" /> até {format(new Date(u.vip_expires), "dd/MM", { locale: ptBR })}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setSelected(u)} className="text-xs font-bold text-primary">Gerenciar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <UserDetail user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

const UserDetail = ({ user, onClose }: { user: any; onClose: () => void }) => {
  const qc = useQueryClient();
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);

  const { data: orders = [] } = useQuery({
    queryKey: ["user-orders", user.user_id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const grantVip = async () => {
    setBusy(true);
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    const { error } = await supabase.from("vip_subscriptions").insert({
      user_id: user.user_id,
      expires_at: expires.toISOString(),
      notes: "Concedido pelo admin",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`VIP de ${days} dias concedido`);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    onClose();
  };

  const revokeVip = async () => {
    if (!confirm("Remover VIP deste usuário?")) return;
    setBusy(true);
    const { error } = await supabase.from("vip_subscriptions").update({ is_active: false }).eq("user_id", user.user_id).eq("is_active", true);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("VIP removido");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-background p-6 shadow-floating">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{user.display_name}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <p className="text-xs text-muted-foreground">{user.email}</p>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">VIP</p>
          {user.vip_expires ? (
            <>
              <p className="mt-1 text-sm">Ativo até <strong>{format(new Date(user.vip_expires), "dd/MM/yyyy", { locale: ptBR })}</strong></p>
              <button onClick={revokeVip} disabled={busy} className="mt-3 w-full rounded-full bg-destructive py-2 text-xs font-bold text-destructive-foreground">Remover VIP</button>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm">Sem VIP ativo.</p>
              <div className="mt-3 flex items-center gap-2">
                <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-20 rounded-xl border border-border bg-background px-2 py-1.5 text-sm" />
                <span className="text-xs text-muted-foreground">dias</span>
                <button onClick={grantVip} disabled={busy} className="gradient-primary ml-auto flex items-center gap-1 rounded-full px-4 py-2 text-xs font-bold text-primary-foreground">
                  {busy && <Loader2 className="h-3 w-3 animate-spin" />} Conceder VIP
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">Histórico de pedidos</p>
          <div className="space-y-1">
            {orders.length === 0 && <p className="text-xs text-muted-foreground">Nenhum pedido.</p>}
            {orders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-xs">
                <span>{format(new Date(o.created_at), "dd/MM HH:mm", { locale: ptBR })} · {o.purchase_type === "vip_global" ? "VIP" : "Modelo"}</span>
                <span className="font-bold">R$ {Number(o.amount).toFixed(2)} <span className="text-muted-foreground">({o.status})</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
