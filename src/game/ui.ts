import { rr } from './engine';

export function font(size: number, weight = 700): string {
  return `${weight} ${size}px Fredoka, system-ui, sans-serif`;
}

export interface ButtonCfg {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  color?: string;
  textColor?: string;
  pulse?: boolean;
  onTap: () => void;
}

export class Button {
  cfg: ButtonCfg;
  visible = true;
  enabled = true;
  private pressT = 0;

  constructor(cfg: ButtonCfg) {
    this.cfg = cfg;
  }

  draw(g: CanvasRenderingContext2D, time: number): void {
    if (!this.visible) return;
    const c = this.cfg;
    const bob = c.pulse && this.enabled ? Math.sin(time * 4) * 2 : 0;
    const press = this.pressT > 0 ? 3 : 0;
    this.pressT = Math.max(0, this.pressT - 0.05);
    g.save();
    g.translate(0, bob + press);
    g.globalAlpha = this.enabled ? 1 : 0.45;
    g.fillStyle = 'rgba(36,16,23,0.35)';
    rr(g, c.x, c.y + 5, c.w, c.h, 16);
    g.fill();
    const grad = g.createLinearGradient(0, c.y, 0, c.y + c.h);
    const base = c.color ?? '#ff5f6d';
    grad.addColorStop(0, base);
    grad.addColorStop(1, shade(base, -22));
    g.fillStyle = grad;
    rr(g, c.x, c.y, c.w, c.h, 16);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 2;
    rr(g, c.x + 2, c.y + 2, c.w - 4, c.h - 4, 13);
    g.stroke();
    g.fillStyle = c.textColor ?? '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (c.sub) {
      g.font = font(19);
      g.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2 - 9, c.w - 20);
      g.font = font(12, 500);
      g.globalAlpha *= 0.85;
      g.fillText(c.sub, c.x + c.w / 2, c.y + c.h / 2 + 12, c.w - 20);
    } else {
      g.font = font(Math.min(21, c.h * 0.42));
      g.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2 + 1, c.w - 20);
    }
    g.restore();
  }

  hit(x: number, y: number): boolean {
    if (!this.visible || !this.enabled) return false;
    const c = this.cfg;
    const ok = x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
    if (ok) {
      this.pressT = 1;
      c.onTap();
    }
    return ok;
  }
}

export function tapButtons(btns: Button[], x: number, y: number): boolean {
  for (const b of btns) if (b.hit(x, y)) return true;
  return false;
}

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const gr = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `rgb(${r},${gr},${b})`;
}

export function drawPanel(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color = 'rgba(255,250,242,0.96)',
): void {
  g.fillStyle = 'rgba(36,16,23,0.3)';
  rr(g, x, y + 6, w, h, 22);
  g.fill();
  g.fillStyle = color;
  rr(g, x, y, w, h, 22);
  g.fill();
}

export function drawMeter(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frac: number,
  color: string,
  label?: string,
): void {
  g.fillStyle = 'rgba(36,16,23,0.25)';
  rr(g, x, y, w, h, h / 2);
  g.fill();
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0.01) {
    g.fillStyle = color;
    rr(g, x + 2, y + 2, Math.max(h - 4, (w - 4) * f), h - 4, (h - 4) / 2);
    g.fill();
  }
  if (label) {
    g.fillStyle = '#fff';
    g.font = font(Math.round(h * 0.55), 600);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, x + w / 2, y + h / 2 + 1);
  }
}

export function wrapText(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
): number {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) g.fillText(line, x, yy);
  return yy + lineH;
}

/** big headline with soft outline, centered */
export function headline(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  fill = '#fff',
  outline = 'rgba(36,16,23,0.75)',
): void {
  g.font = font(size);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.strokeStyle = outline;
  g.lineWidth = size / 5;
  g.strokeText(text, x, y);
  g.fillStyle = fill;
  g.fillText(text, x, y);
}
