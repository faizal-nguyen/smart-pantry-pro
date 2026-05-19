# PRP-237 - World-Class Visual Redesign 2026

> Statut : **IN PROGRESS - PR1 tokens deja partiellement appliques, PR2 shell partiellement applique**
> Date : 2026-05-17
> Source : audit terrain Codex 2026-05-17, `docs/PAGE-UI-UX-AUDIT-2026.md`, PRP-231, feedback produit utilisateur.
> Objectif : faire basculer Smart Pantry Pro d'une app "green food demo" a un produit premium, adulte, voice-first et vraiment desirable.

## 0. Decisions design prerequises

Ces decisions doivent etre cochees dans la description de **PR1 - Brand
tokens + primitives**, sous un header `## Decisions §0 design`.

- [ ] **Direction visuelle** : adopter **Culinary Intelligence OS**.
  - App outil premium, calme, dense, tactile, assistant-first.
  - Pas une app "healthy green", pas une landing page, pas un dashboard demo.
- [ ] **Palette** : adopter **Ink / Porcelain / Saffron / Tomato / Electric
  Blue**.
  - Le vert devient strictement semantique : success, frais, validation.
  - Le vert ne peut plus etre la couleur primaire de marque.
- [ ] **Systeme composants gagnant** : **shadcn/Radix + tokens produit**.
  - `src/components/ui/material/*` devient legacy/experimental.
  - Aucune page coeur ne doit importer `MaterialButton` ou `MaterialCard`.
- [ ] **Typographie** : **Geist Sans** si ajoutee proprement, sinon **Inter
  Variable** en fallback.
  - Une seule famille pour PR1-PR6. Pas de serif editorial avant stabilisation.
- [ ] **Shell produit** : garder la nav cible de l'audit, mais ne mettre
  Assistant en premiere position que si `/assistant` est une vraie conversation.
  - Avant PRP-224/233 terminee : Recettes ou Inventaire peuvent rester en first
    position.
  - Apres PRP-224/233 : Assistant passe en first position.
- [ ] **Modernisation librairies** : Tailwind v4 / React 19 / Vite upgrade en PR
  dediee, jamais melangee a PR1 tokens.

Si les decisions §0 ne sont pas tranchees dans les 48h apres ouverture du
sprint, demarrer avec les recommandations par defaut :

- Direction : **Culinary Intelligence OS** ;
- Palette : **Ink / Porcelain / Saffron / Tomato / Electric Blue** ;
- Composants : **shadcn/Radix + tokens produit** ;
- Typo : **Inter Variable**, puis Geist Sans si ajout facile ;
- Material You : conserve comme provider technique seulement si aucun override
  visuel des pages coeur.

La PR reste marquee `provisional/awaiting-design-decision` jusqu'a validation.

## 0.1 Etat d'avancement reel 2026-05-17

Cette PRP n'est plus un document avant demarrage. Une partie de PR1/PR2 est
deja presente dans le repo local.

| Bloc | Etat code | Decision PRP |
|---|---|---|
| PR1 tokens OKLCH | `src/index.css` contient `PRP-237 PR1 - Culinary Intelligence OS visual identity`; `tailwind.config.ts` mappe deja `oklch(var(--token) / <alpha-value>)`. | Ne pas refaire. PR1 restant = verification contraste, primitives, bridge Material, screenshots baseline. |
| Bridge Material | `src/styles/material-you.css` expose deja des aliases `--md-sys-color-*` vers les tokens produit. | Garder le bridge, corriger seulement les overrides contextuels verts/purple/orange, documenter retrait PR5/PR7. |
| Navigation shell | `NavigationHub.tsx` place deja Assistant en first et garde certains champs legacy optional avec `// allow:`. | Assumer cette compat temporaire. PR2 ne supprime pas les types tant que `NavigationPredictor` / `useCipherMealPlanning` les lisent. |
| Assistant components | `AssistantConversationSurface.tsx`, `AssistantMessageThread.tsx`, `AssistantRecipeProposals.tsx` existent. | PR3 peut demarrer si ces fichiers sont bien sur la branche de base, sans attendre un numero de PR GitHub. |
| Recipes gradient | `Recipes.tsx` conserve encore un hero gradient orange/rouge. | A traiter en PR4. |
| Material imports core | `Inventory.tsx`, `SmartShoppingList.tsx`, `RecipeCard.tsx`, `InsightsDashboard.tsx` importent encore Material. | A traiter par surface PR4/PR5/PR6, pas en PR1. |

## 1. Executive summary

Le probleme actuel n'est pas seulement "les couleurs". C'est un probleme
d'identite produit.

L'app montre encore des traces de plusieurs epoques :

- ancienne identite verte "healthy grocery" ;
- gradients orange/rouge/purple de demo ;
- Material You custom en parallele de shadcn/Radix ;
- wording gamifie/famille encore present dans la config navigation ;
- pages assistant encore en vitrine par endroits ;
- cards blanches arrondies partout, sans vraie hierarchie premium ;
- composants core qui melangent `green`, `orange`, `gray`, `purple`, `Material`
  et `shadcn`.

La direction recommandee :

> Smart Pantry Pro devient un **Culinary Intelligence OS** : une interface
> premium, voice-first, personnelle, capable de piloter recettes, inventaire,
> courses, memoire et nutrition sans ressembler a une app de demo.

## 1.1 Audit terrain 2026-05-17

| Signal | Observation | Impact |
|---|---|---|
| Couleur de marque | `src/index.css` a deja les tokens Ink/Porcelain/Saffron/Tomato/Electric Blue. | La fondation PR1 a commence, mais les pages gardent encore beaucoup d'usages verts/hardcodes. |
| Gradients | `Recipes.tsx` utilise `bg-gradient-to-br from-orange-50 via-white to-red-50` et du texte gradient. | Look demo/landing, pas app outil premium. |
| Legacy famille | `NavigationHub.tsx` garde certains champs optional avec `// allow:` pour compat runtime, sans les populer dans `NAVIGATION_CONFIG`. | Dette acceptee temporairement ; suppression complete depend de PRP-234 / cleanup services. |
| Deux systemes UI | shadcn/Radix coexiste avec `src/components/ui/material/*`, `src/styles/material-you.css` et `MaterialYouThemeContext`. | Incoherence des surfaces, cout de maintenance, styles concurrents. |
| Imports Material | `Inventory.tsx`, `SmartShoppingList.tsx` et d'autres surfaces importent `MaterialCard` / `MaterialButton`. | Le design system principal n'est pas clair. |
| Assistant | Les composants conversationnels existent deja, mais des surfaces legacy `AssistantAI.tsx` / `AIAssistant.tsx` restent dans le repo. | PR3 doit polir la surface principale et PRP-236 doit gerer les pages legacy. |
| Hardcoded utilities | Audit grep observe beaucoup de `green`, `orange`, `gray`, `purple`, `rounded-2xl/3xl/full`, `bg-gradient-to`. | Impossible d'obtenir un resultat world-class sans gate mesurable. |

