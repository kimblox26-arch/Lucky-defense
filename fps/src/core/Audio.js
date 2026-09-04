// 전부 WebAudio로 합성한다 — 외부 오디오 파일 0개.
// 총성/타격/신음/폭발은 노이즈+오실레이터 조합, 공간감은 PannerNode + 합성 IR 리버브.

import { settings } from './Settings.js';
import { clamp01, lerp, rng } from './Util.js';
import { SURFACE } from '../world/Collision.js';

const MAX_VOICES = 28;

export class AudioEngine {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.ready = false;
    this.voices = 0;
    this.muted = false;
    this._musicOn = false;
    this._intensity = 0;
    this._targetIntensity = 0;
    this._lastFootstep = 0;
  }

  /** 사용자 제스처 이후에 호출되어야 한다 */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC({ latencyHint: 'interactive' });
    } catch { return; }
    const ctx = this.ctx;

    // 마스터 체인: 리미터 역할의 컴프레서를 통과시켜 총성이 겹쳐도 찢어지지 않게
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -8;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.18;
    this.limiter.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.connect(this.limiter);

    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);

    this.music = ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.master);

    // 리버브 (합성 임펄스 응답)
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = this._makeImpulse(1.9, 2.6);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.34;
    this.reverbSend.connect(this.convolver);
    const revOut = ctx.createGain();
    revOut.gain.value = 0.85;
    this.convolver.connect(revOut);
    revOut.connect(this.master);

    this.noise = this._makeNoise(2.0);
    this.applyVolumes();
    this._buildMusic();
    this._buildAmbient();
    this.ready = true;
  }

  applyVolumes() {
    if (!this.ready && !this.ctx) return;
    const m = this.muted ? 0 : settings.masterVolume;
    this.master.gain.value = m;
    this.sfx.gain.value = settings.sfxVolume;
    this._musicGain = settings.musicVolume;
  }

  resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    this._musicOn = true;
  }

  setPaused(p) {
    if (!this.ctx) return;
    this._musicOn = !p;
    if (p) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    else this.master.gain.setTargetAtTime(this.muted ? 0 : settings.masterVolume, this.ctx.currentTime, 0.08);
  }

  // ───────────────────────── 버퍼 생성 ─────────────────────────

  _makeNoise(seconds) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** 지수 감쇠 노이즈로 만든 임펄스 응답 — 콘크리트 안뜰 느낌 */
  _makeImpulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // 초반 40ms는 초기 반사, 이후 지수 감쇠 꼬리
        const early = i < ctx.sampleRate * 0.04 ? 1.4 : 1;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * early;
      }
    }
    return buf;
  }

  // ───────────────────────── 저수준 보이스 ─────────────────────────

  _canPlay() {
    return this.ready && this.ctx && this.ctx.state === 'running' && this.voices < MAX_VOICES;
  }

  _track(node, duration) {
    this.voices++;
    setTimeout(() => { this.voices--; try { node.disconnect(); } catch { /* 이미 정리됨 */ } },
      Math.ceil(duration * 1000) + 60);
  }

  /** 3D 위치 노드 (없으면 스테레오 그대로) */
  _panner(x, y, z, refDist = 6, maxDist = 90) {
    const ctx = this.ctx;
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = refDist;
    p.maxDistance = maxDist;
    p.rolloffFactor = 1.15;
    if (p.positionX) {
      p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z;
    } else {
      p.setPosition(x, y, z);
    }
    return p;
  }

  /**
   * 필터를 거친 노이즈 버스트.
   * @param {object} o {dur, gain, type, freq, q, sweepTo, attack, dest, reverb}
   */
  _noiseBurst(o) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = o.rate ?? 1;
    const offset = Math.random() * 1.5;

    const filt = ctx.createBiquadFilter();
    filt.type = o.type ?? 'bandpass';
    filt.frequency.value = o.freq ?? 900;
    filt.Q.value = o.q ?? 1;
    if (o.sweepTo) {
      filt.frequency.setValueAtTime(o.freq, ctx.currentTime);
      filt.frequency.exponentialRampToValueAtTime(
        Math.max(40, o.sweepTo), ctx.currentTime + o.dur * 0.9);
    }

    const g = ctx.createGain();
    const t = ctx.currentTime;
    const atk = o.attack ?? 0.002;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);

    src.connect(filt); filt.connect(g);
    g.connect(o.dest ?? this.sfx);
    if (o.reverb !== false) g.connect(this.reverbSend);
    src.start(t, offset, o.dur + 0.05);
    src.stop(t + o.dur + 0.05);
    this._track(g, o.dur);
    return g;
  }

  /** 감쇠하는 오실레이터 (쿵/삐/그르렁) */
  _tone(o) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    const t = ctx.currentTime + (o.delay ?? 0);
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.freqTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqTo), t + o.dur);
    if (o.detune) osc.detune.value = o.detune;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), t + (o.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);

    osc.connect(g);
    g.connect(o.dest ?? this.sfx);
    if (o.reverb) g.connect(this.reverbSend);
    osc.start(t);
    osc.stop(t + o.dur + 0.02);
    this._track(g, o.dur + (o.delay ?? 0));
    return g;
  }

  // ───────────────────────── 총기 ─────────────────────────

  gunshot(def) {
    if (!this._canPlay()) return;
    const P = GUN[def.id] ?? GUN.rifle;
    // 1) 폭음 — 대역 통과 노이즈가 아래로 스윕
    this._noiseBurst({
      dur: P.dur, gain: P.gain, type: 'bandpass',
      freq: P.freq, sweepTo: P.freq * 0.22, q: P.q, rate: P.rate,
    });
    // 2) 고역 크랙
    this._noiseBurst({
      dur: P.dur * 0.35, gain: P.gain * 0.55, type: 'highpass',
      freq: 3200, q: 0.7, attack: 0.001, reverb: false,
    });
    // 3) 저역 쿵
    this._tone({
      type: 'sine', freq: P.sub, freqTo: P.sub * 0.4,
      dur: P.dur * 1.5, gain: P.gain * 0.85, attack: 0.003,
    });
    // 4) 꼬리 울림 (실내 반향)
    this._noiseBurst({
      dur: P.tail, gain: P.gain * 0.16, type: 'lowpass',
      freq: 1400, q: 0.5, attack: 0.02,
    });
    // 5) 볼트액션 (저격총) — 발사 후 노리쇠 재장전 소리
    if (P.bolt) {
      setTimeout(() => {
        if (!this._canPlay()) return;
        this._noiseBurst({ dur: 0.07, gain: 0.14, type: 'bandpass', freq: 1500, q: 3.5, reverb: false });
        this._tone({ type: 'square', freq: 230, freqTo: 120, dur: 0.06, gain: 0.06, reverb: false });
      }, 280);
    }
  }

  /** 보급/무기 획득 확인음 */
  pickup(kind) {
    if (!this._canPlay()) return;
    if (kind === 'weapon') {
      [523, 784, 1046].forEach((f, i) => this._tone({
        type: 'triangle', freq: f, dur: 0.16, gain: 0.1, attack: 0.005, delay: i * 0.07,
      }));
    } else if (kind === 'medkit') {
      this._tone({ type: 'sine', freq: 660, freqTo: 990, dur: 0.22, gain: 0.12, attack: 0.01 });
    } else if (kind === 'armor') {
      this._noiseBurst({ dur: 0.09, gain: 0.14, type: 'bandpass', freq: 2200, q: 3, reverb: false });
      this._tone({ type: 'triangle', freq: 440, freqTo: 660, dur: 0.16, gain: 0.09, delay: 0.05 });
    } else {
      // ammo
      this._noiseBurst({ dur: 0.06, gain: 0.12, type: 'bandpass', freq: 1400, q: 2.4, reverb: false });
      this._tone({ type: 'square', freq: 520, freqTo: 700, dur: 0.1, gain: 0.07, delay: 0.04 });
    }
  }

  /** 아군 사격음 — 3D 위치, 약간 억제된 톤 */
  allyShot(x, y, z) {
    if (!this._canPlay()) return;
    const p = this._panner(x, y, z, 6, 60);
    p.connect(this.sfx);
    this._noiseBurst({ dur: 0.12, gain: 0.28, type: 'bandpass', freq: 1250, sweepTo: 300, q: 0.9, dest: p });
    this._tone({ type: 'sine', freq: 100, freqTo: 44, dur: 0.14, gain: 0.14, dest: p });
  }

  dryFire() {
    if (!this._canPlay()) return;
    this._noiseBurst({ dur: 0.05, gain: 0.16, type: 'bandpass', freq: 2600, q: 3, reverb: false });
  }

  reload(def) {
    if (!this._canPlay()) return;
    const heavy = def.id === 'sniper' || def.id === 'shotgun';
    // 탄창 분리
    this._noiseBurst({ dur: 0.07, gain: 0.16, type: 'bandpass', freq: heavy ? 900 : 1500, q: 2.4, reverb: false });
    // 삽입
    const d = def.reloadTime * 0.55;
    setTimeout(() => {
      if (!this._canPlay()) return;
      this._noiseBurst({ dur: 0.09, gain: 0.2, type: 'bandpass', freq: heavy ? 700 : 1200, q: 2, reverb: false });
      this._tone({ type: 'square', freq: 160, freqTo: 70, dur: 0.07, gain: 0.07 });
    }, d * 1000);
    // 노리쇠
    setTimeout(() => {
      if (!this._canPlay()) return;
      this._noiseBurst({ dur: 0.06, gain: 0.18, type: 'highpass', freq: 2200, q: 1.2, reverb: false });
    }, def.reloadTime * 850);
  }

  weaponSwitch() {
    if (!this._canPlay()) return;
    this._noiseBurst({ dur: 0.06, gain: 0.13, type: 'bandpass', freq: 1800, q: 2, reverb: false });
  }

  /** 명중 확인음 — 헤드샷은 더 높은 음 */
  hitmarker(crit, kill) {
    if (!this._canPlay()) return;
    this._tone({
      type: 'triangle',
      freq: kill ? 1180 : crit ? 1560 : 980,
      freqTo: kill ? 660 : crit ? 1200 : 820,
      dur: kill ? 0.13 : 0.055, gain: kill ? 0.15 : 0.1, attack: 0.001,
    });
  }

  // ───────────────────────── 타격 / 폭발 ─────────────────────────

  impact(x, y, z, surface) {
    if (!this._canPlay()) return;
    const p = this._panner(x, y, z, 5, 70);
    p.connect(this.sfx);
    const metal = surface === SURFACE.METAL;
    this._noiseBurst({
      dur: metal ? 0.16 : 0.075,
      gain: 0.22,
      type: metal ? 'bandpass' : 'lowpass',
      freq: metal ? 2600 : 900,
      sweepTo: metal ? 900 : 260,
      q: metal ? 4 : 0.8,
      dest: p,
    });
    if (metal) {
      this._tone({ type: 'triangle', freq: rng.range(1400, 2600), freqTo: 700, dur: 0.2, gain: 0.06, dest: p });
    }
  }

  explosion(x, y, z) {
    if (!this.ready) return;
    const p = this._panner(x, y, z, 12, 120);
    p.connect(this.sfx);
    this._noiseBurst({ dur: 0.5, gain: 0.7, type: 'lowpass', freq: 1600, sweepTo: 160, q: 0.7, dest: p });
    this._tone({ type: 'sine', freq: 90, freqTo: 26, dur: 0.7, gain: 0.75, attack: 0.006, dest: p, reverb: true });
    this._noiseBurst({ dur: 1.5, gain: 0.13, type: 'lowpass', freq: 700, q: 0.4, attack: 0.05, dest: p });
  }

  acidHit(x, y, z) {
    if (!this._canPlay()) return;
    const p = this._panner(x, y, z, 6, 60);
    p.connect(this.sfx);
    this._noiseBurst({ dur: 0.42, gain: 0.3, type: 'highpass', freq: 2400, sweepTo: 5200, q: 0.8, attack: 0.01, dest: p });
  }

  // ───────────────────────── 감염체 ─────────────────────────

  zombieGrowl(x, y, z, kind) {
    if (!this._canPlay()) return;
    const p = this._panner(x, y, z, 7, 42);
    p.connect(this.sfx);
    const base = kind === 'brute' ? 52 : kind === 'runner' ? 128 : kind === 'spitter' ? 96 : 78;
    const dur = rng.range(0.5, 1.0);
    this._tone({
      type: 'sawtooth', freq: base * rng.range(0.9, 1.15), freqTo: base * 0.62,
      dur, gain: 0.11, attack: 0.09, dest: p, detune: rng.range(-25, 25),
    });
    this._noiseBurst({
      dur, gain: 0.07, type: 'bandpass', freq: base * 6, sweepTo: base * 3,
      q: 1.6, attack: 0.08, dest: p,
    });
  }

  zombieHurt(x, y, z) {
    if (!this._canPlay()) return;
    const p = this._panner(x, y, z, 5, 40);
    p.connect(this.sfx);
    this._noiseBurst({ dur: 0.13, gain: 0.24, type: 'lowpass', freq: 1100, sweepTo: 380, q: 1, dest: p });
    this._tone({ type: 'sawtooth', freq: rng.range(150, 240), freqTo: 80, dur: 0.16, gain: 0.09, dest: p });
  }

  zombieDie(x, y, z, kind) {
    if (!this._canPlay()) return;
    const p = this._panner(x, y, z, 6, 48);
    p.connect(this.sfx);
    const base = kind === 'brute' ? 46 : 92;
    this._tone({ type: 'sawtooth', freq: base, freqTo: base * 0.35, dur: 0.55, gain: 0.16, attack: 0.01, dest: p });
    this._noiseBurst({ dur: 0.4, gain: 0.22, type: 'lowpass', freq: 1600, sweepTo: 220, q: 0.8, dest: p });
  }

  zombieAttack(x, y, z) {
    if (!this._canPlay()) return;
    const p = this._panner(x, y, z, 4, 26);
    p.connect(this.sfx);
    this._noiseBurst({ dur: 0.14, gain: 0.3, type: 'bandpass', freq: 620, sweepTo: 220, q: 1.2, dest: p });
  }

  zombieSpit(x, y, z) {
    if (!this._canPlay()) return;
    const p = this._panner(x, y, z, 8, 60);
    p.connect(this.sfx);
    this._noiseBurst({ dur: 0.3, gain: 0.28, type: 'bandpass', freq: 800, sweepTo: 2600, q: 1.4, attack: 0.05, dest: p });
  }

  // ───────────────────────── 플레이어 ─────────────────────────

  playerHurt() {
    if (!this._canPlay()) return;
    this._noiseBurst({ dur: 0.22, gain: 0.34, type: 'lowpass', freq: 700, sweepTo: 180, q: 0.8, reverb: false });
    this._tone({ type: 'sine', freq: 140, freqTo: 62, dur: 0.3, gain: 0.24 });
  }

  playerDeath() {
    if (!this.ready) return;
    this._tone({ type: 'sine', freq: 180, freqTo: 34, dur: 2.2, gain: 0.4, attack: 0.02, reverb: true });
    this._noiseBurst({ dur: 1.6, gain: 0.24, type: 'lowpass', freq: 900, sweepTo: 90, q: 0.6, attack: 0.03 });
    if (this.ctx) this.music.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
  }

  footstep(surface, intensity) {
    if (!this._canPlay()) return;
    const now = this.ctx.currentTime;
    if (now - this._lastFootstep < 0.11) return;
    this._lastFootstep = now;
    const metal = surface === SURFACE.METAL;
    const running = intensity > 0.72;
    const crouch = intensity < 0.34;
    const fmul = running ? 1.12 : crouch ? 0.82 : 1;
    this._noiseBurst({
      dur: metal ? 0.11 : 0.07,
      gain: (crouch ? 0.03 : 0.052) + intensity * 0.06,
      type: metal ? 'bandpass' : 'lowpass',
      freq: (metal ? 1900 : 460) * fmul,
      sweepTo: (metal ? 700 : 150) * fmul,
      q: metal ? 2.5 : 0.9,
      reverb: false,
    });
    // 달릴 때는 뒤꿈치 긁힘 한 겹 더
    if (running) {
      this._noiseBurst({ dur: 0.05, gain: 0.04, type: 'highpass', freq: 3200, q: 0.8, attack: 0.001, reverb: false });
    }
    // 저역 발 딛는 무게감
    this._tone({ type: 'sine', freq: 78 * fmul, freqTo: 42, dur: 0.08, gain: (0.04 + intensity * 0.05), reverb: false });
  }

  land(impact, surface) {
    if (!this._canPlay()) return;
    this._noiseBurst({
      dur: 0.16, gain: 0.1 + impact * 0.2, type: 'lowpass',
      freq: surface === SURFACE.METAL ? 1400 : 520, sweepTo: 120, q: 0.8,
    });
    this._tone({ type: 'sine', freq: 90, freqTo: 45, dur: 0.18, gain: 0.1 + impact * 0.14 });
  }

  // ───────────────────────── UI / 웨이브 ─────────────────────────

  uiClick() {
    if (!this._canPlay()) return;
    this._tone({ type: 'square', freq: 620, freqTo: 480, dur: 0.05, gain: 0.06, reverb: false });
  }

  uiSelect() {
    if (!this._canPlay()) return;
    this._tone({ type: 'triangle', freq: 520, dur: 0.09, gain: 0.09, reverb: false });
    this._tone({ type: 'triangle', freq: 780, dur: 0.12, gain: 0.07, delay: 0.055, reverb: false });
  }

  waveStart(boss) {
    if (!this.ready) return;
    // 경보 사이렌 — 보스는 더 낮고 길게
    const base = boss ? 260 : 420;
    for (let i = 0; i < (boss ? 3 : 2); i++) {
      this._tone({
        type: 'sawtooth', freq: base, freqTo: base * 1.55,
        dur: 0.55, gain: 0.1, attack: 0.12, delay: i * 0.62, reverb: true,
      });
    }
    if (boss) {
      this._tone({ type: 'sine', freq: 48, freqTo: 30, dur: 2.2, gain: 0.3, attack: 0.3, reverb: true });
    }
  }

  waveClear() {
    if (!this.ready) return;
    const notes = [392, 523, 659];
    notes.forEach((f, i) => this._tone({
      type: 'triangle', freq: f, dur: 0.42, gain: 0.11, attack: 0.01, delay: i * 0.11, reverb: true,
    }));
  }

  // ───────────────────────── 적응형 음악 ─────────────────────────

  _buildMusic() {
    const ctx = this.ctx;

    // 저음 드론 — 디튠된 톱니 두 개를 로우패스로
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 220;
    this.droneFilter.Q.value = 2;
    this.droneFilter.connect(this.music);

    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.5;
    this.droneGain.connect(this.droneFilter);

    this.drones = [];
    for (const [f, d] of [[55, -7], [55, 9], [82.4, 4]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = d;
      const g = ctx.createGain();
      g.gain.value = f > 60 ? 0.12 : 0.2;
      o.connect(g); g.connect(this.droneGain);
      o.start();
      this.drones.push({ osc: o, gain: g });
    }

    // 심장박동 — 긴장도에 따라 빨라진다
    this.heartTimer = 0;
    this.heartRate = 1.5;
  }

  /** 낮 야외 앰비언트: 바람 베드 + 가끔 새소리 */
  _buildAmbient() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 420; filt.Q.value = 0.5;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0;
    src.connect(filt); filt.connect(this.ambientGain); this.ambientGain.connect(this.master);
    src.start();
    this.birdTimer = rng.range(4, 9);
  }

  /** 지저귀는 새 — 짧은 주파수 워블 두세 번 */
  _bird() {
    if (!this._canPlay()) return;
    const base = rng.range(2600, 4200);
    const n = 2 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) {
      this._tone({
        type: 'sine', freq: base * rng.range(0.85, 1.15), freqTo: base * rng.range(1.1, 1.4),
        dur: 0.07, gain: 0.03, attack: 0.006, delay: i * 0.1, reverb: true,
      });
    }
  }

  _heartbeat() {
    if (!this._canPlay()) return;
    const g = settings.musicVolume * 0.5;
    this._tone({ type: 'sine', freq: 62, freqTo: 34, dur: 0.16, gain: 0.24 * g, dest: this.music, attack: 0.008 });
    this._tone({ type: 'sine', freq: 56, freqTo: 30, dur: 0.14, gain: 0.16 * g, dest: this.music, attack: 0.008, delay: 0.19 });
  }

  /** 매 프레임: 리스너 위치와 음악 강도 갱신 */
  update(dt, camera, intensity) {
    if (!this.ready || this.ctx.state !== 'running') return;
    const l = this.ctx.listener;
    const p = camera.position;

    _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    if (l.positionX) {
      const t = this.ctx.currentTime;
      l.positionX.setTargetAtTime(p.x, t, 0.02);
      l.positionY.setTargetAtTime(p.y, t, 0.02);
      l.positionZ.setTargetAtTime(p.z, t, 0.02);
      l.forwardX.setTargetAtTime(_fwd.x, t, 0.02);
      l.forwardY.setTargetAtTime(_fwd.y, t, 0.02);
      l.forwardZ.setTargetAtTime(_fwd.z, t, 0.02);
      l.upX.setTargetAtTime(_up.x, t, 0.02);
      l.upY.setTargetAtTime(_up.y, t, 0.02);
      l.upZ.setTargetAtTime(_up.z, t, 0.02);
    } else {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(_fwd.x, _fwd.y, _fwd.z, _up.x, _up.y, _up.z);
    }

    // 강도: 웨이브 진행 + 근접한 적의 수
    this._targetIntensity = clamp01(intensity);
    this._intensity = lerp(this._intensity, this._targetIntensity, 1 - Math.exp(-1.2 * dt));
    const i = this._intensity;

    const musicVol = this._musicOn ? settings.musicVolume * (0.28 + i * 0.5) : 0;
    this.music.gain.setTargetAtTime(musicVol, this.ctx.currentTime, 0.35);
    this.droneFilter.frequency.setTargetAtTime(180 + i * 520, this.ctx.currentTime, 0.4);
    this.droneFilter.Q.setTargetAtTime(2 + i * 5, this.ctx.currentTime, 0.4);

    if (this._musicOn && i > 0.12) {
      this.heartRate = lerp(1.35, 0.42, clamp01((i - 0.12) / 0.88));
      this.heartTimer -= dt;
      if (this.heartTimer <= 0) {
        this.heartTimer = this.heartRate;
        this._heartbeat();
      }
    }

    // 낮 앰비언트: 위협이 낮을수록 바람/새가 살아나고 교전 시 잦아든다
    if (this.ambientGain) {
      const amb = this._musicOn ? Math.max(0, (0.032 - i * 0.024) * settings.sfxVolume) : 0;
      this.ambientGain.gain.setTargetAtTime(amb, this.ctx.currentTime, 0.6);
      if (this._musicOn && i < 0.4) {
        this.birdTimer -= dt;
        if (this.birdTimer <= 0) { this.birdTimer = rng.range(5, 12); this._bird(); }
      }
    }
  }

  setMuted(m) {
    this.muted = m;
    this.applyVolumes();
  }
}

