# Parcours Utilisateurs - Smart Pantry Pro

## Vue d'ensemble

Ce document détaille les parcours utilisateurs types, les personas et les points de contact tout au long de l'expérience Smart Pantry Pro.

## Personas Principales

### 👩 Marie - La Mère de Famille Organisée
**Age**: 38 ans  
**Situation**: Mariée, 2 enfants (8 et 12 ans)  
**Tech-savvy**: Moyen  
**Objectifs**: 
- Réduire le gaspillage alimentaire
- Gagner du temps sur les courses
- Varier les repas familiaux
- Contrôler le budget alimentation

**Pain Points**:
- Oublie ce qu'il y a dans le frigo
- Manque d'inspiration pour les repas
- Les enfants sont difficiles
- Jongle entre travail et famille

### 👨‍🎓 Thomas - L'Étudiant Économe
**Age**: 22 ans  
**Situation**: Étudiant en master, colocation  
**Tech-savvy**: Élevé  
**Objectifs**:
- Manger sainement avec petit budget
- Éviter le gaspillage (conscience écolo)
- Partager les courses avec colocs
- Apprendre à cuisiner

**Pain Points**:
- Budget très serré
- Peu de temps pour cuisiner
- Partage frigo compliqué
- Manque d'expérience cuisine

### 👴 Robert - Le Senior Connecté
**Age**: 68 ans  
**Situation**: Retraité, veuf  
**Tech-savvy**: Faible à moyen  
**Objectifs**:
- Simplifier la gestion des courses
- Suivre son régime santé
- Éviter les oublis
- Maintenir son autonomie

**Pain Points**:
- Interface complexes
- Oublie dates de péremption
- Portions trop grandes
- Mobilité réduite

### 👩‍💼 Sophie - La Professional Active
**Age**: 32 ans  
**Situation**: Célibataire, cadre  
**Tech-savvy**: Élevé  
**Objectifs**:
- Optimiser son temps
- Manger sainement
- Découvrir nouvelles recettes
- Zero effort maximum results

**Pain Points**:
- Rentre tard du travail
- Peu de temps pour courses
- Mange souvent dehors
- Gaspille par manque de temps

## Parcours Détaillés

### 🚀 Onboarding - Premier Contact

```
Découverte → Inscription → Configuration → Première utilisation
```

#### 1. Découverte (Tous personas)
**Touchpoints**: 
- Recherche Google "réduire gaspillage alimentaire"
- Recommandation ami/famille
- Article blog/presse
- Publicité réseaux sociaux

**Actions**:
```
Landing Page
    ↓
[Hero: "Réduisez votre gaspillage de 50%"]
    ↓
[Features highlights avec screenshots]
    ↓
[Témoignages utilisateurs similaires]
    ↓
[CTA: "Essai gratuit 30 jours"]
```

#### 2. Inscription

**Marie - Parcours Desktop**:
```
Email + Password
    ↓
Confirmation email
    ↓
Questionnaire famille (combien de personnes?)
    ↓
Préférences alimentaires (allergies, régimes)
    ↓
Tutorial interactif
```

**Thomas - Parcours Mobile**:
```
Sign in with Google
    ↓
Skip profil (plus tard)
    ↓
Permission notifications
    ↓
Quick start (ajouter premier produit)
```

#### 3. Configuration initiale

**Interface adaptative**:
```typescript
const getOnboardingFlow = (persona: UserPersona) => {
  switch(persona.type) {
    case 'family':
      return ['family-size', 'dietary-preferences', 'budget-goals'];
    case 'student':
      return ['quick-setup', 'budget-focus', 'roommate-invite'];
    case 'senior':
      return ['large-ui-mode', 'simple-tutorial', 'help-contact'];
    case 'professional':
      return ['quick-recipes', 'meal-prep', 'time-savers'];
  }
};
```

### 🏠 Utilisation Quotidienne

#### Marie - Routine Hebdomadaire

**Dimanche - Planning**:
```
09h00: Notification "Planifiez votre semaine"
         ↓
      Ouvre l'app
         ↓
      Vue calendrier repas
         ↓
      [Suggestions basées sur stocks]
         ↓
      Drag & drop 7 recettes
         ↓
      Auto-génération liste courses
         ↓
      Partage liste avec mari
```

**Mercredi - Courses**:
```
18h30: Au supermarché
         ↓
      Ouvre liste courses
         ↓
      Vue par rayon
         ↓
      Coche au fur et à mesure
         ↓
      Mari coche de son côté
         ↓
      Budget temps réel
```

**Vendredi - Cuisine**:
```
17h00: "Sortez le poulet du congélo"
         ↓
18h30: Ouvre recette du jour
         ↓
      Mode cuisine (écran reste allumé)
         ↓
      Timer intégré pour cuisson
         ↓
      Photo du plat final
         ↓
      Note et sauvegarde
```

#### Thomas - Usage Étudiant