Baseline observee apres migration tokens PRP-237 partielle :

```bash
rg -n "green|emerald" src | wc -l                    # 218
rg -n "bg-gradient-to|gradient" src | wc -l          # 89
rg -n "MaterialButton|MaterialCard" src | wc -l      # 151
rg -n "rounded-2xl|rounded-3xl|rounded-full" src | wc -l # 169
```

Ces chiffres ne sont pas des objectifs absolus. Ils servent de point de depart
pour mesurer la baisse du bruit visuel.

Note : `rg -n "Material" src` est volontairement plus large et retourne plus
de hits. Le gate PRP-237 suit `MaterialButton|MaterialCard`, car c'est le signal
qui correspond aux surfaces visuelles a retirer.

## 2. References 2026

Cette PRP s'appuie sur des signaux actuels, sans copier aveuglement les effets
de mode :

- Tailwind v4 : CSS-first, tokens plus directs, perf de build amelioree.
  Source : https://tailwindcss.com/blog/tailwindcss-v4
- React 19 existe et doit etre traite comme un upgrade dedie, pas un changement
  opportuniste dans une refonte visuelle.
  Source : https://react.dev/versions
- Tendances UI 2026 utiles : personnalisation, interfaces plus intelligentes,
  micro-interactions mesurees, layouts plus immersifs.
  Source : https://midrocket.com/en/guides/ui-design-trends-2026/
- Tendances UX 2026 utiles : produits plus adaptes au contexte, IA integree,
  accessibilite et confiance comme criteres de qualite.
  Source : https://www.stan.vision/journal/ux-ui-trends-shaping-digital-products

Interpretation produit :

- On ne cherche pas a faire "futuriste".
- On cherche a faire **precis, tactile, dense, intelligent, calme**.
- Les animations et effets doivent renforcer la comprehension, pas decorer.

## 3. North star produit

### Culinary Intelligence OS

Attributs :

- **Assistant-first** : le produit donne l'impression qu'on peut lui parler et
  qu'il comprend le contexte.
- **Culinary, pas grocery generic** : recettes, gestes, aliments, inventaire,
  menus et memoire personnelle.
- **Premium utility** : dense, clair, rapide, utilisable tous les jours.
- **Data-aware** : chaque recommandation, badge ou statut doit avoir une source
  de donnees reelle.
- **Calme** : pas d'emojis decoratifs, pas de hero marketing, pas de gradients
  de fond sur les pages outil.
- **Tactile** : boutons, cards, media et listes doivent sembler manipulables,
  mais sans gros arrondis enfantins.

### Ce que l'app ne doit plus etre

- Une app verte "healthy".
- Une demo Material You.
- Une collection de pages cards/gradients.
- Une app famille/gamification.
- Un dashboard qui explique ses features au lieu de les rendre utilisables.

## 4. Scope

### Inclus

- Refonte identite visuelle globale.
- Tokens light/dark OKLCH.
- Unification des primitives shadcn/Radix.
- Sunset visuel des imports Material sur les surfaces coeur.
- App shell premium : navigation, spacing, headers, action bars.
- Refonte visuelle des surfaces coeur :
  - `/assistant`
  - `/kitchen/recipes`
  - `/pantry/inventory`
  - `/shopping/list`
  - `/insights` et `/insights/waste`
  - `/settings`
  - `/auth`
- Regles media, cards, boutons, badges, empty states, loading states.
- Gates grep et screenshots pour empecher la regression vers "green demo".
- Plan d'upgrade librairies separe : Tailwind v4, React 19, Vite.

### Exclus

- Recommandation engine complet.
- Vector memory ou recherche semantique.
- Refonte totale PRP-224 si non commencee.
- Changement schema DB.
- Suppression repo-wide de toutes les pages legacy, couverte par PRP-236.
- Refonte nutrition coach, couverte par PRP-227.
- OpenFoodFacts product intelligence, couverte par PRP-225.
- i18n complet.

## 5. Palette cible

### Direction couleur

La palette doit suggerer :

- encre, precision, intelligence ;
- cuisine chaude, sans tomber dans orange permanent ;
- surfaces claires et sombres premium ;
- accent IA reconnaissable ;
- vert seulement quand une action est validee ou un item est frais.

### Tokens light recommandes

Format recommande : valeurs raw OKLCH pour usage `oklch(var(--token))`.

Important : le repo actuel a historiquement utilise des tokens shadcn/Tailwind
au format HSL consommes via `hsl(var(--token))`. PR1 ne doit jamais coller ces
valeurs OKLCH dans `src/index.css` sans modifier le mapping Tailwind. Sinon les
utilities `bg-primary`, `text-foreground`, `border-border`, etc. deviennent
silencieusement invalides.

```css
:root {
  --background: 98.5% 0.004 260;
  --foreground: 18% 0.012 260;

  --surface: 100% 0 0;
  --surface-muted: 96.5% 0.006 260;
  --surface-raised: 99% 0.004 260;
  --border: 90% 0.010 260;

  --muted: 94.5% 0.006 260;
  --muted-foreground: 47% 0.014 260;

  --primary: 62% 0.150 52;
  --primary-foreground: 99% 0.004 80;
  --primary-hover: 57% 0.155 50;

  --accent-ai: 62% 0.150 255;
  --accent-ai-foreground: 99% 0.004 260;

  --tomato: 61% 0.180 28;
  --saffron: 72% 0.150 75;
  --success: 58% 0.115 150;
  --warning: 74% 0.140 78;
  --destructive: 58% 0.190 25;

  --ring: 62% 0.150 255;
}
```

### Tokens dark recommandes

