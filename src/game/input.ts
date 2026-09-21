export interface MoveVector {
  x: number;
  y: number;
}

export class Input {
  keys = new Set<string>();
  move: MoveVector = { x: 0, y: 0 };
  tapTarget: { x: number; y: number } | null = null;

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    const joystick = document.getElementById('joystick');
    const stick = joystick?.querySelector('.joystick-stick') as HTMLElement | null;
    if (joystick && stick) {
      this.setupJoystick(joystick, stick);
    }

    const canvas = document.getElementById('game');
    if (canvas) {
      canvas.addEventListener(
        'pointerdown',
        (e) => {
          if ((e.target as HTMLElement).closest('#joystick')) return;
          const rect = canvas.getBoundingClientRect();
          const sx = (e.clientX - rect.left) / rect.width;
          const sy = (e.clientY - rect.top) / rect.height;
          this.tapTarget = { x: sx, y: sy };
        },
        { passive: true }
      );
    }

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch && joystick) {
      joystick.classList.remove('hidden');
    }
  }

  private setupJoystick(base: HTMLElement, stick: HTMLElement) {
    const maxDist = 36;
    let active = false;
    let originX = 0;
    let originY = 0;

    const reset = () => {
      active = false;
      stick.style.transform = 'translate(0px, 0px)';
      this.move.x = 0;
      this.move.y = 0;
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!active) return;
      let dx = clientX - originX;
      let dy = clientY - originY;
      const len = Math.hypot(dx, dy) || 1;
      if (len > maxDist) {
        dx = (dx / len) * maxDist;
        dy = (dy / len) * maxDist;
      }
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
      this.move.x = dx / maxDist;
      this.move.y = dy / maxDist;
    };

    base.addEventListener('pointerdown', (e) => {
      active = true;
      originX = e.clientX;
      originY = e.clientY;
      base.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    base.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY));
    base.addEventListener('pointerup', reset);
    base.addEventListener('pointercancel', reset);
  }

  updateFromKeyboard(): MoveVector {
    let x = this.move.x;
    let y = this.move.y;

    if (this.keys.has('arrowleft') || this.keys.has('a')) x -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) x += 1;
    if (this.keys.has('arrowup') || this.keys.has('w')) y -= 1;
    if (this.keys.has('arrowdown') || this.keys.has('s')) y += 1;

    if (this.keys.size > 0) {
      const len = Math.hypot(x, y) || 1;
      if (len > 1) {
        x /= len;
        y /= len;
      }
    }

    return { x, y };
  }

  consumeTapTarget(): { x: number; y: number } | null {
    const t = this.tapTarget;
    this.tapTarget = null;
    return t;
  }
}
