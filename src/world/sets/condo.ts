import * as THREE from 'three';
import { SetCtx, room, wallZ, floorMat, plant, floorLampArc, tableLamp, pendant, windowUnit, door, rug, ceilingFan } from '../kit';
import { KITS, CAM_INTERIOR, makeSet } from '../lighting';
import { M } from '../../art/materials';
import { TX } from '../../art/textures';
import { G, bx, dynamic, group, put, sp } from '../../art/geo';
import { tweens } from '../../engine/tween';
import { easeOutBack, easeOutElastic } from '../../engine/util';
import {
  bed, nightstand, dresser, tv, sofa, boucleChair, mosaicTable, coffeeTable, kitchenRun, fridge, stove, island, dogBed,
  steak, drumstick, potato, plate,
} from '../../art/props/home';
import { patio, deskNook, brassFloorLamp, flowerVase, uprightPiano, mochiMess } from './condoDressing';
import { Actor } from '../../art/characters/actor';
import { DAN_LOOK } from '../../art/characters/human';
import type { BuiltSet, StopDef, StopHooks } from '../types';
import type { QualityLevel } from '../../engine/quality';

export function buildCondo(q: QualityLevel, night: boolean): BuiltSet {
  const ctx = new SetCtx(q);
  const wall = M.std('#f3ede4', 0.9);
  const wood = floorMat(TX.wood('#c08a5c'), [5, 2.2], 0.55, 'condo');
  room(ctx, {
    x0: -11, x1: 11, z0: -4.5, z1: 4.5, h: 2.9, floor: wood, wall,
    back: [[-3.35, 2.85, 0.06, 2.66]],
    left: [[-2.7, -0.5, 0.9, 2.45]],
    right: [[1.2, 2.4, 0, 2.25]],
  });
  // bedroom accent wall + partitions
  bx(ctx.root, M.std('#e2d1ba', 0.9), 6.8, 2.9, 0.04, -7.5, 0, -4.38, 0);
  wallZ(ctx, -4, -4.5, 0.2, 2.9, wall);
  wallZ(ctx, 3.5, -4.5, 0.2, 2.9, wall);
  for (const x of [-4, 3.5]) bx(ctx.root, M.std('#3a2a2a', 0.8), 0.22, 0.03, 4.7, x, 2.9, -2.15, 0, { cast: false });
  // kitchen tile floor
  put(ctx.root, G.box(7.5, 0.02, 9, 0), floorMat(TX.tiles('#efe9df', '#cdbfae', 6), [5, 6], 0.35, 'ktile'), 7.25, 0.005, 0, { cast: false });

  /* ---------- Bedroom ---------- */
  const b = bed(ctx, -7.8, -3.28);
  b.setMess(night ? 0 : 1);
  nightstand(ctx, -9.2, -4.05);
  nightstand(ctx, -6.4, -4.05);
  tableLamp(ctx, ctx.root, -9.2, 0.6, -4.05, night);
  tableLamp(ctx, ctx.root, -6.4, 0.6, -4.05, night);
  windowUnit(ctx, -11, -1.6, 2.2, 1.55, 0.9, TX.gardenBackdrop(night), { side: 'left', shade: '#6b6258', curtains: '#efe6d8', key: `bedwin${night}` });
  // from the bedroom photos: wood dresser with pink flowers under the wall TV, brass lamp, rust throw
  dresser(ctx, -4.42, -1.7, -Math.PI / 2);
  flowerVase(ctx.root, -4.42, 0.93, -1.15);
  const bedTv = tv(ctx, ctx.root, -4.14, 1.3, -1.7, -Math.PI / 2, 1.3);
  brassFloorLamp(ctx, -10.25, -3.95, night);
  bx(b.root, M.fabric('#8f4a2c', '#e8a07a', 0.95, 0.7), 1.82, 0.06, 0.55, 0, 0.7, 0.78, 0.03);
  put(ctx.root, G.box(0.5, 0.3, 0.4, 0.06), M.fabric('#e8dccb', '#fff', 0.95), -10.3, 0, 2.6, { cast: true });
  ctx.solidAt(-10.3, 2.6, 0.5, 0.4);
  rug(ctx.root, -7.8, -0.9, 3.2, 1.6, TX.rug('#e7e1d8', '#b9b1a6'), 0, 'bedrug');
  plant(ctx.root, -4.6, -3.9, 1.05, '#f1ebe0', 'snake');
  ctx.solidAt(-4.6, -3.9, 0.5, 0.5);

  /* ---------- Living room (from the photo: glass wall onto the garden) ---------- */
  windowUnit(ctx, -0.25, -4.5, 6.2, 2.55, 0.08, TX.gardenBackdrop(night), { frame: '#3b3a38', shaft: night ? undefined : '#ffe6b8', key: `glass${night}`, noBackdrop: true });
  patio(ctx, night);
  bx(ctx.root, M.std('#3b3a38', 0.4, 0.4), 0.06, 2.6, 0.08, -1.3, 0.06, -4.42, 0.01);
  bx(ctx.root, M.std('#3b3a38', 0.4, 0.4), 0.06, 2.6, 0.08, 0.8, 0.06, -4.42, 0.01);
  rug(ctx.root, -0.6, -1.4, 4.4, 3.2, TX.rug('#d9d4cc', '#8e8a86'), 0, 'livrug');
  boucleChair(ctx, -2.2, -2.2, 0.5);
  floorLampArc(ctx, -3.3, -3.4, 0.6, true);
  mosaicTable(ctx, -0.9, -3.5);
  const s = sofa(ctx, 2.35, -1.3, -Math.PI / 2, '#e4ddd2', 2.3);
  void s;
  coffeeTable(ctx, 0.9, -1.3, Math.PI / 2);
  plant(ctx.root, 3.0, -3.95, 1.2, '#e6ddd0', 'fig');
  ctx.solidAt(3.0, -3.95, 0.5, 0.5);
  deskNook(ctx, 3.0, 2.7, night);
  const piano = uprightPiano(ctx, -3.6, -0.95);
  const mess = night ? null : mochiMess(ctx, [-3.25, 3.45], [-2.5, 3.05], [[-2.95, 2.5], [-1.95, 3.75]]);
  dogBed(ctx.root, -1.6, 2.7, '#e9dcc6');
  dogBed(ctx.root, -0.4, 3.2, '#c98a5a');
  ceilingFan(ctx, -0.4, 2.85, -1.2, night ? 1 : 2.4);
  const toy = dynamic(group(ctx.root, 0.2, 0, 1.4));
  sp(toy, M.gloss('#ff6f59', 0.4), 0.09, 0, 0.09, 0);
  put(toy, G.torus(0.09, 0.015, Math.PI * 2, 6, 16), M.std('#fff', 0.6), 0, 0.09, 0, { rx: 0.5 });
  ctx.on((_dt, t) => {
    toy.position.x = 0.2 + Math.sin(t * 0.8) * 0.15;
    toy.rotation.z = -Math.sin(t * 0.8) * 1.6;
  });

  /* ---------- Kitchen ---------- */
  const k = kitchenRun(ctx, 4.1, 9.6, -4.4, '#7d9486', '#f2ede5');
  fridge(ctx, 10.3, -4.4);
  const stoveG = stove(ctx, ctx.root, 8.3, -4.08);
  void stoveG;
  island(ctx, 7.1, -0.9, 2.4);
  pendant(ctx, 6.4, 2.1, -0.9, '#2b2522', '#ffd49a', true);
  pendant(ctx, 7.8, 2.1, -0.9, '#2b2522', '#ffd49a', true);
  door(ctx, 10.92, 1.8, 'right', '#e9e2d6');
  plant(ctx.root, 10.3, 3.9, 0.9, '#d9cbb5', 'snake');
  ctx.solidAt(10.3, 3.9, 0.5, 0.5);

  // cabinet contents for the organize beat
  const cabItems: THREE.Object3D[] = [];
  const cols = ['#ff9e7a', '#7fd1b9', '#f2c46d', '#ff9e7a', '#7fd1b9', '#f2c46d'];
  cols.forEach((c, i) => {
    const it = put(k.items, i % 3 === 2 ? G.box(0.14, 0.2, 0.1, 0.02) : G.cyl(0.05, 0.05, 0.14, 12), M.gloss(c, 0.4), 5.35 + i * 0.28, 1.55 + (i > 2 ? 0.42 : 0.08), -4.18);
    it.scale.setScalar(0.001);
    cabItems.push(it);
  });
  // plated food for the brown-food beat
  const food = dynamic(group(ctx.root, 7.1, 0.95, -0.9));
  plate(food, -0.35, 0, 0.1);
  plate(food, 0.35, 0, 0.1);
  const foods = [steak(food, -0.35, 0.02, 0.1), drumstick(food, 0.35, 0.02, 0.05), potato(food, 0.45, 0.02, 0.2), drumstick(food, 0.28, 0.02, 0.18)];
  foods.forEach((f) => f.scale.setScalar(0.001));

  ctx.dust([-3.2, 0.3, -4.2], [2.8, 2.6, -0.5], night ? '#9fb6ff' : '#ffe9c4', 70, 0.05, night ? 0.25 : 0.55);

  /* ---------- Dan ---------- */
  const dan = new Actor('dan', { sprite: 'sprites/dan.webp', height: 1.82, look: DAN_LOOK });
  ctx.dyn.add(dan.root);
  if (night) {
    dan.root.position.set(-8.25, 0, -3.28);
    dan.facing = 0;
    dan.setState('lie');
  } else {
    dan.root.position.set(1.85, 0, 0.3);
    dan.facing = -Math.PI / 2;
    dan.setState('idle');
  }

  const hooks: Record<string, StopHooks> = {};
  let stops: StopDef[];

  if (!night) {
    hooks.bed = {
      progress: (kk) => b.setMess(1 - kk),
      done: () => {
        b.setMess(0);
        b.pillows.forEach((p, i) => {
          const y = p.position.y;
          void tweens.to(0.5, (e) => (p.position.y = y + Math.sin(e * Math.PI) * 0.25), (x) => x, i * 0.08);
        });
      },
      reset: () => b.setMess(1),
    };
    hooks.mochi = {
      done: () => {
        if (!mess) return;
        const m = mess;
        void tweens.to(0.4, (k) => m.scale.setScalar(1 - k * 0.9)).then(() => (m.visible = false));
      },
      reset: () => mess && ((mess.visible = true), mess.scale.setScalar(1)),
    };
    hooks.cabinets = {
      start: () => k.uppers.forEach((d, i) => void tweens.to(0.45, (e) => (d.rotation.y = -1.7 * e), easeOutBack, i * 0.06)),
      progress: (kk) => {
        const n = Math.round(kk * cabItems.length);
        cabItems.forEach((it, i) => {
          if (i < n && it.scale.x < 0.5) void tweens.to(0.35, (e) => it.scale.setScalar(Math.max(0.001, e)), easeOutBack);
        });
      },
      done: () => k.uppers.forEach((d, i) => void tweens.to(0.4, (e) => (d.rotation.y = -1.7 * (1 - e)), undefined, 0.5 + i * 0.05)),
      reset: () => cabItems.forEach((it) => it.scale.setScalar(0.001)),
    };
    hooks.brownfood = {
      progress: (kk) => {
        const n = Math.round(kk * foods.length);
        foods.forEach((f, i) => {
          if (i < n && f.scale.x < 0.5) void tweens.to(0.4, (e) => f.scale.setScalar(Math.max(0.001, e)), easeOutElastic);
        });
      },
      done: () => {
        dan.setState('wave');
        void tweens.wait(1.8).then(() => dan.setState('idle'));
      },
      reset: () => foods.forEach((f) => f.scale.setScalar(0.001)),
    };
    hooks.dan = {
      start: () => dan.setState('wave'),
      done: () => dan.setState('idle'),
    };
    stops = [
      {
        id: 'bed', label: 'Make the bed', verb: 'Make the bed', pos: [-7.8, -1.6], stand: [-7.8, -1.75], face: Math.PI, pose: 'work',
        mini: { type: 'pull', title: 'Pull the duvet up — hotel smooth', hint: 'Drag the handle up slowly · or hold ↑ / Space' },
        intro: [{ who: 'louise', text: 'Rule one: nothing happens today until this bed looks like a hotel.' }],
        outro: [{ who: 'narrator', text: 'Pillows aligned. Dan’s side exists. Mochi immediately lies on it.' }],
        refill: 35, hearts: 3, color: '#ff9e7a', push: { dist: 5, height: 3.4 },
      },
      {
        id: 'cabinets', label: 'Organize the cabinets', verb: 'Organize', pos: [5.9, -3.2], stand: [5.9, -3.35], face: Math.PI, pose: 'work',
        mini: {
          type: 'sort', title: 'Organize the cabinets', hint: 'Drag each item to its shelf (or tap item, then shelf)',
          slots: [
            { id: 'mugs', label: 'Mugs', color: '#ff9e7a' },
            { id: 'jars', label: 'Jars', color: '#7fd1b9' },
            { id: 'snacks', label: 'Snacks', color: '#f2c46d' },
          ],
          items: [
            { id: 'a', label: 'Mug', color: '#ff9e7a', slot: 'mugs' },
            { id: 'b', label: 'Spice jar', color: '#7fd1b9', slot: 'jars' },
            { id: 'c', label: 'Protein bars', color: '#f2c46d', slot: 'snacks' },
            { id: 'd', label: 'Travel mug', color: '#ff9e7a', slot: 'mugs' },
            { id: 'e', label: 'Honey', color: '#7fd1b9', slot: 'jars' },
            { id: 'f', label: 'Rice cakes', color: '#f2c46d', slot: 'snacks' },
          ],
        },
        intro: [{ who: 'louise', text: 'I organized these yesterday. They’ve had a whole night to become chaos.' }],
        outro: [{ who: 'narrator', text: 'Perfect. She will reorganize them again in three minutes. It’s a lifestyle.' }],
        refill: 30, hearts: 3, color: '#7fd1b9', push: { dist: 4.4, height: 3.9, yaw: -0.3 },
      },
      {
        id: 'brownfood', label: 'Only brown food for Dan', verb: 'Cook', pos: [8.3, -3.2], stand: [8.3, -3.35], face: Math.PI, pose: 'work',
        mini: {
          type: 'place', title: 'Plate the sacred Only Brown Food', hint: 'Drag the brown foods onto Dan’s plate',
          slots: [{ id: 'plate', label: 'Dan’s plate', color: '#c98a5a' }],
          items: [
            { id: 'chk', label: 'Chicken', color: '#c98a4a', slot: 'plate' },
            { id: 'stk', label: 'Steak', color: '#7a3e22', slot: 'plate' },
            { id: 'bro', label: 'Broccoli', color: '#5fa04a', reject: 'Dan: “…is that a vegetable?”' },
            { id: 'pot', label: 'Potatoes', color: '#b58a5a', slot: 'plate' },
            { id: 'sal', label: 'Kale salad', color: '#7cbf4b', reject: 'Dan: “I’m going to pretend I didn’t see that.”' },
            { id: 'chk2', label: 'More chicken', color: '#c98a4a', slot: 'plate' },
          ],
        },
        intro: [{ who: 'louise', text: 'Chicken. Steak. Brown. Dan doesn’t do “exotic.” Exotic is anything green.' }],
        outro: [
          { who: 'dan', text: '…thanks.' },
          { who: 'louise', text: 'You’re welcome. I’m already putting on shoes.' },
        ],
        refill: 35, hearts: 4, color: '#f2c46d', push: { dist: 4.6, height: 3.9, yaw: 0.35 },
      },
      {
        id: 'mochi', label: 'Clean up Mochi’s accidents', verb: 'Clean up', pos: [-2.6, 3.0], stand: [-2.05, 2.35], face: -0.7, pose: 'work', radius: 1.2,
        mini: {
          type: 'clean', title: 'Mochi missed the pad (again)', hint: 'Tap the poop to bag it · rub the puddle · tap the pad to swap it',
          mess: ['poop', 'poop', 'pee', 'pad'],
        },
        intro: [
          { who: 'louise', text: 'Mochi. Baby. The pad was RIGHT THERE.' },
          { who: 'mochi', text: '*proud little wag*' },
        ],
        outro: [{ who: 'narrator', text: 'Floor: spotless. Pad: fresh. Mochi celebrates by drinking an entire bowl of water. See you in twenty minutes.' }],
        refill: 26, hearts: 3, color: '#f2d36b', push: { dist: 3.8, height: 3.6, yaw: 0.35 },
      },
      {
        id: 'desk', label: 'Plan the day at the desk', verb: 'Plan', pos: [2.05, 2.7], stand: [2.05, 2.7], face: Math.PI / 2, pose: 'work', optional: true,
        mini: {
          type: 'sort', title: 'Plan the day (she will ignore the plan)', hint: 'Drag each stop into its part of the day',
          slots: [
            { id: 'am', label: 'Morning', color: '#f2c46d' },
            { id: 'pm', label: 'Afternoon', color: '#ff9e7a' },
            { id: 'eve', label: 'Evening', color: '#9fb6ff' },
          ],
          items: [
            { id: 'a', label: 'Grit Cycle', color: '#ff3d9a', slot: 'am' },
            { id: 'b', label: 'Shredz + Crunch + EOS', color: '#f2c230', slot: 'am' },
            { id: 'c', label: 'TJ Maxx run', color: '#a4262c', slot: 'pm' },
            { id: 'd', label: 'AI coffee meetup', color: '#9ad4ff', slot: 'pm' },
            { id: 'e', label: 'Garage sauna', color: '#ffb38a', slot: 'eve' },
            { id: 'f', label: 'YouTube + dogs', color: '#9fb6ff', slot: 'eve' },
          ],
        },
        intro: [{ who: 'louise', text: 'Quick scroll of AI news, then the plan. A very realistic plan.' }],
        outro: [{ who: 'narrator', text: 'Plan: perfect. Odds she follows it in order: low. Odds she does all of it anyway: 100%.' }],
        refill: 20, hearts: 3, color: '#9ad4ff', push: { dist: 4.2, height: 3.2, yaw: 0.45 },
      },
      {
        id: 'dan', label: 'Kiss Dan goodbye', verb: 'Say bye', pos: [1.0, 0.35], stand: [1.0, 0.35], face: Math.PI / 2, pose: 'wave', optional: true,
        mini: {
          type: 'dialogue', title: 'Quick goodbye',
          lines: [{ who: 'dan', text: 'Where are you off to?' }],
          choices: [
            { label: '“Grit Cycle. Then three gyms. Then errands. Then…”', reply: [{ who: 'dan', text: 'So… everywhere. Got it. Love you.' }], hearts: 3 },
            { label: '“Want to come?”', reply: [{ who: 'dan', text: 'I’m going to support you emotionally. From this couch.' }], hearts: 3 },
          ],
        },
        refill: 15, hearts: 3, color: '#ff8fb1', push: { dist: 4.2, height: 2.6, yaw: 0.5 },
      },
    ];
  } else {
    bedTv.setOn(false);
    hooks.youtube = {
      start: () => bedTv.setOn(true),
      done: () => undefined,
    };
    stops = [
      {
        id: 'skincare', label: 'Night skincare', verb: 'Skincare', pos: [-9.6, 2.0], stand: [-9.6, 2.0], face: -Math.PI / 2, pose: 'work',
        mini: { type: 'hold', title: 'Serum. Cream. Face roller. Stay put.', hint: 'Hold the button (or Space) — don’t let go', duration: 3.2 },
        intro: [{ who: 'louise', text: 'Twelve steps. I will stand still for all twelve. Probably.' }],
        outro: [{ who: 'narrator', text: 'Glowing. Hydrated. Already thinking about tomorrow’s Grit class.' }],
        refill: 30, hearts: 3, color: '#ff9fd6', push: { dist: 4.4, height: 2.8, yaw: -0.4 },
      },
      {
        id: 'youtube', label: 'YouTube in bed with the dogs', verb: 'Wind down', pos: [-7.1, -1.6], stand: [-7.1, -1.75], face: 0, pose: 'lie',
        poseAt: [-7.4, 0, -3.28],
        dogSpots: [[-7.5, 0.62, -2.55], [-8.1, 0.62, -3.95]],
        mini: {
          type: 'dialogue', title: 'Pick tonight’s wind-down video',
          lines: [{ who: 'narrator', text: 'Dogs in bed. Dan asleep ninety seconds ago. One video. Just one.' }],
          choices: [
            { label: 'Organizing a pantry for 3 hours (soothing)', reply: [{ who: 'louise', text: 'She paused it twice to go reorganize the actual pantry.' }], hearts: 3 },
            { label: 'Tiny dogs being dramatic, compilation', reply: [{ who: 'leo', text: '*watches intently, takes notes*' }], hearts: 4 },
            { label: 'Sauna vs. cold plunge: the truth', reply: [{ who: 'louise', text: 'Both. Obviously both. Tomorrow.' }], hearts: 3 },
          ],
        },
        outro: [
          { who: 'narrator', text: 'Mochi claims the pillow. Leo claims her feet. Louise lasts four whole minutes.' },
          { who: 'louise', text: 'Okay. One last thing — the dogs need to go downstairs.' },
        ],
        refill: 30, hearts: 3, color: '#9fb6ff', push: { dist: 5.2, height: 3.8, yaw: 0.35 },
      },
    ];
  }

  return makeSet(ctx, {
    bounds: { x0: -10.7, z0: -4.2, x1: 10.7, z1: 4.3 },
    spawn: night ? { x: 8.6, z: 1.8, face: -Math.PI / 2 } : { x: -8.6, z: 0.6, face: 0.4 },
    exit: { x: 10.2, z: 1.8, label: night ? 'Take the dogs downstairs' : 'Head out' },
    stops,
    hooks,
    dogGates: [[-4.0, 1.0], [3.5, 1.1]],
    markSpots: [
      { id: 'piano', label: 'piano leg', kind: 'piano', leg: piano.leg, stand: [piano.leg[0] + 0.32, piano.leg[1] + 0.26] },
      { id: 'stool', label: 'bar stool leg', kind: 'stool', leg: [6.215, -0.065], stand: [5.93, 0.22] },
    ],
    light: night ? KITS.night : KITS.morning,
    camera: CAM_INTERIOR,
    ambience: night ? 'homeNight' : 'home',
    music: night ? 'night' : 'cozy',
    surface: 'wood',
    npcs: [dan],
    stealables: [
      { label: 'a sock', x: -5.9, z: 1.2, color: '#ffffff' },
      { label: 'a slipper', x: 5.6, z: 2.2, color: '#f4c7b8' },
    ],
  });
}
