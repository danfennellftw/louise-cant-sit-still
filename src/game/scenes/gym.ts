import { Engine, Scene, W, H, rr } from '../engine';
import { bgGym, dumbbell } from '../art';
import { drawLouise } from '../sprites';
import { Button, tapButtons, font, drawMeter, drawPanel, headline } from '../ui';

interface GymInfo {
  id: string;
  name: string;
  place: string;
  accent: string;
}

const GYMS: GymInfo[] = [
  { id: 'shredz', name: 'SHREDZ', place: 'Ladera Ranch', accent: '#ff5f6d' },
  { id: 'crunch', name: 'CRUNCH', place: 'San Clemente', accent: '#7ed6df' },
  { id: 'eos', name: 'EOS FITNESS', place: 'Rancho Santa Margarita', accent: '#f8a5c2' },
];

/**
 * Chapter 2: pick a gym, bang out reps by tapping LEFT/RIGHT alternately,
 * then optionally hop to the next gym because one is never enough.
 */
export class GymScene implements Scene {
  private e: Engine;
  private t = 0;
  private phase: 'pick' | 'reps' | 'hop' = 'pick';
  private gym: GymInfo = GYMS[0];
  private reps = 0;
  private target = 16;
  private side: 'L' | 'R' = 'L';
  private lift = 0; // 0..1 arm raise anim
  private combo = 0;
  private lastTap = 0;
  private btns: Button[] = [];

  constructor(e: Engine) {
    this.e = e;
  }

  enter(): void {
    this.t = 0;
    this.phase = 'pick';
    this.e.showChill = true;
    this.e.chillDrain = 3;
    this.buildPickButtons();
    this.e.toast('One workout is a warmup. Everyone knows this.');
  }

  private buildPickButtons(): void {
    const visited = this.e.state.stats.gymsVisited;
    this.btns = GYMS.filter((gy) => !visited.includes(gy.id)).map(
      (gy, i) =>
        new Button({
          x: W / 2 - 150,
          y: 300 + i * 110,
          w: 300,
          h: 88,
          label: gy.name,
          sub: gy.place,
          color: gy.accent,
          onTap: () => this.startReps(gy),
        }),
    );
  }

  private startReps(gy: GymInfo): void {
    this.gym = gy;
    this.phase = 'reps';
    this.reps = 0;
    this.combo = 0;
    this.side = 'L';
    this.lift = 0;
    this.target = 16;
    this.btns = [];
    this.e.toast(
      gy.id === 'shredz'
        ? 'SHREDZ. The sauna guys are mid-podcast. She waves anyway.'
        : `${gy.name}. She knows everyone here. Everyone.`,
    );
  }

  private startHop(): void {
    this.phase = 'hop';
    const s = this.e.state.stats;
    if (!s.gymsVisited.includes(this.gym.id)) s.gymsVisited.push(this.gym.id);
    const remaining = GYMS.filter((gy) => !s.gymsVisited.includes(gy.id));
    this.btns = [];
    if (remaining.length > 0) {
      this.btns.push(
        new Button({
          x: W / 2 - 150,
          y: 470,
          w: 300,
          h: 74,
          label: 'HOP TO ANOTHER GYM',
          sub: 'obviously',
          color: '#ff8c42',
          pulse: true,
          onTap: () => {
            this.phase = 'pick';
            this.buildPickButtons();
            this.e.toast('Gym hop engaged. This is normal behavior.');
          },
        }),
      );
    }
    this.btns.push(
      new Button({
        x: W / 2 - 150,
        y: remaining.length > 0 ? 560 : 490,
        w: 300,
        h: 64,
        label: remaining.length > 0 ? "THAT'S ENOUGH (lol)" : 'ALL THREE. A DYNASTY.',
        color: '#5b8c6e',
        onTap: () => {
          this.e.bumpChill(30);
          if (!this.e.state.chaptersDone.includes('gym')) this.e.state.chaptersDone.push('gym');
          this.e.state.nextStop = { label: 'Work — the sitting Olympics', scene: 'work', phase: 'noon' };
          this.e.go('between');
        },
      }),
    );
  }

