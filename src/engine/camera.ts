import * as THREE from 'three';
import { clamp, damp, lerp } from './util';
import type { CamSpec, Rect } from '../world/types';

/**
 * Third-person "dollhouse" follow cam: lagged follow, velocity look-ahead,
 * soft framing toward nearby interactables, push-ins for mini-games, trauma shake.
 */
export class CameraRig {
  spec: CamSpec = { dist: 10, height: 8, fov: 40, yaw: 0, lookY: 1, lookAhead: 0.5 };
  private look = new THREE.Vector3();
  private pos = new THREE.Vector3();
  private lookAheadV = new THREE.Vector3();
  focus: THREE.Vector3 | null = null;
  focusWeight = 0;
  push = 0;
  pushSpec = { dist: 4.5, height: 2.6, yaw: 0 };
  private trauma = 0;
  private t = 0;
  bounds: Rect | null = null;
  /** Cinematic override (establishing shots, fail cam). 0 = gameplay, 1 = cinematic. */
  cine = 0;
  cinePos = new THREE.Vector3();
  cineLook = new THREE.Vector3();
  orbit = 0;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  setSpec(s: CamSpec, bounds: Rect) {
    this.spec = s;
    this.bounds = bounds;
    this.camera.fov = s.fov;
    this.camera.updateProjectionMatrix();
  }

  shake(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  private desired(target: THREE.Vector3, outPos: THREE.Vector3, outLook: THREE.Vector3) {
    const s = this.spec;
    const p = this.push;
    const dist = lerp(s.dist, this.pushSpec.dist, p);
    const height = lerp(s.height, this.pushSpec.height, p);
    const yaw = s.yaw + this.pushSpec.yaw * p + this.orbit;
    outLook.copy(target);
    outLook.y = lerp(s.lookY, 1.0, p);
    outPos.set(outLook.x + Math.sin(yaw) * dist, height, outLook.z + Math.cos(yaw) * dist);
  }

  snap(target: THREE.Vector3) {
    this.lookAheadV.set(0, 0, 0);
    this.desired(this.clampTarget(target.clone()), this.pos, this.look);
    this.apply();
  }

  private clampTarget(v: THREE.Vector3) {
    const b = this.bounds;
    if (b && this.push < 0.5) {
      const mx = Math.min(3, (b.x1 - b.x0) * 0.25);
      const mz = Math.min(2, (b.z1 - b.z0) * 0.2);
      v.x = clamp(v.x, b.x0 + mx, b.x1 - mx);
      v.z = clamp(v.z, b.z0 + mz, b.z1 - mz * 0.5);
    }
    return v;
  }

  update(dt: number, player: THREE.Vector3, vel: THREE.Vector3) {
    this.t += dt;
    const s = this.spec;
    this.lookAheadV.x = damp(this.lookAheadV.x, vel.x * s.lookAhead, 2.5, dt);
    this.lookAheadV.z = damp(this.lookAheadV.z, vel.z * s.lookAhead * 0.6, 2.5, dt);
    const target = player.clone().add(this.lookAheadV);
    if (this.focus && this.focusWeight > 0) target.lerp(this.focus, this.focusWeight * 0.35);
    this.clampTarget(target);
    const dPos = new THREE.Vector3();
    const dLook = new THREE.Vector3();
    this.desired(target, dPos, dLook);
    if (this.cine > 0) {
      dPos.lerp(this.cinePos, this.cine);
      dLook.lerp(this.cineLook, this.cine);
    }
    const lam = 4.5 + this.push * 3;
    this.pos.x = damp(this.pos.x, dPos.x, lam, dt);
    this.pos.y = damp(this.pos.y, dPos.y, lam, dt);
    this.pos.z = damp(this.pos.z, dPos.z, lam, dt);
    this.look.x = damp(this.look.x, dLook.x, lam + 1.5, dt);
    this.look.y = damp(this.look.y, dLook.y, lam + 1.5, dt);
    this.look.z = damp(this.look.z, dLook.z, lam + 1.5, dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    this.apply();
  }

  private apply() {
    this.camera.position.copy(this.pos);
    const sh = this.trauma * this.trauma;
    if (sh > 0) {
      this.camera.position.x += Math.sin(this.t * 47) * sh * 0.25;
      this.camera.position.y += Math.sin(this.t * 61 + 1) * sh * 0.2;
    }
    this.camera.lookAt(this.look);
    if (sh > 0) this.camera.rotation.z += Math.sin(this.t * 37) * sh * 0.03;
  }
}
