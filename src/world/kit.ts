import * as THREE from 'three';
import { G, bakeStatic, bx, cy, dynamic, group, put, sp } from '../art/geo';
import { M } from '../art/materials';
import { TX } from '../art/textures';
import { Particles, aoStrip, lightShaft } from '../art/fx';
import type { Rect } from './types';
import type { QualityLevel } from '../engine/quality';
import { rng } from '../engine/util';

/** Build context handed to every set: collects colliders, lights, particles and animators. */
export class SetCtx {
  readonly root = new THREE.Group();
  readonly dyn: THREE.Group;
  readonly colliders: Rect[] = [];
  readonly particles: Particles[] = [];
  readonly updaters: ((dt: number, t: number) => void)[] = [];
  private points = 0;
  readonly maxPoints: number;
  constructor(readonly quality: QualityLevel) {
    this.dyn = dynamic(group(this.root, 0, 0, 0, 0, 'dynamic'));
    this.maxPoints = quality === 'low' ? 2 : quality === 'medium' ? 4 : 6;
  }

  solid(x0: number, z0: number, x1: number, z1: number) {
    this.colliders.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) });
  }
  solidAt(cx: number, cz: number, w: number, d: number, ry = 0) {
    const swap = Math.abs(Math.sin(ry)) > 0.7;
    const hw = (swap ? d : w) / 2;
    const hd = (swap ? w : d) / 2;
    this.solid(cx - hw, cz - hd, cx + hw, cz + hd);
  }

  point(x: number, y: number, z: number, color: string, intensity: number, dist = 8, priority = false) {
    if (!priority && this.points >= this.maxPoints) return null;
    this.points++;
    const l = new THREE.PointLight(color, intensity, dist, 1.6);
    l.position.set(x, y, z);
    l.castShadow = false;
    this.dyn.add(l);
    return l;
  }

  dust(min: [number, number, number], max: [number, number, number], color = '#fff2d6', count = 60, size = 0.05, opacity = 0.5) {
    const n = Math.round(count * (this.quality === 'low' ? 0.4 : this.quality === 'medium' ? 0.7 : 1));
    const p = new Particles({
      count: n,
      min: new THREE.Vector3(...min),
      max: new THREE.Vector3(...max),
      color,
      size,
      opacity,
      twinkle: 0.4,
      velocity: new THREE.Vector3(0.03, 0.02, 0),
      wander: 0.2,
    });
    this.dyn.add(p.points);
    this.particles.push(p);
    return p;
  }

  on(fn: (dt: number, t: number) => void) {
    this.updaters.push(fn);
  }

  /** Merge static geometry. Call once after building. */
  bake() {
    bakeStatic(this.root);
  }
}

type Opening = [number, number, number, number]; // start, end, bottom, top

/** Wall running along X at depth z, with rectangular openings (doors/windows). */
export function wallX(ctx: SetCtx, z: number, x0: number, x1: number, h: number, mat: THREE.Material, openings: Opening[] = [], t = 0.2, collide = true) {
  const sorted = [...openings].sort((a, b) => a[0] - b[0]);
  let cur = x0;
  for (const [s, e, b, top] of sorted) {
    if (s > cur) bx(ctx.root, mat, s - cur, h, t, (cur + s) / 2, 0, z, 0);
    if (b > 0) bx(ctx.root, mat, e - s, b, t, (s + e) / 2, 0, z, 0);
    if (top < h) bx(ctx.root, mat, e - s, h - top, t, (s + e) / 2, top, z, 0);
    cur = e;
  }
  if (cur < x1) bx(ctx.root, mat, x1 - cur, h, t, (cur + x1) / 2, 0, z, 0);
  if (collide) {
    let c = x0;
    for (const [s, e, b] of sorted) {
      if (s > c) ctx.solid(c, z - t / 2 - 0.1, s, z + t / 2 + 0.1);
      if (b > 0.5) ctx.solid(s, z - t / 2 - 0.1, e, z + t / 2 + 0.1);
      c = e;
    }
    if (c < x1) ctx.solid(c, z - t / 2 - 0.1, x1, z + t / 2 + 0.1);
  }
}

