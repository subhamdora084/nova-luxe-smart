
REVOKE ALL ON FUNCTION public.get_guest_order(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_reward(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_order(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.prevent_reward_points_self_update() FROM PUBLIC;
