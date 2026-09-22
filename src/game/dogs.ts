import * as THREE from 'three';
import { Actor } from '../art/characters/actor';
import { G } from '../art/geo';
import { M } from '../art/materials';
import { resolveCircle, clampBounds, separate } from './physics';
import { dampAngle, clamp } from '../engine/util';
import type { BuiltSet } from '../world/types';

type Mode = 'follow' | 'wander' | 'zoomies' | 'fetch' | 'flee' | 'block' | 'celebrate' | 'basket' | 'herd' | 'bedded' | 'spot' | 'stare' | 'mark';

export interface DogEvents {
  bark(dog: Dog, text: string): void;
  alert(dog: Dog): void;
  toast(text: string, kind?: '' | 'dog' | 'good' | 'warn'): void;
  focus(p: THREE.Vector3, sec: number): void;
  bump(dog: Dog, dir: THREE.Vector3): void;
  caught(dog: Dog, what: string): void;
  petted(dog: Dog): void;
  bedded(dog: Dog, all: boolean): void;
  /** Leo finished marking a furniture leg. */
  marked(dog: Dog, spotId: string): void;
}

export class Dog {
  readonly actor: Actor;
  readonly vel = new THREE.Vector3();
  mode: Mode = 'follow';
  timer = 0;
  target = new THREE.Vector3();
  item: THREE.Object3D | null = null;
  itemLabel = '';
  spot: THREE.Vector3 | null = null;
  petted = false;
  telegraph = 0;
  /** Mark run: 0 trotting over, 1 sniffing (still catchable), 2 leg up. */
  markPhase = 0;
  markId = '';
  markLeg = new THREE.Vector3();
  gates: [number, number][] = [];
  constructor(readonly name: 'mochi' | 'leo', readonly display: string, readonly side: number) {
    this.actor = new Actor(name, { sprite: `sprites/${name}.webp`, height: name === 'mochi' ? 0.82 : 0.78, dog: name });
  }
  get pos() {
    return this.actor.root.position;
  }
}

interface Ctx {
  louise: THREE.Vector3;
  louiseVel: THREE.Vector3;
  louiseFacing: number;
  set: BuiltSet;
  playing: boolean;
  chaosAllowed: boolean;
  basket: THREE.Object3D | null;
}

const BARKS = { mochi: ['Yip!', 'Boof!', 'Yip yip!'], leo: ['Woof!', 'Arf!', 'RUFF!'] };

/** Mochi & Leo: agents that follow, wander and create gentle chaos without stealing control. */
export class DogPack {
  readonly dogs: Dog[];
  private chaosT = 14;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private beds: Record<string, THREE.Vector3> = {};
  constructor(private ev: DogEvents) {
    this.dogs = [new Dog('mochi', 'Mochi', 1), new Dog('leo', 'Leo', -1)];
  }

  reset(set: BuiltSet, at: THREE.Vector3, chaosDelay: number) {
    this.chaosT = chaosDelay;
    this.beds = {};
    this.dogs.forEach((d, i) => {
      this.dropItem(d);
      d.pos.set(at.x + (i ? -0.8 : 0.8), 0, at.z + 0.6);
      d.vel.set(0, 0, 0);
      d.spot = null;
      d.petted = false;
      d.actor.root.visible = set.dogs !== 'none';
      d.actor.shadow.visible = true;
      d.actor.root.scale.setScalar(1);
      d.mode = set.dogs === 'basket' ? 'basket' : set.dogBeds ? 'herd' : 'follow';
      d.actor.setState('idle');
    });
    if (set.dogBeds) {
      this.beds.mochi = new THREE.Vector3(set.dogBeds.mochi[0], 0, set.dogBeds.mochi[1]);
      this.beds.leo = new THREE.Vector3(set.dogBeds.leo[0], 0, set.dogBeds.leo[1]);
      this.dogs[0].pos.set(2.5, 0, 1.5);
      this.dogs[1].pos.set(4.5, 0, -1.5);
    }
  }

  private dropItem(d: Dog) {
    if (d.item) {
      d.actor.hold(null);
      d.item = null;
    }
  }

  celebrate() {
    this.dogs.forEach((d, i) => {
      if (d.mode === 'basket' || d.mode === 'spot' || d.mode === 'bedded') {
        if (d.mode === 'basket') setTimeout(() => this.ev.bark(d, BARKS[d.name][0]), i * 250);
        return;
      }
      d.mode = 'celebrate';
      d.timer = 1.4;
      setTimeout(() => this.ev.bark(d, BARKS[d.name][i % 3]), i * 250);
    });
  }

  toSpots(spots: [number, number, number][] | undefined) {
    if (!spots) return;
    this.dogs.forEach((d, i) => {
      const s = spots[i];
      if (!s) return;
      this.dropItem(d);
      d.mode = 'spot';
      d.spot = new THREE.Vector3(...s);
    });
  }

