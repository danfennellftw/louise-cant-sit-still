import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { G, bx, cy, dynamic, group, put, sp } from '../geo';
import { M } from '../materials';
import type { SetCtx } from '../../world/kit';
import { rng } from '../../engine/util';

/** California oak / sycamore: chunky canopy lobes on a crooked trunk, gently swaying. */
export function tree(ctx: SetCtx, x: number, z: number, s = 1, tones = ['#5f8a4a', '#6f9a54', '#4f7a42'], seed = 1, collide = true) {
  const g = group(ctx.root, x, 0, z);
  g.scale.setScalar(s);
  const r = rng(seed + Math.floor(x * 3 + z * 5));
  const bark = M.std('#7a6250', 0.9);
  put(g, G.cyl(0.14, 0.22, 2.2, 8), bark, 0, 1.1, 0, { rz: (r() - 0.5) * 0.15 });
  put(g, G.cyl(0.08, 0.12, 1.2, 7), bark, 0.35, 2.3, 0, { rz: -0.6 });
  put(g, G.cyl(0.08, 0.12, 1.1, 7), bark, -0.3, 2.4, 0.1, { rz: 0.5 });
  const canopy = group(g, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2;
    const rr = r() * 0.9;
    put(canopy, G.ico(0.8 + r() * 0.5, 1), M.foliage(tones[i % tones.length]), Math.cos(a) * rr, 3.0 + r() * 0.9, Math.sin(a) * rr * 0.8, {
      s: [1.1, 0.8, 1],
    });
  }
  if (collide) ctx.solidAt(x, z, 0.5 * s, 0.5 * s);
  return g;
}

export function palm(ctx: SetCtx, x: number, z: number, h = 6, seed = 1, collide = true) {
  const g = group(ctx.root, x, 0, z);
  const r = rng(seed + Math.floor(x * 7));
  const trunk = M.std('#9a7a5a', 0.9);
  const segs = 8;
  const lean = (r() - 0.5) * 0.3;
  let top = new THREE.Vector3();
  for (let i = 0; i < segs; i++) {
    const y = (i / segs) * h;
    const off = Math.sin((i / segs) * 1.5) * lean * h * 0.3;
    put(g, G.cyl(0.13 - i * 0.006, 0.16 - i * 0.006, h / segs + 0.02, 8), trunk, off, y + h / segs / 2, 0);
    top = new THREE.Vector3(off, y + h / segs, 0);
  }
  const crown = group(g, top.x, top.y, 0);
  const frond = M.foliage('#4f7d3a', 0.8);
  const frond2 = M.foliage('#6a9446', 0.8);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const f = group(crown, 0, 0, 0, -a);
    put(f, G.box(1.8, 0.03, 0.32, 0.01), i % 2 ? frond : frond2, 0.85, -0.25, 0, { rz: -0.45 - r() * 0.2 });
  }
  sp(crown, M.std('#6a4a2a', 0.8), 0.18, 0, -0.1, 0);
  if (collide) ctx.solidAt(x, z, 0.4, 0.4);
  return g;
}

export function bush(p: THREE.Object3D, x: number, z: number, s = 1, color = '#5f8a4a', flowers?: string) {
  const g = group(p, x, 0, z);
  const r = rng(Math.floor(x * 11 + z * 3) + 5);
  for (let i = 0; i < 4; i++) {
    put(g, G.ico(0.35 * s * (0.7 + r() * 0.5), 1), M.std(color, 0.9), (r() - 0.5) * 0.6 * s, 0.25 * s, (r() - 0.5) * 0.4 * s);
  }
  if (flowers) for (let i = 0; i < 8; i++) sp(g, M.std(flowers, 0.6), 0.05 * s, (r() - 0.5) * 0.8 * s, 0.35 * s + r() * 0.3 * s, (r() - 0.5) * 0.6 * s, { cast: false });
  return g;
}

