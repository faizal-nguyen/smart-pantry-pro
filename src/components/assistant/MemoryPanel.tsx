import { useRef, useState } from 'react';
import { BookOpen, Check, Pencil, Search, X } from 'lucide-react';
import { classifyMemoryFact, type MemoryWriteResult } from '@smart/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAssistantMemories } from '@/hooks/useAssistantMemories';
import type { AssistantMemoryItem } from '@/services/assistantApi';

const origins = { user_explicit: 'Votre demande', assistant_inferred: 'Proposition de l’assistant',
  recipe_feedback: 'Votre retour sur une recette', imported: 'Import', system: 'Ancien réglage' };
const destinations = { memory: 'Souvenir', profile: 'Profil alimentaire', feedback: 'Retour recette', session: 'Ce repas' };
const date = (value: string) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
function resultText(receipt: MemoryWriteResult): string {
  if (receipt.status === 'verification_required') return 'Résultat à vérifier. La même commande sera utilisée.';
  if (receipt.status === 'disabled') return 'La mémoire est désactivée. Activez-la pour confirmer ou corriger un souvenir.';
  if (receipt.status === 'not_saved') return 'Modification non enregistrée. Cette information doit être gérée dans sa destination.';
  if (receipt.status === 'awaiting_confirmation') return receipt.reason === 'profile_consent_required'
    ? 'Confirmez d’abord l’enregistrement de votre profil alimentaire, puis cette proposition.'
    : receipt.reason === 'open_profile' ? 'Modifiez cette information dans votre profil alimentaire.' : 'Proposition enregistrée, à confirmer.';
  if (receipt.operation === 'forget') return receipt.destination === 'profile'
    ? 'Référence oubliée. Le réglage confirmé reste dans votre profil alimentaire.' : 'Souvenir oublié.';
  if (receipt.operation === 'reject') return 'Proposition rejetée.';
  return receipt.destination === 'profile' ? 'Profil alimentaire mis à jour.' : 'Souvenir enregistré.';
}

