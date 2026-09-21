import { Engine, Scene, W, rr } from '../engine';
import { bgTitle } from '../art';
import { sprites, faceInCircle, drawDog, drawDan } from '../sprites';
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
        x: W / 2 - 120,
        y: 616,
        w: 240,
        h: 64,
        label: 'START THE DAY',
        sub: 'she is already up',
        color: '#ff5f6d',
        pulse: true,
        onTap: () => {
          this.e.state.nextStop = { label: 'Home — the pups are waiting', scene: 'morning', phase: 'morning' };
          this.e.go('between');
        },
      }),
      new Button({
        x: W / 2 - 95,
        y: 690,
        w: 190,
        h: 46,
        label: 'DAY MAP',
        color: '#4a6fa5',
        onTap: () => {
          this.e.state.resumeScene = 'title';
          this.e.go('daymap');
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
    faceInCircle(g, sprites.louiseFace, W / 2, 320 + bob(0), 92, '#ffdfe5');
    this.tag(g, W / 2, 424 + bob(0), 'LOUISE', 96);

    // Dan, full-body game sprite like everyone else
    drawDan(g, 86, 580 + bob(1), 190, this.t);
    this.tag(g, 86, 596 + bob(1), 'DAN');

    // dogs, full-body cuties
    drawDog(g, 'mochi', 395, 438 + bob(2), 112, this.t);
    this.tag(g, 395, 458 + bob(2), 'MOCHI');
    drawDog(g, 'leo', 398, 592 + bob(3), 104, this.t, { flip: true });
    this.tag(g, 398, 610 + bob(3), 'LEO');

    g.font = font(13, 500);
    g.fillStyle = 'rgba(255,243,221,0.85)';
    g.textAlign = 'center';
    g.fillText('a loving roast, made by Dan — best played with one restless thumb', W / 2, 762);

    for (const b of this.btns) b.draw(g, this.t);
  }

  private tag(g: CanvasRenderingContext2D, x: number, y: number, name: string, w = 76): void {
    g.fillStyle = 'rgba(36,16,23,0.7)';
    rr(g, x - w / 2, y, w, 24, 12);
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
