import * as THREE from 'three';
import { G, bx, cy, group, put, sp } from '../geo';
import { M } from '../materials';
import { TX } from '../textures';
import type { SetCtx } from '../../world/kit';
import { rng } from '../../engine/util';

/** Double-sided store gondola: product fronts on both faces. */
export function gondola(ctx: SetCtx, x: number, z: number, len: number, ry = 0, seed = 1, palette?: string[], shelf = '#f4f2ee') {
  const g = group(ctx.root, x, 0, z, ry);
  const sm = M.std(shelf, 0.5, 0.1);
  bx(g, sm, len, 1.6, 0.1, 0, 0, 0, 0.01);
  bx(g, M.std('#d8d4cc', 0.6), len, 0.12, 0.9, 0, 0, 0, 0.01);
  const tex = TX.products(seed, palette);
  const pm = M.tex(tex, 0.6, 0, `prod${seed}`);
  for (const side of [-1, 1]) {
    for (let s = 0; s < 4; s++) {
      bx(g, sm, len, 0.03, 0.4, 0, 0.12 + s * 0.38, side * 0.22, 0.005);
    }
    const face = new THREE.Mesh(G.plane(len - 0.04, 1.45), pm);
    face.position.set(0, 0.86, side * 0.4);
    face.rotation.y = side < 0 ? Math.PI : 0;
    g.add(face);
    const inner = new THREE.Mesh(G.box(len - 0.06, 1.45, 0.3, 0), M.std('#eae4d8', 0.8));
    inner.position.set(0, 0.86, side * 0.24);
    g.add(inner);
  }
  bx(g, M.std(palette?.[0] ?? '#e0533a', 0.6), len, 0.18, 0.04, 0, 1.62, 0, 0.01);
  ctx.solidAt(x, z, len, 0.9, ry);
  return g;
}

/** Wall shelving with products on one face. */
export function wallShelf(ctx: SetCtx, x: number, z: number, len: number, ry = 0, seed = 2, palette?: string[], h = 2.1) {
  const g = group(ctx.root, x, 0, z, ry);
  bx(g, M.std('#efece6', 0.5), len, h, 0.5, 0, 0, 0, 0.01);
  const face = new THREE.Mesh(G.plane(len - 0.06, h - 0.3), M.tex(TX.products(seed, palette), 0.6, 0, `prod${seed}`));
  face.position.set(0, h / 2 + 0.05, 0.26);
  g.add(face);
  for (let s = 0; s < 5; s++) bx(g, M.std('#ffffff', 0.4), len, 0.025, 0.12, 0, 0.18 + s * ((h - 0.3) / 4), 0.28, 0.005);
  ctx.solidAt(x, z, len, 0.6, ry);
  return g;
}

/** Round or straight clothing rack with hanging garments. */
export function clothingRack(ctx: SetCtx, x: number, z: number, ry = 0, seed = 3, palette?: string[], round = false) {
  const g = group(ctx.root, x, 0, z, ry);
  const chrome = M.metal('#d0d4d8', 0.2);
  const gm = new THREE.MeshStandardMaterial({ map: TX.garments(seed, palette), roughness: 0.9, side: THREE.DoubleSide });
  if (round) {
    cy(g, chrome, 0.03, 0.03, 1.3, 0, 0, 0, 8);
    cy(g, M.std('#2a2a2a', 0.5), 0.3, 0.35, 0.05, 0, 0, 0, 16);
    put(g, G.torus(0.6, 0.015, Math.PI * 2, 6, 32), chrome, 0, 1.3, 0, { rx: Math.PI / 2 });
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.85, 28, 1, true), gm);
    skirt.position.y = 0.86;
    g.add(skirt);
    ctx.solidAt(x, z, 1.3, 1.3);
  } else {
    for (const s of [-0.7, 0.7]) {
      cy(g, chrome, 0.02, 0.02, 1.5, s, 0, 0, 8);
      bx(g, chrome, 0.05, 0.03, 0.5, s, 0, 0, 0.01);
    }
    cy(g, chrome, 0.015, 0.015, 1.45, 0, 1.5, 0, 8, { rz: Math.PI / 2 });
    for (let i = 0; i < 2; i++) {
      const cloth = new THREE.Mesh(G.plane(1.35, 0.85), gm);
      cloth.position.set(0, 1.05, (i ? 1 : -1) * 0.1);
      g.add(cloth);
    }
    bx(g, M.std('#eee', 0.6), 1.35, 0.85, 0.16, 0, 0.62, 0, 0.02);
    ctx.solidAt(x, z, 1.5, 0.5, ry);
  }
  return g;
}

