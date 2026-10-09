import {test,expect} from '@playwright/test';
import {appearanceStyle} from '../src/lib/site-appearance';
import {editableText,type SiteContent} from '../src/lib/content-safety';

test('appearance controls accept known values and restore the original design when disabled',()=>{
 const parse=(values:Record<string,string>)=>appearanceStyle(Object.entries(values).map(([key,value])=>({key,value})));
 expect(parse({})).toEqual({});
 expect(parse({forest:'#123456',text_size:'18',panel_roundness:'50',button_radius:'0',heading_font:'literary'})).toMatchObject({'--forest':'#123456','--announcement-background':'#123456',fontSize:'18px','--radius-md':'13px','--button-radius':'0px','--serif':"'Palatino Linotype','Book Antiqua',Palatino,serif"});
 expect(parse({forest:'red;background:url(https://bad.example)',body_font:'url(https://bad.example)',text_size:'NaN',button_radius:'-1'})).toEqual({});
 expect(parse({text_size:'999',panel_roundness:'999',button_radius:'999'})).toMatchObject({fontSize:'20px','--radius-md':'39px','--button-radius':'40px'});
 expect(parse({enabled:'false',forest:'#123456'})).toEqual({});
});

test('shared Shopify wording is escaped and blank or disabled entries use defaults',()=>{
 const content:SiteContent={sections:{'ui-cart-title':{handle:'ui-cart-title',body:'<b>Your favourites</b><script>bad()</script>'},'ui-blank':{handle:'ui-blank',body:' '},'ui-disabled':{handle:'ui-disabled',body:'Invisible',enabled:false}}};
 expect(editableText(content,'cart-title','Your bag')).toBe('Your favourites');
 for(const key of ['missing','blank','disabled'])expect(editableText(content,key,'Default')).toBe('Default');
 expect(editableText(undefined,'cart-title','Your bag')).toBe('Your bag');
});
