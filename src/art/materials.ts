import * as THREE from 'three';

const cache = new Map<string, THREE.Material>();

function shared<T extends THREE.Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined;
  if (!m) {
    m = make();
    m.userData.shared = true;
    cache.set(key, m);
  }
  return m;
}

const hex = (c: THREE.ColorRepresentation) => new THREE.Color(c).getHexString();

/** Shared wind clock for foliage sway; advanced once per frame by the game loop. */
export const WIND = { uTime: { value: 0 } };

export const M = {
  /** Leaves that sway in the vertex shader, so trees can be static-batched and still move. */
  foliage(color: THREE.ColorRepresentation, rough = 0.85) {
    return shared(`foliage${hex(color)}|${rough}`, () => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: rough });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uWindTime = WIND.uTime;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            float wk = smoothstep(1.2, 4.5, position.y);
            float wph = position.x * 0.35 + position.z * 0.27;
            transformed.x += sin(uWindTime * 1.3 + wph) * 0.07 * wk;
            transformed.z += cos(uWindTime * 1.05 + wph * 1.3) * 0.05 * wk;`
          );
      };
      m.customProgramCacheKey = () => 'foliage';
      return m;
    });
  },
  std(color: THREE.ColorRepresentation, rough = 0.7, metal = 0) {
    return shared(`std${hex(color)}|${rough}|${metal}`, () =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
    );
  },
  /** Soft fabric with sheen rim — boucle chairs, duvets, fur. */
  fabric(color: THREE.ColorRepresentation, sheen: THREE.ColorRepresentation = '#ffffff', rough = 0.85, sheenAmt = 0.6) {
    return shared(`fab${hex(color)}|${hex(sheen)}|${rough}|${sheenAmt}`, () =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: rough,
        sheen: sheenAmt,
        sheenColor: new THREE.Color(sheen),
        sheenRoughness: 0.6,
      })
    );
  },
  /** Clear-coated finish — lacquer, sneakers, car paint, glossy tile. */
  gloss(color: THREE.ColorRepresentation, rough = 0.35, clearcoat = 0.8) {
    return shared(`gloss${hex(color)}|${rough}|${clearcoat}`, () =>
      new THREE.MeshPhysicalMaterial({ color, roughness: rough, clearcoat, clearcoatRoughness: 0.2 })
    );
  },
  metal(color: THREE.ColorRepresentation = '#c9c9c9', rough = 0.3) {
    return shared(`metal${hex(color)}|${rough}`, () =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 1 })
    );
  },
  glow(color: THREE.ColorRepresentation, intensity = 2) {
    return shared(`glow${hex(color)}|${intensity}`, () =>
      new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 1 })
    );
  },
  /** Unlit colour that ignores fog — backdrops seen through windows. */
  unlit(map: THREE.Texture, key: string) {
    return shared(`unlit${key}`, () => new THREE.MeshBasicMaterial({ map, fog: false, toneMapped: false }));
  },
  glass(tint: THREE.ColorRepresentation = '#cfe8f0', opacity = 0.18) {
    return shared(`glass${hex(tint)}|${opacity}`, () =>
      new THREE.MeshPhysicalMaterial({
        color: tint,
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        opacity,
        depthWrite: false,
      })
    );
  },
  tex(map: THREE.Texture, rough = 0.8, metal = 0, key = '', color: THREE.ColorRepresentation = '#ffffff') {
    return shared(`tex${map.uuid}|${rough}|${metal}|${key}|${hex(color)}`, () =>
      new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: metal, color })
    );
  },
  sign(map: THREE.Texture, emissive = 0, key = '') {
    return shared(`sign${map.uuid}|${emissive}|${key}`, () =>
      new THREE.MeshStandardMaterial({
        map,
        transparent: true,
        roughness: 0.6,
        emissive: emissive > 0 ? '#ffffff' : '#000000',
        emissiveMap: emissive > 0 ? map : null,
        emissiveIntensity: emissive,
        depthWrite: false,
      })
    );
  },
  additive(map: THREE.Texture, color: THREE.ColorRepresentation, opacity = 0.5, key = '') {
    return shared(`add${map.uuid}|${hex(color)}|${opacity}|${key}`, () =>
      new THREE.MeshBasicMaterial({
        map,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      })
    );
  },
  shadow(map: THREE.Texture, opacity = 0.5) {
    return shared(`shadow${map.uuid}|${opacity}`, () =>
      new THREE.MeshBasicMaterial({
        map,
        color: '#000000',
        transparent: true,
        opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    );
  },
};

/** Character + world palette pulled from the photo refs and character sheets. */
export const PAL = {
  louiseSkin: '#c98b62',
  louiseHairRoot: '#3a2418',
  louiseHairMid: '#7a5236',
  louiseHairTip: '#caa274',
  louiseTank: '#6b2a2e',
  louisePants: '#ece0c8',
  louiseShoe: '#f5efe4',
  louiseSole: '#c9a27a',
  lip: '#b5484a',
  danSkin: '#e4b596',
  danHair: '#5a3b26',
  danPolo: '#1e1e22',
  danJeans: '#233154',
  danShoe: '#1d1d1f',
  mochiFur: '#f3e8d6',
  mochiTan: '#b98a5a',
  leoTan: '#c48a48',
  leoSaddle: '#2a2a33',
  nose: '#2a1a16',
  cream: '#fff6ec',
  peach: '#ff9e7a',
  coral: '#ff6f59',
  plum: '#2b1d2e',
  gold: '#f2c46d',
};
