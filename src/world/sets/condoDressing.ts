import * as THREE from 'three';
import type { SetCtx } from '../kit';
import { M } from '../../art/materials';
import { TX, ScreenTexture } from '../../art/textures';
import { G, bx, cy, put, sp, group, dynamic } from '../../art/geo';
import { tree, bush, grasses, stringLights } from '../../art/props/outdoor';

/**
 * The covered patio seen through their living-room glass (from the photo):
 * grey outdoor sectional with blue pillows, white ceramic garden stool, teak table,
 * tall ornamental grasses, then trees and the hedge line.
 */
export function patio(ctx: SetCtx, night: boolean) {
  const x0 = -3.6;
  const x1 = 3.1;
  const cx = (x0 + x1) / 2;
  put(ctx.root, G.box(12, 0.08, 6, 0), M.tex(TX.pavers('#cfc6b8', '#a89f92'), 0.85, 0, 'patiostone'), cx, -0.04, -7.5, { cast: false });
  put(ctx.root, G.box(22, 0.06, 10, 0), M.tex(TX.grass(night ? '#2f4a2a' : '#6f9448'), 0.95, 0, `lawn${night}`), cx, -0.08, -14, { cast: false });
  // white column + beam of the covered patio (roof omitted so the camera can see in)
  bx(ctx.root, M.std('#f4f1ea', 0.6), 0.28, 2.9, 0.28, x0 - 0.3, 0, -5.2, 0.02);
  bx(ctx.root, M.std('#f4f1ea', 0.6), 0.28, 2.9, 0.28, x1 + 0.5, 0, -5.2, 0.02);
  bx(ctx.root, M.std('#f4f1ea', 0.6), x1 - x0 + 1.2, 0.26, 0.28, cx + 0.1, 2.9, -5.2, 0.02);
  // L-shaped sectional
  const frame = M.std('#8e9399', 0.7, 0.2);
  const cushion = M.fabric('#d4d6d8', '#ffffff', 0.95, 0.5);
  const blue = M.fabric('#3e6fb3', '#9cf', 0.9, 0.5);
  const sec = group(ctx.root, -1.9, 0, -6.9);
  bx(sec, frame, 2.8, 0.38, 0.95, 0, 0, 0, 0.05);
  bx(sec, cushion, 2.7, 0.14, 0.85, 0, 0.38, 0.03, 0.06);
  bx(sec, frame, 2.8, 0.42, 0.22, 0, 0.38, -0.38, 0.05);
  for (let i = 0; i < 3; i++) put(sec, G.box(0.82, 0.42, 0.16, 0.08), cushion, -0.9 + i * 0.9, 0.72, -0.24, { rx: -0.15 });
  put(sec, G.box(0.46, 0.4, 0.14, 0.08), blue, -1.0, 0.74, -0.08, { rz: 0.12, rx: -0.2 });
  put(sec, G.box(0.46, 0.4, 0.14, 0.08), blue, 0.35, 0.74, -0.08, { rz: -0.1, rx: -0.2 });
  put(sec, G.box(0.4, 0.36, 0.14, 0.08), M.fabric('#f4f1ea', '#fff'), 1.05, 0.72, -0.06, { rz: 0.08, rx: -0.2 });
  const arm = group(ctx.root, 0.2, 0, -6.2);
  bx(arm, frame, 0.95, 0.38, 1.6, 0, 0, 0, 0.05);
  bx(arm, cushion, 0.85, 0.14, 1.5, 0, 0.38, 0, 0.06);
  bx(arm, frame, 0.22, 0.42, 1.6, 0.38, 0.38, 0, 0.05);
  put(arm, G.box(0.14, 0.4, 0.46, 0.08), blue, 0.24, 0.74, -0.3, { rz: -0.2 });
  // teak coffee table + flowers
  bx(ctx.root, M.std('#9a7250', 0.6), 1.3, 0.34, 0.7, -1.7, 0, -5.9, 0.03);
  cy(ctx.root, M.glass('#e8f4f0', 0.5), 0.06, 0.05, 0.22, -1.6, 0.34, -5.9, 12);
  for (let i = 0; i < 6; i++) sp(ctx.root, M.std(i % 2 ? '#f2b134' : '#e8663f', 0.6), 0.05, -1.6 + Math.cos(i) * 0.07, 0.62 + (i % 3) * 0.03, -5.9 + Math.sin(i) * 0.07);
  // white ceramic garden stool
  const stool = group(ctx.root, -3.2, 0, -5.4);
  cy(stool, M.gloss('#f7f6f2', 0.25, 0.8), 0.19, 0.17, 0.46, 0, 0, 0, 20);
  for (let i = 0; i < 6; i++) put(stool, G.torus(0.05, 0.012, Math.PI * 2, 6, 12), M.std('#d9d6cf', 0.4), Math.cos((i / 6) * Math.PI * 2) * 0.18, 0.24, Math.sin((i / 6) * Math.PI * 2) * 0.18, { ry: -(i / 6) * Math.PI * 2 + Math.PI / 2 });
  // ornamental grasses along the patio edge, then trees and hedge
  for (let i = 0; i < 14; i++) grasses(ctx.root, -6 + i * 0.95, -9.3 + (i % 2) * 0.35, 1.05, night ? '#6e6a4a' : '#d4c17e', i);
  for (let i = 0; i < 9; i++) bush(ctx.root, -7 + i * 1.8, -10.6, 1.4, night ? '#243824' : '#4f7a42');
  const tones = night ? ['#1f3322', '#243a27', '#1c2e1f'] : ['#5f8a4a', '#6f9a54', '#4f7a42'];
  for (const [tx, tz, s] of [[-6.5, -12, 1.5], [-2.2, -13, 1.8], [2.6, -12.4, 1.6], [6.8, -13.2, 1.7], [0.3, -15, 2]] as const) tree(ctx, tx, tz, s, tones, Math.floor(tx), false);
  const far = new THREE.Mesh(G.plane(40, 10), M.unlit(TX.gardenBackdrop(night), `patiofar${night}`));
  far.position.set(cx, 4.2, -18);
  ctx.root.add(far);
  if (night) {
    stringLights(ctx.root, new THREE.Vector3(x0 - 0.3, 2.8, -5.2), new THREE.Vector3(x1 + 0.5, 2.8, -5.2), 12, 0.35, '#ffcf80');
    ctx.point(cx, 2.2, -6.2, '#ffc070', 1.6, 7);
  }
}

