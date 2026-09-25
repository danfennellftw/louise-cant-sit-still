import * as THREE from 'three';
import { KICK_LOOP, littleKicks, type LittleKickPose } from './dance';

/**
 * Composite Louise for singing and the little kicks.
 * Torso, head, and legs are slices of her cutout. Arms are rounded meshes
 * in her sampled skin and tank colors (capsules, not flat rectangles),
 * with a thumb that stays pointed up and out.
 * The whole figure stays upright: legs pivot at the hip, arms at the shoulder,
 * torso lean stays inside about 16°.
 */

export interface PoseArm {
  shrug: THREE.Group;
  rot: THREE.Group;
  elbow: THREE.Group;
  hand: THREE.Group;
  thumb: THREE.Group;
}

export interface PoseMat {
  mat: THREE.MeshBasicMaterial;
  base: THREE.Color;
}

export interface PoseDoll {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: PoseArm;
  armR: PoseArm;
  mic: THREE.Group;
  mats: PoseMat[];
  headY: number;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
}

const REF_W = 256;
const REF_H = 648;
const HEAD_Y = 168;
const HIP_Y = 452;
const SPLIT_X = 128;
/** Screen-left arm (image left). Stops at the wrist; the fist is a mesh. */
const ARM_L: [number, number][] = [
  [80, 166], [54, 186], [40, 230], [28, 300], [32, 346], [74, 350], [90, 300], [94, 220], [90, 176],
];
const ARM_R: [number, number][] = [
  [156, 166], [196, 174], [236, 214], [228, 300], [196, 350], [164, 346], [150, 280], [146, 188],
];

const SKIN = '#d4894a';
const SKIN_DEEP = '#a15f30';
const NAIL = '#f2c4a6';
const TANK = '#542015';

const UPPER = 0.2;
const FORE = 0.18;

function worldOf(px: number, py: number, imgW: number, imgH: number, worldW: number, worldH: number) {
  return {
    x: ((px + 0.5) / imgW - 0.5) * worldW,
    y: (1 - (py + 0.5) / imgH) * worldH,
  };
}

function cutoutMat(map: THREE.Texture | null, color: string, mats: PoseMat[]) {
  const mat = new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: !!map,
    alphaTest: map ? 0.42 : 0,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  mats.push({ mat, base: new THREE.Color(color) });
  return mat;
}

function canvasOf(image: CanvasImageSource, w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, w, h);
  return { c, ctx };
}

function texOf(canvas: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function inside(x: number, y: number, poly: [number, number][]) {
  let inn = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi) inn = !inn;
  }
  return inn;
}

function scalePoly(poly: [number, number][], imgW: number, imgH: number): [number, number][] {
  return poly.map(([x, y]) => [(x * imgW) / REF_W, (y * imgH) / REF_H]);
}

function figureMesh(map: THREE.Texture, worldW: number, worldH: number, mats: PoseMat[], z: number) {
  const geo = new THREE.PlaneGeometry(worldW, worldH);
  geo.translate(0, worldH / 2, z);
  const mesh = new THREE.Mesh(geo, cutoutMat(map, '#ffffff', mats));
  mesh.renderOrder = 3;
  return mesh;
}

function limbMesh(
  image: CanvasImageSource,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  keep: (x: number, y: number) => boolean,
  imgW: number,
  imgH: number,
  worldW: number,
  worldH: number,
  hipPx: number,
  hipPy: number,
  mats: PoseMat[],
  z: number,
) {
  const cw = Math.max(1, Math.round(x1 - x0));
  const ch = Math.max(1, Math.round(y1 - y0));
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, x0, y0, cw, ch, 0, 0, cw, ch);
  const data = ctx.getImageData(0, 0, cw, ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (!keep(x0 + x, y0 + y)) data.data[(y * cw + x) * 4 + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  const dw = (cw / imgW) * worldW;
  const dh = (ch / imgH) * worldH;
  const geo = new THREE.PlaneGeometry(dw, dh);
  geo.translate(0, -dh / 2, z);
  const mesh = new THREE.Mesh(geo, cutoutMat(texOf(c), '#ffffff', mats));
  mesh.renderOrder = 4;
  const cx = hipPx - x0;
  const cy = hipPy - y0;
  mesh.position.set(-(cx / cw - 0.5) * dw, (cy / ch) * dh, 0);
  const pivot = new THREE.Group();
  const hip = worldOf(hipPx, hipPy, imgW, imgH, worldW, worldH);
  pivot.position.set(hip.x, hip.y, 0);
  pivot.add(mesh);
  return pivot;
}

function litCapsule(r: number, len: number, front: THREE.Material, back: THREE.Material) {
  const g = new THREE.Group();
  const shade = new THREE.Mesh(new THREE.CapsuleGeometry(r * 1.18, len, 4, 8), back);
  shade.position.set(0, 0, -r * 0.35);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), front);
  g.add(shade, body);
  return g;
}

