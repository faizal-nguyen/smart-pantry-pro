# PRP-235 - Settings, Memory, Nutrition, Data

> Statut : **DRAFT executable**
> Date : 2026-05-17
> Sources : `docs/PAGE-UI-UX-AUDIT-2026.md`, PRP-223, PRP-227, audit code local 2026-05-17
> Lie a : PRP-223 Memory Foundation, PRP-224/233 Assistant UX, PRP-225 Product Intelligence, PRP-227 Nutrition Coach, PRP-237 Visual Redesign
> Objectif : transformer `/settings` en centre de controle personnel pour memoire assistant, preferences cuisine, nutrition bien-etre, confidentialite et apparence.

---

## -1. Hotfix securite obligatoire hors stack PRP-235

Avant d'ouvrir PRP-235 PR1, corriger ou neutraliser l'exposition des RPC privacy existantes :

- `public.export_user_data(p_user_id)`
- `public.delete_user_data(p_user_id)`

Probleme confirme par audit : ces RPC prennent un `p_user_id` fourni par l'appelant et sont en `SECURITY DEFINER`. Si elles ne verifient pas explicitement `auth.uid() = p_user_id`, elles ne doivent jamais etre appelables depuis le front, meme via console DevTools.

Action immediate recommandee :

1. Retirer tout appel direct front a ces RPC dans `usePrivacySettings`.
2. Creer un wrapper backend ou RPC sans parametre utilisateur, qui derive toujours l'utilisateur depuis `auth.uid()`.
3. Garder la suppression finale derriere `data_deletion_requests` + double confirmation.
4. Ajouter un test negatif : un utilisateur A ne peut pas exporter/supprimer les donnees d'un utilisateur B.

Cette correction est un hotfix securite autonome. Elle ne doit pas attendre PRP-235 PR5.

---

## 0. Decisions pre-requises

Ces decisions doivent etre cochees dans la PR1 sous `## Decisions §0 PRP-235`.
Si elles ne sont pas tranchees sous 48h apres ouverture du sprint, appliquer les valeurs recommandees ci-dessous et marquer la PR `provisional/settings-v1`.

- [ ] **Positionnement Settings** : Settings est un centre de controle, pas un catalogue de features.
  - Recommande : sections sobres, denses, orientees controle utilisateur.
- [ ] **Memoire assistant** : reutiliser `assistant_memory_items`, `assistant_conversations` et `cooking_journal_entries` de PRP-223.
  - Recommande : aucun nouveau schema memoire dans cette PRP.
- [ ] **Nutrition** : Settings expose le profil et les contraintes, pas le coach complet.
  - Recommande : afficher "Nutrition bien-etre" comme preferences + consentement, implementation coach dans PRP-227.
- [ ] **Confidentialite** : ne jamais exposer une suppression destructive directe depuis le front tant que les RPC ne sont pas durcies.
  - Recommande : export autorise via endpoint/hook audite ; suppression = demande explicite + double confirmation + backend.
- [ ] **Apparence** : appliquer les tokens PRP-237, pas Material You demo.
  - Recommande : `/settings/appearance` redirige vers `/settings?section=appearance`.
- [ ] **Notifications** : persister uniquement ce qui existe vraiment dans `useAppStore`.
  - Recommande : expiry + shopping reminders, pas de notifications recette hebdo fake si aucun worker ne les envoie.
- [ ] **Language/i18n** : masquer la langue si non livree.
  - Recommande : pas de badge "Bientot".

---

## 1. Contexte produit

Les settings actuels donnent une impression de panneau generique : demo Material You, badges "Bientot", boutons data incomplets, notifications peu raccordees au runtime. Or la vision produit a evolue : l'app devient un assistant cuisine personnel avec memoire, inventaire, recommandations et nutrition bien-etre.

`/settings` doit donc repondre a quatre questions simples :

1. Qu'est-ce que l'assistant sait de moi ?
2. Comment l'app personnalise mes recettes, courses et recommandations ?
3. Quelles donnees sont conservees, exportables ou effacables ?
4. Comment je regle l'interface sans tomber sur des demos internes ?

