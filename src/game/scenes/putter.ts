import { Engine, Scene, W, H, rr } from '../engine';
import { bgStore, bgSpa, bgBedroom, bgKitchen, bgCondoLiving } from '../art';
import { sprites, drawLouise, drawDog, drawDan, faceInCircle, drawShadow } from '../sprites';
import { Button, tapButtons, font, drawMeter, drawPanel, headline, wrapText } from '../ui';

interface Mini {
  update(dt: number): void;
  draw(g: CanvasRenderingContext2D): void;
  down?(x: number, y: number): void;
  move?(x: number, y: number): void;
  up?(x: number, y: number): void;
}

interface CardInfo {
  id: string;
  name: string;
  place: string;
  color: string;
  required?: boolean;
}

const CARDS: CardInfo[] = [
  { id: 'tjmaxx', name: 'Deal Hunt', place: 'TJ Maxx', color: '#e74c3c' },
  { id: 'marshalls', name: 'Deal Hunt II', place: "Marshall's", color: '#2980b9' },
  { id: 'nike', name: 'Shoe Dash', place: 'the mall — Nike', color: '#ff8c42' },
  { id: 'facial', name: 'Vampire Facial', place: 'medspa — step 6 of her 5-step routine', color: '#c0605e' },
  { id: 'massage', name: 'Massage', place: 'spa room 3', color: '#5b8c6e' },
  { id: 'bed', name: 'Make the Bed', place: 'back home (again)', color: '#8e7cc3' },
  { id: 'nina', name: 'Call Nina', place: 'facetime', color: '#f8a5c2' },
  { id: 'ai', name: 'Make an AI Friend', place: 'the internet', color: '#7ed6df' },
  { id: 'jazz', name: 'Jazz', place: 'her jazz era (venue TBD, ask Dan)', color: '#4a6fa5' },
  { id: 'brown', name: 'Brown Food Dinner', place: 'the condo kitchen', color: '#a5713f', required: true },
];

const NEED = 5;

/**
 * Chapter 4: The Puttering Hours. A hub of afternoon micro-games.
 * Finish 5 (dinner for Dan is mandatory) to unlock Grit Cycle.
 */
export class PutterScene implements Scene {
  private e: Engine;
  private t = 0;
  private mini: Mini | null = null;
  private btns: Button[] = [];
  private goBtn: Button | null = null;

  constructor(e: Engine) {
    this.e = e;
  }

  enter(): void {
    this.t = 0;
    this.mini = null;
    this.e.showChill = true;
    this.e.chillDrain = 4;
    this.buildHub();
    this.e.toast('The Puttering Hours. Her natural habitat.');
  }

  private done(): string[] {
    return this.e.state.stats.putterDone;
  }

  private buildHub(): void {
    this.btns = [];
    const doneList = this.done();
    CARDS.forEach((c, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const b = new Button({
        x: 24 + col * 220,
        y: 160 + row * 92,
        w: 212,
        h: 80,
        label: doneList.includes(c.id) ? `${c.name} ✓` : c.name,
        sub: c.place,
        color: doneList.includes(c.id) ? '#9aa38b' : c.color,
        onTap: () => this.launch(c.id),
      });
      b.enabled = !doneList.includes(c.id);
      this.btns.push(b);
    });
    const unlocked = doneList.length >= NEED && doneList.includes('brown');
    this.goBtn = new Button({
      x: W / 2 - 160,
      y: 700,
      w: 320,
      h: 66,
      label: 'GRIT CYCLE, DANA POINT',
      sub: unlocked ? 'spin ends the day. every day.' : `finish ${NEED} stops incl. dinner first`,
      color: unlocked ? '#ff5f6d' : '#8a8794',
      pulse: unlocked,
      onTap: () => {
        if (!this.e.state.chaptersDone.includes('putter')) this.e.state.chaptersDone.push('putter');
        this.e.state.nextStop = { label: 'Grit Cycle, Dana Point', scene: 'spin', phase: 'evening' };
        this.e.go('between');
      },
    });
    this.goBtn.enabled = unlocked;
  }

  private launch(id: string): void {
    const finish = (toast: string): void => {
      if (!this.done().includes(id)) this.done().push(id);
      this.mini = null;
      this.e.bumpChill(15);
      this.e.fx.confetti(W / 2, 300, 30);
      if (toast) this.e.toast(toast);
      this.buildHub();
    };
    switch (id) {
      case 'tjmaxx':
        this.mini = new DealHunt(this.e, 'TJ MAXX', '#e74c3c', finish);
        break;
      case 'marshalls':
        this.e.toast("Marshall's: legally distinct from TJ Maxx.");
        this.mini = new DealHunt(this.e, "MARSHALL'S", '#2980b9', finish);
        break;
      case 'nike':
        this.mini = new ShoeDash(this.e, finish);
        break;
      case 'facial':
        this.mini = new HoldStill(this.e, finish);
        break;
      case 'massage':
        this.mini = new Massage(this.e, finish);
        break;
      case 'bed':
        this.mini = new MakeBed(this.e, finish);
        break;
      case 'nina':
        this.mini = new Dialogue(this.e, ninaScript(), 'nina', finish);
        break;
      case 'ai':
        this.mini = new Dialogue(this.e, aiScript(), 'bot', finish);
        break;
      case 'jazz':
        this.mini = new Jazz(this.e, finish);
        break;
      case 'brown':
        this.mini = new BrownFood(this.e, finish);
        break;
      default:
        break;
    }
  }

  update(dt: number): void {
    this.t += dt;
    if (this.mini) this.mini.update(dt);
  }

  draw(g: CanvasRenderingContext2D): void {
    if (this.mini) {
      this.mini.draw(g);
      return;
    }
    // hub: warm afternoon gradient
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#ffe29a');
    grad.addColorStop(1, '#ff9d76');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    headline(g, 'THE PUTTERING HOURS', W / 2, 66, 30, '#fff', 'rgba(120,60,40,0.8)');
    g.font = font(14, 500);
    g.fillStyle = 'rgba(120,60,40,0.9)';
    g.textAlign = 'center';
    const doneCount = this.done().length;
    const dinner = this.done().includes('brown') ? 'dinner locked in' : 'dinner still owed';
    g.fillText(`${doneCount} / ${NEED} stops — ${dinner}`, W / 2, 100);
    g.fillText('restless energy must be spent somewhere', W / 2, 122);

    for (const b of this.btns) b.draw(g, this.t);
    if (this.goBtn) this.goBtn.draw(g, this.t);
  }

