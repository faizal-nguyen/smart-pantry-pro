# Politique de confidentialité — Kitchen OS

*Mise à jour le 27 novembre 2026. Cette politique décrit ce que fait réellement l'application à cette date ; elle remplace la version de janvier 2025.*

## 1. Qui traite vos données

Kitchen OS est une application de cuisine : stock, recettes, courses, menus et assistant.

Le responsable du traitement de vos données est Kitchen OS, 2 rue Berthollet, 94110 Arcueil. Pour toute question sur vos données ou pour exercer vos droits, écrivez à cette adresse (section 11).

## 2. Données traitées

### 2.1 Votre compte

- Votre adresse e-mail et un mot de passe d'au moins 6 caractères, gérés par le service d'authentification de Supabase. Votre adresse doit être confirmée avant la première connexion ; les e-mails d'authentification (confirmation, réinitialisation du mot de passe) sont envoyés par le service d'envoi intégré de Supabase.
- Une fiche de profil créée à l'inscription : votre e-mail et un nom, qui reprend votre e-mail par défaut.

### 2.2 Ce que vous enregistrez dans l'application

- Votre stock : produits, quantités, dates, emplacements, photos de produits.
- Vos recettes, vos favoris, vos menus de la semaine et vos listes de courses.
- Les actions sur le stock et les courses (ajouts, consommations, rangements, annulations), conservées dans un historique pour pouvoir les vérifier et les annuler.
- Les déclarations de pertes.
- Les tickets de caisse que vous photographiez : les informations lues (magasin, date, total, lignes et prix) et les prix d'achat qui en sont tirés. La photo du ticket n'est pas conservée.
- Les recettes que vous importez depuis un lien ou une publication, et leurs brouillons.
- Dans la découverte de recettes : les créateurs et les liens que vous suivez, les recettes proposées, et ce que vous en gardez, écartez ou cuisinez.

Ces données sont stockées sur le serveur et suivent votre compte sur chacun de vos appareils.

**Catalogue de produits commun.** Quand vous ajoutez un produit qui n'existe pas encore, par la saisie, l'assistant ou un ticket, son nom entre dans un catalogue de produits partagé entre tous les comptes et lisible par eux. Ce nom n'est pas effacé avec vos données : n'y mettez pas d'information personnelle.

### 2.3 Votre profil alimentaire

Allergies, ingrédients exclus, régimes (dont des régimes religieux), goûts, matériel, temps et portions habituels, objectifs, et cibles quotidiennes si vous les saisissez. Ce profil peut révéler des informations de santé ou des convictions religieuses.

Il n'est enregistré qu'après votre confirmation explicite (case « Je confirme ce profil »). Les contraintes enregistrées par d'anciennes versions de l'application restent appliquées tant que vous ne les avez pas confirmées ou effacées. Le profil n'est transmis à l'assistant que si vous l'autorisez (case « Autoriser l'assistant à recevoir les contraintes et objectifs nécessaires à ma demande »).

### 2.4 L'assistant