  stare(at: THREE.Vector3) {
    this.dogs.forEach((d, i) => {
      if (d.mode === 'basket' || d.mode === 'bedded') return;
      d.mode = 'stare';
      d.target.set(at.x + (i ? -0.7 : 0.7), 0, at.z + 0.7);
    });
  }

  release() {
    this.dogs.forEach((d) => {
      if (d.mode === 'spot' || d.mode === 'stare' || d.mode === 'celebrate') {
        d.mode = 'follow';
        d.pos.y = 0;
        d.spot = null;
      }
    });
  }

  /** Send Leo to pee on a furniture leg. Returns false if he's busy. */
  startMark(stand: THREE.Vector3, leg: THREE.Vector3, id: string, gates: [number, number][] = []) {
    const leo = this.dogs[1];
    if (!leo.actor.root.visible || !['follow', 'wander', 'celebrate'].includes(leo.mode)) return false;
    this.dropItem(leo);
    leo.mode = 'mark';
    leo.markPhase = 0;
    leo.markId = id;
    leo.target.copy(stand);
    leo.markLeg.copy(leg);
    leo.gates = gates;
    leo.timer = 14;
    return true;
  }

  /** Louise got there first. True if he hadn't lifted his leg yet. */
  cancelMark() {
    const leo = this.dogs[1];
    if (leo.mode !== 'mark') return false;
    const foiled = leo.markPhase < 2;
    leo.mode = 'celebrate';
    leo.timer = 0.9;
    return foiled;
  }

  get allBedded() {
    return this.dogs.every((d) => d.mode === 'bedded');
  }

  private moveTo(d: Dog, target: THREE.Vector3, speed: number, dt: number, arrive = 0.5) {
    this.tmp.subVectors(target, d.pos).setY(0);
    const dist = this.tmp.length();
    const want = dist > 0.01 ? this.tmp.multiplyScalar((speed * clamp(dist / arrive, 0, 1)) / dist) : this.tmp.set(0, 0, 0);
    d.vel.lerp(want, 1 - Math.exp(-8 * dt));
    return dist;
  }

  private startChaos(ctx: Ctx) {
    const pool = this.dogs.filter((d) => d.mode === 'follow');
    if (!pool.length) return;
    const d = pool[Math.floor(Math.random() * pool.length)];
    const roll = Math.random();
    const st = ctx.set.stealables;
    if (roll < 0.38 && st.length) {
      const s = st[Math.floor(Math.random() * st.length)];
      d.mode = 'fetch';
      d.target.set(s.x, 0, s.z);
      d.itemLabel = s.label;
      d.timer = 16;
      const item = new THREE.Mesh(G.capsule(0.045, 0.14, 3, 8), M.fabric(s.color, '#fff'));
      item.rotation.z = Math.PI / 2;
      d.item = item;
      this.ev.bark(d, '!');
    } else if (roll < 0.62) {
      d.mode = 'zoomies';
      d.timer = 3.2;
      d.telegraph = 0.8;
      this.ev.alert(d);
      this.ev.toast(`${d.display} has the zoomies!`, 'dog');
    } else if (roll < 0.85) {
      d.mode = 'block';
      d.timer = 3;
      const dir = ctx.louiseVel.lengthSq() > 0.2 ? ctx.louiseVel.clone().normalize() : new THREE.Vector3(Math.sin(ctx.louiseFacing), 0, Math.cos(ctx.louiseFacing));
      d.target.copy(ctx.louise).addScaledVector(dir, 1.7);
      clampBounds(d.target, ctx.set.bounds);
      this.ev.toast(`${d.display} demands attention.`, 'dog');
      this.ev.focus(d.target, 0.9);
    } else {
      d.mode = 'wander';
      d.timer = 3.5;
      d.target.set(ctx.louise.x + (Math.random() - 0.5) * 6, 0, ctx.louise.z + (Math.random() - 0.5) * 4);
      clampBounds(d.target, ctx.set.bounds);
      this.ev.bark(d, BARKS[d.name][2]);
    }
  }

