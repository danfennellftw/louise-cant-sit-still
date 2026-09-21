import { Engine, Scene, W, H, rr } from '../engine';
import { bgTitle } from '../art';
import { drawLouiseHead, drawDanHead, drawMochiHead, drawLeoHead } from '../characters';
import { Button, tapButtons, font, headline } from '../ui';

export class TitleScene implements Scene {
  private e: Engine;
  private t = 0;
  private btns: Button[] = [];

  constructor(e: Engine) {
    this.e = e;
  }

  enter(): void {
    this.t = 0;
    this.e.showChill = false;
    this.e.state.reset();
    this.btns = [
      new Button({
        x: W / 2 - 130,
        y: 620,
        w: 260,
        h: 64,
        label: 'START THE DAY',
        sub: 'she is already up',
        color: '#ff5f6d',
        pulse: true,
        onTap: () => {
          this.e.state.nextStop = { label: 'Home — feed the pups', scene: 'morning', phase: 'morning' };
          this.e.go('between');
        },
      }),
    ];
  }

  update(dt: number): void {
    this.t += dt;
    if (Math.random() < dt * 1.5) {
      this.e.fx.sparkle(40 + Math.random() * (W - 80), 90 + Math.random() * 300);
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    bgTitle(g, this.t);

    headline(g, 'LOUISE', W / 2, 96, 58, '#fff3dd');
    headline(g, "CAN'T SIT STILL", W / 2, 148, 40, '#ffd9a0');
    g.font = font(15, 500);
    g.fillStyle = 'rgba(255,243,221,0.9)';
    g.textAlign = 'center';
    g.fillText('one chaotic Orange County day', W / 2, 186);

    // character portrait cards
    const bob = (i: number) => Math.sin(this.t * 2.2 + i) * 5;
    this.card(g, W / 2 - 105, 268 + bob(0), 210, 230, 'LOUISE', '#ffdfe5');
    drawLouiseHead(g, W / 2, 352 + bob(0), 2.1, { glasses: true, headband: true, mood: 'grin' });

    this.card(g, 22, 300 + bob(1), 120, 140, 'MOCHI', '#fff4de');
    drawMochiHead(g, 82, 356 + bob(1), 0.94);

    this.card(g, W - 142, 300 + bob(2), 120, 140, 'LEO', '#e8ecff');
    drawLeoHead(g, W - 82, 358 + bob(2), 1);

    this.card(g, W / 2 - 60, 508 + bob(3), 120, 92, 'DAN', '#e2f2e6');
    drawDanHead(g, W / 2, 552 + bob(3), 0.95);

    g.font = font(13, 500);
    g.fillStyle = 'rgba(255,243,221,0.85)';
    g.textAlign = 'center';
    g.fillText('a loving roast, made by Dan', W / 2, 716);
    g.fillText('best played with one restless thumb', W / 2, 736);

    for (const b of this.btns) b.draw(g, this.t);
  }

  private card(
    g: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    name: string,
    color: string,
  ): void {
    g.fillStyle = 'rgba(36,16,23,0.35)';
    rr(g, x, y + 6, w, h, 20);
    g.fill();
    g.fillStyle = color;
    rr(g, x, y, w, h, 20);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 3;
    rr(g, x + 3, y + 3, w - 6, h - 6, 16);
    g.stroke();
    g.fillStyle = '#4a2e33';
    g.font = font(Math.min(17, h * 0.14));
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(name, x + w / 2, y + h - Math.min(20, h * 0.14));
  }

  down(x: number, y: number): void {
    tapButtons(this.btns, x, y);
  }
}
