import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
  const { user, roles } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
  });

  if (!user) return (
    <main className="container py-16 text-center"><p>Please <Link to="/login" className="text-primary underline">sign in</Link>.</p></main>
  );
  if (isLoading) return <main className="container py-12 text-center"><Loader2 className="animate-spin size-6 mx-auto" /></main>;

  return (
    <main className="container mx-auto px-4 py-10 max-w-lg">
      <h1 className="font-display text-4xl font-bold">My Profile</h1>
      <div className="rounded-2xl border bg-card p-6 mt-6 shadow-card space-y-3">
        <Row label="Name" value={profile?.full_name ?? "—"} />
        <Row label="Email" value={user.email ?? "—"} />
        <Row label="Phone" value={profile?.phone ?? "—"} />
        <Row label="Reward points" value={`${profile?.reward_points ?? 0} pts`} />
        <Row label="Roles" value={roles.join(", ") || "customer"} />
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm border-b last:border-0 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
