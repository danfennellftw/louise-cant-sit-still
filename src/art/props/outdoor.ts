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

/** E-bike (cruiser-style, no branding). Returns wheels for spinning. */
export function ebike(p: THREE.Object3D, x: number, z: number, ry = 0, color = '#e9e2d6', basket = true) {
  const g = dynamic(group(p, x, 0, z, ry));
  const frame = M.gloss(color, 0.35, 0.7);
  const tire = M.std('#1b1b1d', 0.8);
  const wheels: THREE.Group[] = [];
  for (const wz of [-0.55, 0.55]) {
    const w = group(g, 0, 0.34, wz);
    put(w, G.torus(0.31, 0.05, Math.PI * 2, 8, 28), tire, 0, 0, 0, { ry: Math.PI / 2 });
    put(w, G.cyl(0.05, 0.05, 0.08, 10), M.metal('#bbb', 0.3), 0, 0, 0, { rz: Math.PI / 2 });
    for (let i = 0; i < 6; i++) put(w, G.box(0.01, 0.58, 0.01, 0), M.metal('#ccc', 0.3), 0, 0, 0, { rx: (i / 6) * Math.PI });
    wheels.push(w);
  }
  put(g, G.box(0.06, 0.06, 1.0, 0.02), frame, 0, 0.55, 0, { rx: 0.25 });
  put(g, G.box(0.06, 0.62, 0.06, 0.02), frame, 0, 0.62, -0.25, { rx: -0.3 });
  put(g, G.box(0.06, 0.7, 0.06, 0.02), frame, 0, 0.72, 0.45, { rx: 0.25 });
  bx(g, M.std('#2a2a2a', 0.5, 0.3), 0.12, 0.3, 0.2, 0, 0.36, -0.05, 0.03);
  bx(g, M.fabric('#6b4a2a', '#fff', 0.7), 0.2, 0.06, 0.3, 0, 0.95, -0.35, 0.03);
  bx(g, frame, 0.6, 0.04, 0.04, 0, 1.1, 0.55, 0.02);
  sp(g, M.glow('#fff4d6', 2), 0.05, 0, 0.98, 0.66, { cast: false });
  let basketG: THREE.Group | null = null;
  if (basket) {
    basketG = group(g, 0, 0.86, -0.78);
    bx(basketG, M.fabric('#b98a5a', '#fff4dc', 0.9), 0.42, 0.22, 0.32, 0, 0, 0, 0.04);
    bx(basketG, M.fabric('#f4efe6', '#fff', 0.9), 0.36, 0.04, 0.26, 0, 0.18, 0, 0.02);
  }
  return { group: g, wheels, basket: basketG };
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
