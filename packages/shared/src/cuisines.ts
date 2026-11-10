import {normalizeIngredientName} from './quantities.js';
const definitions=[
 ['Française','francais','france','french'],['Italienne','italien','italie','italian'],['Tunisienne','tunisien','tunisie','tunisian'],
 ['Marocaine','marocain','maroc','moroccan'],['Algérienne','algerien','algerie','algerian'],['Japonaise','japonais','japon','japanese'],
 ['Indienne','indien','inde','indian'],['Thaïlandaise','thailandais','thailande','thai'],['Coréenne','coreen','coree','korean'],
 ['Chinoise','chinois','chine','chinese'],['Vietnamienne','vietnamien','vietnam','vietnamese'],['Malaisienne','malaisien','malaisie','malaysian'],
 ['Mexicaine','mexicain','mexique','mexican'],['Américaine','americain','american'],['Libanaise','libanais','liban','lebanese'],
 ['Indonésienne','indonesien','indonesie','indonesian'],['Philippine','philippin','philippines','filipino'],['Portugaise','portugais','portugal','portuguese'],
 ['Pakistanaise','pakistanais','pakistan','pakistani'],['Sri-lankaise','sri lankais','sri lanka','sri lankan'],
 ['Méditerranéenne','mediterraneen','mediterranean'],['Moyen-Orientale','moyen oriental','middle eastern'],
 ['Asiatique','asian'],['Européenne','european'],['Fusion'],['Autre','other'],
] as const;
const normalized=(value:string)=>normalizeIngredientName(value).replace(/[-_]/g,' ').replace(/\s+/g,' ').trim();
export const CUISINES=definitions.map(([label,...aliases])=>({key:normalized(label),label,aliases:[label,...aliases]}));
export function cuisineKey(value:string):string {const name=normalized(value).replace(/^(?:cuisine|origine)\s*[:=]?\s*/, '');return CUISINES.find(c=>c.aliases.some(alias=>normalized(alias)===name))?.key??name;}
export function cuisineLabel(value:string):string {return CUISINES.find(c=>c.key===cuisineKey(value))?.label??value.trim();}
export function recipeMatchesCuisine(category:string|null|undefined,tags:string[]|null|undefined,wanted:string):boolean {
 const key=cuisineKey(wanted);return !!key&&[category,...(tags??[])].some(value=>value&&value.split(/[,;/|]/).some(part=>cuisineKey(part)===key));
}
