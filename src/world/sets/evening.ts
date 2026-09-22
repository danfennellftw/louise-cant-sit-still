import * as THREE from 'three';
import { SetCtx, room, wallZ, floorMat, plant, floorLampArc, door, rug, bench, signBoard } from '../kit';
import { KITS, CAM_INTERIOR, makeSet } from '../lighting';
import { M } from '../../art/materials';
import { TX } from '../../art/textures';
import { G, bx, cy, put, sp } from '../../art/geo';
import { Particles } from '../../art/fx';
import { sofa, dogBed } from '../../art/props/home';
import { ebike, lampPost, bush, water, evCar } from '../../art/props/outdoor';
import type { BuiltSet, StopHooks } from '../types';
import type { QualityLevel } from '../../engine/quality';

/* =================== Garage sauna =================== */
export function buildGarage(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  room(ctx, {
    x0: -7.5, x1: 7.5, z0: -4.2, z1: 4.2, h: 3.0,
    floor: floorMat(TX.speckle('#8a8f94', ['#c9ced3', '#5a5f64', '#e8e2d6'], 6000, 2.2, 'epoxy'), [3, 2], 0.3, 'garf'),
    wall: M.std('#e9e6e0', 0.9), trim: M.std('#9a9690', 0.6),
    right: [[1.2, 2.4, 0, 2.3]],
  });
  // roll-up door (closed) with a dusk window strip
  const panel = M.gloss('#f1efea', 0.5, 0.2);
  for (let i = 0; i < 4; i++) bx(ctx.root, panel, 5.6, 0.6, 0.08, 2.2, 0.05 + i * 0.62, -4.08, 0.03);
  put(ctx.root, G.plane(5.2, 0.3), M.glow('#ffb87a', 1.1), 2.2, 2.2, -4.03, { cast: false });
  // pegboard + tools
  bx(ctx.root, M.std('#c9a57a', 0.8), 2.2, 1.2, 0.04, -1.9, 1.2, -4.08, 0);
  for (let i = 0; i < 7; i++) bx(ctx.root, M.std(['#e0533a', '#2f2f33', '#f2c230', '#3a8fe0'][i % 4], 0.5), 0.06, 0.3 + (i % 3) * 0.1, 0.04, -2.8 + i * 0.3, 1.5, -4.03, 0.01);
  // shelves with bins
  const shelf = M.std('#3a3a3e', 0.5, 0.5);
  for (let lvl = 0; lvl < 4; lvl++) {
    bx(ctx.root, shelf, 0.5, 0.04, 2.4, 7.1, 0.3 + lvl * 0.6, -2.4, 0.01);
    for (let b = 0; b < 3; b++) bx(ctx.root, M.gloss(['#9ad0f5', '#f2c46d', '#ff9e7a', '#c9e7c1'][(lvl + b) % 4], 0.5, 0.2), 0.42, 0.36, 0.6, 7.1, 0.34 + lvl * 0.6, -3.2 + b * 0.8, 0.03);
  }
  ctx.solid(6.8, -3.7, 7.5, -1.1);
  // snowboards leaning on the wall
  // snowboard wall rack (their pink board + two more)
  bx(ctx.root, M.std('#2a2a2e', 0.5, 0.5), 0.06, 0.08, 1.8, 7.42, 1.15, -0.1, 0.01);
  bx(ctx.root, M.std('#2a2a2e', 0.5, 0.5), 0.06, 0.08, 1.8, 7.42, 2.05, -0.1, 0.01);
  [['#ff8fb1', -0.7], ['#f4f1ea', -0.1], ['#2f2f33', 0.5]].forEach(([c, zz]) => {
    const z = zz as number;
    put(ctx.root, G.box(0.3, 1.55, 0.035, 0.15), M.gloss(c as string, 0.3, 0.8), 7.36, 1.65, z, { ry: Math.PI / 2 });
    for (const by of [1.35, 1.95]) bx(ctx.root, M.std('#1b1b1f', 0.5), 0.08, 0.1, 0.22, 7.3, by, z, 0.02);
  });
  // the sauna
  const cedar = M.tex(TX.slats('#e6c38c', 10, 'pine'), 0.65, 0, 'pine');
  const sx = -5;
  const sz = -2.3;
  bx(ctx.root, cedar, 2.8, 2.3, 0.12, sx, 0, sz - 1.1, 0.02);
  bx(ctx.root, cedar, 0.12, 2.3, 2.3, sx - 1.4, 0, sz, 0.02);
  bx(ctx.root, cedar, 0.12, 2.3, 2.3, sx + 1.4, 0, sz, 0.02);
  bx(ctx.root, cedar, 2.9, 0.12, 2.4, sx, 2.3, sz, 0.02);
  bx(ctx.root, M.tex(TX.slats('#b8784a', 8, 'bench'), 0.6, 0, 'benchc'), 2.6, 0.45, 0.6, sx, 0, sz - 0.7, 0.03);
  put(ctx.root, G.box(2.6, 2.1, 0.03, 0), M.glass('#ffd9b0', 0.2), sx, 1.1, sz + 1.12, { cast: false, receive: false });
  bx(ctx.root, M.gloss('#1b1b1f', 0.35, 0.6), 2.8, 0.12, 0.14, sx, 2.18, sz + 1.12, 0.02);
  for (const ex of [-1.38, 1.38]) bx(ctx.root, M.gloss('#1b1b1f', 0.35, 0.6), 0.1, 2.2, 0.14, sx + ex, 0, sz + 1.12, 0.02);
  const ledStrip = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#3aa0ff', emissiveIntensity: 2.2 });
  put(ctx.dyn, G.box(2.6, 0.03, 0.03, 0.01), ledStrip, sx, 2.26, sz + 1.2, { cast: false });
  // infrared panels (dark with a warm grid that glows as it heats)
  const irMat = new THREE.MeshStandardMaterial({ color: '#2a2a2e', emissive: '#ff6a2a', emissiveIntensity: 0.05, roughness: 0.6 });
  for (const [px, pz, pry] of [[sx, sz - 1.02, 0], [sx - 1.32, sz - 0.3, Math.PI / 2], [sx + 1.32, sz - 0.3, -Math.PI / 2]] as const) {
    put(ctx.dyn, G.box(0.9, 1.1, 0.03, 0.01), irMat, px, 1.35, pz, { ry: pry, cast: false });
  }
  bx(ctx.root, M.metal('#2a2a2a', 0.4), 0.4, 0.55, 0.4, sx + 1.0, 0, sz + 0.5, 0.03);
  const coalsMat = new THREE.MeshStandardMaterial({ color: '#2a1a14', emissive: '#ff5a1a', emissiveIntensity: 0.2, roughness: 0.9 });
  for (let i = 0; i < 9; i++) put(ctx.dyn, G.dodeca(0.07), coalsMat, sx + 0.9 + (i % 3) * 0.09, 0.6, sz + 0.4 + Math.floor(i / 3) * 0.09, { ry: i });
  const glow = ctx.point(sx, 1.6, sz, '#ffa860', 0.6, 5, true);
  const panelG = bx(ctx.root, M.gloss('#1b1b1f', 0.3, 0.6), 0.3, 0.4, 0.06, sx + 1.6, 1.2, sz + 1.0, 0.02);
  void panelG;
  const ledMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#6fd3ff', emissiveIntensity: 1.2 });
  put(ctx.dyn, G.plane(0.2, 0.08), ledMat, sx + 1.6, 1.5, sz + 1.04, { cast: false });
  ctx.solid(sx - 1.5, sz - 1.2, sx + 1.5, sz + 1.2);
  const steam = new Particles({
    count: q === 'low' ? 20 : 45, min: new THREE.Vector3(sx - 1.2, 0.5, sz - 0.9), max: new THREE.Vector3(sx + 1.2, 2.2, sz + 0.9),
    color: '#ffffff', size: 0.5, opacity: 0.04, velocity: new THREE.Vector3(0, 0.25, 0), wander: 0.3, additive: false,
  });
  ctx.dyn.add(steam.points);
  ctx.particles.push(steam);
  // cold plunge
  cy(ctx.root, M.gloss('#2f3a44', 0.4, 0.3), 0.75, 0.7, 0.75, -2.3, 0, -2.9, 28);
  water(ctx, -2.3, -2.9, 1.3, 1.3, '#6fb6d8', 6, 0.72);
  ctx.solidAt(-2.3, -2.9, 1.5, 1.5);
  // parked e-bike + charger
  const bike = ebike(ctx.root, -0.9, 3.45, 1.35, '#3a3f45', true);
  void bike;
  ctx.solidAt(-0.9, 3.45, 1.6, 0.9);
  // EV on the charger (wall box with green status ring + coiled cable)
  evCar(ctx, 3.9, -0.8, 0, '#f2f3f5');
  bx(ctx.root, M.gloss('#f4f4f6', 0.3, 0.3), 0.34, 0.46, 0.14, 3.9, 1.05, -4.05, 0.05);
  put(ctx.root, G.ring(0.06, 0.08, 24), M.glow('#6fe36f', 2.2), 3.9, 1.32, -3.97, { cast: false });
  put(ctx.root, G.torus(0.16, 0.025, Math.PI * 2, 6, 20), M.std('#151517', 0.6), 3.9, 0.85, -3.95, {});
  const cable = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.9, 1.0, -3.98), new THREE.Vector3(3.9, 0.3, -3.7), new THREE.Vector3(3.5, 0.08, -3.4),
    new THREE.Vector3(3.2, 0.3, -3.1), new THREE.Vector3(3.15, 0.75, -3.0),
  ]);
  ctx.root.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 24, 0.022, 6), M.std('#151517', 0.6)));
  signBoard(ctx.root, TX.sign('CHARGING 78%', { w: 256, h: 64, fg: '#6fe36f', bg: '#101214' }), 3.9, 1.6, -3.99, 0.5, 0.12, 0, 0.8, 'evc');
  // yoga mat + mini fridge
  put(ctx.root, G.box(0.7, 0.012, 1.8, 0.005), M.std('#b48cff', 0.9), 1.0, 0.007, -1.4, { ry: 0.2, cast: false });
  bx(ctx.root, M.gloss('#e9e9ee', 0.3, 0.4), 0.6, 0.85, 0.6, 5.8, 0, -3.6, 0.04);
  ctx.solidAt(5.8, -3.6, 0.6, 0.6);
  for (const x of [-3, 3]) put(ctx.root, G.box(2.2, 0.06, 0.16, 0.02), M.glow('#eaf4ff', 1.6), x, 2.9, 0, { cast: false });
  ctx.point(0, 2.6, 0.5, '#eaf4ff', 2.2, 10);
  door(ctx, 7.42, 1.8, 'right', '#f1efea');
  plant(ctx.root, -7.0, 3.6, 0.9, '#d9cbb5', 'snake');
  ctx.dust([-7, 0.3, -4], [7, 2.8, 4], '#fff1dc', 50, 0.04, 0.35);

  let heat = 0;
  ctx.on((_dt, t) => {
    coalsMat.emissiveIntensity = 0.2 + heat * (1.8 + Math.sin(t * 5) * 0.3);
    irMat.emissiveIntensity = 0.05 + heat * (0.9 + Math.sin(t * 2) * 0.1);
    ledStrip.emissiveIntensity = 1.8 + Math.sin(t * 1.5) * 0.4;
    if (glow) glow.intensity = 0.6 + heat * 3.5;
    steam.opacity = 0.04 + heat * 0.12;
    ledMat.emissive.set(heat > 0.5 ? '#ff7a3a' : '#6fd3ff');
  });
  const hooks: Record<string, StopHooks> = {
    heat: { progress: (k) => (heat = Math.max(heat, k * 0.7)), done: () => (heat = 0.75) },
    sauna: { progress: (k) => (heat = 0.75 + k * 0.25) },
  };
  return makeSet(ctx, {
    bounds: { x0: -7.2, z0: -3.9, x1: 7.2, z1: 4.0 },
    spawn: { x: 6.4, z: 1.8, face: -Math.PI / 2 },
    exit: { x: 6.9, z: 1.8, label: 'Upstairs to bed' },
    stops: [
      {
        id: 'heat', label: 'Crank the sauna', verb: 'Crank', pos: [-3.2, -0.5], stand: [-3.2, -0.55], face: Math.PI, pose: 'work',
        mini: { type: 'mash', title: 'Crank it to 180°F', hint: 'Mash the button or Space', duration: 2.4 },
        intro: [{ who: 'narrator', text: 'The garage: pine-box sauna, snowboards, the car on the charger, the e-bike topping up. The one place Louise agrees to sit… for science.' }],
        refill: 30, hearts: 2, color: '#ff9e5a', push: { dist: 4.6, height: 2.8 },
      },
      {
        id: 'sauna', label: 'Sauna session', verb: 'Sweat', pos: [-5, -0.5], stand: [-5, -0.55], face: 0, pose: 'relax',
        poseAt: [-5, 0, -2.95],
        dogSpots: [[-3.3, 0, -0.35], [-6.6, 0, -0.35]],
        mini: { type: 'hold', title: 'Breathe. Sweat. Don’t bolt.', hint: 'Hold the button or Space — she will try to get up', duration: 4.5, twitchy: true },
        outro: [
          { who: 'narrator', text: 'Eleven minutes. Seated. A record. Mochi and Leo press their noses to the glass the entire time.' },
          { who: 'louise', text: 'Cold plunge next? …Tomorrow. Bed.' },
        ],
        refill: 40, hearts: 4, color: '#ffb38a', push: { dist: 5, height: 2.6 },
      },
    ],
    hooks,
    light: KITS.garage,
    camera: CAM_INTERIOR,
    ambience: 'garage',
    music: 'night',
    surface: 'concrete',
  });
}

