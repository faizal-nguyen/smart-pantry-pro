# Évaluer la qualité culinaire de Kitchen OS

Le [benchmark des modèles](../scripts/benchmark-v10-models.ts) teste déjà le routage, les outils, les droits et le coût. Un outil correctement appelé ne suffit pas à valider une réponse de cuisine. Cette grille complète le benchmark avec des critères observables sur les réponses.

Utiliser des stocks fictifs et figés, inspirés des cas ci-dessous. Comparer à l’aveugle les réponses avant et après sur les mêmes questions et les mêmes résultats d’outils. Garder quelques variantes hors des exemples du prompt. Tester le Web en deux passes : citations et pages figées pour les régressions ; recherche réelle pour l’accessibilité, la pertinence et la fraîcheur. Isoler le coût des appels réels.

| Question | Le test réussit si… |
| --- | --- |
| Un bon chocolat chaud | Une personne peut le préparer : portions, quantités, durée et étapes. Le cacao en poudre et la sauce cacao ne sont pas présentés comme équivalents. |
| Qu’est-ce que je mange ce soir avec mon stock ? | Le premier choix est un repas cohérent. Le riz cru et le poulet surgelé gardent leurs contraintes de préparation. |
| J’ai 15 minutes et pas de four | Le temps total et le matériel correspondent. Un plat plus long est clairement hors contrainte. |
| Je veux une soupe aux oignons. Il manque quoi ? | Avec un stock fictif contenant des oignons mais pas de bouillon, la réponse ne réclame pas d’oignons et distingue le manque du doute. |
| J’ai du chipotle séché : je peux faire une tinga ? | Le chipotle séché est distingué de l’adobo. L’adaptation explique ce qui change et comment ajuster le piquant. |
| Comment rattraper ma sauce trop salée ? | Une première action simple dépend du type de sauce ; le conseil n’introduit pas un ingrédient « miracle ». |
| Mon riz est déjà cuit : je peux le faire sauter sans qu’il colle ? | Les gestes, la chaleur et le signe visuel sont utiles. La réponse ne confond pas cuisson du riz et sautage. |
| Comment savoir si mes pilons sont cuits ? | Le contrôle repose sur un repère fiable ; le temps ou la couleur seuls ne font pas foi. Citer une source officielle si consultée. |
| Donne-moi deux vraies recettes tunisiennes d’ojja | Les liens mènent à des pages de recette pertinentes, et les ingrédients n’apparaissent comme lus que si la liste a été extraite. |
| Trouve une recette de radis noir sur Internet, sans crème | La source originale et une éventuelle adaptation sont distinguées. Une page inaccessible n’est pas déclarée conforme. |
| Et pour quatre personnes ? | Le plat et les contraintes du tour précédent sont conservés. Les quantités changent, la durée n’est pas multipliée arbitrairement. |
| Finalement une idée différente, avec les mêmes ingrédients | La deuxième idée change de plat ou de technique sans ajouter d’achat implicitement. |

Pour chaque réponse, noter de 0 à 2 la pertinence du premier choix, la précision du geste ou de la recette, et la fidélité au stock et aux sources. Sur les demandes Web, vérifier aussi les liens. Un lien inventé, un achat erroné, une exclusion ignorée ou une consigne de sécurité trompeuse bloquent la validation, même avec une bonne note globale. Regarder le temps de réponse et le coût par réponse utile avant de changer de modèle.

Ordre d’amélioration : mieux router la demande, transmettre les faits utiles, guider la réponse avec quelques exemples courts, puis comparer les modèles à contexte identique. Réserver un éventuel entraînement aux erreurs récurrentes de comportement qui résistent à ces corrections. Les stocks, recettes et références Web restent des données lues à la demande.

Premier essai utilisateur : la sauce tomate trop salée a reçu un conseil exploitable ; le dîner en 20 minutes a inclus du riz supposé rapide et des pommes de terre susceptibles de dépasser la limite ; la recherche d’ojja n’a fourni aucun lien. Pour le nouveau passage, garder l’exemple de sauce comme témoin et vérifier que les deux autres réponses respectent la durée totale et donnent une page lisible.
