# Photos des courses : un seul ajout au stock

Une photo accompagnée d'une demande écrite était convertie en noms de produits
pour le chat. Celui-ci pouvait ajouter le stock sans recevoir les images. La
carte « Ajouter au stock » restait ensuite disponible et créait un deuxième ajout.

Les produits photographiés passent maintenant par le parcours de validation
existant, qui envoie les quantités et les fichiers ensemble. Tant que cette liste
attend sa validation, le chat répond aux questions mais ne propose ni n'exécute
`add_inventory_items`. Cette restriction est contrôlée côté serveur, y compris
pour une instruction fournisseur fabriquée. Les ajouts texte sans photos et la
liste de courses conservent leur fonctionnement.

Le navigateur transmet l'état de validation sur les tours suivants. Le marqueur
déjà envoyé avec les photos est reconnu pour les clients précédents. Un lot de
photos conserve le même identifiant si la liste est fermée puis rouverte : une
réponse réseau incertaine ne doit pas provoquer un nouvel ajout.

Une image dont l'upload échoue n'est plus liée à un chemin inexistant. Un échec
du rattachement produit est également signalé dans la validation, sans prétendre
que la photo a été gardée et sans répéter l'ajout du stock.

## Validation

- 17 tests frontend ciblés : question avec photos, suivi texte, fermeture et
  réouverture après réponse incertaine, fichiers numérotés, conservation privée,
  avertissement si le rattachement échoue.
- 144 tests API ciblés : orchestration, route photo et écritures ; inclut le
  refus d'un appel fournisseur hors du parcours de validation.
- Compilation shared/API, types app sans nouvelle erreur, lint sans nouvelle
  erreur et build optimisé réussis. Les avertissements historiques restent.
- Pas de migration. Les photos non transmises par l'ancien chat ne sont pas
  récupérables automatiquement depuis le serveur ; ne pas inventer des liens
  ni réajouter les produits pour tenter de récupérer leurs photos.

La vérification de production et la réparation des quatre quantités concernées
ont leurs reçus privés hors du dépôt. Le stock réparé a été relu, avec protection
par propriétaire, produit, quantité, version et date de modification attendus.
