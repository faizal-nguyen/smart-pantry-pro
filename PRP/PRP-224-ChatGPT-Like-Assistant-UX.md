# PRP-224 — ChatGPT-like Assistant UX

> Statut : **DRAFT — remis a jour apres audit terrain**
> Date : 2026-05-14
> Source : vision "assistant cuisine personnel avec memoire"
> Dependances : PRP-221, PRP-223, PRP-233
> Objectif : transformer `/assistant` en interface conversationnelle premium,
> ecrite + vocale, avec historique, recherche, actions, confirmations, undo et
> reprise de contexte.

## 1. Contexte

L'assistant ne doit pas etre seulement un bouton micro flottant. Il doit aussi
avoir une interface complete type ChatGPT : un espace ou l'utilisateur voit ce
qu'il a dit, ce que l'agent a repondu, quelles actions ont ete proposees,
executees ou annulees, et ou il peut reprendre une discussion.

Frontiere avec PRP-233 :

- PRP-233 livre le MVP surface assistant :
  - `/assistant` conversationnel basique ;
  - input texte + micro inline ;
  - redirect `/assistant/chat` -> `/assistant` ;
  - FAB sticky 2h.
- PRP-224 livre le polish ChatGPT-like :
  - thread robuste ;
  - sidebar/drawer historique ;
  - recherche conversationnelle ;
  - composants action cards atomiques ;
  - mode picker ;
  - keyboard/a11y/mobile quality ;
  - bundle split propre.

Si PRP-233 n'est pas mergee, ne pas demarrer PRP-224. Ouvrir d'abord PRP-233 ou
absorber explicitement son PR1/PR2 dans une PR preliminaire.

## 1.1 Etat verifie 2026-05-14

| Surface | Etat actuel | Action PRP-224 |
| --- | --- | --- |
| `useAssistantVoice` | existe | reutiliser, ajouter `conversationId` si PRP-233 ne l'a pas fait |
| `useAssistantConversations` | existe | reutiliser |
| `useAssistantMessages` | existe dans `useAssistantConversations.ts` | reutiliser ou extraire proprement |
| `useAssistantMemories` | existe | reutiliser |
| `useCookingJournal` | existe | reutiliser |
| `ConversationHistoryList` | existe | reutiliser/renommer ou wrapper |
| `MemoryPanel` | existe | reutiliser comme `AssistantMemoryPanel` |
| `AssistantResultDialog` | existe monolithe | splitter en cards atomiques |
| `AssistantFAB` | existe global | ne pas remplacer par le composer button |
| `/api/assistant/conversations` | existe | reutiliser |
| `/api/assistant/conversations/:id` | existe | reutiliser |
| `/api/assistant/conversations/:id/messages` GET | existe | reutiliser |
| `/api/assistant/text` + `conversation_id` backend | existe | frontend doit le transmettre |
| `/api/assistant/sessions/:id` | n'existe pas | ne pas specifier |

## 2. Probleme

Aujourd'hui, meme avec PRP-221/223, l'experience reste fragmente :

- le FAB produit un resultat en dialog ;
- `/assistant` n'est pas encore une vraie interface de reprise ;
- `/assistant/chat` est legacy ;
- les composants action/confirm/undo sont regroupes dans `AssistantResultDialog`;
- l'historique existe mais n'est pas encore une sidebar conversationnelle ;
- la recherche d'historique n'est pas branchee.

Pour creer la confiance, l'assistant doit montrer :

- ce qu'il a compris ;
- ce qu'il va faire ;
- ce qu'il a fait ;
- ce qui peut etre annule ;
- pourquoi il recommande quelque chose ;
- ce qu'il se souvient de l'utilisateur.

## 3. Vision UX

L'utilisateur ouvre `/assistant` et voit :