export function cafeTable(ctx: SetCtx, x: number, z: number, umbrella = '#ff9e7a', seed = 1) {
  const g = group(ctx.root, x, 0, z);
  cy(g, M.std('#2a2a2c', 0.5, 0.6), 0.03, 0.04, 0.72, 0, 0, 0, 8);
  cy(g, M.std('#f4efe6', 0.4), 0.42, 0.42, 0.04, 0, 0.72, 0, 22);
  cy(g, M.std('#2a2a2c', 0.5), 0.25, 0.28, 0.03, 0, 0, 0, 16);
  for (let i = 0; i < 2; i++) {
    const a = i * Math.PI + seed;
    const c = group(g, Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7, -a + Math.PI / 2);
    bx(c, M.std('#c98a5a', 0.6), 0.42, 0.04, 0.42, 0, 0.45, 0, 0.02);
    bx(c, M.std('#c98a5a', 0.6), 0.42, 0.4, 0.04, 0, 0.5, -0.2, 0.02);
    for (const sx of [-0.18, 0.18]) for (const sz of [-0.18, 0.18]) cy(c, M.std('#2a2a2c', 0.5), 0.015, 0.015, 0.45, sx, 0, sz, 6);
  }
  const u = group(g, 0, 0, 0);
  cy(u, M.std('#e9e2d6', 0.5), 0.02, 0.02, 2.3, 0, 0.7, 0, 6);
  put(u, G.cone(1.25, 0.5, 8), M.fabric(umbrella, '#fff', 0.9), 0, 2.8, 0);
  put(u, G.cone(1.27, 0.08, 8, true), M.fabric('#f7f1e8', '#fff'), 0, 2.53, 0);
  ctx.solidAt(x, z, 0.9, 0.9);
  return g;
}

/** Sagging string lights with glowing bulbs between two points. */
export function stringLights(p: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, n = 12, sag = 0.5, color = '#ffd48a') {
  const g = group(p, 0, 0, 0);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const v = a.clone().lerp(b, t);
    v.y -= Math.sin(t * Math.PI) * sag;
    pts.push(v);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.008, 4), M.std('#222', 0.6));
  g.add(wire);
  const bulb = M.glow(color, 3);
  for (let i = 1; i < n; i++) {
    const v = curve.getPoint(i / n);
    sp(g, bulb, 0.045, v.x, v.y - 0.05, v.z, { cast: false });
  }
  return g;
}

export function lampPost(ctx: SetCtx, x: number, z: number, glow = '#ffd48a', light = true, h = 3.4) {
  const g = group(ctx.root, x, 0, z);
  const iron = M.gloss('#1f2326', 0.4, 0.6);
  cy(g, iron, 0.1, 0.14, 0.3, 0, 0, 0, 10);
  cy(g, iron, 0.045, 0.06, h, 0, 0.3, 0, 8);
  cy(g, iron, 0.18, 0.12, 0.1, 0, h + 0.2, 0, 8);
  put(g, G.cyl(0.14, 0.1, 0.38, 8), M.glow(glow, 2.2), 0, h + 0.06 + 0.19, 0, { cast: false });
  put(g, G.cone(0.24, 0.2, 8), iron, 0, h + 0.6, 0);
  if (light) ctx.point(x, h, z, glow, 3, 9);
  ctx.solidAt(x, z, 0.3, 0.3);
  return g;
}

export function fence(p: THREE.Object3D, x0: number, z0: number, x1: number, z1: number, color = '#c9a57a') {
  const g = group(p, 0, 0, 0);
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = Math.atan2(z1 - z0, x1 - x0);
  const n = Math.max(2, Math.round(len / 2));
  const wood = M.std(color, 0.85);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    bx(g, wood, 0.12, 1.0, 0.12, x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t, 0.02);
  }
  for (const y of [0.45, 0.85]) {
    put(g, G.box(len, 0.08, 0.05, 0.01), wood, (x0 + x1) / 2, y, (z0 + z1) / 2, { ry: -ang });
  }
  return g;
}

export function rock(p: THREE.Object3D, x: number, z: number, s = 1, color = '#b8aa94') {
  return put(p, G.dodeca(0.5 * s), M.std(color, 0.95), x, 0.2 * s, z, { s: [1.3, 0.7, 1], ry: x + z });
}

