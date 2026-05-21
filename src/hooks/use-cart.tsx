import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  quantity: number;
  spice_level?: string;
  special_instructions?: string;
}

interface CartCtx {
  items: CartItem[];
  tableNumber: number | null;
  setTableNumber: (n: number | null) => void;
  add: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
}

const Ctx = createContext<CartCtx | undefined>(undefined);
const STORAGE_KEY = "nova-cart";
const TABLE_KEY = "nova-table";
const GUEST_ORDERS_KEY = "nova-guest-orders";

export interface GuestOrderRef { id: string; token: string }

export function saveGuestOrderId(id: string, token?: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(GUEST_ORDERS_KEY);
    let list: GuestOrderRef[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed)
        ? parsed.map((v: any) => typeof v === "string" ? { id: v, token: "" } : v)
        : [];
    }
    if (!list.find((o) => o.id === id)) {
      list.unshift({ id, token: token ?? "" });
      localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(list.slice(0, 20)));
    }
  } catch {}
}

export function getGuestOrders(): GuestOrderRef[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v: any) => typeof v === "string" ? { id: v, token: "" } : v);
  } catch {
    return [];
  }
}

export function getGuestOrderToken(id: string): string | null {
  return getGuestOrders().find((o) => o.id === id)?.token || null;
}

export function getGuestOrderIds(): string[] {
  return getGuestOrders().map((o) => o.id);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumberState] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
      const t = localStorage.getItem(TABLE_KEY);
      if (t) setTableNumberState(Number(t));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const setTableNumber = (n: number | null) => {
    setTableNumberState(n);
    if (typeof window !== "undefined") {
      if (n) localStorage.setItem(TABLE_KEY, String(n));
      else localStorage.removeItem(TABLE_KEY);
    }
  };

  const add: CartCtx["add"] = (item) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id && p.spice_level === item.spice_level);
      if (existing) {
        return prev.map((p) => p === existing ? { ...p, quantity: p.quantity + (item.quantity ?? 1) } : p);
      }
      return [...prev, { ...item, quantity: item.quantity ?? 1 }];
    });
  };

  const remove = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const setQty = (id: string, qty: number) =>
    setItems((p) => qty <= 0 ? p.filter((i) => i.id !== id) : p.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Ctx.Provider value={{ items, tableNumber, setTableNumber, add, remove, setQty, clear, subtotal, count }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
};
