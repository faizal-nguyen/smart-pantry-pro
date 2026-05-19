/**
 * PRP-235 PR3 — CookingPreferencesSection.
 *
 * Section inline (plus de modal) qui expose les 4 préférences user
 * stockées localement par `usePersonalization` :
 *   - taille du foyer
 *   - préférences alimentaires (multi-select)
 *   - niveau cuisine (slider 0..1)
 *   - objectifs (multi-select)
 *
 * Remplace le couple `PersonalizationSettings.tsx` modal (cassé : il
 * accédait à `preferences` / `updatePreferences` qui n'existent PAS
 * sur l'API `usePersonalization` ; les vrais noms sont
 * `personalizationData` / `updatePersonalizationData`) +
 * `CookingPreferencesStub.tsx`. PR3 supprime les deux.
 *
 * Conserve le wiring localStorage (`usePersonalization`) — pas de
 * nouvelle table SQL. La migration vers `assistant_memory_items` est
 * tracked comme backlog (PRP-235 §11).
 */
import React, { useEffect, useState } from 'react';
import { ChefHat, Home, Leaf, Milk, Save, Target, Users, Utensils, Wheat } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { usePersonalization } from '@/hooks/usePersonalization';

// `cookingLevel` est stocké en [0..1] dans PersonalizationData (cf.
// onboarding) ; on convertit en % pour l'UI et reconvertit au save.
const COOKING_LEVEL_LABELS = ['Débutant', 'Intermédiaire', 'Expert'] as const;

function getCookingLabel(percent: number): (typeof COOKING_LEVEL_LABELS)[number] {
  if (percent < 33) return 'Débutant';
  if (percent < 66) return 'Intermédiaire';
  return 'Expert';
}

const HOUSEHOLD_OPTIONS = [
  { value: 'Solo', label: 'Solo', icon: Home },
  { value: '2 personnes', label: '2 personnes', icon: Users },
  { value: '3-4', label: '3-4 personnes', icon: Users },
  { value: '5+', label: '5+ personnes', icon: Users },
] as const;

const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Végétarien', icon: Leaf },
  { id: 'vegan', label: 'Vegan', icon: Leaf },
  { id: 'gluten-free', label: 'Sans gluten', icon: Wheat },
  { id: 'lactose-free', label: 'Sans lactose', icon: Milk },
] as const;

const GOAL_OPTIONS = [
  'Réduire le gaspillage',
  "Économiser de l'argent",
  'Manger plus sainement',
  'Gagner du temps',
  'Découvrir de nouvelles recettes',
] as const;

interface ToggleCardProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaPressed?: boolean;
}

function ToggleCard({ selected, onClick, children, ariaPressed }: ToggleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed ?? selected}
      className={cn(
        'flex items-center gap-3 rounded-md border bg-surface/40 p-3 text-left text-sm transition-colors',
        'hover:bg-surface/80 focus:bg-surface/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'border-primary bg-primary/5 ring-1 ring-primary',
      )}
    >
      {children}
    </button>
  );
}

