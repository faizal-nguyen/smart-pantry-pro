# PRP-231 — Design System, Accessibility, Performance

> Statut : **DRAFT — pret a challenger apres corrections review**
> Date : 2026-05-13
> Source : `docs/PAGE-UI-UX-AUDIT-2026.md` §2.3-§2.14
> Objectif : poser les fondations visuelles, accessibilite et performance avant les refontes lourdes.

## 0. Decisions design prerequises

Ces decisions doivent etre cochees dans la description de **PR1 — Tokens
design**, sous un header `## Decisions §0 design`.

- [ ] **Direction visuelle** : choisir une direction avant code.
  - Recommandation : **Editorial sobre** — app outil premium, calme,
    lisible, dense, sans gamification visuelle.
  - Alternatives possibles : Minimal Swiss, Material+, autre.
- [ ] **Palette OKLCH** : choisir Option A, B ou C ci-dessous.
  - Recommandation : **Option A — Neutral editorial**.
- [ ] **Systeme composants gagnant** : unifier vers **shadcn/Radix + tokens
  produit** comme systeme principal.
  - Les composants `src/components/ui/material/*` restent legacy/experiments
    tant qu'ils ne sont pas migres.
- [ ] **Strategie Material You** : conserver `MaterialYouThemeProvider` comme
  provider technique uniquement.
  - Il peut alimenter `--md-sys-*`, mais ne doit pas overrider les tokens
    produit des pages outil.
- [ ] **Tool accessibilite** : `@axe-core/react` en dev + checklist manuelle
  clavier ; `jest-axe` pour composants testables.
- [ ] **Tool performance** : build production + note bundle route. Lighthouse
  ou visualizer deviennent obligatoires seulement si une route grossit.

Si les decisions §0 ne sont pas tranchees dans les 48h apres ouverture du
sprint, demarrer avec les recommandations par defaut :

- Direction : **Editorial sobre** ;
- Palette : **Option A — Neutral editorial** ;
- Systeme composants : **shadcn/Radix + tokens produit** ;
- Material You : **provider technique conserve, sans override des pages outil**.

La PR reste marquee `provisional/awaiting-design-decision` jusqu'a validation.

## 1. Contexte

L'app doit quitter le style demo enfantin : trop de gradients, emojis, cards
marketing, media geants et hierarchie floue. Les refontes futures doivent
partager les memes tokens, patterns et budgets de qualite.

Cette PRP est transverse. Elle ne refait pas toutes les pages ; elle definit les
rails et applique un premier pass aux composants communs.

## 2. Scope

### Inclus

- Tokens couleur light/dark avec valeurs OKLCH concretes.
- Type scale outil : `12 / 14 / 16 / 20 / 24 / 32 / 40`.
- Spacing rhythm : `4 / 8 / 12 / 16 / 24 / 32`.
- Radius par defaut `6-8px`.
- Variants boutons : primary, secondary, ghost, destructive, icon.
- Patterns loading et empty states.
- Tap targets, aria labels, focus states.
- Budget perf par route principale.
- Regles media responsive.
- Clarification state/data flow.
- Strategie de cohabitation Material You / tokens produit.

### Exclus

- Refonte complete de chaque page.
- Changement schema DB.
- i18n complet.
- Rebranding complet.
- Suppression des pages test/demo, couvert par PRP-236.
- Optimisation exhaustive de toutes les routes lourdes.

## 3. Direction visuelle

### Recommandation : Editorial sobre

Traits :

- surfaces calmes ;
- faible saturation ;
- media lisibles ;
- typographie compacte ;
- actions claires ;
- pas d'emojis dans headings/outils ;
- cards reservees aux items repetes ;
- gradients seulement pour accents rares, jamais comme fond de page outil.

Ce choix correspond a l'usage cible : recettes, inventaire, courses, assistant
et nutrition personnelle. L'app doit sembler fiable et adulte.

## 4. Design tokens OKLCH

Format attendu : les tokens stockent des valeurs CSS completes
`oklch(L% C H)`. Tailwind doit les consommer via `var(--token)`, par exemple
`background: var(--background)` ou `background: oklch(var(--background-raw))`
si l'equipe choisit une variante raw. PRP-231 recommande le format complet
ci-dessous pour eviter toute confusion avec HSL.

### Option A — Neutral editorial (recommandee)

