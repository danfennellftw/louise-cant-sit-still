import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const cache = new Map<string, THREE.BufferGeometry>();

function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key) as T | undefined;
  if (!g) {
    g = make();
    g.userData.shared = true;
    cache.set(key, g);
  }
  return g;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export const G = {
  box(w: number, h: number, d: number, r = 0) {
    const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    return cached(`box${r3(w)}|${r3(h)}|${r3(d)}|${r3(rr)}`, () =>
      rr > 0.002 ? new RoundedBoxGeometry(w, h, d, 2, rr) : new THREE.BoxGeometry(w, h, d)
    );
  },
  cyl(rt: number, rb: number, h: number, seg = 18, open = false) {
    return cached(`cyl${r3(rt)}|${r3(rb)}|${r3(h)}|${seg}|${open}`, () =>
      new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)
    );
  },
  sphere(r: number, ws = 18, hs = 14) {
    return cached(`sph${r3(r)}|${ws}|${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
  },
  partSphere(r: number, thetaLen: number, ws = 22, hs = 12) {
    return cached(`psph${r3(r)}|${r3(thetaLen)}|${ws}`, () =>
      new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, thetaLen)
    );
  },
  capsule(r: number, len: number, cap = 5, rad = 12) {
    return cached(`cap${r3(r)}|${r3(len)}|${cap}|${rad}`, () =>
      new THREE.CapsuleGeometry(r, len, cap, rad)
    );
  },
  torus(r: number, tube: number, arc = Math.PI * 2, rs = 10, ts = 24) {
    return cached(`tor${r3(r)}|${r3(tube)}|${r3(arc)}`, () =>
      new THREE.TorusGeometry(r, tube, rs, ts, arc)
    );
  },
  cone(r: number, h: number, seg = 16, open = false) {
    return cached(`cone${r3(r)}|${r3(h)}|${seg}|${open}`, () => new THREE.ConeGeometry(r, h, seg, 1, open));
  },
  plane(w: number, h: number, sx = 1, sy = 1) {
    return cached(`pl${r3(w)}|${r3(h)}|${sx}|${sy}`, () => new THREE.PlaneGeometry(w, h, sx, sy));
  },
  circle(r: number, seg = 32) {
    return cached(`circ${r3(r)}|${seg}`, () => new THREE.CircleGeometry(r, seg));
  },
  ring(ri: number, ro: number, seg = 48) {
    return cached(`ring${r3(ri)}|${r3(ro)}|${seg}`, () => new THREE.RingGeometry(ri, ro, seg));
  },
  ico(r: number, detail = 1) {
    return cached(`ico${r3(r)}|${detail}`, () => new THREE.IcosahedronGeometry(r, detail));
  },
  octa(r: number) {
    return cached(`oct${r3(r)}`, () => new THREE.OctahedronGeometry(r, 0));
  },
  dodeca(r: number) {
    return cached(`dod${r3(r)}`, () => new THREE.DodecahedronGeometry(r, 0));
  },
};

export interface PutOpts {
  rx?: number;
  ry?: number;
  rz?: number;
  s?: number | [number, number, number];
  cast?: boolean;
  receive?: boolean;
  name?: string;
}

export function put(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  o: PutOpts = {}
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  if (o.s !== undefined) {
    if (typeof o.s === 'number') m.scale.setScalar(o.s);
    else m.scale.set(o.s[0], o.s[1], o.s[2]);
  }
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  if (o.name) m.name = o.name;
  parent.add(m);
  return m;
}

/** Box whose `y` is its bottom face — props sit on floors without mental math. */
export function bx(
  p: THREE.Object3D,
  mat: THREE.Material,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  r = 0.02,
  o: PutOpts = {}
) {
  return put(p, G.box(w, h, d, r), mat, x, y + h / 2, z, o);
}

export function cy(
  p: THREE.Object3D,
  mat: THREE.Material,
  rt: number,
  rb: number,
  h: number,
  x: number,
  y: number,
  z: number,
  seg = 18,
  o: PutOpts = {}
) {
  return put(p, G.cyl(rt, rb, h, seg), mat, x, y + h / 2, z, o);
}

export function sp(p: THREE.Object3D, mat: THREE.Material, r: number, x: number, y: number, z: number, o: PutOpts = {}) {
  return put(p, G.sphere(r), mat, x, y, z, o);
}

export function group(parent: THREE.Object3D | null, x = 0, y = 0, z = 0, ry = 0, name = ''): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  g.name = name;
  parent?.add(g);
  return g;
}

/** Marks a subtree as animated so static batching leaves it alone. */
export function dynamic<T extends THREE.Object3D>(o: T): T {
  o.userData.dynamic = true;
  return o;
}

/**
 * Merge every static, opaque mesh under `root` into one mesh per material.
 * Cuts draw calls by an order of magnitude, which is what keeps phones at 60fps.
 */
export function bakeStatic(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean }>();
  const remove: THREE.Mesh[] = [];

  const visit = (o: THREE.Object3D) => {
    if (o.userData.dynamic) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(mesh as unknown as THREE.InstancedMesh).isInstancedMesh && !Array.isArray(mesh.material)) {
      const mat = mesh.material as THREE.Material;
      if (!mat.transparent && mesh.visible) {
        const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        for (const name of Object.keys(g.attributes)) {
          if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
        }
        if (!g.attributes.uv) {
          g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        }
        if (!g.attributes.normal) g.computeVertexNormals();
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld));
        const key = `${mat.uuid}|${mesh.castShadow}|${mesh.receiveShadow}`;
        let b = buckets.get(key);
        if (!b) {
          b = { mat, geos: [], cast: mesh.castShadow, receive: mesh.receiveShadow };
          buckets.set(key, b);
        }
        b.geos.push(g);
        remove.push(mesh);
      }
    }
    for (const c of o.children) visit(c);
  };
  visit(root);

  for (const m of remove) m.parent?.remove(m);
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    b.geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.mat);
    m.castShadow = b.cast;
    m.receiveShadow = b.receive;
    m.userData.baked = true;
    root.add(m);
  }
}

export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      if (mat.userData.shared) continue;
      for (const v of Object.values(mat)) {
        if (v instanceof THREE.Texture && !v.userData.shared) v.dispose();
      }
      mat.dispose();
    }
  });
}
