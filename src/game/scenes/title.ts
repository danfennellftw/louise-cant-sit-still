import { Engine, Scene, W, rr } from '../engine';
import { bgTitle } from '../art';
import { sprites, faceInCircle, drawDog } from '../sprites';
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
        x: W / 2 - 135,
        y: 630,
        w: 270,
        h: 66,
        label: 'START THE DAY',
        sub: 'she is already up',
        color: '#ff5f6d',
        pulse: true,
        onTap: () => {
          this.e.state.nextStop = { label: 'Home — the pups are waiting', scene: 'morning', phase: 'morning' };
          this.e.go('between');
        },
      }),
    ];
  }

  update(dt: number): void {
    this.t += dt;
    if (Math.random() < dt * 1.5) {
      this.e.fx.sparkle(40 + Math.random() * (W - 80), 90 + Math.random() * 320);
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    bgTitle(g, this.t);

    headline(g, 'LOUISE', W / 2, 92, 60, '#fff3dd');
    headline(g, "CAN'T SIT STILL", W / 2, 146, 40, '#ffd9a0');
    g.font = font(15, 500);
    g.fillStyle = 'rgba(255,243,221,0.92)';
    g.textAlign = 'center';
    g.fillText('one chaotic Orange County day', W / 2, 184);

    const bob = (i: number) => Math.sin(this.t * 2.1 + i * 1.7) * 5;

    // hero portrait: Louise
    this.nameplate(g, W / 2, 238 + bob(0), 96, 'LOUISE', '#ff5f6d');
    faceInCircle(g, sprites.louiseFace, W / 2, 330 + bob(0), 92, '#ffdfe5');

    // Dan portrait
    this.nameplate(g, 92, 356 + bob(1), 54, 'DAN', '#5b8c6e');
    faceInCircle(g, sprites.danFace, 92, 412 + bob(1), 52, '#e2f2e6');

    // dogs, full-body cuties
    drawDog(g, 'mochi', 390, 470 + bob(2), 120, this.t);
    drawDog(g, 'leo', 96, 580 + bob(3), 110, this.t, { flip: true });
    this.tag(g, 390, 492 + bob(2), 'MOCHI');
    this.tag(g, 96, 602 + bob(3), 'LEO');

    g.font = font(13, 500);
    g.fillStyle = 'rgba(255,243,221,0.85)';
    g.textAlign = 'center';
    g.fillText('a loving roast, made by Dan', W / 2, 726);
    g.fillText('best played with one restless thumb', W / 2, 746);

    for (const b of this.btns) b.draw(g, this.t);
  }

  private nameplate(g: CanvasRenderingContext2D, x: number, y: number, r: number, name: string, color: string): void {
    g.fillStyle = color;
    rr(g, x - r * 0.7, y + r * 1.72, r * 1.4, 26, 13);
    g.fill();
    g.fillStyle = '#fff';
    g.font = font(15);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(name, x, y + r * 1.72 + 14);
  }

  private tag(g: CanvasRenderingContext2D, x: number, y: number, name: string): void {
    g.fillStyle = 'rgba(36,16,23,0.7)';
    rr(g, x - 38, y, 76, 24, 12);
    g.fill();
    g.fillStyle = '#ffe9d6';
    g.font = font(14);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(name, x, y + 13);
  }

  down(x: number, y: number): void {
    tapButtons(this.btns, x, y);
  }
}
