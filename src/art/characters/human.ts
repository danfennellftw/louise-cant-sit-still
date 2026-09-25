import * as THREE from 'three';
import { G, put } from '../geo';
import { M, PAL } from '../materials';
import { clamp, lerp } from '../../engine/util';
import { littleKicks } from './dance';

export type HumanState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'work'
  | 'lift'
  | 'spin'
  | 'ride'
  | 'lie'
  | 'sit'
  | 'phone'
  | 'wave'
  | 'cheer'
  | 'stumble'
  | 'relax'
  | 'massage'
  | 'stretch'
  | 'couch'
  | 'shop'
  | 'sing'
  | 'dance'
  | 'cringe';

interface Joints {
  root: THREE.Group;
  body: THREE.Group;
  hips: THREE.Group;
  spine: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  shL: THREE.Group;
  elL: THREE.Group;
  shR: THREE.Group;
  elR: THREE.Group;
  hipL: THREE.Group;
  knL: THREE.Group;
  hipR: THREE.Group;
  knR: THREE.Group;
  handR: THREE.Group;
  thumbL: THREE.Group;
  thumbR: THREE.Group;
  pony: THREE.Group[];
}

type Pose = Record<PoseKey, number>;
type PoseKey =
  | 'bY'
  | 'bZ'
  | 'bRx'
  | 'spX'
  | 'spY'
  | 'spZ'
  | 'hdX'
  | 'hdY'
  | 'hdZ'
  | 'shLX'
  | 'shLZ'
  | 'elL'
  | 'shRX'
  | 'shRZ'
  | 'elR'
  | 'hipLX'
  | 'hipLZ'
  | 'knL'
  | 'hipRX'
  | 'hipRZ'
  | 'knR';

const KEYS: PoseKey[] = [
  'bY', 'bZ', 'bRx', 'spX', 'spY', 'spZ', 'hdX', 'hdY', 'hdZ',
  'shLX', 'shLZ', 'elL', 'shRX', 'shRZ', 'elR', 'hipLX', 'hipLZ', 'knL', 'hipRX', 'hipRZ', 'knR',
];

const zero = (): Pose => Object.fromEntries(KEYS.map((k) => [k, 0])) as Pose;
const LEG = 0.42;

export interface HumanLook {
  skin: string;
  top: string;
  topStyle: 'tank' | 'polo' | 'tee';
  bottom: string;
  bottomStyle: 'wide' | 'jeans' | 'leggings';
  shoe: string;
  sole: string;
  hair: 'louise' | 'dan' | 'short' | 'bun' | 'pony' | 'bob';
  hairColors: [string, string, string];
  hero: boolean;
  lashes?: boolean;
  glasses?: boolean;
  watch?: boolean;
  earrings?: boolean;
  smile?: 'big' | 'soft';
  slim?: number;
  scale?: number;
}

export const LOUISE_LOOK: HumanLook = {
  skin: PAL.louiseSkin,
  top: PAL.louiseTank,
  topStyle: 'tank',
  bottom: PAL.louisePants,
  bottomStyle: 'wide',
  shoe: PAL.louiseShoe,
  sole: PAL.louiseSole,
  hair: 'louise',
  hairColors: [PAL.louiseHairRoot, PAL.louiseHairMid, PAL.louiseHairTip],
  hero: true,
  lashes: true,
  earrings: true,
  smile: 'big',
  slim: 0.9,
  scale: 0.94,
};

export const DAN_LOOK: HumanLook = {
  skin: PAL.danSkin,
  top: PAL.danPolo,
  topStyle: 'polo',
  bottom: PAL.danJeans,
  bottomStyle: 'jeans',
  shoe: PAL.danShoe,
  sole: '#f1ede6',
  hair: 'dan',
  hairColors: [PAL.danHair, PAL.danHair, PAL.danHair],
  hero: true,
  glasses: true,
  watch: true,
  smile: 'soft',
  slim: 1.05,
  scale: 1.02,
};