export function produceStand(ctx: SetCtx, x: number, z: number, ry = 0, fruits = ['#e8453c', '#f2c14e', '#7cbf4b', '#f08a2c']) {
  const g = group(ctx.root, x, 0, z, ry);
  const wood = M.std('#b58a5a', 0.7);
  bx(g, wood, 1.8, 0.7, 1.0, 0, 0, 0, 0.03);
  const r = rng(Math.floor(x * 10 + z));
  fruits.forEach((c, bi) => {
    const bxo = -0.66 + bi * 0.44;
    put(g, G.box(0.4, 0.14, 0.9, 0.02), wood, bxo, 0.76, 0, { rx: -0.25 });
    for (let i = 0; i < 12; i++) {
      sp(g, M.gloss(c, 0.4, 0.3), 0.055 + r() * 0.015, bxo + (r() - 0.5) * 0.3, 0.9 + (i % 3) * 0.04 - Math.floor(i / 4) * 0.02, -0.35 + (i % 4) * 0.22, {
        s: c === '#7cbf4b' ? [1, 1.3, 1] : 1,
      });
    }
  });
  ctx.solidAt(x, z, 1.8, 1.0, ry);
  return g;
}

export function fridgeCase(ctx: SetCtx, x: number, z: number, len: number, ry = 0, glow = '#dff4ff', seed = 5) {
  const g = group(ctx.root, x, 0, z, ry);
  bx(g, M.gloss('#e9edf0', 0.3, 0.5), len, 2.1, 0.8, 0, 0, 0, 0.03);
  const face = new THREE.Mesh(G.plane(len - 0.1, 1.5), M.tex(TX.products(seed, ['#e8453c', '#fff', '#f2c14e', '#9ad0f5', '#c9e7c1', '#ff9ec7']), 0.4, 0, `fr${seed}`));
  face.position.set(0, 1.0, 0.36);
  g.add(face);
  put(g, G.plane(len - 0.1, 1.5), M.glass('#e8f6ff', 0.25), 0, 1.0, 0.41, { cast: false });
  put(g, G.box(len - 0.1, 0.05, 0.05, 0.01), M.glow(glow, 2), 0, 1.8, 0.38, { cast: false });
  bx(g, M.std('#2a3a4a', 0.6), len, 0.25, 0.05, 0, 1.85, 0.41, 0.01);
  ctx.solidAt(x, z, len, 0.85, ry);
  return g;
}

export function checkout(ctx: SetCtx, x: number, z: number, ry = 0, accent = '#e0533a') {
  const g = group(ctx.root, x, 0, z, ry);
  bx(g, M.gloss('#f2efe9', 0.4, 0.3), 1.8, 0.9, 0.7, 0, 0, 0, 0.03);
  bx(g, M.std('#1d1d1f', 0.6), 1.2, 0.02, 0.5, -0.2, 0.9, 0, 0.005);
  bx(g, M.std(accent, 0.5), 1.8, 0.12, 0.02, 0, 0.7, 0.36, 0.01);
  const pole = group(g, 0.8, 0.9, -0.2);
  cy(pole, M.metal('#bbb', 0.3), 0.02, 0.02, 1.1, 0, 0, 0, 8);
  bx(pole, M.glow('#ffffff', 1.2), 0.14, 0.14, 0.14, 0, 1.1, 0, 0.03);
  bx(g, M.gloss('#1b1b1f', 0.3, 0.8), 0.35, 0.25, 0.05, 0.5, 0.95, -0.15, 0.02, { rx: -0.3 });
  ctx.solidAt(x, z, 1.8, 0.7, ry);
  return g;
}

export function cart(p: THREE.Object3D, x: number, z: number, ry = 0, accent = '#e0533a') {
  const g = group(p, x, 0, z, ry);
  const wire = M.metal('#c9cdd2', 0.3);
  bx(g, wire, 0.55, 0.45, 0.85, 0, 0.42, 0, 0.03);
  bx(g, M.std('#f0f0f0', 0.8), 0.5, 0.4, 0.8, 0, 0.45, 0, 0.02);
  cy(g, M.std(accent, 0.5), 0.02, 0.02, 0.6, 0, 1.0, -0.48, 8, { rz: Math.PI / 2 });
  for (const sx of [-0.22, 0.22]) for (const sz of [-0.35, 0.35]) cy(g, M.std('#222', 0.6), 0.05, 0.05, 0.04, sx, 0.02, sz, 10, { rz: Math.PI / 2 });
  return g;
}

export function displayTable(ctx: SetCtx, x: number, z: number, ry = 0, colors = ['#f7c8c0', '#bcd8f0', '#fff3c4', '#cfe8cf']) {
  const g = group(ctx.root, x, 0, z, ry);
  bx(g, M.std('#c9a57a', 0.55), 1.4, 0.72, 0.8, 0, 0, 0, 0.03);
  colors.forEach((c, i) => {
    for (let k = 0; k < 4; k++) bx(g, M.fabric(c, '#fff'), 0.28, 0.05, 0.3, -0.48 + i * 0.32, 0.72 + k * 0.05, 0, 0.02);
  });
  ctx.solidAt(x, z, 1.4, 0.8, ry);
  return g;
}

