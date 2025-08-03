-- Add missing columns to shopping_list table
ALTER TABLE public.shopping_list 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS estimated_price DECIMAL,
ADD COLUMN IF NOT EXISTS store_section TEXT;