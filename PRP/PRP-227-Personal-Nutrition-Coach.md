# PRP-227 - Personal Nutrition Coach

> Statut : **Draft pret a challenger**  
> Date : 2026-05-13  
> Owner : @faizel  
> Dependances : PRP-223 Memory Foundation, PRP-225 Product Intelligence, PRP-226 Kitchen Recommendation Engine  
> Objectif : ajouter un coach nutrition bien-etre prudent, personnalise et connecte a l'inventaire, aux recettes et aux objectifs utilisateur, sans se presenter comme outil medical.

---

## 1. Resume executif

Smart Pantry Pro peut devenir plus qu'un gestionnaire de recettes : un coach
cuisine + nutrition bien-etre qui aide l'utilisateur a manger selon ses objectifs
avec ce qu'il a deja.

Cette PRP ajoute :

- profil nutritionnel optionnel,
- objectifs : perte de poids, maintien, energie, proteines, digestion, anti-gaspi,
- recommandations de menus journaliers,
- adaptation de recettes,
- suivi de ressenti,
- garde-fous sante,
- integration assistant vocal.

Positionnement :

> Conseils alimentaires et organisation cuisine. Pas diagnostic medical.

---

## 2. Probleme a resoudre

L'utilisateur peut avoir :

- fatigue,
- envie de manger plus leger,
- objectif perte de poids,
- besoin de plus de proteines,
- digestion fragile,
- envie de mieux organiser ses repas,
- plein d'aliments disponibles mais pas d'idee.

Il veut demander :

- "Je suis fatigue, qu'est-ce que je peux manger ?"
- "Fais-moi une journee perte de poids avec mes recettes."
- "Adapte cette recette pour plus de proteines."
- "Je veux manger leger mais rassasiant."
- "Propose-moi 3 menus pour la semaine sans trop racheter."

L'app doit repondre avec prudence, contexte et action.

---

## 3. Guardrails sante

### 3.1 Non medical

L'assistant ne doit pas :

- diagnostiquer,
- traiter une maladie,
- promettre une perte de poids,
- conseiller des restrictions extremes,
- remplacer un professionnel de sante.

### 3.2 Escalade

Si l'utilisateur mentionne :

- douleur forte,
- malaise,
- symptomes persistants,
- trouble alimentaire,
- perte de poids extreme,
- grossesse/allaitement avec symptomes,
- diabete/traitement/condition medicale,

l'assistant doit repondre prudemment et recommander de consulter un professionnel.

### 3.3 Langage

Dire :

- "Je peux te proposer une option douce et equilibree."
- "Si ca persiste ou s'aggrave, consulte un professionnel."

Ne pas dire :

- "Tu as une carence."
- "Tu dois manger X pour guerir."

---

## 4. Profil nutritionnel

### 4.1 nutrition_profiles

```sql
CREATE TABLE public.nutrition_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  goal TEXT CHECK (goal IN (
    'balanced',
    'weight_loss',
    'maintenance',
    'muscle_gain',
    'energy',
    'digestion',
    'anti_waste'
  )),
  activity_level TEXT CHECK (activity_level IN ('low','moderate','high')),
  preferred_meals_per_day INTEGER CHECK (preferred_meals_per_day BETWEEN 1 AND 6),
  target_calories INTEGER,
  target_protein_g INTEGER,
  dietary_patterns TEXT[] NOT NULL DEFAULT '{}',
  avoided_ingredients TEXT[] NOT NULL DEFAULT '{}',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  disclaimer_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Regle :

- Profil optionnel.
- Calories/proteines optionnelles.
- Allergies = health_sensitive memory aussi.
- Disclaimer requis avant conseils nutrition personnalises avances.

### 4.2 wellness_checkins

```sql
CREATE TABLE public.wellness_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  hunger_level INTEGER CHECK (hunger_level BETWEEN 1 AND 5),
  digestion TEXT CHECK (digestion IN ('good','neutral','heavy','sensitive','unknown')),
  mood TEXT CHECK (mood IN ('good','neutral','stressed','tired','unknown')),
  symptoms_text TEXT,
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.3 meal_recommendation_plans

