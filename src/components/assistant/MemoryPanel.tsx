/**
 * PRP-223 PR6 — MemoryPanel.
 *
 * Renders the user's assistant memories with explicit affordances:
 *  - active memories: show + forget
 *  - candidates: show + promote (with health_sensitive disclaimer)
 *               + reject (mapped to forget for V1 simplicity)
 *
 * Empty states are honest — no fake history when zero memories.
 */
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Check, ShieldAlert, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAssistantMemories } from '@/hooks/useAssistantMemories';
import type { AssistantMemoryItem, AssistantMemoryKind } from '@/services/assistantApi';

const KIND_LABELS: Record<AssistantMemoryKind, string> = {
  preference: 'Goût',
  negative_preference: 'À éviter',
  habit: 'Habitude',
  cooking_style: 'Cuisine',
  diet_goal: 'Objectif alimentaire',
  constraint: 'Contrainte',
  recipe_feedback: 'Retour recette',
  shopping_pattern: 'Courses',
  response_style: 'Style de réponse',
};

function MemoryRow({
  memory,
  onForget,
  onPromote,
  isForgetting,
  isPromoting,
}: {
  memory: AssistantMemoryItem;
  onForget?: (id: string) => void;
  onPromote?: (id: string) => void;
  isForgetting?: boolean;
  isPromoting?: boolean;
}) {
  const isCandidate = memory.status === 'candidate';
  const isHealthSensitive = memory.sensitivity === 'health_sensitive';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-start justify-between gap-3 py-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge variant="secondary">{KIND_LABELS[memory.kind]}</Badge>
          {isHealthSensitive && (
            <Badge variant="outline" className="text-amber-700 border-amber-400">
              <ShieldAlert className="h-3 w-3 mr-1" />
              Santé sensible
            </Badge>
          )}
          {isCandidate && (
            <Badge variant="outline" className="text-blue-700 border-blue-400">
              À confirmer
            </Badge>
          )}
        </div>
        <p className="text-sm text-foreground break-words">{memory.content}</p>
        {isCandidate && isHealthSensitive && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            Cette information sera utilisée pour adapter mes suggestions. Pour un diagnostic ou un
            avis médical, consulte un professionnel de santé.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 flex-shrink-0">
        {isCandidate && onPromote && (
          <Button
            size="sm"
            className="min-h-11"
            variant="secondary"
            onClick={() => onPromote(memory.id)}
            disabled={isPromoting}
            aria-label="Confirmer cette mémoire"
          >
            <Check className="h-4 w-4 mr-1" />
            Confirmer
          </Button>
        )}
        {onForget && (
          <Button
            size="sm"
            className="min-h-11"
            variant="ghost"
            onClick={() => onForget(memory.id)}
            disabled={isForgetting}
            aria-label="Oublier cette mémoire"
          >
            <X className="h-4 w-4 mr-1" />
            Oublier
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function MemoryPanel() {
  const { owner, memories, candidates, actives, isLoading, error, refetch, promote, forget, isPromoting, isForgetting } =
    useAssistantMemories();
  const [actionError,setActionError]=useState<{ owner:string|undefined;message:string }|null>(null);
  const activeOwner=useRef(owner);
  activeOwner.current=owner;
  const act = async (action:(id:string)=>Promise<unknown>,id:string) => {
    setActionError(null);
    try { await action(id); }
    catch (failure) { if (activeOwner.current===owner) setActionError({ owner,message:failure instanceof Error ? failure.message : 'Modification non confirmée. Tu peux réessayer.' }); }
  };

  if (error) {
    return <div role="alert" className="space-y-3 rounded-lg border p-4"><p>Impossible de lire les souvenirs pour le moment.</p><Button variant="outline" className="min-h-11" onClick={()=>void refetch()}>Réessayer la lecture de la mémoire</Button></div>;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (memories.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Pas encore de mémoire"
        description="Les souvenirs enregistrés apparaîtront ici. Tu pourras les consulter, confirmer une proposition ou demander son oubli."
      />
    );
  }

  return (
    <div className="space-y-6">
      {actionError?.owner===owner && actionError && <p role="alert" className="text-sm text-destructive">{actionError.message}</p>}
      {candidates.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />À confirmer ({candidates.length})
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Ces souvenirs attendent ta confirmation. Vérifie leur contenu avant de les conserver.
            </p>
            <div className="divide-y divide-border">
              {candidates.map(m => (
                <MemoryRow
                  key={m.id}
                  memory={m}
                  onForget={id=>void act(forget,id)}
                  onPromote={id=>void act(promote,id)}
                  isForgetting={isForgetting}
                  isPromoting={isPromoting}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {actives.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Souvenirs enregistrés ({actives.length})
            </h3>
            <div className="divide-y divide-border">
              {actives.map(m => (
                <MemoryRow
                  key={m.id}
                  memory={m}
                  onForget={id=>void act(forget,id)}
                  isForgetting={isForgetting}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
