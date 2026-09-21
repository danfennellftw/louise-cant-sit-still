// Scene backgrounds: one distinct hand-drawn set per OC stop.
import { W, H, rr } from './engine';
import type { DayPhase } from './state';

export const SKIES: Record<DayPhase, [string, string, string]> = {
  morning: ['#ffd9a0', '#ffb28b', '#ff8f7d'],
  noon: ['#8fd3f4', '#a7e0f6', '#d7f2fb'],
  afternoon: ['#ffe29a', '#ffc178', '#ff9d76'],
  evening: ['#7b5ea7', '#c66b9a', '#ff9a76'],
  night: ['#2b2d5e', '#454a86', '#6a5c9e'],
};

function skyGrad(g: CanvasRenderingContext2D, phase: DayPhase, h = H): void {
  const [a, b, c] = SKIES[phase];
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, a);
  grad.addColorStop(0.55, b);
  grad.addColorStop(1, c);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, h);
}

export function drawPalm(g: CanvasRenderingContext2D, x: number, y: number, s: number, sway = 0): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.strokeStyle = '#6b4a35';
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(6, -60, 14 + sway, -108);
  g.stroke();
  g.fillStyle = '#3f7d4e';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.5 + sway * 0.02;
    g.save();
    g.translate(14 + sway, -108);
    g.rotate(a);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(28, -14, 52, -4);
    g.quadraticCurveTo(28, 2, 0, 6);
    g.closePath();
    g.fill();
    g.restore();
  }
  g.restore();
}

function cloud(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  g.beginPath();
  g.arc(x, y, 16 * s, 0, Math.PI * 2);
  g.arc(x + 20 * s, y - 6 * s, 13 * s, 0, Math.PI * 2);
  g.arc(x + 38 * s, y, 15 * s, 0, Math.PI * 2);
  g.arc(x + 18 * s, y + 6 * s, 14 * s, 0, Math.PI * 2);
  g.fill();
}

/** warm sunset title backdrop with palms and rolling hills */
export function bgTitle(g: CanvasRenderingContext2D, t: number): void {
  skyGrad(g, 'evening');
  // sun
  const sg = g.createRadialGradient(W / 2, 250, 10, W / 2, 250, 140);
  sg.addColorStop(0, 'rgba(255,240,190,0.95)');
  sg.addColorStop(1, 'rgba(255,240,190,0)');
  g.fillStyle = sg;
  g.fillRect(0, 60, W, 400);
  g.fillStyle = '#ffe9b8';
  g.beginPath();
  g.arc(W / 2, 250, 46, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)';
  cloud(g, 60 + Math.sin(t * 0.2) * 10, 130, 1);
  cloud(g, 320 + Math.cos(t * 0.15) * 12, 90, 0.8);
  // hills
  g.fillStyle = '#8a5f8f';
  g.beginPath();
  g.moveTo(0, 420);
  g.quadraticCurveTo(120, 360, 260, 410);
  g.quadraticCurveTo(380, 450, 480, 400);
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.closePath();
  g.fill();
  g.fillStyle = '#6d4677';
  g.beginPath();
  g.moveTo(0, 470);
  g.quadraticCurveTo(160, 420, 300, 470);
  g.quadraticCurveTo(420, 505, 480, 470);
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.closePath();
  g.fill();
  drawPalm(g, 40, 500, 0.9, Math.sin(t * 0.8) * 3);
  drawPalm(g, 440, 510, 1, Math.sin(t * 0.8 + 1) * 3);
}

