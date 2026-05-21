
-- 1) Lock down reward_redemptions inserts to definer RPC only
DROP POLICY IF EXISTS redemptions_insert_own ON public.reward_redemptions;
-- (No INSERT policy => direct inserts blocked; redeem_reward is SECURITY DEFINER and bypasses RLS)

-- 2) Restrict profile self-updates: revert changes to reward_points unless allowed
CREATE OR REPLACE FUNCTION public.prevent_reward_points_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.reward_points IS DISTINCT FROM OLD.reward_points
     AND NOT has_role(auth.uid(), 'admin'::app_role)
     AND COALESCE(current_setting('app.allow_points_update', true), 'off') <> 'on' THEN
    NEW.reward_points := OLD.reward_points;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_reward_points_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_reward_points_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_reward_points_self_update();

-- 3) Revoke broad EXECUTE on internal SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.prevent_reward_points_self_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_feedback_points() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_order_points() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- Keep callable: get_guest_order (anon + authenticated), redeem_reward (authenticated only)
REVOKE ALL ON FUNCTION public.redeem_reward(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward(text, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_guest_order(uuid, uuid) TO anon, authenticated;

-- has_role remains usable from RLS policies (SECURITY DEFINER runs as owner); allow authenticated to call when referenced via policies
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