1. Une conversation claire.
2. Un bouton micro dans le composer.
3. Une zone texte.
4. Des suggestions contextuelles sobres.
5. Les actions executees sous forme de cartes.
6. Des confirmations lisibles.
7. Une barre laterale d'historique sur desktop.
8. Une vue simple sur mobile.
9. Un panneau memoire/contexte non intrusif.

L'experience doit etre calme, premium, pas enfantine.

## 4. Routes

Routes publiques V1 :

```txt
/assistant
```

Routes legacy :

- `/assistant/chat` doit rediriger vers `/assistant` via PRP-233.
- `/assistant/nutrition` et `/assistant/suggestions` restent cachees ; leurs
  fonctions reviennent comme modes internes, pas routes.

URL state :

```txt
/assistant?conversation=<uuid>
/assistant?mode=general|kitchen|shopping|inventory|recipes|nutrition|cooking
```

Regles :

- `conversation` invalide ou cross-user => ouvrir nouvelle conversation ;
- `mode` absent => `general` ;
- `mode` inconnu => `general` ;
- ne pas ajouter de sous-route par mode.

## 5. Layout cible

### Desktop

- sidebar gauche : conversations recentes + bouton nouvelle conversation ;
- zone centrale : thread messages ;
- panneau droit optionnel : contexte actif + memories ;
- composer sticky en bas.

### Mobile

- header compact ;
- thread plein ecran ;
- composer sticky ;
- bouton micro integre ;
- historique dans drawer ;
- panneau memoire/contexte derriere un bouton.

### Composer

Contient :

- input texte ;
- bouton micro local ;
- bouton envoyer ;
- menu mode ;
- indicator upload/processing.

Modes alignes sur le schema PRP-223 :

| UI label | Enum |
| --- | --- |
| General | `general` |
| Cuisine | `kitchen` |
| Courses | `shopping` |
| Inventaire | `inventory` |
| Recettes | `recipes` |
| Nutrition bien-etre | `nutrition` |
| Cooking pas-a-pas | `cooking` |

Les modes changent le scope des tools/prompt, pas la route.

## 6. Composants frontend

### 6.1 Page

Decision : refactorer `src/pages/assistant/AssistantDashboard.tsx` en place.

Ne pas creer `src/pages/Assistant.tsx` dans PRP-224 : cela ajouterait une
surface concurrente.

Cible :

- `AssistantDashboard.tsx <= 300` lignes ;
- extraire tout composant repetitif dans `src/components/assistant`.

### 6.2 Composants a creer ou reutiliser

| Composant PRP-224 | Etat | Action |
| --- | --- | --- |
| `AssistantConversationList` | `ConversationHistoryList.tsx` existe | renommer ou wrapper |
| `AssistantMemoryPanel` | `MemoryPanel.tsx` existe | reutiliser/wrapper |
| `AssistantConfirmationCard` | dans `AssistantResultDialog` | extraire |
| `AssistantUndoToast` | dans `AssistantResultDialog` | extraire ou Toast local |
| `AssistantVoiceButton` | `AssistantFAB` existe global | creer bouton local composer, ne pas remplacer FAB |
| `AssistantThread` | absent | creer |
| `AssistantMessage` | absent | creer |
| `AssistantComposer` | absent | creer |
| `AssistantActionCard` | absent | creer |
| `AssistantModePicker` | absent | creer |
| `AssistantContextPanel` | absent | optionnel V1 |
| `AssistantEmptyState` | `EmptyState` generique existe | wrapper leger si wording specifique |

Distinction panels :

- `AssistantMemoryPanel` = memoire longue duree (`MemoryPanel`) ;
- `AssistantContextPanel` = contexte actif de la conversation : mode courant,
  action pending, dernier inventaire/recette utilise, session context. V1 peut
  le garder minimal ou le fusionner avec le panneau droit.

## 7. Hooks frontend

