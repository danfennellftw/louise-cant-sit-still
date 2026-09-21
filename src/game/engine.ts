import { GameState } from './state';
import { Fx } from './fx';

export const W = 480;
export const H = 800;

export interface Scene {
  enter(): void;
  update(dt: number): void;
  draw(g: CanvasRenderingContext2D): void;
  down?(x: number, y: number): void;
  move?(x: number, y: number): void;
  up?(x: number, y: number): void;
}

interface Toast {
  text: string;
  t: number;
  max: number;
}

const RESTLESS_LINES = [
  'Louise has left her seat. Nobody is surprised.',
  'Quick lap around the room. For no reason.',
  'She is reorganizing a drawer that was already organized.',
  'Sitting is a suggestion, apparently.',
  'She just "remembered something" in the other room.',
  'The chair misses her. The chair always misses her.',
];

export class Engine {
  readonly canvas: HTMLCanvasElement;
  readonly g: CanvasRenderingContext2D;
  readonly state = new GameState();
  readonly fx = new Fx();

  time = 0;
  shake = 0;
  /** chill drained per second while HUD is shown; scenes tune this */
  chillDrain = 0;
  showChill = false;

  px = 0;
  py = 0;
  pointerHeld = false;

  private scenes = new Map<string, Scene>();
  private scene: Scene | null = null;
  sceneName = '';
  private pendingScene = '';
  private fade = 1;
  private fadeDir: -1 | 0 | 1 = -1;
  private toasts: Toast[] = [];
  private last = 0;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    this.g = ctx;

    const resize = () => this.resize();
    window.addEventListener('resize', resize);
    this.resize();

    const pos = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
    };
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = pos(e);
      this.px = x;
      this.py = y;
      this.pointerHeld = true;
      if (this.fade < 0.35) {
        // HUD map button (top-right) opens the day timeline
        if (this.showChill && x > W - 78 && x < W - 10 && y > 8 && y < 48) {
          this.state.resumeScene = this.sceneName;
          this.go('daymap');
          return;
        }
        this.scene?.down?.(x, y);
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const [x, y] = pos(e);
      this.px = x;
      this.py = y;
      if (this.scene?.move) this.scene.move(x, y);
    });
    const release = (e: PointerEvent) => {
      const [x, y] = pos(e);
      this.pointerHeld = false;
      if (this.scene?.up) this.scene.up(x, y);
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    requestAnimationFrame((t) => this.frame(t));
  }

  add(name: string, scene: Scene): void {
    this.scenes.set(name, scene);
  }

  /** fade out, switch, fade in */
  go(name: string): void {
    if (this.pendingScene) return;
    this.pendingScene = name;
    this.fadeDir = 1;
  }

  goNow(name: string): void {
    const s = this.scenes.get(name);
    if (!s) throw new Error(`unknown scene ${name}`);
    this.scene = s;
    this.sceneName = name;
    this.fx.clear();
    s.enter();
  }

  toast(text: string, seconds = 2.8): void {
    this.toasts.push({ text, t: 0, max: seconds });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  bumpChill(n: number): void {
    this.state.chill = Math.max(0, Math.min(100, this.state.chill + n));
  }

  private resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / W, vh / H);
    const cw = Math.round(W * scale);
    const ch = Math.round(H * scale);
    this.canvas.style.width = `${cw}px`;
    this.canvas.style.height = `${ch}px`;
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
  }

  private frame(t: number): void {
    const dt = Math.min(0.05, (t - this.last) / 1000 || 0.016);
    this.last = t;
    this.time += dt;

    // transition
    if (this.fadeDir === 1) {
      this.fade = Math.min(1, this.fade + dt * 3.2);
      if (this.fade >= 1 && this.pendingScene) {
        this.goNow(this.pendingScene);
        this.pendingScene = '';
        this.fadeDir = -1;
      }
    } else if (this.fadeDir === -1) {
      this.fade = Math.max(0, this.fade - dt * 2.2);
      if (this.fade <= 0) this.fadeDir = 0;
    }

    if (this.scene && this.fade < 0.95) this.scene.update(dt);
    this.fx.update(dt);
    this.shake = Math.max(0, this.shake - dt * 16);

    // restless meter: global comedy device, never a fail state
    if (this.showChill) {
      this.state.chill -= this.chillDrain * dt;
      if (this.state.chill <= 0) {
        this.state.chill = 34;
        this.state.stats.zoomies++;
        this.shake = 9;
        this.toast(RESTLESS_LINES[Math.floor(Math.random() * RESTLESS_LINES.length)]);
      }
    }

    const g = this.g;
    g.save();
    g.scale(this.dpr, this.dpr);
    g.clearRect(0, 0, W, H);
    g.save();
    if (this.shake > 0.2) {
      g.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    if (this.scene) this.scene.draw(g);
    this.fx.draw(g);
    g.restore();

    if (this.showChill) this.drawChillHud(g);
    this.drawToasts(g, dt);

    if (this.fade > 0) {
      g.globalAlpha = this.fade;
      g.fillStyle = '#241017';
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    g.restore();

    requestAnimationFrame((tt) => this.frame(tt));
  }

  private drawChillHud(g: CanvasRenderingContext2D): void {
    const frac = this.state.chill / 100;
    const x = 14;
    const y = 12;
    const w = 190;
    const h = 30;
    const jit = frac < 0.25 ? Math.sin(this.time * 30) * 2 : 0;
    g.save();
    g.translate(jit, 0);
    g.fillStyle = 'rgba(36,16,23,0.78)';
    rr(g, x, y, w, h, 15);
    g.fill();
    const bx = x + 10;
    const by = y + 17;
    const bw = w - 20;
    g.fillStyle = 'rgba(255,255,255,0.22)';
    rr(g, bx, by, bw, 8, 4);
    g.fill();
    const grad = g.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, '#ff5f6d');
    grad.addColorStop(1, '#ffc371');
    g.fillStyle = grad;
    rr(g, bx, by, Math.max(6, bw * frac), 8, 4);
    g.fill();
    g.fillStyle = '#ffe9d6';
    g.font = '600 11px Fredoka, system-ui, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillText('SIT-STILL METER', bx, y + 12);
    g.restore();

    // map button, top-right
    g.fillStyle = 'rgba(36,16,23,0.78)';
    rr(g, W - 78, 12, 64, 30, 15);
    g.fill();
    g.fillStyle = '#ffe9d6';
    g.font = '700 13px Fredoka, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('MAP', W - 46, 28);
  }

  private drawToasts(g: CanvasRenderingContext2D, dt: number): void {
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < t.max);
    g.font = '600 15px Fredoka, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let y = H - 84;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      const inA = Math.min(1, t.t / 0.18);
      const outA = Math.min(1, (t.max - t.t) / 0.3);
      const a = Math.min(inA, outA);
      const tw = Math.min(W - 40, g.measureText(t.text).width + 34);
      g.globalAlpha = a * 0.92;
      g.fillStyle = '#241017';
      rr(g, W / 2 - tw / 2, y - 19, tw, 38, 19);
      g.fill();
      g.globalAlpha = a;
      g.fillStyle = '#ffe9d6';
      g.fillText(t.text, W / 2, y + 1, W - 74);
      y -= 46;
    }
    g.globalAlpha = 1;
  }
}

/** shared rounded-rect path helper */
export function rr(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}
