import * as THREE from 'three';
import { G, put } from './geo';
import { M } from './materials';
import { TX } from './textures';
import { rng } from '../engine/util';

const particleVert = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  uniform float uTime;
  uniform float uScale;
  uniform float uTwinkle;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / max(0.1, -mv.z);
    vAlpha = mix(1.0, 0.5 + 0.5 * sin(uTime * 2.3 + aPhase * 6.2831), uTwinkle);
  }
`;
const particleFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * a * uOpacity * vAlpha);
  }
`;

export interface ParticleOpts {
  count: number;
  min: THREE.Vector3;
  max: THREE.Vector3;
  color: THREE.ColorRepresentation;
  size: number;
  opacity?: number;
  twinkle?: number;
  /** Units per second drift. */
  velocity?: THREE.Vector3;
  wander?: number;
  additive?: boolean;
  /** Steam: particles fade/grow as they rise and respawn at the bottom. */
  rise?: boolean;
}

/** One soft-particle system drives dust motes, chalk, fireflies, steam, pollen. */
export class Particles {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private base: Float32Array;
  private phase: Float32Array;
  private mat: THREE.ShaderMaterial;
  private t = 0;
  constructor(private o: ParticleOpts) {
    const r = rng(o.count * 13 + 1);
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(o.count * 3);
    this.base = new Float32Array(o.count * 3);
    this.phase = new Float32Array(o.count);
    const sizes = new Float32Array(o.count);
    for (let i = 0; i < o.count; i++) {
      for (let k = 0; k < 3; k++) {
        const v = o.min.getComponent(k) + r() * (o.max.getComponent(k) - o.min.getComponent(k));
        this.pos[i * 3 + k] = v;
        this.base[i * 3 + k] = v;
      }
      this.phase[i] = r();
      sizes[i] = o.size * (0.5 + r());
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(this.phase, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 300 },
        uTwinkle: { value: o.twinkle ?? 0 },
        uColor: { value: new THREE.Color(o.color) },
        uOpacity: { value: o.opacity ?? 0.6 },
      },
      transparent: true,
      depthWrite: false,
      blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.userData.dynamic = true;
  }

  set pixelScale(v: number) {
    this.mat.uniforms.uScale.value = v;
  }
  set opacity(v: number) {
    this.mat.uniforms.uOpacity.value = v;
  }

