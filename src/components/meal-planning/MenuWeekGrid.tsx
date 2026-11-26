import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { APP_LOCALE, formatDate, calendarDate } from '@smart/shared';
import { useCalendarNow } from '@/hooks/useCalendarNow';
import MenuEntryCard, { type MenuCardActions } from './MenuEntryCard';
import type { MenuEntryView, MenuMealType } from '@/hooks/useWeeklyMenu';
import { dropHint, dropTarget, type MenuSlotRef } from '@/lib/menuEdit';
import type { MenuSlot } from './AddRecipeToMenuDialog';

interface MenuWeekGridProps {
  weekStart: string;
  entries: MenuEntryView[];
  onAddSlot: (slot: MenuSlot) => void;
  /** V11-01 E3b: servings, move, leftovers and removal, from the page. */
  actions: MenuCardActions;
}
// Same Monday=0 convention as weekly-menu queries and plan_recipe commands.
const DAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const MEALS: { value:MenuMealType;label:string }[]=[
  {value:'breakfast',label:'Petit-déj.'},{value:'lunch',label:'Déjeuner'},
  {value:'dinner',label:'Dîner'},{value:'snack',label:'Collation'},
];

export default function MenuWeekGrid({weekStart,entries,onAddSlot,actions}:MenuWeekGridProps) {
  const today=calendarDate(useCalendarNow());
  // V11-01 E3d (D5): on the computer grid, the meal held by the pointer and the slot it is over.
  const [held,setHeld]=useState<MenuEntryView|null>(null);
  const [over,setOver]=useState<string|null>(null);
  /** The meal whose drag started; the state follows on the next task, once the browser has its drag image. */
  const starting=useRef<string|null>(null);
  const canDrag=!!actions.onDrop && actions.busyId===null;
  const letGo=()=>{ starting.current=null;setHeld(null);setOver(null); };
  // The meal as the week shows it now (its version is the one the server checks).
  const live=held ? entries.find(entry=>entry.id===held.id) ?? null : null;
  // Review of E3d: the grid never stays held. Its card left the week or moved (the browser then sends no
  // dragend), another edit started, or the week changed: the meal is let go.
  const moved=!!held && (!live || live.day_of_week!==held.day_of_week || live.meal_type!==held.meal_type);
  useEffect(()=>{ if (moved || (held && actions.busyId!==null)) letGo(); },[moved,held,actions.busyId]);
  useEffect(()=>letGo,[weekStart]);
  // A drop outside the window, or Échap, ends the drag on the card: these catch it even if the card is gone.
  useEffect(()=>{
    if (!held) return;
    const end=()=>letGo();
    window.addEventListener('dragend',end,true);window.addEventListener('drop',end);
    return ()=>{ window.removeEventListener('dragend',end,true);window.removeEventListener('drop',end); };
  },[held]);
  const startDrag=(entry:MenuEntryView)=>{
    starting.current=entry.id;
    window.setTimeout(()=>{ if (starting.current===entry.id) setHeld(entry); },0);
  };
  const days=DAYS.map((label,index)=>{
    const date=new Date(`${weekStart}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+index);
    return {label,index,date,key:date.toISOString().slice(0,10)};
  });
  const includesToday=days.some(day=>day.key===today);
  /** The slots of a day; on the computer grid (`pointer`), its cards are held and its slots take a drop. */
  const slots=(day:typeof days[number],pointer=false)=>MEALS.map(meal=>{
    const planned=entries.filter(entry=>entry.day_of_week===day.index && entry.meal_type===meal.value);
    const slot:MenuSlotRef={day_of_week:day.index,meal_type:meal.value};
    const key=`${day.index}:${meal.value}`;
    const target=pointer && live && !moved ? dropTarget(live,slot,entries) : null;
    const accepted=target?.kind==='move' || target?.kind==='swap';
    const shown=over===key && target && target.kind!=='same' ? target : null;
    const hint=shown ? dropHint(shown) : null;
    const drop=pointer ? {
      'data-drop':shown?.kind,
      onDragOver:(event:React.DragEvent)=>{
        if (!live) return;
        setOver(key);
        // The drop is allowed only where it moves or swaps; elsewhere the browser shows it is not.
        if (accepted) event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect=accepted ? 'move' : 'none';
      },
      onDragLeave:(event:React.DragEvent)=>{
        if (!event.currentTarget.contains(event.relatedTarget as Node|null)) setOver(current=>current===key ? null : current);
      },
      onDrop:(event:React.DragEvent)=>{
        event.preventDefault();
        const entry=live;
        letGo();
        // Judged again on the week as it stands, and only while no other edit runs.
        const now=entry && actions.busyId===null ? dropTarget(entry,slot,entries) : null;
        if (entry && now && (now.kind==='move' || now.kind==='swap')) actions.onDrop?.(entry,slot,now.kind==='swap' ? now.occupant : null);
      },
    } : {};
    return <div className="kitchen-menu-slot" role="group" aria-label={`${day.label} — ${meal.label}`} key={meal.value} {...drop}>
      <h3>{meal.label}</h3>
      {planned.length ? planned.map(entry=><MenuEntryCard key={entry.id} entry={entry} actions={actions}
        drag={pointer && actions.onDrop ? { enabled:canDrag,dragging:held?.id===entry.id,onStart:()=>startDrag(entry),onEnd:letGo } : undefined}/>) : <button className="kitchen-menu-empty" onClick={()=>onAddSlot({day_of_week:day.index,meal_type:meal.value,day_label:day.label,meal_label:meal.label})} aria-label={`Ajouter une recette — ${day.label} ${meal.label.toLocaleLowerCase(APP_LOCALE)}`}><Plus className="h-4 w-4" aria-hidden="true"/><span>Choisir une recette</span></button>}
      {hint && <p className="kitchen-menu-drop-hint">{hint}</p>}
    </div>;
  });
  const labelDate=(date:Date)=>formatDate(date,'dayMonthShort');
  return <>
    {/* While a meal is held, a slot's content lets the drag through to the slot itself (Chromium sends its buttons no dragover). */}
    <div className="kitchen-menu-days" role="group" aria-label="Menus de la semaine" data-holding={held ? 'true' : undefined}>
      {days.map(day=><section key={day.key} className="kitchen-menu-day" data-today={day.key===today} aria-label={day.label}>
        <header><h2>{day.label}</h2><p>{labelDate(day.date)}</p></header>{slots(day,true)}
      </section>)}
    </div>
    <div className="kitchen-menu-mobile" role="group" aria-label="Menus de la semaine sur petit écran">
      {days.map(day=>{
        const count=entries.filter(entry=>entry.day_of_week===day.index).length;
        return <details key={day.key} className="kitchen-menu-day" data-today={day.key===today} open={includesToday ? day.key===today : day.index===0}>
          <summary><span><strong>{day.label}</strong><span className="kitchen-menu-date">{labelDate(day.date)}</span></span><span>{count} {count===1 ? 'recette':'recettes'}</span></summary>
          <div className="kitchen-menu-mobile-slots">{slots(day)}</div>
        </details>;
      })}
    </div>
  </>;
}
