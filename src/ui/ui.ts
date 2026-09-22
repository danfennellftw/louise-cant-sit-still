import type { Line, Speaker } from '../world/types';
import type { Audio } from '../engine/audio';
import type { QualitySetting } from '../engine/quality';
import { assetUrl } from '../engine/assets';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export const PORTRAIT: Partial<Record<Speaker, string>> = {
  louise: 'portraits/louise.webp',
  dan: 'portraits/dan.webp',
  mochi: 'portraits/mochi.webp',
  leo: 'portraits/leo.webp',
};
const NAMES: Record<Speaker, string> = { louise: 'Louise', dan: 'Dan', nina: 'Nina', mochi: 'Mochi', leo: 'Leo', narrator: 'Narrator', npc: '' };
const NAME_COLORS: Partial<Record<Speaker, string>> = { louise: '#ff6f59', dan: '#3d4a6a', nina: '#b48cff', mochi: '#c9a06a', leo: '#8a5a2a', narrator: '#2b1d2e', npc: '#4fb89a' };

export function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function portraitHtml(who: Speaker, cls = 'dlg-portrait') {
  const src = PORTRAIT[who];
  if (src) return `<img class="${cls}" src="${assetUrl(src)}" alt="${NAMES[who]}" />`;
  const letter = who === 'nina' ? 'N' : who === 'npc' ? '☺' : '✦';
  return `<div class="${cls} narrator">${letter}</div>`;
}

interface Label {
  el: HTMLElement;
  life: number;
}

/** DOM-side presentation layer. Game logic calls in; nothing here owns state. */
export class UI {
  readonly hud = $('hud');
  private meterFill = $('meter-fill');
  private meterGhost = $('meter-ghost');
  private meterCard = $('meter-card');
  private meterBar = this.meterFill.parentElement!;
  private heartsEl = $('hearts');
  private heartsWrap = $('hearts-wrap');
  private chip = $('chapter-chip');
  private objective = $('objective');
  private prompt = $<HTMLButtonElement>('prompt');
  private coachEl = $('coach');
  private toasts = $('toasts');
  private vignette = $('vignette');
  private labelsEl = $('labels');
  private edge = $('edge-arrow');
  private dialogEl = $('dialog');
  readonly screens = $('screens');
  private fadeEl = $('fade');
  private promptHandler: (() => void) | null = null;
  private lastMeter = 100;
  private labels = new Map<string, Label>();
  dialogOpen = false;

  constructor(private audio: Audio) {
    this.prompt.addEventListener('click', (e) => {
      e.stopPropagation();
      this.promptHandler?.();
    });
  }

  /* ---------- HUD ---------- */
  showHud(v: boolean) {
    this.hud.classList.toggle('hidden', !v);
  }

  setMeter(pct: number, level: 0 | 1 | 2) {
    const p = Math.max(0, Math.min(100, pct));
    this.meterFill.style.width = `${p}%`;
    // the ghost bar trails behind via its CSS transition, so drops read as a visible chunk lost
    if (Math.abs(p - this.lastMeter) > 0.2) this.meterGhost.style.width = `${p}%`;
    this.lastMeter = p;
    this.meterBar.classList.toggle('low', level > 0);
    this.meterCard.classList.toggle('shake', level === 2);
    this.vignette.className = level === 2 ? 'crit' : level === 1 ? 'warn' : '';
  }

  meterBoost() {
    this.meterCard.classList.remove('bump');
    void this.meterCard.offsetWidth;
    this.meterCard.classList.add('bump');
    this.meterBar.classList.add('glow');
    setTimeout(() => this.meterBar.classList.remove('glow'), 700);
  }

  setHearts(n: number, tick = false) {
    this.heartsEl.textContent = String(n);
    if (tick) {
      this.heartsWrap.classList.remove('tick');
      void this.heartsWrap.offsetWidth;
      this.heartsWrap.classList.add('tick');
    }
  }

  setChapter(time: string, place: string) {
    (this.chip.querySelector('.time') as HTMLElement).textContent = time;
    (this.chip.querySelector('.place') as HTMLElement).textContent = place;
  }