  update(dt: number, ctx: Ctx) {
    const L = ctx.louise;
    if (ctx.playing && ctx.chaosAllowed && ctx.set.dogs === 'follow' && !ctx.set.dogBeds) {
      this.chaosT -= dt;
      if (this.chaosT <= 0) {
        this.chaosT = 13 + Math.random() * 10;
        this.startChaos(ctx);
      }
    }
    for (const d of this.dogs) {
      const a = d.actor;
      if (!a.root.visible) continue;
      d.timer -= dt;
      let speed = 0;
      let state: string = 'idle';
      switch (d.mode) {
        case 'basket': {
          if (ctx.basket) {
            ctx.basket.getWorldPosition(this.tmp);
            d.pos.set(this.tmp.x + d.side * 0.12, this.tmp.y + 0.05, this.tmp.z);
            a.root.scale.setScalar(0.78);
            a.shadow.visible = false;
          }
          d.vel.set(0, 0, 0);
          a.facing = ctx.louiseFacing;
          state = Math.random() < 0.002 ? 'bark' : 'idle';
          if (Math.random() < 0.0015) this.ev.bark(d, BARKS[d.name][Math.floor(Math.random() * 3)]);
          a.setState(state as never);
          a.update(dt);
          continue;
        }
        case 'spot': {
          if (d.spot) {
            const dist = this.moveTo(d, d.spot, 3.2, dt, 0.3);
            if (dist < 0.9) d.pos.y = THREE.MathUtils.damp(d.pos.y, d.spot.y, 8, dt);
            speed = d.vel.length();
            state = speed > 0.3 ? 'trot' : 'lie';
          }
          break;
        }
        case 'stare':
          this.moveTo(d, d.target, 3.5, dt, 0.4);
          speed = d.vel.length();
          state = speed > 0.3 ? 'trot' : 'sit';
          a.facing = Math.atan2(L.x - d.pos.x, L.z - d.pos.z);
          break;
        case 'celebrate':
          d.vel.multiplyScalar(0.8);
          state = 'beg';
          if (d.timer <= 0) d.mode = 'follow';
          break;
        case 'zoomies': {
          if (d.telegraph > 0) {
            d.telegraph -= dt;
            state = 'bark';
            break;
          }
          const ang = d.timer * 3.2 * d.side;
          d.target.set(L.x + Math.cos(ang) * 2.0, 0, L.z + Math.sin(ang) * 1.6);
          this.moveTo(d, d.target, 6.2, dt, 0.2);
          speed = d.vel.length();
          state = 'run';
          if (d.timer < 1.2 && d.pos.distanceTo(L) < 0.55) {
            this.ev.bump(d, d.vel.clone().normalize());
            d.mode = 'follow';
            d.timer = 0;
          }
          if (d.timer <= 0) d.mode = 'follow';
          break;
        }
        case 'fetch': {
          const dist = this.moveTo(d, d.target, 4.6, dt, 0.3);
          speed = d.vel.length();
          state = 'run';
          if (dist < 0.35 && d.item) {
            a.hold(d.item);
            d.mode = 'flee';
            d.timer = 14;
            this.ev.toast(`${d.display} stole ${d.itemLabel}! Catch ${d.name === 'leo' ? 'him' : 'her'}!`, 'dog');
            this.ev.focus(d.pos.clone(), 1.0);
            this.ev.bark(d, BARKS[d.name][1]);
          }
          if (d.timer <= 0) {
            this.dropItem(d);
            d.mode = 'follow';
          }
          break;
        }
        case 'flee': {
          const away = this.tmp.subVectors(d.pos, L).setY(0);
          const dl = away.length();
          if (dl < 3.2) {
            away.normalize();
            const perp = new THREE.Vector3(-away.z, 0, away.x).multiplyScalar(Math.sin(d.timer * 2) * 0.6);
            d.target.copy(d.pos).addScaledVector(away.add(perp), 2);
            clampBounds(d.target, ctx.set.bounds);
            this.moveTo(d, d.target, 3.9, dt, 0.4);
            state = 'run';
          } else {
            d.vel.multiplyScalar(0.9);
            state = 'beg';
          }
          speed = d.vel.length();
          if (dl < 0.75) {
            this.ev.caught(d, d.itemLabel);
            this.dropItem(d);
            d.mode = 'celebrate';
            d.timer = 1;
          } else if (d.timer <= 0) {
            this.ev.toast(`${d.display} got bored and dropped ${d.itemLabel}.`, 'dog');
            this.dropItem(d);
            d.mode = 'follow';
          }
          break;
        }
        case 'block': {
          const dist = this.moveTo(d, d.target, 5.2, dt, 0.3);
          speed = d.vel.length();
          state = dist > 0.3 ? 'run' : 'beg';
          if (dist < 0.4) a.facing = Math.atan2(L.x - d.pos.x, L.z - d.pos.z);
          if (!d.petted && d.pos.distanceTo(L) < 0.85) {
            d.petted = true;
            this.ev.petted(d);
            d.mode = 'celebrate';
            d.timer = 0.8;
          }
          if (d.timer <= 0) d.mode = 'follow';
          break;
        }
        case 'wander': {
          const dist = this.moveTo(d, d.target, 2.2, dt, 0.4);
          speed = d.vel.length();
          state = dist > 0.3 ? 'trot' : 'sniff';
          if (d.timer <= 0) d.mode = 'follow';
          break;
        }
        case 'herd': {
          const bed = this.beds[d.name];
          const away = this.tmp.subVectors(d.pos, L).setY(0);
          const dl = away.length();
          if (dl < 2.8) {
            away.normalize();
            const toBed = bed.clone().sub(d.pos).setY(0).normalize();
            const dir = away.multiplyScalar(0.62).add(toBed.multiplyScalar(0.38)).normalize();
            d.target.copy(d.pos).addScaledVector(dir, 2);
            this.moveTo(d, d.target, 1.6 + 2.6 * (1 - dl / 2.8), dt, 0.3);
            state = 'run';
          } else {
            if (d.timer <= 0) {
              d.timer = 2 + Math.random() * 2;
              d.target.set(d.pos.x + (Math.random() - 0.5) * 3, 0, d.pos.z + (Math.random() - 0.5) * 3);
              clampBounds(d.target, ctx.set.bounds);
              if (Math.random() < 0.4) this.ev.bark(d, BARKS[d.name][Math.floor(Math.random() * 3)]);
            }
            const dist = this.moveTo(d, d.target, 0.9, dt, 0.5);
            state = dist > 0.25 ? 'trot' : 'sniff';
          }
          speed = d.vel.length();
          if (d.pos.distanceTo(bed) < 0.75) {
            d.mode = 'bedded';
            d.vel.set(0, 0, 0);
            this.ev.bedded(d, this.dogs.every((x) => x === d || x.mode === 'bedded'));
          }
          break;
        }
        case 'mark': {
          if (d.markPhase === 0) {
            // route through the partition gap nearest to him that lies between him and the leg
            const gate = d.gates
              .filter(([gx]) => (d.pos.x - gx) * (d.target.x - gx) < 0 && Math.abs(d.pos.x - gx) > 0.15)
              .sort((p, q) => Math.abs(p[0] - d.pos.x) - Math.abs(q[0] - d.pos.x))[0];
            const goal = gate ? this.tmp2.set(gate[0] + Math.sign(d.target.x - gate[0]) * 0.4, 0, gate[1]) : d.target;
            const dist = this.moveTo(d, goal, 2.3, dt, gate ? 0.1 : 0.3);
            speed = d.vel.length();
            state = 'trot';
            if (d.timer <= 0) d.pos.set(d.target.x, 0, d.target.z);
            if ((!gate && dist < 0.22) || d.timer <= 0) {
              d.markPhase = 1;
              d.timer = 2.4;
            }
          } else {
            d.vel.multiplyScalar(0.7);
            a.facing = dampAngle(a.facing, Math.atan2(d.markLeg.x - d.pos.x, d.markLeg.z - d.pos.z), 10, dt);
            state = d.markPhase === 1 ? 'sniff' : 'mark';
            if (d.timer <= 0 && d.markPhase === 1) {
              d.markPhase = 2;
              d.timer = 1.5;
            } else if (d.timer <= 0) {
              this.ev.marked(d, d.markId);
              d.mode = 'celebrate';
              d.timer = 1.0;
            }
          }
          break;
        }
        case 'bedded': {
          const bed = this.beds[d.name];
          d.pos.lerp(this.tmp.set(bed.x, 0.12, bed.z), 1 - Math.exp(-6 * dt));
          d.vel.set(0, 0, 0);
          state = 'lie';
          break;
        }
        default: {
          const back = new THREE.Vector3(Math.sin(ctx.louiseFacing), 0, Math.cos(ctx.louiseFacing));
          const right = new THREE.Vector3(back.z, 0, -back.x);
          d.target.copy(L).addScaledVector(back, -1.0).addScaledVector(right, d.side * 0.75);
          clampBounds(d.target, ctx.set.bounds);
          const dist = this.moveTo(d, d.target, ctx.louiseVel.length() > 3.5 ? 5.4 : 3.6, dt, 0.8);
          speed = d.vel.length();
          state = speed > 3 ? 'run' : speed > 0.25 ? 'trot' : dist < 1.2 ? 'sit' : 'idle';
        }
      }
      if (d.mode !== 'spot' && d.mode !== 'bedded') {
        d.pos.addScaledVector(d.vel, dt);
        resolveCircle(d.pos, 0.22, ctx.set.colliders, d.vel);
        clampBounds(d.pos, ctx.set.bounds, d.vel);
      }
      if (speed > 0.2) a.facing = dampAngle(a.facing, Math.atan2(d.vel.x, d.vel.z), 10, dt);
      a.speed = speed / 3;
      if (a.state !== state && !(a.state === 'bark' && d.telegraph > 0)) a.setState(state as never);
      a.update(dt);
    }
    const [m, l] = this.dogs;
    if (m.actor.root.visible && m.mode !== 'basket' && m.mode !== 'bedded' && l.mode !== 'bedded' && m.mode !== 'spot') separate(m.pos, l.pos, 0.45);
  }
}
