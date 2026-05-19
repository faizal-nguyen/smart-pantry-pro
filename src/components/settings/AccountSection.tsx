/**
 * PRP-235 PR1 — AccountSection.
 *
 * Compte : email user, refaire l'onboarding, déconnexion. Reprend
 * exactement le wiring existant de `Settings.tsx` legacy pour ne
 * casser aucune fonctionnalité (logout via `supabase.auth.signOut`,
 * reset onboarding via `usePersonalization.resetPreferences` +
 * `localStorage.removeItem('skipOnboarding')`).
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { LogOut, Mail, RefreshCw, User as UserIcon } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { usePersonalization } from '@/hooks/usePersonalization';

interface AccountSectionProps {
  user: User;
}

export default function AccountSection({ user }: AccountSectionProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resetPreferences } = usePersonalization();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleResetOnboarding = () => {
    // resetPreferences clears PERSONALIZATION_STORAGE_KEY (cf.
    // usePersonalization.ts:79). On purge aussi le skip flag pour
    // que la gate onboarding se ré-engage.
    resetPreferences();
    localStorage.removeItem('skipOnboarding');
    setShowResetDialog(false);
    navigate('/onboarding');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      setShowLogoutDialog(false);
      navigate('/auth');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de se déconnecter. Réessaie.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-5 w-5" aria-hidden="true" />
          Compte
        </CardTitle>
        <CardDescription>
          Ton identifiant, ton onboarding et la déconnexion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="break-all text-sm font-medium">{user.email ?? '—'}</p>
          </div>
        </div>

        <Separator />

        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => setShowResetDialog(true)}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refaire l&apos;onboarding
        </Button>

        <Separator />

        <Button
          type="button"
          variant="destructive"
          className="w-full justify-start gap-2"
          onClick={() => setShowLogoutDialog(true)}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Se déconnecter
        </Button>
      </CardContent>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment vous déconnecter de Smart Pantry Pro ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser les préférences</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment réinitialiser vos préférences et refaire
              l&apos;onboarding ? Cette action effacera toutes vos personnalisations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetOnboarding}>
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
