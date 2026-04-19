import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, X, ShieldCheck } from "lucide-react";
import { useAuth, AdminPermissions } from "@/contexts/AuthContext";

const PERMS: { key: keyof AdminPermissions; label: string }[] = [
  { key: "can_view_dashboard", label: "Ver dashboard" },
  { key: "can_view_sales", label: "Ver vendas" },
  { key: "can_manage_videos", label: "Gerenciar vídeos" },
  { key: "can_manage_models", label: "Gerenciar modelos" },
  { key: "can_manage_users", label: "Gerenciar usuários" },
  { key: "can_manage_settings", label: "Configurações do site" },
  { key: "can_manage_admins", label: "Gerenciar admins" },
];

const useAdmins = () =>
  useQuery({
    queryKey: ["admins-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "super_admin"]);
      const ids = roles?.map((r) => r.user_id) ?? [];
      if (ids.length === 0) return [];
      const [profiles, perms] = await Promise.all([
        supabase.from("profiles").select("*").in("user_id", ids),
        supabase.from("admin_permissions").select("*").in("user_id", ids),
      ]);
      const permMap = new Map(perms.data?.map((p) => [p.user_id, p]) ?? []);
      return (profiles.data ?? []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.user_id)?.role,
        permissions: permMap.get(p.user_id) ?? null,
      }));
    },
  });

const AdminAdmins = () => {
  const { isSuperAdmin } = useAuth();
  const { data: admins = [], isLoading } = useAdmins();
  const [promoting, setPromoting] = useState(false);

  if (!isSuperAdmin) {
    return <p className="text-sm text-muted-foreground">Apenas super-admins podem ver esta página.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Admins</h1>
          <p className="text-sm text-muted-foreground">{admins.length} com acesso ao painel</p>
        </div>
        <button onClick={() => setPromoting(true)} className="gradient-primary shadow-button rounded-full px-4 py-2 text-sm font-bold text-primary-foreground">
          + Promover usuário
        </button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="space-y-3">
        {admins.map((a: any) => (
          <AdminCard key={a.user_id} admin={a} />
        ))}
      </div>

      {promoting && <PromoteDialog onClose={() => setPromoting(false)} />}
    </div>
  );
};

const AdminCard = ({ admin }: { admin: any }) => {
  const qc = useQueryClient();
  const [perms, setPerms] = useState<Partial<AdminPermissions>>(admin.permissions ?? {});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const payload = { user_id: admin.user_id, ...perms };
    const { error } = admin.permissions
      ? await supabase.from("admin_permissions").update(perms).eq("user_id", admin.user_id)
      : await supabase.from("admin_permissions").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Permissões salvas");
    qc.invalidateQueries({ queryKey: ["admins-list"] });
  };

  const revoke = async () => {
    if (!confirm(`Remover acesso admin de ${admin.display_name}?`)) return;
    setBusy(true);
    await supabase.from("user_roles").delete().eq("user_id", admin.user_id).eq("role", "admin");
    await supabase.from("admin_permissions").delete().eq("user_id", admin.user_id);
    setBusy(false);
    toast.success("Acesso revogado");
    qc.invalidateQueries({ queryKey: ["admins-list"] });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold">{admin.display_name} {admin.role === "super_admin" && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">SUPER</span>}</p>
          <p className="text-xs text-muted-foreground">{admin.email}</p>
        </div>
        {admin.role !== "super_admin" && (
          <button onClick={revoke} className="text-xs font-bold text-destructive">Remover</button>
        )}
      </div>
      {admin.role !== "super_admin" && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {PERMS.map((p) => (
              <label key={p.key} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
                <input type="checkbox" checked={!!perms[p.key]} onChange={(e) => setPerms({ ...perms, [p.key]: e.target.checked })} className="h-3.5 w-3.5 accent-primary" />
                {p.label}
              </label>
            ))}
          </div>
          <button onClick={save} disabled={busy} className="mt-3 flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-3 w-3 animate-spin" />} Salvar permissões
          </button>
        </>
      )}
    </div>
  );
};

const PromoteDialog = ({ onClose }: { onClose: () => void }) => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: results = [] } = useQuery({
    queryKey: ["search-users", q],
    queryFn: async () => {
      if (!q.trim()) return [];
      const { data } = await supabase.from("profiles").select("user_id, display_name, email").or(`display_name.ilike.%${q}%,email.ilike.%${q}%`).limit(10);
      return data ?? [];
    },
    enabled: q.trim().length > 1,
  });

  const promote = async (userId: string) => {
    setBusy(userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (!error) await supabase.from("admin_permissions").insert({ user_id: userId, can_view_dashboard: true });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Promovido a admin");
    qc.invalidateQueries({ queryKey: ["admins-list"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-background p-6 shadow-floating">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Promover usuário</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Busque um usuário cadastrado para conceder acesso admin.</p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou email…"
            className="w-full rounded-full bg-card py-2.5 pl-10 pr-4 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="mt-3 space-y-1">
          {results.map((u: any) => (
            <button key={u.user_id} onClick={() => promote(u.user_id)} disabled={busy === u.user_id}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-secondary disabled:opacity-60">
              <div>
                <p className="text-sm font-bold">{u.display_name}</p>
                <p className="text-[11px] text-muted-foreground">{u.email}</p>
              </div>
              {busy === u.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
            </button>
          ))}
          {q.trim() && results.length === 0 && <p className="text-xs text-muted-foreground">Nenhum encontrado.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminAdmins;
