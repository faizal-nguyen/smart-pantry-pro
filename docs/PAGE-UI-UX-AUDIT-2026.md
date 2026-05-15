# Audit UI/UX par page - Smart Pantry Pro 2026

> Date : 2026-05-13  
> Scope : routes visibles dans `src/App.tsx`, navigation principale, pages encore presentes dans `src/pages`.  
> Objectif : decider quoi garder, ameliorer, changer ou supprimer pour une app plus moderne, claire, adulte et centree sur recettes + inventaire + assistant.

---

## 1. Verdict global

L'app a deja commence sa "product diet" : les routes games, store mode,
family/parental, assistant/nutrition et assistant/suggestions sont redirigees
vers les surfaces coeur. C'est le bon mouvement.

Le probleme restant n'est plus seulement "trop de routes visibles", mais :

- trop de pages qui se ressemblent ou servent de wrapper,
- trop de wording ancien ("Dashboard", "Garde-Manger", "IA Rapide",
  "Analyses avancees"),
- navigation encore marquee par l'ancien mode famille/gamification dans le code,
- assistant encore presente comme page vitrine au lieu d'une vraie conversation,
- meal planning encore branche sur une ancienne page Cipher,
- settings trop generiques et pas assez orientes memoire/donnees/personnalisation,
- pages test/demo encore presentes dans `src/pages`.

Direction recommandee :

> Une app calme, premium, personnelle : **Assistant, Recettes, Inventaire,
> Courses, Menus, Anti-gaspi, Reglages**.

---

## 2. Principes UX a appliquer partout

### 2.1 Wording

Remplacer le vocabulaire vague ou daté :

| Actuel | Recommandé |
|---|---|
| Dashboard | Vue d'ensemble, Aujourd'hui, Centre de controle |
| Garde-Manger | Inventaire |
| Assistant IA | Assistant |
| Chat IA | Conversation |
| Analyses | Anti-gaspi / Suivi |
| Planification Repas | Menus |
| Catalogue de recettes | Bibliotheque |
| Inbox | A verifier / Imports |
| IA Rapide | Demander a l'assistant |
| Fonctionnalites IA | Ce que l'assistant peut faire |

Regle : le wording doit expliquer l'action, pas la technologie.

### 2.2 Navigation

Navigation principale cible :

1. Assistant
2. Recettes
3. Inventaire
4. Courses
5. Menus
6. Anti-gaspi

Settings reste secondaire.

Decision produit a valider :

- Mettre **Assistant** en premier est un pari voice-first fort. C'est coherent
  avec PRP-221/223/224, mais ce n'est pas un simple changement de label.
- Tant que `/assistant` n'est pas une vraie conversation, garder Recettes ou
  Inventaire comme premiere surface peut etre plus honnete.
- Menus comme section separee augmente la discoverability, mais ajoute une
  entree nav. Si la page reste legacy/Cipher, Menus doit rester sous Recettes
  ou etre cache.

### 2.3 Design

L'app doit quitter le style "demo joviale/gamifiee" :

- moins de gradients orange/rouge/purple,
- moins d'emojis dans les headings/cartes,
- moins de cards marketing,
- plus de listes denses, sections calmes, media bien tailles,
- boutons plus explicites et plus sobres,
- typographie plus compacte sur les pages outil,
- actions primaires toujours claires.

### 2.4 Pages outil, pas landing pages

Chaque page doit commencer par l'experience utile, pas par une presentation.

Exemple :

- `/assistant` doit ouvrir une conversation, pas une page "Fonctionnalites IA".
- `/shopping/list` doit montrer la liste, pas un hero.
- `/kitchen/recipes` doit montrer le feed/library, pas une promo.

### 2.5 Accessibilite minimale

Regles non negociables :

- Tap targets minimum 44 x 44 px pour boutons/icones.
- Tout bouton icone a un `aria-label` ou tooltip lisible.
- Les modales/dialogs ont focus trap, Escape, focus initial et retour focus.
- Les zones cliquables principales ne doivent jamais perdre leur click via
  `stopPropagation` sur un enfant, sauf si le sous-element porte une action
  distincte.
- Contraste texte/fond conforme WCAG AA.
- Navigation clavier utilisable sur les pages outil principales.

### 2.6 Budget performance

Budget cible V1 :

