import { Engine, Scene, W } from '../engine';
import { bgTitle } from '../art';
import { sprites, faceInCircle, drawDog } from '../sprites';
import { Button, tapButtons, font, headline, drawPanel } from '../ui';

/** Day recap: the receipts of a day in which no sitting occurred. */
export class RecapScene implements Scene {
  private e: Engine;
  private t = 0;
  private btns: Button[] = [];

  constructor(e: Engine) {
    this.e = e;
  }

  enter(): void {
    this.t = 0;
    this.e.showChill = false;
    this.btns = [
      new Button({
        x: W / 2 - 120,
        y: 696,
        w: 240,
        h: 60,
        label: 'DO IT ALL AGAIN',
        sub: 'she would',
        color: '#ff5f6d',
        pulse: true,
        onTap: () => this.e.go('title'),
      }),
    ];
    this.e.fx.confetti(W / 2, 200, 50);
  }

  update(dt: number): void {
    this.t += dt;
    if (Math.random() < dt * 0.8) this.e.fx.confetti(Math.random() * W, -10, 4);
  }

  draw(g: CanvasRenderingContext2D): void {
    bgTitle(g, this.t);
    headline(g, 'DAY COMPLETE', W / 2, 66, 42, '#fff3dd');
    g.font = font(14, 500);
    g.fillStyle = 'rgba(255,243,221,0.9)';
    g.textAlign = 'center';
    g.fillText('minutes spent sitting still: approximately zero', W / 2, 104);

    const s = this.e.state.stats;
    const lines: [string, string][] = [
      ['kibble served', `${s.kibbleServed} scoops`],
      ['dog crimes handled', `${s.poopsBagged + s.peesMopped + (s.carpetScrubs > 0 ? 1 : 0)} incidents`],
      ['barstools defended', `${s.peesBlocked} saves`],
      ['pee-pad treats awarded', `${s.treatsGiven}`],
      ['parking lot honks survived', `${s.honks}`],
      ['gyms conquered', `${s.gymsVisited.length} of 3`],
      ['reps', `${s.reps}`],
      ['urges resisted / taken', `${s.urgesResisted} / ${s.urgesTaken}`],
      ['deals found', `${s.dealsFound}`],
      ['facial completed', `${s.facialPct}%`],
      ['dinner brownness', `${s.brownPct}%`],
      ['waves returned by classmates', `0 of ${s.waves}`],
      ['skincare steps completed', `${s.skincareSteps} of 5`],
      ['cuddles', `${s.cuddles}`],
      ['spontaneous laps', `${s.zoomies}`],
      ['spin score', `${s.spinScore}`],
      ['wind-down videos', `${s.videosWatched} then sleep`],
    ];

    drawPanel(g, 30, 130, W - 60, 452, 'rgba(255,250,242,0.94)');
    g.textBaseline = 'middle';
    lines.forEach(([label, value], i) => {
      const y = 156 + i * 28;
      g.font = font(14, 500);
      g.fillStyle = '#6b463c';
      g.textAlign = 'left';
      g.fillText(label, 52, y);
      g.font = font(14);
      g.fillStyle = '#c0605e';
      g.textAlign = 'right';
      g.fillText(value, W - 52, y);
      if (i < lines.length - 1) {
        g.strokeStyle = 'rgba(107,70,60,0.12)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(52, y + 14);
        g.lineTo(W - 52, y + 14);
        g.stroke();
      }
    });

    // the family
    faceInCircle(g, sprites.louiseFace, W / 2 - 80, 616, 44, '#ffdfe5');
    faceInCircle(g, sprites.danFace, W / 2 + 80, 616, 44, '#e2f2e6');
    drawDog(g, 'mochi', W / 2 - 8, 652, 62, this.t);
    drawDog(g, 'leo', W / 2 + 26, 656, 56, this.t, { flip: true });

    g.font = font(13, 500);
    g.fillStyle = 'rgba(255,243,221,0.9)';
    g.textAlign = 'center';
    g.fillText('made with love (and only brown food) — for Louise', W / 2, 682);

    for (const b of this.btns) b.draw(g, this.t);
  }

  down(x: number, y: number): void {
    tapButtons(this.btns, x, y);
  }
}
