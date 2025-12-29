-- Vérification et rapport sur l'état du système contextuel

DO $$
DECLARE
    table_exists BOOLEAN;
    table_name TEXT;
    missing_tables TEXT[] := '{}';
    existing_tables TEXT[] := '{}';
BEGIN
    -- Liste des tables requises pour le système contextuel
    FOR table_name IN VALUES 
        ('weekly_meal_plans'),
        ('contextual_planning_data'),
        ('context_rules'),
        ('contextual_user_preferences'),
        ('context_cache'),
        ('context_adaptations_log'),
        ('seasonal_products'),
        ('store_partnerships'),
        ('active_promotions'),
        ('families'),
        ('family_members'),
        ('family_conflict_resolutions')
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) INTO table_exists;
        
        IF table_exists THEN
            existing_tables := array_append(existing_tables, table_name);
        ELSE
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    -- Rapport
    RAISE NOTICE '=== RAPPORT SYSTÈME CONTEXTUEL ===';
    RAISE NOTICE 'Tables existantes: %', array_length(existing_tables, 1);
    RAISE NOTICE 'Tables manquantes: %', array_length(missing_tables, 1);
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE 'ATTENTION: Tables manquantes: %', array_to_string(missing_tables, ', ');
        RAISE NOTICE 'Veuillez exécuter les migrations principales avant de continuer.';
    ELSE
        RAISE NOTICE 'SUCCÈS: Toutes les tables du système contextuel sont présentes!';
        
        -- Vérifier quelques données de base
        DECLARE
            product_count INTEGER;
            rule_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO product_count FROM public.seasonal_products WHERE is_active = true;
            SELECT COUNT(*) INTO rule_count FROM public.context_rules WHERE active = true;
            
            RAISE NOTICE 'Produits saisonniers actifs: %', product_count;
            RAISE NOTICE 'Règles contextuelles actives: %', rule_count;
            
            IF product_count = 0 THEN
                RAISE NOTICE 'AVERTISSEMENT: Aucun produit saisonnier trouvé. Exécutez la migration de seed data.';
            END IF;
            
            IF rule_count = 0 THEN
                RAISE NOTICE 'AVERTISSEMENT: Aucune règle contextuelle trouvée. Exécutez la migration de seed data.';
            END IF;
        END;
    END IF;
    
    RAISE NOTICE '=== FIN DU RAPPORT ===';
END $$;