import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { contentList } from "@/data/content";
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

      {/* Apenas vídeos */}
      <div className="px-4 py-5">
        {query.trim() && (
          <p className="mb-3 px-1 text-xs font-semibold text-muted-foreground">
            {results.length} resultado{results.length !== 1 ? "s" : ""} para "{query}"
          </p>
        )}
        <div className="space-y-4">
          {results.map((item, i) => (
            <ContentCard key={item.id} item={item} index={i} />
          ))}
          {results.length === 0 && (
            <div className="rounded-2xl bg-card p-8 text-center shadow-card">
              <p className="text-sm font-semibold">Nada encontrado</p>
              <p className="mt-1 text-xs text-muted-foreground">Tente outra palavra-chave</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
