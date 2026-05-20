import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getGuestOrderIds } from "@/hooks/use-cart";

export const Route = createFileRoute("/track")({
  component: TrackList,
  head: () => ({ meta: [{ title: "Track Orders — Nova Luxe" }] }),
});

function TrackList() {
  const { user } = useAuth();
  const guestIds = getGuestOrderIds();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id, guestIds.join(",")],
    queryFn: async () => {
      if (user) {
        const { data, error } = await supabase
          .from("orders").select("*")
          .order("created_at", { ascending: false }).limit(20);
        if (error) throw error;
        return data;
      }
      if (guestIds.length === 0) return [];
      const { data, error } = await supabase
        .from("orders").select("*")
        .in("id", guestIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="font-display text-4xl font-bold mb-6">Your Orders</h1>
      {!user && (
        <p className="text-sm text-muted-foreground mb-4">
          Showing guest orders from this device. <Link to="/login" className="text-primary underline">Sign in</Link> to keep your order history forever and earn reward points.
        </p>
      )}
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {orders && orders.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center shadow-card">
          <p className="text-muted-foreground">No orders yet.</p>
          <Link to="/menu" className="text-primary font-semibold underline mt-2 inline-block">Browse the menu</Link>
        </div>
      )}
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
