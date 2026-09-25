/**
 * Louise's little-kicks loop.
 *
 * Phrase (about 4.2s), named so the pose reads at a glance:
 *   jabL / jabR — stiff thumbs-out pumps, alternating, elbows nearly locked
 *   kickL / kickR — short sharp side kicks, one foot planted, off the jab beat
 *   heave — jerky torso convulsion (a dry heave, not a sway)
 *   bob — head snaps side to side with the pumps
 *
 * The opening half-second already has a thumb jab and the first kick.
 * Original motion only — no borrowed footage, audio, or titles.
 */

export const KICK_LOOP = 4.2;
export const KICK_SHOW_SEC = 4.6;

/** Frames where one move is clearly winning, for stills. */
export const KICK_SHOTS = {
  kickL: 0.26,
  kickR: 0.68,
  jab: 0.04,
} as const;

export type KickPhase = 'jabL' | 'jabR' | 'kickL' | 'kickR' | 'heave' | 'bob';

export interface LittleKickPose {
  phase: KickPhase;
  jabL: number;
  jabR: number;
  kickL: number;
  kickR: number;
  heave: number;
  /** -1 head left, +1 head right. */
  bob: number;
}

const JAB_L = [0, 0.36, 0.72, 1.08, 1.44, 1.8, 2.16, 2.52, 2.88, 3.24, 3.6, 3.96];
const JAB_R = JAB_L.map((t) => t + 0.18);
const KICK_L = [0.22, 1.06, 1.9, 2.74, 3.58];
const KICK_R = [0.64, 1.48, 2.32, 3.16, 4.0];
const HEAVE = [0.08, 0.34, 0.66, 0.98, 1.3, 1.62, 1.94, 2.26, 2.58, 2.9, 3.22, 3.54, 3.86];

function pulse(t: number, at: number, attack: number, hold: number, release: number) {
  let best = 0;
  for (const shift of [0, KICK_LOOP, -KICK_LOOP]) {
    const u = t - (at + shift);
    let v = 0;
    if (u >= -attack && u < 0) v = (u + attack) / attack;
    else if (u >= 0 && u < hold) v = 1;
    else if (u >= hold && u < hold + release) v = 1 - (u - hold) / release;
    if (v > best) best = v;
  }
  // Snap the attack so the kick arrives, it doesn't ease in like a stretch.
  return best <= 0 ? 0 : 1 - (1 - best) * (1 - best);
}

function maxPulse(t: number, ats: number[], attack: number, hold: number, release: number) {
  let m = 0;
  for (const at of ats) m = Math.max(m, pulse(t, at, attack, hold, release));
  return m;
}

export function littleKicks(danceT: number): LittleKickPose {
  const t = ((danceT % KICK_LOOP) + KICK_LOOP) % KICK_LOOP;
  const jabL = maxPulse(t, JAB_L, 0.04, 0.055, 0.05);
  const jabR = maxPulse(t, JAB_R, 0.04, 0.055, 0.05);
  const kickL = maxPulse(t, KICK_L, 0.035, 0.09, 0.055);
  const kickR = maxPulse(t, KICK_R, 0.035, 0.09, 0.055);
  const heave = maxPulse(t, HEAVE, 0.03, 0.04, 0.055);
  let bob = jabR - jabL;
  if (Math.abs(bob) < 0.2) bob = (Math.floor(t * 5.5) % 2 === 0 ? -1 : 1) * 0.62;
  let phase: KickPhase = 'bob';
  if (kickL > 0.55 && kickL >= kickR) phase = 'kickL';
  else if (kickR > 0.55) phase = 'kickR';
  else if (jabL > 0.55 && jabL >= jabR) phase = 'jabL';
  else if (jabR > 0.55) phase = 'jabR';
  else if (heave > 0.55) phase = 'heave';
  return { phase, jabL, jabR, kickL, kickR, heave, bob };
}

/** 0–1 while a little kick is up. Tap windows in the mini-game use this. */
export function kickEnvelope(danceT: number) {
  const p = littleKicks(danceT);
  return Math.max(p.kickL, p.kickR);
}

/** +1 kicks to her screen-left, -1 to her screen-right. The first kick is left. */
export function kickSide(danceT: number): 1 | -1 {
  const p = littleKicks(danceT);
  return p.kickR > p.kickL ? -1 : 1;
}