- LCP < 2.5 s sur laptop standard en local/prod.
- JS critique par route principale < 250 kB gzip si possible.
- Aucune page outil ne charge une grosse lib non necessaire a son premier rendu.
- `/kitchen/recipes`, `/pantry/inventory`, `/assistant`, `/shopping/list` doivent
  etre surveillees en priorite.

Point d'attention actuel :

- `InventoryPage` a deja ete observee comme lourde dans le build. Toute refonte
  doit inclure code splitting, suppression debug/demo et verification bundle.

### 2.7 Design tokens

"Moins de gradients" ne suffit pas. Il faut verrouiller un systeme :

- palette OKLCH sobre : fond, surface, surface-muted, border, text,
  text-muted, accent, danger, success, warning ;
- type scale outil : 12 / 14 / 16 / 20 / 24 / 32 / 40 ;
- radius : 6-8 px par defaut, pas de gros arrondis enfantins ;
- spacing rhythm : 4 / 8 / 12 / 16 / 24 / 32 ;
- boutons : primary, secondary, ghost, destructive, icon ;
- cards reservees aux items repetes, pas aux sections entieres.

Dark mode :

- Les tokens doivent exister en light et dark.
- Material You peut rester provider technique, mais les pages outil ne doivent
  pas changer de personnalite visuelle d'une route a l'autre.
- Decision : Material You orchestre l'adaptation/theme runtime ; les tokens
  produit fixent les couleurs finales autorisees pour garder une identite
  stable.
- Toute nouvelle couleur doit avoir son equivalent dark mode avant merge.

### 2.8 Responsive et media

Regle mobile-first + desktop sane :

- mobile : feed vertical 9:16 acceptable ;
- desktop : ne pas afficher des videos/images 9:16 geantes sur toute la largeur ;
- desktop recettes : preferer colonne media limitee + panneau infos, ou cards
  16:10 / 4:5 selon contexte ;
- aucune image ne doit rendre le texte ou les actions secondaires invisibles.

### 2.9 Donnees honnetes

Principe general :

- aucune mock data visible en production ;
- aucune "Activite recente", "stats", "objectifs", "recommandations" si la
  source de donnees reelle n'existe pas ;
- utiliser des empty states honnetes et actionnables.

### 2.10 Niveaux de scope

Chaque recommandation de cet audit doit etre classee :

- **Wording** : labels/copy, faible risque, applicable vite.
- **Structure** : route/nav/shell, risque moyen, demande smoke test.
- **Refonte produit** : nouveaux composants, data runtime, moteur reco ou
  assistant complet, PRP dediee.

### 2.11 Loading states

Patterns attendus :

- Skeletons pour listes/cartes chargees depuis Supabase.
- Spinner seulement pour actions courtes ou route-level Suspense.
- Message de chargement contextualise si > 800 ms.
- Aucun ecran blanc pendant auth/session check.
- Toute action destructive/longue doit afficher progress ou disabled state.

### 2.12 Empty states

Pattern unique :

1. titre honnete,
2. phrase courte qui explique pourquoi c'est vide,
3. CTA primaire qui cree de la valeur,
4. lien secondaire facultatif.

Exemple :

- "Aucune recette a verifier"
- "Les imports TikTok, Instagram et newsletter apparaitront ici."
- CTA : "Ajouter une recette"

### 2.13 i18n / wording source

V1 peut rester 100% francais. Mais les nouvelles surfaces doivent eviter de
hardcoder des textes disperses dans des composants massifs.

Regle :

- regrouper les grands labels par page ou module ;
- eviter les emojis comme substitut a un vrai wording ;
- garder une terminologie stable pour pouvoir traduire plus tard.

### 2.14 Donnees et state

Les problemes UX viennent souvent d'un state flou : loading incoherent,
donnees dupliquees, invalidation manquante, empty states faux.

Regles V1 :

- Server state : TanStack Query par defaut pour les donnees Supabase/API.
- Client state local : `useState` / `useReducer` dans le composant.
- Client state transverse : Zustand uniquement si plusieurs surfaces en ont
  vraiment besoin.
- Eviter de dupliquer le meme server state dans un store client.
- Toute mutation doit declarer son invalidation query/cache.
- Les events DOM custom doivent rester exceptionnels et documentes. Exemple
  existant a auditer : `src/lib/agentEvents.ts`.

---

## 3. Audit page par page

