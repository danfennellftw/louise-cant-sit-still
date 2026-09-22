import * as THREE from 'three';
import { G, bx, cy, dynamic, group, put, sp } from '../geo';
import { M } from '../materials';
import { TX, ScreenTexture } from '../textures';
import type { SetCtx } from '../../world/kit';

export interface BedRig {
  root: THREE.Group;
  duvet: THREE.Mesh;
  duvetBase: Float32Array;
  pillows: THREE.Mesh[];
  setMess(k: number): void;
}

/** Queen bed with a deformable duvet: setMess(1) = rumpled, setMess(0) = hotel-perfect. */
export function bed(ctx: SetCtx, x: number, z: number, ry = 0, sheet = '#f7f4ef'): BedRig {
  const g = group(ctx.root, x, 0, z, ry);
  const wood = M.std('#8a5a38', 0.55);
  const W = 1.7;
  const L = 2.15;
  bx(g, wood, W + 0.12, 0.28, L + 0.1, 0, 0.08, 0, 0.04);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, wood, 0.08, 0.1, 0.08, sx * (W / 2), 0, sz * (L / 2), 0.02);
  bx(g, M.fabric('#d8cfc2', '#fff', 0.95), W + 0.2, 1.2, 0.16, 0, 0.1, -L / 2 - 0.02, 0.07);
  bx(g, M.fabric('#fbfaf7', '#fff', 0.9), W, 0.26, L - 0.05, 0, 0.36, 0, 0.08);
  const d = dynamic(group(g, 0, 0, 0));
  const geo = new THREE.BoxGeometry(W + 0.08, 0.12, L * 0.72, 16, 1, 16);
  const duvet = new THREE.Mesh(geo, M.fabric(sheet, '#ffffff', 0.9, 0.7));
  duvet.position.set(0, 0.66, L * 0.12);
  duvet.castShadow = true;
  duvet.receiveShadow = true;
  d.add(duvet);
  const duvetBase = (geo.attributes.position.array as Float32Array).slice();
  const pillows: THREE.Mesh[] = [];
  for (const s of [-0.42, 0.42]) {
    const p = put(d, G.box(0.66, 0.16, 0.42, 0.08), M.fabric('#ffffff', '#fff', 0.9), s, 0.72, -L / 2 + 0.34, { rx: -0.25 });
    p.userData.rest = p.position.clone();
    pillows.push(p);
  }
  const throwP = put(d, G.box(0.42, 0.14, 0.3, 0.07), M.fabric('#c9b39a', '#fff', 0.9), 0, 0.72, -L / 2 + 0.55, { rx: -0.2 });
  throwP.userData.rest = throwP.position.clone();
  pillows.push(throwP);
  ctx.solidAt(x, z, ry ? L + 0.1 : W + 0.2, ry ? W + 0.2 : L + 0.1);
  const setMess = (k: number) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const bxv = duvetBase[i * 3];
      const byv = duvetBase[i * 3 + 1];
      const bzv = duvetBase[i * 3 + 2];
      const lump = (Math.sin(bxv * 5.3 + bzv * 2.1) * 0.08 + Math.sin(bxv * 11 - bzv * 7) * 0.04 + Math.cos(bzv * 4) * 0.05) * k;
      const fold = byv > 0 ? lump + 0.05 * k : lump * 0.3;
      pos.setXYZ(i, bxv + Math.sin(bzv * 3) * 0.06 * k, byv + fold, bzv + (k * 0.25 * Math.max(0, -bzv)));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    duvet.rotation.y = 0.12 * k;
    duvet.position.z = L * 0.12 + 0.18 * k;
    pillows.forEach((p, i) => {
      const r = p.userData.rest as THREE.Vector3;
      p.position.set(r.x + Math.sin(i * 3.1) * 0.5 * k, r.y - 0.02 * k, r.z + 0.4 * k * (i === 2 ? 2 : 1));
      p.rotation.set(-0.25 + k * 1.2 * (i % 2 ? 1 : -1), k * (i + 1) * 0.6, k * 0.4);
    });
  };
  return { root: g, duvet, duvetBase, pillows, setMess };
}

