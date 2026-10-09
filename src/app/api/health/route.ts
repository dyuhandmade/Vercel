import {getProducts,isDemo} from '@/lib/shopify';
import {storefrontReadiness} from '@/lib/health';

export async function GET(){return storefrontReadiness(getProducts,isDemo());}