```css
.dark {
  --background: 14% 0.010 260;
  --foreground: 94% 0.006 260;

  --surface: 18% 0.012 260;
  --surface-muted: 23% 0.012 260;
  --surface-raised: 21% 0.014 260;
  --border: 32% 0.014 260;

  --muted: 25% 0.012 260;
  --muted-foreground: 72% 0.010 260;

  --primary: 74% 0.145 55;
  --primary-foreground: 16% 0.012 260;
  --primary-hover: 78% 0.145 55;

  --accent-ai: 72% 0.130 255;
  --accent-ai-foreground: 14% 0.010 260;

  --tomato: 70% 0.160 28;
  --saffron: 80% 0.130 75;
  --success: 72% 0.105 150;
  --warning: 82% 0.125 78;
  --destructive: 70% 0.165 25;

  --ring: 72% 0.130 255;
}
```

### Compatibilite Tailwind/shadcn existante

Checklist obligatoire PR1 :

- auditer l'etat reel de `src/index.css` et `tailwind.config.ts` avant edition ;
- verifier si une migration PRP-231 HSL -> OKLCH est deja presente dans la
  branche de base ;
- choisir un seul format de tokens pour les couleurs systeme ;
- si les tokens sont raw OKLCH, mapper Tailwind avec `oklch(var(--token))`, pas
  `hsl(var(--token))` ;
- retirer ou migrer les mappings `hsl(var(--background))`,
  `hsl(var(--primary))`, `hsl(var(--foreground))`, etc. pour les tokens touches ;
- conserver une compat temporaire seulement pour les composants legacy Material
  jusqu'a leur retrait PR5.

Mapping attendu si format raw OKLCH :

```ts
colors: {
  background: 'oklch(var(--background) / <alpha-value>)',
  foreground: 'oklch(var(--foreground) / <alpha-value>)',
  card: {
    DEFAULT: 'oklch(var(--surface) / <alpha-value>)',
    foreground: 'oklch(var(--foreground) / <alpha-value>)',
  },
  primary: {
    DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
    foreground: 'oklch(var(--primary-foreground) / <alpha-value>)',
  },
  border: 'oklch(var(--border) / <alpha-value>)',
  ring: 'oklch(var(--ring) / <alpha-value>)',
}
```

Audit requis :

```bash
rg -n "hsl\\(var\\(--" src index.css tailwind.config.ts
rg -n "oklch\\(var\\(--" src index.css tailwind.config.ts
```

Browsers cible :

- Chrome 111+ ;
- Safari 15.4+ ;
- Firefox 113+.

Si une cible navigateur plus ancienne devient obligatoire, PR1 doit garder une
strategie HSL ou fournir un fallback CSS explicite.

### Contraste WCAG a valider avant cloture PR1

Audit approximatif OKLCH -> sRGB effectue le 2026-05-17 sur les tokens cibles
de §5. Les ratios doivent etre mesures dans la PR avec l'outil choisi
(`axe`, Lighthouse ou script contraste), mais les paires ci-dessous sont deja
des signaux de risque.

| Theme | Paire | Ratio approx. | Decision |
|---|---|---:|---|
| light | `foreground` sur `background` | 18.0 | OK AA body |
| light | `muted-foreground` sur `background` | 6.5 | OK AA body |
| light | `primary-foreground` sur `primary` | 3.7 | OK large/icon, pas body 14px |
| light | `accent-ai-foreground` sur `accent-ai` | 3.6 | OK large/icon, pas body 14px |
| light | `destructive-foreground` sur `destructive` | 4.6 | OK AA body |
| dark | `foreground` sur `background` | 16.7 | OK AA body |
| dark | `muted-foreground` sur `background` | 8.0 | OK AA body |
| dark | `primary-foreground` sur `primary` | 8.1 | OK AA body |
| dark | `accent-ai-foreground` sur `accent-ai` | 8.0 | OK AA body |
| dark | `destructive-foreground` sur `destructive` | 6.8 | OK AA body |

Consequence PR1 :

- En light mode, `primary` et `accent-ai` sont des fonds de bouton/badge avec
  texte court, icone ou label large. Ne pas utiliser ces paires pour du body
  text `14px`.
- Si un bouton primaire contient du texte `text-sm`, PR1 doit soit assombrir
  `--primary`, soit utiliser un foreground plus sombre, soit augmenter le poids
  et la taille selon WCAG large text.
- La PR1 ne peut pas etre declaree finie sans table contraste jointe a la PR.

### Regles couleur

- `green` / `emerald` interdits comme couleur de marque ou d'accent principal.
- `orange` permanent interdit comme fond global de page.
- Gradients de page interdits sur les pages outil.
- Gradients acceptes seulement :
  - en shimmer loading tres subtil ;
  - en accent IA limite ;
  - dans un visuel media, jamais comme pattern systematique.
- Toute nouvelle couleur doit passer par un token.
- Toute couleur doit avoir son equivalent dark mode.

## 6. Typographie

### Choix

- PR1 : rester sur la stack actuelle si changer la font cree du risque.
- PR2 ou PR3 : ajouter **Geist Sans** si l'integration est propre.
- Fallback autorise : **Inter Variable**.

### Type scale

| Token | Taille | Usage |
|---|---:|---|
| `text-xs` | 12 | captions, meta, tags compacts |
| `text-sm` | 14 | labels, secondary text, table/list density |
| `text-base` | 16 | body |
| `text-xl` | 20 | section title, card title important |
| `text-2xl` | 24 | page title compact |
| `text-4xl` | 32 | screen title rare |
| `text-5xl` | 40 | auth/landing only, never page outil core |

Regles :

- Pas de font-size base sur viewport width.
- Pas de letter-spacing negatif.
- `text-lg` (18) et `text-3xl` (28) sont volontairement absents de la scale
  core pour limiter les demi-niveaux visuels. Usage seulement avec exception
  documentee `// allow: local typographic exception`.
- Les pages outil privilegient `24` ou `32`, pas des heroes `48+`.
- Les textes dans cards/panels doivent rester denses et scannables.

## 7. Layout system

### Surfaces

- Page background : neutre, sans gradient.
- Page section : layout non encadre, largeur contrainte.
- Card : uniquement item repete, panneau outil, dialog, modal.
- Pas de card dans card sauf cas explicite de liste imbriquee.
- Radius par defaut : `8px`.
- Radius media : `10-12px`.
- `rounded-full` reserve a avatars, dots, pills tres petites.
- Shadows rares. Preferer border, contrast, elevation legere.

### Spacing

Rhythm :

```text
4 / 8 / 12 / 16 / 24 / 32 / 48
```

Regles :

- Mobile : densite utile, pas de grands blancs decoratifs.
- Desktop : utiliser la largeur pour afficher contexte + actions, pas pour
  agrandir sans limite les cards.