---

## 1.1 Etat actuel verifie

Audit local du 2026-05-17.

| Surface | Etat actuel | Decision PRP-235 |
|---|---|---|
| `src/pages/Settings.tsx` | Page monolithique avec Apparence, Aide/Tutoriel, Notifications, Privacy, Account | Remplacer par shell de sections |
| Material You demo | Bouton vers `/demo/material-you` visible dans Settings | Supprimer de Settings ; PRP-237 gere les tokens |
| Langue | Badge `Bientot` visible | Masquer tant que i18n non livree |
| Notifications | Switches UI locaux dans Settings, `useAppStore.notificationSettings` existe ailleurs | Raccorder a `useAppStore`, retirer les switches non fonctionnels |
| Privacy | `usePrivacySettings.ts` existe, `user_privacy_settings` existe | Reutiliser apres audit securite |
| Export/delete RPC | `export_user_data(p_user_id)`, `delete_user_data(p_user_id)` existent en SECURITY DEFINER | Hotfix obligatoire avant PRP-235 : aucun appel front direct |
| Memoire assistant | `MemoryPanel.tsx`, `useAssistantMemories`, `ConversationHistoryList.tsx` existent | Reutiliser dans section Assistant & memoire |
| Conversations | Rename/archive/delete presents via composants PRP-224/223 | Afficher l'historique recent, pas dupliquer |
| Cooking journal | `cooking_journal_entries` + `CookingJournalService` existent | Exposer en lecture legere si PRP-223 PR7 est merged |
| Nutrition coach | PRP-227 specifie `nutrition_profiles`, pas encore schema runtime confirme | Settings prepare la section, PRP-227 livre le backend complet |
| Personalization | `usePersonalization` stocke onboarding en localStorage | Garder comme source legacy, migrer doucement vers memoire/preferences |
| `/settings/appearance` | Route redirige deja vers `/settings` dans `src/App.tsx` | Changer vers `/settings?section=appearance` |
| Navigation | `NavigationHub.tsx` expose un sub-item Apparence | Le sub-item pointe vers `/settings?section=appearance` |

---

## 2. Scope

### Inclus

- Refonte de `/settings` en sections navigables.
- Deep-link via `?section=` :
  - `account`
  - `assistant-memory`
  - `cooking`
  - `nutrition`
  - `data-privacy`
  - `appearance`
  - `notifications`
- Remplacement du layout actuel par une page outil calme :
  - desktop : nav secondaire a gauche + contenu a droite ;
  - mobile : segmented/tabs horizontaux sticky + sections compactes.
- Reutilisation de `MemoryPanel` pour les memoires assistant.
- Reutilisation de `ConversationHistoryList` pour l'historique assistant.
- Raccordement des notifications a `useAppStore`.
- Raccordement privacy a `usePrivacySettings` uniquement apres durcissement des operations sensibles.
- Section nutrition bien-etre limitee a profil/contraintes/consentement.
- Retrait du bouton Material You demo, des badges "Bientot" et des promesses non livrees.
- Redirection `/settings/appearance` vers `/settings?section=appearance`.

### Exclus

- Coach nutrition complet PRP-227.
- Diagnostics medicaux, interpretation de symptomes, prescriptions ou promesses de sante.
- Nouveau moteur memoire : PRP-223 reste source de verite.
- Nouveau systeme de design : PRP-237 reste source de verite.
- Billing, plan premium, abonnement.
- Gestion avancee des appareils connectes si aucune vraie session/device table n'est presente.
- Suppression definitive de compte/auth sans flow backend dedie et explicite.

---

## 3. UX cible

### 3.1 Shell `/settings`

Structure :

```text
Settings
├─ Compte
├─ Assistant & memoire
├─ Preferences cuisine
├─ Nutrition bien-etre
├─ Mes donnees
├─ Notifications
└─ Apparence
```

Regles :