/** Fat-tire commuter e-bike (Aima-style silhouette, no badges). Returns wheels for spinning + rear basket. */
export function ebike(p: THREE.Object3D, x: number, z: number, ry = 0, color = '#3a3f45', basket = true) {
  const g = dynamic(group(p, x, 0, z, ry));
  const frame = M.gloss(color, 0.45, 0.5);
  const accent = M.gloss('#2fb5a8', 0.35, 0.6);
  const tire = M.std('#161618', 0.85);
  const alloy = M.metal('#8a9097', 0.35);
  const wheels: THREE.Group[] = [];
  for (const wz of [-0.58, 0.6]) {
    const w = group(g, 0, 0.36, wz);
    put(w, G.torus(0.28, 0.085, Math.PI * 2, 10, 30), tire, 0, 0, 0, { ry: Math.PI / 2 });
    put(w, G.cyl(0.22, 0.22, 0.1, 24, true), alloy, 0, 0, 0, { rz: Math.PI / 2 });
    put(w, G.cyl(0.06, 0.06, 0.14, 12), M.std('#222', 0.5, 0.5), 0, 0, 0, { rz: Math.PI / 2 });
    for (let i = 0; i < 5; i++) put(w, G.box(0.02, 0.42, 0.02, 0), alloy, 0, 0, 0, { rx: (i / 5) * Math.PI });
    put(w, G.torus(0.33, 0.03, Math.PI * 0.9, 6, 16), frame, 0, 0.02, 0, { ry: Math.PI / 2, rx: -Math.PI * 0.05 });
    wheels.push(w);
  }
  // chunky frame: downtube with integrated battery, seat tube, top tube, suspension fork
  put(g, G.box(0.11, 0.11, 0.95, 0.04), frame, 0, 0.62, 0.08, { rx: 0.42 });
  put(g, G.box(0.13, 0.12, 0.62, 0.05), M.gloss('#26292d', 0.4, 0.4), 0, 0.6, 0.1, { rx: 0.42 });
  put(g, G.box(0.14, 0.02, 0.06, 0.01), M.glow('#6fe36f', 1.8), 0, 0.69, 0.05, { rx: 0.42, cast: false });
  put(g, G.box(0.09, 0.62, 0.09, 0.03), frame, 0, 0.66, -0.24, { rx: -0.28 });
  put(g, G.box(0.08, 0.08, 0.7, 0.03), frame, 0, 0.92, 0.1, { rx: 0.12 });
  for (const s of [-1, 1]) put(g, G.box(0.04, 0.6, 0.04, 0.015), alloy, s * 0.09, 0.62, 0.55, { rx: 0.22 });
  put(g, G.box(0.1, 0.34, 0.1, 0.03), frame, 0, 1.0, 0.5, { rx: 0.22 });
  bx(g, M.gloss('#1d1d1f', 0.4), 0.62, 0.04, 0.05, 0, 1.14, 0.52, 0.02);
  for (const s of [-1, 1]) bx(g, M.std('#111', 0.7), 0.1, 0.05, 0.06, s * 0.3, 1.13, 0.52, 0.02);
  bx(g, M.gloss('#111', 0.2, 0.8), 0.1, 0.06, 0.02, 0, 1.18, 0.5, 0.01);
  put(g, G.plane(0.08, 0.04), M.glow('#8fd8ff', 1.4), 0, 1.2, 0.512, { rx: -0.4, cast: false });
  bx(g, M.gloss('#1d1d1f', 0.3), 0.1, 0.08, 0.08, 0, 1.0, 0.64, 0.03);
  sp(g, M.glow('#fff4d6', 2.4), 0.04, 0, 1.03, 0.69, { cast: false });
  cy(g, M.metal('#2a2a2a', 0.4), 0.02, 0.02, 0.25, 0, 0.9, -0.33, 8);
  put(g, G.box(0.2, 0.07, 0.3, 0.03), M.fabric('#2a2522', '#666', 0.7), 0, 1.15, -0.36, { rx: 0.05 });
  put(g, G.box(0.2, 0.02, 0.42, 0.01), alloy, 0, 0.82, -0.62, {});
  for (const s of [-1, 1]) put(g, G.box(0.015, 0.36, 0.015, 0), alloy, s * 0.09, 0.64, -0.52, { rx: 0.5 });
  put(g, G.box(0.02, 0.05, 0.2, 0.01), accent, 0.06, 0.63, -0.02, { rx: 0.42, cast: false });
  put(g, G.box(0.02, 0.05, 0.2, 0.01), accent, -0.06, 0.63, -0.02, { rx: 0.42, cast: false });
  sp(g, M.glow('#ff3a2a', 1.6), 0.025, 0, 0.84, -0.84, { cast: false });
  let basketG: THREE.Group | null = null;
  if (basket) {
    basketG = group(g, 0, 0.84, -0.66);
    bx(basketG, M.fabric('#b98a5a', '#fff4dc', 0.9), 0.44, 0.24, 0.36, 0, 0, 0, 0.04);
    bx(basketG, M.fabric('#f4efe6', '#fff', 0.9), 0.38, 0.04, 0.3, 0, 0.2, 0, 0.02);
  }
  return { group: g, wheels, basket: basketG };
}

