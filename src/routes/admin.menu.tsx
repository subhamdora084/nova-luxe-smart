import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Loader2, ShieldCheck, Plus, Pencil, Trash2, Upload, Star, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/menu")({
  component: AdminMenu,
  head: () => ({ meta: [{ title: "Menu editor — Nova Luxe" }] }),
});

interface Category { id: string; name: string; sort_order: number }
interface MenuItem {
  id: string; name: string; description: string | null; price: number;
  image_url: string | null; rating: number | null; is_available: boolean;
  is_special: boolean; category_id: string | null;
}

function AdminMenu() {
  const { user, roles, loading } = useAuth();
  const qc = useQueryClient();
  const [itemDialog, setItemDialog] = useState<MenuItem | "new" | null>(null);
  const [catDialog, setCatDialog] = useState<Category | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "item" | "cat"; id: string; name: string } | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    enabled: roles.includes("admin"),
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_categories").select("*").order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["admin-items"],
    enabled: roles.includes("admin"),
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").order("name");
      if (error) throw error;
      return data as MenuItem[];
    },
  });

  if (loading) return <main className="container py-12 text-center"><Loader2 className="animate-spin size-6 mx-auto" /></main>;
  if (!user || !roles.includes("admin")) {
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    return (
      <main className="container py-16 text-center max-w-md mx-auto">
        <ShieldCheck className="size-12 mx-auto text-primary" />
        <h1 className="font-display text-3xl font-bold mt-4">Redirecting…</h1>
        <Link to="/admin/login" className="text-primary underline mt-4 inline-block">Admin login</Link>
      </main>
    );
  }

  const toggleAvail = async (it: MenuItem) => {
    const { error } = await supabase.from("menu_items").update({ is_available: !it.is_available }).eq("id", it.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-items"] });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const table = confirmDelete.kind === "item" ? "menu_items" : "menu_categories";
    const { error } = await supabase.from(table).delete().eq("id", confirmDelete.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: [confirmDelete.kind === "item" ? "admin-items" : "admin-categories"] });
    setConfirmDelete(null);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <Link to="/admin" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-3"><ArrowLeft className="size-4" /> Back to dashboard</Link>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-3xl font-bold">Menu editor</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatDialog("new")}><Plus className="size-4" /> Category</Button>
          <Button onClick={() => setItemDialog("new")}><Plus className="size-4" /> Dish</Button>
        </div>
      </div>

      {/* Categories */}
      <section className="rounded-2xl border bg-card p-6 shadow-card mb-6">
        <h2 className="font-display text-xl font-semibold mb-3">Categories</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories?.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">Sort: {c.sort_order}</div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setCatDialog(c)}><Pencil className="size-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setConfirmDelete({ kind: "cat", id: c.id, name: c.name })}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
          {categories?.length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}
        </div>
      </section>

      {/* Items */}
      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="font-display text-xl font-semibold mb-3">Dishes ({items?.length ?? 0})</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items?.map(it => (
            <div key={it.id} className="rounded-xl border overflow-hidden bg-background">
              {it.image_url ? (
                <img src={it.image_url} alt={it.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-muted grid place-items-center text-muted-foreground text-sm">No image</div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold leading-tight">{it.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {categories?.find(c => c.id === it.category_id)?.name ?? "Uncategorized"}
                    </div>
                  </div>
                  <div className="font-display font-bold">₹{Number(it.price).toFixed(0)}</div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <Badge variant="secondary"><Star className="size-3 mr-1" />{it.rating ?? "—"}</Badge>
                  {it.is_special && <Badge>Special</Badge>}
                  <Badge variant={it.is_available ? "default" : "outline"}>
                    {it.is_available ? "Available" : "Hidden"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={it.is_available} onCheckedChange={() => toggleAvail(it)} />
                    <span className="text-xs text-muted-foreground">Available</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setItemDialog(it)}><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmDelete({ kind: "item", id: it.id, name: it.name })}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {items?.length === 0 && <p className="text-sm text-muted-foreground">No dishes yet. Add your first one.</p>}
        </div>
      </section>

      {itemDialog && (
        <ItemEditor
          item={itemDialog === "new" ? null : itemDialog}
          categories={categories ?? []}
          onClose={() => setItemDialog(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-items"] }); setItemDialog(null); }}
        />
      )}
      {catDialog && (
        <CategoryEditor
          category={catDialog === "new" ? null : catDialog}
          onClose={() => setCatDialog(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-categories"] }); setCatDialog(null); }}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function ItemEditor({ item, categories, onClose, onSaved }: {
  item: MenuItem | null; categories: Category[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: item?.price ?? 0,
    rating: item?.rating ?? 4.5,
    image_url: item?.image_url ?? "",
    is_available: item?.is_available ?? true,
    is_special: item?.is_special ?? false,
    category_id: item?.category_id ?? (categories[0]?.id ?? ""),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("menu-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
      setForm(f => ({ ...f, image_url: data.publicUrl }));
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim() || form.price <= 0) return toast.error("Name and price are required");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      price: Number(form.price),
      rating: Number(form.rating),
      image_url: form.image_url || null,
      is_available: form.is_available,
      is_special: form.is_special,
      category_id: form.category_id || null,
    };
    const { error } = item
      ? await supabase.from("menu_items").update(payload).eq("id", item.id)
      : await supabase.from("menu_items").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(item ? "Updated" : "Created");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? "Edit dish" : "New dish"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price (₹)</Label>
              <Input type="number" min="0" step="1" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Rating</Label>
              <Input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Image</Label>
            <div className="flex gap-2 items-center">
              <Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="Paste URL or upload" />
              <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            </div>
            {form.image_url && <img src={form.image_url} alt="" className="mt-2 w-full h-32 object-cover rounded-lg border" />}
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
              Available
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.is_special} onCheckedChange={(v) => setForm({ ...form, is_special: v })} />
              Chef's special
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryEditor({ category, onClose, onSaved }: {
  category: Category | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    sort_order: category?.sort_order ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    setSaving(true);
    const payload = { name: form.name.trim(), sort_order: Number(form.sort_order) };
    const { error } = category
      ? await supabase.from("menu_categories").update(payload).eq("id", category.id)
      : await supabase.from("menu_categories").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(category ? "Updated" : "Created");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Sort order</Label>
            <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
