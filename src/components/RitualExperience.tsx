'use client';

import {useEffect, useId, useRef, useState, type KeyboardEvent} from 'react';
import Image from 'next/image';
import {ArrowLeft, ArrowRight, ChevronDown} from 'lucide-react';
import type {StoryItem} from '@/lib/types';
import type {SiteContent} from '@/lib/site-content';
import {useRitualSelection} from './RitualSelection';
import './ritual-experience.css';
import {defaultMoments} from './ritual-moments';
import RitualMomentExperience from './RitualMomentExperience';

type RitualExperienceProps = {items?: StoryItem[]; preview?: boolean; title?: string; destinationHref?: string; destinationLabel?: string;content?:SiteContent};
type RitualStep = {title: string; text: string; image?: string;imageAlt?:string};

function ProductRitualExperience({items = [], preview = false, title, destinationHref = '#purchase', destinationLabel = 'Make room for a ritual',content}: RitualExperienceProps) {
  const introduction=content?.sections['ritual'];
  const editorialDestination=preview&&destinationHref!=='#purchase';
  const finalHref=editorialDestination?introduction?.linkUrl||destinationHref:destinationHref;
  const finalLabel=editorialDestination?introduction?.linkLabel||destinationLabel:destinationLabel;
  const moments=defaultMoments.map(moment=>{
    const saved=content?.sections[`ritual-${moment.id}`];
    return {...moment,label:saved?.title||moment.label,note:saved?.body||moment.note,image:saved?.image||moment.image,imageAlt:saved?.imageAlt||'Illustrative atelier scene with natural textures and objects of everyday care',position:saved?.imagePosition||moment.position,steps:moment.steps.map((step,index)=>{const value=content?.sections[`ritual-${moment.id}-step-${index+1}`];return {title:value?.title||step.title,text:value?.body||step.text,image:value?.image,imageAlt:value?.imageAlt};})};
  });
  const uid = useId();
  const {selectMoment: selectPurchaseMoment} = useRitualSelection();
  const [momentIndex, setMomentIndex] = useState(0);
  const [momentChosen, setMomentChosen] = useState(false);
  const [step, setStep] = useState(0);
  const finalLink = useRef<HTMLAnchorElement>(null);
  const stepButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const moveFocusToLink = useRef(false);
  const moment = moments[momentIndex];
  const hasDirections = items.length > 0 && !preview;
  const steps: readonly RitualStep[] = hasDirections ? items.map(item => ({title: item.title || item.name, text: item.description, image: item.image})) : moment.steps;
  const lastStep = steps.length - 1;
  const activeStep = Math.min(step, lastStep);
  const currentStep = steps[activeStep];
  const isLastStep = activeStep === lastStep;
  const photo = currentStep.image || (hasDirections ? moments[0].image : moment.image);
  const momentSummary = ['Your morning, considered.', 'Your evening, unhurried.', 'A pause, just for you.'][momentIndex];
  const selectMoment = (index: number) => {
    setMomentIndex(index);
    setMomentChosen(true);
    setStep(0);
    if (preview && !hasDirections) selectPurchaseMoment(moments[index].label);
  };

  function navigateSteps(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? lastStep : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + steps.length) % steps.length;
    setStep(next);
    stepButtons.current[next]?.focus();
  }

  useEffect(() => {
    if (activeStep === lastStep && moveFocusToLink.current) {
      finalLink.current?.focus();
      moveFocusToLink.current = false;
    }
  }, [activeStep, lastStep]);

  return (
    <div className={`ritual-experience ${hasDirections ? 'ritual-with-directions' : ''}`}>
      <div className="ritual-experience-heading">
        <span className="eyebrow">{introduction?.eyebrow||'THE NEXT CHAPTER / YOU'}</span>
        <h2>{hasDirections ? <>From the atelier.<br/><em>Into your everyday.</em></> : <>{introduction?.title||'A little time.'}<br/><em>{introduction?.titleEmphasis||'Entirely yours.'}</em></>}</h2>
        <p>{hasDirections ? `Explore ${title ? `${title}’s` : 'the product’s'} ritual, one step at a time.` : introduction?.body||'Choose the moment. Find your own rhythm.'}</p>
      </div>

      <div className="ritual-experience-stage">
        <figure className={`ritual-experience-photo ritual-moment-${moment.id}`}>
          <Image key={photo} src={photo} alt={currentStep.imageAlt||(currentStep.image ? `${title ? `${title}: ` : ''}${currentStep.title}` : moment.imageAlt)} fill sizes="(max-width: 800px) 100vw, 48vw" style={{objectPosition: hasDirections ? 'center' : moment.position}}/>
          <figcaption><span>{hasDirections ? currentStep.image ? 'THE PRODUCT RITUAL' : 'ILLUSTRATIVE ATELIER SCENE' : 'AN EVERYDAY MOMENT'}</span><span>{hasDirections ? currentStep.title : moment.note}</span></figcaption>
        </figure>

        <div className="ritual-experience-content">
          {!hasDirections && <div className="ritual-moment-options" role="group" aria-label="Choose your moment">
            {moments.map((option, index) => {
              const Icon = option.icon;
              return <button key={option.id} type="button" aria-pressed={momentIndex === index} onClick={() => selectMoment(index)}><Icon size={22} strokeWidth={1.2}/><span>{option.label}</span></button>;
            })}
          </div>}
          {hasDirections && <div className="ritual-product-identity"><span className="eyebrow">THE EVERYDAY RITUAL</span><p>{title || 'The product directions'}</p></div>}

          <div className="ritual-experience-progress" role="tablist" aria-label={hasDirections ? 'Product ritual directions' : 'Explore your ritual steps'}>
            {steps.map((item, index) => <button key={index} ref={node => {stepButtons.current[index] = node;}} type="button" role="tab" id={`${uid}-tab-${index}`} aria-controls={`${uid}-step`} aria-label={`Step ${index + 1}: ${item.title}`} aria-selected={activeStep === index} tabIndex={activeStep === index ? 0 : -1} data-complete={index < activeStep} onClick={() => setStep(index)} onKeyDown={event => navigateSteps(event, index)}><span>{String(index + 1).padStart(2, '0')}</span><span className="ritual-progress-line" aria-hidden="true"/></button>)}
          </div>

          <div className="ritual-experience-copy" id={`${uid}-step`} role="tabpanel" tabIndex={0} aria-labelledby={`${uid}-tab-${activeStep}`} aria-live="polite" aria-atomic="true">
            <div key={`${moment.id}-${activeStep}`}>
              <span className="ritual-step-eyebrow">{hasDirections ? 'Product directions' : moment.label} / {activeStep + 1} OF {steps.length}</span>
              <h3>{currentStep.title}</h3>
              <p>{currentStep.text}</p>
            </div>
          </div>

          {isLastStep && <div className="ritual-handoff" aria-live="polite"><span className="eyebrow">{hasDirections ? 'YOUR NEXT CHAPTER' : momentSummary}</span><p>{title || 'A ritual to call your own.'}</p><span>{hasDirections ? 'Keep the product directions close. Explore the details when you are ready.' : title ? momentChosen ? `You chose ${moment.label.toLowerCase()}. Discover the details of ${title} below.` : 'Explore the details, then decide where it belongs in your day.' : 'Explore the collection and find an object that speaks to you.'}</span></div>}

          <div className="ritual-experience-controls">
            <button type="button" className="ritual-back" aria-label="Previous ritual step" aria-controls={`${uid}-step`} disabled={activeStep === 0} onClick={() => setStep(Math.max(0, activeStep - 1))}><ArrowLeft size={19}/></button>
            {!isLastStep ? <button type="button" className="ritual-next" aria-controls={`${uid}-step`} onClick={() => {moveFocusToLink.current = activeStep === lastStep - 1; setStep(Math.min(lastStep, activeStep + 1));}}>{hasDirections ? 'Next step' : 'Take a moment'} <ArrowRight size={19}/></button> : <a ref={finalLink} className="ritual-next" href={finalHref}>{finalLabel} <ArrowRight size={19}/></a>}
          </div>

          {items.length > 0 && <details className="ritual-product-directions"><summary><span>{preview ? 'The ritual notes' : 'Read all directions together'}</span><ChevronDown size={16}/></summary><div>{title && <p className="ritual-directions-product">{title}</p>}<ol>{items.map((item, index) => <li key={`${item.name}-${index}`}><h4>{item.title || item.name}</h4><p>{item.description}</p></li>)}</ol></div></details>}
          <p className="ritual-experience-note">{preview ? 'A reflective preview, not product-use instructions. Imagery is illustrative.' : hasDirections ? `Follow the directions supplied with your product.${currentStep.image ? '' : ' This atelier scene is illustrative.'}` : 'An invitation to pause. Follow the directions supplied with your product. Imagery is illustrative.'}</p>
        </div>
      </div>
    </div>
  );
}

export default function RitualExperience(props: RitualExperienceProps) {
  if (props.preview && !props.title && !props.items?.length) return <RitualMomentExperience content={props.content} destinationHref={props.destinationHref} destinationLabel={props.destinationLabel}/>;
  return <ProductRitualExperience {...props}/>;
}
