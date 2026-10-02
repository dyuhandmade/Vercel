import PhilosophyExperience from '@/components/PhilosophyExperience';
import {getSiteContent,section} from '@/lib/site-content';
export const metadata={title:'Our story',alternates:{canonical:'/our-story'}};
export default async function Story(){const content=await getSiteContent(),intro=section(content,'story-page');return <div className="philosophy-page"><header className="page-intro story-title"><p className="eyebrow">{intro.eyebrow||'THE WORLD OF DYUHANDMADE'}</p><h1>{intro.title||'A little closer to nature.'}<br/><em>{intro.titleEmphasis||'A little closer to yourself.'}</em></h1><p>{intro.body||'Three ways to see an everyday moment differently.'}</p></header><PhilosophyExperience content={content}/></div>;}
