// One-off asset pipeline: turns the Higgsfield character sheets in art-src/
// into transparent, trimmed, game-ready sprites in public/characters/.
// Run with: node scripts/process-art.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'public/characters';
mkdirSync(OUT, { recursive: true });

function dist2(data, i, r, g, b) {
  const dr = data[i] - r;
  const dg = data[i + 1] - g;
  const db = data[i + 2] - b;
  return dr * dr + dg * dg + db * db;
}

/**
 * Remove the near-uniform studio background by flood-filling transparency
 * inward from the image border, then feather the resulting silhouette.
 */
function knockoutBackground(data, w, h, tol) {
  // sample bg color from inset points near the corners (sheet borders can
  // carry a 1-2px frame that differs from the true background)
  // per-channel median over many inset border points, so an occasional
  // non-background sample (a shadow or prop reaching the border) is ignored
  const inset = 8;
  const samples = [];
  for (let i = 0; i <= 6; i++) {
    samples.push([Math.round((i / 6) * (w - 1 - 2 * inset)) + inset, inset]);
    samples.push([Math.round((i / 6) * (w - 1 - 2 * inset)) + inset, h - 1 - inset]);
    samples.push([inset, Math.round((i / 6) * (h - 1 - 2 * inset)) + inset]);
    samples.push([w - 1 - inset, Math.round((i / 6) * (h - 1 - 2 * inset)) + inset]);
  }
  const chan = (off) =>
    samples.map(([sx, sy]) => data[(sy * w + sx) * 4 + off]).sort((a, z) => a - z)[
      Math.floor(samples.length / 2)
    ];
  const r = chan(0);
  const g = chan(1);
  const b = chan(2);

  const tol2 = tol * tol;
  const filled = new Uint8Array(w * h);
  const stack = [];
  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (filled[p]) return;
    if (dist2(data, p * 4, r, g, b) > tol2) return;
    filled[p] = 1;
    stack.push(p);
  };
  for (const edge of [0, 3, 6, inset]) {
    for (let x = 0; x < w; x++) {
      tryPush(x, edge);
      tryPush(x, h - 1 - edge);
    }
    for (let y = 0; y < h; y++) {
      tryPush(edge, y);
      tryPush(w - 1 - edge, y);
    }
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    const y = (p / w) | 0;
    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }
  for (let p = 0; p < w * h; p++) if (filled[p]) data[p * 4 + 3] = 0;

  // feather: soften edge pixels whose color is close to bg
  const featherTol2 = tol2 * 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (filled[p]) continue;
      let nearHole = false;
      for (let dy = -2; dy <= 2 && !nearHole; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && filled[ny * w + nx]) {
            nearHole = true;
            break;
          }
        }
      }
      if (!nearHole) continue;
      const d2 = dist2(data, p * 4, r, g, b);
      if (d2 < featherTol2) {
        const t = Math.sqrt(d2 / featherTol2); // 0 close to bg -> 1 far
        data[p * 4 + 3] = Math.min(data[p * 4 + 3], Math.round(40 + t * 215));
      }
    }
  }
}

function alphaBBox(data, w, h) {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function cutout(input, out, { region, maxH, tol = 24 }) {
  let img = sharp(input);
  if (region) img = img.extract(region);
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  knockoutBackground(data, info.width, info.height, tol);
  const box = alphaBBox(data, info.width, info.height);
  let pipe = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).extract(box);
  if (box.height > maxH) pipe = pipe.resize({ height: maxH });
  await pipe.png({ compressionLevel: 9 }).toFile(`${OUT}/${out}`);
  console.log(`wrote ${OUT}/${out}`);
}

// sheets are two panels: full body (left) and portrait (right)
const SHEET = { w: 1024, h: 579 };
const left = { left: 0, top: 0, width: 472, height: SHEET.h };
// Dan's sheet has dark divider pixels reaching further left; crop tighter
const danLeft = { left: 40, top: 0, width: 400, height: SHEET.h };
const right = { left: 534, top: 0, width: SHEET.w - 534, height: SHEET.h };

await cutout('art-src/louise-sheet-a.png', 'louise.png', { region: left, maxH: 560 });
await cutout('art-src/louise-sheet-a.png', 'louise-face.png', { region: right, maxH: 512 });
await cutout('art-src/dan-sheet-a.png', 'dan.png', { region: danLeft, maxH: 560 });
await cutout('art-src/dan-sheet-a.png', 'dan-face.png', { region: right, maxH: 512 });
await cutout('art-src/mochi-a.png', 'mochi.png', { maxH: 460 });
await cutout('art-src/leo-a.png', 'leo.png', { maxH: 460 });
console.log('done');