function buildArm(side: 1 | -1, mats: PoseMat[]): PoseArm {
  const skin = cutoutMat(null, SKIN, mats);
  const deep = cutoutMat(null, SKIN_DEEP, mats);
  const nail = cutoutMat(null, NAIL, mats);
  const tank = cutoutMat(null, TANK, mats);
  const arm = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), tank);
  pad.scale.set(1.15, 0.82, 0.7);
  pad.position.set(-side * 0.02, 0.01, 0.01);
  pad.renderOrder = 4;
  arm.add(pad);
  const shrug = new THREE.Group();
  shrug.name = 'shrug';
  arm.add(shrug);
  const rot = new THREE.Group();
  rot.name = 'rot';
  shrug.add(rot);
  const upper = litCapsule(0.032, UPPER - 0.06, skin, deep);
  upper.position.y = -UPPER / 2;
  rot.add(upper);
  const elbow = new THREE.Group();
  elbow.name = 'elbow';
  elbow.position.y = -UPPER;
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), skin);
  joint.scale.set(1, 0.85, 0.8);
  elbow.add(joint);
  rot.add(elbow);
  const fore = litCapsule(0.026, FORE - 0.05, skin, deep);
  fore.position.y = -FORE / 2;
  elbow.add(fore);
  const hand = new THREE.Group();
  hand.name = 'hand';
  hand.position.y = -FORE;
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 10), skin);
  fist.scale.set(1.08, 0.82, 0.72);
  const fistBack = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), deep);
  fistBack.scale.set(1.05, 0.8, 0.7);
  fistBack.position.z = -0.01;
  hand.add(fistBack, fist);
  elbow.add(hand);
  const thumb = new THREE.Group();
  thumb.name = 'thumb';
  const meat = litCapsule(0.014, 0.048, skin, deep);
  meat.position.y = 0.038;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), nail);
  tip.position.y = 0.07;
  thumb.add(meat, tip);
  hand.add(thumb);
  rot.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) mesh.renderOrder = 5;
  });
  return { shrug, rot, elbow, hand, thumb };
}

