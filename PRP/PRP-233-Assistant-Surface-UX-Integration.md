# PRP-233 — Assistant Surface UX Integration

> Statut : **DRAFT — remis a jour apres audit terrain**
> Date : 2026-05-14
> Source : `docs/PAGE-UI-UX-AUDIT-2026.md` §3.14-§3.15
> Lie a : PRP-221, PRP-223, PRP-224, PRP-225, PRP-226, PRP-227
> Objectif : aligner `/assistant`, le FAB global et les routes legacy en une
> seule experience assistant conversationnelle.

## 1. Contexte

La vision produit est voice-first : un assistant cuisine personnel avec memoire,
actions, recettes, inventaire, courses et recommandations. L'audit dit que
`/assistant` ne peut plus etre une vitrine de fonctionnalites.

PRP-233 ne remplace pas PRP-224.

Frontiere claire :

- PRP-233 livre le **MVP surface assistant** :
  - `/assistant` devient une surface de conversation fonctionnelle ;
  - input texte + bouton micro inline ;
  - rendu simple des messages ;
  - rendu inline des actions executees/pending ;
  - FAB rattache a une conversation visible ;
  - `/assistant/chat` redirige vers `/assistant`.
- PRP-224 livre le polish ChatGPT-like :
  - streaming token par token ;
  - reprise conversation par URL riche ;
  - recherche dans conversations ;
  - markdown/code blocks riches ;
  - layout mobile type bottom-sheet ;
  - UX multi-session avancee.

## 1.1 Etat verifie 2026-05-14

| Surface | Etat actuel | Statut |
| --- | --- | --- |
| `/assistant` page conversation principale | encore dashboard/vitrine avec quick actions | a refaire |
| `MemoryPanel` | monte dans `AssistantDashboard` | acquis PRP-223 |
| `ConversationHistoryList` | monte dans `AssistantDashboard` | acquis PRP-223 |
| `/assistant/chat` | encore route reelle vers `AssistantAI` | a rediriger |
| FAB global | monte via `AssistantProvider` dans `App.tsx` | acquis PRP-221 |
| `conversation_id` backend | present dans `VoiceAgentService` et `assistantApi` | acquis PRP-223 |
| FAB continuity | pas encore reutilise cote frontend | a faire |
| `agentEvents.ts` | consomme par `AssistantProvider` + hooks data | garder/documenter |
| Confirm/undo cards | `AssistantResultDialog.tsx` existe | acquis PRP-221 |
| Input texte inline `/assistant` | absent | a faire |
| Fil messages type MVP | absent | a faire |

Conclusion : PRP-233 doit se concentrer sur la surface `/assistant`, le redirect
legacy et la continuite conversation FAB. Ne pas reimplementer la memoire.

## 2. Decisions produit

- `/assistant` devient la page conversation principale.
- Le FAB global reste un raccourci de capture partout dans l'app.
- Le FAB ne cree pas une deuxieme experience concurrente.
- `/assistant/chat` redirige vers `/assistant`.
- Le dashboard/vitrine Assistant disparait.
- Le wording visible est "Assistant", pas "Assistant IA".

### 2.1 Continuite conversation FAB

Decision V1 : **sticky 2h**.

Comportement :

- quand `/assistant` a une conversation active, stocker son id dans
  `sessionStorage.assistant.lastConversationId` avec timestamp ;
- le FAB reutilise cette conversation pendant 2h ;
- si l'id expire, appartient a un autre user, ou echoue cote API, le backend cree
  une nouvelle conversation ;
- apres chaque reponse FAB, `conversation_id` est mis a jour dans le storage ;
- le resultat FAB propose "Ouvrir la conversation" vers `/assistant`.

Raison : assez de continuite pour cuisiner/naviguer dans l'app, sans coller
toute la journee a une vieille session.

## 3. Scope

### Inclus

- Cleanup wording AssistantDashboard.
- Redirection `/assistant/chat` -> `/assistant`.
- Page `/assistant` conversationnelle MVP.
- Input texte inline.
- Bouton micro inline.
- Rendu messages basique.
- Rendu actions executees/pending.
- Confirm/undo cards reutilisant `AssistantResultDialog` ou composants partages.
- Historique sessions deja fourni par PRP-223, integre proprement.
- Rattachement FAB global a une conversation sticky 2h.
- Documentation `agentEvents.ts`.

