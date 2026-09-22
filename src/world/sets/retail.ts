import * as THREE from 'three';
import { SetCtx, room, floorMat, plant, door, signBoard, bench, wallX } from '../kit';
import { KITS, CAM_INTERIOR, CAM_WIDE, makeSet } from '../lighting';
import { M } from '../../art/materials';
import { TX } from '../../art/textures';
import { G, bx, cy, put, dynamic, group } from '../../art/geo';
import { lightShaft, Particles } from '../../art/fx';
import {
  gondola, wallShelf, clothingRack, produceStand, fridgeCase, checkout, cart, displayTable, shoeWall, mannequin, basketStack, candle,
  storefront, spaTable,
} from '../../art/props/retail';
import { palm } from '../../art/props/outdoor';
import { spawnNpc } from '../npc';
import type { BuiltSet } from '../types';
import type { QualityLevel } from '../../engine/quality';

const SHOPPERS = { tops: ['#f4a6a0', '#9ad0f5', '#fff3c4', '#c9e7c1', '#d7ccc8', '#37474f', '#ffffff'], bottoms: ['#2a3a5a', '#e7dccb', '#3a3a3a', '#8a6a4a'] };

function glowBars(ctx: SetCtx, x0: number, x1: number, zs: number[], y: number) {
  for (const z of zs) put(ctx.root, G.box(x1 - x0, 0.05, 0.25, 0.02), M.glow('#fffaf0', 1.4), (x0 + x1) / 2, y, z, { cast: false });
}

