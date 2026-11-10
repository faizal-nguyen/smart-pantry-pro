import {useLayoutEffect,useRef} from 'react';
import {useLocation} from 'react-router-dom';
interface Position {url:string;anchor:string;offset:number;pages:number}
export function recipeLibraryReturnUrl(state:unknown):string|null {
 if(!state||typeof state!=='object'||!('recipeLibraryUrl' in state)||typeof state.recipeLibraryUrl!=='string')return null;
 return /^\/kitchen\/recipes(?:\?[^#]*)?$/.test(state.recipeLibraryUrl)?state.recipeLibraryUrl:null;
}
/** Restore after async rows load, using the card as an anchor rather than a guessed page height. */
export function useRecipeListReturn({owner,ready,renderedKey,pages,hasNext,fetching,fetchNext}:{owner:string;ready:boolean;renderedKey:string;pages:number;hasNext:boolean;fetching:boolean;fetchNext:()=>unknown}){
 const location=useLocation(),url=location.pathname+location.search,key=`recipe-list-return:${owner}`,restored=useRef(false);
 useLayoutEffect(()=>{
  if(restored.current||!ready)return;
  let position:Position;try{position=JSON.parse(sessionStorage.getItem(key)??'null');}catch{return;}
  if(!position||position.url!==url||typeof position.anchor!=='string'||!Number.isFinite(position.offset)||Math.abs(position.offset)>10000)return;
  const element=document.getElementById(position.anchor);
  if(!element){if(hasNext&&!fetching&&Number.isInteger(position.pages)&&position.pages>pages&&position.pages<=100)void fetchNext();return;}
  const frame=requestAnimationFrame(()=>{window.scrollTo({top:Math.max(0,window.scrollY+element.getBoundingClientRect().top-position.offset),behavior:'auto'});element.querySelector('a')?.focus({preventScroll:true});restored.current=true;});
  return()=>cancelAnimationFrame(frame);
 },[ready,renderedKey,pages,hasNext,fetching,fetchNext,key,url]);
 return (anchor:string)=>{const element=document.getElementById(anchor);if(!element)return;try{sessionStorage.setItem(key,JSON.stringify({url,anchor,offset:element.getBoundingClientRect().top,pages}));}catch{/* Navigation remains available when browser storage is disabled. */}};
}
