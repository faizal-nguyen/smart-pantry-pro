-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_type TEXT NOT NULL,
  barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory table
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity DECIMAL NOT NULL DEFAULT 0,
  expiry_date DATE,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  instructions TEXT NOT NULL,
  prep_time INTEGER NOT NULL DEFAULT 0,
  servings INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipe_ingredients table
CREATE TABLE public.recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_needed DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shopping_list table
CREATE TABLE public.shopping_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity DECIMAL NOT NULL DEFAULT 0,
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products (shared data)
CREATE POLICY "Products are viewable by everyone" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create products" 
ON public.products 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update products" 
ON public.products 
FOR UPDATE 
USING (true);

-- RLS Policies for inventory (user-specific)
CREATE POLICY "Users can view their own inventory" 
ON public.inventory 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inventory" 
ON public.inventory 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory" 
ON public.inventory 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory" 
ON public.inventory 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for recipes (user-specific)
CREATE POLICY "Users can view their own recipes" 
ON public.recipes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recipes" 
ON public.recipes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes" 
ON public.recipes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes" 
ON public.recipes 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for recipe_ingredients (based on recipe ownership)
CREATE POLICY "Users can view ingredients of their own recipes" 
ON public.recipe_ingredients 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.recipes 
  WHERE recipes.id = recipe_ingredients.recipe_id 
  AND recipes.user_id = auth.uid()
));

CREATE POLICY "Users can create ingredients for their own recipes" 
ON public.recipe_ingredients 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.recipes 
  WHERE recipes.id = recipe_ingredients.recipe_id 
  AND recipes.user_id = auth.uid()
));

CREATE POLICY "Users can update ingredients of their own recipes" 
ON public.recipe_ingredients 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.recipes 
  WHERE recipes.id = recipe_ingredients.recipe_id 
  AND recipes.user_id = auth.uid()
));

CREATE POLICY "Users can delete ingredients of their own recipes" 
ON public.recipe_ingredients 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.recipes 
  WHERE recipes.id = recipe_ingredients.recipe_id 
  AND recipes.user_id = auth.uid()
));

-- RLS Policies for shopping_list (user-specific)
CREATE POLICY "Users can view their own shopping list" 
ON public.shopping_list 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shopping list items" 
ON public.shopping_list 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping list" 
ON public.shopping_list 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping list items" 
ON public.shopping_list 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
BEFORE UPDATE ON public.recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shopping_list_updated_at
BEFORE UPDATE ON public.shopping_list
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();