/** Wall running along Z at x. */
export function wallZ(ctx: SetCtx, x: number, z0: number, z1: number, h: number, mat: THREE.Material, openings: Opening[] = [], t = 0.2, collide = true) {
  const sorted = [...openings].sort((a, b) => a[0] - b[0]);
  let cur = z0;
  for (const [s, e, b, top] of sorted) {
    if (s > cur) bx(ctx.root, mat, t, h, s - cur, x, 0, (cur + s) / 2, 0);
    if (b > 0) bx(ctx.root, mat, t, b, e - s, x, 0, (s + e) / 2, 0);
    if (top < h) bx(ctx.root, mat, t, h - top, e - s, x, top, (s + e) / 2, 0);
    cur = e;
  }
  if (cur < z1) bx(ctx.root, mat, t, h, z1 - cur, x, 0, (cur + z1) / 2, 0);
  if (collide) {
    let c = z0;
    for (const [s, e, b] of sorted) {
      if (s > c) ctx.solid(x - t / 2 - 0.1, c, x + t / 2 + 0.1, s);
      if (b > 0.5) ctx.solid(x - t / 2 - 0.1, s, x + t / 2 + 0.1, e);
      c = e;
    }
    if (c < z1) ctx.solid(x - t / 2 - 0.1, c, x + t / 2 + 0.1, z1);
  }
}

export interface RoomOpts {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  h: number;
  floor: THREE.Material;
  wall: THREE.Material;
  trim?: THREE.Material;
  back?: Opening[] | false;
  left?: Opening[] | false;
  right?: Opening[] | false;
  crown?: boolean;
  ceiling?: THREE.Material | null;
  floorY?: number;
}

/** Dollhouse room: floor, back + side walls (front open to camera), baseboards, contact AO. */
export function room(ctx: SetCtx, o: RoomOpts) {
  const w = o.x1 - o.x0;
  const d = o.z1 - o.z0;
  const floor = put(ctx.root, G.box(w, 0.1, d, 0), o.floor, (o.x0 + o.x1) / 2, (o.floorY ?? 0) - 0.05, (o.z0 + o.z1) / 2, { cast: false });
  floor.receiveShadow = true;
  const trim = o.trim ?? M.std('#f4efe6', 0.5);
  if (o.back !== false) {
    wallX(ctx, o.z0, o.x0, o.x1, o.h, o.wall, o.back ?? []);
    bx(ctx.root, trim, w, 0.12, 0.04, (o.x0 + o.x1) / 2, 0, o.z0 + 0.12, 0.01, { cast: false });
    if (o.crown) bx(ctx.root, trim, w, 0.1, 0.08, (o.x0 + o.x1) / 2, o.h - 0.1, o.z0 + 0.13, 0.02, { cast: false });
    aoStrip(ctx.root, (o.x0 + o.x1) / 2, o.z0 + 0.55, w, 0);
  }
  if (o.left !== false) {
    wallZ(ctx, o.x0, o.z0, o.z1, o.h, o.wall, o.left ?? []);
    bx(ctx.root, trim, 0.04, 0.12, d, o.x0 + 0.12, 0, (o.z0 + o.z1) / 2, 0.01, { cast: false });
    aoStrip(ctx.root, o.x0 + 0.55, (o.z0 + o.z1) / 2, d, -Math.PI / 2);
  }
  if (o.right !== false) {
    wallZ(ctx, o.x1, o.z0, o.z1, o.h, o.wall, o.right ?? []);
    bx(ctx.root, trim, 0.04, 0.12, d, o.x1 - 0.12, 0, (o.z0 + o.z1) / 2, 0.01, { cast: false });
    aoStrip(ctx.root, o.x1 - 0.55, (o.z0 + o.z1) / 2, d, Math.PI / 2);
  }
  // wall caps read as architectural section cuts in dollhouse view
  const cap = M.std('#3a2a2a', 0.8);
  if (o.left !== false) bx(ctx.root, cap, 0.22, 0.03, d, o.x0, o.h, (o.z0 + o.z1) / 2, 0, { cast: false });
  if (o.right !== false) bx(ctx.root, cap, 0.22, 0.03, d, o.x1, o.h, (o.z0 + o.z1) / 2, 0, { cast: false });
  if (o.back !== false) bx(ctx.root, cap, w + 0.22, 0.03, 0.22, (o.x0 + o.x1) / 2, o.h, o.z0, 0, { cast: false });
  return floor;
}

export function floorMat(tex: THREE.Texture, repeat: [number, number], rough = 0.6, key = '') {
  const t = tex.clone();
  t.repeat.set(repeat[0], repeat[1]);
  t.needsUpdate = true;
  t.userData.shared = true;
  return M.tex(t, rough, 0, `${key}${repeat.join('x')}`);
}

/* ---------------- common props ---------------- */

