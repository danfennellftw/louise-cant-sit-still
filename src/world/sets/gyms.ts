import * as THREE from 'three';
import { SetCtx, room, floorMat, plant, pendant, windowUnit, door, signBoard, bench } from '../kit';
import { KITS, CAM_INTERIOR, CAM_WIDE, makeSet } from '../lighting';
import { M } from '../../art/materials';
import { TX } from '../../art/textures';
import { G, bx, cy, put } from '../../art/geo';
import { lightShaft } from '../../art/fx';
import { tweens } from '../../engine/tween';
import {
  spinBike, squatRack, dumbbellRack, weightBench, treadmill, kettlebells, plyoBoxes, lockers, mirrorWall, exerciseBall,
  stairClimber, turfLane, sled, punchingBag, neonStrip,
} from '../../art/props/gym';
import { spawnNpc } from '../npc';
import type { BuiltSet, StopHooks } from '../types';
import type { QualityLevel } from '../../engine/quality';
import type { Actor } from '../../art/characters/actor';

const ATHLETIC = { tops: ['#ff6f91', '#1d1d1f', '#6fd3ff', '#f2f2f2', '#b48cff', '#ffcf5a'], bottoms: ['#1d1d1f', '#2a2a40', '#3a3a3a'], athletic: true };

/* =================== Grit Cycle · Dana Point (dark neon spin studio) =================== */
export function buildGrit(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  const wallM = M.std('#231c28', 0.85);
  room(ctx, {
    x0: -9.2, x1: 9.2, z0: -5, z1: 4.8, h: 3.4,
    floor: floorMat(TX.speckle('#1c1820', ['#2e2634', '#3a2a40'], 3000, 2, 'spin'), [5, 3], 0.8, 'spinf'),
    wall: wallM, trim: M.std('#2e2434', 0.6),
    right: [[2.0, 3.2, 0, 2.3]],
  });
  const pink = '#ff3d9a';
  const violet = '#9b5cff';
  neonStrip(ctx.root, 0, 3.1, -4.85, 18, pink);
  neonStrip(ctx.root, 0, 0.06, -4.85, 18, violet);
  for (const x of [-6, -3, 0, 3, 6]) neonStrip(ctx.root, x, 1.7, -4.86, 3.1, x % 2 ? violet : pink, 0, true);
  signBoard(ctx.root, TX.sign('grit cycle', { w: 512, h: 128, fg: '#ffe3f2', glow: pink, italic: true, sub: 'DANA POINT' }), 3.2, 2.2, -4.84, 4.2, 1.05, 0, 2.2, 'grit');
  // stage + instructor
  bx(ctx.root, M.gloss('#2c2233', 0.4, 0.4), 2.6, 0.35, 6.4, -7.8, 0, 0, 0.04);
  neonStrip(ctx.root, -6.5, 0.36, 0, 6.4, pink, Math.PI / 2);
  ctx.solid(-9.1, -3.2, -6.5, 3.2);
  put(ctx.root, G.torus(1.3, 0.05, Math.PI * 2, 8, 40), M.glow(pink, 2.6), -9.1, 2.0, 0, { ry: Math.PI / 2, cast: false });
  const bikes: { wheel: THREE.Group; cranks: THREE.Group }[] = [];
  const ib = spinBike(ctx, -7.9, 0, Math.PI / 2, pink);
  ib.group.position.y = 0.35;
  bikes.push(ib);
  const npcs: Actor[] = [];
  const instructor = spawnNpc(ctx, 3, -7.9 - 0.28, 0, Math.PI / 2, 'spin', ATHLETIC);
  instructor.root.position.y = 0.35;
  npcs.push(instructor);
  const seats: { x: number; z: number }[] = [];
  for (const x of [-4.6, -2.8, -1.0, 0.8]) {
    for (const z of [-3.2, -1.6, 0, 1.6]) {
      bikes.push(spinBike(ctx, x, z, -Math.PI / 2, (x + z) % 2 ? pink : violet));
      seats.push({ x: x + 0.28, z });
    }
  }
  const riderSeats = [0, 2, 5, 7, 9, 12, 14];
  riderSeats.forEach((i, k) => npcs.push(spawnNpc(ctx, 10 + k, seats[i].x, seats[i].z, -Math.PI / 2, 'spin', ATHLETIC)));
  // lobby
  lockers(ctx, 6.6, -4.6, 5, '#2a2230');
  bench(ctx.root, 6.6, -3.4, 0, '#6b4a3a', 2.2);
  ctx.solidAt(6.6, -3.4, 2.2, 0.5);
  const cooler = cy(ctx.root, M.glass('#bfe6ff', 0.55), 0.18, 0.18, 0.45, 8.6, 1.0, -1.5, 16);
  void cooler;
  bx(ctx.root, M.gloss('#e9e9ee', 0.4), 0.4, 1.0, 0.4, 8.6, 0, -1.5, 0.03);
  ctx.solidAt(8.6, -1.5, 0.45, 0.45);
  for (let i = 0; i < 5; i++) bx(ctx.root, M.fabric(i % 2 ? '#ffffff' : '#ffd2e6', '#fff'), 0.4, 0.08, 0.3, 5.2, 0.9 + i * 0.08, -4.3, 0.03);
  bx(ctx.root, M.std('#3a2a40', 0.5), 0.9, 0.9, 0.45, 5.2, 0, -4.3, 0.02);
  door(ctx, 9.1, 2.6, 'right', '#2c2233');
  mirrorWall(ctx.root, -8.95, 0.4, -4.2, 0.02, 2.6, 0);

  const lights = [ctx.point(-2, 2.6, -1, pink, 6, 9, true), ctx.point(1, 2.6, 1, violet, 6, 9, true), ctx.point(-5, 2.6, 2, '#39d5ff', 4, 8)];
  let energy = 1;
  ctx.on((dt, t) => {
    bikes.forEach((b, i) => {
      b.wheel.rotation.x += dt * (6 + (i % 3)) * energy;
      b.cranks.rotation.x += dt * 5 * energy;
    });
    lights.forEach((l, i) => {
      if (!l) return;
      const a = t * (0.6 + i * 0.25) * energy + i * 2;
      l.position.x = -2 + Math.cos(a) * 4;
      l.position.z = Math.sin(a) * 2.5;
      l.intensity = (5 + Math.sin(t * 4 * energy + i) * 2) * (energy > 1.5 ? 1.3 : 1);
    });
  });
  ctx.dust([-8, 0.4, -4.5], [8, 3.2, 4], '#ffb3dc', 90, 0.045, 0.45);

  const hooks: Record<string, StopHooks> = {
    ride: { start: () => (energy = 3.2), done: () => (energy = 1) },
    friend: {
      done: () => {
        npcs.slice(1).forEach((n, i) => {
          const from = n.root.position.clone();
          const to = new THREE.Vector3(8.6, 0, 2.6);
          void tweens.wait(i * 0.35).then(() => {
            n.setState('walk');
            n.speed = 1;
            n.facing = Math.atan2(to.x - from.x, to.z - from.z);
            return tweens.to(2.4 + Math.random(), (e) => n.root.position.lerpVectors(from, to, e), (x) => x);
          }).then(() => (n.root.visible = false));
        });
      },
    },
  };

  return makeSet(ctx, {
    bounds: { x0: -6.3, z0: -4.6, x1: 8.9, z1: 4.4 },
    spawn: { x: 7.8, z: 2.6, face: -Math.PI / 2 },
    exit: { x: 8.6, z: 2.6, label: 'Head out' },
    stops: [
      {
        id: 'ride', label: 'Clip in & ride', verb: 'Ride', pos: [1.08, 2.5], stand: [1.1, 2.45], face: -Math.PI / 2, pose: 'spin',
        poseAt: [1.08, 0, 1.6],
        mini: { type: 'timing', title: 'Ride the beat', hint: 'Tap / Space when the marker is in the pink zone', reps: 6, zone: 0.22, speed: 1.25 },
        intro: [{ who: 'narrator', text: 'Grit Cycle, Dana Point. Daily pilgrimage. The bike knows her name.' }],
        outro: [{ who: 'louise', text: 'Tomorrow? Same bike. Same time. Obviously.' }],
        refill: 40, hearts: 4, color: pink, push: { dist: 4.6, height: 2.6, yaw: -0.6 },
      },
      {
        id: 'friend', label: 'Make a gym friend', verb: 'Say hi', pos: [4.6, 0.6], stand: [4.6, 0.6], face: Math.PI, pose: 'wave',
        mini: {
          type: 'dialogue', title: 'After class — friend attempt',
          lines: [{ who: 'narrator', text: 'Class ends. Riders gather their things. Louise sees her chance.' }],
          choices: [
            { label: '“Great class! You guys come every day?”', reply: [{ who: 'npc', name: 'Rider', text: 'Mm-hm!' }, { who: 'narrator', text: '…grabs keys. Everyone suddenly remembers somewhere to be.' }], hearts: 2 },
            { label: '“Anyone want to grab a smoothie?”', reply: [{ who: 'narrator', text: 'Three people check their phones in perfect unison.' }], hearts: 2 },
            { label: 'Wave. Enthusiastically.', reply: [{ who: 'narrator', text: 'One wave back! From the instructor. Contractually.' }], hearts: 3 },
          ],
        },
        outro: [{ who: 'narrator', text: 'Ignored? A little. She still clipped in and showed up anyway. That’s not embarrassing — that’s stubborn sunshine.' }],
        refill: 25, hearts: 3, color: violet, push: { dist: 5.4, height: 3.2, yaw: 0.4 },
      },
    ],
    hooks,
    light: KITS.spin,
    camera: CAM_INTERIOR,
    ambience: 'spin',
    music: 'spin',
    surface: 'rubber',
    npcs,
    stealables: [{ label: 'a sweat towel', x: 5.2, z: -3.6, color: '#ffd2e6' }],
  });
}

