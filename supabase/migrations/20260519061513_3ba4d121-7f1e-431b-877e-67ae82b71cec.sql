
revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.award_feedback_points() from anon, authenticated;
