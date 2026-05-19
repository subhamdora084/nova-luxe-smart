import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Search, Plus, Star, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCart, type CartItem } from "@/hooks/use-cart";
import { toast } from "sonner";

export const Route = createFileRoute("/menu")({
  component: MenuPage,
  head: () => ({ meta: [{ title: "Menu — Nova Luxe" }] }),
});

interface MenuItem {
  id: string; name: string; description: string | null; price: number;
  image_url: string | null; rating: number | null; is_available: boolean;
  is_special: boolean; spice_level_options: string[] | null; category_id: string;
}
interface Category { id: string; name: string; sort_order: number; }

function MenuPage() {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [selected, setSelected] = useState<MenuItem | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["menu-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_categories").select("*").order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["menu-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").eq("is_available", true).order("is_special", { ascending: false });
      if (error) throw error;
      return data as MenuItem[];
    },
  });

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((i) => {
      const matchCat = activeCat === "all" || i.category_id === activeCat;
      const matchQ = !query || i.name.toLowerCase().includes(query.toLowerCase()) || (i.description ?? "").toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQ;
    });
  }, [items, query, activeCat]);

  return (
    <main className="container mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl font-bold">Our Menu</h1>
        <p className="text-muted-foreground mt-2">Crafted with care. Customized for you.</p>
      </header>

      <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-background/90 backdrop-blur border-b mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search dishes..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <CatChip label="All" active={activeCat === "all"} onClick={() => setActiveCat("all")} />
          {categories?.map((c) => (
            <CatChip key={c.id} label={c.name} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} />
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card h-72 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((it) => <DishCard key={it.id} item={it} onPick={() => setSelected(it)} />)}
          {filtered.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No dishes match.</p>}
        </div>
      )}

      <CustomizeDialog item={selected} onClose={() => setSelected(null)} />
    </main>
  );
}

function CatChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium border transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"}`}>
      {label}
    </button>
  );
}

function DishCard({ item, onPick }: { item: MenuItem; onPick: () => void }) {
  return (
    <article className="group rounded-2xl border bg-card overflow-hidden shadow-card hover:shadow-warm transition cursor-pointer" onClick={onPick}>
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} loading="lazy" className="size-full object-cover group-hover:scale-105 transition duration-500" />
        ) : <div className="size-full bg-muted" />}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight">{item.name}</h3>
          {item.is_special && <Badge className="bg-gold text-gold-foreground hover:bg-gold"><Flame className="size-3 mr-1" />Special</Badge>}
        </div>
        {item.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-display text-xl font-bold text-primary">₹{Number(item.price).toFixed(0)}</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-muted-foreground"><Star className="size-3.5 fill-gold text-gold" />{item.rating}</span>
            <Button size="sm" className="rounded-full h-8 w-8 p-0"><Plus className="size-4" /></Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function CustomizeDialog({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const { add } = useCart();
  const [spice, setSpice] = useState<string>("Medium");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  if (!item) return null;
  const options = item.spice_level_options ?? ["Mild", "Medium", "Spicy"];

  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{item.name}</DialogTitle>
        </DialogHeader>
        {item.image_url && <img src={item.image_url} className="rounded-xl aspect-[4/3] object-cover w-full" alt={item.name} />}
        <p className="text-sm text-muted-foreground">{item.description}</p>

        <div>
          <Label className="text-sm font-semibold">Spice level</Label>
          <RadioGroup value={spice} onValueChange={setSpice} className="flex gap-2 mt-2">
            {options.map((o) => (
              <Label key={o} className={`flex-1 rounded-lg border px-3 py-2 text-center cursor-pointer text-sm ${spice === o ? "border-primary bg-primary/5" : ""}`}>
                <RadioGroupItem value={o} className="sr-only" />{o}
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label className="text-sm font-semibold">Special instructions</Label>
          <Textarea placeholder="e.g. no onions" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2" maxLength={200} />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Quantity</Label>
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" className="size-8" onClick={() => setQty(Math.max(1, qty - 1))}>−</Button>
            <span className="w-8 text-center font-semibold">{qty}</span>
            <Button size="icon" variant="outline" className="size-8" onClick={() => setQty(qty + 1)}>+</Button>
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full h-12" onClick={() => {
            const cartItem: Omit<CartItem, "quantity"> & { quantity?: number } = {
              id: `${item.id}-${spice}`,
              name: item.name,
              price: Number(item.price),
              image_url: item.image_url,
              spice_level: spice,
              special_instructions: notes || undefined,
              quantity: qty,
            };
            add(cartItem);
            toast.success(`${item.name} added`);
            onClose();
            setQty(1); setNotes(""); setSpice("Medium");
          }}>
            Add to cart — ₹{(Number(item.price) * qty).toFixed(0)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
