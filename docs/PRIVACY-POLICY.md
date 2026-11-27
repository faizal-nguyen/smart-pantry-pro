# Politique de Confidentialité - Smart Pantry Pro

*Dernière mise à jour : Janvier 2025. Mise à jour partielle le 26 novembre 2026 : journal d'erreurs techniques (section 7.3). Mise à jour partielle le 27 novembre 2026 : réglages de confidentialité et données selon vos choix (sections 3.2, 4.2, 6.5 et 14.1).*

> **Avertissement.** Les sections 2.1, 5, 7.1, 7.2, 8.1 et 9.1 datent de janvier 2025 et ne décrivent pas toutes le fonctionnement actuel ; leur réécriture est prévue. En cas d'écart, ce sont les sections 3.2, 4.2, 6.5, 7.3 et 14.1, à jour, qui décrivent ce que fait l'application.

## 1. Introduction

Smart Pantry Pro ("nous", "notre", "l'application") s'engage à protéger votre vie privée et vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons, stockons et protégeons vos informations.

## 2. Principes Fondamentaux

### 2.1 Protection par Conception
- **Traitement local** : Les images sont analysées directement sur votre appareil
- **Pas de stockage automatique** : Les photos ne sont jamais sauvegardées sans votre consentement explicite
- **Données minimales** : Nous ne collectons que les données strictement nécessaires
- **Chiffrement** : Toutes les données sont chiffrées en transit et au repos

### 2.2 Transparence Totale
- Vous êtes informé de chaque utilisation de vos données
- Vous pouvez accéder, modifier ou supprimer vos données à tout moment
- Aucune donnée n'est partagée avec des tiers sans votre consentement

## 3. Données Collectées

### 3.1 Données Essentielles (Obligatoires)
- **Compte utilisateur** : Email, nom d'utilisateur (chiffrés)
- **Inventaire** : Produits scannés, quantités, dates de péremption
- **Recettes** : Recettes sauvegardées et créées

