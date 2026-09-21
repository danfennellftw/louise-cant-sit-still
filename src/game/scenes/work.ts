import { Engine, Scene, W, rr } from '../engine';
import { bgDesk } from '../art';
import { drawLouise, drawDan, drawDog } from '../sprites';
import { font, drawMeter, headline } from '../ui';

interface Ping {
  x: number;
  y: number;
  t: number;
  kind: string;
  dead: boolean;
}

const PING_KINDS = ['EMAIL', 'SLACK', 'CAL', 'DM', '??'];
const URGES = [
  'GO REORGANIZE THE PANTRY',
  'START A LOAD OF LAUNDRY',
  'CHECK ON THE DOGS (they are asleep)',
  'WIPE A COUNTER. ANY COUNTER.',
  'RESEARCH FLIGHTS YOU WILL NOT BOOK',
];

/**
 * Chapter 3: the sitting Olympics. Clear pings to fill the workday bar.
 * Periodic URGE buttons tempt her out of the chair — resisting is worth
 * more progress, but tapping one is very in character.
 */
export class WorkScene implements Scene {
  private e: Engine;
  private t = 0;
  private progress = 0;
  private pings: Ping[] = [];
  private spawnIn = 1;
  private urge: { text: string; t: number } | null = null;
  private urgeIn = 6;
  private doneT = -1;
  private standT = -1;

  constructor(e: Engine) {
    this.e = e;
  }

  enter(): void {
    this.t = 0;
    this.progress = 0;
    this.pings = [];
    this.spawnIn = 0.8;
    this.urge = null;
    this.urgeIn = 6;
    this.doneT = -1;
    this.standT = -1;
    this.e.showChill = true;
    this.e.chillDrain = 6; // sitting is her final boss
    this.e.leoPatrol.enabled = true;
    this.e.toast('Work time. The chair braces itself.');
  }

  update(dt: number): void {
    this.t += dt;
    if (this.doneT >= 0) {
      this.doneT += dt;
      if (this.doneT > 2.4) {
        if (!this.e.state.chaptersDone.includes('work')) this.e.state.chaptersDone.push('work');
        this.e.state.nextStop = { label: 'The Puttering Hours', scene: 'putter', phase: 'afternoon' };
        this.e.go('between');
      }
      return;
    }
    if (this.standT >= 0) {
      this.standT += dt;
      if (this.standT > 1.6) this.standT = -1;
    }

    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && this.pings.length < 5) {
      this.spawnIn = 0.9 + Math.random() * 0.9;
      this.pings.push({
        x: 70 + Math.random() * (W - 140),
        y: 170 + Math.random() * 220,
        t: 0,
        kind: PING_KINDS[Math.floor(Math.random() * PING_KINDS.length)],
        dead: false,
      });
    }
    for (const p of this.pings) p.t += dt;
    this.pings = this.pings.filter((p) => !p.dead && p.t < 5);

