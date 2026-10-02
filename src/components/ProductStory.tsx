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
import {RitualSelectionProvider} from './RitualSelection';
import {productIntention} from '@/lib/product-intentions';
import './product-experience.css';
import './product-continuity.css';

export default function ProductStory({product:p,content}:{product:Product;content?:SiteContent}){
 const hasCraft=p.demo||p.craft.length>0,hasIngredients=p.demo||p.ingredients.length>0,hasRitual=p.demo||p.ritual.length>0;
 const intention=productIntention(p.handle);
 return <RitualSelectionProvider key={p.id}><div className="narrative-flow">
  <section className="experience-invitation" id="origin">
   <div className="intention-copy"><span className="eyebrow">{p.productType} / THE INTENTION</span>
   <h2>{p.demo?intention.opening:'A place in'}<br/><em>{p.demo?intention.ending:'your everyday.'}</em></h2>
   <p>{p.demo?intention.note:p.story}</p>{p.sensory&&<div className="product-sensory"><span className="eyebrow">THE SENSORY NOTES</span><p style={{whiteSpace:'pre-line'}}>{p.sensory}</p></div>}</div>
   <div className="experience-path">
    {hasCraft&&<a href="#craft"><span>01 / FOLLOW THE HANDS</span><Hand strokeWidth={1}/><strong>Meet the making</strong></a>}
    {hasIngredients&&<a href="#ingredients"><span>02 / OPEN YOUR CURIOSITY</span><Leaf strokeWidth={1}/><strong>Look within</strong></a>}
    {hasRitual&&<a href="#ritual"><span>03 / FIND YOUR MOMENT</span><Sun strokeWidth={1}/><strong>Make it personal</strong></a>}
    {!hasCraft&&!hasIngredients&&!hasRitual&&<a href="#purchase"><span>THE NEXT CHAPTER</span><Leaf strokeWidth={1}/><strong>Make it yours</strong></a>}
   </div>
   {!p.demo&&p.description&&<details className="experience-description"><summary>About {p.title}</summary><p>{p.description}</p></details>}
  </section>
  {hasCraft&&<section className="section experience-making" id="craft"><CraftJourney items={p.craft} product={{title:p.title,shape:p.shape,tone:p.tone}}/>{hasIngredients&&<div className="experience-next"><span>Now, get to know the materials.</span><a href="#ingredients">Explore the ingredients <ArrowDown size={17}/></a></div>}</section>}
  {hasIngredients&&<section className="section experience-botanicals" id="ingredients"><IngredientDiscovery items={p.ingredients} shape={p.shape} tone={p.tone}/></section>}
  {hasRitual&&<section className="section experience-ritual" id="ritual"><RitualExperience items={p.ritual} preview={p.demo} title={p.title} content={content} destinationHref="#purchase"/></section>}
  <ProductGuidance product={p}/>
  <section className="purchase-section section story-purchase"><div className="purchase-visual"><ProductVisual shape={p.shape} tone={p.tone} image={p.image} title={p.title}/><span className="margin-note">From our world,<br/>to your everyday.</span></div><div className="purchase-card"><span className="eyebrow">THE NEXT CHAPTER IS YOURS</span><h2>Make room<br/><em>for your ritual.</em></h2><h3>{p.title}</h3><Purchase product={p}/><div className="purchase-reassurance"><ShieldCheck size={18}/><span>{p.demo?'Preview bag · Payments are not enabled':'Checkout securely with Shopify'}</span></div><a href={content?.sections.contact?.secondaryUrl||catalogueUrl} target="_blank" rel="noopener noreferrer" className="whatsapp-link"><MessageCircle size={16}/> {content?.sections.contact?.secondaryLabel||'Explore DYU’s WhatsApp catalogue'}</a></div></section>
 </div></RitualSelectionProvider>;
}
