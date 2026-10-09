import {test,expect} from '@playwright/test';
import {configuredBrandLogo,brandLogo} from '../src/lib/brand';
import {homeChildHandles,homeSectionGroups,homeSectionHandles} from '../src/lib/home-layout';
import {configuredRitualMoments} from '../src/components/ritual-moments';
import type {SiteContent} from '../src/lib/content-safety';

test('a partial homepage order is deduplicated and invalid handles cannot remove sections',()=>{
 const content:SiteContent={sections:{'home-layout':{handle:'home-layout',items:['home-journal','invalid','home-journal','home-hero']},'home-welcome':{handle:'home-welcome',enabled:false}}};
 expect(homeSectionGroups(content).flatMap(group=>group.handles)).toEqual(['home-journal','home-hero',...homeSectionHandles.filter(handle=>!['home-journal','home-hero','home-welcome'].includes(handle))]);
 expect(homeSectionGroups(content).find(group=>group.story)?.handles).toEqual(['philosophy','home-craft','home-ingredients','ritual']);
});

test('default sections retain their intended positions when only one sort order is saved',()=>{
 expect(homeSectionGroups({sections:{'home-hero':{handle:'home-hero',sortOrder:1}}}).flatMap(group=>group.handles)).toEqual([...homeSectionHandles]);
 expect(homeSectionGroups({sections:{'home-journal':{handle:'home-journal',sortOrder:-1}}})[0].handles).toEqual(['home-journal']);
});

test('journal cards can be added, hidden, and explicitly ordered without accepting unrelated content',()=>{
 const content:SiteContent={sections:{'home-journal':{handle:'home-journal',items:['home-journal-3','home-journal-1','home-journal-3','footer']},'home-journal-3':{handle:'home-journal-3',title:'New story'},'home-journal-1':{handle:'home-journal-1',enabled:false},'home-journal-interface':{handle:'home-journal-interface'}}};
 expect(homeChildHandles(content,'home-journal',['home-journal-1','home-journal-2'])).toEqual(['home-journal-3']);
});

test('ritual editing preserves copy and image settings and removes disabled moments and steps',()=>{
 const content:SiteContent={sections:{'ritual-morning':{handle:'ritual-morning',title:'Before breakfast',image:'/images/custom.webp',imagePosition:'right'},'ritual-evening':{handle:'ritual-evening',enabled:false},'ritual-pause':{handle:'ritual-pause',sortOrder:-1},'ritual-morning-step-1':{handle:'ritual-morning-step-1',enabled:false},'ritual-morning-step-3':{handle:'ritual-morning-step-3',sortOrder:-1,title:'Your words, unchanged.',imagePosition:'top'}}};
 const moments=configuredRitualMoments(content);
 expect(moments.map(moment=>moment.id)).toEqual(['pause','morning']);
 expect(moments[1]).toMatchObject({label:'Before breakfast',image:'/images/custom.webp',position:'right'});
 expect(moments[1].steps).toHaveLength(2);
 expect(moments[1].steps[0]).toMatchObject({title:'Your words, unchanged.',imagePosition:'top'});
 for(const id of ['morning','pause'])content.sections[`ritual-${id}`]={handle:`ritual-${id}`,enabled:false};
 expect(configuredRitualMoments(content)).toEqual([]);
});

test('uploaded Shopify branding replaces the bundled image while retaining safe image dimensions',()=>{
 expect(configuredBrandLogo()).toEqual(brandLogo);
 expect(configuredBrandLogo({handle:'brand',image:'https://cdn.shopify.com/logo.png',imageAlt:'Merchant logo'})).toEqual({...brandLogo,src:'https://cdn.shopify.com/logo.png',alt:'Merchant logo'});
});
