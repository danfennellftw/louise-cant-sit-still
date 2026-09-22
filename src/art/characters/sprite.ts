import * as THREE from 'three';
import { assetUrl } from '../../engine/assets';
import { clamp, damp, lerp } from '../../engine/util';

const loader = new THREE.TextureLoader();
const texCache = new Map<string, Promise<THREE.Texture>>();

function loadTex(url: string) {
  let p = texCache.get(url);
  if (!p) {
    p = loader.loadAsync(assetUrl(url)).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      t.userData.shared = true;
      return t;
    });
    texCache.set(url, p);
  }
  return p;
}

export function preloadSprites(urls: string[]) {
  return Promise.allSettled(urls.map(loadTex));
}

/**
 * Paper-cutout character: a sticker billboard from the character-sheet art,
 * animated with bob / waddle / squash / paper-flip instead of a skeleton.
 */
export class SpriteRig {
  readonly root = new THREE.Group();
  private pivot = new THREE.Group();
  private flip = new THREE.Group();
  readonly mesh: THREE.Mesh;
  private mat: THREE.MeshBasicMaterial;
  state = 'idle';
  speed = 0;
  antsy = 0;
  private t = Math.random() * 10;
  private phase = 0;
  private side = 1;
  private flipK = 1;
  private sq = 1;
  private lastStep = 0;
  onFootstep?: () => void;
  ready: Promise<boolean>;

  constructor(source: string | HTMLCanvasElement, readonly height: number, aspect = 0.4, readonly dog = false) {
    this.mat = new THREE.MeshBasicMaterial({
      transparent: false,
      alphaTest: 0.5,
      alphaToCoverage: true,
      side: THREE.DoubleSide,
      toneMapped: false,
      color: '#ffffff',
    });
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.scale.set(height * aspect, height, 1);
    this.flip.add(this.mesh);
    this.pivot.add(this.flip);
    this.root.add(this.pivot);
    if (typeof source === 'string') {
      this.ready = loadTex(source)
        .then((t) => {
          this.mat.map = t;
          this.mat.needsUpdate = true;
          const img = t.image as { width: number; height: number };
          this.mesh.scale.set((height * img.width) / img.height, height, 1);
          return true;
        })
        .catch(() => false);
    } else {
      const t = new THREE.CanvasTexture(source);
      t.colorSpace = THREE.SRGBColorSpace;
      this.mat.map = t;
      this.mesh.scale.set((height * source.width) / source.height, height, 1);
      this.ready = Promise.resolve(true);
    }
  }

  set tint(c: THREE.Color) {
    this.mat.color.copy(c);
  }

  setState(s: string) {
    this.state = s;
  }

  /** Big squash for juice (stop complete, bumps). */
  pop(amount = 0.25) {
    this.sq = 1 - amount;
  }

  update(dt: number, camYaw: number, camPitch: number, facingScreenSign: number, facingYaw: number) {
    this.t += dt;
    const t = this.t;
    const s = this.state;
    const moving = s === 'walk' || s === 'run' || s === 'trot';
    if (moving) {
      this.phase += dt * (s === 'run' ? 15 : this.dog ? 17 : 11) * clamp(this.speed, 0.5, 1.4);
      const step = Math.sign(Math.sin(this.phase));
      if (step !== this.lastStep) {
        this.lastStep = step;
        this.onFootstep?.();
        this.sq = Math.min(this.sq, s === 'run' ? 0.9 : 0.94);
      }
    }
    if (facingScreenSign !== 0 && Math.sign(facingScreenSign) !== this.side) this.side = Math.sign(facingScreenSign);
    this.flipK = damp(this.flipK, this.side, 16, dt);
    this.sq = damp(this.sq, 1, 9, dt);

    let y = 0;
    let rz = 0;
    let rx = -camPitch * 0.45;
    let sx = 1;
    let sy = 1;
    let z = 0;
    const h = this.height;
    switch (s) {
      case 'walk':
      case 'trot':
      case 'run': {
        const b = Math.abs(Math.sin(this.phase));
        y = b * h * (s === 'run' ? 0.06 : 0.04);
        rz = Math.sin(this.phase) * (s === 'run' ? 0.09 : 0.06);
        break;
      }
      case 'idle': {
        const a = this.antsy;
        y = Math.abs(Math.sin(t * (4 + a * 6))) * h * (0.006 + a * 0.03);
        sy = 1 + Math.sin(t * 2.2) * 0.012;
        rz = Math.sin(t * 1.3) * (0.015 + a * 0.05);
        break;
      }
      case 'work':
      case 'shop':
        rz = Math.sin(t * 9) * 0.07;
        y = Math.abs(Math.sin(t * 9)) * h * 0.02;
        break;
      case 'lift':
        sy = 0.86 + (1 + Math.cos(t * 3.2)) * 0.08;
        sx = 1 + (1 - Math.cos(t * 3.2)) * 0.03;
        break;
      case 'spin':
      case 'ride':
        y = h * 0.12 + Math.abs(Math.sin(t * (s === 'spin' ? 11 : 7))) * h * 0.025;
        rz = Math.sin(t * (s === 'spin' ? 11 : 7)) * 0.04;
        sy = 0.9;
        break;
      case 'lie':
      case 'massage':
        rx = -Math.PI / 2 + 0.12;
        y = s === 'lie' ? 0.68 : 0.86;
        z = 0.8;
        sy = 1 + Math.sin(t * 1.2) * 0.01;
        break;
      case 'sit':
        sy = 0.62;
        sx = 1.15;
        rz = 0.12;
        break;
      case 'relax':
      case 'couch':
        sy = 0.84;
        y = s === 'couch' ? 0.12 : 0.02;
        rz = Math.sin(t * 0.8) * 0.02;
        break;
      case 'phone':
        rz = Math.sin(t * 2) * 0.05;
        y = Math.abs(Math.sin(t * 4)) * h * 0.01;
        break;
      case 'wave':
      case 'cheer':
      case 'beg':
        y = Math.max(0, Math.sin(t * 8)) * h * (s === 'cheer' ? 0.12 : 0.05);
        rz = Math.sin(t * 8) * 0.08;
        break;
      case 'bark':
        y = Math.max(0, Math.sin(t * 20)) * h * 0.06;
        sy = 1 + Math.max(0, Math.sin(t * 20)) * 0.08;
        break;
      case 'stumble':
        rz = Math.sin(t * 18) * 0.3;
        break;
      case 'stretch':
        sy = 1.06 + Math.sin(t * 2.4) * 0.06;
        sx = 1 - Math.sin(t * 2.4) * 0.04;
        rz = Math.sin(t * 1.2) * 0.12;
        break;
      case 'sniff':
        rz = 0.18 + Math.sin(t * 10) * 0.03;
        break;
    }
    const lying = s === 'lie' || s === 'massage';
    if (lying) {
      // lie along the bed/table: feet toward `facingYaw`, head away from it
      this.pivot.position.set(Math.sin(facingYaw) * z, y, Math.cos(facingYaw) * z);
      this.pivot.rotation.set(0, facingYaw, 0);
    } else {
      this.pivot.position.set(0, y, 0);
      this.pivot.rotation.set(0, camYaw, 0);
    }
    this.flip.rotation.set(rx, 0, rz);
    const squash = this.sq;
    this.flip.scale.set((lying ? 1 : this.flipK) * sx * lerp(1.12, 1, squash), sy * squash, 1);
  }
}