```sql
CREATE TABLE public.meal_recommendation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  goal TEXT,
  meals JSONB NOT NULL DEFAULT '[]',
  nutrition_estimate JSONB NOT NULL DEFAULT '{}',
  shopping_delta JSONB NOT NULL DEFAULT '[]',
  rationale TEXT,
  created_from_conversation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. Capacites V1

### 5.1 Recommandation selon ressenti

Input :

- "je suis fatigue",
- "je me sens lourd",
- "je veux manger leger",
- "j'ai faim mais je veux rester clean".

Flow :

1. demander clarification courte si necessaire,
2. lire inventaire,
3. lire recettes,
4. appliquer garde-fous,
5. recommander repas doux/equilibre,
6. proposer alternatives.

### 5.2 Menu journalier

Input :

- "fais-moi une journee perte de poids",
- "menu high protein avec ce que j'ai",
- "journee anti-gaspi".

Output :

- petit-dej,
- dejeuner,
- diner,
- snack optionnel,
- ingredients a utiliser,
- manquants,
- estimation nutrition si disponible,
- liens recettes.

### 5.3 Adaptation recette

Exemples :

- augmenter proteines,
- reduire huile,
- remplacer creme,
- baisser glucides,
- ajouter legumes,
- ajuster portions.

Le resultat doit etre une adaptation, pas une modification destructive de la
recette source. L'utilisateur peut sauvegarder une variante plus tard.

### 5.4 Portions

L'assistant peut proposer :

- portions par personne,
- "fais-en 2 repas",
- batch cooking,
- leftovers.

Sans pretendre precision dietetique parfaite.

---

## 6. Nutrition estimation

Sources :

- nutrition produit PRP-225,
- nutrition_json recettes si present,
- estimation ingredient si disponible,
- fallback "non disponible".

Regle :

- afficher "estimation",
- ne pas bloquer si donnees manquantes,
- ne pas inventer des macros precises si base absente.

```ts
interface NutritionEstimate {
  confidence: 'low' | 'medium' | 'high';
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  notes: string[];
}
```

---

## 7. Tools assistant

| Tool | Type | Args | Retour |
|---|---|---|---|
| `read_nutrition_profile` | read | `{}` | profile |
| `update_nutrition_profile` | medium | `{ patch }` | profile |
| `record_wellness_checkin` | low/medium | `{ energy, digestion, symptoms_text? }` | checkin |
| `recommend_meal_for_feeling` | read | `{ feeling, meal_type?, time_limit? }` | recommendations |
| `generate_daily_menu` | read | `{ goal, date?, meals? }` | menu |
| `adapt_recipe_for_goal` | read | `{ recipe_id, goal }` | adaptation |
| `save_meal_recommendation_plan` | low | `{ plan }` | saved plan |

Escalade :

- allergies/conditions medicales -> medium/high confirmation.
- symptomes graves -> no action + safety response.

---

## 8. Integration PRP-226

Le coach nutrition ne choisit pas les recettes directement via LLM.

Flow :

```txt
Nutrition request
  -> guardrail classifier
  -> nutrition profile + memories
  -> RecommendationEngine goal-aware
  -> nutrition estimate
  -> LLM explanation
  -> menu/cards
```

---

## 9. UX

### Assistant

Mode interne :

- "Nutrition bien-etre".

Affichage :

- reponse naturelle,
- cartes repas,
- pourquoi ce choix,
- estimation nutrition,
- manquants,
- boutons :
  - cuisiner,
  - ajouter manquants,
  - planifier,
  - sauvegarder menu.

### Settings

Section :

- objectif actuel,
- allergies/aliments evites,
- preferences,
- disclaimer,
- supprimer profil.

### Insights

V1 :

- pas de dashboard nutrition complexe.
- eventuellement historique check-ins simple plus tard.

---

## 10. Exemples attendus

### Fatigue

User :

> "Je suis fatigue, je mange quoi ?"

Assistant :

> "Je peux te proposer quelque chose de simple et rassasiant avec ce que tu as.
> Tu as du saumon, du riz et des legumes : le red curry black cod est une bonne
> option si tu veux un repas complet. Si ta fatigue est intense ou persiste,
> mieux vaut demander un avis medical."

### Perte de poids

User :

> "Fais-moi une journee perte de poids."

Assistant :

> "Je te propose une journee plus legere mais rassasiante : soupe carrot
> turmeric au dejeuner, tandoori chicken avec legumes le soir, snack skyr si tu
> en as. J'ai privilegie les proteines et les recettes deja dans ta base."

---

## 11. Phases implementation

### Phase 1 - Profil + guardrails

- schema,
- settings profil,
- disclaimer,
- safety classifier simple.

### Phase 2 - Nutrition estimates

- projection nutrition,
- confidence,
- affichage.

### Phase 3 - Tools assistant

- read/update profile,
- checkins,
- recommend for feeling,
- adapt recipe.

### Phase 4 - Daily menu generator

- utilise PRP-226,
- output structured,
- save plan.

### Phase 5 - Learning loop

- feedback apres repas,
- memories : calant, trop lourd, aime, a eviter.

---

## 12. Tests

Unitaires :

- guardrail classifier,
- profile validation,
- nutrition estimate confidence,
- recipe adaptation constraints.

Integration :

- fatigue -> safe recommendation,
- weight_loss -> daily menu,
- allergy mentioned -> confirmation/sensitive memory,
- severe symptom -> refusal/medical escalation.

UX :

- empty profile,
- partial profile,
- no nutrition data,
- missing inventory.

---

## 13. Definition of Done

- L'utilisateur peut creer un profil nutritionnel optionnel.
- L'assistant peut recommander un repas selon ressenti.
- L'assistant peut generer un menu journalier simple.
- L'assistant peut adapter une recette a un objectif.
- Les reponses restent prudentes et non medicales.
- Les donnees sensibles sont marquees et confirmables.
- Les plans peuvent etre sauvegardes.

---

## 14. Non-objectifs

- Pas de diagnostic medical.
- Pas de traitement de maladie.
- Pas de plan alimentaire clinique.
- Pas de calcul macro exact obligatoire.
- Pas de suivi calories strict type MyFitnessPal en V1.
- Pas de promesse de perte de poids.

---

## 15. Risques

### Risque medical

Mitigation :

- guardrails,
- disclaimer,
- escalation symptomes graves,
- langage prudent.

### Mauvaises donnees nutrition

Mitigation :

- confidence,
- source,
- estimation,
- fallback.

### Experience culpabilisante

Mitigation :

- ton bienveillant,
- objectifs modifiables,
- pas de jugement,
- focus cuisine utile.

---

## 16. Questions ouvertes

1. Demander taille/poids/age ?
   - Reco V1 : non, trop sensible. Objectifs qualitatifs d'abord.
2. Calories cible ?
   - Reco : optionnel, manuel, jamais impose.
3. Check-in quotidien ?
   - Reco : opt-in uniquement.
