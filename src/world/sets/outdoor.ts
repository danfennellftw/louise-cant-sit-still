import * as THREE from 'three';
import { SetCtx, floorMat, signBoard, bench, hill } from '../kit';
import { KITS, CAM_OUTDOOR, makeSet } from '../lighting';
import { M } from '../../art/materials';
import { TX } from '../../art/textures';
import { G, bx, cy, dynamic, group, put, sp } from '../../art/geo';
import { Leaves, skyDome } from '../../art/fx';
import { tree, palm, bush, cafeTable, stringLights, lampPost, rock, missionArch, boat, kiosk, planter, water, chainLink } from '../../art/props/outdoor';
import { spawnNpc } from '../npc';
import type { BuiltSet, CamSpec } from '../types';
import type { QualityLevel } from '../../engine/quality';
import { rng } from '../../engine/util';

const LOCALS = { tops: ['#f4a6a0', '#9ad0f5', '#fff3c4', '#c9e7c1', '#e8d4b8', '#37474f', '#ffffff', '#b48cff'], bottoms: ['#2a3a5a', '#e7dccb', '#3a3a3a', '#8a6a4a'] };

/* =================== Coffee plaza (Louise finds her AI people) =================== */
export function buildPlaza(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  ctx.dyn.add(skyDome('#8ec9f0', '#e8f3f7', '#d8c3a5'));
  put(ctx.root, G.box(44, 0.1, 30, 0), floorMat(TX.pavers(), [11, 7.5], 0.8, 'plazaf'), 0, -0.05, -2, { cast: false });
  for (const [x, z, w, h, c, s] of [[-40, -45, 30, 9, '#b9c7a0', 1], [0, -55, 40, 12, '#a9b98f', 2], [38, -48, 28, 10, '#bcc9a4', 3]] as const) hill(ctx.root, x, z, w, h, 14, c, s);
  // storefront facades along the back
  const facades: [number, number, string, string][] = [
    [-8, 4.4, '#f3e3cc', '#e07a5f'], [-2.6, 5.2, '#f6efe4', '#3d8c7a'], [3.2, 4.6, '#e8d4b8', '#f2b134'], [8.6, 5.0, '#f1e6d6', '#8a6fb5'],
  ];
  for (const [x, h, wallC, awn] of facades) {
    bx(ctx.root, M.std(wallC, 0.9), 5.2, h, 1.2, x, 0, -7.4, 0.04);
    bx(ctx.root, M.std('#ffffff', 0.6), 5.3, 0.18, 1.3, x, h - 0.2, -7.4, 0.02);
    put(ctx.root, G.plane(3.6, 1.8), M.glass('#fff4dc', 0.55), x, 1.3, -6.78, { cast: false });
    put(ctx.root, G.plane(3.5, 1.7), M.glow('#ffe6b8', 0.35), x, 1.3, -6.8, { cast: false });
    for (let i = 0; i < 6; i++) put(ctx.root, G.box(0.62, 0.04, 1.1, 0.01), M.fabric(i % 2 ? awn : '#fbf6ee', '#fff'), x - 1.55 + i * 0.62, 2.6, -6.4, { rx: 0.35 });
  }
  ctx.solid(-11, -8.2, 11.5, -6.7);
  kiosk(ctx, -5.2, -4.8, 0, '#3d8c7a', '#f6efe4');
  signBoard(ctx.root, TX.sign('CAFE', { w: 256, h: 96, bg: '#3d8c7a', fg: '#fff6ec', spacing: 6 }), -5.2, 3.15, -4.3, 1.4, 0.52, 0, 0.4, 'cafe');
  cafeTable(ctx, -1.8, -2.6, '#e07a5f', 1);
  cafeTable(ctx, 0.8, -4.2, '#fbf6ee', 2);
  cafeTable(ctx, -7.6, -1.2, '#f2b134', 3);
  cafeTable(ctx, 7.4, -3.4, '#8a6fb5', 4);
  cafeTable(ctx, 3.4, -1.4, '#ff9e7a', 0);
  bench(ctx.root, -6.2, 3.3, 0, '#a0714a', 1.8);
  ctx.solidAt(-6.2, 3.3, 1.8, 0.5);
  for (const [x, z] of [[-10.2, -5.2], [10.4, -5.4], [-10.4, 3.8], [10.2, 3.6]]) {
    lampPost(ctx, x, z, '#ffd48a', false, 3.4);
  }
  const L = (x: number, z: number) => new THREE.Vector3(x, 3.75, z);
  stringLights(ctx.root, L(-10.2, -5.2), L(10.4, -5.4), 22, 0.7);
  stringLights(ctx.root, L(-10.4, 3.8), L(10.4, -5.4), 22, 0.9);
  stringLights(ctx.root, L(-10.2, -5.2), L(10.2, 3.6), 22, 0.9);
  const jac = ['#9b7fd6', '#b39ae6', '#8a6fc8'];
  tree(ctx, -9.8, 0.6, 1.1, jac, 3);
  tree(ctx, 10.0, -0.8, 1.0, jac, 5);
  palm(ctx, -11.5, -3.0, 6.5, 2);
  palm(ctx, 11.8, 2.5, 7, 4);
  planter(ctx.root, -3.8, 3.6, 1.6, '#ff8fb1');
  planter(ctx.root, 2.4, 3.8, 1.6, '#ffd166');
  ctx.solidAt(-3.8, 3.6, 1.6, 0.6);
  ctx.solidAt(2.4, 3.8, 1.6, 0.6);
  bush(ctx.root, 6.4, 3.8, 1, '#5f8a4a', '#ff8fb1');
  bush(ctx.root, -11, -6, 1.2, '#5f8a4a');
  // the meetup: three locals around the table
  const npcs = [
    spawnNpc(ctx, 101, 2.7, -1.9, 0.8, 'relax', LOCALS),
    spawnNpc(ctx, 102, 4.1, -1.9, -0.8, 'relax', LOCALS),
    spawnNpc(ctx, 103, 3.4, -2.3, 0, 'idle', LOCALS),
    spawnNpc(ctx, 104, -5.2, -5.6, 0, 'work', LOCALS),
    spawnNpc(ctx, 105, -1.1, -1.6, -2.4, 'relax', LOCALS),
  ];
  const leaves = new Leaves(q === 'low' ? 24 : 60, new THREE.Vector3(12, 2.2, 7), ['#a98ae0', '#c6b0f0', '#8f73cf']);
  ctx.dust([-10, 0.4, -6], [10, 3, 4], '#fff4d6', 60, 0.05, 0.4);
  return makeSet(ctx, {
    bounds: { x0: -10.2, z0: -6.2, x1: 10.2, z1: 4.6 },
    spawn: { x: 9.2, z: 2.2, face: -Math.PI / 2 },
    exit: { x: 9.6, z: 2.2, label: 'Head out' },
    stops: [
      {
        id: 'meetup', label: 'Find her AI people', verb: 'Say hi', pos: [3.4, -0.2], stand: [3.4, -0.3], face: Math.PI, pose: 'wave',
        mini: {
          type: 'dialogue', title: 'Coffee meetup: find the AI people',
          lines: [
            { who: 'louise', text: 'Hi! Is anyone here into AI?' },
            { who: 'npc', name: 'Stranger', text: 'I love my phone.' },
            { who: 'npc', name: 'Another', text: 'Is that… the same thing?' },
          ],
          choices: [
            { label: 'Gently explain LLMs & why they’re cool', reply: [{ who: 'narrator', text: 'Thirty seconds of pure joy. Polite smiles. Still looking for her AI people — but brave, and kind.' }], hearts: 3 },
            { label: 'Laugh it off & ask about their hobbies', reply: [{ who: 'npc', name: 'Stranger', text: 'I meal-plan with ChatGPT!' }, { who: 'narrator', text: 'A tiny spark. Still looking for her AI people… but closer.' }], hearts: 4 },
            { label: 'Show them the game Dan made her', reply: [{ who: 'npc', name: 'Another', text: 'Wait — how did he make this?' }, { who: 'louise', text: 'AI!' }, { who: 'narrator', text: 'Finally. Recognition.' }], hearts: 5 },
          ],
        },
        refill: 30, hearts: 3, color: '#9ad4ff', push: { dist: 5.4, height: 3.2, yaw: 0.35 },
      },
    ],
    light: KITS.plaza,
    camera: CAM_OUTDOOR,
    ambience: 'outdoor',
    music: 'retail',
    surface: 'stone',
    npcs,
    leaves,
    stealables: [{ label: 'a croissant', x: -1.8, z: -2.0, color: '#d9a066' }],
  });
}

