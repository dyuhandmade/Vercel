'use client';
import {useEffect,useRef,useState} from 'react';
export default function ChapterNav({chapters,title}:{chapters:{id:string;label:string}[];title:string}){
 const [active,setActive]=useState(chapters[0]?.id);
 const rail=useRef<HTMLElement>(null);
 const key=chapters.map(c=>c.id).join(',');
 useEffect(()=>{
  const nav=rail.current;if(!nav)return;
  const sections=[...key.split(','),'purchase'].map(id=>document.getElementById(id)).filter((element):element is HTMLElement=>!!element);
  let frame=0;
  const measure=()=>{
   frame=0;
   const railBottom=nav.getBoundingClientRect().bottom;
   const threshold=railBottom+Math.max(65,(window.innerHeight-railBottom)*.23);
   let current=sections[0]?.id;
   for(const section of sections){if(section.getBoundingClientRect().top<=threshold)current=section.id;}
   if(current)setActive(previous=>previous===current?previous:current);
   const start=sections[0]?.getBoundingClientRect().top??0,end=sections.at(-1)?.getBoundingClientRect().top??0;
   const progress=end===start?0:Math.min(1,Math.max(0,(threshold-start)/(end-start)));
   nav.style.setProperty('--journey-progress',String(progress));
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
  const observer=new ResizeObserver(schedule);sections.forEach(section=>observer.observe(section));
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);schedule();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
 },[key]);
 useEffect(()=>{
  const nav=rail.current,link=nav?.querySelector<HTMLAnchorElement>('a[aria-current]');if(!nav||!link||nav.scrollWidth<=nav.clientWidth)return;
  const bounds=link.getBoundingClientRect(),container=nav.getBoundingClientRect();
  if(bounds.left<container.left+16||bounds.right>container.right-16)nav.scrollTo({left:nav.scrollLeft+bounds.left-container.left-(nav.clientWidth-bounds.width)/2,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 },[active]);
 return <nav ref={rail} className="chapter-nav glass-panel" aria-label="Product story chapters" title={`${title} — the journey`}><span className="chapter-lead">THE JOURNEY</span>{chapters.map((c,i)=><a key={c.id} href={`#${c.id}`} aria-current={active===c.id?'location':undefined}><span>0{i+1}</span>{c.label}</a>)}<a className="chapter-shop" href="#purchase" aria-current={active==='purchase'?'location':undefined}>Make it yours</a></nav>;
}
