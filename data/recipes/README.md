# Collection approuvée le 9 novembre 2026

53 recettes explicitement sélectionnées par l'utilisateur, sans porc ni ajout
d'alcool. Les variantes sans vin sont annoncées. Ce sont des **versions maison**,
avec ingrédients, poids nets, portions, temps, matériel et étapes ; elles ne sont
pas des transcriptions de publications de chefs. Les adaptations riches ne sont
pas étiquetées automatiquement comme des plats équilibrés.

31 liens Meilleur du Chef sont vérifiés (HTTP 200 et fiche JSON-LD Recipe) dans
`classics-source-check.json`. Certaines pages donnent une technique ou un plat
proche, ce que les descriptions et hypothèses annoncent. Elles ne doivent pas
être présentées comme la source exacte des versions adaptées. Les autres fiches
n'ont pas de lien inventé. Aucune photographie n'est attribuée à tort : les images
restent absentes, avec le comportement de remplacement existant.

Nutrition : voir `../nutrition/README.md`. 50/53 estimations énergétiques sont
calculables ; les trois recettes contenant un vinaigre sans énergie documentée
conservent une énergie inconnue. Certaines valeurs de glucides sont des traces
sans seuil et restent inconnues. Chaque fiche conserve la provenance et les limites.

## Ajout privé, sans modification de l'existant

Après livraison du lecteur nutritionnel compatible :

```sh
node scripts/recipes/import-classics.mjs --env /path/to/.env --owner OWNER_UUID
node scripts/recipes/import-classics.mjs --env /path/to/.env --owner OWNER_UUID --apply
node scripts/recipes/audit-nutrition.mjs --env /path/to/.env --owner OWNER_UUID --output /tmp/nutrition-audit.json
```

Le script est limité au projet et au compte approuvés. Le mode par défaut est une
simulation. Aucun secret n'est embarqué, aucune session utilisateur n'est générée.
L'import **ajoute seulement** des lignes privées ; il ne modifie ni le stock ni
les recettes précédentes. Il vérifie les noms en doublon, utilise des IDs UUID v5
stables, valide les signatures et relit les résultats. Toute différence sur une
ligne existante arrête le traitement pour préserver les modifications utilisateur.

Les deux insertions bulk (recettes puis ingrédients) sont chacune atomiques,
mais **ne forment pas une transaction commune**. Un journal local conserve les IDs
et l'étape atteinte. Une interruption laisse un état reprenable : relancer le même
pack ajoute seulement les IDs manquants, sans upsert ni suppression automatique.
Une réponse réseau perdue est contrôlée par relecture. Ne pas régénérer le pack
entre un import interrompu et sa reprise (son empreinte doit rester identique).
L'absence de transaction commune autorise une courte visibilité de fiches encore
sans ingrédients ; leur présence finale est contrôlée avant d'annoncer la réussite.
Une édition utilisateur concurrente arrête la vérification sans l'écraser.

L'annulation éventuelle doit être préparée à partir des IDs du journal et comparer
les fiches/ingrédients à leur état importé dans une transaction avant de supprimer
uniquement ces nouveaux enregistrements. Ne jamais supprimer par nom ou par
simple tag, ni effacer une fiche modifiée depuis l'import.
