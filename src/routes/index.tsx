import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode, Utensils, Clock, Star, Sparkles, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({ meta: [{ title: "Nova Luxe — Scan, Order, Enjoy" }] }),
});

function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920)", backgroundSize: "cover" }} />
        <div className="relative container mx-auto px-4 py-24 md:py-32 max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-xs uppercase tracking-widest text-gold">
            <Sparkles className="size-3" /> Smart Restaurant System
          </span>
          <h1 className="mt-6 font-display text-5xl md:text-7xl font-bold leading-tight">
            Skip the wait. <br />
            <span className="text-gold">Savor the moment.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
            Scan the QR at your table, browse our menu, customize every bite, and track your order live — all without flagging a waiter.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link to="/menu"><Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 h-12 px-8">Browse Menu</Button></Link>
            <Link to="/scan"><Button size="lg" variant="outline" className="h-12 px-8 bg-transparent border-white/30 text-white hover:bg-white/10">
              <QrCode className="size-4 mr-2" /> Scan Table QR
            </Button></Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-4xl font-bold">Dining, reimagined</h2>
          <p className="mt-3 text-muted-foreground">Four steps from seat to satisfaction.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: QrCode, title: "Scan", desc: "Tap your table's QR code to open the menu." },
            { icon: Utensils, title: "Customize", desc: "Pick spice levels, extras, and special notes." },
            { icon: ChefHat, title: "Kitchen Live", desc: "Orders flow directly to the kitchen — no errors." },
            { icon: Clock, title: "Track", desc: "Watch your order move from prep to served." },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 shadow-card hover:shadow-warm transition">
              <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4">
                <s.icon className="size-6" />
              </div>
              <h3 className="font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rewards CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="rounded-3xl bg-gradient-gold p-10 md:p-14 text-gold-foreground grid md:grid-cols-2 gap-8 items-center shadow-warm">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold"><Star className="size-4 fill-current" /> NOVA REWARDS</div>
            <h2 className="mt-3 font-display text-4xl font-bold">Eat. Rate. Earn.</h2>
            <p className="mt-3 text-gold-foreground/80 max-w-md">
              Every order you rate earns you 20 points. Redeem them for free drinks, desserts, and signature combos.
            </p>
            <Link to="/rewards"><Button className="mt-6 bg-foreground text-background hover:bg-foreground/90">Explore Rewards</Button></Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[["100", "Free soft drink"], ["250", "Discount coupon"], ["500", "Free dessert"], ["1000", "Premium reward"]].map(([pts, name]) => (
              <div key={pts} className="rounded-xl bg-foreground/10 p-4 backdrop-blur">
                <div className="font-display text-2xl font-bold">{pts}</div>
                <div className="text-xs opacity-80">{name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Nova Luxe — Smart restaurant & hotel ordering.
        <span className="mx-2">·</span>
        <Link to="/admin/login" className="hover:text-primary transition">Staff login</Link>
      </footer>
    </main>
  );
}
