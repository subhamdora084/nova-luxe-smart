import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/track")({
  component: TrackList,
  head: () => ({ meta: [{ title: "Track Orders — Nova Luxe" }] }),
});

function TrackList() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (!user) return (
    <main className="container mx-auto px-4 py-16 text-center max-w-md">
      <h1 className="font-display text-3xl font-bold">Sign in to track</h1>
      <p className="text-muted-foreground mt-2">Your orders appear here after signing in.</p>
      <Link to="/login" className="text-primary underline mt-4 inline-block">Sign in</Link>
    </main>
  );

  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="font-display text-4xl font-bold mb-6">Your Orders</h1>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {orders && orders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
      <div className="space-y-3">
        {orders?.map((o: any) => (
          <Link key={o.id} to="/track/$orderId" params={{ orderId: o.id }} className="block rounded-2xl border bg-card p-5 shadow-card hover:shadow-warm transition">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Order #{o.id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · Table {o.table_number ?? "—"}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-bold text-primary">₹{Number(o.total).toFixed(0)}</div>
                <div className="text-xs uppercase tracking-wider mt-1 inline-flex items-center gap-1">
                  {o.status === "completed" ? <CheckCircle2 className="size-3 text-success" /> : <Clock className="size-3" />}
                  {o.status}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