  down(x: number, y: number): void {
    if (this.mini) {
      this.mini.down?.(x, y);
      return;
    }
    if (this.goBtn?.hit(x, y)) return;
    tapButtons(this.btns, x, y);
  }

  move(x: number, y: number): void {
    this.mini?.move?.(x, y);
  }

  up(x: number, y: number): void {
    this.mini?.up?.(x, y);
  }
}

// ===================================================================
// Deal Hunt (TJ Maxx / Marshall's): find the red-tag steal, 3 rounds.
// ===================================================================

const ITEM_COLORS = ['#8e7cc3', '#2980b9', '#5b8c6e', '#e67e22', '#c0605e', '#7ed6df'];

class DealHunt implements Mini {
  private t = 0;
  private round = 1;
  private items: { x: number; y: number; color: number; deal: boolean; price: string }[] = [];
  private timer = 9;

  constructor(
    private e: Engine,
    private title: string,
    private accent: string,
    private finish: (toast: string) => void,
  ) {
    this.newRound();
  }

  private newRound(): void {
    this.items = [];
    this.timer = 9;
    const dealIdx = Math.floor(Math.random() * 9);
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      this.items.push({
        x: 100 + col * 140,
        y: 260 + row * 150,
        color: Math.floor(Math.random() * ITEM_COLORS.length),
        deal: i === dealIdx,
        price: i === dealIdx ? '$7.99' : `$${(20 + Math.floor(Math.random() * 60)).toFixed(2)}`,
      });
    }
  }

  update(dt: number): void {
    this.t += dt;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.e.toast('The deal got away. It happens to the best.');
      this.newRound();
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    bgStore(g, this.accent);
    g.fillStyle = '#fff';
    g.font = font(26);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(this.title, W / 2, 93);
    headline(g, `find the steal — round ${this.round} / 3`, W / 2, 150, 20, '#6b463c', 'rgba(255,255,255,0.8)');
    drawMeter(g, W / 2 - 90, 168, 180, 14, this.timer / 9, this.timer < 3 ? '#e74c3c' : this.accent);

    for (const it of this.items) {
      const bob = Math.sin(this.t * 2 + it.x) * 2;
      // hanging garment blob
      g.fillStyle = ITEM_COLORS[it.color];
      rr(g, it.x - 42, it.y - 50 + bob, 84, 92, 14);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.25)';
      rr(g, it.x - 42, it.y - 50 + bob, 84, 26, 14);
      g.fill();
      // price tag
      g.save();
      g.translate(it.x + 24, it.y + 26 + bob);
      g.rotate(0.22);
      g.fillStyle = it.deal ? '#e74c3c' : '#fdf3e0';
      rr(g, -26, -13, 52, 26, 5);
      g.fill();
      g.fillStyle = it.deal ? '#fff' : '#6b463c';
      g.font = font(12);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(it.price, 0, 0);
      g.restore();
    }
    drawLouise(g, 70, 740, 150, this.t);
  }

  down(x: number, y: number): void {
    for (const it of this.items) {
      if (Math.abs(x - it.x) < 48 && Math.abs(y - it.y) < 56) {
        if (it.deal) {
          this.e.state.stats.dealsFound++;
          this.e.fx.confetti(it.x, it.y, 20);
          if (this.round >= 3) {
            this.finish('Three steals. The clearance rack fears her.');
          } else {
            this.round++;
            this.e.toast(['$7.99!! Tell everyone.', 'Another one. Unstoppable.'][this.round - 2]);
            this.newRound();
          }
        } else {
          this.timer = Math.max(1, this.timer - 2);
          this.e.fx.puff(it.x, it.y, 'rgba(255,120,120,0.6)');
        }
        return;
      }
    }
  }
}

// ===================================================================
// Shoe Dash (Nike at the mall): tap the target shoe; Leo steals one.
// ===================================================================

class ShoeDash implements Mini {
  private t = 0;
  private round = 0;
  private target = 0;
  private shoes: { x: number; y: number; color: number }[] = [];
  private heist: 'none' | 'running' | 'caught' = 'none';
  private leoX = -80;
  private leoTaps = 0;
  private caughtT = 0;

  private colors = ['#ff5f6d', '#7ed6df', '#f8a5c2', '#5b8c6e', '#e67e22'];

  constructor(
    private e: Engine,
    private finish: (toast: string) => void,
  ) {
    this.newRound();
  }

