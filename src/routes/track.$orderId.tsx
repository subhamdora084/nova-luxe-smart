import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getGuestOrderToken } from "@/hooks/use-cart";

export const Route = createFileRoute("/track/$orderId")({
  component: TrackOrder,
});

const STAGES = ["placed", "confirmed", "preparing", "ready", "served", "completed"] as const;
const LABELS: Record<string, string> = {
  placed: "Order Placed", confirmed: "Confirmed", preparing: "Preparing",
  ready: "Ready", served: "Served", completed: "Completed",
};

function TrackOrder() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const ch = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => queryClient.invalidateQueries({ queryKey: ["order", orderId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, queryClient]);


  const { data: order } = useQuery({
    queryKey: ["order", orderId, user?.id],
    queryFn: async () => {
      if (user) {
        const { data, error } = await supabase
          .from("orders").select("*, order_items(*)").eq("id", orderId).single();
        if (error) throw error;
        return data as any;
      }
      const token = getGuestOrderToken(orderId);
      if (!token) throw new Error("Order not found on this device. Please sign in to view your orders.");
      const { data, error } = await supabase.rpc("get_guest_order", { _order_id: orderId, _token: token });
      if (error) throw error;
      if (!data) throw new Error("Order not found.");
      const payload = data as { order: any; items: any[] };
      return { ...payload.order, order_items: payload.items };
    },
    refetchInterval: 5000,
  });

  if (!order) return <main className="container py-12 text-center"><Loader2 className="animate-spin size-6 mx-auto" /></main>;

  const currentIdx = STAGES.indexOf(order.status as typeof STAGES[number]);

  return (
    <main className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Order #{order.id.slice(0, 8)}</h1>
      <p className="text-muted-foreground">Table {order.table_number ?? "—"} · ₹{Number(order.total).toFixed(0)}</p>

      <div className="rounded-3xl border bg-card p-6 mt-8 shadow-card">
        <ol className="space-y-5">
          {STAGES.map((s, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <li key={s} className="flex items-center gap-4">
                <div className={`size-9 rounded-full grid place-items-center transition ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {done && !active ? <CheckCircle2 className="size-5" /> : active ? <Loader2 className="size-5 animate-spin" /> : <Circle className="size-5" />}
                </div>
                <div>
                  <div className={`font-semibold ${active ? "text-primary" : ""}`}>{LABELS[s]}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-2xl border bg-card p-6 mt-6 shadow-card">
        <h2 className="font-display text-xl font-semibold mb-3">Items</h2>
        {order.order_items?.map((it: any) => (
          <div key={it.id} className="flex justify-between text-sm py-1 border-b last:border-0">
            <span>{it.quantity}× {it.name} <span className="text-muted-foreground">({it.spice_level})</span></span>
            <span>₹{(it.unit_price * it.quantity).toFixed(0)}</span>
          </div>
        ))}
      </div>

      {order.status === "completed" && (
        <Link to="/feedback" search={{ orderId: order.id }}>
          <Button className="w-full mt-6 h-12">Rate this order & earn points</Button>
        </Link>
      )}
    </main>
  );
}
