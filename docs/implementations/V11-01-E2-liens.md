# V11-01 — « Je l'ai déjà » : relier un ingrédient à un produit du stock

> Date : 24 novembre 2026.
> PRP : [V11-01](../../PRP/V11/PRP-V11-01-Boucle-Menus-Courses.md), sections 4 (courses de la semaine) et 8 (cas limites).
> Suite du correctif « produit proche » ([V11-01 E2](V11-01-E2.md), section 8), qui ne compte jamais un produit seulement proche.
> Migration : `supabase/migrations/20261125090000_v11_ingredient_product_links.sql`, additive.

## 1. Pourquoi

Le 24 novembre, la revue « Courses de la semaine » proposait d'acheter des produits déjà en stock sous un autre nom. Aucune règle de nom ne peut deviner certaines correspondances :
- les équivalences de cuisine, comme une huile neutre et une huile de tournesol ;
- les noms de produits en langue étrangère, comme un lait de coco étiqueté en anglais.

L'utilisateur relie donc l'ingrédient une fois, depuis la revue. Le lien vaut ensuite partout.

## 2. Base

- **Table `public.ingredient_product_links`**.
  - Un produit par compte et par nom d'ingrédient normalisé. La clé primaire est `(user_id, ingredient_key)` ; les références vers `auth.users` et `products` sont en cascade.
  - Un déclencheur normalise la clé avec `public.stock_normalize_name` et garde le propriétaire lors d'une mise à jour. La longueur est bornée de 1 à 120 caractères.
  - RLS par propriétaire pour `authenticated`, écriture directe comme pour une préférence ; aucun accès pour `anon`.
- **Révision.** `private.invalidate_stock_caches()` s'applique à la table. Un lien augmente la révision du stock du compte et vide ses caches. Une confirmation de courses calculée avant le lien est donc refusée (`STOCK_CHANGED`), puis recalculée.
- **`public.resolve_stock_recipe`.**
  - Un ingrédient sans produit reçoit celui que le compte a relié à son nom. Un ingrédient qui porte déjà un produit le garde.
  - Les liens appliqués entrent dans `version`. Une recette sans lien garde exactement sa version : aucune session de cuisine en cours n'est invalidée au déploiement.
  - Tous les calculs lisent les recettes par cette fonction : aperçu et déduction de la cuisson, ajout des manquants, base du menu et règle C, aperçu de la semaine.
- **Export et suppression.**
  - `export_user_data` liste la table.
  - La suppression de compte la couvre par `private.delete_user_rows`, qui efface toute table publique portant `user_id`, et par la cascade sur `auth.users`.

## 3. Client

- **Service.** [ingredientLinks.ts](../../src/services/ingredientLinks.ts) enregistre ou retire un lien pour le compte connecté, sous le nom normalisé. Il relit ensuite l'aperçu de la semaine et l'évaluation des recettes. Ses messages de refus ne reprennent jamais le texte brut de la base.
- **Produits du stock.** [useStockProducts](../../src/hooks/useStockProducts.ts) lit les produits du stock, regroupés, seulement quand le dialogue est ouvert.
- **Dialogue.** [IngredientLinkDialog](../../src/components/shopping/week/IngredientLinkDialog.tsx) liste les produits du stock, les proches (`similar_lots`) d'abord, avec une recherche qui ignore les accents et la casse.
- **Revue.** Le bouton « Je l'ai déjà » apparaît :
  - sur les lignes à ajouter, à vérifier et à ajouter à la main dont l'ingrédient n'a pas de produit ;
  - désactivé pendant qu'une confirmation est à vérifier.

  Après un lien, une notification nomme le lien et propose « Retirer ce lien ».

## 4. Vérifications exécutées

- **Base**, `npm run test:ingredient:links:db` sur un Postgres local jetable : 70 groupes passent, dont toutes les suites antérieures rejouées sur la fonction remplacée. Les 6 nouveaux groupes vérifient que :
  - un lien est privé, normalisé et borné, et augmente la révision ;
  - un lien ne s'applique qu'à un ingrédient sans produit, et seulement pour son compte ; la version ne change qu'avec un lien ;
  - la cuisson déduit le produit relié, et seulement tant qu'il l'est ;
  - la règle C borne un ajout par le besoin du produit relié ;
  - la table figure dans l'export, et la suppression de compte la couvre ;
  - un nom écrit avec une espace insécable est retrouvé tel que la recette l'écrit.