| Hook | Etat | Action |
| --- | --- | --- |
| `useAssistantVoice` | existe | ajouter `conversationId` si PRP-233 ne l'a pas fait |
| `useAssistantConversations` | existe | reutiliser |
| `useAssistantMessages` | existe dans `useAssistantConversations.ts` | reutiliser/extract |
| `useAssistantMemories` | existe | reutiliser |
| `useCookingJournal` | existe | reutiliser |
| `useAssistantConversation` | absent | creer pour conversation courante |
| `useAssistantActions` | absent | creer si action cards ont besoin d'etat local |
| `useAssistantHistorySearch` | absent | creer apres endpoint search |

## 8. Etats UI

### Recording

- onde ou barre micro ;
- duree ;
- bouton stop ;
- message "J'ecoute".

### Uploading / Processing

- transcription si disponible ;
- "Je verifie ton inventaire..." ;
- skeleton de reponse.

### Done

- message assistant ;
- actions executees ;
- actions en attente ;
- cout optionnel en detail discret.

### Error

- erreur lisible ;
- retry ;
- conserver le texte si possible.

### Empty

- message sobre ;
- CTA "Demander quelque chose" ;
- exemples courts non fake, jamais chiffres inventes.

## 9. Cartes d'actions

Chaque action doit etre comprehensible sans lire du JSON.

Exemples :

- "Ajoute 6 produits a ton inventaire"
- "Ajoute 4 articles a ta liste de courses"
- "Propose 3 recettes faisables ce soir"
- "Importe cette recette depuis un lien"

Champs :

- tool ;
- statut ;
- preview humaine ;
- impact ;
- bouton confirmer si necessaire ;
- bouton annuler si reversible ;
- lien vers l'objet cree.

Reutilisation :

- `AssistantResultDialog` reste disponible pour le FAB ;
- PRP-224 extrait des cards partageables pour afficher les memes actions inline
  dans le thread.

## 10. Contrat API

PRP-221/223 exposent deja :

```txt
POST /api/assistant/voice
POST /api/assistant/text
POST /api/assistant/actions/execute
POST /api/assistant/actions/:id/undo
GET  /api/assistant/conversations
POST /api/assistant/conversations
GET  /api/assistant/conversations/:id
GET  /api/assistant/conversations/:id/messages
POST /api/assistant/conversations/:id/archive
GET  /api/assistant/memories
PATCH /api/assistant/memories/:id
POST /api/assistant/memories/:id/forget
POST /api/assistant/memories/:id/promote
GET  /api/assistant/cooking-journal
POST /api/assistant/cooking-journal
```

PRP-224 ajoute :

```txt
PATCH  /api/assistant/conversations/:id
DELETE /api/assistant/conversations/:id
GET    /api/assistant/search?q=
```

Ne pas ajouter `GET /api/assistant/sessions/:id` : cet endpoint n'existe pas et
la notion de session PRP-221 est interne a un tour agent.

### 10.1 Texte : `/text` reste canonique

Decision : ne pas ajouter `POST /conversations/:id/messages` pour envoyer un
message utilisateur a l'agent.

Raison :

- `/api/assistant/text` accepte deja `conversation_id` cote backend ;
- il passe par `VoiceAgentService`, tool planning, action log, memory et undo ;
- un endpoint REST-y separé risquerait de bypasser l'agent.

Frontend a corriger :

- `postAssistantText(input)` accepte `conversationId?: string` ;
- payload JSON inclut `conversation_id` si present ;
- `postAssistantVoice(input)` accepte `conversationId?: string` ;
- multipart inclut `conversation_id` si present.

### 10.2 Conversation update/delete

Ajouter cote API :

- `PATCH /conversations/:id` :
  - renommer conversation ;
  - changer `mode` ;
  - archiver via `status='archived'` si besoin.
- `DELETE /conversations/:id` :
  - soft delete `status='deleted'` ;
  - pas de hard delete V1.

Service cible :

