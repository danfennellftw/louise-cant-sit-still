import { ACTS, SETS, type SetId } from '../game/story';
import type { CallerId } from '../game/calls';
import type { Audio } from '../engine/audio';
import { esc } from './ui';

/** Where a demo detour lands: a set, optionally straight into one stop or a phone-call beat. */
export interface DetourTarget {
  set: SetId;
  stop?: string;
  call?: CallerId;
  /** Where Louise lands instead of the set's spawn (frames the scene for showing people). */
  at?: [number, number];
}

interface Scene extends DetourTarget {
  label: string;
  note: string;
}

const CHAPTERS: { label: string; set: SetId }[] = [
  ...ACTS.map((a) => ({ label: a.title.replace(/\s*\(.*\)/, ''), set: a.sets[0] })),
  { label: 'Night in bed', set: 'night' },
];

const SCENES: Scene[] = [
  { label: 'Condo morning', note: 'Living room, kitchen, bedroom', set: 'condo' },
  { label: 'Plan the day', note: 'Desk nook stop', set: 'condo', stop: 'desk' },
  { label: 'Mochi’s accidents', note: 'Cleanup mini', set: 'condo', stop: 'mochi' },
  { label: 'Mom calls', note: 'Tagalog check-in', set: 'condo', call: 'mom' },
  { label: 'Grit Cycle', note: 'Dana Point spin', set: 'grit' },
  { label: 'Nina calls', note: 'School pickup check-in', set: 'condo', call: 'nina' },
  { label: 'TJ Maxx', note: 'Home-aisle treasure hunt', set: 'tjmaxx' },
  { label: 'Coffee meetup', note: 'Louise finds her AI people', set: 'plaza' },
  { label: 'E-bike trail', note: 'San Juan Creek → Doheny', set: 'trail' },
  { label: 'Garage sauna', note: 'Model Y · sauna · Model 3', set: 'garage', at: [0, 2.2] },
  { label: 'YouTube in bed', note: 'With the dogs', set: 'night' },
  { label: 'Dogs downstairs', note: 'Herding finale', set: 'downstairs' },
];

/**
 * Demo / detour panel: chapter jumps, quick scenes and the full day map, reachable from the
 * title, pause and the HUD at any moment. Resolves with a target, 'map', or null (closed).
 */
export function showDetour(root: HTMLElement, audio: Audio, opts: { current: SetId | null; closeLabel: string }): Promise<DetourTarget | 'map' | null> {
  const el = document.createElement('div');
  el.className = 'detour-screen';
  const chip = (c: { label: string; set: SetId }, i: number) =>
    `<button class="dt-chap" data-set="${c.set}"><b>${i < ACTS.length ? ACTS[i].num : '☾'}</b>${esc(c.label)}</button>`;
  const scene = (s: Scene, i: number) =>
    `<button class="dt-scene ${s.set === opts.current && !s.stop && !s.call ? 'here' : ''}" data-i="${i}"><b>${esc(s.label)}</b><small>${esc(s.note)} · ${esc(SETS[s.set].short)}</small></button>`;
  el.innerHTML = `
    <div class="dt-card">
      <div class="dt-head"><h2>Detour the day</h2><span class="dt-badge">Demo</span></div>
      <p class="dt-sub">Jump anywhere, any time — nothing is locked. The story order is just a suggestion, and progress still saves.</p>
      <div class="dt-label">Jump to a chapter</div>
      <div class="dt-chaps">${CHAPTERS.map(chip).join('')}</div>
      <div class="dt-label">Quick scenes</div>
      <div class="dt-scenes">${SCENES.map(scene).join('')}</div>
      <button class="cta dt-map">Open the full day map</button>
      <button class="cta secondary dt-close">${esc(opts.closeLabel)}</button>
    </div>`;
  root.appendChild(el);
  return new Promise((resolve) => {
    const done = (v: DetourTarget | 'map' | null) => {
      window.removeEventListener('keydown', key, true);
      el.remove();
      resolve(v);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        done(null);
      }
    };
    window.addEventListener('keydown', key, true);
    const stop = (e: Event) => e.stopPropagation();
    ['pointerdown', 'touchstart', 'mousedown'].forEach((t) => el.addEventListener(t, stop));
    el.querySelectorAll<HTMLButtonElement>('.dt-chap').forEach((b) =>
      b.addEventListener('click', () => {
        audio.whoosh();
        done({ set: b.dataset.set as SetId });
      })
    );
    el.querySelectorAll<HTMLButtonElement>('.dt-scene').forEach((b) =>
      b.addEventListener('click', () => {
        audio.whoosh();
        const s = SCENES[parseInt(b.dataset.i!, 10)];
        done({ set: s.set, stop: s.stop, call: s.call, at: s.at });
      })
    );
    el.querySelector('.dt-map')!.addEventListener('click', () => {
      audio.click();
      done('map');
    });
    el.querySelector('.dt-close')!.addEventListener('click', () => {
      audio.click();
      done(null);
    });
  });
}
