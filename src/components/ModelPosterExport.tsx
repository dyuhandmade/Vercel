'use client';
export default function ModelPosterExport({shape}:{shape:string}) {
 return <button className="button" onClick={()=>{const canvas=document.querySelector<HTMLCanvasElement>('#model-capture canvas');if(!canvas)return;const link=document.createElement('a');link.download=`${shape}-render.png`;link.href=canvas.toDataURL('image/png');link.click();}}>Save {shape} poster</button>;
}