export function plant(p: THREE.Object3D, x: number, z: number, s = 1, pot = '#e9e1d4', kind: 'fig' | 'snake' | 'palm' = 'fig') {
  const g = group(p, x, 0, z);
  g.scale.setScalar(s);
  cy(g, M.gloss(pot, 0.5, 0.3), 0.2, 0.16, 0.38, 0, 0, 0, 16);
  cy(g, M.std('#4a3526', 0.95), 0.18, 0.18, 0.02, 0, 0.36, 0, 12);
  const r = rng(Math.floor(x * 13 + z * 7) + 99);
  const leaf = M.std('#4f7d45', 0.7);
  const leaf2 = M.std('#6b9a54', 0.7);
  if (kind === 'snake') {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      put(g, G.box(0.05, 0.7 + r() * 0.4, 0.015, 0.01), i % 2 ? leaf : leaf2, Math.cos(a) * 0.07, 0.72, Math.sin(a) * 0.07, { rx: Math.sin(a) * 0.15, rz: Math.cos(a) * 0.15, ry: a });
    }
  } else if (kind === 'palm') {
    cy(g, M.std('#7a5a3a', 0.9), 0.025, 0.03, 1.0, 0, 0.36, 0, 6);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      put(g, G.box(0.6, 0.02, 0.16, 0.01), i % 2 ? leaf : leaf2, Math.cos(a) * 0.3, 1.3, Math.sin(a) * 0.3, { ry: -a, rz: -0.5 });
    }
  } else {
    cy(g, M.std('#6a4a32', 0.9), 0.02, 0.025, 0.9, 0, 0.36, 0, 6);
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2;
      const y = 0.8 + r() * 0.8;
      const rr = 0.12 + r() * 0.2;
      put(g, G.sphere(0.12 + r() * 0.06, 8, 6), r() > 0.5 ? leaf : leaf2, Math.cos(a) * rr, y, Math.sin(a) * rr, { s: [1, 0.55, 1.4], ry: a, rx: 0.3 });
    }
  }
  return g;
}

export function floorLampArc(ctx: SetCtx, x: number, z: number, ry = 0, on = true) {
  const g = group(ctx.root, x, 0, z, ry);
  const wood = M.std('#9b6b44', 0.5);
  cy(g, M.std('#2a2522', 0.5, 0.4), 0.16, 0.18, 0.04, 0, 0, 0);
  cy(g, wood, 0.025, 0.025, 2.2, 0, 0.04, 0, 10);
  bx(g, wood, 0.05, 0.05, 0.9, 0, 2.18, 0.42, 0.02);
  cy(g, M.fabric('#f4ecde', '#fff', 0.9), 0.3, 0.3, 0.34, 0, 1.72, 0.85, 24, { cast: false });
  if (on) {
    put(g, G.circle(0.28, 20), M.glow('#ffe2b0', 2.2), 0, 1.721, 0.85, { rx: Math.PI / 2, cast: false });
    const wp = new THREE.Vector3(0, 1.6, 0.85).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(x, 0, z));
    ctx.point(wp.x, wp.y, wp.z, '#ffd9a0', 3.2, 6);
  }
  ctx.solidAt(x, z, 0.4, 0.4);
  return g;
}

export function tableLamp(ctx: SetCtx, p: THREE.Object3D, x: number, y: number, z: number, on: boolean, light = true) {
  const g = group(p, x, y, z);
  cy(g, M.metal('#c9a24a', 0.3), 0.07, 0.09, 0.03, 0, 0, 0);
  cy(g, M.glass('#fff9ee', 0.35), 0.07, 0.07, 0.34, 0, 0.03, 0, 14);
  cy(g, M.metal('#c9a24a', 0.3), 0.012, 0.012, 0.36, 0, 0.03, 0, 6);
  cy(g, M.fabric('#f6efe2', '#fff'), 0.17, 0.2, 0.26, 0, 0.36, 0, 22, { cast: false });
  if (on) {
    put(g, G.circle(0.17, 16), M.glow('#ffd9a0', 2), 0, 0.37, 0, { rx: Math.PI / 2, cast: false });
    if (light) {
      const wp = new THREE.Vector3();
      g.updateWorldMatrix(true, false);
      g.getWorldPosition(wp);
      ctx.point(wp.x, wp.y + 0.45, wp.z, '#ffcf8a', 2.4, 5);
    }
  }
  return g;
}