/** Chain-link fence run: posts + rail + see-through diamond mesh. */
export function chainLink(p: THREE.Object3D, x: number, z0: number, z1: number, h = 1.4) {
  const g = group(p, 0, 0, 0);
  const len = Math.abs(z1 - z0);
  const post = M.metal('#9aa0a6', 0.45);
  const n = Math.max(2, Math.round(len / 3));
  for (let i = 0; i <= n; i++) cy(g, post, 0.03, 0.03, h, x, 0, z0 + ((z1 - z0) * i) / n, 6);
  cy(g, post, 0.022, 0.022, len, x, h - 0.02, (z0 + z1) / 2, 6, { rx: Math.PI / 2 });
  const tex = chainTex().clone();
  tex.repeat.set(len / 0.6, h / 0.6);
  tex.needsUpdate = true;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(len, h),
    new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.4, transparent: false, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5, color: '#c9ced3' })
  );
  mesh.rotation.y = Math.PI / 2;
  mesh.position.set(x, h / 2, (z0 + z1) / 2);
  g.add(mesh);
  return g;
}

let chainCache: THREE.Texture | null = null;
function chainTex() {
  if (chainCache) return chainCache;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 32);
  ctx.lineTo(32, 0);
  ctx.lineTo(64, 32);
  ctx.lineTo(32, 64);
  ctx.closePath();
  ctx.stroke();
  chainCache = new THREE.CanvasTexture(c);
  chainCache.wrapS = chainCache.wrapT = THREE.RepeatWrapping;
  chainCache.userData.shared = true;
  return chainCache;
}

/** Tall ornamental grass clump (sways with the foliage shader). */
export function grasses(p: THREE.Object3D, x: number, z: number, s = 1, tone = '#c9b77a', seed = 1) {
  const g = group(p, x, 0, z);
  const r = rng(seed + Math.floor(x * 17 + z * 5));
  const m = M.foliage(tone, 0.9);
  const m2 = M.foliage('#8a9a5a', 0.9);
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2;
    const h = (1.2 + r() * 0.9) * s;
    put(g, G.box(0.025, h, 0.025, 0), i % 3 ? m : m2, Math.cos(a) * 0.12 * s, h / 2, Math.sin(a) * 0.12 * s, {
      rz: Math.cos(a) * 0.18,
      rx: Math.sin(a) * 0.18,
      cast: false,
    });
    if (i % 2) sp(g, m, 0.05 * s, Math.cos(a) * (0.12 + h * 0.18) * s, h, Math.sin(a) * (0.12 + h * 0.18) * s, { s: [0.6, 2.2, 0.6], cast: false });
  }
  return g;
}

