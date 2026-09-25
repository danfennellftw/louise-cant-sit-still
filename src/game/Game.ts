import * as THREE from 'three';
import { Renderer } from '../engine/renderer';
import { CameraRig } from '../engine/camera';
import { Input } from '../engine/input';
import { Audio, haptic } from '../engine/audio';
import { tweens } from '../engine/tween';
import { clamp, damp, dampAngle, easeInOutCubic, easeOutBack, sleep } from '../engine/util';
import { Actor, VIEW, type ActorState } from '../art/characters/actor';
import { LOUISE_LOOK } from '../art/characters/human';
import { KICK_FILES } from '../art/characters/dance';
import { preloadSprites } from '../art/characters/sprite';
import { Confetti, NoteFloat, StopMarker, TapMarker } from '../art/fx';
import { G } from '../art/geo';
import { loadOptionalGlb } from '../engine/assets';
import { M, WIND } from '../art/materials';
import { ebike } from '../art/props/outdoor';
import { UI } from '../ui/ui';
import { MiniGames } from '../ui/minigames';
import { showDayMap } from '../ui/daymap';
import { showDetour, type DetourTarget } from '../ui/demo';
import { DogPack, type Dog } from './dogs';
import { resolveCircle, clampBounds, separate } from './physics';
import { puddleMat } from '../world/sets/condoDressing';
import { CALLS, type CallerId } from './calls';
import { SETS, ACTS, actOf, allDone, isFirstOfAct, roast, loadSave, writeSave, clearSave, type SetId, type SaveData } from './story';
import type { BuiltSet, StopDef, LightKit, MarkSpot, Line } from '../world/types';

type Phase = 'boot' | 'title' | 'intro' | 'play' | 'stop' | 'transition' | 'fail' | 'paused' | 'finale';

const WALK = 3.1;
const JOG = 5.2;
const ACCEL = 15;
const DECEL = 19;
const METER_MAX = 100;


const LEO_NAGS = [
  'Dan: “Why does the piano smell like… oh no. LEO.”',
  'That puddle is still there. Louise can feel it. Restless intensifies.',
  'Leo is sitting next to the puddle, looking extremely innocent.',
  'The bar stool leg is now roughly 40% Yorkie.',
];
const LEO_OUTROS: Line[] = [
  { who: 'dan', text: 'Buddy. It’s a piano. It is not a tree.' },
  { who: 'louise', text: 'Every. Single. Morning. Same two legs.' },
  { who: 'narrator', text: 'Leg: spotless. Leo: already eyeing the other leg.' },
];
const PASSIVE_CAP = 62;

function freshSave(): SaveData {
  return { done: [], stops: {}, hearts: 0, sits: 0, dogs: 0, tutorial: false };
}

export class Game {
  private r: Renderer;
  private cam: CameraRig;
  private input: Input;
  private audio = new Audio();
  private ui: UI;
  private minis: MiniGames;
  private louise: Actor;
  private dogs: DogPack;
  private bike = ebike(new THREE.Group(), 0, 0, 0, '#3a3f45', true);
  private confetti = new Confetti();
  private notes = new NoteFloat();
  private tap = new TapMarker();
  private perform: 'sing' | 'dance' | null = null;
  private noteT = 0;
  private danTween = 0;
  private danHome: { p: THREE.Vector3; f: number; s: ActorState } | null = null;
  private danWatch = new THREE.Vector3(2.05, 0, -0.55);
  private danSeated = false;
  private kickReact = 0;
  private prevKick = 0;
  private danPalm: THREE.Group | null = null;
  private breadcrumbs: THREE.Mesh[] = [];

  private phase: Phase = 'boot';
  private pausedFrom: Phase = 'play';
  private save: SaveData = freshSave();
  private setId: SetId = 'condo';
  private set: BuiltSet | null = null;
  private markers = new Map<string, StopMarker>();
  private exitMarker: StopMarker | null = null;
  private stopsDone = new Set<string>();

