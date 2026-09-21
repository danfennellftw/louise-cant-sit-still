# Louise Can't Sit Still

One chaotic Orange County day, playable in about five minutes. A loving roast
gift game for Louise — starring Louise, Mochi, Leo, and Dan (brown food only).

Live: https://louise-cant-sit-still.vercel.app

## The day

morning dog chaos → gym hop → the Sitting Olympics (work) → the Puttering
Hours → Grit Cycle, Dana Point. Spin is last. Every day. She always finishes.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build (must pass)
```

## Art pipeline

Character sprites in `public/characters/` are generated from real photos
(stylized, not photoreal) and committed to the repo. To regenerate from the
source sheets in `art-src/`:

```bash
node scripts/process-art.mjs
```

See `DESIGN.md` for the locked day loop, tone rules, and art rules.