  setObjectives(items: { label: string; done: boolean; next: boolean; optional?: boolean }[], extra?: string) {
    this.objective.innerHTML =
      items
        .map((o) => `<div class="obj ${o.done ? 'done' : ''} ${o.next && !o.done ? 'next' : ''} ${o.optional ? 'optional' : ''}"><i></i>${esc(o.label)}${o.optional ? ' (bonus)' : ''}</div>`)
        .join('') + (extra ? `<div class="obj next"><i></i>${esc(extra)}</div>` : '');
  }

  showPrompt(label: string, onPress: () => void) {
    this.promptHandler = onPress;
    const key = matchMedia('(hover: hover)').matches ? '<kbd>E</kbd>' : '';
    const html = `${key}${esc(label)}`;
    if (this.prompt.classList.contains('hidden') || this.prompt.innerHTML !== html) {
      this.prompt.innerHTML = html;
      this.prompt.classList.remove('hidden');
    }
  }

  hidePrompt() {
    this.promptHandler = null;
    this.prompt.classList.add('hidden');
  }

  get promptVisible() {
    return !this.prompt.classList.contains('hidden');
  }

  pressPrompt() {
    this.promptHandler?.();
  }

  coach(html: string | null, at: 'center' | 'meter' = 'center') {
    if (!html) {
      this.coachEl.classList.add('hidden');
      return;
    }
    this.coachEl.innerHTML = html;
    this.coachEl.className = at === 'meter' ? 'at-meter' : '';
  }

  toast(text: string, kind: '' | 'dog' | 'good' | 'warn' = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove();
    setTimeout(() => el.remove(), 2900);
  }

  edgeArrow(x: number, y: number, angle: number, on: boolean) {
    this.edge.classList.toggle('on', on);
    if (on) this.edge.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
  }

  /* ---------- world labels & floaters ---------- */
  label(id: string, text: string, cls = '', life = Infinity) {
    let l = this.labels.get(id);
    if (!l) {
      const el = document.createElement('div');
      el.className = `wlabel ${cls}`;
      this.labelsEl.appendChild(el);
      l = { el, life };
      this.labels.set(id, l);
    }
    l.el.textContent = text;
    l.life = life;
    return l.el;
  }

  placeLabel(id: string, x: number, y: number, visible: boolean, opacity = 1) {
    const l = this.labels.get(id);
    if (!l) return;
    l.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    l.el.style.opacity = visible ? String(opacity) : '0';
  }

  dropLabel(id: string) {
    this.labels.get(id)?.el.remove();
    this.labels.delete(id);
  }

  tickLabels(dt: number) {
    for (const [id, l] of this.labels) {
      if (l.life === Infinity) continue;
      l.life -= dt;
      if (l.life <= 0) this.dropLabel(id);
    }
  }

  clearLabels() {
    for (const id of [...this.labels.keys()]) this.dropLabel(id);
  }

