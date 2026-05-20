
-- 1. Guest ordering: drop strict "own" policies and replace with guest-friendly ones
DROP POLICY IF EXISTS orders_insert_own ON public.orders;
DROP POLICY IF EXISTS orders_select_own ON public.orders;
DROP POLICY IF EXISTS order_items_insert_own ON public.order_items;
DROP POLICY IF EXISTS order_items_select_own ON public.order_items;

CREATE POLICY orders_insert_any ON public.orders
  FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY orders_select_own_or_guest ON public.orders
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY order_items_insert_any ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id IS NULL OR o.user_id = auth.uid())
    )
  );

CREATE POLICY order_items_select_own_or_guest ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id IS NULL
             OR o.user_id = auth.uid()
             OR public.has_role(auth.uid(), 'admin'::app_role)
             OR public.has_role(auth.uid(), 'kitchen'::app_role))
    )
  );

-- 2. Award 10 points when an order is marked completed (signed-in customers only)
CREATE OR REPLACE FUNCTION public.award_order_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
       SET reward_points = reward_points + 10
     WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_order_points ON public.orders;
CREATE TRIGGER trg_award_order_points
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.award_order_points();

-- 3. Make sure feedback trigger is attached
DROP TRIGGER IF EXISTS trg_award_feedback_points ON public.feedback;
CREATE TRIGGER trg_award_feedback_points
AFTER INSERT ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.award_feedback_points();

-- 4. Fix menu images so each dish matches its name
UPDATE public.menu_items SET image_url = 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800' WHERE name = 'Butter Chicken';
UPDATE public.menu_items SET image_url = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800' WHERE name = 'Lobster Thermidor';
UPDATE public.menu_items SET image_url = 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800' WHERE name = 'Gulab Jamun Cheesecake';
UPDATE public.menu_items SET image_url = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800' WHERE name = 'Nova Feast for Two';
UPDATE public.menu_items SET image_url = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800' WHERE name = 'Cold Brew Coffee';
UPDATE public.menu_items SET image_url = 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800' WHERE name = 'Butter Chicken';
