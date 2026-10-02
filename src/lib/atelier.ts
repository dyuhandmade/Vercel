import type {StoryItem} from './types';

export const catalogueUrl = 'https://wa.me/c/919945945750';
// Botanical studies from the PRD's art direction, not an approved formulation.
export const botanicalStudies: (StoryItem & {latin:string;note:string;position:string})[] = [
 {name:'Calendula',latin:'Calendula officinalis',handle:'calendula',description:'A sunlit study in warm gold. Layered petals and a vivid centre bring a little wildness to the botanical palette.',note:'The flower · Colour & form',position:'92% 78%'},
 {name:'Chamomile',latin:'Matricaria chamomilla',handle:'chamomile',description:'Small ivory petals, golden centres, and fine green stems. A closer look at the quiet details of a familiar flower.',note:'The blossom · Delicate detail',position:'86% 15%'},
 {name:'Aloe vera',latin:'Aloe barbadensis',handle:'aloe-vera',description:'Sculptural leaves open to a translucent centre. The contrast between the green exterior and clear interior is a study in texture.',note:'The leaf · Texture & light',position:'9% 30%'},
 {name:'Shea butter',latin:'Vitellaria paradoxa',handle:'shea-butter',description:'Soft ivory folds and a rich, sculptural texture. A material study that invites you to slow down and look a little closer.',note:'The butter · Shape & substance',position:'50% 42%'}
];
export const craftChapters = [
 {title:'Begin with nature.',label:'01 / The origin',text:'Good questions are the beginning of thoughtful care. Where does an ingredient come from? What makes it belong? The ingredient story is a place to start.',image:'/images/botanical-study.webp',position:'25% 50%',note:'An exploration of raw materials'},
 {title:'Look a little closer.',label:'02 / The making',text:'Texture, form, and the human touch. The atelier makes room for the details behind a finished product, and for the people and processes that shape it.',image:'/images/atelier-craft-v2.webp',position:'center',note:'The craft behind everyday objects'},
 {title:'Make it your own.',label:'03 / The ritual',text:'The story continues in your hands. Choose with curiosity, read the product directions, and find a little space for an everyday moment of care.',image:'/images/atelier-ritual-v2.webp',position:'center',note:'From the atelier to your everyday'}
];