/* =================== Grocery =================== */
export function buildGrocery(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  const green = '#3f8f5a';
  room(ctx, {
    x0: -9, x1: 9, z0: -4.6, z1: 4.6, h: 3.6,
    floor: floorMat(TX.tiles('#f1eee8', '#d6d0c6', 4, 0.03, 'groc'), [9, 4.6], 0.35, 'grocf'),
    wall: M.std('#f6f2ea', 0.85), trim: M.std(green, 0.6),
    right: [[1.2, 2.6, 0, 2.4]],
  });
  bx(ctx.root, M.std(green, 0.6), 18, 0.5, 0.03, 0, 2.7, -4.47, 0);
  signBoard(ctx.root, TX.sign('MARKET', { w: 512, h: 128, fg: '#ffffff', sub: 'FRESH · LOCAL-ISH', spacing: 6 }), -2.5, 2.95, -4.44, 2.8, 0.7, 0, 0.6, 'market');
  signBoard(ctx.root, TX.sign('BUTCHER', { w: 512, h: 128, bg: '#7a2e22', fg: '#fff3e0', border: '#f2c46d' }), 5.5, 2.95, -4.44, 2.2, 0.55, 0, 0.5, 'butcher');
  fridgeCase(ctx, -6.5, -4.15, 3.6, 0, '#dff4ff', 5);
  fridgeCase(ctx, -2.5, -4.15, 3.6, 0, '#dff4ff', 6);
  const meat = fridgeCase(ctx, 5.5, -4.15, 4.4, 0, '#ffe6d6', 8);
  void meat;
  produceStand(ctx, -6.6, 2.6);
  produceStand(ctx, -4.2, 2.6, 0, ['#9bd05a', '#f08a2c', '#e8453c', '#ffe066']);
  gondola(ctx, -4.4, -1.2, 4.2, 0, 21, ['#e8453c', '#f2c14e', '#fff', '#3f8f5a', '#f08a2c']);
  gondola(ctx, 0.9, -1.2, 4.2, 0, 22, ['#64b5f6', '#fff', '#ffd54f', '#ba68c8', '#ff8a65']);
  gondola(ctx, 0.9, 1.2, 4.2, 0, 23, ['#81c784', '#fff3e0', '#e57373', '#ffd54f']);
  checkout(ctx, 6.4, 3.0, 0, green);
  cart(ctx.root, 7.8, 0.4, 0.3, green);
  cart(ctx.root, 8.2, -0.6, 0.2, green);
  ctx.solid(7.4, -1.1, 8.6, 0.9);
  glowBars(ctx, -8, 8, [-2.8, 0, 2.8], 3.4);
  plant(ctx.root, 8.4, -3.9, 1, '#ffffff', 'fig');
  door(ctx, 8.9, 1.9, 'right', '#ffffff');
  const npcs = [spawnNpc(ctx, 61, -2.6, 0, Math.PI, 'shop', SHOPPERS), spawnNpc(ctx, 62, -5.4, 1.6, 0.3, 'shop', SHOPPERS), spawnNpc(ctx, 63, 6.4, 2.35, 0, 'idle', SHOPPERS)];
  ctx.dust([-8, 0.5, -4], [8, 3.2, 4], '#ffffff', 40, 0.04, 0.3);
  return makeSet(ctx, {
    bounds: { x0: -8.7, z0: -3.5, x1: 8.7, z1: 4.3 },
    spawn: { x: 7.8, z: 1.9, face: -Math.PI / 2 },
    exit: { x: 8.4, z: 1.9, label: 'Head out' },
    stops: [
      {
        id: 'meat', label: 'Chicken & steak run', verb: 'Shop', pos: [5.5, -2.9], stand: [5.5, -3.0], face: Math.PI, pose: 'shop',
        mini: {
          type: 'place', title: 'Only brown food goes in the cart', hint: 'Drag the Dan-approved items into the cart',
          slots: [{ id: 'cart', label: 'Cart', color: '#3f8f5a' }],
          items: [
            { id: 'a', label: 'Chicken thighs', color: '#d9a066', slot: 'cart' },
            { id: 'b', label: 'Ribeye', color: '#8a3a2a', slot: 'cart' },
            { id: 'c', label: 'Asparagus', color: '#6fa84a', reject: 'Dan wouldn’t recognize this. Back it goes.' },
            { id: 'd', label: 'Rotisserie chicken', color: '#c4823e', slot: 'cart' },
            { id: 'e', label: 'Mango', color: '#f2a93b', reject: 'Too exotic. Dan would ask questions.' },
            { id: 'f', label: 'Ground beef', color: '#9a4a3a', slot: 'cart' },
          ],
        },
        intro: [{ who: 'narrator', text: 'Grocery run. Mission: brown-food supplies. Chicken count: yes.' }],
        outro: [{ who: 'louise', text: 'Four proteins, zero vegetables. Dan will be so proud.' }],
        refill: 35, hearts: 3, color: '#f2c46d', push: { dist: 4.6, height: 3 },
      },
      {
        id: 'checkout', label: 'Speed checkout', verb: 'Scan', pos: [6.4, 3.8], stand: [6.4, 3.75], face: Math.PI, pose: 'work',
        mini: { type: 'mash', title: 'Scan it all — beep beep beep', hint: 'Mash the button or Space', duration: 2.6 },
        outro: [{ who: 'narrator', text: 'Bagged it herself. Faster than the cashier. The cashier noticed.' }],
        refill: 30, hearts: 2, color: '#3f8f5a', push: { dist: 4.6, height: 2.8, yaw: -0.4 },
      },
    ],
    light: KITS.retail,
    camera: CAM_INTERIOR,
    ambience: 'retail',
    music: 'retail',
    surface: 'tile',
    npcs,
    stealables: [{ label: 'a baguette', x: -6, z: 1.2, color: '#d9a066' }],
  });
}

