import type { MiniSpec, MiniItem, Line } from '../world/types';
import type { Audio } from '../engine/audio';
import { haptic } from '../engine/audio';
import { esc, portraitHtml } from './ui';
import { clamp } from '../engine/util';

export interface MiniResult {
  score: number;
  hearts: number;
  lines: Line[];
}

type Progress = (k: number) => void;

/**
 * Every stop is a short, tactile interaction (never walk-into-glow).
 * All types work with touch, mouse and keyboard.
 */
export class MiniGames {
  private stage = document.getElementById('stage')!;
  private cleanup: (() => void)[] = [];
  onBeat?: (kind: 'good' | 'miss' | 'tick') => void;

  constructor(private audio: Audio) {}

  private shell(spec: MiniSpec) {
    this.stage.innerHTML = `
      <div class="stage-head"><div class="stage-title">${esc(spec.title)}</div></div>
      ${spec.hint ? `<div class="stage-hint">${esc(spec.hint)}</div>` : ''}
      <div class="stage-progress"><div></div></div>
      <div class="stage-body"></div>`;
    this.stage.classList.remove('hidden');
    const bar = this.stage.querySelector('.stage-progress > div') as HTMLElement;
    const body = this.stage.querySelector('.stage-body') as HTMLElement;
    return { bar, body };
  }

  private on<K extends keyof WindowEventMap>(t: EventTarget, type: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions) {
    t.addEventListener(type, fn as EventListener, opts);
    this.cleanup.push(() => t.removeEventListener(type, fn as EventListener, opts));
  }

  private finish() {
    this.cleanup.forEach((f) => f());
    this.cleanup = [];
    this.stage.classList.add('hidden');
    this.stage.innerHTML = '';
  }

  private runId = 0;

  /** Tear down the running mini without resolving it (its stop is being abandoned). */
  abort() {
    this.runId++;
    this.finish();
  }

  async run(spec: MiniSpec, progress: Progress): Promise<MiniResult> {
    const id = ++this.runId;
    let r: MiniResult;
    switch (spec.type) {
      case 'pull':
        r = await this.pull(spec, progress);
        break;
      case 'sort':
      case 'place':
        r = await this.sort(spec, progress);
        break;
      case 'timing':
        r = await this.timing(spec, progress);
        break;
      case 'mash':
        r = await this.mash(spec, progress);
        break;
      case 'hold':
        r = await this.hold(spec, progress);
        break;
      case 'balance':
        r = await this.balance(spec, progress);
        break;
      case 'phone':
        r = await this.phone(spec, progress);
        break;
      case 'clean':
        r = await this.clean(spec, progress);
        break;
      default:
        r = await this.dialogue(spec, progress);
    }
    if (id !== this.runId) return new Promise<MiniResult>(() => {});
    this.finish();
    return r;
  }

