-- Fix: Correct excessive prices for curry leaves and water in shopping list
-- This migration updates incorrect prices (400€ for curry leaves, 288€ for water) to realistic values

-- Update shopping list items with curry leaves that have unrealistic prices
UPDATE public.shopping_list sl
SET estimated_price = 0.01 -- 1 centime per leaf is realistic
WHERE sl.product_id IN (
  SELECT p.id 
  FROM public.products p 
  WHERE LOWER(p.name) LIKE '%curry%' 
    AND (LOWER(p.name) LIKE '%feuille%' OR LOWER(p.name) LIKE '%leaf%' OR LOWER(p.name) LIKE '%leaves%')
)
AND sl.estimated_price > 10; -- Any curry leaves priced above 10€ is clearly wrong

-- Also update for English variations
UPDATE public.shopping_list sl
SET estimated_price = 0.01
WHERE sl.product_id IN (
  SELECT p.id 
  FROM public.products p 
  WHERE LOWER(p.name) IN ('curry leaves', 'feuilles de curry', 'curry leaf', 'feuille de curry')
)
AND sl.estimated_price > 10;

-- Update recipe inventory cache if it exists
UPDATE public.recipe_inventory_cache
SET analysis_result = jsonb_set(
  analysis_result,
  '{estimatedCost}',
  to_jsonb(
    GREATEST(
      0,
      COALESCE((analysis_result->>'estimatedCost')::numeric, 0) - 399.99
    )
  )
)
WHERE analysis_result::text LIKE '%curry%'
  AND analysis_result::text LIKE '%400%';

-- Update water prices that are incorrect
UPDATE public.shopping_list sl
SET estimated_price = 0.001 -- 0.001€ per unit for water
WHERE sl.product_id IN (
  SELECT p.id 
  FROM public.products p 
  WHERE LOWER(p.name) IN ('eau', 'water')
    OR LOWER(p.name) LIKE '%eau%'
)
AND sl.estimated_price > 1; -- Water should never cost more than 1€ per unit

-- Update meat prices that are incorrect (flank steak at 11560€)
UPDATE public.shopping_list sl
SET estimated_price = 
  CASE 
    WHEN p.name ILIKE '%flank%' THEN 0.025 -- 25€/kg = 0.025€/g
    WHEN p.name ILIKE '%filet%' THEN 0.035 -- 35€/kg pour filet
    WHEN p.name ILIKE '%entrecôte%' OR p.name ILIKE '%ribeye%' THEN 0.030 -- 30€/kg
    WHEN p.name ILIKE '%bœuf%' OR p.name ILIKE '%boeuf%' OR p.name ILIKE '%beef%' THEN 0.020 -- 20€/kg
    WHEN p.name ILIKE '%porc%' OR p.name ILIKE '%pork%' THEN 0.012 -- 12€/kg
    WHEN p.name ILIKE '%poulet%' OR p.name ILIKE '%chicken%' THEN 0.008 -- 8€/kg
    WHEN p.name ILIKE '%agneau%' OR p.name ILIKE '%lamb%' THEN 0.025 -- 25€/kg
    ELSE 0.020 -- Prix par défaut pour viande: 20€/kg
  END
FROM public.products p
WHERE sl.product_id = p.id
  AND p.unit_type = 'g'
  AND (p.name ILIKE '%steak%' OR p.name ILIKE '%viande%' OR p.name ILIKE '%meat%' 
       OR p.name ILIKE '%bœuf%' OR p.name ILIKE '%boeuf%' OR p.name ILIKE '%beef%'
       OR p.name ILIKE '%porc%' OR p.name ILIKE '%pork%'
       OR p.name ILIKE '%poulet%' OR p.name ILIKE '%chicken%'
       OR p.name ILIKE '%agneau%' OR p.name ILIKE '%lamb%')
  AND sl.estimated_price > 100; -- Plus de 100€/g est clairement une erreur

-- Add a comment for documentation
COMMENT ON COLUMN public.shopping_list.estimated_price IS 'Estimated price per unit. For leaves (curry, bay, etc.), this should be in cents, not euros. For water, price should be around 0.001€ per unit. For meat in grams, price should be the per-kg price divided by 1000.';