- **Vos demandes**, écrites ou dictées, et les réponses.
- **L'historique des conversations** : conservé seulement si vous l'activez (Paramètres > Données et confidentialité), pour la durée de conservation choisie. Il comprend des résumés de vos conversations, rédigés par OpenAI.
- **La mémoire de l'assistant** : vos goûts et habitudes, retenus seulement si vous l'activez (Paramètres > Mémoire de l'assistant).
- **Le journal des actions de l'assistant** : chaque action qu'il effectue (outil appelé et ses paramètres, résultat, modèle utilisé) est consignée, que l'historique soit activé ou non, pour garantir qu'une action n'est faite qu'une fois et pouvoir l'annuler. Pour une dictée, seule une empreinte de l'audio est conservée, jamais l'audio.

### 2.5 Traces de recettes

Aucune mesure d'usage dédiée n'est active : l'application n'analyse pas les fonctionnalités que vous utilisez. Pour ses suggestions, elle enregistre les recettes qui vous sont proposées, celles que vous ouvrez, ajoutez à « À cuisiner bientôt » ou retirez, celles que vous préparez, ainsi que vos retours sur une recette. Ces traces n'ont pas de réglage ; elles sont effacées avec vos données.

### 2.6 Photos

- Une photo n'est analysée que lorsque vous l'envoyez pour cela : produits à ajouter depuis l'assistant, ticket de caisse.
- Les codes-barres sont lus sur votre appareil ; le numéro lu sert ensuite à retrouver le produit.
- Sont conservées avec vos données : les photos ajoutées à un produit ou à une recette, celles des produits ajoutés depuis l'assistant, les miniatures des recettes importées, et la copie d'image d'une recette importée si vous cochez la case prévue.
- Les photos de produits et de recettes, ainsi que les copies d'images importées, sont déposées dans des espaces publics : quiconque connaît leur adresse peut les afficher. Seul votre compte peut les remplacer ou les supprimer. L'adresse d'une copie d'image importée contient l'identifiant technique de votre compte.
- Les photos des produits ajoutés depuis l'assistant et les miniatures des recettes importées sont privées : elles ne s'affichent qu'à votre compte.
- Les photos envoyées depuis l'éditeur de recette sont réencodées sur votre appareil, ce qui retire leurs métadonnées (position, appareil). Celles déposées avant le 27 novembre 2026 peuvent avoir conservé les leurs.

### 2.7 Erreurs techniques

Voir la section 7.2.

## 3. Finalités et bases légales

| Traitement | Finalité | Base légale |
| --- | --- | --- |
| Compte, stock, recettes, courses, menus, tickets, pertes, découverte de recettes | Fournir le service que vous utilisez | Exécution du service |
| Assistant, dictée, lecture de photos, import de recettes, codes-barres | Répondre à votre demande | Exécution du service |
| Journal des actions de l'assistant | Ne faire une action qu'une fois, pouvoir l'annuler | Exécution du service |
| Historique des conversations, mémoire de l'assistant | Reprendre une conversation, retenir vos goûts | Consentement (activation dans les réglages) |
| Profil alimentaire, y compris les données de santé et les régimes religieux | Adapter les recettes à vos contraintes | Consentement explicite |
| Traces de recettes | Améliorer les suggestions | Intérêt légitime |
| Journaux techniques | Détecter et corriger les plantages, protéger le service | Intérêt légitime |

Aucune donnée n'est vendue, utilisée pour de la publicité ou partagée avec un réseau social pour vous profiler.

## 4. Destinataires

Vos données sont traitées par les services suivants, chacun pour ce qui le concerne :

| Service | Rôle | Données concernées |
| --- | --- | --- |
| Supabase | Base de données, authentification, stockage des photos | Toutes les données décrites en section 2, hébergées à Paris (région `eu-west-3`) |
| Vercel | Hébergement de l'application et de son API (fonctions exécutées à Francfort, région `fra1`) ; journaux techniques | Requêtes et journaux décrits en section 7 |
| OpenAI | Assistant et résumés de conversation, transcription des dictées, lecture des photos de produits et de tickets, extraction des recettes importées, recherche de recettes sur le web, rapprochement des noms de produits | Vos demandes et dictées, les photos envoyées, le contenu de la recette importée, les extraits de stock, de recettes, de courses et de menus utiles à la demande, l'historique et la mémoire s'ils sont activés, le profil alimentaire seulement si vous l'autorisez. Aucun identifiant de compte n'est transmis |
| Open Food Facts | Base de produits alimentaires | Le code-barres ou le nom recherché, sans identifiant de compte |
| Meta (Instagram), TikTok, Google (YouTube) | Lecture d'une publication ou d'une vidéo dont vous importez la recette : la page, sa description et, pour YouTube, ses sous-titres | L'adresse de la publication, sans identifiant de compte |
| Sites de recettes | Lecture d'une page dont vous importez la recette, ou trouvée par la recherche web de l'assistant | L'adresse de la page, téléchargée par le serveur |
| Hébergeurs des images de recettes | Affichage d'une image de recette importée, chargée par votre navigateur depuis son site d'origine | L'adresse IP de votre navigateur |

**OpenAI.** Les requêtes de l'assistant, de lecture de photos, d'import et de recherche web demandent à OpenAI de ne pas enregistrer l'échange (`store: false`). La transcription des dictées et le rapprochement des noms de produits n'ont pas cette option. D'après la documentation d'OpenAI, les données transmises par son API ne servent pas à entraîner ses modèles, et OpenAI peut les conserver jusqu'à 30 jours pour détecter les abus, textes comme audio. Son accord de traitement, intégré à ses conditions de service, encadre le transfert vers les États-Unis par les clauses contractuelles types de la Commission européenne.

**Transferts hors de l'Union européenne.**

- **Supabase** héberge la base à Paris ; ses équipes peuvent y accéder depuis l'étranger, pour le support ou la sécurité. Supabase propose un accord de traitement qui encadre ces transferts par les clauses contractuelles types de la Commission européenne.
- **Vercel** exécute l'API à Francfort ; Vercel est certifiée au cadre de protection des données entre l'Union européenne et les États-Unis.
- **OpenAI** : voir ci-dessus.
- **Meta, TikTok, Google et les sites de recettes** ne reçoivent du serveur que l'adresse demandée, sans identifiant ; ils traitent cette requête selon leurs propres règles.

**Limitation de débit.** Les compteurs restent en mémoire du serveur ; aucun service tiers ne les reçoit.

La dictée dans la fenêtre d'ajout d'une recette utilise la reconnaissance vocale de votre navigateur : selon le navigateur, l'audio peut être traité par son éditeur. La lecture à voix haute des réponses utilise la synthèse vocale de votre appareil.

## 5. Durées de conservation

| Donnée | Durée |
| --- | --- |
| Historique des conversations et mémoire de l'assistant | Désactivés par défaut. Une fois activés : 7 jours (conservation minimale), 30 jours (standard, par défaut) ou sans limite (complète), selon votre choix. L'effacement se fait à la prochaine utilisation de l'assistant. Raccourcir la durée raccourcit celle des éléments déjà enregistrés ; l'allonger ne la prolonge pas. Les éléments enregistrés avant la mise en place de ces durées n'en ont pas : ils restent jusqu'à la suppression de vos données |
| Contexte d'une conversation en cours | 24 heures au plus |
| Ticket de caisse lu mais non validé, ou illisible | 7 jours, puis effacé par une tâche quotidienne ; annuler l'application d'un ticket le fait repartir pour 7 jours |
| Ticket validé, prix d'achat | Jusqu'à la suppression de vos données |
| Compte, stock, recettes, courses, menus, profil alimentaire, journal des actions, traces de recettes, photos | Jusqu'à la suppression de vos données |
| Compteurs de limitation de débit (adresse IP ou identifiant de compte) | En mémoire du serveur, une heure au plus |
| Journaux techniques de l'hébergeur | Voir la section 7.2 |

Aucune sauvegarde de la base n'est faite : la formule gratuite de Supabase, utilisée aujourd'hui, n'en comprend pas. Une donnée effacée ne peut donc pas être restaurée.

## 6. Vos droits

Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition. Vous pouvez retirer à tout moment un consentement donné, sans effet sur ce qui a été fait avant.

- **Accès et portabilité** : Paramètres > Données et confidentialité > « Exporter mes données » produit un fichier JSON avec les données des tables de votre compte. Les photos y sont désignées par leur adresse, sans leur contenu ; les caches recalculés et les données de connexion n'y figurent pas. Un export de plus de 4 Mo ne peut pas encore être produit par l'application : écrivez-nous (section 11) pour le recevoir.
- **Rectification** : vous modifiez vos données directement dans l'application.
- **Effacement** : « Demander la suppression de mes données » efface aussitôt vos photos. Vos autres données sont ensuite effacées automatiquement, par lots, par une tâche qui s'exécute chaque heure. Si certaines photos ne peuvent pas être effacées, la demande reste ouverte et l'écran propose de réessayer. Restent après l'effacement : l'enregistrement de votre demande (identifiant technique, dates, statut), les noms de produits ajoutés au catalogue commun, un registre technique des commandes de la découverte de recettes, et votre compte de connexion (e-mail et mot de passe). Pour fermer aussi ce compte, écrivez-nous (section 11).
- **Opposition et retrait du consentement** :
  désactivez l'historique ou la mémoire de l'assistant : leur enregistrement et leur usage s'arrêtent, mais les éléments déjà enregistrés restent jusqu'à leur échéance, jusqu'à ce que vous les oubliiez (Paramètres > Mémoire de l'assistant) ou jusqu'à la suppression de vos données. Vous pouvez aussi retirer l'autorisation de transmettre votre profil à l'assistant, ou effacer votre profil alimentaire. Il n'existe pas de réglage d'analyses, faute de mesure d'usage. Les traces de recettes et le journal des actions n'ont pas de réglage ; ils sont effacés avec vos données.
