// Leo's recurring theme: pee happens ALL DAY. A corner interrupt that pops
// during gym / work / puttering. Half the time it's a crime (mop it), half
// the time somebody used the pee pad and has EARNED A TREAT.
import type { Engine } from './engine';
import { H, rr } from './engine';
import { drawDog } from './sprites';
import { font } from './ui';

type Kind = 'pee' | 'pad';

const PEE_LINES = [
  'Leo peed. Somewhere new. He is innovating.',
  'Another puddle. He has a schedule and it is aggressive.',
  'Pee incident logged. The mop knows the way by heart.',
];
const PAD_LINES = ['PEE PAD SUCCESS. This is a certified event.', 'A lawful pee! Sound the treat alarm.'];

export class LeoPatrol {
  /** scenes flip this on/off; interrupts only spawn while enabled */
  enabled = false;

  private e: Engine;
  private t = 0;
  private nextIn = 40;
  private active: { kind: Kind; dog: 'mochi' | 'leo'; taps: number; age: number } | null = null;

  constructor(e: Engine) {
    this.e = e;
  }

  reset(): void {
    this.active = null;
    this.nextIn = 35 + Math.random() * 25;
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.enabled) return;
    if (!this.active) {
      this.nextIn -= dt;
      if (this.nextIn <= 0) {
        const kind: Kind = Math.random() < 0.55 ? 'pee' : 'pad';
        // pee is always Leo (it's his theme); pad success can be either pup
        const dog = kind === 'pee' ? 'leo' : Math.random() < 0.5 ? 'mochi' : 'leo';
        this.active = { kind, dog, taps: 0, age: 0 };
        this.e.toast(
          kind === 'pee'
            ? PEE_LINES[Math.floor(Math.random() * PEE_LINES.length)]
            : PAD_LINES[Math.floor(Math.random() * PAD_LINES.length)],
        );
      }
      return;
    }
    this.active.age += dt;
    // pad successes expire if the treat window is missed; puddles wait forever
    if (this.active.kind === 'pad' && this.active.age > 6) {
      this.e.toast('Treat window missed. They will remember this.');
      this.done();
    }
  }

  private done(): void {
    this.active = null;
    this.nextIn = 40 + Math.random() * 30;
  }

  draw(g: CanvasRenderingContext2D): void {
    if (!this.enabled || !this.active) return;
    const a = this.active;
    const x = 64;
    const y = H - 30;
    const pop = Math.min(1, a.age / 0.25);
    g.save();
    g.globalAlpha = pop;

    if (a.kind === 'pee') {
      // puddle shrinks with mops
      g.fillStyle = 'rgba(240,220,90,0.8)';
      g.beginPath();
      g.ellipse(x, y, 30 - a.taps * 8, 11 - a.taps * 3, 0, 0, Math.PI * 2);
      g.fill();
    } else {
      // pee pad
      g.fillStyle = '#dfeef5';
      rr(g, x - 34, y - 14, 68, 22, 6);
      g.fill();
      g.strokeStyle = '#9db8c4';
      g.lineWidth = 2;
      rr(g, x - 28, y - 10, 56, 14, 4);
      g.stroke();
    }
    drawDog(g, a.dog, x + 6, y - 6, 66 * pop, this.t, {
      rot: a.kind === 'pad' ? Math.sin(this.t * 8) * 0.06 : 0,
    });

    // bubble
    const label = a.kind === 'pee' ? `MOP (${a.taps} / 3)` : 'TREAT!';
    const pulse = 1 + Math.sin(this.t * 8) * 0.05;
    g.translate(x, y - 92);
    g.scale(pulse, pulse);
    g.fillStyle = a.kind === 'pee' ? '#e6a23c' : '#5b8c6e';
    rr(g, -46, -20, 92, 40, 14);
    g.fill();
    g.fillStyle = '#fff';
    g.font = font(15);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 0, 1);
    g.restore();
  }

  /** returns true if the tap was consumed by the interrupt */
  tryTap(x: number, y: number): boolean {
    if (!this.enabled || !this.active) return false;
    if (x > 130 || y < H - 125) return false;
    const a = this.active;
    if (a.kind === 'pee') {
      a.taps++;
      this.e.fx.puff(64, H - 40, 'rgba(200,240,255,0.8)');
      if (a.taps >= 3) {
        this.e.state.stats.peesMopped++;
        this.e.bumpChill(6);
        this.e.fx.sparkle(64, H - 50, '#bff0c8');
        this.e.toast(`Mopped. Daily pee count: ${this.e.state.stats.peesMopped}. He is proud.`);
        this.done();
      }
    } else {
      this.e.state.stats.treatsGiven++;
      this.e.bumpChill(12);
      this.e.fx.hearts(70, H - 90, 8);
      this.e.toast(`${a.dog === 'mochi' ? 'Mochi' : 'Leo'} gets a treat. Justice. Balance. Snacks.`);
      this.done();
    }
    return true;
  }

  static hitZone(x: number, y: number): boolean {
    return x <= 130 && y >= H - 125;
  }
}