/* =================== Shredz · Ladera Ranch (industrial strength gym) =================== */
export function buildShredz(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  const block = M.tex(TX.speckle('#6f6a64', ['#5a5550', '#86807a'], 5000, 2, 'cmu'), 0.9, 0, 'cmu');
  room(ctx, {
    x0: -9, x1: 9, z0: -4.6, z1: 4.6, h: 4,
    floor: floorMat(TX.concrete('#8e8982'), [3, 2], 0.75, 'shredf'),
    wall: block, trim: M.std('#1b1b1b', 0.6),
    back: [[-1.8, 2.8, 0, 3.2]],
    right: [[1.6, 2.8, 0, 2.3]],
  });
  const yellow = '#f2c230';
  // roll-up door and daylight
  windowUnit(ctx, 0.5, -4.6, 4.6, 3.2, 0, TX.gardenBackdrop(false), { frame: '#2a2a2a', key: 'shredzdoor' });
  for (let i = 0; i < 6; i++) bx(ctx.root, M.metal('#9a9a9a', 0.5), 4.6, 0.06, 0.08, 0.5, 3.25 + i * 0.12, -4.55, 0);
  lightShaft(ctx.dyn, 0.5, 3.1, -4.2, 4.2, 6.5, '#fff1cc', 0.14, 0.8);
  // hazard striping
  for (let i = 0; i < 18; i++) put(ctx.root, G.box(0.5, 0.012, 0.16, 0), M.std(i % 2 ? yellow : '#1b1b1b', 0.7), -8.75 + i * 1, 0.006, -1.2, { ry: 0.6, cast: false });
  put(ctx.root, G.box(7, 0.02, 3.6, 0), M.std('#1e1e20', 0.95), -5.2, 0.01, -3.0, { cast: false });
  signBoard(ctx.root, TX.sign('SHREDZ', { w: 512, h: 128, bg: '#161616', fg: yellow, spacing: 8, sub: 'LADERA RANCH', border: yellow }), -5.2, 3.0, -4.48, 3.6, 0.9, 0, 0.5, 'shredz');
  squatRack(ctx, -6.6, -3.0, yellow);
  squatRack(ctx, -3.6, -3.0, yellow);
  dumbbellRack(ctx, 6.2, -4.1, 0, 3.4);
  weightBench(ctx, 5.4, -1.8, Math.PI / 2);
  weightBench(ctx, 7.4, -1.8, Math.PI / 2);
  plyoBoxes(ctx, -8.0, 3.1, '#2f2f33', yellow);
  punchingBag(ctx, 7.6, 2.6);
  punchingBag(ctx, 6.3, 3.3, '#1d1d1f');
  kettlebells(ctx.root, -3.5, 3.6);
  mirrorWall(ctx.root, 8.95, 0.3, 0, 0.02, 2.2, Math.PI / 2);
  bx(ctx.root, M.metal('#b8bcc2', 0.3), 0.02, 2.2, 6, 8.95, 0.3, -0.8, 0);
  for (const [x, z] of [[-6, -2], [-2.5, 0.5], [2.5, 0.5], [6, -2], [0, 3]]) pendant(ctx, x, 3.0, z, '#1b1b1b', '#ffc070', Math.abs(x) < 4, 'cage');
  door(ctx, 8.9, 2.2, 'right', '#2a2a2a');
  const npcs = [spawnNpc(ctx, 31, -3.6, -2.75, 0, 'lift', ATHLETIC), spawnNpc(ctx, 32, -7.0, 1.4, 0.5, 'stretch', ATHLETIC), spawnNpc(ctx, 33, 5.4, -0.8, -0.6, 'idle', ATHLETIC)];
  const chalk = ctx.dust([-8, 0.2, -4.2], [-2, 2.2, -1.6], '#ffffff', 60, 0.06, 0.35);
  ctx.dust([-2, 0.3, -4.2], [3, 3.2, 0], '#fff1cc', 50, 0.05, 0.55);
  const hooks: Record<string, StopHooks> = {
    squat: { progress: (k) => (chalk.opacity = 0.35 + k * 0.4), done: () => (chalk.opacity = 0.35) },
  };
  return makeSet(ctx, {
    bounds: { x0: -8.7, z0: -4.2, x1: 8.7, z1: 4.3 },
    spawn: { x: 7.6, z: 2.2, face: -Math.PI / 2 },
    exit: { x: 8.4, z: 2.2, label: 'Head out' },
    stops: [
      {
        id: 'squat', label: 'Squat set', verb: 'Lift', pos: [-6.6, -1.6], stand: [-6.6, -1.7], face: 0, pose: 'lift',
        poseAt: [-6.6, 0, -2.75],
        mini: { type: 'timing', title: 'Five clean reps', hint: 'Tap / Space in the gold zone — each rep gets faster', reps: 5, zone: 0.24, speed: 1.0 },
        intro: [{ who: 'narrator', text: 'Shredz, Ladera Ranch. She lifts, she stretches, she is mentally already at TJ Maxx.' }],
        outro: [{ who: 'louise', text: 'That was the warm-up. For the next gym.' }],
        refill: 35, hearts: 3, color: yellow, push: { dist: 5, height: 2.6 },
      },
      {
        id: 'stretch', label: 'Stretch it out', verb: 'Stretch', pos: [0.5, 1.8], stand: [0.5, 1.8], face: 0, pose: 'stretch',
        mini: { type: 'hold', title: 'Hold the stretch', hint: 'Hold the button or Space', duration: 2.6 },
        outro: [{ who: 'narrator', text: 'Held a stretch for almost three seconds. A personal record in stillness.' }],
        refill: 25, hearts: 2, color: '#ffffff', push: { dist: 4.6, height: 2.4, yaw: 0.3 },
      },
    ],
    hooks,
    light: KITS.industrial,
    camera: CAM_INTERIOR,
    ambience: 'gym',
    music: 'gym',
    surface: 'concrete',
    npcs,
    stealables: [{ label: 'a lifting glove', x: -3.5, z: 3.2, color: '#1d1d1f' }],
  });
}