```css
:root {
  --background: oklch(98.5% 0.006 250);
  --surface: oklch(100% 0 0);
  --surface-muted: oklch(96.5% 0.008 250);
  --border: oklch(90% 0.010 250);
  --text: oklch(20% 0.012 250);
  --text-muted: oklch(46% 0.015 250);
  --accent: oklch(58% 0.145 250);
  --accent-foreground: oklch(99% 0 0);
  --danger: oklch(58% 0.190 25);
  --success: oklch(56% 0.130 155);
  --warning: oklch(70% 0.145 75);
}

.dark {
  --background: oklch(17% 0.010 250);
  --surface: oklch(21% 0.012 250);
  --surface-muted: oklch(26% 0.012 250);
  --border: oklch(34% 0.014 250);
  --text: oklch(94% 0.006 250);
  --text-muted: oklch(70% 0.010 250);
  --accent: oklch(68% 0.130 250);
  --accent-foreground: oklch(15% 0.010 250);
  --danger: oklch(68% 0.170 25);
  --success: oklch(70% 0.120 155);
  --warning: oklch(78% 0.135 75);
}
```

### Option B — Warm culinary

```css
:root {
  --background: oklch(98.5% 0.010 85);
  --surface: oklch(100% 0 0);
  --surface-muted: oklch(96.5% 0.014 85);
  --border: oklch(90% 0.014 85);
  --text: oklch(20% 0.014 70);
  --text-muted: oklch(46% 0.018 70);
  --accent: oklch(62% 0.155 55);
  --accent-foreground: oklch(99% 0 0);
  --danger: oklch(58% 0.190 25);
  --success: oklch(56% 0.120 145);
  --warning: oklch(72% 0.150 80);
}

.dark {
  --background: oklch(16% 0.012 70);
  --surface: oklch(20% 0.014 70);
  --surface-muted: oklch(25% 0.016 70);
  --border: oklch(34% 0.018 70);
  --text: oklch(94% 0.010 85);
  --text-muted: oklch(70% 0.014 85);
  --accent: oklch(72% 0.145 55);
  --accent-foreground: oklch(15% 0.012 70);
  --danger: oklch(68% 0.170 25);
  --success: oklch(70% 0.115 145);
  --warning: oklch(78% 0.135 80);
}
```

### Option C — Cool utility

```css
:root {
  --background: oklch(98.5% 0.004 230);
  --surface: oklch(100% 0 0);
  --surface-muted: oklch(96% 0.006 230);
  --border: oklch(89% 0.008 230);
  --text: oklch(19% 0.010 230);
  --text-muted: oklch(46% 0.012 230);
  --accent: oklch(56% 0.130 215);
  --accent-foreground: oklch(99% 0 0);
  --danger: oklch(58% 0.190 25);
  --success: oklch(56% 0.120 155);
  --warning: oklch(70% 0.140 80);
}

.dark {
  --background: oklch(16% 0.010 230);
  --surface: oklch(20% 0.010 230);
  --surface-muted: oklch(25% 0.012 230);
  --border: oklch(33% 0.012 230);
  --text: oklch(94% 0.006 230);
  --text-muted: oklch(70% 0.010 230);
  --accent: oklch(68% 0.120 215);
  --accent-foreground: oklch(15% 0.010 230);
  --danger: oklch(68% 0.170 25);
  --success: oklch(70% 0.115 155);
  --warning: oklch(78% 0.130 80);
}
```

### Mapping Tailwind

Le repo utilise actuellement `hsl(var(--background))` dans
`tailwind.config.ts` et des HSL dans `src/index.css`. La migration PR1 doit
choisir une des deux strategies :

1. convertir les couleurs Tailwind vers `oklch(var(--background))` ;
2. garder les variables Tailwind existantes en HSL mais ajouter les tokens
   produit OKLCH en parallele, puis migrer progressivement.

Recommandation : convertir **tous les tokens listes dans §4** vers OKLCH dans
PR1, sans toucher toutes les classes one-off des pages.

## 5. Type, spacing, radius

### Type scale

| Token | Taille | Usage |
|---|---:|---|
| `text-xs` | 12 | captions, metadata, badges compacts |
| `text-sm` | 14 | body small, labels, helper text |
| `text-base` | 16 | body principal |
| `text-xl` | 20 | h4, titres cards, lead compact |
| `text-2xl` | 24 | h3, section title |
| `text-3xl` | 32 | h2, page title outil |
| `text-4xl` | 40 | h1 rare, onboarding/auth uniquement |