  private vel = new THREE.Vector3();
  private autoTarget: THREE.Vector3 | null = null;
  private autoResolve: (() => void) | null = null;
  private tapTarget: THREE.Vector3 | null = null;
  private pendingStop: StopDef | null = null;
  private meter = METER_MAX;
  private still = 0;
  private hitStop = 0;
  private t = 0;
  private last = 0;
  private lastProgress = 0;
  private heartbeatT = 0;
  private gatesHit = new Set<number>();
  private coachStep = 0;
  private movedDist = 0;
  private chaosDelay = 16;
  private raycaster = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private tmp = new THREE.Vector3();
  private titleOrbit = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.r = new Renderer(canvas);
    this.cam = new CameraRig(this.r.camera);
    this.input = new Input(canvas);
    this.ui = new UI(this.audio);
    this.minis = new MiniGames(this.audio);
    this.louise = new Actor('louise', { sprite: 'sprites/louise.webp', height: 1.66, look: LOUISE_LOOK });
    this.louise.onFootstep = () => {
      if ((this.phase === 'play' || this.phase === 'stop') && this.louise.speed > 0.3 && this.set) this.audio.step(this.set.surface);
    };
    this.dogs = new DogPack({
      bark: (d, text) => this.bark(d, text),
      alert: (d) => {
        this.ui.label(`bark-${d.name}`, '!', 'alert', 0.9);
        this.audio.bark(d.name);
      },
      toast: (t, k) => this.ui.toast(t, k),
      focus: (p, s) => this.focusBriefly(p, s),
      bump: (d, dir) => this.onBump(d, dir),
      caught: (d, what) => this.onCaught(d, what),
      petted: (d) => {
        this.addHearts(2, d.pos);
        this.meter = Math.min(METER_MAX, this.meter + 6);
        this.ui.toast(`${d.display} got pets. Worth it.`, 'good');
        this.audio.heart(3);
      },
      bedded: (d, all) => this.onBedded(d, all),
      marked: (_d, id) => this.onLeoMarked(id),
    });
    this.minis.onBeat = (k) => {
      if (k === 'good') this.louise.pop(0.12);
      if (k === 'tick') this.louise.pop(0.05);
    };
    this.minis.onCue = (cue) => this.onPerformCue(cue);
    this.r.scene.add(this.louise.root, this.confetti.mesh, this.notes.root, this.tap.mesh);
    this.dogs.dogs.forEach((d) => this.r.scene.add(d.actor.root));
    const crumbMat = new THREE.MeshBasicMaterial({ color: '#ffe29a', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(G.circle(0.09, 16), crumbMat.clone());
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 3;
      this.breadcrumbs.push(m);
      this.r.scene.add(m);
    }
    this.bike.group.visible = false;
    this.louise.root.add(this.bike.group);

    this.input.onInteract = () => {
      if (this.phase === 'play' && this.ui.promptVisible) this.ui.pressPrompt();
    };
    this.input.onPause = () => this.togglePause();
    this.input.onTap = (x, y) => this.onTap(x, y);
    document.getElementById('btn-pause')!.onclick = () => this.togglePause();
    const muteBtn = document.getElementById('btn-mute')!;
    muteBtn.classList.toggle('muted', this.audio.muted);
    muteBtn.onclick = () => muteBtn.classList.toggle('muted', this.audio.toggleMute());
    document.getElementById('btn-map')!.onclick = () => void this.openDetour(true);
    document.getElementById('btn-detour')!.onclick = () => void this.openDetour();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.phase === 'play') this.togglePause();
    });
    this.r.onQualityChange = () => this.set?.particles.forEach((p) => (p.pixelScale = this.r.pixelScale));
    this.ui.onFadeStuck = () => this.stuck('The scene took too long to appear.');
    this.r.onContextLost = () => {
      if (this.phase === 'play') this.phase = 'paused';
      this.ui.recover('Graphics hiccup', 'Your phone paused the 3D view to save memory. Hang on, it usually comes right back.', [
        { label: 'Reload the game', run: () => location.reload() },
      ]);
    };
    this.r.onContextRestored = () => {
      this.ui.clearRecover();
      this.r.forceLevel('low');
      void this.enterSet(this.setId, true);
    };
    window.addEventListener('unhandledrejection', (e) => this.onFatal(e.reason));
    window.addEventListener('error', (e) => this.onFatal(e.error ?? e.message));
    requestAnimationFrame((t) => this.frame(t));
  }

  /* =================== boot / title =================== */
  async boot() {
    await Promise.race([document.fonts?.ready ?? Promise.resolve(), sleep(1500)]);
    await preloadSprites(['sprites/louise.webp', 'sprites/dan.webp', 'sprites/mochi.webp', 'sprites/leo.webp', ...KICK_FILES]);
    this.loadSetNow('condo');
    this.louise.root.position.set(-1.2, 0, -0.4);
    this.louise.facing = 0.3;
    this.dogs.dogs[0].pos.set(-0.2, 0, 0.4);
    this.dogs.dogs[1].pos.set(-2.1, 0, 0.3);
    this.phase = 'title';
    this.cam.cine = 1;
    this.audio.playMusic('title');
    this.showTitle();
    await this.ui.fade(false);
  }

  private showTitle() {
    const existing = loadSave();
    this.ui.showHud(false);
    this.ui.title({
      hasSave: !!existing && existing.done.length > 0,
      onPlay: () => void this.startNew(),
      onContinue: () => void this.continueGame(),
      onSettings: () => this.openSettings(false),
      onDetour: () => void this.titleDetour(),
    });
  }

  private async startNew() {
    this.audio.unlock();
    this.audio.click();
    clearSave();
    this.save = freshSave();
    writeSave(this.save);
    this.ui.clearScreens();
    this.phase = 'intro';
    await this.ui.stinger(ACTS[0].num, ACTS[0].title, ACTS[0].sub);
    await this.enterSet('condo', false);
  }

  private async continueGame() {
    this.audio.unlock();
    this.audio.click();
    this.save = loadSave() ?? freshSave();
    this.ui.clearScreens();
    this.phase = 'transition';
    await this.ui.fade(true);
    await this.pickNext();
  }

  /** Dev helper: jump straight into a set (window.__game.debugEnter('trail')). */
  debugEnter(id: SetId) {
    this.audio.unlock();
    this.ui.clearScreens();
    void this.enterSet(id, true);
  }

  /** Dev helper: ring a phone call now (window.__game.debugCall('mom')). */
  debugCall(who: CallerId) {
    this.pendingCall = { who, delay: 0.05, attempt: 1 };
  }

  /** Dev helper: open a stop in the current set directly. */
  debugStop(id: string) {
    const s = this.set?.stops.find((x) => x.id === id);
    if (s) void this.runStop(s);
  }

  /* =================== set lifecycle =================== */
  private unloadSet() {
    if (!this.set) return;
    this.r.scene.remove(this.set.root);
    this.set.dispose();
    this.markers.forEach((m) => {
      this.r.scene.remove(m.root);
      m.dispose();
    });
    this.markers.clear();
    if (this.exitMarker) {
      this.r.scene.remove(this.exitMarker.root);
      this.exitMarker.dispose();
      this.exitMarker = null;
    }
    this.ui.clearLabels();
    tweens.clear();
    this.set = null;
  }

  private loadSetNow(id: SetId) {
    this.unloadSet();
    this.setId = id;
    const set = SETS[id].build(this.r.level);
    this.set = set;
    this.r.scene.add(set.root);
    this.r.applyLightKit(set.light);
    VIEW.tint.copy(spriteTint(set.light));
    this.cam.setSpec(set.camera, set.bounds);
    set.particles.forEach((p) => (p.pixelScale = this.r.pixelScale));
    this.stopsDone = new Set(this.save.stops[id] ?? []);
    for (const s of set.stops) {
      this.addStopMarker(s);
      if (this.stopsDone.has(s.id)) set.hooks[s.id]?.done?.();
    }
    this.dirtySpots.clear();
    this.markPending = null;
    this.leoMarkN = 0;
    this.leoMarkT = set.markSpots ? 32 : 0;
    if (set.exit) {
      this.exitMarker = new StopMarker('#fff6ec', 0.9, 2.4);
      this.exitMarker.root.position.set(set.exit.x, 0, set.exit.z);
      this.exitMarker.state = 'hidden';
      this.r.scene.add(this.exitMarker.root);
    }
    const sp = this.spawnAt ? { ...set.spawn, x: this.spawnAt[0], z: this.spawnAt[1] } : set.spawn;
    this.spawnAt = null;
    this.louise.root.position.set(sp.x, 0, sp.z);
    this.louise.facing = sp.face;
    this.louise.setState(set.vehicle ? 'ride' : 'idle');
    this.bike.group.visible = set.vehicle === 'ebike';
    this.vel.set(0, 0, 0);
    this.autoTarget = null;
    this.tapTarget = null;
    this.pendingStop = null;
    this.gatesHit.clear();
    this.exitArmed = false;
    const first = id === 'condo' && !this.save.tutorial;
    this.dogs.reset(set, this.louise.root.position, first ? 40 : this.chaosDelay);
    this.audio.setAmbience(set.ambience);
    this.audio.playMusic(set.music);
    this.ui.setChapter(SETS[id].time, `${SETS[id].title} · ${SETS[id].place}`);
    this.refreshObjectives();
    this.cam.snap(this.louise.root.position);
    set.events.sfx = (sfx, at) => {
      if (sfx === 'horn' && Math.abs(at.z - this.louise.root.position.z) < 55) {
        this.audio.horn();
        this.ui.toast('Train coming across the trestle!', 'good');
      }
    };
    void this.tryEnvironmentOverride(id, set);
  }

  /**
   * Optional art drop-in: `public/environments/<setId>.glb` replaces the set's baked static
   * meshes while stops, NPCs, lights and colliders keep working. Meshes named `collider*`
   * inside the GLB become extra invisible colliders.
   */
  private async tryEnvironmentOverride(id: SetId, set: BuiltSet) {
    if (!__ENV_GLBS__.includes(id)) return;
    const gltf = await loadOptionalGlb(`environments/${id}.glb`);
    if (!gltf || this.set !== set) return;
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (/^collider/i.test(m.name)) {
        box.setFromObject(m);
        set.colliders.push({ x0: box.min.x, z0: box.min.z, x1: box.max.x, z1: box.max.z });
        m.visible = false;
      } else {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    set.root.children.forEach((c) => {
      if (c.userData.baked) c.visible = false;
    });
    set.root.add(scene);
  }

  private async enterSet(id: SetId, fadeIn = true): Promise<boolean> {
    const ep = ++this.epoch;
    this.phase = 'intro';
    this.ui.clearRecover();
    if (fadeIn || (this.set?.root && this.setId !== id)) await this.ui.fade(true, true);
    if (ep !== this.epoch) return false;
    try {
      this.loadSetNow(id);
    } catch (err) {
      console.error(`[game] failed to build set "${id}"`, err);
      this.setFailed(id);
      return false;
    }
    this.meter = Math.max(this.meter, 85);
    this.still = 0;
    this.lastProgress = this.t;
    const set = this.set!;
    // establishing shot: start wide & high, push in to gameplay framing
    const b = set.bounds;
    const cx = (b.x0 + b.x1) / 2;
    const cz = (b.z0 + b.z1) / 2;
    const long = b.z1 - b.z0 > 40;
    this.cam.cineLook.set(long ? this.louise.root.position.x : cx, 0.5, long ? this.louise.root.position.z - 12 : cz);
    this.cam.cinePos.set(this.cam.cineLook.x + (long ? 0 : -4), long ? 12 : 15, this.cam.cineLook.z + (long ? 22 : 17));
    this.cam.cine = 1;
    this.cam.orbit = 0;
    this.ui.clearScreens();
    this.ui.coach(null);
    this.ui.showHud(true);
    await this.ui.fade(false);
    if (ep !== this.epoch) return false;
    const meta = SETS[id];
    void this.ui.chapterCard(`${meta.time} · ${meta.place}`, meta.title, actOf(id).title, 2400);
    this.audio.whoosh();
    await tweens.to(1.7, (k) => (this.cam.cine = 1 - k), easeInOutCubic);
    if (ep !== this.epoch) return false;
    this.cam.cine = 0;
    this.phase = 'play';
    this.lastProgress = this.t;
    this.coachStep = id === 'condo' && !this.save.tutorial ? 1 : 0;
    if (id === 'trail') this.ui.toast('Ride through the glowing gates to keep her charged!', 'good');
    if (set.dogBeds) {
      this.ui.coach('Herd <b>Mochi</b> and <b>Leo</b> to their glowing beds — walk <b>behind</b> them to nudge them along.');
      setTimeout(() => this.ui.coach(null), 5000);
    }
    return true;
  }

  /** A set failed to build: offer a lighter retry, the map, or a reload — never a blank screen. */
  private setFailed(id: SetId) {
    this.phase = 'transition';
    this.ui.showHud(false);
    this.ui.clearScreens();
    this.ui.recover('That scene didn’t load', `Something went wrong setting up ${SETS[id].title}. Your progress is saved.`, [
      {
        label: 'Try again',
        primary: true,
        run: () => {
          this.r.forceLevel('low');
          void this.enterSet(id, true);
        },
      },
      { label: 'Back to the day map', run: () => void this.pickNext() },
      { label: 'Reload the game', run: () => location.reload() },
    ]);
  }

  private stuck(why: string) {
    if (this.phase === 'play' || this.phase === 'title' || this.phase === 'finale') {
      void this.ui.fade(false);
      return;
    }
    console.error(`[game] transition stuck in phase "${this.phase}": ${why}`);
    this.ui.clearScreens();
    this.ui.recover('Louise got lost between stops', `${why} Your progress is saved.`, [
      {
        label: 'Continue',
        primary: true,
        run: () => (this.set && !this.save.done.includes(this.setId) ? void this.enterSet(this.setId, true) : void this.pickNext()),
      },
      { label: 'Open the day map', run: () => void this.pickNext() },
      { label: 'Reload the game', run: () => location.reload() },
    ]);
  }

  private onFatal(err: unknown) {
    console.error('[game] uncaught error', err);
    if (this.phase === 'transition' || this.phase === 'intro' || this.ui.fadeOn) this.stuck('A scene change hit an error.');
  }

  private async leaveSet() {
    if (this.phase !== 'play') return;
    this.phase = 'transition';
    this.ui.hidePrompt();
    this.ui.coach(null);
    this.hideGuides();
    this.audio.whoosh();
    const p = this.louise.root.position;
    this.cam.cinePos.set(p.x, 9, p.z + 9);
    this.cam.cineLook.set(p.x, 1, p.z);
    void tweens.to(0.6, (k) => (this.cam.cine = k));
    await this.ui.fade(true);
    if (!this.save.done.includes(this.setId)) this.save.done.push(this.setId);
    if (this.setId === 'condo') this.save.tutorial = true;
    writeSave(this.save);
    await this.pickNext();
  }

  private async pickNext() {
    const done = new Set(this.save.done);
    if (allDone(done)) return this.finale();
    this.ui.showHud(false);
    // the map lives under #fade in the stacking order, so the fade must lift first
    await this.ui.fade(false);
    const next = await showDayMap(this.ui.screens, this.audio, done, this.setId, false);
    if (!next) return;
    await this.travelTo(next);
  }

  /** Go to any stop. Finished stops are reset so they can be replayed. */
  private async travelTo(next: SetId) {
    const done = new Set(this.save.done);
    if (done.has(next)) {
      this.save.stops[next] = [];
      writeSave(this.save);
    }
    if (isFirstOfAct(next, done)) {
      const act = actOf(next);
      await this.ui.stinger(act.num, act.title, act.sub);
    }
    await this.enterSet(next, true);
  }

  /* =================== demo detours: jump anywhere, from any state =================== */
  /** Bumped whenever a set loads; async stop / call / fail flows bail when it changes under them. */
  private epoch = 0;
  private detourOpen = false;
  private spawnAt: [number, number] | null = null;

  /** Detour panel (or straight to the full day map) → a target, or null when closed. */
  private async pickDetour(closeLabel: string, startWithMap = false): Promise<DetourTarget | null> {
    const current = this.phase === 'title' ? null : this.setId;
    let map = startWithMap;
    for (;;) {
      if (!map) {
        const r = await showDetour(this.ui.screens, this.audio, { current, closeLabel });
        if (r !== 'map') return r;
      }
      const id = await showDayMap(this.ui.screens, this.audio, new Set(this.save.done), current, true, true);
      if (id) return { set: id };
      if (startWithMap) return null;
      map = false;
    }
  }

  private async openDetour(startWithMap = false) {
    if (this.detourOpen || this.phase === 'boot' || this.phase === 'title' || this.phase === 'transition') return;
    this.detourOpen = true;
    const prev = this.phase;
    this.phase = 'paused';
    this.ui.hideDetourPill(true);
    const pick = await this.pickDetour(prev === 'stop' ? 'Back to the stop' : 'Back to the game', startWithMap);
    this.ui.hideDetourPill(false);
    this.detourOpen = false;
    if (!pick) {
      if (this.phase === 'paused') this.phase = prev;
      return;
    }
    await this.detourTo(pick);
  }

  private async titleDetour() {
    if (this.detourOpen) return;
    this.audio.unlock();
    this.audio.click();
    this.detourOpen = true;
    this.save = loadSave() ?? freshSave();
    const pick = await this.pickDetour('Back');
    this.detourOpen = false;
    if (!pick) return;
    this.save.tutorial = true;
    writeSave(this.save);
    await this.detourTo(pick);
  }

  /** Abandon whatever is in flight (stop, mini, dialog, call, fail card) and land cleanly on the target. */
  private async detourTo(t: DetourTarget) {
    this.endPerformance();
    this.epoch++;
    this.minis.abort();
    this.ui.abortDialog();
    this.ui.clearCalls();
    this.ui.clearRecover();
    this.ui.clearScreens();
    this.ui.coach(null);
    this.ui.hidePrompt();
    this.hideGuides();
    this.pendingCall = null;
    this.callBusy = false;
    this.autoTarget = null;
    this.autoResolve = null;
    this.pendingStop = null;
    this.cam.push = 0;
    this.cam.focus = null;
    this.cam.focusWeight = 0;
    this.hitStop = 0;
    this.louise.root.position.y = 0;
    this.phase = 'transition';
    this.ui.showHud(false);
    if (this.save.done.includes(t.set)) this.save.stops[t.set] = [];
    if (t.stop) this.save.stops[t.set] = (this.save.stops[t.set] ?? []).filter((x) => x !== t.stop);
    writeSave(this.save);
    this.spawnAt = t.at ?? null;
    const ok = await this.enterSet(t.set, true);
    if (!ok || !this.set || this.setId !== t.set) return;
    if (t.call) {
      this.save.calls = { ...(this.save.calls ?? {}), [t.call]: false };
      this.pendingCall = { who: t.call, delay: 1.2, attempt: 1 };
    }
    const stop = t.stop ? this.set.stops.find((x) => x.id === t.stop) : undefined;
    if (stop && (this.phase as Phase) === 'play') {
      const st = stop.stand ?? stop.pos;
      this.louise.root.position.set(st[0] + 0.9, 0, st[1] + 0.9);
      this.cam.snap(this.louise.root.position);
      void this.runStop(stop);
    }
  }

  private finale() {
    this.phase = 'finale';
    this.unloadSetKeepFade();
    this.loadSetNow('downstairs');
    this.dogs.dogs.forEach((d, i) => {
      d.mode = 'bedded';
      d.pos.set(i ? -3.4 : -6.4, 0.12, i ? 1.9 : 1.2);
    });
    this.louise.root.position.set(-4.8, 0, 2.6);
    this.cam.cinePos.set(-4.8, 3.5, 8);
    this.cam.cineLook.set(-4.8, 0.8, 1.5);
    this.cam.cine = 1;
    this.audio.playMusic('title');
    void this.ui.fade(false);
    this.ui.showHud(false);
    this.confetti.burst(new THREE.Vector3(-4.8, 1.5, 2), 90, 5);
    this.audio.chime();
    const stops = Object.values(this.save.stops).reduce((a, s) => a + s.length, 0);
    this.ui.finale({ hearts: this.save.hearts, stops, sits: this.save.sits, dogs: this.save.dogs }, () => {
      clearSave();
      this.ui.clearScreens();
      void this.startNew();
    });
  }

  private unloadSetKeepFade() {
    this.unloadSet();
  }

  /* =================== stops =================== */
  private walkTo(p: THREE.Vector3, timeout = 2.8) {
    this.autoTarget = p.clone();
    return Promise.race([
      new Promise<void>((r) => (this.autoResolve = r)),
      sleep(timeout * 1000).then(() => {
        if (this.autoTarget) this.louise.root.position.set(p.x, this.louise.root.position.y, p.z);
        this.autoTarget = null;
      }),
    ]);
  }

  private async runStop(stop: StopDef) {
    if (this.phase !== 'play' || !this.set) return;
    const set = this.set;
    const ep = this.epoch;
    this.phase = 'stop';
    this.pendingStop = null;
    this.tapTarget = null;
    this.ui.hidePrompt();
    this.ui.coach(null);
    this.hideGuides();
    if (this.coachStep === 2) this.coachStep = 3;
    const hooks = set.hooks[stop.id] ?? {};
    const st = stop.stand ?? stop.pos;
    const stand = new THREE.Vector3(st[0], 0, st[1]);
    if (!set.vehicle) await this.walkTo(stand);
    if (ep !== this.epoch) return;
    this.vel.set(0, 0, 0);
    const face = stop.face ?? this.louise.facing;
    void tweens.to(0.25, (k) => (this.louise.facing = dampAngle(this.louise.facing, face, 30 * k, 0.05)));
    this.cam.pushSpec = { dist: 4.8, height: 2.8, yaw: 0, ...(stop.push ?? {}) };
    this.cam.focus = new THREE.Vector3(stop.pos[0], 0, stop.pos[1]);
    void tweens.to(0.7, (k) => (this.cam.push = k), easeInOutCubic);
    hooks.start?.();
    this.markers.get(stop.id)!.state = 'hidden';
    this.ui.placeLabel(`stop-${stop.id}`, 0, 0, false);
    if (stop.intro) await this.ui.dialog(stop.intro);
    if (ep !== this.epoch) return;
    const root = this.louise.root;
    const before = root.position.clone();
    if (stop.poseAt) {
      const to = new THREE.Vector3(...stop.poseAt);
      await tweens.to(0.35, (k) => root.position.lerpVectors(before, to, k), easeOutBack);
      if (ep !== this.epoch) return;
    }
    this.louise.setState(stop.pose);
    this.louise.facing = face;
    this.dogs.toSpots(stop.dogSpots);
    if (!stop.dogSpots && stop.mini.type !== 'dialogue' && stop.mini.type !== 'phone') this.dogs.stare(root.position);
    const res = await this.minis.run(stop.mini, (k) => hooks.progress?.(k));
    if (ep !== this.epoch) return;
    this.endPerformance(false);
    hooks.done?.();

    // juice: hit-stop, squash, confetti, chime, meter surge, hearts
    this.hitStop = 0.14;
    this.louise.pop(0.32);
    const at = new THREE.Vector3(stop.pos[0], 1.3, stop.pos[1]);
    this.confetti.burst(at, 60, 4.2);
    this.cam.shake(0.18);
    this.audio.chime();
    haptic([25, 35, 60]);
    const refill = stop.refill * (0.65 + 0.35 * res.score);
    this.meter = Math.min(METER_MAX, this.meter + refill);
    this.ui.meterBoost();
    const scr = this.project(at);
    if (scr) this.ui.floater(`+${Math.round(refill)} restless`, scr.x, scr.y - 30);
    this.addHearts(stop.hearts + res.hearts, at);
    this.dogs.celebrate();
    this.louise.setState(set.vehicle ? 'ride' : 'cheer');
    await sleep(stop.poseAt ? 500 : 800);
    if (ep !== this.epoch) return;
    if (res.lines.length) await this.ui.dialog(res.lines);
    if (ep !== this.epoch) return;
    if (stop.outro) await this.ui.dialog(stop.outro);
    if (ep !== this.epoch) return;
    if (stop.poseAt) {
      const from = root.position.clone();
      await tweens.to(0.3, (k) => root.position.lerpVectors(from, before, k), easeInOutCubic);
      if (ep !== this.epoch) return;
    }
    root.position.y = 0;
    this.louise.setState(set.vehicle ? 'ride' : 'idle');
    this.restoreDan();
    this.dogs.release();
    void tweens.to(0.6, (k) => (this.cam.push = 1 - k), easeInOutCubic);
    this.cam.focus = null;
    if (stop.transient) {
      set.stops.splice(set.stops.indexOf(stop), 1);
      delete set.hooks[stop.id];
      const m = this.markers.get(stop.id);
      if (m) {
        this.r.scene.remove(m.root);
        m.dispose();
        this.markers.delete(stop.id);
      }
      this.save.dogs++;
    } else {
      this.stopsDone.add(stop.id);
      this.save.stops[this.setId] = [...this.stopsDone];
      this.markers.get(stop.id)!.state = 'done';
    }
    writeSave(this.save);
    this.lastProgress = this.t;
    this.ui.dropLabel(`stop-${stop.id}`);
    if (set.markSpots && this.leoMarkN === 0) this.leoMarkT = Math.min(this.leoMarkT, 7);
    this.queueHomeCall();
    this.refreshObjectives();
    this.still = 0;
    this.phase = 'play';
    if (this.requiredLeft() === 0) {
      if (this.exitMarker) {
        this.exitMarker.state = 'idle';
        this.ui.label('exit', this.set.exit!.label, '');
        this.ui.toast(this.set.exit ? `All done here → ${this.set.exit.label}` : 'All done!', 'good');
      }
    }
    if (this.coachStep === 3) {
      this.coachStep = 4;
      this.ui.coach('Her <b>Restless meter</b> drains fast when she stands still. Keep moving — finishing stops refills it!', 'meter');
      setTimeout(() => this.coachStep === 4 && (this.ui.coach(null), (this.coachStep = 5)), 5200);
    }
  }

  private hideGuides() {
    this.ui.edgeArrow(0, 0, 0, false);
    this.breadcrumbs.forEach((b) => ((b.material as THREE.MeshBasicMaterial).opacity = 0));
  }

  /** Spawns sit next to the door, so the exit only arms once she has walked away from it. */
  private exitArmed = false;

  private requiredLeft() {
    return this.set ? this.set.stops.filter((s) => !s.optional && !this.stopsDone.has(s.id)).length : 0;
  }

  private addStopMarker(s: StopDef) {
    const m = new StopMarker(s.color ?? '#ffd27a', s.radius ?? 0.8, s.poseAt ? 2.3 : 2.1);
    m.root.position.set(s.pos[0], 0, s.pos[1]);
    m.state = this.stopsDone.has(s.id) ? 'done' : 'idle';
    this.markers.set(s.id, m);
    this.r.scene.add(m.root);
    this.ui.label(`stop-${s.id}`, s.label + (s.optional ? ' · bonus' : ''));
  }

  /* =================== Leo vs. the piano leg & the bar stool leg =================== */
  private leoMarkT = 0;
  private leoMarkN = 0;
  private markPending: MarkSpot | null = null;
  private dirtySpots = new Map<string, { age: number; nags: number; at: THREE.Vector3 }>();

  private updateLeoMarks(dt: number) {
    const set = this.set;
    if (!set?.markSpots || this.phase !== 'play') return;
    const leo = this.dogs.dogs[1];
    if (this.markPending) {
      if (leo.mode !== 'mark') {
        this.markPending = null;
        this.leoMarkT = 9;
      } else if (leo.markPhase === 1 && leo.pos.distanceTo(this.louise.root.position) < 1.2) {
        const spot = this.markPending;
        this.dogs.cancelMark();
        this.markPending = null;
        this.leoMarkT = 26 + Math.random() * 8;
        this.ui.toast(`Caught Leo sniffing the ${spot.label}. Not today, sir.`, 'good');
        this.bark(leo, '*innocent face*');
        this.addHearts(1, leo.pos);
        this.save.dogs++;
      }
    } else {
      this.leoMarkT -= dt;
      if (this.leoMarkT <= 0) this.tryLeoMark(set.markSpots);
    }
    for (const d of this.dirtySpots.values()) {
      d.age += dt;
      if (d.nags < 3 && d.age > 20 * (d.nags + 1)) {
        d.nags++;
        this.meter = Math.max(0, this.meter - 10);
        this.ui.toast(LEO_NAGS[(this.leoMarkN + d.nags) % LEO_NAGS.length], 'warn');
        this.cam.shake(0.08);
        const s = this.project(d.at.clone().setY(0.6));
        if (s) this.ui.floater('−10 restless', s.x, s.y - 20);
      }
    }
  }

  private tryLeoMark(spots: MarkSpot[]) {
    const want = spots[this.leoMarkN % spots.length];
    const spot = !this.dirtySpots.has(want.id) ? want : spots.find((s) => !this.dirtySpots.has(s.id));
    if (!spot) {
      this.leoMarkT = 12;
      return;
    }
    const leg = new THREE.Vector3(spot.leg[0], 0, spot.leg[1]);
    if (!this.dogs.startMark(new THREE.Vector3(spot.stand[0], 0, spot.stand[1]), leg, spot.id, this.set?.dogGates)) {
      this.leoMarkT = 4;
      return;
    }
    this.markPending = spot;
    this.leoMarkN++;
    const leo = this.dogs.dogs[1];
    this.ui.label('bark-leo', '!', 'alert', 0.9);
    this.audio.bark('leo');
    this.ui.toast(`Leo is heading for the ${spot.label}… stop him!`, 'dog');
    this.focusBriefly(leg, 1.2);
    void leo;
  }

  private onLeoMarked(id: string) {
    const set = this.set;
    const spot = set?.markSpots?.find((s) => s.id === id);
    if (!set || !spot) return;
    this.markPending = null;
    this.leoMarkT = 30 + Math.random() * 10;
    this.audio.tinkle();
    const at = new THREE.Vector3(spot.leg[0], 0, spot.leg[1]);
    const mesh = new THREE.Group();
    const pud = new THREE.Mesh(G.circle(0.24, 24), puddleMat());
    pud.rotation.x = -Math.PI / 2;
    pud.scale.set(1.3, 0.9, 1);
    pud.position.set(0.1, 0.012, 0.08);
    pud.renderOrder = 2;
    const drip = new THREE.Mesh(G.box(0.05, 0.16, 0.05, 0), puddleMat());
    drip.position.set(0, 0.09, 0);
    mesh.add(pud, drip);
    mesh.position.copy(at);
    set.root.add(mesh);
    const stopId = `leo-${id}-${this.leoMarkN}`;
    const stand = spot.stand;
    const stop: StopDef = {
      id: stopId,
      label: `Wipe the ${spot.label} (Leo)`,
      verb: 'Wipe',
      pos: [spot.leg[0] + 0.1, spot.leg[1] + 0.08],
      stand,
      face: Math.atan2(spot.leg[0] - stand[0], spot.leg[1] - stand[1]),
      pose: 'work',
      radius: 1.1,
      optional: true,
      transient: true,
      mini: { type: 'clean', title: `Leo got the ${spot.label}. Again.`, hint: 'Rub the puddle (or mash Space)', mess: ['pee'], leg: spot.kind },
      outro: [LEO_OUTROS[this.leoMarkN % LEO_OUTROS.length]],
      refill: 14,
      hearts: 1,
      color: '#f2d36b',
      push: { dist: 3.4, height: 2.6, yaw: 0.3 },
    };
    set.stops.push(stop);
    set.hooks[stopId] = {
      done: () => {
        mesh.removeFromParent();
        this.dirtySpots.delete(id);
      },
    };
    this.addStopMarker(stop);
    this.dirtySpots.set(id, { age: 0, nags: 0, at });
    this.refreshObjectives();
    this.ui.toast(`Leo peed on the ${spot.label}. Again.`, 'warn');
    this.bark(this.dogs.dogs[1], '*zero regrets*');
  }

  /* =================== phone calls: Mom (Tagalog) and Nina =================== */
  private pendingCall: { who: CallerId; delay: number; attempt: number } | null = null;
  private callBusy = false;

  private updateCalls(dt: number) {
    if (!this.pendingCall || this.callBusy) return;
    this.pendingCall.delay -= dt;
    if (this.pendingCall.delay > 0) return;
    const { who, attempt } = this.pendingCall;
    this.pendingCall = null;
    void this.ringCall(who, attempt);
  }

  private markCall(who: CallerId) {
    this.save.calls = { ...(this.save.calls ?? {}), [who]: true };
    writeSave(this.save);
    this.queueHomeCall(8);
  }

  /** Home calls in the condo morning: Mom after the second stop, then Nina (school-pickup check-in) once Mom's is handled. */
  private queueHomeCall(ninaDelay = 5) {
    if (this.setId !== 'condo' || this.pendingCall || this.callBusy) return;
    const done = [...this.stopsDone].length;
    const calls = this.save.calls ?? {};
    if (done >= 2 && !calls.mom) this.pendingCall = { who: 'mom', delay: 4, attempt: 1 };
    else if (done >= 3 && calls.mom && !calls.nina) this.pendingCall = { who: 'nina', delay: ninaDelay, attempt: 1 };
  }

  private meterNudge(delta: number, label: string) {
    this.meter = clamp(this.meter + delta, 0, METER_MAX);
    if (delta > 0) this.ui.meterBoost();
    const s = this.project(this.louise.root.position.clone().setY(1.9));
    if (s) this.ui.floater(`${delta > 0 ? '+' : '−'}${Math.abs(delta)} restless · ${label}`, s.x, s.y - 20);
  }

  private async ringCall(who: CallerId, attempt: number) {
    this.callBusy = true;
    const ep = this.epoch;
    const c = CALLS[who];
    haptic([180, 90, 180]);
    const action = await this.ui.incomingCall({ name: c.name, letter: c.letter, color: c.color, attempt });
    if (action === 'cleared' || ep !== this.epoch) return;
    const where = SETS[this.setId].title;
    try {
      if (action === 'answer' && this.phase === 'play') await this.answerCall(who, where);
      else if (action === 'answer' || action === 'speaker') await this.speakerCall(who, where);
      else this.missedCall(who, attempt, action);
    } finally {
      this.callBusy = false;
    }
  }

  private async answerCall(who: CallerId, where: string) {
    const c = CALLS[who];
    const ep = this.epoch;
    this.phase = 'stop';
    this.ui.hidePrompt();
    this.ui.coach(null);
    this.hideGuides();
    this.vel.set(0, 0, 0);
    this.autoTarget = null;
    this.tapTarget = null;
    this.pendingStop = null;
    const at = this.louise.root.position.clone();
    this.louise.setState('phone');
    this.cam.pushSpec = { dist: 3.8, height: 2.3, yaw: 0.35 };
    this.cam.focus = at.clone();
    void tweens.to(0.6, (k) => (this.cam.push = k), easeInOutCubic);
    this.dogs.stare(at);
    const res = await this.minis.run({ type: 'phone', title: c.name, caller: { letter: c.letter, color: c.color }, lines: c.answer(where), choices: c.choices }, () => {});
    if (ep !== this.epoch) return;
    this.audio.chime();
    this.confetti.burst(at.clone().setY(1.5), 30, 3);
    this.addHearts(2 + res.hearts, at.clone().setY(1.5));
    if (who === 'mom') {
      await this.ui.dialog([{ who: 'louise', text: 'Nothing nothing. Classic Ma. …Love her so much.' }]);
      if (ep !== this.epoch) return;
      this.meterNudge(-8, 'stood still for Mom');
    } else {
      this.meterNudge(-5, 'stood still for Nina');
    }
    this.dogs.release();
    void tweens.to(0.5, (k) => (this.cam.push = 1 - k), easeInOutCubic);
    this.cam.focus = null;
    this.louise.setState('idle');
    this.still = 0;
    this.lastProgress = this.t;
    this.markCall(who);
    if (this.phase === 'stop') this.phase = 'play';
  }

  private async speakerCall(who: CallerId, where: string) {
    const c = CALLS[who];
    this.ui.toast(`${c.name} is on speaker — keep moving!`, 'good');
    const ep = this.epoch;
    const ok = await this.ui.speakerCall(c.name, c.color, c.speaker(where));
    if (!ok || ep !== this.epoch) return;
    this.meterNudge(10, 'walk-and-talk');
    this.addHearts(2, this.louise.root.position.clone().setY(1.6));
    this.ui.toast(who === 'mom' ? 'Talked to Mom without stopping. She never noticed. (She noticed.)' : 'Laps around the kitchen with Nina on speaker: complete.', 'good');
    this.markCall(who);
  }

  private missedCall(who: CallerId, attempt: number, action: 'decline' | 'missed') {
    const c = CALLS[who];
    if (who === 'mom' && attempt < 2) {
      this.ui.toast(action === 'missed' ? 'Missed call: Mom' : 'Declined Mom… she’s calling back.', 'warn');
      this.pendingCall = { who, delay: 5, attempt: attempt + 1 };
      return;
    }
    c.missedTexts.forEach((t, i) => setTimeout(() => this.ui.toast(`${c.name}: “${t}”`, i ? '' : 'warn'), 600 + i * 1000));
    if (who === 'mom') {
      setTimeout(() => {
        this.meterNudge(-8, 'Mom guilt');
        this.ui.toast(`${attempt} missed calls from Mom. She was just calling.`, 'warn');
      }, 600 + c.missedTexts.length * 1000);
    }
    this.markCall(who);
  }

  private nextStop(): StopDef | null {
    if (!this.set) return null;
    const left = this.set.stops.filter((s) => !s.optional && !this.stopsDone.has(s.id));
    return left[0] ?? null;
  }

  private refreshObjectives() {
    if (!this.set) return;
    const next = this.nextStop();
    const items = this.set.stops.map((s) => ({ label: s.label, done: this.stopsDone.has(s.id), next: s === next, optional: s.optional }));
    const extra = this.set.dogBeds ? 'Herd Mochi & Leo to their beds' : this.requiredLeft() === 0 && this.set.exit ? this.set.exit.label : undefined;
    this.ui.setObjectives(items, extra);
  }

  private addHearts(n: number, at: THREE.Vector3) {
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        this.save.hearts++;
        this.ui.setHearts(this.save.hearts, true);
        this.audio.heart(i);
        const s = this.project(at);
        if (s) this.ui.floater('♥', s.x + (Math.random() - 0.5) * 60, s.y, 'heart');
      }, 120 + i * 110);
    }
    writeSave(this.save);
  }

  /* =================== dog events =================== */
  private bark(d: Dog, text: string) {
    this.ui.label(`bark-${d.name}`, text, 'bark', 1.1);
    if (text !== '!') this.audio.bark(d.name);
    if (d.mode !== 'basket') d.actor.setState('bark');
  }

  private focusBriefly(p: THREE.Vector3, sec: number) {
    if (this.phase !== 'play') return;
    this.cam.focus = p.clone();
    this.cam.focusWeight = 1.6;
    setTimeout(() => {
      if (this.cam.focus && this.cam.focus.equals(p)) this.cam.focus = null;
    }, sec * 1000);
  }

  private onBump(d: Dog, dir: THREE.Vector3) {
    if (this.phase !== 'play') return;
    this.vel.addScaledVector(dir, 5);
    this.louise.setState('stumble');
    this.louise.pop(0.3);
    this.cam.shake(0.3);
    this.audio.bonk();
    haptic([40, 30, 40]);
    this.meter = Math.max(1, this.meter - 6);
    this.ui.toast(`${d.display} bumped her! Still standing.`, 'warn');
    this.bark(d, '!!');
    setTimeout(() => this.phase === 'play' && this.louise.setState('idle'), 450);
  }

  private onCaught(d: Dog, what: string) {
    this.save.dogs++;
    this.meter = Math.min(METER_MAX, this.meter + 12);
    this.ui.meterBoost();
    this.addHearts(3, d.pos.clone().setY(0.6));
    this.confetti.burst(d.pos.clone().setY(0.5), 24, 3);
    this.ui.toast(`Got ${what} back from ${d.display}!`, 'good');
    this.audio.chime();
    haptic([20, 30, 20]);
  }

  private onBedded(d: Dog, all: boolean) {
    this.addHearts(3, d.pos.clone().setY(0.5));
    this.confetti.burst(d.pos.clone().setY(0.5), 30, 3);
    this.audio.chime();
    this.ui.toast(`${d.display} is in bed. ${all ? '' : 'One more!'}`, 'good');
    if (all) {
      this.phase = 'transition';
      this.save.done.push('downstairs');
      writeSave(this.save);
      const ep = this.epoch;
      setTimeout(async () => {
        if (ep !== this.epoch) return;
        await this.ui.dialog([
          { who: 'narrator', text: 'Both dogs: asleep. Dan: asleep. The whole condo: still.' },
          { who: 'louise', text: 'Okay. I’m going to sit down now. Just for a sec.' },
          { who: 'narrator', text: 'She reorganized the shoe rack instead. Goodnight, Louise.' },
        ]);
        if (ep !== this.epoch) return;
        await this.ui.fade(true);
        if (ep !== this.epoch) return;
        this.finale();
      }, 900);
    }
  }

  /* =================== fail / pause =================== */
  private doFail() {
    this.phase = 'fail';
    this.hideGuides();
    this.save.sits++;
    writeSave(this.save);
    this.ui.hidePrompt();
    this.ui.coach(null);
    this.louise.setState('sit');
    this.louise.pop(0.45);
    this.vel.set(0, 0, 0);
    this.cam.shake(0.4);
    this.audio.flop();
    haptic([60, 40, 120]);
    this.cam.pushSpec = { dist: 4.2, height: 2.2, yaw: 0.3 };
    void tweens.to(0.6, (k) => (this.cam.push = k * 0.9), easeInOutCubic);
    this.dogs.stare(this.louise.root.position);
    const ep = this.epoch;
    setTimeout(() => {
      if (ep !== this.epoch) return;
      this.ui.fail(roast(this.save.sits), 'Tip: keep moving between stops — standing still drains the meter. Finishing stops refills it.', () => {
        this.ui.clearScreens();
        this.meter = 72;
        this.still = 0;
        this.louise.setState('cheer');
        this.louise.pop(0.3);
        this.audio.good();
        this.dogs.release();
        void tweens.to(0.5, (k) => (this.cam.push = 0.9 * (1 - k)));
        setTimeout(() => this.louise.setState('idle'), 600);
        this.phase = 'play';
      });
    }, 1100);
  }

  private togglePause() {
    if (this.phase !== 'play' && this.phase !== 'stop') return;
    this.pausedFrom = this.phase;
    this.phase = 'paused';
    this.openSettings(true);
  }

  private openSettings(inGame: boolean) {
    this.ui.settings({
      quality: this.r.setting,
      muted: this.audio.muted,
      inGame,
      onQuality: (q) => {
        this.r.setQuality(q);
        this.set?.particles.forEach((p) => (p.pixelScale = this.r.pixelScale));
      },
      onMute: () => {
        const m = this.audio.toggleMute();
        document.getElementById('btn-mute')!.classList.toggle('muted', m);
        return m;
      },
      onClose: () => {
        if (inGame) this.phase = this.pausedFrom;
      },
      onRestart: inGame
        ? () => {
            this.save.stops[this.setId] = [];
            writeSave(this.save);
            void this.enterSet(this.setId, true);
          }
        : undefined,
      onDetour: inGame
        ? () => {
            this.phase = this.pausedFrom;
            void this.openDetour();
          }
        : undefined,
    });
  }

  /* =================== input helpers =================== */
  private onTap(x: number, y: number) {
    this.audio.unlock();
    if (this.phase !== 'play' || this.set?.vehicle) return;
    const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.r.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.ground, hit)) return;
    clampBounds(hit, this.set!.bounds);
    this.tapTarget = hit;
    this.tap.show(hit);
    this.pendingStop = null;
    for (const s of this.set!.stops) {
      if (this.stopsDone.has(s.id)) continue;
      if (Math.hypot(s.pos[0] - hit.x, s.pos[1] - hit.z) < 1.4) {
        this.pendingStop = s;
        this.tapTarget.set(s.pos[0], 0, s.pos[1]);
      }
    }
  }

  private project(p: THREE.Vector3) {
    const v = p.clone().project(this.r.camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight, ndc: v };
  }

  /* =================== frame =================== */
  private frame(now: number) {
    requestAnimationFrame((t) => this.frame(t));
    const raw = Math.min(0.05, (now - this.last) / 1000 || 0.016);
    this.last = now;
    let dt = raw;
    if (this.hitStop > 0) {
      this.hitStop -= raw;
      dt = raw * 0.06;
    }
    this.t += dt;
    WIND.uTime.value += raw;
    tweens.update(dt);
    if (this.phase === 'paused') {
      this.input.endFrame();
      this.r.render(raw);
      return;
    }
    if (this.phase === 'play') this.updatePlay(dt);
    else if (this.phase === 'stop' || this.phase === 'intro') this.updateScripted(dt);
    else if (this.phase === 'title') this.updateTitle(dt);
    else this.louise.speed = damp(this.louise.speed, 0, 8, dt);

    this.louise.update(dt);
    if (this.set) {
      const L = this.louise.root.position;
      this.dogs.update(dt, {
        louise: L,
        louiseVel: this.vel,
        louiseFacing: this.louise.facing,
        set: this.set,
        playing: this.phase === 'play',
        chaosAllowed: this.stopsDone.size > 0 || this.setId !== 'condo',
        basket: this.set.vehicle ? this.bike.basket : null,
      });
      this.updateLeoMarks(dt);
      if (this.phase === 'play') this.updateCalls(dt);
      if (this.set.leaves && this.set.vehicle) this.set.leaves.center.set(L.x, 0, L.z);
      this.updateDanceReact(dt);
      this.set.update(dt, this.t);
    }
    if (this.bike.group.visible) {
      this.bike.group.rotation.y = this.louise.facing;
      this.bike.wheels.forEach((w) => (w.rotation.x += this.vel.length() * dt * 3.2));
    }
    this.markers.forEach((m) => m.update(dt));
    this.exitMarker?.update(dt);
    this.confetti.update(dt);
    this.notes.update(dt);
    if (this.perform) {
      this.noteT -= dt;
      if (this.noteT <= 0) {
        this.noteT = this.perform === 'dance' ? 0.26 : 0.4;
        this.notes.puff(this.louise.root.position, this.perform === 'dance' ? 2 : 1);
      }
    }
    this.tap.update(dt);

    this.cam.focusWeight = damp(this.cam.focusWeight, this.cam.focus ? 1 : 0, 3, dt);
    this.cam.update(raw, this.louise.root.position, this.vel);
    const e = new THREE.Euler().setFromQuaternion(this.r.camera.quaternion, 'YXZ');
    VIEW.yaw = e.y;
    VIEW.pitch = -e.x;
    this.r.followShadow(this.louise.root.position);
    this.updateLabels(dt);
    this.r.render(raw);
    this.input.endFrame();
  }

  private updateTitle(dt: number) {
    this.titleOrbit += dt * 0.08;
    const a = Math.sin(this.titleOrbit) * 0.5;
    this.cam.cinePos.set(-1 + Math.sin(a) * 9, 3.6, 5.5 + Math.cos(a) * 3);
    this.cam.cineLook.set(-1.4, 1.1, -1.2);
    this.louise.antsy = 0.4 + Math.sin(this.t) * 0.3;
    if (Math.random() < 0.004) this.louise.pop(0.15);
  }

  private updateScripted(dt: number) {
    const L = this.louise.root.position;
    if (this.autoTarget) {
      const d = this.tmp.subVectors(this.autoTarget, L).setY(0);
      const dist = d.length();
      if (dist < 0.12) {
        this.autoTarget = null;
        this.vel.set(0, 0, 0);
        this.autoResolve?.();
        this.autoResolve = null;
      } else {
        const want = d.multiplyScalar((Math.min(WALK, dist * 4) / dist));
        this.vel.lerp(want, 1 - Math.exp(-10 * dt));
        L.addScaledVector(this.vel, dt);
        this.louise.facing = dampAngle(this.louise.facing, Math.atan2(this.vel.x, this.vel.z), 12, dt);
        this.louise.setState('walk');
      }
    } else {
      this.vel.multiplyScalar(Math.exp(-10 * dt));
    }
    this.louise.speed = this.vel.length() / WALK;
  }

  private updatePlay(dt: number) {
    const set = this.set!;
    const L = this.louise.root.position;
    const ax = this.input.axis();
    const yaw = this.cam.spec.yaw;
    let ix = ax.x * Math.cos(yaw) + ax.y * Math.sin(yaw);
    let iz = -ax.x * Math.sin(yaw) + ax.y * Math.cos(yaw);
    let mag = ax.mag;
    if (mag > 0.1) {
      this.tapTarget = null;
      this.pendingStop = null;
    } else if (this.tapTarget) {
      const d = this.tmp.subVectors(this.tapTarget, L).setY(0);
      const dist = d.length();
      if (dist < 0.3 || (this.pendingStop && dist < 0.9)) {
        this.tapTarget = null;
        if (this.pendingStop) void this.runStop(this.pendingStop);
      } else {
        ix = d.x / dist;
        iz = d.z / dist;
        mag = Math.min(1, dist / 0.6);
      }
    }
    // weighty locomotion: accelerate toward desired velocity, brake harder than we accelerate
    const bike = !!set.vehicle;
    const jog = bike || ax.sprint || (!ax.keyboard && mag > 0.92) || (ax.keyboard && this.meter > 70) || (this.tapTarget !== null && this.meter > 70);
    const maxV = (jog ? JOG : WALK) * (bike ? 1.45 : 1);
    const want = this.tmp.set(ix, 0, iz).multiplyScalar(maxV * mag);
    const cur = this.vel.length();
    if (cur > 1 && want.lengthSq() > 0.01) {
      const turn = Math.abs(Math.atan2(this.vel.x * want.z - this.vel.z * want.x, this.vel.x * want.x + this.vel.z * want.z));
      if (turn > 2) want.multiplyScalar(0.35);
    }
    const diff = want.sub(this.vel);
    const rate = want.lengthSq() + 0.01 > this.vel.lengthSq() ? ACCEL * (bike ? 0.55 : 1) : DECEL * (bike ? 0.4 : 1);
    const step = Math.min(diff.length(), rate * dt);
    if (diff.lengthSq() > 1e-6) this.vel.addScaledVector(diff.normalize(), step);
    L.addScaledVector(this.vel, dt);
    resolveCircle(L, 0.3, set.colliders, this.vel);
    clampBounds(L, set.bounds, this.vel);
    for (const d of this.dogs.dogs) {
      if (!d.actor.root.visible || d.mode === 'basket' || d.mode === 'bedded' || d.mode === 'spot') continue;
      separate(L, d.pos, 0.55, d.mode === 'block' ? 0.7 : 0.15);
    }
    const speed = this.vel.length();
    if (speed > 0.15) this.louise.facing = dampAngle(this.louise.facing, Math.atan2(this.vel.x, this.vel.z), bike ? 5 : 11, dt);
    this.louise.speed = speed / WALK;
    if (this.louise.state !== 'stumble') {
      if (bike) this.louise.setState('ride');
      else this.louise.setState(speed < 0.2 ? 'idle' : speed > 3.9 ? 'run' : 'walk');
    }
    this.movedDist += speed * dt;

    // restless meter: the core tension
    const moving = speed > 0.5;
    if (moving) {
      this.still = 0;
      if (this.meter < PASSIVE_CAP) this.meter = Math.min(PASSIVE_CAP, this.meter + (jog ? 2.4 : 1.5) * dt);
    } else {
      this.still += dt;
      const grace = 0.6;
      if (this.still > grace) {
        const tutorialEase = this.setId === 'condo' && this.stopsDone.size === 0 ? 0.45 : 1;
        this.meter -= (bike ? 9 : 13) * tutorialEase * dt * Math.min(1, (this.still - grace) * 2);
      }
    }
    this.louise.antsy = clamp(this.still / 2.5 + (1 - this.meter / 100) * 0.6, 0, 1);
    const level: 0 | 1 | 2 = this.meter < 15 ? 2 : this.meter < 35 ? 1 : 0;
    this.ui.setMeter(this.meter, level);
    if (level > 0) {
      this.heartbeatT -= dt;
      if (this.heartbeatT <= 0) {
        this.heartbeatT = level === 2 ? 0.5 : 0.9;
        this.audio.heartbeat();
        if (level === 2) haptic(15);
      }
    }
    if (this.meter <= 0) {
      this.meter = 0;
      this.doFail();
      return;
    }

    // stops: proximity prompt + camera framing
    let near: StopDef | null = null;
    let nearD = 1e9;
    for (const s of set.stops) {
      if (this.stopsDone.has(s.id)) continue;
      const d = Math.hypot(s.pos[0] - L.x, s.pos[1] - L.z);
      const m = this.markers.get(s.id)!;
      m.state = d < (s.radius ?? 1.35) ? 'near' : 'idle';
      if (d < nearD) {
        nearD = d;
        near = s;
      }
    }
    if (near && nearD < (near.radius ?? 1.35)) {
      const target = near;
      this.ui.showPrompt(near.verb, () => void this.runStop(target));
      if (this.coachStep === 2) this.ui.coach(this.input.touch ? 'Tap the big button to start!' : 'Press <b>E</b> (or click the button) to start!');
    } else {
      this.ui.hidePrompt();
    }
    if (near && nearD < 5 && !set.vehicle) this.cam.focus = new THREE.Vector3(near.pos[0], 0, near.pos[1]);
    else if (this.cam.focusWeight < 1.2) this.cam.focus = null;

    // exit
    if (set.exit) {
      const d = Math.hypot(set.exit.x - L.x, set.exit.z - L.z);
      if (d > 2) this.exitArmed = true;
      if (d < 1.2 && this.exitArmed) {
        if (this.requiredLeft() === 0) void this.leaveSet();
        else {
          this.exitArmed = false;
          const n = this.requiredLeft();
          this.ui.toast(`${n} stop${n > 1 ? 's' : ''} left here — leaving early is fine (demo).`, 'warn');
          void this.openDetour(true);
        }
      }
    }

    // trail weave gates
    set.gates.forEach((g, i) => {
      if (this.gatesHit.has(i)) return;
      if (Math.abs(L.z - g.z) < 0.7 && Math.abs(L.x - g.x) < g.w / 2) {
        this.gatesHit.add(i);
        this.meter = Math.min(METER_MAX, this.meter + 9);
        this.ui.meterBoost();
        this.audio.good();
        haptic(15);
        this.addHearts(1, new THREE.Vector3(g.x, 1.8, g.z));
        if (g.mesh) {
          const m = g.mesh;
          void tweens.to(0.4, (k) => m.scale.setScalar(Math.max(0.001, 1 + k * 0.6 - k * k * 1.6)));
        }
      }
    });

    // tutorial coach
    if (this.coachStep === 1) {
      this.ui.coach(this.input.touch ? '<b>Drag</b> on the left side to walk — or <b>tap</b> anywhere to go there.' : '<b>Walk</b> with WASD or the arrow keys — or click to go there.');
      if (this.movedDist > 1.5) {
        this.coachStep = 2;
        this.ui.coach('Head to the glowing <b>bed</b> — rule one: make it.');
      }
    }

    // breadcrumbs + edge arrow toward the next objective
    const nxt = this.nextStop();
    const goal = nxt ? new THREE.Vector3(nxt.pos[0], 0, nxt.pos[1]) : set.exit && this.requiredLeft() === 0 ? new THREE.Vector3(set.exit.x, 0, set.exit.z) : null;
    const lost = this.t - this.lastProgress > 11 && !set.dogBeds;
    this.breadcrumbs.forEach((b, i) => {
      const mat = b.material as THREE.MeshBasicMaterial;
      if (goal && lost) {
        const k = (i + 1) / (this.breadcrumbs.length + 1);
        b.position.lerpVectors(L, goal, k).setY(0.03);
        const wave = 0.5 + 0.5 * Math.sin(this.t * 5 - i * 0.9);
        mat.opacity = damp(mat.opacity, 0.35 + wave * 0.5, 6, dt);
        b.scale.setScalar(0.8 + wave * 0.6);
      } else mat.opacity = damp(mat.opacity, 0, 6, dt);
    });
    if (goal) {
      const s = this.project(goal.clone().setY(1));
      const off = !s || Math.abs(s.ndc.x) > 0.92 || Math.abs(s.ndc.y) > 0.86;
      if (off) {
        const v = goal.clone().project(this.r.camera);
        let nx = v.x;
        let ny = v.y;
        if (v.z > 1) {
          nx = -nx;
          ny = -ny;
        }
        const ang = Math.atan2(-ny, nx);
        const ex = window.innerWidth / 2 + Math.cos(ang) * (window.innerWidth / 2 - 34);
        const ey = window.innerHeight / 2 + Math.sin(ang) * (window.innerHeight / 2 - 60);
        this.ui.edgeArrow(ex, clamp(ey, 130, window.innerHeight - 60), ang, true);
      } else this.ui.edgeArrow(0, 0, 0, false);
    } else this.ui.edgeArrow(0, 0, 0, false);
  }

  private updateLabels(dt: number) {
    this.ui.tickLabels(dt);
    if (!this.set) return;
    const L = this.louise.root.position;
    const showWorld = this.phase === 'play';
    for (const s of this.set.stops) {
      if (this.stopsDone.has(s.id)) continue;
      const p = this.project(new THREE.Vector3(s.pos[0], s.poseAt ? 2.75 : 2.55, s.pos[1]));
      const d = Math.hypot(s.pos[0] - L.x, s.pos[1] - L.z);
      if (p) this.ui.placeLabel(`stop-${s.id}`, p.x, p.y, showWorld && d < 9, clamp(1.4 - d / 9, 0.2, 1));
    }
    if (this.set.exit && this.exitMarker && this.exitMarker.state !== 'hidden') {
      const p = this.project(new THREE.Vector3(this.set.exit.x, 2.8, this.set.exit.z));
      if (p) this.ui.placeLabel('exit', p.x, p.y, showWorld, 1);
    }
    for (const d of this.dogs.dogs) {
      const p = this.project(d.pos.clone().setY(d.pos.y + 0.75));
      if (p) this.ui.placeLabel(`bark-${d.name}`, p.x, p.y, true, 1);
    }
    if (this.perform === 'dance') {
      const p = this.project(this.louise.root.position.clone().setY(2.05));
      if (p) this.ui.placeLabel('kick-cap', p.x, p.y, true);
    }
  }

  /** Hairbrush mic, floating notes, dog reactions, and Dan on the couch for the kick. */
  private onPerformCue(cue: 'sing' | 'note' | 'drop') {
    if (!this.set) return;
    const L = this.louise.root.position;
    if (cue === 'note') {
      this.notes.puff(L, 2);
      return;
    }
    if (cue === 'sing') {
      this.perform = 'sing';
      this.noteT = 0.15;
      this.louise.setState('sing');
      const brush = hairbrush();
      this.louise.hold(brush);
      // Local to the singing hand: just past the fist, beside the mouth.
      brush.position.set(0.02, 0.07, 0.03);
      brush.rotation.set(0.15, 0.2, 0.35);
      brush.scale.setScalar(0.55);
      this.dogs.watch(L, { mochi: 'tilt', leo: 'sit' });
      this.notes.puff(L, 5);
      return;
    }
    this.perform = 'dance';
    this.noteT = 0.05;
    this.prevKick = 0;
    this.kickReact = 0;
    this.louise.hold(null);
    this.louise.setState('dance');
    this.dogs.watch(L, { mochi: 'tilt', leo: 'howl' });
    this.notes.puff(L, 8);
    this.audio.howl();
    this.ui.label('bark-leo', 'Awooo!', 'bark', 2.6);
    this.ui.label('kick-cap', 'the kick', 'bark');
    const dan = this.set.npcs.find((n) => n.id === 'dan');
    if (dan && this.setId !== 'night') {
      if (!this.danHome) this.danHome = { p: dan.root.position.clone(), f: dan.facing, s: dan.state };
      dan.setState('cringe');
      this.ensureDanPalm(dan);
      const from = dan.root.position.clone();
      const token = ++this.danTween;
      this.danSeated = false;
      void tweens.to(0.45, (k) => {
        if (token !== this.danTween) return;
        dan.root.position.lerpVectors(from, this.danWatch, k);
        dan.facing = Math.atan2(L.x - dan.root.position.x, L.z - dan.root.position.z);
        if (k > 0.98) this.danSeated = true;
      });
    }
  }

  /** Dan sinks into the couch and facepalms on each little kick. */
  private updateDanceReact(dt: number) {
    const dan = this.set?.npcs.find((n) => n.id === 'dan');
    if (this.perform !== 'dance' || !dan) {
      this.kickReact = Math.max(0, this.kickReact - dt * 3);
      if (dan?.sprite) dan.sprite.react = this.kickReact;
      if (this.danPalm) this.danPalm.visible = false;
      return;
    }
    const env = this.louise.sprite?.kickK ?? 0;
    if (env > 0.72 && this.prevKick <= 0.72) {
      this.kickReact = 1;
      this.cam.shake(0.05);
    }
    if (env > 0.72) this.kickReact = Math.max(this.kickReact, 0.9);
    this.prevKick = env;
    this.markers.forEach((m) => {
      if (m.state !== 'done') m.state = 'hidden';
    });
    this.kickReact = Math.max(0, this.kickReact - dt * 2.2);
    if (dan.sprite) dan.sprite.react = this.kickReact;
    if (this.danSeated) {
      const away = this.tmp.copy(this.danWatch).sub(this.louise.root.position);
      away.y = 0;
      if (away.lengthSq() < 1e-4) away.set(0, 0, -1);
      away.normalize();
      dan.root.position.copy(this.danWatch).addScaledVector(away, 0.2 * this.kickReact);
      dan.facing = Math.atan2(this.louise.root.position.x - dan.root.position.x, this.louise.root.position.z - dan.root.position.z);
    }
    if (this.danPalm) {
      const hit = this.kickReact;
      this.danPalm.visible = hit > 0.12;
      this.danPalm.position.set(0.02, 1.56, 0.06 + (1 - hit) * 0.22);
      this.danPalm.rotation.z = -0.55 - hit * 0.2;
      this.danPalm.scale.setScalar(0.9 + hit * 0.25);
    }
  }

  private ensureDanPalm(dan: Actor) {
    if (this.danPalm || !dan.sprite) return;
    this.danPalm = facepalm();
    this.danPalm.visible = false;
    dan.sprite.addBillboard(this.danPalm);
  }

  private endPerformance(restoreDan = true) {
    this.perform = null;
    this.danTween++;
    this.danSeated = false;
    this.kickReact = 0;
    this.prevKick = 0;
    if (this.danPalm) this.danPalm.visible = false;
    const dan = this.set?.npcs.find((n) => n.id === 'dan');
    if (dan?.sprite) dan.sprite.react = 0;
    this.louise.hold(null);
    this.dogs.clearWatch();
    this.ui.dropLabel('kick-cap');
    if (restoreDan) this.restoreDan();
  }

  private restoreDan() {
    const dan = this.set?.npcs.find((n) => n.id === 'dan');
    if (!dan || !this.danHome) return;
    this.danTween++;
    dan.root.position.copy(this.danHome.p);
    dan.facing = this.danHome.f;
    dan.setState(this.danHome.s);
    this.danHome = null;
  }
}