/** Generic white EV (no badges) — for the garage charger scene. */
export function evCar(ctx: SetCtx, x: number, z: number, ry = 0, paint = '#f2f3f5') {
  const g = group(ctx.root, x, 0, z, ry);
  const body = M.gloss(paint, 0.25, 1);
  const glass = M.gloss('#1e2328', 0.1, 1);
  put(g, G.box(1.9, 0.62, 4.5, 0.28), body, 0, 0.62, 0);
  put(g, G.box(1.66, 0.52, 2.5, 0.3), glass, 0, 1.1, -0.2);
  put(g, G.box(1.7, 0.08, 2.2, 0.04), body, 0, 1.37, -0.2);
  for (const [wx, wz] of [[-0.86, 1.45], [0.86, 1.45], [-0.86, -1.45], [0.86, -1.45]]) {
    put(g, G.cyl(0.36, 0.36, 0.26, 24), M.std('#151517', 0.8), wx, 0.36, wz, { rz: Math.PI / 2 });
    put(g, G.cyl(0.24, 0.24, 0.27, 20), M.metal('#b8bdc3', 0.3), wx, 0.36, wz, { rz: Math.PI / 2 });
  }
  put(g, G.box(1.5, 0.05, 0.04, 0.02), M.glow('#f4fbff', 1.6), 0, 0.82, 2.25, { cast: false });
  put(g, G.box(1.6, 0.05, 0.04, 0.02), M.glow('#ff2a2a', 1.6), 0, 0.86, -2.25, { cast: false });
  ctx.solidAt(x, z, ry ? 4.6 : 2.0, ry ? 2.0 : 4.6);
  return g;
}

export function missionArch(ctx: SetCtx, x: number, z: number, ry = 0) {
  const g = group(ctx.root, x, 0, z, ry);
  const adobe = M.std('#efe0c6', 0.95);
  const tile = M.std('#b5553a', 0.8);
  bx(g, adobe, 4.6, 4.2, 0.7, 0, 0, 0, 0.05);
  for (let i = 0; i < 3; i++) {
    const ax = -1.4 + i * 1.4;
    bx(g, M.std('#3a2a22', 0.9), 0.8, 1.0, 0.72, ax, 2.5, 0, 0.1);
    put(g, G.cyl(0.4, 0.4, 0.72, 16, false), M.std('#3a2a22', 0.9), ax, 3.5, 0, { rx: Math.PI / 2 });
    const bell = group(g, ax, 3.3, 0);
    put(bell, G.cone(0.26, 0.45, 14, true), M.metal('#9a6a2a', 0.4), 0, 0, 0);
    ctx.on((_dt, t) => (bell.rotation.z = Math.sin(t * 1.2 + i) * 0.08));
    dynamic(bell);
  }
  bx(g, tile, 4.8, 0.2, 0.9, 0, 4.2, 0, 0.05);
  put(g, G.torus(0.3, 0.05, Math.PI * 2, 6, 16), M.std('#6a4a2a', 0.8), 0, 4.8, 0);
  ctx.solidAt(x, z, 4.6, 0.8, ry);
  return g;
}

export function boat(p: THREE.Object3D, x: number, z: number, ry = 0, hull = '#ffffff', sail = true) {
  const g = dynamic(group(p, x, 0, z, ry));
  put(g, G.sphere(1, 16, 10), M.gloss(hull, 0.3, 0.6), 0, 0.1, 0, { s: [0.6, 0.35, 2] });
  bx(g, M.std('#c9a57a', 0.6), 0.9, 0.05, 2.6, 0, 0.3, 0, 0.02);
  if (sail) {
    cy(g, M.std('#ddd', 0.4), 0.03, 0.03, 4, 0, 0.3, 0, 6);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, 3.4);
    shape.lineTo(1.6, 0);
    shape.lineTo(0, 0);
    const s = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: '#fbf8f2', side: THREE.DoubleSide, roughness: 0.8 }));
    s.position.set(0, 0.6, -0.1);
    s.rotation.y = Math.PI / 2;
    g.add(s);
  }
  return g;
}

