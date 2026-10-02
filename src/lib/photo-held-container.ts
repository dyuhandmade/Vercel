import type {PhotoPixels} from './photo-model';
import type {PhotoObject} from './photo-objects';

const clamp=(value:number,minimum:number,maximum:number)=>Math.max(minimum,Math.min(maximum,value));
const median=(values:number[])=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)]??180;

/**
 * Recognise the visible opening of a held cream tin when ordinary foreground
 * segmentation would include the hands. Evidence must include a compact pale
 * interior, a nearly complete neutral metal rim, and warm/darker surroundings.
 * This deliberately does not identify products or extrapolate obscured lids.
 */
export function inferHeldContainer(pixels:PhotoPixels):PhotoObject|undefined {
 const {width,height,data}=pixels,count=width*height;
 if(width<48||height<48||data.length<count*4)return;
 const cream=new Uint8Array(count),neutral=new Float32Array(count),warm=new Uint8Array(count);
 for(let i=0;i<count;i++){
  const r=data[i*4],g=data[i*4+1],b=data[i*4+2],low=Math.min(r,g,b),high=Math.max(r,g,b),light=(r+g+b)/3;
  if(data[i*4+3]<240)continue;
  cream[i]=+(low>175&&light>207&&high-low<65&&r>b-12);
  neutral[i]=light>55&&light<245?Math.max(0,1-(high-low)/32):0;
  warm[i]=+(r>g+12&&g>b+7&&light>45&&light<205);
 }
 const visited=new Uint8Array(count),queue=new Int32Array(count),directions=Array.from({length:64},(_,i)=>[Math.cos(i*Math.PI/32),Math.sin(i*Math.PI/32)]);
 const sample=(channel:Uint8Array|Float32Array,x:number,y:number)=>channel[clamp(Math.round(y),0,height-1)*width+clamp(Math.round(x),0,width-1)];
 let best:{cx:number;cy:number;rx:number;ry:number;score:number}|undefined;
 for(let seed=0;seed<count;seed++){
  if(!cream[seed]||visited[seed])continue;
  let head=0,tail=1,left=width,right=0,top=height,bottom=0,sumX=0,sumY=0;
  queue[0]=seed;visited[seed]=1;
  while(head<tail){
   const i=queue[head++],x=i%width,y=Math.floor(i/width);
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);sumX+=x;sumY+=y;
   for(const next of [x?i-1:-1,x<width-1?i+1:-1,y?i-width:-1,y<height-1?i+width:-1])if(next>=0&&cream[next]&&!visited[next]){visited[next]=1;queue[tail++]=next;}
  }
  const w=right-left+1,h=bottom-top+1,cx=sumX/tail,cy=sumY/tail;
  if(tail<count*.015||tail>count*.13||tail/(w*h)<.5||w/h<.65||w/h>1.5||w<width*.13||h<height*.13)continue;
  if(cx<width*.25||cx>width*.75||cy<height*.25||cy>height*.75||left<width*.12||right>width*.88||top<height*.12||bottom>height*.88)continue;
  const interior=Array.from(queue.subarray(0,tail));
  const step=Math.max(1,Math.min(width,height)/192),shift=Math.max(w,h)*.15;
  for(let x=cx-shift;x<=cx+shift;x+=step)for(let y=cy-shift;y<=cy+shift;y+=step){
   for(let rx=w*.49;rx<=w*.72;rx+=step)for(let ry=h*.49;ry<=h*.72;ry+=step){
    if(rx/ry<.72||rx/ry>1.35)continue;
    let rim=0,rimCoverage=0,inner=0,surrounding=0;
    for(const [dx,dy]of directions){
     // The bounded search tolerates the thin rim's subpixel antialiasing.
     let metal=0;
     for(const offset of [-.6,0,.6])metal=Math.max(metal,sample(neutral,x+(rx+offset*step)*dx,y+(ry+offset*step)*dy));
     rim+=metal;rimCoverage+=+(metal>.32);
     inner+=sample(cream,x+rx*.65*dx,y+ry*.65*dy);
     surrounding+=sample(warm,x+rx*1.23*dx,y+ry*1.23*dy);
    }
    rim/=directions.length;rimCoverage/=directions.length;inner/=directions.length;surrounding/=directions.length;
    if(rimCoverage<.75||rim<.38||inner<.70||surrounding<.50)continue;
    const score=rim*.72+inner*.18+surrounding*.10;
    if(best&&score<=best.score)continue;
    // Reject a circle passing through only a pale fragment of a larger shape.
    const contained=interior.filter(i=>((i%width-x)/rx)**2+((Math.floor(i/width)-y)/ry)**2<1.03).length/interior.length;
    if(contained<.96)continue;
    best={cx:x,cy:y,rx,ry,score};
   }
  }
 }
 if(!best)return;
 const {cx,cy,rx,ry}=best;
 const channels:number[][]=[[],[],[]];
 for(const [dx,dy]of directions){
  const x=clamp(Math.round(cx+rx*dx),0,width-1),y=clamp(Math.round(cy+ry*dy),0,height-1),i=y*width+x;
  if(neutral[i]<.32)continue;
  for(let channel=0;channel<3;channel++)channels[channel].push(data[i*4+channel]);
 }
 if(channels[0].length<32)return;
 const x=Math.floor(cx-rx),y=Math.floor(cy-ry),right=Math.ceil(cx+rx),bottom=Math.ceil(cy+ry);
 return {kind:'jar',bounds:{x,y,width:right-x,height:bottom-y},color:channels.map(values=>median(values)/255) as [number,number,number],confidence:clamp(.78+best.score*.15,.78,.94),
  contour:directions.map(([dx,dy])=>({x:cx+rx*dx,y:cy+ry*dy}))};
}