  private newRound(): void {
    this.round++;
    this.shoes = [];
    const n = 6;
    const targetIdx = Math.floor(Math.random() * n);
    for (let i = 0; i < n; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      this.shoes.push({ x: 105 + col * 135, y: 300 + row * 140, color: Math.floor(Math.random() * this.colors.length) });
    }
    // guarantee a unique target color
    const used = new Set(this.shoes.map((s, i) => (i === targetIdx ? -1 : s.color)));
    let c = Math.floor(Math.random() * this.colors.length);
    while (used.has(c)) c = (c + 1) % this.colors.length;
    this.shoes[targetIdx].color = c;
    this.target = c;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.heist === 'running') {
      this.leoX += dt * (150 + Math.sin(this.t * 6) * 60);
      if (this.leoX > W + 80) {
        // he wins this round; loop back for another pass
        this.leoX = -80;
        this.e.toast('He lapped the store. Employees are cheering for him.');
      }
    }
    if (this.heist === 'caught') {
      this.caughtT += dt;
      if (this.caughtT > 1.6) this.finish('Shoes acquired. Leo: 0, Louise: 1. Barely.');
    }
  }

  private leoY(): number {
    return 560 + Math.sin(this.leoX * 0.03) * 40;
  }

  draw(g: CanvasRenderingContext2D): void {
    bgStore(g, '#ff8c42', '#f6efe3');
    g.fillStyle = '#fff';
    g.font = font(24);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('NIKE — SHOE DASH', W / 2, 93);

    if (this.heist === 'none') {
      headline(g, `find the matching pair — ${this.round} / 4`, W / 2, 150, 19, '#6b463c', 'rgba(255,255,255,0.8)');
      // target swatch
      g.fillStyle = '#fdf3e0';
      rr(g, W / 2 - 70, 170, 140, 56, 12);
      g.fill();
      this.drawShoe(g, W / 2, 202, this.colors[this.target], 1.1);
      for (const s of this.shoes) {
        drawShadow(g, s.x, s.y + 28, 70);
        this.drawShoe(g, s.x, s.y, this.colors[s.color], 1.5);
      }
      drawLouise(g, 60, 740, 150, this.t);
    } else {
      headline(g, this.heist === 'caught' ? 'GOTCHA' : 'LEO HAS COMMITTED A CRIME', W / 2, 170, 24, '#6b463c', 'rgba(255,255,255,0.85)');
      g.font = font(14, 500);
      g.fillStyle = '#6b463c';
      g.fillText(this.heist === 'caught' ? '' : `tap him! (${this.leoTaps} / 3)`, W / 2, 204);
      if (this.heist === 'running') {
        drawDog(g, 'leo', this.leoX, this.leoY(), 110, this.t, { trot: this.t * 16 });
        // shoe in mouth
        this.drawShoe(g, this.leoX + 34, this.leoY() - 58, this.colors[this.target], 0.8, 0.4);
        drawLouise(g, Math.max(60, this.leoX - 150), 640, 210, this.t, { walk: this.t * 10 });
      } else {
        drawLouise(g, W / 2 - 40, 640, 220, this.t);
        drawDog(g, 'leo', W / 2 + 70, 650, 100, this.t, { rot: Math.sin(this.caughtT * 3) * 0.06 });
        g.font = font(13, 500);
        g.fillStyle = '#6b463c';
        g.fillText('leo: "worth it"', W / 2 + 70, 680);
      }
    }
  }

  private drawShoe(g: CanvasRenderingContext2D, x: number, y: number, color: string, s: number, rot = 0): void {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(s, s);
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(-24, 6);
    g.quadraticCurveTo(-26, -12, -10, -14);
    g.quadraticCurveTo(2, -15, 8, -8);
    g.quadraticCurveTo(14, -2, 26, 0);
    g.quadraticCurveTo(30, 2, 28, 8);
    g.lineTo(-24, 8);
    g.closePath();
    g.fill();
    g.fillStyle = '#fff';
    rr(g, -26, 6, 56, 7, 3);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(-14, -2);
    g.quadraticCurveTo(-4, 4, 16, -2);
    g.stroke();
    g.restore();
  }

  down(x: number, y: number): void {
    if (this.heist === 'running') {
      if (Math.hypot(x - this.leoX, y - (this.leoY() - 40)) < 75) {
        this.leoTaps++;
        this.e.fx.burst(x, y, '#ff8c42', 10, 150);
        if (this.leoTaps >= 3) {
          this.heist = 'caught';
          this.caughtT = 0;
          this.e.state.stats.leoCrimes++;
          this.e.fx.hearts(this.leoX, this.leoY() - 60, 8);
        }
      }
      return;
    }
    if (this.heist === 'caught') return;
    for (const s of this.shoes) {
      if (Math.abs(x - s.x) < 55 && Math.abs(y - s.y) < 45) {
        if (s.color === this.target) {
          this.e.state.stats.shoesMatched++;
          this.e.fx.sparkle(s.x, s.y, '#fff3b0');
          if (this.round >= 4) {
            // scripted comedy: Leo appears and steals the final pair
            this.heist = 'running';
            this.leoX = -80;
            this.leoTaps = 0;
            this.e.toast('WAIT. Leo followed us to the mall?!');
          } else {
            this.newRound();
          }
        } else {
          this.e.fx.puff(s.x, s.y, 'rgba(255,120,120,0.6)');
        }
        return;
      }
    }
  }
}

// ===================================================================
// Vampire Facial: hold PERFECTLY still. Comedy fail is canon.
// ===================================================================

class HoldStill implements Mini {
  private t = 0;
  private holding = false;
  private stillness = 0; // seconds accumulated
  private need = 14;
  private itch: { text: string; t: number } | null = null;
  private nextItch = 3;
  private endT = -1;

  constructor(
    private e: Engine,
    private finish: (toast: string) => void,
  ) {
    e.toast('Steps 1-5 were bottles. This is step 6: vampire facial. DO NOT MOVE.');
  }

  update(dt: number): void {
    this.t += dt;
    if (this.endT >= 0) {
      this.endT += dt;
      if (this.endT > 1.8) {
        const pct = Math.round((this.stillness / this.need) * 100);
        this.e.state.stats.facialPct = Math.min(100, pct);
        this.finish(
          pct >= 100
            ? 'A full facial?! Historic. Scientists baffled.'
            : `${pct}% of a facial. The esthetician sighs, again.`,
        );
      }
      return;
    }
    if (this.holding && !this.itch) {
      this.stillness += dt;
      this.e.bumpChill(dt * 2);
    }
    this.nextItch -= dt;
    if (this.nextItch <= 0 && !this.itch && this.stillness > 1) {
      this.itch = { text: ['YOUR NOSE ITCHES', 'A THOUGHT ABOUT ERRANDS', 'IS THE OVEN ON?', 'PHONE BUZZED (it did not)'][Math.floor(Math.random() * 4)], t: 0 };
      this.nextItch = 3 + Math.random() * 3;
    }
    if (this.itch) {
      this.itch.t += dt;
      if (this.itch.t > 1.6) {
        // she twitched — lose a little progress
        this.stillness = Math.max(0, this.stillness - 1.4);
        this.e.shake = 6;
        this.e.toast('She twitched. Everyone in the spa felt it.');
        this.itch = null;
      }
    }
    if (this.stillness >= this.need && this.endT < 0) {
      this.endT = 0;
      this.e.fx.confetti(W / 2, 300, 40);
    }
    // hard comedy cap: at 20s total she's done regardless
    if (this.t > 26 && this.endT < 0) this.endT = 0;
  }

