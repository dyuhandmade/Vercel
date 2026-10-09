import {ArrowDown,Leaf,Hand,Sun,MessageCircle,ShieldCheck} from 'lucide-react';
import type {Product} from '@/lib/types';
import type {SiteContent} from '@/lib/site-content';
import {catalogueUrl} from '@/lib/atelier';
import CraftJourney from './CraftJourney';
import IngredientDiscovery from './IngredientDiscovery';
import RitualExperience from './RitualExperience';
import ProductVisual from './ProductVisual';
import Purchase from './Purchase';
import ProductGuidance from './ProductGuidance';
import ProductDescription from './ProductDescription';
import {RitualSelectionProvider} from './RitualSelection';
import {productIntention} from '@/lib/product-intentions';
import './product-experience.css';
import './product-continuity.css';

export default function ProductStory({product:p,content}:{product:Product;content?:SiteContent}){
 const hasCraft=content?.sections['product-craft']?.enabled!==false&&(p.demo||p.craft.length>0),hasIngredients=content?.sections['product-ingredients']?.enabled!==false&&(p.demo||p.ingredients.length>0),hasRitual=p.demo||p.ritual.length>0;
 const intention=productIntention(p.handle);
 const invitation=content?.sections['product-invitation'];
 const purchase=content?.sections['product-purchase'];
 return <RitualSelectionProvider key={p.id}><div className="narrative-flow">
  <section className="experience-invitation" id="origin">
   <div className="intention-copy"><span className="eyebrow">{p.productType} / {invitation?.eyebrow||'THE INTENTION'}</span>
   <h2>{invitation?.title||(p.demo?intention.opening:'A place in')}{' '}<em>{invitation?.titleEmphasis||(p.demo?intention.ending:'your everyday.')}</em></h2>
   <p>{p.demo?intention.note:p.story}</p>{p.sensory&&<div className="product-sensory"><span className="eyebrow">{invitation?.caption||'THE SENSORY NOTES'}</span><p style={{whiteSpace:'pre-line'}}>{p.sensory}</p></div>}</div>
   <div className="experience-path">
    {hasCraft&&<a href="#craft"><span>01 / FOLLOW THE HANDS</span><Hand strokeWidth={1}/><strong>Meet the making</strong></a>}
    {hasIngredients&&<a href="#ingredients"><span>02 / OPEN YOUR CURIOSITY</span><Leaf strokeWidth={1}/><strong>Look within</strong></a>}
    {hasRitual&&<a href="#ritual"><span>03 / FIND YOUR MOMENT</span><Sun strokeWidth={1}/><strong>Make it personal</strong></a>}
    {!hasCraft&&!hasIngredients&&!hasRitual&&<a href="#purchase"><span>THE NEXT CHAPTER</span><Leaf strokeWidth={1}/><strong>Make it yours</strong></a>}
   </div>
   {!p.demo&&(p.description||p.descriptionParagraphs?.length)&&<details className="experience-description"><summary>About {p.title}</summary><ProductDescription product={p}/></details>}
  </section>
  {hasCraft&&<section className="section experience-making" id="craft"><CraftJourney items={p.craft} product={{title:p.title,shape:p.shape,tone:p.tone}} content={content?.sections['product-craft']}/>{hasIngredients&&<div className="experience-next"><span>{content?.sections['product-craft']?.note||'Now, get to know the materials.'}</span><a href="#ingredients">{content?.sections['product-craft']?.secondaryLabel||'Explore the ingredients'} <ArrowDown size={17}/></a></div>}</section>}
  {hasIngredients&&<section className="section experience-botanicals" id="ingredients"><IngredientDiscovery items={p.ingredients} shape={p.shape} tone={p.tone} content={content?.sections['product-ingredients']}/></section>}
  {hasRitual&&<section className="section experience-ritual" id="ritual"><RitualExperience items={p.ritual} preview={p.demo} title={p.title} content={content} destinationHref="#purchase"/></section>}
  <ProductGuidance product={p} content={content}/>
  <section className="purchase-section section story-purchase"><div className="purchase-visual"><ProductVisual shape={p.shape} tone={p.tone} image={purchase?.image||p.image} title={purchase?.imageAlt||p.title}/><span className="margin-note content-lines">{purchase?.note||'From our world,\nto your everyday.'}</span></div><div className="purchase-card"><span className="eyebrow">{purchase?.eyebrow||'THE NEXT CHAPTER IS YOURS'}</span><h2>{purchase?.title||'Make room'}{' '}<em>{purchase?.titleEmphasis||'for your ritual.'}</em></h2><h3>{p.title}</h3><Purchase product={p}/><div className="purchase-reassurance"><ShieldCheck size={18}/><span>{p.demo?'Preview bag · Payments are not enabled':purchase?.caption||'Checkout securely with Shopify'}</span></div><a href={purchase?.linkUrl||content?.sections.contact?.secondaryUrl||catalogueUrl} target="_blank" rel="noopener noreferrer" className="whatsapp-link"><MessageCircle size={16}/> {purchase?.linkLabel||content?.sections.contact?.secondaryLabel||'Explore DYU’s WhatsApp catalogue'}</a></div></section>
 </div></RitualSelectionProvider>;
}
