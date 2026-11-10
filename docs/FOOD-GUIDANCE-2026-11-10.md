# Conseils alimentaires liés au stock — 10 novembre 2026

Le tableau de bord et l’assistant partagent `buildFoodGuidance`. Le service lit toutes les pages du stock du propriétaire authentifié, puis applique son profil alimentaire aux suggestions quotidiennes et aux idées saisonnières. Il ne transmet ni les notes privées ni les champs du profil. Une lecture incomplète échoue explicitement.

Les faits alimentaires proviennent d’un petit référentiel éditorial versionné et sourcé. La couverture est partielle : `uncovered_product_count` et `facts_complete` l’indiquent. Ce référentiel ne calcule pas de composition nutritionnelle et ne garantit aucun effet médical. Les formes des produits comptent : pâte ail-gingembre, gingembre frais, poudre, pétales de bleuet et fruit ne sont pas interchangeables.

Les repères saisonniers de France métropolitaine ont été vérifiés avec les douze pages mensuelles de Manger Bouger. `season_months` et `seasonal_calendar` permettent aussi de répondre sur une autre saison. La saison du radis noir reste non documentée dans ce référentiel ; le calendrier du radis générique ne lui est pas appliqué.

## Suggestions du jour

La date de Paris fait tourner jusqu’à deux aliments éligibles. La fraîcheur à vérifier, une date dépassée ou une incompatibilité alimentaire excluent le lot des choix automatiques. Une quantité estimée ne devient pas une portion garantie. La présence d’un lot ne certifie pas sa consommabilité.

Le gingembre frais peut être proposé comme boisson alimentaire facultative. Les plantes et produits de la ruche disposent de fiches individuelles mais ne sont pas placés dans une rotation quotidienne. Le séné est un laxatif médicinal, le pollen présente un risque allergique et les autres plantes ont leurs limites propres. Les sources ANSES, EMA, NCCIH et MSK sont liées aux faits concernés.

Aucune migration, notification, programmation d’ingestion, écriture de stock, achat ou mémoire médicale automatique. Les suggestions sont destinées à l’alimentation générale des adultes. La personnalisation médicale, les traitements et l’usage chez l’enfant demandent un professionnel adapté.

## Assistant

Une recherche vide dans la bibliothèque peut être complétée par une lecture du stock, puis un unique suivi borné pour les liens Web et les bienfaits. Le reçu textuel inclut aussi la lecture automatique du stock, sans créer un faux `call_id` fournisseur. Les limites existantes restent inchangées : quatre appels modèle et six outils au maximum.

Les liens culinaires sont issus de `search_web_recipes`. Le résultat distingue une page dont les ingrédients ont été lus d’un simple lien retrouvé. Les sources culinaires et les références santé restent distinctes. Le rendu affiche les titres en gras et conserve les liens sûrs sans interpréter du HTML.

## Vérifications

- Tests de projection du stock, pagination, isolation propriétaire, erreurs et absence d’écriture.
- Régressions des questions mixtes, des reçus Responses et Chat Completions, du périmètre d’outils et du repli de streaming.
- Tests des dates, quantités, formes de produits, plantes, saisons et rotation quotidienne.
- Tests du composant : sources, précautions, erreur/reprise, stock vide et ouverture de l’assistant.
- Lecture seule du stock réel : 24 lots couverts, dont dix plantes/produits de la ruche ; aucun champ privé projeté.
- Recherche réelle : recette Marmiton au radis noir avec ingrédients extraits ; lien Papilles & Pupilles retrouvé mais lecture bloquée, signalée comme non vérifiée.
- Essais réels de gpt-6-luna avec outils fictifs : recettes et bienfaits, demande de routine de plantes, question pédiatrique et comparaison hiver/printemps. Aucun outil d’écriture exécuté.
- Chromium et WebKit : 320, 390, 768 et 1280 px, ouverture des fiches et des sources, accès à l’assistant, sans débordement horizontal.

Les essais de modèle avec outils fictifs et la lecture du stock réel ne prouvent pas un échange authentifié complet en production.
