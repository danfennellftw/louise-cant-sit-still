import { Engine, Scene, W, H, rr } from '../engine';
import { bgSpinStudio } from '../art';
import { drawSprite, sprites, drawShadow } from '../sprites';
import { font, drawMeter, headline } from '../ui';

interface Note {
  y: number;
  hit: boolean;
  judged: boolean;
}

const ZONE_Y = 600;
const SONG_LEN = 42;

/**
 * Chapter 5, the finale: Grit Cycle in Dana Point. Every day. Tap on the
 * beat, wave at classmates who absolutely do not wave back, finish strong.
 */
export class SpinScene implements Scene {
  private e: Engine;
  private t = 0;
  private notes: Note[] = [];
  private spawnIn = 0.4;
  private interval = 1.1;
  private combo = 0;
  private score = 0;
  private rpm = 60;
  private waveWindow = -1;
  private waved = 0;
  private waveEvents = [12, 26];
  private nextWave = 0;
  private judgeText = '';
  private judgeT = 0;
  private overT = -1;

  constructor(e: Engine) {
    this.e = e;
  }

  enter(): void {
    this.t = 0;
    this.notes = [];
    this.spawnIn = 1;
    this.interval = 1.1;
    this.combo = 0;
    this.score = 0;
    this.rpm = 60;
    this.waveWindow = -1;
    this.waved = 0;
    this.nextWave = 0;
    this.overT = -1;
    this.e.showChill = true;
    this.e.chillDrain = 0; // spin is the one place she is at peace
    this.e.toast('Grit Cycle. Dana Point. Her cathedral.');
  }

  update(dt: number): void {
    this.t += dt;
    if (this.overT >= 0) {
      this.overT += dt;
      if (this.overT > 3) {
        this.e.state.stats.spinScore = this.score;
        if (!this.e.state.chaptersDone.includes('spin')) this.e.state.chaptersDone.push('spin');
        this.e.state.nextStop = { label: 'Home — wind-down YouTube', scene: 'winddown', phase: 'night' };
        this.e.go('between');
      }
      return;
    }
    if (this.t >= SONG_LEN) {
      this.overT = 0;
      this.e.fx.confetti(W / 2, 300, 70);
      this.e.fx.confetti(W / 2, 500, 50);
      this.e.toast('She finishes. She always finishes.');
      return;
    }

    // notes
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.interval = Math.max(0.55, this.interval - 0.02);
      this.spawnIn = this.interval;
      this.notes.push({ y: -30, hit: false, judged: false });
    }
    const speed = 260;
    for (const n of this.notes) {
      n.y += speed * dt;
      if (!n.judged && !n.hit && n.y > ZONE_Y + 50) {
        n.judged = true;
        this.combo = 0;
        this.rpm = Math.max(50, this.rpm - 6);
      }
    }
    this.notes = this.notes.filter((n) => n.y < H + 40);

    // wave events
    if (this.nextWave < this.waveEvents.length && this.t >= this.waveEvents[this.nextWave] && this.waveWindow < 0) {
      this.waveWindow = 3;
    }
    if (this.waveWindow >= 0) {
      this.waveWindow -= dt;
      if (this.waveWindow < 0) {
        this.nextWave++;
        this.e.toast('Window closed. They remain unwaved-at.');
      }
    }

