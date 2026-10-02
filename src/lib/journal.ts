import type {SiteContent} from './site-content';
export const articles=[{slug:'making-space-for-a-ritual',title:'The quiet art of making time for yourself.',category:'Everyday rituals',excerpt:'A small pause can change the shape of an ordinary day.',paragraphs:['Some days move faster than we do. We arrive at the evening with a long list behind us and very little space left for ourselves. A ritual can be a way of finding that space again.','Start small. A quiet minute before opening your phone. A warm shower without rushing. A familiar routine that asks you to pay attention to what you are doing, rather than what comes next.','You do not need a perfect setting or an elaborate sequence. Choose a moment that already exists in your day and let it be a little slower. Notice the water, the light, the sound of the room.','A ritual is something you return to. Let yours be simple enough to repeat, and personal enough to feel like your own.']},{slug:'look-closer-at-your-care',title:'A little curiosity goes a long way.',category:'Thoughtful care',excerpt:'Getting to know the things we bring into our everyday.',paragraphs:['Every product has details worth understanding. What is in it? How should it be used? Where can you find the full ingredient list?','Take a moment to read a product’s directions and ingredient information. A pleasing texture or beautiful package is only one part of the story.','When you have a question, ask it. Thoughtful care starts with clear information and the room to make your own decision.']}];

export type Article={slug:string;title:string;category:string;excerpt:string;paragraphs:string[];image?:string;imageAlt?:string;readTime?:string};
export function getArticles(content:SiteContent):Article[]{
 const saved=Object.values(content.sections).filter(item=>item.handle.startsWith('article-'));
 const handles=[...articles.map(item=>item.slug),...saved.map(item=>item.handle.slice(8)).filter(slug=>!articles.some(item=>item.slug===slug))];
 return handles.map(slug=>{
  const existing=articles.find(item=>item.slug===slug),item=content.sections[`article-${slug}`];
  if(item?.enabled===false||(!existing&&(!item?.title||!item.body)))return null;
  return {slug,title:item?.title||existing!.title,category:item?.category||existing?.category||'Notes from the atelier',excerpt:item?.note||existing?.excerpt||'',paragraphs:item?.body?item.body.split(/\n\s*\n/).filter(Boolean):existing?.paragraphs||[],image:item?.image,imageAlt:item?.imageAlt,readTime:item?.readTime||'3 MIN READ'};
 }).filter((item):item is NonNullable<typeof item>=>item!==null);
}