### 3.1 `/` - Root redirect

**Etat actuel**

- Verifie la session Supabase.
- Redirige vers `/insights` si connecte, `/auth` sinon.

**Garder**

- Oui, garder comme route technique.

**Changer**

- Rediriger l'utilisateur connecte vers `/assistant` ou `/kitchen/recipes`,
  pas `/insights`.
- Reco : `/assistant` si la vision devient voice-first ; sinon `/kitchen`.

**Wording/UI**

- Loader actuel minimal OK, mais peut devenir un splash discret avec logo.

**Priorite**

- P1 : changer la destination post-login.

---

### 3.2 `/auth` - Connexion

**Etat actuel**

- Page fonctionnelle.
- Wording simple.

**Garder**

- Oui.

**Ameliorer**

- Moderniser visuellement : moins formulaire brut, plus app premium.
- Ajouter 2 lignes de valeur produit :
  - "Toutes tes recettes, ton inventaire et ton assistant cuisine au meme endroit."
  - "Importe, cuisine, planifie, evite le gaspillage."
- Clarifier login/signup.

**Supprimer**

- Rien, sauf tout wording trop marketing si present.

**Priorite**

- P2.

---

### 3.3 `/onboarding` - Onboarding

**Etat actuel**

- Page courte.
- Route utile mais probablement trop generale.

**Garder**

- Oui, mais en version courte.

**Changer**

- Onboarding en 3 choix maximum :
  1. Importer mes recettes.
  2. Ajouter mon inventaire.
  3. Activer l'assistant vocal.

**Wording**

- Remplacer "passer l'onboarding" par "Configurer plus tard".

**Supprimer**

- Toute logique gamifiee, tutoriel long ou education avancee.

**Priorite**

- P2.

---

### 3.4 `/pantry` - Inventaire overview

**Etat actuel**

- Dashboard pantry avec actions rapides.
- Wording "Garde-Manger".
- Ajout rapide utile.
- Section "A consommer d'abord" utile.

**Garder**

- Ajout rapide.
- Produits a consommer d'abord.
- CTA vers inventaire.

**Ameliorer**

- Renommer le **label navigation** en **Inventaire** sans changer l'URL
  `/pantry` ni `/pantry/inventory`.
- Premier ecran : "Ce qui demande ton attention" :
  - expire aujourd'hui,
  - expire bientot,
  - faible stock,
  - dernier ajout.
- Ajouter action voice-first : "Dire ce que j'ai achete".
- Ajouter action anti-gaspi : "J'ai jete un produit".

**Changer**

- Supprimer les traces child/family/gamification dans la navigation et le code
  lie a cette page.
- Remplacer "Ajouter un produit en 2 secondes" par "Ajouter rapidement".

**Priorite**

- P1 wording/navigation. Les nouvelles sections data ("faible stock",
  "dernier ajout") sont P2 si elles demandent un hook runtime.

---

### 3.5 `/pantry/inventory` - Inventaire complet

**Etat actuel**

- Route coeur.
- Page via `InventoryPage` wrapper + `Inventory`.

**Garder**

- Oui, page essentielle.

**Ameliorer**

- Vue dense avec filtres clairs :
  - Tous,
  - A finir,
  - Expire,
  - Frais,
  - Epicerie,
  - Congelateur.
- Actions rapides par item :
  - utiliser,
  - jeter,
  - modifier quantite,
  - enrichir produit,
  - voir recettes.
- Ajouter badges OpenFoodFacts quand PRP-225 arrive.

**Wording**

- "Produits" plutot que "Inventaire complet des produits".
- "A finir" plutot que "alertes".

**Supprimer**

- Scanner si non fonctionnel ou non dedie.
- Toute action qui ouvre une sous-route factice.

**Priorite**

- P1/P2.

---

### 3.6 `/kitchen` - Cuisine overview

**Etat actuel**

- Dashboard avec cartes :
  - Parcourir les Recettes,
  - Mes Favoris,
  - Planification Repas,
  - Activite Recente.
- Les stats mocks ont ete retirees.

**Garder**

- Oui, mais seulement si la page devient un vrai hub.

**Ameliorer**

- Intention produit possible : **Aujourd'hui en cuisine**.
- Attention : ce n'est pas un simple wording. Les blocs ci-dessous demandent
  des donnees runtime nouvelles et doivent etre traites comme backlog PRP/feature.
