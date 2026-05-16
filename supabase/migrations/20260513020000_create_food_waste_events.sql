-- PRP-222 PR5 — Waste tracking V1
--
-- Logs every "I threw this away" event so /insights/waste can show
-- real totals (kg / € / by reason / by category) instead of the
-- hardcoded fakes the dashboard used to display.
--
-- product_id is nullable so an event survives the product being
-- deleted; product_name + category are captured at write time for the
-- same reason.

CREATE TABLE public.food_waste_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_type TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('expired', 'spoiled', 'leftover', 'other')),
  notes TEXT,
  estimated_cost_eur NUMERIC CHECK (estimated_cost_eur IS NULL OR estimated_cost_eur >= 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX food_waste_events_user_occurred_idx
  ON public.food_waste_events (user_id, occurred_at DESC);

ALTER TABLE public.food_waste_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "food_waste_events_select_own"
  ON public.food_waste_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "food_waste_events_insert_own"
  ON public.food_waste_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "food_waste_events_update_own"
  ON public.food_waste_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "food_waste_events_delete_own"
  ON public.food_waste_events FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.food_waste_events IS
  'PRP-222 PR5: per-user journal of discarded food items. Feeds /insights/waste.';