function facepalm() {
  const g = new THREE.Group();
  const skin = new THREE.MeshBasicMaterial({ color: '#e4b596', toneMapped: false });
  const deep = new THREE.MeshBasicMaterial({ color: '#c48d72', toneMapped: false });
  const back = new THREE.Mesh(new THREE.CircleGeometry(0.078, 18), deep);
  back.position.z = -0.008;
  const palm = new THREE.Mesh(new THREE.CircleGeometry(0.068, 18), skin);
  g.add(back, palm);
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.042, 3, 6), skin);
    finger.position.set(-0.038 + i * 0.025, 0.072, 0.008);
    g.add(finger);
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.036, 3, 6), skin);
  thumb.position.set(-0.07, 0.02, 0.01);
  thumb.rotation.z = 0.85;
  g.add(thumb);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.renderOrder = 8;
  });
  return g;
}

function hairbrush() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(G.cyl(0.02, 0.024, 0.22, 10), M.gloss('#e7b08a', 0.35));
  handle.position.y = 0.06;
  const head = new THREE.Mesh(G.sphere(0.055, 14, 10), M.gloss('#f6d7c6', 0.4));
  head.scale.set(1.05, 1.35, 0.42);
  head.position.y = 0.2;
  const bristles = new THREE.Mesh(G.box(0.07, 0.09, 0.018, 0.004), M.std('#2b1d2e', 0.75));
  bristles.position.set(0, 0.2, 0.028);
  g.add(handle, head, bristles);
  return g;
}

function spriteTint(k: LightKit) {
  const c = new THREE.Color('#ffffff').lerp(new THREE.Color(k.sky), 0.22);
  const b = clamp(0.5 + k.hemi * 0.42, 0.62, 1);
  return c.multiplyScalar(b);
}
