import type * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const GLB_MAGIC = 0x46546c67; // "glTF"
const cache = new Map<string, Promise<GLTF | null>>();
let loaderPromise: Promise<{ parse: (buf: ArrayBuffer, path: string) => Promise<GLTF> }> | null = null;

function base() {
  return import.meta.env.BASE_URL ?? './';
}

export function assetUrl(path: string) {
  return `${base()}${path}`.replace(/\/\.\//g, '/');
}

async function getLoader() {
  if (!loaderPromise) {
    loaderPromise = (async () => {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/libs/meshopt_decoder.module.js'),
      ]);
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      return { parse: (buf: ArrayBuffer, path: string) => loader.parseAsync(buf, path) };
    })();
  }
  return loaderPromise;
}

/**
 * Loads a GLB if (and only if) a real binary glTF lives at `path`.
 * The static host rewrites unknown paths to index.html, so a 200 alone proves nothing —
 * we check the glTF magic bytes before pulling in the loader chunk.
 */
export function loadOptionalGlb(path: string): Promise<GLTF | null> {
  let p = cache.get(path);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(assetUrl(path), { cache: 'force-cache' });
        if (!res.ok) return null;
        const type = res.headers.get('content-type') ?? '';
        if (type.includes('text/html')) return null;
        const buf = await res.arrayBuffer();
        if (buf.byteLength < 20 || new DataView(buf).getUint32(0, true) !== GLB_MAGIC) return null;
        const loader = await getLoader();
        const dir = assetUrl(path).replace(/[^/]*$/, '');
        const gltf = await loader.parse(buf, dir);
        console.info(`[assets] loaded ${path}`);
        return gltf;
      } catch (err) {
        console.warn(`[assets] ${path} unavailable, using procedural fallback`, err);
        return null;
      }
    })();
    cache.set(path, p);
  }
  return p;
}

export function findNode(root: THREE.Object3D, pattern: RegExp): THREE.Object3D | null {
  let hit: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (!hit && pattern.test(o.name)) hit = o;
  });
  return hit;
}
