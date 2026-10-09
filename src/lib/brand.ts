import type {ContentSection} from './content-safety';

export const brandLogo={
 src:'/images/dyu-handmade-logo.png',
 width:592,
 height:421,
 alt:'DYU Handmade',
};

export function configuredBrandLogo(content?:ContentSection){
 return {...brandLogo,src:content?.image||brandLogo.src,alt:content?.imageAlt||content?.caption||brandLogo.alt};
}