/** travel interstitial: OC sidewalk at a given time of day */
export function bgStreet(g: CanvasRenderingContext2D, t: number, phase: DayPhase): void {
  skyGrad(g, phase, 560);
  if (phase === 'night' || phase === 'evening') {
    g.fillStyle = 'rgba(255,255,240,0.9)';
    for (let i = 0; i < 24; i++) {
      const x = ((i * 97) % W) + Math.sin(t + i) * 1.5;
      const y = (i * 53) % 300;
      g.fillRect(x, y, 2, 2);
    }
  } else {
    g.fillStyle = 'rgba(255,255,255,0.55)';
    cloud(g, 60 + Math.sin(t * 0.25) * 14, 110, 0.9);
    cloud(g, 300 + Math.cos(t * 0.2) * 16, 70, 0.7);
  }
  // condo rooftops
  g.fillStyle = phase === 'night' ? '#3a3557' : '#d8a06b';
  for (let i = 0; i < 4; i++) {
    const bx = i * 130 - 20;
    g.fillRect(bx, 380 - (i % 2) * 40, 110, 200);
  }
  g.fillStyle = 'rgba(255,244,200,0.75)';
  for (let i = 0; i < 10; i++) {
    g.fillRect(((i * 111) % 440) + 14, 400 + ((i * 67) % 120), 16, 20);
  }
  // sidewalk
  g.fillStyle = phase === 'night' ? '#55506e' : '#e8d9c2';
  g.fillRect(0, 560, W, H - 560);
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.moveTo(i * 90, 560);
    g.lineTo(i * 90 - 30, H);
    g.stroke();
  }
  drawPalm(g, 425, 566, 0.85, Math.sin(t) * 3);
}

/** condo living room: warm morning light, couch, plants */
export function bgCondoLiving(g: CanvasRenderingContext2D, t: number): void {
  g.fillStyle = '#f3e4cf';
  g.fillRect(0, 0, W, H);
  // window with sunrise
  g.fillStyle = '#8a6b52';
  rr(g, 60, 70, 220, 190, 12);
  g.fill();
  skyWindow(g, 70, 80, 200, 170, 'morning', t);
  // frame divider
  g.fillStyle = '#8a6b52';
  g.fillRect(166, 80, 8, 170);
  // shelf with plant
  g.fillStyle = '#a97e58';
  rr(g, 330, 180, 110, 12, 4);
  g.fill();
  pot(g, 385, 180, '#c9705f');
  // couch
  g.fillStyle = '#9aa38b';
  rr(g, 300, 320, 170, 90, 18);
  g.fill();
  g.fillStyle = '#aab49a';
  rr(g, 310, 300, 70, 44, 14);
  g.fill();
  rr(g, 388, 300, 70, 44, 14);
  g.fill();
  // floor
  floor(g, 430, '#d8b98e', '#cbab7f');
  // rug
  g.fillStyle = '#c9705f';
  g.beginPath();
  g.ellipse(240, 560, 190, 70, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 5;
  g.beginPath();
  g.ellipse(240, 560, 160, 55, 0, 0, Math.PI * 2);
  g.stroke();
}

/** downstairs: tile + back door, scene of the crime */
export function bgDownstairs(g: CanvasRenderingContext2D): void {
  g.fillStyle = '#e9dcc8';
  g.fillRect(0, 0, W, 360);
  // back slider door
  g.fillStyle = '#7c6a55';
  rr(g, 150, 60, 180, 260, 8);
  g.fill();
  g.fillStyle = '#bfe3e8';
  g.fillRect(160, 70, 76, 240);
  g.fillRect(244, 70, 76, 240);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.moveTo(170, 310);
  g.lineTo(220, 70);
  g.lineTo(240, 70);
  g.lineTo(190, 310);
  g.closePath();
  g.fill();
  // leash hooks
  g.fillStyle = '#8a6b52';
  rr(g, 30, 110, 90, 10, 4);
  g.fill();
  g.strokeStyle = '#c22c3a';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(50, 120);
  g.quadraticCurveTo(44, 160, 56, 176);
  g.stroke();
  g.strokeStyle = '#3f7d4e';
  g.beginPath();
  g.moveTo(90, 120);
  g.quadraticCurveTo(96, 158, 86, 174);
  g.stroke();
  // tile floor
  g.fillStyle = '#d7cbb4';
  g.fillRect(0, 360, W, H - 360);
  g.strokeStyle = 'rgba(120,100,80,0.25)';
  g.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.moveTo(0, 360 + i * 60);
    g.lineTo(W, 360 + i * 60);
    g.stroke();
  }
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.moveTo(i * 80, 360);
    g.lineTo(i * 80 - 40, H);
    g.stroke();
  }
}