function lathe(points: [number, number][], seg = 20) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  g.computeVertexNormals();
  return g;
}

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function grp(parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/** Builds a stylized, rigged human from a look spec (hero or background NPC detail). */
export function buildHuman(look: HumanLook): Joints {
  const slim = look.slim ?? 1;
  const skin = M.std(look.skin, 0.62);
  const top =
    look.topStyle === 'tank'
      ? M.fabric(look.top, '#d38a8a', 0.8, 0.5)
      : M.fabric(look.top, '#6a6a78', 0.85, 0.4);
  const bottom = M.fabric(look.bottom, look.bottomStyle === 'jeans' ? '#5b6f9c' : '#ffffff', 0.9, 0.35);
  const shoe = M.gloss(look.shoe, 0.45, 0.5);
  const sole = M.std(look.sole, 0.7);

  const root = new THREE.Group();
  const body = grp(root);
  const hips = grp(body, 0, 0.9, 0);
  put(hips, G.sphere(0.155, 18, 12), bottom, 0, 0, 0, { s: [1.02 * slim, 0.72, 0.82] });

  const spine = grp(hips, 0, 0.04, 0);
  const torsoPts: [number, number][] =
    look.topStyle === 'tank'
      ? [[0.001, -0.02], [0.125, 0.0], [0.118, 0.1], [0.142, 0.22], [0.15, 0.3], [0.13, 0.38], [0.07, 0.42], [0.001, 0.425]]
      : [[0.001, -0.02], [0.145, 0.0], [0.148, 0.12], [0.16, 0.26], [0.16, 0.34], [0.14, 0.4], [0.07, 0.43], [0.001, 0.435]];
  const torso = put(spine, lathe(torsoPts), top, 0, 0, 0, { s: [slim, 1, 0.74] });
  torso.geometry.userData.shared = false;
  if (look.topStyle === 'polo') {
    put(spine, G.torus(0.068, 0.022, Math.PI * 2, 8, 20), top, 0, 0.415, 0.0, { rx: Math.PI / 2 - 0.25, s: [1.05, 1, 0.9] });
    const btn = M.std('#3a3a40', 0.4);
    put(spine, G.box(0.03, 0.1, 0.01, 0.004), M.std('#26262b', 0.8), 0, 0.35, 0.11);
    put(spine, G.sphere(0.008), btn, 0, 0.37, 0.117);
    put(spine, G.sphere(0.008), btn, 0, 0.33, 0.118);
  }

  const neck = grp(spine, 0, 0.42, 0);
  put(neck, G.cyl(0.048, 0.056, 0.12, 12), skin, 0, 0.03, 0);
  const head = grp(neck, 0, 0.23, 0.01);
  put(head, G.sphere(0.17, 26, 20), skin, 0, 0, 0, { s: [0.96, 1.02, 0.98] });
  // jaw/chin volume for a more sculpted silhouette
  put(head, G.sphere(0.12, 18, 12), skin, 0, -0.075, 0.035, { s: [1.05, 0.8, 1] });

  buildFace(head, look, skin);
  const pony = buildHair(head, look);

  const armOff = 0.185 * slim;
  const shL = grp(spine, armOff, 0.355, 0);
  const shR = grp(spine, -armOff, 0.355, 0);
  const elL = grp(shL, 0, -0.27, 0);
  const elR = grp(shR, 0, -0.27, 0);
  const upperR = 0.046 * slim;
  for (const [sh, el, side] of [[shL, elL, 1], [shR, elR, -1]] as const) {
    put(sh, G.sphere(0.058 * slim, 12, 10), look.topStyle === 'tank' ? skin : top, 0, -0.01, 0);
    put(sh, G.capsule(upperR, 0.19, 4, 10), skin, 0, -0.135, 0);
    if (look.topStyle !== 'tank') {
      put(sh, G.cyl(0.066 * slim, 0.06 * slim, 0.14, 12), top, 0.004 * side, -0.07, 0);
    }
    put(el, G.capsule(0.04 * slim, 0.17, 4, 10), skin, 0, -0.11, 0);
    put(el, G.sphere(0.048, 12, 10), skin, 0, -0.25, 0.005, { s: [0.8, 1.05, 0.6] });
    if (look.watch && side === 1) {
      put(el, G.cyl(0.047, 0.047, 0.03, 14), M.gloss('#18181b', 0.3, 0.6), 0, -0.19, 0);
      put(el, G.cyl(0.022, 0.022, 0.012, 14), M.metal('#9aa0a8', 0.25), 0, -0.19, 0.04, { rx: Math.PI / 2 });
    }
  }
  const handR = grp(elR, 0, -0.26, 0.02);
  const thumbL = grp(elL, 0.036 * slim, -0.28, 0.02);
  const thumbR = grp(elR, -0.036 * slim, -0.28, 0.02);
  put(thumbL, G.capsule(0.012, 0.05, 3, 6), skin, 0, -0.025, 0);
  put(thumbR, G.capsule(0.012, 0.05, 3, 6), skin, 0, -0.025, 0);

  const legOff = 0.082 * slim;
  const hipL = grp(hips, legOff, -0.02, 0);
  const hipR = grp(hips, -legOff, -0.02, 0);
  const knL = grp(hipL, 0, -LEG, 0);
  const knR = grp(hipR, 0, -LEG, 0);
  for (const [hp, kn] of [[hipL, knL], [hipR, knR]] as const) {
    put(hp, G.capsule(0.074 * slim, 0.28, 4, 12), bottom, 0, -0.2, 0);
    if (look.bottomStyle === 'wide') {
      put(kn, G.cyl(0.07, 0.098, 0.36, 16, true), bottom, 0, -0.2, 0);
      put(kn, G.cyl(0.042, 0.042, 0.08, 10), skin, 0, -0.37, 0);
    } else if (look.bottomStyle === 'leggings') {
      put(kn, G.capsule(0.055, 0.3, 4, 10), bottom, 0, -0.2, 0);
    } else {
      put(kn, G.capsule(0.062 * slim, 0.3, 4, 10), bottom, 0, -0.2, 0);
    }
    put(kn, G.box(0.11, 0.075, 0.25, 0.035), shoe, 0, -0.39, 0.045);
    put(kn, G.box(0.115, 0.025, 0.255, 0.01), sole, 0, -0.43, 0.047);
  }

  return { root, body, hips, spine, neck, head, shL, elL, shR, elR, hipL, knL, hipR, knR, handR, thumbL, thumbR, pony };
}

function buildFace(head: THREE.Group, look: HumanLook, skin: THREE.Material) {
  if (!look.hero) {
    const dot = M.std('#241915', 0.4);
    put(head, G.sphere(0.02, 10, 8), dot, 0.058, 0.0, 0.158, { s: [1, 1.2, 0.5], cast: false });
    put(head, G.sphere(0.02, 10, 8), dot, -0.058, 0.0, 0.158, { s: [1, 1.2, 0.5], cast: false });
    put(head, G.sphere(0.03, 10, 8), skin, 0.165, -0.01, 0, { s: [0.5, 1, 0.8] });
    put(head, G.sphere(0.03, 10, 8), skin, -0.165, -0.01, 0, { s: [0.5, 1, 0.8] });
    return;
  }
  const white = M.std('#fbf7f2', 0.3);
  const iris = M.gloss(look.lashes ? '#3a2014' : '#4a3a2a', 0.15, 1);
  const shine = M.glow('#ffffff', 1.2);
  const dark = M.std(look.lashes ? '#1a110d' : '#3b2a1e', 0.6);
  const eyeY = 0.005;
  for (const s of [1, -1]) {
    const ex = 0.06 * s;
    put(head, G.sphere(0.037, 16, 12), white, ex, eyeY, 0.143, { s: [1.18, 1, 0.42], cast: false });
    put(head, G.sphere(0.029, 16, 12), iris, ex + 0.002 * s, eyeY - 0.002, 0.153, { s: [1, 1.12, 0.45], cast: false });
    put(head, G.sphere(0.0085, 8, 6), shine, ex + 0.011, eyeY + 0.012, 0.166, { cast: false });
    if (look.lashes) {
      put(head, G.box(0.084, 0.013, 0.02, 0.005), dark, ex + 0.004 * s, eyeY + 0.03, 0.153, { rz: -0.18 * s, cast: false });
      put(head, G.box(0.03, 0.01, 0.015, 0.004), dark, ex + 0.046 * s, eyeY + 0.036, 0.142, { rz: 0.5 * s, cast: false });
    }
    put(head, G.box(0.072, 0.017, 0.022, 0.007), dark, ex + 0.002 * s, 0.078, 0.148, { rz: -0.12 * s, cast: false });
    // ears
    put(head, G.sphere(0.034, 12, 10), skin, 0.162 * s, -0.012, 0.0, { s: [0.5, 1, 0.8] });
    if (look.earrings) put(head, G.sphere(0.011, 8, 6), M.metal(PAL.gold, 0.25), 0.168 * s, -0.04, 0.012, { cast: false });
    const blush = new THREE.MeshBasicMaterial({ color: '#ff7a78', transparent: true, opacity: look.lashes ? 0.28 : 0.12, depthWrite: false });
    put(head, G.circle(0.032, 16), blush, 0.095 * s, -0.045, 0.134, { ry: 0.55 * s, cast: false, receive: false });
  }
  put(head, G.sphere(0.022, 12, 10), skin, 0, -0.035, 0.168, { s: [1, 0.9, 1] });
  if (look.smile === 'big') {
    const teeth = new THREE.Mesh(new THREE.CircleGeometry(0.046, 20, Math.PI, Math.PI), white);
    teeth.position.set(0, -0.083, 0.153);
    teeth.rotation.x = -0.35;
    teeth.scale.set(1, 0.62, 1);
    head.add(teeth);
    put(head, G.torus(0.046, 0.009, Math.PI, 6, 16), M.std(PAL.lip, 0.4), 0, -0.084, 0.152, { rx: -0.35, rz: Math.PI, s: [1, 0.66, 1], cast: false });
    put(head, G.box(0.09, 0.01, 0.01, 0.004), M.std(PAL.lip, 0.4), 0, -0.083, 0.152, { rx: -0.35, cast: false });
  } else {
    put(head, G.torus(0.04, 0.008, Math.PI * 0.65, 6, 14), M.std('#8a4a3e', 0.5), 0, -0.07, 0.155, {
      rx: -0.3,
      rz: Math.PI + Math.PI * 0.175,
      s: [1, 0.55, 1],
      cast: false,
    });
  }
  if (look.glasses) {
    const frame = M.gloss('#111114', 0.25, 0.8);
    const shape = roundedRectShape(0.085, 0.066, 0.018);
    const hole = roundedRectShape(0.064, 0.047, 0.012);
    shape.holes.push(hole as unknown as THREE.Path);
    const lensGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.014, bevelEnabled: false, curveSegments: 4 });
    for (const s of [1, -1]) {
      const l = new THREE.Mesh(lensGeo, frame);
      l.position.set(0.06 * s, 0.008, 0.166);
      l.rotation.y = 0.12 * s;
      head.add(l);
      put(head, G.box(0.01, 0.012, 0.17, 0.004), frame, 0.108 * s, 0.018, 0.085, { rx: 0.05, cast: false });
    }
    put(head, G.box(0.03, 0.01, 0.012, 0.004), frame, 0, 0.02, 0.178, { cast: false });
    // stubble shading
    const stubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.1715, 22, 12, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.6, Math.PI * 0.28),
      M.std('#b98f74', 0.9)
    );
    stubble.scale.set(0.96, 1.02, 0.98);
    head.add(stubble);
  }
}

