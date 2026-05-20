
REVOKE EXECUTE ON FUNCTION public.award_order_points() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.award_feedback_points() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