- Remplacer les grosses cartes par :
  - "Continuer" : derniere recette ouverte/import en attente.
  - "A cuisiner avec ce que tu as".
  - "A verifier" : imports newsletter/social.
  - "Menus de la semaine".

**Changer**

- "Parcourir les Recettes" -> "Ouvrir mes recettes".
- "Planification Repas" -> "Menus".
- "Activite Recente" ne doit apparaitre que si vraie data.

**Supprimer**

- Route `/kitchen/favorites` separee si elle affiche juste `RecipesPage`.
  Preferer un filtre/favoris dans `/kitchen/recipes`.

**Priorite**

- P1 pour wording simple ("Recettes", "Menus").  
- P2/PRP dediee pour "Aujourd'hui en cuisine" avec last-opened,
  recipe-inventory matching et weekly plans.

---

### 3.7 `/kitchen/recipes` - Recettes

**Etat actuel**

- Page coeur.
- `Recipes.tsx` est tres long (~875 lignes).
- Onglets actuels : explore/library/inbox/import selon le code.
- Wording encore hybride : catalogue, tendances, inbox, import.

**Garder**

- Oui, c'est une des pages les plus importantes.
- Garder :
  - Feed,
  - Library,
  - Inbox/A verifier,
  - Import.

**Ameliorer**

- Transformer en experience unique :
  - `Feed` : scroll visuel moderne, media controle, cards plus petites sur web.
  - `Bibliotheque` : grille/list dense, filtres cuisine/source/duree.
  - `A verifier` : imports sociaux/newsletter a valider.
  - `Ajouter` : URL, texte, photo, video, email.
- Sur desktop, ne pas utiliser des images 9:16 enormes qui rendent la page
  illisible. Le feed web doit etre limite a une colonne media + panneau info,
  ou cards 16:10/4:5.

**Wording**

| Actuel | Recommandé |
|---|---|
| Explore | Feed |
| Library | Bibliotheque |
| Inbox | A verifier |
| Import | Ajouter |
| Tendances du moment | A essayer / Nouvelles recettes |
| Catalogue | Bibliotheque |

**Changer**

- Split technique de `Recipes.tsx` :
  - `RecipeFeedTab`,
  - `RecipeLibraryTab`,
  - `RecipeInboxTab`,
  - `RecipeImportTab`,
  - `RecipeCard`.

**Supprimer**

- Les modales debug/test.
- Les CTA onboarding qui ne servent plus.
- Les labels "🎉 Bienvenue" si l'app vise un ton plus adulte.

**Priorite**

- P0/P1.

---

### 3.8 `/kitchen/recipes/:id` - Detail recette

**Etat actuel**

- Page essentielle.
- Actions : edit/delete/share/favorite, ajouter ingredients, cuisiner.
- Bug wording/navigation : un fallback navigue encore vers `/recipes`.

**Garder**

- Oui.

**Ameliorer**

- Repenser hierarchy :
  1. media/photo/video/source,
  2. titre + source + temps,
  3. actions primaires : Cuisiner, Ajouter les manquants, Modifier,
  4. ingredients,
  5. instructions,
  6. notes/journal.
- Ajouter module video/link preview directement visible.
- Ajouter "J'ai cuisiné cette recette" avec feedback.

**Wording**

- "Cuisiné" -> "Marquer comme cuisinée".
- "Décrémenter l'inventaire" ne doit jamais apparaitre tel quel.
- "Informations supplémentaires" -> "Notes et source".

**Changer**

- Fixer les navigations legacy vers `/kitchen/recipes`.
- Confirmation delete plus explicite.

**Supprimer**

- Icônes sans tooltip/label si elles ne sont pas évidentes.

**Priorite**

- P1.

---

### 3.9 `/kitchen/recipes/:id/edit` - Edition recette

**Etat actuel**

- Formulaire complet, long.
- Upload image present.

**Garder**

- Oui.

**Ameliorer**

- Layout en sections avec navigation sticky :
  - Infos,
  - Media,
  - Ingredients,
  - Etapes,
  - Source.
- Ajouter upload photo + lien video + preview source.
- Boutons sticky bas : Annuler / Enregistrer.

**Wording**

- "Informations générales" -> "Base".
- "Image" -> "Photo de couverture".
- "Instructions" -> "Etapes".