export function buildPoseDoll(image: CanvasImageSource, imgW: number, imgH: number, worldH: number): PoseDoll | null {
  if (imgW < 32 || imgH < 32 || imgH / imgW < 2) return null;
  const worldW = (worldH * imgW) / imgH;
  const mats: PoseMat[] = [];
  const { c, ctx } = canvasOf(image, imgW, imgH);
  const armLPoly = scalePoly(ARM_L, imgW, imgH);
  const armRPoly = scalePoly(ARM_R, imgW, imgH);
  const headCut = (HEAD_Y * imgH) / REF_H;
  const hipCut = (HIP_Y * imgH) / REF_H;
  const split = (SPLIT_X * imgW) / REF_W;
  const bodyPx = ctx.getImageData(0, 0, imgW, imgH);
  for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
      const i = (y * imgW + x) * 4;
      if (bodyPx.data[i + 3] < 8) continue;
      const head = y < headCut;
      const leg = y >= hipCut;
      const arm = inside(x, y, armLPoly) || inside(x, y, armRPoly);
      if (head || leg || arm) bodyPx.data[i + 3] = 0;
    }
  }
  ctx.putImageData(bodyPx, 0, 0);

  const root = new THREE.Group();
  root.name = 'louisePose';
  root.visible = false;
  const hipPx = split;
  const hipPy = hipCut;
  const hip = worldOf(hipPx, hipPy, imgW, imgH, worldW, worldH);
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(hip.x, hip.y, 0);
  root.add(torso);

  const body = figureMesh(texOf(c), worldW, worldH, mats, 0);
  body.position.set(-hip.x, -hip.y, 0);
  torso.add(body);

  const headBottom = headCut + 16;
  const head = limbMesh(
    image, 30, 0, imgW - 20, headBottom,
    (_x, y) => y < headBottom,
    imgW, imgH, worldW, worldH, imgW * 0.5, headCut - 6, mats, 0.03,
  );
  head.name = 'head';
  head.position.sub(torso.position);
  head.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.renderOrder = 6;
  });
  torso.add(head);

  const legL = limbMesh(
    image, 0, hipCut - 14, split + 8, imgH,
    (x, y) => y >= hipCut - 8 && x < split,
    imgW, imgH, worldW, worldH, split * 0.72, hipCut, mats, 0.02,
  );
  const legR = limbMesh(
    image, split - 8, hipCut - 14, imgW, imgH,
    (x, y) => y >= hipCut - 8 && x >= split,
    imgW, imgH, worldW, worldH, split + (imgW - split) * 0.42, hipCut, mats, 0.02,
  );
  legL.name = 'legL';
  legR.name = 'legR';
  legL.position.sub(torso.position);
  legR.position.sub(torso.position);
  torso.add(legL, legR);

  const armL = buildArm(-1, mats);
  const armR = buildArm(1, mats);
  const shL = worldOf(70, 176, imgW, imgH, worldW, worldH);
  const shR = worldOf(186, 172, imgW, imgH, worldW, worldH);
  const anchorL = armL.shrug.parent as THREE.Group;
  const anchorR = armR.shrug.parent as THREE.Group;
  anchorL.name = 'armL';
  anchorR.name = 'armR';
  anchorL.position.set(shL.x - hip.x, shL.y - hip.y, 0.05);
  anchorR.position.set(shR.x - hip.x, shR.y - hip.y, 0.05);
  torso.add(anchorL, anchorR);

  const mic = new THREE.Group();
  mic.name = 'mic';
  mic.position.set(0.05, 0.02, 0.05);
  mic.rotation.z = -0.4;
  armR.hand.add(mic);

  const doll: PoseDoll = {
    root, torso, head, legL, legR, armL, armR, mic, mats,
    headY: head.position.y,
    mixer: null as unknown as THREE.AnimationMixer,
    action: null as unknown as THREE.AnimationAction,
  };
  const clip = bakeLittleKicks(doll);
  doll.mixer = new THREE.AnimationMixer(torso);
  doll.action = doll.mixer.clipAction(clip);
  doll.action.setLoop(THREE.LoopRepeat, Infinity);
  doll.action.play();
  doll.action.paused = true;
  return doll;
}

const _q = new THREE.Quaternion();
const _up = new THREE.Vector3();
const _y = new THREE.Vector3(0, 1, 0);

