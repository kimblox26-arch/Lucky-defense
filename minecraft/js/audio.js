/* =========================================================================
 *  audio.js — WebAudio 절차적 효과음 + 잔잔한 배경 음악
 *  (샘플 파일 없이 노이즈/오실레이터로 합성)
 * ========================================================================= */
'use strict';

const AudioSys = {
  ctx: null,
  master: null,
  musicGain: null,
  sfxGain: null,
  noiseBuf: null,
  enabled: true,
  volume: 0.7,
  musicVolume: 0.35,
  musicTimer: 0,
  _musicPlaying: false,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1;
    this.sfxGain.connect(this.master);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.master);

    /* 화이트 노이즈 버퍼 */
    const len = this.ctx.sampleRate * 1.2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setVolume(v) {
    this.volume = clamp(v, 0, 1);
    if (this.master) this.master.gain.value = this.volume;
  },
  setMusicVolume(v) {
    this.musicVolume = clamp(v, 0, 1);
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
  },

  _noise(dur, filterType, freq, q, gain, dest) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    src.start();
    src.stop(c.currentTime + dur + 0.02);
    return { src, f, g };
  },

  _tone(freq, dur, type = 'sine', gain = 0.2, slideTo = null, dest = null) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(); o.stop(c.currentTime + dur + 0.02);
    return { o, g };
  },

  /** 재질별 채굴/걷기 소리 */
  dig(material, pitch = 1) {
    if (!this.enabled || !this.ctx) return;
    const cfg = {
      stone: { f: 1100, q: 1.2, d: 0.10, g: 0.22, t: 'bandpass' },
      metal: { f: 1800, q: 3.0, d: 0.10, g: 0.18, t: 'bandpass' },
      dirt: { f: 420, q: 0.8, d: 0.11, g: 0.24, t: 'lowpass' },
      grass: { f: 950, q: 0.6, d: 0.12, g: 0.20, t: 'bandpass' },
      sand: { f: 2400, q: 0.5, d: 0.13, g: 0.16, t: 'highpass' },
      gravel: { f: 700, q: 0.9, d: 0.12, g: 0.22, t: 'bandpass' },
      wood: { f: 620, q: 2.2, d: 0.11, g: 0.24, t: 'bandpass' },
      glass: { f: 4200, q: 2.0, d: 0.14, g: 0.18, t: 'highpass' },
      wool: { f: 300, q: 0.7, d: 0.13, g: 0.18, t: 'lowpass' },
      snow: { f: 1600, q: 0.7, d: 0.10, g: 0.16, t: 'highpass' },
      liquid: { f: 600, q: 1.0, d: 0.18, g: 0.14, t: 'lowpass' },
      none: { f: 800, q: 1, d: 0.08, g: 0.1, t: 'bandpass' },
    }[material] || { f: 800, q: 1, d: 0.1, g: 0.2, t: 'bandpass' };
    this._noise(cfg.d, cfg.t, cfg.f * pitch * (0.9 + Math.random() * 0.2), cfg.q, cfg.g);
  },

  step(material) { this.dig(material, 0.8); },

  place(material) {
    if (!this.enabled || !this.ctx) return;
    this.dig(material, 1.15);
    this._tone(180 + Math.random() * 40, 0.06, 'square', 0.05);
  },

  breakBlock(material) {
    if (!this.enabled || !this.ctx) return;
    this.dig(material, 0.75);
    this._noise(0.22, 'bandpass', 500 + Math.random() * 300, 0.8, 0.18);
  },

  pop() {
    if (!this.enabled || !this.ctx) return;
    this._tone(520 + Math.random() * 180, 0.08, 'triangle', 0.14, 900);
  },

  click() {
    if (!this.enabled || !this.ctx) return;
    this._tone(760, 0.05, 'square', 0.08, 520);
  },

  hurt() {
    if (!this.enabled || !this.ctx) return;
    this._tone(300, 0.22, 'sawtooth', 0.18, 110);
    this._noise(0.16, 'bandpass', 500, 1.0, 0.12);
  },

  mobHurt(kind) {
    if (!this.enabled || !this.ctx) return;
    const base = { zombie: 160, skeleton: 420, creeper: 300, spider: 700, pig: 500, cow: 220, sheep: 420, chicken: 900 }[kind] || 300;
    this._tone(base, 0.2, 'sawtooth', 0.14, base * 0.6);
  },

  mobAmbient(kind) {
    if (!this.enabled || !this.ctx) return;
    const cfg = {
      zombie: [120, 0.6, 'sawtooth', 0.09],
      skeleton: [900, 0.25, 'square', 0.05],
      creeper: [200, 0.4, 'triangle', 0.05],
      spider: [600, 0.25, 'sawtooth', 0.06],
      pig: [420, 0.3, 'sawtooth', 0.08],
      cow: [190, 0.7, 'sawtooth', 0.09],
      sheep: [520, 0.5, 'sawtooth', 0.07],
      chicken: [1100, 0.15, 'square', 0.05],
    }[kind];
    if (!cfg) return;
    this._tone(cfg[0], cfg[1], cfg[2], cfg[3], cfg[0] * 0.75);
  },

  fuse() {
    if (!this.enabled || !this.ctx) return;
    this._noise(0.25, 'highpass', 5000, 0.5, 0.14);
  },

  explode() {
    if (!this.enabled || !this.ctx) return;
    this._noise(0.9, 'lowpass', 380, 0.8, 0.55);
    this._tone(70, 0.7, 'sine', 0.4, 26);
  },

  bow() {
    if (!this.enabled || !this.ctx) return;
    this._noise(0.12, 'highpass', 2600, 0.7, 0.16);
    this._tone(900, 0.12, 'triangle', 0.08, 380);
  },

  splash() {
    if (!this.enabled || !this.ctx) return;
    this._noise(0.4, 'lowpass', 1400, 0.6, 0.24);
  },

  eat() {
    if (!this.enabled || !this.ctx) return;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this._noise(0.07, 'lowpass', 500, 1.0, 0.12), i * 90);
    }
  },

  levelUp() {
    if (!this.enabled || !this.ctx) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.2, 'triangle', 0.14), i * 70);
    });
  },

  /* ------------------------------------------------------- 배경 음악 */
  /** 느린 패드 코드 진행 — 마인크래프트 특유의 정적인 분위기 */
  startMusic() {
    if (!this.enabled || !this.ctx || this._musicPlaying) return;
    this._musicPlaying = true;
    this._scheduleMusic();
  },
  stopMusic() { this._musicPlaying = false; },

  _scheduleMusic() {
    if (!this._musicPlaying || !this.ctx) return;
    const chords = [
      [261.63, 329.63, 392.00],          // C
      [220.00, 261.63, 329.63],          // Am
      [174.61, 220.00, 261.63],          // F
      [196.00, 246.94, 293.66],          // G
      [261.63, 311.13, 392.00],          // Cm 느낌
    ];
    const ch = chords[Math.floor(Math.random() * chords.length)];
    const dur = 6 + Math.random() * 3;
    for (const f of ch) {
      const c = this.ctx;
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * (Math.random() < 0.3 ? 2 : 1);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.055, c.currentTime + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1200;
      o.connect(lp); lp.connect(g); g.connect(this.musicGain);
      o.start(); o.stop(c.currentTime + dur + 0.1);
    }
    /* 가벼운 멜로디 한 음 */
    if (Math.random() < 0.7) {
      const notes = [523.25, 587.33, 659.25, 783.99, 880.00];
      setTimeout(() => {
        if (!this._musicPlaying) return;
        this._tone(notes[Math.floor(Math.random() * notes.length)], 1.6, 'sine', 0.05, null, this.musicGain);
      }, 1200 + Math.random() * 2000);
    }
    this.musicTimer = setTimeout(() => this._scheduleMusic(), (dur + 4 + Math.random() * 8) * 1000);
  },
};