/** gym interior; accent tints per gym */
export function bgGym(g: CanvasRenderingContext2D, accent: string): void {
  g.fillStyle = '#2e2b33';
  g.fillRect(0, 0, W, H);
  // mirror wall
  g.fillStyle = '#4a4653';
  rr(g, 30, 80, W - 60, 240, 10);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.beginPath();
  g.moveTo(60, 320);
  g.lineTo(150, 80);
  g.lineTo(200, 80);
  g.lineTo(110, 320);
  g.closePath();
  g.fill();
  // neon accent strip
  g.fillStyle = accent;
  rr(g, 30, 66, W - 60, 8, 4);
  g.fill();
  g.save();
  g.shadowColor = accent;
  g.shadowBlur = 18;
  g.fillRect(30, 66, W - 60, 8);
  g.restore();
  // dumbbell rack
  g.fillStyle = '#1f1d24';
  rr(g, 40, 340, 180, 16, 6);
  g.fill();
  for (let i = 0; i < 4; i++) {
    dumbbell(g, 62 + i * 42, 332, 0.55, '#8a8794');
  }
  // rubber floor
  g.fillStyle = '#3c3944';
  g.fillRect(0, 380, W, H - 380);
  g.strokeStyle = 'rgba(255,255,255,0.05)';
  g.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    g.beginPath();
    g.moveTo(0, 380 + i * 45);
    g.lineTo(W, 380 + i * 45);
    g.stroke();
  }
}

export function dumbbell(g: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = color;
  rr(g, -26, -8, 14, 16, 4);
  g.fill();
  rr(g, 12, -8, 14, 16, 4);
  g.fill();
  g.fillStyle = '#b9b6c4';
  rr(g, -14, -3.4, 28, 6.8, 3);
  g.fill();
  g.restore();
}