- **Client.** Les tests du service, du dialogue, de la lecture du stock et de la revue passent. `npm run test:v10` : 468 tests client et 743 tests API passent.
- **Contrôles.** `npm run typecheck:app` : aucune nouvelle erreur. `npm run lint:ci` : 0 erreur. `npm run build` et `npm run api:build:ts` passent.
- **Banc visuel** à 375 et 1440 px : ligne, dialogue au clavier, lien, puis retrait. Aucun débordement, aucune erreur de page.

## 5. Relecture

**Base** (`database-reviewer`). Aucun défaut :
- les politiques, les déclencheurs, l'ordre des verrous face à `menu_add_missing`, la réécriture de `resolve_stock_recipe` et l'idempotence sont vérifiés ;
- la politique reprend désormais `(SELECT auth.uid())`, comme le reste du dépôt ;
- le nombre de liens par compte n'est pas plafonné (section 6).

**Client** (`typescript-reviewer`). Constats revérifiés, puis corrigés avec un test :

| Constat | Correctif |
| --- | --- |
| La base garde l'espace insécable que l'application change en espace : une clé calculée côté client pouvait ne jamais être retrouvée, et son retrait supprimer zéro ligne en affichant « Lien retiré » (vérifié sur PostgreSQL) | Le nom est envoyé tel que la recette l'écrit, et la base le normalise avec la fonction de la recherche. La clé enregistrée est relue et sert au retrait, qui signale une ligne introuvable |
| Un second lien remplaçait la notification du premier, qui ne pouvait plus être retiré | Une notification par ingrédient, chacune avec son « Retirer ce lien » |
| La recherche et l'erreur du dialogue restaient d'une ouverture à l'autre | Dialogue réinitialisé à chaque ligne |
| Liste du stock gardée 30 s et lue sans pagination ; message du code `23503` inexact | Relue à chaque ouverture, page par page jusqu'au décompte ; message corrigé |
| Focus perdu quand la ligne disparaît après le lien | Le focus va à la notification, vérifié dans un navigateur |

## 6. Limites

- Un seul produit par nom d'ingrédient. Un nouveau lien remplace l'ancien.
- Le lien ne s'applique qu'aux ingrédients sans produit. Un ingrédient de recette du catalogue qui porte déjà un produit garde le sien.
- Il n'y a pas d'écran de gestion des liens. Le retrait n'est proposé qu'aussitôt après le lien ; ensuite, un nouveau lien remplace l'ancien.
- Le nombre de liens par compte n'est pas plafonné. La recherche passe par la clé primaire ; seul le stockage grandit.

## 7. Production

1. **Avant toute application**, contrôle en lecture seule : l'empreinte de `resolve_stock_recipe` doit être celle du corps remplacé, `b51c552ae4a5a5ed8687b10d2d344633`, et la table ne doit pas exister.
2. **Appliquer la migration seule**, puis la marquer appliquée :
   ```bash
   supabase db query --remote --yes -f <dépôt>/supabase/migrations/20261125090000_v11_ingredient_product_links.sql
   supabase migration repair --status applied 20261125090000 --remote=jwoxacnflphclslpqfzs --workdir <dépôt> --yes
   ```
   Ne pas utiliser `supabase db push`.
3. **Contrôler en lecture seule** :
   - empreintes `resolve_stock_recipe` `891e076a6a974fcbf959b1734e19b758` et `export_user_data` `d6a87cee7b5296678df8132f6f0801b5` ;
   - RLS active, politique et déclencheurs présents ;
   - `authenticated` a les quatre droits, `anon` aucun ;
   - aucun lien enregistré.
4. **Fusionner.** L'interface part au déploiement Vercel.

**Compatibilité.** Sans lien, `resolve_stock_recipe` renvoie exactement ce qu'elle renvoyait. L'interface déployée avant la fusion n'écrit aucun lien.

**Retour arrière.** Revenir sur la PR retire le bouton. La migration peut rester : sans lien, rien ne change.
