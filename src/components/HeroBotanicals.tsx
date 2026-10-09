'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {RoseBloom, RoseLoosePetals} from './RoseModel';

export type BotanicalKind = 'rose' | 'lavender' | 'almond' | 'rosemary' | 'moringa' | 'citrus' | 'tea-tree' | 'neem' | 'sandalwood' | 'coconut' | 'botanical';

type Triplet = [number, number, number];
type SurfaceOptions = { length: number; width: number; curl: number; petal?: boolean; color: string; edgeColor: string };

// Both faces and the rim are modelled, so these are thin curved solids rather than image planes.
function organicGeometry({ length, width, curl, petal = false, color, edgeColor }: SurfaceOptions) {
  const rows = 14, columns = 12, stride = columns + 1, faceSize = (rows + 1) * stride;
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const base = new THREE.Color(color), edge = new THREE.Color(edgeColor);
  for (let side = 0; side < 2; side++) {
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const outline = petal ? Math.pow(Math.sin(Math.PI * t), .48) : Math.pow(Math.sin(Math.PI * t), .8);
      for (let c = 0; c <= columns; c++) {
        const u = c / columns * 2 - 1;
        const x = u * width * .5 * Math.max(.008, outline);
        const fold = (petal ? .075 : .026) * u * u * Math.sin(Math.PI * t);
        const y = curl * t * t + fold + Math.sin(t * 9 + u * 3) * .003 * outline + (side === 0 ? .0018 : -.0018);
        positions.push(x, y, length * t);
        const pigment = base.clone().lerp(edge, Math.min(1, t * .56 + Math.abs(u) * .26));
        if (side === 1) pigment.multiplyScalar(.86);
        colors.push(pigment.r, pigment.g, pigment.b);
      }
    }
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
    const a = r * stride + c, b = a + stride;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
    indices.push(a + faceSize, a + 1 + faceSize, b + faceSize, b + faceSize, a + 1 + faceSize, b + 1 + faceSize);
  }
  const rim: number[] = [];
  for (let c = 0; c <= columns; c++) rim.push(c);
  for (let r = 1; r <= rows; r++) rim.push(r * stride + columns);
  for (let c = columns - 1; c >= 0; c--) rim.push(rows * stride + c);
  for (let r = rows - 1; r > 0; r--) rim.push(r * stride);
  rim.forEach((a, i) => {
    const b = rim[(i + 1) % rim.length];
    indices.push(a, a + faceSize, b, b, a + faceSize, b + faceSize);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function Surface({ position = [0, 0, 0], rotation = [0, 0, 0], ...options }: SurfaceOptions & { position?: Triplet; rotation?: Triplet }) {
  const { length, width, curl, petal, color, edgeColor } = options;
  const geometry = useMemo(() => organicGeometry({ length, width, curl, petal, color, edgeColor }), [length, width, curl, petal, color, edgeColor]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
    <meshStandardMaterial vertexColors roughness={petal ? .68 : .8} side={THREE.DoubleSide} />
  </mesh>;
}

function Stem({ points, radius = .005, color = '#657348' }: { points: Triplet[]; radius?: number; color?: string }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 16, radius, 6, false), [points, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={.9} /></mesh>;
}

function Leaf({ position, rotation, length = .28, width = .12, color = '#405432' }: { position?: Triplet; rotation?: Triplet; length?: number; width?: number; color?: string }) {
  return <group position={position} rotation={rotation}>
    <Surface length={length} width={width} curl={.028} color={color} edgeColor="#74834c" />
    <Stem points={[[0, .003, 0], [0, .01, length * .45], [0, .033, length * .96]]} radius={.0018} color="#839257" />
  </group>;
}

function LavenderSprig({ rotation, position, scale = 1 }: { rotation: Triplet; position: Triplet; scale?: number }) {
  return <group position={position} rotation={rotation} scale={scale}>
    <Stem points={[[0, 0, 0], [.025, .2, 0], [-.006, .49, .014]]} radius={.004} />
    <Leaf position={[.012, .13, 0]} rotation={[-.45, -1.1, -.8]} length={.16} width={.025} color="#6d8061" />
    <Leaf position={[.016, .18, 0]} rotation={[-.4, 1.7, .8]} length={.15} width={.025} color="#6d8061" />
    {Array.from({ length: 7 }, (_, row) => Array.from({ length: 4 }, (_, petal) => {
      const angle = petal * Math.PI / 2 + row * .8;
      const radius = .027 * (1 - row * .07);
      return <mesh key={`${row}-${petal}`} position={[Math.cos(angle) * radius, .3 + row * .026, Math.sin(angle) * radius]} rotation={[.3 * Math.cos(angle), angle, .4]} scale={[.72, 1.2, .8]} castShadow>
        <sphereGeometry args={[.024 * (1 - row * .035), 8, 6]} />
        <meshStandardMaterial color={['#77658f', '#8e7aab', '#b29bbc', '#68537f'][(row + petal) % 4]} roughness={.88} />
      </mesh>;
    }))}
  </group>;
}

function Lavender() {
  return <group rotation={[-.68, .15, -.65]} position={[.06, .015, .15]}>
    <LavenderSprig position={[-.045, 0, 0]} rotation={[.1, .1, -.2]} />
    <LavenderSprig position={[0, .01, .015]} rotation={[-.07, .2, .13]} scale={1.12} />
    <LavenderSprig position={[.025, 0, -.035]} rotation={[.15, -.2, .35]} scale={.88} />
  </group>;
}

function FoliageSprig({ needle = false, round = false, rotation = [0, 0, 0] }: { needle?: boolean; round?: boolean; rotation?: Triplet }) {
  const count = needle ? 10 : 5;
  return <group rotation={rotation}>
    <Stem points={[[0, .016, 0], [.01, .06, -.23], [-.06, .15, -.48]]} color="#73805a" />
    {Array.from({ length: count }, (_, i) => [-1, 1].map(sign => <Leaf
      key={`${i}-${sign}`} position={[-i * .004, .026 + i / count * .1, -.045 - i / count * .37]}
      rotation={[.05 + i * .02, sign * (1.9 + i * .055), sign * .22]}
      length={needle ? .125 : round ? .12 : .2} width={needle ? .019 : round ? .105 : .077}
      color={needle ? '#456247' : round ? '#4a6538' : '#3d5a31'}
    />))}
  </group>;
}

function Rosemary() {
  return <group>
    <group position={[-.08, .01, .18]}><FoliageSprig needle rotation={[.1, .55, -.25]} /></group>
    <group position={[.06, .015, .18]}><FoliageSprig needle rotation={[-.05, -.3, .15]} /></group>
    {[[-.23, .066, .11], [-.06, .063, .25], [.15, .059, .18]].map((position, i) => <mesh key={i} position={position as Triplet} rotation={[.2, .3 + i, .9]} scale={[.7, 1.15, .8]} castShadow>
      <sphereGeometry args={[.071, 20, 14]} /><meshStandardMaterial color={i === 0 ? '#34392a' : '#718247'} roughness={.4} />
    </mesh>)}
  </group>;
}

function Almond({ position, rotation }: { position: Triplet; rotation: Triplet }) {
  const geometry = useMemo(() => {
    const shape = new THREE.SphereGeometry(1, 24, 16);
    const attribute = shape.getAttribute('position');
    for (let i = 0; i < attribute.count; i++) {
      const x = attribute.getX(i), y = attribute.getY(i), z = attribute.getZ(i);
      const taper = 1 - Math.max(0, y) * .4;
      const grain = 1 + .035 * Math.cos(Math.atan2(z, x) * 14 + y * 5);
      attribute.setXYZ(i, x * .07 * taper * grain, y * .13, z * .048 * taper * grain);
    }
    shape.computeVertexNormals();
    return shape;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow><meshStandardMaterial color="#b88851" roughness={.94} /></mesh>;
}

function Almonds() {
  return <group>
    <Leaf position={[-.04, .02, -.03]} rotation={[.2, -2.2, -.15]} length={.37} width={.11} />
    <Leaf position={[-.04, .023, -.03]} rotation={[.1, 2.4, .05]} length={.29} width={.095} />
    <Almond position={[-.15, .07, .08]} rotation={[1.28, .3, -.4]} />
    <Almond position={[.065, .069, .05]} rotation={[1.28, 1.3, .15]} />
    <Almond position={[.23, .069, .13]} rotation={[1.28, -.5, .2]} />
    <Almond position={[-.02, .087, .2]} rotation={[1.17, -.8, .3]} />
  </group>;
}

function Citrus() {
  const segments = 9;
  return <group>
    <Leaf position={[-.13, .02, -.02]} rotation={[.1, -1.1, -.1]} length={.33} width={.145} />
    <group position={[.055, .064, .03]} rotation={[-.18, -.2, .05]}>
      <mesh castShadow receiveShadow><cylinderGeometry args={[.235, .231, .105, 48]} /><meshStandardMaterial color="#d88d25" roughness={.85} /></mesh>
      <mesh position={[0, .055, 0]}><cylinderGeometry args={[.219, .219, .008, 48]} /><meshStandardMaterial color="#f8dfaa" roughness={.9} /></mesh>
      {Array.from({ length: segments }, (_, i) => <mesh key={i} position={[0, .063, 0]} rotation={[0, i / segments * Math.PI * 2 + .035, 0]} castShadow>
        <cylinderGeometry args={[.204, .204, .013, 10, 1, false, .035, Math.PI * 2 / segments - .075]} />
        <meshStandardMaterial color={i % 3 === 0 ? '#efb64f' : '#f3a936'} roughness={.48} />
      </mesh>)}
    </group>
    <mesh position={[.25, .105, -.18]} scale={[1, .94, .94]} castShadow><sphereGeometry args={[.112, 24, 18]} /><meshStandardMaterial color="#de922c" roughness={.9} /></mesh>
  </group>;
}

function Sandalwood() {
  return <group>
    {[[-.15, .065, .02], [.035, .057, .09], [.18, .08, -.07]].map((position, i) => <group key={i} position={position as Triplet} rotation={[Math.PI / 2, .1, i * .55 - .3]}>
      <mesh castShadow receiveShadow><cylinderGeometry args={[.05, .059, .34 - i * .04, 9]} /><meshStandardMaterial color={['#9b6746', '#bd8a61', '#8c593e'][i]} roughness={1} /></mesh>
      {[-1, 1].map(sign => <mesh key={sign} position={[0, sign * (.171 - i * .02), 0]} rotation={[sign === 1 ? 0 : Math.PI, 0, 0]}>
        <cylinderGeometry args={[.047, .047, .002, 18]} /><meshStandardMaterial color="#ccab7c" roughness={1} />
      </mesh>)}
    </group>)}
    <Leaf position={[-.15, .02, -.05]} rotation={[.04, -2.7, 0]} length={.27} width={.13} />
  </group>;
}

function Coconut() {
  return <group>
    <Leaf position={[-.03, .02, .03]} rotation={[.15, -2.2, -.15]} length={.43} width={.12} />
    <group position={[.035, .165, .015]} rotation={[.35, .12, -.23]}>
      <mesh castShadow receiveShadow><sphereGeometry args={[.21, 36, 22, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color="#795237" roughness={1} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, .001, 0]}><sphereGeometry args={[.183, 36, 22, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color="#ede8cf" roughness={.65} side={THREE.BackSide} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.195, .014, 8, 48]} /><meshStandardMaterial color="#faf2db" roughness={.8} /></mesh>
    </group>
  </group>;
}

/** Stationary, source-matched ornaments; y=0 is the pedestal surface. */
export default function HeroBotanicals({ kind, scale = 1, accent = false }: { kind: BotanicalKind; scale?: number; accent?: boolean }) {
  let botanical;
  switch (kind) {
    case 'rose': botanical = accent ? <RoseLoosePetals /> : <RoseBloom />; break;
    case 'lavender': botanical = accent ? <LavenderSprig position={[.025, .025, .02]} rotation={[-.95, .15, -.65]} /> : <Lavender />; break;
    case 'almond': botanical = accent ? <group><Almond position={[-.095, .07, .04]} rotation={[1.28, .3, -.4]} /><Almond position={[.09, .069, -.02]} rotation={[1.28, 1.3, .15]} /></group> : <Almonds />; break;
    case 'rosemary': botanical = accent ? <FoliageSprig needle rotation={[.1, .55, -.15]} /> : <Rosemary />; break;
    case 'citrus': botanical = <Citrus />; break;
    case 'sandalwood': botanical = <Sandalwood />; break;
    case 'coconut': botanical = <Coconut />; break;
    case 'moringa': botanical = <group position={[.1, .01, .16]}><FoliageSprig round rotation={[.05, .65, -.15]} />{!accent && <FoliageSprig round rotation={[-.05, -.3, .18]} />}</group>; break;
    default: botanical = <group position={[.1, .015, .17]}><FoliageSprig rotation={[.12, .65, -.15]} />{!accent && <FoliageSprig rotation={[-.1, -.45, .2]} />}</group>;
  }
  return <group scale={scale} name={`hero-botanical-${kind}${accent ? '-accent' : ''}`}>{botanical}</group>;
}