function hairMat(c: string) {
  return M.fabric(c, '#fff0dc', 0.55, 0.35);
}

function buildHair(head: THREE.Group, look: HumanLook): THREE.Group[] {
  const [c0, c1, c2] = look.hairColors;
  const m0 = hairMat(c0);
  const pony: THREE.Group[] = [];
  const cap = (r: number, len: number, tilt: number, mat: THREE.Material, sy = 1) =>
    put(head, G.partSphere(r, len, 26, 14), mat, 0, 0.0, 0, { rx: tilt, s: [1, sy, 1] });

  if (look.hair === 'louise') {
    cap(0.182, Math.PI * 0.6, -0.42, m0, 1.03);
    put(head, G.sphere(0.168, 18, 14), m0, 0, -0.01, -0.05, { s: [1.02, 1, 0.96] });
    // sleek side sweep over ears
    for (const s of [1, -1]) put(head, G.sphere(0.07, 12, 10), m0, 0.13 * s, 0.04, -0.03, { s: [0.55, 1.1, 1] });
    put(head, G.torus(0.032, 0.013, Math.PI * 2, 8, 16), M.std('#b58a5a', 0.6), 0, 0.17, -0.1, { rx: 1.2 });
    const segs: [number, number, number, string][] = [
      [0.13, 0.062, 2.35, c0],
      [0.14, 0.078, -0.7, c0],
      [0.16, 0.084, -0.85, c1],
      [0.18, 0.076, -0.55, c1],
      [0.17, 0.062, -0.25, c2],
      [0.12, 0.04, -0.1, c2],
    ];
    let parent: THREE.Object3D = grp(head, 0, 0.175, -0.11);
    let prevLen = 0;
    for (const [len, rad, rot, col] of segs) {
      const g = grp(parent, 0, -prevLen * 0.85, 0);
      g.rotation.x = rot;
      g.userData.rest = rot;
      put(g, G.sphere(rad, 14, 10), hairMat(col), 0, -len / 2, 0, { s: [1.12, len / rad / 1.6, 0.9] });
      pony.push(g);
      parent = g;
      prevLen = len;
    }
  } else if (look.hair === 'dan') {
    cap(0.179, Math.PI * 0.5, -0.28, m0, 1.02);
    put(head, G.sphere(0.166, 18, 14), m0, 0, 0.0, -0.045);
    put(head, G.box(0.17, 0.06, 0.1, 0.03), m0, 0.015, 0.155, 0.085, { rx: -0.25, rz: -0.08 });
    for (const s of [1, -1]) put(head, G.sphere(0.06, 10, 8), m0, 0.14 * s, 0.05, -0.02, { s: [0.5, 1, 1.1] });
  } else if (look.hair === 'short') {
    cap(0.178, Math.PI * 0.5, -0.25, m0);
    put(head, G.sphere(0.165, 14, 10), m0, 0, 0, -0.045);
  } else if (look.hair === 'bob') {
    cap(0.185, Math.PI * 0.62, -0.2, m0);
    put(head, G.sphere(0.18, 14, 10), m0, 0, -0.05, -0.04, { s: [1.1, 0.9, 1] });
  } else if (look.hair === 'bun') {
    cap(0.18, Math.PI * 0.58, -0.35, m0);
    put(head, G.sphere(0.17, 14, 10), m0, 0, -0.01, -0.05);
    put(head, G.sphere(0.075, 12, 10), hairMat(c1), 0, 0.17, -0.07);
  } else {
    cap(0.18, Math.PI * 0.58, -0.35, m0);
    put(head, G.sphere(0.17, 14, 10), m0, 0, -0.01, -0.05);
    const g = grp(head, 0, 0.12, -0.15);
    g.rotation.x = 0.5;
    g.userData.rest = 0.5;
    g.userData.len = 0.2;
    put(g, G.sphere(0.06, 10, 8), hairMat(c1), 0, -0.1, 0, { s: [1, 2, 0.9] });
    pony.push(g);
  }
  return pony;
}