- Les actions primaires restent visibles au-dessus du fold sur les pages outil.

## 8. Component system

### Systeme gagnant

Systeme principal : `src/components/ui/*` shadcn/Radix + tokens produit.

Legacy a sortir des pages coeur :

- `src/components/ui/material/Button.tsx`
- `src/components/ui/material/Card.tsx`
- `MaterialYouThemeProvider` si utilise pour overrider les surfaces outil
- `src/design-system/tokens/material-you-tokens.ts` comme source d'identite
  visuelle principale

### Compatibilite Material transitoire

Risque : PR1 change les tokens globaux, mais PR5 seulement retire Material des
surfaces Inventaire/Courses. Sans pont de compatibilite, les pages qui importent
encore `MaterialCard` / `MaterialButton` peuvent casser visuellement pendant
plusieurs PRs.

Decision PRP-237 : **Option A - bridge de compatibilite temporaire**, deja
partiellement present dans `src/styles/material-you.css`.

PR1 doit :

- auditer les CSS variables consommees par Material :

```bash
rg -n "--md-sys|material|MaterialButton|MaterialCard" src/components/ui/material src/design-system src/pages src/components
```

- verifier que les aliases `--md-sys-color-*` de
  `src/styles/material-you.css` couvrent tous les consommateurs Material
  runtime ;
- corriger les overrides contextuels legacy (`breakfast`, `lunch`, `dinner`,
  `snack`, `shopping`, `cooking`) qui remettent des couleurs vertes, purple,
  rose ou orange en source d'identite visuelle ;
- ajouter les aliases manquants dans `src/styles/material-you.css` ou
  `src/index.css` seulement si l'audit montre un consommateur non couvert ;
- annoter les aliases Material avec
  `TODO(PRP-237-PR5): remove after Material pages migrate`;
- ne pas ajouter de nouveau composant Material ;
- ne pas migrer Inventaire/Courses dans PR1, sauf si le bridge est impossible.

Aliases minimum attendus, a adapter a l'audit reel :

```css
:root {
  --md-sys-color-surface: oklch(var(--surface));
  --md-sys-color-surface-container: oklch(var(--surface-muted));
  --md-sys-color-on-surface: oklch(var(--foreground));
  --md-sys-color-outline: oklch(var(--border));
  --md-sys-color-primary: oklch(var(--primary));
  --md-sys-color-on-primary: oklch(var(--primary-foreground));
}

.dark {
  --md-sys-color-surface: oklch(var(--surface));
  --md-sys-color-surface-container: oklch(var(--surface-muted));
  --md-sys-color-on-surface: oklch(var(--foreground));
  --md-sys-color-outline: oklch(var(--border));
  --md-sys-color-primary: oklch(var(--primary));
  --md-sys-color-on-primary: oklch(var(--primary-foreground));
}
```

PR5 retire ensuite ces dependances des pages coeur. PR7 supprime les aliases
si plus aucun consommateur runtime n'existe. Tant que `src/styles/material-you.css`
reste importe, il ne doit jamais changer la personnalite visuelle d'une route
core via un attribut `data-theme-context`.

### Primitives a stabiliser

| Primitive | Fichier cible | Direction |
|---|---|---|
| Button | `src/components/ui/button.tsx` | variants propres, icon sizes stables |
| Card | `src/components/ui/card.tsx` | radius 8-12, border, faible shadow |
| Badge | `src/components/ui/badge.tsx` | semantic tokens, pas couleurs hardcodees |
| Tabs | `src/components/ui/tabs.tsx` | focus visible, mobile scroll safe |
| Dialog | `src/components/ui/dialog.tsx` | focus trap, Escape, return focus |
| AlertDialog | `src/components/ui/alert-dialog.tsx` | confirmations destructives seulement |
| Input/Textarea | `src/components/ui/input.tsx`, `textarea.tsx` | composer assistant + forms |
| EmptyState | `src/components/ui/empty-state.tsx` | pattern unique |
| LoadingState | `src/components/ui/loading-state.tsx` | skeletons sobres |

### Boutons

Variants requis :

- `primary` : action principale.
- `secondary` : action utile mais non principale.
- `ghost` : navigation ou actions secondaires.
- `destructive` : suppression.
- `icon` : bouton carre stable, `44x44` tap target.
- `ai` : action assistant, utilise `accent-ai`, pas violet/purple aleatoire.

## 9. App shell et navigation

### Objectif

Le shell doit ressembler a un produit professionnel, pas a un hub de demos.

### Navigation cible

Avant PRP-224/233 terminee :

1. Recettes
2. Inventaire
3. Courses
4. Anti-gaspi
5. Assistant

Apres PRP-224/233 terminee :

1. Assistant
2. Recettes
3. Inventaire
4. Courses
5. Anti-gaspi

Menus peut devenir une entree separee seulement apres PRP-234.

### Nettoyage navigation

Fichier principal :

- `src/components/navigation/NavigationHub.tsx`

Actions :

- ne plus populer dans `NAVIGATION_CONFIG` les champs legacy non rendus :
  - `funName`
  - `childFriendlyName`
  - `minAge`
  - `requiresSupervision`
  - `availableInChildMode`
  - `gamification`
- garder temporairement les champs optional de l'interface avec un commentaire
  same-line `// allow:` tant que `NavigationPredictor` et
  `useCipherMealPlanning` les lisent encore ;
- supprimer completement ces types seulement dans la PRP qui retire les
  consommateurs runtime ;
- supprimer les restes "Magique", "famille", "enfant", "parental" du shell.
- harmoniser desktop, tablet, mobile :
  - `src/components/navigation/AppNavigation.tsx`
  - `src/components/navigation/DesktopNavigation.tsx`
  - `src/components/navigation/MobileNavigation.tsx`
  - `src/components/navigation/TabletNavigation.tsx`

## 10. Page directions

### `/assistant`

Objectif visuel :

- conversation en premier ;
- input + micro visibles ;
- actions executees sous forme de cards sobres ;
- memoire et historique dans un rail, pas en cards marketing ;
- dark mode excellent.

Changements :

- supprimer les cards "Chat IA", "IA Rapide", "Fonctionnalites IA" ;
- supprimer le look hero/gradient ;
- utiliser `accent-ai` pour la presence assistant ;
- separer clairement :
  - message utilisateur ;
  - reponse assistant ;
  - action proposee ;
  - action executee ;
  - undo possible.

