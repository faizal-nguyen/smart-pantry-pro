/**
 * PRP-235 PR1 — AssistantMemoryStub.
 *
 * Empty state honnête en attendant PR2 qui montera `MemoryPanel` +
 * `ConversationHistoryList` (composants PRP-223 déjà existants).
 * Évite de dupliquer la logique mémoire ici — l'utilisateur peut
 * gérer dans le panel assistant existant.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AssistantMemoryStub() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" aria-hidden="true" />
          Assistant &amp; mémoire
        </CardTitle>
        <CardDescription>
          Confirmer, oublier ou corriger ce que l&apos;assistant retient de toi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          La gestion fine de la mémoire arrive ici dans une prochaine mise à
          jour. En attendant, tu peux la gérer directement depuis l&apos;assistant.
        </p>
        <Button
          type="button"
          onClick={() => navigate('/assistant')}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Ouvrir l&apos;assistant
        </Button>
      </CardContent>
    </Card>
  );
}
