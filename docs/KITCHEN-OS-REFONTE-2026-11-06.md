# Kitchen OS — Carnet culinaire

L’accueil reprend la composition de la direction 01 approuvée : photo et recette côte à côte sur ordinateur, repas de la semaine, bandeau de produits à utiliser bientôt, puis réglage du repas. Sur mobile, la photo précède la recette et les quatre destinations restent en bas.

La première intégration conservait trop d’éléments avant et autour de la recette. Cette reprise corrige la composition, les proportions, les marges et les contenus du panneau de menus.

La direction est maintenant étendue aux écrans principaux : bibliothèque et fiche recette, stock, courses, menus, assistant et paramètres. Les vérifications ci-dessous distinguent le rendu local et les parcours réels restant à valider.

## Résultat

- Le panneau « Cette semaine » lit les repas effectivement enregistrés via `useWeeklyMenu`. Les jours sans repas restent à planifier ; les chargements et erreurs ne sont pas présentés comme des cases vides. Le calcul de la semaine utilise le calendrier de Paris, y compris autour de minuit et le dimanche.
- La recette principale garde son identité, sa propre photo, ses portions et les avertissements alimentaires explicites. Les explications, la nutrition et les retours restent accessibles dans « Autres idées ». Aucun chiffre de disponibilité n’est inventé pour reproduire la maquette.
- Les actions de reprise d’une cuisson et de rangement d’achats restent prioritaires lorsqu’elles existent. Les dates proches sont regroupées dans le bandeau de stock.
- Le réglage « Une envie, une contrainte ? » ouvre les contrôles de repas existants. Les choix restent conservés lorsque la boîte est refermée.
- Le menu de profil conserve l’accès à l’aide, aux menus, aux préférences et au compte. Le retour du focus est assuré à la fermeture des boîtes.
- L’en-tête et la navigation mobile utilisent les véritables marges de sécurité de l’appareil, sans ajouter une seconde marge fixe. Le breakpoint commun de navigation est 900 px.
- Le clair est le thème du premier lancement, même si l’appareil préfère le sombre. Un choix explicite clair ou sombre reste mémorisé ; le réglage se propage entre les vues.
- L’identité Kitchen OS, les métadonnées et les icônes installables de la première intégration sont conservées. Les domaines, clés de stockage et contrats API restent compatibles.
- Les pages partagent une hiérarchie de titre et des surfaces ivoire. La bibliothèque présente les filtres et les photos, la fiche place photo et résumé côte à côte sur ordinateur, puis ingrédients et instructions dans deux panneaux. Les portions, avertissements, droits de modification et identités des recettes restent conservés.
- Le stock expose ses filtres d’état et le choix liste/cartes. Les dates proches ressortent sans inventer de date. Les lectures en erreur ne s’affichent plus comme un premier stock vide.
- Les courses gardent une liste à acheter et une liste achetée, avec un récapitulatif et une seule action de rangement. Sur mobile, cette action reste au-dessus de la navigation. Le défilement des lignes réserve la place des barres fixes.
- Les menus suivent désormais le contrat lundi=0 à dimanche=6. L’ancien affichage décalait les repas d’un jour. Les dates de la semaine sélectionnée sont visibles ; plusieurs recettes dans un même créneau restent toutes accessibles. Ouvrir un repas conserve la source de sa recette et ses portions.
- L’assistant garde son champ de saisie visible dans un panneau de conversation, avec mémoire et historique à côté sur grand écran. Les réglages utilisent une liste de rubriques sur mobile et deux panneaux sur ordinateur.

## Comparer

Ouvrir `output/kitchen-os/comparison.html` : la direction 01 est placée à côté des captures de l’interface exécutée, avec une vue ordinateur et une vue mobile.

Ouvrir `output/kitchen-os/screens.html` pour parcourir les sept écrans secondaires en version ordinateur ou mobile.

Démonstration visuelle :

http://127.0.0.1:5174/scripts/fixtures/v10/index.html?scene=carnet&route=%2Fkitchen

Le scénario `carnet` représente un foyer fictif, possède son propre stockage de démonstration et une photo culinaire générée pour la comparaison. Il ne modifie pas le jeu de test ordinaire et n’est importé que par l’entrée de test local. Les recettes réelles n’utilisent pas cette photo comme remplacement.

## Vérifications