- `MemoryService.renameConversation(id, userId, title)`
- `MemoryService.updateConversation(id, userId, patch)`
- `MemoryService.softDeleteConversation(id, userId)`

### 10.3 Search

Endpoint :

```txt
GET /api/assistant/search?q=<query>&limit=20
```

V1 :

- `ilike` sur `assistant_messages.content` et summaries ;
- pas de vector search ;
- resultats retournent `conversation_id`, `message_id`, snippet, created_at.

## 11. Data flow

### Texte

```txt
User typed message
  -> POST /assistant/text with conversation_id
  -> VoiceAgentService text path
  -> tool planning/execution
  -> assistant_messages + action_log
  -> response rendered in thread
```

### Voix

```txt
MediaRecorder
  -> POST /assistant/voice with conversation_id
  -> Whisper
  -> transcript saved as user message
  -> tool planning/execution
  -> assistant response saved
  -> UI renders transcript + answer + actions
```

### Confirm / undo

```txt
Pending action card
  -> POST /assistant/actions/execute
  -> assistant_action_log updated
  -> agentEvents invalidates affected state
  -> inline card updates
```

## 12. Historique et recherche

Historique :

- conversations triees par `last_message_at` ;
- titre auto-genere V1 = premier message user tronque a 50 caracteres ;
- rename manuel via `PATCH /conversations/:id` ;
- archive ;
- soft-delete ;
- filtre par mode.

Recherche :

- recherche texte dans messages et summaries ;
- resultats ouvrent `/assistant?conversation=<id>` ;
- scroll/highlight exact message en V2 ;
- V1 peut afficher le snippet sans scroll precise.

## 13. Memoire et contexte visibles

Memoire :

- reutiliser `MemoryPanel` comme source V1 ;
- bouton "oublier" ;
- candidates sensibles affichent la mention sante PRP-223.

Contexte actif :

- mode courant ;
- conversation courante ;
- actions pending ;
- memories utilisees si disponibles dans metadata ;
- V1 peut rester minimal.

L'assistant peut dire :

- "Je te propose ca parce que tu m'as dit preferer les repas high-protein."

## 14. Guardrails UX

### Confiance

Toujours montrer les actions avant/pendant/apres :

- low risk : execute + undo visible ;
- medium : execute si clair, sinon clarification ;
- high : confirmation explicite.

### Sante / nutrition

En mode nutrition, afficher une mention sobre :

- "Conseils bien-etre, pas un diagnostic medical."

Pas d'alerte intrusive sur chaque message.

### Donnees

Boutons :

- "Gerer ma memoire"
- "Archiver cette conversation"
- "Effacer cette conversation"

`Effacer cette conversation` = soft delete, pas hard delete.

## 15. Accessibilite, mobile, perf

Accessibilite :

- composer accessible au clavier ;
- `Enter` envoie, `Shift+Enter` nouvelle ligne ;
- boutons micro/stop/envoyer avec `aria-label` ;
- action cards focusables ;
- confirmation utilisable clavier ;
- axe/manual checklist sur `/assistant`.

Mobile :

- composer non masque par clavier ;
- zone thread reste scrollable ;
- drawer historique ferme avec Escape/backdrop ;
- boutons 44x44 minimum.

Perf :

- mesurer chunk assistant avant/apres ;
- cible `Assistant-*.js <= 400 kB gzip` apres split ;
- si au-dessus : justification dans PR + follow-up PRP-231/perf.

## 16. Strategie PR splitting

PRP-224 ne doit pas etre une PR geante.

| PR | Scope | Fichiers principaux | Verification |
| --- | --- | --- | --- |
| PR0 | Verifier PRP-233 mergee | `App.tsx`, `AssistantDashboard`, `useAssistantVoice` | `/assistant/chat` redirect OK |
| PR1 | API gaps + hooks | `assistant.memory.ts`, `MemoryService.ts`, `assistantApi.ts`, new hooks | api tests + tsc |
| PR2 | Composants atomiques | `src/components/assistant/*` | compile + unit tests |
| PR3 | Refonte page `/assistant` | `AssistantDashboard.tsx` + composants | smoke thread/composer |
| PR4 | Sidebar history + search | history/search hooks/components | search opens conv |
| PR5 | Modes picker + cleanup | mode picker, wording, a11y/mobile | 7 modes + grep verboten |

