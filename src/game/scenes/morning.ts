import { Engine, Scene, W, rr } from '../engine';
import { bgCondoLiving, bgDownstairs } from '../art';
import { drawLouise, drawDog, drawShadow } from '../sprites';
import { font, drawMeter, headline } from '../ui';

interface Poop {
  x: number;
  y: number;
  bagged: boolean;
  wiggle: number;
}

interface Puddle {
  x: number;
  y: number;
  wipes: number;
}

type Phase = 'feed' | 'bark' | 'carpet' | 'stools' | 'poop' | 'done';

const PHASE_INTRO: Record<Phase, string> = {
  feed: '6:02 AM. The pups have unionized. Breakfast, now.',
  bark: 'Leo has discovered a leaf outside. DEFCON 1.',
  carpet: 'Mochi has redecorated the carpet. Again.',
  stools: 'Leo is eyeing the barstools. You know what he does.',
  poop: 'Downstairs. The scene of the crime(s).',
  done: '',
};

/**
 * Chapter 1 at the condo, five beats of dog chaos:
 * feed both pups -> calm Leo's bark fit -> scrub Mochi's carpet accident ->
 * defend the barstools from Leo -> bag everything downstairs.
 */
export class MorningScene implements Scene {
  private e: Engine;
  private t = 0;
  private phase: Phase = 'feed';

  // feed
  private bowls = { mochi: 0, leo: 0 };
  private lastBowl = '';
  private feedDone = false;

  // bark
  private calm = 0;
  private leoX = W / 2;
  private leoTargetX = W / 2;
  private holdingLeo = false;
  private yaps: { x: number; y: number; t: number }[] = [];

  // carpet
  private stain = 100;
  private scrubX = -1;
  private scrubY = -1;

  // stools
  private stoolIdx = -1;
  private peeCountdown = 0;
  private blocked = 0;
  private puddles: Puddle[] = [];
  private stoolWait = 1;

  // poop patrol
  private poops: Poop[] = [];
  private poopTimer = 28;

  private doneT = 0;

  constructor(e: Engine) {
    this.e = e;
  }

  enter(): void {
    this.t = 0;
    this.setPhase('feed');
    this.bowls = { mochi: 0, leo: 0 };
    this.lastBowl = '';
    this.feedDone = false;
    this.e.showChill = true;
    this.e.chillDrain = 3.5;
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    if (PHASE_INTRO[p]) this.e.toast(PHASE_INTRO[p]);
    if (p === 'bark') {
      this.calm = 0;
      this.leoX = W / 2;
      this.leoTargetX = W / 2;
      this.holdingLeo = false;
      this.yaps = [];
    } else if (p === 'carpet') {
      this.stain = 100;
      this.scrubX = -1;
    } else if (p === 'stools') {
      this.blocked = 0;
      this.puddles = [];
      this.stoolIdx = -1;
      this.stoolWait = 1.2;
    } else if (p === 'poop') {
      this.poopTimer = 28;
      this.poops = [];
      for (let i = 0; i < 7; i++) {
        this.poops.push({
          x: 60 + Math.random() * (W - 120),
          y: 430 + Math.random() * 290,
          bagged: false,
          wiggle: Math.random() * Math.PI * 2,
        });
      }
    } else if (p === 'done') {
      this.doneT = 0;
      this.e.bumpChill(20);
    }
  }

