# PRP-234 — Today Kitchen And Menus

> Statut : **DRAFT**
> Date : 2026-05-13
> Source : `docs/PAGE-UI-UX-AUDIT-2026.md` §3.6, §3.10
> Lie a : PRP-226 Kitchen Recommendation Engine, PRP-227 Nutrition Coach
> Objectif : transformer `/kitchen` et `/kitchen/meal-planning` en surfaces utiles, pas en dashboards legacy.

## 1. Contexte

`/kitchen` est aujourd'hui un hub general. L'audit recommande une intention
produit forte : **Aujourd'hui en cuisine**. Mais cette idee demande des donnees
runtime : dernieres recettes, imports a verifier, matching inventaire, menus de
la semaine.

La page Menus est encore liee a une experience Cipher/legacy. Elle ne doit pas
etre promue dans la navigation tant qu'elle n'est pas alignée avec PRP-226/227.

## 2. Scope

### Inclus

- Redefinir `/kitchen` comme hub "Aujourd'hui".
- Clarifier/cacher `/kitchen/meal-planning` si legacy.
- Definir vraie page Menus V1.
- Connecter recettes, inventaire, courses et assistant.

### Exclus

- Moteur recommendation complet si PRP-226 absent.
- Nutrition coach complet si PRP-227 absent.
- Refonte complete du schema meal plan.

## 3. `/kitchen` cible

Blocs utiles :

1. **Continuer**
   - derniere recette ouverte ;
   - import en attente ;
   - menu en cours.

2. **A cuisiner avec ce que tu as**
   - depend de PRP-226 ;
   - sinon empty state honnete.

3. **A verifier**
   - imports newsletter/social.

4. **Cette semaine**
   - menus planifies ;
   - prochaines recettes.

5. **Anti-gaspi**
   - produits a finir ;
   - lien vers `/insights/waste`.

## 4. `/kitchen/meal-planning` cible

Nom visible : **Menus**.

Sections :

- Aujourd'hui ;
- Semaine ;
- Generer avec assistant ;
- Ajouter recette ;
- Ingredients manquants ;
- Envoyer aux courses.

## 5. Decision court terme

Tant que la page reste clairement Cipher/legacy :

- cacher `Menus` de la nav principale ;
- garder route accessible depuis un lien secondaire si necessaire ;
- ne pas vendre "Menus" comme feature core.

## 6. Signal de lancement refonte Menus

Lancer la refonte quand au moins deux elements sont disponibles :

- recipe-inventory matching fiable ;
- ajout ingredients manquants aux courses ;
- generation menu via assistant ;
- sauvegarde meal plan stable.

## 7. Wording

| Ancien | Nouveau |
|---|---|
| Dashboard cuisine | Aujourd'hui |
| Parcourir les Recettes | Ouvrir mes recettes |
| Planification Repas | Menus |
| Activite Recente | Continuer |
| Recommandations IA | Suggestions de l'assistant |

## 8. Plan d'execution

### Phase 1 — Clarification sans nouveau moteur

1. Retirer les blocs sans vraie data.
2. Renommer les cards existantes.
3. Ajouter empty states honnetes.
4. Cacher Menus de la nav si legacy.

### Phase 2 — Aujourd'hui V1

1. Ajouter dernieres recettes vues si data disponible.
2. Ajouter imports a verifier.
3. Ajouter produits a finir.
4. Ajouter CTA assistant.

### Phase 3 — Menus V1

1. Remplacer l'ancienne page Cipher.
2. Afficher semaine simple.
3. Ajouter recette a un repas.
4. Envoyer ingredients manquants aux courses.

## 9. Tests et verification

- `npm run build`
- Smoke :
  - `/kitchen`
  - `/kitchen/recipes`
  - `/kitchen/meal-planning`
  - `/shopping/list`
- Verifier empty state sans mock data.
- Verifier nav selon decision Menus visible/cache.

## 10. Definition of Done

- `/kitchen` a une promesse claire.
- Aucun bloc "Activite recente" fake.
- Menus n'est pas visible si legacy.
- Les CTA menent vers des actions existantes.
- Les donnees manquantes sont affichees comme empty states honnetes.