**Changer**

- Eviter un formulaire trop large sur desktop.
- Ajouter autosave plus tard, pas V1.

**Priorite**

- P2.

---

### 3.10 `/kitchen/meal-planning` - Menus

**Etat actuel**

- Route pointe vers `CipherMealPlanningPage`.
- Risque : ancienne experience trop complexe / pas alignee avec PRP-226/227.

**Garder**

- Decision a trancher :
  - soit on garde temporairement le legacy et on assume le wording actuel,
  - soit on cache la page de la nav,
  - soit on refait une page **Menus** dediee.
- Reco : ne pas renommer en Menus visible tant que la page reste clairement
  legacy/Cipher.

**Changer**

- Renommer navigation : "Menus".
- Page V1 :
  - Aujourd'hui,
  - Semaine,
  - generer avec assistant,
  - ajouter recette,
  - envoyer ingredients manquants aux courses.

**Supprimer/Cacher**

- Tout wording Cipher.
- Toute logique trop enterprise/IA invisible.
- Si la page est instable, cacher de la nav jusqu'a refonte.

**Decision recommandee**

- Court terme : cacher `Menus` de la navigation principale si la page affiche
  encore clairement l'experience Cipher.
- Garder la route accessible depuis Recettes ou Settings/dev si necessaire.
- Refondre en vraie page Menus seulement apres PRP-226, quand le moteur de
  recommandations et les recettes faisables existent.

**Signal de refonte**

- Lancer la refonte quand au moins deux elements sont disponibles :
  - recipe-inventory matching fiable,
  - ajout des ingredients manquants aux courses,
  - generation menu via assistant,
  - sauvegarde meal plan stable.

**Priorite**

- P1 pour cacher/clarifier si visible.  
- Refonte Menus = PRP/chantier separe, pas quick win.

---

### 3.11 `/kitchen/favorites` - Favoris

**Etat actuel**

- Route affiche `RecipesPage`.

**Garder**

- Non comme page separee.

**Changer**

- Rediriger vers `/kitchen/recipes?filter=favorites` ou onglet Bibliotheque
  avec filtre favori.

**Supprimer**

- Entree navigation separee.

**Priorite**

- P1.

---

### 3.12 `/shopping` - Courses overview

**Etat actuel**

- Dashboard avec "Ma liste de courses" et "Ajouter rapidement".
- Peu de valeur distincte de `/shopping/list`.

**Garder**

- Option A : rediriger vers `/shopping/list`.
- Option B : garder seulement si la page montre une vraie synthese.

**Reco**

- Pour V1, rediriger `/shopping` vers `/shopping/list`.

**Pourquoi**

- L'utilisateur veut sa liste directement.
- Une page intermediaire ajoute un clic.

**Priorite**

- P1.

---

### 3.13 `/shopping/list` - Liste de courses

**Etat actuel**

- Page essentielle.
- Recherche, ajout, categories/rayon, actions batch.
- Logs console encore presents.

**Garder**

- Oui.

**Ameliorer**

- Wording : "Ma liste de courses" -> "Courses".
- Pas de bouton "Dicter ma liste" dedie dans le shell de la page tant que
  PRP-221 n'expose pas une API dictation stable. Le FAB global suffit.
- Sections :
  - A acheter,
  - Achetés,
  - Ajoutés depuis recettes.
- Remplacer "Rayon" par "Categorie" si le mode magasin est supprime.

**Changer**

- Retirer logs console.
- Rendre les actions batch plus sobres :
  - Copier,
  - Nettoyer les achetés,
  - Tout décocher.

**Supprimer**

- Toute reference store layout / mode magasin.

**Priorite**

- P1 pour wording/categories/logs.  
- Input dictee dedie = P3/refonte assistant-shopping si le FAB ne suffit pas.

---

### 3.14 `/assistant` - Assistant overview

**Etat actuel**

- Dashboard avec cartes "Chat IA", "IA Rapide", "Fonctionnalites IA".
- Fonctionnalites annoncees : recommandations, nutrition, planning.
- Risque de promettre plus que l'app actuelle.

**Garder**

- Oui, mais a refondre totalement.

**Changer**

- `/assistant` doit devenir l'interface conversationnelle principale
  PRP-224 :
  - fil de conversation,
  - input texte,
  - bouton micro,
  - actions executees,
  - historique.
