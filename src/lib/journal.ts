import type {SiteContent} from './site-content';

export type ArticleSection = {heading: string; paragraphs: string[]};
export type Article = {
 slug: string; title: string; category: string; excerpt: string; paragraphs: string[];
 image?: string; mobileImage?: string; imageAlt?: string; imagePosition?: string; readTime?: string; sections?: ArticleSection[];
 takeaway?: string; imageCaption?: string;
};

/** Editorial defaults are local; merchant-authored articles always take precedence. */
export const articles: Article[] = [
 {
  slug: 'making-space-for-a-ritual',
  title: 'The quiet art of making time for yourself.',
  category: 'Everyday rituals',
  excerpt: 'A small pause can change the shape of an ordinary day. Begin with a moment that is already yours.',
  image: '/images/atelier-ritual-v2.webp',
  imageAlt: 'An illustrative close-up of hands opening a jar of everyday care',
  paragraphs: [
   'Some days move faster than we do. We arrive at the evening with a long list behind us and very little space left for ourselves. A ritual can be a way of finding that space again.',
   'Start small. A quiet minute before opening your phone. A warm shower without rushing. A familiar routine that asks you to pay attention to what you are doing, rather than what comes next.',
  ],
  sections: [
   {heading: 'Begin with what is already there', paragraphs: [
    'You do not need a perfect setting or an elaborate sequence. Choose a moment that already exists in your day and let it be a little slower. Notice the water, the light, the sound of the room.',
    'Try attaching the pause to something familiar: washing your hands when you return home, putting away your bag, or preparing the room for the evening. An ordinary cue can be easier to return to than another appointment on the calendar.',
   ]},
   {heading: 'Leave room for real life', paragraphs: [
    'Some evenings offer twenty minutes. Others offer one. Let the ritual change with the day instead of measuring it against a perfect version. A clean towel, a favourite cup or a moment by the window can be enough.',
    'A ritual is something you return to. Let yours be simple enough to repeat, and personal enough to feel like your own. If it begins to feel like another task, make it smaller.',
   ]},
  ],
  takeaway: 'Choose one familiar moment today. Give it your attention before adding anything new.',
 },
 {
  slug: 'look-closer-at-your-care',
  title: 'A little curiosity goes a long way.',
  category: 'Thoughtful care',
  excerpt: 'A practical guide to reading the details, asking good questions and choosing with a little more confidence.',
  image: '/images/botanical-study.webp',
  imageAlt: 'An illustrative arrangement of botanical ingredients on a work surface',
  paragraphs: [
   'Every product has details worth understanding. What is in it? How should it be used? Where can you find the full ingredient list?',
   'Take a moment to read a product’s directions and ingredient information. A pleasing texture or beautiful package is only one part of the story.',
  ],
  sections: [
   {heading: 'Start with the complete picture', paragraphs: [
    'The ingredient highlighted on the front of a pack is an introduction. Turn the pack around, or open the product details, to find the complete list. Look at the product type, intended use, size and instructions together.',
    'Two products featuring the same botanical can have different formulas and different directions. A familiar name is a useful starting point for curiosity, but it does not tell you everything about the finished product.',
   ]},
   {heading: 'Make space for questions', paragraphs: [
    'When you have a question, ask it. Thoughtful care starts with clear information and the room to make your own decision. Keep the exact product name or a photograph of the label nearby when contacting the maker.',
    'It is fine to compare slowly. Write down what matters to you: the format, the scent, the way the product fits into your routine, or how the container can be stored. Your own priorities make a more useful guide than an ever-growing list of trends.',
   ]},
  ],
  takeaway: 'Before choosing your next product, read its full details and note the one question you still want answered.',
 },
 {
  slug: 'a-home-for-your-soap',
  title: 'A good place for your daily soap.',
  category: 'Thoughtful care',
  excerpt: 'A few considered details can make the space around your sink easier to use and more pleasant to return to.',
  image: '/images/soap-atelier.png',
  imageAlt: 'An illustrative soap still life in a warm, natural setting',
  paragraphs: [
   'A bar of soap is a small object with a very familiar place in the day. Its surroundings matter too: the dish beneath it, the towel within reach, and the room it has between uses.',
   'The most useful arrangement is often the simplest. Begin by looking at how water moves around the sink and where you naturally reach when washing.',
  ],
  sections: [
   {heading: 'Let the dish do its job', paragraphs: [
    'Choose a dish that allows water to drain away, and place it where the bar is not sitting in the direct splash of a tap or shower. A raised surface or open ridges can help keep the bar out of pooled water.',
    'Give the dish a regular rinse and let it dry. Keep the space around it easy to wipe down. Follow any storage instructions supplied with your particular soap, especially when opening a new bar.',
   ]},
   {heading: 'Keep the everyday within reach', paragraphs: [
    'Arrange the things you use in the order you reach for them. A towel that is easy to pick up and a dish that sits comfortably beside the basin can make the routine feel considered without adding more objects.',
    'When travelling, follow the same principle: let the bar drain before packing it, and use a suitable container. At your destination, open the container and give the soap a place of its own.',
   ]},
  ],
  takeaway: 'Look at your soap dish after washing. If water is collecting beneath the bar, a small change in placement may be all it needs.',
 },
 {
  slug: 'botanicals-beyond-the-name',
  title: 'Behind a botanical name.',
  category: 'Ingredient notes',
  excerpt: 'From a plant to a finished formula, there is more to discover than a single familiar ingredient.',
  image: '/images/botanical-study.webp',
  imageAlt: 'An illustrative botanical study with leaves, flowers and a bowl',
  paragraphs: [
   'Rose, lavender, almond, olive. Botanical names can bring a whole landscape to mind before we have even opened a product. They are also an invitation to look a little closer.',
   'The name of a plant and the name of an ingredient are not always the same thing. The part used and the way it is prepared are useful details to notice.',
  ],
  sections: [
   {heading: 'Ask which part, and in what form', paragraphs: [
    'A label may describe an oil, a powder, an extract or another preparation. Rather than treating those words as interchangeable, read them alongside the complete ingredient list and the directions for the finished product.',
    'Our ingredient pages offer a way into this vocabulary. Use them to explore what draws your attention, then return to the individual product page for the information that applies to that particular formula.',
   ]},
   {heading: 'Keep the product in view', paragraphs: [
    'A beautiful ingredient photograph tells a visual story. It cannot show the whole formula or explain how to use it. That is why product details and the label deserve their own moment of attention.',
    'Let curiosity lead to a clearer question: Is this a wash-off product? What amount do the directions suggest? How should it be stored? Specific questions make it easier to find the information you need.',
   ]},
  ],
  takeaway: 'Find one botanical on a label you already own. Notice both its name and the form in which it appears.',
 },
 {
  slug: 'objects-worth-keeping',
  title: 'The things we choose to keep.',
  category: 'Considered living',
  excerpt: 'An empty container, a useful tray, a familiar towel. A quieter way to think about the objects around us.',
  image: '/images/atelier-craft-v2.webp',
  imageAlt: 'An illustrative hands-on arrangement of care products and natural materials',
  paragraphs: [
   'Some objects settle into a home so naturally that we stop noticing them. The little tray by the door. The jar that holds spare buttons. The towel that always finds its way back to the same hook.',
   'Taking care of an object starts with noticing how it is used. Before adding something new, it can be worth asking what is already there.',
  ],
  sections: [
   {heading: 'Use first, decide later', paragraphs: [
    'Finish and care for a product according to its label. When a container is empty, check its material and any disposal guidance before deciding what comes next. Different components may need to be separated.',
    'If a clean, dry container has a useful place in your home, give it a new task suited to its condition and material. Holding small non-food items is one possibility. Reuse is most helpful when it solves a real need.',
   ]},
   {heading: 'Leave some space empty', paragraphs: [
    'Not every empty container needs a second life on your shelf. Local collection rules and the condition of an item can guide your next step. Keeping everything can simply move the clutter from one place to another.',
    'A considered space does not have to look minimal or perfectly arranged. It can be a collection of well-used things, with enough room around them to make the day a little easier.',
   ]},
  ],
  takeaway: 'Choose one shelf or small surface. Keep what serves the way you actually use it, and give the rest a considered next step.',
 },
 {
  slug: 'the-art-of-a-small-gift',
  title: 'A small gift, thoughtfully chosen.',
  category: 'Considered living',
  excerpt: 'Start with the person, then the occasion. The most thoughtful part of a gift can be the attention behind it.',
  image: '/images/atelier-hero.webp',
  imageAlt: 'An illustrative still life of care products, botanicals and natural textures',
  paragraphs: [
   'A thoughtful gift begins long before it is wrapped. It begins with remembering a preference, noticing a habit, or listening when someone mentions the things they enjoy.',
   'For everyday care, a familiar routine can be a helpful starting point. Does the person enjoy a quiet bath, prefer simple practical objects, or like choosing things for themselves?',
  ],
  sections: [
   {heading: 'Choose with the person in mind', paragraphs: [
    'If you know their preferences, let those details guide you. If you do not, leave room to ask. Scent, texture and product format are personal choices, and a little information is more useful than an assumption.',
    'Read the complete product description, ingredients and directions before choosing. Keep that information with the gift so the recipient has the same opportunity to make an informed choice.',
   ]},
   {heading: 'Make the gesture your own', paragraphs: [
    'A short note can explain why you thought of them: a shared memory, an everyday pleasure, or simply a wish for a little time to themselves. It does not need to sound polished to feel personal.',
    'Let the wrapping be simple enough to open and the message easy to understand. The object is one part of the gift; the attention you bring to choosing it is another.',
   ]},
  ],
  takeaway: 'Before looking for a gift, write down one thing you know the person enjoys. Begin there.',
 },
];

