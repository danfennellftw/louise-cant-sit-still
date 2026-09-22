import { ACTS, SETS, suggested, actOf, type SetId } from '../game/story';
import { esc } from './ui';
import type { Audio } from '../engine/audio';

/**
 * Stylized south-OC day map. Every stop is pickable (including finished ones); the story's
 * suggested next stops just glow. Resolves with the picked stop, or null when closed.
 */
export function showDayMap(root: HTMLElement, audio: Audio, done: Set<SetId>, current: SetId | null, closable: boolean): Promise<SetId | null> {
  const avail = new Set(suggested(done));
  const nextAct = avail.size ? actOf([...avail][0]) : null;
  const node = (id: SetId) => {
    const m = SETS[id];
    const isDone = done.has(id);
    const isAvail = avail.has(id);
    const fill = isDone ? '#7fd1b9' : isAvail ? '#f2c46d' : '#e9d9c4';
    return `<g class="map-node ${isAvail ? 'avail' : ''} ${isDone ? 'done' : ''}" data-id="${id}" transform="translate(${m.map[0]},${m.map[1]})">
      ${isAvail ? `<circle class="ring" r="8" fill="none" stroke="#f2c46d" stroke-width="2"/>` : ''}
      <circle class="dot" r="${isAvail ? 8 : 6}" fill="${fill}" stroke="#2b1d2e" stroke-width="2"/>
      ${isDone ? '<path d="M-3 0 l2 2.5 l4-5" stroke="#10372c" stroke-width="2" fill="none"/>' : ''}
      <text x="11" y="4" fill="${isAvail ? '#fff6ec' : isDone ? '#bfe9dc' : '#f4e8da'}">${esc(SETS[id].short)}</text>
    </g>`;
  };
  const home = SETS.condo.map;
  const trailPath = `M${SETS.eos.map[0] - 10},${SETS.trail.map[1] - 30} C 280 300, 200 330, ${SETS.grit.map[0] + 10},${SETS.grit.map[1] + 6}`;
  const svg = `
    <svg viewBox="0 0 360 440" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4c7fa3"/><stop offset="1" stop-color="#2e5f84"/></linearGradient>
        <linearGradient id="land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3e3c4"/><stop offset="1" stop-color="#e2c99c"/></linearGradient>
        <pattern id="waves" width="24" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 q6 -4 12 0 t12 0" stroke="rgba(255,255,255,.18)" fill="none"/></pattern>
      </defs>
      <rect width="360" height="440" rx="26" fill="url(#sea)"/>
      <rect width="360" height="440" rx="26" fill="url(#waves)"/>
      <path d="M40 0 H360 V440 H250 C 230 410, 200 395, 170 372 C 140 350, 110 345, 92 325 C 70 300, 60 270, 48 240 C 36 205, 30 170, 36 130 C 40 90, 30 40, 40 0 Z" fill="url(#land)"/>
      <path d="M250 440 C 230 410, 200 395, 170 372 C 140 350, 110 345, 92 325 C 70 300, 60 270, 48 240 C 36 205, 30 170, 36 130 C 40 90, 30 40, 40 0" stroke="#fff6ec" stroke-width="3" fill="none" opacity=".7"/>
      <g opacity=".35" fill="#b99a6a">
        <ellipse cx="300" cy="60" rx="50" ry="22"/><ellipse cx="320" cy="170" rx="34" ry="16"/><ellipse cx="310" cy="360" rx="40" ry="18"/>
      </g>
      <path d="${trailPath}" stroke="#ff9e7a" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round" fill="none"/>
      <g font-family="Fraunces, Georgia, serif" font-style="italic" font-size="11" fill="#8a6a4a" opacity=".85">
        <text x="120" y="360">Dana Point</text><text x="232" y="420">San Clemente</text><text x="266" y="210">Ladera</text>
        <text x="276" y="116">RSM</text><text x="258" y="300">SJC</text>
      </g>
      <text x="44" y="400" font-family="Fraunces, Georgia, serif" font-style="italic" font-size="14" fill="rgba(255,255,255,.55)">Pacific Ocean</text>
      <circle cx="${home[0]}" cy="${home[1]}" r="26" fill="rgba(255,158,122,.18)"/>
      ${(Object.keys(SETS) as SetId[]).filter((id) => !['garage', 'night', 'downstairs'].includes(id)).map(node).join('')}
      <text x="${home[0] - 8}" y="${home[1] - 30}" font-size="10" font-weight="700" fill="#ff6f59" font-family="Fredoka">HOME</text>
    </svg>`;
  const acts = ACTS.map((a) => {
    const cur = nextAct?.num === a.num;
    const chips = a.sets
      .map((id) => {
        const st = done.has(id) ? 'done' : avail.has(id) ? 'avail' : '';
        return `<button data-id="${id}" class="${st}">${esc(SETS[id].short)}</button>`;
      })
      .join('');
    return `<div class="act-row ${cur ? 'current' : ''}"><span class="num">${a.num}</span><span class="t">${esc(a.title)}<small>${esc(a.sub)}</small></span><span class="chips">${chips}</span></div>`;
  }).join('');
  const el = document.createElement('div');
  el.className = 'map-screen';
  el.innerHTML = `<h2>Louise’s Day</h2><div class="sub">Tap any stop to go there. ${avail.size ? 'Glowing = next in the story.' : 'Every stop done!'}</div>
    <div class="map-wrap">${svg}</div><div class="acts">${acts}</div>
    ${closable ? '<button class="cta secondary map-close">Back to the game</button>' : ''}`;
  root.appendChild(el);
  void current;
  return new Promise((resolve) => {
    const pick = (id: SetId) => {
      if (!SETS[id]) return;
      audio.whoosh();
      el.remove();
      resolve(id);
    };
    el.querySelectorAll<SVGGElement>('.map-node').forEach((g) => g.addEventListener('click', () => pick(g.dataset.id as SetId)));
    el.querySelectorAll<HTMLButtonElement>('.chips button').forEach((b) => b.addEventListener('click', () => pick(b.dataset.id as SetId)));
    el.querySelector('.map-close')?.addEventListener('click', () => {
      el.remove();
      resolve(null);
    });
    if (avail.size === 1 && !closable) {
      const only = [...avail][0];
      const key = (e: KeyboardEvent) => {
        if (['e', ' ', 'enter'].includes(e.key.toLowerCase())) {
          window.removeEventListener('keydown', key);
          pick(only);
        }
      };
      window.addEventListener('keydown', key);
    }
  });
}
