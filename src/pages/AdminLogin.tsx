import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_SLUG } from "@/App";
import { ShieldCheck, Loader2, Mail, Lock } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha precisa ter ao menos 6 caracteres").max(72),
});

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && user && isAdmin) navigate(`/${ADMIN_SLUG}`, { replace: true });
  }, [user, loading, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) fe[err.path[0] as string] = err.message;
      });
      setErrors(fe);
      return;
    }
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      toast.error(
        result.error.includes("Invalid login")
          ? "Email ou senha incorretos."
          : result.error
      );
      return;
    }
    // Wait a tick — auth context will refresh roles. We then validate.
    setTimeout(async () => {
      // best-effort: if the user that just signed in is not admin, kick them out.
      if (!isAdmin) {
        // re-check after roles load
        setTimeout(async () => {
          if (!isAdmin) {
            toast.error("Esta conta não tem acesso ao painel administrativo.");
            await signOut();
          } else navigate(`/${ADMIN_SLUG}`, { replace: true });
        }, 700);
      } else navigate(`/${ADMIN_SLUG}`, { replace: true });
    }, 100);
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-muted/40 px-5 py-10">
      <div className="relative w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-foreground text-background shadow-floating">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Painel administrativo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso restrito a administradores</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-floating"
        >
          <Field
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="admin@email.com"
            error={errors.email}
            autoComplete="email"
          />
          <Field
            icon={<Lock className="h-4 w-4" />}
            label="Senha"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Sua senha"
            error={errors.password}
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3.5 text-sm font-bold text-background transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar no painel"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Não é administrador?{" "}
          <button
            onClick={() => navigate("/auth")}
            className="font-bold text-primary hover:underline"
          >
            Acessar o site →
          </button>
        </p>
      </div>
    </div>
  );
};

const Field = ({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  autoComplete,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  autoComplete?: string;
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {label}
    </label>
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 pl-11 text-sm font-medium placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
    {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
  </div>
);

export default AdminLogin;