export function kiosk(ctx: SetCtx, x: number, z: number, ry = 0, awning = '#ff9e7a', body = '#f4efe6') {
  const g = group(ctx.root, x, 0, z, ry);
  bx(g, M.gloss(body, 0.4, 0.3), 2.6, 1.05, 1.2, 0, 0, 0, 0.04);
  bx(g, M.std('#b58a60', 0.5), 2.7, 0.06, 1.3, 0, 1.05, 0, 0.02);
  bx(g, M.gloss(body, 0.4, 0.3), 2.6, 1.4, 0.2, 0, 1.1, -0.5, 0.03);
  for (let i = 0; i < 6; i++) {
    put(g, G.box(0.45, 0.04, 1.1, 0.01), M.fabric(i % 2 ? awning : '#fbf6ee', '#fff'), -1.12 + i * 0.45, 2.55, 0.25, { rx: 0.35 });
  }
  cy(g, M.gloss('#1b1b1f', 0.3, 0.8), 0.18, 0.2, 0.45, -0.7, 1.1, -0.2, 16);
  for (let i = 0; i < 4; i++) cy(g, M.gloss('#fbf8f2', 0.3), 0.045, 0.04, 0.12, 0.2 + i * 0.14, 1.1, 0.3, 12);
  ctx.solidAt(x, z, 2.7, 1.3, ry);
  return g;
}

export function planter(p: THREE.Object3D, x: number, z: number, w = 1.2, flowers = '#ff8fb1') {
  const g = group(p, x, 0, z);
  bx(g, M.std('#d9c7ab', 0.9), w, 0.5, 0.6, 0, 0, 0, 0.04);
  bx(g, M.std('#4a3526', 0.95), w - 0.1, 0.02, 0.5, 0, 0.48, 0, 0.01);
  bush(g, 0, 0, 0.8, '#5f8a4a', flowers).position.y = 0.4;
  return g;
}

/** Animated water plane with subtle ripples (ocean / creek / fountain). */
export function water(ctx: SetCtx, x: number, z: number, w: number, d: number, color = '#3f8fb5', seg = 24, y = 0.02) {
  const geo = new THREE.PlaneGeometry(w, d, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const base = (geo.attributes.position.array as Float32Array).slice();
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.92 });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  dynamic(m);
  ctx.root.add(m);
  ctx.on((_dt, t) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const vx = base[i * 3];
      const vz = base[i * 3 + 2];
      pos.setY(i, Math.sin(vx * 0.6 + t * 1.2) * 0.05 + Math.sin(vz * 0.8 + t * 0.9) * 0.04);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return m;
}

/**
 * Tesla-style EV silhouettes (no badges): 'y' is the taller crossover hatch, '3' the low sedan.
 * The car faces +z at ry = 0. Clearcoat gloss paint + black glass greenhouse/roof.
 */
