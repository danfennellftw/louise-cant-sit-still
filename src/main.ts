import './style.css';
import { Game } from './game/Game';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const game = new Game(canvas);
void game.boot();