    if (!this.urge) {
      this.urgeIn -= dt;
      if (this.urgeIn <= 0) this.urge = { text: URGES[Math.floor(Math.random() * URGES.length)], t: 0 };
    } else {
      this.urge.t += dt;
      if (this.urge.t > 3.4) {
        // resisted!
        this.urge = null;
        this.urgeIn = 5 + Math.random() * 5;
        this.e.state.stats.urgesResisted++;
        this.progress = Math.min(100, this.progress + 9);
        this.e.fx.sparkle(W / 2, 640, '#bff0c8');
        this.e.toast('URGE RESISTED. Therapist would be so proud.');
        this.checkDone();
      }
    }
  }

  private checkDone(): void {
    if (this.progress >= 100 && this.doneT < 0) {
      this.doneT = 0;
      this.e.fx.confetti(W / 2, 300, 45);
      this.e.bumpChill(25);
      this.e.toast('Inbox zero. Chair survived. Barely.');
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    bgDesk(g, this.t);

    headline(g, 'THE SITTING OLYMPICS', W / 2, 30, 22, '#4a2e33', 'rgba(255,255,255,0.9)');
    drawMeter(g, W / 2 - 130, 46, 260, 18, this.progress / 100, '#5b8c6e', `workday ${Math.round(this.progress)}%`);

    // shared office: Louise at her desk, Dan locked in at his (same room)
    const stand = this.standT >= 0;
    const wob = stand ? Math.sin(this.t * 24) * 0.05 : Math.sin(this.t * 1.4) * 0.012;
    drawDan(g, 398, 648, 190, this.t, { rot: stand ? -0.03 : Math.sin(this.t * 0.8) * 0.008 });
    drawLouise(g, 165, stand ? 630 : 655, stand ? 235 : 215, this.t, { rot: wob });
    drawDog(g, 'mochi', 130, 668, 78, this.t, { trot: stand ? this.t * 10 : 0 });
    if (this.doneT < 0) {
      g.font = font(12, 500);
      g.fillStyle = 'rgba(74,46,51,0.75)';
      g.textAlign = 'center';
      g.fillText(stand ? 'SHE STOOD UP' : 'mochi: emotional support colleague', 165, 700);
      g.fillText(stand ? 'dan: (does not look up)' : 'dan: same room, deep focus', 398, 692);
    }

    // pings
    for (const p of this.pings) {
      const pop = Math.min(1, p.t / 0.15);
      const fade = Math.max(0, Math.min(1, (5 - p.t) / 0.4));
      const s = pop * (1 + Math.sin(p.t * 5) * 0.04);
      g.save();
      g.translate(p.x, p.y);
      g.scale(s, s);
      g.globalAlpha = fade;
      g.fillStyle = 'rgba(36,16,23,0.85)';
      rr(g, -38, -22, 76, 44, 12);
      g.fill();
      g.beginPath();
      g.moveTo(-8, 20);
      g.lineTo(6, 20);
      g.lineTo(-2, 32);
      g.closePath();
      g.fill();
      g.fillStyle = '#ffe9d6';
      g.font = font(15);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(p.kind, 0, 1);
      g.restore();
    }

    // urge button
    if (this.urge) {
      const u = this.urge;
      const pulse = 1 + Math.sin(this.t * 10) * 0.03;
      const left = Math.max(0, 3.4 - u.t);
      g.save();
      g.translate(W / 2, 620);
      g.scale(pulse, pulse);
      g.fillStyle = '#e74c3c';
      rr(g, -170, -44, 340, 88, 20);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 3;
      rr(g, -164, -38, 328, 76, 15);
      g.stroke();
      g.fillStyle = '#fff';
      g.font = font(13);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('SUDDEN URGE:', 0, -22);
      g.font = font(16);
      g.fillText(u.text, 0, 0, 310);
      g.font = font(11, 500);
      g.fillText(`resist for ${left.toFixed(1)}s (or just... go)`, 0, 24);
      g.restore();
    }

    if (this.doneT >= 0) headline(g, 'WORKDAY: SURVIVED', W / 2, 380, 34, '#fff3dd');
  }

  down(x: number, y: number): void {
    if (this.doneT >= 0) return;
    // urge tap = she caves, very on brand
    if (this.urge && Math.abs(x - W / 2) < 175 && Math.abs(y - 620) < 46) {
      this.urge = null;
      this.urgeIn = 5 + Math.random() * 5;
      this.e.state.stats.urgesTaken++;
      this.standT = 0;
      this.e.bumpChill(18);
      this.progress = Math.max(0, this.progress - 3);
      this.e.fx.hearts(x, y, 5);
      this.e.toast('She went. Of course she went. The pantry looks amazing.');
      this.e.toast('dan, not looking up: "have fun."');
      return;
    }
    for (const p of this.pings) {
      if (!p.dead && Math.abs(x - p.x) < 44 && Math.abs(y - p.y) < 30) {
        p.dead = true;
        this.progress = Math.min(100, this.progress + 6.5);
        this.e.state.stats.pingsCleared++;
        this.e.bumpChill(1.5);
        this.e.fx.burst(p.x, p.y, '#7ed6df', 8, 130);
        this.checkDone();
        return;
      }
    }
  }
}
