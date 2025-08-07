-- Fix: Create storage policies for recipe-images bucket
-- This migration ensures proper access control for image uploads

-- Ensure the recipe-images bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO UPDATE 
SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Give users access to upload recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to view recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to delete their recipe images" ON storage.objects;

-- Create storage policies for recipe-images
-- Policy 1: Allow authenticated users to upload images
CREATE POLICY "Give users access to upload recipe images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'recipe-images' 
  AND auth.uid() IS NOT NULL
);

-- Policy 2: Allow everyone to view recipe images (public bucket)
CREATE POLICY "Give users access to view recipe images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'recipe-images');

-- Policy 3: Allow users to delete their own uploaded images
CREATE POLICY "Give users access to delete their recipe images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'recipe-images' 
  AND auth.uid() IS NOT NULL
);

-- Policy 4: Allow users to update their own images
CREATE POLICY "Give users access to update their recipe images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'recipe-images' 
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'recipe-images' 
  AND auth.uid() IS NOT NULL
);

-- Ensure the product-images bucket has similar policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Give users access to upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to view product images" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to delete their product images" ON storage.objects;

-- Create storage policies for product-images
-- Policy 1: Allow authenticated users to upload images
CREATE POLICY "Give users access to upload product images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
);

-- Policy 2: Allow everyone to view product images (public bucket)
CREATE POLICY "Give users access to view product images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- Policy 3: Allow users to delete their own uploaded images
CREATE POLICY "Give users access to delete their product images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
);

-- Policy 4: Allow users to update their own images
CREATE POLICY "Give users access to update their product images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
)
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
);

-- Comments for documentation
COMMENT ON POLICY "Give users access to upload recipe images" ON storage.objects IS 'Allows authenticated users to upload recipe images';
COMMENT ON POLICY "Give users access to view recipe images" ON storage.objects IS 'Allows public viewing of recipe images';
COMMENT ON POLICY "Give users access to upload product images" ON storage.objects IS 'Allows authenticated users to upload product images';
COMMENT ON POLICY "Give users access to view product images" ON storage.objects IS 'Allows public viewing of product images';