/* =================== San Juan Creek Trail: Rancho Mission Viejo → San Juan Capistrano → Doheny / Dana Point =================== */
const CAM_TRAIL: CamSpec = { dist: 8.2, height: 4.4, fov: 50, yaw: 0, lookY: 1.4, lookAhead: 1.0 };

export function buildTrail(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  const r = rng(2024);
  const events: BuiltSet['events'] = {};
  ctx.dyn.add(skyDome('#f7b98a', '#ffe3b0', '#d9a86a'));
  put(ctx.root, G.box(80, 0.1, 210, 0), floorMat(TX.grass('#9aa85a'), [14, 36], 0.95, 'trailg'), 0, -0.05, -70, { cast: false });
  // paved bike path on the levee with the yellow centre stripe
  put(ctx.root, G.box(3.2, 0.03, 158, 0), floorMat(TX.speckle('#6e6c69', ['#5a5856', '#858380', '#4a4846'], 5000, 1.6, 'asphalt'), [1, 50], 0.9, 'asph'), 0, 0.015, -69, { cast: false });
  for (let z = 8; z > -146; z -= 3) bx(ctx.root, M.std('#f2c230', 0.6), 0.1, 0.005, 1.4, 0, 0.03, z, 0, { cast: false });
  for (const s of [-1, 1]) bx(ctx.root, M.std('#e9e4da', 0.7), 0.08, 0.005, 158, s * 1.5, 0.03, -69, 0, { cast: false });
  // San Juan Creek channel on the right: rip-rap banks, sandy bed, a trickle of water
  put(ctx.root, G.box(6.5, 0.02, 156, 0), M.tex(TX.dirt('#d9c39a'), 0.95, 0, 'creekbed'), 9.5, 0.0, -68, { cast: false });
  water(ctx, 9.6, -68, 1.6, 156, '#6a9fae', 14, 0.03);
  for (let z = 7; z > -144; z -= 1.4) {
    for (const bxp of [5.6, 6.3, 12.8, 13.5]) rock(ctx.root, bxp + (r() - 0.5) * 0.4, z + r() * 0.8, 0.35 + r() * 0.35, r() > 0.5 ? '#b8ad9c' : '#9d9383');
  }
  chainLink(ctx.root, 3.3, 6, -40);
  chainLink(ctx.root, 3.3, -50, -140);
  // plantings: sycamores + willows along the creek, oaks/sage on the hill side, citrus grove near RMV
  const syc = ['#b8a040', '#c9a84a', '#a89038'];
  const oak = ['#7d8a3e', '#8f9a48', '#6d7a36'];
  const willow = ['#8fa65a', '#9fb468', '#7f9650'];
  for (let z = 6; z > -138; z -= 6) {
    if (r() < 0.8) tree(ctx, 15 + r() * 6, z + r() * 3, 0.9 + r() * 0.5, r() > 0.5 ? syc : willow, Math.floor(z), false);
    if (r() < 0.7) tree(ctx, -(6.5 + r() * 9), z + r() * 3, 0.8 + r() * 0.5, oak, Math.floor(z) + 7, false);
    if (r() < 0.6) bush(ctx.root, -(2.6 + r() * 2), z + r() * 4, 0.6 + r() * 0.4, r() > 0.5 ? '#8a9a6a' : '#9aa87a', r() > 0.75 ? '#f2c14e' : undefined);
  }
  for (let row = 0; row < 4; row++)
    for (let i = 0; i < 7; i++) {
      const gx = -9 - row * 2.2;
      const gz = -14 - i * 2.4;
      cy(ctx.root, M.std('#6a4a32', 0.9), 0.06, 0.08, 0.7, gx, 0, gz, 6);
      put(ctx.root, G.ico(0.75, 1), M.foliage('#3f6b35'), gx, 1.25, gz, { s: [1, 0.85, 1] });
      for (let k = 0; k < 5; k++) sp(ctx.root, M.std('#f08a2c', 0.5), 0.07, gx + Math.cos(k * 1.3) * 0.6, 1.1 + (k % 3) * 0.25, gz + Math.sin(k * 1.3) * 0.6, { cast: false });
    }
  for (let i = 0; i < 10; i++) {
    const z = 10 - i * 20;
    hill(ctx.root, -34 - r() * 10, z, 16 + r() * 8, 7 + r() * 6, 12, i % 2 ? '#c9a45a' : '#b8944f', i);
    hill(ctx.root, 36 + r() * 10, z - 8, 16 + r() * 8, 6 + r() * 6, 12, i % 2 ? '#bd9a52' : '#caa862', i + 20);
  }
  const trailSign = (text: string, sub: string, z: number, key: string, bg = '#4a5a3a') => {
    signBoard(ctx.root, TX.sign(text, { w: 512, h: 128, bg, fg: '#fff3dc', sub }), -2.6, 1.55, z, 2.2, 0.55, 0.35, 0.2, key);
    bx(ctx.root, M.std('#6b4a2a', 0.8), 0.1, 1.3, 0.1, -2.6, 0, z - 0.05, 0.02);
  };
  trailSign('San Juan Creek Trail', 'RANCHO MISSION VIEJO → DOHENY', 4, 'sjct');
  trailSign('Mile 2', 'SAN JUAN CAPISTRANO 3 MI', -30, 'mi2');
  // tributary + wooden bridge
  water(ctx, -12, -45, 30, 4, '#5e97a8', 12, 0.03);
  bx(ctx.root, M.std('#8a6a4a', 0.8), 4.2, 0.18, 6.4, 0, 0.02, -45, 0.03);
  for (const s of [-1, 1]) {
    bx(ctx.root, M.std('#6b4a2a', 0.8), 0.12, 0.9, 6.4, s * 2.05, 0.2, -45, 0.02);
    for (let i = 0; i < 5; i++) bx(ctx.root, M.std('#6b4a2a', 0.8), 0.14, 1.1, 0.14, s * 2.05, 0, -47.8 + i * 1.4, 0.02);
  }
  // I-5 overpass with live traffic
  const conc = M.std('#c9c3b8', 0.9);
  bx(ctx.root, conc, 70, 1.0, 7, 0, 7.4, -62, 0.05);
  for (const s of [-1, 1]) bx(ctx.root, M.std('#bdb6aa', 0.9), 70, 0.8, 0.3, 0, 8.4, -62 + s * 3.35, 0.03);
  for (const px of [-14, -4.2, 4.2, 14]) {
    bx(ctx.root, conc, 1.0, 7.4, 5.2, px, 0, -62, 0.05);
    ctx.solidAt(px, -62, 1.0, 5.2);
  }
  signBoard(ctx.root, TX.sign('I-5', { w: 128, h: 128, bg: '#1f5fa8', fg: '#ffffff', border: '#ffffff' }), 0, 7.8, -58.45, 0.9, 0.9, 0, 0.3, 'i5');
  const traffic = dynamic(group(ctx.root, 0, 8.5, -62));
  const carCols = ['#f2f3f5', '#2a2d31', '#b3261e', '#8a9097', '#2f5e8f', '#f2c230'];
  const cars = carCols.map((c, i) => {
    const car = group(traffic, -35 + i * 12, 0, i % 2 ? 1.5 : -1.5);
    bx(car, M.gloss(c, 0.3, 0.8), 4, 0.7, 1.8, 0, 0, 0, 0.25);
    bx(car, M.gloss('#1e2328', 0.1, 1), 2.2, 0.5, 1.6, -0.2, 0.62, 0, 0.2);
    return car;
  });
  // railroad trestle with a passing coastal train (and its horn)
  const steel = M.std('#6a6660', 0.6, 0.5);
  bx(ctx.root, steel, 90, 0.7, 3.2, 0, 7.0, -104, 0.03);
  for (const px of [-20, -11, -4.5, 4.5, 11, 20]) {
    bx(ctx.root, conc, 0.9, 7.0, 2.6, px, 0, -104, 0.04);
    ctx.solidAt(px, -104, 0.9, 2.6);
  }
  for (const s of [-1, 1]) bx(ctx.root, M.metal('#8a8a8a', 0.4), 90, 0.08, 0.08, 0, 7.72, -104 + s * 0.72, 0);
  const train = dynamic(group(ctx.root, -120, 7.78, -104));
  const livery = [M.gloss('#1f4f8f', 0.35, 0.6), M.gloss('#c9ced3', 0.3, 0.8)];
  for (let i = 0; i < 5; i++) {
    const car = group(train, -i * 13.2, 0, 0);
    bx(car, livery[1], 12.8, 3.2, 3.0, 0, 0, 0, 0.4);
    bx(car, livery[0], 12.9, 0.7, 3.02, 0, 0.9, 0, 0.1);
    bx(car, M.gloss('#1e2328', 0.1, 1), 12, 0.6, 3.04, 0, 2.0, 0, 0.05);
    if (i === 0) sp(car, M.glow('#fff4d6', 3), 0.25, 6.45, 1.2, 0, { cast: false });
  }
  let trainT = 2;
  let honked = false;
  ctx.on((dt) => {
    cars.forEach((car, i) => {
      car.position.x += dt * (i % 2 ? -14 : 16);
      if (car.position.x > 38) car.position.x = -38;
      if (car.position.x < -38) car.position.x = 38;
    });
    trainT -= dt;
    if (trainT < 0) {
      train.position.x += dt * 26;
      if (!honked && train.position.x > -70) {
        honked = true;
        events.sfx?.('horn', train.position);
      }
      if (train.position.x > 150) {
        train.position.x = -120;
        trainT = 16 + r() * 8;
        honked = false;
      }
    }
  });
  // San Juan Capistrano: Los Rios cottages + mission bells
  missionArch(ctx, -8, -85, Math.PI / 2);
  bx(ctx.root, M.std('#efe0c6', 0.95), 0.6, 1.2, 12, -8.4, 0, -76, 0.05);
  const cottages: [number, number, string, string][] = [[-12, -77, '#e8d8b8', '#7a5a3a'], [-12.5, -91, '#cfe0d0', '#5a4a3a'], [-16, -84, '#f2d6c4', '#6a4a3a']];
  for (const [hx, hz, wall, roof] of cottages) {
    bx(ctx.root, M.std(wall, 0.9), 3.2, 2.2, 3.0, hx, 0, hz, 0.03);
    put(ctx.root, G.cone(2.5, 1.3, 4), M.std(roof, 0.8), hx, 2.85, hz, { ry: Math.PI / 4, s: [1, 1, 0.9] });
    bx(ctx.root, M.std('#fff6e6', 0.6), 0.9, 1.4, 0.06, hx + 1.61, 0, hz, 0.01, { ry: Math.PI / 2 });
  }
  trailSign('San Juan Capistrano', 'LOS RIOS HISTORIC DISTRICT', -80, 'sjc', '#b5553a');
  // Doheny State Beach / Dana Point Harbor finish
  for (let z = -112; z > -146; z -= 6) {
    palm(ctx, -5.5 - r() * 3, z, 6 + r() * 3, Math.floor(-z), false);
    palm(ctx, 16 + r() * 3, z - 3, 6 + r() * 3, Math.floor(-z) + 1, false);
  }
  put(ctx.root, G.box(90, 0.04, 16, 0), M.tex(TX.dirt('#ecd9b2'), 0.95, 0, 'sand'), 0, 0.02, -151, { cast: false });
  water(ctx, 0, -205, 240, 96, '#3f7fa6', 22, 0.04);
  const tower = group(ctx.root, 7, 0, -151);
  for (const [lx, lz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) bx(tower, M.std('#e9e4da', 0.8), 0.14, 1.6, 0.14, lx, 0, lz, 0.02);
  bx(tower, M.gloss('#5fa8d8', 0.5, 0.2), 2.0, 1.4, 2.0, 0, 1.6, 0, 0.06);
  bx(tower, M.gloss('#f4f1ea', 0.4), 2.3, 0.14, 2.3, 0, 3.0, 0, 0.04);
  put(tower, G.box(0.8, 0.06, 2.4, 0.02), M.std('#e9e4da', 0.8), -1.5, 0.8, 0, { rz: -0.55 });
  signBoard(ctx.root, TX.sign('Doheny · Dana Point', { w: 512, h: 128, bg: '#2e5f84', fg: '#fff3dc', sub: 'END OF TRAIL' }), -2.6, 1.55, -139, 2.2, 0.55, 0.35, 0.2, 'dph');
  bx(ctx.root, M.std('#6b4a2a', 0.8), 0.1, 1.3, 0.1, -2.6, 0, -139.05, 0.02);
  const boats = [boat(ctx.root, -12, -172, 0.3), boat(ctx.root, 8, -182, -0.4, '#f4efe6'), boat(ctx.root, 22, -170, 1.2, '#ffffff', false), boat(ctx.root, -26, -188, 0.8)];
  ctx.on((_dt, t) => boats.forEach((b, i) => {
    b.position.y = Math.sin(t * 1.2 + i) * 0.08;
    b.rotation.z = Math.sin(t * 0.9 + i) * 0.04;
  }));
  put(ctx.root, G.sphere(9, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff0c8', fog: false, toneMapped: false }), -60, 22, -330, { cast: false, receive: false });

  const gates: BuiltSet['gates'] = [];
  const gateMat = M.glow('#ffd27a', 2.2);
  for (let i = 0; i < 11; i++) {
    const z = -9 - i * 11.5;
    if (Math.abs(z + 45) < 5 || Math.abs(z + 83) < 5 || Math.abs(z + 62) < 5 || Math.abs(z + 104) < 4) continue;
    const x = (i % 2 ? 1 : -1) * 0.8;
    const g = dynamic(group(ctx.root, x, 0, z));
    for (const s of [-1, 1]) cy(g, M.std('#fff3dc', 0.6), 0.05, 0.05, 1.8, s * 0.8, 0, 0, 8);
    put(g, G.torus(0.8, 0.06, Math.PI, 8, 20), gateMat, 0, 1.8, 0, { cast: false });
    sp(g, M.glow('#fff6d8', 3), 0.1, 0, 2.65, 0, { cast: false });
    gates.push({ x, z, w: 1.6, mesh: g });
  }
  const leaves = new Leaves(q === 'low' ? 30 : 80, new THREE.Vector3(9, 3, 9), ['#d9a441', '#c9772e', '#e8c05a', '#a9642a']);
  ctx.dust([-4, 0.3, -150], [4, 3.2, 10], '#ffe2a8', q === 'low' ? 80 : 200, 0.06, 0.55);
  return makeSet(ctx, {
    bounds: { x0: -2.9, z0: -148, x1: 2.9, z1: 8 },
    spawn: { x: 0.6, z: 5, face: Math.PI },
    exit: { x: 0, z: -146, label: 'Ride home' },
    stops: [
      {
        id: 'bridge', label: 'Tributary bridge', verb: 'Balance', pos: [0, -41.5], stand: [0, -41.5], face: Math.PI, pose: 'ride',
        mini: { type: 'balance', title: 'Steady over the bridge planks', hint: 'Keep the needle centered: ← → / A D, or hold the side buttons', duration: 3.5 },
        intro: [{ who: 'narrator', text: 'San Juan Creek Trail on the Aima: Rancho Mission Viejo to Doheny. Golden hour. Dogs in the basket. Zero sitting (the saddle doesn’t count).' }],
        outro: [{ who: 'mochi', text: '*ears flapping in the wind, living her best life*' }],
        refill: 30, hearts: 3, color: '#7fd1b9', push: { dist: 6, height: 3, yaw: 0.6 },
      },
      {
        id: 'sjc', label: 'Mission bells, SJC', verb: 'Ring', pos: [0, -83], stand: [0, -83], face: Math.PI, pose: 'ride',
        mini: { type: 'timing', title: 'Ring the bell as you roll past the mission', hint: 'Tap / Space in the gold zone', reps: 3, zone: 0.24, speed: 1.1 },
        outro: [{ who: 'narrator', text: 'Swallows scatter. Tourists wave. Leo barks at a bell. The bell does not bark back.' }],
        refill: 30, hearts: 3, color: '#f2c46d', push: { dist: 6.5, height: 3.4, yaw: -0.7 },
      },
      {
        id: 'harbor', label: 'Doheny sunset', verb: 'Soak it in', pos: [0, -141.5], stand: [0, -141.5], face: Math.PI, pose: 'ride',
        mini: { type: 'hold', title: 'Soak in the Doheny sunset (for a second)', hint: 'Hold the button or Space', duration: 3 },
        outro: [{ who: 'louise', text: 'Beautiful. Stunning. Okay — sauna time.' }],
        refill: 35, hearts: 4, color: '#ff9e7a', push: { dist: 7, height: 2.6, yaw: 0.3 },
      },
    ],
    light: KITS.golden,
    camera: CAM_TRAIL,
    ambience: 'trail',
    music: 'golden',
    surface: 'stone',
    leaves,
    gates,
    vehicle: 'ebike',
    dogs: 'basket',
  }, events);
}
