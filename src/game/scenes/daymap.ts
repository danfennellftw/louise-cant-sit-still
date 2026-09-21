import { Engine, Scene, W, H, rr } from '../engine';
import type { DayPhase } from '../state';
import { Button, tapButtons, font, headline } from '../ui';

export interface Chapter {
  scene: string;
  label: string;
  place: string;
  color: string;
  phase: DayPhase;
  time: string;
}

export const CHAPTERS: Chapter[] = [
  { scene: 'morning', label: 'Morning Dog Chaos', place: 'the condo', color: '#ff8c42', phase: 'morning', time: '6 AM' },
  { scene: 'gym', label: 'Gym Hop', place: 'Shredz / Crunch / EOS', color: '#ff5f6d', phase: 'morning', time: '8 AM' },
  { scene: 'work', label: 'The Sitting Olympics', place: 'home office', color: '#5b8c6e', phase: 'noon', time: '10 AM' },
  { scene: 'putter', label: 'The Puttering Hours', place: 'all over OC', color: '#e6a23c', phase: 'afternoon', time: '2 PM' },
  { scene: 'spin', label: 'Grit Cycle', place: 'Dana Point — always last', color: '#c0605e', phase: 'evening', time: '6:30 PM' },
  { scene: 'winddown', label: 'Wind-down YouTube', place: 'in bed, then dog duty', color: '#8e7cc3', phase: 'night', time: '9 PM' },
];

export function travelLabel(c: Chapter): string {
  return `${c.label} — ${c.place}`;
}

/** Day timeline: see the whole structure, jump to any beat. */
export class DayMapScene implements Scene {
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
        x: W / 2 - 100,
        y: 716,
        w: 200,
        h: 56,
        label: 'BACK',
        color: '#8a8794',
        onTap: () => this.e.go(this.e.state.resumeScene || 'title'),
      }),
    ];
  }

  update(dt: number): void {
    this.t += dt;
  }

  draw(g: CanvasRenderingContext2D): void {
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2b2d5e');
    grad.addColorStop(0.5, '#6a5c9e');
    grad.addColorStop(1, '#ff9a76');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    headline(g, "LOUISE'S DAY", W / 2, 56, 34, '#fff3dd');
    g.font = font(13, 500);
    g.fillStyle = 'rgba(255,243,221,0.85)';
    g.textAlign = 'center';
    g.fillText('tap any beat to jump there — chaos is non-linear', W / 2, 92);

    // timeline spine
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(64, 140);
    g.lineTo(64, 140 + (CHAPTERS.length - 1) * 96);
    g.stroke();

    const cur = this.e.state.currentChapter;
    const done = this.e.state.chaptersDone;
    CHAPTERS.forEach((c, i) => {
      const y = 140 + i * 96;
      const isCur = cur === c.scene;
      const isDone = done.includes(c.scene);
      const pulse = isCur ? 1 + Math.sin(this.t * 4) * 0.08 : 1;

      // node
      g.fillStyle = isDone ? '#5b8c6e' : c.color;
      g.beginPath();
      g.arc(64, y, 17 * pulse, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = isCur ? '#fff3b0' : 'rgba(255,255,255,0.6)';
      g.lineWidth = isCur ? 4 : 2;
      g.beginPath();
      g.arc(64, y, 21 * pulse, 0, Math.PI * 2);
      g.stroke();
      if (isDone) {
        g.strokeStyle = '#fff';
        g.lineWidth = 3.4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(57, y);
        g.lineTo(62, y + 5);
        g.lineTo(72, y - 6);
        g.stroke();
      }

      // card
      const cx = 104;
      const cw = W - 104 - 24;
      g.fillStyle = isCur ? 'rgba(255,243,221,0.98)' : 'rgba(255,250,242,0.88)';
      rr(g, cx, y - 34, cw, 68, 16);
      g.fill();
      if (isCur) {
        g.strokeStyle = '#fff3b0';
        g.lineWidth = 3;
        rr(g, cx + 2, y - 32, cw - 4, 64, 13);
        g.stroke();
      }
      g.fillStyle = '#4a2e33';
      g.font = font(17);
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(c.label, cx + 16, y - 10, cw - 90);
      g.font = font(12, 500);
      g.fillStyle = '#8a6a5c';
      g.fillText(c.place, cx + 16, y + 13, cw - 90);
      g.font = font(12, 600);
      g.fillStyle = c.color;
      g.textAlign = 'right';
      g.fillText(c.time, cx + cw - 14, y - 10);
      if (isCur) {
        g.fillStyle = '#c0605e';
        g.font = font(11, 600);
        g.fillText('YOU ARE HERE', cx + cw - 14, y + 13);
      } else if (isDone) {
        g.fillStyle = '#5b8c6e';
        g.font = font(11, 600);
        g.fillText('DONE', cx + cw - 14, y + 13);
      }
    });

    for (const b of this.btns) b.draw(g, this.t);
  }

  down(x: number, y: number): void {
    if (tapButtons(this.btns, x, y)) return;
    CHAPTERS.forEach((c, i) => {
      const cy = 140 + i * 96;
      if (x > 40 && x < W - 24 && Math.abs(y - cy) < 44) {
        this.e.state.nextStop = { label: travelLabel(c), scene: c.scene, phase: c.phase };
        this.e.toast(`Skipping ahead. Louise respects the hustle.`);
        this.e.go('between');
      }
    });
  }
}
