import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, User, LogOut, Menu as MenuIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { user, roles, signOut } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isStaff = roles.includes("admin") || roles.includes("kitchen");

  const NavLinks = () => (
    <>
      <Link to="/menu" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>Menu</Link>
      <Link to="/track" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>Track Order</Link>
      <Link to="/rewards" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>Rewards</Link>
      <Link to="/feedback" className="text-sm font-medium hover:text-primary transition" activeProps={{ className: "text-primary" }}>Feedback</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-9 rounded-full bg-gradient-hero grid place-items-center text-primary-foreground font-display font-bold">N</div>
          <span className="font-display text-xl font-bold tracking-tight">Nova Luxe</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <Badge className="absolute -right-1 -top-1 size-5 rounded-full p-0 grid place-items-center text-[10px]">{count}</Badge>
              )}
            </Button>
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><User className="size-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/rewards" })}>Rewards</DropdownMenuItem>
                {isStaff && (
                  <>
                    <DropdownMenuSeparator />
                    {roles.includes("kitchen") && <DropdownMenuItem onClick={() => navigate({ to: "/kitchen" })}>Kitchen Dashboard</DropdownMenuItem>}
                    {roles.includes("admin") && <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>Admin Dashboard</DropdownMenuItem>}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                  <LogOut className="size-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login"><Button variant="default" size="sm">Sign in</Button></Link>
          )}

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((o) => !o)}>
            <MenuIcon className="size-5" />
          </Button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t px-4 py-3 flex flex-col gap-3 bg-background" onClick={() => setOpen(false)}>
          <NavLinks />
        </div>
      )}
    </header>
  );
}
