type Shape = 'dot' | 'heart' | 'star' | 'ring' | 'puff';

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  grav: number;
  shape: Shape;
  rot: number;
  vr: number;
}

const CONFETTI = ['#ff5f6d', '#ffc371', '#7ed6df', '#f8a5c2', '#c9b1ff', '#fff3b0'];

export class Fx {
  private ps: P[] = [];

  clear(): void {
    this.ps.length = 0;
  }

  private push(p: Partial<P> & { x: number; y: number }): void {
    this.ps.push({
      vx: 0,
      vy: 0,
      life: 0,
      max: 0.8,
      size: 5,
      color: '#fff',
      grav: 0,
      shape: 'dot',
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 8,
      ...p,
    });
    if (this.ps.length > 400) this.ps.splice(0, this.ps.length - 400);
  }

  burst(x: number, y: number, color: string, n = 12, speed = 160): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      this.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        color,
        size: 3 + Math.random() * 4,
        max: 0.5 + Math.random() * 0.4,
        grav: 260,
      });
    }
  }

  confetti(x: number, y: number, n = 40): void {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const v = 220 + Math.random() * 260;
      this.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        color: CONFETTI[i % CONFETTI.length],
        size: 4 + Math.random() * 5,
        max: 1.2 + Math.random() * 0.9,
        grav: 420,
        shape: Math.random() < 0.5 ? 'dot' : 'star',
      });
    }
  }

  hearts(x: number, y: number, n = 7): void {
    for (let i = 0; i < n; i++) {
      this.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 50,
        vy: -70 - Math.random() * 70,
        color: i % 2 ? '#ff6b81' : '#f8a5c2',
        size: 7 + Math.random() * 6,
        max: 1 + Math.random() * 0.5,
        shape: 'heart',
      });
    }
  }

  puff(x: number, y: number, color = 'rgba(255,255,255,0.85)'): void {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      this.push({
        x,
        y,
        vx: Math.cos(a) * 60,
        vy: Math.sin(a) * 60 - 30,
        color,
        size: 8 + Math.random() * 8,
        max: 0.55,
        shape: 'puff',
      });
    }
  }

  sparkle(x: number, y: number, color = '#fff3b0'): void {
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      this.push({
        x,
        y,
        vx: Math.cos(a) * 90,
        vy: Math.sin(a) * 90,
        color,
        size: 4 + Math.random() * 3,
        max: 0.5,
        shape: 'star',
      });
    }
  }

  update(dt: number): void {
    for (const p of this.ps) {
      p.life += dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.ps = this.ps.filter((p) => p.life < p.max);
  }

  draw(g: CanvasRenderingContext2D): void {
    for (const p of this.ps) {
      const a = Math.max(0, 1 - p.life / p.max);
      g.globalAlpha = a;
      g.fillStyle = p.color;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      switch (p.shape) {
        case 'dot':
          g.beginPath();
          g.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          g.fill();
          break;
        case 'puff':
          g.beginPath();
          g.arc(0, 0, p.size * (0.5 + p.life / p.max), 0, Math.PI * 2);
          g.fill();
          break;
        case 'star': {
          g.beginPath();
          for (let i = 0; i < 4; i++) {
            const ang = (i * Math.PI) / 2;
            g.lineTo(Math.cos(ang) * p.size, Math.sin(ang) * p.size);
            g.lineTo(Math.cos(ang + Math.PI / 4) * p.size * 0.4, Math.sin(ang + Math.PI / 4) * p.size * 0.4);
          }
          g.closePath();
          g.fill();
          break;
        }
        case 'heart': {
          const s = p.size / 10;
          g.scale(s, s);
          g.beginPath();
          g.moveTo(0, 4);
          g.bezierCurveTo(-10, -4, -4, -11, 0, -5);
          g.bezierCurveTo(4, -11, 10, -4, 0, 4);
          g.fill();
          break;
        }
        case 'ring':
          g.strokeStyle = p.color;
          g.lineWidth = 2.5;
          g.beginPath();
          g.arc(0, 0, p.size * (0.4 + (p.life / p.max) * 1.4), 0, Math.PI * 2);
          g.stroke();
          break;
      }
      g.restore();
    }
    g.globalAlpha = 1;
  }
}
