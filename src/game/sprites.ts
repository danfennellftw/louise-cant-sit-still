// Character sprites generated from Dan's photos (see scripts/process-art.mjs).
// Everything anchors at the feet and animates puppet-style: bob, tilt, squash.

export interface SpriteSet {
  louise: HTMLImageElement;
  louiseFace: HTMLImageElement;
  dan: HTMLImageElement;
  danFace: HTMLImageElement;
  mochi: HTMLImageElement;
  leo: HTMLImageElement;
}

export let sprites: SpriteSet;

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

export async function loadSprites(): Promise<void> {
  const base = import.meta.env.BASE_URL;
  const [louise, louiseFace, dan, danFace, mochi, leo] = await Promise.all([
    load(`${base}characters/louise.png`),
    load(`${base}characters/louise-face.png`),
    load(`${base}characters/dan.png`),
    load(`${base}characters/dan-face.png`),
    load(`${base}characters/mochi.png`),
    load(`${base}characters/leo.png`),
  ]);
  sprites = { louise, louiseFace, dan, danFace, mochi, leo };
}

export interface DrawOpts {
  flip?: boolean;
  /** rotation around the feet anchor, radians */
  rot?: number;
  /** horizontal squash for landing/bounce juice; 1 = none */
  squash?: number;
  alpha?: number;
}

/** Draw a sprite anchored at bottom-center (the feet), scaled to height h. */
export function drawSprite(
  g: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  h: number,
  o: DrawOpts = {},
): void {
  const scale = h / img.height;
  const w = img.width * scale;
  g.save();
  g.translate(x, y);
  if (o.rot) g.rotate(o.rot);
  const squash = o.squash ?? 1;
  g.scale((o.flip ? -1 : 1) * squash, 2 - squash > 0 ? 1 / squash : 1);
  if (o.alpha !== undefined) g.globalAlpha = o.alpha;
  g.drawImage(img, -w / 2, -h, w, h);
  g.restore();
}

/** Soft contact shadow to ground a sprite. */
export function drawShadow(g: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  g.save();
  g.fillStyle = 'rgba(40,25,20,0.22)';
  g.beginPath();
  g.ellipse(x, y, w / 2, w / 7, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** Portrait cropped into a circle, with a ring. */
export function faceInCircle(
  g: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  r: number,
  ring = '#fff',
): void {
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = '#fdf3e0';
  g.fill();
  g.clip();
  // inset the source a touch so panel-edge slivers never show
  const inset = 0.06;
  const sw = img.width * (1 - inset * 2);
  const sh = img.height * (1 - inset * 2);
  const s = (r * 2) / Math.min(sw, sh);
  const dw = sw * s;
  const dh = sh * s;
  g.drawImage(img, img.width * inset, img.height * inset, sw, sh, x - dw / 2, y - dh / 2, dw, dh);
  g.restore();
  g.strokeStyle = ring;
  g.lineWidth = Math.max(3, r * 0.09);
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
}

/** Standing/walking Louise with idle sway baked in. */
export function drawLouise(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  t: number,
  o: DrawOpts & { walk?: number } = {},
): void {
  const walk = o.walk ?? 0;
  const bob = walk > 0 ? Math.abs(Math.sin(walk)) * h * 0.03 : Math.sin(t * 1.6) * h * 0.008;
  const rot = (o.rot ?? 0) + (walk > 0 ? Math.sin(walk) * 0.05 : Math.sin(t * 1.1) * 0.015);
  drawShadow(g, x, y, h * 0.42);
  drawSprite(g, sprites.louise, x, y - bob, h, { ...o, rot });
}

export function drawDan(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  t: number,
  o: DrawOpts = {},
): void {
  drawShadow(g, x, y, h * 0.4);
  drawSprite(g, sprites.dan, x, y - Math.sin(t * 1.3) * h * 0.006, h, {
    ...o,
    rot: (o.rot ?? 0) + Math.sin(t * 0.9) * 0.012,
  });
}

/** Trotting dog: pass trot > 0 to bounce. */
export function drawDog(
  g: CanvasRenderingContext2D,
  which: 'mochi' | 'leo',
  x: number,
  y: number,
  h: number,
  t: number,
  o: DrawOpts & { trot?: number } = {},
): void {
  const img = which === 'mochi' ? sprites.mochi : sprites.leo;
  const trot = o.trot ?? 0;
  const bounce = trot > 0 ? Math.abs(Math.sin(trot)) * h * 0.09 : Math.sin(t * 2.4 + (which === 'leo' ? 2 : 0)) * h * 0.015;
  const rot = (o.rot ?? 0) + (trot > 0 ? Math.sin(trot) * 0.08 : 0);
  const squash = trot > 0 ? 1 + Math.max(0, -Math.sin(trot)) * 0.06 : 1;
  drawShadow(g, x, y, h * 0.7);
  drawSprite(g, img, x, y - bounce, h, { ...o, rot, squash });
}
