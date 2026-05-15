# PRP-235 — Settings Memory, Nutrition, Data

> Statut : **DRAFT**
> Date : 2026-05-13
> Source : `docs/PAGE-UI-UX-AUDIT-2026.md` §3.18-§3.19
> Lie a : PRP-223 Memory Foundation, PRP-227 Nutrition Coach
> Objectif : reorganiser Settings autour des vrais leviers personnels de l'app.

## 1. Contexte

Les settings actuels sont trop generiques et contiennent des badges "bientot" ou
des options peu reliees a la vision produit. Avec l'assistant memoire et le
coach nutrition, Settings doit devenir l'endroit ou l'utilisateur controle ses
donnees, preferences et limites.

## 2. Scope

### Inclus

- Reorganisation de `/settings`.
- Gestion sections :
  - Compte ;
  - Assistant et memoire ;
  - Preferences cuisine ;
  - Nutrition bien-etre ;
  - Confidentialite / donnees ;
  - Apparence.
- Redirection ou ancrage `/settings/appearance`.
- Retrait badges "Bientot" visibles.
- Empty states honnetes pour fonctions non livrees.

### Exclus

- Implementation complete memoire PRP-223.
- Implementation complete nutrition PRP-227.
- Export RGPD avance si pas deja present.
- Billing/monetisation.

## 3. Architecture UX

### `/settings`

Vue par sections, pas dashboard marketing.

Sections :

1. **Compte**
   - email ;
   - deconnexion ;
   - profil de base.

2. **Assistant et memoire**
   - memoire active/desactive ;
   - preferences retenues ;
   - historique conversations ;
   - effacer memoire.

3. **Preferences cuisine**
   - cuisines aimees ;
   - aliments evites ;
   - niveau epices ;
   - temps de cuisine.

4. **Nutrition bien-etre**
   - objectif ;
   - allergies ;
   - restrictions ;
   - disclaimer non medical.

5. **Confidentialite / donnees**
   - export ;
   - suppression donnees ;
   - sources connectees.

6. **Apparence**
   - theme ;
   - density ;
   - reduced motion.

## 4. `/settings/appearance`

Decision :

- soit redirect vers `/settings?section=appearance` ;
- soit garder route uniquement si l'onglet est deep-linkable.

Ne pas afficher une page separee identique a Settings sans focus/ancrage.

## 5. Wording

| Ancien | Nouveau |
|---|---|
| Personnalisation | Preferences |
| Donnees | Mes donnees |
| Tutoriel | Onboarding |
| Bientot | Masquer si non disponible |
| Nutrition IA | Nutrition bien-etre |

## 6. Garde-fous nutrition

La section nutrition doit cadrer l'agent comme coach bien-etre, pas medecin :

- recommandations alimentaires prudentes ;
- pas de diagnostic ;
- consultation pro si symptomes graves/persistants ;
- allergies et regimes traites comme contraintes fortes.

## 7. Plan d'execution

### Phase 1 — Structure

1. Reorganiser les sections.
2. Retirer les cards inutiles.
3. Ajouter ancrages ou tabs.

### Phase 2 — Preferences

1. Afficher preferences deja persistantes si schema existe.
2. Sinon afficher empty state actionnable vers PRP-223/227.
3. Ne pas ajouter de fausse persistence.

### Phase 3 — Donnees

1. Ajouter controles disponibles.
2. Masquer les non disponibles.
3. Documenter les donnees personnelles utilisees.

## 8. Tests et verification

- `npm run build`
- Smoke :
  - `/settings`
  - `/settings/appearance`
- Verification mobile :
  - sections lisibles ;
  - boutons accessibles ;
  - aucun badge "Bientot" inutile.

## 9. Definition of Done

- Settings explique les vrais leviers personnels.
- `/settings/appearance` n'est plus un doublon confus.
- Aucun wording medical dangereux.
- Aucune feature non livree n'est vendue comme active.
- Les preferences non persistantes sont clairement marquees ou masquees.

