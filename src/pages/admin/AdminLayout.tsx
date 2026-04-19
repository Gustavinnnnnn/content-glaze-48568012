import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, AdminPermissions } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Film, Users, UserCog, ShieldCheck, ShoppingBag, Settings, ArrowLeft, LogOut, Crown, Menu, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { ADMIN_SLUG } from "@/App";

const BASE = `/${ADMIN_SLUG}`;
const items: { to: string; label: string; icon: any; perm?: keyof AdminPermissions }[] = [
  { to: BASE, label: "Dashboard", icon: LayoutDashboard, perm: "can_view_dashboard" },
  { to: `${BASE}/videos`, label: "Vídeos", icon: Film, perm: "can_manage_videos" },
  { to: `${BASE}/models`, label: "Modelos", icon: Users, perm: "can_manage_models" },
  { to: `${BASE}/users`, label: "Usuários", icon: UserCog, perm: "can_manage_users" },
  { to: `${BASE}/admins`, label: "Admins", icon: ShieldCheck, perm: "can_manage_admins" },
  { to: `${BASE}/sales`, label: "Vendas", icon: ShoppingBag, perm: "can_view_sales" },
  { to: `${BASE}/telegram`, label: "Telegram", icon: Send, perm: "can_manage_settings" },
  { to: `${BASE}/settings`, label: "Config", icon: Settings, perm: "can_manage_settings" },
];

const AdminLayout = () => {
  const { displayName, isSuperAdmin, permissions, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const allowed = items.filter((i) => !i.perm || isSuperAdmin || permissions?.[i.perm]);

  const NavItems = ({ onNav }: { onNav?: () => void }) => (
    <>
      {allowed.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.to === BASE}
          onClick={onNav}
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
    </>
  );

  const Footer = ({ onNav }: { onNav?: () => void }) => (
    <div className="space-y-1 border-t border-border p-3">
      <button
        onClick={() => { onNav?.(); navigate("/"); }}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao site
      </button>
      <button
        onClick={async () => { onNav?.(); await signOut(); navigate(`${BASE}/login`); }}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" /> Sair
      </button>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="border-b border-border px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <Crown className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-extrabold">Admin</p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{displayName}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <NavItems />
        </nav>
        <Footer />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — clean, single row */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex h-full flex-col">
                <div className="border-b border-border px-5 py-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
                      <Crown className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold">Admin</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{displayName}</p>
                    </div>
                  </div>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                  <NavItems onNav={() => setOpen(false)} />
                </nav>
                <Footer onNav={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-1.5">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-extrabold">Admin</span>
          </div>

          <button
            onClick={() => navigate("/")}
            className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10"
          >
            Site →
          </button>
        </div>

        <main className="min-w-0 flex-1 p-3 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