Regle : pas de hero-scale type dans cards, sidebars, dashboards denses.

### Spacing

- `4 / 8 / 12 / 16 / 24 / 32`
- Les tailles media recommandees doivent rester multiples de 8 quand possible.

### Radius

- defaut outil : `6-8px`
- `rounded-full` seulement pour avatars, toggles, icon FAB, pills legitimes ;
- eviter `rounded-3xl` sur cards outil.

## 6. Inventaire composants existants

Le repo a deux systemes paralleles :

| Usage | shadcn/Radix | Material |
|---|---|---|
| Button | `src/components/ui/button.tsx` | `src/components/ui/material/Button.tsx`, `SimpleButton.tsx` |
| Card | `src/components/ui/card.tsx` | `src/components/ui/material/Card.tsx` |
| Dialog | `dialog.tsx`, `alert-dialog.tsx` | aucun equivalent central stable |
| Theme | `src/index.css`, `tailwind.config.ts` | `MaterialYouThemeContext.tsx`, `ThemeCustomizer.tsx` |
| Empty/loading | `empty-state.tsx`, `loading-skeleton.tsx`, `skeleton.tsx` | pas de systeme principal |

Decision recommandee :

- **shadcn/Radix devient le systeme de composants principal**.
- `ui/material/*` est legacy/experimental et ne doit pas etre utilise dans de
  nouvelles pages outil.
- Ne pas supprimer `ui/material/*` dans PRP-231 ; archiver/supprimer plus tard
  seulement apres `rg` et PRP-236.
- Harmoniser `dialog.tsx` et `alert-dialog.tsx` :
  - `dialog.tsx` = formulaire, details, edition, lecture ;
  - `alert-dialog.tsx` = confirmations destructives ou irreversibles ;
  - styles/focus/spacing doivent rester coherents entre les deux.

## 7. Strategie Material You

Etat actuel :

- `MaterialYouThemeProvider` est monte dans `src/App.tsx`.
- Il ecrit des variables `--md-sys-*` a runtime.
- Les tokens produit actuels vivent dans `src/index.css` et Tailwind.

Regle PRP-231 :

- Les pages outil utilisent les tokens produit (`background`, `surface`,
  `text`, `accent`, etc.).
- Material You peut continuer a servir les composants legacy qui lisent
  `--md-sys-*`.
- Material You ne doit pas changer la personnalite visuelle d'une route a
  l'autre.
- Si `extractColorFromImage()` modifie une couleur globale, verifier qu'elle ne
  remplace pas les tokens produit des surfaces outil.

Verification :

- `rg -n "MaterialYouThemeContext|useMaterialYouTheme|MaterialButton|MaterialCard|extractColorFromImage|--md-sys" src`
- screenshots light/dark de deux routes outil avant/apres changement de source
  color Material You ;
- verifier dans DevTools que les surfaces outil utilisent les tokens produit
  (`--background`, `--surface`, `--text`, `--accent`) et non `--md-sys-*` pour
  leur structure visuelle principale.

## 8. Accessibility baseline

Regles non negociables :

- Boutons et icones interactives >= 44 x 44 px.
- `aria-label` sur tout bouton icone sans texte visible.
- Focus visible clavier.
- Focus trap pour dialogs.
- Escape ferme dialogs.
- Retour focus apres fermeture.
- Contraste WCAG AA.
- Pas de `stopPropagation` sur enfant qui casse le click parent sauf action distincte.

Tools retenus :

- `@axe-core/react` en dev mode pour remonter les violations evidentes ;
- `jest-axe` pour composants isoles quand un test existe ;
- checklist manuelle clavier pour pages principales ;
- Lighthouse manuel ou CI plus tard si une route regresse.

## 9. Loading states

Patterns :

- Skeleton pour listes/cartes Supabase.
- Spinner uniquement pour action courte.
- Message contextualise si chargement > 800 ms.
- Pas d'ecran blanc pendant auth/session check.
- Action longue disabled + feedback.

Composants a standardiser :

- `src/components/ui/loading-skeleton.tsx`
- `src/components/ui/skeleton.tsx`
- creer/ajuster un `LoadingState` seulement si le repo n'a pas d'equivalent.

