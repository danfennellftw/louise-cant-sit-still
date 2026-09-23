import { isTouchDevice } from './util';

/** Keyboard + floating touch joystick + tap/click-to-walk. */
export class Input {
  readonly keys = new Set<string>();
  private pressed = new Set<string>();
  readonly stick = { x: 0, y: 0 };
  onTap?: (x: number, y: number) => void;
  onInteract?: () => void;
  onPause?: () => void;
  enabled = true;
  readonly touch = isTouchDevice();
  private stickId: number | null = null;
  private origin = { x: 0, y: 0 };
  private downAt = new Map<number, { x: number; y: number; t: number }>();
  private base: HTMLElement;
  private knob: HTMLElement;

  constructor(surface: HTMLElement) {
    this.base = document.getElementById('joystick')!;
    this.knob = this.base.querySelector('.joystick-knob') as HTMLElement;
    if (this.touch) this.base.classList.add('visible');

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (e.repeat) return;
      if (k === 'e' || k === 'enter' || k === ' ') this.onInteract?.();
      if (k === 'escape' || k === 'p') this.onPause?.();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.releaseStick();
    });

    surface.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
  }

  private inStickZone(x: number, y: number) {
    return this.touch && x < window.innerWidth * 0.5 && y > window.innerHeight * 0.45;
  }

  private down(e: PointerEvent) {
    if (!this.enabled) return;
    this.downAt.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    if (this.stickId === null && this.inStickZone(e.clientX, e.clientY)) {
      this.stickId = e.pointerId;
      this.origin = { x: e.clientX, y: e.clientY };
      this.base.style.left = `${e.clientX}px`;
      this.base.style.top = `${e.clientY}px`;
      this.base.classList.add('active');
    }
  }

  private move(e: PointerEvent) {
    if (e.pointerId !== this.stickId) return;
    const max = 46;
    let dx = e.clientX - this.origin.x;
    let dy = e.clientY - this.origin.y;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.stick.x = dx / max;
    this.stick.y = dy / max;
  }

  private releaseStick() {
    this.stickId = null;
    this.stick.x = 0;
    this.stick.y = 0;
    this.knob.style.transform = 'translate(0px, 0px)';
    this.base.classList.remove('active');
    this.base.style.left = '';
    this.base.style.top = '';
  }

  private up(e: PointerEvent) {
    const d = this.downAt.get(e.pointerId);
    this.downAt.delete(e.pointerId);
    const wasStick = e.pointerId === this.stickId;
    if (wasStick) this.releaseStick();
    if (!d || !this.enabled) return;
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (moved < 14 && performance.now() - d.t < 350) this.onTap?.(e.clientX, e.clientY);
  }

  /** Movement intent in screen space (x right, y down), magnitude 0..1. */
  axis() {
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has('arrowleft') || k.has('a')) x -= 1;
    if (k.has('arrowright') || k.has('d')) x += 1;
    if (k.has('arrowup') || k.has('w')) y -= 1;
    if (k.has('arrowdown') || k.has('s')) y += 1;
    const kb = x !== 0 || y !== 0;
    if (kb) {
      const l = Math.hypot(x, y);
      x /= l;
      y /= l;
    } else {
      x = this.stick.x;
      y = this.stick.y;
    }
    const mag = Math.min(1, Math.hypot(x, y));
    return { x, y, mag, keyboard: kb, sprint: k.has('shift') };
  }

  justPressed(key: string) {
    return this.pressed.has(key);
  }

  endFrame() {
    this.pressed.clear();
  }

  get sticking() {
    return this.stickId !== null;
  }
}