/** home office from the desk photo: posters, monitors, mic arm, blue LED glow */
export function bgDesk(g: CanvasRenderingContext2D, t: number): void {
  g.fillStyle = '#efe7dc';
  g.fillRect(0, 0, W, H);
  // blue LED glow column (the PC tower corner)
  const lg = g.createLinearGradient(0, 0, 130, 0);
  lg.addColorStop(0, 'rgba(64,110,255,0.5)');
  lg.addColorStop(1, 'rgba(64,110,255,0)');
  g.fillStyle = lg;
  g.fillRect(0, 100, 130, 560);
  // framed city posters
  for (const [px, py, pw, ph] of [
    [96, 46, 92, 118],
    [206, 40, 120, 86],
    [346, 46, 96, 120],
  ]) {
    g.fillStyle = '#241f1e';
    rr(g, px, py, pw, ph, 4);
    g.fill();
    const pg = g.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, '#37457c');
    pg.addColorStop(1, '#c96a8c');
    g.fillStyle = pg;
    g.fillRect(px + 7, py + 7, pw - 14, ph - 14);
    g.fillStyle = 'rgba(255,240,200,0.65)';
    for (let i = 0; i < 8; i++) {
      g.fillRect(px + 12 + ((i * 17) % (pw - 26)), py + 16 + ((i * 29) % (ph - 34)), 3, 6);
    }
  }
  // desk
  g.fillStyle = '#cba379';
  rr(g, 20, 430, W - 40, 26, 8);
  g.fill();
  g.fillStyle = '#b28a60';
  g.fillRect(50, 456, 18, 160);
  g.fillRect(W - 68, 456, 18, 160);
  // side monitor with pink city wallpaper
  g.fillStyle = '#191722';
  rr(g, 320, 300, 140, 130, 8);
  g.fill();
  const mg = g.createLinearGradient(0, 306, 0, 424);
  mg.addColorStop(0, '#f188a6');
  mg.addColorStop(1, '#5c3f8f');
  g.fillStyle = mg;
  g.fillRect(328, 308, 124, 114);
  g.fillStyle = 'rgba(30,20,50,0.85)';
  for (let i = 0; i < 6; i++) {
    const bw = 12 + ((i * 7) % 10);
    g.fillRect(334 + i * 20, 360 + ((i * 13) % 24), bw, 62);
  }
  // mic boom arm
  g.strokeStyle = '#2c2a33';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(70, 432);
  g.lineTo(110, 330);
  g.lineTo(180, 300);
  g.stroke();
  g.fillStyle = '#3c3a45';
  rr(g, 170, 282, 34, 52, 16);
  g.fill();
  g.fillStyle = '#55525f';
  rr(g, 176, 290, 22, 24, 10);
  g.fill();
  // the L mug
  g.fillStyle = '#f6f1e7';
  rr(g, 262, 402, 30, 30, 5);
  g.fill();
  g.strokeStyle = '#f6f1e7';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(296, 416, 9, -1.2, 1.2);
  g.stroke();
  g.fillStyle = '#37457c';
  g.font = '700 20px Fredoka, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('L', 277, 418);
  // steam
  g.strokeStyle = 'rgba(120,120,140,0.4)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(272, 398);
  g.quadraticCurveTo(268 + Math.sin(t * 2) * 4, 386, 274, 374);
  g.stroke();
  // floor
  g.fillStyle = '#cdb590';
  g.fillRect(0, 640, W, H - 640);
}

/** store interior for the puttering micro-games */
export function bgStore(g: CanvasRenderingContext2D, accent: string, wall = '#f2ece1'): void {
  g.fillStyle = wall;
  g.fillRect(0, 0, W, H);
  // signage band
  g.fillStyle = accent;
  g.fillRect(0, 60, W, 66);
  g.fillStyle = 'rgba(255,255,255,0.2)';
  g.fillRect(0, 118, W, 8);
  // shelving
  g.fillStyle = 'rgba(120,100,80,0.18)';
  for (let i = 0; i < 3; i++) {
    rr(g, 30, 160 + i * 64, W - 60, 12, 5);
    g.fill();
  }
  // checkered floor
  g.fillStyle = '#e3d7c2';
  g.fillRect(0, 620, W, H - 620);
  g.fillStyle = 'rgba(120,100,80,0.14)';
  for (let yy = 0; yy < 3; yy++) {
    for (let xx = 0; xx < 8; xx++) {
      if ((xx + yy) % 2 === 0) g.fillRect(xx * 60, 620 + yy * 60, 60, 60);
    }
  }
}

/** calm spa room */
export function bgSpa(g: CanvasRenderingContext2D, t: number): void {
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#dcefe8');
  grad.addColorStop(1, '#b8ddd2');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // towel shelf
  g.fillStyle = '#a98a6b';
  rr(g, 40, 120, 120, 12, 4);
  g.fill();
  for (let i = 0; i < 3; i++) {
    g.fillStyle = ['#f6f1e7', '#e7d3d3', '#d3e0e7'][i];
    rr(g, 50 + i * 36, 96, 28, 22, 5);
    g.fill();
  }
  // candles
  for (const cx of [330, 380, 430]) {
    g.fillStyle = '#e8ddc8';
    rr(g, cx, 150, 22, 40, 5);
    g.fill();
    const f = 4 + Math.sin(t * 6 + cx) * 1.5;
    g.fillStyle = '#ffb64c';
    g.beginPath();
    g.ellipse(cx + 11, 143, 4, f, 0, 0, Math.PI * 2);
    g.fill();
  }
  pot(g, 80, 300, '#7c9a8a');
  g.fillStyle = '#cbbba2';
  g.fillRect(0, 600, W, H - 600);
}