### Exclus

- Realtime voice speech-to-speech.
- ChatGPT-like complet : PRP-224.
- Nutrition coach complet.
- OpenFoodFacts enrichment complet.
- Long-term memory engine : PRP-223 deja source de verite.
- Refonte design system : PRP-231.

## 4. UX cible

### Page `/assistant`

Doit afficher directement :

- header sobre : `Assistant` + sous-titre court ;
- conversation courante ;
- transcription des demandes vocales ;
- reponses assistant ;
- actions executees ;
- actions en attente de confirmation ;
- bouton annuler quand action reversible ;
- input texte ;
- bouton micro ;
- panneau memoire/historique discret, pas hero.

Interdit :

- hero marketing ;
- cards "fonctionnalites IA" ;
- exemples fake ;
- promesses non branchees ;
- "Chat IA" ;
- "IA Rapide".

### Header cible

Minimal :

- `h1`: `Assistant`
- sous-titre : `Dicte, demande ou confirme une action.`

Pas de gros bloc "Votre assistant intelligent..." ni grille de features.

### FAB global

Comportement :

1. utilisateur parle depuis n'importe quelle page ;
2. hook envoie `conversation_id` sticky si disponible ;
3. transcription + tool plan PRP-221 ;
4. si action simple : feedback court + undo ;
5. si question/reponse longue : proposer "Ouvrir la conversation" ;
6. tout est ajoute a l'historique conversation.

## 5. Wording

| Ancien | Nouveau |
| --- | --- |
| Assistant IA | Assistant |
| Chat IA | Conversation |
| IA Rapide | Demander |
| Fonctionnalites IA | supprimer la section |
| Fonctionnalités IA | supprimer la section |
| Actions Rapides | supprimer si ce sont des cards de vitrine |
| Confirmer l'action | Confirmer |
| Annuler l'action | Annuler |

Fichiers a patcher en PR1 :

- `src/pages/assistant/AssistantDashboard.tsx`
  - lignes actuelles `Chat IA`, `IA Rapide`, `Actions Rapides`,
    `Assistant IA`.
- `src/components/navigation/NavigationHub.tsx`
  - verifier labels/sous-titres encore `Assistant IA`.
- `src/App.tsx`
  - route `/assistant/chat`.

Verification PR1 :

```bash
rg -n "Chat IA|IA Rapide|Fonctionnalit[eé]s IA|Assistant IA|Actions Rapides" src
```

Le resultat doit etre zero hors docs/tests explicitement acceptes.

## 6. Etats UX

### Loading

- "J'ecoute..."
- "Transcription..."
- "Je prepare les actions..."
- "Action executee"

### Pending high-risk

- Resume lisible.
- Bouton Confirmer.
- Bouton Annuler.
- Raison : "Cette action modifie beaucoup d'elements" ou "Cette action supprime
  des donnees".

Pas de bouton "Modifier" en V1 : il suggere un editeur d'action qui n'existe
pas encore. PRP-224 pourra ajouter edition fine plus tard.

### Erreur

- Message humain.
- Option relancer.
- Aucun stack trace visible.

## 7. Integration data

Server state :

- conversations/messages via hooks PRP-223 ;
- memories via `MemoryPanel` ;
- actions via `AssistantPlanResponse` + `assistant_action_log`.

Cache invalidation :

- `src/lib/agentEvents.ts` est a garder ;
- il est consomme par `AssistantProvider` et les hooks data (`useInventory`,
  `useShoppingList`, `useRecipes`, etc.) ;
- PRP-233 doit seulement documenter en tete du fichier que c'est le pont
  d'invalidation pour les writes agent.

Toute action executee invalide les caches concernes :

- inventory ;
- shopping list ;
- recipes ;
- meal plan ;
- waste si applicable ;
- `cooking_journal` apres PRP-223 PR7 ;
- conversations/messages quand `conversation_id` change ou quand un message est
  enregistre.

Ne pas remplacer `agentEvents.ts` par un second event bus.

## 8. Fichiers cibles

