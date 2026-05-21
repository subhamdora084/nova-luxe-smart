import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/rewards")({
  component: Rewards,
  head: () => ({ meta: [{ title: "Rewards — Nova Luxe" }] }),
});

const MILESTONES = [
  { pts: 100, name: "Free Soft Drink" },
  { pts: 250, name: "10% Discount Coupon" },
  { pts: 500, name: "Free Dessert" },
  { pts: 1000, name: "Premium Combo Meal" },
];

function Rewards() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["redemptions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("reward_redemptions").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const redeem = async (m: typeof MILESTONES[number]) => {
    if (!profile || profile.reward_points < m.pts) { toast.error("Not enough points yet"); return; }
    const { error } = await supabase.rpc("redeem_reward", { _reward_name: m.name, _points: m.pts });
    if (error) { toast.error(error.message); return; }
    toast.success(`Redeemed: ${m.name}`);
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["redemptions"] });
  };

  if (!user) return (
    <main className="container mx-auto px-4 py-16 text-center max-w-md">
      <Gift className="size-12 mx-auto text-primary" />
      <h1 className="font-display text-3xl font-bold mt-4">Nova Rewards</h1>
      <p className="text-muted-foreground mt-2">Sign in to track points and redeem rewards.</p>
      <Link to="/login"><Button className="mt-6">Sign in</Button></Link>
    </main>
  );

  if (isLoading || !profile) return <main className="container py-12 text-center"><Loader2 className="animate-spin size-6 mx-auto" /></main>;

  const points = profile.reward_points ?? 0;
  const next = MILESTONES.find((m) => m.pts > points) ?? MILESTONES[MILESTONES.length - 1];
  const prevPts = MILESTONES.filter((m) => m.pts <= points).pop()?.pts ?? 0;
  const progress = Math.min(100, ((points - prevPts) / (next.pts - prevPts)) * 100);

  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="rounded-3xl bg-gradient-gold p-8 text-gold-foreground shadow-warm">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest"><Star className="size-4 fill-current" /> Nova Rewards</div>
        <div className="font-display text-6xl font-bold mt-2">{points}</div>
        <div className="text-sm opacity-80">points available</div>
        <div className="mt-6">
          <div className="flex justify-between text-xs"><span>Next: {next.name}</span><span>{points}/{next.pts}</span></div>
          <Progress value={progress} className="mt-1 bg-foreground/20" />
        </div>
      </div>

      <h2 className="font-display text-2xl font-bold mt-10">Redeem</h2>
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        {MILESTONES.map((m) => {
          const can = points >= m.pts;
          return (
            <div key={m.pts} className="rounded-2xl border bg-card p-5 shadow-card flex items-center justify-between">
              <div>
                <div className="font-semibold">{m.name}</div>
                <div className="text-sm text-muted-foreground">{m.pts} points</div>
              </div>
              <Button size="sm" disabled={!can} onClick={() => redeem(m)}>{can ? "Redeem" : "Locked"}</Button>
            </div>
          );
        })}
      </div>

      <h2 className="font-display text-2xl font-bold mt-10">History</h2>
      {history && history.length > 0 ? (
        <div className="mt-3 space-y-2">
          {history.map((r: any) => (
            <div key={r.id} className="flex justify-between text-sm rounded-lg border bg-card p-3">
              <span>{r.reward_name}</span>
              <span className="text-muted-foreground">−{r.points_spent} pts · {new Date(r.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted-foreground mt-3">No redemptions yet.</p>}
    </main>
  );
}
