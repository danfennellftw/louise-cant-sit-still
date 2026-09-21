import { Engine, Scene, W, H, rr } from '../engine';
import { SKIES, drawPalm } from '../art';
import { sprites, drawSprite } from '../sprites';
import { font, drawMeter, headline } from '../ui';

interface BikeStyle {
  frame: string;
  frameHi: string;
  panniers: boolean;
  chestDog: boolean;
}

const LOUISE_BIKE: BikeStyle = { frame: '#ece5d3', frameHi: 'rgba(120,110,90,0.5)', panniers: true, chestDog: true };
const DAN_BIKE: BikeStyle = { frame: '#2e2e36', frameHi: 'rgba(255,255,255,0.25)', panniers: false, chestDog: false };

const ZONE_LO = 0.35;
const ZONE_HI = 0.65;
const NEED = 20; // seconds spent actually cruising

/**
 * Bridge into the finale: Aima e-bikes down the San Juan Capistrano trail,
 * Rancho Mission Viejo to Dana Point. HOLD to coast, release and Louise
 * pedals too hard. The assignment is to just cruise. She struggles with it.
 */
export class EbikeScene implements Scene {
  private e: Engine;
  private t = 0;
  private speed = 0.5;
  private holding = false;
  private cruised = 0;
  private scroll = 0;
  private surgeIn = 5;
  private arriveT = -1;
  private lastNag = 0;

  constructor(e: Engine) {
    this.e = e;
  }

  enter(): void {
    this.t = 0;
    this.speed = 0.5;
    this.holding = false;
    this.cruised = 0;
    this.scroll = 0;
    this.surgeIn = 5;
    this.arriveT = -1;
    this.lastNag = 0;
    this.e.showChill = true;
    this.e.chillDrain = 2;
    this.e.toast('Aima e-bikes out. Destination: Dana Point. Vibe: allegedly relaxed.');
    setTimeout(() => this.e.toast('Leo rides in the chest carrier. He is wearing his doggles. He earned them.'), 2600);
  }

  update(dt: number): void {
    this.t += dt;
    if (this.arriveT >= 0) {
      this.arriveT += dt;
      this.scroll += dt * 120;
      if (this.arriveT > 2.6) this.e.go('spin');
      return;
    }

    // restless physics: she pedals unless actively told to chill
    this.speed += (this.holding ? -0.22 : 0.16) * dt;
    this.surgeIn -= dt;
    if (this.surgeIn <= 0) {
      this.surgeIn = 4 + Math.random() * 4;
      this.speed += 0.16;
      this.e.toast(['A sprint urge arrives. Resist.', 'She saw another cyclist. It is now a race (it is not).'][Math.floor(Math.random() * 2)]);
    }
    this.speed = Math.max(0.05, Math.min(1, this.speed));

    const inZone = this.speed >= ZONE_LO && this.speed <= ZONE_HI;
    this.e.chillDrain = inZone ? 1 : 6;
    if (inZone) {
      this.cruised += dt;
      this.e.bumpChill(dt * 2);
    } else if (this.t - this.lastNag > 4) {
      this.lastNag = this.t;
      this.e.toast(
        this.speed > ZONE_HI ? 'dan, three lengths back: "it is a CRUISE, lou."' : 'Too slow. A toddler on a scooter is gaining.',
      );
    }

    this.scroll += dt * (80 + this.speed * 260);

    if (this.cruised >= NEED) {
      this.arriveT = 0;
      this.e.fx.confetti(W / 2, 300, 45);
      this.e.toast('Dana Point. She still has energy. Of course she does.');
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    // evening sky
    const [a, b, c] = SKIES.evening;
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, a);
    grad.addColorStop(0.5, b);
    grad.addColorStop(1, c);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // sun low over the (approaching) ocean
    g.fillStyle = '#ffe9b8';
    g.beginPath();
    g.arc(W / 2, 240, 40, 0, Math.PI * 2);
    g.fill();

    // ocean, the whole ride (it's the coastal stretch of the trail)
    g.fillStyle = '#4a7d9e';
    g.fillRect(0, 340, W, 60);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 7; i++) {
      const wx = ((i * 85 - this.scroll * 0.25) % (W + 60) + W + 60) % (W + 60) - 30;
      g.fillRect(wx, 352 + (i % 3) * 13, 30, 2.5);
    }
    // beach sand with umbrellas + beachgoer dots
    g.fillStyle = '#e8d5ae';
    g.fillRect(0, 400, W, 72);
    for (let i = 0; i < 5; i++) {
      const ux = (((i * 150 - this.scroll * 0.35) % (W + 120)) + W + 120) % (W + 120) - 60;
      const uc = ['#c0605e', '#4a6fa5', '#e6a23c', '#5b8c6e', '#8e7cc3'][i];
      g.fillStyle = uc;
      g.beginPath();
      g.arc(ux, 424, 13, Math.PI, 0);
      g.fill();
      g.strokeStyle = uc;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(ux, 424);
      g.lineTo(ux, 438);
      g.stroke();
      g.fillStyle = 'rgba(90,70,60,0.55)';
      g.beginPath();
      g.arc(ux + 34, 440, 4, 0, Math.PI * 2);
      g.fill();
    }
    // lifeguard tower drifting by
    {
      const lx = (((80 - this.scroll * 0.45) % (W + 260)) + W + 260) % (W + 260) - 130;
      g.strokeStyle = '#7ea8c4';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(lx - 20, 462);
      g.lineTo(lx - 14, 408);
      g.moveTo(lx + 20, 462);
      g.lineTo(lx + 14, 408);
      g.stroke();
      g.fillStyle = '#6fb5b8';
      rr(g, lx - 26, 380, 52, 32, 5);
      g.fill();
      g.fillStyle = '#dff2f2';
      rr(g, lx - 16, 388, 32, 14, 3);
      g.fill();
      g.fillStyle = '#5a99a0';
      rr(g, lx - 30, 374, 60, 8, 4);
      g.fill();
    }
    // palms between beach and path
    for (let i = 0; i < 4; i++) {
      const px = (((i * 190 - this.scroll * 0.55) % (W + 160)) + W + 160) % (W + 160) - 80;
      drawPalm(g, px, 480, 0.6, Math.sin(this.t + i) * 2);
    }
    // paved coastal path
    g.fillStyle = '#9a958f';
    g.fillRect(0, 472, W, 188);
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.lineWidth = 3;
    g.setLineDash([30, 26]);
    g.beginPath();
    g.moveTo(0, 572);
    g.lineTo(W, 572);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#d9cfb8';
    g.fillRect(0, 660, W, H - 660);

