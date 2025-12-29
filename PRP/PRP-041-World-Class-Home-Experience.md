#+ 🏠 PRP‑041 — World‑Class Home Experience (Daily Family Use)

## 🎯 CONTEXT CIPHER
- 🧭 Objectif: rendre l’app utilisable au quotidien par un foyer (couple/famille), sans ajouter de nouvelles « mega features », en polissant les parcours cœur.
- 🔁 Parcours à solidifier: Inventaire → Planification → Courses → Cuisine (avec Assistant en contexte).
- 🧱 Base technique solide: React/Vite/TS, API Express typée (apps/api), Zod partagé, SSE assistant, intégrations social/YouTube.
- ⚠️ Gap actuel: incohérences UX (routes legacy/test visibles), retours d’action/erreurs, offline perçu, liens entre écrans clés.

---

## 📱 FEATURE OVERVIEW

### Valeur métier
- **Frictions minimales à la maison**: ajout rapide d’articles, plan de repas clair, liste de courses par rayons.
- **Anti‑gaspi efficace**: focalisation « À consommer d’abord » + suggestions contextuelles.
- **« Un clic = une action »**: cuisiner → décrémente l’inventaire; recette → ajoute manquants à la liste; plan → génère courses.
- **Confiance & robustesse**: feedbacks clairs (success/erreur/undo), offline first, latence ressentie < 100–200 ms.

### Cœur des fonctionnalités (sans invention hors scope)
1) Inventaire « Ajout Rapide » + Vue « À consommer d’abord » (J‑1/J‑3/expirés)
2) Détail Recette centré actions: manquants → liste, bouton « Cuisiner » (décrément + Undo)
3) Planification hebdo: alternatives rapides, verrou, génération de liste manquants
4) Smart Shopping List: Mode Magasin (tri par rayon/allée), consolidation & check haptique
5) Assistant contextuel: actions 1‑clic depuis chaque écran (Plan/Recette/Inventaire)
6) Navigation propre: masquer routes legacy/test en prod; badges d’état (à consommer/courses)
7) States et erreurs explicites: mode démo, diagnostics réseau, UI optimiste + Undo

---

## 👥 USER STORIES & PERSONAS

- **Persona A — Couple pressé en semaine**
  - En 30 secondes: regarder « À consommer d’abord », choisir 1 recette réalisable, cuisiner → tout depuis le téléphone.
  - Samedi: ouvrir « Plan semaine », choisir 5–7 repas, générer liste, cocher en magasin.
- **Persona B — Parent + enfants**
  - Deux téléphones: liste de courses partagée, check temps réel; séances « pas‑à‑pas » en cuisine.

---

## 🏗️ TECHNICAL IMPLEMENTATION PLAN

### Phase 1 — Navigation, États & Confiance (Semaine 1)
- Masquer routes legacy/test/TODO en prod (garder /dev en mode dev)
- Badges de nav (exemples):
  - Pantry: `À consommer (3)` (compte J‑1/J‑3/expirés)
  - Shopping: `Courses (12)`
- États & erreurs: bannière « Mode démo » quand un fallback est renvoyé (code `DEMO_MODE`), toast réseau utile, page « Diagnostics » (latence, disponibilité API, env)

```tsx
// src/components/navigation/AppNavigation.tsx (extrait conceptuel)
const badges = useNavBadges(); // calcule à partir des stores/services
return <NavItem label="Pantry" badge={badges.toConsume} />;
```

### Phase 2 — Inventaire (Semaine 2)
- « Ajout Rapide » (barcode/photo) → proposition auto (produit/quantité/section) → Ajouter/Annuler
- Vue « À consommer d’abord » (tri J‑1/J‑3/expirés), CTA rapides: « Proposer recette », « Planifier demain »
- Optimistic UI + Undo 5 s pour ajout/suppression

```tsx
// src/pages/pantry/PantryDashboard.tsx (extrait conceptuel)
const { addItem, undo } = useInventoryActions();
const onQuickAdd = async (draft) => {
  const rid = await addItem.optimistic(draft); // renvoie rollback id
  toast.success('Ajouté', { action: { label: 'Annuler', onClick: () => undo(rid) } });
};
```

### Phase 3 — Recette & Cuisine (Semaine 3)
- Détail recette: ingrédients OK vs manquants (mappés inventaire)
- Bouton « Ajouter manquants à la liste »
- Bouton « Cuisiner »: décrémente inventaire (optimiste + Undo), log usage (insights)
- Mode pas‑à‑pas: plein écran, « Étape suivante », minuteurs

```tsx
// src/pages/RecipeDetail.tsx (extrait conceptuel)
<Button onClick={addMissingToList}>Ajouter manquants</Button>
<Button onClick={cookWithDecrement}>Cuisiner</Button>
```