/** Desk office nook: walnut desk, monitor with an AI chat, laptop, lamp, chair, pinboard. */
export function deskNook(ctx: SetCtx, x: number, z: number, night: boolean) {
  const g = group(ctx.root, x, 0, z, -Math.PI / 2);
  const walnut = M.std('#7a4e30', 0.45);
  const white = M.gloss('#f4f1ea', 0.4, 0.3);
  bx(g, walnut, 1.5, 0.05, 0.7, 0, 0.74, 0, 0.02);
  for (const sx of [-0.7, 0.7]) bx(g, white, 0.05, 0.74, 0.62, sx, 0, 0, 0.01);
  bx(g, white, 0.45, 0.5, 0.6, 0.45, 0.2, 0, 0.02);
  // monitor with live AI-chat screen
  const screen = new ScreenTexture(256, 150);
  const draw = (t: number) => {
    const c = screen.ctx;
    c.fillStyle = '#f6f3ee';
    c.fillRect(0, 0, 256, 150);
    c.fillStyle = '#2b1d2e';
    c.fillRect(0, 0, 58, 150);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 5; i++) c.fillRect(8, 16 + i * 18, 42, 8);
    c.fillStyle = '#e8e2f5';
    c.beginPath();
    c.roundRect(70, 14, 130, 22, 8);
    c.fill();
    c.fillStyle = '#ff9e7a';
    c.beginPath();
    c.roundRect(110, 44, 134, 22, 8);
    c.fill();
    c.fillStyle = '#e8e2f5';
    c.beginPath();
    c.roundRect(70, 74, 150, 34, 8);
    c.fill();
    c.fillStyle = 'rgba(43,29,46,0.55)';
    for (const [bx0, by, w] of [[78, 22, 100], [78, 82, 120], [78, 94, 90]]) c.fillRect(bx0, by, w, 5);
    c.fillStyle = 'rgba(255,255,255,0.8)';
    c.fillRect(118, 52, 100, 5);
    c.strokeStyle = '#d6cfc4';
    c.strokeRect(68, 120, 176, 20);
    if (Math.floor(t * 2) % 2) {
      c.fillStyle = '#2b1d2e';
      c.fillRect(74, 124, 2, 12);
    }
    screen.flush();
  };
  draw(0);
  const mon = dynamic(group(g, -0.15, 0.79, -0.18));
  bx(mon, M.gloss('#1b1b1f', 0.3, 0.6), 0.2, 0.03, 0.16, 0, 0, 0, 0.01);
  cy(mon, M.metal('#9aa0a6', 0.3), 0.02, 0.02, 0.3, 0, 0, -0.03, 8);
  bx(mon, M.gloss('#1b1b1f', 0.3, 0.6), 0.86, 0.52, 0.04, 0, 0.26, 0, 0.015);
  const sm = new THREE.Mesh(G.plane(0.8, 0.46), new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false }));
  sm.position.set(0, 0.52, 0.022);
  mon.add(sm);
  ctx.on((_dt, t) => draw(t));
  // laptop, mug, notebook, lamp
  bx(g, M.metal('#c4c8cc', 0.3), 0.34, 0.015, 0.24, 0.42, 0.79, 0.1, 0.005);
  put(g, G.box(0.34, 0.22, 0.012, 0.004), M.metal('#c4c8cc', 0.3), 0.42, 0.9, -0.02, { rx: -0.25 });
  cy(g, M.gloss('#ff9e7a', 0.4), 0.045, 0.04, 0.1, -0.55, 0.79, 0.15, 14);
  bx(g, M.std('#2f5e8f', 0.8), 0.2, 0.02, 0.26, -0.35, 0.79, 0.18, 0.005, { ry: 0.3 });
  const lamp = group(g, -0.62, 0.79, -0.2);
  cy(lamp, M.gloss('#1b1b1f', 0.3), 0.07, 0.08, 0.02, 0, 0, 0);
  put(lamp, G.box(0.02, 0.4, 0.02, 0.01), M.gloss('#1b1b1f', 0.3), 0, 0.2, 0.04, { rx: 0.3 });
  put(lamp, G.cone(0.08, 0.12, 14, true), M.gloss('#1b1b1f', 0.3), 0, 0.4, 0.12, { rx: 2.4 });
  if (night) put(lamp, G.circle(0.075, 14), M.glow('#ffd49a', 2), 0, 0.37, 0.16, { rx: Math.PI / 2 + 0.7, cast: false });
  // ergonomic chair
  const ch = group(g, 0, 0, 0.62, Math.PI + 0.2);
  cy(ch, M.gloss('#1d1d1f', 0.4, 0.5), 0.28, 0.3, 0.04, 0, 0.06, 0, 5);
  cy(ch, M.metal('#555', 0.4), 0.03, 0.03, 0.36, 0, 0.08, 0, 8);
  bx(ch, M.fabric('#3a3a40', '#888'), 0.5, 0.08, 0.48, 0, 0.44, 0, 0.04);
  put(ch, G.box(0.46, 0.6, 0.06, 0.05), M.fabric('#3a3a40', '#888'), 0, 0.84, 0.24, { rx: 0.12 });
  // pinboard + shelf above the desk
  put(g, G.box(1.0, 0.6, 0.03, 0.01), M.std('#c9a57a', 0.9), 0, 1.55, -0.36);
  const notes = ['#ffd166', '#ff9ec7', '#9ad0f5', '#b6f23a', '#ffffff'];
  notes.forEach((c, i) => put(g, G.box(0.14, 0.14, 0.005, 0), M.std(c, 0.8), -0.36 + i * 0.18, 1.5 + (i % 2) * 0.14, -0.34, { rz: (i - 2) * 0.08 }));
  bx(g, walnut, 1.0, 0.03, 0.22, 0, 1.95, -0.27, 0.01);
  for (let i = 0; i < 4; i++) bx(g, M.std(['#c9553b', '#3b8f7a', '#e0b44a', '#f4efe6'][i], 0.7), 0.05, 0.22, 0.16, -0.35 + i * 0.07, 1.98, -0.27, 0.005);
  cy(g, M.gloss('#e9e1d4', 0.5), 0.07, 0.06, 0.12, 0.3, 1.98, -0.27, 12);
  sp(g, M.foliage('#5f8a4a'), 0.1, 0.3, 2.15, -0.27, { s: [1.2, 0.8, 1.2] });
  ctx.solidAt(x, z, 0.7, 1.5);
  if (night) ctx.point(x - 0.3, 1.3, z, '#9fc8ff', 0.8, 3);
}

