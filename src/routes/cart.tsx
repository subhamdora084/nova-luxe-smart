import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Cart — Nova Luxe" }] }),
});

function CartPage() {
  const { items, setQty, remove, subtotal, tableNumber, setTableNumber } = useCart();
  const navigate = useNavigate();
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  if (items.length === 0) {
    return (
      <main className="container mx-auto px-4 py-20 text-center max-w-md">
        <ShoppingBag className="size-12 mx-auto text-muted-foreground" />
        <h1 className="font-display text-3xl font-bold mt-4">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2">Add a few dishes to get started.</p>
        <Link to="/menu"><Button className="mt-6">Browse Menu</Button></Link>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="font-display text-4xl font-bold mb-6">Your Order</h1>
      <div className="grid md:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="flex gap-4 rounded-2xl border bg-card p-4 shadow-card">
              {it.image_url && <img src={it.image_url} className="size-20 rounded-lg object-cover" alt="" />}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{it.name}</h3>
                <p className="text-xs text-muted-foreground">{it.spice_level}{it.special_instructions ? ` · ${it.special_instructions}` : ""}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="size-7" onClick={() => setQty(it.id, it.quantity - 1)}>−</Button>
                    <span className="w-6 text-center text-sm font-semibold">{it.quantity}</span>
                    <Button size="icon" variant="outline" className="size-7" onClick={() => setQty(it.id, it.quantity + 1)}>+</Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">₹{(it.price * it.quantity).toFixed(0)}</span>
                    <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => remove(it.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-2xl border bg-card p-6 shadow-card h-fit sticky top-24">
          <h2 className="font-display text-xl font-semibold">Summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
            <div className="flex justify-between"><span>GST (5%)</span><span>₹{tax.toFixed(0)}</span></div>
            <div className="flex justify-between font-display text-xl font-bold pt-3 border-t mt-3"><span>Total</span><span className="text-primary">₹{total.toFixed(0)}</span></div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold text-muted-foreground">Table number</label>
            <Input inputMode="numeric" placeholder="Table #" value={tableNumber ?? ""} onChange={(e) => setTableNumber(e.target.value ? Number(e.target.value) : null)} className="mt-1" />
          </div>
          <Button className="w-full mt-6 h-12" onClick={() => navigate({ to: "/checkout" })}>Proceed to Checkout</Button>
        </aside>
      </div>
    </main>
  );
}
