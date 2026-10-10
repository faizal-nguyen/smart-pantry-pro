# PRP V10-03E — Dictée et voix en cuisine

> Statut : spécification rédigée ; réalisation non commencée ; conversation continue à prototyper.
> Date : 2026-10-09.
> Priorité : P1 pour la dictée ; prototype mains libres avant choix d'intégration native.
> Dépendances : commandes V10-01/V10-02, politique de [V10-03C](PRP-V10-03C-Memoire-Fiable.md), backend et budgets de [V10-03D](PRP-V10-03D-Agent-Modeles.md).
> Coordination : langage et composants de [V10-03B](PRP-V10-03B-Design-Culinaire.md) ; preuves de cycle de vie natif dans [V10-04](PRP-V10-04-Prototype-iOS.md).
> Source : [audit du 9 octobre](../../docs/AUDIT-DESIGN-MEMOIRE-VOIX-2026-10-09.md), V01 et inventaire audio ; référence locale `dda2602`.
> Estimation indicative : 3 à 5 jours pour la dictée, puis 2 à 4 jours de prototype et mesures, hors contraintes matérielles découvertes.

## 1. Problème et résultat attendu

Le micro de la conversation complète enregistre au plus soixante secondes et transcrit après arrêt avec `whisper-1`. L'aide contextuelle quotidienne est textuelle. La restitution vocale actuelle utilise le navigateur pour certains retours de stock ; elle ne constitue pas une conversation parlée complète.

Le lot poursuit deux résultats distincts :

1. Une dictée actualisée, accessible depuis les contextes utiles, avec texte visible et corrigeable avant l'exécution.
2. Un prototype comparatif pour déterminer si la cuisine mains libres apporte un gain suffisant et quel transport convient.

