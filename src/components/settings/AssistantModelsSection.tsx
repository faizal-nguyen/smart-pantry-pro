import { useQuery } from '@tanstack/react-query';
import { useAuthSessionOptional } from '@/hooks/useAuthenticatedUser';
import { getAssistantModels } from '@/services/assistantApi';
import { Button } from '@/components/ui/button';
const labels={dialogue:'Dialogue et choix des outils',culinary:'Synthèse complexe et correction',summary:'Résumé des conversations'};
export default function AssistantModelsSection() {
  const owner=useAuthSessionOptional().user?.id;
  const query=useQuery({queryKey:['assistant-models',owner],queryFn:()=>getAssistantModels(owner!),enabled:!!owner,retry:false});
  if(!owner) return <p>Connecte-toi pour consulter la configuration de l’assistant.</p>;
  if(query.isPending) return <p role="status">Lecture des modèles…</p>;
  if(query.isError) return <div role="alert"><p>La configuration des modèles n’a pas pu être lue.</p><Button onClick={()=>void query.refetch()} variant="outline" className="mt-3 min-h-11">Réessayer</Button></div>;
  const catalog=query.data;
  return <div className="space-y-5 min-w-0">
    <p className="text-sm text-muted-foreground">Configuration actuelle du serveur. Le détail de chaque réponse indique le modèle réellement servi et les éventuels replis.</p>
    {catalog.roles.map(role=><article key={role.role} className="border-b pb-4 space-y-1 break-words">
      <h3 className="font-medium">{labels[role.role]}</h3><p>{role.model}</p>
      <p className="text-sm text-muted-foreground">{role.transport==='responses' ? 'Responses' : 'Chat Completions'}{role.effort ? ' · Effort '+role.effort : ''} · Sortie limitée à {role.max_output_tokens} tokens · Délai d’appel : {role.timeout_ms/1000} s</p>
      {role.last_verified_at ? <p className="text-sm">Dernier modèle observé : {role.last_served_model}, le {new Date(role.last_verified_at).toLocaleString('fr-FR')}. Observation sur ce processus serveur.</p> : <p className="text-sm text-muted-foreground">Configuration non vérifiée par un appel sur ce processus serveur.</p>}
    </article>)}
    <p className="text-sm text-muted-foreground">Maximum {catalog.limits.max_calls} appels de modèle et {catalog.limits.max_tools} outils par demande. Les nouveaux appels cessent après {catalog.limits.deadline_ms/1000} s. Plafond de réservation : ${catalog.limits.max_usd}. Les coûts incomplets restent signalés.</p>
    <p className="text-xs text-muted-foreground">Tarifs : {catalog.pricing_version}. Les changements de modèle sont gérés sur le serveur.</p>
  </div>;
}
