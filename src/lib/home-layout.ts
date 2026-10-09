import type {SiteContent} from './content-safety';

export const homeSectionHandles=['home-hero','home-welcome','home-collections','philosophy','home-craft','home-ingredients','ritual','home-favorites','home-journal','home-reassurance'] as const;
export type HomeSectionHandle=typeof homeSectionHandles[number];
const storySections=new Set<HomeSectionHandle>(['philosophy','home-craft','home-ingredients','ritual']);

export function homeChildHandles(content:SiteContent,parent:string,defaults:string[]){
 const known=[...new Set([...defaults,...Object.keys(content.sections).filter(handle=>handle.startsWith(`${parent}-`)&&/^\d+$/.test(handle.slice(parent.length+1)))])];
 const selected=content.sections[parent]?.items?.filter(handle=>known.includes(handle));
 const handles=selected?.length?[...new Set(selected)]:known.sort((a,b)=>(content.sections[a]?.sortOrder??0)-(content.sections[b]?.sortOrder??0));
 return handles.filter(handle=>content.sections[handle]?.enabled!==false);
}

/** A partial layout moves listed sections first; an accidental typo never deletes content. */
export function homeSectionGroups(content:SiteContent){
 const requested=content.sections['home-layout']?.items||[];
 const valid=requested.filter((handle):handle is HomeSectionHandle=>homeSectionHandles.includes(handle as HomeSectionHandle));
 const ordered=[...new Set([...valid,...homeSectionHandles])];
 if(!valid.length)ordered.sort((a,b)=>(content.sections[a]?.sortOrder??homeSectionHandles.indexOf(a))-(content.sections[b]?.sortOrder??homeSectionHandles.indexOf(b)));
 const groups:{story:boolean;handles:HomeSectionHandle[]}[]=[];
 for(const handle of ordered){
  if(content.sections[handle]?.enabled===false)continue;
  const story=storySections.has(handle),previous=groups.at(-1);
  if(story&&previous?.story)previous.handles.push(handle);
  else groups.push({story,handles:[handle]});
 }
 return groups;
}