    headline(g, 'THE E-BIKE CRUISE', W / 2, 46, 26, '#fff3dd', 'rgba(60,35,70,0.85)');
    g.font = font(13, 500);
    g.fillStyle = 'rgba(255,243,221,0.9)';
    g.textAlign = 'center';
    g.fillText('San Juan Capistrano trail — RSM to Dana Point', W / 2, 78);
    g.fillText('HOLD to coast. release and she pedals too hard.', W / 2, 98);
    drawMeter(g, W / 2 - 110, 112, 220, 14, this.cruised / NEED, '#7ed6df', `cruise ${Math.round((this.cruised / NEED) * 100)}%`);

    // speed gauge with cruise zone
    const bx = 70;
    const bw = W - 140;
    const by = 160;
    g.fillStyle = 'rgba(36,16,23,0.5)';
    rr(g, bx, by, bw, 22, 11);
    g.fill();
    g.fillStyle = 'rgba(126,214,223,0.45)';
    rr(g, bx + bw * ZONE_LO, by, bw * (ZONE_HI - ZONE_LO), 22, 8);
    g.fill();
    g.fillStyle = '#fff';
    g.font = font(10, 600);
    g.fillText('JUST CRUISE', bx + bw * 0.5, by + 34);
    const mx = bx + bw * this.speed;
    const inZone = this.speed >= ZONE_LO && this.speed <= ZONE_HI;
    g.fillStyle = inZone ? '#fff3b0' : '#ff5f6d';
    g.beginPath();
    g.moveTo(mx, by - 4);
    g.lineTo(mx - 8, by - 16);
    g.lineTo(mx + 8, by - 16);
    g.closePath();
    g.fill();

    // riders: Louise up front, Dan cruising behind
    const wob = inZone ? 0 : Math.sin(this.t * 18) * 0.03;
    this.drawEbike(g, 290, 640, sprites.louise, 200, 0.16 + wob, this.speed, LOUISE_BIKE);
    this.drawEbike(g, 90, 648, sprites.dan, 190, 0.1, 0.5, DAN_BIKE);
    g.font = font(11, 500);
    g.fillStyle = 'rgba(60,35,70,0.85)';
    g.fillText('louise: allegedly cruising', 290, 668);
    g.fillText('dan: actually cruising', 90, 676);

