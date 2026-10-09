import type {Product} from '@/lib/types';
import {productDescriptionParagraphs} from '@/lib/product-description';

export default function ProductDescription({product,fallback=''}:{product:Pick<Product,'description'|'descriptionParagraphs'>;fallback?:string}){
 const paragraphs=product.descriptionParagraphs?.length?product.descriptionParagraphs:productDescriptionParagraphs(undefined,product.description||fallback);
 return <>{paragraphs.map((paragraph,index)=><p key={index} style={{whiteSpace:'pre-line'}}>{paragraph}</p>)}</>;
}
