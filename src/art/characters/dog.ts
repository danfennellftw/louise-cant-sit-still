import * as THREE from 'three';
import { G, put } from '../geo';
import { M, PAL } from '../materials';
import { lerp, rng } from '../../engine/util';

export type DogState = 'idle' | 'trot' | 'run' | 'bark' | 'sit' | 'lie' | 'beg' | 'sniff' | 'mark';

export interface DogLook {
  name: 'mochi' | 'leo';
}

interface DogJoints {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  jaw: THREE.Group;
  earL: THREE.Group;
  earR: THREE.Group;
  tail: THREE.Group;
  legs: THREE.Group[];
  mouth: THREE.Group;
}

function grp(parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function fur(c: string) {
  return M.fabric(c, '#fffaf0', 0.95, 0.9);
}

export function buildDog(look: DogLook): DogJoints {
  const mochi = look.name === 'mochi';
  const main = fur(mochi ? PAL.mochiFur : PAL.leoTan);
  const accent = fur(mochi ? PAL.mochiTan : PAL.leoSaddle);
  const legFur = fur(mochi ? '#efe2cc' : '#b97c3e');
  const noseM = M.gloss(PAL.nose, 0.2, 1);
  const eyeM = M.gloss('#1c120e', 0.1, 1);
  const shine = M.glow('#ffffff', 1.4);

  const root = new THREE.Group();
  const body = grp(root);
  const torso = grp(body, 0, 0.2, 0);
  const bodyLen = mochi ? 0.2 : 0.19;
  put(torso, G.sphere(0.13, 18, 14), main, 0, 0, 0, { s: [mochi ? 1.05 : 0.9, mochi ? 0.95 : 0.85, bodyLen / 0.13 * 1.05] });
  put(torso, G.sphere(0.1, 14, 12), main, 0, 0.0, 0.12, { s: [1, 1.05, 0.9] });
  if (!mochi) {
    // Yorkie steel-black saddle
    put(torso, G.partSphere(0.135, Math.PI * 0.42, 18, 10), accent, 0, 0.005, -0.03, { s: [0.95, 0.95, 1.5] });
  }
  const r = rng(mochi ? 3 : 9);
  const tufts = mochi ? 16 : 6;
  for (let i = 0; i < tufts; i++) {
    const a = r() * Math.PI * 2;
    const zz = (r() - 0.5) * 0.3;
    const tone = mochi ? (r() > 0.8 ? '#e9d6bc' : '#f7efe2') : '#c9914e';
    put(torso, G.ico(0.045 + r() * 0.03, 1), fur(tone), Math.cos(a) * 0.11, Math.sin(a) * 0.09 - 0.01, zz, { s: [1, 0.8, 1.2] });
  }

  const legs: THREE.Group[] = [];
  const lx = mochi ? 0.065 : 0.058;
  for (const [x, z] of [[lx, 0.13], [-lx, 0.13], [lx, -0.13], [-lx, -0.13]]) {
    const leg = grp(torso, x, -0.04, z);
    put(leg, G.capsule(mochi ? 0.038 : 0.03, 0.1, 3, 8), legFur, 0, -0.08, 0);
    put(leg, G.sphere(mochi ? 0.042 : 0.034, 10, 8), legFur, 0, -0.145, 0.012, { s: [1, 0.7, 1.2] });
    legs.push(leg);
  }

  const head = grp(torso, 0, 0.1, 0.2);
  const hr = mochi ? 0.125 : 0.11;
  put(head, G.sphere(hr, 20, 16), main, 0, 0.02, 0, { s: [1.05, 0.98, 0.95] });
  const muzzleM = mochi ? fur('#f8f1e6') : fur('#d39a55');
  put(head, G.sphere(0.065, 14, 12), muzzleM, 0, -0.025, hr * 0.8, { s: [1.1, 0.85, 1] });
  put(head, G.sphere(0.026, 12, 10), noseM, 0, -0.005, hr * 0.8 + 0.062, { s: [1.2, 0.9, 1] });
  const jaw = grp(head, 0, -0.055, hr * 0.75);
  put(jaw, G.sphere(0.04, 10, 8), M.std('#b85a5a', 0.6), 0, -0.004, 0.02, { s: [1, 0.4, 1] });
  jaw.visible = true;
  const mouth = grp(head, 0, -0.06, hr + 0.04);

  for (const s of [1, -1]) {
    if (mochi) {
      put(head, G.sphere(0.042, 12, 10), fur(PAL.mochiTan), 0.05 * s, 0.035, hr * 0.78, { s: [1, 1.1, 0.5] });
    }
    put(head, G.sphere(0.024, 12, 10), eyeM, 0.047 * s, 0.035, hr * 0.9, { s: [1, 1.05, 0.7], cast: false });
    put(head, G.sphere(0.007, 6, 5), shine, 0.047 * s + 0.008, 0.045, hr * 0.9 + 0.018, { cast: false });
  }
  if (mochi) {
    put(head, G.ico(0.07, 1), fur('#fbf5ea'), 0, hr * 0.85, 0.02, { s: [1.3, 0.8, 1] });
    put(head, G.ico(0.05, 1), fur('#f4e7d2'), 0.04, hr * 0.8, 0.07);
    put(head, G.ico(0.05, 1), fur('#f4e7d2'), -0.045, hr * 0.78, 0.065);
    put(head, G.ico(0.05, 1), muzzleM, 0, -0.065, hr * 0.7, { s: [1.3, 1, 0.8] });
  } else {
    put(head, G.sphere(0.06, 12, 10), fur('#9a6532'), 0, hr * 0.72, -0.01, { s: [1.3, 0.7, 1.2] });
    put(head, G.ico(0.045, 1), muzzleM, 0, -0.07, hr * 0.72, { s: [1.3, 1.1, 0.8] });
  }

  const earL = grp(head, 0.075, 0.08, 0);
  const earR = grp(head, -0.075, 0.08, 0);
  for (const [ear, s] of [[earL, 1], [earR, -1]] as const) {
    if (mochi) {
      ear.position.set(0.1 * s, 0.05, -0.01);
      put(ear, G.sphere(0.055, 12, 10), fur(PAL.mochiTan), 0.02 * s, -0.06, 0, { s: [0.55, 1.25, 0.9] });
      put(ear, G.ico(0.035, 1), fur('#d9b58c'), 0.03 * s, -0.12, 0.0);
    } else {
      ear.rotation.z = -0.3 * s;
      put(ear, G.cone(0.042, 0.1, 10), fur('#b8783a'), 0, 0.05, 0, { s: [1, 1, 0.45] });
      put(ear, G.cone(0.026, 0.07, 8), M.std('#e59a92', 0.8), 0, 0.045, 0.012, { s: [1, 1, 0.3], cast: false });
    }
  }

  const tail = grp(torso, 0, 0.06, -0.2);
  if (mochi) {
    put(tail, G.ico(0.06, 1), fur('#f7efe2'), 0, 0.06, -0.01);
    put(tail, G.ico(0.05, 1), fur('#efe0c8'), 0, 0.1, 0.04);
  } else {
    put(tail, G.capsule(0.025, 0.08, 3, 8), accent, 0, 0.06, 0, { rx: -0.3 });
  }

  return { root, body, torso, head, jaw, earL, earR, tail, legs, mouth };
}

export class DogRig {
  readonly j: DogJoints;
  readonly root: THREE.Group;
  state: DogState = 'idle';
  speed = 0;
  private t = Math.random() * 10;
  private phase = 0;
  private held: THREE.Object3D | null = null;
  private barkT = 0;
  constructor(readonly look: DogLook) {
    this.j = buildDog(look);
    this.root = this.j.root;
  }

  setState(s: DogState) {
    this.state = s;
  }

  bark() {
    this.barkT = 0.35;
  }

  hold(obj: THREE.Object3D | null) {
    if (this.held) this.j.mouth.remove(this.held);
    this.held = obj;
    if (obj) this.j.mouth.add(obj);
  }

  update(dt: number) {
    this.t += dt;
    const j = this.j;
    const s = this.state;
    const t = this.t;
    const move = s === 'trot' || s === 'run';
    if (move) this.phase += dt * (s === 'run' ? 22 : 15) * Math.max(0.5, this.speed);
    const ph = this.phase;
    const amp = s === 'run' ? 0.9 : 0.55;
    const k = Math.min(1, dt * 14);
    let tY = 0;
    let tRx = 0;
    let headX = 0;
    let headY = 0;
    let tailWag = 6;
    const legT = [0, 0, 0, 0];
    if (move) {
      legT[0] = Math.sin(ph) * amp;
      legT[1] = Math.sin(ph + Math.PI) * amp;
      legT[2] = Math.sin(ph + (s === 'run' ? 0.6 : Math.PI)) * amp;
      legT[3] = Math.sin(ph + (s === 'run' ? 0.6 + Math.PI : 0)) * amp;
      tY = Math.abs(Math.sin(ph)) * (s === 'run' ? 0.05 : 0.02);
      tRx = s === 'run' ? Math.sin(ph) * 0.12 : 0;
      headX = Math.sin(ph * 2) * 0.05;
      tailWag = 14;
    } else if (s === 'sit' || s === 'beg') {
      tRx = s === 'beg' ? -1.0 : -0.55;
      tY = s === 'beg' ? 0.08 : -0.04;
      legT[2] = -1.1;
      legT[3] = -1.1;
      legT[0] = s === 'beg' ? -1.2 + Math.sin(t * 6) * 0.2 : 0.55;
      legT[1] = s === 'beg' ? -1.2 - Math.sin(t * 6) * 0.2 : 0.55;
      headX = s === 'beg' ? 0.6 : 0.45;
      headY = Math.sin(t * 0.9) * 0.3;
      tailWag = s === 'beg' ? 18 : 8;
    } else if (s === 'lie') {
      tY = -0.1;
      legT[0] = -1.4;
      legT[1] = -1.4;
      legT[2] = 1.4;
      legT[3] = 1.4;
      headX = 0.15 + Math.sin(t * 0.6) * 0.05;
      headY = Math.sin(t * 0.4) * 0.3;
      tailWag = 2;
    } else if (s === 'sniff') {
      headX = 0.55 + Math.sin(t * 9) * 0.06;
      headY = Math.sin(t * 1.7) * 0.5;
      tRx = 0.15;
      tailWag = 10;
    } else {
      headY = Math.sin(t * 0.8) * 0.4;
      headX = Math.sin(t * 1.3) * 0.08;
      tY = Math.sin(t * 2) * 0.005;
    }
    if (s === 'bark' || this.barkT > 0) {
      this.barkT = Math.max(0, this.barkT - dt);
      const pop = Math.max(0, Math.sin(t * 22));
      headX = -0.35 - pop * 0.2;
      tY += pop * 0.035;
      j.jaw.rotation.x = 0.1 + pop * 0.5;
      tailWag = 20;
    } else {
      j.jaw.rotation.x = lerp(j.jaw.rotation.x, 0, k);
    }
    j.body.position.y = lerp(j.body.position.y, tY, k);
    j.torso.rotation.x = lerp(j.torso.rotation.x, tRx, k);
    j.head.rotation.x = lerp(j.head.rotation.x, headX - j.torso.rotation.x * 0.8, k);
    j.head.rotation.y = lerp(j.head.rotation.y, headY, k);
    j.legs.forEach((l, i) => (l.rotation.x = lerp(l.rotation.x, legT[i], move ? 1 : k)));
    j.tail.rotation.z = Math.sin(t * tailWag) * 0.5;
    j.tail.rotation.x = -0.4 + (s === 'lie' ? 0.6 : 0);
    const flop = this.look.name === 'mochi' ? 0.35 : 0.12;
    const earBounce = move ? Math.sin(ph * 2) * flop : Math.sin(t * 3) * 0.04;
    j.earL.rotation.x = earBounce;
    j.earR.rotation.x = -earBounce * 0.8;
  }
}
