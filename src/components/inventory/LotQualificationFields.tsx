export type LotDateKind='use_by'|'best_before'|'unknown';
export type QuantityQuality='measured'|'estimated'|'unknown';
export default function LotQualificationFields({ dateKind,quality,onDateKind,onQuality }:{ dateKind:LotDateKind;quality:QuantityQuality;onDateKind:(value:LotDateKind)=>void;onQuality:(value:QuantityQuality)=>void }) {
  return <div className="space-y-3">
    <label className="block text-sm space-y-1">Type de date<select className="w-full h-11 rounded-md border bg-background px-2" value={dateKind} onChange={event=>onDateKind(event.target.value as LotDateKind)}><option value="unknown">Type inconnu</option><option value="use_by">DLC · à consommer jusqu’au</option><option value="best_before">DDM · de préférence avant</option></select></label>
    <label className="block text-sm space-y-1">Fiabilité de la quantité<select className="w-full h-11 rounded-md border bg-background px-2" value={quality} onChange={event=>onQuality(event.target.value as QuantityQuality)}><option value="unknown">À qualifier</option><option value="measured">Mesurée / comptée</option><option value="estimated">Estimée</option></select></label>
    <p className="text-xs text-muted-foreground">Une DLC dépassée sort du stock utilisé pour les idées. Une DDM dépassée reste à vérifier. Les dates inconnues et quantités estimées sont signalées.</p>
  </div>;
}