- Pas de cards marketing.
- Pas de section vide avec badge "Bientot".
- Chaque section a une action claire ou un empty state honnete.
- Les actions destructrices utilisent `AlertDialog` avec double confirmation.
- Les donnees sensibles expliquent leur usage en une phrase simple.

### 3.2 Wording

| Ancien | Nouveau |
|---|---|
| Parametres | Parametres |
| Personnalisation | Preferences |
| Modifier mes preferences | Preferences cuisine |
| Donnees | Mes donnees |
| Confidentialite & Donnees | Confidentialite et donnees |
| Nutrition IA | Nutrition bien-etre |
| Material You Demo | Supprimer de Settings |
| Bientot | Masquer si non disponible |
| Appareils connectes | Masquer si aucune table runtime |
| Dashboard | Retour |
| Revoir le tutoriel | Revoir l'onboarding |

### 3.3 Sections

#### Compte

Contenu V1 :

- Email utilisateur.
- Date creation si disponible via Supabase auth metadata.
- Bouton `Se deconnecter`.
- Bouton `Revoir l'onboarding`.

Ne pas afficher :

- role, plan, famille, enfants, badges premium si non utiles.

#### Assistant & memoire

Contenu V1 :

- `MemoryPanel` reutilise.
- `ConversationHistoryList` reutilise avec `limit={5}`.
- Lien vers `/assistant`.
- Explication courte : "Tu peux confirmer, oublier ou corriger ce que l'assistant retient."

Actions :

- Confirmer memoire candidate.
- Oublier memoire.
- Ouvrir conversation.
- Archiver/supprimer conversation via composants existants si deja presents.

Garde-fous :

- Les memoires `health_sensitive` gardent le disclaimer PRP-223.
- Ne jamais masquer une memoire active derriere un "score".

#### Preferences cuisine

Contenu V1 :

- Donnees legacy `usePersonalization` :
  - taille foyer ;
  - preferences alimentaires ;
  - niveau cuisine ;
  - objectifs.
- Surface d'edition simple ou lien vers un dialogue refactorise de `PersonalizationSettings`.
- Option "Reinitialiser l'onboarding" conservee, mais placee dans Compte ou Preferences cuisine.

Future bridge :

- PRP-223 peut convertir certaines preferences en `assistant_memory_items`.
- PRP-226/234 peuvent lire ces preferences pour recommandations.
- Backlog explicite apres PRP-235 : migrer progressivement `usePersonalization` localStorage vers une source durable unique (`assistant_memory_items` pour preferences conversationnelles, ou future `user_app_preferences` si sync multi-device necessaire).
- Tant que cette migration n'est pas faite, toute preference lue depuis localStorage doit etre marquee `legacyLocalOnly` dans le view-model de Settings pour eviter de la confondre avec une memoire assistant persistante.

#### Nutrition bien-etre

Contenu V1 :

- Objectif optionnel :
  - equilibre ;
  - perte de poids ;
  - maintien ;
  - prise de muscle ;
  - energie ;
  - digestion ;
  - anti-gaspi.
- Contraintes :
  - allergies ;
  - aliments evites ;
  - regimes/preferenes alimentaires.
- Consentement : "J'accepte que ces informations soient utilisees pour adapter les suggestions alimentaires."

Garde-fous :

- Aucun diagnostic.
- Aucun conseil medical.
- Si symptomes graves ou persistants : conseiller un professionnel de sante.
- Les allergies et objectifs poids sont traites comme `health_sensitive` et doivent aussi apparaitre en memoire candidate/active selon PRP-223/227.

Implementation :

- PR4 Nutrition est deferree tant que PRP-227 PR1 n'est pas mergee.
- Si `nutrition_profiles` existe via PRP-227 PR1, utiliser cette table.
- Si `nutrition_profiles` n'existe pas encore, ne pas creer de formulaire persistant local et ne pas creer de schema concurrent. Afficher uniquement les preferences alimentaires legacy + disclaimer + CTA vers `/assistant?mode=nutrition`.
- Ne pas creer un schema concurrent a PRP-227 dans cette PRP.

