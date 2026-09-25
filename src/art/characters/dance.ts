/**
 * Louise's little-kicks flipbook.
 *
 * Each frame is one finished full-body drawing. Playback swaps that
 * texture on a single billboard — no separate arm or leg meshes.
 * Original motion only: no borrowed footage, audio, or titles.
 */

export const KICK_FPS = 10;
export const KICK_SHOW_SEC = 4.6;

export type KickPhase = 'jabL' | 'jabR' | 'kickL' | 'kickR' | 'heave' | 'bob';

export interface KickFrame {
  id: string;
  file: string;
  /** 1 while a foot is off the floor. */
  kick: number;
  /** +1 screen-left kick, -1 screen-right kick. */
  side: 1 | -1;
  /** Holds at KICK_FPS. Two ticks ≈ a readable beat. */
  ticks: number;
  phase: KickPhase;
}

/** Order is the dance: right kick, jab + left kick, heave, kick swap, grin, lean. */
export const KICK_FRAMES: KickFrame[] = [
  { id: 'kickR', file: 'sprites/kick/f1.webp', kick: 1, side: -1, ticks: 2, phase: 'kickR' },
  { id: 'jabL', file: 'sprites/kick/f2.webp', kick: 1, side: 1, ticks: 2, phase: 'jabL' },
  { id: 'heave', file: 'sprites/kick/f3.webp', kick: 0, side: 1, ticks: 2, phase: 'heave' },
  { id: 'kickL', file: 'sprites/kick/f4.webp', kick: 1, side: 1, ticks: 2, phase: 'kickL' },
  { id: 'grin', file: 'sprites/kick/f5.webp', kick: 1, side: -1, ticks: 2, phase: 'kickR' },
  { id: 'lean', file: 'sprites/kick/f6.webp', kick: 1, side: -1, ticks: 2, phase: 'heave' },
];

export const KICK_FILES = KICK_FRAMES.map((f) => f.file);

const TICK = 1 / KICK_FPS;
const TOTAL_TICKS = KICK_FRAMES.reduce((sum, f) => sum + f.ticks, 0);
export const KICK_LOOP = TOTAL_TICKS * TICK;

/** Times that freeze a single readable drawing. */
export const KICK_SHOTS = {
  kickR: 0.05,
  jab: 0.25,
  kickL: 0.65,
} as const;

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

export function kickFrameAt(danceT: number): KickFrame & { index: number } {
  const t = ((danceT % KICK_LOOP) + KICK_LOOP) % KICK_LOOP;
  let tick = Math.floor(t / TICK + 1e-6);
  if (tick >= TOTAL_TICKS) tick = TOTAL_TICKS - 1;
  let acc = 0;
  for (let i = 0; i < KICK_FRAMES.length; i++) {
    const frame = KICK_FRAMES[i];
    if (tick < acc + frame.ticks) return { ...frame, index: i };
    acc += frame.ticks;
  }
  return { ...KICK_FRAMES[0], index: 0 };
}

export function littleKicks(danceT: number): LittleKickPose {
  const f = kickFrameAt(danceT);
  const kickL = f.kick > 0 && f.side > 0 ? f.kick : 0;
  const kickR = f.kick > 0 && f.side < 0 ? f.kick : 0;
  return {
    phase: f.phase,
    jabL: f.phase === 'jabL' ? 1 : 0,
    jabR: f.phase === 'jabR' ? 1 : 0,
    kickL,
    kickR,
    heave: f.phase === 'heave' ? 1 : 0,
    bob: f.side,
  };
}

/** 0–1 while a little kick is up. Tap windows in the mini-game use this. */
export function kickEnvelope(danceT: number) {
  return kickFrameAt(danceT).kick;
}

/** +1 kicks to her screen-left, -1 to her screen-right. */
export function kickSide(danceT: number): 1 | -1 {
  return kickFrameAt(danceT).side;
}