/** Point the thumb up and out in world space so the pump reads as thumbs-out. */
function aimThumb(hand: THREE.Group, thumb: THREE.Group, side: 1 | -1) {
  hand.updateWorldMatrix(true, false);
  hand.getWorldQuaternion(_q).invert();
  _up.set(side * 0.48, 1, 0.22).normalize().applyQuaternion(_q);
  thumb.quaternion.setFromUnitVectors(_y, _up.normalize());
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/**
 * Write one frame of the little kicks onto the skeleton.
 * Torso X/Z are capped near 16°. Planted leg cancels that lean so the foot stays down.
 */
export function writeLittleKicks(doll: PoseDoll, pose: LittleKickPose) {
  const heaveX = clamp(pose.heave * 0.3 - 0.02, -0.06, 0.28);
  const leanZ = clamp(pose.bob * 0.12, -0.26, 0.26);
  doll.torso.rotation.set(heaveX, 0, leanZ);
  doll.head.rotation.set(-pose.heave * 0.2, 0, clamp(pose.bob * 0.5, -0.55, 0.55));
  doll.head.position.y = doll.headY + Math.abs(pose.bob) * 0.012;
  const lift = 1.18;
  const fwd = 0.32;
  doll.legL.rotation.set(-heaveX - fwd * pose.kickL, 0, -leanZ - lift * pose.kickL);
  doll.legR.rotation.set(-heaveX - fwd * pose.kickR, 0, -leanZ + lift * pose.kickR);
  const baseZ = 1.08;
  const baseX = -0.58;
  doll.armL.rot.rotation.set(baseX - 0.42 * pose.jabL, 0, -(baseZ + 0.34 * pose.jabL));
  doll.armR.rot.rotation.set(baseX - 0.42 * pose.jabR, 0, baseZ + 0.34 * pose.jabR);
  doll.armL.elbow.rotation.set(-0.2 * (1 - pose.jabL), 0, 0);
  doll.armR.elbow.rotation.set(-0.2 * (1 - pose.jabR), 0, 0);
  doll.armL.shrug.position.y = 0.028 * pose.jabL + 0.016 * pose.heave;
  doll.armR.shrug.position.y = 0.028 * pose.jabR + 0.016 * pose.heave;
  doll.torso.updateWorldMatrix(true, true);
  aimThumb(doll.armL.hand, doll.armL.thumb, -1);
  aimThumb(doll.armR.hand, doll.armR.thumb, 1);
}

function numTrack(name: string, times: number[], values: number[]) {
  const track = new THREE.NumberKeyframeTrack(name, times, values);
  track.setInterpolation(THREE.InterpolateLinear);
  return track;
}

/** Sample the phrase into a clip so the mixer is what actually plays it. */
function bakeLittleKicks(doll: PoseDoll) {
  const steps = Math.round(KICK_LOOP * 60);
  const times: number[] = [];
  const tx: number[] = [];
  const tz: number[] = [];
  const hx: number[] = [];
  const hz: number[] = [];
  const hy: number[] = [];
  const lLx: number[] = [];
  const lLz: number[] = [];
  const lRx: number[] = [];
  const lRz: number[] = [];
  const aLx: number[] = [];
  const aLz: number[] = [];
  const aRx: number[] = [];
  const aRz: number[] = [];
  const eL: number[] = [];
  const eR: number[] = [];
  const sL: number[] = [];
  const sR: number[] = [];
  const qL: number[] = [];
  const qR: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * KICK_LOOP;
    writeLittleKicks(doll, littleKicks(t));
    times.push(t);
    tx.push(doll.torso.rotation.x);
    tz.push(doll.torso.rotation.z);
    hx.push(doll.head.rotation.x);
    hz.push(doll.head.rotation.z);
    hy.push(doll.head.position.y);
    lLx.push(doll.legL.rotation.x);
    lLz.push(doll.legL.rotation.z);
    lRx.push(doll.legR.rotation.x);
    lRz.push(doll.legR.rotation.z);
    aLx.push(doll.armL.rot.rotation.x);
    aLz.push(doll.armL.rot.rotation.z);
    aRx.push(doll.armR.rot.rotation.x);
    aRz.push(doll.armR.rot.rotation.z);
    eL.push(doll.armL.elbow.rotation.x);
    eR.push(doll.armR.elbow.rotation.x);
    sL.push(doll.armL.shrug.position.y);
    sR.push(doll.armR.shrug.position.y);
    qL.push(doll.armL.thumb.quaternion.x, doll.armL.thumb.quaternion.y, doll.armL.thumb.quaternion.z, doll.armL.thumb.quaternion.w);
    qR.push(doll.armR.thumb.quaternion.x, doll.armR.thumb.quaternion.y, doll.armR.thumb.quaternion.z, doll.armR.thumb.quaternion.w);
  }
  const tracks = [
    numTrack('.rotation[x]', times, tx),
    numTrack('.rotation[z]', times, tz),
    numTrack('head.rotation[x]', times, hx),
    numTrack('head.rotation[z]', times, hz),
    numTrack('head.position[y]', times, hy),
    numTrack('legL.rotation[x]', times, lLx),
    numTrack('legL.rotation[z]', times, lLz),
    numTrack('legR.rotation[x]', times, lRx),
    numTrack('legR.rotation[z]', times, lRz),
    numTrack('armL/shrug.position[y]', times, sL),
    numTrack('armL/shrug/rot.rotation[x]', times, aLx),
    numTrack('armL/shrug/rot.rotation[z]', times, aLz),
    numTrack('armL/shrug/rot/elbow.rotation[x]', times, eL),
    numTrack('armR/shrug.position[y]', times, sR),
    numTrack('armR/shrug/rot.rotation[x]', times, aRx),
    numTrack('armR/shrug/rot.rotation[z]', times, aRz),
    numTrack('armR/shrug/rot/elbow.rotation[x]', times, eR),
    new THREE.QuaternionKeyframeTrack('armL/shrug/rot/elbow/hand/thumb.quaternion', times, qL),
    new THREE.QuaternionKeyframeTrack('armR/shrug/rot/elbow/hand/thumb.quaternion', times, qR),
  ];
  return new THREE.AnimationClip('littleKicks', KICK_LOOP, tracks);
}

