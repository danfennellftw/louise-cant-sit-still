// Scripted full-day playtest. Drives real pointer events through the canvas
// and reads runtime state via the window.__game QA hook.
// Usage: node scripts/e2e-playtest.mjs [--headed]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.GAME_URL ?? 'http://localhost:4173/';
const SHOTS = 'e2e-shots';
mkdirSync(SHOTS, { recursive: true });

const headed = process.argv.includes('--headed');
const browser = await chromium.launch({ headless: !headed });
const page = await browser.newPage({ viewport: { width: 480, height: 860 } });

const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

await page.goto(URL);
await page.waitForFunction(() => window.__game !== undefined, null, { timeout: 15000 });

const g = (expr) => page.evaluate(`(() => { const e = window.__game; return ${expr}; })()`);

async function canvasRect() {
  return page.evaluate(() => {
    const r = document.getElementById('game').getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
}

async function toClient(x, y) {
  const r = await canvasRect();
  return [r.left + (x / 480) * r.width, r.top + (y / 800) * r.height];
}

async function click(x, y) {
  const [cx, cy] = await toClient(x, y);
  await page.mouse.click(cx, cy);
}

async function waitScene(name, timeout = 20000) {
  await page.waitForFunction(
    (n) => window.__game.sceneName === n && window.__game['fade'] < 0.3,
    name,
    { timeout },
  );
}

async function shot(name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

function log(msg) {
  console.log(`[e2e] ${msg}`);
}

async function travelThrough() {
  await waitScene('between');
  await page.waitForTimeout(400);
  // cuddle a dog once (near Louise's x minus offsets)
  const lx = await g(`e.scene.louiseX ? e.scene['louiseX']() : 200`);
  await click(lx - 110, 615);
  await page.waitForTimeout(200);
  await click(240, 698); // LET'S GO
}

// ---------------------------------------------------------------- title
await waitScene('title');
await shot('01-title');
// day map check
await click(240, 713);
await waitScene('daymap');
await shot('02-daymap');
await click(240, 744); // BACK
await waitScene('title');
log('title + day map ok');

await click(240, 648); // START THE DAY
await travelThrough();

// ---------------------------------------------------------------- morning
await waitScene('morning');
let guard = 0;
while ((await g(`e.scene['phase']`)) === 'feed' && guard++ < 60) {
  await click(140, 660);
  await click(340, 660);
}
log(`feed done (${guard} rounds)`);
await page.waitForFunction(() => window.__game['scene']['phase'] === 'bark', null, { timeout: 8000 });
await shot('03-bark');
guard = 0;
while ((await g(`e.scene['phase']`)) === 'bark' && guard++ < 120) {
  const leoX = await g(`e.scene['leoX']`);
  await click(leoX, 545);
  await page.waitForTimeout(60);
}
log(`bark calmed (${guard} taps)`);
if ((await g(`e.scene['phase']`)) !== 'carpet') throw new Error('stuck before carpet');

// carpet scrub: press and wiggle over the stain
{
  const [sx, sy] = await toClient(220, 570);
  const r = await canvasRect();
  const dx = (60 / 480) * r.width;
  guard = 0;
  while ((await g(`e.scene['phase']`)) === 'carpet' && guard++ < 40) {
    await page.mouse.move(sx - dx, sy);
    await page.mouse.down();
    for (let i = 0; i < 8; i++) {
      await page.mouse.move(sx + (i % 2 ? dx : -dx), sy, { steps: 4 });
    }
    await page.mouse.up();
  }
  log(`carpet clean (${guard} scrub passes)`);
}
if ((await g(`e.scene['phase']`)) !== 'stools') throw new Error('stuck before stools');
await shot('04-stools');

guard = 0;
while ((await g(`e.scene['phase']`)) === 'stools' && guard++ < 300) {
  const st = JSON.parse(
    await g(`JSON.stringify({idx: e.scene['stoolIdx'], pud: e.scene['puddles'], padT: e.scene['padT'], treatT: e.scene['treatT']})`),
  );
  if (st.treatT >= 0) {
    await click(415, 570); // TREAT!
  } else if (st.padT >= 0) {
    // lawful pee in progress; do not interrupt
  } else if (st.idx >= 0) {
    await click(120 + st.idx * 120 + 30, 580);
  } else if (st.pud.length > 0) {
    await click(st.pud[0].x, st.pud[0].y + 34);
  }
  await page.waitForTimeout(120);
}
log(`stools defended (${guard} loops, treats: ${await g(`e.state.stats.treatsGiven`)})`);
if ((await g(`e.scene['phase']`)) !== 'garbage') throw new Error('stuck before garbage');
await shot('04b-garbage');

// garbage run: step forward when the next lane is clear
guard = 0;
while ((await g(`e.scene['phase']`)) === 'garbage' && guard++ < 300) {
  const st = JSON.parse(
    await g(`JSON.stringify({row: e.scene['louRow'], tossed: e.scene['tossed'], lanes: e.scene['lanes']})`),
  );
  if (st.tossed < 0 && st.row < 5) {
    const next = st.row + 1;
    const lane = next >= 1 && next <= 4 ? st.lanes[next - 1] : [];
    const blocked = lane.some((c) => Math.abs(c.x - 240) < 130);
    if (!blocked) await click(240, 420);
  }
  await page.waitForTimeout(90);
}
log(`garbage run done (honks: ${await g(`e.state.stats.honks`)})`);
if ((await g(`e.scene['phase']`)) !== 'poop') throw new Error('stuck before poop');

guard = 0;
while ((await g(`e.scene['phase']`)) === 'poop' && guard++ < 40) {
  const poops = JSON.parse(await g(`JSON.stringify(e.scene['poops'])`));
  const open = poops.find((p) => !p.bagged);
  if (open) await click(open.x, open.y - 8);
  await page.waitForTimeout(80);
}
log('poop patrol done');
await travelThrough();

// ---------------------------------------------------------------- gym
await waitScene('gym');
const gymLabels = JSON.parse(await g(`JSON.stringify(e.scene['btns'].map(b => b.cfg.label))`));
if (!gymLabels.includes('EOS FITNESS')) throw new Error(`EOS missing: ${gymLabels}`);
log(`gym options: ${gymLabels.join(', ')}`);
await shot('05-gym');
await click(240, 344); // first gym
guard = 0;
while ((await g(`e.scene['phase']`)) === 'reps' && guard++ < 80) {
  const side = await g(`e.scene['side']`);
  await click(side === 'L' ? 130 : 350, 680);
  await page.waitForTimeout(40);
}
log(`reps done (${guard})`);
await page.waitForTimeout(400);
// "THAT'S ENOUGH" is the second button when hop offered
{
  const btns = JSON.parse(await g(`JSON.stringify(e.scene['btns'].map(b => ({x:b.cfg.x,y:b.cfg.y,w:b.cfg.w,h:b.cfg.h,label:b.cfg.label})))`));
  const enough = btns.find((b) => b.label.includes('ENOUGH') || b.label.includes('DYNASTY'));
  await click(enough.x + enough.w / 2, enough.y + enough.h / 2);
}
await travelThrough();

// ---------------------------------------------------------------- work
await waitScene('work');
await shot('06-work');
guard = 0;
let urgeTaken = false;
while ((await g(`e.scene['progress']`)) < 100 && guard++ < 300) {
  const urge = await g(`e.scene['urge'] !== null`);
  if (urge && !urgeTaken) {
    urgeTaken = true;
    await click(240, 620); // take one urge for the comedy path
  }
  const pings = JSON.parse(await g(`JSON.stringify(e.scene['pings'])`));
  const p = pings.find((q) => !q.dead && q.t > 0.2);
  if (p) await click(p.x, p.y);
  await page.waitForTimeout(100);
}
log(`work done (${guard} loops, urge taken: ${urgeTaken})`);
await travelThrough();

// ---------------------------------------------------------------- putter
await waitScene('putter');
await shot('07-putter-hub');

async function openCard(idx) {
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  await click(24 + col * 220 + 106, 148 + row * 88 + 39);
  await page.waitForTimeout(300);
}

// --- deal hunt (card 0)
await openCard(0);
guard = 0;
while ((await g(`e.scene['mini'] !== null`)) && guard++ < 30) {
  const items = JSON.parse(await g(`JSON.stringify(e.scene['mini']['items'])`));
  const deal = items.find((i) => i.deal);
  await click(deal.x, deal.y);
  await page.waitForTimeout(300);
}
log('deal hunt done');

// --- nina (card 6)
await openCard(6);
guard = 0;
while ((await g(`e.scene['mini'] !== null`)) && guard++ < 30) {
  const hasChoices = await g(`e.scene['mini']['line']().choices !== undefined`);
  if (hasChoices) await click(240, 595);
  else await click(240, 420);
  await page.waitForTimeout(350);
}
log('nina call done');

// --- skincare (card 8)
await openCard(8);
await shot('08-skincare');
guard = 0;
while ((await g(`e.scene['mini'] !== null`)) && guard++ < 40) {
  const mini = JSON.parse(await g(`JSON.stringify({phase: e.scene['mini']['phase'], step: e.scene['mini']['step'], bottles: e.scene['mini']['bottles']})`));
  let target;
  if (mini.phase === 'steps') target = mini.bottles.find((b) => b.step === mini.step && !b.done);
  else target = mini.bottles.find((b) => b.step === 0 && !b.done);
  if (target) await click(target.x, target.y);
  await page.waitForTimeout(200);
}
log('skincare done');

// --- make the bed (card 5)
await openCard(5);
guard = 0;
const cornerXY = (i) => [[110, 420], [370, 420], [110, 620], [370, 620]][i];
while ((await g(`e.scene['mini'] !== null`)) && guard++ < 60) {
  const st = await g(`e.scene['mini']['state']`);
  if (st === 'input') {
    const seq = JSON.parse(await g(`JSON.stringify(e.scene['mini']['seq'])`));
    const at = await g(`e.scene['mini']['inputIdx']`);
    const [cx, cy] = cornerXY(seq[at]);
    await click(cx, cy);
  }
  await page.waitForTimeout(250);
}
log('bed made');

// --- organize kitchen cabinets (card 9)
await openCard(9);
await shot('08b-kitchen-cabinets');
guard = 0;
while ((await g(`e.scene['mini'] !== null`)) && guard++ < 40) {
  const st = JSON.parse(
    await g(`JSON.stringify({sel: e.scene['mini']['selected'], items: e.scene['mini']['items']})`),
  );
  if (st.sel) {
    const [sx, sy] = [40 + st.sel.cat * 136 + 64, 265];
    await click(sx, sy);
  } else {
    const it = st.items.find((q) => !q.placed);
    if (it) await click(it.x, it.y);
  }
  await page.waitForTimeout(200);
}
log('kitchen cabinets organized');

// --- brown food (card 11)
await openCard(11);
await shot('09-brownfood');
guard = 0;
while ((await g(`e.scene['mini'] !== null`)) && guard++ < 400) {
  const m = await g(`e.scene['mini']['marker']`);
  const end = await g(`e.scene['mini']['endT']`);
  if (end < 0 && m > 0.44 && m < 0.58) await click(240, 652);
  await page.waitForTimeout(30);
}
log('brown food cooked');

// map pill check mid-game
await click(434, 28);
await waitScene('daymap');
const mapState = await g(`JSON.stringify({cur: e.state.currentChapter, done: e.state.chaptersDone})`);
log(`day map mid-game: ${mapState}`);
await shot('10-daymap-midgame');
await click(240, 744); // BACK
await waitScene('putter');

// grit cycle unlock
const unlocked = await g(`e.scene['goBtn'].enabled`);
if (!unlocked) throw new Error('grit cycle not unlocked after 5 cards incl dinner');
await click(240, 733);
await travelThrough();

// ---------------------------------------------------------------- spin
await waitScene('spin');
await shot('11-spin');
guard = 0;
while ((await g(`e.sceneName`)) === 'spin' && guard++ < 700) {
  const over = await g(`e.scene['overT']`);
  if (over < 0) {
    const wave = await g(`e.scene['waveWindow']`);
    if (wave >= 0) {
      await click(110, 640);
    } else {
      const notes = JSON.parse(await g(`JSON.stringify(e.scene['notes'])`));
      const n = notes.find((q) => !q.hit && !q.judged && Math.abs(q.y - 600) < 26);
      if (n) await click(410, 600);
    }
  }
  await page.waitForTimeout(70);
}
log(`spin done (waves: ${await g(`e.state.stats.waves`)}, score: ${await g(`e.state.stats.spinScore`)})`);
await travelThrough();

// ---------------------------------------------------------------- winddown
await waitScene('winddown');
await shot('12-winddown');
for (let i = 0; i < 3; i++) {
  await click(240, 190);
  await page.waitForTimeout(500);
}
// dog bedtime closer
await page.waitForFunction(() => window.__game['scene']['phase'] === 'dogduty', null, { timeout: 10000 });
await shot('12b-dogduty');
guard = 0;
const bedSpot = (which) => (which === 'mochi' ? [120, 690] : [360, 690]);
while ((await g(`e.scene['phase']`)) === 'dogduty' && guard++ < 60) {
  const st = JSON.parse(
    await g(`JSON.stringify({carrying: e.scene['carrying'] ? e.scene['carrying'].which : null, pups: e.scene['pups']})`),
  );
  if (st.carrying) {
    const [bx, by] = bedSpot(st.carrying);
    await click(bx, by);
  } else {
    const p = st.pups.find((q) => q.state === 'wandering');
    if (p) await click(p.x, p.y - 30);
  }
  await page.waitForTimeout(250);
}
log('dogs tucked in downstairs');
await waitScene('recap', 15000);
await page.waitForTimeout(800);
await shot('13-recap');
await click(240, 726); // DO IT ALL AGAIN
await waitScene('title');
await shot('14-title-again');
log('full loop complete, back at title');

if (errors.length) {
  console.log('CONSOLE/PAGE ERRORS:');
  for (const e of errors) console.log('  ' + e);
  process.exitCode = 1;
} else {
  log('no console errors');
}
await browser.close();
