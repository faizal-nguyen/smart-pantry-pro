/**
 * PRP-235 Backlog 2 — Migration `usePersonalization` (localStorage)
 *                     → `assistant_memory_items` (Supabase via API).
 *
 * Contexte : PRP-235 PR3 a livré la section « Préférences cuisine »
 * inline qui lit/écrit dans `usePersonalization` (storage clé
 * `PERSONALIZATION_STORAGE_KEY`, localStorage only). Ces préférences
 * (foyer, régimes, niveau cuisine, objectifs) ne sont pas visibles
 * dans le panneau Mémoire assistant, donc l'utilisateur peut pas
 * les "oublier" ni l'assistant les utiliser pour le scoring.
 *
 * Cette migration one-shot par client convertit la donnée legacy en
 * `assistant_memory_items` :
 *   - 1 memory par dimension (householdSize, cookingLevel)
 *   - 1 memory par tag (dietaryPreferences[], goals[])
 *   - kind aligné au sens : habit, cooking_style, diet_goal, preference
 *   - source = 'imported', confidence = 0.8
 *   - status par défaut (candidate côté backend) → user confirme
 *     depuis MemoryPanel
 *
 * Best-effort : un échec partiel laisse le flag absent → on
 * re-essaie au prochain mount. Une fois tous les memories créés,
 * on stamp `personalizationMigratedToMemory:v1` dans localStorage.
 * Idempotent : si déjà migré, no-op.
 *
 * Ce hook NE supprime PAS le localStorage legacy — la section
 * Préférences cuisine reste fonctionnelle. La migration est juste
 * un miroir initial vers la mémoire assistant. Une suppression
 * future du flow legacy (PRP dédiée) pourra purger ce localStorage
 * après une période de cohabitation.
 */
import { useEffect, useRef } from 'react';

import {
  createAssistantMemory,
  type AssistantMemoryKind,
  type CreateAssistantMemoryInput,
} from '@/services/assistantApi';
import { usePersonalization } from '@/hooks/usePersonalization';

const MIGRATION_FLAG_KEY = 'personalizationMigratedToMemory:v1';

interface PersonalizationLike {
  householdSize?: string;
  dietaryPreferences?: string[];
  cookingLevel?: number; // [0..1]
  goals?: string[];
}

function cookingLevelLabel(level: number): string {
  if (level <= 0.33) return 'Débutant';
  if (level <= 0.66) return 'Intermédiaire';
  return 'Expert';
}

const DIETARY_LABELS: Record<string, string> = {
  vegetarian: 'végétarien',
  vegan: 'vegan',
  'gluten-free': 'sans gluten',
  'lactose-free': 'sans lactose',
};

/**
 * Build the set of memories to import from a `PersonalizationData`
 * snapshot. Exported pour tests / preview futur.
 */
export function buildMemoriesFromPersonalization(
  data: PersonalizationLike,
): CreateAssistantMemoryInput[] {
  const memories: CreateAssistantMemoryInput[] = [];
  const evidence = { source: 'onboarding', migrated_at: new Date().toISOString() };

  if (data.householdSize && data.householdSize.trim().length > 0) {
    memories.push({
      kind: 'habit' satisfies AssistantMemoryKind,
      content: `Foyer : ${data.householdSize}`,
      source: 'imported',
      confidence: 0.8,
      evidence,
    });
  }

  if (typeof data.cookingLevel === 'number') {
    memories.push({
      kind: 'cooking_style' satisfies AssistantMemoryKind,
      content: `Niveau cuisine : ${cookingLevelLabel(data.cookingLevel)}`,
      source: 'imported',
      confidence: 0.8,
      evidence: { ...evidence, raw_level: data.cookingLevel },
    });
  }

  for (const tag of data.dietaryPreferences ?? []) {
    if (!tag) continue;
    const label = DIETARY_LABELS[tag] ?? tag;
    memories.push({
      kind: 'diet_goal' satisfies AssistantMemoryKind,
      content: `Régime : ${label}`,
      source: 'imported',
      confidence: 0.8,
      evidence: { ...evidence, tag },
    });
  }

  for (const goal of data.goals ?? []) {
    if (!goal) continue;
    memories.push({
      kind: 'preference' satisfies AssistantMemoryKind,
      content: `Objectif : ${goal}`,
      source: 'imported',
      confidence: 0.8,
      evidence: { ...evidence, goal },
    });
  }

  return memories;
}

function hasAlreadyMigrated(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(MIGRATION_FLAG_KEY) === '1';
}

function markMigrated(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MIGRATION_FLAG_KEY, '1');
}

/**
 * Mount once per app session — auto-migrate legacy localStorage
 * preferences when the user is authenticated. Aucune UI ; toast
 * silencieux. Erreur réseau → flag non posé → retry au prochain
 * mount.
 */
export function usePersonalizationMigration(): void {
  const { personalizationData, isLoading } = usePersonalization();
  const runningRef = useRef(false);

  useEffect(() => {
    if (isLoading || runningRef.current) return;
    if (!personalizationData) return;
    if (hasAlreadyMigrated()) return;

    runningRef.current = true;
    const memories = buildMemoriesFromPersonalization(personalizationData);

    if (memories.length === 0) {
      // Rien à migrer mais on stamp pour ne pas re-essayer chaque
      // mount → user pourra toujours créer manuellement.
      markMigrated();
      runningRef.current = false;
      return;
    }

    void (async () => {
      try {
        // Sequential pour éviter de spammer l'API rate-limit. Si une
        // creation échoue, on s'arrête → retry au prochain mount sur
        // les memories restantes (les déjà créées ne re-fire pas car
        // on n'en a pas la trace ; trade-off accepté, duplicates
        // possibles si plusieurs retries — l'utilisateur peut
        // "Oublier" depuis MemoryPanel).
        for (const memory of memories) {
          await createAssistantMemory(memory);
        }
        markMigrated();
      } catch (err) {
        // Best-effort : on log en dev seulement, l'utilisateur ne
        // voit rien. Flag pas posé → retry au prochain mount.
        if (import.meta.env.DEV) {
          console.warn('[personalizationMigration] failed:', err);
        }
      } finally {
        runningRef.current = false;
      }
    })();
  }, [personalizationData, isLoading]);
}
