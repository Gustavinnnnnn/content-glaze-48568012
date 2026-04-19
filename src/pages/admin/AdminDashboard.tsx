import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Eye, ShoppingCart, Users, Crown, Receipt, TrendingUp } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Range = "today" | "7d" | "30d" | "90d";

const rangeDays: Record<Range, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };
const rangeLabel: Record<Range, string> = { today: "Hoje", "7d": "7 dias", "30d": "30 dias", "90d": "90 dias" };

const useStats = (range: Range) =>
  useQuery({
    queryKey: ["admin-stats", range],
    queryFn: async () => {
      const days = rangeDays[range];
      const since = (range === "today" ? startOfDay(new Date()) : subDays(new Date(), days - 1)).toISOString();

      const [paid, viewsCount, usersCount, vipCount, recentOrders] = await Promise.all([
        supabase.from("orders").select("amount, created_at").eq("status", "paid").gte("created_at", since),
        supabase.from("video_views").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("vip_subscriptions").select("id", { count: "exact", head: true }).eq("is_active", true).gt("expires_at", new Date().toISOString()),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const orders = paid.data ?? [];
      const revenue = orders.reduce((a, r: any) => a + Number(r.amount ?? 0), 0);
      const ordersCount = orders.length;
      const ticket = ordersCount > 0 ? revenue / ordersCount : 0;

      const start = startOfDay(range === "today" ? new Date() : subDays(new Date(), days - 1));
      const series = eachDayOfInterval({ start, end: startOfDay(new Date()) }).map((d) => ({
        date: d.toISOString(),
        label: format(d, days <= 7 ? "EEE dd" : "dd/MM", { locale: ptBR }),
        revenue: 0,
        orders: 0,
      }));
      orders.forEach((o: any) => {
        const key = format(startOfDay(new Date(o.created_at)), "yyyy-MM-dd");
        const slot = series.find((s) => format(new Date(s.date), "yyyy-MM-dd") === key);
        if (slot) { slot.revenue += Number(o.amount); slot.orders += 1; }
      });

      return {
        revenue,
        ordersCount,
        ticket,
        viewsCount: viewsCount.count ?? 0,
        usersCount: usersCount.count ?? 0,
        vipCount: vipCount.count ?? 0,
        series,
        recentOrders: recentOrders.data ?? [],
      };
    },
  });

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const fmtCompact = (n: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);

const AdminDashboard = () => {
  const [range, setRange] = useState<Range>("7d");
  const { data, isLoading } = useStats(range);

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Receita", value: fmtBRL(data.revenue), icon: DollarSign, tint: "bg-emerald-500/10 text-emerald-600" },
      { label: "Pedidos pagos", value: data.ordersCount.toLocaleString("pt-BR"), icon: ShoppingCart, tint: "bg-primary/10 text-primary" },
      { label: "Ticket médio", value: fmtBRL(data.ticket), icon: Receipt, tint: "bg-blue-500/10 text-blue-600" },
      { label: "Views", value: fmtCompact(data.viewsCount), icon: Eye, tint: "bg-purple-500/10 text-purple-600" },
      { label: "Usuários", value: fmtCompact(data.usersCount), icon: Users, tint: "bg-orange-500/10 text-orange-600" },
      { label: "VIPs ativos", value: fmtCompact(data.vipCount), icon: Crown, tint: "bg-yellow-500/10 text-yellow-600" },
    ];
  }, [data]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header + range selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold md:text-2xl">Dashboard</h1>
          <p className="text-xs text-muted-foreground md:text-sm">Período: {rangeLabel[range]}</p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-card">
          {(Object.keys(rangeLabel) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                range === r ? "bg-primary text-primary-foreground shadow-button" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {rangeLabel[r]}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-border bg-card p-3 shadow-card md:p-4">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.tint}`}>
                  <c.icon className="h-4 w-4" />
                </div>
                <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:text-[11px]">{c.label}</p>
                <p className="mt-0.5 text-base font-extrabold leading-tight md:text-lg">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card md:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-primary" /> Receita</h2>
                <span className="text-xs font-extrabold text-primary">{fmtBRL(data.revenue)}</span>
              </div>
              <div className="mt-3 h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmtCompact(v)} />
                    <Tooltip formatter={(v: any) => fmtBRL(Number(v))}
                      contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-card md:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Pedidos por dia</h2>
                <span className="text-xs font-extrabold text-primary">{data.ordersCount} no total</span>
              </div>
              <div className="mt-3 h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.series} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-card md:p-5">
            <h2 className="text-sm font-bold">Pedidos recentes</h2>
            <div className="mt-3 space-y-2 md:hidden">
              {data.recentOrders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">
                      {o.purchase_type === "vip_global" ? "VIP" : "Modelo"} · {fmtBRL(Number(o.amount))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(o.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              ))}
              {data.recentOrders.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">Nenhum pedido ainda.</p>
              )}
            </div>

            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-semibold uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Valor</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o: any) => (
                    <tr key={o.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 text-xs">{format(new Date(o.created_at), "dd/MM HH:mm", { locale: ptBR })}</td>
                      <td className="py-2 pr-3 text-xs">{o.purchase_type === "vip_global" ? "VIP" : "Modelo"}</td>
                      <td className="py-2 pr-3 text-xs font-semibold">{fmtBRL(Number(o.amount))}</td>
                      <td className="py-2"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                  {data.recentOrders.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-xs text-muted-foreground">Nenhum pedido ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-600",
    pending: "bg-yellow-500/15 text-yellow-700",
    cancelled: "bg-muted text-muted-foreground",
    refunded: "bg-blue-500/15 text-blue-600",
  };
  const labels: Record<string, string> = { paid: "Pago", pending: "Pendente", cancelled: "Cancelado", refunded: "Reembolsado" };
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${colors[status] ?? "bg-muted"}`}>
      {labels[status] ?? status}
    </span>
  );
};

export default AdminDashboard;