/** A Shopify body is the complete article. Optional ## headings create chapters. */
export function parseArticleBody(body:string):{paragraphs:string[];sections:ArticleSection[]} {
 const paragraphs:string[]=[],sections:ArticleSection[]=[];
 for(const line of body.split(/\r?\n/).map(value=>value.trim()).filter(Boolean)){
  const heading=line.match(/^#{1,3}\s+(.+)$/);
  if(heading)sections.push({heading:heading[1],paragraphs:[]});
  else (sections.at(-1)?.paragraphs||paragraphs).push(line);
 }
 return {paragraphs,sections};
}

export function getArticles(content: SiteContent): Article[] {
 const saved = Object.values(content.sections).filter(item => item.handle.startsWith('article-'));
 const handles = [...new Set([...articles.map(item => item.slug), ...saved.map(item => item.handle.slice(8))])];
 return handles.map((slug, index) => {
  const existing = articles.find(item => item.slug === slug);
  const item = content.sections[`article-${slug}`];
  if (item?.enabled === false || (!existing && (!item?.title || !item.body))) return null;
  const hasCustomBody=Boolean(item?.body);
  const parsed=item?.body?parseArticleBody(item.body):undefined;
  const paragraphs=parsed?.paragraphs||existing?.paragraphs||[];
  const sections=parsed?.sections||existing?.sections;
  const invitation=content.sections[`journal-takeaway-${slug}`];
  const wordCount = [...paragraphs, ...(sections || []).flatMap(part => [part.heading, ...part.paragraphs])].join(' ').trim().split(/\s+/).filter(Boolean).length;
  return {
   slug, title: item?.title || existing!.title,
   category: item?.category || existing?.category || 'Notes from the atelier',
   excerpt: item?.note || existing?.excerpt || '',
   paragraphs, sections,
   takeaway: invitation?.enabled===false?undefined:invitation?.body||item?.items?.[0]||(hasCustomBody?undefined:existing?.takeaway),
   image: item?.image || existing?.image || '/images/botanical-study.webp',
   imagePosition:item?.imagePosition,
   mobileImage:item?.mobileImage,
   imageAlt: item?.imageAlt || (item?.image ? item?.title || existing!.title : existing?.imageAlt) || 'A botanical still life',
   imageCaption: item?.caption || (item?.image ? undefined : 'An illustrative scene from the world of DYU.'),
   readTime: item?.readTime || `${Math.max(1, Math.ceil(wordCount / 200))} MIN READ`,
   order: item?.sortOrder ?? index,
  };
 }).filter((item): item is NonNullable<typeof item> => item !== null)
   .sort((a, b) => a.order - b.order)
   .map(({order: _order, ...article}) => article);
}
