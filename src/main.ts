import './style.css';
import { Game } from './game/Game';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const game = new Game(canvas);
void game.boot();
// Handy for playtesting from devtools: __game.debugEnter('trail'), __game.debugStop('bed')
(window as unknown as { __game: Game }).__game = game;