export function pendant(ctx: SetCtx, x: number, y: number, z: number, color = '#2b2522', glow = '#ffd9a0', light = true, shade: 'dome' | 'globe' | 'cage' = 'dome') {
  const g = group(ctx.root, x, 0, z);
  cy(g, M.std('#1a1a1a', 0.5), 0.006, 0.006, 3.5 - y, 0, y + 0.25, 0, 4, { cast: false });
  if (shade === 'globe') {
    sp(g, M.glow(glow, 1.6), 0.16, 0, y + 0.1, 0, { cast: false });
  } else if (shade === 'cage') {
    sp(g, M.glow(glow, 3), 0.06, 0, y + 0.1, 0, { cast: false });
    put(g, G.cyl(0.11, 0.11, 0.26, 8, true), M.metal('#1c1c1c', 0.5), 0, y + 0.12, 0, { cast: false });
  } else {
    put(g, G.partSphere(0.24, Math.PI * 0.5, 22, 8), M.gloss(color, 0.4, 0.5), 0, y + 0.25, 0, { cast: false });
    put(g, G.circle(0.2, 18), M.glow(glow, 2.4), 0, y + 0.08, 0, { rx: Math.PI / 2, cast: false });
  }
  if (light) ctx.point(x, y - 0.1, z, glow, 2.2, 6);
  return g;
}

/** Window with frame, unlit backdrop, optional curtains (animated sway) and sun shaft. */
export function windowUnit(
  ctx: SetCtx,
  x: number,
  z: number,
  w: number,
  h: number,
  y: number,
  backdrop: THREE.Texture,
  opts: { curtains?: string; shaft?: string; frame?: string; side?: 'back' | 'left' | 'right'; shade?: string; key?: string; noBackdrop?: boolean } = {}
) {
  const side = opts.side ?? 'back';
  const ry = side === 'back' ? 0 : side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  const g = group(ctx.root, x, y, z, ry);
  const frame = M.std(opts.frame ?? '#f3eee6', 0.5);
  if (!opts.noBackdrop) {
    const bd = new THREE.Mesh(G.plane(w, h), M.unlit(backdrop, `bd${opts.key ?? backdrop.uuid}`));
    bd.position.set(0, h / 2, -0.12);
    g.add(bd);
  }
  put(g, G.plane(w, h), M.glass('#dff1f7', 0.12), 0, h / 2, -0.02, { cast: false, receive: false });
  bx(g, frame, w + 0.16, 0.08, 0.16, 0, -0.04, 0, 0.01);
  bx(g, frame, w + 0.16, 0.08, 0.16, 0, h - 0.04, 0, 0.01);
  bx(g, frame, 0.08, h, 0.16, -w / 2 - 0.04, 0, 0, 0.01);
  bx(g, frame, 0.08, h, 0.16, w / 2 + 0.04, 0, 0, 0.01);
  bx(g, frame, 0.04, h, 0.06, 0, 0, 0, 0.01);
  if (opts.shade) {
    bx(g, M.fabric(opts.shade, '#9ab'), w, h * 0.92, 0.03, 0, h * 0.08, 0.06, 0.005);
    put(g, G.plane(0.05, h * 0.9), M.glow('#6fb6ff', 1.4), -w / 2 + 0.02, h * 0.53, 0.04, { cast: false });
    put(g, G.plane(0.05, h * 0.9), M.glow('#6fb6ff', 1.4), w / 2 - 0.02, h * 0.53, 0.04, { cast: false });
  }
  if (opts.curtains) {
    const cm = M.fabric(opts.curtains, '#fff', 0.9);
    cy(g, M.metal('#b09060', 0.3), 0.015, 0.015, w + 0.9, 0, h + 0.18, 0.18, 8, { rz: Math.PI / 2 });
    for (const s of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(0.55, h + 0.3, 6, 10);
      const base = (geo.attributes.position.array as Float32Array).slice();
      const c = new THREE.Mesh(geo, cm);
      (cm as THREE.MeshPhysicalMaterial).side = THREE.DoubleSide;
      c.position.set(s * (w / 2 + 0.2), (h + 0.3) / 2 - 0.12, 0.2);
      c.castShadow = true;
      dynamic(c);
      g.add(c);
      const ph = Math.random() * 10;
      ctx.on((_dt, t) => {
        const pos = geo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const bxv = base[i * 3];
          const byv = base[i * 3 + 1];
          const down = (h / 2 - byv) / h;
          pos.setZ(i, Math.sin(bxv * 14 + ph) * 0.04 + Math.sin(t * 1.3 + byv * 2 + ph) * 0.035 * down);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
      });
    }
  }
  if (opts.shaft) {
    const shaft = lightShaft(ctx.dyn, 0, 0, 0, w * 0.9, h * 2.1, opts.shaft, 0.1, 0.75);
    const wp = new THREE.Vector3(0, h, 0.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(x, y, z));
    shaft.position.copy(wp);
    shaft.rotation.y = ry;
  }
  return g;
}