  floater(text: string, x: number, y: number, cls = '') {
    const el = document.createElement('div');
    el.className = `floater ${cls}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.labelsEl.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  /* ---------- dialog ---------- */
  async dialog(lines: Line[]) {
    if (!lines.length) return;
    this.dialogOpen = true;
    this.hidePrompt();
    for (const line of lines) await this.showLine(line);
    this.dialogEl.classList.add('hidden');
    this.dialogOpen = false;
  }

  private showLine(line: Line) {
    return new Promise<void>((resolve) => {
      const name = line.name ?? NAMES[line.who];
      this.dialogEl.innerHTML = `${portraitHtml(line.who)}<div class="dlg-card">${name ? `<span class="dlg-name" style="background:${NAME_COLORS[line.who] ?? '#ff6f59'}">${esc(name)}</span>` : ''}<div class="dlg-text"></div><span class="dlg-next"></span></div>`;
      this.dialogEl.classList.remove('hidden');
      const textEl = this.dialogEl.querySelector('.dlg-text') as HTMLElement;
      let i = 0;
      let done = false;
      const full = line.text;
      const iv = window.setInterval(() => {
        i += 2;
        textEl.textContent = full.slice(0, i);
        if (i % 6 === 0) this.audio.tick();
        if (i >= full.length) finishType();
      }, 22);
      const finishType = () => {
        window.clearInterval(iv);
        textEl.textContent = full;
        done = true;
      };
      const advance = (e?: Event) => {
        e?.preventDefault();
        if (!done) {
          finishType();
          return;
        }
        cleanup();
        this.audio.click();
        resolve();
      };
      const key = (e: KeyboardEvent) => {
        if (['e', ' ', 'enter'].includes(e.key.toLowerCase())) advance(e);
      };
      const cleanup = () => {
        this.dialogEl.removeEventListener('pointerdown', advance);
        window.removeEventListener('keydown', key);
      };
      setTimeout(() => {
        this.dialogEl.addEventListener('pointerdown', advance);
        window.addEventListener('keydown', key);
      }, 120);
    });
  }

  /* ---------- transitions ---------- */
  fade(on: boolean, loading = false) {
    this.fadeEl.classList.toggle('loading', loading);
    this.fadeEl.classList.remove('boot');
    this.fadeEl.classList.toggle('on', on);
    return new Promise<void>((r) => setTimeout(r, 470));
  }

  clearScreens() {
    this.screens.innerHTML = '';
  }

  /* ---------- screens ---------- */
  title(opts: { hasSave: boolean; onPlay: () => void; onContinue: () => void; onSettings: () => void }) {
    const l2 = "can't sit still".split('').map((c, i) => `<span style="animation-delay:${i * 0.07}s">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
    const cast = (['louise', 'dan', 'mochi', 'leo'] as Speaker[])
      .map((w, i) => `<figure style="animation-delay:${0.3 + i * 0.1}s">${portraitHtml(w, '')}<figcaption>${NAMES[w]}</figcaption></figure>`)
      .join('');
    this.screens.innerHTML = `
      <div class="title-screen">
        <div class="logo">
          <div class="l1">Louise</div>
          <div class="l2">${l2}</div>
          <div class="tag">One restless day in Orange County · a gift from Dan</div>
        </div>
        <div class="cast">${cast}</div>
        <button class="cta" id="t-play">${opts.hasSave ? 'Continue the day' : 'Play'}</button>
        ${opts.hasSave ? '<button class="cta secondary" id="t-new">Start a fresh day</button>' : ''}
        <div class="title-foot"><button id="t-settings">Settings</button><span>WASD / drag · E / tap</span></div>
      </div>`;
    $('t-play').onclick = () => (opts.hasSave ? opts.onContinue() : opts.onPlay());
    const n = document.getElementById('t-new');
    if (n) n.onclick = () => opts.onPlay();
    $('t-settings').onclick = () => opts.onSettings();
  }