/* =================== TJ Maxx =================== */
export function buildTjMaxx(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  const red = '#a4262c';
  room(ctx, {
    x0: -9, x1: 9, z0: -4.6, z1: 4.6, h: 3.6,
    floor: floorMat(TX.wood('#cfa77e', 'tj'), [4, 2], 0.5, 'tjf'),
    wall: M.std('#f5efe6', 0.85), trim: M.std(red, 0.55),
    right: [[1.2, 2.6, 0, 2.4]],
  });
  bx(ctx.root, M.std(red, 0.6), 18, 0.3, 0.03, 0, 2.9, -4.47, 0);
  signBoard(ctx.root, TX.sign('tj maxx', { w: 512, h: 128, fg: red, font: 'Fraunces, Georgia, serif', weight: 700, sub: 'HOME · FASHION · FINDS' }), 5.2, 2.2, -4.44, 3.4, 0.85, 0, 0.3, 'tj');
  wallShelf(ctx, -5.2, -4.25, 6.4, 0, 31, ['#c9a06a', '#f4ead8', '#e7c9b0', '#a0b8a0', '#d9cbb5', '#b58a5a']);
  for (let i = 0; i < 4; i++) basketStack(ctx.root, -7.6 + i * 1.6, -3.6, ['#c9a06a', '#b58a5a', '#e0c79a', '#a07850'][i], 3);
  clothingRack(ctx, -3.5, 1.2, 0, 32, undefined, true);
  clothingRack(ctx, 0.4, 1.8, 0, 33, ['#fce4ec', '#e1f5fe', '#fff8e1', '#f3e5f5', '#e8f5e9'], true);
  clothingRack(ctx, 3.8, 0.8, 0, 34, undefined, true);
  displayTable(ctx, -1.4, -1.4, 0.2);
  const t2 = displayTable(ctx, 2.4, -1.8, -0.15, ['#f4ead8', '#e7c9b0', '#d9cbb5', '#c9e0d8']);
  for (let i = 0; i < 3; i++) candle(t2, -0.4 + i * 0.4, 0.93, 0.1, ['#f4ead8', '#e7b8a8', '#cfe0c8'][i]);
  wallShelf(ctx, 5.4, -4.25, 3, 0, 35, ['#ffd1dc', '#fff', '#f2c46d', '#c9e7ff', '#e0f0e0']);
  mannequin(ctx.root, -7.6, 1.6, 0.4, '#a4262c');
  mannequin(ctx.root, 7.4, -1.2, -0.5, '#e8c9a8');
  ctx.solidAt(-7.6, 1.6, 0.6, 0.6);
  ctx.solidAt(7.4, -1.2, 0.6, 0.6);
  checkout(ctx, 6.4, 3.2, 0, red);
  glowBars(ctx, -8, 8, [-2.6, 0.4, 3.0], 3.4);
  door(ctx, 8.9, 1.9, 'right', '#ffffff');
  const npcs = [spawnNpc(ctx, 71, -1.6, 0.6, 1.2, 'shop', SHOPPERS), spawnNpc(ctx, 72, 5.6, -3.1, Math.PI, 'shop', SHOPPERS)];
  ctx.dust([-8, 0.5, -4], [8, 3.2, 4], '#fff4e0', 40, 0.04, 0.3);
  return makeSet(ctx, {
    bounds: { x0: -8.7, z0: -3.2, x1: 8.7, z1: 4.3 },
    spawn: { x: 7.8, z: 1.9, face: -Math.PI / 2 },
    exit: { x: 8.4, z: 1.9, label: 'Head out' },
    stops: [
      {
        id: 'home', label: 'Home-aisle treasure hunt', verb: 'Hunt', pos: [-4.4, -2.7], stand: [-4.4, -2.8], face: Math.PI, pose: 'shop',
        mini: {
          type: 'sort', title: 'Sort the finds into the cart', hint: 'Drag each find to where it belongs',
          slots: [
            { id: 'bask', label: 'Baskets', color: '#c9a06a' },
            { id: 'cand', label: 'Candles', color: '#e7b8a8' },
            { id: 'pill', label: 'Pillows', color: '#cfe0c8' },
          ],
          items: [
            { id: 'a', label: 'Woven basket', color: '#c9a06a', slot: 'bask' },
            { id: 'b', label: 'Fig candle', color: '#e7b8a8', slot: 'cand' },
            { id: 'c', label: 'Boucle pillow', color: '#cfe0c8', slot: 'pill' },
            { id: 'd', label: 'Seagrass basket', color: '#c9a06a', slot: 'bask' },
            { id: 'e', label: 'Vanilla candle', color: '#e7b8a8', slot: 'cand' },
            { id: 'f', label: 'Linen pillow', color: '#cfe0c8', slot: 'pill' },
          ],
        },
        intro: [{ who: 'narrator', text: 'TJ Maxx. She came in for nothing. She needs a basket.' }],
        outro: [{ who: 'narrator', text: 'Finds secured. Sudden urgent need to reorganize the entire condo: also secured.' }],
        refill: 35, hearts: 3, color: '#c9a06a', push: { dist: 4.6, height: 3 },
      },
      {
        id: 'endcap', label: 'Skincare endcap', verb: 'Grab', pos: [5.4, -3.0], stand: [5.2, -3.1], face: Math.PI, pose: 'shop',
        mini: { type: 'timing', title: 'Snag the last serum', hint: 'Tap / Space in the zone before the other shopper does', reps: 3, zone: 0.2, speed: 1.4 },
        outro: [{ who: 'louise', text: 'It was the last one. It was meant to be. It was also 40% off.' }],
        refill: 30, hearts: 3, color: '#ff9fd6', push: { dist: 4.4, height: 2.8, yaw: -0.3 },
      },
    ],
    light: { ...KITS.retail, sun: '#ffe9cc', sky: '#fff3e2' },
    camera: CAM_INTERIOR,
    ambience: 'retail',
    music: 'retail',
    surface: 'wood',
    npcs,
    stealables: [{ label: 'a throw pillow', x: -1, z: 3.2, color: '#cfe0c8' }],
  });
}

