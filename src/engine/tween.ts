import { easeInOutCubic } from './util';

interface Tween {
  t: number;
  delay: number;
  dur: number;
  fn: (k: number) => void;
  ease: (t: number) => void | number;
  resolve: () => void;
  group: string;
}

/** Minimal frame-driven tween runner; promises let scripted beats read top-to-bottom. */
export class Tweens {
  private list: Tween[] = [];

  to(
    dur: number,
    fn: (k: number) => void,
    ease: (t: number) => number = easeInOutCubic,
    delay = 0,
    group = 'default'
  ): Promise<void> {
    return new Promise((resolve) => {
      this.list.push({ t: 0, delay, dur: Math.max(dur, 0.0001), fn, ease, resolve, group });
    });
  }

  wait(sec: number, group = 'default'): Promise<void> {
    return this.to(sec, () => {}, (t) => t, 0, group);
  }

  update(dt: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      if (tw.delay > 0) {
        tw.delay -= dt;
        continue;
      }
      tw.t += dt;
      const k = Math.min(tw.t / tw.dur, 1);
      tw.fn(tw.ease(k) as number);
      if (k >= 1) {
        this.list.splice(i, 1);
        tw.resolve();
      }
    }
  }

  clear(group?: string) {
    this.list = group ? this.list.filter((t) => t.group !== group) : [];
  }
}

export const tweens = new Tweens();
