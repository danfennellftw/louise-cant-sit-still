# Louise Can't Sit Still

A cozy 3D browser game about one restless day in Orange County — a loving roast, made by Dan for Louise.
Louise (with Mochi and Leo in tow) power-walks through the condo, four gyms, errands, a coffee meetup,
a golden-hour e-bike ride and a sauna, all while her **Restless meter** threatens to make her… sit down.

**Live:** https://louise-cant-sit-still.vercel.app · static Vite build, no backend.

## Play locally

```bash
npm install
npm run dev          # http://localhost:5173  (add --host to test on a phone over LAN)
npm run build        # type-checks, then writes the static site to dist/
npm run preview      # serve dist/ locally
```

Vercel: framework preset **Vite**, build `npm run build`, output `dist`. `vercel.json` keeps a SPA fallback.

## Controls

| | Desktop | Phone (portrait-first) |
|---|---|---|
| Move | WASD / arrows (Shift to jog) | Drag on the left half (floating stick) |
| Walk to a spot | Click the floor | Tap the floor (tap a stop to walk there and start it) |
| Start a stop / advance dialog | E, Space or Enter | Tap the big button / the dialog |
| Mini-games | Space / arrows / number keys | Tap, hold, drag |
| Pause | Esc / P | Pause button |

## The loop

- **Restless meter** is the core tension. Standing still drains it fast (after a short grace period). Walking tops it up a little, but only to about 60%. Finishing stops and catching the dogs refill it.
- Warnings ramp up below 35%: a red vignette, a heartbeat, a shaking meter and a fidgeting Louise.
- **Condo dog chaos (from real life):**
  - **Mochi misses the pad.** Every morning there's a soggy pee pad, a puddle next to it and two little gifts on the floor. "Clean up Mochi's accidents" is a required condo stop with its own cleanup minigame: tap to bag the poop, rub the puddle clean, tap to swap the pad.
  - **Leo always goes for the piano leg and the bar stool leg.** He takes turns between them, first about 7 s after your first finished stop, then every 30–40 s.
    - You get a heads-up toast when he sets off. Reach him while he's sniffing and you save the leg (+1 heart).
    - Otherwise he lifts his leg, leaves a puddle, and a "Wipe the … leg (Leo)" bonus stop appears with a leg-wipe minigame.
    - Leave a puddle for 20 s and the meter drops by 10 with a roast from Dan or the narrator, up to three times per puddle.
- **Fail is a joke, not a wall.** She plops down, the camera shakes, the dogs stare, and a roast card appears. "Get up, Louise!" puts you back in the same spot with no progress lost.
- **Every stop is a mini-interaction.** Each set has 2–4 stops, and each one uses one of these:
  - pull (make the bed smoothly)
  - sort or place (organize cabinets, plate only brown food; Dan rejects the broccoli)
  - timing reps (gym sets, spin beats)
  - mash (sled push, treadmill sprint, scanning groceries)
  - hold, including a fidgety version that hops away (massage, sauna)
  - balance (creek bridge, stair climber)
  - dialogue choices (AI meetup, Dan, YouTube pick)
  - a tap-through phone call with Nina
- **Incoming calls.** The phone rings mid-day and you pick Answer, Speaker or Decline:
  - **Mom** calls in the condo morning (after your second stop). She speaks Tagalog with English subtitles, plus her signature "Are you there?", "Just calling. Just calling." and "Nothing nothing."
  - **Nina** calls once while you're out at a gym or errand stop.
  - Answer opens the call: +hearts, but a small meter hit for standing still.
  - Speaker plays captions at the top while you keep walking: +10 meter.
  - Decline: Mom calls straight back. Decline twice and her texts land with a Mom-guilt meter hit.
