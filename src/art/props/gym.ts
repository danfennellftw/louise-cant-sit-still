import * as THREE from 'three';
import { G, bx, cy, dynamic, group, put, sp } from '../geo';
import { M } from '../materials';
import { TX } from '../textures';
import type { SetCtx } from '../../world/kit';

/** Stationary spin bike; returns its flywheel so the set can spin it with class energy. */
export function spinBike(ctx: SetCtx, x: number, z: number, ry = 0, accent = '#ff3d7f', frame = '#1c1c20') {
  const g = group(ctx.root, x, 0, z, ry);
  const fm = M.gloss(frame, 0.35, 0.6);
  bx(g, fm, 0.1, 0.06, 1.1, 0, 0, 0, 0.02);
  bx(g, fm, 0.6, 0.06, 0.1, 0, 0, 0.5, 0.02);
  bx(g, fm, 0.6, 0.06, 0.1, 0, 0, -0.5, 0.02);
  put(g, G.box(0.08, 0.9, 0.08, 0.02), fm, 0, 0.5, -0.15, { rx: 0.35 });
  put(g, G.box(0.08, 0.95, 0.08, 0.02), fm, 0, 0.5, 0.3, { rx: -0.25 });
  bx(g, M.std('#111', 0.6), 0.2, 0.06, 0.3, 0, 0.93, -0.28, 0.03);
  bx(g, fm, 0.46, 0.04, 0.05, 0, 1.03, 0.45, 0.02);
  for (const s of [-1, 1]) bx(g, M.std(accent, 0.5), 0.05, 0.04, 0.18, s * 0.2, 1.03, 0.55, 0.02);
  const wheel = dynamic(group(g, 0, 0.42, 0.42));
  put(wheel, G.cyl(0.26, 0.26, 0.06, 28), M.metal('#b8bcc2', 0.25), 0, 0, 0, { rz: Math.PI / 2 });
  put(wheel, G.box(0.07, 0.4, 0.04, 0), M.std(accent, 0.4), 0, 0, 0);
  put(wheel, G.torus(0.26, 0.012, Math.PI * 2, 6, 28), M.glow(accent, 1.4), 0.035, 0, 0, { ry: Math.PI / 2, cast: false });
  const cranks = dynamic(group(g, 0, 0.42, 0.0));
  bx(cranks, fm, 0.34, 0.03, 0.03, 0, 0, 0, 0.01);
  ctx.solidAt(x, z, 0.6, 1.2, ry);
  return { group: g, wheel, cranks };
}

export function squatRack(ctx: SetCtx, x: number, z: number, accent = '#f2c230') {
  const g = group(ctx.root, x, 0, z);
  const steel = M.gloss('#1b1b1d', 0.3, 0.8);
  for (const sx of [-0.7, 0.7]) for (const sz of [-0.5, 0.5]) bx(g, steel, 0.08, 2.4, 0.08, sx, 0, sz, 0.01);
  for (const sz of [-0.5, 0.5]) bx(g, steel, 1.5, 0.08, 0.08, 0, 2.32, sz, 0.01);
  for (const sx of [-0.7, 0.7]) bx(g, steel, 0.08, 0.08, 1.0, sx, 2.32, 0, 0.01);
  bx(g, M.std(accent, 0.5), 1.4, 0.02, 0.9, 0, 0.01, 0, 0.005);
  bx(g, M.std('#2a2a2a', 0.9), 1.3, 0.02, 0.8, 0, 0.03, 0, 0.005);
  const bar = group(g, 0, 1.35, 0.5);
  cy(bar, M.metal('#cfd3d8', 0.2), 0.018, 0.018, 2.2, 0, -1.1, 0, 10, { rz: Math.PI / 2 });
  for (const s of [-1, 1]) {
    cy(bar, M.gloss('#1a1a1a', 0.5, 0.3), 0.23, 0.23, 0.07, s * 0.85, -0.035, 0, 24, { rz: Math.PI / 2 });
    cy(bar, M.gloss(accent, 0.4), 0.18, 0.18, 0.06, s * 0.93, -0.03, 0, 20, { rz: Math.PI / 2 });
  }
  ctx.solidAt(x, z, 1.6, 1.1);
  return g;
}

