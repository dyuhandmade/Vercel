import type {PhotoModelMetadata} from './photo-model';
import type {Product} from './types';

export type HeroProduct = Pick<Product, 'id' | 'handle' | 'title' | 'productType' | 'tags' | 'shape' | 'tone' | 'image' | 'images' | 'model' | 'ingredients' | 'demo'>;
export type HeroBotanical = 'rose' | 'lavender' | 'almond' | 'rosemary' | 'moringa' | 'citrus' | 'tea-tree' | 'sandalwood' | 'coconut' | 'botanical';
export type HeroViewCommand = {id:number;action:'left'|'right'|'up'|'down'|'reset'};

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
const hasSource = (product: HeroProduct) => Boolean(product.model?.trim() || product.image?.trim() || product.images.some(image => image.url.trim()))
  || ('demo' in product && product.demo === true && ['bottle', 'jar', 'soap'].includes(product.shape));

/** Prefer the selected collection, while avoiding a hero with no available source. */
export function selectHeroProduct<T extends HeroProduct>(products: readonly T[], type?: string | null): T | undefined {
  const valid = products.filter(hasSource);
  const selectedType = type && normalize(type);
  return (selectedType && valid.find(product => normalize(product.productType) === selectedType)) || valid[0];
}

// These two catalogue bundles have promotional sheets as their source images.
// Their verified constituents supply authentic geometry instead of a flat sheet.
const bundleConstituents:Record<string,readonly string[]>={
  'floral-soap-gift-set':['tea-tree-cold-processed-soap','oriental-lavendar','orange-tangerine'],
  'wellness-trio-soap-bundle':['tea-tree-cold-processed-soap','camphora-pink-salt','charcoal-mint-cold-processed-soap'],
};
export function heroBundleMembers(product:HeroProduct,products:readonly HeroProduct[]):HeroProduct[]{
  const handles=bundleConstituents[product.handle];
  if(!handles||product.model)return [];
  const members=handles.map(handle=>products.find(candidate=>candidate.handle===handle&&hasSource(candidate)));
  return members.every((member):member is HeroProduct=>Boolean(member))?members:[];
}

const botanicals: readonly [HeroBotanical, RegExp][] = [
  ['rose', /\brose\b/],
  ['lavender', /\blavend[ae]r\b/],
  ['almond', /\balmonds?\b/],
  ['rosemary', /\brosemary\b/],
  ['moringa', /\bmoringa\b/],
  ['citrus', /\b(?:orange|lemon|lime|citrus|bergamot|grapefruit|mandarin|tangerine)\b/],
  ['tea-tree', /\b(?:tea tree|neem)\b/],
  ['sandalwood', /\bsandalwood\b/],
  ['coconut', /\bcoconut\b/],
];

/** The product's named botanical wins over supporting ingredients in its formula. */
export function heroBotanical(product: HeroProduct): HeroBotanical {
  for (const text of [product.title, product.ingredients.map(ingredient => ingredient.name).join(' '), product.tags.join(' ')]) {
    const value = normalize(text);
    const match = botanicals.find(([, pattern]) => pattern.test(value));
    if (match) return match[0];
  }
  return 'botanical';
}

export type HeroLayout = {
  productScale: number;
  productY: number;
  radius: number;
  height: number;
  width: number;
  depth: number;
  ornamentScale: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const positive = (value: number | undefined, fallback: number) => value !== undefined && Number.isFinite(value) && value > .001 ? value : fallback;

/** Models are centered; a uniform scale preserves their proportions above a disc whose top is y=0. */
export function heroLayout(shape: HeroProduct['shape'], metadata?: PhotoModelMetadata): HeroLayout {
  const profile = shape === 'soap'
    ? {source: [2, 1.22, .36], target: [2.3, 1.65, 1.2]}
    : shape === 'bottle'
      ? {source: [.53, 2, .53], target: [1.15, 2.1, 1.15]}
      : shape === 'jar'
        ? {source: [2, 1.7, 1.5], target: [1.5, 1.3, 1.35]}
        : {source: [2, 1.6, .8], target: [2.2, 1.85, 1.45]};
  const sourceWidth = positive(metadata?.width, profile.source[0]);
  const sourceHeight = positive(metadata?.height, profile.source[1]);
  const sourceDepth = positive(metadata?.depth, profile.source[2]);
  const productScale = Math.min(profile.target[0] / sourceWidth, profile.target[1] / sourceHeight, profile.target[2] / sourceDepth);
  const width = sourceWidth * productScale;
  const height = sourceHeight * productScale;
  const depth = sourceDepth * productScale;
  const ornamentScale = clamp(height * .82, .95, 1.35);
  const radius = clamp(Math.hypot(width / 2, depth / 2) + clamp(height * .36, .42, .68) * .62 + .16, .9, 2);
  return {productScale, productY: height / 2 + .09, radius, height, width, depth, ornamentScale};
}
