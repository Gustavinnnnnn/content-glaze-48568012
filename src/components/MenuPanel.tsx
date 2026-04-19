import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Crown, History, Bookmark, LifeBuoy, Settings, Sparkles, ChevronRight } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useState } from "react";
import { UpgradeDialog } from "./UpgradeDialog";

interface MenuPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MenuPanel = ({ open, onOpenChange }: MenuPanelProps) => {
  const { name, plan, togglePlan } = useUser();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const items = [
    { icon: History, label: "Histórico" },
    { icon: Bookmark, label: "Conteúdos salvos" },
    { icon: LifeBuoy, label: "Suporte" },
    { icon: Settings, label: "Configurações" },
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
                  {name[0]}
                </div>
                <div className="text-primary-foreground">
                  <p className="text-lg font-bold">{name}</p>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">
                    {plan === "premium" ? (
                      <><Crown className="h-3 w-3" /> Premium</>
                    ) : (
                      <>Free</>
                    )}
                  </div>
                </div>
              </div>

              {plan === "free" && (
                <button
                  onClick={() => setUpgradeOpen(true)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-primary shadow-lg transition-transform active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" />
                  Desbloquear acesso completo
                </button>
              )}
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {items.map((item) => (
                <button
                  key={item.label}
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

              {/* Demo toggle */}
              <button
                onClick={togglePlan}
                className="mt-4 w-full rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground"
              >
                [Demo] Alternar para {plan === "free" ? "Premium" : "Free"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
};
