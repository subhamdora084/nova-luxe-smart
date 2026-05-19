import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";

export const Route = createFileRoute("/scan")({
  component: Scan,
  validateSearch: (s): { table?: number } => ({ table: s.table ? Number(s.table) : undefined }),
});

function Scan() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { setTableNumber } = useCart();
  const [table, setTable] = useState(search.table ? String(search.table) : "");

  const confirm = () => {
    const n = parseInt(table, 10);
    if (!n || n < 1 || n > 200) { toast.error("Enter a valid table number (1-200)"); return; }
    setTableNumber(n);
    toast.success(`Table ${n} selected`);
    navigate({ to: "/menu" });
  };

  return (
    <main className="container mx-auto px-4 py-16 max-w-md">
      <div className="rounded-3xl border bg-card p-8 shadow-card text-center">
        <div className="size-16 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-4">
          <QrCode className="size-8" />
        </div>
        <h1 className="font-display text-3xl font-bold">Table check-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Scanned a QR? Confirm your table number to begin.
        </p>
        <div className="mt-6 space-y-3 text-left">
          <Input inputMode="numeric" placeholder="Table number" value={table} onChange={(e) => setTable(e.target.value)} className="text-lg h-12" />
          <Button className="w-full h-12" onClick={confirm}>Start Ordering</Button>
        </div>
      </div>
    </main>
  );
}
