import { Input } from './input';
import { LOCATIONS, CITY_LABELS, MAP_WIDTH, MAP_HEIGHT, type LocationId } from './locations';
import { NINA_PHONE_SCENE, SCENES, type ChoiceOption, type SceneConfig } from './scenes';
import {
  drawMap,
  drawPlayer,
  drawDog,
  drawDanNpc,
  drawBrownFoodPlates,
  type Dog,
  type PlayerState,
} from './render';

type GamePhase = 'title' | 'playing' | 'dialog' | 'fail' | 'win';

const RESTLESS_MAX = 100;
const RESTLESS_DRAIN = 9;
const RESTLESS_REFILL_PASSIVE = 2;
const PLAYER_SPEED = 220;
const INTERACT_RADIUS = 52;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: Input;
  private hud: HTMLElement;
  private overlay: HTMLElement;

  private phase: GamePhase = 'title';
  private restless = RESTLESS_MAX;
  private score = 0;
  private visited = new Set<LocationId>();
  private stillTime = 0;
  private ninaCallDone = false;
  private ninaCallQueued = false;

  private player: PlayerState = { x: 520, y: 440, facing: 0, moving: false };
  private mochi: Dog = { x: 500, y: 455, phase: 0 };
  private aleo: Dog = { x: 485, y: 460, phase: 1.5 };

  private camX = 0;
  private camY = 0;

  private activeScene: SceneConfig | null = null;
  private dialogLines: string[] = [];
  private dialogIndex = 0;
  private pendingLocation: LocationId | null = null;
  private pendingChoiceBonus: { score: number; restless: number } | null = null;
  private showHomeKitchen = false;
  private kitchenAlpha = 0;

  private lastTime = 0;
  private animId = 0;

  constructor() {
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.canvas = canvas;
    this.ctx = ctx;
    this.input = new Input();
    this.hud = document.getElementById('hud')!;
    this.overlay = document.getElementById('overlay')!;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.showTitle();
    this.loop(0);
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private showTitle() {
    this.phase = 'title';
    this.overlay.classList.remove('hidden');
    this.overlay.innerHTML = `
      <div class="card">
        <h1>Louise Can't Sit Still</h1>
        <p>A loving Orange County adventure. Help Louise visit every stop before the restless meter hits zero. Mochi & Aleo are coming too.</p>
        <p class="hint">WASD / arrows on desktop · joystick or tap-to-move on phone</p>
        <button class="btn" id="btn-start">Let's putter</button>
      </div>
    `;
    document.getElementById('btn-start')?.addEventListener('click', () => this.startGame());
  }

  private startGame() {
    this.phase = 'playing';
    this.restless = RESTLESS_MAX;
    this.score = 0;
    this.visited.clear();
    this.stillTime = 0;
    this.ninaCallDone = false;
    this.ninaCallQueued = false;
    this.player = { x: 520, y: 460, facing: 0, moving: false };
    this.overlay.classList.add('hidden');
    this.updateHud();
  }

  private getSceneForLocation(id: LocationId): SceneConfig {
    const custom = SCENES[id];
    if (custom) return custom;
    const loc = LOCATIONS.find((l) => l.id === id)!;
    return {
      mode: 'standard',
      title: '✨ Stop complete',
      lines: [loc.quip],
    };
  }

  private startDialog(scene: SceneConfig, locationId: LocationId | null) {
    this.phase = 'dialog';
    this.activeScene = scene;
    this.dialogLines = scene.lines;
    this.dialogIndex = 0;
    this.pendingLocation = locationId;
    this.pendingChoiceBonus = null;
    this.showHomeKitchen =
      locationId === 'home' && scene.lines.some((l) => l.includes('brown food'));
    this.kitchenAlpha = 0;
    this.showDialogCard();
  }

  private bubbleClass(line: string): string {
    if (line.startsWith('Nina:')) return 'nina';
    if (line.startsWith('Louise:')) return 'louise';
    return line.includes('Nina') ? 'nina' : 'louise';
  }

  private bubbleText(line: string): string {
    return line.replace(/^(Louise|Nina):\s*/, '');
  }

  private showDialogCard() {
    const scene = this.activeScene!;
    const line = this.dialogLines[this.dialogIndex] ?? '';
    const atChoices =
      scene.mode === 'choices' &&
      scene.choices &&
      this.dialogIndex >= this.dialogLines.length - 1;

    if (scene.mode === 'phone') {
      const bubbles = this.dialogLines
        .slice(0, this.dialogIndex + 1)
        .map(
          (l) =>
            `<div class="bubble ${this.bubbleClass(l)}">${this.escapeHtml(this.bubbleText(l))}</div>`
        )
        .join('');
      const isLast = this.dialogIndex >= this.dialogLines.length - 1;
      this.overlay.classList.remove('hidden');
      this.overlay.innerHTML = `
        <div class="card">
          <h2>${scene.title}</h2>
          <div class="phone-thread">${bubbles}</div>
          <button class="btn" id="btn-dialog">${isLast ? 'Hang up & keep moving' : '…'}</button>
        </div>
      `;
      document.getElementById('btn-dialog')?.addEventListener('click', () => this.advanceDialog());
      return;
    }

    if (atChoices && scene.choices) {
      const choiceHtml = scene.choices
        .map(
          (c, i) =>
            `<button class="btn-choice" data-choice="${i}">${this.escapeHtml(c.label)}</button>`
        )
        .join('');
      this.overlay.classList.remove('hidden');
      this.overlay.innerHTML = `
        <div class="card">
          <h2>${scene.title}</h2>
          ${scene.lines.map((l) => `<p class="dialog-line" style="min-height:auto;margin:6px 0">${this.escapeHtml(l)}</p>`).join('')}
          <div class="choice-stack">${choiceHtml}</div>
        </div>
      `;
      scene.choices.forEach((choice, i) => {
        document.querySelector(`[data-choice="${i}"]`)?.addEventListener('click', () =>
          this.pickChoice(choice)
        );
      });
      return;
    }

    const isLast = this.dialogIndex >= this.dialogLines.length - 1;
    const btnLabel = isLast ? 'On to the next adventure' : 'Next';
    this.overlay.classList.remove('hidden');
    this.overlay.innerHTML = `
      <div class="card">
        <h2>${scene.title}</h2>
        <div class="dialog-line">${this.escapeHtml(line)}</div>
        <button class="btn" id="btn-dialog">${btnLabel}</button>
      </div>
    `;
    document.getElementById('btn-dialog')?.addEventListener('click', () => this.advanceDialog());
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private pickChoice(choice: ChoiceOption) {
    this.pendingChoiceBonus = { score: choice.scoreBonus, restless: choice.restlessBonus };
    this.dialogLines = [...this.dialogLines, choice.line];
    this.dialogIndex = this.dialogLines.length - 1;
    this.activeScene = {
      mode: 'standard',
      title: '🤖 Still looking…',
      lines: [choice.line],
    };
    this.overlay.innerHTML = `
      <div class="card">
        <h2>${this.activeScene.title}</h2>
        <div class="dialog-line">${this.escapeHtml(choice.line)}</div>
        <button class="btn" id="btn-dialog">On to the next adventure</button>
      </div>
    `;
    document.getElementById('btn-dialog')?.addEventListener('click', () => this.advanceDialog());
  }

  private advanceDialog() {
    if (this.dialogIndex < this.dialogLines.length - 1) {
      this.dialogIndex++;
      if (this.pendingLocation === 'home' && this.dialogIndex === 3) this.kitchenAlpha = 1;
      this.showDialogCard();
      return;
    }

    if (this.pendingLocation) {
      const loc = LOCATIONS.find((l) => l.id === this.pendingLocation)!;
      this.visited.add(this.pendingLocation);
      this.score += loc.points + (this.pendingChoiceBonus?.score ?? 0);
      this.restless = Math.min(
        RESTLESS_MAX,
        this.restless + loc.restlessBoost + (this.pendingChoiceBonus?.restless ?? 0)
      );
    }

    const wasNinaOnly = this.pendingLocation === null && this.activeScene === NINA_PHONE_SCENE;
    this.pendingLocation = null;
    this.pendingChoiceBonus = null;
    this.activeScene = null;
    this.showHomeKitchen = false;
    this.kitchenAlpha = 0;

    if (!wasNinaOnly && !this.ninaCallDone && this.visited.size >= 3) {
      this.ninaCallQueued = true;
    }

    if (this.ninaCallQueued && !this.ninaCallDone) {
      this.ninaCallQueued = false;
      this.ninaCallDone = true;
      this.startDialog(NINA_PHONE_SCENE, null);
      return;
    }

    if (this.visited.size >= LOCATIONS.length) {
      this.showWin();
      return;
    }
    this.phase = 'playing';
    this.overlay.classList.add('hidden');
    this.updateHud();
  }

  private showFail() {
    this.phase = 'fail';
    this.overlay.classList.remove('hidden');
    this.overlay.innerHTML = `
      <div class="card">
        <h1>Louise sat still.</h1>
        <p>Unprecedented. The universe is confused. Mochi stared. Aleo judged softly.</p>
        <p class="hint">Score: ${this.score} · Stops: ${this.visited.size}/${LOCATIONS.length}</p>
        <button class="btn" id="btn-retry">Get her moving again</button>
      </div>
    `;
    document.getElementById('btn-retry')?.addEventListener('click', () => this.startGame());
  }

  private showWin() {
    this.phase = 'win';
    const shareText = `Louise completed OC. She still won't sit down. Score: ${this.score}`;
    this.overlay.classList.remove('hidden');
    this.overlay.innerHTML = `
      <div class="card">
        <h1>OC conquered!</h1>
        <p>Every gym, Grit Cycle, Nina call, and vampire facial — and she still showed up anyway.</p>
        <p class="share-line">"${shareText}"</p>
        <p class="hint">Score: ${this.score}</p>
        <button class="btn btn-secondary" id="btn-share">Copy share line</button>
        <button class="btn" id="btn-replay">Replay</button>
      </div>
    `;
    document.getElementById('btn-replay')?.addEventListener('click', () => this.startGame());
    document.getElementById('btn-share')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareText);
        const btn = document.getElementById('btn-share');
        if (btn) btn.textContent = 'Copied!';
      } catch {
        /* ignore */
      }
    });
  }

  private pillLabel(id: LocationId, label: string): string {
    if (id === 'home') return 'Home';
    if (id === 'grit_cycle') return 'Grit';
    if (id === 'ai_meetup') return 'AI';
    if (id.startsWith('gym_')) return label;
    return label.split(' ')[0];
  }

  private updateHud() {
    const pct = Math.max(0, Math.min(100, this.restless));
    const pills = LOCATIONS.map((l) => {
      const done = this.visited.has(l.id);
      const short = this.pillLabel(l.id, l.label);
      return `<span class="quest-pill ${done ? 'done' : ''}">${short}</span>`;
    }).join('');
    this.hud.innerHTML = `
      <div class="hud-row">
        <span class="hud-title">Louise · OC day</span>
        <span class="hud-score">${this.score} pts</span>
      </div>
      <div class="meter-wrap"><div class="meter-fill ${pct < 25 ? 'low' : ''}" style="width:${pct}%"></div></div>
      <div class="meter-label">Restless meter — keep moving!</div>
      <div class="quest-pills">${pills}</div>
    `;
  }

  private loop(now: number) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.phase === 'playing') {
      this.updatePlaying(dt);
      this.updateHud();
    }

    this.render();
    this.animId = requestAnimationFrame((t) => this.loop(t));
  }

  private updatePlaying(dt: number) {
    const move = this.input.updateFromKeyboard();
    let mx = move.x;
    let my = move.y;

    const tap = this.input.consumeTapTarget();
    if (tap && mx === 0 && my === 0) {
      const worldX = this.camX + tap.x * this.canvas.clientWidth;
      const worldY = this.camY + tap.y * this.canvas.clientHeight;
      const dx = worldX - this.player.x;
      const dy = worldY - this.player.y;
      const len = Math.hypot(dx, dy) || 1;
      mx = dx / len;
      my = dy / len;
    }

    const moving = Math.hypot(mx, my) > 0.15;
    this.player.moving = moving;

    if (moving) {
      this.player.x += mx * PLAYER_SPEED * dt;
      this.player.y += my * PLAYER_SPEED * dt;
      this.player.facing = Math.atan2(my, mx);
      this.stillTime = 0;
      this.restless = Math.min(RESTLESS_MAX, this.restless + RESTLESS_REFILL_PASSIVE * dt);
    } else {
      this.stillTime += dt;
      this.restless -= RESTLESS_DRAIN * dt;
      if (this.stillTime > 0.4 && this.restless <= 0) {
        this.showFail();
        return;
      }
    }

    this.player.x = Math.max(40, Math.min(MAP_WIDTH - 40, this.player.x));
    this.player.y = Math.max(40, Math.min(MAP_HEIGHT - 40, this.player.y));

    this.updateDogs(dt);

    for (const loc of LOCATIONS) {
      if (this.visited.has(loc.id)) continue;
      const d = Math.hypot(loc.x - this.player.x, loc.y - this.player.y);
      if (d < INTERACT_RADIUS) {
        this.startDialog(this.getSceneForLocation(loc.id), loc.id);
        break;
      }
    }
  }

  private updateDogs(dt: number) {
    const follow = (dog: Dog, offset: number) => {
      dog.phase += dt * 8;
      const tx = this.player.x - offset;
      const ty = this.player.y + offset * 0.5;
      dog.x += (tx - dog.x) * Math.min(1, dt * 6);
      dog.y += (ty - dog.y) * Math.min(1, dt * 6);
    };
    follow(this.mochi, 22);
    follow(this.aleo, 36);
  }

  private render() {
    const vw = this.canvas.clientWidth;
    const vh = this.canvas.clientHeight;

    this.camX = this.player.x - vw / 2;
    this.camY = this.player.y - vh / 2;
    this.camX = Math.max(0, Math.min(MAP_WIDTH - vw, this.camX));
    this.camY = Math.max(0, Math.min(MAP_HEIGHT - vh, this.camY));

    this.ctx.save();
    this.ctx.clearRect(0, 0, vw, vh);
    this.ctx.translate(-this.camX, -this.camY);

    drawMap(this.ctx, CITY_LABELS, LOCATIONS, this.visited);
    drawDog(this.ctx, this.aleo, 'Aleo', false);
    drawDog(this.ctx, this.mochi, 'Mochi', true);
    drawPlayer(this.ctx, this.player);

    const home = LOCATIONS.find((l) => l.id === 'home')!;
    if (this.showHomeKitchen || (this.phase === 'dialog' && this.pendingLocation === 'home')) {
      const alpha = this.phase === 'dialog' && this.dialogIndex >= 3 ? 1 : this.kitchenAlpha;
      drawDanNpc(this.ctx, home.x + 40, home.y - 10, this.dialogIndex >= 4 || alpha > 0);
      drawBrownFoodPlates(this.ctx, home.x - 30, home.y + 20, alpha);
    }

    this.ctx.restore();
  }

  destroy() {
    cancelAnimationFrame(this.animId);
  }
}
