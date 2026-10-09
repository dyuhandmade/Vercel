export type Money = { amount: string; currencyCode: string };
export type Variant = { id: string; title: string; availableForSale: boolean; price: Money; selectedOptions: {name:string;value:string}[] };
export type StoryItem = { name: string; title?: string; description: string; image?: string; handle?: string };
export type ProductMedia = {id:string;type:'image'|'video'|'externalVideo'|'model';url?:string;previewImage?:string;alt?:string;embedUrl?:string};
export type Product = { id: string; handle: string; title: string; description: string; descriptionParagraphs?:string[]; productType: string; tags: string[]; availableForSale: boolean; createdAt: string; image?: string; images: {url:string;altText?:string}[]; media?:ProductMedia[]; model?: string; shape: 'jar'|'bottle'|'soap'|'general'; tone: string; price: Money; variants: Variant[]; story: string; ingredients: StoryItem[]; craft: StoryItem[]; ritual: StoryItem[]; sensory?:string; careNotes?:string; fullIngredientList?:string; relatedProductHandles?:string[]; demo?: boolean };
export type Collection = {handle:string;title:string;description:string;image?:{url:string;altText?:string};href?:string};
export type CartLine = {id:string;quantity:number;merchandise: {id:string;title:string;price:Money;product:{title:string;handle:string;featuredImage?:{url:string;altText?:string}}}};
export type Cart = {id:string;checkoutUrl:string;totalQuantity:number;lines:{nodes:CartLine[]};cost:{subtotalAmount:Money;totalAmount:Money}};
export const money = (m:Money) => new Intl.NumberFormat('en-IN',{style:'currency',currency:m.currencyCode,maximumFractionDigits:Number(m.amount)%1?2:0}).format(Number(m.amount));