  chapterCard(kicker: string, title: string, sub: string, ms = 2600) {
    const el = document.createElement('div');
    el.className = 'chapter';
    el.innerHTML = `<div class="bar"></div><div class="band"><div class="kicker">${esc(kicker)}</div><h3>${esc(title)}</h3><div class="sub">${esc(sub)}</div></div><div class="bar b"></div>`;
    this.screens.appendChild(el);
    return new Promise<void>((r) => {
      setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => {
          el.remove();
          r();
        }, 480);
      }, ms);
    });
  }

  stinger(num: number, title: string, sub: string) {
    this.audio.stinger();
    const el = document.createElement('div');
    el.className = 'stinger';
    el.innerHTML = `<div><div class="act">Act ${num}</div><h1>${esc(title)}</h1><div class="rule"></div><p style="margin-top:12px">${esc(sub)}</p></div>`;
    this.screens.appendChild(el);
    return new Promise<void>((r) => {
      const done = () => {
        el.style.transition = 'opacity .4s';
        el.style.opacity = '0';
        setTimeout(() => {
          el.remove();
          r();
        }, 400);
      };
      const t = setTimeout(done, 2600);
      el.addEventListener('pointerdown', () => {
        clearTimeout(t);
        done();
      });
    });
  }

  fail(roast: string, sub: string, onRetry: () => void) {
    this.screens.innerHTML = `
      <div class="screen-dim"><div class="card fail">
        <h2>Louise sat down.</h2>
        <p class="roast">“${esc(roast)}”</p>
        <p>${esc(sub)}</p>
        <button class="cta" id="f-retry">Get up, Louise!</button>
      </div></div>`;
    const btn = $('f-retry');
    const go = () => {
      window.removeEventListener('keydown', key);
      onRetry();
    };
    const key = (e: KeyboardEvent) => {
      if (['e', ' ', 'enter'].includes(e.key.toLowerCase())) go();
    };
    setTimeout(() => window.addEventListener('keydown', key), 500);
    btn.onclick = go;
  }

  finale(stats: { hearts: number; stops: number; sits: number; dogs: number }, onReplay: () => void) {
    const share = `Louise finished her whole OC day — ${stats.stops} stops, ${stats.hearts} hearts, sat down ${stats.sits}×. She still won't sit still.`;
    this.screens.innerHTML = `
      <div class="screen-dim"><div class="card">
        <h2>Day complete.</h2>
        <p>Four gyms, Grit Cycle, brown food, Nina, the trail, the sauna — and the dogs are finally in bed. She’ll be up at 5.</p>
        <div class="stats"><div><b>${stats.hearts}</b><span>hearts</span></div><div><b>${stats.stops}</b><span>stops</span></div><div><b>${stats.sits}</b><span>sits</span></div></div>
        <p class="share-line">${esc(share)}</p>
        <button class="cta" id="w-share">Share</button>
        <button class="cta secondary" id="w-replay" style="width:100%;color:var(--plum);box-shadow:inset 0 0 0 2px #e6c9b8">Play the day again</button>
        <p style="margin:14px 0 0;font-size:12px">Made with love, Dan → Louise</p>
      </div></div>`;
    $('w-replay').onclick = onReplay;
    $('w-share').onclick = async () => {
      const data = { title: "Louise Can't Sit Still", text: share, url: location.href };
      try {
        if (navigator.share) await navigator.share(data);
        else {
          await navigator.clipboard.writeText(`${share} ${location.href}`);
          $('w-share').textContent = 'Copied!';
        }
      } catch {
        /* dismissed */
      }
    };
  }

  settings(opts: {
    quality: QualitySetting;
    muted: boolean;
    inGame: boolean;
    onQuality: (q: QualitySetting) => void;
    onMute: () => boolean;
    onClose: () => void;
    onRestart?: () => void;
    onMap?: () => void;
  }) {
    const qs: QualitySetting[] = ['auto', 'low', 'medium', 'high'];
    const el = document.createElement('div');
    el.className = 'screen-dim';
    el.innerHTML = `<div class="card">
        <h2>${opts.inGame ? 'Paused' : 'Settings'}</h2>
        <p style="margin-bottom:8px">Graphics</p>
        <div class="row"><div class="seg" id="s-q">${qs.map((q) => `<button data-q="${q}" class="${q === opts.quality ? 'on' : ''}">${q[0].toUpperCase() + q.slice(1)}</button>`).join('')}</div></div>
        <div class="row"><div class="seg"><button id="s-mute" class="on">${opts.muted ? 'Sound: off' : 'Sound: on'}</button></div></div>
        <button class="cta" id="s-close">${opts.inGame ? 'Resume' : 'Done'}</button>
        ${opts.onMap ? '<button class="cta secondary" id="s-map" style="width:100%;color:var(--plum);box-shadow:inset 0 0 0 2px #e6c9b8">Day map</button>' : ''}
        ${opts.onRestart ? '<button class="cta secondary" id="s-restart" style="width:100%;color:var(--plum);box-shadow:inset 0 0 0 2px #e6c9b8">Restart this stop</button>' : ''}
      </div>`;
    this.screens.appendChild(el);
    el.querySelectorAll<HTMLButtonElement>('#s-q button').forEach((b) =>
      b.addEventListener('click', () => {
        el.querySelectorAll('#s-q button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        opts.onQuality(b.dataset.q as QualitySetting);
      })
    );
    const m = el.querySelector('#s-mute') as HTMLButtonElement;
    m.onclick = () => (m.textContent = opts.onMute() ? 'Sound: off' : 'Sound: on');
    const close = () => {
      el.remove();
      opts.onClose();
    };
    (el.querySelector('#s-close') as HTMLElement).onclick = close;
    const r = el.querySelector('#s-restart') as HTMLElement | null;
    if (r && opts.onRestart) r.onclick = () => {
      el.remove();
      opts.onRestart!();
    };
    const mp = el.querySelector('#s-map') as HTMLElement | null;
    if (mp && opts.onMap) mp.onclick = () => {
      el.remove();
      opts.onMap!();
    };
    return el;
  }
}
