import type { BuiltSet } from '../world/types';
import type { QualityLevel } from '../engine/quality';
import { buildCondo } from '../world/sets/condo';
import { buildGrit, buildShredz, buildCrunch, buildEos } from '../world/sets/gyms';
import { buildGrocery, buildTjMaxx, buildMarshalls, buildMall } from '../world/sets/retail';
import { buildPlaza, buildTrail } from '../world/sets/outdoor';
import { buildGarage, buildDownstairs } from '../world/sets/evening';

export type SetId =
  | 'condo' | 'grit' | 'shredz' | 'crunch' | 'eos' | 'grocery' | 'tjmaxx' | 'marshalls' | 'mall' | 'plaza' | 'trail' | 'garage' | 'night' | 'downstairs';

export interface SetMeta {
  id: SetId;
  title: string;
  place: string;
  time: string;
  short: string;
  /** Position on the stylized day map (viewBox 360×440). */
  map: [number, number];
  build(q: QualityLevel): BuiltSet;
}

export const SETS: Record<SetId, SetMeta> = {
  condo: { id: 'condo', title: 'The Condo', place: 'Home', time: '6:58 AM', short: 'Condo', map: [214, 196], build: (q) => buildCondo(q, false) },
  grit: { id: 'grit', title: 'Grit Cycle', place: 'Dana Point', time: '8:10 AM', short: 'Grit', map: [120, 322], build: buildGrit },
  shredz: { id: 'shredz', title: 'Shredz', place: 'Ladera Ranch', time: '9:30 AM', short: 'Shredz', map: [250, 228], build: buildShredz },
  crunch: { id: 'crunch', title: 'Crunch', place: 'San Clemente', time: '10:40 AM', short: 'Crunch', map: [214, 398], build: buildCrunch },
  eos: { id: 'eos', title: 'EOS Fitness', place: 'Rancho Santa Margarita', time: '11:45 AM', short: 'EOS', map: [292, 132], build: buildEos },
  grocery: { id: 'grocery', title: 'The Grocery Store', place: 'Around town', time: '12:50 PM', short: 'Grocery', map: [176, 176], build: buildGrocery },
  tjmaxx: { id: 'tjmaxx', title: 'TJ Maxx', place: 'Around town', time: '1:35 PM', short: 'TJ Maxx', map: [140, 136], build: buildTjMaxx },
  marshalls: { id: 'marshalls', title: 'Marshall’s', place: 'Around town', time: '2:15 PM', short: 'Marshall’s', map: [198, 108], build: buildMarshalls },
  mall: { id: 'mall', title: 'The Mall', place: 'Nike · Skincare · Massage', time: '3:00 PM', short: 'Mall', map: [96, 186], build: buildMall },
  plaza: { id: 'plaza', title: 'Coffee Plaza', place: 'AI meetup · Nina', time: '4:20 PM', short: 'Coffee', map: [168, 254], build: buildPlaza },
  trail: { id: 'trail', title: 'The E-Bike Trail', place: 'RMV → San Juan Capistrano → Dana Point', time: '6:05 PM', short: 'Trail', map: [270, 280], build: buildTrail },
  garage: { id: 'garage', title: 'Garage Sauna', place: 'Home', time: '8:10 PM', short: 'Sauna', map: [226, 210], build: buildGarage },
  night: { id: 'night', title: 'Bedtime', place: 'Home', time: '9:40 PM', short: 'Bed', map: [202, 212], build: (q) => buildCondo(q, true) },
  downstairs: { id: 'downstairs', title: 'Downstairs', place: 'Home', time: '10:05 PM', short: 'Dogs', map: [214, 222], build: buildDownstairs },
};

export interface Act {
  num: number;
  title: string;
  sub: string;
  sets: SetId[];
  /** When true the sets play in order; otherwise the player picks the order on the day map. */
  ordered: boolean;
}

export const ACTS: Act[] = [
  { num: 1, title: 'Rise & Organize', sub: 'Morning at the condo', sets: ['condo'], ordered: true },
  { num: 2, title: 'The Fitness Circuit', sub: 'Grit Cycle + three gyms in three towns', sets: ['grit', 'shredz', 'crunch', 'eos'], ordered: false },
  { num: 3, title: 'Errand Sprint', sub: 'Groceries, finds & a glow-up', sets: ['grocery', 'tjmaxx', 'marshalls', 'mall'], ordered: false },
  { num: 4, title: 'Social Hour', sub: 'AI friends, Nina & the golden-hour ride', sets: ['plaza', 'trail'], ordered: true },
  { num: 5, title: 'Wind-Down (Allegedly)', sub: 'Sauna, YouTube, dogs downstairs', sets: ['garage', 'night', 'downstairs'], ordered: true },
];

export function actOf(id: SetId) {
  return ACTS.find((a) => a.sets.includes(id))!;
}

/** The story's suggested next stops. Guidance only: the day map lets you pick any stop. */
export function suggested(done: Set<SetId>): SetId[] {
  for (const act of ACTS) {
    const left = act.sets.filter((s) => !done.has(s));
    if (!left.length) continue;
    return act.ordered ? [left[0]] : left;
  }
  return [];
}

export function allDone(done: Set<SetId>) {
  return ACTS.every((a) => a.sets.every((s) => done.has(s)));
}

export function isFirstOfAct(id: SetId, done: Set<SetId>) {
  const act = actOf(id);
  return act.sets.every((s) => !done.has(s));
}

const ROASTS = [
  'Scientists are baffled. Seismographs registered a stillness event.',
  'Mochi stared. Leo judged softly. Dan quietly took a photo for evidence.',
  'For one second, the universe was calm. It was deeply unsettling.',
  'Her Apple Watch asked if she was okay.',
  'Somewhere in Dana Point, a spin bike felt a disturbance.',
  'A drawer, somewhere, remained un-reorganized. Chaos.',
  'Dan: “Did… did she just sit?” Nobody believes him.',
];

export function roast(n: number) {
  return ROASTS[n % ROASTS.length];
}

export interface SaveData {
  done: SetId[];
  stops: Record<string, string[]>;
  hearts: number;
  sits: number;
  dogs: number;
  tutorial: boolean;
}

const KEY = 'lcss.save.v2';

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SaveData;
    return s.done ? s : null;
  } catch {
    return null;
  }
}

export function writeSave(s: SaveData) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
