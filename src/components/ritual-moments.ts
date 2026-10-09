import {Moon, Sparkles, Sunrise} from 'lucide-react';
import type {SiteContent} from '@/lib/site-content';

export const defaultMoments = [
  {
    id: 'morning', label: 'Morning', icon: Sunrise, note: 'Before the world asks anything of you.',
    image: '/images/atelier-ritual-v2.webp', position: '62% center',
    steps: [
      {title: 'Let the day arrive.', text: 'A little daylight. A moment before the rush. Choose a place to begin.'},
      {title: 'Notice the little things.', text: 'The light on the table. The texture of linen. The familiar objects close to hand.'},
      {title: 'Make this moment yours.', text: 'One small pause, before everything else. Carry that intention into your day.'},
    ],
  },
  {
    id: 'evening', label: 'Evening', icon: Moon, note: 'A soft landing at the end of the day.',
    image: '/images/atelier-craft-v2.webp', position: 'center',
    steps: [
      {title: 'Set the day down.', text: 'Find your favourite corner. Let the next thing wait a little.'},
      {title: 'Return to the familiar.', text: 'A quiet room. Warm light. A small collection of things that feel like you.'},
      {title: 'Leave a little space.', text: 'Nothing elaborate. Just a moment you might look forward to returning to.'},
    ],
  },
  {
    id: 'pause', label: 'A quiet pause', icon: Sparkles, note: 'No occasion needed. Just a little time.',
    image: '/images/botanical-study.webp', position: 'center',
    steps: [
      {title: 'Step out of the rush.', text: 'There does not have to be a perfect time. Begin with the moment you have.'},
      {title: 'Look a little closer.', text: 'A leaf. A shadow. An everyday object. Give one small detail your attention.'},
      {title: 'Keep a moment for you.', text: 'A pause can be a ritual, too. Let yours be as simple as you like.'},
    ],
  },
] as const;

export function configuredRitualMoments(content?:SiteContent){
 return defaultMoments.filter(moment=>content?.sections[`ritual-${moment.id}`]?.enabled!==false).map(moment=>{
  const saved=content?.sections[`ritual-${moment.id}`];
  return {...moment,sortOrder:saved?.sortOrder??0,label:saved?.title||moment.label,note:saved?.body||moment.note,image:saved?.image||moment.image,mobileImage:saved?.mobileImage,imageAlt:saved?.imageAlt||'Illustrative atelier scene with natural textures and objects of everyday care',position:saved?.imagePosition||moment.position,caption:saved?.caption,footnote:saved?.note,steps:moment.steps.map((step,index)=>{
   const value=content?.sections[`ritual-${moment.id}-step-${index+1}`];
   return {title:value?.title||step.title,text:value?.body||step.text,image:value?.image,mobileImage:value?.mobileImage,imageAlt:value?.imageAlt,imagePosition:value?.imagePosition,enabled:value?.enabled,sortOrder:value?.sortOrder??0};
  }).filter(step=>step.enabled!==false).sort((a,b)=>a.sortOrder-b.sortOrder)};
 }).filter(moment=>moment.steps.length>0).sort((a,b)=>a.sortOrder-b.sortOrder);
}