/** Procedural animator: per-state pose functions + crossfade + ponytail spring. */
export class HumanRig {
  readonly j: Joints;
  readonly root: THREE.Group;
  state: HumanState = 'idle';
  private prev: HumanState = 'idle';
  private blend = 1;
  private t = Math.random() * 10;
  private phase = 0;
  speed = 0;
  antsy = 0;
  private pose = zero();
  private ponyVel: number[] = [];
  private ponyOff: number[] = [];
  private ponyZ: number[] = [];
  private lastFacing = 0;
  private danceT = 0;
  private phone: THREE.Mesh;
  onFootstep?: () => void;
  private lastStepSign = 0;

  constructor(look: HumanLook) {
    this.j = buildHuman(look);
    this.root = this.j.root;
    this.root.scale.setScalar(look.scale ?? 1);
    this.j.pony.forEach(() => {
      this.ponyVel.push(0);
      this.ponyOff.push(0);
      this.ponyZ.push(0);
    });
    this.phone = put(this.j.handR, G.box(0.06, 0.12, 0.012, 0.008), M.gloss('#1b1b1f', 0.2, 1), 0, -0.02, 0.02, { rx: 0.2 });
    this.phone.visible = false;
  }

  setState(s: HumanState) {
    if (s === this.state) return;
    if (s === 'dance') this.danceT = 0;
    this.prev = this.state;
    this.state = s;
    this.blend = 0;
  }