Dependances :

- PRP-223 pour memoire/conversations ;
- PRP-224 pour UX ChatGPT-like ;
- PRP-233 si conservee comme integration surface.

### `/kitchen/recipes`

Objectif visuel :

- experience media-led, mais controlee sur desktop ;
- Feed / Bibliotheque / A verifier / Ajouter ;
- pas de hero orange ;
- pas de gradient texte ;
- cards recettes editorial/premium ;
- image/video bien cadree ;
- badges discrets : source, temps, statut, favori.

Changements :

- remplacer les fonds orange/rouge par `background` / `surface`;
- limiter les media desktop :
  - feed desktop : `max-h-[520px]` ou layout split media + infos ;
  - library cards : ratio `4/5` ou `16/10` selon densite ;
- utiliser `RecipeMediaFrame` / `RecipeSourcePreview` de PRP-232 ;
- garder les tabs en URL state.

### `/pantry/inventory`

Objectif visuel :

- outil dense, fiable, product intelligence ;
- priorite aux aliments, quantites, peremption, actions rapides ;
- pas de 3D par defaut ;
- pas d'emojis categories comme UI primaire ;
- pas de vert decoratif.

Changements :

- remplacer `MaterialCard` / `MaterialButton` ;
- listes ou tableaux responsive ;
- sections utiles :
  - a finir bientot ;
  - ajoutes recemment ;
  - categories ;
  - enrichissement produit ;
  - erreurs/ambiguites a clarifier.

### `/shopping/list`

Objectif visuel :

- checklist mobile-first ;
- groupement clair ;
- ajout vocal/texte rapide ;
- mode magasin retire ou cache tant que non core.

Changements :

- remplacer cards Material ;
- liste compacte ;
- actions iconiques avec labels accessibles ;
- aucun hero.

### `/insights` et `/insights/waste`

Objectif visuel :

- anti-gaspi clair et honnete ;
- event log des aliments jetes ;
- metrics sobres si data reelle ;
- pas de charts vides.

Changements :

- supprimer mock stats ;
- empty state actionnable ;
- utiliser success/warning/destructive semantiques.

### `/settings`

Objectif visuel :

- centre de controle personnel ;
- sections :
  - compte ;
  - preferences ;
  - memoire assistant ;
  - nutrition/bien-etre ;
  - donnees et confidentialite ;
  - apparence.

Changements :

- pas de settings generiques inutiles ;
- copy courte ;
- controles clairs.

### `/auth`

Objectif visuel :

- premier signal premium ;
- pas de split marketing generique ;
- marque + promesse simple ;
- visuel culinaire ou app preview reel, pas gradient abstrait.

Changements :

- retirer palette verte si presente ;
- rendre le formulaire sobre et rassurant ;
- ajouter micro-copy confiance/donnees si pertinent.

Direction layout V1 :

```text
desktop
┌──────────────────────────── app preview / media reel ───────────────────────────┐
│ Smart Pantry Pro                                                               │
│ Cuisine, inventaire et assistant personnel.                                    │
│                                                                                │
│        [formulaire auth compact, surface raised, pas de hero marketing]         │
│        Email                                                                   │
│        Mot de passe                                                            │
│        [Continuer]                                                             │
│        Donnees privees, controlees par vous.                                   │
└────────────────────────────────────────────────────────────────────────────────┘

mobile
Smart Pantry Pro
Cuisine, inventaire et assistant personnel.
[formulaire auth pleine largeur]
```

Le visuel peut etre une capture produit ou un media culinaire sobre. Pas de
fond gradient abstrait, pas de promesse marketing en 4 cards.

## 11. Motion et micro-interactions

Regles :

- `framer-motion` autorise pour transitions courtes et feedback.
- Pas d'animation decorative permanente sur pages outil.
- Duree cible : 120-220 ms.
- Easing par defaut : `cubic-bezier(0.16, 1, 0.3, 1)` pour entrees/sorties
  UI ; skeletons lineaires ; spring seulement pour drag/gesture explicite.
- Respecter `prefers-reduced-motion`.
- Animations utiles :
  - action assistant proposee/executed ;
  - ajout inventaire ;
  - item course coche ;
  - changement tab ;
  - skeleton loading.

Interdits :

- orbs, blobs, bokeh, particules decoratives ;
- gradients animes de fond ;
- motion qui deplace les actions principales.

Exception autorisee : un pulse tres subtil `accent-ai` pendant un streaming ou
une action assistant en cours, si `prefers-reduced-motion` est respecte.

## 12. Modernisation librairies

### Etat observe

- React : 18.3.1
- Vite : 5.4.1
- Tailwind : 3.4.11
- Radix/shadcn presents
- framer-motion 12 present
- Material You custom present

### Strategie

Ne pas melanger upgrade framework et redesign visuel.

PR dediee possible apres PR1-PR6 :

1. Tailwind v4 spike :
   - branch separee ;
   - verifier CSS-first theme ;
   - verifier shadcn compatibility ;
   - comparer build time et output CSS.
2. React 19 spike :
   - branch separee ;
   - verifier Radix, router, form libs, tests ;
   - aucun redesign dans la meme PR.
3. Vite upgrade :
   - branch separee si changement majeur ;
   - comparer build local et Vercel.

Decision :

- PRP-237 peut moderniser le look sans attendre React 19/Tailwind v4.
- Les upgrades techniques ne doivent pas bloquer la direction visuelle.

## 13. Fichiers cibles

### Fondations

| Fichier | Action |
|---|---|
| `src/index.css` | Remplacer identite verte par tokens PRP-237 light/dark. |
| `tailwind.config.ts` | Mapper tokens vers Tailwind, reduire dependance HSL ancienne. |
| `src/components/ui/button.tsx` | Stabiliser variants et tailles. |
| `src/components/ui/card.tsx` | Stabiliser radius, border, elevation. |
| `src/components/ui/badge.tsx` | Tokens semantiques. |
| `src/components/ui/tabs.tsx` | Focus, density, mobile scroll. |

### Shell

| Fichier | Action |
|---|---|
| `src/components/navigation/NavigationHub.tsx` | Garder seulement les champs legacy optional avec `// allow:` tant que les consommateurs existent ; ne pas les populer dans la config ; nouvelle nav. |
| `src/components/navigation/AppNavigation.tsx` | Harmoniser shell. |
| `src/components/navigation/DesktopNavigation.tsx` | Sidebar premium. |
| `src/components/navigation/MobileNavigation.tsx` | Bottom nav claire. |
| `src/components/navigation/TabletNavigation.tsx` | Cohabitation desktop/mobile. |

