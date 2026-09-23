import type { LightKit, CamSpec, BuiltSet } from './types';
import type { SetCtx } from './kit';
import { disposeTree } from '../art/geo';

export const KITS: Record<string, LightKit> = {
  morning: {
    sky: '#fff1dc', ground: '#b48a6a', hemi: 0.85, sun: '#ffe2b8', sunIntensity: 2.8, sunDir: [-4, 9, 6],
    env: 0.4, exposure: 0.98, fog: '#efe3d2', fogNear: 28, fogFar: 64, background: '#efe3d2',
  },
  night: {
    sky: '#5a6a9a', ground: '#2a2230', hemi: 0.45, sun: '#8ea6ff', sunIntensity: 0.55, sunDir: [5, 10, 4],
    env: 0.22, exposure: 1.1, fog: '#1a1a2e', fogNear: 24, fogFar: 58, background: '#141425',
  },
  spin: {
    sky: '#6a3a8a', ground: '#1a0f22', hemi: 0.35, sun: '#ff7ac8', sunIntensity: 0.6, sunDir: [3, 10, 6],
    env: 0.3, exposure: 1.15, fog: '#1b0f25', fogNear: 24, fogFar: 58, background: '#140a1c',
  },
  industrial: {
    sky: '#ffe9c8', ground: '#5a5048', hemi: 0.8, sun: '#fff0d0', sunIntensity: 2.4, sunDir: [2, 9, -6],
    env: 0.45, exposure: 1.0, fog: '#3a3430', fogNear: 24, fogFar: 58, background: '#2d2824',
  },
  beach: {
    sky: '#e6f6ff', ground: '#e9d8c4', hemi: 0.72, sun: '#fff6e6', sunIntensity: 2.1, sunDir: [-3, 10, -7],
    env: 0.42, exposure: 0.88, fog: '#e4f1f6', fogNear: 24, fogFar: 58, background: '#e4f1f6',
  },
  bigbox: {
    sky: '#d8e8ff', ground: '#303640', hemi: 0.75, sun: '#e8f0ff', sunIntensity: 1.6, sunDir: [1, 10, 4],
    env: 0.5, exposure: 1.05, fog: '#1d2430', fogNear: 24, fogFar: 58, background: '#1a2029',
  },
  retail: {
    sky: '#ffffff', ground: '#d8cfc2', hemi: 0.7, sun: '#fffaf0', sunIntensity: 1.6, sunDir: [2, 10, 5],
    env: 0.42, exposure: 0.9, fog: '#f2eee8', fogNear: 24, fogFar: 58, background: '#f2eee8',
  },
  mall: {
    sky: '#fff4e4', ground: '#cdbba2', hemi: 0.68, sun: '#fff0d6', sunIntensity: 2.1, sunDir: [-2, 10, 3],
    env: 0.4, exposure: 0.9, fog: '#f1e8dc', fogNear: 24, fogFar: 58, background: '#f1e8dc',
  },
  plaza: {
    sky: '#cfe9ff', ground: '#d8c3a5', hemi: 0.9, sun: '#fff1d8', sunIntensity: 2.7, sunDir: [-6, 10, 5],
    env: 0.45, exposure: 0.92, fog: '#e2eef5', fogNear: 24, fogFar: 60, background: '#bfe0f5',
  },
  golden: {
    sky: '#ffcf9a', ground: '#a0704a', hemi: 0.95, sun: '#ffb56a', sunIntensity: 3.4, sunDir: [-8, 5, -6],
    env: 0.5, exposure: 1.08, fog: '#f3c48e', fogNear: 20, fogFar: 85, background: '#f7c992',
  },
  garage: {
    sky: '#dfe8f0', ground: '#4a4440', hemi: 0.55, sun: '#e8f0ff', sunIntensity: 0.9, sunDir: [2, 10, 5],
    env: 0.35, exposure: 1.1, fog: '#2a2624', fogNear: 24, fogFar: 58, background: '#221f1d',
  },
};

export const CAM_INTERIOR: CamSpec = { dist: 10, height: 7.6, fov: 38, yaw: 0, lookY: 0.8, lookAhead: 0.45 };
export const CAM_WIDE: CamSpec = { dist: 12.5, height: 9.5, fov: 38, yaw: 0, lookY: 0.8, lookAhead: 0.5 };
export const CAM_OUTDOOR: CamSpec = { dist: 11, height: 7, fov: 42, yaw: 0, lookY: 1.0, lookAhead: 0.7 };

type Partial2 = Omit<BuiltSet, 'root' | 'colliders' | 'particles' | 'update' | 'dispose' | 'events' | 'npcs' | 'gates' | 'dogBeds' | 'stealables' | 'vehicle' | 'leaves' | 'dogs' | 'hooks'> &
  Partial<Pick<BuiltSet, 'npcs' | 'gates' | 'dogBeds' | 'stealables' | 'vehicle' | 'leaves' | 'dogs' | 'hooks'>>;

/** Finalizes a set: bakes static meshes and wires update/dispose. */
export function makeSet(ctx: SetCtx, s: Partial2, events: BuiltSet['events'] = {}): BuiltSet {
  ctx.bake();
  const npcs = s.npcs ?? [];
  const leaves = s.leaves ?? null;
  if (leaves) ctx.dyn.add(leaves.mesh);
  return {
    ...s,
    root: ctx.root,
    colliders: ctx.colliders,
    particles: ctx.particles,
    npcs,
    gates: s.gates ?? [],
    dogBeds: s.dogBeds ?? null,
    stealables: s.stealables ?? [],
    vehicle: s.vehicle ?? null,
    leaves,
    dogs: s.dogs ?? 'follow',
    hooks: s.hooks ?? {},
    events,
    update(dt, t) {
      for (const u of ctx.updaters) u(dt, t);
      for (const p of ctx.particles) p.update(dt);
      leaves?.update(dt);
      for (const n of npcs) n.update(dt);
    },
    dispose() {
      disposeTree(ctx.root);
      ctx.particles.forEach((p) => p.dispose());
      leaves?.dispose();
    },
  };
}