### 3.2 Données selon vos choix et vos usages
- **Historique des conversations avec l'assistant** : conservé seulement si vous l'activez (Paramètres > Données et confidentialité), pour la durée de conservation choisie.
- **Mémoire de l'assistant** : goûts et habitudes retenus seulement si vous l'activez (Paramètres > Mémoire de l'assistant).
- **Mesure d'usage** : aucune mesure d'usage dédiée n'est active. Pour ses suggestions, l'application enregistre les recettes proposées, ouvertes, ajoutées à « À cuisiner bientôt » ou retirées, et préparées, ainsi que vos retours sur une recette. Ces traces n'ont pas de réglage ; elles sont effacées avec vos données.
- **Journal des actions de l'assistant** : chaque action effectuée par l'assistant (outil appelé et ses paramètres, modèle utilisé) est consignée, que l'historique des conversations soit activé ou non. Ce journal est effacé avec vos données.
- **Photos** : une photo n'est analysée que lorsque vous l'envoyez. Les codes-barres sont lus sur l'appareil ; le numéro lu sert ensuite à retrouver le produit. La photo d'un ticket de caisse n'est pas conservée ; les informations qui y sont lues (magasin, date, total, lignes et prix) le sont. Les photos ajoutées à un produit ou à une recette, celles des produits ajoutés depuis l'assistant, et les vidéos déposées pour importer une recette avec les images qui en sont extraites, sont conservées avec vos données et effacées avec elles.
- **Erreurs techniques** : voir la section 7.3.

### 3.3 Données JAMAIS Collectées
- Localisation GPS
- Contacts
- Photos de votre galerie (sauf sélection explicite)
- Données biométriques
- Informations bancaires

## 4. Utilisation des Données

### 4.1 Fonctionnement de l'Application
- Gestion de votre inventaire alimentaire
- Suggestions de recettes basées sur vos produits
- Alertes de péremption
- Synchronisation entre vos appareils (si activée)

### 4.2 Amélioration du Service
- Aucune mesure d'usage dédiée : les fonctionnalités utilisées ne sont pas analysées
- Détection et correction des plantages, par le journal d'erreurs techniques (section 7.3)

### 4.3 Ce que Nous NE Faisons PAS
- Vente de vos données
- Publicité ciblée
- Profilage marketing
- Partage avec des réseaux sociaux

## 5. Traitement des Images

### 5.1 Processus de Scan
1. **Capture** : L'image est prise par votre caméra
2. **Traitement local** : Analyse sur votre appareil
3. **Extraction EXIF** : Les métadonnées sont automatiquement supprimées
4. **API Vision** : Envoi sécurisé pour reconnaissance (si activé)
5. **Suppression** : L'image est immédiatement supprimée après traitement

### 5.2 Sécurité des Images
- Aucune image n'est stockée sur nos serveurs
- Les métadonnées EXIF sont supprimées pour protéger votre localisation
- Traitement en mémoire uniquement
- Chiffrement de bout en bout si envoi nécessaire

## 6. Vos Droits (RGPD)

### 6.1 Droit d'Accès
Vous pouvez demander une copie de toutes vos données à tout moment via les paramètres de l'application.

### 6.2 Droit de Rectification
Vous pouvez modifier vos informations directement dans l'application.

### 6.3 Droit à l'Effacement ("Droit à l'Oubli")
Vous pouvez supprimer définitivement votre compte et toutes les données associées.

### 6.4 Droit à la Portabilité
Exportez vos données dans un format standard (JSON) pour les utiliser ailleurs.

### 6.5 Droit d'Opposition
Désactivez à tout moment l'historique des conversations et la mémoire de l'assistant. Aucune mesure d'usage dédiée n'est active : il n'existe donc pas de réglage d'analyses. Les traces de recettes et le journal des actions de l'assistant (section 3.2) n'ont pas de réglage ; ils sont effacés avec vos données (section 6.3).

### 6.6 Droit à la Limitation
Vous pouvez limiter le traitement de vos données via les paramètres de confidentialité.

## 7. Sécurité Technique

### 7.1 Mesures de Protection
- **Chiffrement AES-256** pour les données au repos
- **TLS 1.3** pour les données en transit
- **Authentification forte** avec tokens JWT
- **Rate limiting** pour prévenir les abus
- **Audit logs** anonymisés pour la sécurité

### 7.2 Infrastructure
- Serveurs hébergés en Europe (conformité RGPD)
- Sauvegardes chiffrées quotidiennes
- Tests de sécurité réguliers
- Conformité ISO 27001

### 7.3 Journal d'erreurs techniques
Pour détecter et corriger les plantages, quand l'application rencontre une erreur dans votre navigateur, elle envoie un rapport technique au serveur, qui l'inscrit dans les journaux d'exécution de l'hébergeur (Vercel). Ce rapport contient uniquement :
- le type d'erreur et son nom technique (par exemple `TypeError`) ;
- un code technique, s'il fait partie d'une liste connue ;
- le modèle de la page concernée (par exemple `/kitchen/recipes/:id` pour une fiche recette), jamais son adresse complète ni ses identifiants ;
- les lignes techniques de la pile d'appels : nom de fonction, fichier de l'application, ligne et colonne, sans le message d'erreur ;
- la version de l'application.

Il ne contient ni le message d'erreur, ni ce que vous avez saisi, ni l'adresse complète de la page, ni votre identifiant de compte. Un rapport n'est envoyé que si vous êtes connecté. L'hébergeur peut conserver de son côté, dans ses journaux d'infrastructure, l'adresse IP et les métadonnées techniques de la requête ; nous ne les ajoutons pas au rapport. D'après la documentation de Vercel, les journaux d'exécution sont conservés une heure avec la formule d'hébergement actuelle. Base légale : intérêt légitime, pour la sécurité et la fiabilité du service.

## 8. Conservation des Données

### 8.1 Durées de Conservation
- **Compte actif** : Données conservées tant que le compte est actif
- **Historique** : 30 jours par défaut (personnalisable)
- **Analytics** : 90 jours maximum
- **Logs de sécurité** : 6 mois

### 8.2 Suppression Automatique
- Données inactives supprimées après 1 an
- Possibilité de configurer une suppression automatique
- Notification avant suppression

## 9. Partage de Données

### 9.1 Services Tiers Essentiels
- **Supabase** : Base de données (chiffrée, hébergée en Europe)
- **OpenAI** : Reconnaissance d'images (données anonymisées, pas de stockage)
- **Vercel** : Hébergement de l'application, de l'API et de leurs journaux techniques (voir section 7.3)

### 9.2 Garanties
- Accords de confidentialité stricts avec tous les prestataires
- Audit régulier des pratiques de sécurité
- Notification en cas de changement de prestataire

## 10. Cookies et Tracking

### 10.1 Cookies Essentiels
- Session d'authentification
- Préférences de langue
- Paramètres de confidentialité

### 10.2 Pas de Cookies Marketing
- Aucun cookie de tracking publicitaire
- Aucun pixel de réseaux sociaux
- Aucune analyse comportementale

## 11. Enfants

L'application n'est pas destinée aux enfants de moins de 13 ans. Nous ne collectons pas sciemment de données d'enfants.

## 12. Modifications

### 12.1 Notification
- Email 30 jours avant tout changement majeur
- Notification dans l'application
- Historique des versions disponible

### 12.2 Consentement
- Changements majeurs nécessitent un nouveau consentement
- Possibilité de refuser et conserver l'ancienne version

## 13. Contact

### 13.1 Délégué à la Protection des Données
Email : privacy@smartpantrypro.com

### 13.2 Réclamations
En cas de désaccord, vous pouvez contacter l'autorité de protection des données de votre pays.

### 13.3 Support
- Email : support@smartpantrypro.com
- Dans l'app : Paramètres > Aide > Contact

## 14. Bases Légales

### 14.1 Consentement
Pour l'historique des conversations et la mémoire de l'assistant, activés seulement à votre demande. Aucune mesure d'usage dédiée n'est collectée.

### 14.2 Contrat
Pour les données nécessaires au fonctionnement du service

### 14.3 Intérêts Légitimes
Pour la sécurité et la prévention de la fraude

## 15. Transferts Internationaux

Vos données restent dans l'Union Européenne. En cas de transfert nécessaire hors UE, nous utilisons les clauses contractuelles types de la Commission Européenne.

---

**Version** : 1.0.0  
**Date d'effet** : 7 Janvier 2025  
**Langue** : Cette politique est disponible en français et en anglais. En cas de conflit, la version française prévaut.