  private computePose(s: HumanState, out: Pose) {
    const t = this.t;
    const ph = this.phase;
    for (const k of KEYS) out[k] = 0;
    const sp = clamp(this.speed, 0, 1.6);
    switch (s) {
      case 'idle': {
        const a = this.antsy;
        const bounce = Math.abs(Math.sin(t * (5 + a * 5))) * (0.012 + a * 0.03);
        out.bY = bounce;
        out.spZ = Math.sin(t * 1.3) * 0.04;
        out.spX = 0.02;
        out.hdY = Math.sin(t * 0.7) * 0.35 + Math.sin(t * 2.9) * a * 0.2;
        out.hdX = Math.sin(t * 1.1) * 0.05 - 0.05;
        out.shLZ = 0.55;
        out.shLX = 0.1;
        out.elL = -1.7;
        out.shRZ = -0.12 - Math.sin(t * 1.4) * 0.05;
        out.shRX = Math.sin(t * (1.8 + a * 6)) * (0.05 + a * 0.35);
        out.elR = -0.25 - a * 0.6;
        const tap = Math.max(0, Math.sin(t * (4 + a * 6))) * (0.05 + a * 0.25);
        out.hipRX = -tap;
        out.knR = tap * 1.6;
        out.hipLZ = 0.03;
        out.hipRZ = -0.05;
        break;
      }
      case 'walk':
      case 'run': {
        const run = s === 'run' ? 1 : 0;
        const amp = lerp(0.45, 0.8, run) * clamp(sp * 1.3, 0.35, 1);
        const sn = Math.sin(ph);
        const cs = Math.cos(ph);
        out.hipLX = -sn * amp;
        out.hipRX = sn * amp;
        out.knL = Math.max(0, cs) * lerp(0.7, 1.4, run) + 0.05;
        out.knR = Math.max(0, -cs) * lerp(0.7, 1.4, run) + 0.05;
        out.shLX = sn * amp * 0.9;
        out.shRX = -sn * amp * 0.9;
        out.shLZ = 0.08;
        out.shRZ = -0.08;
        out.elL = lerp(-0.35, -1.3, run);
        out.elR = lerp(-0.35, -1.3, run);
        out.bY = (1 - Math.abs(sn)) * lerp(0.03, 0.06, run) - 0.01;
        out.spY = sn * 0.12;
        out.spX = lerp(0.05, 0.22, run);
        out.hdX = -out.spX * 0.6;
        out.hdY = -sn * 0.06;
        break;
      }
      case 'work': {
        const w = Math.sin(t * 9);
        out.spX = 0.35;
        out.hdX = 0.25;
        out.shLX = -0.95 + w * 0.3;
        out.shRX = -0.95 - w * 0.3;
        out.elL = -0.7 + Math.sin(t * 7) * 0.2;
        out.elR = -0.7 - Math.sin(t * 7) * 0.2;
        out.shLZ = 0.15;
        out.shRZ = -0.15;
        out.bY = Math.abs(Math.sin(t * 4.5)) * 0.02;
        out.hipLX = -0.1;
        out.knL = 0.2;
        out.spY = Math.sin(t * 2) * 0.15;
        break;
      }
      case 'shop': {
        out.spX = 0.1;
        out.hdY = Math.sin(t * 1.3) * 0.5;
        out.hdX = 0.1;
        out.shRX = -1.0 + Math.sin(t * 3) * 0.3;
        out.elR = -0.6;
        out.shRZ = -0.3;
        out.shLZ = 0.55;
        out.elL = -1.7;
        out.bY = Math.abs(Math.sin(t * 3)) * 0.015;
        break;
      }
      case 'lift': {
        const s01 = (1 - Math.cos(t * 3.2)) / 2;
        const th = 1.05 * s01;
        out.bY = -2 * LEG * (1 - Math.cos(th));
        out.hipLX = -th * 1.1;
        out.hipRX = -th * 1.1;
        out.knL = th * 2;
        out.knR = th * 2;
        out.hipLZ = 0.12;
        out.hipRZ = -0.12;
        out.spX = 0.45 * s01;
        out.shLX = -2.6;
        out.shRX = -2.6;
        out.shLZ = 0.35;
        out.shRZ = -0.35;
        out.elL = -1.9;
        out.elR = -1.9;
        out.hdX = -0.3 * s01;
        break;
      }
      case 'spin':
      case 'ride': {
        const spin = s === 'spin';
        const cad = spin ? 11 : 7;
        const pp = t * cad;
        out.bY = spin ? 0.08 : 0.05;
        out.spX = spin ? 0.6 : 0.3;
        out.hdX = spin ? -0.45 : -0.22;
        out.shLX = spin ? -1.25 : -1.0;
        out.shRX = spin ? -1.25 : -1.0;
        out.shLZ = 0.12;
        out.shRZ = -0.12;
        out.elL = -0.35;
        out.elR = -0.35;
        out.hipLX = -1.1 + Math.sin(pp) * 0.42;
        out.hipRX = -1.1 - Math.sin(pp) * 0.42;
        out.knL = 1.3 + Math.cos(pp) * 0.45;
        out.knR = 1.3 - Math.cos(pp) * 0.45;
        out.spZ = spin ? Math.sin(pp) * 0.06 : 0;
        out.bZ = spin ? Math.sin(pp * 2) * 0.01 : 0;
        break;
      }
      case 'couch':
      case 'relax': {
        const couch = s === 'couch';
        out.bY = couch ? -0.44 : -0.45;
        out.hipLX = -1.5;
        out.hipRX = -1.5;
        out.knL = 1.5;
        out.knR = 1.5;
        out.spX = couch ? -0.2 : -0.12;
        out.hdX = couch ? 0.1 + Math.sin(t * 0.5) * 0.05 : -0.2;
        out.hdY = couch ? Math.sin(t * 0.3) * 0.15 : 0;
        out.shLX = couch ? -0.9 : -0.55;
        out.shRX = couch ? -0.9 : -0.55;
        out.elL = couch ? -1.2 : -0.7;
        out.elR = couch ? -1.2 : -0.7;
        out.shLZ = 0.15;
        out.shRZ = -0.15;
        out.bY += Math.sin(t * 1.5) * 0.005;
        break;
      }
      case 'lie': {
        out.bRx = -Math.PI / 2;
        out.bY = 0.72;
        out.bZ = 0.9;
        out.hdX = -0.55;
        out.shLX = -0.5;
        out.shRX = -0.5;
        out.elL = -1.4;
        out.elR = -1.4;
        out.shLZ = 0.2;
        out.shRZ = -0.2;
        out.hipLX = -0.1;
        out.knL = 0.2;
        out.bY += Math.sin(t * 1.1) * 0.006;
        break;
      }
      case 'massage': {
        out.bRx = Math.PI / 2;
        out.bY = 0.92;
        out.bZ = -0.85;
        out.hdY = 1.2;
        out.shLX = 0.1;
        out.shRX = 0.1;
        out.shLZ = 0.15;
        out.shRZ = -0.15;
        out.spX = Math.sin(t * 2) * 0.02;
        break;
      }
      case 'sit': {
        out.bY = -0.72;
        out.hipLX = -1.45;
        out.hipRX = -1.35;
        out.knL = 0.35;
        out.knR = 0.55;
        out.hipLZ = 0.2;
        out.hipRZ = -0.2;
        out.spX = -0.25;
        out.hdX = 0.25;
        out.hdZ = 0.2;
        out.shLX = 0.6;
        out.shRX = 0.6;
        out.shLZ = 0.35;
        out.shRZ = -0.35;
        break;
      }
      case 'phone': {
        const pace = Math.sin(t * 5);
        out.hipLX = -pace * 0.25;
        out.hipRX = pace * 0.25;
        out.knL = Math.max(0, Math.cos(t * 5)) * 0.4;
        out.knR = Math.max(0, -Math.cos(t * 5)) * 0.4;
        out.bY = (1 - Math.abs(pace)) * 0.02;
        out.shRX = -0.5;
        out.shRZ = -0.55;
        out.elR = -2.35;
        out.shLX = pace * 0.4 - 0.2;
        out.shLZ = 0.3;
        out.elL = -0.6 + Math.sin(t * 3) * 0.3;
        out.hdZ = -0.15;
        out.hdY = Math.sin(t * 0.8) * 0.3;
        break;
      }
      case 'wave': {
        out.shRZ = -2.5 + Math.sin(t * 10) * 0.25;
        out.elR = -0.35;
        out.shLZ = 0.55;
        out.elL = -1.7;
        out.hdZ = 0.1;
        out.bY = Math.abs(Math.sin(t * 5)) * 0.02;
        break;
      }
      case 'cheer': {
        const hop = Math.max(0, Math.sin(t * 8));
        out.bY = hop * 0.12;
        out.shLZ = 2.5;
        out.shRZ = -2.5;
        out.elL = -0.2;
        out.elR = -0.2;
        out.knL = hop * 0.5;
        out.knR = hop * 0.5;
        out.hipLX = -hop * 0.25;
        out.hipRX = -hop * 0.25;
        out.hdX = -0.2;
        break;
      }
      case 'stumble': {
        const f = Math.sin(t * 14);
        out.spX = -0.3;
        out.hdX = -0.3;
        out.shLZ = 1.4 + f * 0.4;
        out.shRZ = -1.4 - f * 0.4;
        out.shLX = -0.5;
        out.shRX = 0.4;
        out.hipLX = -0.5;
        out.knR = 0.4;
        break;
      }
      case 'stretch': {
        const side = Math.sin(t * 1.6);
        out.shLZ = 2.9;
        out.shRZ = -2.9;
        out.elL = -0.2;
        out.elR = -0.2;
        out.spZ = side * 0.35;
        out.hdZ = side * 0.2;
        out.hipLZ = 0.15;
        out.hipRZ = -0.15;
        break;
      }
      case 'sing': {
        const sway = Math.sin(t * 3.1);
        out.shRZ = -2.35 + Math.sin(t * 6.5) * 0.18;
        out.elR = -0.45;
        out.shLZ = 0.85;
        out.elL = -1.45;
        out.shLX = 0.15;
        out.spZ = sway * 0.14;
        out.spY = sway * 0.08;
        out.hdX = -0.28 + Math.sin(t * 6.5) * 0.1;
        out.hdZ = sway * 0.12;
        out.bY = Math.abs(Math.sin(t * 6.5)) * 0.035;
        out.hipLX = sway * 0.08;
        out.hipRX = -sway * 0.08;
        break;
      }
      case 'dance': {
        const k = littleKicks(this.danceT);
        out.shLX = -1.05 - k.jabL * 0.55;
        out.shRX = -1.05 - k.jabR * 0.55;
        out.shLZ = 1.15 + k.jabL * 0.4;
        out.shRZ = -1.15 - k.jabR * 0.4;
        out.elL = -0.22 * (1 - k.jabL);
        out.elR = -0.22 * (1 - k.jabR);
        out.hdX = -0.08 - k.heave * 0.2;
        out.hdZ = k.bob * 0.45;
        out.spX = Math.max(-0.06, Math.min(0.28, k.heave * 0.3));
        out.spZ = Math.max(-0.26, Math.min(0.26, k.bob * 0.12));
        const lift = 1.15;
        out.hipLZ = -out.spZ - lift * k.kickL;
        out.hipLX = -out.spX - 0.3 * k.kickL;
        out.knL = 0.15 * k.kickL * (1 - k.kickL);
        out.hipRZ = -out.spZ + lift * k.kickR;
        out.hipRX = -out.spX - 0.3 * k.kickR;
        out.knR = 0.15 * k.kickR * (1 - k.kickR);
        break;
      }
      case 'cringe': {
        out.bY = -0.38;
        out.hipLX = -1.35;
        out.hipRX = -1.4;
        out.knL = 1.35;
        out.knR = 1.45;
        out.spX = -0.42;
        out.hdX = 0.05;
        out.hdZ = Math.sin(t * 16) * 0.22;
        out.hdY = Math.sin(t * 9) * 0.3;
        out.shLZ = 1.55;
        out.shRZ = -1.55;
        out.elL = -2.15;
        out.elR = -2.15;
        out.shLX = -0.35;
        out.shRX = -0.35;
        break;
      }
    }
  }

