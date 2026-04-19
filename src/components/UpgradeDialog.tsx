import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradeDialog = ({ open, onOpenChange }: UpgradeDialogProps) => {
  const { upgrade } = useUser();

  const benefits = [
    { icon: Zap, text: "Acesso ilimitado a todo acervo" },
    { icon: Sparkles, text: "Novos conteúdos toda semana" },
    { icon: Crown, text: "Experiência sem interrupções" },
  ];

  const handleActivate = () => {
    upgrade();
    onOpenChange(false);
    toast.success("Acesso Premium ativado!", { description: "Aproveite tudo sem limites." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92%] gap-0 overflow-hidden rounded-3xl border-0 p-0 sm:max-w-md">
        <div className="gradient-primary relative px-6 pb-6 pt-10 text-center text-primary-foreground">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur animate-float">
              <Crown className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight">Acesso completo</h2>
            <p className="mt-2 text-sm opacity-90">Desbloqueie tudo, sem limites</p>
          </div>
        </div>

        <div className="space-y-3 px-6 py-6">
          {benefits.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{text}</span>
              <Check className="ml-auto h-5 w-5 text-primary" />
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleActivate}
            className="gradient-primary shadow-button w-full rounded-full py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] animate-pulse-glow"
          >
            Ativar agora
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="mt-2 w-full py-2 text-xs font-medium text-muted-foreground"
          >
            Talvez depois
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
