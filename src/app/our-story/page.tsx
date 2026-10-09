import type {Metadata} from 'next';
import StoryExperience from '@/components/StoryExperience';
import {getSiteContent} from '@/lib/site-content';
import {canonicalMetadata} from '@/lib/seo';

export const metadata:Metadata={
 title:'Our story',
 description:'Meet the thinking behind DYUhandmade: botanical curiosity, the human touch, and care that finds a place in everyday life.',
 ...canonicalMetadata('/our-story'),
};

export default async function Story(){
 const content=await getSiteContent();
 return <StoryExperience content={content}/>;
}
