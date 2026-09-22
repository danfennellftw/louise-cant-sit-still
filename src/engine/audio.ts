import type { AmbienceId, MusicId, SurfaceId } from '../world/types';

const MUTE_KEY = 'lcss.muted';

/** Everything is synthesized — original tones only, no samples or licensed music. */
export class Audio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private music!: GainNode;
  private amb!: GainNode;
  private noiseBuf!: AudioBuffer;
  muted = localStorage.getItem(MUTE_KEY) === '1';
  private musicId: MusicId | null = null;
  private ambId: AmbienceId | null = null;
  private ambNodes: AudioNode[] = [];
  private seqTimer = 0;
  private nextNote = 0;
  private seqStep = 0;
  private ambTimer = 0;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.connect(this.ctx.destination);
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(comp);
    this.sfx = this.bus(0.8);
    this.music = this.bus(0.32);
    this.amb = this.bus(0.35);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.musicId) {
      const m = this.musicId;
      this.musicId = null;
      this.playMusic(m);
    }
    if (this.ambId) {
      const a = this.ambId;
      this.ambId = null;
      this.setAmbience(a);
    }
  }

  private bus(v: number) {
    const g = this.ctx!.createGain();
    g.gain.value = v;
    g.connect(this.master);
    return g;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  private get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, at = 0, bus?: GainNode, glide?: number) {
    if (!this.ctx) return;
    const t = this.now + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus ?? this.sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, freq: number, q = 1, vol = 0.2, at = 0, type: BiquadFilterType = 'bandpass', bus?: GainNode) {
    if (!this.ctx) return;
    const t = this.now + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus ?? this.sfx);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  /* ---------- SFX ---------- */
  step(surface: SurfaceId) {
    const map: Record<SurfaceId, [number, number, number]> = {
      wood: [900, 2.5, 0.12],
      tile: [2400, 3, 0.08],
      rubber: [500, 1.5, 0.1],
      grass: [3200, 0.7, 0.05],
      stone: [1800, 2, 0.08],
      concrete: [1400, 1.6, 0.09],
      carpet: [600, 1, 0.05],
    };
    const [f, q, v] = map[surface];
    this.noise(0.07, f * (0.9 + Math.random() * 0.2), q, v);
  }
  click() {
    this.tone(880, 0.06, 'triangle', 0.12);
  }
  pop() {
    this.tone(520, 0.12, 'sine', 0.2, 0, undefined, 1100);
  }
  whoosh() {
    this.noise(0.45, 900, 0.6, 0.18, 0, 'bandpass');
    this.noise(0.45, 2400, 0.8, 0.08, 0.05, 'bandpass');
  }
  chime() {
    [0, 4, 7, 12].forEach((s, i) => this.tone(523.25 * Math.pow(2, s / 12), 0.5, 'triangle', 0.16, i * 0.07));
    this.tone(1046.5 * 1.5, 0.8, 'sine', 0.06, 0.3);
  }
  heart(i = 0) {
    this.tone(660 * Math.pow(2, (i % 5) / 12), 0.12, 'sine', 0.14);
  }
  good() {
    this.tone(784, 0.1, 'triangle', 0.18);
    this.tone(1175, 0.14, 'sine', 0.1, 0.05);
  }
  miss() {
    this.tone(220, 0.18, 'sawtooth', 0.07, 0, undefined, 160);
  }
  tick() {
    this.tone(1400 + Math.random() * 300, 0.04, 'square', 0.04);
  }
  beep() {
    this.tone(1760, 0.08, 'square', 0.06);
  }
  bonk() {
    this.tone(180, 0.2, 'sine', 0.3, 0, undefined, 90);
    this.noise(0.1, 600, 1, 0.12);
  }
  bark(dog: 'mochi' | 'leo') {
    const base = dog === 'leo' ? 720 : 560;
    for (let i = 0; i < 2; i++) {
      this.tone(base, 0.09, 'sawtooth', 0.12, i * 0.16, undefined, base * 0.6);
      this.noise(0.08, base * 2.2, 3, 0.1, i * 0.16);
    }
  }
  heartbeat() {
    this.tone(62, 0.16, 'sine', 0.35, 0, undefined, 45);
    this.tone(58, 0.14, 'sine', 0.25, 0.18, undefined, 42);
  }
  flop() {
    [0, -3, -6, -11].forEach((s, i) => this.tone(330 * Math.pow(2, s / 12), 0.28, 'triangle', 0.15, i * 0.18));
    this.noise(0.3, 300, 0.8, 0.2, 0.75, 'lowpass');
  }
  stinger() {
    [0, 7, 12, 16, 19].forEach((s, i) => this.tone(392 * Math.pow(2, s / 12), 0.9, 'triangle', 0.1, i * 0.06));
    this.noise(0.8, 5000, 0.5, 0.05, 0.1, 'highpass');
  }
  horn() {
    for (const f of [311, 370, 466]) this.tone(f, 1.4, 'sawtooth', 0.035, 0, undefined, f * 0.985);
    for (const f of [311, 370, 466]) this.tone(f, 0.9, 'sawtooth', 0.03, 1.6, undefined, f * 0.985);
  }
  hiss() {
    this.noise(1.2, 4000, 0.4, 0.12, 0, 'highpass');
  }
  ring() {
    for (let i = 0; i < 3; i++) {
      this.tone(880, 0.12, 'sine', 0.12, i * 0.3);
      this.tone(1100, 0.12, 'sine', 0.1, i * 0.3 + 0.12);
    }
  }

  /* ---------- Music: tiny step sequencer with original progressions ---------- */
  playMusic(id: MusicId) {
    if (this.musicId === id) return;
    this.musicId = id;
    if (!this.ctx) return;
    this.seqStep = 0;
    this.nextNote = this.now + 0.1;
    window.clearInterval(this.seqTimer);
    this.seqTimer = window.setInterval(() => this.schedule(), 60);
  }

  private schedule() {
    if (!this.ctx || !this.musicId) return;
    const cfg = SONGS[this.musicId];
    const spb = 60 / cfg.bpm / 2;
    while (this.nextNote < this.now + 0.25) {
      const at = this.nextNote - this.now;
      const bar = Math.floor(this.seqStep / 16) % cfg.chords.length;
      const chord = cfg.chords[bar];
      const s = this.seqStep % 16;
      const root = 220 * Math.pow(2, chord[0] / 12);
      if (s === 0 || s === 8) chord.forEach((n) => this.tone(220 * Math.pow(2, n / 12), spb * 7, cfg.pad, 0.035, at, this.music));
      if (cfg.bass && s % 4 === 0) this.tone(root / 2, spb * 1.6, 'triangle', 0.09, at, this.music);
      if (cfg.kick && s % 4 === 0) this.tone(120, 0.18, 'sine', 0.22, at, this.music, 45);
      if (cfg.hat && s % 2 === 1) this.noise(0.04, 8000, 1, 0.03, at, 'highpass', this.music);
      if (cfg.pluck) {
        const pat = cfg.pluck[s];
        if (pat !== undefined && pat >= 0) {
          const n = chord[pat % chord.length] + 12 * (pat >= chord.length ? 1 : 0) + 12;
          this.tone(220 * Math.pow(2, n / 12), spb * 1.8, 'triangle', 0.045, at, this.music);
        }
      }
      this.seqStep++;
      this.nextNote += spb;
    }
  }

  /* ---------- Ambience beds ---------- */
  setAmbience(id: AmbienceId) {
    if (this.ambId === id) return;
    this.ambId = id;
    if (!this.ctx) return;
    this.ambNodes.forEach((n) => {
      try {
        (n as AudioBufferSourceNode).stop?.();
      } catch {
        /* already stopped */
      }
      n.disconnect();
    });
    this.ambNodes = [];
    window.clearInterval(this.ambTimer);
    const bed = (freq: number, type: BiquadFilterType, vol: number) => {
      const src = this.ctx!.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = this.ctx!.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = this.ctx!.createGain();
      g.gain.value = vol;
      src.connect(f);
      f.connect(g);
      g.connect(this.amb);
      src.start();
      this.ambNodes.push(src, f, g);
    };
    const spice = (fn: () => void, ms: number) => {
      this.ambTimer = window.setInterval(() => {
        if (Math.random() < 0.5) fn();
      }, ms);
    };
    switch (id) {
      case 'home':
        bed(300, 'lowpass', 0.05);
        spice(() => this.tone(2600 + Math.random() * 900, 0.08, 'sine', 0.02, 0, this.amb, 3400), 1800);
        break;
      case 'homeNight':
      case 'night':
        bed(250, 'lowpass', 0.04);
        spice(() => {
          for (let i = 0; i < 4; i++) this.tone(4200, 0.03, 'sine', 0.018, i * 0.06, this.amb);
        }, 700);
        break;
      case 'gym':
      case 'spin':
        bed(500, 'bandpass', 0.07);
        spice(() => this.noise(0.12, 300, 2, 0.05, 0, 'bandpass', this.amb), 1500);
        break;
      case 'retail':
      case 'mall':
        bed(700, 'bandpass', 0.06);
        spice(() => this.beep(), 4000);
        break;
      case 'outdoor':
      case 'trail':
        bed(900, 'lowpass', 0.06);
        spice(() => {
          const f = 2400 + Math.random() * 1600;
          this.tone(f, 0.1, 'sine', 0.03, 0, this.amb, f * 1.3);
          this.tone(f * 1.1, 0.08, 'sine', 0.025, 0.14, this.amb, f * 0.9);
        }, 1200);
        break;
      case 'garage':
        bed(180, 'lowpass', 0.08);
        spice(() => this.noise(0.05, 3000, 2, 0.03, 0, 'bandpass', this.amb), 900);
        break;
    }
  }
}