### Assistant

| Fichier | Action |
|---|---|
| `src/pages/assistant/AssistantDashboard.tsx` | Remplacer vitrine par conversation selon PRP-224/233. |
| `src/components/assistant/*` | Cards action, composer, thread, memory rail. |
| `src/hooks/useAssistantVoice.ts` | UI local voice state si composer. |

### Recettes

| Fichier | Action |
|---|---|
| `src/pages/Recipes.tsx` | Orchestrateur sobre, plus de hero gradient. |
| `src/components/recipes/tabs/RecipeFeedTab.tsx` | Feed media-led mais controle desktop. |
| `src/components/recipes/tabs/RecipeLibraryTab.tsx` | Cards denses et premium. |
| `src/components/recipes/tabs/RecipeInboxTab.tsx` | Imports a verifier, sans bruit. |
| `src/components/recipes/RecipeCard.tsx` | Tokeniser couleurs/radius. |
| `src/components/recipes/CatalogRecipeCard.tsx` | Tokeniser couleurs/radius. |
| `src/components/recipes/UserRecipeCard.tsx` | Tokeniser couleurs/radius. |

### Inventaire et courses

| Fichier | Action |
|---|---|
| `src/pages/Inventory.tsx` | Retirer Material, 3D non defaut, liste outil. |
| `src/pages/SmartShoppingList.tsx` | Retirer Material, checklist premium. |
| `src/pages/shopping/ShoppingDashboard.tsx` | Pas de hero, vrais etats seulement. |
| `src/components/shopping/*` | Tokeniser, simplifier. |
| `src/components/inventory/*` | Tokeniser, densifier. |

### Anti-gaspi, settings, auth

| Fichier | Action |
|---|---|
| `src/pages/WasteInsightsPage.tsx` | Log + metrics reelles, empty state. |
| `src/pages/InsightsPage.tsx` | Hub sobre ou redirect selon PRP-230. |
| `src/pages/Settings.tsx` | Data/control center. |
| `src/pages/Auth.tsx` | Premium first impression. |

## 14. PR splitting

### Ordre et dependances

```text
Baseline screenshots + decisions §0
  -> PR1 tokens/primitives/Material bridge
    -> PR2 shell/navigation
    -> PR4 recipes
    -> PR5 inventory/shopping
      -> PR6 anti-gaspi/settings/auth
      -> PR7 legacy visual cleanup

PR3 assistant visual surface attend que les composants PRP-224/233 soient
presents sur la branche de base. Ne pas dependendre d'un numero de PR GitHub :
la DoR technique est la presence de `AssistantConversationSurface.tsx`,
`AssistantMessageThread.tsx`, `AssistantRecipeProposals.tsx` et de leurs hooks
sur `main` ou la branche de base du sprint.

PR8 framework modernization est separe et commence seulement apres PR1-PR7
ou sur une branche spike dediee.
```

DoR globale avant PR1 :

- decisions §0 cochees ou fallback 48h active ;
- baseline screenshots capturee dans `output/visual-baselines/2026-05-17/`
  et attachee a la PR de lancement, ou versionnee dans
  `docs/visual-baselines/2026-05-17/` si le poids reste raisonnable ;
- branche de base a jour avec PRP-231 ;
- verifier que PRP-230 et PRP-236 sont en etat executable avant PR6/PR7, car
  ces PRs touchent respectivement routing/shell et cleanup legacy ;
- audit PRP-230/PRP-236 a faire avant ouverture de PR6/PR7 :
  - lire le statut en tete de fichier ;
  - verifier qu'elles ont un scope inclus/exclus, un PR splitting et une DoD ;
  - si l'une reste `DRAFT` ou contredit l'etat code courant, bloquer PR6/PR7
    et remettre la PRP concernee a jour avant implementation ;
- DRI design nomme dans la PR de lancement pour trancher les exceptions `allow:`.

### PR1 - Brand tokens + primitives

Taille : **M/L**. C'est une PR fondation, pas un simple changement de couleurs.

Scope :

- `src/index.css`
- `tailwind.config.ts`
- `button.tsx`
- `card.tsx`
- `badge.tsx`
- `tabs.tsx`
- `empty-state.tsx`
- `loading-state.tsx`
- bridge temporaire Material (`--md-sys-*`) si des consommateurs existent

Verification :

```bash
rg -n "hsl\\(var\\(--|oklch\\(var\\(--" src/index.css tailwind.config.ts
rg -n "--md-sys|MaterialButton|MaterialCard" src/components/ui/material src/design-system src/pages src/components
npm run build
npx tsc -p tsconfig.json --noEmit
npm run lint
npm run test
```

DoD PR1 :

- Le vert n'est plus la couleur primaire.
- Light/dark tokens couverts.
- `tailwind.config.ts` ne mappe plus les tokens touches avec `hsl(var(--...))`
  si les valeurs sont OKLCH.
- Les composants Material encore presents ne cassent pas visuellement grace au
  bridge temporaire.
- Table contraste WCAG jointe ; `primary` et `accent-ai` light mode ne sont
  pas utilises pour du body text tant que leur ratio reste sous 4.5:1.
- Aucun changement de route.
- Screenshots avant/apres sur les 8 routes §15 en desktop/mobile et light/dark,
  car les tokens globaux affectent toute l'app.

### PR2 - App shell + navigation cleanup

Taille : **M**.

Scope :

- navigation files ;
- suppression des valeurs legacy famille/gamification dans la config visible ;
- conservation temporaire des champs optional avec `// allow:` si des services
  runtime les lisent encore ;
- nouvelle densite shell ;
- aucune refonte page profonde.

Verification :

```bash
rg -n "funName|childFriendlyName|minAge|requiresSupervision|availableInChildMode|gamification|Magique" src/components/navigation | grep -v "allow:"
npm run build
npx tsc -p tsconfig.json --noEmit
npm run test
```

DoD PR2 :

- Nav desktop/mobile/tablet coherente.
- Pas de wording famille/gamification dans shell.
- Les champs legacy optional restants sont documentes, non populer, et lies a
  leur PRP de retrait.
- Keyboard nav OK.

### PR3 - Assistant visual surface

Taille : **M/L**.

Prerequis :

- ne pas demarrer tant que `AssistantConversationSurface.tsx`,
  `AssistantMessageThread.tsx`, `AssistantRecipeProposals.tsx` ou equivalents
  ne sont pas presents sur la branche de base ;