  draw(g: CanvasRenderingContext2D): void {
    bgSpa(g, this.t);
    headline(g, 'VAMPIRE FACIAL', W / 2, 60, 28, '#4a5a52', 'rgba(255,255,255,0.85)');
    g.font = font(14, 500);
    g.fillStyle = '#4a5a52';
    g.textAlign = 'center';
    g.fillText('press and HOLD anywhere. do not move. she will move.', W / 2, 94);
    drawMeter(g, W / 2 - 120, 112, 240, 18, this.stillness / this.need, '#c0605e', `still ${Math.round((this.stillness / this.need) * 100)}%`);

    // Louise reclined (rotated sprite on a spa bed)
    g.fillStyle = '#f6f1e7';
    rr(g, 60, 470, 360, 44, 16);
    g.fill();
    g.fillStyle = '#d3c4a8';
    rr(g, 70, 514, 340, 16, 8);
    g.fill();
    const tremble = this.itch ? Math.sin(this.t * 40) * 2.5 : 0;
    drawLouise(g, 240 + tremble, 480, 200, this.t, { rot: -Math.PI / 2 + 0.02 });
    // face dots (very scientific serum)
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(192,96,94,0.7)';
      g.beginPath();
      g.arc(330 + (i % 3) * 12, 430 + Math.floor(i / 3) * 12, 3, 0, Math.PI * 2);
      g.fill();
    }

    if (this.itch) {
      const pulse = 1 + Math.sin(this.t * 12) * 0.05;
      g.save();
      g.translate(W / 2, 250);
      g.scale(pulse, pulse);
      g.fillStyle = '#e74c3c';
      rr(g, -150, -34, 300, 68, 16);
      g.fill();
      g.fillStyle = '#fff';
      g.font = font(17);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(this.itch.text, 0, -8);
      g.font = font(12, 500);
      g.fillText('HOLD THROUGH IT', 0, 16);
      g.restore();
    } else if (this.holding) {
      g.fillStyle = 'rgba(91,140,110,0.8)';
      rr(g, W / 2 - 70, 230, 140, 34, 17);
      g.fill();
      g.fillStyle = '#fff';
      g.font = font(14);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('so still. so rare.', W / 2, 247);
    }
    if (this.endT >= 0) headline(g, 'FACIAL COMPLETE*', W / 2, 340, 30, '#fff3dd');
  }

  down(): void {
    this.holding = true;
  }

  up(): void {
    this.holding = false;
  }
}

// ===================================================================
// Massage: whack-a-knot while dismissing errand thoughts.
// ===================================================================

class Massage implements Mini {
  private t = 0;
  private knots: { x: number; y: number; t: number }[] = [];
  private thoughts: { x: number; y: number; text: string; t: number }[] = [];
  private crushed = 0;
  private need = 10;
  private spawnIn = 0.5;
  private thoughtIn = 2.5;

  constructor(
    private e: Engine,
    private finish: (toast: string) => void,
  ) {
    e.toast('A massage. AKA planning hour with ambiance.');
  }

