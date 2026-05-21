-- Restore EXECUTE on has_role for anon + authenticated.
-- RLS policies invoke has_role() as the requesting role, so both roles need EXECUTE.
-- The function is SECURITY DEFINER and only reads user_roles, so this is safe.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- redeem_reward must be callable by authenticated users (RPC entry point).
GRANT EXECUTE ON FUNCTION public.redeem_reward(text, integer) TO authenticated;

-- get_guest_order must remain callable by anon for guest order tracking.
GRANT EXECUTE ON FUNCTION public.get_guest_order(uuid, uuid) TO anon, authenticated;