/* =================== Marshall's =================== */
export function buildMarshalls(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  const blue = '#1f5fa8';
  room(ctx, {
    x0: -9, x1: 9, z0: -4.6, z1: 4.6, h: 3.6,
    floor: floorMat(TX.speckle('#eef0f2', ['#1f5fa8', '#9aa6b2', '#c9d2dc', '#ffffff'], 4000, 3, 'terrazzo'), [4, 2], 0.3, 'marf'),
    wall: M.std('#fbfbfc', 0.85), trim: M.std(blue, 0.55),
    right: [[1.2, 2.6, 0, 2.4]],
  });
  bx(ctx.root, M.std(blue, 0.6), 18, 0.3, 0.03, 0, 2.9, -4.47, 0);
  signBoard(ctx.root, TX.sign('Marshall’s', { w: 512, h: 128, fg: blue, weight: 700, sub: 'SHOES · BAGS · CLEARANCE' }), 0, 2.2, -4.44, 3.4, 0.85, 0, 0.3, 'mar');
  shoeWall(ctx, -8.75, 0, 7, Math.PI / 2);
  wallShelf(ctx, 5.2, -4.25, 6, 0, 41, ['#1d1d1f', '#8a5a3a', '#e8c9a8', '#a4262c', '#f4ead8', '#1f5fa8']);
  for (const [x, z] of [[-4.6, -2.0], [-4.6, 0.4], [-1.2, -2.0], [-1.2, 0.4], [2.2, -1.2]]) {
    clothingRack(ctx, x, z, 0, 42 + Math.floor(x + z), ['#1f5fa8', '#ffffff', '#f4a6a0', '#37474f', '#fff3c4', '#9ad0f5']);
    signBoard(ctx.root, TX.sign('CLEARANCE', { w: 256, h: 64, bg: '#e0533a', fg: '#fff' }), x, 1.85, z, 0.6, 0.15, 0, 0.3, 'clr');
  }
  mannequin(ctx.root, 5.2, 1.0, -0.4, '#1f5fa8');
  mannequin(ctx.root, 6.4, 0.6, -0.2, '#f4a6a0');
  ctx.solid(4.8, 0.2, 6.8, 1.4);
  bench(ctx.root, -6.8, 2.6, Math.PI / 2, '#c9d2dc', 1.6);
  ctx.solidAt(-6.8, 2.6, 0.5, 1.6);
  checkout(ctx, 6.4, 3.2, 0, blue);
  glowBars(ctx, -8, 8, [-2.6, 0.4, 3.0], 3.4);
  door(ctx, 8.9, 1.9, 'right', '#ffffff');
  const npcs = [spawnNpc(ctx, 81, -2.9, -0.8, 0.8, 'shop', SHOPPERS), spawnNpc(ctx, 82, 3.8, -3.2, Math.PI, 'shop', SHOPPERS)];
  ctx.dust([-8, 0.5, -4], [8, 3.2, 4], '#eaf2ff', 40, 0.04, 0.3);
  return makeSet(ctx, {
    bounds: { x0: -8.3, z0: -3.2, x1: 8.7, z1: 4.3 },
    spawn: { x: 7.8, z: 1.9, face: -Math.PI / 2 },
    exit: { x: 8.4, z: 1.9, label: 'Head out' },
    stops: [
      {
        id: 'clearance', label: 'Clearance rack dig', verb: 'Dig', pos: [-2.9, -0.8], stand: [-2.9, 1.3], face: Math.PI, pose: 'shop',
        mini: { type: 'mash', title: 'Flick flick flick through the hangers', hint: 'Mash the button or Space', duration: 2.8 },
        intro: [{ who: 'narrator', text: 'Marshall’s. The clearance racks call to her by name.' }],
        outro: [{ who: 'narrator', text: 'Haul acquired. Mochi approved. Leo demanded a treat for his patience.' }],
        refill: 30, hearts: 3, color: '#e0533a', push: { dist: 4.8, height: 3 },
      },
      {
        id: 'shoes', label: 'Shoe aisle try-on', verb: 'Try on', pos: [-7.6, 0.6], stand: [-7.6, 0.6], face: -Math.PI / 2, pose: 'work',
        mini: { type: 'pull', title: 'Lace them up snug', hint: 'Drag the handle up slowly · or hold ↑ / Space' },
        outro: [{ who: 'louise', text: 'Walked the aisle twice to test them. Then a third time. For science.' }],
        refill: 30, hearts: 3, color: blue, push: { dist: 4.4, height: 2.6, yaw: -0.5 },
      },
    ],
    light: { ...KITS.retail, sun: '#eef4ff', sky: '#f4f8ff' },
    camera: CAM_INTERIOR,
    ambience: 'retail',
    music: 'retail',
    surface: 'tile',
    npcs,
    stealables: [{ label: 'a shoebox lid', x: -5.5, z: 3.2, color: '#f4ead8' }],
  });
}