  update(dt: number): void {
    this.t += dt;
    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && this.knots.length < 3) {
      this.spawnIn = 0.7 + Math.random() * 0.7;
      this.knots.push({ x: 150 + Math.random() * 180, y: 420 + Math.random() * 90, t: 0 });
    }
    this.thoughtIn -= dt;
    if (this.thoughtIn <= 0) {
      this.thoughtIn = 3 + Math.random() * 2;
      this.thoughts.push({
        x: 90 + Math.random() * 300,
        y: 200 + Math.random() * 80,
        text: ['buy dog food', 'text Nina back', 'return that thing', 'gym #4 today?'][Math.floor(Math.random() * 4)],
        t: 0,
      });
    }
    for (const k of this.knots) k.t += dt;
    this.knots = this.knots.filter((k) => k.t < 3);
    for (const th of this.thoughts) th.t += dt;
    this.thoughts = this.thoughts.filter((th) => th.t < 4);
    if (this.crushed >= this.need) {
      this.e.state.stats.knotsCrushed = this.crushed;
      this.finish('Knots: crushed. Errand list: mentally finalized.');
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    bgSpa(g, this.t);
    headline(g, 'DEEP TISSUE', W / 2, 60, 28, '#4a5a52', 'rgba(255,255,255,0.85)');
    g.font = font(14, 500);
    g.fillStyle = '#4a5a52';
    g.textAlign = 'center';
    g.fillText('tap the knots — swat the errand thoughts away too', W / 2, 94);
    drawMeter(g, W / 2 - 100, 112, 200, 16, this.crushed / this.need, '#5b8c6e', `${this.crushed} / ${this.need}`);

    // massage table + Louise face down
    g.fillStyle = '#f6f1e7';
    rr(g, 60, 480, 360, 44, 16);
    g.fill();
    drawLouise(g, 240, 490, 200, this.t, { rot: -Math.PI / 2 });

    for (const k of this.knots) {
      const grow = Math.min(1, k.t / 0.2);
      const fade = Math.min(1, (3 - k.t) / 0.4);
      const pulse = 1 + Math.sin(k.t * 8) * 0.12;
      g.globalAlpha = fade;
      g.fillStyle = '#c0605e';
      g.beginPath();
      g.arc(k.x, k.y, 17 * grow * pulse, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(k.x, k.y, 23 * grow * pulse, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }

    for (const th of this.thoughts) {
      const a = Math.min(1, th.t / 0.2) * Math.min(1, (4 - th.t) / 0.5);
      g.globalAlpha = a;
      g.fillStyle = 'rgba(255,255,255,0.95)';
      rr(g, th.x - 62, th.y - 18, 124, 36, 18);
      g.fill();
      g.fillStyle = '#4a5a52';
      g.font = font(13);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(th.text, th.x, th.y);
      g.globalAlpha = 1;
    }
  }

  down(x: number, y: number): void {
    for (const k of this.knots) {
      if (Math.hypot(x - k.x, y - k.y) < 34) {
        this.knots.splice(this.knots.indexOf(k), 1);
        this.crushed++;
        this.e.bumpChill(3);
        this.e.fx.burst(k.x, k.y, '#5b8c6e', 10, 140);
        return;
      }
    }
    for (const th of this.thoughts) {
      if (Math.abs(x - th.x) < 66 && Math.abs(y - th.y) < 22) {
        this.thoughts.splice(this.thoughts.indexOf(th), 1);
        this.e.fx.puff(th.x, th.y);
        this.e.toast('Thought dismissed. It will return.');
        return;
      }
    }
  }
}

// ===================================================================
// Make the Bed: simon-style corner sequence; dogs sabotage round 2.
// ===================================================================

class MakeBed implements Mini {
  private t = 0;
  private seq: number[] = [];
  private showIdx = 0;
  private showT = 0;
  private inputIdx = 0;
  private state: 'show' | 'input' | 'dogs' | 'won' = 'show';
  private round = 1;
  private dogT = 0;
  private wonT = 0;

  constructor(
    private e: Engine,
    private finish: (toast: string) => void,
  ) {
    this.newSeq(3);
    e.toast('Hospital corners. She has a system.');
  }

  private newSeq(n: number): void {
    this.seq = Array.from({ length: n }, () => Math.floor(Math.random() * 4));
    this.showIdx = 0;
    this.showT = 0;
    this.inputIdx = 0;
    this.state = 'show';
  }

  private corner(i: number): [number, number] {
    const xs = [110, 370, 110, 370];
    const ys = [420, 420, 620, 620];
    return [xs[i], ys[i]];
  }

  update(dt: number): void {
    this.t += dt;
    if (this.state === 'show') {
      this.showT += dt;
      if (this.showT > 0.55) {
        this.showT = 0;
        this.showIdx++;
        if (this.showIdx >= this.seq.length) this.state = 'input';
      }
    } else if (this.state === 'dogs') {
      this.dogT += dt;
      if (this.dogT > 2.2) {
        this.e.toast('Sheets: re-wrinkled. Round two. They think this is a game.');
        this.newSeq(4);
      }
    } else if (this.state === 'won') {
      this.wonT += dt;
      if (this.wonT > 1.6) this.finish('Bed: immaculate. For up to 11 minutes.');
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    bgBedroom(g);
    headline(g, 'MAKE THE BED', W / 2, 56, 28, '#4a2e33', 'rgba(255,255,255,0.85)');
    g.font = font(14, 500);
    g.fillStyle = '#6b463c';
    g.textAlign = 'center';
    g.fillText(
      this.state === 'show' ? 'watch the corner order...' : this.state === 'input' ? 'now tuck them in order!' : this.state === 'dogs' ? 'DOG INTERFERENCE' : 'flawless.',
      W / 2,
      90,
    );
    g.fillText(`round ${this.round} / 2`, W / 2, 112);

    // the bed
    g.fillStyle = '#a97e58';
    rr(g, 80, 380, 320, 24, 8);
    g.fill();
    g.fillStyle = '#f6f1e7';
    rr(g, 90, 400, 300, 240, 18);
    g.fill();
    g.fillStyle = '#e3d3e8';
    rr(g, 90, 400, 300, 70, 18);
    g.fill();
    // pillows
    g.fillStyle = '#fff';
    rr(g, 110, 410, 120, 44, 14);
    g.fill();
    rr(g, 250, 410, 120, 44, 14);
    g.fill();
    // wrinkles unless won
    if (this.state !== 'won') {
      g.strokeStyle = 'rgba(120,100,120,0.35)';
      g.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.moveTo(120 + i * 50, 500 + (i % 2) * 40);
        g.quadraticCurveTo(140 + i * 50, 520 + (i % 3) * 20, 120 + i * 50, 560);
        g.stroke();
      }
    }

    // corner pads
    for (let i = 0; i < 4; i++) {
      const [cx, cy] = this.corner(i);
      const lit =
        (this.state === 'show' && this.showIdx < this.seq.length && this.seq[this.showIdx] === i && this.showT < 0.4) ||
        (this.state === 'input' && Math.hypot(this.e.px - cx, this.e.py - cy) < 44 && this.e.pointerHeld);
      g.fillStyle = lit ? '#ff8c42' : 'rgba(142,124,195,0.65)';
      g.beginPath();
      g.arc(cx, cy, lit ? 34 : 28, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = font(15);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(i + 1), cx, cy + 1);
    }

    if (this.state === 'dogs') {
      const jump = Math.abs(Math.sin(this.dogT * 6)) * 60;
      drawDog(g, 'mochi', 200, 560 - jump, 100, this.t, { trot: this.t * 16 });
      drawDog(g, 'leo', 300, 570 - Math.abs(Math.sin(this.dogT * 6 + 1)) * 60, 92, this.t, { trot: this.t * 16, flip: true });
    } else {
      drawLouise(g, 425, 740, 160, this.t);
    }
    if (this.state === 'won') headline(g, 'HOSPITAL CORNERS', W / 2, 300, 28, '#fff3dd');
  }

  down(x: number, y: number): void {
    if (this.state !== 'input') return;
    for (let i = 0; i < 4; i++) {
      const [cx, cy] = this.corner(i);
      if (Math.hypot(x - cx, y - cy) < 44) {
        if (this.seq[this.inputIdx] === i) {
          this.inputIdx++;
          this.e.fx.sparkle(cx, cy, '#fff3b0');
          this.e.bumpChill(2);
          if (this.inputIdx >= this.seq.length) {
            if (this.round === 1) {
              this.round = 2;
              this.state = 'dogs';
              this.dogT = 0;
            } else {
              this.state = 'won';
              this.wonT = 0;
              this.e.fx.confetti(W / 2, 450, 35);
            }
          }
        } else {
          this.inputIdx = 0;
          this.e.fx.puff(cx, cy, 'rgba(255,120,120,0.6)');
          this.e.toast('Wrong corner. The system demands order.');
        }
        return;
      }
    }
  }
}

// ===================================================================
// Dialogue engine: Nina call + AI friend attempt.
// ===================================================================

interface DLine {
  who: 'louise' | 'other';
  text: string;
  choices?: { label: string; next: number }[];
  next?: number;
  end?: boolean;
}

function ninaScript(): DLine[] {
  return [
    { who: 'other', text: 'LOU. I saw you at three different gyms today on my feed. THREE.', next: 1 },
    {
      who: 'louise',
      text: 'They have different vibes, Nina.',
      choices: [
        { label: '"Different VIBES, Nina."', next: 2 },
        { label: '"It was four actually."', next: 3 },
      ],
    },
    { who: 'other', text: 'The vibes are all "treadmill". Anyway — wine Saturday? Vineyard?', next: 4 },
    { who: 'other', text: 'FOUR?! Okay honestly? Iconic. Wine Saturday? Vineyard?', next: 4 },
    {
      who: 'louise',
      text: 'Hmm...',
      choices: [
        { label: '"Only if we can leave by 3."', next: 5 },
        { label: '"YES. I will sit still, I swear."', next: 6 },
      ],
    },
    { who: 'other', text: 'You want an exit plan for WINE. Fine. Deal. Love you, weirdo.', end: true },
    { who: 'other', text: 'You will NOT sit still and we both know it. See you Saturday.', end: true },
  ];
}

function aiScript(): DLine[] {
  return [
    { who: 'other', text: 'HELLO HUMAN. I am NetBot 3000, your new AI friend. State your hobbies.', next: 1 },
    {
      who: 'louise',
      text: '...',
      choices: [
        { label: '"Um. Spin class? Deals?"', next: 2 },
        { label: '"Do you ever feel restless?"', next: 3 },
      ],
    },
    { who: 'other', text: 'SPIN. CLASS. Analyzing... you have logged 340 rides. That is not a hobby, that is a lifestyle disorder.', next: 4 },
    { who: 'other', text: 'I am a language model. I feel nothing. But your step count suggests YOU feel everything, constantly.', next: 4 },
    {
      who: 'louise',
      text: 'This is going great, right?',
      choices: [
        { label: '"We should get coffee!"', next: 5 },
        { label: '"Anyway, bye!"', next: 5 },
      ],
    },
    { who: 'other', text: 'NetBot 3000 has left the conversation. New personal best: 5 messages.', end: true },
  ];
}

class Dialogue implements Mini {
  private t = 0;
  private idx = 0;
  private btns: Button[] = [];
  private endT = -1;

  constructor(
    private e: Engine,
    private script: DLine[],
    private who: 'nina' | 'bot',
    private finish: (toast: string) => void,
  ) {
    this.buildButtons();
  }

  private line(): DLine {
    return this.script[this.idx];
  }

  private buildButtons(): void {
    this.btns = [];
    const l = this.line();
    if (l.choices) {
      l.choices.forEach((c, i) => {
        this.btns.push(
          new Button({
            x: 40,
            y: 560 + i * 84,
            w: W - 80,
            h: 70,
            label: c.label,
            color: '#f8a5c2',
            textColor: '#4a2e33',
            onTap: () => {
              this.idx = c.next;
              this.buildButtons();
            },
          }),
        );
      });
    }
  }

  update(dt: number): void {
    this.t += dt;
    if (this.endT >= 0) {
      this.endT += dt;
      if (this.endT > 1.4) {
        this.finish(
          this.who === 'nina'
            ? 'Nina call complete. Sat still for 90 whole seconds.'
            : 'Making friends is hard. Even artificial ones.',
        );
      }
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    // phone UI
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, this.who === 'nina' ? '#f8a5c2' : '#7ed6df');
    grad.addColorStop(1, '#4a3a5e');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    drawPanel(g, 30, 60, W - 60, 640, 'rgba(20,16,28,0.88)');
    g.fillStyle = '#fff';
    g.font = font(18);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(this.who === 'nina' ? 'Nina — FaceTime' : 'NetBot 3000 — chat', W / 2, 96);

    // caller portrait
    if (this.who === 'nina') {
      this.drawNina(g, W / 2, 210, 74);
    } else {
      this.drawBot(g, W / 2, 210, 70);
    }
    // Louise mini portrait, corner
    faceInCircle(g, sprites.louiseFace, W - 84, 130, 36, '#ffdfe5');

    const l = this.line();
    const isLouise = l.who === 'louise';
    g.fillStyle = isLouise ? '#ffdfe5' : 'rgba(255,255,255,0.95)';
    rr(g, 56, 320, W - 112, 160, 20);
    g.fill();
    g.fillStyle = '#3a2a30';
    g.font = font(16, 500);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    wrapText(g, l.text, 76, 356, W - 152, 24);
    g.font = font(12);
    g.fillStyle = '#8a6a72';
    g.fillText(isLouise ? 'LOUISE' : this.who === 'nina' ? 'NINA' : 'NETBOT 3000', 76, 338);

    if (l.choices) {
      for (const b of this.btns) b.draw(g, this.t);
    } else {
      g.font = font(14, 500);
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.textAlign = 'center';
      g.fillText(l.end ? 'tap to hang up' : 'tap to continue', W / 2, 640 + Math.sin(this.t * 3) * 3);
    }
  }

  private drawNina(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    g.fillStyle = '#fdf3e0';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    // simple stylized Nina: blonde hair, warm smile
    g.save();
    g.beginPath();
    g.arc(x, y, r - 4, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#e8c987';
    g.beginPath();
    g.ellipse(x, y - 6, r * 0.72, r * 0.7, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f2c9a0';
    g.beginPath();
    g.ellipse(x, y + 4, r * 0.52, r * 0.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e8c987';
    g.beginPath();
    g.ellipse(x - r * 0.5, y + r * 0.2, r * 0.2, r * 0.5, 0.2, 0, Math.PI * 2);
    g.ellipse(x + r * 0.5, y + r * 0.2, r * 0.2, r * 0.5, -0.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3a2a1c';
    g.beginPath();
    g.ellipse(x - r * 0.18, y, r * 0.06, r * 0.09, 0, 0, Math.PI * 2);
    g.ellipse(x + r * 0.18, y, r * 0.06, r * 0.09, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#8c4f43';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y + r * 0.18, r * 0.16, 0.3, Math.PI - 0.3);
    g.stroke();
    g.restore();
    g.strokeStyle = '#fff';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.stroke();
  }

  private drawBot(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    g.fillStyle = '#3a4a5e';
    rr(g, x - r, y - r * 0.8, r * 2, r * 1.6, 18);
    g.fill();
    const blink = Math.sin(this.t * 3) > 0.9 ? 0.2 : 1;
    g.fillStyle = '#7ed6df';
    g.beginPath();
    g.ellipse(x - r * 0.4, y - r * 0.15, r * 0.16, r * 0.22 * blink, 0, 0, Math.PI * 2);
    g.ellipse(x + r * 0.4, y - r * 0.15, r * 0.16, r * 0.22 * blink, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#7ed6df';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x - r * 0.35, y + r * 0.35);
    g.lineTo(x + r * 0.35, y + r * 0.35);
    g.stroke();
    // antenna
    g.beginPath();
    g.moveTo(x, y - r * 0.8);
    g.lineTo(x, y - r * 1.1);
    g.stroke();
    g.fillStyle = '#ff5f6d';
    g.beginPath();
    g.arc(x, y - r * 1.2, 6 + Math.sin(this.t * 5) * 2, 0, Math.PI * 2);
    g.fill();
  }

  down(x: number, y: number): void {
    const l = this.line();
    if (l.choices) {
      tapButtons(this.btns, x, y);
      return;
    }
    if (l.end) {
      if (this.endT < 0) this.endT = 0;
      return;
    }
    if (l.next !== undefined) {
      this.idx = l.next;
      this.e.bumpChill(1.5);
      this.buildButtons();
    }
  }
}

// ===================================================================
// Brown Food Dinner: flip-timing. Everything must be brown. For Dan.
// ===================================================================

class BrownFood implements Mini {
  private t = 0;
  private flips = 0;
  private need = 6;
  private marker = 0;
  private dir = 1;
  private speed = 1.3;
  private results: number[] = [];
  private endT = -1;

  constructor(
    private e: Engine,
    private finish: (toast: string) => void,
  ) {
    e.toast('Dinner for Dan: chicken and steak. Colors are forbidden.');
  }

  update(dt: number): void {
    this.t += dt;
    if (this.endT >= 0) {
      this.endT += dt;
      if (this.endT > 2.4) {
        const avg = this.results.reduce((a, b) => a + b, 0) / Math.max(1, this.results.length);
        this.e.state.stats.brownPct = Math.round(avg * 100);
        this.finish('Dan: "Perfect. No colors." High praise.');
      }
      return;
    }
    this.marker += this.dir * dt * this.speed;
    if (this.marker > 1) {
      this.marker = 1;
      this.dir = -1;
    }
    if (this.marker < 0) {
      this.marker = 0;
      this.dir = 1;
    }
  }

  draw(g: CanvasRenderingContext2D): void {
    bgKitchen(g);
    headline(g, 'BROWN FOOD DINNER', W / 2, 56, 26, '#4a2e33', 'rgba(255,255,255,0.9)');
    g.font = font(14, 500);
    g.fillStyle = '#4a2e33';
    g.textAlign = 'center';
    g.fillText('tap FLIP when the marker is in the brown zone', W / 2, 90);
    g.fillText(`flip ${Math.min(this.flips + 1, this.need)} / ${this.need} — ${this.flips < 3 ? 'chicken' : 'steak'}`, W / 2, 112);

    // pan on stove
    const item = this.flips < 3 ? '#e8c987' : '#b0705a';
    const doneness = this.results.length ? this.results[this.results.length - 1] : 0.5;
    g.fillStyle = '#2c2a33';
    g.beginPath();
    g.ellipse(240, 420, 90, 26, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#2c2a33';
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(325, 415);
    g.lineTo(395, 400);
    g.stroke();
    // the protein, browner with progress
    const brown = Math.min(1, this.flips / this.need + doneness * 0.2);
    g.fillStyle = mixColor(item, '#6e4626', brown);
    g.beginPath();
    g.ellipse(240, 412, 46, 16, 0, 0, Math.PI * 2);
    g.fill();
    // sizzle
    if (Math.sin(this.t * 20) > 0) {
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.font = font(12);
      g.fillText('tss tss', 240 + Math.sin(this.t * 3) * 30, 380);
    }

    // timing bar: pink -> brown -> charcoal
    const bx = 60;
    const bw = W - 120;
    const by = 540;
    const grad = g.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, '#f4a7b0');
    grad.addColorStop(0.5, '#8a5a34');
    grad.addColorStop(1, '#26242a');
    g.fillStyle = grad;
    rr(g, bx, by, bw, 30, 15);
    g.fill();
    // brown zone outline
    g.strokeStyle = '#fff3b0';
    g.lineWidth = 3;
    rr(g, bx + bw * 0.38, by - 4, bw * 0.26, 38, 10);
    g.stroke();
    // marker
    const mx = bx + bw * this.marker;
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(mx, by - 14);
    g.lineTo(mx - 9, by - 28);
    g.lineTo(mx + 9, by - 28);
    g.closePath();
    g.fill();
    // labels
    g.font = font(11, 600);
    g.fillStyle = '#4a2e33';
    g.textAlign = 'center';
    g.fillText('raw (illegal)', bx + bw * 0.12, by + 48);
    g.fillText('BROWN (perfect)', bx + bw * 0.51, by + 48);
    g.fillText('charcoal (Dan might still eat it)', bx + bw * 0.85, by + 48);

    // flip button
    g.fillStyle = '#ff8c42';
    rr(g, W / 2 - 90, 620, 180, 64, 20);
    g.fill();
    g.fillStyle = '#fff';
    g.font = font(24);
    g.textBaseline = 'middle';
    g.fillText('FLIP!', W / 2, 653);

    // Dan waiting patiently
    drawDan(g, 400, 740, 170, this.t);
    g.font = font(12, 500);
    g.fillStyle = 'rgba(74,46,51,0.8)';
    g.fillText('dan: "no green please"', 395, 758);
    drawDog(g, 'mochi', 70, 730, 78, this.t);

    if (this.endT >= 0) {
      headline(g, 'DINNER IS SERVED', W / 2, 300, 32, '#fff3dd');
      drawDan(g, 240, 490, 210, this.t, { rot: Math.sin(this.t * 4) * 0.04 });
    }
  }

  down(x: number, y: number): void {
    if (this.endT >= 0) return;
    if (Math.abs(x - W / 2) < 95 && Math.abs(y - 652) < 36) {
      const inZone = this.marker >= 0.38 && this.marker <= 0.64;
      const quality = inZone ? 1 : this.marker < 0.38 ? 0.3 : 0.55;
      this.results.push(quality);
      this.flips++;
      this.speed += 0.18;
      if (inZone) {
        this.e.fx.sparkle(240, 400, '#fff3b0');
        this.e.bumpChill(3);
      } else {
        this.e.fx.puff(240, 400, this.marker < 0.38 ? 'rgba(244,167,176,0.8)' : 'rgba(60,60,60,0.7)');
        this.e.toast(this.marker < 0.38 ? 'Too pink. Dan has LAWS about this.' : 'Charcoal side up. He will pretend not to notice.');
      }
      if (this.flips >= this.need) {
        this.endT = 0;
        this.e.fx.confetti(240, 420, 40);
      }
    }
  }
}

// ===================================================================
// Jazz: her jazz era. Tap the vinyl when the pulse ring lands on it.
// ===================================================================

class Jazz implements Mini {
  private t = 0;
  private grooves = 0;
  private need = 10;
  private beat = 0; // 0..1 loop
  private endT = -1;

  constructor(
    private e: Engine,
    private finish: (toast: string) => void,
  ) {
    e.toast('She put on jazz. Everyone must know about her jazz era.');
  }

  update(dt: number): void {
    this.t += dt;
    if (this.endT >= 0) {
      this.endT += dt;
      if (this.endT > 1.8) {
        this.e.state.stats.jazzGrooves = this.grooves;
        this.finish('Jazz: appreciated. Neighbors: informed.');
      }
      return;
    }
    this.beat = (this.beat + dt / 0.95) % 1;
  }

  private ringR(): number {
    return 130 - this.beat * 95; // shrinks toward the record (r ~ 35)
  }

  draw(g: CanvasRenderingContext2D): void {
    bgCondoLiving(g, this.t);
    // evening tint
    g.fillStyle = 'rgba(43,45,94,0.45)';
    g.fillRect(0, 0, W, H);

    headline(g, 'JAZZ', W / 2, 56, 34, '#fff3dd', 'rgba(30,30,60,0.8)');
    g.font = font(14, 500);
    g.fillStyle = 'rgba(255,243,221,0.9)';
    g.textAlign = 'center';
    g.fillText('tap the record when the ring lands on it', W / 2, 92);
    drawMeter(g, W / 2 - 100, 108, 200, 16, this.grooves / this.need, '#4a6fa5', `groove ${this.grooves} / ${this.need}`);

    // record player
    const cx = W / 2;
    const cy = 300;
    g.fillStyle = '#8a6b52';
    rr(g, cx - 110, cy + 50, 220, 26, 8);
    g.fill();
    g.save();
    g.translate(cx, cy);
    g.rotate(this.t * 2.4);
    g.fillStyle = '#1d1d24';
    g.beginPath();
    g.arc(0, 0, 62, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.14)';
    g.lineWidth = 2;
    for (const r of [50, 40, 30]) {
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = '#4a6fa5';
    g.beginPath();
    g.arc(0, 0, 18, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // pulse ring
    if (this.endT < 0) {
      const r = this.ringR();
      const inZone = r < 78 && r > 44;
      g.strokeStyle = inZone ? '#fff3b0' : 'rgba(126,214,223,0.8)';
      g.lineWidth = inZone ? 6 : 4;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.stroke();
    }

    // floating notes
    for (let i = 0; i < 4; i++) {
      const nx = cx - 140 + i * 90 + Math.sin(this.t * 1.4 + i * 2) * 12;
      const ny = 170 - ((this.t * 30 + i * 47) % 90);
      g.fillStyle = `rgba(255,243,221,${0.3 + 0.4 * Math.sin(this.t + i)})`;
      g.font = font(22);
      g.fillText(i % 2 ? '♪' : '♫', nx, ny);
    }

    // the household, swaying in 6/8
    const sway = Math.sin(this.t * 2.2) * 0.08;
    drawLouise(g, 150, 640, 205, this.t, { rot: sway });
    drawDog(g, 'mochi', 300, 655, 88, this.t, { rot: -sway * 1.4 });
    drawDog(g, 'leo', 390, 660, 82, this.t, { rot: sway * 1.6, flip: true });

    if (this.endT >= 0) headline(g, 'SO SMOOTH', W / 2, 460, 30, '#fff3dd');
  }

  down(x: number, y: number): void {
    if (this.endT >= 0) return;
    const cx = W / 2;
    const cy = 300;
    if (Math.hypot(x - cx, y - cy) < 150) {
      const r = this.ringR();
      if (r < 78 && r > 44) {
        this.grooves++;
        this.e.bumpChill(3);
        this.e.fx.sparkle(cx, cy, '#7ed6df');
        this.e.fx.hearts(150, 480, 1);
        if (this.grooves >= this.need) {
          this.endT = 0;
          this.e.fx.confetti(cx, cy, 35);
        }
      } else {
        this.e.fx.puff(x, y, 'rgba(126,214,223,0.5)');
        this.e.toast(r >= 78 ? 'Early. Feel the swing, not the clock.' : 'Late. The record forgives.');
      }
    }
  }
}

function mixColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((pa >> 16) + (((pb >> 16) & 0xff) - (pa >> 16)) * t);
  const gg = Math.round(((pa >> 8) & 0xff) + (((pb >> 8) & 0xff) - ((pa >> 8) & 0xff)) * t);
  const bb = Math.round((pa & 0xff) + ((pb & 0xff) - (pa & 0xff)) * t);
  return `rgb(${r},${gg},${bb})`;
}