- Le FAB global PRP-221 reste utile, mais son role doit etre clair :
  - raccourci global pour capturer une demande partout dans l'app,
  - pas une deuxieme experience assistant concurrente,
  - apres interaction, ouvrir ou rattacher a la conversation `/assistant`.

**Wording**

- "Assistant IA" -> "Assistant".
- "Chat IA" -> "Conversation".
- "IA Rapide" -> "Demander".
- "Fonctionnalites IA" -> supprimer.

**Supprimer**

- Cards marketing.
- Badges "bientot" ou promesses non branchees.
- Sous-route `/assistant/chat` visible.

**Priorite**

- P3 (PRP-224). La decision architecture `/assistant` + FAB global est a
  trancher en §6 avant implementation.

---

### 3.15 `/assistant/chat` - Ancienne page assistant

**Etat actuel**

- Page vitrine avec feature cards et exemples.
- Ouvre un chat via bouton.
- Wording avec emojis et ton demo.

**Garder**

- Non comme route separee.

**Changer**

- Fusionner dans `/assistant`.
- Rediriger `/assistant/chat` vers `/assistant`.
- Tant que `/assistant` n'est pas pret, garder `/assistant/chat` peut servir de
  fallback, mais ne doit pas etre expose dans la nav.

**Supprimer**

- Feature cards marketing.
- Exemples emoji-heavy.
- CTA "Démarrer l'assistant" si l'assistant est deja l'ecran.

**Priorite**

- P0/P1.

---

### 3.16 `/insights` - Insights

**Etat actuel**

- Hero "Insights Dashboard".
- General dashboard probablement plus large que l'usage V1.
- PRP-222 dit de garder surtout anti-gaspi.
- Etat repo a verifier avant changement : une version recente peut deja avoir
  conserve un `/insights` a 2 onglets ("Vue d'ensemble", "Analyses").

**Garder**

- Oui seulement si elle devient un hub anti-gaspi/sante plus tard ou si les 2
  onglets ont des donnees reelles.

**Reco V1**

- Rediriger `/insights` vers `/insights/waste`, ou transformer en page
  "Anti-gaspi" simple.

**Wording**

- "Insights Dashboard" -> "Anti-gaspi".
- "Découvrez vos habitudes alimentaires..." -> "Comprendre ce que tu jettes et
  quoi cuisiner en priorité."

**Supprimer**

- Achievements.
- General analytics non fiables.
- Hero grandiose.

**Priorite**

- Decision produit P1. Ne pas annuler un travail recent sur `/insights` sans
  decision explicite : soit hub sobre, soit redirect waste.

**Critere de decision**

- Garder le hub `/insights` si les deux onglets ont des donnees reelles et
  actionnables.
- Rediriger vers `/insights/waste` si la vue d'ensemble contient encore des
  stats generiques, achievements ou analyses non fiables.
- Toute decision doit etre verifiee avec screenshots desktop/mobile avant merge.

---

### 3.17 `/insights/waste` - Anti-gaspi

**Etat actuel**

- Page dediee avec real numbers sur `food_waste_events`.
- Empty state existe.

**Garder**

- Oui.

**Ameliorer**

- Ajouter CTA principal :
  - "J'ai jeté un produit".
- Relier a inventaire :
  - "A finir cette semaine".
- Ajouter recommandations :
  - "Recettes pour eviter de jeter".

**Wording**

- "Aucun gaspillage enregistré" OK.
- Ajouter phrase : "Commence simplement en enregistrant ce que tu jettes, sans jugement."

**Changer**

- Ne pas presenter comme analytics avancee.
- Faire une page actionnable, pas seulement reporting.

**Priorite**

- P1/P2.

---

### 3.18 `/settings`

**Etat actuel**

- Parametres assez generiques.
- Contient tutoriel, theme, personnalisation, donnees, badges "Bientôt".

**Garder**

- Oui.

**Ameliorer**

- Reorganiser :
  1. Compte,
  2. Assistant et memoire,
  3. Preferences cuisine,
  4. Nutrition bien-etre,
  5. Confidentialite/donnees,
  6. Apparence.

**Changer**

- Supprimer "Tutoriel redémarré" si onboarding long supprime.
- Remplacer "Bientôt" par masquer tant que non disponible.
- Ajouter gestion memoire PRP-223.

**Wording**

