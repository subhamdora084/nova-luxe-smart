import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/feedback")({
  component: Feedback,
  validateSearch: (s): { orderId?: string } => ({ orderId: typeof s.orderId === "string" ? s.orderId : undefined }),
  head: () => ({ meta: [{ title: "Feedback — Nova Luxe" }] }),
});

function Feedback() {
  const { orderId } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [food, setFood] = useState(0);
  const [service, setService] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    if (!food || !service) { toast.error("Please rate both food and service"); return; }
    setLoading(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id, order_id: orderId ?? null, food_rating: food, service_rating: service, comment: comment || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks! +20 Nova points awarded 🎉");
    navigate({ to: "/rewards" });
  };

  return (
    <main className="container mx-auto px-4 py-10 max-w-lg">
      <h1 className="font-display text-4xl font-bold">Share your experience</h1>
      <p className="text-muted-foreground mt-2">Rate your meal and earn 20 Nova points instantly.</p>

      <div className="rounded-2xl border bg-card p-6 mt-6 shadow-card space-y-5">
        <Rating label="Food quality" value={food} onChange={setFood} />
        <Rating label="Service" value={service} onChange={setService} />
        <div>
          <label className="text-sm font-semibold">Comments (optional)</label>
          <Textarea className="mt-2" placeholder="Tell us more…" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
        </div>
        <Button className="w-full h-12" disabled={loading} onClick={submit}>Submit & earn 20 points</Button>
      </div>
    </main>
  );
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} stars`}>
            <Star className={`size-8 transition ${n <= value ? "fill-gold text-gold" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
