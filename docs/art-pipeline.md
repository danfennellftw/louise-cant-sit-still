# Art pipeline & asset status

## What ships today

| Asset | Source | Where |
|---|---|---|
| Louise, Dan, Mochi, Leo | Cutouts from the illustrated character sheets, with a sticker border | `public/sprites/*.webp` (about 30 KB each) |
| Dialog portraits | Face crops from the same sheets | `public/portraits/*.webp` |
| Background people | Canvas-drawn paper dolls, generated at runtime | `src/art/characters/sprite.ts` (`npcSticker`) |
| 14 environments | Procedural Three.js sets (props, textures, lighting kits, particles) | `src/world/sets/*.ts` |
| Music & SFX | Synthesized in WebAudio (original) | `src/engine/audio.ts` |

The real photo references are not committed; they were only used as likeness and palette cues.

### Photo-referenced set dressing (until real scene plates arrive)

- **Condo living room** (`condo.ts`, `condoDressing.ts`): bronze-framed glass wall looking onto a built 3D covered patio, not a painted backdrop. It has the grey sectional with blue pillows, white ceramic garden stool, teak table with flowers, a row of tall ornamental grasses, then the hedge and trees. Inside: cream boucle chair and ottoman, wood arc lamp with drum shade, mosaic side table with decanter, shaggy diamond rug, oak floor.
- **Desk office nook:** walnut desk, monitor showing a live AI chat, laptop, pinboard, task chair. It hosts the bonus "Plan the day" stop.
- **Bedroom:** beige walls, white duvet with a rust throw, wood dresser with pink flowers under the wall TV, brass floor lamp with white drum shade, blue-glow blackout shade.
- **Garage sauna** (`evening.ts`): light pine-box infrared sauna with dark IR panels that glow as it heats and a blue LED strip. Also a three-board snowboard wall rack (pink, white, black), an EV on the wall charger (green status ring, coiled cable, "CHARGING" readout), the fat-tire e-bike topping up, epoxy flake floor, and black wire shelving.
- **San Juan Creek Trail** (`outdoor.ts`): striped asphalt levee path, chain-link fence, rip-rap creek channel with a sandy bed and a trickle of water, sycamores and willows, a citrus grove near Rancho Mission Viejo, and the I-5 overpass with moving traffic. A coastal train crosses the rail trestle and blows its horn. Then the Los Rios cottages and mission bells in San Juan Capistrano, and the finish at Doheny with palms, lifeguard tower, sand and harbor boats.
- **E-bike:** fat-tire, Aima-style silhouette: downtube battery with charge LED, suspension fork, handlebar display, rear rack basket for the dogs. No badges.

## Blender pass v1 (evaluated, not shipped)

Dan provided a headless Blender 4.3 export pack.

- **Characters:** `louise`, `dan`, `mochi`, `leo`. Skinned, about 12k–60k triangles, with no animation clips.
- **Environments:** `condo_living`, `condo_kitchen`, `condo_bedroom`, `garage_sauna`, `gym_interior`, `trail_outdoor`, `retail_aisle`, `coffee_plaza`. Each is a single mesh of about 1.6k–14k triangles, untextured.

What happened to them:
- **Characters were rejected** for likeness. They don't read as Louise or Dan and look worse than the sheet art, so they are not in the repo.
- **Environments were tried** through the drop-in hook and dropped. The coffee plaza was noticeably sparser and flatter than the procedural set, and the footprints (6–12 m squares) don't match the gameplay layouts, so collisions and stops would need re-authoring.

## What a future art drop needs

### Characters (likeness-accurate)

The cheapest upgrade that keeps the current look is higher-resolution sticker art per pose. The code already switches behaviour per state, so extra frames can slot in:
- `idle`, `walk` (2–4 frames), `work`
- `ride` (seated on a bike)
- `lie` (for the bed)
- `sit` (the fail plop)
- `phone`, `cheer`
- for the dogs: `sit`, `lie`, `bark`

Transparent PNG or WebP, feet on the bottom edge, about 640 px tall.

A full 3D model can work too, but it needs:
- a likeness pass against the photo references
- animation clips named after the states above; the `Actor` class maps clip names by alias
- about 25k triangles or fewer per human, with textures of 1k or smaller
- a quick in-engine review before it replaces the stickers

### Environments

Author per set, sized to that set's `bounds`. For the condo that's about 22 × 9 m with three rooms side by side (bedroom | living | kitchen).
- Keep door and stop positions where they are, or tell us and we'll move them in the set file.
- Export Y-up, meters, +Z toward the camera.
- Drop the file in as `public/environments/<setId>.glb`.
- Add `collider*` boxes for any new solid furniture.

The upgrades most worth doing first:
1. Condo morning, the vertical slice: a real kitchen, soft goods, clutter, and baked AO.
2. Grit Cycle: bikes and a stage with a light rig.
3. Trail: terrain with the mission, the bridge and the harbor.
