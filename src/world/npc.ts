import { Actor } from '../art/characters/actor';
import { npcLook, type HumanState } from '../art/characters/human';
import { npcSticker } from '../art/characters/sprite';
import type { SetCtx } from './kit';

/** Background extras: canvas-drawn paper-doll stickers that match the cutout heroes. */
export function spawnNpc(
  ctx: SetCtx,
  seed: number,
  x: number,
  z: number,
  face: number,
  state: HumanState,
  palette: { tops: string[]; bottoms: string[]; athletic?: boolean }
) {
  const look = npcLook(seed, palette.tops, palette.bottoms, palette.athletic);
  const sticker = npcSticker(seed, look.top, look.bottom, look.skin, look.hairColors[0], seed % 4);
  const a = new Actor(`npc${seed}`, { sprite: sticker, height: 1.6 * (look.scale ?? 1), look });
  a.root.position.set(x, 0, z);
  a.facing = face;
  a.setState(state);
  ctx.dyn.add(a.root);
  return a;
}
