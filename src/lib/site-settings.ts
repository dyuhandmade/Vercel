import 'server-only';
import {cache} from 'react';
import {isDemo,shopify} from './shopify';
import {appearanceStyle,type AppearanceStyle} from './site-appearance';
import type {ContentField} from './content-safety';

export const siteSettingsQuery=`query SiteAppearance {metaobject(handle:{type:"dyu_site_settings",handle:"global"}){fields{key value}}}`;
export const getSiteAppearance=cache(async():Promise<AppearanceStyle>=>{
 if(isDemo())return {};
 try{const data=await shopify<{metaobject:{fields:ContentField[]}|null}>(siteSettingsQuery);return appearanceStyle(data.metaobject?.fields||[]);}
 catch{console.warn('Shopify appearance settings are unavailable; using the original design.');return {};}
});