La documentation OpenAI consultée annonce l'arrêt de Whisper au **26 février 2027**. La migration de transcription est nécessaire indépendamment d'une éventuelle conversation continue. [Dépréciations OpenAI](https://developers.openai.com/api/docs/deprecations).

## 2. Périmètre et limites

Inclus en production : remplacement du transcripteur, adaptation de son contrat, micro contextuel, états cohérents, correction du texte, gestion des interruptions, coût et tests audio français.

Inclus en prototype : écoute/restitution en cuisine, interruptions, comparaison de transports et décision argumentée. Une conclusion « conserver la dictée et différer la conversation continue » est recevable si les preuves montrent un bénéfice insuffisant.

Le responsive est validé au premier plan. Verrouillage, suspension et comportement Bluetooth sont observés et documentés sur iPhone, sans promettre une continuité que Safari ne permet pas. La preuve native de ces capacités appartient à V10-04.

Il n'y a pas de dépendance circulaire : V10-03E fournit la dictée et la décision web ; V10-04 examine ensuite les capacités natives encore ouvertes. La conversation continue n'est pas une précondition imposée au pilote iOS.

## 3. État de départ et surfaces actives

| Élément | État établi | Travail prévu |
| --- | --- | --- |
| [useAssistantVoice](../../src/hooks/useAssistantVoice.ts) | MediaRecorder, formats web/MP4 selon disponibilité, limite 60 s | Formats iOS réels, interruption, annulation et nettoyage |
| [WhisperTranscriber](../../apps/api/src/services/media/WhisperTranscriber.ts) | `whisper-1`, `verbose_json`, `language`, prompt borné | Adaptateur de transcription actuel, pas un changement de chaîne seul |
| [AssistantComposer](../../src/components/assistant/AssistantComposer.tsx) | Micro dans la conversation complète | Brouillon transcrit éditable et états partagés |
| [RoutineHeader](../../src/components/navigation/RoutineHeader.tsx) | Aide textuelle et tools autorisés en lecture | Dictée dans la même conversation, scope préservé |
| [assistantApi](../../src/services/assistantApi.ts) | Entrées texte/voix, actions et confirmation | Séparer transcription et exécution dans le nouveau parcours |
| [voiceOutputService](../../src/services/voice/voiceOutputService.ts) | `speechSynthesis` pour des retours d'inventaire | Inventorier les callers avant restitution cohérente et facultative |

Les anciens hooks simulés ou composants non montés ne prouvent pas une capacité vocale disponible. E0 confirme routes, authentification, tailles de payload et fonctionnalités du navigateur sur l'appareil réel.

## 4. Transcription actualisée

`gpt-transcribe` est le candidat de migration pour les fichiers enregistrés. Son contrat doit être implémenté à partir des documents courants : formats de réponse, langues, hints, tailles et compteurs réellement disponibles.

La documentation actuelle distingue `languages` des anciens paramètres de langue. Ne pas conserver aveuglément `verbose_json`, `language`, durée ou segments comme s'ils étaient toujours retournés. Ne pas inventer un score de confiance absent de la réponse.

Un adaptateur typé expose au produit : texte, modèle demandé/servi lorsque connu, langue si disponible, durée et provenance de cette durée, reçu de coût et identifiant de transcription. Champs inconnus nullables.

Valider MIME réel, taille et durée côté serveur. La limite client de soixante secondes est aussi contrôlée côté serveur selon les métadonnées fiables disponibles ; une durée fournie par le client n'est pas une preuve de facturation.

Tester le format effectivement émis par Safari, son contenu et le décodage serveur. Un fallback de format utilise une capacité vérifiée, pas une extension de fichier renommée.

Sources : [transcription](https://developers.openai.com/api/docs/guides/transcription), [speech-to-text](https://developers.openai.com/api/docs/guides/speech-to-text), [gpt-transcribe](https://developers.openai.com/api/docs/models/gpt-transcribe). Au 9 octobre 2026, le tarif affiché est de 0,0045 USD par minute ; coût et durée réels ou estimés doivent être qualifiés.

## 5. Séparer dicter et agir

Proposer une route authentifiée nouvelle, à confirmer suivant les conventions API :

```text
POST /api/v1/assistant/transcribe
Entrée : fichier audio, identifiant de requête, langues/hints bornés
Sortie : transcription + métadonnées + reçu de coût
Effet : aucune commande métier et aucun tool d'écriture
```

Le nouveau parcours est **enregistrer → transcrire → afficher/corriger → envoyer au backend texte**. Il évite de laisser corriger une phrase après qu'elle a déjà modifié le stock.

Réutiliser ensuite `postAssistantText`, la conversation et les contrats d'actions. Un envoi, une reprise ou un résultat tardif suivent les identités et reçus existants ; un simple changement de transport ne répète pas l'effet.

La route voix historique reste compatible tant que ses callers ne sont pas migrés ou retirés explicitement. Inventorier ces callers et appliquer la politique mémoire sur ce chemin aussi. La nouvelle UI ne l'utilise pas comme une simple étape de transcription si elle exécute déjà des tools.

Le serveur borne les hints et impose le scope de l'entrée concernée. Le micro de l'aide contextuelle ne débloque pas soudain les écritures de stock autorisées dans une autre conversation.

## 6. États et interaction

| État | Information et action utile |
| --- | --- |
| Prêt | Micro explicite ; permission demandée au moment utile |
| Écoute | Indicateur clair, durée et arrêter/annuler |
| Transcription | Attente et annulation ; aucune promesse de stock modifié |
| Brouillon | Texte visible, correction ou nouvelle prise, puis envoyer |
| Traitement métier | Travail en cours ; préserver le brouillon et la référence de requête |
| Confirmation nécessaire | Montrer l'action et les quantités selon la politique métier |
| Résultat | Effet effectivement confirmé, ou état en attente/à corriger |
| Interruption / erreur | Expliquer, garder ce qui peut être repris et proposer une action |

Une capture annulée n'est pas envoyée. Une réponse de transcription ancienne ne remplace pas une nouvelle saisie. Libérer tracks, listeners et buffers après arrêt, erreur, déconnexion ou navigation.

Une action déjà confirmée par le serveur ne peut pas être annulée fictivement par fermeture du micro : afficher son reçu et proposer une correction si nécessaire. Une annulation avant exécution empêche l'envoi métier.

Ne pas rendre le texte dépendant du micro. Permission refusée, lecteur vocal désactivé et API indisponible conservent la saisie manuelle.

## 7. Continuité et contexte

Le texte dicté rejoint la conversation actuelle. Conserver `conversationId`, compte, recette ou tâche, contexte du repas et scope ; distinguer nouvelle conversation, nouveau tour et nouvelle commande.

Les informations persistantes suivent V10-03C. Les hints de reconnaissance ne contiennent pas automatiquement profil de santé ou souvenirs privés. Leur finalité et leurs données autorisées sont limitées à la reconnaissance de la demande.

Le mode cuisine peut lire une étape, expliquer une technique, répéter, avancer ou lancer un minuteur selon les capacités validées. Une adaptation de recette revalide ses ingrédients et contraintes par le moteur, pas par la voix seule.

La confirmation de fin de cuisine et la consommation du stock utilisent le contrat V10 existant. Aucun succès n'est annoncé sur la seule intention comprise.

## 8. Prototype comparatif mains libres

Comparer trois options avec le même backend, les mêmes permissions et le même corpus :

| Option | Architecture | Question à résoudre |
| --- | --- | --- |
| Pipeline amélioré | Transcription → agent métier → restitution facultative, navigateur comme baseline | Suffit-il pour répéter les étapes et poser des questions avec un délai acceptable ? |
| GPT Live 1 | Couche vocale continue déléguant au backend métier existant | Peut-on gagner en fluidité sans dupliquer agent, mémoire et commandes ? |
| Realtime 2.1 Mini | Session audio interactive et function calling | Le gain justifie-t-il l'intégration, la validation et le coût propres à cette session ? |

`gpt-live-1` est documenté avec un tarif de 0,05 USD par minute de session, auquel s'ajoute le backend. `gpt-realtime-2.1-mini` est tarifé par consommation de texte/audio ; ne pas le présenter comme un prix fixe à la minute.

Realtime Mini ne fournit pas les Structured Outputs selon sa fiche au jour de l'audit. Valider les arguments et autorisations côté serveur, même si un appel de fonction paraît correct.

La transcription progressive avec `gpt-live-transcribe` peut être explorée si le fichier après arrêt reste trop lent ; elle n'est pas une quatrième migration obligatoire. Le streaming d'une réponse de fichier n'est pas une preuve d'écoute audio continue.

Sources : [voice agents](https://developers.openai.com/api/docs/guides/voice-agents), [migration Live](https://developers.openai.com/api/docs/guides/live-migration), [GPT Live 1](https://developers.openai.com/api/docs/models/gpt-live-1), [Realtime 2.1 Mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini).

## 9. Autorité serveur et session audio

Une session continue ne reçoit pas une clé OpenAI durable. Les credentials temporaires éventuels sont délivrés par le serveur à un utilisateur authentifié, avec durée et scope bornés suivant le contrat fournisseur vérifié.

Les tools repassent par les handlers métier et la validation serveur. Le contexte oral peut demander une opération ; il ne constitue pas sa preuve d'autorisation, ni sa preuve de succès.

Exigences de prototype :

- Identification des tours et commandes ; reconnexion ne rejoue pas une opération déjà reçue.
- Interruption de parole et reprise explicites ; l'audio de restitution ne s'auto-déclenche pas en nouvelle commande.
- Fermeture, expiration, changement de compte et révocation coupent la session et les contextes autorisés.
- Durée, silence, inactivité, appels et coût maximal sont bornés ; aucun micro permanent au chargement de la page.
- Le résultat oral respecte actions exécutées/en attente et informations du moteur.
- Les limites d'arrière-plan sont exposées sans promettre des minuteurs ou traitements garantis par une session web.

Le budget E0 est fixé avant essais facturés. Comptabiliser transcription, session, modèle métier et restitution lorsqu'elle est facturée. Ne pas annoncer un total exact si une composante manque.

## 10. Matrice de tests audio et matériel

| Axe | Cas obligatoires | Preuve |
| --- | --- | --- |
| Français culinaire | Quantités, fractions, grammes/litres/pièces, marques et noms d'ingrédients | Texte et arguments attendus sur corpus fictif annoté |
| Négation et correction | « N'ajoute pas », « deux, non trois », « sans », arrêt en milieu de phrase | Aucune écriture incohérente ou prématurée |
| Environnement | Silence, hotte, distance usuelle, parole hésitante | Erreurs quantité/unité/produit mesurées séparément |
| Permissions et formats | Refus, Safari MP4 réel, Chrome WebM si disponible | Retour texte utilisable et transcription vérifiée |
| Audio | Haut-parleur, écouteurs et Bluetooth, changement de sortie | Route audio, écho, interruption et restitution consignés |
| Cycle de vie | Navigation, appel entrant, écran verrouillé, arrière-plan | Arrêt/reprise réel documenté, sans assimiler web et natif |
| Réseau | Lent, coupé, réponse perdue, reconnexion | Résultat vérifié, aucune double commande |
| Compte et confidentialité | Déconnexion, autre compte, partage révoqué en cours | Aucun ancien audio ou contexte réutilisé |

Relever fin de parole → texte, envoi → premier résultat utile, première parole, p50/p95, corrections, abandon et coût par tâche réussie. Comparer les options avec même backend et mêmes réglages ; les versions du modèle ne sont pas changées en cours de comparaison.

La relecture humaine compare le sens utile, pas seulement une distance de caractères. Une négation ou une unité fausse est plus grave qu'une ponctuation différente.

## 11. Découpage de réalisation

| Étape / PR | Livrable | Condition |
| --- | --- | --- |
| E0 — Référence | Cartographie audio, formats iPhone, corpus, budget et baseline | Environnement et consentements identifiés |
| E1 — Dictée serveur | Adaptateur actuel, endpoint sans tools et contrat de coût | Paramètres/réponses vérifiés ; erreurs et limites testées |
| E2 — Dictée UI | Brouillon éditable et micro dans les contextes utiles | Scope, conversation et annulation préservés |
| E3 — Matériel | Safari iPhone, Bluetooth et interruptions | Différences navigateur/appareil consignées |
| E4 — Comparaison | Prototypes bornés pipeline/Live/Realtime | Backend et politique de mémoire communs, coûts mesurés |
| E5 — Décision | Transport retenu ou report de la voix continue, handoff natif | Bénéfice, risques et estimation documentés |

E1/E2 peuvent avancer avec le backend courant, une fois la politique C validée ; ils n'attendent pas le choix final de modèle D. E4 utilise un backend stable issu de D pour que la comparaison porte sur la voix.

La réalisation du lot inclut dictée homologuée et décision de prototype. Elle ne signifie pas mise en production automatique des trois transports ni validation native de l'arrière-plan.

## 12. Vérification et critères de sortie

Tests simulés : MediaRecorder absent/refusé, durée dépassée, MIME invalide, transcription interrompue, saisie modifiée pendant la réponse, compte changé, stop/annuler, tool invalidé et résultat métier incertain.

Tests serveur : route authentifiée, limites audio, aucun tool lors de transcription, refus de scope élargi, compteurs de coût et reprise avec mêmes identités. Exécuter suites V10 concernées, tests du transcripteur et du transport, puis `npm run build`.

Les tests automatisés ne prouvent pas qualité microphone, Bluetooth ou écoute en cuisine. Les essais fournisseur utilisent un corpus fictif et un budget déclaré ; ne pas conserver par défaut des enregistrements personnels.

- [ ] La dictée utilise un modèle actuel accessible et son contrat réellement compatible.
- [ ] Une transcription peut être corrigée avant toute exécution du nouveau parcours.
- [ ] Aide contextuelle et conversation complète conservent contexte et portée des tools.
- [ ] Refus de permission, panne, annulation et résultat tardif gardent une issue compréhensible.
- [ ] Quantités, unités, négations et autocorrections ont des résultats mesurés et relus.
- [ ] Aucun cas critique du corpus ne provoque une écriture anticipée, fausse ou répétée.
- [ ] Coût et latence couvrent chaque composante, avec incertitudes visibles.
- [ ] iPhone, Bluetooth, verrouillage, arrière-plan et réseau disposent d'un rapport matériel.
- [ ] La comparaison fournit une décision explicite, y compris si la voix continue est différée.
- [ ] Les capacités natives encore ouvertes sont transmises à V10-04 sans bloquer la dictée web.

## 13. Retour arrière et transmission

Prévoir une sélection serveur du transcripteur et désactiver indépendamment le prototype continu. Whisper ne peut servir de repli au-delà de sa date d'arrêt ; identifier un modèle de remplacement accessible avant cette échéance.

Le retour arrière garde saisie texte, politique de mémoire, reçu métier et brouillon. Il ne réactive pas une annonce de succès avant confirmation serveur.

Livrer corpus annoté, mesures, configuration retenue, rapport iPhone et décision de transport. V10-04 reprend les questions natives : permissions, cycle de vie audio, verrouillage, minuteurs, reconnexion et stockage sécurisé.
