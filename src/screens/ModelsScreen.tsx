import { useNav } from "@/contexts/NavContext";
import { Crown, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useModels } from "@/hooks/useSiteData";
import { resolveImage } from "@/lib/imageResolver";
import { VipHeroBanner } from "@/components/VipHeroBanner";

export const ModelsScreen = () => {
  const { openModel } = useNav();
  const [query, setQuery] = useState("");
  const { data: models = [] } = useModels();

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) => m.name.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q)
    );
  }, [query, models]);

  return (
    <div className="safe-top">
      <header className="sticky top-0 z-30 glass border-b border-border/40 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Criadoras</p>
            <h1 className="text-xl font-extrabold tracking-tight">
              Modelos <span className="text-primary">exclusivas</span>
            </h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar modelo..."
            className="w-full rounded-full border-0 bg-secondary py-3 pl-11 pr-4 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </header>

      <VipHeroBanner headline="Acesse TODAS as modelos com 1 pagamento" subline="Sem assinar uma por uma. Libere o catálogo completo agora." />

      {models.length > 0 && (
        <section className="px-4 pt-4">
          <h2 className="mb-3 px-1 text-sm font-bold text-muted-foreground">Em destaque</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
            {models.slice(0, 6).map((m) => (
              <button
                key={m.id}
                onClick={() => openModel(m.id)}
                className="flex w-20 shrink-0 flex-col items-center gap-1.5"
              >
                <div className="rounded-full bg-gradient-to-tr from-primary to-primary-glow p-[2px]">
                  <img
                    src={resolveImage(m.avatar_url)}
                    alt={m.name}
                    loading="lazy"
                    className="h-16 w-16 rounded-full border-2 border-background object-cover"
                  />
                </div>
                <span className="line-clamp-1 text-[10px] font-semibold">
                  {m.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 py-4">
        <h2 className="mb-3 px-1 text-sm font-bold text-muted-foreground">Todas as modelos</h2>
        <div className="grid grid-cols-2 gap-3">
          {list.map((m, i) => (
            <button
              key={m.id}
              onClick={() => openModel(m.id)}
              className="group relative animate-fade-in overflow-hidden rounded-3xl bg-card text-left shadow-card transition-transform active:scale-[0.97]"
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms`, animationFillMode: "backwards" }}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <img
                  src={resolveImage(m.avatar_url)}
                  alt={m.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent" />
                <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-bold text-primary shadow">
                  <Crown className="h-3 w-3" /> R$ {Number(m.monthly_price).toFixed(2).replace(".", ",")}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <p className="text-sm font-bold leading-tight drop-shadow">{m.name}</p>
                  <p className="text-[10px] opacity-80">@{m.handle}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        {list.length === 0 && (
          <div className="rounded-2xl bg-card p-8 text-center shadow-card">
            <p className="text-sm font-semibold">Nenhuma modelo encontrada</p>
          </div>
        )}
      </section>
    </div>
  );
};