#### Mes donnees

Contenu V1 :

- Resume :
  - inventaire ;
  - recettes ;
  - liste de courses ;
  - conversations/memoires ;
  - journal cuisine ;
  - preferences/privacy.
- Export JSON si endpoint securise disponible.
- Demande de suppression de donnees.
- Retention privacy :
  - minimal ;
  - standard ;
  - full.

Important :

- `delete_user_data(p_user_id)` et `export_user_data(p_user_id)` prennent un `p_user_id`. Avant exposition UI, le backend doit forcer `p_user_id = auth.uid()` ou wrapper cote API. Ne jamais laisser le client envoyer un user_id arbitraire.
- La suppression finale doit etre asynchrone ou manuelle si le backend ne garantit pas encore tous les domaines PRP-223/225/226/227.

#### Notifications

Contenu V1 :

- Permission notification navigateur.
- Expiry reminders.
- Shopping reminders.

Source de verite :

- `src/store/appStore.ts` (`notificationSettings`, `requestNotificationPermission`, `updateNotificationSettings`).

Ne pas afficher :

- suggestions hebdomadaires de recettes si aucun scheduler/worker n'envoie cette notification.

#### Apparence

Contenu V1 :

- Theme clair/sombre via `useTheme`.
- Reduced motion si raccordable a `useAccessibility`/classe `.reduced-motion`.
- Densite UI : seulement si PRP-237 expose un token/setting stable.

Ne pas afficher :

- Material You demo.
- Choix de palette dynamique non supporte.
- Langue.

---

## 4. Architecture technique

### 4.1 Fichiers a modifier

| Fichier | Action |
|---|---|
| `src/pages/Settings.tsx` | Remplacer page monolithique par orchestrateur sectionne |
| `src/App.tsx` | Rediriger `/settings/appearance` vers `/settings?section=appearance` |
| `src/components/navigation/NavigationHub.tsx` | Mettre sub-item Apparence sur `/settings?section=appearance` ou le masquer |
| `src/components/settings/PersonalizationSettings.tsx` | Refactoriser ou deprecier comme dialogue legacy |
| `src/hooks/usePrivacySettings.ts` | Durcir export/delete ; supprimer appel direct destructif non securise |
| `src/store/appStore.ts` | Source notification existante ; eviter doublon local Settings |
| `src/components/assistant/MemoryPanel.tsx` | Reutiliser tel quel, pas dupliquer |
| `src/components/assistant/ConversationHistoryList.tsx` | Reutiliser tel quel, pas dupliquer |

### 4.2 Fichiers a creer

Creer ces fichiers exacts, sauf si un fichier homonyme existe deja au demarrage de PR1 ; dans ce cas, le reutiliser et documenter la difference dans la PR.

```text
src/components/settings/SettingsShell.tsx
src/components/settings/SettingsSectionNav.tsx
src/components/settings/AccountSettingsSection.tsx
src/components/settings/AssistantMemorySettingsSection.tsx
src/components/settings/CookingPreferencesSection.tsx
src/components/settings/NutritionWellbeingSection.tsx
src/components/settings/DataPrivacySection.tsx
src/components/settings/NotificationsSettingsSection.tsx
src/components/settings/AppearanceSettingsSection.tsx
src/hooks/useSettingsSection.ts
```

Cibles lignes :

| Module | Cible |
|---|---:|
| `Settings.tsx` | <= 160 lignes |
| `SettingsShell.tsx` | <= 180 lignes |
| Chaque section | <= 220 lignes |
| `useSettingsSection.ts` | <= 80 lignes |

### 4.3 State/data flow

Regles :

- Server state : TanStack Query ou hooks existants (`useAssistantMemories`, `useAssistantConversations`, `usePrivacySettings` apres correction).
- Client state global : Zustand uniquement pour notifications/PWA deja presentes.
- Client state local : `useState` pour edition non sauvegardee.
- URL state : `?section=` gere l'onglet actif.
- Pas de copie locale persistante de server state sauf optimistic update controle.

