import type {ReactNode} from 'react';

/** Links from tool-backed replies stay clickable; React escapes all other text. */
export function AssistantText({text}:{text:string}) {
  const pieces:ReactNode[]=[];const pattern=/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>]+)/g;
  let start=0;
  for(const match of text.matchAll(pattern)) {
    const index=match.index!;pieces.push(text.slice(start,index));
    const url=match[2] ?? match[3],label=match[1] ?? url;
    pieces.push(<a key={index} href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 break-words">{label}</a>);
    start=index+match[0].length;
  }
  pieces.push(text.slice(start));return <>{pieces}</>;
}