## 10. Empty states

Pattern :

1. titre honnete ;
2. explication courte ;
3. CTA primaire utile ;
4. lien secondaire facultatif.

Composant existant :

- `src/components/ui/empty-state.tsx`

Exemple recettes :

- Titre : "Aucune recette a verifier"
- Texte : "Les imports TikTok, Instagram et newsletter apparaitront ici."
- CTA : "Ajouter une recette"

## 11. Performance budget et baseline

Routes a surveiller :

- `/kitchen/recipes`
- `/pantry/inventory`
- `/assistant`
- `/shopping/list`
- `/kitchen/meal-planning`

Budget cible :

- LCP < 2.5 s.
- JS critique par route principale < 250 kB gzip.
- Code splitting pour grosses pages.
- Pas de grosse lib chargee au premier rendu si non necessaire.

Toute route au-dessus de 250 kB gzip demande une justification ecrite et un
ticket follow-up explicite.

Baseline observee dans l'audit. Elle doit etre **remesuree par `npm run build`
au demarrage de PR4** et comparee aux chiffres ci-dessous, car les tailles
peuvent changer entre PRP-222, PRP-229 et PRP-231 :

| Route/chunk | Taille observee | Statut |
|---|---:|---|
| `InventoryPage` | ~582 kB gzip | hors budget |
| `AssistantAI` | ~850 kB gzip | hors budget |
| `MealPlanningPage` | ~364 kB gzip | hors budget |
| `RecipesPage` | ~381 kB gzip | hors budget |

PRP-231 ne promet pas de ramener toutes les routes sous 250 kB. Elle exige :

- une mesure avant/apres ;
- aucune regression non justifiee ;
- 1-2 splits prioritaires si PR4 perf est ouverte dans ce sprint.
- noter que le repo peut contenir un poids historique important hors bundle
  (ex : ancien environnement PyTorch volumineux). Le nettoyage d'historique ou
  `git filter-repo` est hors PRP-231 et doit rester un follow-up separe.

## 12. State/data flow

Regles :

- Server state : TanStack Query par defaut.
- Client state local : `useState` / `useReducer`.
- Client state transverse : Zustand seulement si plusieurs surfaces en ont besoin.
- Pas de duplication server state dans store client.
- Toute mutation server-state declare son invalidation cache/query.
- Events DOM custom exceptionnels et documentes, avec audit de
  `src/lib/agentEvents.ts`.

## 13. Strategie de PR splitting

Ne pas faire une PR geante.

### PR1 — Tokens design + dark mode coverage

Fichiers probables :

