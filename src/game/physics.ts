import type * as THREE from 'three';
import type { Rect } from '../world/types';
import { clamp } from '../engine/util';

/** Push a circle out of axis-aligned boxes; strips the into-wall velocity so movement slides. */
export function resolveCircle(p: THREE.Vector3, r: number, rects: Rect[], vel?: THREE.Vector3) {
  for (const b of rects) {
    if (p.x < b.x0 - r || p.x > b.x1 + r || p.z < b.z0 - r || p.z > b.z1 + r) continue;
    const cx = clamp(p.x, b.x0, b.x1);
    const cz = clamp(p.z, b.z0, b.z1);
    let nx = p.x - cx;
    let nz = p.z - cz;
    const d2 = nx * nx + nz * nz;
    if (d2 >= r * r) continue;
    if (d2 < 1e-9) {
      const l = p.x - b.x0;
      const rr = b.x1 - p.x;
      const t = p.z - b.z0;
      const bo = b.z1 - p.z;
      const m = Math.min(l, rr, t, bo);
      if (m === l) {
        p.x = b.x0 - r;
        nx = -1;
        nz = 0;
      } else if (m === rr) {
        p.x = b.x1 + r;
        nx = 1;
        nz = 0;
      } else if (m === t) {
        p.z = b.z0 - r;
        nx = 0;
        nz = -1;
      } else {
        p.z = b.z1 + r;
        nx = 0;
        nz = 1;
      }
    } else {
      const d = Math.sqrt(d2);
      nx /= d;
      nz /= d;
      p.x += nx * (r - d);
      p.z += nz * (r - d);
    }
    if (vel) {
      const vn = vel.x * nx + vel.z * nz;
      if (vn < 0) {
        vel.x -= vn * nx;
        vel.z -= vn * nz;
      }
    }
  }
}

export function clampBounds(p: THREE.Vector3, b: Rect, vel?: THREE.Vector3) {
  if (p.x < b.x0) {
    p.x = b.x0;
    if (vel && vel.x < 0) vel.x = 0;
  }
  if (p.x > b.x1) {
    p.x = b.x1;
    if (vel && vel.x > 0) vel.x = 0;
  }
  if (p.z < b.z0) {
    p.z = b.z0;
    if (vel && vel.z < 0) vel.z = 0;
  }
  if (p.z > b.z1) {
    p.z = b.z1;
    if (vel && vel.z > 0) vel.z = 0;
  }
}

/** Soft separation between two circles; `wa` is how much of the push A takes. */
export function separate(a: THREE.Vector3, b: THREE.Vector3, r: number, wa = 0.5) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  if (d >= r || d < 1e-5) return false;
  const push = r - d;
  a.x -= (dx / d) * push * wa;
  a.z -= (dz / d) * push * wa;
  b.x += (dx / d) * push * (1 - wa);
  b.z += (dz / d) * push * (1 - wa);
  return true;
}
