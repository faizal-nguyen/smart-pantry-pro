import { AssistantModelReceiptSchema } from '@smart/shared';
const labels = {dialogue:'Dialogue',culinary:'Synthèse culinaire',summary:'Résumé'};
/** A secondary detail: no raw prompt, tool arguments or internal reasoning. */
export default function AssistantModelDetails({ receipt }: { receipt: unknown }) {
  const parsed=AssistantModelReceiptSchema.safeParse(receipt);
  if(!parsed.success) return null;
  const value=parsed.data;
  return <details className="mt-2 min-w-0 text-xs text-muted-foreground">
    <summary className="cursor-pointer min-h-11 content-center">Modèles et coût de cette réponse</summary>
    <div className="space-y-2 break-words pb-2">
      {value.calls.length===0 ? <p>Aucun appel de modèle pour ce résultat.</p> : <ul className="space-y-2">{value.calls.map((call,index)=><li key={index}>
        <span className="block font-medium">{labels[call.role]} · {call.status==='completed' ? 'Réponse reçue' : 'Appel interrompu'}</span>
        <span className="block">Demandé : {call.requested_model}. Servi : {call.served_model ?? 'non observable'}.</span>
        <span className="block">{call.transport==='responses' ? 'Responses' : 'Chat Completions'} · {call.purpose.includes('repair') ? 'Correction des arguments' : call.purpose.includes('fallback') ? 'Repli de synthèse' : call.role==='culinary' ? 'Escalade pour cette tâche' : 'Appel courant'}</span>
      </li>)}</ul>}
      {value.associated_tool_costs.length>0 && <p>Les frais de modèles annoncés par {value.associated_tool_costs.length} outil(s) sont inclus ; leur mesure est estimée ou indisponible.</p>}
      <p>{value.llm_usd===null ? 'Coût total des modèles indisponible.' : (value.quality==='estimated' ? 'Coût estimé des modèles : ' : 'Coût calculé des modèles : ')+'$'+value.llm_usd.toFixed(6)}</p>
      {value.quality==='unknown' && <p>Sous-total connu : ${value.known_subtotal_usd.toFixed(6)}. Certains appels n’ont pas de mesure complète.</p>}
      {value.limit_reason && <p>La limite de cette demande a été atteinte.</p>}
      <p>Tarifs {value.calls[0]?.pricing_version ?? 'non utilisés'}. Calcul applicatif, distinct d’une facture. Les frais vocaux sont affichés séparément.</p>
    </div>
  </details>;
}