export function nightstand(ctx: SetCtx, x: number, z: number, wood = '#8a5a38') {
  const g = group(ctx.root, x, 0, z);
  bx(g, M.std(wood, 0.5), 0.55, 0.56, 0.45, 0, 0.04, 0, 0.03);
  bx(g, M.std('#6e4428', 0.5), 0.5, 0.2, 0.02, 0, 0.32, 0.225, 0.01);
  sp(g, M.metal('#c9a24a', 0.3), 0.02, 0, 0.42, 0.24);
  for (const sx of [-1, 1]) bx(g, M.std('#3a2a20', 0.5), 0.04, 0.05, 0.04, sx * 0.23, 0, 0, 0.01);
  ctx.solidAt(x, z, 0.55, 0.45);
  return g;
}

export function dresser(ctx: SetCtx, x: number, z: number, ry = 0, wood = '#9a6640') {
  const g = group(ctx.root, x, 0, z, ry);
  bx(g, M.std(wood, 0.45), 1.5, 0.85, 0.5, 0, 0.08, 0, 0.03);
  const front = M.std('#8a5834', 0.45);
  for (let r = 0; r < 3; r++)
    for (const s of [-0.37, 0.37]) {
      bx(g, front, 0.68, 0.22, 0.03, s, 0.15 + r * 0.26, 0.25, 0.01);
      bx(g, M.metal('#c9a24a', 0.3), 0.14, 0.02, 0.02, s, 0.25 + r * 0.26, 0.275, 0.005);
    }
  for (const sx of [-1, 1]) bx(g, M.std('#3a2a20', 0.5), 0.05, 0.08, 0.05, sx * 0.68, 0, 0, 0.01);
  ctx.solidAt(x, z, 1.5, 0.5, ry);
  return g;
}

