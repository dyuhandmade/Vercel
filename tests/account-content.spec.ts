import {test,expect} from '@playwright/test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {normalizeContentSection,type SiteContent} from '../src/lib/content-safety';

// Render the actual presentation with normalized merchant fields, without a session or store.
const previousCssLoader=require.extensions['.css'];
const previousTsxLoader=require.extensions['.tsx'];
const {transformSync}=require('next/dist/compiled/babel/core');
require.extensions['.css']=loadedModule=>{loadedModule.exports={};};
require.extensions['.tsx']=(loadedModule,filename)=>{
 const {code}=transformSync(readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}],require('next/dist/compiled/babel/preset-typescript')],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]});
 (loadedModule as NodeModule&{_compile:(code:string,filename:string)=>void})._compile(code,filename);
};
const {AccountWelcomeContent,AccountError,AccountLoading}=require('../src/components/AccountExperience') as typeof import('../src/components/AccountExperience');
const {SiteContentProvider}=require('../src/components/SiteContentProvider') as typeof import('../src/components/SiteContentProvider');
if(previousCssLoader)require.extensions['.css']=previousCssLoader;
else delete require.extensions['.css'];
require.extensions['.tsx']=previousTsxLoader;

function content(entries:Record<string,Record<string,string>>):SiteContent{
 return {sections:Object.fromEntries(Object.entries(entries).map(([handle,fields])=>[handle,normalizeContentSection({handle,fields:Object.entries(fields).map(([key,value])=>({key,value}))})!]))};
}
function welcome(entries:Record<string,Record<string,string>>,configured=true){
 return renderToStaticMarkup(createElement(SiteContentProvider,{content:content(entries),children:createElement(AccountWelcomeContent,{configured,pathname:'/account/addresses'})}));
}

test('merchant account artwork and copy render while sign-in keeps its protected destination',()=>{
 const html=welcome({
  'account-welcome':{title:'A place to return.',title_emphasis:'Your daily care.',body:'Keep your favourites close.',image:'https://cdn.shopify.com/s/files/1/welcome.jpg',mobile_image:'https://cdn.shopify.com/s/files/1/mobile.jpg',image_alt:'A botanical still life',image_position:'right',caption:'Made for your everyday.',link_label:'Enter your account',link_url:'https://unrelated.example/account',secondary_url:'/collections/soaps',secondary_label:'Find your soap'},
  'account-benefit-1':{title:'Your deliveries',body:'Follow your parcel.'},
  'account-benefit-2':{enabled:'false'},
 });
 expect(html).toContain('A place to return.');
 expect(html).toContain('Your daily care.');
 expect(html).toContain('src="https://cdn.shopify.com/s/files/1/welcome.jpg"');
 expect(html).toContain('srcSet="https://cdn.shopify.com/s/files/1/mobile.jpg"');
 expect(html).toContain('object-position:right');
 expect(html).toContain('alt="A botanical still life"');
 expect(html).toContain('href="/api/auth/login?returnTo=%2Faccount%2Faddresses"');
 expect(html).not.toContain('unrelated.example');
 expect(html).toContain('href="/collections/soaps"');
 expect(html).toContain('Your deliveries');
 expect(html).not.toContain('Keep what you love');
});

test('disabled or invalid welcome content retains account access and safe artwork',()=>{
 const disabled=welcome({'account-welcome':{enabled:'false',title:'Hidden editorial title'}});
 expect(disabled).toContain('Your rituals.');
 expect(disabled).not.toContain('Hidden editorial title');
 expect(disabled).toContain('/api/auth/login?returnTo=');
 const invalid=welcome({'account-welcome':{title:'<script>unsafe()</script>',image:'javascript:unsafe()',secondary_url:'javascript:unsafe()'}});
 expect(invalid).toContain('src="/images/atelier-ritual-v2.webp"');
 expect(invalid).toContain('href="/shop"');
 expect(invalid).not.toContain('unsafe()');
 expect(welcome({'account-welcome':{link_label:'Sign in now'}},false)).not.toContain('/api/auth/login');
});

test('editable account labels never replace real error details or hide loading status',()=>{
 const merchantContent=content({'ui-account-error-title':{body:'Let’s try once more.'},'ui-account-try-again':{body:'Retry request'},'ui-account-loading':{body:'Preparing your account…'}});
 const error=renderToStaticMarkup(createElement(SiteContentProvider,{content:merchantContent,children:createElement(AccountError,{message:'The address could not be saved.',retry:()=>{}})}));
 expect(error).toContain('role="alert"');
 expect(error).toContain('Let’s try once more.');
 expect(error).toContain('Retry request');
 expect(error).toContain('The address could not be saved.');
 const loading=renderToStaticMarkup(createElement(SiteContentProvider,{content:merchantContent,children:createElement(AccountLoading)}));
 expect(loading).toContain('role="status"');
 expect(loading).toContain('Preparing your account…');
});