- PASS lors de la première reprise de l’accueil : 25 tests ciblés dans cinq suites — continuité de l’aide, navigation, recommandations, réglage du repas et aperçu des menus. Ils couvrent notamment les avertissements visibles, les identités des recettes, les confirmations dans la boîte ouverte et le changement de semaine à Paris.
- PASS : contrôles navigateur sur 320, 390, 768, 899, 900, 974, 1024, 1280 et 1440 px. Aucun débordement horizontal détecté ; l’action principale reste visible avant la navigation fixe. À 390 px, les trois produits de démonstration restent également visibles au-dessus de cette navigation.
- PASS : composition côte à côte, alignement des menus et proportions de la carte ; alternatives, preuves du choix, retour du focus, réglage des portions, aide, ouverture d’une recette et accès au compte. Aucune déconnexion confirmée.
- PASS : bibliothèque, Stock, Courses, Menus, Assistant et Paramètres sur 320, 390, 768, 900, 1024 et 1280 px ; fiche recette également à 899 px. Aucun débordement horizontal. Les actions de la fiche restent au-dessus de la navigation mobile et disparaissent au même breakpoint de 900 px.
- PASS : 35 tests actuels dans neuf suites — bibliothèque, détail, courses, réglages, aperçu et grille de menus, thème, correction de stock et cuisson. Les huit nouveaux tests couvrent notamment les semaines à Paris, les changements d’heure, le vendredi au bon jour, plusieurs recettes par créneau et la conservation source/portions.
- PASS navigateur, données fictives : recherche puis retrait des filtres ; ajout aux courses, achat coché, confirmation du rangement et présence dans le stock ; ajout en favori ; portions portées à trois ; cuisson complète avec stock inchangé avant confirmation, puis déduction attendue ; réouverture de la session terminée sans seconde déduction.
- PASS : navigation et retour du focus dans les paramètres ; saisie de l’assistant sur fenêtre 390×500, sans envoyer de demande à un modèle ; mode sombre ; stock vide ; vérification indisponible sans fausse garantie de disponibilité.
- PASS : aucune erreur JavaScript ni réponse HTTP 500 pendant ce parcours.
- PASS : lint des fichiers de cette reprise, zéro erreur et zéro avertissement.
- PASS : build Vite de l’aperçu, 3421 modules compilés. Les avertissements de taille du bundle et d’import dynamique concernent le jeu de test qui importe les pages ensemble.

- PASS : trois tests du thème — premier lancement sur appareil sombre, préférence sombre conservée et synchronisation des vues.

## Limites de preuve

Des fichiers et dépendances du dépôt sont déchargés dans iCloud ; les exécutables Vite et TypeScript du dépôt portent toujours le drapeau `dataless`. Les contrôles ont été effectués sur une copie dans `/private/tmp/kitchen-os-verify/source`, avec des dépendances installées séparément. Les 57 fichiers de travail recensés correspondent exactement à cette copie : empreintes dans `output/kitchen-os/verified-sources.sha256`. Les fichiers source manquants nécessaires ont été récupérés depuis les objets GitHub référencés par l’index local, sans utiliser arbitrairement la dernière version d’une branche.

Le build complet de production et le parcours connecté avec les données réelles restent NON EXÉCUTÉS. Aucun déploiement, aucune migration, aucune modification des données distantes. La copie temporaire utilise des versions satisfaisant les plages du projet ; elle ne remplace pas la validation avec le lockfile et l’environnement de production.

La saisie de l’assistant est vérifiée, mais aucune réponse de modèle, dictée réelle, caméra, import réseau ni livraison de notification n’est validée par ces captures. Les vues annexes ne sont pas couvertes exhaustivement. Le test de fenêtre courte ne remplace pas un essai avec clavier iOS/Android réel. Aucun appel IA payant n’a été lancé pour cette vérification.

## Rejouer

Une fois les sources et dépendances iCloud disponibles, depuis la racine du projet :

```sh
npm run test:v10:ui
# Dans un autre terminal :
node scripts/qa-kitchen-os.mjs
```

Le script contrôle uniquement le serveur de test local et sauvegarde les captures dans `output/kitchen-os/`.

## Préparation de la livraison

La livraison repart du main distant récent, dans une copie Git complète hors iCloud. Elle conserve les corrections de dictée, de mémoire, d’actions assistant et de quantités du main. L’onglet Découvrir et la nouvelle extraction canonique présents dans le travail local n’étaient pas fusionnés : leurs nouveaux contrats ne font pas partie de cette livraison visuelle. La bibliothèque et l’import actuellement livrés reçoivent la nouvelle présentation.

- PASS : installation avec le lockfile, compilation du package partagé, compilation TypeScript de l’API et build Vite de la véritable entrée de production, avec la configuration publique Vercel.
- PASS : 200 tests client V10 dans 54 suites (52 suites puis reprise des deux suites menus après correction de l’import React inutilisé et adaptation du test au nouveau composant).
- PASS : 32 tests du contrat des routes API.
- PASS : lint des modifications, avec l’avertissement Fast Refresh déjà présent dans MaterialYouThemeContext. Les deux types any du contrat historique de la modale d’import sont conservés et explicités.
- PASS : scanner de secrets et absence de variable d’environnement ajoutée à la livraison.

Les captures et empreintes de l’aperçu initial restent une preuve de la phase locale précédente. La preuve de livraison est la PR et son commit sur main. Les essais connectés sur les données du compte restent à distinguer du parcours fictif.