| Fichier | Action |
| --- | --- |
| `src/pages/assistant/AssistantDashboard.tsx` | remplacer dashboard/vitrine par surface conversation MVP |
| `src/App.tsx` | redirect `/assistant/chat` vers `/assistant` |
| `src/hooks/useAssistantVoice.ts` | accepter `conversationId`, transmettre aux calls |
| `src/services/assistantApi.ts` | ajouter `conversationId` aux `postAssistantVoice/Text` si absent |
| `src/components/assistant/AssistantProvider.tsx` | sticky conversation 2h + lien ouvrir conversation |
| `src/components/assistant/AssistantResultDialog.tsx` | afficher/renvoyer conversation_id si besoin |
| `src/lib/agentEvents.ts` | documenter, ajouter `cooking_journal` si type supporte |
| `src/components/assistant/ConversationHistoryList.tsx` | naviguer vers `/assistant?conversation=:id`, pas `/assistant/chat` |

Nouveaux composants autorises si le dashboard depasse la cible :

- `src/components/assistant/AssistantConversationSurface.tsx`
- `src/components/assistant/AssistantMessageThread.tsx`
- `src/components/assistant/AssistantComposer.tsx`
- `src/components/assistant/AssistantActionInlineCard.tsx`

## 9. Tests et verification

Commandes :

- `npm run build`
- `npx tsc --noEmit -p tsconfig.json`
- `npm run lint`

Smoke routes :

- `/assistant`
- `/assistant/chat` redirige vers `/assistant`
- `/assistant?conversation=<id>` charge la conversation si elle existe
- FAB depuis `/kitchen/recipes`
- FAB depuis `/shopping/list`
- FAB depuis `/pantry/inventory`

Tests E2E minimum :

- envoyer texte inline sur `/assistant` -> response contient `conversation_id`
  -> message visible dans le fil ;
- tap FAB depuis 3 pages dans les 2h -> meme `conversation_id` reutilise ;
- action low-risk `add_shopping_items` mockee -> cache shopping invalide ;
- action pending high-risk mockee -> carte Confirmer/Annuler visible ;
- undo action reversible -> cache concerne invalide.

Verification mobile :

- input non masque par clavier ;
- bouton micro accessible ;
- cards actions lisibles ;
- tap target min 44px.

Verification wording :

```bash
rg -n "Chat IA|IA Rapide|Fonctionnalit[eé]s IA|Assistant IA|Actions Rapides" src
```

Verification taille :

```bash
wc -l src/pages/assistant/AssistantDashboard.tsx
```

Cible : `AssistantDashboard.tsx <= 250` lignes. Si plus long, extraire les
composants listes en §8.

## 10. Strategie PR splitting

PRP-233 ne doit pas etre une PR geante.

| PR | Scope | Verification principale |
| --- | --- | --- |
| PR1 | wording cleanup + redirect `/assistant/chat` -> `/assistant` | grep wording = 0 |
| PR2 | refonte `/assistant` en surface conversation MVP | dashboard <= 250L |
| PR3 | FAB sticky conversation 2h + storage/session continuity | FAB 3 pages meme conv |
| PR4 | documentation `agentEvents`, cache invalidation, smoke/mobile tests | tests + screenshots |

Chaque PR doit etre revertable independamment.

## 11. Definition of Done

- `/assistant` n'est plus une page vitrine.
- `/assistant/chat` redirige vers `/assistant`.
- `ConversationHistoryList` ne navigue plus vers `/assistant/chat`.
- FAB global et page assistant partagent une conversation sticky 2h.
- Input texte + bouton micro inline existent sur `/assistant`.
- Les actions ont confirm/undo lisibles.
- Pending high-risk propose seulement Confirmer/Annuler en V1.
- `agentEvents.ts` est documente et conserve comme pont d'invalidation.
- `cooking_journal` est pris en compte dans l'invalidation si PRP-223 PR7 est
  present.
- `AssistantDashboard.tsx <= 250` lignes ou composants extraits.
- `rg "Chat IA|IA Rapide|Fonctionnalit[eé]s IA|Assistant IA|Actions Rapides" src`
  retourne zero hors docs/tests acceptes.
- Smoke `/assistant`, `/assistant/chat`, FAB mobile/desktop passe.

## 12. Non-objectifs

- Pas de Realtime API.
- Pas de streaming token-rich.
- Pas de recherche conversation avancee.
- Pas de markdown renderer avance.
- Pas de settings memoire/nutrition : PRP-235.
- Pas de recommandations nutrition/personnalisation avancees : PRP-226/227.