- si ces fichiers ne sont pas mergees, PR3 reste en attente et PR4/PR5 avancent.

Scope :

- aligner `/assistant` avec PRP-224/233 ;
- enlever vitrine ;
- composer + thread + action cards si backend deja pret ;
- sinon fake-free empty state conversationnel.

Verification :

```bash
rg -n "Chat IA|IA Rapide|Fonctionnalites IA|Assistant intelligent alimentaire" src/pages src/components
npm run build
npx tsc -p tsconfig.json --noEmit
npm run test
```

DoD PR3 :

- `/assistant` ne ressemble plus a une landing page.
- Le FAB global et la page assistant ne racontent pas deux experiences
  differentes.
- Mobile keyboard ne masque pas le composer.

### PR4 - Recipes visual system

Taille : **M**.

Scope :

- retirer hero orange/gradient ;
- cards recettes premium ;
- feed desktop controle ;
- tabs stables ;
- media frames.

Verification :

```bash
rg -n "(from|to|via|text|bg|border|ring)-(orange|red|purple|pink)-|bg-gradient-to|text-transparent|bg-clip-text" src/pages/Recipes.tsx src/components/recipes
npm run build
npx tsc -p tsconfig.json --noEmit
npm run test
```

DoD PR4 :

- `/kitchen/recipes?tab=feed` visuellement premium desktop/mobile.
- `/kitchen/recipes?tab=library` dense et lisible.
- Media non geants sur desktop.

### PR5 - Inventory + shopping

Taille : **M/L**.

Scope :

- retirer Material imports des surfaces coeur ;
- nouvelle densite inventaire ;
- checklist courses ;
- pas de 3D par defaut ;
- pas de mode magasin visible si non core.

Verification :

```bash
rg -n "MaterialButton|MaterialCard" src/pages/Inventory.tsx src/pages/SmartShoppingList.tsx src/pages/shopping src/components/inventory src/components/shopping
npm run build
npx tsc -p tsconfig.json --noEmit
npm run test
```

DoD PR5 :

- Aucun import Material sur inventaire/courses.
- Liste utilisable mobile.
- Empty/loading states honnetes.

### PR6 - Anti-gaspi, settings, auth polish

Taille : **S/M**.

Scope :

- anti-gaspi sobre ;
- settings en centre de controle ;
- auth premium ;
- pas de mock data.

Verification :

```bash
rg -n "mock|fake|demo|placeholder" src/pages/WasteInsightsPage.tsx src/pages/InsightsPage.tsx src/pages/Settings.tsx src/pages/Auth.tsx
npm run build
npx tsc -p tsconfig.json --noEmit
npm run test
```

DoD PR6 :

- Les stats visibles ont une vraie source.
- Empty states actionnables.
- Auth donne envie d'entrer dans le produit.

### PR7 - Legacy visual cleanup

Taille : **M**.

Scope :

- audit repo-wide des gradients/couleurs hardcodees ;
- retirer imports Material restants hors demo ;
- archiver demo/dev pages selon PRP-236 ;
- documenter exceptions.

Verification :

```bash
rg -n "bg-gradient-to|(text|bg|border|ring|from|to|via)-(green|emerald|orange|red|purple|pink)-|MaterialButton|MaterialCard" src
npm run build
npx tsc -p tsconfig.json --noEmit
npm run test
```

DoD PR7 :

- Exceptions documentees.
- Core surfaces propres.
- Demos archivees ou retirees selon PRP-236.

### PR8 - Framework modernization spike

Taille : **M/L** selon upgrade choisi.

Scope :

- Tailwind v4 spike en premier, car il est le plus directement lie aux tokens
  CSS-first.
- React 19 spike ensuite, dans une PR separee.
- Vite upgrade separe si necessaire.
- Pas de redesign visuel dans cette PR.

Verification :

```bash
npm run build
npx tsc -p tsconfig.json --noEmit
npm run lint
npm run test
```

DoD PR8 :

- rapport avant/apres build ;
- incompatibilites listees ;
- rollback facile.

## 15. Gates QA et screenshots

### Baseline obligatoire avant PR1

Avant toute edition PR1, capturer les routes ci-dessous en :

- desktop `1440x900` ;
- mobile `390x844` ;
- light mode ;
- dark mode.

Stockage :

```text
output/visual-baselines/2026-05-17/
```

ou, si la taille reste acceptable et la team decide de versionner :

```text
docs/visual-baselines/2026-05-17/
```

Nom de fichier recommande :

```text
assistant-desktop-light.png
assistant-desktop-dark.png
assistant-mobile-light.png
assistant-mobile-dark.png
recipes-feed-desktop-light.png
...
```

La PR1 ne demarre pas tant que cette baseline n'est pas capturee et attachee
explicitement a la PR de lancement. Par defaut, ne pas versionner de PNG lourds
dans git ; preferer `output/visual-baselines/` + attachments de PR. Si les PNG
sont commites, utiliser Git LFS ou garder uniquement un echantillon leger.

Outil recommande :

- Playwright script local `scripts/capture-visual-baselines.mjs` ou commande
  equivalente ;
- authentification via variables d'environnement existantes de QA ;
- generation des 8 routes x 2 viewports x 2 themes = **32 screenshots** ;
- la PR indique le chemin des captures et les captures comparees.

### Routes a capturer

Desktop `1440x900` et mobile `390x844` :

- `/assistant`
- `/kitchen/recipes?tab=feed`
- `/kitchen/recipes?tab=library`
- `/pantry/inventory`
- `/shopping/list`
- `/insights/waste`
- `/settings`
- `/auth`

### Grep gates

Avant merge de chaque PR :

```bash
rg -n "(text|bg|border|ring|from|to|via)-(green|emerald)-" src
rg -n "bg-gradient-to|(text|bg|border|ring|from|to|via)-(orange|red|purple|pink)-" src
rg -n "MaterialButton|MaterialCard" src
rg -n "Magique|funName|childFriendlyName|availableInChildMode|requiresSupervision" src | grep -v "allow:"
rg -n "rounded-3xl|rounded-full" src/pages src/components
```

Interpretation :

- `(green|emerald)` peut exister pour success/freshness seulement. Chaque usage
  legitime doit etre localise, semantique et documentable.
