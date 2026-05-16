# PRP-228 — UX Audit Implementation Index

> Statut : **DRAFT**
> Date : 2026-05-13
> Source canonique : `docs/PAGE-UI-UX-AUDIT-2026.md`
> Objectif : transformer l'audit UI/UX 2026 en chantiers PRP executables, reviewables et rollbackables.

## 1. Contexte

L'audit UI/UX 2026 est maintenant la reference produit pour sortir Smart Pantry
Pro du style demo/gamifie vers une app plus adulte, calme, lisible et
voice-first.

Le risque principal n'est plus de manquer d'idees, mais de tout melanger :
wording, routing, design system, assistant, recettes, menus, settings et
nettoyage repo. Cette PRP sert d'index de pilotage.

## 2. Decision de decoupage

Les chantiers issus de l'audit sont decoupes en 9 PRP UX :

| PRP | Nom | Scope | Risque |
|---|---|---|---|
| PRP-228 | UX Audit Implementation Index | Carte de pilotage | Doc |
| PRP-229 | UX Sprint 1 | P0/P1 wording + quick wins | Faible |
| PRP-230 | UX Sprint 2 | Routing/nav/shell diet | Moyen |
| PRP-231 | Design System, A11y, Performance | Tokens + patterns UX transverses | Moyen |
| PRP-232 | Recipe Experience V2 | Feed/Library/Inbox/Detail | Moyen/fort |
| PRP-233 | Assistant Surface UX Integration | `/assistant` + FAB + PRP-224 alignment | Fort |
| PRP-234 | Today Kitchen And Menus | `/kitchen` + `/kitchen/meal-planning` | Fort |
| PRP-235 | Settings Memory Nutrition Data | Settings orientes memoire/nutrition | Moyen |
| PRP-236 | Repo UI Cleanup And Dev Archive | Suppression pages test/demo/residuals | Faible/moyen |

## 3. Statut prerequis PRP-221

PRP-221 n'est plus a traiter comme un chantier a implementer avant les PRP
UX. Le repo contient deja :

- `VoiceAgentService`,
- `ToolRegistry`,
- `RiskClassifier`,
- `ProductResolver`,
- routes `/api/assistant/voice`, `/text`, `/actions/execute`, `/actions/:id/undo`,
- hook `useAssistantVoice`,
- `AssistantProvider` + FAB global monte dans `src/App.tsx`.

Statut retenu pour le planning :

> **PRP-221 = implemente V1, mais a smoke-tester e2e avant d'empiler la page
> conversationnelle PRP-224/233.**

## 4. Regle de numerotation

Ne pas renommer les fichiers PRP existants pour les remettre dans l'ordre
d'implementation. Les numeros PRP sont des **identifiants stables**, deja
references entre documents et conversations.

La priorite est donc portee par un **ordre canonique d'execution**, pas par le
numero de fichier.

Si on veut un affichage plus lisible en sprint planning, utiliser les labels :

- **A — Fondations UX**
- **B — Recettes**
- **C — Memoire + assistant**
- **D — Produit intelligence + recommandations**
- **E — Menus / nutrition / settings**
- **F — Cleanup continu**

## 5. Chemin critique recommande

### A — Fondations UX courtes

1. **PRP-229 — UX Sprint 1** : wording, labels nav, liens legacy, feed desktop,
   mock data.
2. **PRP-231 — Design System / A11y / Perf** : tokens, loading/empty states,
   accessibilite, budget performance.
3. **PRP-230 — Routing / Navigation / Shell** : seulement apres decisions §6.
4. **PRP-236 — Repo UI Cleanup** : archive/suppression pages test/demo apres
   verification routes/imports.

### B — Surface coeur recettes

5. **PRP-232 — Recipe Experience V2** : feed, bibliotheque, a verifier, ajouter,
   detail, edition.

### C — Memoire + assistant conversationnel

6. **PRP-223 — Assistant Memory Foundation** : memoire longue duree, preferences,
   souvenirs auditables.
7. **PRP-224 — ChatGPT-like Assistant UX** : page `/assistant` conversationnelle.
8. **PRP-233 — Assistant Surface UX Integration** : rattacher FAB global,
   `/assistant`, `/assistant/chat`, sessions/actions.

### D — Intelligence produit + recommandations

9. **PRP-225 — Product Intelligence / OpenFoodFacts** : enrichissement produits.
10. **PRP-226 — Kitchen Recommendation Engine** : recettes faisables,
    anti-gaspi, suggestions inventaire.

### E — Menus, settings, nutrition

11. **PRP-234 — Today Kitchen And Menus** : `/kitchen` utile + vraie page Menus.
12. **PRP-235 — Settings Memory Nutrition Data** : settings orientes donnees,
    memoire, preferences.
13. **PRP-227 — Personal Nutrition Coach** : coach bien-etre, objectifs,
    menus jour/semaine.

## 6. Tableau de priorite 223-236

| Ordre | PRP | Priorite | Pourquoi |
|---:|---|---|---|
| 1 | PRP-229 | P0/P1 | Gain UX immediat, faible risque |
| 2 | PRP-231 | P1 | Evite de refaire chaque page avec un style different |
| 3 | PRP-230 | P1/P2 | Nettoie shell/routing avant refontes |
| 4 | PRP-236 | P1/P2 | Reduit bruit repo apres verification navigation |
| 5 | PRP-232 | P1/P2 | Recettes = surface coeur actuelle |
| 6 | PRP-223 | P2 | Memoire requise avant assistant vraiment personnel |
| 7 | PRP-224 | P2/P3 | UI conversationnelle depend de PRP-223 et PRP-221 |
| 8 | PRP-233 | P2/P3 | Integration FAB/page apres UX assistant |
| 9 | PRP-225 | P3 | Enrichissement produits avant nutrition/reco fine |
| 10 | PRP-226 | P3 | Recommandations dependent recettes+inventaire+produits |
| 11 | PRP-234 | P3 | Menus/Aujourd'hui dependent recommandations |
| 12 | PRP-235 | P3 | Settings final apres memoire/nutrition mieux definies |
| 13 | PRP-227 | P4 | Plus ambitieux, depend des briques precedentes |

## 7. Decisions a trancher avant PRP-230

Ces decisions doivent etre explicites dans la PR de lancement du sprint UX P1 :

1. `/assistant` devient-il la page principale apres login quand PRP-224 est pret ?
2. `/insights` reste-t-il hub a 2 onglets ou redirect vers `/insights/waste` ?
3. `Menus` est-il visible dans la nav avant une vraie refonte hors Cipher ?
4. `Assistant` passe-t-il en premiere entree nav maintenant ou seulement apres PRP-233 ?

## 8. Non-objectifs

- Ne pas reintroduire games, family, parental, achievements ou mode magasin.
- Ne pas creer de nouvelles sous-routes factices.
- Ne pas masquer des features cassees derriere du wording plus joli.
- Ne pas changer le schema DB dans les PRP UX sauf mention explicite.

## 9. Definition of Done globale

- Chaque PRP reference le document `docs/PAGE-UI-UX-AUDIT-2026.md`.
- Chaque PRP a une DoD propre et des smoke checks.
- Les changements visibles sont verifies desktop + mobile.
- Toute mutation server-state ajoute ou confirme son invalidation cache/query.
- Aucune mock data visible en production.
- Les decisions non tranchees ne sont pas implementees par accident.

## 10. Rollback

Chaque PRP doit etre mergee separement. En cas de regression :

1. revert de la PR concernee ;
2. conservation de l'audit canonique ;
3. reouverture uniquement du scope fautif.
