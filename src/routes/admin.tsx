import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, TrendingUp, ShoppingBag, Users, Clock, Star, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: Admin, head: () => ({ meta: [{ title: "Admin Dashboard — Nova Luxe" }] }) });

const STATUS_OPTIONS = ["placed", "confirmed", "preparing", "ready", "served", "completed", "cancelled"] as const;
const STATUS_LABEL: Record<string, string> = {
  placed: "Order Received", confirmed: "Confirmed", preparing: "Preparing", ready: "Ready to Serve",
  served: "Served", completed: "Delivered", cancelled: "Cancelled",
};

function Admin() {
  const { user, roles, loading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !roles.includes("admin")) return;
    const ch = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, roles, queryClient]);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: roles.includes("admin"),
    queryFn: async () => {
      const [{ data: orders }, { count: items }, { data: feedback }] = await Promise.all([
        supabase.from("orders").select("total, status, created_at"),
        supabase.from("menu_items").select("*", { count: "exact", head: true }),
        supabase.from("feedback").select("food_rating, service_rating, comment, created_at").order("created_at", { ascending: false }).limit(10),
      ]);
      const revenue = (orders ?? []).reduce((s, o: any) => s + Number(o.total), 0);
      const pending = (orders ?? []).filter((o: any) => !["completed", "cancelled"].includes(o.status)).length;
      const ratings = (feedback ?? []).map((f: any) => (Number(f.food_rating) + Number(f.service_rating)) / 2).filter((n) => !isNaN(n));
      const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      return {
        orderCount: orders?.length ?? 0, revenue, items: items ?? 0, pending, avgRating,
        feedback: feedback ?? [],
      };
    },
  });

  if (loading) return <main className="container py-12 text-center"><Loader2 className="animate-spin size-6 mx-auto" /></main>;
  if (!user || !roles.includes("admin")) {
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    return (
      <main className="container py-16 text-center max-w-md mx-auto">
        <ShieldCheck className="size-12 mx-auto text-primary" />
        <h1 className="font-display text-3xl font-bold mt-4">Redirecting to admin login…</h1>
        <Link to="/admin/login" className="text-primary underline mt-4 inline-block">Go to admin login</Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2 text-sm">
          <Link to="/admin/menu" className="text-primary font-semibold underline">Manage menu →</Link>
          <Link to="/kitchen" className="text-primary font-semibold underline">Kitchen view →</Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Stat icon={TrendingUp} label="Revenue (demo)" value={`₹${(stats?.revenue ?? 0).toFixed(0)}`} />
        <Stat icon={ShoppingBag} label="Total orders" value={String(stats?.orderCount ?? 0)} />
        <Stat icon={Clock} label="Pending" value={String(stats?.pending ?? 0)} />
        <Stat icon={Star} label="Avg rating" value={stats?.avgRating ? stats.avgRating.toFixed(1) : "—"} />
        <Stat icon={Users} label="Menu items" value={String(stats?.items ?? 0)} />
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-4">
          <OrdersManager />
        </TabsContent>
        <TabsContent value="feedback" className="mt-4">
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <h2 className="font-display text-xl font-semibold mb-3">Recent feedback</h2>
            {stats?.feedback?.map((f: any, i: number) => (
              <div key={i} className="border-b last:border-0 py-3 text-sm">
                <div className="font-semibold">Food {f.food_rating}/5 · Service {f.service_rating}/5</div>
                {f.comment && <p className="text-muted-foreground mt-1">"{f.comment}"</p>}
                <p className="text-xs text-muted-foreground mt-1">{new Date(f.created_at).toLocaleString()}</p>
              </div>
            ))}
            {stats?.feedback?.length === 0 && <p className="text-sm text-muted-foreground">No feedback yet.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function OrdersManager() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(name, quantity)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else toast.success(`Order → ${STATUS_LABEL[status]}`);
  };

  const filtered = (orders ?? []).filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (q && !o.id.toLowerCase().includes(q.toLowerCase()) && !(o.table_number?.toString() ?? "").includes(q)) return false;
    return true;
  });

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-6 shadow-card">
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by order ID or table…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading orders…</p>}
      {!isLoading && filtered.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No orders match.</p>}

      <div className="space-y-3">
        {filtered.map((o) => (
          <div key={o.id} className="rounded-xl border p-4 flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[180px]">
              <div className="font-semibold">#{o.id.slice(0, 8)} · Table {o.table_number ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.payment_method ?? "—"} · {o.payment_status}</div>
              <div className="text-xs mt-1">{o.order_items?.map((it: any) => `${it.quantity}× ${it.name}`).join(", ")}</div>
            </div>
            <div className="font-display text-lg font-bold text-primary">₹{Number(o.total).toFixed(0)}</div>
            <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            {o.status !== "cancelled" && o.status !== "completed" && (
              <Button variant="outline" size="sm" onClick={() => updateStatus(o.id, "cancelled")}>Reject</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Icon className="size-5" /></div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className="font-display text-2xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}
