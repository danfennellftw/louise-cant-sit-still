import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { initialLevel, loadQualitySetting, profile, saveQualitySetting, type QualityLevel, type QualitySetting } from './quality';
import type { LightKit } from '../world/types';

/** Owns the WebGL renderer, lighting rig, post stack and adaptive quality. */
export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 600);
  readonly hemi = new THREE.HemisphereLight('#ffffff', '#886655', 1);
  readonly sun = new THREE.DirectionalLight('#ffffff', 2);
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  setting: QualitySetting;
  level: QualityLevel;
  private frameTimes: number[] = [];
  private lowFpsFor = 0;
  onQualityChange?: (l: QualityLevel) => void;
  private sunOffset = new THREE.Vector3(6, 12, 5);

  constructor(canvas: HTMLCanvasElement) {
    this.setting = loadQualitySetting();
    this.level = initialLevel(this.setting);
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: this.level !== 'low', powerPreference: 'high-performance' });
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;

    const pmrem = new THREE.PMREMGenerator(this.gl);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.scene.add(this.hemi);
    this.sun.castShadow = true;
    const cam = this.sun.shadow.camera;
    cam.left = -14;
    cam.right = 14;
    cam.top = 14;
    cam.bottom = -14;
    cam.near = 0.5;
    cam.far = 60;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target);
    this.applyLevel();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  setQuality(s: QualitySetting) {
    this.setting = s;
    saveQualitySetting(s);
    this.level = initialLevel(s);
    this.applyLevel();
  }

  private applyLevel() {
    const p = profile(this.level);
    this.gl.setPixelRatio(p.pixelRatio);
    this.gl.shadowMap.enabled = p.shadows;
    this.sun.castShadow = p.shadows;
    this.sun.shadow.mapSize.set(p.shadowSize, p.shadowSize);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null as unknown as THREE.WebGLRenderTarget;
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.needsUpdate = true;
    });
    if (p.bloom) {
      if (!this.composer) {
        this.composer = new EffectComposer(this.gl);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.55, 0.88);
        this.composer.addPass(this.bloom);
        this.composer.addPass(new OutputPass());
      }
    } else if (this.composer) {
      this.composer.dispose();
      this.composer = null;
      this.bloom = null;
    }
    this.resize();
    this.onQualityChange?.(this.level);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.gl.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(this.gl.getPixelRatio());
      this.composer.setSize(w, h);
      this.bloom?.resolution.set(w / 2, h / 2);
    }
  }

  /** Pixels-per-world-unit-at-1m, for soft particle sizing. */
  get pixelScale() {
    const h = this.gl.domElement.height;
    return h / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
  }

  applyLightKit(k: LightKit) {
    this.hemi.color.set(k.sky);
    this.hemi.groundColor.set(k.ground);
    this.hemi.intensity = k.hemi;
    this.sun.color.set(k.sun);
    this.sun.intensity = k.sunIntensity;
    this.sunOffset.set(...k.sunDir).normalize().multiplyScalar(22);
    this.scene.environmentIntensity = k.env;
    this.gl.toneMappingExposure = k.exposure;
    this.scene.fog = new THREE.Fog(k.fog, k.fogNear, k.fogFar);
    this.scene.background = new THREE.Color(k.background);
  }

  /** Keep the shadow frustum centred on the action, snapped to texels to avoid shimmer. */
  followShadow(focus: THREE.Vector3) {
    const size = (this.sun.shadow.camera.right - this.sun.shadow.camera.left) / this.sun.shadow.mapSize.x;
    const fx = Math.round(focus.x / size) * size;
    const fz = Math.round(focus.z / size) * size;
    this.sun.target.position.set(fx, 0, fz);
    this.sun.position.set(fx + this.sunOffset.x, this.sunOffset.y, fz + this.sunOffset.z);
  }

  render(dt: number) {
    if (this.composer) this.composer.render(dt);
    else this.gl.render(this.scene, this.camera);
    this.trackPerf(dt);
  }

  private trackPerf(dt: number) {
    if (this.setting !== 'auto' || this.level === 'low') return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 1 / 40) this.lowFpsFor += 1;
    else this.lowFpsFor = Math.max(0, this.lowFpsFor - 1);
    if (this.lowFpsFor >= 2) {
      this.lowFpsFor = 0;
      this.level = this.level === 'high' ? 'medium' : 'low';
      console.info(`[quality] auto-downgrade to ${this.level}`);
      this.applyLevel();
    }
  }
}
