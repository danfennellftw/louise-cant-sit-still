import type { CityLabel, Location } from './locations';
import { MAP_HEIGHT, MAP_WIDTH } from './locations';

export interface Dog {
  x: number;
  y: number;
  phase: number;
}

export interface PlayerState {
  x: number;
  y: number;
  facing: number;
  moving: boolean;
}

const SAND = '#f4d9a8';
const WATER = '#7ec8e3';
const GRASS = '#a8d5a2';
const ROAD = '#e8dcc8';

export function drawMap(
  ctx: CanvasRenderingContext2D,
  cities: CityLabel[],
  locations: Location[],
  visited: Set<string>
) {
  ctx.fillStyle = SAND;
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // Pacific strip (west)
  ctx.fillStyle = WATER;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(120, 0);
  ctx.lineTo(100, MAP_HEIGHT);
  ctx.lineTo(0, MAP_HEIGHT);
  ctx.closePath();
  ctx.fill();

  // Hills / parks
  ctx.fillStyle = GRASS;
  ctx.beginPath();
  ctx.ellipse(1100, 400, 180, 120, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(200, 900, 140, 100, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stylized roads connecting cities
  ctx.strokeStyle = ROAD;
  ctx.lineWidth = 28;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const roadPoints = [
    [320, 420],
    [520, 380],
    [640, 560],
    [480, 520],
    [380, 720],
    [700, 280],
    [780, 720],
    [860, 880],
    [920, 520],
    [1180, 1180],
  ];
  ctx.beginPath();
  ctx.moveTo(roadPoints[0][0], roadPoints[0][1]);
  for (let i = 1; i < roadPoints.length; i++) {
    ctx.lineTo(roadPoints[i][0], roadPoints[i][1]);
  }
  ctx.stroke();

  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(520, 380);
  ctx.lineTo(200, 620);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(200, 620);
  ctx.lineTo(130, 880);
  ctx.stroke();

  // City labels
  ctx.font = '600 14px Fredoka, sans-serif';
  ctx.fillStyle = 'rgba(60, 50, 40, 0.55)';
  for (const c of cities) {
    ctx.fillText(c.name, c.x, c.y);
  }

  // Location buildings
  for (const loc of locations) {
    const done = visited.has(loc.id);
    drawBuilding(ctx, loc, done);
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, loc: Location, done: boolean) {
  const { x, y, color, label, city, isHome } = loc;
  const w = isHome ? 56 : 48;
  const h = isHome ? 40 : 44;

  ctx.fillStyle = done ? '#b8e0b8' : color;
  ctx.strokeStyle = '#5c4030';
  ctx.lineWidth = 2;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 6);
  ctx.fill();
  ctx.stroke();

  if (isHome) {
    // Condo stack look
    ctx.fillStyle = '#fff5ee';
    roundRect(ctx, x - w / 2 + 6, y - h / 2 - 14, w - 12, 12, 3);
    ctx.fill();
    ctx.stroke();
  }

  if (loc.id === 'grit_cycle') {
    ctx.strokeStyle = '#5c4030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 18, y - 4, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 18, y - 4, 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (loc.id === 'ai_meetup') {
    ctx.fillStyle = '#6b4a32';
    roundRect(ctx, x - 8, y + 6, 16, 10, 2);
    ctx.fill();
  }

  ctx.fillStyle = '#2d2418';
  ctx.font = '700 11px Fredoka, sans-serif';
  const tw = ctx.measureText(label).width;
  ctx.fillText(label, x - tw / 2, y + h / 2 + 14);
  ctx.font = '600 9px Fredoka, sans-serif';
  ctx.fillStyle = 'rgba(45, 36, 24, 0.7)';
  const cw = ctx.measureText(city).width;
  ctx.fillText(city, x - cw / 2, y + h / 2 + 26);

  if (!done) {
    ctx.fillStyle = '#ffe566';
    ctx.beginPath();
    ctx.arc(x + w / 2 - 4, y - h / 2 + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerState) {
  const bounce = p.moving ? Math.sin(Date.now() / 80) * 2 : 0;
  const x = p.x;
  const y = p.y + bounce;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#ff7eb3';
  ctx.strokeStyle = '#5c2a42';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 11, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.fillStyle = '#ffd4b8';
  ctx.beginPath();
  ctx.arc(x, y - 16, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair ponytail (always in motion energy)
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 6, y - 18);
  ctx.quadraticCurveTo(x + 16, y - 22 + Math.sin(Date.now() / 100) * 3, x + 14, y - 8);
  ctx.stroke();

  // Legs hint when moving
  if (p.moving) {
    const leg = Math.sin(Date.now() / 60) * 4;
    ctx.strokeStyle = '#5c4030';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 10);
    ctx.lineTo(x - 4 + leg, y + 18);
    ctx.moveTo(x + 4, y + 10);
    ctx.lineTo(x + 4 - leg, y + 18);
    ctx.stroke();
  }
}

export function drawDog(ctx: CanvasRenderingContext2D, dog: Dog, name: string, white: boolean) {
  const bounce = Math.sin(dog.phase) * 3;
  const x = dog.x;
  const y = dog.y + bounce;

  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = white ? '#f8f8f5' : '#c9a227';
  ctx.strokeStyle = '#4a3728';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#2d2418';
  ctx.beginPath();
  ctx.arc(x + 4, y - 2, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '600 8px Fredoka, sans-serif';
  ctx.fillStyle = '#5c4030';
  ctx.fillText(name, x - 12, y - 14);
}

/** Dan silhouette at home during kitchen beat — optional draw near condo */
export function drawDanNpc(ctx: CanvasRenderingContext2D, x: number, y: number, visible: boolean) {
  if (!visible) return;
  ctx.fillStyle = 'rgba(80, 70, 90, 0.85)';
  ctx.strokeStyle = '#3d3545';
  ctx.lineWidth = 2;
  roundRect(ctx, x - 14, y - 8, 28, 22, 4);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - 14, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = '700 9px Fredoka, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('Dan', x - 10, y + 6);
}

/** Brown food plates mini illustration */
export function drawBrownFoodPlates(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#e8dcc8';
  ctx.strokeStyle = '#8b7355';
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i++) {
    const px = x + i * 22 - 11;
    ctx.beginPath();
    ctx.ellipse(px, y, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = i === 0 ? '#c49a6c' : '#8b5a3c';
    ctx.beginPath();
    ctx.ellipse(px, y - 2, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8dcc8';
  }
  ctx.globalAlpha = 1;
}
