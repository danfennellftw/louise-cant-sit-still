import * as THREE from 'three';
import { rng } from '../engine/util';

const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

function finish(c: HTMLCanvasElement, repeat: [number, number] = [1, 1], color = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.userData.shared = true;
  return t;
}

function once(key: string, make: () => THREE.Texture) {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
}

function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return `#${c.getHexString()}`;
}

export const TX = {
  /** Oak plank floor with per-board tone variation and grain. */
  wood(base = '#b98357', key = 'oak') {
    return once(`wood-${key}-${base}`, () => {
      const { c, ctx } = canvas(512, 512);
      const r = rng(7);
      const rows = 8;
      const rh = 512 / rows;
      for (let i = 0; i < rows; i++) {
        let x = -r() * 200;
        while (x < 512) {
          const len = 160 + r() * 200;
          ctx.fillStyle = shade(base, (r() - 0.5) * 0.09);
          ctx.fillRect(x, i * rh, len, rh);
          ctx.globalAlpha = 0.12;
          for (let g = 0; g < 7; g++) {
            ctx.strokeStyle = shade(base, -0.12 - r() * 0.08);
            ctx.lineWidth = 0.6 + r() * 1.2;
            ctx.beginPath();
            const gy = i * rh + 4 + r() * (rh - 8);
            ctx.moveTo(x, gy);
            ctx.bezierCurveTo(x + len * 0.3, gy + (r() - 0.5) * 6, x + len * 0.6, gy + (r() - 0.5) * 6, x + len, gy);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(40,20,10,0.45)';
          ctx.fillRect(x, i * rh, 1.5, rh);
          x += len;
        }
        ctx.fillStyle = 'rgba(40,20,10,0.5)';
        ctx.fillRect(0, i * rh, 512, 1.5);
      }
      return finish(c);
    });
  },

  tiles(base = '#f3efe8', grout = '#cfc6b8', n = 8, jitter = 0.03, key = '') {
    return once(`tile-${base}-${grout}-${n}-${key}`, () => {
      const { c, ctx } = canvas(512, 512);
      const r = rng(11);
      ctx.fillStyle = grout;
      ctx.fillRect(0, 0, 512, 512);
      const s = 512 / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          ctx.fillStyle = shade(base, (r() - 0.5) * jitter * 2);
          ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
          const grd = ctx.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
          grd.addColorStop(0, 'rgba(255,255,255,0.10)');
          grd.addColorStop(1, 'rgba(0,0,0,0.05)');
          ctx.fillStyle = grd;
          ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
        }
      return finish(c);
    });
  },

  /** Subway tile backsplash. */
  subway(base = '#f7f3ec', grout = '#d9d0c2') {
    return once(`subway-${base}`, () => {
      const { c, ctx } = canvas(256, 256);
      ctx.fillStyle = grout;
      ctx.fillRect(0, 0, 256, 256);
      const r = rng(3);
      const h = 32;
      const w = 64;
      for (let row = 0; row < 8; row++) {
        const off = row % 2 ? w / 2 : 0;
        for (let x = -w; x < 256 + w; x += w) {
          ctx.fillStyle = shade(base, (r() - 0.5) * 0.03);
          ctx.fillRect(x + off + 1.5, row * h + 1.5, w - 3, h - 3);
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(x + off + 3, row * h + 3, w - 6, 3);
        }
      }
      return finish(c);
    });
  },

  speckle(base: string, dots: string[], density = 2500, size = 1.6, key = '') {
    return once(`speck-${base}-${dots.join()}-${key}`, () => {
      const { c, ctx } = canvas(512, 512);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      const r = rng(19);
      for (let i = 0; i < density; i++) {
        ctx.fillStyle = dots[Math.floor(r() * dots.length)];
        ctx.globalAlpha = 0.35 + r() * 0.5;
        const s = size * (0.5 + r());
        ctx.fillRect(r() * 512, r() * 512, s, s);
      }
      ctx.globalAlpha = 1;
      return finish(c);
    });
  },

  concrete(base = '#9c978f') {
    return once(`concrete-${base}`, () => {
      const { c, ctx } = canvas(512, 512);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      const r = rng(23);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)';
        ctx.beginPath();
        ctx.arc(r() * 512, r() * 512, 20 + r() * 70, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
        ctx.fillRect(r() * 512, r() * 512, 1.2, 1.2);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 512, 512);
      return finish(c);
    });
  },

  /** Shaggy diamond-lattice rug (the grey Moroccan rug from the living-room photo). */
  rug(base = '#d9d4cc', line = '#8e8a86') {
    return once(`rug-${base}-${line}`, () => {
      const { c, ctx } = canvas(512, 512);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      const r = rng(5);
      ctx.strokeStyle = line;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      const s = 128;
      for (let i = -1; i < 5; i++)
        for (let j = -1; j < 5; j++) {
          const cx = i * s + (j % 2 ? s / 2 : 0);
          const cy = j * s * 0.75;
          ctx.beginPath();
          ctx.moveTo(cx, cy - s * 0.42);
          ctx.lineTo(cx + s * 0.42, cy);
          ctx.lineTo(cx, cy + s * 0.42);
          ctx.lineTo(cx - s * 0.42, cy);
          ctx.closePath();
          ctx.stroke();
        }
      for (let i = 0; i < 16000; i++) {
        ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
        const x = r() * 512;
        const y = r() * 512;
        ctx.fillRect(x, y, 1, 2 + r() * 3);
      }
      return finish(c);
    });
  },

  grass(base = '#6f9a4a') {
    return once(`grass-${base}`, () => {
      const { c, ctx } = canvas(512, 512);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      const r = rng(29);
      for (let i = 0; i < 9000; i++) {
        ctx.strokeStyle = shade(base, (r() - 0.45) * 0.22);
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1;
        const x = r() * 512;
        const y = r() * 512;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return finish(c);
    });
  },

  dirt(base = '#c9a57a') {
    return once(`dirt-${base}`, () => {
      const { c, ctx } = canvas(512, 512);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      const r = rng(31);
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = shade(base, (r() - 0.5) * 0.3);
        ctx.globalAlpha = 0.5;
        const s = 1 + r() * 3;
        ctx.beginPath();
        ctx.arc(r() * 512, r() * 512, s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return finish(c);
    });
  },

  pavers(base = '#d8c3a5', grout = '#b39d80') {
    return once(`pavers-${base}`, () => {
      const { c, ctx } = canvas(512, 512);
      ctx.fillStyle = grout;
      ctx.fillRect(0, 0, 512, 512);
      const r = rng(37);
      const s = 64;
      for (let row = 0; row < 8; row++)
        for (let col = -1; col < 9; col++) {
          const off = row % 2 ? s / 2 : 0;
          const w = s * (r() > 0.7 ? 1.5 : 1);
          ctx.fillStyle = shade(base, (r() - 0.5) * 0.1);
          ctx.fillRect(col * s + off + 2, row * s + 2, w - 4, s - 4);
        }
      return finish(c);
    });
  },

  slats(base = '#c98a55', n = 10, key = 'cedar') {
    return once(`slats-${key}-${base}`, () => {
      const { c, ctx } = canvas(256, 256);
      const r = rng(41);
      const h = 256 / n;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = shade(base, (r() - 0.5) * 0.12);
        ctx.fillRect(0, i * h, 256, h);
        ctx.fillStyle = 'rgba(60,25,10,0.4)';
        ctx.fillRect(0, i * h, 256, 1.5);
        ctx.globalAlpha = 0.1;
        for (let g = 0; g < 4; g++) {
          ctx.fillStyle = shade(base, -0.2);
          ctx.fillRect(0, i * h + r() * h, 256, 1);
        }
        ctx.globalAlpha = 1;
      }
      return finish(c);
    });
  },

  radial(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', key = 'soft') {
    return once(`radial-${key}`, () => {
      const { c, ctx } = canvas(128, 128);
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, inner);
      g.addColorStop(1, outer);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      const t = finish(c);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    });
  },

  /** Vertical fade used for light shafts and glow beams. */
  shaft() {
    return once('shaft', () => {
      const { c, ctx } = canvas(64, 256);
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.25)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 256);
      const h = ctx.createLinearGradient(0, 0, 64, 0);
      h.addColorStop(0, 'rgba(0,0,0,1)');
      h.addColorStop(0.25, 'rgba(0,0,0,0)');
      h.addColorStop(0.75, 'rgba(0,0,0,0)');
      h.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = h;
      ctx.fillRect(0, 0, 64, 256);
      const t = finish(c);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    });
  },

  /** Floor contact-AO strip: dark at one edge fading out. */
  aoStrip() {
    return once('ao', () => {
      const { c, ctx } = canvas(4, 64);
      const g = ctx.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, 'rgba(0,0,0,0.55)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, 64);
      const t = finish(c, [1, 1], false);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    });
  },

  /** Stylized painted sign (no logos — just the location name in a friendly type). */
  sign(
    text: string,
    opts: {
      w?: number;
      h?: number;
      bg?: string;
      fg?: string;
      font?: string;
      weight?: number;
      glow?: string;
      border?: string;
      italic?: boolean;
      sub?: string;
      spacing?: number;
    } = {}
  ) {
    const key = `sign-${text}-${JSON.stringify(opts)}`;
    return once(key, () => {
      const w = opts.w ?? 512;
      const h = opts.h ?? 128;
      const { c, ctx } = canvas(w, h);
      if (opts.bg) {
        ctx.fillStyle = opts.bg;
        const rr = h * 0.18;
        ctx.beginPath();
        ctx.roundRect(4, 4, w - 8, h - 8, rr);
        ctx.fill();
        if (opts.border) {
          ctx.strokeStyle = opts.border;
          ctx.lineWidth = 6;
          ctx.stroke();
        }
      }
      const font = opts.font ?? 'Fredoka, system-ui, sans-serif';
      const size = opts.sub ? h * 0.46 : h * 0.6;
      ctx.font = `${opts.italic ? 'italic ' : ''}${opts.weight ?? 700} ${size}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx && opts.spacing) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${opts.spacing}px`;
      if (opts.glow) {
        ctx.shadowColor = opts.glow;
        ctx.shadowBlur = h * 0.18;
      }
      ctx.fillStyle = opts.fg ?? '#fff';
      const ty = opts.sub ? h * 0.4 : h * 0.52;
      ctx.fillText(text, w / 2, ty, w * 0.9);
      if (opts.sub) {
        ctx.font = `600 ${h * 0.2}px ${font}`;
        ctx.globalAlpha = 0.85;
        ctx.fillText(opts.sub, w / 2, h * 0.78, w * 0.9);
      }
      const t = finish(c);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    });
  },

  /** Lush out-of-focus garden seen through the condo's floor-to-ceiling glass. */
  gardenBackdrop(night = false) {
    return once(`garden-${night}`, () => {
      const { c, ctx } = canvas(1024, 384);
      const r = rng(43);
      const sky = ctx.createLinearGradient(0, 0, 0, 384);
      if (night) {
        sky.addColorStop(0, '#0e1630');
        sky.addColorStop(1, '#253257');
      } else {
        sky.addColorStop(0, '#dcebf2');
        sky.addColorStop(1, '#f4f1e2');
      }
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 1024, 384);
      const layers = night
        ? ['#1b2a3a', '#1f3242', '#223a3d']
        : ['#86a877', '#5f8a57', '#3f6b42'];
      layers.forEach((col, li) => {
        ctx.fillStyle = col;
        for (let i = 0; i < 40; i++) {
          const x = r() * 1024;
          const y = 90 + li * 40 + r() * 60;
          const rad = 40 + r() * 70;
          ctx.beginPath();
          ctx.ellipse(x, y, rad * 0.7, rad, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillRect(0, 170 + li * 40, 1024, 400);
      });
      ctx.fillStyle = night ? '#2a3a2c' : '#c9c18f';
      for (let i = 0; i < 260; i++) {
        const x = r() * 1024;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x, 270 + r() * 30, 2, -20 - r() * 40);
      }
      ctx.globalAlpha = 1;
      if (night) {
        for (let i = 0; i < 18; i++) {
          ctx.fillStyle = 'rgba(255,220,140,0.7)';
          ctx.beginPath();
          ctx.arc(r() * 1024, 200 + r() * 120, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const t = finish(c);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    });
  },

  oceanBackdrop(sunset = false) {
    return once(`ocean-${sunset}`, () => {
      const { c, ctx } = canvas(1024, 384);
      const sky = ctx.createLinearGradient(0, 0, 0, 230);
      if (sunset) {
        sky.addColorStop(0, '#f6b77a');
        sky.addColorStop(1, '#ffe1a8');
      } else {
        sky.addColorStop(0, '#9fd3f2');
        sky.addColorStop(1, '#e8f6fb');
      }
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 1024, 230);
      const sea = ctx.createLinearGradient(0, 230, 0, 384);
      sea.addColorStop(0, sunset ? '#5d8fb0' : '#3f9fc9');
      sea.addColorStop(1, sunset ? '#2e5f84' : '#1f6f9a');
      ctx.fillStyle = sea;
      ctx.fillRect(0, 230, 1024, 154);
      const r = rng(47);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 120; i++) ctx.fillRect(r() * 1024, 236 + r() * 140, 8 + r() * 20, 1.5);
      ctx.fillStyle = sunset ? 'rgba(255,240,200,0.9)' : 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(760, sunset ? 210 : 70, sunset ? 38 : 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e9dcc0';
      ctx.fillRect(0, 360, 1024, 24);
      const t = finish(c);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    });
  },

  /** Product-box atlas for retail shelving — colorful, no real brands. */
  products(seed = 1, palette = ['#ff8a65', '#ffd54f', '#81c784', '#64b5f6', '#ba68c8', '#f06292', '#fff3e0']) {
    return once(`products-${seed}-${palette.join()}`, () => {
      const { c, ctx } = canvas(256, 256);
      const r = rng(seed);
      ctx.fillStyle = '#e8e2d6';
      ctx.fillRect(0, 0, 256, 256);
      const rows = 4;
      const rh = 256 / rows;
      for (let row = 0; row < rows; row++) {
        let x = 0;
        while (x < 256) {
          const w = 10 + r() * 22;
          const h = rh * (0.55 + r() * 0.4);
          const col = palette[Math.floor(r() * palette.length)];
          ctx.fillStyle = col;
          ctx.fillRect(x + 1, row * rh + rh - h, w - 2, h - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.fillRect(x + 3, row * rh + rh - h * 0.6, w - 6, h * 0.18);
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(x + w - 3, row * rh + rh - h, 2, h - 2);
          x += w;
        }
      }
      return finish(c);
    });
  },

  garments(seed = 2, palette = ['#e57373', '#f8bbd0', '#90caf9', '#fff59d', '#a5d6a7', '#d7ccc8', '#37474f', '#ffffff']) {
    return once(`garments-${seed}-${palette.join()}`, () => {
      const { c, ctx } = canvas(256, 128);
      const r = rng(seed);
      let x = 0;
      while (x < 256) {
        const w = 6 + r() * 10;
        ctx.fillStyle = palette[Math.floor(r() * palette.length)];
        ctx.fillRect(x, 0, w, 128 - r() * 30);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(x + w - 1.5, 0, 1.5, 128);
        x += w;
      }
      const t = finish(c);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    });
  },

  mosaic() {
    return once('mosaic', () => {
      const { c, ctx } = canvas(256, 256);
      const r = rng(53);
      const cols = ['#e0b44a', '#3b8f7a', '#c9553b', '#f0e2c0', '#2f5e8f', '#8fae5a'];
      ctx.fillStyle = '#e9dcc0';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 700; i++) {
        ctx.fillStyle = cols[Math.floor(r() * cols.length)];
        ctx.fillRect(Math.floor(r() * 32) * 8 + 1, Math.floor(r() * 32) * 8 + 1, 6, 6);
      }
      return finish(c);
    });
  },
};

/** Live canvas texture for screens (TV, phones, kiosk menus). */
export class ScreenTexture {
  readonly texture: THREE.CanvasTexture;
  readonly ctx: CanvasRenderingContext2D;
  readonly w: number;
  readonly h: number;
  constructor(w = 256, h = 144) {
    const { c, ctx } = canvas(w, h);
    this.w = w;
    this.h = h;
    this.ctx = ctx;
    this.texture = new THREE.CanvasTexture(c);
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }
  flush() {
    this.texture.needsUpdate = true;
  }
}
