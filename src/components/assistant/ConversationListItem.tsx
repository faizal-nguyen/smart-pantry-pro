/**
 * ConversationListItem — single row in the conversation history list.
 *
 * PRP-224 PR2 — extracted from `ConversationHistoryList` so we can hang
 * a dropdown menu with rename / archive / delete actions on each row.
 * Mutations invalidate the shared `['assistant-conversations']` query
 * key so the list refreshes after every change.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Archive, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  AssistantConversation,
  archiveAssistantConversation,
  patchAssistantConversation,
  softDeleteAssistantConversation,
} from '@/services/assistantApi';

interface ConversationListItemProps {
  conversation: AssistantConversation;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ConversationListItem({ conversation }: ConversationListItemProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['assistant-conversations'] });

  const renameMutation = useMutation({
    mutationFn: (title: string) => patchAssistantConversation(conversation.id, { title }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Conversation renommée' });
    },
    onError: (err: Error) =>
      toast({ title: 'Renommage échoué', description: err.message, variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveAssistantConversation(conversation.id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Conversation archivée' });
    },
    onError: (err: Error) =>
      toast({ title: 'Archivage échoué', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => softDeleteAssistantConversation(conversation.id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Conversation supprimée' });
      setConfirmDeleteOpen(false);
    },
    onError: (err: Error) =>
      toast({ title: 'Suppression échouée', description: err.message, variant: 'destructive' }),
  });

  const handleRename = () => {
    // PRP-224 PR2 — V1 uses a native prompt. PR3 polish or follow-up can
    // swap to an inline edit affordance.
    const next = window.prompt(
      'Nouveau titre',
      conversation.title ?? '',
    );
    if (!next) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === conversation.title) return;
    renameMutation.mutate(trimmed);
  };

  return (
    <li className="py-1">
      <div className="group flex items-center gap-1">
        <Button
          variant="ghost"
          className="flex-1 justify-start h-auto py-2 text-left"
          onClick={() => navigate(`/assistant?conversation=${conversation.id}`)}
        >
          <div className="min-w-0">
            <p className="font-medium truncate">
              {conversation.title ?? 'Conversation sans titre'}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(conversation.last_message_at ?? conversation.created_at)}
              {' · '}
              {conversation.mode}
            </p>
          </div>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Actions sur cette conversation"
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handleRename}>
              <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
              Renommer
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending || conversation.status !== 'active'}
            >
              <Archive className="h-4 w-4 mr-2" aria-hidden="true" />
              Archiver
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setConfirmDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              La conversation « {conversation.title ?? 'Sans titre'} » sera masquée de
              ta liste. Elle reste récupérable côté serveur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
