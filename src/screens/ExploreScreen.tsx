import { Search, TrendingUp, Flame } from "lucide-react";
import { useMemo, useState } from "react";
import { contentList, mostSearched } from "@/data/content";
import { ContentCard } from "@/components/ContentCard";

export const ExploreScreen = () => {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return contentList;
    const q = query.toLowerCase();
    return contentList.filter(
      (c) => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  }, [query]);

  const showSuggestions = query.trim() === "";

  return (
    <div className="safe-top">
      {/* Search header */}
      <header className="sticky top-0 z-30 glass border-b border-border/40 px-5 py-4">
        <h1 className="mb-3 text-2xl font-extrabold tracking-tight">Explorar</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="O que você procura?"
            className="w-full rounded-full border-0 bg-secondary py-3.5 pl-12 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </header>

      <div className="space-y-6 px-4 py-5">
        {showSuggestions && (
          <>
            {/* Mais buscados */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> Mais buscados
              </h2>
              <div className="space-y-2">
                {mostSearched.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-card transition-transform active:scale-[0.98]"
                  >
                    <span className="text-lg font-extrabold text-primary">{i + 1}</span>
                    <span className="text-sm font-semibold">{s}</span>
                    <TrendingUp className="ml-auto h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>

            {/* Tendência */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-muted-foreground">
                <Flame className="h-4 w-4 text-primary" /> Tendência agora
              </h2>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
                {contentList.slice(0, 6).map((item) => (
                  <div key={item.id} className="w-40 shrink-0">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-card">
                      <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 gradient-overlay" />
                      <p className="absolute bottom-2 left-2 right-2 text-xs font-bold leading-tight text-white drop-shadow">{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Resultados */}
        <section>
          {!showSuggestions && (
            <h2 className="mb-3 px-1 text-sm font-bold text-muted-foreground">
              {results.length} resultado{results.length !== 1 ? "s" : ""} para "{query}"
            </h2>
          )}
          <div className="space-y-4">
            {(showSuggestions ? contentList.slice(0, 6) : results).map((item, i) => (
              <ContentCard key={item.id} item={item} index={i} />
            ))}
            {!showSuggestions && results.length === 0 && (
              <div className="rounded-2xl bg-card p-8 text-center shadow-card">
                <p className="text-sm font-semibold">Nada encontrado</p>
                <p className="mt-1 text-xs text-muted-foreground">Tente outra palavra-chave</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
