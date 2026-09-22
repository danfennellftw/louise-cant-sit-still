import type * as THREE from 'three';
import type { HumanState } from '../art/characters/human';
import type { Particles, Leaves } from '../art/fx';
import type { Actor } from '../art/characters/actor';

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export type Speaker = 'louise' | 'dan' | 'nina' | 'mochi' | 'leo' | 'narrator' | 'npc';

export interface Line {
  who: Speaker;
  text: string;
  name?: string;
}

export type MiniType = 'pull' | 'sort' | 'place' | 'timing' | 'mash' | 'hold' | 'balance' | 'dialogue' | 'phone' | 'clean';

export interface MiniItem {
  id: string;
  label: string;
  color: string;
  slot?: string;
  /** Items that must NOT go in (green food for Dan). Shown line on attempt. */
  reject?: string;
  icon?: string;
}

export interface MiniChoice {
  label: string;
  reply: Line[];
  hearts: number;
}

export interface MiniSpec {
  type: MiniType;
  title: string;
  hint?: string;
  items?: MiniItem[];
  slots?: { id: string; label: string; color: string }[];
  reps?: number;
  zone?: number;
  speed?: number;
  duration?: number;
  choices?: MiniChoice[];
  lines?: Line[];
  verbs?: [string, string];
  /** Hold mini: the button hops around because she can't keep still. */
  twitchy?: boolean;
  /** Clean mini: the dog messes on the floor, in the order they're laid out. */
  mess?: ('poop' | 'pee' | 'pad')[];
  /** Clean mini: draw the furniture leg Leo picked. */
  leg?: 'piano' | 'stool';
}

export interface MarkSpot {
  id: string;
  /** e.g. "piano leg" */
  label: string;
  kind: 'piano' | 'stool';
  /** Floor point at the base of the leg (puddle centre). */
  leg: [number, number];
  /** Where Leo (and later Louise) stands next to it. */
  stand: [number, number];
}

export interface StopDef {
  id: string;
  label: string;
  verb: string;
  pos: [number, number];
  stand?: [number, number];
  face?: number;
  radius?: number;
  pose: HumanState;
  /** Spawned at runtime (Leo's marks): removed from the set once done instead of staying checked. */
  transient?: boolean;
  /** Where Louise's root goes while posing (e.g. onto the bed / bike seat). */
  poseAt?: [number, number, number];
  /** Dogs hop to these spots and settle during the stop (bed, bench…). */
  dogSpots?: [number, number, number][];
  mini: MiniSpec;
  intro?: Line[];
  outro?: Line[];
  refill: number;
  hearts: number;
  optional?: boolean;
  color?: string;
  push?: { dist: number; height: number; yaw?: number };
}

export interface StopHooks {
  start?(): void;
  progress?(k: number): void;
  done?(): void;
  reset?(): void;
}

export interface LightKit {
  sky: string;
  ground: string;
  hemi: number;
  sun: string;
  sunIntensity: number;
  sunDir: [number, number, number];
  env: number;
  exposure: number;
  fog: string;
  fogNear: number;
  fogFar: number;
  background: string;
}

export interface CamSpec {
  dist: number;
  height: number;
  fov: number;
  yaw: number;
  lookY: number;
  lookAhead: number;
}

export type AmbienceId = 'home' | 'homeNight' | 'gym' | 'spin' | 'retail' | 'mall' | 'outdoor' | 'trail' | 'garage' | 'night';
export type MusicId = 'cozy' | 'gym' | 'spin' | 'retail' | 'golden' | 'night' | 'title';
export type SurfaceId = 'wood' | 'tile' | 'rubber' | 'grass' | 'stone' | 'concrete' | 'carpet';

export interface BuiltSet {
  root: THREE.Group;
  bounds: Rect;
  colliders: Rect[];
  spawn: { x: number; z: number; face: number };
  exit: { x: number; z: number; label: string } | null;
  stops: StopDef[];
  hooks: Record<string, StopHooks>;
  light: LightKit;
  camera: CamSpec;
  ambience: AmbienceId;
  music: MusicId;
  surface: SurfaceId;
  particles: Particles[];
  leaves: Leaves | null;
  npcs: Actor[];
  dogs: 'follow' | 'basket' | 'none';
  vehicle: 'ebike' | null;
  gates: { x: number; z: number; w: number; mesh?: THREE.Object3D }[];
  dogBeds: { mochi: [number, number]; leo: [number, number] } | null;
  stealables: { label: string; x: number; z: number; color: string }[];
  /** Furniture legs Leo reliably pees on (condo). */
  markSpots?: MarkSpot[];
  /** Open gaps at the front of room partitions (x, z) that dogs route through when crossing rooms. */
  dogGates?: [number, number][];
  /** Set-side hooks the director wires up (e.g. a passing train's horn). */
  events: { sfx?: (id: 'horn', at: THREE.Vector3) => void };
  update(dt: number, t: number): void;
  dispose(): void;
}