Chaque PR doit etre revertable independamment.

## 17. Tests

Commandes :

- `npm run build`
- `npx tsc --noEmit -p tsconfig.json`
- `npm run lint`
- `npm run test:api -- assistant`

Unitaires minimum :

- `AssistantMessage` render user/assistant/tool ;
- `AssistantActionCard` render executed/pending/failed ;
- `AssistantConfirmationCard` buttons state ;
- `AssistantComposer` Enter vs Shift+Enter ;
- `AssistantModePicker` enum mapping 7 modes ;
- `useAssistantConversation` invalid conversation fallback ;
- `useAssistantHistorySearch` empty/loading/results ;
- `AssistantUndoToast` reversible/non-reversible.

Integration minimum :

- send text -> message user + assistant visible ;
- voice response -> transcript visible ;
- pending action -> confirmation -> executed ;
- undo action -> status updated ;
- search result opens conversation ;
- soft delete hides conversation from active list.

Visual QA :

- desktop 1440 ;
- laptop 1280 ;
- mobile 390 ;
- long message ;
- many actions ;
- empty state ;
- mobile keyboard open.

A11y QA :

- keyboard tab order composer -> thread actions -> sidebar ;
- Escape closes drawer/dialog ;
- screen reader labels on mic/send/confirm/undo ;
- no focus trap dead-end.

## 18. Definition of Done

- `/assistant` est une interface conversationnelle premium, pas une vitrine.
- `/assistant/chat` n'est plus une experience separee.
- Texte et voix fonctionnent dans la conversation courante.
- `conversation_id` est transmis par texte et voix.
- Les conversations persistent et se reprennent via `/assistant?conversation=`.
- L'utilisateur voit les actions executees ou en attente inline.
- Confirmation et undo fonctionnent depuis l'UI.
- L'historique est consultable en sidebar/drawer.
- Recherche conversationnelle V1 fonctionne.
- L'utilisateur peut gerer les memories visibles via `MemoryPanel`.
- Aucun mode assistant ne renvoie vers une route factice.
- `AssistantDashboard.tsx <= 300` lignes.
- `rg -n "Chat IA|IA Rapide|Fonctionnalit[eé]s IA|Assistant IA|Actions Rapides" src`
  retourne zero hors docs/tests acceptes.
- Au moins 8 tests unitaires et 4 tests integration couvrent l'assistant UX.
- Chunk assistant mesure avant/apres ; cible `<= 400 kB gzip` ou justification.
- Mobile composer non masque par clavier.

## 19. Non-objectifs V1

- Pas de Realtime voice.
- Pas de voice out obligatoire.
- Pas de streaming token-by-token obligatoire.
- Pas de nutrition coach complet.
- Pas de vector search obligatoire.
- Pas de hard delete conversation.
- Pas de migration des anciens chats legacy.

## 20. Questions tranchees

| Question | Decision V1 |
| --- | --- |
| `/assistant/chat` alias ou redirect ? | Redirect simple vers `/assistant` |
| `POST /conversations/:id/messages` ? | Non, utiliser `/assistant/text` avec `conversation_id` |
| Titre auto-genere ? | Premier message user tronque a 50 caracteres |
| `AssistantContextPanel` vs `MemoryPanel` ? | Distincts ; MemoryPanel long-terme, ContextPanel contexte actif minimal |
| Search V1 ? | Oui, `ilike`/summary, pas vector |
| Delete conversation ? | Soft delete `status='deleted'` |
| Modes | 7 modes alignes PRP-223 schema |