- **Réclamation** : vous pouvez saisir la CNIL ([www.cnil.fr](https://www.cnil.fr)).

Pour toute demande, utilisez le contact indiqué en section 11.

## 7. Sécurité et journaux

### 7.1 Mesures en place

- Chaque compte n'accède qu'à ses propres données, sauf le catalogue de produits commun (section 2.2) : la base applique des règles d'accès par compte, et les écritures sensibles passent par des fonctions contrôlées côté serveur.
- Les échanges sont chiffrés en transit (HTTPS, avec HSTS).
- La connexion repose sur l'authentification de Supabase ; l'API vérifie la session à chaque requête portant sur vos données.
- Les appels à l'API sont limités en débit.
- Il n'existe pas de double authentification.

### 7.2 Journaux techniques

**Journal d'erreurs de l'application.** Pour détecter et corriger les plantages, quand l'application rencontre une erreur dans votre navigateur, elle envoie un rapport technique au serveur, qui l'inscrit dans les journaux d'exécution de l'hébergeur (Vercel). Ce rapport contient uniquement :

- le type d'erreur et son nom technique (par exemple `TypeError`) ;
- un code technique, s'il fait partie d'une liste connue ;
- le modèle de la page concernée (par exemple `/kitchen/recipes/:id` pour une fiche recette), jamais son adresse complète ni ses identifiants ;
- les lignes techniques de la pile d'appels : nom de fonction, fichier de l'application, ligne et colonne, sans le message d'erreur ;
- la version de l'application.

Il ne contient ni le message d'erreur, ni ce que vous avez saisi, ni l'adresse complète de la page, ni votre identifiant de compte. Un rapport n'est conservé que si vous êtes connecté.

**Journaux du serveur.** L'API consigne des événements techniques : échecs, limitations de débit, imports de recettes, lectures de tickets. Ces lignes peuvent contenir l'identifiant technique de votre compte ou de l'opération, un code et le message technique de l'erreur. Ce message peut exceptionnellement citer l'adresse d'une recette que vous importez. Ces journaux ne contiennent ni vos demandes à l'assistant, ni vos dictées.

L'hébergeur conserve aussi, dans ses journaux d'infrastructure, l'adresse IP et les métadonnées techniques des requêtes. D'après la documentation de Vercel, ces journaux sont conservés au plus 30 jours avec la formule actuelle (Pro).

## 8. Stockage sur votre appareil

L'application ne pose aucun cookie et n'utilise aucun traceur publicitaire ni outil de mesure d'audience. Elle enregistre dans le stockage local de votre navigateur :

- votre session de connexion (Supabase) ;
- vos préférences d'affichage et de notification ;
- les saisies en cours : brouillons de recette, sessions de cuisine, contraintes alimentaires en attente de confirmation (y compris allergies et régimes), lien reçu par le partage, choix et retours en attente d'envoi ;
- votre accord pour proposer l'import d'une recette copiée dans le presse-papiers : le presse-papiers n'est lu qu'après cet accord ;
- des préférences de cuisine enregistrées sur l'appareil par d'anciennes versions de l'application.

Pendant la session, elle garde aussi des éléments temporaires (dernière conversation ouverte, relecture d'un ticket, proposition de semaine). Les fichiers de l'interface sont mis en cache pour charger l'application plus vite ; vos données n'y sont pas mises en cache.

Une partie de ces éléments reste sur l'appareil après la déconnexion, jusqu'à ce qu'un autre compte s'y connecte ; vous pouvez les effacer avec les données du site dans votre navigateur.

L'application peut vous demander l'autorisation d'afficher des notifications ; aucune notification ne vous est envoyée depuis un serveur.

## 9. Mineurs

Kitchen OS s'adresse aux personnes de 15 ans et plus. L'inscription ne vérifie pas l'âge.

## 10. Modifications

Cette politique peut évoluer avec l'application ; la date en tête de page indique sa dernière mise à jour. Aucun autre canal d'information n'est prévu pour l'instant.

## 11. Contact

Kitchen OS, 2 rue Berthollet, 94110 Arcueil.
