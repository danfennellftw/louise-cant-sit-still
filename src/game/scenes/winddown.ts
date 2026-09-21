import { Engine, Scene, W, H, rr } from '../engine';
import { bgBedroom, bgDownstairs } from '../art';
import { sprites, faceInCircle, drawDog, drawLouise, drawShadow } from '../sprites';
import { font, headline } from '../ui';

const VIDEOS = [
  'Michelle Choi — a week of living (very) alone',
  'Jeb from Greener Grass — new upload!!',
  'Drew Binsky — country #197',
  'skincare influencer — steps 6 through 11',
  'some influencer organizing a fridge (ASMR)',
];

type Phase = 'bed' | 'dogduty' | 'tucked';

interface Pup {
  which: 'mochi' | 'leo';
  x: number;
  y: number;
  state: 'wandering' | 'carried' | 'tucked';
  wanderT: number;
  targetX: number;
}

/**
 * The closer, two beats:
 * 1) In bed with Dan, dogs piled on the blanket, wind-down YouTube.
 * 2) The final chore — somebody has to take the dogs DOWNSTAIRS to their
 *    beds. Louise lost rock-paper-scissors. She always loses it.
 */
export class WindDownScene implements Scene {
  private e: Engine;
  private t = 0;
  private phase: Phase = 'bed';
  private vid = 0;
  private watched = 0;
  private sleepyT = -1;
  private pups: Pup[] = [];
  private carrying: Pup | null = null;
  private tuckedT = 0;

  constructor(e: Engine) {
    this.e = e;
  }

  enter(): void {
    this.t = 0;
    this.phase = 'bed';
    this.vid = 0;
    this.watched = 0;
    this.sleepyT = -1;
    this.carrying = null;
    this.e.showChill = true;
    this.e.chillDrain = 0; // the meter clocks out too
    this.e.state.chill = Math.max(this.e.state.chill, 60);
    this.e.toast('9 PM. Horizontal. The meter is off duty.');
  }

  private startDogDuty(): void {
    this.phase = 'dogduty';
    this.pups = [
      { which: 'mochi', x: 140, y: 560, state: 'wandering', wanderT: 0, targetX: 140 },
      { which: 'leo', x: 330, y: 580, state: 'wandering', wanderT: 0, targetX: 330 },
    ];
    this.e.toast('WAIT. The dogs sleep downstairs. Rock-paper-scissors: Louise lost.');
  }

