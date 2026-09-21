# Louise Can't Sit Still

A cozy, shareable browser adventure for Louise — a loving roast about someone who cannot sit still, set across stylized Orange County.

Visit the condo with Dan (make the bed, organize, plate the sacred **only brown food**), hit three real gyms in three towns (**Shredz** · Ladera Ranch, **Crunch** · San Clemente, **Eow** · Rancho Santa Margarita), **Grit Cycle** in Dana Point (every day — showed up anyway), groceries, TJ Maxx, Marshall's, the mall, skincare, massage, Nike shoes, a coffee meetup to find her **AI people**, and a phone call with **Nina** — with **Mochi** and **Aleo** trotting along.

## Play locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Works on phone over your LAN if you use `--host`.

## Build for deploy

```bash
npm run build
```

Output goes to `dist/` — static files ready for any host.

### Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com) (framework preset: **Vite**).
3. Build command: `npm run build` · Output directory: `dist`
4. Deploy. Vercel will give you a URL like `https://louise-cant-sit-still.vercel.app`.

**Share link:** Send Louise (or anyone) that production URL — no login, no install. Add to home screen on iPhone/Android for a full-screen feel.

`vercel.json` includes a SPA fallback so deep links resolve to the game.

## Controls

| Platform | Move |
|----------|------|
| Desktop | WASD or arrow keys |
| Mobile | On-screen joystick (bottom left) or tap anywhere to walk there |

Keep the **restless meter** up by moving. Stand still too long and Louise sits — unprecedented fail state. Walk into glowing stops to complete errands and refill the meter.

## Tech

- Vite + TypeScript
- Canvas 2D (original simple art — no brand logos)
- No backend

Made with love for Dan → Louise.
