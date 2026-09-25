import * as THREE from 'three';

/**
 * Paper-doll overlay for the photo cutout. The sticker has no bones, so dance
 * and singing pivot separate parts: torso, head, arms, and a kicking leg.
 * Rotation 0 rebuilds the standing pose. Feet of a planted leg stay down.
 */

export interface PoseArm {
  shoulder: THREE.Group;
  elbow: THREE.Group;
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
  /** Hand that holds the hairbrush, in the raised singing arm. */
  mic: THREE.Group;
  mats: PoseMat[];
  headY: number;
}

const HIP_Y = 304;
const SPLIT_X = 127;

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
    alphaTest: map ? 0.45 : 0,
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

/** Full-figure plane, feet at local y=0, matching the sticker. */
function figureMesh(map: THREE.Texture, worldW: number, worldH: number, mats: PoseMat[], z: number) {
  const geo = new THREE.PlaneGeometry(worldW, worldH);
  geo.translate(0, worldH / 2, z);
  return new THREE.Mesh(geo, cutoutMat(map, '#ffffff', mats));
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
  const cw = Math.max(1, x1 - x0);
  const ch = Math.max(1, y1 - y0);
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
  const cx = hipPx - x0;
  const cy = hipPy - y0;
  mesh.position.set(-(cx / cw - 0.5) * dw, (cy / ch) * dh, 0);
  const pivot = new THREE.Group();
  const hip = worldOf(hipPx, hipPy, imgW, imgH, worldW, worldH);
  pivot.position.set(hip.x, hip.y, 0);
  pivot.add(mesh);
  return pivot;
}

function paperArm(side: 1 | -1, mats: PoseMat[]): PoseArm & { hand: THREE.Group } {
  const skin = cutoutMat(null, '#e4b08a', mats);
  const thumbC = cutoutMat(null, '#f3c9a4', mats);
  const edge = cutoutMat(null, '#fffaf3', mats);
  const tank = cutoutMat(null, '#3a1810', mats);
  const shoulder = new THREE.Group();
  const upperLen = 0.22;
  const foreLen = 0.18;
  const upper = new THREE.Group();
  shoulder.add(upper);
  const uGeo = new THREE.PlaneGeometry(0.078, upperLen);
  uGeo.translate(0, -upperLen / 2, 0.03);
  const uEdge = new THREE.PlaneGeometry(0.1, upperLen + 0.02);
  uEdge.translate(0, -upperLen / 2, 0.026);
  upper.add(new THREE.Mesh(uEdge, edge), new THREE.Mesh(uGeo, skin));
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.07, 14), tank);
  cap.position.set(-side * 0.03, 0.012, 0.028);
  upper.add(cap);
  const elbow = new THREE.Group();
  elbow.position.y = -upperLen;
  const joint = new THREE.Mesh(new THREE.CircleGeometry(0.048, 14), skin);
  joint.position.set(0, 0, 0.034);
  elbow.add(joint);
  upper.add(elbow);
  const fGeo = new THREE.PlaneGeometry(0.07, foreLen);
  fGeo.translate(0, -foreLen / 2, 0.03);
  const fEdge = new THREE.PlaneGeometry(0.092, foreLen + 0.016);
  fEdge.translate(0, -foreLen / 2, 0.026);
  elbow.add(new THREE.Mesh(fEdge, edge), new THREE.Mesh(fGeo, skin));
  const hand = new THREE.Group();
  hand.position.y = -foreLen;
  elbow.add(hand);
  const palm = new THREE.PlaneGeometry(0.078, 0.064);
  palm.translate(0, -0.028, 0.032);
  const pEdge = new THREE.PlaneGeometry(0.098, 0.08);
  pEdge.translate(0, -0.03, 0.028);
  hand.add(new THREE.Mesh(pEdge, edge), new THREE.Mesh(palm, skin));
  const thumb = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.07), thumbC);
  thumb.geometry.translate(0, 0.032, 0.036);
  thumb.position.set(side * 0.04, -0.01, 0);
  thumb.rotation.z = side * -1.15;
  const tEdge = new THREE.Mesh(new THREE.PlaneGeometry(0.054, 0.084), edge);
  tEdge.geometry.translate(0, 0.032, 0.033);
  tEdge.position.copy(thumb.position);
  tEdge.rotation.z = thumb.rotation.z;
  hand.add(tEdge, thumb);
  shoulder.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.renderOrder = 4;
  });
  return { shoulder, elbow, hand };
}