/** Brass floor lamp with a white drum shade (from the bedroom photo). */
export function brassFloorLamp(ctx: SetCtx, x: number, z: number, on: boolean) {
  const g = group(ctx.root, x, 0, z);
  const brass = M.metal('#c9a24a', 0.28);
  cy(g, brass, 0.15, 0.17, 0.03, 0, 0, 0, 20);
  cy(g, brass, 0.015, 0.015, 1.45, 0, 0.03, 0, 8);
  cy(g, M.fabric('#f7f2ea', '#fff'), 0.24, 0.26, 0.34, 0, 1.42, 0, 24, { cast: false });
  if (on) {
    put(g, G.circle(0.23, 18), M.glow('#ffd9a0', 2.2), 0, 1.43, 0, { rx: Math.PI / 2, cast: false });
    ctx.point(x, 1.5, z, '#ffcf8a', 2.6, 5);
  }
  ctx.solidAt(x, z, 0.35, 0.35);
}

export function flowerVase(p: THREE.Object3D, x: number, y: number, z: number, color = '#f29bb8') {
  const g = group(p, x, y, z);
  cy(g, M.gloss('#e9e3da', 0.3, 0.6), 0.06, 0.05, 0.2, 0, 0, 0, 14);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    cy(g, M.std('#5f8a4a', 0.8), 0.006, 0.006, 0.22, Math.cos(a) * 0.03, 0.18, Math.sin(a) * 0.03, 4);
    sp(g, M.std(i % 3 ? color : '#ffffff', 0.6), 0.05, Math.cos(a) * 0.08, 0.42 + (i % 2) * 0.05, Math.sin(a) * 0.08, { s: [1, 0.8, 1] });
  }
  return g;
}
