import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, TrendingUp, ShoppingBag, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin")({ component: Admin, head: () => ({ meta: [{ title: "Admin — Nova Luxe" }] }) });

function Admin() {
  const { user, roles, loading } = useAuth();

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
      return { orderCount: orders?.length ?? 0, revenue, items: items ?? 0, feedback: feedback ?? [], recent: (orders ?? []).slice(-5).reverse() };
    },
  });

  if (loading) return <main className="container py-12 text-center"><Loader2 className="animate-spin size-6 mx-auto" /></main>;
  if (!user || !roles.includes("admin")) return (
    <main className="container py-16 text-center max-w-md mx-auto">
      <ShieldCheck className="size-12 mx-auto text-primary" />
      <h1 className="font-display text-3xl font-bold mt-4">Admin access required</h1>
      <p className="text-muted-foreground mt-2">Sign in with an admin account to view this dashboard.</p>
      <p className="text-xs text-muted-foreground mt-4">To grant admin: open the backend and insert a row in <code>user_roles</code> with role=admin for your user id.</p>
      <Link to="/login" className="text-primary underline mt-4 inline-block">Sign in</Link>
    </main>
  );

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Stat icon={TrendingUp} label="Revenue" value={`₹${(stats?.revenue ?? 0).toFixed(0)}`} />
        <Stat icon={ShoppingBag} label="Total orders" value={String(stats?.orderCount ?? 0)} />
        <Stat icon={Users} label="Menu items" value={String(stats?.items ?? 0)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="font-display text-xl font-semibold mb-3">Recent orders</h2>
          {stats?.recent?.map((o: any, i: number) => (
            <div key={i} className="flex justify-between text-sm border-b last:border-0 py-2">
              <span className="capitalize">{o.status}</span>
              <span>₹{Number(o.total).toFixed(0)}</span>
              <span className="text-muted-foreground text-xs">{new Date(o.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="font-display text-xl font-semibold mb-3">Recent feedback</h2>
          {stats?.feedback?.map((f: any, i: number) => (
            <div key={i} className="border-b last:border-0 py-2 text-sm">
              <div className="font-semibold">Food {f.food_rating}/5 · Service {f.service_rating}/5</div>
              {f.comment && <p className="text-muted-foreground">"{f.comment}"</p>}
            </div>
          ))}
          {stats?.feedback?.length === 0 && <p className="text-sm text-muted-foreground">No feedback yet.</p>}
        </div>
      </div>

      <div className="rounded-2xl border bg-accent/30 p-6 mt-6 flex flex-wrap gap-4 text-sm">
        <Link to="/admin/menu" className="text-primary font-semibold underline">Manage menu →</Link>
        <Link to="/kitchen" className="text-primary font-semibold underline">Kitchen view →</Link>
      </div>
    </main>
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