- "Paramètres" OK.
- "Personnalisation" -> "Préférences".
- "Données" -> "Mes données".

**Priorite**

- P2.

---

### 3.19 `/settings/appearance`

**Etat actuel**

- Meme composant `Settings`.

**Garder**

- Non comme vraie page separee si elle n'a pas d'ancrage/onglet dedie.

**Changer**

- Soit rediriger vers `/settings`,
- soit ajouter un onglet `?section=appearance`.

**Priorite**

- P2.

---

### 3.20 `/share-target`

**Etat actuel**

- Route technique pour import/share.
- Redirige vers inbox recettes.

**Garder**

- Oui, important pour social vault.

**Ameliorer**

- Page feedback ultra claire :
  - "Lien reçu",
  - "Extraction en cours",
  - "A vérifier dans tes recettes".
- Si erreur : proposer copier/coller manuel.

**Supprimer**

- Ne pas afficher dans navigation.

**Priorite**

- P2.

---

### 3.21 `*` - 404

**Etat actuel**

- Log console sur route inconnue.

**Garder**

- Oui.

**Ameliorer**

- Wording utile :
  - "Cette page n'existe plus."
  - CTA "Retour aux recettes" / "Retour assistant".
- Retirer console.error en production.

**Priorite**

- P2.

---

## 4. Pages/fichiers a supprimer ou archiver

Ces pages ne sont pas routees dans `src/App.tsx` ou ressemblent a des pages
test/demo. Elles doivent sortir de `src/pages` pour reduire le bruit.

Note repo :

- Un stash WIP existe deja (`PR3 prep WIP`) et peut contenir une partie de ce
  nettoyage. Avant toute suppression, inspecter le stash ou la branche WIP pour
  eviter de refaire le meme travail.

### A archiver/supprimer apres `rg`

- `src/pages/YouTubeTestDirect.tsx`
- `src/pages/YouTubeRecipeTest.tsx`
- `src/pages/YouTubeRecipeTestSimple.tsx`
- `src/pages/YouTubeTestBasic.tsx`
- `src/pages/YouTubeTestWorking.tsx`
- `src/pages/VideoImportTest.tsx`
- `src/pages/TestMinimal.tsx`
- `src/pages/TestMaterialYou.tsx`
- `src/pages/SimpleMaterialTest.tsx`
- `src/pages/MaterialYouDemo.tsx`
- `src/pages/LayoutOptimizationDemo.tsx`
- `src/pages/RecipeSeeding.tsx`
- `src/pages/Diagnostics.tsx` si pas reserve admin/dev-only.
- `src/pages/demo/inventory-visualization.tsx`
- `src/pages/Recipes_backup.tsx`
- `src/pages/MyRecipes.tsx` si remplace par `/kitchen/recipes?tab=library`.
- `src/pages/RecipeCatalog.tsx` si remplace par `/kitchen/recipes`.

### Regle

- Si utile en dev, deplacer dans `src/dev-pages` ou `docs/dev`.
- Ne pas laisser dans `src/pages` si non route production.
- Retirer imports/exports associes.

---

## 5. Navigation et shell

### Probleme

`NavigationHub.tsx` et `AppNavigation.tsx` portent encore l'ancien modele :

- commentaires "Navigation Famille",
- `useFamilyMode`,
- gamification,
- labels child-friendly,
- supervision,
- restrictions par age.

Meme si ce n'est pas visible partout, ce modele influence la complexite de
navigation.

Precision :

- Les routes famille/parental sont deja retirees ou redirigees.
- Le probleme restant est surtout le rendu/shell et les types/hooks encore
  presents (`useFamilyMode`, `FamilyProfileSelector`, `funName`, `minAge`,
  `requiresSupervision`, etc.).
- Si `useFamilyMode` est devenu un stub neutre, documenter ce choix et retirer
  progressivement les props/UI visibles plutot que casser toute la navigation.

Plan de retrait final :

1. Retirer rendu visible famille/gamification du shell.
2. Retirer imports `useFamilyMode` des pages qui n'en ont plus besoin.
3. Decoupler `useCipherMealPlanning` ou cacher la page legacy.
4. Supprimer/archiver `types/family-mode.ts` quand plus aucun import runtime.
5. Garder les migrations/tables DB pour PRP-223 cleanup schema, pas ici.

### Garder