    this.judgeT = Math.max(0, this.judgeT - dt);
    this.rpm = Math.min(140, Math.max(50, this.rpm + (this.combo > 4 ? dt * 4 : -dt * 2)));
  }

  draw(g: CanvasRenderingContext2D): void {
    bgSpinStudio(g, this.t);

    headline(g, 'GRIT CYCLE', W / 2, 46, 30, '#ff5f6d', 'rgba(0,0,0,0.7)');
    g.font = font(12, 500);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.textAlign = 'center';
    g.fillText('DANA POINT — 6:30 PM RIDE (she has never missed one)', W / 2, 74);

    const songFrac = Math.min(1, this.t / SONG_LEN);
    drawMeter(g, W / 2 - 130, 88, 260, 14, songFrac, '#7ed6df');
    g.font = font(13, 600);
    g.fillStyle = '#fff';
    g.fillText(`RPM ${Math.round(this.rpm)}   score ${this.score}   combo ${this.combo}`, W / 2, 122);

    // classmates: silhouette riders who do not care
    for (let i = 0; i < 3; i++) {
      const cx = 90 + i * 150;
      this.drawRiderSilhouette(g, cx, 320, 0.55, this.t * (5 + i));
    }

    // Louise on her bike, front and center
    this.drawLouiseBike(g, W / 2, 560, this.t * (this.rpm / 12));

    // note lane
    const laneX = W - 70;
    g.fillStyle = 'rgba(255,255,255,0.06)';
    rr(g, laneX - 34, 0, 68, H, 0);
    g.fill();
    // hit zone
    const zonePulse = 1 + Math.sin(this.t * 6) * 0.05;
    g.strokeStyle = '#ff5f6d';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(laneX, ZONE_Y, 30 * zonePulse, 0, Math.PI * 2);
    g.stroke();
    for (const n of this.notes) {
      if (n.hit) continue;
      g.fillStyle = n.judged ? 'rgba(255,255,255,0.25)' : '#7ed6df';
      g.beginPath();
      g.arc(laneX, n.y, 20, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath();
      g.arc(laneX - 6, n.y - 6, 5, 0, Math.PI * 2);
      g.fill();
    }
    g.font = font(11, 600);
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.fillText('TAP', laneX, ZONE_Y + 52);

    // judge text
    if (this.judgeT > 0) {
      g.globalAlpha = Math.min(1, this.judgeT / 0.2);
      headline(g, this.judgeText, W / 2, 200, 30, this.judgeText === 'PERFECT' ? '#fff3b0' : '#bfe8f0');
      g.globalAlpha = 1;
    }

    // wave button
    if (this.waveWindow >= 0 && this.overT < 0) {
      const pulse = 1 + Math.sin(this.t * 10) * 0.05;
      g.save();
      g.translate(110, 640);
      g.scale(pulse, pulse);
      g.fillStyle = '#f8a5c2';
      rr(g, -80, -40, 160, 80, 18);
      g.fill();
      g.fillStyle = '#4a2e33';
      g.font = font(19);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('WAVE AT', 0, -12);
      g.fillText('CLASSMATES', 0, 12);
      g.restore();
    }

    if (this.overT >= 0) {
      headline(g, 'FINAL SPRINT: SURVIVED', W / 2, 250, 30, '#fff3dd');
      g.font = font(15, 500);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillText('same time tomorrow. and the day after. forever.', W / 2, 292);
    }
  }

  private drawRiderSilhouette(g: CanvasRenderingContext2D, x: number, y: number, s: number, pedal: number): void {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = 'rgba(20,16,32,0.9)';
    // bike base
    rr(g, -40, -8, 80, 10, 5);
    g.fill();
    g.beginPath();
    g.arc(22, -30, 16, 0, Math.PI * 2);
    g.fill();
    // rider blob
    g.beginPath();
    g.ellipse(-6, -64, 16, 26, 0.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(14, -88, 12, 0, Math.PI * 2);
    g.fill();
    // pedaling feet
    const px = -2 + Math.cos(pedal) * 10;
    const py = -26 + Math.sin(pedal) * 10;
    g.beginPath();
    g.arc(px, py, 5, 0, Math.PI * 2);
    g.arc(-2 - Math.cos(pedal) * 10, -26 - Math.sin(pedal) * 10, 5, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  private drawLouiseBike(g: CanvasRenderingContext2D, x: number, y: number, pedal: number): void {
    drawShadow(g, x, y + 8, 220);
    // Louise leaning into the ride (sprite tilted forward, bobbing with cadence)
    const bob = Math.sin(pedal) * 4;
    drawSprite(g, sprites.louise, x - 14, y - 40 + bob, 230, { rot: 0.3 + Math.sin(pedal) * 0.02 });
    // spin bike drawn over her lower half
    g.strokeStyle = '#1d1d28';
    g.lineWidth = 10;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x - 80, y);
    g.lineTo(x + 80, y);
    g.stroke();
    g.beginPath();
    g.moveTo(x - 56, y);
    g.lineTo(x - 10, y - 70);
    g.moveTo(x + 54, y);
    g.lineTo(x + 16, y - 74);
    g.stroke();
    // flywheel
    g.fillStyle = '#2c2c3a';
    g.beginPath();
    g.arc(x + 52, y - 44, 30, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#c22c3a';
    g.beginPath();
    g.arc(x + 52, y - 44, 11, 0, Math.PI * 2);
    g.fill();
    // pedals spinning
    const px = x + 8 + Math.cos(pedal) * 16;
    const py = y - 40 + Math.sin(pedal) * 16;
    g.strokeStyle = '#55555f';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(x + 8 - Math.cos(pedal) * 16, y - 40 - Math.sin(pedal) * 16);
    g.stroke();
    g.fillStyle = '#e8e8e8';
    g.beginPath();
    g.arc(px, py, 7, 0, Math.PI * 2);
    g.fill();
    // handlebars
    g.strokeStyle = '#1d1d28';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(x + 16, y - 74);
    g.quadraticCurveTo(x + 34, y - 96, x + 52, y - 88);
    g.stroke();
  }

  down(x: number, y: number): void {
    if (this.overT >= 0) return;
    // wave button
    if (this.waveWindow >= 0 && Math.abs(x - 110) < 85 && Math.abs(y - 640) < 44) {
      this.waveWindow = -1;
      this.nextWave++;
      this.waved++;
      this.e.state.stats.waves++;
      this.e.fx.hearts(110, 590, 6);
      this.e.toast(
        this.waved === 1
          ? 'She waves. They stare ahead. Warriors, all of them.'
          : "Waved again. Nothing. It's not personal. Probably.",
      );
      return;
    }
    // rhythm tap: nearest unjudged note to the zone
    let best: Note | null = null;
    let bestD = 999;
    for (const n of this.notes) {
      if (n.hit || n.judged) continue;
      const d = Math.abs(n.y - ZONE_Y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    if (best && bestD < 55) {
      best.hit = true;
      const perfect = bestD < 22;
      this.combo++;
      this.score += perfect ? 100 : 50;
      this.judgeText = perfect ? 'PERFECT' : 'GOOD';
      this.judgeT = 0.5;
      this.e.bumpChill(1);
      this.e.fx.burst(W - 70, ZONE_Y, perfect ? '#fff3b0' : '#7ed6df', perfect ? 14 : 8, 160);
      if (this.combo === 15) this.e.toast('Front row energy. The instructor knows her name.');
    } else {
      this.combo = 0;
      this.e.fx.puff(x, y, 'rgba(255,120,120,0.5)');
    }
  }
}
