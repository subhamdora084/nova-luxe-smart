
-- 1. Guest order token
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_token uuid NOT NULL DEFAULT gen_random_uuid();

-- 2. Tighten SELECT policies (drop guest-public access)
DROP POLICY IF EXISTS orders_select_own_or_guest ON public.orders;
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS order_items_select_own_or_guest ON public.order_items;
CREATE POLICY order_items_select_own ON public.order_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.uid() IS NOT NULL AND auth.uid() = o.user_id)
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'kitchen'::app_role)
      )
  ));

-- 3. Secure guest order fetch via token
CREATE OR REPLACE FUNCTION public.get_guest_order(_order_id uuid, _token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'order', to_jsonb(o.*) - 'guest_token',
    'items', COALESCE(
      (SELECT jsonb_agg(to_jsonb(oi.*)) FROM public.order_items oi WHERE oi.order_id = o.id),
      '[]'::jsonb
    )
  )
  INTO result
  FROM public.orders o
  WHERE o.id = _order_id
    AND o.guest_token = _token
    AND o.user_id IS NULL;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_order(uuid, uuid) TO anon, authenticated;

-- 4. Prevent users from updating their own reward_points
CREATE OR REPLACE FUNCTION public.prevent_reward_points_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reward_points IS DISTINCT FROM OLD.reward_points
     AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.reward_points := OLD.reward_points;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_reward_points_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_reward_points_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_reward_points_self_update();

-- 5. Atomic reward redemption
CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_name text, _points integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  current_pts integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _points IS NULL OR _points <= 0 THEN
    RAISE EXCEPTION 'Invalid points amount';
  END IF;
  IF _reward_name IS NULL OR length(trim(_reward_name)) = 0 OR length(_reward_name) > 200 THEN
    RAISE EXCEPTION 'Invalid reward name';
  END IF;

  SELECT reward_points INTO current_pts
    FROM public.profiles
    WHERE id = uid
    FOR UPDATE;

  IF current_pts IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF current_pts < _points THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  -- Bypass self-update trigger by acting as definer/admin context via direct UPDATE,
  -- but our trigger uses has_role(auth.uid(),'admin'). Since auth.uid() is the user here,
  -- the trigger would block the deduction. Disable trigger semantics by updating via
  -- a separate function path: temporarily set a session variable the trigger respects.
  -- Simpler: use ALTER TABLE ... DISABLE TRIGGER not possible per-statement; instead,
  -- update via a privileged path by deleting+inserting? No — just adjust trigger to
  -- allow when current_setting('app.allow_points_update', true) = 'on'.
  PERFORM set_config('app.allow_points_update', 'on', true);
  UPDATE public.profiles
     SET reward_points = reward_points - _points
   WHERE id = uid;
  PERFORM set_config('app.allow_points_update', 'off', true);

  INSERT INTO public.reward_redemptions (user_id, reward_name, points_spent)
  VALUES (uid, _reward_name, _points);

  RETURN jsonb_build_object('success', true, 'remaining', current_pts - _points);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_reward(text, integer) TO authenticated;

-- Update self-update trigger to allow privileged context
CREATE OR REPLACE FUNCTION public.prevent_reward_points_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reward_points IS DISTINCT FROM OLD.reward_points
     AND NOT has_role(auth.uid(), 'admin'::app_role)
     AND COALESCE(current_setting('app.allow_points_update', true), 'off') <> 'on' THEN
    NEW.reward_points := OLD.reward_points;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Explicit privilege-escalation guards on user_roles
CREATE POLICY user_roles_insert_admin_only ON public.user_roles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY user_roles_update_admin_only ON public.user_roles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY user_roles_delete_admin_only ON public.user_roles
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Remove orders/order_items from realtime publication (use polling instead)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='orders') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='order_items') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.order_items;
  END IF;
END $$;
