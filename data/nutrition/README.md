# Nutrition des classiques approuvés

Référence : **Anses, Table Ciqual 2020**, licence ouverte (`fr-lo`), confirmée
par les métadonnées officielles :
https://www.data.gouv.fr/api/1/datasets/5369a15fa3a729239d2065b7/

Classeur original :
https://ciqual.anses.fr/cms/sites/default/files/inline-files/Table%20Ciqual%202020_FR_2020%2007%2007.xls

Le serveur Anses étant indisponible pendant la préparation, deux copies publiques
ont été comparées octet pour octet :

- https://raw.githubusercontent.com/Rayane759/base-de-donnees-ciqual-2020/main/data_ciqual_2020.xls
- https://raw.githubusercontent.com/ClementAGIL/nutrimo-api/main/data/ciqual_2020_fr.xls

SHA256 commun : `a728c29d8d3c944aa679d62d7a2e591c80bac512059ea6772af95760f65da75d`.
L'identité des copies ne constitue pas une vérification de signature par Anses.
Le sous-ensemble livré conserve les codes et libellés des 88 aliments utilisés.

## Calcul et limites

Les poids sont nets comestibles, indépendants du stock. Le calcul multiplie
chaque valeur pour 100 g par le poids utilisé et divise par les portions.
Les valeurs `-`, vides et `traces` restent inconnues (`null`). Une trace sans seuil
chiffré n'est pas transformée en zéro. Les seuils `< x` sont conservés comme
limites supérieures et propagés ; les inconnus ne sont jamais additionnés comme zéro.

Quand Ciqual ne fournit pas l'énergie mais renseigne les quatre macronutriments,
une **approximation énergétique** peut être calculée : protéines/glucides × 4,
lipides × 9, fibres × 2, polyols × 2,4, alcool × 7, acides organiques × 3.
Les composants non quantifiés sont omis et **énumérés dans les hypothèses de
l'aliment et de la recette**. Ce calcul n'est pas présenté comme une énergie
publiée par Anses ni une mesure complète. L'énergie du vinaigre reste inconnue
lorsque ses acides ne sont pas quantifiés, car leur omission serait trompeuse.

Les pertes à la cuisson, égouttage, jus écartés et rendements ne sont pas mesurés.
Le rétinol ne représente pas toute la vitamine A (bêta-carotène exclu).
La gousse de vanille retirée après infusion a un poids consommé nul ; les
composants extraits par infusion ne sont pas quantifiés.
Les changements d'ingrédients, de quantités ou de portions invalident le calcul
enregistré. Les anciens totaux non sourcés ne sont pas réutilisés.
Les vitamines et minéraux ne sont donc pas tous connus pour chaque recette.

## Reproduction

Avec Python et `xlrd==2.0.2` dans un environnement isolé :

```sh
python scripts/recipes/normalize-ciqual.py /path/to/ciqual.xls /tmp/ciqual.json
python scripts/recipes/prepare-classics.py --ciqual /tmp/ciqual.json --selection /path/to/approved-selection.json
```

La sélection doit contenir exactement les 53 IDs approuvés. Le fichier de
collection livré contient cette sélection complète et les hypothèses de calcul.
