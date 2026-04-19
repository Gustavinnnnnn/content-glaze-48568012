import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Crown,
  History,
  Bookmark,
  LifeBuoy,
  Settings,
  Sparkles,
  ChevronRight,
  LogOut,
  LogIn,
  Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { UpgradeDialog } from "./UpgradeDialog";
import { useNavigate } from "react-router-dom";
import { useUserHistory } from "@/hooks/useSiteData";
import { resolveImage } from "@/lib/imageResolver";
import { ADMIN_SLUG } from "@/lib/adminSlug";

interface MenuPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MenuPanel = ({ open, onOpenChange }: MenuPanelProps) => {
  const { user, displayName, vip, isAdmin, signOut } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const navigate = useNavigate();

  const items = [
    { icon: History, label: "Histórico", onClick: () => setHistoryOpen(true), show: !!user },
    ...(isAdmin
      ? [{ icon: Shield, label: "Painel admin", onClick: () => navigate(`/${ADMIN_SLUG}`), show: true }]
      : []),
    { icon: LifeBuoy, label: "Suporte", onClick: () => {}, show: true },
    { icon: Settings, label: "Configurações", onClick: () => {}, show: !!user },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[88%] max-w-[400px] border-0 bg-background p-0">
          <div className="flex h-full flex-col">
            {/* Profile header */}
            <div className="gradient-primary relative overflow-hidden px-6 pb-8 pt-12">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-bold text-primary shadow-lg">
                  {displayName[0]?.toUpperCase()}
                </div>
                <div className="text-primary-foreground">
                  <p className="text-lg font-bold">{displayName}</p>
                  {user && (
                    <p className="text-[11px] opacity-90 truncate max-w-[180px]">{user.email}</p>
                  )}
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">
                    {vip.isVip ? (
                      <>
                        <Crown className="h-3 w-3" /> VIP — {vip.daysLeft}d restantes
                      </>
                    ) : user ? (
                      "Free"
                    ) : (
                      "Visitante"
                    )}
                  </div>
                </div>
              </div>

              {!user && (
                <button
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/auth");
                  }}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-primary shadow-lg transition-transform active:scale-[0.98]"
                >
                  <LogIn className="h-4 w-4" /> Entrar ou cadastrar
                </button>
              )}
              {user && !vip.isVip && (
                <button
                  onClick={() => setUpgradeOpen(true)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-primary shadow-lg transition-transform active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" /> Desbloquear VIP
                </button>
              )}
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {items.filter((i) => i.show).map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold">{item.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}

              {user && (
                <button
                  onClick={async () => {
                    await signOut();
                    onOpenChange(false);
                  }}
                  className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-destructive transition-colors hover:bg-destructive/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <span className="font-semibold">Sair</span>
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  );
};

const HistorySheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const { data: history, isLoading } = useUserHistory();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[88%] max-w-[400px] border-0 bg-background p-0">
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-extrabold">Seu histórico</h2>
            <p className="text-xs text-muted-foreground">Últimos vídeos assistidos</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!isLoading && (!history || history.length === 0) && (
              <p className="text-sm text-muted-foreground">Você ainda não assistiu nada.</p>
            )}
            <div className="space-y-2">
              {history?.map((h: any) => (
                <div key={h.id} className="flex gap-3 rounded-2xl bg-card p-2 shadow-card">
                  {h.videos?.thumbnail_url && (
                    <img
                      src={resolveImage(h.videos.thumbnail_url)}
                      alt=""
                      className="h-14 w-20 rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1 py-1">
                    <p className="truncate text-sm font-bold">{h.videos?.title ?? "Vídeo"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
