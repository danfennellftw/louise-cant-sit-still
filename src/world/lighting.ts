import type { LightKit, CamSpec, BuiltSet } from './types';
import type { SetCtx } from './kit';
import { disposeTree } from '../art/geo';

export const KITS: Record<string, LightKit> = {
  morning: {
    sky: '#fff1dc', ground: '#b48a6a', hemi: 1.15, sun: '#ffe2b8', sunIntensity: 2.6, sunDir: [-4, 9, 6],
    env: 0.55, exposure: 1.05, fog: '#efe3d2', fogNear: 18, fogFar: 42, background: '#efe3d2',
  },
  night: {
    sky: '#5a6a9a', ground: '#2a2230', hemi: 0.45, sun: '#8ea6ff', sunIntensity: 0.55, sunDir: [5, 10, 4],
    env: 0.22, exposure: 1.1, fog: '#1a1a2e', fogNear: 16, fogFar: 40, background: '#141425',
  },
  spin: {
    sky: '#6a3a8a', ground: '#1a0f22', hemi: 0.35, sun: '#ff7ac8', sunIntensity: 0.6, sunDir: [3, 10, 6],
    env: 0.3, exposure: 1.15, fog: '#1b0f25', fogNear: 14, fogFar: 36, background: '#140a1c',
  },
  industrial: {
    sky: '#ffe9c8', ground: '#5a5048', hemi: 0.8, sun: '#fff0d0', sunIntensity: 2.4, sunDir: [2, 9, -6],
    env: 0.45, exposure: 1.0, fog: '#3a3430', fogNear: 18, fogFar: 44, background: '#2d2824',
  },
  beach: {
    sky: '#e6f6ff', ground: '#e9d8c4', hemi: 1.3, sun: '#fff6e6', sunIntensity: 2.6, sunDir: [-3, 10, -7],
    env: 0.7, exposure: 1.05, fog: '#e4f1f6', fogNear: 20, fogFar: 46, background: '#e4f1f6',
  },
  bigbox: {
    sky: '#d8e8ff', ground: '#303640', hemi: 0.75, sun: '#e8f0ff', sunIntensity: 1.6, sunDir: [1, 10, 4],
    env: 0.5, exposure: 1.05, fog: '#1d2430', fogNear: 20, fogFar: 50, background: '#1a2029',
  },
  retail: {
    sky: '#ffffff', ground: '#d8cfc2', hemi: 1.3, sun: '#fffaf0', sunIntensity: 1.9, sunDir: [2, 10, 5],
    env: 0.75, exposure: 1.05, fog: '#f2eee8', fogNear: 20, fogFar: 46, background: '#f2eee8',
  },
  mall: {
    sky: '#fff4e4', ground: '#cdbba2', hemi: 1.15, sun: '#fff0d6', sunIntensity: 2.8, sunDir: [-2, 10, 3],
    env: 0.65, exposure: 1.05, fog: '#f1e8dc', fogNear: 22, fogFar: 50, background: '#f1e8dc',
  },
  plaza: {
    sky: '#cfe9ff', ground: '#d8c3a5', hemi: 1.2, sun: '#fff1d8', sunIntensity: 3.0, sunDir: [-6, 10, 5],
    env: 0.6, exposure: 1.02, fog: '#e2eef5', fogNear: 24, fogFar: 60, background: '#bfe0f5',
  },
  golden: {
    sky: '#ffcf9a', ground: '#a0704a', hemi: 0.95, sun: '#ffb56a', sunIntensity: 3.4, sunDir: [-8, 5, -6],
    env: 0.5, exposure: 1.08, fog: '#f3c48e', fogNear: 20, fogFar: 85, background: '#f7c992',
  },
  garage: {
    sky: '#dfe8f0', ground: '#4a4440', hemi: 0.55, sun: '#e8f0ff', sunIntensity: 0.9, sunDir: [2, 10, 5],
    env: 0.35, exposure: 1.1, fog: '#2a2624', fogNear: 16, fogFar: 36, background: '#221f1d',
  },
};

export const CAM_INTERIOR: CamSpec = { dist: 10.5, height: 8.2, fov: 38, yaw: 0, lookY: 0.8, lookAhead: 0.45 };
export const CAM_WIDE: CamSpec = { dist: 12.5, height: 9.5, fov: 38, yaw: 0, lookY: 0.8, lookAhead: 0.5 };
export const CAM_OUTDOOR: CamSpec = { dist: 11, height: 7, fov: 42, yaw: 0, lookY: 1.0, lookAhead: 0.7 };

type Partial2 = Omit<BuiltSet, 'root' | 'colliders' | 'particles' | 'update' | 'dispose' | 'npcs' | 'gates' | 'dogBeds' | 'stealables' | 'vehicle' | 'leaves' | 'dogs' | 'hooks'> &
  Partial<Pick<BuiltSet, 'npcs' | 'gates' | 'dogBeds' | 'stealables' | 'vehicle' | 'leaves' | 'dogs' | 'hooks'>>;

/** Finalizes a set: bakes static meshes and wires update/dispose. */
export function makeSet(ctx: SetCtx, s: Partial2): BuiltSet {
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
