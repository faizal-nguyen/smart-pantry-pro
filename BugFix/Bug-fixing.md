Bug-fixing.md

Lorsque je parse une URL voila les resultats de la console
🥘 Parsing Marmiton recipe: https://www.marmiton.org/recettes/recette_poireaux-a-la-grecque-rapides_29482.aspx
index-DxDg9w2c.js:33 Found 0 JSON-LD scripts but no Recipe schema
index-DxDg9w2c.js:33 Auth event: SIGNED_IN faizal.nguyen@hotmail.fr

Cote front 
dans la partie description j'ai : Recette&#x20;Poireaux&#x20;&#xE0;&#x20;la&#x20;grecque&#x20;rapides&#x20;&#x3A;&#x20;d&#xE9;couvrez&#x20;les&#x20;ingr&#xE9;dients,&#x20;ustensiles&#x20;et&#x20;&#xE9;tapes&#x20;de&#x20;pr&#xE9;paration    

Instructions : 
{"@context":"http://schema.org","@type":"ItemList","url":"https://www.marmiton.org/recettes/recette_poireaux-a-la-grecque-rapides_29482.aspx","numberOfItems":10,"itemListElement":[{"@type":"ListItem","position":1,"url":"https://www.marmiton.org/recettes/recette_poireaux-a-la-grecque-rapides_29482.aspx"},{"@type":"ListItem","position":2,"url":"https://www.marmiton.org/recettes/recette_poireaux-a-la-grecque-de-ma-grand-mere_33505.aspx","image":""},{"@type":"ListItem","position":3,"url":"https://www.marmiton.org/recettes/recette_salade-grecque_34399.aspx","image":""},{"@type":"ListItem","position":4,"url":"https://www.marmiton.org/recettes/recette_champignons-a-la-grecque-facile-et-rapide_82781.aspx","image":""},{"@type":"ListItem","position":5,"url":"https://www.marmiton.org/recettes/recette_pancakes-rapides_90951.aspx","image":""},{"@type":"ListItem","position":6,"url":"https://www.marmiton.org/recettes/recette_champignons-a-la-grecque_15354.aspx","image":""},{"@type":"ListItem","position":7,"url":"https://www.marmiton.org/recettes/recette_poulet-a-la-grecque_28306.aspx","image":""},{"@type":"ListItem","position":8,"url":"https://www.marmiton.org/recettes/recette_legumes-a-la-grecque_172331.aspx","image":""},{"@type":"ListItem","position":9,"url":"https://www.marmiton.org/recettes/recette_canneles-rapides_33822.aspx","image":""},{"@type":"ListItem","position":10,"url":"https://www.marmiton.org/recettes/recette_orangettes-rapides_342954.aspx","image":""}],"RelatedLink":[]}

Les ingrédients ne sont pas récupérer et ajouter automatiquement dans le form. Il faut retravailler le script. Est-ce qu'il a besoin d'utiliser une requete OpenAI qui va parser la page et renvoyer les bonnes informations dans les bons champs ? 