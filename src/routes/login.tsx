import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: Login,
  validateSearch: (s): { redirect?: string } => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
  head: () => ({ meta: [{ title: "Sign in — Nova Luxe" }] }),
});

function Login() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const go = () => navigate({ to: search.redirect ?? "/menu" });

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    go();
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created");
    go();
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Google sign-in failed"); return; }
    if (result.redirected) return;
    go();
  };

  return (
    <main className="container mx-auto px-4 py-16 max-w-md">
      <div className="rounded-3xl border bg-card p-8 shadow-card">
        <Link to="/" className="font-display text-3xl font-bold block text-center">Nova Luxe</Link>
        <p className="text-center text-sm text-muted-foreground mt-1">Sign in to order & earn rewards</p>

        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4 mt-4">
              <Field id="email" label="Email" icon={Mail} type="email" value={email} onChange={setEmail} />
              <Field id="password" label="Password" icon={Lock} type="password" value={password} onChange={setPassword} />
              <Button type="submit" className="w-full h-11" disabled={loading}>Sign in</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4 mt-4">
              <Field id="name" label="Full name" icon={User} type="text" value={name} onChange={setName} />
              <Field id="email2" label="Email" icon={Mail} type="email" value={email} onChange={setEmail} />
              <Field id="password2" label="Password (min 8 chars)" icon={Lock} type="password" value={password} onChange={setPassword} />
              <Button type="submit" className="w-full h-11" disabled={loading}>Create account</Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-6"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center"><span className="bg-card px-2 text-xs text-muted-foreground">OR</span></div></div>
        <Button type="button" variant="outline" className="w-full h-11" onClick={google}>
          <svg className="size-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
          Continue with Google
        </Button>
      </div>
    </main>
  );
}

function Field({ id, label, icon: Icon, type, value, onChange }: { id: string; label: string; icon: typeof Mail; type: string; value: string; onChange: (v: string) => void; }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="relative mt-1">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input id={id} type={type} required value={value} onChange={(e) => onChange(e.target.value)} className="pl-9 h-11" />
      </div>
    </div>
  );
}
