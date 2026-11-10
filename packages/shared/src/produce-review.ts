import {calendarDaysUntil,calendarDate} from './calendar.js';
import {normalizeIngredientName} from './quantities.js';
export interface ProduceReviewLot {quantity:number;location?:string|null;created_at?:string|null;updated_at?:string|null;product?:{name?:string|null}|null}
/** Reminder intervals prompt a stock check; they never assert shelf-life or safety. */
export function produceReview(lot:ProduceReviewLot,now=new Date()):{days:number;interval:number}|null {
 const name=normalizeIngredientName(lot.product?.name??'');
 if(!(lot.quantity>0)||/congel|freezer|surgele/.test(normalizeIngredientName(lot.location??''))||/conserve|appertis|pulpe|concentre|sech|poudre|moulu|sauce|sirop|bocal|surgel|congel|graines?|tisane|moringa|pollen|pate|puree|confit|caramelis|ferment|vinaigre|huile|compote|frit|cuit/.test(name))return null;
 const interval=/coriandre fraiche|persil|menthe fraiche|basilic frais|salade|laitue|epinard/.test(name)?3
  :/brocoli|champignon|fraise|framboise|raisin|peche|abricot/.test(name)?5
  :/tomates?|aubergine|courgette|concombre|poivron|carottes?|endives?|poireau|oignons? nouveaux|piments? verts?|citron|orange|clementine|mandarine|avocat|mangue|banane|pommes?\b|poires?\b/.test(name)&&!/pomme de terre|pommes de terre/.test(name)?7
  :/oignons?|echalote|\bail\b|pomme de terre|pommes de terre|patate|potimarron|potiron|courge|radis|gingembre|galanga/.test(name)?14:null;
 if(!interval)return null;
 const timestamp=lot.updated_at??lot.created_at;if(!timestamp||!Number.isFinite(Date.parse(timestamp)))return null;
 const days=-(calendarDaysUntil(calendarDate(new Date(timestamp)),now)??0);
 return days>=interval?{days,interval}:null;
}
