import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NutritionProfileSettingsSchema,emptyNutritionProfile,type NutritionProfileSettings } from '@smart/shared';
import { useNutritionProfile } from '@/hooks/useNutritionProfile';
import { usePersonalization } from '@/hooks/usePersonalization';
import { useAssistantMemories } from '@/hooks/useAssistantMemories';
import { useOwnedValue } from '@/lib/ownedStorage';
import { abandonConflictedProfileWrite,migrateOwnedCookingPreferences,pendingProfileWrite } from '@/services/nutritionProfile';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card,CardContent,CardHeader,CardTitle,CardDescription } from '@/components/ui/card';

type Draft={ version:number;settings:NutritionProfileSettings;origin:'explicit'|'imported' };
const terms=(value:string)=>value.split(',').map(term=>term.trim()).filter(Boolean);
const dietOptions=[['vegetarian','Végétarien'],['vegan','Végétalien'],['gluten_free','Sans gluten'],['lactose_free','Sans lactose'],['no_pork','Sans porcin'],['no_alcohol','Sans alcool'],['halal','Halal à vérifier'],['kosher','Casher à vérifier']] as const;
const goals=[['anti_waste','Utiliser le stock à temps'],['quick','Gagner du temps'],['variety','Varier mes recettes'],['protein','Comparer les protéines estimées'],['more_fiber','Comparer les fibres estimées'],['vegetables','Plus de légumes connus']] as const;
function ListField({ label,values,onChange,placeholder }:{ label:string;values:string[];onChange:(values:string[])=>void;placeholder?:string }) {
  const [text,setText]=useState(values.join(', '));
  useEffect(()=>{ if (JSON.stringify(terms(text))!==JSON.stringify(values)) setText(values.join(', ')); },[values,text]);
  return <label className="block space-y-1">{label}<Input className="min-h-11 text-base md:text-sm" value={text} placeholder={placeholder} onChange={event=>{ setText(event.target.value);onChange(terms(event.target.value)); }} /></label>;
}
export default function NutritionProfileEditor({ focus='cooking' }:{ focus?:'cooking'|'nutrition' }) {
  const profile=useNutritionProfile();
  return <NutritionProfileContent key={profile.owner ?? 'anonymous'} profile={profile} focus={focus}/>;
}
function NutritionProfileContent({ profile,focus }:{ profile:ReturnType<typeof useNutritionProfile>;focus:'cooking'|'nutrition' }) {
  const local=usePersonalization(),memories=useAssistantMemories({ enabled:!!profile.owner });
  const owner=profile.owner ?? 'anonymous';
  const [draft,setDraft,storageError]=useOwnedValue<Draft|null>(owner,'nutrition-profile-draft',null);
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[conflict,setConflict]=useState(false),[reviewed,setReviewed]=useState(false),[clearConfirm,setClearConfirm]=useState(false);
  let pending=null,pendingError=null;
  try { pending=pendingProfileWrite(owner); } catch { pendingError='La sauvegarde conservée est illisible. Elle doit être vérifiée avant une nouvelle action.'; }
  const server=profile.data?.profile;
  const validDraft=draft && Number.isSafeInteger(draft.version) && NutritionProfileSettingsSchema.safeParse(draft.settings).success ? draft : null;
  const draftError=draft && !validDraft ? 'Le brouillon conservé est illisible. Il reste conservé.' : null;
  const settings=pending?.settings ?? validDraft?.settings ?? server?.settings ?? emptyNutritionProfile();
  const baseVersion=pending?.expected_version ?? validDraft?.version ?? server?.version ?? 0;
  const stale=!!server && baseVersion!==server.version;
  const patch=(values:Partial<NutritionProfileSettings>)=>{ try { setDraft({ version:baseVersion,settings:{ ...settings,...values },origin:validDraft?.origin ?? 'explicit' });setError(null); } catch (failure) { setError((failure as Error).message); } };
  const submit=async(operation:'save'|'clear'='save')=>{
    if (busy || !server) return;
    const parsed=NutritionProfileSettingsSchema.safeParse(operation==='clear' ? emptyNutritionProfile() : settings);
    if (!parsed.success) { setError('Vérifiez les listes, les nombres et les champs facultatifs.');return; }
    setBusy(true);setError(null);
    try {
      const result=await profile.save(pending?.settings ?? parsed.data,pending?.expected_version ?? baseVersion,pending?.operation ?? operation,pending?.origin ?? validDraft?.origin ?? 'explicit');
      if (result.profile.version>result.applied_version) { setError('La sauvegarde a été retrouvée, mais une version plus récente existe. Comparez-la avec votre saisie.');setConflict(true); }
      else { setDraft(null);setConflict(false);setClearConfirm(false); }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Enregistrement non confirmé.');
      if (failure instanceof ApiError && failure.code==='PROFILE_VERSION_CONFLICT') { setConflict(true);void profile.refetch(); }
    } finally { setBusy(false); }
  };
  const resolve=(useServer:boolean)=>{
    if (!server || (!useServer && !reviewed)) return;
    try {
      if (conflict) abandonConflictedProfileWrite(owner);
      setDraft(useServer ? null : { version:server.version,settings:validDraft?.settings ?? settings,origin:validDraft?.origin ?? 'explicit' });
      setConflict(false);setReviewed(false);setError(null);
    } catch (failure) { setError((failure as Error).message); }
  };
  const inferred=memories.memories.filter(item=>['preference','negative_preference','diet_goal','constraint','cooking_style'].includes(item.kind));
  return <div className="space-y-4">
    <Card><CardHeader><CardTitle>{focus==='nutrition' ? 'Objectifs et profil alimentaire' : 'Cuisine et profil alimentaire'}</CardTitle><CardDescription>Vos contraintes passent avant le classement. Le contexte d’un repas reste indépendant de ce profil.</CardDescription></CardHeader><CardContent className="space-y-4">
      {profile.isLoading && <p role="status">Lecture du profil de ce compte…</p>}
      {profile.error && <div role="alert"><p>Le profil serveur ne peut pas être lu. Vos valeurs ne sont pas remplacées.</p><Button variant="outline" className="min-h-11" onClick={()=>void profile.refetch()}>Relire mon profil</Button></div>}
      {server && <p className="text-xs text-muted-foreground">{server.version ? `Profil synchronisé · version ${server.version}` : 'Profil à confirmer'}{server.updated_at ? ` · ${new Date(server.updated_at).toLocaleDateString('fr-FR')}` : ''}</p>}
      {profile.data?.legacyServerPresent && <p className="rounded-lg border p-3">Vos anciennes contraintes serveur restent appliquées. Vérifiez et confirmez leur reprise ci-dessous.</p>}
      {local.personalizationData && server && !pending && <div className="rounded-lg border p-3 space-y-2"><p>Des préférences de cuisine sont enregistrées pour ce compte sur cet appareil. Leur reprise conserve les exclusions du profil serveur.</p><Button className="min-h-11" variant="outline" onClick={()=>{ try { setDraft({ version:server.version,settings:migrateOwnedCookingPreferences(settings,local.personalizationData!),origin:'imported' }); } catch (failure) { setError((failure as Error).message); } }}>Comparer et reprendre les valeurs de cet appareil</Button><p className="text-xs">Les anciens objectifs généraux sans mesure fiable ne sont pas transformés en promesse nutritionnelle.</p></div>}
      {local.hasUnassignedLegacyPreferences && <p className="text-sm text-muted-foreground">Un ancien profil sans propriétaire existe sur cet appareil. Il n’est pas attribué automatiquement à votre compte.</p>}
      {(conflict || (stale && !pending)) && <section className="rounded-lg border p-3 space-y-3" aria-label="Conflit de profil"><p>Version de votre saisie : {baseVersion}. Version serveur : {server?.version}. Comparez les contraintes avant de remplacer une version plus récente.</p><p className="text-sm">Allergies serveur : {server?.settings.allergies.join(', ') || 'aucune renseignée'} · exclusions : {server?.settings.excludedIngredients.join(', ') || 'aucune'} · régimes : {server?.settings.diets.join(', ') || 'aucun'}.</p><Button className="min-h-11" variant="outline" disabled={busy || (!!pending && !conflict)} onClick={()=>resolve(true)}>Utiliser le profil serveur</Button><label className="flex items-start gap-2 min-h-11"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} />J’ai comparé les contraintes et je confirme ma saisie, y compris les exclusions retirées.</label><Button className="min-h-11" variant="outline" disabled={busy || !reviewed || (!!pending && !conflict)} onClick={()=>resolve(false)}>Conserver ma saisie après comparaison</Button></section>}
      {pending && !conflict && <p role="status">Une sauvegarde reste à vérifier. Les valeurs envoyées sont figées ; le bouton reprend la même demande.</p>}
      <form className="space-y-5" onSubmit={event=>{ event.preventDefault();void submit(); }}>
        <fieldset className="space-y-4" disabled={busy || !server || !!pending}>
          <legend className="font-semibold">Contraintes alimentaires</legend>
          <ListField key={`${owner}:allergies`} label="Allergies déclarées, séparées par des virgules" values={settings.allergies} onChange={allergies=>patch({ allergies })} placeholder="Lait, arachides…" />
          <ListField key={`${owner}:exclusions`} label="Ingrédients explicitement exclus" values={settings.excludedIngredients} onChange={excludedIngredients=>patch({ excludedIngredients })} placeholder="Ingrédients que vous excluez…" />
          <p className="text-xs text-muted-foreground">Une composition inconnue reste à vérifier. Les traces non renseignées ne sont pas certifiées.</p>
          <div className="grid grid-cols-2 gap-2">{dietOptions.map(([value,label])=><label key={value} className="min-h-11 rounded-lg border p-2 flex items-center gap-2"><input type="checkbox" checked={settings.diets.includes(value)} onChange={e=>patch({ diets:e.target.checked ? [...settings.diets,value] : settings.diets.filter(item=>item!==value) })} />{label}</label>)}</div>
        </fieldset>
        <fieldset className="space-y-4" disabled={busy || !server || !!pending}>
          <legend className="font-semibold">Goûts et cuisine</legend>
          {([['likedIngredients','Ingrédients appréciés'],['avoidedIngredients','Ingrédients moins appréciés'],['cuisines','Cuisines appréciées'],['equipment','Matériel disponible (four, plaque, blender…)']] as const).map(([field,label])=><ListField key={`${owner}:${field}`} label={label} values={settings[field]} onChange={values=>patch({ [field]:values })} />)}
          <div className="grid sm:grid-cols-2 gap-3"><label>Temps habituel en minutes<Input className="min-h-11 text-base md:text-sm" type="number" min={1} max={600} value={settings.usualTimeMinutes ?? ''} onChange={e=>patch({ usualTimeMinutes:e.target.value ? Number(e.target.value) : null })} /></label><label>Portions habituelles<Input className="min-h-11 text-base md:text-sm" type="number" min={1} max={20} value={settings.usualServings ?? ''} onChange={e=>patch({ usualServings:e.target.value ? Number(e.target.value) : null })} /></label></div>
          <label className="block">Niveau de cuisine<select className="mt-1 h-11 w-full rounded-md border bg-background px-2" value={settings.skill ?? ''} onChange={e=>patch({ skill:(e.target.value || null) as NutritionProfileSettings['skill'] })}><option value="">Non renseigné</option><option value="beginner">Débutant</option><option value="intermediate">Intermédiaire</option><option value="advanced">À l’aise</option></select></label>
        </fieldset>
        <fieldset className="space-y-3" disabled={busy || !server || !!pending}>
          <legend className="font-semibold">Objectifs culinaires</legend>
          {goals.map(([value,label])=><label key={value} className="min-h-11 flex items-center gap-2"><input type="checkbox" checked={settings.goals.includes(value)} onChange={e=>patch({ goals:e.target.checked ? [...settings.goals,value] : settings.goals.filter(item=>item!==value) })} />{label}</label>)}
          <p className="text-xs text-muted-foreground">Les protéines et fibres sont comparées seulement avec une couverture suffisante. Aucun objectif n’exige une cible chiffrée.</p>
          <details><summary className="min-h-11 cursor-pointer">Cibles quotidiennes facultatives</summary><div className="space-y-3"><label className="min-h-11 flex gap-2 items-center"><input type="checkbox" checked={settings.targets.enabled} onChange={e=>patch({ targets:e.target.checked ? { ...settings.targets,enabled:true } : { enabled:false,dailyCaloriesKcal:null,dailyProteinG:null } })} />Conserver des cibles que je saisis moi-même</label>{settings.targets.enabled && <><label className="block">Calories par jour (kcal)<Input className="min-h-11 text-base md:text-sm" type="number" value={settings.targets.dailyCaloriesKcal ?? ''} onChange={e=>patch({ targets:{ ...settings.targets,dailyCaloriesKcal:e.target.value ? Number(e.target.value) : null } })} /></label><label className="block">Protéines par jour (g)<Input className="min-h-11 text-base md:text-sm" type="number" value={settings.targets.dailyProteinG ?? ''} onChange={e=>patch({ targets:{ ...settings.targets,dailyProteinG:e.target.value ? Number(e.target.value) : null } })} /></label><p className="text-xs">Aucune cible n’est calculée automatiquement. Une recette seule n’est pas comparée à un objectif quotidien.</p></>}</div></details>
          <label className="flex gap-2 items-start min-h-11"><input type="checkbox" checked={settings.shareWithAssistant} onChange={e=>patch({ shareWithAssistant:e.target.checked })} />Autoriser l’assistant à recevoir les contraintes et objectifs nécessaires à ma demande.</label>
          <label className="flex gap-2 items-start min-h-11"><input type="checkbox" checked={settings.consent} onChange={e=>patch({ consent:e.target.checked })} />Je confirme ce profil et son enregistrement pour adapter mes recettes sur mes appareils. Je peux l’exporter ou l’effacer.</label>
        </fieldset>
        {(error || storageError || draftError || pendingError) && <p role="alert" className="text-destructive">{error || storageError || draftError || pendingError}</p>}
        <div className="sticky bottom-[calc(var(--mobile-nav-height,0px)+12px)] z-10 rounded-lg border bg-background p-3"><Button className="min-h-11 w-full" type="submit" disabled={busy || !server || !!storageError || !!draftError || !!pendingError || conflict || (stale && !pending) || (!settings.consent && pending?.operation!=='clear')}>{busy ? 'Vérification…' : pending ? 'Vérifier la sauvegarde' : 'Enregistrer et actualiser les idées'}</Button></div>
      </form>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-lg">Mémoire de l’assistant</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm">Les inférences ci-dessous ne modifient pas votre profil. En cas de désaccord, les exclusions explicites du profil gouvernent toujours le moteur. Confirmez une valeur dans les champs du profil pour l’utiliser.</p>{memories.error && <p role="alert">Mémoire non disponible. Le profil explicite reste la référence.</p>}{inferred.length ? <ul className="space-y-2">{inferred.slice(0,8).map(item=><li key={item.id} className="rounded-lg border p-3 text-sm">{item.content} <span className="text-muted-foreground">· à comparer au profil</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucune préférence issue de la mémoire à comparer.</p>}<Button className="min-h-11" variant="outline" asChild><Link to="/settings?section=assistant-memory">Vérifier ou oublier les mémoires</Link></Button></CardContent></Card>
    <Card><CardContent className="p-4 space-y-3"><p className="text-sm">L’effacement retire le profil, les anciennes préférences alimentaires, les retours de recette, les mémoires alimentaires et les caches concernés. Le reste de votre stock et vos recettes restent disponibles.</p><label className="flex gap-2 min-h-11 items-start"><input type="checkbox" checked={clearConfirm} onChange={e=>setClearConfirm(e.target.checked)} />Je confirme l’effacement de ces préférences et de leur mémoire.</label><Button className="min-h-11" variant="outline" disabled={busy || !server || !!pending || !clearConfirm || !!storageError} onClick={()=>void submit('clear')}>Effacer mon profil alimentaire</Button><Button className="min-h-11" variant="ghost" asChild><Link to="/settings?section=data-privacy">Exporter ou demander l’effacement de mes données</Link></Button></CardContent></Card>
  </div>;
}
