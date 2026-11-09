-- Qualitative quantity and opening information belongs to an owner's lot, not the shared product.
-- Nullable for compatibility with existing rows and clients. No new grants or policies.
BEGIN;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_notes_length;
ALTER TABLE public.inventory ADD CONSTRAINT inventory_notes_length CHECK (notes IS NULL OR char_length(notes) <= 4000);
COMMENT ON COLUMN public.inventory.notes IS 'Owner-supplied lot notes: approximate remaining level, packaging and opening/storage checks. Not a measured quantity or freshness certification.';
COMMIT;
NOTIFY pgrst, 'reload schema';