export function buildPoseDoll(image: CanvasImageSource, imgW: number, imgH: number, worldH: number): PoseDoll | null {
  if (imgW < 32 || imgH < 32 || imgH / imgW < 2) return null;
  const worldW = (worldH * imgW) / imgH;
  const mats: PoseMat[] = [];
  const { c, ctx } = canvasOf(image, imgW, imgH);
  const bodyPx = ctx.getImageData(0, 0, imgW, imgH);
  for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
      const i = (y * imgW + x) * 4;
      if (bodyPx.data[i + 3] < 8) continue;
      const leg = y >= HIP_Y + 8;
      const head = y < 150;
      const armL = y > 188 && y < 318 && x < 72;
      const armR = y > 184 && y < 312 && x > 198;
      if (leg || head || armL || armR) bodyPx.data[i + 3] = 0;
    }
  }
  ctx.putImageData(bodyPx, 0, 0);

  const root = new THREE.Group();
  root.visible = false;
  const hip = worldOf(SPLIT_X, HIP_Y, imgW, imgH, worldW, worldH);
  const torso = new THREE.Group();
  torso.position.set(hip.x, hip.y, 0);
  root.add(torso);

  const body = figureMesh(texOf(c), worldW, worldH, mats, 0);
  body.position.set(-hip.x, -hip.y, 0);
  torso.add(body);

  const headBottom = 172;
  const head = limbMesh(image, 40, 0, 250, headBottom, (_x, y) => y < headBottom, imgW, imgH, worldW, worldH, 140, 158, mats, 0.02);
  head.position.sub(torso.position);
  torso.add(head);

  const legL = limbMesh(
    image, 4, HIP_Y - 8, SPLIT_X + 14, imgH,
    (x, y) => y >= HIP_Y - 4 && x < SPLIT_X,
    imgW, imgH, worldW, worldH, 116, HIP_Y, mats, 0.012,
  );
  const legR = limbMesh(
    image, SPLIT_X - 12, HIP_Y - 8, imgW - 8, imgH,
    (x, y) => y >= HIP_Y - 4 && x >= SPLIT_X,
    imgW, imgH, worldW, worldH, 140, HIP_Y, mats, 0.012,
  );
  legL.position.sub(torso.position);
  legR.position.sub(torso.position);
  torso.add(legL, legR);

  const armL = paperArm(-1, mats);
  const armR = paperArm(1, mats);
  const shL = worldOf(62, 198, imgW, imgH, worldW, worldH);
  const shR = worldOf(208, 194, imgW, imgH, worldW, worldH);
  armL.shoulder.position.set(shL.x - hip.x, shL.y - hip.y, 0.05);
  armR.shoulder.position.set(shR.x - hip.x, shR.y - hip.y, 0.05);
  torso.add(armL.shoulder, armR.shoulder);

  const mic = new THREE.Group();
  mic.rotation.z = Math.PI;
  armR.hand.add(mic);

  return { root, torso, head, legL, legR, armL, armR, mic, mats, headY: head.position.y };
}

function jabArm(arm: PoseArm, side: 1 | -1, out: number, twitch: number) {
  arm.shoulder.rotation.z = side * (0.48 + out * 0.9 + twitch);
  arm.elbow.rotation.z = -side * 0.5;
}

/** Drive the doll. Returns torso tilt (radians) and the kicking leg's world lift. */
export function drivePose(doll: PoseDoll, state: 'sing' | 'dance', t: number, kick: number, side: 1 | -1) {
  const dance = state === 'dance';
  const wobble = Math.sin(t * 7.5) * (dance ? 0.07 : 0.05);
  const tilt = dance ? side * 0.2 * kick + wobble : Math.sin(t * 3.1) * 0.1;
  doll.torso.rotation.z = Math.max(-0.32, Math.min(0.32, tilt));
  const tiltZ = doll.torso.rotation.z;
  const lift = 1.58;
  const kickL = dance && side > 0 ? -lift * kick : 0;
  const kickR = dance && side < 0 ? lift * kick : 0;
  // Cancel the torso tilt so a planted leg stays vertical and its foot stays down.
  doll.legL.rotation.z = -tiltZ + kickL;
  doll.legR.rotation.z = -tiltZ + kickR;
  // Stay in the billboard plane so the photo face doesn't pitch away.
  doll.head.rotation.x = 0;
  doll.head.rotation.z = Math.sin(t * (dance ? 11 : 5.2)) * (dance ? 0.16 : 0.08);
  doll.head.position.y = doll.headY + Math.abs(Math.sin(t * (dance ? 11 : 6.4))) * 0.02;
  if (dance) {
    const kickOn = kick > 0.2;
    const out = kickOn ? 1 : Math.sin(t * 18) > 0 ? 1 : 0;
    const twitch = kickOn && Math.sin(t * 26) > 0 ? 0.1 : 0;
    jabArm(doll.armL, -1, out, twitch);
    jabArm(doll.armR, 1, out, -twitch);
  } else {
    // Out from the shoulder first, then up, so the arm stays visible beside her face.
    doll.armR.shoulder.rotation.z = 1.2 + Math.sin(t * 6.2) * 0.05;
    doll.armR.elbow.rotation.z = 1.35;
    doll.armL.shoulder.rotation.z = -0.7 + Math.sin(t * 3.1) * 0.06;
    doll.armL.elbow.rotation.z = 0.35;
  }
  return { tilt: tiltZ, leg: side > 0 ? kickL : kickR };
}
