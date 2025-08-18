-- Smart Shopping List Enhancement (PRP-004)
-- This migration adds support for:
-- 1. Store layouts and sections
-- 2. Shared shopping lists with collaboration
-- 3. In-store mode configuration
-- 4. Shopping patterns and user behavior tracking
-- 5. Real-time collaboration features

-- Store Layouts table for different store configurations
CREATE TABLE IF NOT EXISTS store_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    mode TEXT NOT NULL CHECK (mode IN ('auto-organize', 'manual', 'by-store')) DEFAULT 'auto-organize',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store Sections for organizing shopping items
CREATE TABLE IF NOT EXISTS store_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID REFERENCES store_layouts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    color TEXT DEFAULT 'bg-gray-100 text-gray-700',
    section_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(layout_id, section_order)
);

-- Enhanced Shopping Lists table with collaboration support
CREATE TABLE IF NOT EXISTS shared_shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Ma liste de courses',
    description TEXT,
    store_layout_id UUID REFERENCES store_layouts(id) ON DELETE SET NULL,
    in_store_config JSONB DEFAULT '{
        "features": {
            "largeButtons": true,
            "voiceCheck": true,
            "hapticFeedback": true,
            "keepScreenOn": true,
            "progressBar": true,
            "smartReorder": true
        },
        "display": {
            "checkedItems": "strike-through",
            "showPrices": true,
            "runningTotal": true
        }
    }',
    is_shared BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping List Collaborators for sharing lists
CREATE TABLE IF NOT EXISTS shopping_list_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id UUID REFERENCES shared_shopping_lists(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permissions TEXT NOT NULL CHECK (permissions IN ('view', 'edit', 'admin')) DEFAULT 'edit',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shopping_list_id, shared_with_user_id)
);

-- Enhanced Shopping List Items with store sections and shopping patterns
ALTER TABLE shopping_list ADD COLUMN IF NOT EXISTS shared_list_id UUID REFERENCES shared_shopping_lists(id) ON DELETE CASCADE;
ALTER TABLE shopping_list ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE shopping_list ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ;
ALTER TABLE shopping_list ADD COLUMN IF NOT EXISTS shopping_pattern_order INTEGER;
ALTER TABLE shopping_list ADD COLUMN IF NOT EXISTS discount DECIMAL(5,2);

-- Shopping Patterns for smart reordering based on user behavior
CREATE TABLE IF NOT EXISTS shopping_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    store_section TEXT NOT NULL,
    typical_order INTEGER NOT NULL DEFAULT 1,
    frequency INTEGER DEFAULT 1,
    last_visited TIMESTAMPTZ DEFAULT NOW(),
    average_time_spent INTEGER DEFAULT 0, -- in seconds
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, store_section)
);