/* =================== Crunch · San Clemente (bright beachy gym) =================== */
export function buildCrunch(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  const coral = '#ff6f59';
  const teal = '#18c3c9';
  room(ctx, {
    x0: -9, x1: 9, z0: -4.6, z1: 4.6, h: 3.6,
    floor: floorMat(TX.speckle('#d9d1c5', [coral, teal, '#f2c46d', '#f7f3ee'], 2600, 2.2, 'crunch'), [4, 2], 0.7, 'crunchf'),
    wall: M.std('#fbfaf7', 0.8), trim: M.std(teal, 0.5),
    back: [[-7.4, -2.6, 0.7, 3.0], [-1.6, 3.2, 0.7, 3.0]],
    right: [[1.6, 2.8, 0, 2.3]],
  });
  bx(ctx.root, M.std(coral, 0.6), 18, 0.25, 0.03, 0, 0.4, -4.47, 0);
  bx(ctx.root, M.std(teal, 0.6), 0.03, 0.25, 9.2, -8.87, 0.4, 0, 0);
  windowUnit(ctx, -5.0, -4.6, 4.8, 2.3, 0.7, TX.oceanBackdrop(false), { shaft: '#fff6e0', key: 'crunchw1' });
  windowUnit(ctx, 0.8, -4.6, 4.8, 2.3, 0.7, TX.oceanBackdrop(false), { shaft: '#fff6e0', key: 'crunchw2' });
  signBoard(ctx.root, TX.sign('CRUNCH', { w: 512, h: 128, fg: coral, sub: 'SAN CLEMENTE', weight: 700 }), 6.2, 2.3, -4.46, 3.6, 0.9, 0, 0.4, 'crunch');
  const mills = [-6.2, -4.4, -2.6, -0.8, 1.0, 2.8].map((x) => treadmill(ctx, x, -3.0, Math.PI, teal));
  void mills;
  [[3.6, 2.8, coral], [4.4, 3.4, teal], [5.2, 2.7, '#f2c46d'], [-7.6, 3.5, coral]].forEach(([x, z, c]) => exerciseBall(ctx.root, x as number, z as number, c as string));
  ctx.solid(3.2, 2.3, 5.6, 3.8);
  for (let i = 0; i < 4; i++) {
    put(ctx.root, G.box(0.55, 2.2, 0.08, 0.26), M.gloss([coral, teal, '#f2c46d', '#ffffff'][i], 0.3, 0.8), 8.85, 1.4, -3.4 + i * 0.75, { ry: Math.PI / 2, rz: 0.05 });
  }
  for (let i = 0; i < 4; i++) put(ctx.root, G.box(1.6, 0.02, 0.7, 0.01), M.std(i % 2 ? '#bfe9ec' : '#ffd1c8', 0.9), -1 + i * 1.8, 0.012, 1.6, { cast: false });
  plant(ctx.root, -8.4, -3.9, 1.3, '#ffffff', 'palm');
  plant(ctx.root, 8.3, 3.9, 1.1, '#ffffff', 'palm');
  ctx.solidAt(-8.4, -3.9, 0.5, 0.5);
  door(ctx, 8.9, 2.2, 'right', '#ffffff');
  const npcs = [spawnNpc(ctx, 41, 1.0, -2.9, Math.PI, 'walk', ATHLETIC), spawnNpc(ctx, 42, 4.4, 1.2, 0.3, 'stretch', ATHLETIC)];
  npcs[0].root.position.y = 0.18;
  npcs[0].speed = 0.7;
  npcs[0].facing = Math.PI;
  ctx.dust([-8, 0.5, -4.2], [4, 3, -0.5], '#ffffff', 60, 0.05, 0.4);
  return makeSet(ctx, {
    bounds: { x0: -8.7, z0: -4.2, x1: 8.7, z1: 4.3 },
    spawn: { x: 7.6, z: 2.2, face: -Math.PI / 2 },
    exit: { x: 8.4, z: 2.2, label: 'Head out' },
    stops: [
      {
        id: 'treadmill', label: 'Treadmill with a view', verb: 'Sprint', pos: [-2.6, -1.5], stand: [-2.6, -1.5], face: Math.PI, pose: 'run',
        poseAt: [-2.6, 0.18, -2.9],
        mini: { type: 'mash', title: 'Sprint to the ocean', hint: 'Mash the button or Space', duration: 3 },
        intro: [{ who: 'narrator', text: 'Crunch, San Clemente. Beach light, ocean view, zero sitting. Perfect.' }],
        outro: [{ who: 'louise', text: 'Ran toward the ocean for ten minutes. Didn’t get any closer. Loved it.' }],
        refill: 35, hearts: 3, color: teal, push: { dist: 5, height: 3.2, yaw: 0.5 },
      },
      {
        id: 'core', label: 'Core class', verb: 'Crunch', pos: [1.7, 1.6], stand: [1.7, 1.6], face: 0, pose: 'lift',
        mini: { type: 'timing', title: 'Core on the count', hint: 'Tap / Space in the coral zone', reps: 5, zone: 0.26, speed: 1.15 },
        outro: [{ who: 'narrator', text: 'Abs: engaged. Stillness: never.' }],
        refill: 30, hearts: 3, color: coral, push: { dist: 4.6, height: 2.6 },
      },
    ],
    light: KITS.beach,
    camera: CAM_INTERIOR,
    ambience: 'gym',
    music: 'gym',
    surface: 'rubber',
    npcs,
    stealables: [{ label: 'a water bottle', x: -1, z: 2.8, color: teal }],
  });
}

