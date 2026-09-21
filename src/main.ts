import './style.css';
import { Engine } from './game/engine';
import { loadSprites } from './game/sprites';
import { TitleScene } from './game/scenes/title';
import { BetweenScene } from './game/scenes/between';
import { MorningScene } from './game/scenes/morning';
import { GymScene } from './game/scenes/gym';
import { WorkScene } from './game/scenes/work';
import { PutterScene } from './game/scenes/putter';
import { EbikeScene } from './game/scenes/ebike';
import { SpinScene } from './game/scenes/spin';
import { WindDownScene } from './game/scenes/winddown';
import { RecapScene } from './game/scenes/recap';
import { DayMapScene } from './game/scenes/daymap';

async function boot(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const loading = document.getElementById('loading');
  try {
    await loadSprites();
  } catch (err) {
    if (loading) loading.textContent = 'The dogs ate the art. Refresh to try again.';
    throw err;
  }
  loading?.remove();

  const engine = new Engine(canvas);
  engine.add('title', new TitleScene(engine));
  engine.add('between', new BetweenScene(engine));
  engine.add('morning', new MorningScene(engine));
  engine.add('gym', new GymScene(engine));
  engine.add('work', new WorkScene(engine));
  engine.add('putter', new PutterScene(engine));
  engine.add('ebike', new EbikeScene(engine));
  engine.add('spin', new SpinScene(engine));
  engine.add('winddown', new WindDownScene(engine));
  engine.add('recap', new RecapScene(engine));
  engine.add('daymap', new DayMapScene(engine));
  engine.goNow('title');
  // debug/QA hook (used by scripts/e2e-playtest.mjs)
  (window as unknown as { __game?: Engine }).__game = engine;
}

void boot();
