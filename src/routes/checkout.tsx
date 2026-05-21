import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, Smartphone, Wallet, Building2, Banknote, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, saveGuestOrderId } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";


export const Route = createFileRoute("/checkout")({
  component: Checkout,
  head: () => ({ meta: [{ title: "Checkout — Nova Luxe" }] }),
});

type Method = "upi" | "card" | "wallet" | "netbanking" | "cash";

const methods: { id: Method; label: string; sub: string; icon: typeof CreditCard }[] = [
  { id: "upi", label: "UPI", sub: "GPay, PhonePe, Paytm", icon: Smartphone },
  { id: "card", label: "Credit / Debit Card", sub: "Visa, Mastercard, Rupay", icon: CreditCard },
  { id: "wallet", label: "Wallet", sub: "Paytm, Mobikwik, Amazon Pay", icon: Wallet },
  { id: "netbanking", label: "Net Banking", sub: "All major banks", icon: Building2 },
  { id: "cash", label: "Pay at Table", sub: "Cash on completion", icon: Banknote },
];

function Checkout() {
  const { items, subtotal, clear, tableNumber } = useCart();
  const { user } = useAuth();
  
  const [method, setMethod] = useState<Method>("upi");
  const [phase, setPhase] = useState<"idle" | "processing" | "success">("idle");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const placeOrder = async () => {
    if (items.length === 0) { toast.error("Your cart is empty"); return; }

    setPhase("processing");
    try {
      if (method !== "cash") await new Promise((r) => setTimeout(r, 1800));

      const { data: order, error } = await supabase.from("orders").insert({
        user_id: user?.id ?? null,
        table_number: tableNumber,
        payment_method: method,
        payment_status: method === "cash" ? "pending" : "paid",
        subtotal, tax, total,
      }).select("id, guest_token").single();
      if (error) throw error;

      const orderItems = items.map((it) => ({
        order_id: order.id,
        menu_item_id: it.id.split("-")[0],
        name: it.name,
        quantity: it.quantity,
        unit_price: it.price,
        spice_level: it.spice_level,
        special_instructions: it.special_instructions,
      }));
      const { error: e2 } = await supabase.from("order_items").insert(orderItems);
      if (e2) throw e2;

      if (!user) saveGuestOrderId(order.id, (order as any).guest_token);
      clear();
      setPlacedOrderId(order.id);
      setPhase("success");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't place order");
      setPhase("idle");
    }
  };

  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="font-display text-4xl font-bold mb-6">Checkout</h1>

      {!user && (
        <div className="rounded-2xl border border-dashed bg-accent/30 p-4 mb-6 text-sm">
          Ordering as guest — you'll get a live order tracker. <a href="/login" className="text-primary font-semibold underline">Sign in</a> to earn Nova reward points on this order.
        </div>
      )}

      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="font-display text-xl font-semibold mb-4">Payment method</h2>
        <div className="space-y-2">
          {methods.map((m) => (
            <button key={m.id} onClick={() => setMethod(m.id)}
              className={`w-full flex items-center gap-4 rounded-xl border p-4 text-left transition ${method === m.id ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
              <div className={`size-10 rounded-lg grid place-items-center ${method === m.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <m.icon className="size-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.sub}</div>
              </div>
              <div className={`size-5 rounded-full border-2 ${method === m.id ? "border-primary bg-primary" : ""}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-card mt-6">
        <h2 className="font-display text-xl font-semibold mb-4">Order summary</h2>
        <div className="space-y-1 text-sm">
          {items.map((it) => (
            <div key={it.id} className="flex justify-between">
              <span>{it.quantity}× {it.name} <span className="text-muted-foreground">({it.spice_level})</span></span>
              <span>₹{(it.price * it.quantity).toFixed(0)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 border-t mt-3"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
          <div className="flex justify-between"><span>GST</span><span>₹{tax.toFixed(0)}</span></div>
          <div className="flex justify-between font-display text-xl font-bold pt-2"><span>Total</span><span className="text-primary">₹{total.toFixed(0)}</span></div>
          {tableNumber && <div className="text-xs text-muted-foreground mt-2">Table {tableNumber}</div>}
        </div>
      </div>

      <Button className="w-full h-14 mt-6 text-base" disabled={phase !== "idle"} onClick={placeOrder}>
        {phase === "processing" ? <><Loader2 className="size-4 mr-2 animate-spin" /> Processing payment…</> : `Pay & Place Order · ₹${total.toFixed(0)}`}
      </Button>

      <Dialog open={phase === "processing" || phase === "success"}>
        <DialogContent className="max-w-sm text-center [&>button]:hidden">
          {phase === "processing" ? (
            <>
              <DialogTitle className="sr-only">Processing payment</DialogTitle>
              <DialogDescription className="sr-only">Please wait while we confirm your payment.</DialogDescription>
              <div className="py-6">
                <div className="size-16 rounded-full bg-primary/10 grid place-items-center mx-auto mb-4">
                  <Loader2 className="size-8 text-primary animate-spin" />
                </div>
                <p className="font-display text-xl font-semibold">Processing Payment…</p>
                <p className="text-sm text-muted-foreground mt-1">Securely confirming with {methods.find((m) => m.id === method)?.label}</p>
              </div>
            </>
          ) : (
            <>
              <DialogTitle className="sr-only">Payment successful</DialogTitle>
              <DialogDescription className="sr-only">Your order has been placed.</DialogDescription>
              <div className="py-2">
                <div className="size-16 rounded-full bg-success/10 grid place-items-center mx-auto mb-4">
                  <CheckCircle2 className="size-9 text-success" />
                </div>
                <p className="font-display text-2xl font-bold">Payment Successful</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mt-3">Order ID</p>
                <p className="font-mono text-sm">#{placedOrderId?.slice(0, 8)}</p>
                <div className="inline-flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Clock className="size-4" /> Estimated time: 15–30 min
                </div>
                <div className="grid grid-cols-2 gap-2 mt-6">
                  <Link to="/track/$orderId" params={{ orderId: placedOrderId! }}>
                    <Button className="w-full">Track Order</Button>
                  </Link>
                  <Link to="/">
                    <Button variant="outline" className="w-full">Home</Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
