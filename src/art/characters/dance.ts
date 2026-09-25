/**
 * Shared clock for Louise's goofy kick so the sticker, the bone rig,
 * and the tap windows land on the same beat.
 * Phrase: jerky jabs, then a held high side kick with a little gyration, looping.
 */
export const KICK_SHOW_SEC = 4.8;

export function kickEnvelope(danceT: number) {
  if (danceT < 1.55) {
    if (danceT < 0.16) return 0;
    if (danceT < 0.28) return (danceT - 0.16) / 0.12;
    if (danceT < 1.32) return 1;
    return Math.max(0, 1 - (danceT - 1.32) / 0.2);
  }
  const u = ((danceT - 1.55) % 1.15) / 1.15;
  if (u < 0.28) return 0;
  if (u < 0.4) return (u - 0.28) / 0.12;
  if (u < 0.72) return 1;
  return Math.max(0, 1 - (u - 0.72) / 0.18);
}

/** +1 kicks to her left, -1 to her right. The opening phrase is always left. */
export function kickSide(danceT: number): 1 | -1 {
  if (danceT < 1.55) return 1;
  return Math.floor((danceT - 1.55) / 1.15) % 2 === 0 ? -1 : 1;
}
