import {getSiteContent,section} from '@/lib/site-content';
import {getProducts} from '@/lib/shopify';
import IngredientLibrary from '@/components/IngredientLibrary';
import {buildIngredientIndex} from './ingredient-data';

export const metadata={title:'The ingredient atlas',description:'Explore the ingredients and botanical names in the DYUhandmade collection. Follow each ingredient to its products and published details.'};

export default async function Ingredients(){
  const [products,content]=await Promise.all([getProducts(),getSiteContent()]);
  return <IngredientLibrary entries={buildIngredientIndex(products,content)} intro={section(content,'ingredients-page')} content={content}/>;
}