  update(dt: number): void {
    this.t += dt;
    if (this.phase === 'bed' && this.sleepyT >= 0) {
      this.sleepyT += dt;
      if (this.sleepyT > 2.4) this.startDogDuty();
      return;
    }
    if (this.phase === 'dogduty') {
      for (const p of this.pups) {
        if (p.state === 'wandering') {
          p.wanderT -= dt;
          if (p.wanderT <= 0) {
            p.wanderT = 1 + Math.random() * 1.5;
            p.targetX = Math.max(70, Math.min(W - 70, p.x + (Math.random() - 0.5) * 160));
          }
          p.x += (p.targetX - p.x) * Math.min(1, dt * 2);
        }
      }
      return;
    }
    if (this.phase === 'tucked') {
      this.tuckedT += dt;
      if (this.tuckedT > 3) {
        if (!this.e.state.chaptersDone.includes('winddown')) this.e.state.chaptersDone.push('winddown');
        this.e.go('recap');
      }
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    if (this.phase === 'bed') this.drawBed(g);
    else this.drawDogDuty(g);
  }

  // ------------------------------------------------------------- in bed

  private drawBed(g: CanvasRenderingContext2D): void {
    bgBedroom(g);
    // night tint
    g.fillStyle = 'rgba(24,22,60,0.55)';
    g.fillRect(0, 0, W, H);

    headline(g, 'WIND-DOWN YOUTUBE', W / 2, 46, 25, '#fff3dd', 'rgba(20,18,50,0.85)');
    g.font = font(13, 500);
    g.fillStyle = 'rgba(255,243,221,0.85)';
    g.textAlign = 'center';
    g.fillText(
      this.sleepyT >= 0 ? 'shhh.' : `tap the TV to flip channels — ${this.watched} / 3`,
      W / 2,
      78,
    );

    // wall TV (their POV: it faces the bed)
    const flicker = 0.75 + Math.sin(this.t * 9) * 0.08 + Math.sin(this.t * 23) * 0.05;
    g.fillStyle = '#141220';
    rr(g, 90, 100, 300, 175, 10);
    g.fill();
    const tg = g.createLinearGradient(0, 110, 0, 260);
    tg.addColorStop(0, `rgba(120,160,255,${0.5 * flicker})`);
    tg.addColorStop(1, `rgba(255,140,180,${0.4 * flicker})`);
    g.fillStyle = tg;
    g.fillRect(100, 110, 280, 155);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    g.moveTo(226, 165);
    g.lineTo(226, 205);
    g.lineTo(262, 185);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(20,18,32,0.85)';
    rr(g, 100, 234, 280, 30, 6);
    g.fill();
    g.fillStyle = '#fff';
    g.font = font(12, 500);
    g.textBaseline = 'middle';
    g.fillText(VIDEOS[this.vid], 240, 249, 264);

    // the bed, seen from the footboard
    g.fillStyle = '#a97e58';
    rr(g, 50, 380, 380, 30, 10);
    g.fill();
    // mattress + blanket
    g.fillStyle = '#f6f1e7';
    rr(g, 60, 400, 360, 300, 24);
    g.fill();
    const bg2 = g.createLinearGradient(0, 470, 0, 700);
    bg2.addColorStop(0, '#8e7cc3');
    bg2.addColorStop(1, '#6a5c9e');
    g.fillStyle = bg2;
    rr(g, 60, 470, 360, 230, 24);
    g.fill();
    // blanket fold line
    g.fillStyle = 'rgba(255,255,255,0.25)';
    rr(g, 60, 470, 360, 18, 9);
    g.fill();
    // pillows
    g.fillStyle = '#fff';
    rr(g, 90, 408, 140, 52, 18);
    g.fill();
    rr(g, 250, 408, 140, 52, 18);
    g.fill();

    // Louise + Dan tucked in: heads above the blanket
    const sleepy = this.sleepyT >= 0;
    const lbob = Math.sin(this.t * 1.2) * 2;
    const dbob = Math.sin(this.t * 1.05 + 1) * 2;
    faceInCircle(g, sprites.louiseFace, 160, 448 + lbob, 46, '#ffdfe5');
    faceInCircle(g, sprites.danFace, 320, 450 + dbob, 46, '#e2f2e6');
    if (sleepy) {
      // eyelids: cheap and effective
      g.fillStyle = 'rgba(24,22,60,0.28)';
      g.beginPath();
      g.arc(160, 448 + lbob, 46, Math.PI, 0);
      g.arc(320, 450 + dbob, 46, Math.PI, 0);
      g.fill();
    }

    // dogs piled on the blanket
    drawDog(g, 'mochi', 190, 600, 84, this.t, { rot: sleepy ? 0.4 : Math.sin(this.t * 1.4) * 0.03 });
    drawDog(g, 'leo', 300, 620, 76, this.t, { flip: true, rot: sleepy ? -0.42 : 0 });

    if (sleepy) {
      headline(g, 'SHE SAT STILL.', W / 2, 330, 30, '#fff3dd');
      g.font = font(14, 500);
      g.fillStyle = 'rgba(255,243,221,0.9)';
      g.fillText('(technically she is asleep, but it counts)', W / 2, 362);
      for (let i = 0; i < 3; i++) {
        const zt = (this.t * 0.8 + i * 0.4) % 1.4;
        g.globalAlpha = Math.max(0, 1 - zt);
        g.font = font(17 + i * 5);
        g.fillText('z', 150 + i * 20 + zt * 12, 420 - zt * 50);
        g.globalAlpha = 1;
      }
    }
  }

  // -------------------------------------------------- dogs go downstairs

  private bedSpot(which: 'mochi' | 'leo'): [number, number] {
    return which === 'mochi' ? [120, 690] : [360, 690];
  }

  private drawDogDuty(g: CanvasRenderingContext2D): void {
    bgDownstairs(g);
    g.fillStyle = 'rgba(24,22,60,0.35)';
    g.fillRect(0, 0, W, H);

    headline(g, 'FINAL CHORE: DOG BEDTIME', W / 2, 46, 24, '#fff3dd', 'rgba(20,18,50,0.85)');
    g.font = font(13, 500);
    g.fillStyle = 'rgba(255,243,221,0.9)';
    g.textAlign = 'center';
    g.fillText(
      this.phase === 'tucked'
        ? 'goodnight, gentlemen.'
        : this.carrying
          ? `carrying ${this.carrying.which === 'mochi' ? 'Mochi' : 'Leo'} — tap his bed!`
          : 'tap a pup to scoop him up',
      W / 2,
      78,
    );

    // dog beds
    for (const which of ['mochi', 'leo'] as const) {
      const [bx, by] = this.bedSpot(which);
      g.fillStyle = which === 'mochi' ? '#c9705f' : '#5b8c6e';
      g.beginPath();
      g.ellipse(bx, by, 62, 26, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.beginPath();
      g.ellipse(bx, by, 44, 16, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,243,221,0.85)';
      g.font = font(11, 600);
      g.fillText(which === 'mochi' ? "MOCHI'S BED" : "LEO'S BED", bx, by + 40);
    }

    // Louise (carrying a pup rides along)
    const lx = this.carrying ? this.carrying.x : W / 2;
    drawLouise(g, lx, 500, 190, this.t, { rot: this.carrying ? 0.05 : 0 });

    for (const p of this.pups) {
      if (p.state === 'carried') {
        p.x = lx - 30;
        drawDog(g, p.which, lx - 30, 420, 74, this.t, { rot: Math.sin(this.t * 4) * 0.08 });
      } else if (p.state === 'wandering') {
        drawDog(g, p.which, p.x, p.y, 88, this.t, { trot: this.t * 7, flip: p.targetX < p.x });
      } else {
        const [bx, by] = this.bedSpot(p.which);
        drawShadow(g, bx, by + 4, 60);
        drawDog(g, p.which, bx, by + 2, 74, this.t, { rot: p.which === 'mochi' ? 0.45 : -0.45 });
      }
    }

    if (this.phase === 'tucked') {
      headline(g, 'EVERYONE IS ASLEEP', W / 2, 300, 30, '#fff3dd');
      g.font = font(14, 500);
      g.fillStyle = 'rgba(255,243,221,0.9)';
      g.fillText('day: complete. louise: horizontal. miracle: achieved.', W / 2, 336);
    }
  }

  down(x: number, y: number): void {
    if (this.phase === 'bed') {
      if (this.sleepyT >= 0) return;
      if (x > 80 && x < 400 && y > 90 && y < 280) {
        this.watched++;
        this.e.state.stats.videosWatched = this.watched;
        this.vid = (this.vid + 1) % VIDEOS.length;
        this.e.fx.sparkle(x, y, '#8fa8ff');
        if (this.watched === 1) this.e.toast('Video abandoned at 40%. She flips. Dan says nothing.');
        if (this.watched === 2) this.e.toast('Another flip. Finishing a video is for other people.');
        if (this.watched >= 3) {
          this.sleepyT = 0;
          this.e.fx.hearts(W / 2, 500, 10);
        }
      }
      return;
    }
    if (this.phase !== 'dogduty') return;
    if (this.carrying) {
      const [bx, by] = this.bedSpot(this.carrying.which);
      if (Math.hypot(x - bx, y - by) < 90) {
        this.carrying.state = 'tucked';
        this.e.fx.hearts(bx, by - 30, 7);
        this.e.bumpChill(8);
        this.e.toast(this.carrying.which === 'mochi' ? 'Mochi: deployed. Instant snoring.' : 'Leo: tucked. Plotting tomorrow already.');
        this.carrying = null;
        if (this.pups.every((p) => p.state === 'tucked')) {
          this.phase = 'tucked';
          this.tuckedT = 0;
          this.e.fx.confetti(W / 2, 350, 40);
        }
      } else {
        const [obx, oby] = this.bedSpot(this.carrying.which === 'mochi' ? 'leo' : 'mochi');
        if (Math.hypot(x - obx, y - oby) < 90) {
          this.e.toast('Wrong bed. They have OPINIONS about this.');
        }
      }
      return;
    }
    for (const p of this.pups) {
      if (p.state === 'wandering' && Math.hypot(x - p.x, y - (p.y - 30)) < 75) {
        p.state = 'carried';
        this.carrying = p;
        this.e.fx.sparkle(p.x, p.y - 40, '#fff3b0');
        return;
      }
    }
  }
}