export function shoeWall(ctx: SetCtx, x: number, z: number, len: number, ry = 0, bg = '#f4f1ec') {
  const g = group(ctx.root, x, 0, z, ry);
  bx(g, M.std(bg, 0.5), len, 2.6, 0.3, 0, 0, 0, 0.01);
  const cols = ['#ffffff', '#ff6f59', '#1d1d1f', '#9ad0f5', '#f2c46d', '#c9e7c1', '#e7a4c8'];
  const r = rng(12);
  for (let row = 0; row < 5; row++) {
    const y = 0.5 + row * 0.45;
    bx(g, M.gloss('#ffffff', 0.3, 0.4), len - 0.2, 0.02, 0.26, 0, y, 0.15, 0.005);
    for (let i = 0; i < Math.floor(len / 0.4); i++) {
      const c = cols[Math.floor(r() * cols.length)];
      const sx = -len / 2 + 0.3 + i * 0.4;
      const shoe = group(g, sx, y + 0.02, 0.18, 0.4);
      bx(shoe, M.gloss(c, 0.4, 0.5), 0.1, 0.09, 0.26, 0, 0, 0, 0.04);
      bx(shoe, M.std('#f5f2ec', 0.7), 0.105, 0.025, 0.265, 0, 0, 0, 0.01);
    }
  }
  put(g, G.box(len - 0.1, 0.03, 0.03, 0.01), M.glow('#fff4e0', 1.6), 0, 2.55, 0.15, { cast: false });
  ctx.solidAt(x, z, len, 0.4, ry);
  return g;
}

export function mannequin(p: THREE.Object3D, x: number, z: number, ry = 0, outfit = '#e98f6b') {
  const g = group(p, x, 0, z, ry);
  const white = M.gloss('#f4f1ec', 0.3, 0.5);
  cy(g, M.metal('#bbb', 0.3), 0.2, 0.22, 0.04, 0, 0, 0, 16);
  cy(g, M.metal('#bbb', 0.3), 0.015, 0.015, 0.9, 0, 0.04, 0, 6);
  put(g, G.capsule(0.15, 0.4, 4, 12), M.fabric(outfit, '#fff'), 0, 1.25, 0, { s: [1, 1, 0.7] });
  sp(g, white, 0.11, 0, 1.72, 0);
  put(g, G.cone(0.3, 0.6, 16, true), M.fabric(outfit, '#fff'), 0, 0.9, 0);
  return g;
}

export function basketStack(p: THREE.Object3D, x: number, z: number, color = '#c9a06a', n = 3) {
  const g = group(p, x, 0, z);
  for (let i = 0; i < n; i++) {
    const s = 1 - i * 0.12;
    cy(g, M.fabric(color, '#fff4dc', 0.95), 0.25 * s, 0.2 * s, 0.24 * s, 0, i * 0.2, 0, 14);
  }
  return g;
}

export function candle(p: THREE.Object3D, x: number, y: number, z: number, color = '#f4ead8') {
  const g = group(p, x, y, z);
  cy(g, M.glass('#e8d7b8', 0.6), 0.06, 0.06, 0.12, 0, 0, 0, 14);
  cy(g, M.std(color, 0.8), 0.055, 0.055, 0.1, 0, 0.005, 0, 14);
  sp(g, M.glow('#ffb347', 3), 0.012, 0, 0.13, 0, { s: [1, 1.8, 1], cast: false });
  return g;
}

export function storefront(ctx: SetCtx, x: number, z: number, w: number, h: number, color: string, signTex: THREE.Texture, key: string) {
  const g = group(ctx.root, x, 0, z);
  const trim = M.gloss(color, 0.4, 0.4);
  bx(g, trim, 0.3, h, 0.4, -w / 2, 0, 0, 0.02);
  bx(g, trim, 0.3, h, 0.4, w / 2, 0, 0, 0.02);
  bx(g, trim, w + 0.3, 0.8, 0.4, 0, h - 0.8, 0, 0.02);
  const sign = put(g, G.plane(w * 0.8, 0.6), M.sign(signTex, 1.1, key), 0, h - 0.4, 0.22, { cast: false, receive: false });
  sign.renderOrder = 4;
  put(g, G.box(w, 0.04, 0.04, 0.01), M.glow('#fff1d6', 1.5), 0, h - 0.82, 0.22, { cast: false });
  ctx.solid(x - w / 2 - 0.2, z - 0.25, x - w / 2 + 0.2, z + 0.25);
  ctx.solid(x + w / 2 - 0.2, z - 0.25, x + w / 2 + 0.2, z + 0.25);
  return g;
}

export function spaTable(ctx: SetCtx, x: number, z: number, ry = 0) {
  const g = group(ctx.root, x, 0, z, ry);
  bx(g, M.fabric('#f4efe6', '#fff', 0.95), 0.75, 0.12, 2.0, 0, 0.7, 0, 0.05);
  bx(g, M.fabric('#cfe0d4', '#fff', 0.95), 0.72, 0.03, 1.1, 0, 0.82, 0.35, 0.02);
  for (const sx of [-0.3, 0.3]) for (const sz of [-0.85, 0.85]) cy(g, M.std('#c9a57a', 0.5), 0.03, 0.03, 0.7, sx, 0, sz, 8);
  put(g, G.torus(0.13, 0.05, Math.PI * 2, 8, 18), M.fabric('#f4efe6', '#fff'), 0, 0.8, 1.02, { rx: 0.2 });
  ctx.solidAt(x, z, 0.8, 2.0, ry);
  return g;
}