/* =================== The Mall (Nike shoes, skincare, massage) =================== */
export function buildMall(q: QualityLevel): BuiltSet {
  const ctx = new SetCtx(q);
  const floor = floorMat(TX.tiles('#efe6d8', '#d6c8b2', 3, 0.04, 'mall'), [7, 3.5], 0.25, 'mallf');
  room(ctx, { x0: -12, x1: 12, z0: -5.5, z1: 5, h: 6, floor, wall: M.std('#f4ece0', 0.85), trim: M.std('#c9a57a', 0.5), crown: true });
  // storefront bays
  const bays: [number, string, string, THREE.Texture, string][] = [
    [-7, '#1d1d1f', '#f4f1ec', TX.sign('SNEAKERS', { w: 512, h: 128, fg: '#ffffff', spacing: 10 }), 'snk'],
    [0, '#f4b6c8', '#fff4f6', TX.sign('glow', { w: 512, h: 128, fg: '#b23a6a', italic: true, font: 'Fraunces, Georgia, serif', sub: 'SKIN STUDIO' }), 'glow'],
    [7, '#8aa89a', '#eef3ee', TX.sign('knead', { w: 512, h: 128, fg: '#ffffff', font: 'Fraunces, Georgia, serif', sub: 'MASSAGE' }), 'knead'],
  ];
  for (const [x, trim, inner, tex, key] of bays) {
    put(ctx.root, G.box(5.2, 0.02, 3.0, 0), M.std(inner, 0.6), x, 0.012, -4.0, { cast: false });
    storefront(ctx, x, -2.5, 5, 3.4, trim, tex, key);
    wallX(ctx, -2.5, x - 2.75, x - 2.45, 3.4, M.std(trim, 0.5), [], 0.1, false);
  }
  // partitions between bays
  for (const x of [-3.5, 3.5]) {
    bx(ctx.root, M.std('#f4ece0', 0.85), 2, 3.4, 3.0, x, 0, -4.0, 0);
    ctx.solid(x - 1, -5.5, x + 1, -2.5);
  }
  // upper level balcony
  bx(ctx.root, M.std('#efe6d8', 0.7), 24, 0.3, 1.4, 0, 3.4, -4.8, 0.02);
  put(ctx.root, G.box(24, 0.9, 0.03, 0), M.glass('#dff1f7', 0.25), 0, 4.15, -4.1, { cast: false, receive: false });
  bx(ctx.root, M.metal('#c9a57a', 0.3), 24, 0.05, 0.06, 0, 4.6, -4.1, 0.02);
  for (let i = 0; i < 4; i++) bx(ctx.root, M.std(['#f4b6c8', '#c9e0d8', '#f2c46d', '#b6c8e8'][i], 0.7), 3.6, 2.0, 0.1, -9 + i * 6, 3.7, -5.4, 0.02);

  // sneaker bay
  shoeWall(ctx, -7, -5.25, 4.8, 0, '#2a2a2a');
  bench(ctx.root, -7, -3.4, 0, '#c9c9c9', 1.8);
  ctx.solidAt(-7, -3.4, 1.8, 0.5);
  // glow bay
  const counter = bx(ctx.root, M.gloss('#fff4f6', 0.3, 0.5), 3, 0.95, 0.6, 0, 0, -4.9, 0.03);
  void counter;
  for (let i = 0; i < 8; i++) cy(ctx.root, M.gloss(['#f4b6c8', '#ffffff', '#f2c46d'][i % 3], 0.2, 0.8), 0.04, 0.04, 0.16, -1.2 + i * 0.34, 0.95, -4.9, 12);
  bx(ctx.root, M.metal('#e9e9ee', 0.05), 1.2, 1.0, 0.02, 0, 1.4, -5.35, 0);
  for (let i = 0; i < 6; i++) put(ctx.root, G.sphere(0.05, 8, 6), M.glow('#fff1d6', 2.4), -0.6 + (i % 3) * 0.6, 1.4 + Math.floor(i / 3) * 1.0, -5.32, { cast: false });
  ctx.solid(-1.5, -5.5, 1.5, -4.5);
  cy(ctx.root, M.fabric('#f4b6c8', '#fff'), 0.24, 0.22, 0.42, 0, 0, -3.8, 18);
  // massage bay
  spaTable(ctx, 7, -3.9, Math.PI / 2);
  for (let i = 0; i < 4; i++) candle(ctx.root, 5.4 + i * 0.3, 0.02, -5.1);
  plant(ctx.root, 9.1, -5.0, 1.0, '#ffffff', 'snake');
  ctx.point(7, 2.2, -4, '#ffc890', 2.5, 5);

  // atrium: fountain, palms, benches, skylight shafts
  const fountain = group(ctx.root, 0, 0, 1.6);
  cy(fountain, M.std('#e2d4bf', 0.6), 1.9, 2.0, 0.45, 0, 0, 0, 36);
  put(fountain, G.cyl(1.75, 1.75, 0.02, 36), new THREE.MeshPhysicalMaterial({ color: '#7ec4d8', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 }), 0, 0.42, 0);
  cy(fountain, M.std('#e2d4bf', 0.6), 0.35, 0.45, 0.9, 0, 0.4, 0, 20);
  cy(fountain, M.std('#e2d4bf', 0.6), 0.7, 0.5, 0.12, 0, 1.3, 0, 24);
  ctx.solidAt(0, 1.6, 3.8, 3.8);
  const spray = new Particles({
    count: q === 'low' ? 30 : 70, min: new THREE.Vector3(-0.6, 1.3, 1.0), max: new THREE.Vector3(0.6, 2.6, 2.2), color: '#e8f8ff', size: 0.08, opacity: 0.6,
    velocity: new THREE.Vector3(0, -1.2, 0), wander: 0.25, twinkle: 0.3,
  });
  ctx.dyn.add(spray.points);
  ctx.particles.push(spray);
  for (const [x, z] of [[-9.5, 3.2], [9.5, 3.2], [-4.5, 3.8], [4.5, 3.8]]) {
    bx(ctx.root, M.std('#d9c7ab', 0.9), 1.2, 0.6, 1.2, x, 0, z, 0.05);
    palm(ctx, x, z, 4.2, Math.floor(x), true);
    ctx.solidAt(x, z, 1.2, 1.2);
  }
  bench(ctx.root, -6, 0.8, 0, '#b58a60', 2);
  bench(ctx.root, 6, 0.8, 0, '#b58a60', 2);
  ctx.solidAt(-6, 0.8, 2, 0.5);
  ctx.solidAt(6, 0.8, 2, 0.5);
  for (const x of [-7, 0, 7]) lightShaft(ctx.dyn, x, 7.5, 2.5, 2.4, 9, '#fff1d6', 0.1, 0.35);
  const ctxDust = ctx.dust([-11, 0.5, -2], [11, 5.5, 4.5], '#fff1d6', 100, 0.05, 0.5);
  void ctxDust;
  const npcs = [spawnNpc(ctx, 91, -3, 3.4, 2.4, 'walk', SHOPPERS), spawnNpc(ctx, 92, 3.4, -1.2, 0.5, 'shop', SHOPPERS), spawnNpc(ctx, 93, -8.2, -3.3, 0, 'idle', SHOPPERS)];
  // one shopper strolls laps around the fountain
  const stroller = npcs[0];
  stroller.speed = 0.7;
  dynamic(stroller.root);
  ctx.on((_dt, t) => {
    const a = t * 0.18;
    stroller.root.position.set(Math.cos(a) * 3.4, 0, 1.6 + Math.sin(a) * 2.6);
    stroller.facing = Math.atan2(-Math.sin(a) * 3.4, Math.cos(a) * 2.6);
  });
  return makeSet(ctx, {
    bounds: { x0: -11.6, z0: -5.1, x1: 11.6, z1: 4.6 },
    spawn: { x: 0, z: 4.2, face: Math.PI },
    exit: { x: 0, z: 4.4, label: 'Head out' },
    stops: [
      {
        id: 'nike', label: 'Fresh Nike running shoes', verb: 'Lace up', pos: [-7, -2.8], stand: [-7, -2.9], face: 0, pose: 'work',
        mini: { type: 'pull', title: 'Lace up the new pair', hint: 'Drag the handle up slowly · or hold ↑ / Space' },
        intro: [{ who: 'narrator', text: 'New running shoes. Louise doesn’t run from responsibility — she runs to the next stop.' }],
        outro: [{ who: 'louise', text: 'Wearing them out of the store. Obviously.' }],
        refill: 30, hearts: 3, color: '#ffffff', push: { dist: 4.4, height: 2.6 },
      },
      {
        id: 'skincare', label: 'Skincare glow-up', verb: 'Glow', pos: [0, -3.3], stand: [0, -3.3], face: Math.PI, pose: 'relax',
        poseAt: [0, 0, -3.75],
        mini: { type: 'hold', title: 'Sheet mask — hold still (for once)', hint: 'Hold the button or Space', duration: 3.2 },
        outro: [{ who: 'narrator', text: 'Vampire-facial energy. Glowing. Still no interest in sitting down afterward.' }],
        refill: 35, hearts: 3, color: '#f4b6c8', push: { dist: 4.2, height: 2.4 },
      },
      {
        id: 'massage', label: 'Massage', verb: 'Relax', pos: [7, -2.8], stand: [7, -2.8], face: Math.PI / 2, pose: 'massage',
        poseAt: [7, 0, -3.9],
        mini: { type: 'hold', title: 'Relax. Actually relax.', hint: 'Keep holding — the button keeps fidgeting, like her', duration: 4, twitchy: true },
        outro: [{ who: 'narrator', text: 'Massage complete. Relaxed for exactly eleven seconds. Then: errands.' }],
        refill: 35, hearts: 4, color: '#8aa89a', push: { dist: 4.6, height: 3.2, yaw: 0.5 },
      },
    ],
    light: KITS.mall,
    camera: CAM_WIDE,
    ambience: 'mall',
    music: 'retail',
    surface: 'stone',
    npcs,
    stealables: [{ label: 'a pretzel', x: -5, z: 2.2, color: '#c98a4a' }],
  });
}
