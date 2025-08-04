# ⚠️ MIGRATION DE BASE DE DONNÉES REQUISE

## Problème identifié
Les tables et colonnes suivantes sont manquantes dans votre base de données Supabase :

### Tables manquantes :
- `recipe_collections`
- `recipe_ingredients`

### Colonnes manquantes dans la table `recipes` :
- `cook_time` (INTEGER)
- `is_public` (BOOLEAN)
- Et plusieurs autres colonnes nécessaires

## Solution

### Option 1 : Appliquer la migration via Supabase Dashboard

1. Connectez-vous à votre [Dashboard Supabase](https://app.supabase.com)
2. Allez dans la section **SQL Editor**
3. Copiez et exécutez le contenu du fichier : `supabase/migrations/20250804125000_fix_missing_columns.sql`

### Option 2 : Utiliser Supabase CLI

Si vous avez Supabase CLI installé :

```bash
# Se connecter à Supabase
supabase login

# Lier votre projet (remplacez par votre project-ref)
supabase link --project-ref jwoxacnflphclslpqfzs

# Appliquer les migrations
supabase db push
```

### Option 3 : Exécution manuelle

Exécutez le script SQL suivant dans votre éditeur SQL Supabase :

```sql
-- Voir le fichier complet : supabase/migrations/20250804125000_fix_missing_columns.sql
```

## Vérification

Après avoir appliqué la migration, vérifiez que :
1. La table `recipe_collections` existe
2. La table `recipe_ingredients` existe
3. La colonne `cook_time` existe dans `recipes`
4. La colonne `is_public` existe dans `recipes`

## Note importante

Cette migration est **essentielle** pour que les fonctionnalités de recettes fonctionnent correctement. Sans elle, vous continuerez à avoir des erreurs 400/404 lors de l'ajout de recettes.