---

## 5. Data contracts

### 5.1 Memoire assistant

Source :

- `assistant_memory_items`
- `assistant_conversations`
- `assistant_messages`
- `cooking_journal_entries`

Hooks/composants :

- `useAssistantMemories`
- `useAssistantConversations`
- `MemoryPanel`
- `ConversationHistoryList`

Invalidation :

- `assistant_memory_items`
- `assistant_conversations`
- `assistant_messages`
- `cooking_journal_entries`

### 5.2 Privacy

Tables existantes :

- `user_privacy_settings`
- `data_deletion_requests`
- `scan_history`
- `analytics_events`

Settings JSON V1 :

```ts
type PrivacySettings = {
  hasConsent: boolean;
  allowAnalytics: boolean;
  saveHistory: boolean;
  allowImageProcessing: boolean;
  shareAnonymizedData: boolean;
  batterySaver: boolean;
  dataRetention: 'minimal' | 'standard' | 'full';
};
```

Regle de securite :

- Le front ne doit pas appeler une RPC qui accepte `p_user_id` librement.
- Backend/API ou RPC corrigee doit utiliser `auth.uid()` comme seule source user.
- Toute demande suppression cree une ligne `data_deletion_requests` avant action destructive.

### 5.3 Nutrition

Schema cible PRP-227 :

```ts
type NutritionProfile = {
  goal:
    | 'balanced'
    | 'weight_loss'
    | 'maintenance'
    | 'muscle_gain'
    | 'energy'
    | 'digestion'
    | 'anti_waste';
  activityLevel?: 'low' | 'moderate' | 'high';
  preferredMealsPerDay?: number;
  targetCalories?: number;
  targetProteinG?: number;
  dietaryPatterns: string[];
  avoidedIngredients: string[];
  allergies: string[];
  notes?: string;
  disclaimerAcceptedAt?: string;
};
```

PRP-235 ne cree pas cette table si PRP-227 ne l'a pas encore creee. Elle prepare l'UX et le wiring avec feature detection.

### 5.4 Appearance

Source V1 :

- `useTheme` pour light/dark.
- PRP-237 tokens pour couleurs/spacing.
- `useAccessibility` ou classe `.reduced-motion` si deja reparable dans PRP-237.

Pas de table SQL V1 pour apparence. Si besoin sync multi-device, creer une PRP dediee `user_app_preferences`.

---

## 6. Backend/API

### 6.1 Privacy API V1

PR5 doit implementer ou confirmer ces endpoints avant d'exposer export/delete dans l'UI :

```text
GET  /api/settings/privacy
PATCH /api/settings/privacy
POST /api/settings/export
POST /api/settings/delete-request
```

Middleware :

- `createAuthMiddleware`
- `userRateLimit`
- validation Zod sur payloads.
- Rate-limits explicites :
  - export : `5/hour/user` maximum ;
  - delete-request : `3/day/user` maximum ;
  - toute autre valeur doit etre documentee dans la PR avec justification.

Contrats :

```ts
type ExportUserDataResponse = {
  exportDate: string;
  inventory: unknown[];
  recipes: unknown[];
  shoppingList: unknown[];
  assistantConversations?: unknown[];
  assistantMemories?: unknown[];
  cookingJournal?: unknown[];
  privacySettings?: PrivacySettings;
};

type DeleteRequestResponse = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
};
```

DoR privacy :

- Avant PR5, verifier que les RPC existantes ne permettent pas de passer un autre `user_id`.
- Si elles sont insecurisees, PR5 cree un wrapper backend et n'expose jamais la RPC au front.
- Si aucun wrapper backend n'est pret, les boutons export/suppression restent des empty states actionnables : "Disponible apres verification securite des donnees".

### 6.2 Assistant settings tools

Outils deja attendus par PRP-223 :

- `remember_preference`
- `forget_memory`
- `update_response_style`