- `src/index.css`
- `tailwind.config.ts`
- `src/contexts/MaterialYouThemeContext.tsx` si besoin d'isoler Material You
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`

Livrable :

- direction visuelle choisie ;
- palette OKLCH choisie ;
- tokens light/dark ;
- shadcn/Radix confirme comme systeme principal.

### PR2 — EmptyState + LoadingState patterns

Fichiers probables :

- `src/components/ui/empty-state.tsx`
- `src/components/ui/loading-skeleton.tsx`
- `src/components/ui/skeleton.tsx`
- 3 a 5 surfaces pilotes.

Surfaces pilotes recommandees :

- `WasteInsightsPage`
- `InsightsPage`
- `RecipesPage`
- `InventoryPage`

### PR3 — A11y baseline composants communs

Fichiers probables :

- `button.tsx`
- `dialog.tsx`
- `alert-dialog.tsx`
- `tabs.tsx`
- `tooltip.tsx`
- `AssistantFAB` si touché.

Livrable :

- aria labels sur icon buttons pilotes ;
- focus states verifies ;
- dialogs Escape/focus retour verifies ;
- checklist clavier.

### PR4 — Performance baseline + splits prioritaires

Fichiers probables :

- `src/App.tsx`
- pages lazy lourdes ;
- imports de chart/video/assistant si charges trop tot.

Livrable :

- baseline route/chunk avant ;
- baseline apres ;
- aucune regression non justifiee ;
- split d'une ou deux surfaces si necessaire.

### PR5 — State/data flow cleanup

Optionnelle si au moins un de ces criteres est vrai :

- `src/lib/agentEvents.ts` ajoute un nouvel event ou masque une invalidation
  TanStack Query ;
- une mutation server-state est modifiee dans PR1-4 ;
- une page pilote duplique du server state dans Zustand/local state ;
- un bug de cache/invalidation est observe pendant QA.

Livrable :

- audit `src/lib/agentEvents.ts` ;
- documentation des events conserves ;
- invalidation query explicite si mutation touchee.

## 14. Plan d'execution

### Phase 0 — Audit cible

Commandes utiles :

```bash
rg -n "bg-gradient-to-" src/components src/pages
rg -n "🍳|🥬|🥩|🥛|🥫|🎉|✨|🤖|🔥" src/components src/pages
rg -n "rounded-3xl|rounded-full" src/components src/pages
rg -n "from-orange|to-red|purple|violet|pink" src/components src/pages
rg -n "ui/material" src
rg -n "MaterialYouThemeContext|useMaterialYouTheme|MaterialButton|MaterialCard|extractColorFromImage|--md-sys" src
```

Eviter les greps trop larges comme `bg-|text-`, qui matchent tout Tailwind.

### Phase 1 — Tokens

1. Choisir Option A/B/C.
2. Centraliser tokens light/dark.
3. Adapter Tailwind mapping.
4. Verifier que dark mode couvre chaque token.
5. Ne pas migrer toutes les pages en une fois.

### Phase 2 — Patterns

1. Standardiser `EmptyState`.
2. Standardiser `LoadingState` / skeletons.
3. Migrer 3 a 5 surfaces pilotes.
4. Verifier que les empty states n'affichent pas de mock data.

### Phase 3 — A11y composants communs

Checklist :

- Tab atteint tous les controles interactifs ;
- Enter/Space active les boutons ;
- Escape ferme dialogs/dropdowns ;
- focus initial dans dialog ;
- focus retourne au trigger ;
- arrow keys fonctionnent pour tabs/menus si Radix le fournit ;
- icon buttons ont label/tooltip.

### Phase 4 — Performance

1. Lancer build production.
2. Relever chunks routes principales.
3. Comparer a la baseline observee.
4. Identifier imports lourds.
5. Split uniquement la ou le gain est clair.

## 15. Tests et verification

### Commandes

- `npm run build`
- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run lint`

### A11y

- `@axe-core/react` active en dev ou verification manuelle documentee.
- `jest-axe` si un composant commun est teste.
- Checklist clavier sur :
  - `/kitchen/recipes`
  - `/pantry/inventory`
  - `/shopping/list`
  - `/assistant`

### Responsive / visuel

Breakpoints minimum :

- 320 px
- 768 px
- 1024 px
- 1440 px

Screenshots requis :

- light desktop ;
- dark desktop ;
- light mobile ;
- dark mobile.

Les screenshots doivent etre archives dans la PR comme attachments ou dans un
dossier `output/ux-prp-231/` ignore si approprie. Si Playwright est utilise,
joindre la trace ou les chemins d'images.

## 16. Definition of Done

- Les decisions §0 sont cochees dans PR1.
- Direction visuelle choisie et documentee.
- Palette OKLCH choisie et appliquee aux tokens principaux.
- Tokens light/dark definis.
- shadcn/Radix confirme comme systeme principal.
- Strategie Material You documentee et respectee.
- `npm run build` passe.
- `npx tsc --noEmit -p tsconfig.app.json` passe.
- `npm run lint` passe ou erreurs preexistantes listees.
- Nouveaux composants communs utilisent les tokens, pas des couleurs hardcodees.
- Empty/loading states standardises sur les surfaces pilotes.
- Tap targets, aria labels, focus states verifies sur composants communs touches.
- Screenshots avant/apres light + dark joints.
- Bundle size note chiffree pour chaque route auditee.
- Aucune route principale ne grossit sans justification.
- Aucun nouveau usage de `src/components/ui/material/*` dans les nouvelles
  surfaces outil.
- Aucun nouveau package npm sauf `@axe-core/react` / `jest-axe`, deja presents
  dans le repo au moment de cette PRP.
- i18n reste explicitement hors scope.
- Aucun changement auth/permissions.
- Pour les fichiers touches, le grep suivant ne doit pas reveler de nouvelles
  couleurs hardcodees hors tokens :
  `rg -n "bg-(red|blue|green|orange|purple|pink|amber|yellow)-|text-(red|blue|green|orange|purple|pink|amber|yellow)-|from-|to-" <fichiers-touches>`.