export function dumbbellRack(ctx: SetCtx, x: number, z: number, ry = 0, len = 2.4, accent = '#1b1b1d') {
  const g = group(ctx.root, x, 0, z, ry);
  const steel = M.gloss('#222226', 0.35, 0.7);
  for (const tier of [0, 1]) {
    bx(g, steel, len, 0.05, 0.3, 0, 0.45 + tier * 0.3, tier * -0.2, 0.01, { rx: 0.2 });
    const n = Math.floor(len / 0.24);
    for (let i = 0; i < n; i++) {
      const dxp = -len / 2 + 0.12 + i * 0.24;
      const r = 0.05 + (i / n) * 0.04;
      const db = group(g, dxp, 0.55 + tier * 0.3, tier * -0.2);
      cy(db, M.metal('#b8bcc2', 0.3), 0.012, 0.012, 0.18, 0, -0.09, 0, 6, { rx: Math.PI / 2 });
      for (const s of [-1, 1]) cy(db, M.gloss(accent, 0.45, 0.4), r, r, 0.05, 0, -0.025, s * 0.09, 6, { rx: Math.PI / 2 });
    }
  }
  for (const s of [-1, 1]) bx(g, steel, 0.06, 0.8, 0.5, s * (len / 2 - 0.05), 0, -0.1, 0.01);
  ctx.solidAt(x, z, len, 0.6, ry);
  return g;
}

export function weightBench(ctx: SetCtx, x: number, z: number, ry = 0, pad = '#1c1c1f') {
  const g = group(ctx.root, x, 0, z, ry);
  bx(g, M.gloss('#2a2a2c', 0.35, 0.7), 0.08, 0.38, 1.1, 0, 0, 0, 0.01);
  bx(g, M.fabric(pad, '#666', 0.7), 0.32, 0.1, 1.2, 0, 0.4, 0, 0.04);
  ctx.solidAt(x, z, 0.4, 1.2, ry);
  return g;
}

/** Treadmill with a scrolling belt texture. */
export function treadmill(ctx: SetCtx, x: number, z: number, ry = 0, accent = '#18c3c9') {
  const g = group(ctx.root, x, 0, z, ry);
  const body = M.gloss('#2a2d31', 0.35, 0.6);
  bx(g, body, 0.8, 0.18, 1.9, 0, 0, 0, 0.05);
  const beltTex = TX.speckle('#1a1a1a', ['#333', '#444'], 1500, 2, 'belt').clone();
  beltTex.repeat.set(1, 4);
  beltTex.needsUpdate = true;
  const belt = put(g, G.plane(0.6, 1.7), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.9 }), 0, 0.185, 0, { rx: -Math.PI / 2, cast: false });
  dynamic(belt);
  for (const s of [-1, 1]) put(g, G.box(0.06, 1.2, 0.06, 0.02), body, s * 0.36, 0.7, 0.85, { rx: -0.15 });
  bx(g, body, 0.8, 0.3, 0.2, 0, 1.2, 0.95, 0.04, { rx: -0.5 });
  put(g, G.plane(0.5, 0.18), M.glow(accent, 1.3), 0, 1.38, 0.9, { rx: -0.5 - Math.PI * 0, cast: false }).rotation.x = 0.9;
  bx(g, body, 0.72, 0.04, 0.04, 0, 1.1, 0.7, 0.01);
  ctx.on((dt) => {
    beltTex.offset.y -= dt * 1.4;
  });
  ctx.solidAt(x, z, 0.85, 2.0, ry);
  return g;
}

export function kettlebells(p: THREE.Object3D, x: number, z: number, colors = ['#f2c230', '#e0533a', '#3a8fe0', '#2f2f33']) {
  const g = group(p, x, 0, z);
  colors.forEach((c, i) => {
    const kb = group(g, i * 0.34, 0, 0);
    sp(kb, M.gloss(c, 0.4, 0.4), 0.12, 0, 0.12, 0, { s: [1, 0.95, 1] });
    put(kb, G.torus(0.07, 0.018, Math.PI, 8, 12), M.gloss('#1d1d1f', 0.4), 0, 0.22, 0);
  });
  return g;
}

export function plyoBoxes(ctx: SetCtx, x: number, z: number, color = '#2f2f33', accent = '#f2c230') {
  const g = group(ctx.root, x, 0, z);
  [[0, 0, 0.75], [0.8, 0, 0.6], [0.4, 0.75, 0.45]].forEach(([ox, oy, h], i) => {
    bx(g, M.std(i === 2 ? accent : color, 0.8), 0.7, h, 0.6, ox, oy, 0, 0.04);
  });
  ctx.solidAt(x + 0.4, z, 1.6, 0.7);
  return g;
}