PRP-235 ne recree pas ces tools. Elle expose seulement les controles UI.

### 6.3 Nutrition settings

PRP-235 peut preparer les types et composants, mais les endpoints nutrition complets restent PRP-227 :

```text
GET   /api/nutrition/profile
PATCH /api/nutrition/profile
POST  /api/nutrition/disclaimer
```

Si ces endpoints n'existent pas au moment PRP-235, la section nutrition affiche :

- les preferences alimentaires legacy ;
- un disclaimer ;
- un lien vers l'assistant en mode nutrition ;
- pas de faux formulaire sauvegarde.

---

## 7. Plan d'execution

### Ordre recommande

```text
PRP-237 PR1-PR3   -> tokens/shell visuel disponibles
PRP-223 PR6-PR7   -> memoire + journal cuisine disponibles
Hotfix privacy    -> RPC export/delete durcies ou neutralisees
PRP-235 PR1-PR3   -> Settings shell + memoire + preferences cuisine
PRP-227 PR1       -> nutrition_profiles si l'equipe veut persister le profil
PRP-235 PR4-PR6   -> nutrition settings + privacy + notifications/apparence
```

PRP-235 PR1-PR3 peuvent partir avant PRP-227. PRP-235 PR4 ne doit pas creer de schema concurrent si PRP-227 n'est pas encore mergee.
PRP-235 PR4 ne demarre pas tant que PRP-227 PR1 n'est pas mergee, sauf si le scope est explicitement reduit a un empty state + CTA nutrition sans sauvegarde.

### PR1 - Settings shell + routing

Scope :

- Remplacer `Settings.tsx` par un shell de sections.
- Ajouter `useSettingsSection`.
- Ajouter nav secondaire.
- Rediriger `/settings/appearance` vers `/settings?section=appearance`.
- Mettre a jour `NavigationHub.tsx`.
- Retirer Material You demo, Langue `Bientot`, Appareils connectes si non supporte.

Verification :

```bash
npx tsc -p tsconfig.json --noEmit
npm run build
rg -n "Material You Demo|Bientot|Appareils connectes|/demo/material-you" src/pages/Settings.tsx src/components/settings src/components/navigation
```

Attendu :

- `tsc` green ou erreurs pre-existantes documentees.
- build green.
- grep ne retourne aucun hit dans Settings/navigation.

### PR2 - Assistant & memoire

Scope :

- Ajouter `AssistantMemorySettingsSection`.
- Monter `MemoryPanel`.
- Monter `ConversationHistoryList` avec `limit={5}`.
- Ajouter lien vers `/assistant`.
- Conserver disclaimers health-sensitive.

Verification :

```bash
npx tsc -p tsconfig.json --noEmit
rg -n "MemoryPanel|ConversationHistoryList|health_sensitive" src/components/settings src/components/assistant
```

Smoke :

- `/settings?section=assistant-memory`
- Une memoire active s'affiche.
- Une memoire candidate peut etre confirmee ou oubliee.
- Aucune memoire affichee si vide -> empty state honnete.
- Mobile 375px : `MemoryPanel` reste lisible, et les actions confirmer/oublier restent accessibles avec des cibles 44x44 minimum.

### PR3 - Preferences cuisine

Scope :

- Ajouter `CookingPreferencesSection`.
- Reutiliser `usePersonalization`.
- Remplacer le modal generique par une section inline ou un dialog plus petit.
- Garder reset onboarding avec confirmation.
- Ne pas stocker de nouvelles preferences server sans schema.

Verification :

```bash
npx tsc -p tsconfig.json --noEmit
rg -n "Personnalisation|Modifier mes preferences" src/pages/Settings.tsx src/components/settings
```

Attendu :

- Wording remplace par `Preferences cuisine`.

### PR4 - Nutrition bien-etre

Prerequis :

- PRP-227 PR1 mergee si la section sauvegarde un profil nutrition.
- Sinon PR4 est limitee a un empty state controle : preferences alimentaires legacy, disclaimer, CTA assistant nutrition.

