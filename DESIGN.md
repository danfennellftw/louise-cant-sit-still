# Louise Can't Sit Still — Design Notes

A loving roast in game form, made by Dan for Louise. One chaotic Orange County
day, playable in ~5 minutes on a phone with one restless thumb.

## The locked day loop (canonical order — do not reorder)

1. **Morning at the condo** — five beats of dog chaos:
   feed Mochi and Leo evenly, calm Leo's bark fit (he found a leaf), scrub
   Mochi's carpet accident, defend the barstools from Leo's leg-lifts, then
   Poop Patrol downstairs.
2. **Gym** — pick Shredz (Ladera Ranch), Crunch (San Clemente), or
   EOS Fitness (Rancho Santa Margarita); alternating-tap reps; gym hopping
   is offered and encouraged.
3. **Work** — the Sitting Olympics at her desk (photo-accurate set: posters,
   mic arm, pink-city monitor, L mug, blue LED glow). Clear pings; resist —
   or gloriously take — sudden urges to go do literally anything else.
4. **The Puttering Hours** — hub of afternoon micro-games (15–40s each);
   finish 5 including the mandatory **Brown Food Dinner** for Dan:
   TJ Maxx / Marshall's deal hunts, Nike Shoe Dash (Leo steals a shoe —
   his one scripted crime per day), vampire facial (step 6 of her 5-step
   skincare routine; hold still; she won't), massage (whack-a-knot),
   make the bed (dogs sabotage round two), Nina call, awkward AI-friend
   attempt, Jazz (her jazz era — rhythm-ring vinyl; venue TBD per Dan).
5. **Grit Cycle, Dana Point — always the last outing.** Rhythm spin finale;
   she waves at classmates, they never wave back, she finishes anyway.
   She always finishes.
6. **Wind-down YouTube** — couch closer with Dan and the pups; the sit-still
   meter clocks out; she finally sits still (asleep, but it counts).

Then a recap screen with the day's receipts.

A **Day Map** (timeline chapter select) is reachable from the title screen
and the MAP pill in the HUD; it shows current/completed beats and allows
jumping to any chapter — chaos is non-linear.

## Tone rules

- Loving roast, never cruel. Louise is the hero; the joke is that stillness
  is physically impossible for her, not that she fails at anything.
- Every fail state is soft and funny. The game cannot be lost.
- Leo is **Leo** (never "Aleo"). Mochi is Mochi. Dan wants only brown food.
- Place names are plain text — no brand logos or trademarks drawn.

## Core mechanic

The **Sit-Still Meter** (top-left HUD) drains whenever she's idle. Emptying
it is never a fail: the screen shakes, a roast line toasts, and it partially
refills ("she did a lap"). Activity and dog cuddles refill it. Cuddling
Mochi/Leo on travel screens is the intended healing loop.

## Art rules

- Characters are **committed PNG sprites** in `public/characters/`, generated
  from Dan's real photos (Higgsfield), background-removed and trimmed by
  `scripts/process-art.mjs` (source sheets in `art-src/`).
  - `louise.png` / `louise-face.png` — maroon top, cream pants, long ponytail
    with caramel highlights.
  - `dan.png` / `dan-face.png` — glasses, short dark hair, black polo.
  - `mochi.png` — fluffy white/tan Biewer-ish pup.
  - `leo.png` — classic Yorkie: tan face and legs, dark steel back.
- Sprites are animated puppet-style only (bob, tilt, squash, flip via
  `src/game/sprites.ts`) — never stretched into new poses, never redrawn as
  stick figures. If a pose can't be puppeted, stage around it with props
  (e.g. the spin bike is drawn over her lower half).
- Backgrounds, props, and FX are hand-drawn canvas vectors (`src/game/art.ts`)
  in a warm sunset palette. Every stop has its own distinct set; no shared
  empty map. New scenes must ship with a new background.
- Juice is mandatory: scene fade transitions, particle bursts, confetti,
  toast one-liners, screen shake for comedy beats.

## Tech

- Vite + strict TypeScript, single canvas at 480×800 logical resolution,
  letterboxed, pointer-events only (mobile-first). No runtime dependencies.
- `npm run build` = `tsc --noEmit && vite build` and must stay green.
- `vercel.json` keeps the SPA rewrite. No external AI APIs at runtime.
- Scenes implement the `Scene` interface in `src/game/engine.ts` and register
  in `src/main.ts`; travel between chapters goes through the `between` scene
  (set `state.nextStop` first).