  private tmpA = zero();
  private tmpB = zero();

  update(dt: number, facing: number) {
    this.t += dt;
    if (this.state === 'dance') this.danceT += dt;
    const locomotion = this.state === 'walk' || this.state === 'run';
    if (locomotion) {
      this.phase += dt * (this.state === 'run' ? 13 : 9.5) * clamp(this.speed, 0.4, 1.4);
      const sign = Math.sign(Math.sin(this.phase));
      if (sign !== this.lastStepSign) {
        this.lastStepSign = sign;
        this.onFootstep?.();
      }
    }
    this.blend = Math.min(1, this.blend + dt * 5);
    this.computePose(this.state, this.tmpA);
    if (this.blend < 1) {
      this.computePose(this.prev, this.tmpB);
      const k = this.blend * this.blend * (3 - 2 * this.blend);
      for (const key of KEYS) this.pose[key] = lerp(this.tmpB[key], this.tmpA[key], k);
    } else {
      for (const key of KEYS) this.pose[key] = this.tmpA[key];
    }
    this.apply(dt, facing);
  }

  private apply(dt: number, facing: number) {
    const p = this.pose;
    const j = this.j;
    j.body.position.set(0, p.bY, p.bZ);
    j.body.rotation.x = p.bRx;
    j.spine.rotation.set(p.spX, p.spY, p.spZ);
    j.neck.rotation.set(p.hdX * 0.4, p.hdY * 0.4, p.hdZ * 0.4);
    j.head.rotation.set(p.hdX * 0.6, p.hdY * 0.6, p.hdZ * 0.6);
    j.shL.rotation.set(p.shLX, 0, p.shLZ);
    j.shR.rotation.set(p.shRX, 0, p.shRZ);
    j.elL.rotation.x = p.elL;
    j.elR.rotation.x = p.elR;
    j.hipL.rotation.set(p.hipLX, 0, p.hipLZ);
    j.hipR.rotation.set(p.hipRX, 0, p.hipRZ);
    j.knL.rotation.x = p.knL;
    j.knR.rotation.x = p.knR;
    const flare = this.state === 'dance' ? 1.3 + Math.sin(this.t * 22) * 0.18 : 0.28;
    j.thumbL.rotation.set(0.35, 0, -flare);
    j.thumbR.rotation.set(0.35, 0, flare);
    this.phone.visible = this.state === 'phone';

    // Ponytail: damped springs react to speed, bounce and turning.
    const turn = (facing - this.lastFacing) / Math.max(dt, 0.001);
    this.lastFacing = facing;
    const bob = p.bY;
    const drive = -this.speed * 0.5 - (this.state === 'run' ? 0.25 : 0);
    for (let i = 0; i < j.pony.length; i++) {
      const g = j.pony[i];
      const k = 60 - i * 6;
      const d = 7;
      const target = (i === 0 ? 0 : drive * (0.6 + i * 0.2)) + bob * 3 * (i + 1) * 0.3;
      const acc = (target - this.ponyOff[i]) * k - this.ponyVel[i] * d;
      this.ponyVel[i] += acc * dt;
      this.ponyOff[i] += this.ponyVel[i] * dt;
      this.ponyZ[i] += ((clamp(turn, -6, 6) * -0.04 * (i + 1)) - this.ponyZ[i]) * Math.min(1, dt * 6);
      g.rotation.x = g.userData.rest + this.ponyOff[i] * (i === 0 ? 0.2 : 1) - (p.spX + p.hdX) * (i === 1 ? 0.6 : 0);
      g.rotation.z = this.ponyZ[i] + Math.sin(this.t * 2 + i) * 0.02;
    }
  }
}