// 무기별 총성 파라미터
const GUN = {
  pistol: { dur: 0.14, tail: 0.5, gain: 0.5, freq: 1500, q: 0.9, sub: 130, rate: 1.0 },
  smg: { dur: 0.10, tail: 0.35, gain: 0.38, freq: 1900, q: 1.1, sub: 150, rate: 1.15 },
  shotgun: { dur: 0.26, tail: 0.85, gain: 0.78, freq: 900, q: 0.6, sub: 78, rate: 0.85 },
  rifle: { dur: 0.17, tail: 0.6, gain: 0.62, freq: 1300, q: 0.8, sub: 110, rate: 0.95 },
  sniper: { dur: 0.34, tail: 1.25, gain: 0.9, freq: 780, q: 0.55, sub: 60, rate: 0.8, bolt: true },
};

const _fwd = { x: 0, y: 0, z: -1, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; },
  applyQuaternion(q) { return applyQuat(this, q); } };
const _up = { x: 0, y: 1, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; },
  applyQuaternion(q) { return applyQuat(this, q); } };

function applyQuat(v, q) {
  const { x, y, z } = v;
  const ix = q.w * x + q.y * z - q.z * y;
  const iy = q.w * y + q.z * x - q.x * z;
  const iz = q.w * z + q.x * y - q.y * x;
  const iw = -q.x * x - q.y * y - q.z * z;
  v.x = ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y;
  v.y = iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z;
  v.z = iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x;
  return v;
}