- `bg-gradient-to` doit tendre vers zero sur pages outil coeur.
- `MaterialButton|MaterialCard` doit tendre vers zero hors demo/archive.
- `Magique` et champs famille doivent etre zero dans la navigation, sauf
  champs optional explicitement marques `// allow:` pour compat runtime.
- `rounded-full` autorise pour avatars/dots/pills, pas pour cards massives.

Pour une exception volontaire dans un fichier touche, ajouter un commentaire
sur la meme ligne que l'usage ou dans la meme expression JSX :

```ts
className="text-green-600" /* allow: semantic success state, not brand color */
```

Les greps doivent etre relus avec :

```bash
rg -n "(text|bg|border|ring|from|to|via)-(green|emerald)-" src | grep -v "allow:"
```

Un commentaire `allow:` sur la ligne precedente ne suffit pas, car le gate
`grep -v "allow:"` ne le verra pas. Si une exception multi-ligne est necessaire,
la PR doit la lister explicitement dans la description.

Follow-up tooling recommande : ajouter `npm run check:visual` qui execute ces
greps, imprime les compteurs et compare au baseline de §1.1.

### Visual QA

Chaque PR doit ajouter a sa description :

- screenshots avant/apres ;
- mobile + desktop ;
- light + dark si la PR touche tokens/surfaces globales ;
- liste des exceptions volontairement non corrigees.

## 16. Accessibilite

Garder les exigences PRP-231 et ajouter :

- contraste AA sur toutes les nouvelles combinaisons tokens ;
- focus visible sur nav, tabs, cards cliquables, composer assistant ;
- `aria-label` sur boutons icones ;
- target minimum `44x44` ;
- aucun click principal bloque par `stopPropagation` enfant ;
- support `prefers-reduced-motion` ;
- axe dev sans critical issue sur les routes core touchees.

## 17. Performance

Budget cible :

- chaque route core doit documenter son bundle avant/apres si touchee ;
- warning a `+50 kB` gzip sur un chunk de route touchee ;
- blocage a `+150 kB` gzip sans justification explicite et follow-up ticket ;
- Lighthouse score cible `>= 90` sur les 4 routes prioritaires apres PR7 ;
- aucune nouvelle lib de design lourde sans justification ;
- pas d'animation permanente couteuse ;
- pas d'image non optimisee dans first viewport ;
- lazy load des panneaux secondaires si necessaire.

Routes a surveiller en priorite :

- `/assistant`
- `/kitchen/recipes`
- `/pantry/inventory`
- `/shopping/list`

Si une route depasse le budget PRP-231, la PR doit inclure :

- justification ;
- follow-up ticket ;
- capture bundle.

## 18. Risques

| Risque | Mitigation |
|---|---|
| Refonte trop large, difficile a merger | PR splitting strict PR1-PR8. |
| Taste drift entre PRs | Decisions §0 + screenshots obligatoires. |
| Regression fonctionnelle | Pas de changement backend/schema dans PRP-237. |
| Material You casse entre PR1 et PR5 | Bridge `--md-sys-*` temporaire en PR1, retrait par surface en PR5, suppression du bridge en PR7. |
| Tailwind/React upgrade casse beaucoup | PR8 separee, jamais dans PR1-PR6. |
| Design "tendance" mais moins utilisable | Pages outil d'abord, landing/hero interdits. |
| Chevauchement avec PRP-231 tokens | Verifier que PRP-231 est mergee ou explicitement abandonnee avant PR1 ; ne pas maintenir deux sources de tokens. |
| Gates grep ignores par bruit | `allow:` same-line obligatoire + futur `npm run check:visual`. |

## 19. Non-objectifs

- Ne pas refaire le moteur assistant.
- Ne pas implementer PRP-225, PRP-226, PRP-227.
- Ne pas changer les schemas Supabase.
- Ne pas ajouter de nouvelle navigation majeure hors decisions PRP-230/234.
- Ne pas introduire une grosse lib UI payante ou lourde.
- Ne pas faire une refonte "marketing" au lieu d'une refonte produit.

## 20. Definition of Done globale

- Le vert n'est plus la couleur de marque.
- Les pages coeur n'utilisent plus de gradients de fond decoratifs.
- Les pages coeur utilisent tokens produit light/dark.
- `tailwind.config.ts` et `src/index.css` utilisent un format couleur coherent
  (`oklch(var(--...))` si tokens OKLCH raw).
- `MaterialButton` et `MaterialCard` sont absents des surfaces coeur.
- Les aliases Material temporaires sont supprimes ou documentes comme
  exceptions avec date de retrait.
- Navigation sans wording famille/gamification.
- `/assistant` ne ressemble pas a une page vitrine.
- `/kitchen/recipes` donne une impression premium media-led.
- `/pantry/inventory` et `/shopping/list` sont denses, utiles, mobiles.
- Screenshots avant/apres joints a chaque PR.
- `npm run build` green.
- `npx tsc -p tsconfig.json --noEmit` green.
- `npm run lint` green.
- `npm run test` green ou exceptions listees.
- Lighthouse `>= 90` sur `/assistant`, `/kitchen/recipes`,
  `/pantry/inventory`, `/shopping/list` apres PR7.
- Aucune mock data visible ajoutee.
- Toute exception grep est documentee.

## 21. Prochaine action recommandee

Avant PR1 :

1. Capturer la baseline visuelle :

```text
output/visual-baselines/2026-05-17/
```

Routes :

- `/assistant`
- `/kitchen/recipes?tab=feed`
- `/kitchen/recipes?tab=library`
- `/pantry/inventory`
- `/shopping/list`
- `/insights/waste`
- `/settings`
- `/auth`

Variantes :

- desktop light/dark ;
- mobile light/dark.

2. Produire 2 ou 3 directions visuelles rapides :

- **Ink + Saffron** : premium culinaire chaud, clair/dark solide.
- **Porcelain + Electric Blue** : assistant/intelligence plus marque.
- **Dark Culinary OS** : dark-first, app de controle premium.

Ces directions peuvent etre faites en mock statique ou image concept.

3. Ouvrir PR1 seulement apres :

- decisions §0 cochees ou fallback 48h active ;
- baseline capturee ;
- etat PRP-231 verifie ;
- `tailwind.config.ts` mapping OKLCH confirme ;
- bridge Material existant dans `src/styles/material-you.css` verifie ;
- table contraste WCAG jointe ;
- DRI design nomme.

Comme les tokens sont deja partiellement en place, PR1 commence par
stabilisation : contraste, primitives, bridge Material, screenshots et gates,
sans toucher les flows metier.
