-- Create table for storing recipe price estimates
-- This table stores price estimates from various sources (Indian grocery, standard, etc.)

CREATE TABLE IF NOT EXISTS public.recipe_price_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_estimates JSONB NOT NULL,
  total_estimated_cost DECIMAL(10,2) NOT NULL,
  estimate_source VARCHAR(50) NOT NULL, -- 'indian-grocery-api', 'standard', etc.
  currency VARCHAR(3) DEFAULT 'EUR',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipe_price_estimates_recipe_id 
ON public.recipe_price_estimates(recipe_id);

-- Enable RLS
ALTER TABLE public.recipe_price_estimates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view price estimates for recipes they can see
CREATE POLICY "Users can view recipe price estimates" 
ON public.recipe_price_estimates 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.recipes r
    WHERE r.id = recipe_price_estimates.recipe_id
    AND (r.user_id = auth.uid() OR r.is_public = true)
  )
);

-- RLS Policy: Users can create price estimates for their own recipes
CREATE POLICY "Users can create price estimates for their recipes" 
ON public.recipe_price_estimates 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recipes r
    WHERE r.id = recipe_price_estimates.recipe_id
    AND r.user_id = auth.uid()
  )
);

-- RLS Policy: Service role can manage all price estimates
CREATE POLICY "Service role can manage all price estimates" 
ON public.recipe_price_estimates 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_recipe_price_estimates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER update_recipe_price_estimates_timestamp
BEFORE UPDATE ON public.recipe_price_estimates
FOR EACH ROW
EXECUTE FUNCTION update_recipe_price_estimates_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.recipe_price_estimates IS 'Stores price estimates for recipe ingredients from various sources';
COMMENT ON COLUMN public.recipe_price_estimates.estimate_source IS 'Source of the estimate: indian-grocery-api, standard, user-defined, etc.';