const NPC_SKINS = ['#f1c7a8', '#d9a47f', '#b27a55', '#8a5a3c', '#e8b896', '#6e4630'];
const NPC_HAIR = ['#2a1d16', '#5a3b26', '#c9a06a', '#1b1b1b', '#8a4b2a', '#d8c8a8'];
const NPC_STYLES: HumanLook['hair'][] = ['short', 'bun', 'pony', 'bob', 'short'];

/** Background people: fewer parts, no facial detail, deterministic variety. */
export function npcLook(seed: number, tops: string[], bottoms: string[], athletic = false): HumanLook {
  const pick = <T,>(a: T[], k: number) => a[(seed * 7 + k * 13) % a.length];
  const hair = pick(NPC_HAIR, 1);
  return {
    skin: pick(NPC_SKINS, 2),
    top: pick(tops, 3),
    topStyle: athletic ? 'tank' : 'tee',
    bottom: pick(bottoms, 4),
    bottomStyle: athletic ? 'leggings' : 'jeans',
    shoe: pick(['#f5f5f5', '#222', '#e0e6ef', '#c7b299'], 5),
    sole: '#e9e4da',
    hair: pick(NPC_STYLES, 6),
    hairColors: [hair, hair, hair],
    hero: false,
    slim: 0.9 + ((seed * 31) % 20) / 100,
    scale: 0.92 + ((seed * 17) % 14) / 100,
  };
}
