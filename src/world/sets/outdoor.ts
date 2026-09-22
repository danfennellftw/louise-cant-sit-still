import * as THREE from 'three';
import { SetCtx, floorMat, signBoard, bench, hill } from '../kit';
import { KITS, CAM_OUTDOOR, makeSet } from '../lighting';
import { M } from '../../art/materials';
import { TX } from '../../art/textures';
import { G, bx, cy, dynamic, group, put, sp } from '../../art/geo';
import { Leaves, skyDome } from '../../art/fx';
import { tree, palm, bush, cafeTable, stringLights, lampPost, fence, rock, missionArch, boat, kiosk, planter, water } from '../../art/props/outdoor';
import { spawnNpc } from '../npc';
import type { BuiltSet, CamSpec } from '../types';
import type { QualityLevel } from '../../engine/quality';
import { rng } from '../../engine/util';

const LOCALS = { tops: ['#f4a6a0', '#9ad0f5', '#fff3c4', '#c9e7c1', '#e8d4b8', '#37474f', '#ffffff', '#b48cff'], bottoms: ['#2a3a5a', '#e7dccb', '#3a3a3a', '#8a6a4a'] };

/* =================== Coffee plaza (find the AI people + Nina call) =================== */
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
      {
        id: 'nina', label: 'Call Nina', verb: 'Call', pos: [-6.2, 2.4], stand: [-6.2, 2.4], face: 0, pose: 'phone',
        mini: {
          type: 'phone', title: 'Nina',
          lines: [
            { who: 'louise', text: 'Nina!! Guess where I am now—' },
            { who: 'nina', text: 'Let me guess. In motion.' },
            { who: 'louise', text: 'I reorganized a drawer AND found skincare on sale.' },
            { who: 'nina', text: 'Of course you did. Are you sitting down?' },
          ],
          choices: [
            { label: '“Sitting? Never heard of her.”', reply: [{ who: 'nina', text: 'Love you. Go putter somewhere.' }], hearts: 3 },
            { label: '“I’m pacing, but emotionally I’m seated.”', reply: [{ who: 'nina', text: 'That’s the stillest you’ve ever been. Proud of you.' }], hearts: 4 },
          ],
        },
        refill: 30, hearts: 3, color: '#ffb3d1', push: { dist: 4.4, height: 2.6, yaw: -0.4 },
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

/* =================== Golden-hour e-bike trail: Rancho Mission Viejo → San Juan Capistrano → Dana Point =================== */
const CAM_TRAIL: CamSpec = { dist: 8.2, height: 4.4, fov: 50, yaw: 0, lookY: 1.4, lookAhead: 1.0 };

export function buildTrail(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  const r = rng(2024);
  ctx.dyn.add(skyDome('#f7b98a', '#ffe3b0', '#d9a86a'));
  put(ctx.root, G.box(70, 0.1, 200, 0), floorMat(TX.grass('#9aa85a'), [12, 34], 0.95, 'trailg'), 0, -0.05, -70, { cast: false });
  put(ctx.root, G.box(3.4, 0.02, 162, 0), floorMat(TX.dirt('#d4ae7c'), [1, 40], 0.95, 'traild'), 0, 0.01, -69, { cast: false });
  for (let i = 0; i < 9; i++) {
    const z = 10 - i * 20;
    hill(ctx.root, -32 - r() * 10, z, 16 + r() * 8, 7 + r() * 6, 12, i % 2 ? '#c9a45a' : '#b8944f', i);
    hill(ctx.root, 32 + r() * 10, z - 8, 16 + r() * 8, 6 + r() * 6, 12, i % 2 ? '#bd9a52' : '#caa862', i + 20);
  }
  const oak = ['#7d8a3e', '#8f9a48', '#6d7a36'];
  const syc = ['#b8a040', '#c9a84a', '#a89038'];
  for (let z = 6; z > -138; z -= 5.5) {
    for (const s of [-1, 1]) {
      if (r() < 0.75) tree(ctx, s * (6.5 + r() * 9), z + r() * 3, 0.8 + r() * 0.5, r() > 0.5 ? oak : syc, Math.floor(z), false);
      if (r() < 0.5) bush(ctx.root, s * (3.4 + r() * 2.5), z + r() * 4, 0.6 + r() * 0.4, r() > 0.5 ? '#8a9a4a' : '#9aa85a', r() > 0.7 ? '#f2c14e' : undefined);
      if (r() < 0.3) rock(ctx.root, s * (3.2 + r() * 4), z + r() * 4, 0.5 + r() * 0.6);
    }
  }
  for (const [z0, z1] of [[4, -30], [-55, -75], [-100, -128]]) {
    fence(ctx.root, -2.4, z0, -2.4, z1);
    fence(ctx.root, 2.4, z0, 2.4, z1);
  }
  // trailhead sign
  signBoard(ctx.root, TX.sign('Rancho Mission Viejo', { w: 512, h: 128, bg: '#6b4a2a', fg: '#fff3dc', sub: 'TRAIL → DANA POINT' }), 3.4, 1.6, 4, 2.4, 0.6, -0.4, 0.2, 'rmv');
  bx(ctx.root, M.std('#6b4a2a', 0.8), 0.12, 1.3, 0.12, 3.4, 0, 4.05, 0.02);
  // creek + bridge
  water(ctx, 0, -45, 70, 5, '#5e97a8', 20, 0.03);
  bx(ctx.root, M.std('#8a6a4a', 0.8), 4.2, 0.18, 6.4, 0, 0.02, -45, 0.03);
  for (const s of [-1, 1]) {
    bx(ctx.root, M.std('#6b4a2a', 0.8), 0.12, 0.9, 6.4, s * 2.05, 0.2, -45, 0.02);
    for (let i = 0; i < 5; i++) bx(ctx.root, M.std('#6b4a2a', 0.8), 0.14, 1.1, 0.14, s * 2.05, 0, -47.8 + i * 1.4, 0.02);
  }
  for (let i = 0; i < 8; i++) rock(ctx.root, (r() - 0.5) * 30, -45 + (r() - 0.5) * 4, 0.4 + r() * 0.4, '#9a8f80');
  // San Juan Capistrano: mission-style bell arch
  missionArch(ctx, -7, -85, Math.PI / 2);
  bx(ctx.root, M.std('#efe0c6', 0.95), 0.6, 1.2, 12, -7.4, 0, -76, 0.05);
  bx(ctx.root, M.std('#efe0c6', 0.95), 0.6, 1.2, 12, -7.4, 0, -94, 0.05);
  signBoard(ctx.root, TX.sign('San Juan Capistrano', { w: 512, h: 128, bg: '#b5553a', fg: '#fff3dc' }), 3.3, 1.6, -80, 2.4, 0.6, -0.3, 0.2, 'sjc');
  bx(ctx.root, M.std('#6b4a2a', 0.8), 0.12, 1.3, 0.12, 3.3, 0, -79.95, 0.02);
  for (let z = -96; z > -140; z -= 7) {
    palm(ctx, -5.5 - r() * 3, z, 6 + r() * 3, Math.floor(-z), false);
    palm(ctx, 5.5 + r() * 3, z - 3, 6 + r() * 3, Math.floor(-z) + 1, false);
  }
  // Dana Point harbor finish
  put(ctx.root, G.box(80, 0.04, 16, 0), M.tex(TX.dirt('#ecd9b2'), 0.95, 0, 'sand'), 0, 0.02, -150, { cast: false });
  water(ctx, 0, -200, 220, 90, '#3f7fa6', 22, 0.04);
  for (let i = 0; i < 8; i++) bx(ctx.root, M.std('#8a6a4a', 0.8), 2.6, 0.12, 0.5, 5, 0.25, -152 - i * 0.55, 0.02);
  const boats = [boat(ctx.root, -12, -170, 0.3), boat(ctx.root, 8, -180, -0.4, '#f4efe6'), boat(ctx.root, 22, -168, 1.2, '#ffffff', false), boat(ctx.root, -26, -186, 0.8)];
  ctx.on((_dt, t) => boats.forEach((b, i) => {
    b.position.y = Math.sin(t * 1.2 + i) * 0.08;
    b.rotation.z = Math.sin(t * 0.9 + i) * 0.04;
  }));
  signBoard(ctx.root, TX.sign('Dana Point Harbor', { w: 512, h: 128, bg: '#2e5f84', fg: '#fff3dc' }), 3.3, 1.6, -140, 2.4, 0.6, -0.3, 0.2, 'dph');
  bx(ctx.root, M.std('#6b4a2a', 0.8), 0.12, 1.3, 0.12, 3.3, 0, -139.95, 0.02);
  put(ctx.root, G.sphere(9, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff0c8', fog: false, toneMapped: false }), -60, 22, -330, { cast: false, receive: false });

  // weave gates
  const gates: BuiltSet['gates'] = [];
  const gateMat = M.glow('#ffd27a', 2.2);
  for (let i = 0; i < 11; i++) {
    const z = -9 - i * 11.5;
    if (Math.abs(z + 45) < 5 || Math.abs(z + 83) < 5) continue;
    const x = (i % 2 ? 1 : -1) * 1.1;
    const g = dynamic(group(ctx.root, x, 0, z));
    for (const s of [-1, 1]) cy(g, M.std('#fff3dc', 0.6), 0.05, 0.05, 1.8, s * 0.9, 0, 0, 8);
    put(g, G.torus(0.9, 0.06, Math.PI, 8, 20), gateMat, 0, 1.8, 0, { cast: false });
    sp(g, M.glow('#fff6d8', 3), 0.1, 0, 2.75, 0, { cast: false });
    gates.push({ x, z, w: 1.8, mesh: g });
  }
  const leaves = new Leaves(q === 'low' ? 30 : 80, new THREE.Vector3(9, 3, 9), ['#d9a441', '#c9772e', '#e8c05a', '#a9642a']);
  ctx.dust([-6, 0.3, -150], [6, 3.2, 10], '#ffe2a8', q === 'low' ? 80 : 220, 0.06, 0.55);
  return makeSet(ctx, {
    bounds: { x0: -5.5, z0: -148, x1: 5.5, z1: 8 },
    spawn: { x: 0, z: 5, face: Math.PI },
    exit: { x: 0, z: -146, label: 'Ride home' },
    stops: [
      {
        id: 'bridge', label: 'Creek bridge', verb: 'Balance', pos: [0, -41.5], stand: [0, -41.5], face: Math.PI, pose: 'ride',
        mini: { type: 'balance', title: 'Steady across the creek bridge', hint: 'Keep the needle centered: ← → / A D, or hold the side buttons', duration: 3.5 },
        intro: [{ who: 'narrator', text: 'Rancho Mission Viejo to Dana Point on the e-bike. Golden hour. Dogs in the basket. Zero sitting (the bike seat doesn’t count).' }],
        outro: [{ who: 'mochi', text: '*ears flapping in the wind, living her best life*' }],
        refill: 30, hearts: 3, color: '#7fd1b9', push: { dist: 6, height: 3, yaw: 0.6 },
      },
      {
        id: 'sjc', label: 'San Juan Capistrano bells', verb: 'Ring', pos: [0, -83], stand: [0, -83], face: Math.PI, pose: 'ride',
        mini: { type: 'timing', title: 'Ring the bells as you roll by', hint: 'Tap / Space in the gold zone', reps: 3, zone: 0.24, speed: 1.1 },
        outro: [{ who: 'narrator', text: 'Swallows scatter. Tourists wave. Leo barks at a bell. The bell does not bark back.' }],
        refill: 30, hearts: 3, color: '#f2c46d', push: { dist: 6.5, height: 3.4, yaw: -0.7 },
      },
      {
        id: 'harbor', label: 'Dana Point sunset', verb: 'Soak it in', pos: [0, -141.5], stand: [0, -141.5], face: Math.PI, pose: 'ride',
        mini: { type: 'hold', title: 'Soak in the sunset (for a second)', hint: 'Hold the button or Space', duration: 3 },
        outro: [{ who: 'louise', text: 'Beautiful. Stunning. Okay — sauna time.' }],
        refill: 35, hearts: 4, color: '#ff9e7a', push: { dist: 7, height: 2.6, yaw: 0.3 },
      },
    ],
    light: KITS.golden,
    camera: CAM_TRAIL,
    ambience: 'trail',
    music: 'golden',
    surface: 'grass',
    leaves,
    gates,
    vehicle: 'ebike',
    dogs: 'basket',
  });
}

