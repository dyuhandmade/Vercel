import type {CSSProperties} from 'react';
import type {ContentField} from './content-safety';

const colors={paper:'--paper',cream:'--cream',forest:'--forest',ink:'--ink',muted:'--muted',sage:'--sage',olive:'--olive',clay:'--clay',walnut:'--walnut',line:'--line'} as const;
const headings={classic:"Georgia,'Times New Roman',serif",literary:"'Palatino Linotype','Book Antiqua',Palatino,serif",modern:'Arial,Helvetica,sans-serif'} as const;
const bodyFonts={classic:'Arial,Helvetica,sans-serif',humanist:"'Trebuchet MS',Arial,sans-serif",system:'system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif'} as const;
export type AppearanceStyle=CSSProperties&Record<`--${string}`,string|number>;

/** Only typed colors, bounded dimensions and known fonts ever reach CSS. */
export function appearanceStyle(fields:ContentField[]):AppearanceStyle {
 const value=(key:string)=>fields.find(field=>field.key===key)?.value?.trim();
 if(value('enabled')==='false')return {};
 const style:AppearanceStyle={};
 for(const [key,variable] of Object.entries(colors)){
  const color=value(key);if(color&&/^#[0-9a-f]{6}$/i.test(color))style[variable as `--${string}`]=color;
 }
 const heading=value('heading_font'),body=value('body_font');
 if(heading&&Object.hasOwn(headings,heading))style['--serif']=headings[heading as keyof typeof headings];
 if(body&&Object.hasOwn(bodyFonts,body))style['--sans']=bodyFonts[body as keyof typeof bodyFonts];
 const number=(key:string,min:number,max:number)=>{const text=value(key);return text&&/^\d+$/.test(text)?Math.max(min,Math.min(max,Number(text))):undefined;};
 const font=number('text_size',14,20),button=number('button_radius',0,40),roundness=number('panel_roundness',0,150);
 if(font!==undefined)style.fontSize=`${font}px`;
 if(button!==undefined)style['--button-radius']=`${button}px`;
 if(roundness!==undefined){for(const [key,size] of Object.entries({xs:12,sm:18,md:26,lg:38,xl:54}))style[`--radius-${key}`]=`${Math.round(size*roundness/100)}px`;}
 // Keep the existing design untouched until a merchant supplies a palette override.
 if(style['--forest'])style['--announcement-background']=style['--forest'];
 if(style['--paper'])style['--header-background']=`color-mix(in srgb, ${style['--paper']} 90%, transparent)`;
 if(style['--olive'])style['--olive-text']=style['--olive'];
 return style;
}