export function lockers(ctx: SetCtx, x: number, z: number, n = 5, color = '#3c6e8f', ry = 0) {
  const g = group(ctx.root, x, 0, z, ry);
  for (let i = 0; i < n; i++) {
    bx(g, M.gloss(color, 0.4, 0.5), 0.45, 1.9, 0.5, (i - (n - 1) / 2) * 0.47, 0, 0, 0.02);
    for (let k = 0; k < 3; k++) bx(g, M.std('#1a1a1a', 0.7), 0.25, 0.02, 0.01, (i - (n - 1) / 2) * 0.47, 1.5 + k * 0.05, 0.255, 0);
  }
  ctx.solidAt(x, z, n * 0.47, 0.5, ry);
  return g;
}

export function mirrorWall(p: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, ry = 0) {
  const m = new THREE.MeshStandardMaterial({ color: '#c9d6de', roughness: 0.05, metalness: 1, envMapIntensity: 1.6 });
  return put(p, G.box(w, h, 0.02, 0), m, x, y + h / 2, z, { ry, cast: false });
}

export function exerciseBall(p: THREE.Object3D, x: number, z: number, color: string, r = 0.32) {
  return sp(p, M.gloss(color, 0.35, 0.5), r, x, r, z);
}

export function stairClimber(ctx: SetCtx, x: number, z: number, ry = 0, accent = '#8bd14a') {
  const g = group(ctx.root, x, 0, z, ry);
  const body = M.gloss('#2a2d31', 0.35, 0.6);
  bx(g, body, 0.9, 1.6, 0.9, 0, 0, -0.3, 0.06);
  const steps = dynamic(group(g, 0, 0, 0.25));
  for (let i = 0; i < 4; i++) bx(steps, M.std('#1b1b1b', 0.7), 0.7, 0.05, 0.3, 0, 0.2 + i * 0.28, -i * 0.12, 0.01);
  bx(g, M.glow(accent, 1.2), 0.5, 0.12, 0.02, 0, 1.4, 0.16, 0.01);
  for (const s of [-1, 1]) bx(g, body, 0.05, 1.1, 0.05, s * 0.4, 0, 0.5, 0.01);
  ctx.on((_dt, t) => (steps.position.y = Math.sin(t * 4) * 0.03));
  ctx.solidAt(x, z, 1.0, 1.4, ry);
  return g;
}

export function turfLane(p: THREE.Object3D, x: number, z: number, w: number, d: number, color = '#3b8a3e') {
  const g = group(p, x, 0, z);
  put(g, G.box(w, 0.03, d, 0), M.tex(TX.grass(color), 0.95, 0, `turf${color}`), 0, 0.015, 0, { cast: false });
  for (let i = 1; i < 5; i++) put(g, G.box(w, 0.005, 0.06, 0), M.std('#f4f4f4', 0.8), 0, 0.034, -d / 2 + (d / 5) * i, { cast: false });
  return g;
}

export function sled(p: THREE.Object3D, x: number, z: number, accent = '#8bd14a') {
  const g = dynamic(group(p, x, 0, z));
  bx(g, M.gloss('#222', 0.35, 0.7), 0.7, 0.08, 0.9, 0, 0, 0, 0.02);
  for (const s of [-1, 1]) put(g, G.box(0.06, 1.0, 0.06, 0.02), M.gloss('#222', 0.3, 0.8), s * 0.25, 0.5, 0.35, { rx: -0.3 });
  cy(g, M.gloss(accent, 0.4), 0.22, 0.22, 0.08, 0, 0.1, -0.1, 20);
  cy(g, M.gloss('#1a1a1a', 0.4), 0.22, 0.22, 0.08, 0, 0.18, -0.1, 20);
  return g;
}

export function punchingBag(ctx: SetCtx, x: number, z: number, color = '#b3261e') {
  const g = dynamic(group(ctx.root, x, 3.2, z));
  cy(g, M.std('#222', 0.5, 0.6), 0.005, 0.005, 0.9, 0, -0.9, 0, 4, { cast: false });
  cy(g, M.gloss(color, 0.5, 0.3), 0.2, 0.2, 1.0, 0, -1.9, 0, 18);
  ctx.on((_dt, t) => {
    g.rotation.z = Math.sin(t * 1.7) * 0.04;
    g.rotation.x = Math.sin(t * 1.3 + 1) * 0.03;
  });
  ctx.solidAt(x, z, 0.5, 0.5);
  return g;
}

export function neonStrip(p: THREE.Object3D, x: number, y: number, z: number, len: number, color: string, ry = 0, vertical = false) {
  return put(p, vertical ? G.box(0.04, len, 0.04, 0.015) : G.box(len, 0.04, 0.04, 0.015), M.glow(color, 2.4), x, y, z, { ry, cast: false });
}