### Phase 4 — Planification Hebdo (Semaine 4)
- Grille lun→dim par défaut; bouton « + Ajouter » proposant d’abord recettes réalisables (anti‑gaspi)
- Alternatives rapides (3 suggestions) + verrou (lock)
- Bouton « Générer manquants » → liste de courses (consolidée)

```tsx
// src/pages/MealPlanningPage.tsx (extrait conceptuel)
const suggestions = usePlanSuggestions({ prioritizeExpiring: true });
```

### Phase 5 — Smart Shopping List: Mode Magasin (Semaine 5)
- Tri par rayons/allées (storeSection), dédoublonnage/consolidation
- Gros checkboxes + haptique/animation sur check
- État offline robuste (édition offline, sync à la reconnexion)

```tsx
// src/pages/SmartShoppingList.tsx (extrait conceptuel)
const grouped = useMemo(() => groupBySection(listItems), [listItems]);
```

### Phase 6 — Assistant Contextuel (Semaine 6)
- Boutons contextuels:
  - Pantry: « 3 idées avec ce qui expire »
  - Recette: « Optimiser avec mon inventaire »
  - Plan: « Alléger budget semaine »
- Réponses en cartes actionnables: « Ajouter au plan », « Ajouter à la liste »

```tsx
// src/components/ai/AIActions.tsx (extrait conceptuel)
<AICard onAddToPlan={...} onAddToList={...} />
```

---

## 🔌 INTEGRATION POINTS
- Inventaire/Produits: services existants, mappage OFF/EAN, catégorisation `storeSection`
- Plan de repas: `MealPlanningPage` + hooks de suggestions (priorisation anti‑gaspi)
- Shopping List: endpoints batch, consolidation par rayon
- Assistant: `/api/v1/assistant/stream` avec codes `code` explicites, actions 1‑clic
- Observabilité: `x-request-id`, codes (`LEGACY_OK`, `DEMO_MODE`, `LOCAL_OK`), latences

---

## ✅ TESTING STRATEGY
- Unit: actions Inventaire (optimistic/undo), calculs badges, mapping ingrédients manquants
- Intégration: 
  - Recette → « Ajouter manquants à la liste »
  - Plan → « Générer manquants » → Shopping
  - « Cuisiner » → décrément + Undo
- E2E (chemin d’or):
  1) Scanner/ajout → Inventaire
  2) Planifier 3 repas → Générer manquants → Courses → Cuisiner 1 repas
  3) Assistant contextuel → ajouter au plan/liste
- Perf perçue: interactions < 100–200 ms; streaming assistant fluide

---

## 📊 SUCCESS METRICS
1) Taux d’actions 1‑clic (Ajouter manquants / Cuisiner / Générer manquants) > 60%
2) Diminution du gaspillage (J‑1/J‑3 consommés) +30% en 4 semaines
3) Durée de session utile baisse (objectif efficacité): ajout/plan/courses < 2 min
4) Latence perçue: > 90% interactions < 200 ms, flux streaming stable
5) Partage foyer: 2 devices synchronisés sans conflits

---

## ⏱️ TIMELINE
- S1: Navigation propre, états/erreurs, badges, « Diagnostics »
- S2: Inventaire (Ajout Rapide, À consommer d’abord, undo)
- S3: Recette (OK/manquants, Cuisiner, pas‑à‑pas)
- S4: Planification hebdo (suggestions anti‑gaspi, alternatives, générer manquants)
- S5: Shopping Mode Magasin (rayons, consolidation, haptique, offline)
- S6: Assistant contextuel (cartes actionnables)

---

## ⚠️ RISKS & MITIGATIONS
- Compat scanner / permissions: progressive enhancement + fallback (saisie manuelle)
- Données incohérentes (offline): file d’opérations et résolutions simples (last‑write wins + undo)
- Perception « démo/simulation »: badges/ban­nières explicites + trajectoire claire pour activer « vrai » mode

---

## 🚀 NEXT STEPS (EXECUTION READY)
- Masquer routes legacy/test en prod + ajouter Badges de nav → PR #1
- Implémenter « Ajout Rapide » + Vue « À consommer d’abord » + Undo → PR #2
- Détail Recette: OK/manquants, « Ajouter manquants », « Cuisiner » (décrément + Undo) → PR #3
- Plan: suggestions anti‑gaspi, alternatives, « Générer manquants » → PR #4
- Smart Shopping List: Mode Magasin (rayons, consolidation, check haptique) → PR #5
- Assistant contextuel (cartes actionnables) → PR #6

> Chaque PR inclut: tests ciblés, instrumentation simple (x‑request‑id, codes), states d’erreurs/démo clairs, et notes de migration UI.