export default function CookingPreferencesSection() {
  const { personalizationData, updatePersonalizationData, isLoading } = usePersonalization();
  const { toast } = useToast();

  // Edition locale — synchronisée avec la source quand elle charge.
  const [householdSize, setHouseholdSize] = useState<string>('Solo');
  const [dietary, setDietary] = useState<string[]>([]);
  const [cookingPercent, setCookingPercent] = useState<number>(50);
  const [goals, setGoals] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!personalizationData) return;
    setHouseholdSize(personalizationData.householdSize || 'Solo');
    setDietary(personalizationData.dietaryPreferences ?? []);
    // cookingLevel stocké en [0..1] → convertir vers % pour l'UI
    const stored = personalizationData.cookingLevel ?? 0.5;
    setCookingPercent(Math.round(stored * 100));
    setGoals(personalizationData.goals ?? []);
    setDirty(false);
  }, [personalizationData]);

  const toggleIn = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const handleHousehold = (value: string) => {
    setHouseholdSize(value);
    setDirty(true);
  };

  const handleDietary = (value: string) => {
    setDietary((prev) => toggleIn(prev, value));
    setDirty(true);
  };

  const handleGoal = (value: string) => {
    setGoals((prev) => toggleIn(prev, value));
    setDirty(true);
  };

  const handleCooking = ([value]: number[]) => {
    setCookingPercent(value);
    setDirty(true);
  };

  const handleSave = () => {
    updatePersonalizationData({
      householdSize,
      dietaryPreferences: dietary,
      cookingLevel: Math.round(cookingPercent) / 100,
      goals,
    });
    setDirty(false);
    toast({
      title: 'Préférences mises à jour',
      description: 'Tes préférences cuisine ont été enregistrées.',
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" aria-hidden="true" />
            Préférences cuisine
          </CardTitle>
          <CardDescription>
            Alimentent les recommandations de recettes et la génération de menus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Taille du foyer */}
          <section className="space-y-3" aria-labelledby="prefs-household-label">
            <div>
              <Label id="prefs-household-label">Taille du foyer</Label>
              <p className="text-xs text-muted-foreground">
                Combien de personnes vivent dans ton foyer ?
              </p>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="prefs-household-label"
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {HOUSEHOLD_OPTIONS.map(({ value, label, icon: Icon }) => (
                <ToggleCard
                  key={value}
                  selected={householdSize === value}
                  onClick={() => handleHousehold(value)}
                  ariaPressed={householdSize === value}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">{label}</span>
                </ToggleCard>
              ))}
            </div>
          </section>

          <Separator />

          {/* Préférences alimentaires */}
          <section className="space-y-3" aria-labelledby="prefs-dietary-label">
            <div>
              <Label id="prefs-dietary-label">Préférences alimentaires</Label>
              <p className="text-xs text-muted-foreground">
                Sélectionne tes restrictions ou préférences. Plusieurs choix possibles.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DIETARY_OPTIONS.map(({ id, label, icon: Icon }) => {
                const selected = dietary.includes(id);
                return (
                  <ToggleCard
                    key={id}
                    selected={selected}
                    onClick={() => handleDietary(id)}
                  >
                    <Icon
                      className={cn('h-4 w-4', selected ? 'text-primary' : 'text-muted-foreground')}
                      aria-hidden="true"
                    />
                    <span className="font-medium">{label}</span>
                  </ToggleCard>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Niveau cuisine */}
          <section className="space-y-3" aria-labelledby="prefs-cooking-label">
            <div>
              <Label id="prefs-cooking-label">Niveau en cuisine</Label>
              <p className="text-xs text-muted-foreground">
                Ajuste le curseur pour adapter le niveau de complexité des recettes.
              </p>
            </div>
            <div className="rounded-md border bg-surface/40 p-4 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <ChefHat
                  className={cn(
                    'h-8 w-8 transition-colors',
                    cookingPercent < 33
                      ? 'text-muted-foreground'
                      : cookingPercent < 66
                      ? 'text-primary/70'
                      : 'text-primary',
                  )}
                  aria-hidden="true"
                />
                <div className="text-center">
                  <p className="text-lg font-semibold">{getCookingLabel(cookingPercent)}</p>
                  <p className="text-xs text-muted-foreground">Niveau {cookingPercent}%</p>
                </div>
              </div>
              <Slider
                value={[cookingPercent]}
                onValueChange={handleCooking}
                min={0}
                max={100}
                step={1}
                aria-label="Niveau cuisine"
                aria-valuetext={`${getCookingLabel(cookingPercent)} (${cookingPercent} pourcent)`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Débutant</span>
                <span>Intermédiaire</span>
                <span>Expert</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Objectifs */}
          <section className="space-y-3" aria-labelledby="prefs-goals-label">
            <div>
              <Label id="prefs-goals-label">Tes objectifs</Label>
              <p className="text-xs text-muted-foreground">
                Qu&apos;est-ce qui compte le plus pour toi ?
              </p>
            </div>
            <div className="space-y-2">
              {GOAL_OPTIONS.map((goal) => {
                const selected = goals.includes(goal);
                return (
                  <ToggleCard
                    key={goal}
                    selected={selected}
                    onClick={() => handleGoal(goal)}
                  >
                    <Target
                      className={cn('h-4 w-4', selected ? 'text-primary' : 'text-muted-foreground')}
                      aria-hidden="true"
                    />
                    <span className="font-medium">{goal}</span>
                  </ToggleCard>
                );
              })}
            </div>
          </section>
        </CardContent>
      </Card>

      {/* Save bar sticky en bas */}
      <div className="sticky bottom-2 z-10 flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!dirty || isLoading}
          className="gap-2 shadow-md"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
