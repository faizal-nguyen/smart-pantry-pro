-- Création de la table product_prices pour stocker les prix des fruits et légumes
CREATE TABLE IF NOT EXISTS public.product_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    price DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    location TEXT NOT NULL DEFAULT 'France',
    date DATE NOT NULL,
    source TEXT NOT NULL DEFAULT 'piloterr',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_product_prices_product_id ON public.product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_category ON public.product_prices(category);
CREATE INDEX IF NOT EXISTS idx_product_prices_location ON public.product_prices(location);
CREATE INDEX IF NOT EXISTS idx_product_prices_date ON public.product_prices(date);
CREATE INDEX IF NOT EXISTS idx_product_prices_name ON public.product_prices USING gin(to_tsvector('french', name));

-- Index composite pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_prices_unique 
ON public.product_prices(product_id, date, location);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_product_prices_updated_at 
    BEFORE UPDATE ON public.product_prices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - permettre la lecture à tous les utilisateurs authentifiés
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous les utilisateurs authentifiés
CREATE POLICY "Allow authenticated users to read product prices" ON public.product_prices
    FOR SELECT USING (auth.role() = 'authenticated');

-- Politique pour permettre l'insertion/mise à jour aux utilisateurs avec le rôle 'service_role'
CREATE POLICY "Allow service role to manage product prices" ON public.product_prices
    FOR ALL USING (auth.role() = 'service_role');

-- Commentaires sur la table
COMMENT ON TABLE public.product_prices IS 'Table pour stocker les prix des fruits et légumes récupérés via l''API Piloterr';
COMMENT ON COLUMN public.product_prices.product_id IS 'Identifiant unique du produit';
COMMENT ON COLUMN public.product_prices.name IS 'Nom du produit';
COMMENT ON COLUMN public.product_prices.category IS 'Catégorie du produit (fruits, légumes, etc.)';
COMMENT ON COLUMN public.product_prices.unit IS 'Unité de mesure (kg, pièce, etc.)';
COMMENT ON COLUMN public.product_prices.price IS 'Prix du produit';
COMMENT ON COLUMN public.product_prices.currency IS 'Devise du prix';
COMMENT ON COLUMN public.product_prices.location IS 'Localisation géographique du prix';
COMMENT ON COLUMN public.product_prices.date IS 'Date du prix';
COMMENT ON COLUMN public.product_prices.source IS 'Source des données (piloterr, etc.)';
