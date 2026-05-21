import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Lock, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
  head: () => ({ meta: [{ title: "Admin Login — Nova Luxe" }] }),
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data: signin, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr || !signin.user) {
        setError("Invalid username or password");
        return;
      }
      const { data: roles, error: roleErr } = await supabase
        .from("user_roles").select("role").eq("user_id", signin.user.id);
      if (roleErr) throw roleErr;
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (!isAdmin) {
        await supabase.auth.signOut();
        setError("This account does not have admin access.");
        return;
      }
      toast.success("Welcome back, admin");
      navigate({ to: "/admin" });
    } catch (err: any) {
      setError(err.message ?? "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-12 bg-gradient-to-b from-background to-accent/30">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border bg-card p-8 shadow-card">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="font-display text-3xl font-bold text-center mt-4">Admin Portal</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Restricted access. Staff only.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <Label htmlFor="admin-email" className="text-xs">Admin email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="admin-email" type="email" required autoComplete="username"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11" placeholder="admin@novaluxe.in"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="admin-password" className="text-xs">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="admin-password" type="password" required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-11" placeholder="••••••••"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Verifying…</> : "Sign in to Admin"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition">
              ← Back to customer site
            </Link>
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-4">
          Contact your system administrator to request access.
        </p>
      </div>
    </main>
  );
}