**Scénario Batch Cooking**:
```
Dimanche 14h:
    └─ Ouvre "Recettes batch cooking"
    └─ Filtre: < 5€/portion, < 30 min
    └─ Sélectionne 3 recettes
    └─ Génère liste courses consolidée
    └─ Compare prix Lidl vs Carrefour
    └─ Partage frais avec colocs
    
Dimanche 16h:
    └─ Cuisine 3h (12 portions)
    └─ Photo et étiquetage Tupperware
    └─ Congélation avec dates
    └─ Planning auto semaine
```

### 💡 Moments Clés d'Engagement

#### "Aha! Moments"

**1. Première économie visible**:
```
Notification: "Vous avez sauvé 3 yaourts de la poubelle!"
              "Économie: 2,40€"
     ↓
Sentiment: "Ça marche vraiment!"
     ↓
Action: Partage sur réseaux sociaux
```

**2. Recette parfaite avec les restes**:
```
Contexte: Frigo presque vide
     ↓
"Que faire avec: tomates, pâtes, fromage?"
     ↓
Suggestion: "Gratin de pâtes express"
     ↓
Résultat: Repas délicieux improvisé
     ↓
Réaction: "J'adore cette app!"
```

**3. Zéro gaspillage mensuel**:
```
Badge débloqué: "Héros Anti-Gaspi!"
     ↓
Statistiques: -78% vs mois dernier
     ↓
Équivalent: 2 repas gratuits
     ↓
Partage: Screenshot réseaux sociaux
```

### 🔄 Parcours de Rétention

#### Semaine 1 - Découverte
```
J1: Premier produit ajouté → Badge "Première étape"
J3: 10 produits → Suggestion première recette
J5: Première liste courses → Tips optimisation
J7: Bilan semaine → Encouragements
```

#### Mois 1 - Habitude
```
S2: Première alerte péremption utile
S3: Planning repas complet
S4: Économies visibles
S4: Proposition premium
```

#### Mois 3 - Ambassadeur
```
M2: Fonctions avancées débloquées
M3: Invitation amis (parrainage)
M3: Contribution recettes communauté
```

### 😟 Points de Friction et Solutions

#### Friction 1: Ajout manuel fastidieux
**Parcours actuel**:
```
😤 Rentrer des courses
   └─ Ouvrir app
   └─ Ajouter produit
   └─ Chercher dans liste
   └─ Entrer quantité
   └─ Répéter 30 fois...
```

**Solution implémentée**:
```
😊 Rentrer des courses
   └─ Photo ticket de caisse
   └─ Extraction automatique
   └─ Validation rapide
   └─ Fait en 2 minutes!
```

#### Friction 2: Oubli d'utilisation
**Problème**: L'app est oubliée après l'enthousiasme initial

**Solutions**:
1. **Notifications intelligentes** (pas spammy)
2. **Widget écran d'accueil** (rappel visuel)
3. **Intégration calendrier** (rappels natifs)
4. **Emails récap hebdo** (valeur démontrée)

### 📱 Cross-Device Journey

#### Marie - Multi-device
```
Matin (Mobile):
  └─ Check alertes péremption
  └─ Ajout rapide petit-déj
  
Midi (Desktop travail):
  └─ Planning repas semaine
  └─ Recherche recettes
  
Soir (Tablette cuisine):
  └─ Mode cuisine plein écran
  └─ Timer et instructions
  
Weekend (Mobile):
  └─ Liste courses magasin
  └─ Scan produits
```

### 🎯 Conversion Points

#### Free → Premium
**Déclencheurs**:
1. Limite 50 produits atteinte
2. Veut planifier > 1 semaine
3. Besoin analytics détaillés
4. Partage famille multiple

**Parcours conversion**:
```
Soft limit atteinte
     ↓
"Débloquez illimité pour 9.99€/mois"
     ↓
[Comparaison Free vs Pro]
     ↓
"Essai Pro 7 jours gratuit"
     ↓
Payment (Apple Pay 1-click)
     ↓
"Bienvenue Pro! Voici vos avantages..."
```

### 📊 Mesure du Parcours

#### KPIs par Étape

| Étape | Métrique | Target | Actuel |
|-------|----------|--------|---------|
| Découverte | Landing → Sign up | 15% | 12% |
| Onboarding | Completion rate | 80% | 75% |
| Activation | Add 5+ products | 60% | 52% |
| Rétention J7 | Active users | 70% | 68% |
| Rétention J30 | Active users | 50% | 45% |
| Conversion | Free → Pro | 10% | 8% |

### 🔮 Future Journey Enhancements

#### Voice-First Journey (2025)
```
"Hey Pantry, qu'est-ce qui expire?"
     ↓
"3 produits: yaourts, salade, pain"
     ↓
"Trouve-moi une recette avec ça"
     ↓
"Salade césar au poulet grillé"
     ↓
"Ajoute les ingrédients manquants"
     ↓
"Fait! Liste mise à jour"
```

#### AR Shopping Journey (2025)
```
Lunettes AR au magasin
     ↓
Produits en promo highlightés
     ↓
Check stocks maison en temps réel
     ↓
Suggestions basées sur planning
     ↓
Budget en vue permanente
```

---

*Ce document est mis à jour mensuellement basé sur les données utilisateurs réelles et les interviews qualitatives. Dernière mise à jour: Janvier 2024*