  update(dt: number): void {
    this.t += dt;
    this.lift = Math.max(0, this.lift - dt * 4);
    if (this.phase === 'reps' && this.t - this.lastTap > 2 && this.reps > 0 && Math.random() < dt * 0.5) {
      this.e.toast('The dumbbell is waiting. It has feelings.');
      this.lastTap = this.t;
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    bgGym(g, this.gym.accent);
    if (this.phase === 'pick') {
      drawPanel(g, W / 2 - 170, 130, 340, 120);
      headline(g, 'GYM O CLOCK', W / 2, 172, 30, '#4a2e33', 'rgba(255,255,255,0)');
      g.font = font(14, 500);
      g.fillStyle = '#6b463c';
      g.textAlign = 'center';
      g.fillText('pick a gym (you can hop after, she always does)', W / 2, 212);
      for (const b of this.btns) b.draw(g, this.t);
      return;
    }

    // neon gym name
    g.save();
    g.shadowColor = this.gym.accent;
    g.shadowBlur = 16;
    headline(g, this.gym.name, W / 2, 60, 36, this.gym.accent, 'rgba(0,0,0,0.6)');
    g.restore();
    g.font = font(13, 500);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.textAlign = 'center';
    g.fillText(this.gym.place, W / 2, 92);

    if (this.phase === 'reps') {
      drawMeter(g, W / 2 - 130, 116, 260, 20, this.reps / this.target, this.gym.accent, `${this.reps} / ${this.target} reps`);

      // Louise mid-workout: lean toward active side + dumbbells
      const lean = (this.side === 'L' ? -1 : 1) * this.lift * 0.12;
      drawLouise(g, W / 2, 560, 250, this.t, { rot: lean, squash: 1 + this.lift * 0.04 });
      const dy = 430 - this.lift * 60;
      dumbbell(g, W / 2 - 105, this.side === 'L' ? dy : 430, 1, this.gym.accent);
      dumbbell(g, W / 2 + 105, this.side === 'R' ? dy : 430, 1, this.gym.accent);

      // tap zones
      for (const s of ['L', 'R'] as const) {
        const active = this.side === s;
        const x = s === 'L' ? 20 : W / 2 + 10;
        g.fillStyle = active ? `${this.gym.accent}` : 'rgba(255,255,255,0.08)';
        g.globalAlpha = active ? 0.85 : 0.5;
        rr(g, x, 620, W / 2 - 30, 120, 20);
        g.fill();
        g.globalAlpha = 1;
        g.fillStyle = active ? '#241017' : 'rgba(255,255,255,0.45)';
        g.font = font(26);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(active ? 'TAP!' : s === 'L' ? 'LEFT' : 'RIGHT', x + (W / 2 - 30) / 2, 680);
      }
      if (this.combo >= 6) {
        headline(g, `COMBO x${this.combo}`, W / 2, 170, 24, '#fff3b0');
      }
    } else {
      drawLouise(g, W / 2, 430, 240, this.t, { squash: 1.02 });
      headline(g, 'CRUSHED IT', W / 2, 140, 40, '#fff3dd');
      g.font = font(15, 500);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.textAlign = 'center';
      g.fillText(`${this.e.state.stats.reps} lifetime reps today and counting`, W / 2, 180);
      for (const b of this.btns) b.draw(g, this.t);
    }
  }

  down(x: number, y: number): void {
    if (this.phase !== 'reps') {
      tapButtons(this.btns, x, y);
      return;
    }
    if (y < 600) return;
    const tapped: 'L' | 'R' = x < W / 2 ? 'L' : 'R';
    if (tapped === this.side) {
      this.reps++;
      this.combo++;
      this.e.state.stats.reps++;
      this.lift = 1;
      this.lastTap = this.t;
      this.side = this.side === 'L' ? 'R' : 'L';
      this.e.bumpChill(2.5);
      this.e.fx.burst(x, y, this.gym.accent, 6, 120);
      if (this.combo === 10) this.e.toast('Form: immaculate. Witnesses: everyone.');
      if (this.reps >= this.target) {
        this.e.fx.confetti(W / 2, 300, 40);
        this.startHop();
      }
    } else {
      this.combo = 0;
      this.e.fx.puff(x, y, 'rgba(255,120,120,0.6)');
    }
    void H;
  }
}