    if (this.arriveT >= 0) {
      headline(g, 'DANA POINT', W / 2, 320, 40, '#fff3dd');
      g.font = font(14, 500);
      g.fillStyle = 'rgba(255,243,221,0.9)';
      g.fillText('Grit Cycle is 4 minutes away. She knows a shortcut anyway.', W / 2, 360);
    }
  }

  /** side-view Aima step-through e-bike (from the photos) with rider over it */
  private drawEbike(
    g: CanvasRenderingContext2D,
    x: number,
    y: number,
    rider: HTMLImageElement,
    h: number,
    lean: number,
    speed: number,
    style: BikeStyle,
  ): void {
    const wheelSpin = this.scroll * 0.05;
    // rider first (feet at pedal height), bike frame overlaps their legs
    drawSprite(g, rider, x - 10, y - 48, h, { rot: lean });
    // Leo in the chest carrier, doggles on
    if (style.chestDog) {
      const cx = x - 18;
      const cy = y - 48 - h * 0.58;
      drawSprite(g, sprites.leo, cx, cy + 26, 52, { rot: lean * 0.6 });
      // carrier pouch over his body
      g.save();
      g.translate(cx, cy);
      g.rotate(lean * 0.6);
      g.fillStyle = '#3c3a45';
      rr(g, -20, -4, 40, 30, 12);
      g.fill();
      g.strokeStyle = '#3c3a45';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(-16, 0);
      g.lineTo(-4, -34);
      g.moveTo(16, 0);
      g.lineTo(6, -34);
      g.stroke();
      // tiny doggles
      g.fillStyle = '#2bb3c4';
      g.beginPath();
      g.ellipse(-6, -16, 5, 4, 0, 0, Math.PI * 2);
      g.ellipse(6, -16, 5, 4, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#1d1d24';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-11, -16);
      g.lineTo(-14, -18);
      g.moveTo(11, -16);
      g.lineTo(14, -18);
      g.moveTo(-1, -16);
      g.lineTo(1, -16);
      g.stroke();
      g.restore();
    }
    // wheels: tan sidewalls like the photos
    for (const wx of [x - 66, x + 66]) {
      g.fillStyle = '#b0713f';
      g.beginPath();
      g.arc(wx, y - 6, 30, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#26242a';
      g.beginPath();
      g.arc(wx, y - 6, 24, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#3c3a45';
      g.beginPath();
      g.arc(wx, y - 6, 16, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(wx + Math.cos(wheelSpin) * 15, y - 6 + Math.sin(wheelSpin) * 15);
      g.lineTo(wx - Math.cos(wheelSpin) * 15, y - 6 - Math.sin(wheelSpin) * 15);
      g.moveTo(wx + Math.cos(wheelSpin + 1.6) * 15, y - 6 + Math.sin(wheelSpin + 1.6) * 15);
      g.lineTo(wx - Math.cos(wheelSpin + 1.6) * 15, y - 6 - Math.sin(wheelSpin + 1.6) * 15);
      g.stroke();
    }
    // rear rack + leather panniers (hers)
    if (style.panniers) {
      g.strokeStyle = style.frame;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x - 92, y - 64);
      g.lineTo(x - 42, y - 64);
      g.moveTo(x - 88, y - 64);
      g.lineTo(x - 70, y - 30);
      g.stroke();
      g.fillStyle = '#8f3f34';
      rr(g, x - 96, y - 60, 34, 34, 7);
      g.fill();
      g.fillStyle = '#7a3329';
      rr(g, x - 96, y - 60, 34, 12, 7);
      g.fill();
      g.fillStyle = '#c9a24a';
      g.fillRect(x - 82, y - 46, 6, 5);
    }
    // step-through frame
    g.strokeStyle = style.frame;
    g.lineWidth = 11;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x - 66, y - 6);
    g.quadraticCurveTo(x - 6, y - 44, x + 48, y - 48);
    g.lineTo(x + 66, y - 6);
    g.stroke();
    // seat tube + brown leather saddle at hip height
    g.beginPath();
    g.moveTo(x - 40, y - 88);
    g.lineTo(x - 62, y - 10);
    g.stroke();
    g.fillStyle = '#8a5a34';
    rr(g, x - 58, y - 97, 34, 10, 5);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)';
    rr(g, x - 58, y - 97, 34, 4, 4);
    g.fill();
    // head tube + swept-back handlebars
    g.strokeStyle = style.frame;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(x + 52, y - 46);
    g.lineTo(x + 62, y - 102);
    g.stroke();
    g.strokeStyle = '#1d1d24';
    g.beginPath();
    g.moveTo(x + 62, y - 102);
    g.quadraticCurveTo(x + 66, y - 112, x + 50, y - 112);
    g.stroke();
    // crank + pedal under the rider's feet
    g.fillStyle = '#3c3a45';
    g.beginPath();
    g.arc(x - 2, y - 12, 9, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1d1d24';
    rr(g, x - 16, y - 52, 30, 7, 3);
    g.fill();
    // downtube text labels, like the photos (text only, no logo art)
    g.save();
    g.translate(x + 14, y - 42);
    g.rotate(0.52);
    g.fillStyle = style.frameHi;
    g.font = font(8, 600);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('SANTA MONICA', 0, 16);
    g.restore();
    g.save();
    g.translate(x - 6, y - 38);
    g.rotate(-0.06);
    g.fillStyle = '#2c2c34';
    rr(g, -24, -8, 48, 16, 6);
    g.fill();
    g.fillStyle = '#fff';
    g.font = font(10);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('Aima', 0, 1);
    g.restore();
    // speed lines when hustling
    if (speed > ZONE_HI) {
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(x - 80 - i * 14, y - 30 - i * 16);
        g.lineTo(x - 104 - i * 14, y - 30 - i * 16);
        g.stroke();
      }
    }
  }

  down(): void {
    this.holding = true;
  }

  up(): void {
    this.holding = false;
  }
}
