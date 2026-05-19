import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/kitchen")({ component: Kitchen, head: () => ({ meta: [{ title: "Kitchen — Nova Luxe" }] }) });

const NEXT: Record<string, string> = { placed: "confirmed", confirmed: "preparing", preparing: "ready", ready: "served", served: "completed" };

function Kitchen() {
  const { user, roles, loading } = useAuth();
  const qc = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ["kitchen-orders"],
    enabled: !!user && (roles.includes("kitchen") || roles.includes("admin")),
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").not("status", "in", "(completed,cancelled)").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("kitchen-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => qc.invalidateQueries({ queryKey: ["kitchen-orders"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  if (loading) return <main className="container py-12 text-center"><Loader2 className="animate-spin size-6 mx-auto" /></main>;
  if (!user) return <Gate msg="Sign in required" />;
  if (!roles.includes("kitchen") && !roles.includes("admin")) return <Gate msg="Kitchen staff access only" />;

  const advance = async (id: string, status: string) => {
    const next = NEXT[status]; if (!next) return;
    const { error } = await supabase.from("orders").update({ status: next, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else toast.success(`→ ${next}`);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <ChefHat className="size-7 text-primary" />
        <h1 className="font-display text-3xl font-bold">Kitchen Dashboard</h1>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders?.map((o: any) => (
          <div key={o.id} className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold">Table {o.table_number ?? "—"}</div>
                <div className="text-xs text-muted-foreground">#{o.id.slice(0,8)} · {new Date(o.created_at).toLocaleTimeString()}</div>
              </div>
              <span className="text-xs uppercase tracking-wider rounded-full bg-primary/10 text-primary px-2 py-0.5">{o.status}</span>
            </div>
            <ul className="text-sm space-y-1 mt-3 border-t pt-3">
              {o.order_items?.map((it: any) => (
                <li key={it.id}>
                  <span className="font-semibold">{it.quantity}×</span> {it.name} <span className="text-muted-foreground">({it.spice_level})</span>
                  {it.special_instructions && <div className="text-xs text-primary italic">⚠ {it.special_instructions}</div>}
                </li>
              ))}
            </ul>
            {NEXT[o.status] && (
              <Button className="w-full mt-4" onClick={() => advance(o.id, o.status)}>Mark as {NEXT[o.status]}</Button>
            )}
          </div>
        ))}
        {orders && orders.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No active orders.</p>}
      </div>
    </main>
  );
}

function Gate({ msg }: { msg: string }) {
  return <main className="container py-16 text-center"><p className="text-muted-foreground">{msg}</p><Link to="/" className="text-primary underline">Home</Link></main>;
}
