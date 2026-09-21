import { Engine, Scene, W } from '../engine';
import { bgStreet } from '../art';
import { drawLouise, drawDog } from '../sprites';
import { Button, tapButtons, font, headline } from '../ui';

const LORE = [
  'An e-bike whizzes past. Louise rates the rider 7/10.',
  'Someone at Shredz is doing sauna talk again. She has opinions.',
  'She just smelled a candle store from 400 yards. Gift confirmed.',
  'Pee pads: restocked. Hope: eternal.',
  'She is walking 4% faster than strictly necessary.',
  'Jazz is playing in her head. It is her jazz era.',
];

/**
 * Travel beat between stops: Louise power-walks, the pups trot behind.
 * Tapping a dog = cuddle = sit-still meter refill. Never skippable dogs.
 */
export class BetweenScene implements Scene {
  private e: Engine;
  private t = 0;
  private btns: Button[] = [];
  private cuddled = { mochi: false, leo: false };

  constructor(e: Engine) {
    this.e = e;
  }

  enter(): void {
    this.t = 0;
    this.cuddled = { mochi: false, leo: false };
    this.e.showChill = true;
    this.e.chillDrain = 2.5;
    this.e.state.currentChapter = this.e.state.nextStop.scene;
    if (Math.random() < 0.6) {
      this.e.toast(LORE[Math.floor(Math.random() * LORE.length)]);
    }
    this.btns = [
      new Button({
        x: W / 2 - 120,
        y: 668,
        w: 240,
        h: 60,
        label: "LET'S GO",
        color: '#ff8c42',
        pulse: true,
        onTap: () => this.e.go(this.e.state.nextStop.scene),
      }),
    ];
  }

  update(dt: number): void {
    this.t += dt;
  }

  private louiseX(): number {
    return W / 2 - 40 + Math.sin(this.t * 0.7) * 10;
  }

  draw(g: CanvasRenderingContext2D): void {
    const stop = this.e.state.nextStop;
    bgStreet(g, this.t, stop.phase);

    const walk = this.t * 9;
    const lx = this.louiseX();
    drawLouise(g, lx, 640, 230, this.t, { walk });
    drawDog(g, 'mochi', lx - 110, 655, 92, this.t, { trot: walk * 0.9 });
    drawDog(g, 'leo', lx - 190, 662, 86, this.t, { trot: walk * 0.9 + 1.4 });

    headline(g, 'NEXT STOP', W / 2, 96, 24, '#fff3dd');
    headline(g, stop.label, W / 2, 136, 27, '#ffd9a0');

    g.font = font(14, 500);
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.textAlign = 'center';
    g.fillText('tap a pup for a cuddle (refills the meter)', W / 2, 176);

    for (const b of this.btns) b.draw(g, this.t);
  }

  down(x: number, y: number): void {
    if (tapButtons(this.btns, x, y)) return;
    const lx = this.louiseX();
    const hit = (cx: number, cy: number, r: number) => Math.hypot(x - cx, y - cy) < r;
    if (hit(lx - 110, 615, 62)) this.cuddle('mochi', lx - 110, 600);
    else if (hit(lx - 190, 625, 58)) this.cuddle('leo', lx - 190, 610);
    else if (hit(lx, 540, 90)) {
      this.e.fx.sparkle(x, y);
      this.e.toast('Louise does not have time to stand here. Obviously.');
    }
  }

  private cuddle(which: 'mochi' | 'leo', x: number, y: number): void {
    this.e.fx.hearts(x, y - 30, 9);
    this.e.bumpChill(25);
    this.e.state.stats.cuddles++;
    if (!this.cuddled[which]) {
      this.cuddled[which] = true;
      this.e.toast(
        which === 'mochi'
          ? 'Mochi cuddle. The fluff heals all restlessness.'
          : 'Leo allows one (1) cuddle. He has places to be.',
      );
    }
  }

  up(): void {}
}