- Une config centralisee de navigation.
- Desktop/mobile/tablet navigation.
- Badges simples si vraiment utiles.

### Changer

- Supprimer le modele famille/gamification du shell V1.
- Refaire `NAVIGATION_CONFIG` autour de sections simples.
- Wording nav cible :
  - Assistant,
  - Recettes,
  - Inventaire,
  - Courses,
  - Menus,
  - Anti-gaspi.

### Supprimer

- `funName`,
- `minAge`,
- `requiresSupervision`,
- `availableInChildMode`,
- achievements nav,
- profile selector famille.

---

## 6. Priorites recommandees

### Decisions a prendre avant implementation

Ces decisions doivent etre tranchees avant ouverture du sprint UX P1.

1. Assistant : `/assistant` devient la page conversation principale et le FAB
   global reste un raccourci rattache a cette conversation.
2. Insights : hub sobre a 2 onglets ou redirect `/insights/waste`.
3. Menus : cacher de la nav tant que la page reste Cipher, ou accepter
   explicitement le legacy temporaire.
4. Navigation : Assistant en premiere entree seulement quand l'experience
   conversationnelle est prete.

### P0 - Clarifier l'assistant et recettes

1. Wording recettes : Feed/Bibliotheque/A verifier/Ajouter.

### P1 - Quick wins wording / structure faible risque

1. Labels nav : Inventaire, Recettes, Assistant, Anti-gaspi.
2. Fix liens legacy `/recipes`.
3. `/kitchen/favorites` devient filtre dans recettes ou redirect.
4. `/assistant/chat` cache de la nav si `/assistant` reste route principale.
5. Retirer mock data visible et empty states malhonnetes.
6. Images feed desktop reduites et meilleure densite.

### P2 - Routing/navigation a decision produit

1. `/shopping` redirect vers `/shopping/list` ou garder hub si vraie synthese.
2. `/insights` hub sobre ou redirect vers `/insights/waste`.
3. Menus comme nav separee ou sous-section Recettes.
4. Navigation sans rendu family/gamification.

### P3 - Refontes produit

1. `/assistant` conversation complete PRP-224.
2. `/kitchen` "Aujourd'hui en cuisine" avec data runtime.
3. `/kitchen/meal-planning` -> vraie page Menus.
4. Settings memoire/nutrition PRP-223/227.

### P4 - Nettoyage repo

1. Inspecter stash WIP PR3 prep.
2. Supprimer/archiver pages test/demo.
3. Retirer logs console non necessaires.
4. Supprimer wrappers vides.

---

## 7. Quick wins wording

| Surface | Changement rapide |
|---|---|
| Nav "Garde-Manger" | "Inventaire" |
| Nav "Cuisine" | "Recettes" |
| Nav "Analyses" | "Anti-gaspi" |
| Nav "Assistant IA" | "Assistant" |
| `/kitchen/meal-planning` | "Menus" |
| "Planification Repas" | "Menus de la semaine" |
| "Dashboard cuisine" | "Aujourd'hui" |
| "Inbox" | "A verifier" |
| "Import" | "Ajouter" |
| "Rayon" dans courses | "Categorie" |

---

## 8. Definition of Done pour la refonte UX

- Chaque route visible a une promesse claire.
- Aucun bouton principal ne mene a une page demo ou wrapper.
- `/assistant` est une vraie conversation.
- `/kitchen/recipes` est la seule experience recettes.
- `/shopping/list` est l'experience courses principale.
- `/insights` ne promet pas des analytics non fiables.
- Les pages test/demo ne sont plus dans `src/pages`.
- Navigation et wording ne parlent plus de famille/gamification.
- Le ton general est adulte, clair et utile.
- Les tap targets, focus states, ARIA labels et contrastes passent une revue
  accessibilite minimale.
- Les routes principales respectent un budget performance documente et verifie
  au minimum pendant build/QA ; CI si possible.
- Les pages recette respectent la regle media responsive : 9:16 mobile OK,
  desktop controle.
- Aucune mock data visible n'est presente en production.
- Les loading states et empty states suivent les patterns de ce document sur
  toutes les routes principales.
- Le retrait `useFamilyMode` va jusqu'a l'absence d'import runtime inutile ou
  est documente comme stub temporaire avec date/PR de suppression.
- Toute mutation server-state declare son invalidation de cache/query.