  /* ---- pull: drag a handle up smoothly; yanking too fast wrinkles it ---- */
  private pull(spec: MiniSpec, progress: Progress) {
    const { bar, body } = this.shell(spec);
    body.innerHTML = `<div class="pull-track"><div class="pull-fill"></div><div class="pull-handle">⇡</div></div><div class="pull-msg"></div>`;
    const track = body.querySelector('.pull-track') as HTMLElement;
    const handle = body.querySelector('.pull-handle') as HTMLElement;
    const fill = body.querySelector('.pull-fill') as HTMLElement;
    const msg = body.querySelector('.pull-msg') as HTMLElement;
    return new Promise<MiniResult>((resolve) => {
      let k = 0;
      let wrinkles = 0;
      let dragging = false;
      let lastY = 0;
      let lastT = 0;
      let raf = 0;
      let keyHeld = false;
      const range = () => track.clientHeight - handle.clientHeight - 8;
      const render = () => {
        handle.style.bottom = `${4 + k * range()}px`;
        fill.style.height = `${k * (track.clientHeight - 16)}px`;
        bar.style.width = `${k * 100}%`;
        progress(k);
      };
      const wrinkle = () => {
        wrinkles++;
        k = Math.max(0, k - 0.12);
        msg.textContent = ['Too fast — wrinkle!', 'Smooth like a hotel!', 'Gently…'][wrinkles % 3];
        handle.classList.remove('wrinkle');
        void handle.offsetWidth;
        handle.classList.add('wrinkle');
        this.audio.miss();
        haptic(30);
        dragging = false;
      };
      const done = () => {
        cancelAnimationFrame(raf);
        this.audio.good();
        resolve({ score: clamp(1 - wrinkles * 0.2, 0.3, 1), hearts: 0, lines: [] });
      };
      const setK = (nk: number) => {
        const before = Math.floor(k * 8);
        k = clamp(nk, 0, 1);
        if (Math.floor(k * 8) > before) this.audio.tick();
        render();
        if (k >= 1) done();
      };
      this.on(handle, 'pointerdown', (e: PointerEvent) => {
        dragging = true;
        lastY = e.clientY;
        lastT = performance.now();
        handle.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      this.on(handle, 'pointermove', (e: PointerEvent) => {
        if (!dragging) return;
        const now = performance.now();
        const dy = lastY - e.clientY;
        const v = dy / Math.max(1, now - lastT);
        lastY = e.clientY;
        lastT = now;
        if (v > 2.6 && k > 0.05) return wrinkle();
        setK(k + dy / range());
      });
      this.on(handle, 'pointerup', () => (dragging = false));
      this.on(handle, 'pointercancel', () => (dragging = false));
      this.on(window, 'keydown', (e: KeyboardEvent) => {
        if ([' ', 'arrowup', 'w', 'e'].includes(e.key.toLowerCase())) {
          keyHeld = true;
          e.preventDefault();
        }
      });
      this.on(window, 'keyup', () => (keyHeld = false));
      let last = performance.now();
      const loop = (now: number) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (keyHeld) setK(k + dt * 0.5);
        if (k < 1) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      requestAnimationFrame(render);
    });
  }

  /* ---- sort / place: drag chips into labelled slots; rejects bounce with a line ---- */
  private sort(spec: MiniSpec, progress: Progress) {
    const { bar, body } = this.shell(spec);
    const slots = spec.slots ?? [];
    const items = [...(spec.items ?? [])].sort(() => Math.random() - 0.5);
    const needed = items.filter((i) => !i.reject).length;
    body.innerHTML = `
      <div class="sort-slots">${slots.map((s) => `<div class="sort-slot ${slots.length === 1 ? 'wide' : ''}" data-slot="${s.id}" style="--c:${s.color}"><h4>${esc(s.label)}</h4><div class="placed"></div></div>`).join('')}</div>
      <div class="pull-msg" style="margin:-6px 0 8px"></div>
      <div class="sort-tray">${items.map((it) => `<div class="chip" data-id="${it.id}" style="--c:${it.color}"><i></i>${esc(it.label)}</div>`).join('')}</div>`;
    const msg = body.querySelector('.pull-msg') as HTMLElement;
    return new Promise<MiniResult>((resolve) => {
      let placed = 0;
      let mistakes = 0;
      let selected: HTMLElement | null = null;
      const byId = new Map(items.map((i) => [i.id, i]));
      const slotAt = (x: number, y: number) => {
        const el = document.elementFromPoint(x, y)?.closest('.sort-slot') as HTMLElement | null;
        return el;
      };
      const tryPlace = (chip: HTMLElement, slotEl: HTMLElement | null) => {
        body.querySelectorAll('.sort-slot').forEach((s) => s.classList.remove('hover'));
        if (!slotEl) return;
        const item = byId.get(chip.dataset.id!) as MiniItem;
        const ok = !item.reject && (!item.slot || item.slot === slotEl.dataset.slot);
        if (ok) {
          chip.remove();
          const dot = document.createElement('span');
          dot.style.setProperty('--c2', item.color);
          slotEl.querySelector('.placed')!.appendChild(dot);
          placed++;
          this.audio.pop();
          haptic(12);
          this.onBeat?.('good');
          bar.style.width = `${(placed / needed) * 100}%`;
          progress(placed / needed);
          msg.textContent = '';
          if (placed >= needed) {
            body.querySelectorAll('.chip').forEach((c) => c.remove());
            setTimeout(() => resolve({ score: clamp(1 - mistakes * 0.15, 0.3, 1), hearts: 0, lines: [] }), 350);
          }
        } else {
          mistakes++;
          chip.classList.remove('reject');
          void chip.offsetWidth;
          chip.classList.add('reject');
          msg.textContent = item.reject ?? 'Not there — try another shelf.';
          this.audio.miss();
          this.onBeat?.('miss');
          haptic([20, 40, 20]);
          if (item.reject) setTimeout(() => chip.remove(), 600);
        }
      };
      body.querySelectorAll<HTMLElement>('.chip').forEach((chip) => {
        let ghost: HTMLElement | null = null;
        let sx = 0;
        let sy = 0;
        let moved = false;
        this.on(chip, 'pointerdown', (e: PointerEvent) => {
          sx = e.clientX;
          sy = e.clientY;
          moved = false;
          chip.setPointerCapture(e.pointerId);
          e.preventDefault();
        });
        this.on(chip, 'pointermove', (e: PointerEvent) => {
          if (!chip.hasPointerCapture(e.pointerId)) return;
          if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) {
            moved = true;
            ghost = chip.cloneNode(true) as HTMLElement;
            ghost.classList.add('drag');
            document.body.appendChild(ghost);
            chip.style.opacity = '0.3';
          }
          if (ghost) {
            ghost.style.left = `${e.clientX}px`;
            ghost.style.top = `${e.clientY}px`;
            body.querySelectorAll('.sort-slot').forEach((s) => s.classList.remove('hover'));
            slotAt(e.clientX, e.clientY)?.classList.add('hover');
          }
        });
        this.on(chip, 'pointerup', (e: PointerEvent) => {
          chip.style.opacity = '';
          if (ghost) {
            ghost.remove();
            ghost = null;
            tryPlace(chip, slotAt(e.clientX, e.clientY));
          } else if (!moved) {
            body.querySelectorAll('.chip').forEach((c) => c.classList.remove('sel'));
            selected = chip;
            chip.classList.add('sel');
            this.audio.click();
            if (slots.length === 1) tryPlace(chip, body.querySelector('.sort-slot'));
          }
        });
      });
      body.querySelectorAll<HTMLElement>('.sort-slot').forEach((s) =>
        this.on(s, 'pointerup', () => {
          if (selected && selected.isConnected) tryPlace(selected, s);
          selected = null;
        })
      );
      this.on(window, 'keydown', (e: KeyboardEvent) => {
        const n = parseInt(e.key, 10);
        const chip = body.querySelector<HTMLElement>('.chip.sel') ?? body.querySelector<HTMLElement>('.chip');
        if (!chip) return;
        if (n >= 1 && n <= slots.length) tryPlace(chip, body.querySelectorAll<HTMLElement>('.sort-slot')[n - 1]);
        if (e.key === 'Tab') {
          e.preventDefault();
          const chips = [...body.querySelectorAll<HTMLElement>('.chip')];
          const i = chips.indexOf(chip);
          chips.forEach((c) => c.classList.remove('sel'));
          chips[(i + 1) % chips.length]?.classList.add('sel');
        }
      });
      if (matchMedia('(hover: hover)').matches) {
        const hint = this.stage.querySelector('.stage-hint');
        if (hint) hint.textContent += ` · keys: Tab to pick, 1–${slots.length} to place`;
      }
    });
  }

  /* ---- timing: tap when the sweeping marker is inside the zone (reps / beats) ---- */
  private timing(spec: MiniSpec, progress: Progress) {
    const { bar, body } = this.shell(spec);
    const reps = spec.reps ?? 5;
    body.innerHTML = `<div class="reps">${'<i></i>'.repeat(reps)}</div><div class="timing-bar"><div class="timing-zone"></div><div class="timing-marker"></div></div><button class="big-btn">Tap!</button>`;
    const tb = body.querySelector('.timing-bar') as HTMLElement;
    const zoneEl = body.querySelector('.timing-zone') as HTMLElement;
    const marker = body.querySelector('.timing-marker') as HTMLElement;
    const btn = body.querySelector('.big-btn') as HTMLElement;
    const pips = [...body.querySelectorAll('.reps i')];
    return new Promise<MiniResult>((resolve) => {
      let hits = 0;
      let misses = 0;
      let zone = spec.zone ?? 0.22;
      let speed = spec.speed ?? 1.1;
      let zx = 0.35 + Math.random() * 0.3;
      let t = Math.random();
      let last = performance.now();
      let raf = 0;
      let cool = 0;
      const place = () => {
        zoneEl.style.left = `${(zx - zone / 2) * 100}%`;
        zoneEl.style.width = `${zone * 100}%`;
      };
      place();
      const pos = () => 0.5 - 0.5 * Math.cos(t * Math.PI);
      const loop = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        t += dt * speed;
        cool -= dt;
        marker.style.left = `${pos() * 100}%`;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      const tap = (e?: Event) => {
        e?.preventDefault();
        if (cool > 0) return;
        cool = 0.12;
        btn.classList.add('down');
        setTimeout(() => btn.classList.remove('down'), 90);
        const p = pos();
        const inZone = Math.abs(p - zx) <= zone / 2 + 0.015;
        tb.classList.remove('hit', 'miss');
        void tb.offsetWidth;
        if (inZone) {
          pips[hits]?.classList.add('on');
          hits++;
          tb.classList.add('hit');
          this.audio.good();
          this.onBeat?.('good');
          haptic(18);
          bar.style.width = `${(hits / reps) * 100}%`;
          progress(hits / reps);
          zone = Math.max(0.1, zone * 0.9);
          speed *= 1.08;
          zx = 0.2 + Math.random() * 0.6;
          place();
          if (hits >= reps) {
            cancelAnimationFrame(raf);
            setTimeout(() => resolve({ score: clamp(hits / (hits + misses * 0.6), 0.3, 1), hearts: 0, lines: [] }), 250);
          }
        } else {
          misses++;
          tb.classList.add('miss');
          this.audio.miss();
          this.onBeat?.('miss');
          haptic([15, 30, 15]);
          if (misses % 3 === 0) zone = Math.min(0.32, zone * 1.15);
          place();
        }
      };
      this.on(btn, 'pointerdown', tap);
      this.on(tb, 'pointerdown', tap);
      this.on(window, 'keydown', (e: KeyboardEvent) => {
        if (e.repeat) return;
        if ([' ', 'e', 'enter'].includes(e.key.toLowerCase())) tap(e);
      });
    });
  }

  /* ---- mash: rapid taps fill it; it decays when you stop ---- */
  private mash(spec: MiniSpec, progress: Progress) {
    const { bar, body } = this.shell(spec);
    const verbs = spec.verbs ?? ['Go!', 'Faster!'];
    body.innerHTML = `<div class="mash-count">0%</div><button class="big-btn">${esc(verbs[0])}</button>`;
    const count = body.querySelector('.mash-count') as HTMLElement;
    const btn = body.querySelector('.big-btn') as HTMLElement;
    const target = Math.max(10, Math.round((spec.duration ?? 3) * 6));
    return new Promise<MiniResult>((resolve) => {
      let k = 0;
      let raf = 0;
      let last = performance.now();
      const start = last;
      const render = () => {
        bar.style.width = `${k * 100}%`;
        count.textContent = `${Math.round(k * 100)}%`;
        progress(k);
      };
      const loop = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        k = Math.max(0, k - dt * 0.08);
        render();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      const hit = (e?: Event) => {
        e?.preventDefault();
        k = Math.min(1, k + 1 / target);
        btn.classList.add('down');
        setTimeout(() => btn.classList.remove('down'), 60);
        btn.textContent = k > 0.5 ? verbs[1] : verbs[0];
        this.audio.tick();
        this.onBeat?.('tick');
        haptic(8);
        render();
        if (k >= 1) {
          cancelAnimationFrame(raf);
          this.audio.good();
          const secs = (performance.now() - start) / 1000;
          resolve({ score: clamp(1.4 - secs / ((spec.duration ?? 3) * 2), 0.4, 1), hearts: 0, lines: [] });
        }
      };
      this.on(btn, 'pointerdown', hit);
      this.on(window, 'keydown', (e: KeyboardEvent) => {
        if (e.repeat) return;
        if ([' ', 'e', 'enter'].includes(e.key.toLowerCase())) hit(e);
      });
    });
  }

  /* ---- clean: bag the poop (tap), scrub the puddle (rub / mash), swap the pee pad (tap) ---- */
  private clean(spec: MiniSpec, progress: Progress) {
    const { bar, body } = this.shell(spec);
    const mess = spec.mess ?? ['pee'];
    const spots: Record<string, [number, number][]> = spec.leg
      ? { pee: [[50, 74]], poop: [[24, 70]], pad: [[78, 64]] }
      : { poop: [[24, 34], [72, 76], [44, 80]], pee: [[58, 44], [30, 72]], pad: [[80, 32]] };
    const used: Record<string, number> = {};
    body.innerHTML = `<div class="clean-floor${spec.leg ? ` leg ${spec.leg}` : ''}">${spec.leg ? '<div class="clean-leg"></div>' : ''}<div class="clean-sponge"></div></div><div class="clean-tip"></div>`;
    const floor = body.querySelector('.clean-floor') as HTMLElement;
    const tip = body.querySelector('.clean-tip') as HTMLElement;
    const sponge = body.querySelector('.clean-sponge') as HTMLElement;
    const poopSvg = '<svg viewBox="0 0 40 36"><ellipse cx="20" cy="29" rx="17" ry="6" fill="#6b4226"/><ellipse cx="20" cy="21" rx="12" ry="6" fill="#7a4a2a"/><ellipse cx="20" cy="13" rx="7" ry="5" fill="#86522e"/><ellipse cx="16" cy="11" rx="2" ry="1.3" fill="#b07a4e"/></svg>';
    const items = mess.map((kind) => {
      const i = used[kind] ?? 0;
      used[kind] = i + 1;
      const [x, y] = spots[kind][i % spots[kind].length];
      const el = document.createElement('button');
      el.className = `mess ${kind}`;
      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
      el.setAttribute('aria-label', kind === 'poop' ? 'Bag the poop' : kind === 'pad' ? 'Swap the pee pad' : 'Scrub the puddle');
      if (kind === 'poop') el.innerHTML = poopSvg;
      floor.appendChild(el);
      return { kind, el, left: 1 };
    });
    const tips = { poop: 'Tap the poop to bag it', pee: 'Rub the puddle to scrub it', pad: 'Tap the soggy pad to swap it' };
    return new Promise<MiniResult>((resolve) => {
      const start = performance.now();
      let lastTick = 0;
      let rubbing = false;
      let px = 0;
      let py = 0;
      const render = () => {
        const k = items.reduce((a, it) => a + (1 - it.left), 0) / items.length;
        bar.style.width = `${k * 100}%`;
        progress(k);
        const next = items.find((it) => it.left > 0);
        tip.textContent = next ? tips[next.kind] : 'Spotless!';
        if (!next) {
          this.audio.good();
          const secs = (performance.now() - start) / 1000;
          setTimeout(() => resolve({ score: clamp(1.35 - secs / (items.length * 2.4), 0.45, 1), hearts: secs < items.length * 1.6 ? 1 : 0, lines: [] }), 380);
        }
      };
      const finishItem = (it: (typeof items)[number]) => {
        it.left = 0;
        it.el.classList.add(it.kind === 'pad' ? 'fresh' : 'gone');
        if (it.kind === 'poop') this.audio.pop();
        else if (it.kind === 'pad') this.audio.click();
        else this.audio.chime();
        this.onBeat?.('good');
        haptic(18);
      };
      const scrub = (it: (typeof items)[number], amount: number) => {
        if (it.left <= 0) return;
        it.left = Math.max(0, it.left - amount);
        it.el.style.opacity = `${0.15 + it.left * 0.85}`;
        it.el.style.transform = `translate(-50%, -50%) scale(${0.6 + it.left * 0.4})`;
        const now = performance.now();
        if (now - lastTick > 90) {
          lastTick = now;
          this.audio.tick();
          this.onBeat?.('tick');
          haptic(5);
        }
        if (it.left <= 0) finishItem(it);
      };
      const hitPee = (x: number, y: number) =>
        items.filter((it) => {
          if (it.kind !== 'pee' || it.left <= 0) return false;
          const r = it.el.getBoundingClientRect();
          return x > r.left - 14 && x < r.right + 14 && y > r.top - 14 && y < r.bottom + 14;
        });
      items.forEach((it) => {
        this.on(it.el, 'pointerdown', (e: PointerEvent) => {
          e.preventDefault();
          if (it.left <= 0) return;
          if (it.kind === 'pee') scrub(it, 0.12);
          else finishItem(it);
          render();
        });
      });
      this.on(floor, 'pointerdown', (e: PointerEvent) => {
        rubbing = true;
        px = e.clientX;
        py = e.clientY;
        floor.setPointerCapture?.(e.pointerId);
      });
      this.on(floor, 'pointermove', (e: PointerEvent) => {
        const fr = floor.getBoundingClientRect();
        sponge.style.left = `${e.clientX - fr.left}px`;
        sponge.style.top = `${e.clientY - fr.top}px`;
        sponge.classList.toggle('on', rubbing);
        if (!rubbing) return;
        const d = Math.hypot(e.clientX - px, e.clientY - py);
        px = e.clientX;
        py = e.clientY;
        const hit = hitPee(e.clientX, e.clientY);
        if (hit.length) {
          hit.forEach((it) => scrub(it, d / 420));
          render();
        }
      });
      const stop = () => {
        rubbing = false;
        sponge.classList.remove('on');
      };
      this.on(floor, 'pointerup', stop);
      this.on(floor, 'pointercancel', stop);
      this.on(window, 'keydown', (e: KeyboardEvent) => {
        if (e.repeat || ![' ', 'e', 'enter'].includes(e.key.toLowerCase())) return;
        e.preventDefault();
        const next = items.find((it) => it.left > 0);
        if (!next) return;
        if (next.kind === 'pee') scrub(next, 0.16);
        else finishItem(next);
        render();
      });
      render();
    });
  }

  /* ---- hold: press and keep holding; twitchy variant hops away because she can't keep still ---- */
  private hold(spec: MiniSpec, progress: Progress) {
    const { bar, body } = this.shell(spec);
    body.innerHTML = `<div class="${spec.twitchy ? 'hold-zone' : ''}"><button class="big-btn ${spec.twitchy ? 'hop' : ''}">Hold</button></div><div class="pull-msg"></div>`;
    const btn = body.querySelector('.big-btn') as HTMLElement;
    const msg = body.querySelector('.pull-msg') as HTMLElement;
    const dur = spec.duration ?? 3;
    if (spec.twitchy) {
      btn.style.left = '22%';
      btn.style.top = '30px';
    }
    return new Promise<MiniResult>((resolve) => {
      let k = 0;
      let held = false;
      let pointerHeld = false;
      let keyHeld = false;
      let releases = 0;
      let raf = 0;
      let last = performance.now();
      let hopT = 1.3 + Math.random();
      let tickAcc = 0;
      const lines = ['Stay…', 'She wants to get up.', 'Breathe…', 'Almost…', 'Do not check your phone.'];
      const loop = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        held = pointerHeld || keyHeld;
        if (held) {
          k = Math.min(1, k + dt / dur);
          tickAcc += dt;
          if (tickAcc > 0.35) {
            tickAcc = 0;
            this.audio.tick();
            msg.textContent = lines[Math.floor(k * lines.length) % lines.length];
          }
        } else k = Math.max(0, k - dt * 0.25);
        btn.textContent = held ? 'Holding…' : k > 0 ? 'Hold again!' : 'Hold';
        btn.classList.toggle('down', held);
        bar.style.width = `${k * 100}%`;
        progress(k);
        if (spec.twitchy && held) {
          hopT -= dt;
          if (hopT <= 0) {
            hopT = 1.2 + Math.random() * 0.8;
            btn.style.left = `${4 + Math.random() * 38}%`;
            btn.style.top = `${Math.random() * 60}px`;
            pointerHeld = false;
            keyHeld = false;
            msg.textContent = 'She fidgeted! Grab it again.';
            this.audio.miss();
            haptic(20);
          }
        }
        if (k >= 1) {
          this.audio.good();
          resolve({ score: clamp(1 - releases * 0.12, 0.4, 1), hearts: 0, lines: [] });
          return;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      this.on(btn, 'pointerdown', (e: PointerEvent) => {
        pointerHeld = true;
        btn.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      const up = () => {
        if (pointerHeld) releases++;
        pointerHeld = false;
      };
      this.on(btn, 'pointerup', up);
      this.on(btn, 'pointercancel', up);
      this.on(window, 'keydown', (e: KeyboardEvent) => {
        if ([' ', 'e', 'enter'].includes(e.key.toLowerCase())) {
          if (!e.repeat) keyHeld = true;
          e.preventDefault();
        }
      });
      this.on(window, 'keyup', (e: KeyboardEvent) => {
        if ([' ', 'e', 'enter'].includes(e.key.toLowerCase())) {
          if (keyHeld) releases++;
          keyHeld = false;
        }
      });
      this.cleanup.push(() => cancelAnimationFrame(raf));
    });
  }

  /* ---- balance: counter a wobbling needle, stay in the safe zone ---- */
  private balance(spec: MiniSpec, progress: Progress) {
    const { bar, body } = this.shell(spec);
    body.innerHTML = `<div class="balance-meter"><div class="balance-safe"></div><div class="balance-needle"></div></div>
      <div class="balance-btns"><button class="big-btn" data-d="-1">◀</button><button class="big-btn" data-d="1">▶</button></div>`;
    const needle = body.querySelector('.balance-needle') as HTMLElement;
    const dur = spec.duration ?? 3.5;
    return new Promise<MiniResult>((resolve) => {
      let x = 0;
      let v = 0;
      let push = 0;
      let k = 0;
      let out = 0;
      let raf = 0;
      let last = performance.now();
      let t = 0;
      const btnDir = new Map<number, number>();
      body.querySelectorAll<HTMLElement>('[data-d]').forEach((b) => {
        const d = parseInt(b.dataset.d!, 10);
        this.on(b, 'pointerdown', (e: PointerEvent) => {
          btnDir.set(e.pointerId, d);
          b.classList.add('down');
          b.setPointerCapture(e.pointerId);
          e.preventDefault();
        });
        const up = (e: PointerEvent) => {
          btnDir.delete(e.pointerId);
          b.classList.remove('down');
        };
        this.on(b, 'pointerup', up);
        this.on(b, 'pointercancel', up);
      });
      const keys = new Set<string>();
      this.on(window, 'keydown', (e: KeyboardEvent) => keys.add(e.key.toLowerCase()));
      this.on(window, 'keyup', (e: KeyboardEvent) => keys.delete(e.key.toLowerCase()));
      const loop = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        t += dt;
        push = 0;
        for (const d of btnDir.values()) push += d;
        if (keys.has('arrowleft') || keys.has('a')) push -= 1;
        if (keys.has('arrowright') || keys.has('d')) push += 1;
        const wobble = Math.sin(t * 1.7) * 0.9 + Math.sin(t * 3.1 + 1) * 0.6 + Math.sin(t * 0.7) * 0.5;
        v += (wobble * 1.3 + push * 2.6 - x * 0.4) * dt;
        v *= 1 - dt * 1.6;
        x = clamp(x + v * dt, -1, 1);
        if (Math.abs(x) >= 1) v *= -0.3;
        needle.style.left = `${50 + x * 46}%`;
        const safe = Math.abs(x) < 0.3;
        if (safe) k = Math.min(1, k + dt / dur);
        else {
          out += dt;
          k = Math.max(0, k - dt * 0.12);
        }
        bar.style.width = `${k * 100}%`;
        progress(k);
        if (k >= 1) {
          this.audio.good();
          resolve({ score: clamp(1 - out / (dur * 1.5), 0.35, 1), hearts: 0, lines: [] });
          return;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      this.cleanup.push(() => cancelAnimationFrame(raf));
    });
  }

  /* ---- dialogue choices ---- */
  private dialogue(spec: MiniSpec, progress: Progress) {
    const { bar, body } = this.shell(spec);
    const lines = spec.lines ?? [];
    body.innerHTML = `<div class="dlg-lines">${lines
      .map((l, i) => `<div style="display:flex;gap:8px;align-items:center;animation:coachin .3s ${i * 0.25}s backwards">${portraitHtml(l.who, 'dlg-portrait" style="width:34px;height:34px;border-width:2px;font-size:14px')}<div class="bubble them" style="max-width:100%">${l.name ? `<b>${esc(l.name)}:</b> ` : ''}${esc(l.text)}</div></div>`)
      .join('')}</div>
      <div class="choices">${(spec.choices ?? []).map((c, i) => `<button class="choice" data-i="${i}" style="animation-delay:${0.3 + lines.length * 0.25 + i * 0.08}s">${esc(c.label)}</button>`).join('')}</div>`;
    return new Promise<MiniResult>((resolve) => {
      const pick = (i: number) => {
        const c = spec.choices?.[i];
        if (!c) return;
        this.audio.good();
        bar.style.width = '100%';
        progress(1);
        resolve({ score: 1, hearts: c.hearts, lines: c.reply });
      };
      body.querySelectorAll<HTMLElement>('.choice').forEach((b) => this.on(b, 'click', () => pick(parseInt(b.dataset.i!, 10))));
      this.on(window, 'keydown', (e: KeyboardEvent) => {
        const n = parseInt(e.key, 10);
        if (n >= 1) pick(n - 1);
      });
    });
  }

  /* ---- phone: tap through a text-thread call, then choose a reply ---- */
  private phone(spec: MiniSpec, progress: Progress) {
    const { bar, body } = this.shell(spec);
    this.audio.ring();
    const av = spec.caller ?? { letter: spec.title.charAt(0), color: '#b48cff' };
    body.innerHTML = `<div class="phone"><div class="phone-head"><div class="av" style="background:${av.color}">${esc(av.letter)}</div>${esc(spec.title)}<small>on call · 00:00</small></div><div class="phone-screen"></div></div><div class="tap-next">Tap to continue</div><div class="choices"></div>`;
    const screen = body.querySelector('.phone-screen') as HTMLElement;
    const choices = body.querySelector('.choices') as HTMLElement;
    const tapNext = body.querySelector('.tap-next') as HTMLElement;
    const clock = body.querySelector('small') as HTMLElement;
    const lines = spec.lines ?? [];
    const start = performance.now();
    const iv = window.setInterval(() => {
      const s = Math.floor((performance.now() - start) / 1000);
      clock.textContent = `on call · 00:${String(s).padStart(2, '0')}`;
    }, 500);
    this.cleanup.push(() => window.clearInterval(iv));
    const bubble = (l: Line) => {
      const b = document.createElement('div');
      b.className = `bubble ${l.who === 'louise' ? 'me' : 'them'}`;
      b.textContent = l.text;
      if (l.sub) {
        const sub = document.createElement('small');
        sub.className = 'bubble-sub';
        sub.textContent = l.sub;
        b.appendChild(sub);
      }
      screen.appendChild(b);
      screen.scrollTop = screen.scrollHeight;
      this.audio.pop();
    };
    return new Promise<MiniResult>((resolve) => {
      let i = 0;
      const total = lines.length + 1;
      const next = () => {
        if (i < lines.length) {
          bubble(lines[i++]);
          bar.style.width = `${(i / total) * 100}%`;
          progress(i / total);
          if (i >= lines.length) showChoices();
        }
      };
      const showChoices = () => {
        tapNext.style.display = 'none';
        choices.innerHTML = (spec.choices ?? []).map((c, k) => `<button class="choice" data-i="${k}">${esc(c.label)}</button>`).join('');
        choices.querySelectorAll<HTMLElement>('.choice').forEach((b) =>
          this.on(b, 'click', (e: Event) => {
            e.stopPropagation();
            const c = spec.choices![parseInt(b.dataset.i!, 10)];
            bubble({ who: 'louise', text: c.label.replace(/[“”"]/g, '') });
            choices.innerHTML = '';
            let d = 0;
            for (const r of c.reply) {
              d += 700;
              setTimeout(() => bubble(r), d);
            }
            bar.style.width = '100%';
            progress(1);
            setTimeout(() => resolve({ score: 1, hearts: c.hearts, lines: [] }), d + 1100);
          })
        );
      };
      next();
      this.on(body.querySelector('.phone')!, 'pointerdown', (e: Event) => {
        e.preventDefault();
        next();
      });
      this.on(window, 'keydown', (e: KeyboardEvent) => {
        const n = parseInt(e.key, 10);
        if (i >= lines.length && n >= 1) (choices.querySelectorAll<HTMLElement>('.choice')[n - 1])?.click();
        else if ([' ', 'e', 'enter'].includes(e.key.toLowerCase())) next();
      });
    });
  }
}
