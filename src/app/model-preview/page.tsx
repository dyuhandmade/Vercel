import {notFound} from 'next/navigation';
import ProductVisual from '@/components/ProductVisual';
import ModelPosterExport from '@/components/ModelPosterExport';
export default async function ModelPreview({searchParams}:{searchParams:Promise<{shape?:string}>}){if(process.env.NODE_ENV==='production')notFound();const {shape='jar'}=await searchParams;return <><div id="model-capture" style={{width:600,height:600,background:'#eeede4'}}><ProductVisual shape={shape} eager/></div><ModelPosterExport shape={shape}/></>;}
