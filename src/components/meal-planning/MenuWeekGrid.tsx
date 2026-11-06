import { Plus } from 'lucide-react';
import { calendarDate } from '@smart/shared';
import { useCalendarNow } from '@/hooks/useCalendarNow';
import MenuEntryCard from './MenuEntryCard';
import type { MenuEntryView, MenuMealType } from '@/hooks/useWeeklyMenu';
import type { MenuSlot } from './AddRecipeToMenuDialog';

interface MenuWeekGridProps {
  weekStart: string;
  entries: MenuEntryView[];
  onAddSlot: (slot: MenuSlot) => void;
  onRemoveEntry: (entryId: string) => void;
  removingId?: string;
}
// Same Monday=0 convention as weekly-menu queries and plan_recipe commands.
const DAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const MEALS: { value:MenuMealType;label:string }[]=[
  {value:'breakfast',label:'Petit-déj.'},{value:'lunch',label:'Déjeuner'},
  {value:'dinner',label:'Dîner'},{value:'snack',label:'Collation'},
];

export default function MenuWeekGrid({weekStart,entries,onAddSlot,onRemoveEntry,removingId}:MenuWeekGridProps) {
  const today=calendarDate(useCalendarNow());
  const days=DAYS.map((label,index)=>{
    const date=new Date(`${weekStart}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+index);
    return {label,index,date,key:date.toISOString().slice(0,10)};
  });
  const includesToday=days.some(day=>day.key===today);
  const slots=(day:typeof days[number])=>MEALS.map(meal=>{
    const planned=entries.filter(entry=>entry.day_of_week===day.index && entry.meal_type===meal.value);
    return <div className="kitchen-menu-slot" role="group" aria-label={`${day.label} — ${meal.label}`} key={meal.value}>
      <h3>{meal.label}</h3>
      {planned.length ? planned.map(entry=><MenuEntryCard key={entry.id} entry={entry} onRemove={onRemoveEntry} disabled={removingId===entry.id}/>) : <button className="kitchen-menu-empty" onClick={()=>onAddSlot({day_of_week:day.index,meal_type:meal.value,day_label:day.label,meal_label:meal.label})} aria-label={`Ajouter une recette — ${day.label} ${meal.label.toLocaleLowerCase('fr')}`}><Plus className="h-4 w-4" aria-hidden="true"/><span>Choisir une recette</span></button>}
    </div>;
  });
  const labelDate=(date:Date)=>date.toLocaleDateString('fr-FR',{day:'numeric',month:'short',timeZone:'UTC'});
  return <>
    <div className="kitchen-menu-days" role="group" aria-label="Menus de la semaine">
      {days.map(day=><section key={day.key} className="kitchen-menu-day" data-today={day.key===today} aria-label={day.label}>
        <header><h2>{day.label}</h2><p>{labelDate(day.date)}</p></header>{slots(day)}
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
