import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Search, X, Loader2, Ban, Trash2, ShieldOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

const useUsers = (q: string) =>
  useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (q.trim()) query = query.or(`display_name.ilike.%${q}%,email.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;

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
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou email…"
          className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-bold uppercase text-muted-foreground">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="px-4 py-2 font-semibold">{u.display_name ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{u.email}</td>
                <td className="px-4 py-2 text-xs">
                  {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {u.is_banned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                        <Ban className="h-3 w-3" /> Banido
                      </span>
                    )}
                    {u.vip_expires && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        <Crown className="h-3 w-3" />{" "}
                        {format(new Date(u.vip_expires), "dd/MM", { locale: ptBR })}
                      </span>
                    )}
                    {!u.vip_expires && !u.is_banned && (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => setSelected(u)}
                    className="text-xs font-bold text-primary"
                  >
                    Gerenciar
                  </button>
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
  const { isSuperAdmin, user: me } = useAuth();
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["user-orders", user.user_id] });
    qc.invalidateQueries({ queryKey: ["user-fees", user.user_id] });
  };

  const { data: orders = [] } = useQuery({
    queryKey: ["user-orders", user.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: feeProgress = [] } = useQuery({
    queryKey: ["user-fees", user.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_fee_progress")
        .select("*, access_fees(name, amount)")
        .eq("user_id", user.user_id)
        .order("paid_at", { ascending: false });
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
    refreshAll();
    onClose();
  };

  const revokeVip = async () => {
    if (!confirm("Remover VIP deste usuário?")) return;
    setBusy(true);
    const { error } = await supabase
      .from("vip_subscriptions")
      .update({ is_active: false })
      .eq("user_id", user.user_id)
      .eq("is_active", true);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("VIP removido");
    refreshAll();
    onClose();
  };

  const toggleBan = async () => {
    const banning = !user.is_banned;
    if (banning && !confirm("Banir este usuário? Ele não conseguirá mais entrar.")) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        is_banned: banning,
        banned_at: banning ? new Date().toISOString() : null,
      })
      .eq("user_id", user.user_id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(banning ? "Usuário banido" : "Usuário desbanido");
    refreshAll();
    onClose();
  };

  const deleteUser = async () => {
    if (user.user_id === me?.id) return toast.error("Você não pode excluir sua própria conta");
    if (!confirm(`EXCLUIR DEFINITIVAMENTE ${user.email}? Essa ação não pode ser desfeita.`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("delete_user_account", { _user_id: user.user_id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Conta excluída");
    refreshAll();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-background p-6 shadow-floating">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold">{user.display_name ?? "—"}</h2>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            {user.is_banned && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                <Ban className="h-3 w-3" /> Banido em{" "}
                {user.banned_at && format(new Date(user.banned_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* VIP */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">VIP</p>
          {user.vip_expires ? (
            <>
              <p className="mt-1 text-sm">
                Ativo até{" "}
                <strong>{format(new Date(user.vip_expires), "dd/MM/yyyy", { locale: ptBR })}</strong>
              </p>
              <button
                onClick={revokeVip}
                disabled={busy}
                className="mt-3 w-full rounded-full bg-destructive py-2 text-xs font-bold text-destructive-foreground"
              >
                Remover VIP
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm">Sem VIP ativo.</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-20 rounded-xl border border-border bg-background px-2 py-1.5 text-sm"
                />
                <span className="text-xs text-muted-foreground">dias</span>
                <button
                  onClick={grantVip}
                  disabled={busy}
                  className="gradient-primary ml-auto flex items-center gap-1 rounded-full px-4 py-2 text-xs font-bold text-primary-foreground"
                >
                  {busy && <Loader2 className="h-3 w-3 animate-spin" />} Conceder VIP
                </button>
              </div>
            </>
          )}
        </div>

        {/* Ban / Delete */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={toggleBan}
            disabled={busy}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold ${user.is_banned ? "bg-primary text-primary-foreground" : "bg-destructive/15 text-destructive hover:bg-destructive/25"}`}
          >
            {user.is_banned ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
            {user.is_banned ? "Desbanir" : "Banir"}
          </button>
          {isSuperAdmin && (
            <button
              onClick={deleteUser}
              disabled={busy || user.user_id === me?.id}
              className="flex items-center justify-center gap-1.5 rounded-full bg-destructive py-2 text-xs font-bold text-destructive-foreground disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir conta
            </button>
          )}
        </div>

        {/* Fee progress */}
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">
            Taxas pagas ({feeProgress.length})
          </p>
          {feeProgress.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma taxa paga.</p>
          )}
          <div className="space-y-1">
            {feeProgress.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-xs"
              >
                <span className="truncate">
                  {p.access_fees?.name ?? "Taxa removida"}
                  <span className="ml-2 text-muted-foreground">
                    {format(new Date(p.paid_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </span>
                {p.access_fees?.amount && (
                  <span className="font-bold tabular-nums">
                    R$ {Number(p.access_fees.amount).toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Orders */}
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">
            Pedidos ({orders.length})
          </p>
          <div className="space-y-1">
            {orders.length === 0 && <p className="text-xs text-muted-foreground">Nenhum pedido.</p>}
            {orders.map((o: any) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-xs"
              >
                <span>
                  {format(new Date(o.created_at), "dd/MM HH:mm", { locale: ptBR })} ·{" "}
                  {o.purchase_type === "vip_global"
                    ? "VIP"
                    : o.purchase_type === "access_fee"
                      ? "Taxa"
                      : "Modelo"}
                </span>
                <span className="font-bold">
                  R$ {Number(o.amount).toFixed(2)}{" "}
                  <span className="text-muted-foreground">({o.status})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