/** condo kitchen for the brown-food finale */
export function bgKitchen(g: CanvasRenderingContext2D, phase: DayPhase = 'evening'): void {
  g.fillStyle = '#f0e6d6';
  g.fillRect(0, 0, W, H);
  // window (evening)
  g.fillStyle = '#8a6b52';
  rr(g, 320, 60, 130, 110, 10);
  g.fill();
  skyWindow(g, 328, 68, 114, 94, phase, 0);
  // upper cabinets
  g.fillStyle = '#b8c4bb';
  rr(g, 30, 60, 260, 110, 8);
  g.fill();
  g.strokeStyle = 'rgba(60,60,60,0.25)';
  g.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    g.beginPath();
    g.moveTo(30 + i * 87, 60);
    g.lineTo(30 + i * 87, 170);
    g.stroke();
  }
  // range hood
  g.fillStyle = '#8f9a94';
  g.beginPath();
  g.moveTo(150, 170);
  g.lineTo(310, 170);
  g.lineTo(280, 240);
  g.lineTo(180, 240);
  g.closePath();
  g.fill();
  // counter + stove
  g.fillStyle = '#cfd8d2';
  g.fillRect(0, 430, W, 40);
  g.fillStyle = '#3c3a40';
  rr(g, 140, 420, 200, 24, 6);
  g.fill();
  // burners
  g.fillStyle = '#26242a';
  for (const bx of [190, 290]) {
    g.beginPath();
    g.arc(bx, 432, 17, 0, Math.PI * 2);
    g.fill();
  }
  // lower cabinets
  g.fillStyle = '#9fb2a6';
  g.fillRect(0, 470, W, 180);
  g.strokeStyle = 'rgba(50,50,50,0.2)';
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(i * 120, 470);
    g.lineTo(i * 120, 650);
    g.stroke();
  }
  g.fillStyle = '#d9c6a5';
  g.fillRect(0, 650, W, H - 650);
}

/** the garage: concrete, roller door, and the sauna box */
export function bgGarage(g: CanvasRenderingContext2D): void {
  g.fillStyle = '#b9b2ac';
  g.fillRect(0, 0, W, H);
  // roller door
  g.fillStyle = '#a49d96';
  rr(g, 40, 60, 400, 250, 8);
  g.fill();
  g.strokeStyle = 'rgba(70,64,60,0.3)';
  g.lineWidth = 3;
  for (let i = 1; i < 6; i++) {
    g.beginPath();
    g.moveTo(40, 60 + i * 42);
    g.lineTo(440, 60 + i * 42);
    g.stroke();
  }
  // storage shelf with bins
  g.fillStyle = '#8a8178';
  rr(g, 30, 340, 150, 12, 4);
  g.fill();
  for (let i = 0; i < 3; i++) {
    g.fillStyle = ['#7ea8c4', '#c9b16a', '#9aa38b'][i];
    rr(g, 38 + i * 46, 310, 40, 30, 5);
    g.fill();
  }
  // concrete floor
  g.fillStyle = '#8f8a85';
  g.fillRect(0, 620, W, H - 620);
  g.strokeStyle = 'rgba(60,55,50,0.2)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 660);
  g.lineTo(W, 700);
  g.stroke();
}

/** dark neon spin studio for the Grit Cycle finale */
export function bgSpinStudio(g: CanvasRenderingContext2D, t: number): void {
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#141126');
  grad.addColorStop(1, '#2c1a3e');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // neon rings
  for (let i = 0; i < 3; i++) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.4);
    g.strokeStyle = ['rgba(255,95,109,', 'rgba(126,214,223,', 'rgba(249,165,194,'][i] + (0.25 + pulse * 0.4) + ')';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(W / 2, 190, 70 + i * 44, 0, Math.PI * 2);
    g.stroke();
  }
  // instructor stage
  g.fillStyle = '#221c33';
  rr(g, 150, 260, 180, 24, 8);
  g.fill();
  // floor
  g.fillStyle = '#1c1830';
  g.fillRect(0, 560, W, H - 560);
  g.strokeStyle = 'rgba(126,214,223,0.15)';
  g.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.moveTo(0, 580 + i * 44);
    g.lineTo(W, 580 + i * 44);
    g.stroke();
  }
}

