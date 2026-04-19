import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Crown, Loader2, Mail, Lock, Sparkles, User } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

const signInSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Senha precisa ter ao menos 6 caracteres").max(72),
});

const signUpSchema = signInSchema.extend({
  displayName: z.string().trim().min(2, "Informe seu nome").max(60),
});

type Mode = "signin" | "signup";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const schema = mode === "signup" ? signUpSchema : signInSchema;
    const parsed = schema.safeParse({ email, password, displayName: name });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setSubmitting(true);
    const result =
      mode === "signup"
        ? await signUp(email, password, name)
        : await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      const msg = result.error;
      toast.error(
        msg.includes("Invalid login")
          ? "Email ou senha incorretos."
          : msg.includes("already registered") || msg.includes("already exists")
          ? "Este email já está cadastrado. Faça login."
          : msg
      );
      return;
    }
    if (mode === "signup") {
      toast.success("Conta criada!", { description: "Bem-vindo." });
    } else {
      toast.success("Bem-vindo de volta!");
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-5 py-10">
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl gradient-primary shadow-glow">
            <Crown className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
            {mode === "signup" ? "Criar conta" : "Bem-vindo"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Crie sua conta para acessar e comprar"
              : "Entre com suas credenciais"}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-secondary p-1">
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-full py-2.5 text-xs font-bold transition-all ${
              mode === "signup"
                ? "gradient-primary text-primary-foreground shadow-button"
                : "text-muted-foreground"
            }`}
          >
            Criar conta
          </button>
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-full py-2.5 text-xs font-bold transition-all ${
              mode === "signin"
                ? "gradient-primary text-primary-foreground shadow-button"
                : "text-muted-foreground"
            }`}
          >
            Entrar
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-floating"
        >
          {mode === "signup" && (
            <Field
              icon={<User className="h-4 w-4" />}
              label="Nome"
              value={name}
              onChange={setName}
              placeholder="Como prefere ser chamado"
              error={errors.displayName}
              autoComplete="name"
            />
          )}
          <Field
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="seu@email.com"
            error={errors.email}
            autoComplete="email"
          />
          <Field
            icon={<Lock className="h-4 w-4" />}
            label="Senha"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Sua senha"}
            error={errors.password}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />

          <button
            type="submit"
            disabled={submitting}
            className="gradient-primary shadow-button mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {mode === "signup" ? "Criar minha conta" : "Entrar"}
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          É administrador?{" "}
          <button
            onClick={() => navigate("/admin/login")}
            className="font-bold text-primary hover:underline"
          >
            Acesso ao painel →
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

export default Auth;