  update(dt: number): void {
    this.t += dt;
    switch (this.phase) {
      case 'bark':
        this.updateBark(dt);
        break;
      case 'stools':
        this.updateStools(dt);
        break;
      case 'poop': {
        this.poopTimer = Math.max(0, this.poopTimer - dt);
        const left = this.poops.filter((p) => !p.bagged).length;
        if (left === 0) {
          this.e.toast('Floor status: survivable. Leo looks proud. He should not.');
          this.setPhase('done');
        } else if (this.poopTimer <= 0) {
          this.e.toast('Close enough. We were never doing surgery down here.');
          this.setPhase('done');
        }
        break;
      }
      case 'done':
        this.doneT += dt;
        if (this.doneT > 2.2) {
          this.e.state.nextStop = { label: 'Gym o clock', scene: 'gym', phase: 'morning' };
          this.e.go('between');
        }
        break;
      default:
        break;
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    switch (this.phase) {
      case 'feed':
        this.drawFeed(g);
        break;
      case 'bark':
        this.drawBark(g);
        break;
      case 'carpet':
        this.drawCarpet(g);
        break;
      case 'stools':
        this.drawStools(g);
        break;
      default:
        this.drawPoop(g);
        break;
    }
  }

  down(x: number, y: number): void {
    switch (this.phase) {
      case 'feed':
        this.feedTap(x, y);
        break;
      case 'bark':
        this.barkDown(x, y);
        break;
      case 'carpet':
        this.scrubX = x;
        this.scrubY = y;
        break;
      case 'stools':
        this.stoolTap(x, y);
        break;
      case 'poop':
        this.poopTap(x, y);
        break;
      default:
        break;
    }
  }

  move(x: number, y: number): void {
    // note: once Leo is grabbed, the hold sticks until pointer-up even if the
    // finger drifts — recomputing on move made the soothe impossibly fiddly
    if (this.phase === 'carpet' && this.e.pointerHeld) {
      this.carpetScrub(x, y);
    }
  }

  up(): void {
    this.holdingLeo = false;
    this.scrubX = -1;
  }

  // ------------------------------------------------------------- feeding

  private bowlPos(which: 'mochi' | 'leo'): [number, number] {
    return which === 'mochi' ? [140, 660] : [340, 660];
  }

  private drawFeed(g: CanvasRenderingContext2D): void {
    bgCondoLiving(g, this.t);
    headline(g, 'BREAKFAST SERVICE', W / 2, 52, 26, '#8a4a3d', 'rgba(255,255,255,0.85)');
    g.font = font(14, 500);
    g.fillStyle = '#6b463c';
    g.textAlign = 'center';
    g.fillText('tap the bowls — keep both pups fed evenly', W / 2, 84);

    drawLouise(g, 240, 520, 200, this.t);

    for (const which of ['mochi', 'leo'] as const) {
      const [bx, by] = this.bowlPos(which);
      const fill = this.bowls[which];
      const excite = fill / 100;
      const dogX = which === 'mochi' ? bx - 60 : bx + 60;
      drawDog(g, which, dogX, by + 6, 95, this.t, {
        trot: excite > 0.2 ? this.t * (6 + excite * 10) : 0,
        flip: which === 'leo',
      });
      drawShadow(g, bx, by + 14, 70);
      g.fillStyle = which === 'mochi' ? '#c9705f' : '#5b8c6e';
      g.beginPath();
      g.moveTo(bx - 34, by - 14);
      g.lineTo(bx + 34, by - 14);
      g.lineTo(bx + 26, by + 12);
      g.lineTo(bx - 26, by + 12);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath();
      g.ellipse(bx, by - 14, 34, 7, 0, 0, Math.PI * 2);
      g.fill();
      if (fill > 0) {
        g.fillStyle = '#8a5a34';
        g.beginPath();
        g.ellipse(bx, by - 14, 30 * Math.min(1, fill / 100 + 0.2), 5, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#6e4626';
        for (let i = 0; i < Math.floor(fill / 12); i++) {
          g.beginPath();
          g.arc(bx - 20 + ((i * 13) % 40), by - 16 + ((i * 7) % 5), 2.6, 0, Math.PI * 2);
          g.fill();
        }
      }
      drawMeter(g, bx - 44, by + 26, 88, 16, fill / 100, which === 'mochi' ? '#c9705f' : '#5b8c6e');
      g.fillStyle = '#4a2e33';
      g.font = font(14);
      g.textAlign = 'center';
      g.fillText(which === 'mochi' ? 'MOCHI' : 'LEO', bx, by + 58);
    }
  }

  private feedTap(x: number, y: number): void {
    for (const which of ['mochi', 'leo'] as const) {
      const [bx, by] = this.bowlPos(which);
      if (Math.abs(x - bx) < 62 && Math.abs(y - by) < 55) {
        const other = which === 'mochi' ? 'leo' : 'mochi';
        const bonus = this.lastBowl === which ? 6 : 11;
        this.bowls[which] = Math.min(100, this.bowls[which] + bonus);
        this.lastBowl = which;
        this.e.state.stats.kibbleServed++;
        this.e.bumpChill(2);
        this.e.fx.burst(bx, by - 20, '#c99a63', 8, 120);
        if (this.bowls[which] - this.bowls[other] > 45) {
          this.e.toast(`${other === 'mochi' ? 'Mochi' : 'Leo'} is filing a formal complaint.`);
        }
        if (!this.feedDone && this.bowls.mochi >= 100 && this.bowls.leo >= 100) {
          this.feedDone = true;
          this.e.fx.confetti(W / 2, 400, 30);
          this.e.toast('Both pups fed. Peace treaty active for 4 minutes.');
          setTimeout(() => {
            if (this.phase === 'feed') this.setPhase('bark');
          }, 900);
        }
        return;
      }
    }
    this.e.fx.sparkle(x, y);
  }

  // ------------------------------------------------------- Leo bark fit

  private updateBark(dt: number): void {
    // Leo shuffles around unless held
    if (!this.holdingLeo && Math.random() < dt * 1.2) {
      this.leoTargetX = 90 + Math.random() * (W - 180);
    }
    this.leoX += (this.leoTargetX - this.leoX) * Math.min(1, dt * (this.holdingLeo ? 0 : 4));

    if (this.holdingLeo) {
      this.calm = Math.min(100, this.calm + dt * 22);
      if (Math.random() < dt * 6) this.e.fx.hearts(this.leoX, 470, 1);
    } else {
      this.calm = Math.max(0, this.calm - dt * 6);
      if (Math.random() < dt * 3.2) {
        this.yaps.push({ x: this.leoX + (Math.random() - 0.5) * 90, y: 450 + Math.random() * 60, t: 0 });
      }
    }
    for (const yp of this.yaps) yp.t += dt;
    this.yaps = this.yaps.filter((yp) => yp.t < 0.9);

    if (this.calm >= 100) {
      this.e.state.stats.barksCalmed++;
      this.e.bumpChill(10);
      this.e.fx.confetti(this.leoX, 460, 25);
      this.e.toast('Leo: neutralized. The leaf: victorious anyway.');
      this.setPhase('carpet');
    }
  }

  private drawBark(g: CanvasRenderingContext2D): void {
    bgCondoLiving(g, this.t);
    headline(g, 'LEO vs THE LEAF', W / 2, 52, 28, '#8a4a3d', 'rgba(255,255,255,0.85)');
    g.font = font(14, 500);
    g.fillStyle = '#6b463c';
    g.textAlign = 'center';
    g.fillText('press and HOLD Leo to calm him down', W / 2, 84);
    drawMeter(g, W / 2 - 110, 100, 220, 18, this.calm / 100, '#5b8c6e', `zen ${Math.round(this.calm)}%`);

    // the leaf, taunting from the window
    g.save();
    g.translate(120 + Math.sin(this.t * 2) * 8, 150 + Math.sin(this.t * 3.1) * 6);
    g.rotate(Math.sin(this.t * 2.4) * 0.4);
    g.fillStyle = '#7aa25a';
    g.beginPath();
    g.ellipse(0, 0, 10, 5, 0.6, 0, Math.PI * 2);
    g.fill();
    g.restore();

    drawLouise(g, 400, 600, 205, this.t, { flip: true });
    const shakeAmt = this.holdingLeo ? 0 : (1 - this.calm / 100) * 3;
    drawDog(g, 'leo', this.leoX + (Math.random() - 0.5) * shakeAmt, 590, 110, this.t, {
      trot: this.holdingLeo ? 0 : this.t * 14,
    });
    if (this.holdingLeo) {
      g.fillStyle = 'rgba(91,140,110,0.85)';
      rr(g, this.leoX - 44, 610, 88, 24, 12);
      g.fill();
      g.fillStyle = '#fff';
      g.font = font(13);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('sooothe...', this.leoX, 623);
    }

    for (const yp of this.yaps) {
      const a = 1 - yp.t / 0.9;
      g.globalAlpha = a;
      g.fillStyle = '#fff';
      rr(g, yp.x - 26, yp.y - yp.t * 60 - 14, 52, 28, 12);
      g.fill();
      g.fillStyle = '#c0392b';
      g.font = font(15);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('YAP!', yp.x, yp.y - yp.t * 60);
      g.globalAlpha = 1;
    }
  }

  private barkDown(x: number, y: number): void {
    this.holdingLeo = Math.hypot(x - this.leoX, y - 545) < 120;
    if (this.holdingLeo) {
      // taps soothe too, so rapid petting also works
      this.calm = Math.min(100, this.calm + 6);
      this.e.fx.hearts(this.leoX, 500, 2);
    } else {
      this.e.fx.sparkle(x, y);
    }
  }

  // -------------------------------------------------- Mochi carpet crime

  private stainPos(): [number, number] {
    return [220, 570];
  }

  private carpetScrub(x: number, y: number): void {
    const [sx, sy] = this.stainPos();
    if (Math.hypot(x - sx, y - sy) < 90 && this.scrubX >= 0) {
      const dist = Math.hypot(x - this.scrubX, y - this.scrubY);
      if (dist > 6) {
        this.stain = Math.max(0, this.stain - dist * 0.16);
        this.e.state.stats.carpetScrubs++;
        if (Math.random() < 0.35) this.e.fx.puff(x, y, 'rgba(200,240,255,0.8)');
        this.e.bumpChill(0.3);
        if (this.stain <= 0) {
          this.e.fx.sparkle(sx, sy, '#bff0c8');
          this.e.toast('Carpet: restored. Mochi: zero remorse detected.');
          this.setPhase('stools');
        }
      }
    }
    this.scrubX = x;
    this.scrubY = y;
  }

  private drawCarpet(g: CanvasRenderingContext2D): void {
    bgCondoLiving(g, this.t);
    headline(g, 'THE CARPET INCIDENT', W / 2, 52, 26, '#8a4a3d', 'rgba(255,255,255,0.85)');
    g.font = font(14, 500);
    g.fillStyle = '#6b463c';
    g.textAlign = 'center';
    g.fillText('scrub the stain — rub back and forth!', W / 2, 84);
    drawMeter(g, W / 2 - 110, 100, 220, 18, 1 - this.stain / 100, '#7ed6df', `clean ${Math.round(100 - this.stain)}%`);

    const [sx, sy] = this.stainPos();
    const a = this.stain / 100;
    if (a > 0.01) {
      g.globalAlpha = 0.5 * a + 0.15;
      g.fillStyle = '#6e4626';
      g.beginPath();
      g.ellipse(sx, sy, 52 * (0.5 + a * 0.5), 26 * (0.5 + a * 0.5), 0.2, 0, Math.PI * 2);
      g.ellipse(sx - 24, sy + 8, 18, 10, 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }

    drawLouise(g, 390, 620, 205, this.t, { flip: true, rot: 0.06 });
    drawDog(g, 'mochi', 100, 500, 96, this.t, { trot: 0 });
    // guilt sweat
    g.fillStyle = 'rgba(120,180,255,0.8)';
    g.beginPath();
    g.ellipse(128, 430 + Math.sin(this.t * 5) * 3, 4, 6, 0.3, 0, Math.PI * 2);
    g.fill();
    g.font = font(12, 500);
    g.fillStyle = 'rgba(74,46,51,0.75)';
    g.textAlign = 'center';
    g.fillText('mochi: "no witnesses"', 100, 528);
  }

  // ------------------------------------------------- Leo vs the barstools

  private stoolX(i: number): number {
    return 120 + i * 120;
  }

  private updateStools(dt: number): void {
    if (this.stoolIdx < 0) {
      this.stoolWait -= dt;
      if (this.stoolWait <= 0) {
        this.stoolIdx = Math.floor(Math.random() * 3);
        this.peeCountdown = 1.5;
      }
    } else {
      this.peeCountdown -= dt;
      if (this.peeCountdown <= 0) {
        // crime committed
        this.puddles.push({ x: this.stoolX(this.stoolIdx) + 26, y: 560, wipes: 0 });
        this.e.toast('TOO SLOW. Barstool violated. Mop time.');
        this.e.state.stats.peesMopped++;
        this.stoolIdx = -1;
        this.stoolWait = 1 + Math.random() * 1.2;
      }
    }
    if (this.blocked >= 4 && this.puddles.length === 0) {
      this.e.bumpChill(10);
      this.e.fx.confetti(W / 2, 400, 30);
      this.e.toast('Barstools defended. Leo respects nothing but speed.');
      this.setPhase('poop');
    }
  }

  private drawStools(g: CanvasRenderingContext2D): void {
    bgCondoLiving(g, this.t);
    headline(g, 'DEFEND THE BARSTOOLS', W / 2, 52, 25, '#8a4a3d', 'rgba(255,255,255,0.85)');
    g.font = font(14, 500);
    g.fillStyle = '#6b463c';
    g.textAlign = 'center';
    g.fillText(`tap Leo before he lifts the leg — ${this.blocked} / 4 blocked`, W / 2, 84);

    // kitchen counter + stools
    g.fillStyle = '#cfd8d2';
    rr(g, 40, 440, 400, 22, 6);
    g.fill();
    g.fillStyle = '#9fb2a6';
    rr(g, 48, 462, 384, 40, 4);
    g.fill();
    for (let i = 0; i < 3; i++) {
      const x = this.stoolX(i);
      g.fillStyle = '#8a6b52';
      rr(g, x - 26, 520, 52, 12, 5);
      g.fill();
      g.strokeStyle = '#6e5442';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(x - 18, 532);
      g.lineTo(x - 22, 600);
      g.moveTo(x + 18, 532);
      g.lineTo(x + 22, 600);
      g.stroke();
    }

    for (const p of this.puddles) {
      g.fillStyle = 'rgba(240,220,90,0.75)';
      g.beginPath();
      g.ellipse(p.x, p.y + 34, 26 - p.wipes * 6, 10 - p.wipes * 2, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(74,46,51,0.8)';
      g.font = font(11, 600);
      g.textAlign = 'center';
      g.fillText('tap to mop', p.x, p.y + 58);
    }

    if (this.stoolIdx >= 0) {
      const x = this.stoolX(this.stoolIdx);
      const urgency = 1 - this.peeCountdown / 1.5;
      drawDog(g, 'leo', x + 30, 620, 105, this.t, { rot: urgency * 0.35, trot: this.t * 10 });
      // warning bubble
      const pulse = 1 + Math.sin(this.t * 14) * 0.1;
      g.save();
      g.translate(x + 30, 480 - urgency * 10);
      g.scale(pulse, pulse);
      g.fillStyle = '#e74c3c';
      g.beginPath();
      g.arc(0, 0, 18, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = font(22);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('!', 0, 1);
      g.restore();
    }

    drawLouise(g, 60, 700, 190, this.t);
  }

  private stoolTap(x: number, y: number): void {
    if (this.stoolIdx >= 0) {
      const lx = this.stoolX(this.stoolIdx) + 30;
      if (Math.hypot(x - lx, y - 580) < 80) {
        this.blocked++;
        this.e.state.stats.peesBlocked++;
        this.e.bumpChill(4);
        this.e.fx.burst(lx, 560, '#7ed6df', 10, 150);
        this.e.toast(['Denied!', 'Not today, sir.', 'The audacity.', 'BLOCKED.'][this.blocked % 4]);
        this.stoolIdx = -1;
        this.stoolWait = 0.8 + Math.random() * 1.2;
        return;
      }
    }
    for (const p of this.puddles) {
      if (Math.hypot(x - p.x, y - (p.y + 34)) < 44) {
        p.wipes++;
        this.e.fx.puff(p.x, p.y + 30, 'rgba(200,240,255,0.8)');
        if (p.wipes >= 3) {
          this.puddles.splice(this.puddles.indexOf(p), 1);
          this.e.fx.sparkle(p.x, p.y + 30, '#bff0c8');
        }
        return;
      }
    }
    this.e.fx.sparkle(x, y, 'rgba(255,255,255,0.5)');
  }

  // --------------------------------------------------------- poop patrol

  private drawPoop(g: CanvasRenderingContext2D): void {
    bgDownstairs(g);
    headline(g, 'POOP PATROL', W / 2, 46, 28, '#6b463c', 'rgba(255,255,255,0.9)');
    g.font = font(14, 500);
    g.fillStyle = '#6b463c';
    g.textAlign = 'center';
    g.fillText('tap every crime before the guests arrive (there are no guests)', W / 2, 78);

    drawMeter(g, W / 2 - 110, 94, 220, 18, this.poopTimer / 28, this.poopTimer < 8 ? '#e74c3c' : '#5b8c6e');
    g.fillStyle = '#fff';
    g.font = font(12);
    g.fillText(`${Math.ceil(this.poopTimer)}s`, W / 2, 103);

    drawDog(g, 'mochi', 90, 330, 90, this.t);
    drawDog(g, 'leo', 390, 335, 84, this.t, { flip: true });

    const remaining = this.poops.filter((p) => !p.bagged);
    for (const p of remaining) {
      const wob = Math.sin(this.t * 3 + p.wiggle) * 2;
      this.drawPoopPile(g, p.x, p.y + wob);
    }
    if (this.phase === 'done') {
      drawLouise(g, W / 2, 640, 210, this.t);
      headline(g, 'MORNING: SURVIVED', W / 2, 420, 32, '#fff3dd');
    }
  }

  private drawPoopPile(g: CanvasRenderingContext2D, x: number, y: number): void {
    g.fillStyle = '#7a5230';
    g.beginPath();
    g.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(x, y - 8, 11, 6.5, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(x + 1, y - 15, 6.5, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(120,140,90,0.55)';
    g.lineWidth = 2;
    for (const sx of [-8, 4]) {
      g.beginPath();
      g.moveTo(x + sx, y - 24);
      g.quadraticCurveTo(x + sx + 4, y - 32, x + sx, y - 40);
      g.stroke();
    }
  }

  private poopTap(x: number, y: number): void {
    for (const p of this.poops) {
      if (!p.bagged && Math.hypot(x - p.x, y - p.y + 8) < 34) {
        p.bagged = true;
        this.e.state.stats.poopsBagged++;
        this.e.bumpChill(4);
        this.e.fx.puff(p.x, p.y - 8);
        this.e.fx.sparkle(p.x, p.y - 20, '#bff0c8');
        const left = this.poops.filter((q) => !q.bagged).length;
        if (left === 3) this.e.toast('Halfway. Who produced ALL of this?');
        if (left === 1) this.e.toast('One left. Leo is avoiding eye contact.');
        return;
      }
    }
    this.e.fx.sparkle(x, y, 'rgba(255,255,255,0.6)');
  }
}