/** bedroom for the make-the-bed micro-game */
export function bgBedroom(g: CanvasRenderingContext2D): void {
  g.fillStyle = '#efe8dd';
  g.fillRect(0, 0, W, H);
  // window with blue-lit blind (from the photo)
  g.fillStyle = '#9aa3ad';
  rr(g, 300, 60, 130, 150, 8);
  g.fill();
  g.fillStyle = '#5a7de0';
  g.fillRect(296, 60, 6, 150);
  g.fillRect(428, 60, 6, 150);
  g.fillStyle = '#b3bcc4';
  for (let i = 0; i < 6; i++) g.fillRect(306, 70 + i * 23, 118, 4);
  // lamp
  g.fillStyle = '#e8ddc4';
  g.beginPath();
  g.moveTo(70, 150);
  g.lineTo(130, 150);
  g.lineTo(118, 210);
  g.lineTo(82, 210);
  g.closePath();
  g.fill();
  g.strokeStyle = '#c2a75e';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(100, 210);
  g.lineTo(100, 300);
  g.stroke();
  // dresser
  g.fillStyle = '#a97e58';
  rr(g, 320, 260, 130, 90, 8);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.fillRect(330, 280, 110, 4);
  g.fillRect(330, 316, 110, 4);
  g.fillStyle = '#d8c4a2';
  g.fillRect(0, 400, W, H - 400);
}

// ------------------------------------------------------------- shared bits

function skyWindow(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  phase: DayPhase,
  t: number,
): void {
  const [a, b] = SKIES[phase];
  const grad = g.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, a);
  grad.addColorStop(1, b);
  g.fillStyle = grad;
  g.fillRect(x, y, w, h);
  if (phase === 'morning') {
    g.fillStyle = '#fff0c4';
    g.beginPath();
    g.arc(x + w * 0.6, y + h * 0.55, Math.min(w, h) * 0.2, 0, Math.PI * 2);
    g.fill();
  }
  if (phase === 'night') {
    g.fillStyle = 'rgba(255,255,240,0.9)';
    for (let i = 0; i < 8; i++) g.fillRect(x + ((i * 31) % w), y + ((i * 17) % h), 2, 2);
  }
  g.fillStyle = 'rgba(255,255,255,0.28)';
  g.beginPath();
  g.moveTo(x + w * 0.1, y + h);
  g.lineTo(x + w * 0.45, y);
  g.lineTo(x + w * 0.6, y);
  g.lineTo(x + w * 0.25, y + h);
  g.closePath();
  g.fill();
  void t;
}

function pot(g: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  g.fillStyle = '#3f7d4e';
  g.beginPath();
  g.ellipse(x, y - 26, 20, 16, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#57995f';
  g.beginPath();
  g.ellipse(x - 10, y - 34, 9, 12, -0.4, 0, Math.PI * 2);
  g.ellipse(x + 10, y - 34, 9, 12, 0.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x - 14, y - 14);
  g.lineTo(x + 14, y - 14);
  g.lineTo(x + 10, y + 8);
  g.lineTo(x - 10, y + 8);
  g.closePath();
  g.fill();
}

function floor(g: CanvasRenderingContext2D, y: number, a: string, b: string): void {
  g.fillStyle = a;
  g.fillRect(0, y, W, H - y);
  g.strokeStyle = b;
  g.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.moveTo(0, y + 24 + i * 46);
    g.lineTo(W, y + 24 + i * 46);
    g.stroke();
  }
}