function orderGroup(g: THREE.Object3D, order: number) {
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.renderOrder = order;
  });
}

/** Singing: brush hand out beside the face, not across it. Feet stay down. */
function applySing(doll: PoseDoll, t: number) {
  const sway = Math.sin(t * 3.1);
  const lean = sway * 0.1;
  doll.torso.rotation.set(0.04, 0, lean);
  doll.head.rotation.set(-0.06 + Math.sin(t * 5.2) * 0.05, 0, sway * 0.08);
  doll.head.position.y = doll.headY + Math.abs(Math.sin(t * 6.4)) * 0.012;
  doll.legL.rotation.set(-0.04, 0, -lean);
  doll.legR.rotation.set(-0.04, 0, -lean);
  // Screen-right arm up and outward, elbow soft, fist clear of the mouth.
  doll.armR.rot.rotation.set(-0.35, 0, 1.25);
  doll.armR.elbow.rotation.set(-0.55, 0, -0.35);
  doll.armR.shrug.position.y = 0.01;
  doll.armL.rot.rotation.set(-0.25 + Math.sin(t * 3.1) * 0.06, 0, -0.35);
  doll.armL.elbow.rotation.set(-0.45, 0, 0.1);
  doll.armL.shrug.position.y = 0;
  doll.armL.thumb.visible = false;
  doll.armR.thumb.visible = false;
}

/** Drive the doll. Dance frames come from the AnimationMixer clip. */
export function drivePose(doll: PoseDoll, state: 'sing' | 'dance', t: number, danceT: number) {
  if (state === 'dance') {
    const pose = littleKicks(danceT);
    doll.armL.thumb.visible = true;
    doll.armR.thumb.visible = true;
    doll.action.paused = false;
    if (!doll.action.isRunning()) doll.action.play();
    doll.mixer.setTime(((danceT % KICK_LOOP) + KICK_LOOP) % KICK_LOOP);
    // Singing bends the elbows on Z; the clip only keys X, so clear the leftover.
    doll.armL.elbow.rotation.y = 0;
    doll.armL.elbow.rotation.z = 0;
    doll.armR.elbow.rotation.y = 0;
    doll.armR.elbow.rotation.z = 0;
    const left = pose.kickL >= pose.kickR;
    orderGroup(doll.legL, left ? 6 : 3);
    orderGroup(doll.legR, left ? 3 : 6);
    const leg = left ? doll.legL.rotation.z : doll.legR.rotation.z;
    return {
      tilt: doll.torso.rotation.z,
      leg,
      kick: Math.max(pose.kickL, pose.kickR),
      phase: pose.phase,
    };
  }
  doll.action.paused = true;
  applySing(doll, t);
  orderGroup(doll.legL, 3);
  orderGroup(doll.legR, 3);
  return { tilt: doll.torso.rotation.z, leg: 0, kick: 0, phase: 'sing' as const };
}