interface Song {
  bpm: number;
  chords: number[][];
  pad: OscillatorType;
  bass?: boolean;
  kick?: boolean;
  hat?: boolean;
  pluck?: number[];
}

// Chord tones are semitones above A3; progressions are generic diatonic loops.
const SONGS: Record<MusicId, Song> = {
  title: { bpm: 84, chords: [[3, 7, 10, 14], [0, 3, 7, 10], [-4, 0, 3, 7], [-2, 2, 5, 9]], pad: 'sine', pluck: [0, -1, 2, -1, 1, -1, 3, -1, 2, -1, 1, -1, 4, -1, 2, -1] },
  cozy: { bpm: 92, chords: [[3, 7, 10, 14], [-2, 2, 5, 9], [0, 3, 7, 10], [-4, 0, 3, 7]], pad: 'sine', bass: true, pluck: [0, -1, -1, 2, -1, -1, 1, -1, 3, -1, -1, 2, -1, 1, -1, -1] },
  gym: { bpm: 124, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], pad: 'triangle', bass: true, kick: true, hat: true },
  spin: { bpm: 132, chords: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]], pad: 'sawtooth', bass: true, kick: true, hat: true, pluck: [0, -1, 1, -1, 2, -1, 1, -1, 0, -1, 1, -1, 3, -1, 2, -1] },
  retail: { bpm: 104, chords: [[5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17], [0, 4, 7, 11]], pad: 'sine', bass: true, hat: true, pluck: [0, -1, 2, 1, -1, 3, -1, 2, 0, -1, 2, 1, -1, 3, 2, -1] },
  golden: { bpm: 88, chords: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]], pad: 'sine', bass: true, pluck: [0, 1, 2, 3, 2, 1, 0, -1, 1, 2, 3, 4, 3, 2, -1, -1] },
  night: { bpm: 70, chords: [[0, 3, 7, 10], [-4, 0, 3, 7], [-7, -3, 0, 3], [-5, -1, 2, 5]], pad: 'sine', pluck: [4, -1, -1, 2, -1, -1, 3, -1, -1, 1, -1, -1, 2, -1, -1, -1] },
};

export function haptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