- **Mochi & Leo** follow and wander. They also:
  - steal socks and croissants (chase them down to get the item back)
  - sit in your path for pets
  - get the zoomies and bump into you (there's a warning first)
  - celebrate completed stops
  - ride in the e-bike basket
  - get herded to their beds in the finale
- **Day structure:** five acts — Morning condo → Fitness circuit (Grit Cycle Dana Point, Shredz Ladera Ranch, Crunch San Clemente, EOS Fitness Rancho Santa Margarita) → Errands (grocery, TJ Maxx, Marshall's, mall with Nike, skincare and massage) → Social (coffee plaza AI meetup + Nina call, e-bike trail RMV → San Juan Capistrano → Dana Point) → Wind-down (garage sauna between Louise's gray Model Y and Dan's blue Model 3, YouTube in bed with the dogs, dogs downstairs).
  - An act stinger plays between acts.
  - A day-map navigator lets you jump to any stop at any time (including later chapters and finished stops, which reset for a replay). The story order is only a suggestion: the next stops glow. The HUD map button travels too.
- **Detour the day (demo).** A gold **Detour · demo** pill sits in the HUD and works at any moment: mid-stop, mid-minigame, during dialogue, a ringing call or the fail card. The same panel is on the title screen and in the pause menu. It offers:
  - chapter jumps: Rise & Organize, Fitness, Errands, Social, Wind-Down, Night in bed
  - quick scenes: condo morning, Plan the day (desk), Mochi's accidents, Mom's call, Grit, TJ Maxx + Nina's call, coffee meetup, e-bike trail, garage sauna with the cars, YouTube in bed, and the dogs-downstairs finale
  - the full day map (every stop)

  Jumping cleanly abandons whatever was in progress: minigames, dialogue, call cards and fades are cleared before the new set loads. Walking into an exit with stops left opens the map instead of blocking you.
- **Onboarding:** from the title screen you're playing in under 15 seconds. A coach walks you through moving and the first stop, then explains the meter. If you stall, soft breadcrumbs point to the next stop. When the next stop is off-screen, an edge arrow points to it.
- Progress auto-saves to `localStorage` ("Continue the day" on the title screen).

## Tech & structure

Vite + TypeScript + Three.js. There is no framework; the DOM UI sits on top of a WebGL canvas.

```
src/
  engine/   renderer (ACES, soft shadows, room env map, bloom on High, adaptive quality),
            camera rig, input, synthesized audio, tweens, optional-GLB loader
  art/      materials & procedural textures, particles/light shafts/markers,
            props (home, gym, retail, outdoor), characters (sticker sprites + fallbacks)
  world/    set kit (rooms, walls, lights, baking), lighting kits, 14 sets under world/sets/
  game/     Game director, story/acts/save, dogs AI, collision
  ui/       HUD/dialog/cards, mini-games, day map
```

- **Look:** a dollhouse diorama in 3D. Each set gets its own lighting kit and practical lights, plus haze, dust motes, leaves or fireflies, swaying foliage (animated in the shader), curtains, fans, bike wheels and treadmill belts.
- **Draw calls:** static geometry is merged per material when a set loads, which keeps phones smooth.
- **Quality:** Auto / Low / Medium / High, in Settings. Auto starts at Medium on phones and High on desktop, and steps down if the frame rate drops.
- **Audio:** all original and synthesized in WebAudio (music loops, ambience beds, SFX). Mute is remembered between visits. The game vibrates on supported phones.
- **Brands:** location names only, in the game's own type. There are no logos.

## Characters & art assets

- **Cast (primary):** `public/sprites/{louise,dan,mochi,leo}.webp` are paper-cutout stickers cut from the character-sheet art. Each is a camera-facing billboard animated with bob, waddle, squash, paper-flip and pose treatments. Dialog portraits live in `public/portraits/`.
  - To update a character, replace the WebP with a transparent image. Keep the feet at the bottom edge; the height is set in code.
- **Background NPCs:** drawn at runtime as matching paper-doll stickers.
- **Procedural 3D rigs** (`art/characters/human.ts`, `dog.ts`) are placeholders only. They're used if a sprite fails to load.
- **Environment drop-in (optional):** put `public/environments/<setId>.glb` in place, where `setId` is one of `condo`, `grit`, `shredz`, `crunch`, `eos`, `grocery`, `tjmaxx`, `marshalls`, `mall`, `plaza`, `trail`, `garage`, `night`, `downstairs`.
  - The GLB hides that set's baked procedural art but keeps stops, NPCs, lights, particles and colliders.
  - Meshes named `collider*` become extra invisible colliders.
  - Export Y-up with +Z toward the camera, in meters, matching the set's footprint (see `bounds` in each set file).
  - Meshopt compression is supported.
  - Missing files fall back silently.
- **Character GLBs** are intentionally not wired up. See `docs/art-pipeline.md` for why and for what a likeness-accurate drop-in needs.

## Dev helpers

In devtools: `__game.debugEnter('trail')` jumps to a set, and `__game.debugStop('bed')` opens a stop in the current set.

Made with love — Dan → Louise.
