import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Eye, ShoppingCart, Users, TrendingUp, Crown } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const useStats = () =>
  useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const since30 = subDays(new Date(), 30).toISOString();
      const since7 = subDays(new Date(), 7).toISOString();
      const sinceToday = startOfDay(new Date()).toISOString();

      const [paidAll, paid7, paidToday, viewsAll, usersCount, vipCount, recentOrders] = await Promise.all([
        supabase.from("orders").select("amount, created_at, status").eq("status", "paid").gte("created_at", since30),
        supabase.from("orders").select("amount").eq("status", "paid").gte("created_at", since7),
        supabase.from("orders").select("amount").eq("status", "paid").gte("created_at", sinceToday),
        supabase.from("video_views").select("id", { count: "exact", head: true }).gte("created_at", since30),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("vip_subscriptions").select("id", { count: "exact", head: true }).eq("is_active", true).gt("expires_at", new Date().toISOString()),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const sum = (rows: any[] | null) =>
        (rows ?? []).reduce((a, r) => a + Number(r.amount ?? 0), 0);

      // Daily series (30 days)
      const days: { date: string; label: string; revenue: number; orders: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = startOfDay(subDays(new Date(), i));
        days.push({
          date: d.toISOString(),
          label: format(d, "dd/MM", { locale: ptBR }),
          revenue: 0,
          orders: 0,
        });
      }
      (paidAll.data ?? []).forEach((o: any) => {
        const dayKey = format(startOfDay(new Date(o.created_at)), "dd/MM", { locale: ptBR });
        const slot = days.find((d) => d.label === dayKey);
        if (slot) { slot.revenue += Number(o.amount); slot.orders += 1; }
      });

      return {
        revenue30: sum(paidAll.data),
        revenue7: sum(paid7.data),
        revenueToday: sum(paidToday.data),
        viewsCount: viewsAll.count ?? 0,
        usersCount: usersCount.count ?? 0,
        vipCount: vipCount.count ?? 0,
        days,
        recentOrders: recentOrders.data ?? [],
      };
    },
  });

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const AdminDashboard = () => {
  const { data, isLoading } = useStats();

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const cards = [
    { label: "Receita hoje", value: fmtBRL(data.revenueToday), icon: DollarSign, color: "text-emerald-600" },
    { label: "Receita 7 dias", value: fmtBRL(data.revenue7), icon: TrendingUp, color: "text-blue-600" },
    { label: "Receita 30 dias", value: fmtBRL(data.revenue30), icon: ShoppingCart, color: "text-primary" },
    { label: "Visualizações 30d", value: data.viewsCount.toLocaleString("pt-BR"), icon: Eye, color: "text-purple-600" },
    { label: "Usuários totais", value: data.usersCount.toLocaleString("pt-BR"), icon: Users, color: "text-orange-600" },
    { label: "VIPs ativos", value: data.vipCount.toLocaleString("pt-BR"), icon: Crown, color: "text-yellow-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu site</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <c.icon className={`h-5 w-5 ${c.color}`} />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-lg font-extrabold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-bold">Receita (30 dias)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.days}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: any) => fmtBRL(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-bold">Vendas por dia (30 dias)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.days}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-bold">Pedidos recentes</h2>
        <div className="mt-3 overflow-x-auto">
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
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-muted text-muted-foreground",
    refunded: "bg-blue-100 text-blue-700",
  };
  const labels: Record<string, string> = { paid: "Pago", pending: "Pendente", cancelled: "Cancelado", refunded: "Reembolsado" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${colors[status] ?? "bg-muted"}`}>
      {labels[status] ?? status}
    </span>
  );
};

export default AdminDashboard;
