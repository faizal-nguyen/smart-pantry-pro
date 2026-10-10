# V10-03B — Comparaison visuelle locale

Chrome local sur le banc V10, données fictives, 10 octobre 2026. Le bandeau de test est exclu des coordonnées. Les captures de scénarios ont été prises pendant la réalisation ; les captures des variantes principales et des fiches reflètent les derniers ajustements. Aucun essai production ou iPhone réel.

## Direction choisie

**Cuisine personnelle, avec grandes photos**, est la direction choisie explicitement par l'utilisateur le 10 octobre 2026 et déjà appliquée par défaut. Elle conserve une grande photo avant le titre, pour répondre au besoin de voir le plat avant de l’ouvrir. **Carnet de cuisine** remonte les titres et réduit le défilement avec une photo de 96 × 80 px. Les deux variantes partagent leurs données, composants, références et commandes. Le confort à une main et les parcours restent à éprouver sur iPhone.

| Comparaison | Cuisine personnelle | Carnet de cuisine |
| --- | --- | --- |
| Aujourd’hui, 375 px | [Capture](personal-today-375.png) | [Capture](notebook-today-375.png) |
| Bibliothèque, 375 px | [Capture](personal-library-375.png) | [Capture](notebook-library-375.png) |
| Aujourd’hui, 440 px | [Capture](personal-today-440-light.png) | [Capture](notebook-today-440-light.png) |
| Bibliothèque, 440 px | [Capture](personal-library-440-light.png) | [Capture](notebook-library-440-light.png) |
| Bibliothèque desktop | [Capture](personal-library-desktop-light.png) | [Capture](notebook-library-desktop-light.png) |

La baseline est celle de l’état local 03A avant 03B : [Aujourd’hui](baseline-today-375.png), [bibliothèque](baseline-library-375.png), [fiche](baseline-detail-375.png), [mesures](baseline.json). Elle diffère des captures antérieures à 03A dans l’audit du 9 octobre.

## Reproduction

Lancer `npm run test:v10:ui`, puis ouvrir `http://127.0.0.1:5174/scripts/fixtures/v10/index.html?route=/kitchen/recipes`. Le banc remplace API et Supabase par des données locales et bloque les requêtes distantes.

1. Utiliser le scénario Stock de référence ; aucun achat coché ou repas en cours pour la comparaison normale. Le profil du jeu mesuré indique 25 minutes et 2 personnes ; les mêmes recettes servent aux deux variantes.
2. Régler le viewport à 375 × 812 ou 440 × 956. Choisir la variante dans « Test local — données fictives · contrôles », puis replier ce bandeau avant capture.
3. Comparer recherche, premier plat et premier titre dans le document, en soustrayant la hauteur du bandeau. Le ratio photo principal est 4:3 sur les cartes et 16:9 sur la fiche mobile.
4. Pour Stock vide, Cent ingrédients ou Date proche, restaurer Stock de référence **avant de recharger** : le banc conserve ses données localement et prend son instantané de référence au montage.
5. « Simuler une coupure » refuse la prochaine commande. Une seconde pression réarme le refus. « Refuser la vérification » reste actif jusqu’à « Rétablir la vérification » ; utiliser ensuite la reprise affichée dans l’écran.

Le banc n’appelle aucun modèle. L’envoi d’une question complète n’y a pas de réponse simulée : il produit un échec explicite, utile pour vérifier conservation du texte et focus. Aucun enregistrement microphone réel n’a été effectué.

## Preuves complémentaires

- [Mesures DOM finales](ui-observations.json), [contrastes et pieds de dialogue](contrast.json), [validation](validation.json).
- [Aujourd’hui sombre](personal-today-375-dark.png), [bibliothèque sombre](personal-library-440-dark.png), [desktop sombre](personal-library-desktop-dark.png).
- [Fiche claire](detail-375-light.png), [fiche sombre](detail-440-dark.png), [contexte du repas sombre](meal-context-375-dark.png).
- [Correction courante](stock-correction-440-light.png), [échec conservé](stock-correction-error-440-light.png), [confirmation](stock-correction-confirmed-440-light.png).
- [Cent ingrédients](stock-100-375-light.png), [recherche du centième](stock-search-100-375-light.png), [stock vide](stock-empty-375-light.png), [date proche prioritaire](today-date-priority-375-light.png).
- [Courses](shopping-375-dark.png), [ajout du nom](shopping-add-name-375-dark.png), [quantité à la demande](shopping-add-quantity-375-dark.png), [retour après cuisine](cooking-feedback-375-dark.png).
- [Rubriques mobiles](settings-list-375-dark.png), [mémoire](settings-memory-440-dark.png), [aide contextuelle](context-help-stock-375-light.png), [question conservée après erreur](assistant-error-375-dark.png).
- [Panne de vérification](today-verification-error-440-light.png) : anciennes conclusions retirées, reprise explicite.

Les images et valeurs nutritionnelles sont fictives. Le contrôle des couleurs utilise les tokens OKLCH convertis en luminance sRGB ; il ne remplace pas une revue complète d’accessibilité. Les temps humains, taps, abandon, zoom réel, Safari, clavier iPhone et VoiceOver restent non mesurés. Voir le [rapport d’implémentation](../../implementations/V10-03B.md).
