'use client';

import {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Point = [number, number, number];
type Petal = {angle:number; radius:number; reach:number; height:number; spread:number; reflex:number; seed:number; inner:number};

// Each petal is a closed, thin shell. Its broad lip folds back over a cupped
// base; the irregular spiral avoids the flat, evenly spaced "flower icon" shape.
function petalGeometry(p:Petal) {
  const rows=24, cols=24, stride=cols+1, face=(rows+1)*stride;
  const positions:number[]=[], colors:number[]=[], uvs:number[]=[], indices:number[]=[];
  const base=new THREE.Color('#b8204b').lerp(new THREE.Color('#9e143d'),p.inner*.42);
  const lip=new THREE.Color('#ed91a3').lerp(new THREE.Color('#d85579'),p.inner*.6);
  const variation=Math.sin(p.seed*7.71)*.05;
  for(let side=0;side<2;side++) for(let row=0;row<=rows;row++) {
    const t=row/rows, openness=Math.pow(Math.sin(t*Math.PI/2),.83);
    for(let col=0;col<=cols;col++) {
      const u=col/cols*2-1;
      const scallop=(Math.sin(u*7.3+p.seed)*.48+Math.sin(u*12.1+p.seed*2)*.24);
      // A rounded distal outline draws both corners inward. Easing the width
      // with sin also joins each rolled lip smoothly to its side wall.
      const rounding=1-.36*u*u*Math.pow(t,3);
      const radius=p.radius+p.reach*openness*rounding;
      const angle=p.angle+.19*t*t+Math.sin(p.seed)*.07*t;
      const tangent=radius*(.65*Math.sin(u*Math.PI/2)*Math.sin(p.spread)+.35*Math.sin(u*p.spread))*openness;
      const radial=radius*(.65+.35*Math.cos(u*p.spread*openness));
      const lipContour=(.003*Math.sin(u*5+p.seed)+.0015*Math.cos(u*9-p.seed))*Math.pow(t,5);
      const edgeRoll=Math.pow(t,8)*(p.reflex*(1-.36*u*u)+.005*(1-p.inner*.6)*scallop);
      const cupping=.035*(1-p.inner*.45)*u*u*Math.sin(Math.PI*t*.86);
      const fluting=.0015*Math.sin(u*27+t*2+p.seed)*Math.pow(t,3);
      const height=p.height*Math.sin(t*Math.PI*.51)+cupping-edgeRoll+fluting+u*.018*Math.sin(p.seed*2)*t;
      const depth=height+(side===0?.00065:-.00065);
      positions.push(Math.sin(angle)*(radial+lipContour)+Math.cos(angle)*tangent+p.inner*.007,
        Math.cos(angle)*(radial+lipContour)-Math.sin(angle)*tangent-p.inner*.005,depth);
      uvs.push((u+1)/2,t);
      const pigment=base.clone().lerp(lip,Math.min(1,Math.pow(t,1.8)*.9+Math.abs(u)*.13));
      // Uneven pigmentation and lighter rolled rims keep the bloom organic.
      pigment.multiplyScalar(1+variation+Math.sin(u*16+p.seed+t*6)*.018-(side===1?.055:0));
      colors.push(pigment.r,pigment.g,pigment.b);
    }
  }
  for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) {
    const a=row*stride+col,b=a+stride;
    indices.push(a,a+1,b,b,a+1,b+1,a+face,b+face,a+1+face,b+face,b+1+face,a+1+face);
  }
  const rim:number[]=[];
  for(let c=0;c<=cols;c++)rim.push(c);
  for(let r=1;r<=rows;r++)rim.push(r*stride+cols);
  for(let c=cols-1;c>=0;c--)rim.push(rows*stride+c);
  for(let r=rows-1;r>0;r--)rim.push(r*stride);
  rim.forEach((a,i)=>{const b=rim[(i+1)%rim.length];indices.push(a,b,a+face,b,b+face,a+face);});
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

function merge(parts:THREE.BufferGeometry[]) {
  const result=mergeGeometries(parts)!;
  parts.forEach(part=>part.dispose());
  return result;
}

function bloomGeometry() {
  const petals:THREE.BufferGeometry[]=[];
  const layers=[
    {count:7,radius:.026,reach:.245,height:.118,spread:.83,reflex:.053},
    {count:8,radius:.018,reach:.193,height:.178,spread:.88,reflex:.050},
    {count:7,radius:.012,reach:.139,height:.214,spread:.94,reflex:.036},
    {count:5,radius:.006,reach:.070,height:.239,spread:1.11,reflex:.022},
    {count:5,radius:.002,reach:.039,height:.249,spread:1.08,reflex:.010},
  ];
  let index=0;
  layers.forEach((layer,level)=>{
    for(let n=0;n<layer.count;n++) {
      const seed=++index;
      petals.push(petalGeometry({...layer,
        angle:n/layer.count*Math.PI*2+level*1.37+.20*Math.sin(n*2.7+level),
        reach:layer.reach*(1+.095*Math.sin(seed*2.73)),
        height:layer.height*(1+.055*Math.cos(seed*2.9)),
        spread:layer.spread*(1+.13*Math.cos(seed*4.7)),seed,inner:level/4,
      }));
    }
  });
  // A folded pink bud sits behind the inner scrolls, closing their small opening
  // from every viewing angle. Its creased surface reads as furled petals.
  const bud=new THREE.SphereGeometry(1,24,18);
  const points=bud.getAttribute('position'),budColors:number[]=[];
  const budColor=new THREE.Color('#a9244c');
  for(let i=0;i<points.count;i++) {
    const x=points.getX(i),y=points.getY(i),z=points.getZ(i);
    const fold=1+.20*Math.sin(Math.atan2(y,x)*3+z*3.4);
    points.setXYZ(i,.007+x*.023*fold,-.005+y*.022*fold,.239+z*.026);
    const pigment=budColor.clone().multiplyScalar(.90+.12*(z+1));
    budColors.push(pigment.r,pigment.g,pigment.b);
  }
  bud.setAttribute('color',new THREE.Float32BufferAttribute(budColors,3));bud.computeVertexNormals();petals.push(bud);
  petals.push(petalGeometry({angle:1.05,radius:.001,reach:.015,height:.267,spread:1.5,reflex:.005,seed:42,inner:1}));
  return merge(petals);
}

function petalGrain() {
  const size=128,data=new Uint8Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const grain=(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
    const vein=Math.pow(Math.max(0,Math.cos((x-size/2)*(1-y/size*.4)*.61+Math.sin(y*.04)*.8)),16);
    data[y*size+x]=Math.round(132+grain*16+vein*19);
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RedFormat);
  texture.needsUpdate=true;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
  return texture;
}

function PetalMesh({geometry}:{geometry:THREE.BufferGeometry}) {
  const grain=useMemo(petalGrain,[]);
  useEffect(()=>()=>{geometry.dispose();grain.dispose();},[geometry,grain]);
  return <mesh geometry={geometry} castShadow receiveShadow>
    <meshPhysicalMaterial vertexColors roughness={.74} metalness={0} sheen={.3} sheenColor="#f3b5c0" sheenRoughness={.86}
      bumpMap={grain} bumpScale={.00065} side={THREE.DoubleSide}/>
  </mesh>;
}

function roseLeafGeometry(length:number,width:number,seed:number) {
  const rows=36,cols=10,positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const center=new THREE.Color('#304c23'),edge=new THREE.Color('#6c803b');
  for(let r=0;r<=rows;r++) {
    const t=r/rows;
    const serration=1-.09*(r%2);
    const outline=Math.pow(Math.sin(Math.PI*t),.72)*serration;
    for(let c=0;c<=cols;c++) {
      const u=c/cols*2-1;
      const x=u*width*.5*outline;
      const vein=Math.exp(-Math.pow(Math.sin(t*Math.PI*10+Math.abs(u)*3),2)*65);
      const y=.035*Math.sin(t*Math.PI)*u*u+.016*Math.sin(t*3)+.0014*vein*Math.abs(u);
      positions.push(x,y,length*t);
      const pigment=center.clone().lerp(edge,.22+Math.abs(u)*.34+vein*.14+Math.sin(seed+t*24)*.025);
      colors.push(pigment.r,pigment.g,pigment.b);
    }
  }
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++) {
    const a=r*(cols+1)+c,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

function RoseFoliage() {
  const geometry=useMemo(()=>{
    const leaves:[Point,Point,number,number][]=[
      [[-.11,.022,-.03],[.10,-1.7,-.15],.37,.17],
      [[-.13,.025,-.025],[.16,-2.7,.05],.32,.15],
      [[-.08,.018,.02],[0,-.40,.06],.29,.125],
    ];
    return merge(leaves.map(([position,rotation,length,width],i)=>{
      const leaf=roseLeafGeometry(length,width,i);
      leaf.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1)));
      return leaf;
    }));
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.72} side={THREE.DoubleSide}/></mesh>;
}

