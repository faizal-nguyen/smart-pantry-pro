# MCP Supabase Setup

## Configuration

Le MCP Supabase est configuré pour ce projet avec accès complet en lecture/écriture.

### Détails de connexion
- **Project Reference**: `jwoxacnflphclslpqfzs`
- **Access Token**: `sbp_49672db8ee195476f97bcd0416574bd97b319deb`
- **Mode**: Read/Write (accès complet)

## Utilisation dans Claude Desktop

1. **Redémarrez Claude Desktop** après la configuration
2. Le MCP sera automatiquement chargé
3. Vous pouvez exécuter des requêtes SQL directement

## Utilisation dans Cursor

1. Le fichier `.cursorrules` contient la configuration
2. Cursor peut accéder directement à la base de données
3. Utilisez les commandes SQL pour interagir avec Supabase

## Commandes NPM

```bash
# Tester la connexion MCP
npm run mcp:test

# Lancer le serveur MCP manuellement
npm run mcp:supabase
```

## Exemples de requêtes

### Corriger les prix incorrects
```sql
-- Voir les prix aberrants
SELECT * FROM shopping_list WHERE estimated_price > 100;

-- Corriger les feuilles de curry
UPDATE shopping_list SET estimated_price = 0.01 
WHERE product_id IN (
  SELECT id FROM products 
  WHERE name ILIKE '%curry%' AND name ILIKE '%feuille%'
);

-- Corriger les prix de viande
UPDATE shopping_list SET estimated_price = 0.025 
WHERE product_id IN (
  SELECT id FROM products WHERE name ILIKE '%flank steak%'
) AND estimated_price > 100;
```

### Appliquer les migrations
```sql
-- Exécuter la migration de correction des prix
-- Copier/coller le contenu de:
-- supabase/migrations/20250105000007_fix_curry_leaves_prices.sql
```

## Sécurité

- Les credentials sont stockés localement
- Ne pas commiter les fichiers `.mcp/config.json` ou `.cursorrules` avec les tokens
- Utiliser des variables d'environnement en production