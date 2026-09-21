import { Engine, Scene, W, H, rr } from '../engine';
import { bgCondoLiving } from '../art';
import { drawLouise, drawDan, drawDog } from '../sprites';
import { font, headline } from '../ui';

const VIDEOS = [
  'Top 10 Yorkie Crimes (compilation)',
  'POV: you have 3 gym memberships',
  'Jazz for Dogs — 10 HOURS',
  'How To Sit Still (tutorial, 4 min)',
];

/**
 * The closer: wind-down YouTube on the couch with Dan and the pups.
 * The one place the sit-still meter finally gets to rest.
 */
export class WindDownScene implements Scene {
  private e: Engine;
  private t = 0;
  private vid = 0;
  private watched = 0;
  private asleepT = -1;

  constructor(e: Engine) {
    this.e = e;
  }

  enter(): void {
    this.t = 0;
    this.vid = 0;
    this.watched = 0;
    this.asleepT = -1;
    this.e.showChill = true;
    this.e.chillDrain = 0; // the meter clocks out too
    this.e.state.chill = Math.max(this.e.state.chill, 60);
    this.e.toast('9 PM. The couch. The meter is off duty.');
  }

  update(dt: number): void {
    this.t += dt;
    if (this.asleepT >= 0) {
      this.asleepT += dt;
      if (this.asleepT > 3) {
        if (!this.e.state.chaptersDone.includes('winddown')) this.e.state.chaptersDone.push('winddown');
        this.e.go('recap');
      }
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    bgCondoLiving(g, this.t);
    // night tint + TV glow
    g.fillStyle = 'rgba(24,22,60,0.55)';
    g.fillRect(0, 0, W, H);

    headline(g, 'WIND-DOWN YOUTUBE', W / 2, 52, 26, '#fff3dd', 'rgba(20,18,50,0.85)');
    g.font = font(13, 500);
    g.fillStyle = 'rgba(255,243,221,0.85)';
    g.textAlign = 'center';
    g.fillText(
      this.asleepT >= 0 ? 'shhh.' : `tap the TV for the next video — ${this.watched} / 3`,
      W / 2,
      86,
    );

    // TV
    const flicker = 0.75 + Math.sin(this.t * 9) * 0.08 + Math.sin(this.t * 23) * 0.05;
    g.fillStyle = '#141220';
    rr(g, 90, 130, 300, 190, 10);
    g.fill();
    const tg = g.createLinearGradient(0, 140, 0, 310);
    tg.addColorStop(0, `rgba(120,160,255,${0.5 * flicker})`);
    tg.addColorStop(1, `rgba(255,140,180,${0.4 * flicker})`);
    g.fillStyle = tg;
    g.fillRect(100, 140, 280, 170);
    // play triangle
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    g.moveTo(226, 205);
    g.lineTo(226, 245);
    g.lineTo(262, 225);
    g.closePath();
    g.fill();
    // video title bar
    g.fillStyle = 'rgba(20,18,32,0.85)';
    rr(g, 100, 276, 280, 34, 6);
    g.fill();
    g.fillStyle = '#fff';
    g.font = font(13, 500);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(VIDEOS[this.vid], 240, 293, 264);
    // TV glow on floor
    g.fillStyle = `rgba(140,160,255,${0.12 * flicker})`;
    g.beginPath();
    g.moveTo(90, 330);
    g.lineTo(390, 330);
    g.lineTo(470, 720);
    g.lineTo(10, 720);
    g.closePath();
    g.fill();

    // couch crew
    const sleepy = this.asleepT >= 0;
    drawLouise(g, 170, 660, 200, this.t, { rot: sleepy ? 0.32 : 0.1 + Math.sin(this.t * 0.9) * 0.02 });
    drawDan(g, 320, 655, 210, this.t, { rot: sleepy ? -0.1 : -0.04 });
    drawDog(g, 'mochi', 245, 668, 70, this.t, { rot: sleepy ? 0.5 : 0 });
    drawDog(g, 'leo', 90, 672, 64, this.t, { flip: true, rot: sleepy ? -0.5 : 0 });

    if (sleepy) {
      headline(g, 'SHE SAT STILL.', W / 2, 420, 32, '#fff3dd');
      g.font = font(15, 500);
      g.fillStyle = 'rgba(255,243,221,0.9)';
      g.fillText('(technically she is asleep, but it counts)', W / 2, 458);
      // z z z
      for (let i = 0; i < 3; i++) {
        const zt = (this.t * 0.8 + i * 0.4) % 1.4;
        g.globalAlpha = Math.max(0, 1 - zt);
        g.font = font(18 + i * 5);
        g.fillText('z', 200 + i * 22 + zt * 12, 520 - zt * 50);
        g.globalAlpha = 1;
      }
    }
  }

  down(x: number, y: number): void {
    if (this.asleepT >= 0) return;
    if (x > 80 && x < 400 && y > 120 && y < 330) {
      this.watched++;
      this.e.state.stats.videosWatched = this.watched;
      this.vid = (this.vid + 1) % VIDEOS.length;
      this.e.fx.sparkle(x, y, '#8fa8ff');
      if (this.watched === 1) this.e.toast('One more. Just one. (lie)');
      if (this.watched === 2) this.e.toast('Leo is snoring. Mochi is dream-running.');
      if (this.watched >= 3) {
        this.asleepT = 0;
        this.e.fx.hearts(W / 2, 600, 10);
      }
    }
  }
}