export function door(ctx: SetCtx, x: number, z: number, side: 'back' | 'left' | 'right', color = '#f3eee6', glow = true) {
  const ry = side === 'back' ? 0 : side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  const g = group(ctx.root, x, 0, z, ry);
  const frame = M.std('#efe8dc', 0.5);
  bx(g, frame, 1.2, 2.3, 0.14, 0, 0, 0.02, 0.01);
  bx(g, M.gloss(color, 0.45, 0.4), 1.0, 2.14, 0.08, 0, 0, 0.06, 0.02);
  for (const yy of [0.35, 1.25]) bx(g, M.gloss(color, 0.5, 0.3), 0.76, 0.7, 0.02, 0, yy, 0.105, 0.01);
  sp(g, M.metal('#c9a24a', 0.25), 0.035, 0.38, 1.05, 0.14);
  if (glow) {
    const sign = put(g, G.plane(0.9, 0.22), M.sign(TX.sign('EXIT', { w: 256, h: 64, fg: '#ffffff', glow: '#ff9e7a' }), 1.4, 'exit'), 0, 2.5, 0.1, { cast: false, receive: false });
    sign.renderOrder = 5;
  }
  return g;
}

export function signBoard(p: THREE.Object3D, tex: THREE.Texture, x: number, y: number, z: number, w: number, h: number, ry = 0, emissive = 0.9, key = '') {
  const m = put(p, G.plane(w, h), M.sign(tex, emissive, key), x, y, z, { ry, cast: false, receive: false });
  m.renderOrder = 4;
  return m;
}

export function rug(p: THREE.Object3D, x: number, z: number, w: number, d: number, tex: THREE.Texture, ry = 0, key = 'rug') {
  const t = tex.clone();
  t.repeat.set(w / 2.2, d / 2.2);
  t.needsUpdate = true;
  t.userData.shared = true;
  const m = put(p, G.box(w, 0.035, d, 0.015), M.fabric('#ffffff', '#ffffff', 1, 0.5), x, 0.018, z, { ry, cast: false });
  m.material = new THREE.MeshPhysicalMaterial({ map: t, roughness: 1, sheen: 0.8, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.8 });
  m.material.userData.key = key;
  return m;
}

export function bench(p: THREE.Object3D, x: number, z: number, ry = 0, wood = '#a0714a', len = 1.6) {
  const g = group(p, x, 0, z, ry);
  bx(g, M.std(wood, 0.6), len, 0.07, 0.42, 0, 0.42, 0, 0.02);
  bx(g, M.std(wood, 0.6), len, 0.36, 0.06, 0, 0.55, -0.2, 0.02, { rx: -0.12 });
  for (const s of [-1, 1]) bx(g, M.std('#2f2f33', 0.5, 0.6), 0.06, 0.42, 0.42, s * (len / 2 - 0.12), 0, 0, 0.01);
  return g;
}

export function ceilingFan(ctx: SetCtx, x: number, y: number, z: number, speed = 2.2, wood = '#8a5a36') {
  const g = group(ctx.root, x, y, z);
  cy(g, M.metal('#d8d2c8', 0.4), 0.012, 0.012, 0.4, 0, 0, 0, 6, { cast: false });
  const hub = dynamic(group(g, 0, -0.05, 0));
  cy(hub, M.metal('#d8d2c8', 0.35), 0.11, 0.13, 0.12, 0, -0.06, 0, 16);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    put(hub, G.box(0.62, 0.015, 0.14, 0.006), M.std(wood, 0.5), Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42, { ry: -a, rx: 0.08 });
  }
  sp(hub, M.glow('#fff1d6', 1.2), 0.08, 0, -0.12, 0, { cast: false });
  ctx.on((dt) => (hub.rotation.y += dt * speed));
  return g;
}

/** Hills / backdrop mound for outdoor sets. */
export function hill(p: THREE.Object3D, x: number, z: number, w: number, h: number, d: number, color: string, seed = 1) {
  const geo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const r = rng(seed);
  const offs = Array.from({ length: 6 }, () => r() * 10);
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const n = Math.sin(vx * 3 + offs[0]) * 0.06 + Math.sin(vz * 4 + offs[1]) * 0.05 + Math.sin((vx + vz) * 6 + offs[2]) * 0.03;
    pos.setY(i, pos.getY(i) * (1 + n));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M.std(color, 0.95));
  m.scale.set(w, h, d);
  m.position.set(x, -0.02, z);
  m.receiveShadow = true;
  m.castShadow = false;
  p.add(m);
  return m;
}