export function RoseBloom() {
  const geometry=useMemo(bloomGeometry,[]);
  return <group>
    <RoseFoliage/>
    <group position={[-.09,.265,-.025]} rotation={[-.34,-.08,-.12]}>
      <mesh position={[0,0,-.025]} scale={[1,1,.62]} castShadow><sphereGeometry args={[.079,20,14]}/><meshStandardMaterial color="#49612e" roughness={.86}/></mesh>
      <PetalMesh geometry={geometry}/>
    </group>
  </group>;
}

export function RoseLoosePetals() {
  const geometry=useMemo(()=>{
    const poses:[Point,Point,number][]=[
      [[-.12,.018,-.045],[-Math.PI/2+.12,0,-.75],1],
      [[.1,.02,-.085],[-Math.PI/2-.12,0,.55],.92],
      [[.035,.016,.16],[-Math.PI/2+.12,0,2.5],.78],
      [[-.18,.017,.04],[-Math.PI/2+.05,0,-1.5],.72],
    ];
    return merge(poses.map(([position,rotation,scale],i)=>{
      const petal=petalGeometry({angle:0,radius:0,reach:.25,height:.087,spread:.61,reflex:.028,seed:i+5,inner:0});
      petal.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(scale,scale,scale)));
      return petal;
    }));
  },[]);
  return <PetalMesh geometry={geometry}/>;
}
