import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, AdminPermissions } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Film, Users, UserCog, ShieldCheck, ShoppingBag, Settings, ArrowLeft, LogOut, Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items: { to: string; label: string; icon: any; perm?: keyof AdminPermissions }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "can_view_dashboard" },
  { to: "/admin/videos", label: "Vídeos", icon: Film, perm: "can_manage_videos" },
  { to: "/admin/models", label: "Modelos", icon: Users, perm: "can_manage_models" },
  { to: "/admin/users", label: "Usuários", icon: UserCog, perm: "can_manage_users" },
  { to: "/admin/admins", label: "Admins", icon: ShieldCheck, perm: "can_manage_admins" },
  { to: "/admin/sales", label: "Vendas", icon: ShoppingBag, perm: "can_view_sales" },
  { to: "/admin/settings", label: "Configurações", icon: Settings, perm: "can_manage_settings" },
];

const AdminLayout = () => {
  const { displayName, isSuperAdmin, permissions, signOut } = useAuth();
  const navigate = useNavigate();
  const allowed = items.filter((i) => !i.perm || isSuperAdmin || permissions?.[i.perm]);

  return (
    <div className="flex min-h-[100dvh] bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="border-b border-border px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <Crown className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-extrabold">Admin</p>
              <p className="text-[11px] text-muted-foreground">{displayName}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {allowed.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.to === "/admin"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-button"
                    : "text-foreground hover:bg-secondary"
                )
              }
            >
              <i.icon className="h-4 w-4" /> {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-border p-3">
          <button
            onClick={() => navigate("/")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao site
          </button>
          <button
            onClick={async () => { await signOut(); navigate("/auth"); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <span className="font-extrabold">Admin</span>
          </div>
          <button onClick={() => navigate("/")} className="text-xs font-bold text-primary">
            Site →
          </button>
        </div>
        <div className="overflow-x-auto border-b border-border bg-card md:hidden">
          <div className="flex gap-1 px-3 py-2">
            {allowed.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.to === "/admin"}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                    isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  )
                }
              >
                <i.icon className="h-3.5 w-3.5" /> {i.label}
              </NavLink>
            ))}
          </div>
        </div>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