/** Wall TV with a live screen — cozy "video" loop, a play bar, no platform branding. */
export function tv(ctx: SetCtx, p: THREE.Object3D, x: number, y: number, z: number, ry = 0, w = 1.5) {
  const g = group(p, x, y, z, ry);
  const h = w * 0.5625;
  bx(g, M.gloss('#111114', 0.3, 0.8), w + 0.05, h + 0.05, 0.05, 0, 0, 0, 0.01);
  const screen = new ScreenTexture(256, 144);
  const mat = new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false });
  const s = new THREE.Mesh(G.plane(w, h), mat);
  s.position.set(0, h / 2 + 0.025, 0.028);
  dynamic(g);
  g.add(s);
  let on = false;
  let t = 0;
  let glow: THREE.PointLight | null = null;
  const draw = () => {
    const c = screen.ctx;
    if (!on) {
      c.fillStyle = '#0b0b0d';
      c.fillRect(0, 0, 256, 144);
      const gr = c.createLinearGradient(0, 0, 256, 144);
      gr.addColorStop(0, 'rgba(255,255,255,0.06)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, 256, 144);
    } else {
      const hue = (t * 12) % 360;
      c.fillStyle = `hsl(${hue}, 45%, 62%)`;
      c.fillRect(0, 0, 256, 144);
      c.fillStyle = `hsl(${(hue + 40) % 360}, 50%, 78%)`;
      c.beginPath();
      c.arc(128 + Math.sin(t) * 40, 70, 34, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fff';
      c.beginPath();
      c.ellipse(118 + Math.sin(t) * 40, 62, 5, 7, 0, 0, Math.PI * 2);
      c.ellipse(138 + Math.sin(t) * 40, 62, 5, 7, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.fillRect(0, 128, 256, 16);
      c.fillStyle = '#ff5a5a';
      c.fillRect(8, 134, ((t * 6) % 240), 4);
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fillRect(8 + ((t * 6) % 240), 132, 8, 8);
    }
    screen.flush();
  };
  draw();
  ctx.on((dt) => {
    if (!on) return;
    t += dt;
    draw();
    if (glow) glow.intensity = 1.8 + Math.sin(t * 3) * 0.4;
  });
  return {
    group: g,
    setOn(v: boolean) {
      on = v;
      if (v && !glow) {
        const wp = new THREE.Vector3(0, h / 2, 0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(x, y, z));
        glow = ctx.point(wp.x, wp.y, wp.z, '#9fc8ff', 2, 6, true);
      }
      draw();
    },
  };
}

export function sofa(ctx: SetCtx, x: number, z: number, ry = 0, color = '#e7e0d4', len = 2.3) {
  const g = group(ctx.root, x, 0, z, ry);
  const fab = M.fabric(color, '#ffffff', 0.95, 0.6);
  bx(g, M.std('#6e4a30', 0.6), len, 0.12, 0.9, 0, 0.06, 0, 0.03);
  bx(g, fab, len, 0.26, 0.9, 0, 0.16, 0, 0.08);
  for (let i = 0; i < 3; i++) bx(g, fab, len / 3 - 0.04, 0.16, 0.66, (i - 1) * (len / 3), 0.4, 0.08, 0.07);
  bx(g, fab, len, 0.55, 0.24, 0, 0.36, -0.34, 0.1);
  for (const s of [-1, 1]) bx(g, fab, 0.2, 0.42, 0.9, s * (len / 2 - 0.1), 0.26, 0, 0.09);
  put(g, G.box(0.46, 0.4, 0.14, 0.07), M.fabric('#4a78a8', '#9cf', 0.9), -len / 2 + 0.45, 0.72, -0.2, { rz: 0.15, rx: -0.2 });
  put(g, G.box(0.42, 0.38, 0.14, 0.07), M.fabric('#f0ece4', '#fff', 0.9), len / 2 - 0.45, 0.72, -0.2, { rz: -0.12, rx: -0.2 });
  ctx.solidAt(x, z, len, 0.9, ry);
  return g;
}

/** Cream boucle lounge chair + ottoman on tapered walnut legs (from the living-room photo). */
export function boucleChair(ctx: SetCtx, x: number, z: number, ry = 0) {
  const g = group(ctx.root, x, 0, z, ry);
  const boucle = M.fabric('#efe6d6', '#ffffff', 1, 0.9);
  const walnut = M.std('#6a3f24', 0.45);
  for (const [lx, lz] of [[-0.32, 0.3], [0.32, 0.3], [-0.32, -0.3], [0.32, -0.3]]) {
    put(g, G.cyl(0.02, 0.03, 0.3, 8), walnut, lx, 0.15, lz, { rx: lz * 0.4, rz: -lx * 0.4 });
  }
  bx(g, boucle, 0.86, 0.22, 0.8, 0, 0.28, 0.02, 0.1);
  put(g, G.sphere(0.5, 22, 16, ), boucle, 0, 0.78, -0.22, { s: [0.95, 0.72, 0.36], rx: -0.2 });
  for (const s of [-1, 1]) put(g, G.capsule(0.12, 0.42, 5, 10), boucle, s * 0.4, 0.55, 0.0, { rx: Math.PI / 2 - 0.2 });
  const o = group(g, 0, 0, 1.1);
  bx(o, boucle, 0.66, 0.2, 0.5, 0, 0.26, 0, 0.08);
  for (const [lx, lz] of [[-0.26, 0.18], [0.26, 0.18], [-0.26, -0.18], [0.26, -0.18]]) put(o, G.cyl(0.018, 0.025, 0.27, 8), walnut, lx, 0.13, lz);
  ctx.solidAt(x, z, 0.9, 0.9, ry);
  const op = new THREE.Vector3(0, 0, 1.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
  ctx.solidAt(x + op.x, z + op.z, 0.66, 0.5, ry);
  return g;
}

export function mosaicTable(ctx: SetCtx, x: number, z: number) {
  const g = group(ctx.root, x, 0, z);
  cy(g, M.std('#6a3f24', 0.5), 0.26, 0.26, 0.05, 0, 0.5, 0, 24);
  cy(g, M.tex(TX.mosaic(), 0.4, 0, 'mosaic'), 0.24, 0.24, 0.012, 0, 0.55, 0, 24);
  cy(g, M.std('#6a3f24', 0.5), 0.03, 0.04, 0.5, 0, 0, 0, 8);
  cy(g, M.std('#6a3f24', 0.5), 0.16, 0.18, 0.03, 0, 0, 0, 16);
  cy(g, M.glass('#f2d27a', 0.55), 0.035, 0.05, 0.28, 0.06, 0.56, 0.02, 12);
  ctx.solidAt(x, z, 0.5, 0.5);
  return g;
}

export function coffeeTable(ctx: SetCtx, x: number, z: number, ry = 0) {
  const g = group(ctx.root, x, 0, z, ry);
  bx(g, M.std('#b58a60', 0.4), 1.2, 0.06, 0.6, 0, 0.38, 0, 0.03);
  bx(g, M.std('#b58a60', 0.4), 1.1, 0.03, 0.5, 0, 0.12, 0, 0.01);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(g, M.std('#3a2a20', 0.5), 0.04, 0.38, 0.04, sx * 0.54, 0, sz * 0.25, 0.01);
  bx(g, M.fabric('#e98f6b', '#fff'), 0.28, 0.04, 0.2, -0.3, 0.44, 0.05, 0.01);
  bx(g, M.fabric('#6a8caf', '#fff'), 0.26, 0.04, 0.19, -0.3, 0.48, 0.04, 0.01);
  cy(g, M.gloss('#f4efe6', 0.3, 0.6), 0.05, 0.04, 0.1, 0.3, 0.44, 0, 14);
  ctx.solidAt(x, z, 1.2, 0.6, ry);
  return g;
}

export interface KitchenRig {
  uppers: THREE.Group[];
  items: THREE.Group;
  counterY: number;
}

/** Run of base + upper cabinets along the back wall. Upper doors are hinged groups for the organize beat. */
export function kitchenRun(ctx: SetCtx, x0: number, x1: number, z: number, cab = '#6f8a7a', counter = '#f1ece4'): KitchenRig {
  const g = group(ctx.root, 0, 0, 0);
  const cabM = M.gloss(cab, 0.45, 0.3);
  const top = M.gloss(counter, 0.25, 0.6);
  const brass = M.metal('#c9a24a', 0.25);
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  bx(g, M.std('#2b2522', 0.8), len, 0.1, 0.56, cx, 0, z + 0.3, 0.01);
  bx(g, cabM, len, 0.8, 0.6, cx, 0.1, z + 0.3, 0.02);
  bx(g, top, len + 0.04, 0.05, 0.66, cx, 0.9, z + 0.33, 0.015);
  const n = Math.round(len / 0.6);
  const dw = len / n;
  for (let i = 0; i < n; i++) {
    const dx = x0 + dw * (i + 0.5);
    bx(g, M.gloss(cab, 0.4, 0.3), dw - 0.04, 0.72, 0.03, dx, 0.14, z + 0.61, 0.01);
    bx(g, brass, 0.02, 0.16, 0.02, dx + dw / 2 - 0.1, 0.62, z + 0.64, 0.005);
  }
  put(g, G.plane(len, 0.7), M.tex(TX.subway(), 0.3, 0, 'subway'), cx, 1.3, z + 0.02, { cast: false });
  const sinkX = x0 + len * 0.3;
  bx(g, M.metal('#bfc4c8', 0.25), 0.6, 0.02, 0.42, sinkX, 0.94, z + 0.33, 0.01);
  const faucet = group(g, sinkX, 0.95, z + 0.12);
  cy(faucet, M.metal('#c9a24a', 0.2), 0.018, 0.022, 0.32, 0, 0, 0, 10);
  put(faucet, G.torus(0.1, 0.016, Math.PI, 8, 12), M.metal('#c9a24a', 0.2), 0, 0.32, 0.1, { ry: Math.PI / 2 });
  const uppers: THREE.Group[] = [];
  const items = dynamic(group(ctx.root, 0, 0, 0));
  const un = Math.max(2, Math.round((len * 0.7) / 0.6));
  const ux0 = x0 + len * 0.3 - (un * 0.6) / 2 + len * 0.2;
  bx(g, cabM, un * 0.6, 0.8, 0.36, ux0 + (un * 0.6) / 2, 1.72, z + 0.18, 0.02);
  bx(g, M.std('#efe8dc', 0.6), un * 0.6 - 0.1, 0.02, 0.3, ux0 + (un * 0.6) / 2, 2.1, z + 0.2, 0.005);
  for (let i = 0; i < un; i++) {
    const hx = ux0 + i * 0.6;
    const hinge = dynamic(group(ctx.root, hx + 0.02, 1.74, z + 0.37));
    bx(hinge, M.gloss(cab, 0.4, 0.3), 0.56, 0.76, 0.03, 0.28, 0, 0, 0.01);
    bx(hinge, brass, 0.02, 0.14, 0.02, 0.5, 0.05, 0.025, 0.005);
    uppers.push(hinge);
  }
  ctx.solid(x0, z, x1, z + 0.7);
  return { uppers, items, counterY: 0.95 };
}

export function fridge(ctx: SetCtx, x: number, z: number) {
  const g = group(ctx.root, x, 0, z);
  bx(g, M.gloss('#d9dcdf', 0.25, 0.8), 0.9, 2.05, 0.72, 0, 0, 0.36, 0.04);
  bx(g, M.std('#2a2a2e', 0.5), 0.9, 0.01, 0.01, 0, 1.3, 0.73, 0);
  for (const s of [-1, 1]) cy(g, M.metal('#9aa0a6', 0.2), 0.012, 0.012, 0.8, s * 0.06, 0.9, 0.76, 8);
  bx(g, M.fabric('#ff9e7a', '#fff'), 0.12, 0.12, 0.01, 0.25, 1.6, 0.725, 0.01);
  bx(g, M.fabric('#9ad0c2', '#fff'), 0.1, 0.14, 0.01, -0.2, 1.5, 0.725, 0.01);
  ctx.solid(x - 0.45, z, x + 0.45, z + 0.74);
  return g;
}

export function stove(_ctx: SetCtx, p: THREE.Object3D, x: number, z: number) {
  const g = group(p, x, 0.95, z);
  bx(g, M.gloss('#1a1a1c', 0.2, 1), 0.62, 0.02, 0.5, 0, 0, 0, 0.01);
  for (const [sx, sz] of [[-0.15, -0.1], [0.15, -0.1], [-0.15, 0.12], [0.15, 0.12]]) {
    put(g, G.ring(0.06, 0.09, 24), M.glow('#ff5a2a', 0.9), sx, 0.022, sz, { rx: -Math.PI / 2, cast: false });
  }
  const pan = group(g, 0.15, 0.03, 0.12);
  cy(pan, M.std('#2a2a2c', 0.4, 0.7), 0.13, 0.11, 0.05, 0, 0, 0, 18);
  bx(pan, M.std('#2a2a2c', 0.4), 0.3, 0.02, 0.03, 0.26, 0.03, 0, 0.01);
  const hood = group(p, x, 1.8, z - 0.05);
  bx(hood, M.metal('#c4c8cc', 0.3), 0.7, 0.3, 0.45, 0, 0, 0, 0.03);
  bx(hood, M.metal('#c4c8cc', 0.3), 0.24, 0.8, 0.24, 0, 0.3, -0.1, 0.02);
  return g;
}

export function island(ctx: SetCtx, x: number, z: number, w = 2.2) {
  const g = group(ctx.root, x, 0, z);
  bx(g, M.gloss('#e9e2d6', 0.45, 0.2), w, 0.88, 0.8, 0, 0.02, 0, 0.03);
  bx(g, M.gloss('#f7f3ec', 0.2, 0.7), w + 0.2, 0.05, 1.0, 0, 0.9, 0, 0.02);
  for (let i = 0; i < 3; i++) {
    const sx = (i - 1) * (w / 3);
    const stool = group(g, sx, 0, 0.75);
    cy(stool, M.fabric('#c98a5a', '#fff'), 0.18, 0.18, 0.07, 0, 0.66, 0, 18);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.78;
      put(stool, G.cyl(0.012, 0.014, 0.68, 6), M.metal('#2a2a2a', 0.4), Math.cos(a) * 0.12, 0.34, Math.sin(a) * 0.12, { rx: Math.sin(a) * 0.12, rz: -Math.cos(a) * 0.12 });
    }
  }
  const bowl = group(g, -0.4, 0.95, 0);
  put(bowl, G.partSphere(0.18, Math.PI / 2, 20, 8), M.gloss('#f4efe6', 0.3), 0, 0.1, 0, { rx: Math.PI });
  for (let i = 0; i < 5; i++) sp(bowl, M.gloss(i % 2 ? '#f2c14e' : '#e8663f', 0.4), 0.05, Math.cos(i) * 0.08, 0.08, Math.sin(i) * 0.08);
  ctx.solidAt(x, z, w + 0.2, 1.0);
  return g;
}

export function dogBed(p: THREE.Object3D, x: number, z: number, color: string, glow = false) {
  const g = group(p, x, 0, z);
  put(g, G.torus(0.34, 0.12, Math.PI * 2, 10, 24), M.fabric(color, '#fff', 0.95, 0.8), 0, 0.1, 0, { rx: Math.PI / 2 });
  cy(g, M.fabric('#f8f3ea', '#fff', 1, 0.8), 0.32, 0.32, 0.08, 0, 0.0, 0, 24);
  if (glow) put(g, G.ring(0.5, 0.56, 36), M.glow(color, 1.2), 0, 0.02, 0, { rx: -Math.PI / 2, cast: false });
  return g;
}

export function bookshelf(ctx: SetCtx, x: number, z: number, ry = 0) {
  const g = group(ctx.root, x, 0, z, ry);
  const wood = M.std('#f1ebe0', 0.55);
  bx(g, wood, 1.1, 2.0, 0.35, 0, 0, 0, 0.02);
  const cols = ['#c9553b', '#3b8f7a', '#e0b44a', '#2f5e8f', '#e7d7c1', '#8f5a9a', '#6b8e5a'];
  for (let s = 0; s < 4; s++) {
    let bxp = -0.48;
    let i = s * 3;
    while (bxp < 0.4) {
      const w = 0.04 + ((i * 7) % 5) * 0.012;
      const h = 0.26 + ((i * 3) % 4) * 0.03;
      bx(g, M.std(cols[i % cols.length], 0.7), w, h, 0.24, bxp + w / 2, 0.08 + s * 0.48, 0.06, 0.005);
      bxp += w + 0.005;
      i++;
    }
  }
  ctx.solidAt(x, z, 1.1, 0.4, ry);
  return g;
}

/* ---------- food props for the "only brown food" beat ---------- */
export function steak(p: THREE.Object3D, x: number, y: number, z: number) {
  const g = group(p, x, y, z);
  put(g, G.sphere(0.1, 14, 10), M.std('#6b3a22', 0.6), 0, 0.02, 0, { s: [1.3, 0.28, 0.9] });
  for (let i = -1; i <= 1; i++) bx(g, M.std('#3a1e12', 0.8), 0.2, 0.004, 0.012, 0, 0.048, i * 0.04, 0, { ry: 0.6 });
  return g;
}
export function drumstick(p: THREE.Object3D, x: number, y: number, z: number) {
  const g = group(p, x, y, z);
  put(g, G.sphere(0.06, 12, 10), M.std('#b0703a', 0.55), 0, 0.04, 0, { s: [1.3, 0.8, 0.9] });
  put(g, G.capsule(0.012, 0.06, 3, 6), M.std('#f3ead8', 0.6), 0.09, 0.04, 0, { rz: Math.PI / 2 });
  return g;
}
export function potato(p: THREE.Object3D, x: number, y: number, z: number) {
  return put(p, G.sphere(0.05, 10, 8), M.std('#a77a4a', 0.8), x, y + 0.03, z, { s: [1.3, 0.8, 1] });
}
export function plate(p: THREE.Object3D, x: number, y: number, z: number) {
  const g = group(p, x, y, z);
  cy(g, M.gloss('#fbf8f2', 0.2, 0.6), 0.2, 0.15, 0.025, 0, 0, 0, 24);
  return g;
}