-- Live Shopping Sessions for real-time collaboration
CREATE TABLE IF NOT EXISTS live_shopping_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id UUID REFERENCES shared_shopping_lists(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_section TEXT,
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shopping_list_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_layouts_user_id ON store_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_store_layouts_is_default ON store_layouts(user_id, is_default);
CREATE INDEX IF NOT EXISTS idx_store_sections_layout_id ON store_sections(layout_id);
CREATE INDEX IF NOT EXISTS idx_store_sections_order ON store_sections(layout_id, section_order);

CREATE INDEX IF NOT EXISTS idx_shared_shopping_lists_user_id ON shared_shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_shopping_lists_shared ON shared_shopping_lists(is_shared);
CREATE INDEX IF NOT EXISTS idx_shopping_list_collaborators_shopping_list_id ON shopping_list_collaborators(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_collaborators_user_id ON shopping_list_collaborators(shared_with_user_id);

CREATE INDEX IF NOT EXISTS idx_shopping_list_shared_list_id ON shopping_list(shared_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_store_section ON shopping_list(store_section);
CREATE INDEX IF NOT EXISTS idx_shopping_list_is_purchased ON shopping_list(is_purchased);

CREATE INDEX IF NOT EXISTS idx_shopping_patterns_user_id ON shopping_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_patterns_section ON shopping_patterns(user_id, store_section);

CREATE INDEX IF NOT EXISTS idx_live_shopping_sessions_list_id ON live_shopping_sessions(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_live_shopping_sessions_active ON live_shopping_sessions(shopping_list_id, is_active);

-- RLS (Row Level Security) Policies
ALTER TABLE store_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_shopping_sessions ENABLE ROW LEVEL SECURITY;

-- Store Layouts policies
CREATE POLICY "Users can view their own store layouts" ON store_layouts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own store layouts" ON store_layouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own store layouts" ON store_layouts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own store layouts" ON store_layouts
    FOR DELETE USING (auth.uid() = user_id);

-- Store Sections policies
CREATE POLICY "Users can view sections of their store layouts" ON store_sections
    FOR SELECT USING (
        layout_id IN (
            SELECT id FROM store_layouts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert sections to their store layouts" ON store_sections
    FOR INSERT WITH CHECK (
        layout_id IN (
            SELECT id FROM store_layouts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update sections of their store layouts" ON store_sections
    FOR UPDATE USING (
        layout_id IN (
            SELECT id FROM store_layouts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete sections of their store layouts" ON store_sections
    FOR DELETE USING (
        layout_id IN (
            SELECT id FROM store_layouts WHERE user_id = auth.uid()
        )
    );

-- Shared Shopping Lists policies
CREATE POLICY "Users can view their own shopping lists and shared lists" ON shared_shopping_lists
    FOR SELECT USING (
        auth.uid() = user_id OR
        id IN (
            SELECT shopping_list_id FROM shopping_list_collaborators 
            WHERE shared_with_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own shopping lists" ON shared_shopping_lists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping lists or shared lists with edit permissions" ON shared_shopping_lists
    FOR UPDATE USING (
        auth.uid() = user_id OR
        id IN (
            SELECT shopping_list_id FROM shopping_list_collaborators 
            WHERE shared_with_user_id = auth.uid() 
            AND permissions IN ('edit', 'admin')
        )
    );

CREATE POLICY "Users can delete their own shopping lists" ON shared_shopping_lists
    FOR DELETE USING (auth.uid() = user_id);

-- Shopping List Collaborators policies
CREATE POLICY "Users can view collaborators of their lists or shared lists" ON shopping_list_collaborators
    FOR SELECT USING (
        shopping_list_id IN (
            SELECT id FROM shared_shopping_lists WHERE user_id = auth.uid()
        ) OR
        shared_with_user_id = auth.uid()
    );

CREATE POLICY "Users can add collaborators to their lists" ON shopping_list_collaborators
    FOR INSERT WITH CHECK (
        shopping_list_id IN (
            SELECT id FROM shared_shopping_lists WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove collaborators from their lists" ON shopping_list_collaborators
    FOR DELETE USING (
        shopping_list_id IN (
            SELECT id FROM shared_shopping_lists WHERE user_id = auth.uid()
        ) OR
        shared_with_user_id = auth.uid()
    );

-- Shopping Patterns policies
CREATE POLICY "Users can view their own shopping patterns" ON shopping_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping patterns" ON shopping_patterns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping patterns" ON shopping_patterns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping patterns" ON shopping_patterns
    FOR DELETE USING (auth.uid() = user_id);

-- Live Shopping Sessions policies
CREATE POLICY "Users can view live sessions of their lists or shared lists" ON live_shopping_sessions
    FOR SELECT USING (
        shopping_list_id IN (
            SELECT id FROM shared_shopping_lists WHERE user_id = auth.uid()
        ) OR
        shopping_list_id IN (
            SELECT shopping_list_id FROM shopping_list_collaborators 
            WHERE shared_with_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own live sessions" ON live_shopping_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own live sessions" ON live_shopping_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own live sessions" ON live_shopping_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Functions for triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_store_layouts_updated_at BEFORE UPDATE ON store_layouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_store_sections_updated_at BEFORE UPDATE ON store_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shared_shopping_lists_updated_at BEFORE UPDATE ON shared_shopping_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_patterns_updated_at BEFORE UPDATE ON shopping_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_live_shopping_sessions_updated_at BEFORE UPDATE ON live_shopping_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default store layout for existing users
INSERT INTO store_layouts (user_id, name, description, is_default)
SELECT 
    id,
    'Layout par défaut',
    'Organisation standard des rayons de magasin',
    true
FROM auth.users
WHERE id NOT IN (SELECT DISTINCT user_id FROM store_layouts WHERE user_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Insert default store sections for the default layouts
WITH default_sections(name, icon, color, section_order) AS (
    VALUES 
        ('Entrée', '🚪', 'bg-slate-100 text-slate-700', 1),
        ('Fruits & Légumes', '🥬', 'bg-green-100 text-green-700', 2),
        ('Boucherie/Poissonnerie', '🥩', 'bg-red-100 text-red-700', 3),
        ('Charcuterie/Fromagerie', '🧀', 'bg-orange-100 text-orange-700', 4),
        ('Épicerie salée', '🥫', 'bg-yellow-100 text-yellow-700', 5),
        ('Épicerie sucrée', '🍯', 'bg-amber-100 text-amber-700', 6),
        ('Surgelés', '🧊', 'bg-cyan-100 text-cyan-700', 7),
        ('Frais/Produits laitiers', '🥛', 'bg-blue-100 text-blue-700', 8),
        ('Boissons', '🧃', 'bg-purple-100 text-purple-700', 9),
        ('Hygiène/Beauté', '🧴', 'bg-pink-100 text-pink-700', 10),
        ('Maison/Entretien', '🧽', 'bg-indigo-100 text-indigo-700', 11),
        ('Caisses', '💳', 'bg-gray-100 text-gray-700', 12)
)
INSERT INTO store_sections (layout_id, name, icon, color, section_order)
SELECT 
    sl.id,
    ds.name,
    ds.icon,
    ds.color,
    ds.section_order
FROM store_layouts sl
CROSS JOIN default_sections ds
WHERE sl.is_default = true
  AND NOT EXISTS (
      SELECT 1 FROM store_sections ss 
      WHERE ss.layout_id = sl.id 
      AND ss.name = ds.name
  );

-- Function to automatically create default shopping list for users
CREATE OR REPLACE FUNCTION create_default_shopping_list_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default shared shopping list
    INSERT INTO shared_shopping_lists (user_id, name, description, store_layout_id)
    SELECT 
        NEW.id,
        'Ma liste de courses',
        'Liste de courses principale',
        sl.id
    FROM store_layouts sl
    WHERE sl.user_id = NEW.id AND sl.is_default = true
    LIMIT 1;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for new users (if not already exists)
DROP TRIGGER IF EXISTS create_default_shopping_list_trigger ON auth.users;
CREATE TRIGGER create_default_shopping_list_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_shopping_list_for_user();

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list;
ALTER PUBLICATION supabase_realtime ADD TABLE shared_shopping_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE live_shopping_sessions;