/** Paper-doll NPC sticker drawn on canvas so background people match the cutout heroes. */
export function npcSticker(seed: number, top: string, bottom: string, skin: string, hair: string, style: number) {
  const W = 160;
  const H = 400;
  const fig = document.createElement('canvas');
  fig.width = W;
  fig.height = H;
  const c = fig.getContext('2d')!;
  const cx = W / 2;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const shade = (col: string, a: number) => {
    const k = new THREE.Color(col);
    k.offsetHSL(0, 0, a);
    return `#${k.getHexString()}`;
  };
  // legs
  c.fillStyle = bottom;
  c.beginPath();
  c.roundRect(cx - 30, 215, 26, 150, 12);
  c.roundRect(cx + 4, 215, 26, 150, 12);
  c.fill();
  c.fillStyle = seed % 2 ? '#f4f1ea' : '#2a2a2e';
  c.beginPath();
  c.roundRect(cx - 34, 358, 32, 20, 9);
  c.roundRect(cx + 2, 358, 32, 20, 9);
  c.fill();
  // torso + arms
  c.fillStyle = skin;
  c.beginPath();
  c.roundRect(cx - 52, 140, 18, 100, 9);
  c.roundRect(cx + 34, 140, 18, 100, 9);
  c.fill();
  c.fillStyle = top;
  c.beginPath();
  c.roundRect(cx - 40, 128, 80, 104, 22);
  c.fill();
  c.beginPath();
  c.roundRect(cx - 54, 132, 22, 44, 10);
  c.roundRect(cx + 32, 132, 22, 44, 10);
  c.fill();
  c.fillStyle = shade(top, -0.08);
  c.fillRect(cx - 40, 205, 80, 10);
  // head
  c.fillStyle = skin;
  c.fillRect(cx - 10, 108, 20, 26);
  c.beginPath();
  c.ellipse(cx, 80, 40, 44, 0, 0, Math.PI * 2);
  c.fill();
  // hair
  c.fillStyle = hair;
  c.beginPath();
  c.ellipse(cx, 62, 44, 32, 0, Math.PI, 0);
  c.fill();
  if (style === 1) {
    c.beginPath();
    c.arc(cx, 30, 18, 0, Math.PI * 2);
    c.fill();
  } else if (style === 2) {
    c.beginPath();
    c.roundRect(cx + 26, 50, 22, 90, 11);
    c.fill();
  } else if (style === 3) {
    c.beginPath();
    c.roundRect(cx - 46, 55, 18, 70, 9);
    c.roundRect(cx + 28, 55, 18, 70, 9);
    c.fill();
  }
  // face
  c.fillStyle = '#2a1d16';
  c.beginPath();
  c.ellipse(cx - 14, 84, 4.5, 6, 0, 0, Math.PI * 2);
  c.ellipse(cx + 14, 84, 4.5, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#8a4a3e';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(cx, 96, 9, 0.2, Math.PI - 0.2);
  c.stroke();
  c.fillStyle = 'rgba(255,120,120,0.25)';
  c.beginPath();
  c.arc(cx - 24, 98, 7, 0, Math.PI * 2);
  c.arc(cx + 24, 98, 7, 0, Math.PI * 2);
  c.fill();

  // sticker border: stamp the silhouette in cream around itself
  const out = document.createElement('canvas');
  out.width = W + 20;
  out.height = H + 20;
  const o = out.getContext('2d')!;
  const tint = document.createElement('canvas');
  tint.width = W;
  tint.height = H;
  const tc = tint.getContext('2d')!;
  tc.drawImage(fig, 0, 0);
  tc.globalCompositeOperation = 'source-in';
  tc.fillStyle = '#fffcf6';
  tc.fillRect(0, 0, W, H);
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    o.drawImage(tint, 10 + Math.cos(ang) * 8, 10 + Math.sin(ang) * 8);
  }
  o.drawImage(fig, 10, 10);
  return out;
}