export function teslaCar(ctx: SetCtx, x: number, z: number, ry: number, model: 'y' | '3', paint: string) {
  const g = group(ctx.root, x, 0, z, ry);
  const y = model === 'y';
  const L = y ? 4.75 : 4.7;
  const W = y ? 1.9 : 1.84;
  const belt = y ? 1.0 : 0.9;
  // side profile: [along length (+ = nose), height]
  const body: [number, number][] = y
    ? [[-2.34, 0.34], [-2.4, 0.62], [-2.34, 0.88], [-2.18, 1.0], [-1.9, 1.03], [1.45, 1.0], [1.9, 0.93], [2.2, 0.84], [2.36, 0.7], [2.38, 0.52], [2.3, 0.34]]
    : [[-2.3, 0.3], [-2.36, 0.56], [-2.3, 0.82], [-2.12, 0.93], [-1.55, 0.95], [1.3, 0.9], [1.8, 0.8], [2.15, 0.7], [2.33, 0.56], [2.33, 0.42], [2.24, 0.28]];
  const glass: [number, number][] = y
    ? [[-2.05, 0.99], [-1.75, 1.36], [-1.3, 1.55], [-0.6, 1.61], [0.3, 1.6], [0.7, 1.5], [1.45, 1.0]]
    : [[-1.6, 0.93], [-1.0, 1.3], [-0.45, 1.42], [0.2, 1.42], [0.5, 1.34], [1.3, 0.9]];
  const extrude = (pts: [number, number][], width: number, bevel: number) => {
    const sh = new THREE.Shape();
    sh.moveTo(pts[0][0], pts[0][1]);
    sh.splineThru(pts.slice(1).map(([u, v]) => new THREE.Vector2(u, v)));
    sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 5, curveSegments: 10 });
    geo.translate(0, 0, -(width - bevel * 2) / 2);
    geo.rotateY(-Math.PI / 2);
    return geo;
  };
  const paintMat = new THREE.MeshPhysicalMaterial({ color: paint, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#0d1014', metalness: 0.2, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 });
  // pinch the ends in plan view and round the shoulders / tumblehome so it reads as a car, not a box
  const shape = (geo: THREE.BufferGeometry, fn: (px: number, py: number, pz: number) => number) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) * fn(pos.getX(i), pos.getY(i), pos.getZ(i)));
    // ExtrudeGeometry is flat-shaded; weld and re-normal so the paint reflects as one smooth body
    geo.deleteAttribute('uv');
    geo.deleteAttribute('normal');
    const smooth = mergeVertices(geo, 1e-3);
    smooth.computeVertexNormals();
    return smooth;
  };
  const sstep = (a: number, b: number, v: number) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const top = y ? 1.61 : 1.42;
  const bodyGeo = shape(extrude(body, W, 0.16), (_x, py, pz) => (1 - 0.14 * sstep(L / 2 - 0.9, L / 2, Math.abs(pz))) * (1 - 0.06 * sstep(belt - 0.4, belt, py)));
  const glassGeo = shape(extrude(glass, W - 0.16, 0.1), (_x, py, pz) => (1 - 0.3 * sstep(belt, top, py)) * (1 - 0.1 * sstep(L / 2 - 1.4, L / 2 - 0.4, Math.abs(pz))));
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.castShadow = bodyMesh.receiveShadow = true;
  g.add(bodyMesh);
  const gh = new THREE.Mesh(glassGeo, glassMat);
  gh.castShadow = true;
  g.add(gh);
  // thin paint beltline + A-pillar trim so the greenhouse reads as a separate glass cap
  bx(g, paintMat, (W - 0.1) * 0.94, 0.04, L * 0.7, 0, belt - 0.03, -0.2, 0.02);
  // wheels: tyre + aero cover
  const tyre = M.std('#121214', 0.85);
  const cover = M.gloss(y ? '#2f3236' : '#c9cdd2', 0.35, 0.8);
  for (const [wx, wz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const w = group(g, wx * (W / 2 - 0.12), 0.37, wz * (y ? 1.45 : 1.44));
    put(w, G.cyl(0.37, 0.37, 0.26, 28), tyre, 0, 0, 0, { rz: Math.PI / 2 });
    put(w, G.cyl(0.27, 0.27, 0.27, 24), cover, 0, 0, 0, { rz: Math.PI / 2 });
    put(w, G.torus(0.2, 0.025, Math.PI * 2, 6, 24), M.metal('#8a9097', 0.3), wx * 0.14, 0, 0, { ry: Math.PI / 2 });
  }
  // slim headlights, lower intake, taillights, mirrors, charge-port door
  const nose = y ? 2.33 : 2.3;
  for (const s of [-1, 1]) {
    put(g, G.box(0.42, 0.05, 0.05, 0.02), M.glow('#eef6ff', 2.2), s * (W / 2 - 0.34), y ? 0.8 : 0.66, nose, { ry: -s * 0.25, cast: false });
    put(g, G.box(0.36, 0.06, 0.05, 0.02), M.glow('#ff2a1f', 1.8), s * (W / 2 - 0.3), y ? 0.9 : 0.84, -(y ? 2.32 : 2.28), { ry: s * 0.2, cast: false });
    put(g, G.box(0.2, 0.1, 0.09, 0.04), paintMat, s * (W / 2 + 0.05), belt + 0.08, 0.95, {});
  }
  bx(g, M.std('#111214', 0.7), W * 0.5, 0.08, 0.06, 0, 0.36, nose + 0.02, 0.02);
  put(g, G.box(0.06, 0.11, 0.14, 0.02), paintMat, W / 2 + 0.005, belt - 0.14, -(y ? 1.95 : 1.9), { cast: false });
  ctx.solidAt(x, z, Math.abs(Math.sin(ry)) > 0.5 ? L : W + 0.1, Math.abs(Math.sin(ry)) > 0.5 ? W + 0.1 : L);
  return { group: g, chargePort: new THREE.Vector3(x + W / 2, belt - 0.14, z - (y ? 1.95 : 1.9)) };
}
