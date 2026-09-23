import * as THREE from 'three';
import { HumanRig, type HumanLook, type HumanState } from './human';
import { DogRig, type DogState } from './dog';
import { SpriteRig } from './sprite';
import { blobShadow } from '../fx';

export type ActorState = HumanState | DogState;

/** Camera orientation + lighting tint shared by every billboard each frame. */
export const VIEW = { yaw: 0, pitch: 0.7, tint: new THREE.Color('#ffffff') };

export interface ActorOpts {
  /** Sticker art (URL under public/ or a canvas). Primary representation. */
  sprite?: string | HTMLCanvasElement;
  height: number;
  /** Procedural placeholder used only if the sprite fails to load. */
  look?: HumanLook;
  dog?: 'mochi' | 'leo';
  shadow?: number;
}

/**
 * A character in the world. Paper-cutout sprite from the character-sheet art first;
 * a clearly-labelled procedural placeholder only if that image can't load.
 */
export class Actor {
  readonly root = new THREE.Group();
  readonly visual = new THREE.Group();
  readonly shadow: THREE.Mesh;
  sprite: SpriteRig | null = null;
  human: HumanRig | null = null;
  dog: DogRig | null = null;
  facing = 0;
  speed = 0;
  antsy = 0;
  state: ActorState = 'idle';
  private held: THREE.Object3D | null = null;
  onFootstep?: () => void;
  readonly height: number;

  constructor(readonly id: string, private opts: ActorOpts) {
    this.height = opts.height;
    this.root.userData.dynamic = true;
    this.root.add(this.visual);
    this.shadow = blobShadow(opts.shadow ?? (opts.dog ? 0.28 : 0.38), 0.42);
    this.root.add(this.shadow);
    if (opts.sprite) {
      this.sprite = new SpriteRig(opts.sprite, opts.height, 0.4, !!opts.dog);
      this.sprite.onFootstep = () => this.onFootstep?.();
      this.visual.add(this.sprite.root);
      void this.sprite.ready.then((ok) => {
        if (!ok) this.usePlaceholder();
      });
    } else {
      this.usePlaceholder();
    }
  }

  private usePlaceholder() {
    if (this.sprite) {
      this.visual.remove(this.sprite.root);
      this.sprite = null;
    }
    if (this.opts.dog) {
      this.dog = new DogRig({ name: this.opts.dog });
      this.visual.add(this.dog.root);
    } else if (this.opts.look) {
      this.human = new HumanRig(this.opts.look);
      this.human.onFootstep = () => this.onFootstep?.();
      this.visual.add(this.human.root);
    }
    this.visual.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    this.setState(this.state);
    console.info(`[actor] ${this.id}: sprite unavailable, using procedural placeholder`);
  }

  setState(s: ActorState) {
    this.state = s;
    this.sprite?.setState(s);
    this.human?.setState(s as HumanState);
    this.dog?.setState(s as DogState);
  }

  pop(amount = 0.25) {
    this.sprite?.pop(amount);
  }

  hold(obj: THREE.Object3D | null) {
    if (this.held) this.visual.remove(this.held);
    this.held = obj;
    if (obj) {
      obj.position.set(0, this.height * 0.3, 0.2);
      this.visual.add(obj);
    }
  }

  update(dt: number) {
    if (this.sprite) {
      this.root.rotation.y = 0;
      const fx = Math.sin(this.facing);
      const fz = Math.cos(this.facing);
      const side = fx * Math.cos(VIEW.yaw) - fz * Math.sin(VIEW.yaw);
      this.sprite.speed = this.speed;
      this.sprite.antsy = this.antsy;
      this.sprite.tint = VIEW.tint;
      this.sprite.update(dt, VIEW.yaw, VIEW.pitch, Math.abs(side) > 0.25 ? -side : 0, this.facing);
    } else {
      this.root.rotation.y = this.facing;
      if (this.human) {
        this.human.speed = this.speed;
        this.human.antsy = this.antsy;
        this.human.update(dt, this.facing);
      }
      if (this.dog) {
        this.dog.speed = this.speed;
        this.dog.update(dt);
      }
    }
    const lying = this.state === 'lie' || this.state === 'massage';
    this.shadow.visible = !lying;
  }
}