Scope :

- Ajouter `NutritionWellbeingSection`.
- Si PRP-227 endpoints/schema sont presents : lire/sauvegarder `nutrition_profiles`.
- Sinon : afficher preferences alimentaires existantes + disclaimer + CTA vers `/assistant?mode=nutrition`.
- Ajouter guardrails wording.

Verification :

```bash
npx tsc -p tsconfig.json --noEmit
rg -nE "diagnostic|guerir|medical|medecin|prescription|traitement" src/components/settings src/pages/Settings.tsx
rg -n "nutrition_profiles|/api/nutrition/profile" src/components/settings src/hooks apps/api/src
```

Attendu :

- Aucun wording medical dangereux hors disclaimer explicite.
- Si `nutrition_profiles` apparait dans le front, PRP-227 PR1 doit etre mergee et citee dans la PR.

### PR5 - Confidentialite et donnees

Scope :

- Ajouter `DataPrivacySection`.
- Afficher `user_privacy_settings`.
- Raccorder export uniquement via endpoint securise.
- Raccorder `data_deletion_requests`.
- Remplacer suppression directe par demande de suppression.
- Corriger `usePrivacySettings.deleteAllData` si necessaire.
- Appliquer `createAuthMiddleware` + `userRateLimit` sur les endpoints data/export/delete-request.
- Documenter les limites retenues : export `5/hour/user`, delete-request `3/day/user`, sauf justification explicite.

Verification :

```bash
npx tsc -p tsconfig.json --noEmit
rg -n "delete_user_data|export_user_data|p_user_id|deleteAllData" src/pages src/components src/hooks
rg -n "delete_user_data|export_user_data|p_user_id" apps/api/src supabase/migrations
```

Attendu :

- Premier grep : aucun appel front direct destructif a `delete_user_data` avec `user.id`.
- Deuxieme grep : seuls les wrappers backend et migrations documentees apparaissent.
- Export force l'utilisateur authentifie.
- Suppression finale exige double confirmation et demande tracee.

Smoke E2E requis :

- Depuis `/settings?section=data-privacy`, lancer une demande de suppression.
- Confirmer que la UI cree une `data_deletion_requests` ou appelle l'endpoint backend dedie.
- Confirmer qu'aucune suppression definitive n'est executee sans double confirmation.
- Test negatif backend : tentative d'export/suppression pour un autre `user_id` refusee.

### PR6 - Notifications + Apparence

Scope :

- Ajouter `NotificationsSettingsSection`.
- Raccorder a `useAppStore.notificationSettings`.
- Ajouter `AppearanceSettingsSection`.
- Theme light/dark via `useTheme`.
- Reduced motion uniquement si raccordable proprement.
- Supprimer tout doublon avec PRP-237.

Verification :

```bash
npx tsc -p tsconfig.json --noEmit
npm run build
rg -n "Suggestions de recettes|Material You|Langue|Bientot" src/pages/Settings.tsx src/components/settings
```

Attendu :

- Aucun switch non fonctionnel.
- Aucun badge `Bientot`.

---

## 8. Tests et QA

### Commandes

```bash
npx tsc -p tsconfig.json --noEmit
npx tsc -p apps/api/tsconfig.json --noEmit
npm run build
npm run lint
npm run test
```

Si `npm run lint` ou `npm run test` n'existent pas dans `package.json`, documenter "script absent" dans la PR au lieu d'inventer un gate.

### Smoke routes

Tester desktop + mobile :

```text
/settings
/settings?section=account
/settings?section=assistant-memory
/settings?section=cooking
/settings?section=nutrition
/settings?section=data-privacy
/settings?section=notifications
/settings?section=appearance
/settings/appearance
```

### A11y

- Navigation section au clavier.
- Boutons 44x44 minimum.
- `aria-label` sur actions icon-only.
- Focus visible.
- AlertDialog focus trap.
- Escape ferme les dialogs.

### Grep gates

