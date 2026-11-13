# Retrouver et cuisiner sa bibliothèque

La page Recettes ouvre désormais « Pour toi » : recommandation selon le stock,
recettes peu montrées à redécouvrir et préparations plus longues pour le week-end.
« À cuisiner bientôt » conserve les envies sans date. La bibliothèque et ses
filtres, les imports et les sources restent accessibles.

Sur une fiche, « Je l’ai faite » demande confirmation, enregistre une préparation,
retire l'ancienne envie et propose le retour existant « À refaire ». Cette action
ne modifie pas le stock : le parcours Commencer conserve cette responsabilité.
Une préparation réelle non annulée du journal produit le même historique.
Une envie ajoutée après une préparation reste dans la sélection.

## Contrats

- Réutilisation de `recipe_interactions` et `cooking_journal_entries`, sans migration.
- Commandes UUID, références explicites `{id, source}`, validation stricte,
  accès recette vérifié et client authentifié soumis aux politiques existantes.
- Une action incertaine reste conservée par compte et se réessaie avec le même
  identifiant ; seul le reçu confirmé permet de l'effacer.
- Lecture paginée de la sélection et de l'historique, erreur explicite au-delà
  de 20 000 événements, jamais une fausse sélection vide.
- Les découvertes respectent l'évaluation existante des contraintes alimentaires.
  Elles ne garantissent pas la disponibilité des ingrédients ; celle-ci appartient
  à la recommandation et à la fiche.
- Une carte montrée au moins une seconde et à moitié visible compte comme une
  exposition. Une vue ou une mise en attente ne compte jamais comme préparation.
- Les recommandations déjà montrées perdent temporairement de la priorité.
  Les découvertes privilégient les moins exposées avec diversité des cuisines.
- Le lien vers Menus préremplit la recherche ; le créneau et la recette sont
  choisis et confirmés dans le parcours existant.

## Validation locale

- Frontend complet : 97 suites, 430 tests ; recommandations : 11 suites, 148 tests.
- Après les dernières corrections : 9 suites frontend / 38 tests et 3 suites
  API / 33 tests ; compilation shared et API réussie.
- Lint : aucune nouvelle erreur (37 avertissements existants).
- Types app : aucune nouvelle erreur (129 erreurs dans la baseline existante).
- Build optimisé réussi ; avertissement de taille des bundles existant.
- Revue Orca sur données fictives : 460 fiches, ajout à la sélection,
  confirmation de préparation, retrait de la sélection, retour À refaire,
  retour au bon onglet et recherche de menu préremplie.

Ces essais de démonstration ne constituent pas une preuve de parcours authentifié
sur les données de production. Aucune mutation du stock réel pendant la QA.
