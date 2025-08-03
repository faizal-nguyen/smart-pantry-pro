-- Create table for recipe conversations history
CREATE TABLE public.recipe_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  inventory_snapshot TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recipe_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations (user-specific)
CREATE POLICY "Users can view their own conversations" 
ON public.recipe_conversations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.recipe_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
ON public.recipe_conversations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_recipe_conversations_user_id_created_at 
ON public.recipe_conversations (user_id, created_at DESC);