```bash
rg -n "Bientot|Material You Demo|/demo/material-you|Appareils connectes" src/pages/Settings.tsx src/components/settings src/components/navigation
rg -nE "diagnostic|guerir|prescription|traitement medical|medecin IA" src/pages/Settings.tsx src/components/settings
rg -n "delete_user_data\\(|export_user_data\\(" src/pages src/components src/hooks
rg -n "localStorage" src/components/settings src/hooks/usePersonalization.ts
```

Attendu :

- Zero hit pour les deux premiers gates hors citations de test.
- Aucun appel direct aux RPC sensibles depuis composants/pages.
- Hits `localStorage` autorises seulement dans le hook legacy `usePersonalization` ou dans un adapter documente ; aucun nouveau localStorage Settings sans decision.

---

## 9. Definition of Done

- `/settings` est une page outil adulte, pas une page demo.
- `Settings.tsx` est un orchestrateur court, pas un monolithe.
- Les sections sont deep-linkables via `?section=`.
- `/settings/appearance` redirige vers `/settings?section=appearance`.
- Aucun badge "Bientot" visible.
- Aucun bouton Material You demo dans Settings.
- Memoire assistant visible et controlable via les composants PRP-223.
- Les memoires sensibles conservent le disclaimer.
- Nutrition est cadree comme bien-etre, pas medical.
- Aucune suppression destructive n'est lancee depuis le front sans wrapper securise.
- Le hotfix privacy est merge ou l'UI export/delete reste masquee.
- PR4 Nutrition persiste un profil uniquement si PRP-227 PR1 est mergee.
- La dette `usePersonalization` localStorage -> memoire/preferences est tracee en issue/PRP follow-up.
- Les notifications visibles correspondent a `useAppStore`.
- Les empty states sont honnetes et actionnables.
- Mobile, tablet et desktop sont lisibles sans cards imbriquees.
- `tsc` + build green ou erreurs pre-existantes documentees.

---

## 10. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| RPC privacy trop permissives | Suppression/export de mauvais user | Wrapper backend avec `auth.uid()` force avant exposition |
| Duplication memoire | UX confuse | Reutiliser `MemoryPanel`, pas nouveau composant concurrent |
| Nutrition vendue trop tot | Promesse produit dangereuse | Section preferences/disclaimer seulement avant PRP-227 |
| Settings trop gros | PR difficile a reviewer | 6 PRs revertables |
| PRP-237 en parallele | Conflits visuels | PR1-2 compatibles shadcn/tokens, pas de refonte visuelle profonde |
| Personalization localStorage vs server | Donnees incoherentes | Declarer source legacy et migration future |
| Dette localStorage oubliee | Preferences incoherentes avec memoire assistant | Creer un follow-up explicite apres PRP-235 PR3 |

---

## 11. Non-objectifs

- Pas de nouvelle experience coach nutrition complete.
- Pas de diagnostic sante.
- Pas de gamification/family/parental controls.
- Pas de Material You demo.
- Pas de gestion multi-device avancee.
- Pas de settings admin.
- Pas de migration massive des preferences vers memoire sans PRP dediee.

---

## 12. Questions tranchees

1. **Est-ce que Settings doit contenir une page Apparence separee ?**
   - Non. Deep-link via `/settings?section=appearance`.

2. **Est-ce qu'on garde Material You demo ?**
   - Non dans Settings. PRP-237 decide du design system final.

3. **Est-ce que nutrition est active avant PRP-227 ?**
   - Non comme coach complet. Oui comme preferences/contraintes/disclaimer.

4. **Est-ce qu'on peut supprimer toutes les donnees depuis le front ?**
   - Non. Demande de suppression + backend securise uniquement.

5. **Est-ce qu'on cree une nouvelle table preferences ?**
   - Non en V1. Reutiliser sources existantes. Si sync multi-device devient necessaire, creer une PRP `user_app_preferences`.

6. **Est-ce que l'historique assistant vit dans Settings ?**
   - Settings montre un apercu et les controles. La conversation complete reste `/assistant`.