/* =================== EOS Fitness · Rancho Santa Margarita (big-box neon) =================== */
export function buildEos(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  const blue = '#2fa8ff';
  const lime = '#b6f23a';
  room(ctx, {
    x0: -12, x1: 12, z0: -5.4, z1: 5.4, h: 5,
    floor: floorMat(TX.speckle('#2b3038', ['#3a404a', '#4a5260', blue], 3000, 1.8, 'eos'), [6, 3], 0.85, 'eosf'),
    wall: M.std('#2a3140', 0.8), trim: M.std('#1a1f28', 0.6),
    right: [[2.4, 3.6, 0, 2.4]],
  });
  neonStrip(ctx.root, 0, 4.2, -5.25, 24, blue);
  neonStrip(ctx.root, 0, 0.5, -5.25, 24, lime);
  signBoard(ctx.root, TX.sign('EOS FITNESS', { w: 640, h: 128, fg: '#dff2ff', glow: blue, sub: 'RANCHO SANTA MARGARITA', spacing: 4 }), -6.5, 3.0, -5.24, 5.6, 1.1, 0, 1.8, 'eos');
  turfLane(ctx.root, -4.5, 4.0, 14, 2.2, '#3b8a3e');
  const s = sled(ctx.dyn, -9.4, 4.0, lime);
  s.rotation.y = Math.PI / 2;
  [2.6, 4.4, 6.2, 8.0, 9.8].forEach((x) => stairClimber(ctx, x, -4.2, 0, lime));
  dumbbellRack(ctx, -8.5, -4.8, 0, 4, '#2fa8ff');
  weightBench(ctx, -9.5, -2.8, 0);
  weightBench(ctx, -7.5, -2.8, 0);
  weightBench(ctx, -5.5, -2.8, 0);
  mirrorWall(ctx.root, -8.5, 0.4, -5.28, 6, 2.6, 0);
  kettlebells(ctx.root, -2.8, -4.5, ['#2fa8ff', lime, '#1d1d1f', '#ffffff']);
  for (let i = 0; i < 3; i++) exerciseBall(ctx.root, -1.4 + i * 0.8, 1.6 - i * 0.3, [blue, lime, '#dff2ff'][i]);
  door(ctx, 11.9, 3.0, 'right', '#1a1f28');
  const npcs = [
    spawnNpc(ctx, 51, 6.2, -3.95, Math.PI, 'walk', ATHLETIC),
    spawnNpc(ctx, 52, 9.8, -3.95, Math.PI, 'walk', ATHLETIC),
    spawnNpc(ctx, 53, -7.5, -1.9, 0, 'lift', ATHLETIC),
  ];
  npcs.slice(0, 2).forEach((n) => {
    n.speed = 0.6;
    n.root.position.y = 0.3;
  });
  ctx.point(-5, 3.5, 0, blue, 4, 12, true);
  ctx.point(6, 3.5, -2, lime, 3, 10);
  ctx.dust([-11, 0.5, -5], [11, 4.2, 5], '#cfe8ff', 110, 0.05, 0.4);
  const hooks: Record<string, StopHooks> = {
    sled: {
      progress: (k) => (s.position.x = -9.4 + k * 9),
      done: () => void tweens.to(1.2, (e) => (s.position.x = -0.4 - e * 9), undefined, 1.5),
    },
  };
  return makeSet(ctx, {
    bounds: { x0: -11.7, z0: -4.9, x1: 11.7, z1: 5.1 },
    spawn: { x: 10.6, z: 3.0, face: -Math.PI / 2 },
    exit: { x: 11.3, z: 3.0, label: 'Head out' },
    stops: [
      {
        id: 'sled', label: 'Turf sled push', verb: 'Push', pos: [-9.4, 2.4], stand: [-10.4, 4.0], face: Math.PI / 2, pose: 'run',
        mini: { type: 'mash', title: 'Push the sled down the turf', hint: 'Mash the button or Space', duration: 3.4 },
        intro: [{ who: 'narrator', text: 'EOS Fitness, Rancho Santa Margarita. Gym number three. The restless meter applauds.' }],
        outro: [{ who: 'louise', text: 'Again? …Again.' }],
        refill: 35, hearts: 3, color: lime, push: { dist: 7, height: 3.4, yaw: 0.2 },
      },
      {
        id: 'climber', label: 'Stair climber', verb: 'Climb', pos: [4.4, -2.7], stand: [4.4, -2.9], face: Math.PI, pose: 'walk',
        poseAt: [4.4, 0.3, -3.95],
        mini: { type: 'balance', title: 'Hold a steady pace', hint: 'Keep the needle centered: ← → / A D, or hold the side buttons', duration: 3.5 },
        outro: [{ who: 'narrator', text: 'Climbed 40 floors. Descended zero. Still going.' }],
        refill: 30, hearts: 3, color: blue, push: { dist: 5, height: 3, yaw: -0.4 },
      },
    ],
    hooks,
    light: KITS.bigbox,
    camera: CAM_WIDE,
    ambience: 'gym',
    music: 'gym',
    surface: 'rubber',
    npcs,
    stealables: [{ label: 'a resistance band', x: -2, z: 1.2, color: lime }],
  });
}