export default function MemoryPanel() {
  const memory = useAssistantMemories();
  const { owner, memories, isLoading, error, policy, policyError, pendingCommand, storageError, isBusy } = memory;
  const activeOwner = useRef(owner); activeOwner.current = owner;
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<{ owner?: string; message: string; error?: boolean } | null>(null);
  const [editor, setEditor] = useState<{ owner?: string; memory: AssistantMemoryItem; text: string; conflict: boolean } | null>(null);
  const visibleEditor = editor?.owner === owner ? editor : null;
  const act = async (operation: () => Promise<MemoryWriteResult>) => {
    setNotice(null);
    try {
      const receipt = await operation();
      if (activeOwner.current !== owner) return;
      setNotice({ owner, message: resultText(receipt), error: receipt.status === 'not_saved' });
      if (receipt.status === 'saved' && receipt.operation === 'correct') setEditor(null);
    } catch (failure) {
      if (activeOwner.current !== owner) return;
      setNotice({ owner, error: true, message: failure instanceof Error ? failure.message : 'Modification non confirmée.' });
      if (failure instanceof Error && 'status' in failure && failure.status === 409) setEditor(previous => previous ? { ...previous, conflict: true } : null);
    }
  };
  const reloadEditor = async () => {
    const fresh = await memory.refetch();
    if (activeOwner.current !== owner) return;
    const current = fresh.memories.find(row => row.id === visibleEditor?.memory.id);
    if (current) setEditor(previous => previous ? { ...previous, memory: current, conflict: false } : null);
  };
  if (error) return <div role="alert" className="space-y-3 rounded-lg border p-4"><p>Impossible de lire les souvenirs pour le moment.</p><Button variant="outline" className="min-h-11" onClick={() => void memory.refetch()}>Réessayer la lecture de la mémoire</Button></div>;
  if (isLoading) return <p role="status" className="p-4 text-sm text-muted-foreground">Lecture de votre mémoire…</p>;
  const filtered = memories.filter(row => row.content.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')));
  const candidate = (row: AssistantMemoryItem) => row.status === 'candidate' || !row.version || !row.destination;
  const groups = [ { label: 'À confirmer', rows: filtered.filter(candidate) }, { label: 'Souvenirs enregistrés', rows: filtered.filter(row => !candidate(row)) } ];
  const actionsDisabled = isBusy || !!pendingCommand || !!storageError || !policy;
  return <div className="space-y-4">
    {(policyError || storageError) && <div role="alert" className="rounded-lg border p-3 text-sm"><p>{storageError ?? 'Les autorisations mémoire ne peuvent pas être relues. Vos souvenirs restent consultables.'}</p><Button variant="outline" className="mt-2 min-h-11" onClick={() => void memory.refetch()}>Relire les autorisations</Button></div>}
    {policy && !policy.memoryEnabled && <p className="text-sm text-muted-foreground">Mémoire désactivée : ces souvenirs restent consultables et supprimables. Ils ne sont pas réutilisés par l’assistant.</p>}
    {pendingCommand && <div role="status" className="space-y-2 rounded-lg border p-3 text-sm"><p>Une modification attend sa vérification. Vérifiez-la avant d’en envoyer une autre.</p><Button variant="outline" className="min-h-11" disabled={isBusy} onClick={() => void act(memory.verifyPending)}>Vérifier puis réessayer</Button></div>}
    {!visibleEditor && notice?.owner === owner && notice && <p role={notice.error ? 'alert' : 'status'} className="text-sm">{notice.message}</p>}
    {memories.length > 0 && <label className="block space-y-2 text-sm"><span className="flex items-center gap-2"><Search className="h-4 w-4" aria-hidden="true" />Rechercher un souvenir</span><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Un goût, une habitude…" className="min-h-11" /></label>}
    {memories.length === 0 && <Card><CardContent className="space-y-2 p-5"><BookOpen className="h-5 w-5" aria-hidden="true" /><h3 className="font-semibold">Pas encore de mémoire</h3><p className="text-sm text-muted-foreground">Activez la mémoire, puis dites par exemple « Souviens-toi que je préfère les plats épicés ». Vous pourrez corriger ou oublier ce qui a été retenu.</p></CardContent></Card>}
    {memories.length > 0 && filtered.length === 0 && <p role="status" className="text-sm">Aucun souvenir chargé ne correspond à votre recherche.</p>}
    {groups.filter(group => group.rows.length).map(group => <Card key={group.label}><CardContent className="p-4 sm:p-5"><h3 className="mb-2 font-semibold">{group.label} ({group.rows.length})</h3><div className="divide-y divide-border">
      {group.rows.map(row => {
        const fact = classifyMemoryFact(row.content, { kind: row.kind });
        const destination = row.destination ?? fact?.destination ?? 'memory';
        const legacy = !row.version || !row.destination;
        const profile = destination === 'profile';
        const oldProfileReference = profile && row.status === 'active' && row.profile_version !== policy?.profileVersion;
        const ranked = destination === 'memory' && row.payload?.type === 'taste';
        return <article key={row.id} className="space-y-3 py-4">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{destinations[destination]}</Badge><Badge variant="outline">{oldProfileReference ? 'Ancienne référence du profil' : candidate(row) ? legacy ? 'Ancien souvenir à vérifier' : 'Proposé' : 'Confirmé'}</Badge></div>
          <p className="break-words text-sm">{row.content}</p>
          <p className="text-xs text-muted-foreground">{origins[row.source]} · {date(row.updated_at || row.created_at)}{row.expires_at ? ' · Expire le ' + date(row.expires_at) : ''}</p>
          <p className="text-xs text-muted-foreground">{profile ? 'Ce réglage appartient au profil alimentaire. Sa confirmation met à jour le profil ; oublier cette référence ne retire pas un réglage confirmé.' : ranked ? 'Après confirmation, ce goût influence les recettes dont le caractère épicé ou doux est renseigné.' : 'Après confirmation, ce souvenir aide le dialogue. Aucun effet de classement n’est annoncé.'}</p>
          <div className="flex flex-wrap gap-2">
            {candidate(row) && <Button size="sm" variant="secondary" className="min-h-11" disabled={actionsDisabled || !policy?.memoryEnabled} onClick={() => void act(() => memory.execute(row, 'confirm'))}><Check className="mr-1 h-4 w-4" aria-hidden="true" />{profile ? 'Confirmer dans le profil' : 'Confirmer'}</Button>}
            <Button size="sm" variant="outline" className="min-h-11" disabled={actionsDisabled || !policy?.memoryEnabled} onClick={() => { setNotice(null); setEditor({ owner, memory: row, text: row.content, conflict: false }); }}><Pencil className="mr-1 h-4 w-4" aria-hidden="true" />Corriger</Button>
            <Button size="sm" variant="ghost" className="min-h-11" disabled={actionsDisabled} onClick={() => void act(() => memory.execute(row, row.status === 'candidate' ? 'reject' : 'forget'))}><X className="mr-1 h-4 w-4" aria-hidden="true" />{row.status === 'candidate' ? 'Rejeter' : 'Oublier'}</Button>
            {profile && <Button size="sm" variant="ghost" className="min-h-11" asChild><a href="/settings?section=cooking">Voir mon profil</a></Button>}
          </div>
        </article>;
      })}
    </div></CardContent></Card>)}
    {memory.hasMore && <Button variant="outline" className="min-h-11" disabled={memory.isLoadingMore || isBusy} onClick={() => void memory.loadMore()}>{memory.isLoadingMore ? 'Lecture des souvenirs…' : 'Charger les souvenirs suivants'}</Button>}
    <Dialog open={!!visibleEditor} onOpenChange={open => { if (!open && !isBusy) setEditor(null); }}><DialogContent className="routine-dialog min-w-0 [&>button:last-child]:min-w-11"><DialogHeader><DialogTitle>Corriger ce souvenir</DialogTitle><DialogDescription>Le texte sera reclassé. Un changement destiné au profil attendra sa confirmation.</DialogDescription></DialogHeader>
      {visibleEditor && <><label className="space-y-2 text-sm">Votre correction<Textarea value={visibleEditor.text} maxLength={2000} onChange={e => setEditor(previous => previous ? { ...previous, text: e.target.value } : null)} /></label>
        {visibleEditor.conflict && <div role="alert" className="min-w-0 space-y-2 rounded-lg border p-3 text-sm"><p>Un autre appareil a changé ce souvenir. Votre texte est conservé.</p><p className="break-words">Version actuelle : {memories.find(row => row.id === visibleEditor.memory.id)?.content ?? 'Souvenir retiré'}</p><Button variant="outline" className="min-h-11 h-auto w-full whitespace-normal px-3 py-3 text-left" onClick={() => void reloadEditor()}>Relire la version actuelle et garder mon texte</Button></div>}
        {!visibleEditor.conflict && notice?.owner === owner && notice && <p role={notice.error ? 'alert' : 'status'} className="text-sm">{notice.message}</p>}
        {pendingCommand && <Button variant="outline" className="min-h-11" disabled={isBusy} onClick={() => void act(memory.verifyPending)}>Vérifier puis réessayer</Button>}
        <Button className="min-h-11" disabled={actionsDisabled || visibleEditor.conflict || !visibleEditor.text.trim()} onClick={() => void act(() => memory.execute(visibleEditor.memory, 'correct', visibleEditor.text.trim()))}>{isBusy ? 'Vérification…' : 'Enregistrer la correction'}</Button>
      </>}
    </DialogContent></Dialog>
  </div>;
}