/* =================== Downstairs: herd the dogs to their beds =================== */
export function buildDownstairs(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  // den (interior)
  room(ctx, {
    x0: -8.5, x1: -1, z0: -4.5, z1: 4.5, h: 2.9,
    floor: floorMat(TX.wood('#8a6040', 'den'), [3, 3], 0.55, 'denf'),
    wall: M.std('#e9dccb', 0.9), right: false,
  });
  wallZ(ctx, -1, -4.5, -0.4, 2.9, M.std('#e9dccb', 0.9));
  bx(ctx.root, M.std('#3a2a2a', 0.8), 0.22, 0.03, 4.1, -1, 2.9, -2.45, 0, { cast: false });
  rug(ctx.root, -4.8, 0.6, 4.2, 3.0, TX.rug('#d9d4cc', '#8e8a86'), 0, 'denrug');
  sofa(ctx, -4.8, -3.6, 0, '#c9b39a', 2.4);
  floorLampArc(ctx, -7.6, -3.7, 0.6, true);
  plant(ctx.root, -1.7, -3.9, 1.0, '#e6ddd0', 'fig');
  ctx.solidAt(-1.7, -3.9, 0.5, 0.5);
  const beds = { mochi: [-6.4, 1.2] as [number, number], leo: [-3.4, 1.9] as [number, number] };
  dogBed(ctx.root, beds.mochi[0], beds.mochi[1], '#efe2cc', true);
  dogBed(ctx.root, beds.leo[0], beds.leo[1], '#c98a4a', true);
  // courtyard (exterior)
  put(ctx.root, G.box(10, 0.1, 9.6, 0), floorMat(TX.grass('#4f6f3a'), [3, 3], 0.95, 'yard'), 3.9, -0.05, 0, { cast: false });
  put(ctx.root, G.box(1.6, 0.02, 9.6, 0), floorMat(TX.pavers('#b8aa94', '#8f836f'), [1, 5], 0.8, 'yardpath'), 0.1, 0.005, 0, { cast: false });
  // building facade with lit windows
  bx(ctx.root, M.std('#d9cbb8', 0.9), 10, 6.5, 0.4, 3.9, 0, -4.9, 0.02);
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 2; j++) {
      const lit = (i + j) % 3 !== 0;
      put(ctx.root, G.plane(1.1, 1.2), lit ? M.glow('#ffd49a', 0.9) : M.std('#2a3040', 0.4), -0.2 + i * 2, 3.3 + j * 1.8, -4.68, { cast: false });
    }
  // stairs they came down
  for (let i = 0; i < 6; i++) bx(ctx.root, M.std('#bfb3a2', 0.8), 2.2, 0.18 * (i + 1), 0.4, 7.2, 0, -2.4 - i * 0.4, 0.02);
  ctx.solid(6.1, -4.7, 8.5, -2.2);
  for (let i = 0; i < 6; i++) bush(ctx.root, 0.4 + i * 1.3, -4.2, 0.9, '#3f5f32');
  ctx.solid(-0.2, -4.6, 6.1, -3.8);
  lampPost(ctx, 1.6, 3.9, '#ffd48a', true, 3.0);
  lampPost(ctx, 8.0, 0.4, '#ffd48a', true, 3.0);
  bench(ctx.root, 5.0, 3.9, Math.PI, '#8a6a4a', 1.8);
  ctx.solidAt(5.0, 3.9, 1.8, 0.5);
  put(ctx.root, G.sphere(3, 20, 14), new THREE.MeshBasicMaterial({ color: '#f4f0d8', fog: false, toneMapped: false }), 18, 20, -40, { cast: false, receive: false });
  const flies = new Particles({
    count: q === 'low' ? 20 : 45, min: new THREE.Vector3(-0.5, 0.3, -3.8), max: new THREE.Vector3(8.5, 2.6, 4.2), color: '#ffe98a', size: 0.08, opacity: 0.9,
    twinkle: 1, wander: 0.5, velocity: new THREE.Vector3(0.05, 0.02, 0.03),
  });
  ctx.dyn.add(flies.points);
  ctx.particles.push(flies);
  sp(ctx.root, M.std('#e0533a', 0.5), 0.09, 3.5, 0.09, 1.5);
  return makeSet(ctx, {
    bounds: { x0: -8.2, z0: -4.1, x1: 8.2, z1: 4.3 },
    spawn: { x: 5.8, z: -1.8, face: -Math.PI / 2 },
    exit: null,
    stops: [],
    light: { ...KITS.night, hemi: 0.55 },
    camera: CAM_INTERIOR,
    ambience: 'night',
    music: 'night',
    surface: 'grass',
    dogBeds: beds,
  });
}
