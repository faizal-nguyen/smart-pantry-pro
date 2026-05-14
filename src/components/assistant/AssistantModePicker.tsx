/**
 * AssistantModePicker — picker des 7 modes de conversation.
 *
 * PRP-224 PR3 — dropdown compact (icon + label) à intégrer dans le
 * composer. Émet `onChange(mode)` ; le parent persiste le mode via
 * `PATCH /conversations/:id` (PR1) et reflète dans l'URL `?mode=`.
 *
 * Modes alignés sur `assistant_conversations.mode` (PRP-223 §6.1).
 */
import React from 'react';
import {
  Bot,
  ChefHat,
  ChevronDown,
  CookingPot,
  Heart,
  Package,
  ShoppingCart,
  UtensilsCrossed,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import type { AssistantConversationMode } from '@/services/assistantApi';

interface ModeDef {
  value: AssistantConversationMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Order chosen to match the navigation order V1 (Kitchen / Inventory /
// Shopping / Insights / Assistant — but applied as conversation
// scopes). General first, Cooking last (specialised mode).
const MODES: readonly ModeDef[] = [
  { value: 'general', label: 'Général', icon: Bot },
  { value: 'kitchen', label: 'Cuisine', icon: ChefHat },
  { value: 'recipes', label: 'Recettes', icon: UtensilsCrossed },
  { value: 'inventory', label: 'Inventaire', icon: Package },
  { value: 'shopping', label: 'Courses', icon: ShoppingCart },
  { value: 'nutrition', label: 'Nutrition', icon: Heart },
  { value: 'cooking', label: 'Cooking', icon: CookingPot },
] as const;

interface AssistantModePickerProps {
  value: AssistantConversationMode;
  onChange: (mode: AssistantConversationMode) => void;
  disabled?: boolean;
  /** Hide label on narrow screens (icon-only). */
  compact?: boolean;
}

export default function AssistantModePicker({
  value,
  onChange,
  disabled,
  compact = false,
}: AssistantModePickerProps) {
  const current = MODES.find(m => m.value === value) ?? MODES[0];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={`Mode actuel : ${current.label}. Changer de mode.`}
          className={cn('h-11 min-w-[44px]', compact ? 'px-2' : 'px-3')}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {!compact && <span className="ml-2 text-sm">{current.label}</span>}
          <ChevronDown className="h-3 w-3 ml-1 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {MODES.map(m => {
          const Mi = m.icon;
          return (
            <DropdownMenuItem
              key={m.value}
              onSelect={() => onChange(m.value)}
              className={cn(m.value === value && 'bg-muted')}
            >
              <Mi className="h-4 w-4 mr-2" aria-hidden="true" />
              {m.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const ASSISTANT_MODES = MODES;