  update(dt: number) {
    this.t += dt;
    this.mat.uniforms.uTime.value = this.t;
    const { min, max } = this.o;
    const v = this.o.velocity;
    const w = this.o.wander ?? 0.15;
    const n = this.o.count;
    for (let i = 0; i < n; i++) {
      const p = this.phase[i] * 100;
      for (let k = 0; k < 3; k++) {
        const idx = i * 3 + k;
        let b = this.base[idx] + (v ? v.getComponent(k) * dt : 0);
        const lo = min.getComponent(k);
        const hi = max.getComponent(k);
        if (b > hi) b = lo + (b - hi);
        if (b < lo) b = hi - (lo - b);
        this.base[idx] = b;
        this.pos[idx] = b + Math.sin(this.t * (0.3 + k * 0.17) + p + k) * w;
      }
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.mat.dispose();
  }
}

/** Tumbling leaves / petals as a single instanced draw. */
export class Leaves {
  readonly mesh: THREE.InstancedMesh;
  private data: { p: THREE.Vector3; v: THREE.Vector3; rot: THREE.Euler; spin: THREE.Vector3; ph: number }[] = [];
  private dummy = new THREE.Object3D();
  private t = 0;
  center = new THREE.Vector3();
  constructor(count: number, private half: THREE.Vector3, colors: string[]) {
    const geo = new THREE.PlaneGeometry(0.14, 0.09);
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.userData.dynamic = true;
    const r = rng(77);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      this.data.push({
        p: new THREE.Vector3((r() * 2 - 1) * half.x, r() * half.y * 2, (r() * 2 - 1) * half.z),
        v: new THREE.Vector3(0.3 + r() * 0.4, -(0.35 + r() * 0.4), 0.1 * (r() - 0.5)),
        rot: new THREE.Euler(r() * 6, r() * 6, r() * 6),
        spin: new THREE.Vector3(r() * 2, r() * 3, r() * 2),
        ph: r() * 10,
      });
      this.mesh.setColorAt(i, c.set(colors[i % colors.length]));
    }
  }
  update(dt: number) {
    this.t += dt;
    const h = this.half;
    this.data.forEach((d, i) => {
      d.p.x += (d.v.x + Math.sin(this.t + d.ph) * 0.4) * dt;
      d.p.y += d.v.y * dt;
      d.p.z += d.v.z * dt;
      if (d.p.y < 0.02) d.p.y = h.y * 2;
      if (d.p.x > h.x) d.p.x = -h.x;
      if (d.p.x < -h.x) d.p.x = h.x;
      d.rot.x += d.spin.x * dt;
      d.rot.y += d.spin.y * dt;
      d.rot.z += d.spin.z * dt;
      this.dummy.position.copy(d.p).add(this.center);
      this.dummy.rotation.copy(d.rot);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/** Pooled confetti bursts for stop completions. */
export class Confetti {
  readonly mesh: THREE.InstancedMesh;
  private parts: { p: THREE.Vector3; v: THREE.Vector3; r: THREE.Euler; s: THREE.Vector3; life: number }[] = [];
  private dummy = new THREE.Object3D();
  private cursor = 0;
  constructor(private cap = 160) {
    const geo = new THREE.PlaneGeometry(0.07, 0.11);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.frustumCulled = false;
    const cols = ['#ff6f59', '#f2c46d', '#7fd1b9', '#ff9ec7', '#ffffff', '#8fb8ff'];
    const c = new THREE.Color();
    for (let i = 0; i < cap; i++) {
      this.parts.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), s: new THREE.Vector3(), life: 0 });
      this.mesh.setColorAt(i, c.set(cols[i % cols.length]));
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
  }
  burst(at: THREE.Vector3, n = 50, power = 4) {
    for (let k = 0; k < n; k++) {
      const p = this.parts[this.cursor];
      this.cursor = (this.cursor + 1) % this.cap;
      const a = Math.random() * Math.PI * 2;
      const up = 0.6 + Math.random() * 0.8;
      p.p.copy(at);
      p.v.set(Math.cos(a) * power * (0.3 + Math.random() * 0.5), power * up, Math.sin(a) * power * (0.3 + Math.random() * 0.5));
      p.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      p.s.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      p.life = 1.6 + Math.random() * 0.8;
    }
  }
  update(dt: number) {
    let any = false;
    this.parts.forEach((p, i) => {
      if (p.life <= 0) return;
      any = true;
      p.life -= dt;
      p.v.y -= 7 * dt;
      p.v.multiplyScalar(1 - 1.8 * dt);
      p.p.addScaledVector(p.v, dt);
      if (p.p.y < 0.02) {
        p.p.y = 0.02;
        p.v.set(0, 0, 0);
      }
      p.r.x += p.s.x * dt;
      p.r.y += p.s.y * dt;
      this.dummy.position.copy(p.p);
      this.dummy.rotation.copy(p.r);
      this.dummy.scale.setScalar(p.life > 0 ? Math.min(1, p.life * 2) : 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Fake volumetric light shaft (two crossed additive cards). */
export function lightShaft(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  color: THREE.ColorRepresentation,
  opacity = 0.18,
  tilt = 0.5,
  yaw = 0
) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.set(0, yaw, 0);
  const mat = M.additive(TX.shaft(), color, opacity, `shaft${opacity}`);
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(G.plane(w, h), mat);
    m.position.y = -h / 2;
    m.rotation.y = i * Math.PI * 0.5;
    const pivot = new THREE.Group();
    pivot.rotation.x = tilt;
    pivot.add(m);
    g.add(pivot);
  }
  g.userData.dynamic = true;
  parent.add(g);
  return g;
}

export function skyDome(top: string, horizon: string, bottom: string, radius = 380) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(top) },
      uHorizon: { value: new THREE.Color(horizon) },
      uBottom: { value: new THREE.Color(bottom) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(h, 0.55)) : mix(uHorizon, uBottom, pow(-h, 0.4));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), mat);
  m.userData.dynamic = true;
  m.renderOrder = -10;
  return m;
}

export function blobShadow(radius: number, opacity = 0.45) {
  const m = new THREE.Mesh(G.circle(radius, 24), M.shadow(TX.radial('rgba(0,0,0,1)', 'rgba(0,0,0,0)', 'blob'), opacity));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  m.renderOrder = 1;
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

/** Floor contact shading along a wall base — cheap stand-in for baked AO. */
export function aoStrip(parent: THREE.Object3D, x: number, z: number, len: number, ry: number, depth = 0.9) {
  const mat = new THREE.MeshBasicMaterial({
    map: TX.aoStrip(),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  mat.userData.shared = false;
  const m = new THREE.Mesh(G.plane(len, depth), mat);
  m.rotation.set(-Math.PI / 2, 0, ry);
  m.position.set(x, 0.008, z);
  m.receiveShadow = false;
  m.castShadow = false;
  parent.add(m);
  return m;
}

export type MarkerState = 'idle' | 'near' | 'done' | 'hidden';

/** Pulsing floor ring + floating gem + faint beam that marks an interactable stop. */
export class StopMarker {
  readonly root = new THREE.Group();
  private ring: THREE.Mesh;
  private ring2: THREE.Mesh;
  private disc: THREE.Mesh;
  private gem: THREE.Mesh;
  private beam: THREE.Mesh;
  private gemMat: THREE.MeshStandardMaterial;
  private ringMat: THREE.MeshBasicMaterial;
  private discMat: THREE.MeshBasicMaterial;
  private beamMat: THREE.MeshBasicMaterial;
  state: MarkerState = 'idle';
  private t = Math.random() * 10;
  private k = 1;
  constructor(color: THREE.ColorRepresentation, radius = 0.9, private gemHeight = 2.1) {
    this.root.userData.dynamic = true;
    this.ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, fog: false });
    this.discMat = new THREE.MeshBasicMaterial({
      color,
      map: TX.radial('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)', 'disc'),
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
    });
    this.beamMat = new THREE.MeshBasicMaterial({
      color,
      map: TX.shaft(),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.gemMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: color, emissiveIntensity: 1.6, roughness: 0.25, metalness: 0.1 });
    this.ring = put(this.root, G.ring(radius * 0.84, radius, 48), this.ringMat, 0, 0.06, 0, { rx: -Math.PI / 2, cast: false, receive: false });
    this.ring2 = put(this.root, G.ring(radius * 0.96, radius * 1.02, 48), this.ringMat, 0, 0.06, 0, { rx: -Math.PI / 2, cast: false, receive: false });
    this.disc = put(this.root, G.circle(radius * 1.4, 32), this.discMat, 0, 0.055, 0, { rx: -Math.PI / 2, cast: false, receive: false });
    this.beam = put(this.root, G.cyl(radius * 0.5, radius * 0.5, 2.6, 20, true), this.beamMat, 0, 1.3, 0, { rx: Math.PI, cast: false, receive: false });
    this.gem = put(this.root, G.octa(0.22), this.gemMat, 0, gemHeight, 0, { s: [1, 1.45, 1], cast: false, receive: false });
    [this.ring, this.ring2, this.disc, this.beam].forEach((m) => (m.renderOrder = 2));
  }

  update(dt: number) {
    this.t += dt;
    const target = this.state === 'hidden' ? 0 : this.state === 'done' ? 0 : 1;
    this.k += (target - this.k) * Math.min(1, dt * 5);
    this.root.visible = this.k > 0.02;
    if (!this.root.visible) return;
    const near = this.state === 'near';
    const pulse = 0.5 + 0.5 * Math.sin(this.t * (near ? 7 : 3.2));
    this.ring.scale.setScalar(this.k * (1 + pulse * (near ? 0.12 : 0.06)));
    const ex = (this.t * 0.8) % 1;
    this.ring2.scale.setScalar(this.k * (1 + ex * 0.6));
    this.ringMat.opacity = 0.9 * this.k;
    this.disc.scale.setScalar(this.k);
    this.discMat.opacity = (near ? 0.75 : 0.4) * this.k * (0.7 + pulse * 0.3);
    this.beamMat.opacity = (near ? 0.5 : 0.28) * this.k;
    this.gem.position.y = this.gemHeight + Math.sin(this.t * 2.2) * 0.1;
    this.gem.rotation.y += dt * (near ? 4 : 1.4);
    this.gem.scale.set(this.k, 1.45 * this.k, this.k);
    this.gemMat.emissiveIntensity = near ? 2.6 : 1.4 + pulse * 0.5;
  }

  dispose() {
    this.gemMat.dispose();
    this.ringMat.dispose();
    this.discMat.dispose();
    this.beamMat.dispose();
  }
}

/** Little ring that pops where the player tapped to walk. */
export class TapMarker {
  readonly mesh: THREE.Mesh;
  private life = 0;
  private mat: THREE.MeshBasicMaterial;
  constructor() {
    this.mat = new THREE.MeshBasicMaterial({ color: '#fff6ec', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    this.mesh = new THREE.Mesh(G.ring(0.28, 0.36, 32), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.renderOrder = 3;
  }
  show(p: THREE.Vector3) {
    this.mesh.position.set(p.x, 0.04, p.z);
    this.life = 1;
  }
  update(dt: number) {
    if (this.life <= 0) return;
    this.life -= dt * 1.6;
    const k = Math.max(0, this.life);
    this.mat.opacity = k * 0.9;
    this.mesh.scale.setScalar(0.6 + (1 - k) * 0.9);
  }
}

const NOTE_GLYPHS = ['♪', '♫', '♩'];
const NOTE_COLORS = ['#ff6f59', '#f2c46d', '#7fd1b9', '#ff9ec7', '#fff6ec'];

function noteTexture(glyph: string, color: string) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = color;
  g.font = '700 96px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(glyph, 64, 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Floating music notes for singing practice. Pooled sprites, original glyphs only. */
export class NoteFloat {
  readonly root = new THREE.Group();
  private pool: { s: THREE.Sprite; v: THREE.Vector3; life: number }[] = [];
  private tex: THREE.Texture[] = [];

  constructor() {
    NOTE_GLYPHS.forEach((g) => NOTE_COLORS.forEach((c) => this.tex.push(noteTexture(g, c))));
    for (let i = 0; i < 28; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.tex[i % this.tex.length], transparent: true, depthWrite: false, toneMapped: false, opacity: 0 })
      );
      s.visible = false;
      s.scale.setScalar(0.42);
      this.root.add(s);
      this.pool.push({ s, v: new THREE.Vector3(), life: 0 });
    }
  }

  puff(at: THREE.Vector3, n = 3) {
    let left = n;
    for (const p of this.pool) {
      if (left <= 0) break;
      if (p.life > 0) continue;
      left--;
      p.life = 2.1 + Math.random() * 0.5;
      p.s.visible = true;
      p.s.position.set(at.x + (Math.random() - 0.5) * 0.7, at.y + 1.25 + Math.random() * 0.45, at.z + (Math.random() - 0.5) * 0.45);
      p.s.scale.setScalar(0.55 + Math.random() * 0.28);
      (p.s.material as THREE.SpriteMaterial).opacity = 1;
      (p.s.material as THREE.SpriteMaterial).map = this.tex[Math.floor(Math.random() * this.tex.length)];
      p.v.set((Math.random() - 0.5) * 0.55, 0.65 + Math.random() * 0.7, (Math.random() - 0.5) * 0.55);
    }
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.v.y += dt * 0.35;
      p.s.position.addScaledVector(p.v, dt);
      p.s.position.x += Math.sin(p.life * 9) * dt * 0.15;
      const m = p.s.material as THREE.SpriteMaterial;
      m.opacity = Math.max(0, Math.min(1, p.life * 1.4));
      if (p.life <= 0) p.s.visible = false;
    }
  }
}
