/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  util.js
 *  수학 / 난수 / 색상 / 파티클 / 화면효과 / 사운드 합성 / 저장 유틸
 * ========================================================================= */
'use strict';

/* ---------------------------------------------------------------- 수학 */
const U = {
  TAU: Math.PI * 2,

  clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },
  lerp(a, b, t) { return a + (b - a) * t; },
  inv(a, b, v) { return b === a ? 0 : (v - a) / (b - a); },
  dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); },
  dist2(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
  ang(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },
  norm(a) { while (a > Math.PI) a -= U.TAU; while (a < -Math.PI) a += U.TAU; return a; },
  approachAngle(cur, tgt, step) {
    const d = U.norm(tgt - cur);
    if (Math.abs(d) <= step) return tgt;
    return cur + Math.sign(d) * step;
  },
  rand(a = 1, b) { return b === undefined ? Math.random() * a : a + Math.random() * (b - a); },
  irand(a, b) { return Math.floor(U.rand(a, b + 1)); },
  pick(arr) { return arr[(Math.random() * arr.length) | 0]; },
  chance(p) { return Math.random() < p; },
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  },
  /** 가중치 뽑기 : [{w:3,...},{w:1,...}] */
  weighted(list, key = 'w') {
    let total = 0;
    for (const it of list) total += (it[key] || 0);
    let r = Math.random() * total;
    for (const it of list) { r -= (it[key] || 0); if (r <= 0) return it; }
    return list[list.length - 1];
  },
  /** 키:가중치 맵에서 뽑기 */
  weightedMap(map) {
    let total = 0;
    for (const k in map) total += map[k];
    let r = Math.random() * total;
    for (const k in map) { r -= map[k]; if (r <= 0) return k; }
    return Object.keys(map)[0];
  },

  /* 이징 */
  easeOut(t) { return 1 - (1 - t) * (1 - t); },
  easeIn(t) { return t * t; },
  easeInOut(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
  easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  easeOutElastic(t) {
    const c4 = U.TAU / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * c4) + 1;
  },
  easeOutBounce(t) {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + .75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + .9375;
    return n1 * (t -= 2.625 / d1) * t + .984375;
  },

  /* 숫자 포맷 : 1.2K / 3.4M / 5.6B ... */
  fmt(n) {
    n = Math.floor(n);
    if (n < 1000) return '' + n;
    const units = ['', 'K', 'M', 'B', 'T', 'aa', 'ab', 'ac', 'ad', 'ae'];
    let i = 0;
    while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
    return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + units[i];
  },
  fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  },
  pct(v) { return Math.round(v * 100) + '%'; },

  /* 색상 */
  hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },
  rgba(hex, a) { const c = U.hexToRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; },
  mixHex(a, b, t) {
    const A = U.hexToRgb(a), B = U.hexToRgb(b);
    const r = Math.round(U.lerp(A[0], B[0], t)), g = Math.round(U.lerp(A[1], B[1], t)), bl = Math.round(U.lerp(A[2], B[2], t));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  },
  shade(hex, amt) {
    const c = U.hexToRgb(hex);
    const f = (v) => U.clamp(Math.round(v + 255 * amt), 0, 255);
    return `rgb(${f(c[0])},${f(c[1])},${f(c[2])})`;
  },
  hsl(h, s, l, a = 1) { return `hsla(${h},${s}%,${l}%,${a})`; },

  /**
   * 채도/명도를 끌어올려 캔디톤으로 만든다.
   * 회색에 가까운 색(채도 0)은 건드리지 않아 흑백 캐릭터가 이상하게 물들지 않는다.
   */
  vivid(hex, satBoost = .34, lightBoost = .06) {
    const [r0, g0, b0] = U.hexToRgb(hex);
    const r = r0 / 255, g = g0 / 255, b = b0 / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    const d = mx - mn;
    if (d < .04) return hex;                       /* 무채색은 그대로 */
    let s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h;
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (mx === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    s = U.clamp(s + (1 - s) * satBoost, 0, 1);
    const nl = U.clamp(l + (1 - l) * lightBoost, 0, 1);
    const q = nl < .5 ? nl * (1 + s) : nl + s - nl * s;
    const p = 2 * nl - q;
    const f = (tc) => {
      if (tc < 0) tc += 1; if (tc > 1) tc -= 1;
      if (tc < 1 / 6) return p + (q - p) * 6 * tc;
      if (tc < 1 / 2) return q;
      if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6;
      return p;
    };
    const to = (v) => Math.round(U.clamp(v, 0, 1) * 255);
    const R = to(f(h + 1 / 3)), G = to(f(h)), B = to(f(h - 1 / 3));
    return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
  },

  /* 배열 */
  remove(arr, item) { const i = arr.indexOf(item); if (i >= 0) arr.splice(i, 1); return arr; },
  sum(arr, f) { let s = 0; for (const a of arr) s += f ? f(a) : a; return s; },
  countBy(arr, f) {
    const m = {};
    for (const a of arr) { const k = f(a); m[k] = (m[k] || 0) + 1; }
    return m;
  },

  /* 로마숫자 (성급 표기) */
  roman(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || ('' + n); },

  now() { return performance.now(); },
};

/* ================================================================== 파티클 */
class Particle {
  constructor() { this.dead = true; }
  init(o) {
    this.x = o.x; this.y = o.y;
    this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.ax = o.ax || 0; this.ay = o.ay || 0;
    this.life = this.maxLife = o.life || .6;
    this.size = o.size || 4; this.size2 = o.size2 !== undefined ? o.size2 : 0;
    this.color = o.color || '#fff';
    this.color2 = o.color2 || null;
    this.shape = o.shape || 'circle';   // circle | spark | ring | square | star | smoke | shard | glow | text
    this.rot = o.rot || 0; this.vrot = o.vrot || 0;
    this.drag = o.drag !== undefined ? o.drag : 1;
    this.glow = o.glow !== undefined ? o.glow : true;
    this.text = o.text || '';
    this.gravity = o.gravity || 0;
    this.dead = false;
    return this;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.vx += this.ax * dt; this.vy += (this.ay + this.gravity) * dt;
    if (this.drag !== 1) { const d = Math.pow(this.drag, dt * 60); this.vx *= d; this.vy *= d; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.rot += this.vrot * dt;
  }
  draw(ctx) {
    const t = this.life / this.maxLife;
    const a = U.clamp(t * 1.15, 0, 1);
    const s = U.lerp(this.size2, this.size, t);
    const col = this.color2 ? U.mixHex(this.color2, this.color, t) : this.color;
    ctx.globalAlpha = a;
    if (this.glow) { ctx.shadowColor = col; ctx.shadowBlur = 12; }
    ctx.fillStyle = col; ctx.strokeStyle = col;
    switch (this.shape) {
      case 'circle':
        ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(.4, s), 0, U.TAU); ctx.fill(); break;
      case 'glow': {
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, Math.max(1, s));
        g.addColorStop(0, col); g.addColorStop(1, U.rgba('#000000', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(1, s), 0, U.TAU); ctx.fill(); break;
      }
      case 'spark': {
        const len = s * 3.2;
        const ang = Math.atan2(this.vy, this.vx);
        ctx.lineWidth = Math.max(.7, s * .55); ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x - Math.cos(ang) * len, this.y - Math.sin(ang) * len);
        ctx.lineTo(this.x, this.y); ctx.stroke(); break;
      }
      case 'ring':
        ctx.lineWidth = Math.max(.8, s * .22);
        ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(1, this.size * (1 - t) * 2 + this.size2), 0, U.TAU); ctx.stroke(); break;
      case 'square':
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore(); break;
      case 'shard':
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * .5, 0); ctx.lineTo(0, s); ctx.lineTo(-s * .5, 0);
        ctx.closePath(); ctx.fill(); ctx.restore(); break;
      case 'star':
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? s * .42 : s;
          const an = (i / 10) * U.TAU - Math.PI / 2;
          i ? ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r) : ctx.moveTo(Math.cos(an) * r, Math.sin(an) * r);
        }
        ctx.closePath(); ctx.fill(); ctx.restore(); break;
      case 'smoke':
        ctx.globalAlpha = a * .38;
        ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(1, s * (2 - t)), 0, U.TAU); ctx.fill(); break;
      case 'text': {
        /* 운빨겜 스타일 : 갓 튀어나올 때 팝! 하고 통통 튀며 커진다 */
        const age = 1 - t;
        const pop = age < .2 ? U.easeOutBack(Math.min(1, age / .2)) : 1;
        const fs = Math.max(8, s * Math.max(.05, pop));
        ctx.font = `900 ${fs}px system-ui,sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3.4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
        ctx.strokeText(this.text, this.x, this.y); ctx.fillText(this.text, this.x, this.y); break;
      }
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
}

/* ---------------------------------------------- 화면효과 매니저 (FX) */
const FX = {
  pool: [], active: [], max: 1400,
  shakeAmt: 0, shakeDecay: 6, shakeX: 0, shakeY: 0,
  flashAlpha: 0, flashColor: '#fff',
  vignette: 0, vignetteColor: '#f33',
  hitStop: 0,
  chromatic: 0,
  zoomPulse: 0,
  ripples: [],
  texts: [],

  _get() {
    if (this.pool.length) return this.pool.pop();
    return new Particle();
  },
  /** 품질 단계에 따른 파티클 총량 배수 (Perf 가 조절) */
  budget: 1,
  shakeScale: 1,
  spawn(o) {
    if (this.active.length >= this.max) return null;
    /* 품질을 낮추면 일부 입자를 확률적으로 건너뛴다 — 연출 형태는 유지하면서
       개수만 줄어들어 렉이 확 준다 */
    if (this.budget < 1 && Math.random() > this.budget) return null;
    const p = this._get().init(o);
    this.active.push(p);
    return p;
  },

  /* --- 프리셋 --- */
  burst(x, y, color, n = 12, opt = {}) {
    const spd = opt.speed || 160, life = opt.life || .5, size = opt.size || 4;
    for (let i = 0; i < n; i++) {
      const a = U.rand(U.TAU), s = U.rand(spd * .3, spd);
      this.spawn({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: U.rand(life * .6, life), size: U.rand(size * .6, size),
        color, color2: opt.color2, drag: opt.drag || .9,
        shape: opt.shape || 'circle', gravity: opt.gravity || 0,
      });
    }
  },
  sparks(x, y, color, n = 8, spd = 260) {
    for (let i = 0; i < n; i++) {
      const a = U.rand(U.TAU), s = U.rand(spd * .4, spd);
      this.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: U.rand(.18, .4), size: U.rand(2, 4.2), color, shape: 'spark', drag: .86 });
    }
  },
  ring(x, y, color, size = 40, life = .35) {
    this.spawn({ x, y, life, size, size2: 4, color, shape: 'ring', glow: true });
  },
  explosion(x, y, radius, color, color2 = '#ffe08a') {
    this.ring(x, y, color, radius, .38);
    this.burst(x, y, color, 22, { speed: radius * 5, life: .55, size: radius * .16, color2, drag: .87 });
    this.sparks(x, y, color2, 12, radius * 7);
    for (let i = 0; i < 7; i++) {
      const a = U.rand(U.TAU), d = U.rand(radius * .2, radius * .8);
      this.spawn({
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: U.rand(-20, 20), vy: U.rand(-38, -12),
        life: U.rand(.5, .9), size: radius * .3, size2: radius * .12, color: '#3a3a44', shape: 'smoke', glow: false
      });
    }
    this.shake(Math.min(14, radius * .12));
  },
  trail(x, y, color, size = 3, life = .25) {
    this.spawn({ x, y, vx: U.rand(-14, 14), vy: U.rand(-14, 14), life, size, size2: 0, color, drag: .9 });
  },
  popText(x, y, text, color, size = 15, opt = {}) {
    this.spawn({
      x, y, vx: opt.vx !== undefined ? opt.vx : U.rand(-24, 24), vy: opt.vy !== undefined ? opt.vy : U.rand(-72, -46),
      ay: 90, life: opt.life || .85, size, size2: size * .8, color, shape: 'text', text, glow: opt.glow !== false, drag: .94
    });
  },
  shake(a) { this.shakeAmt = Math.min(30, this.shakeAmt + a * this.shakeScale); },
  flash(color = '#fff', a = .5) { this.flashColor = color; this.flashAlpha = Math.max(this.flashAlpha, a); },
  stop(t) { this.hitStop = Math.max(this.hitStop, t); },
  pulse(a = .04) { this.zoomPulse = Math.max(this.zoomPulse, a); },

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.update(dt);
      if (p.dead) { this.active.splice(i, 1); if (this.pool.length < 900) this.pool.push(p); }
    }
    if (this.shakeAmt > 0) {
      this.shakeAmt = Math.max(0, this.shakeAmt - this.shakeDecay * dt * 10);
      this.shakeX = U.rand(-this.shakeAmt, this.shakeAmt);
      this.shakeY = U.rand(-this.shakeAmt, this.shakeAmt);
    } else { this.shakeX = this.shakeY = 0; }
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.6);
    if (this.zoomPulse > 0) this.zoomPulse = Math.max(0, this.zoomPulse - dt * .35);
    if (this.chromatic > 0) this.chromatic = Math.max(0, this.chromatic - dt * 4);
  },
  draw(ctx) { for (const p of this.active) p.draw(ctx); },
  clear() {
    for (const p of this.active) { p.dead = true; if (this.pool.length < 900) this.pool.push(p); }
    this.active.length = 0;
    this.shakeAmt = 0; this.flashAlpha = 0;
  }
};

/* ================================================================== 사운드 */
const SFX = {
  ctx: null, master: null, musicGain: null, sfxGain: null,
  enabled: true, musicOn: true, volume: .55, musicVolume: .3,
  _lastPlay: {}, _musicTimer: 0, _step: 0, _scale: [0, 3, 5, 7, 10, 12, 15],
  _root: 55,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 1; this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicVolume; this.musicGain.connect(this.master);
    } catch (e) { this.enabled = false; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; },
  setMusicVolume(v) { this.musicVolume = v; if (this.musicGain) this.musicGain.gain.value = this.musicOn ? v : 0; },

  _env(node, t0, a, d, peak = 1) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t0 + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  },
  tone(freq, dur, type = 'square', vol = .25, slide = 0, dest = null) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    this._env(g, t0, Math.min(.02, dur * .25), dur, vol);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t0); o.stop(t0 + dur + .05);
  },
  noise(dur, vol = .2, filterFreq = 1200, type = 'lowpass') {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
    const g = this.ctx.createGain(); this._env(g, t0, .01, dur, vol);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  },
  /** 짧은 시간 내 같은 소리 폭주 방지 */
  throttle(key, ms) {
    const n = U.now();
    if (this._lastPlay[key] && n - this._lastPlay[key] < ms) return false;
    this._lastPlay[key] = n; return true;
  },

  play(name) {
    if (!this.enabled || !this.ctx) return;
    switch (name) {
      case 'shoot': if (!this.throttle('shoot', 32)) return; this.tone(U.rand(600, 760), .07, 'square', .09, -260); break;
      case 'arrow': if (!this.throttle('arrow', 32)) return; this.noise(.07, .07, 2600, 'highpass'); break;
      case 'magic': if (!this.throttle('magic', 40)) return; this.tone(U.rand(420, 520), .14, 'sine', .12, 340); break;
      case 'cannon': if (!this.throttle('cannon', 70)) return; this.tone(90, .2, 'sawtooth', .22, -55); this.noise(.22, .18, 700); break;
      case 'laser': if (!this.throttle('laser', 60)) return; this.tone(1400, .16, 'sawtooth', .1, -1100); break;
      case 'hit': if (!this.throttle('hit', 26)) return; this.noise(.05, .07, 3200, 'highpass'); break;
      case 'crit': this.tone(1200, .09, 'square', .17, 700); this.noise(.09, .12, 4200, 'highpass'); break;
      case 'explode': this.tone(70, .34, 'sawtooth', .26, -42); this.noise(.4, .26, 520); break;
      case 'die': if (!this.throttle('die', 30)) return; this.tone(U.rand(200, 260), .13, 'triangle', .12, -140); this.noise(.1, .07, 900); break;
      case 'coin': if (!this.throttle('coin', 45)) return; this.tone(1180, .06, 'square', .1, 0); setTimeout(() => this.tone(1560, .09, 'square', .09), 45); break;
      case 'summon': this.tone(330, .1, 'triangle', .16, 240); setTimeout(() => this.tone(660, .16, 'triangle', .14, 300), 90); break;
      case 'merge': [440, 660, 880, 1320].forEach((f, i) => setTimeout(() => this.tone(f, .13, 'triangle', .16), i * 70)); break;
      case 'legendary': [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, .3, 'sine', .2), i * 95)); break;
      case 'mythic': [392, 523, 659, 784, 1046, 1568].forEach((f, i) => setTimeout(() => { this.tone(f, .45, 'sine', .22); this.tone(f * 1.5, .3, 'triangle', .1); }, i * 110)); break;
      case 'upgrade': this.tone(600, .1, 'square', .14, 420); setTimeout(() => this.tone(900, .16, 'square', .13, 200), 70); break;
      case 'error': this.tone(180, .13, 'sawtooth', .13, -50); break;
      case 'click': this.tone(760, .04, 'square', .07); break;
      case 'wave': [330, 440, 554].forEach((f, i) => setTimeout(() => this.tone(f, .22, 'triangle', .16), i * 110)); break;
      case 'boss': [110, 98, 87].forEach((f, i) => setTimeout(() => { this.tone(f, .7, 'sawtooth', .24); this.noise(.55, .16, 320); }, i * 230)); break;
      case 'leak': this.tone(200, .3, 'sawtooth', .22, -110); this.noise(.3, .16, 600); break;
      case 'lose': [440, 392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, .45, 'triangle', .22), i * 190)); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, .4, 'square', .18), i * 130)); break;
      case 'skill': this.tone(240, .3, 'sawtooth', .2, 900); this.noise(.3, .12, 2400, 'highpass'); break;
      case 'freeze': this.tone(1600, .4, 'sine', .12, -900); this.noise(.35, .08, 5200, 'highpass'); break;
      case 'thunder': this.noise(.42, .3, 5200, 'highpass'); this.tone(60, .4, 'sawtooth', .2, -20); break;
      case 'heal': [660, 880].forEach((f, i) => setTimeout(() => this.tone(f, .2, 'sine', .12), i * 90)); break;
      case 'combo': this.tone(700 + Math.min(1200, (this._combo || 0) * 40), .07, 'square', .1, 220); break;
      case 'unlock': [392, 523, 784].forEach((f, i) => setTimeout(() => this.tone(f, .3, 'sine', .18), i * 120)); break;

      /* ---------------- 추가 사운드 ---------------- *
       * 기존 소리는 대부분 단발이라 타격감이 얕았다. 아래는 저음(무게) +
       * 중음(본체) + 고음/노이즈(광택) 를 겹쳐 한 방이 두껍게 들리도록 했다. */

      /* 무기별 발사음 — 유닛마다 다른 소리가 나야 화면이 시끄럽지 않고 리듬이 산다 */
      case 'bow': if (!this.throttle('bow', 30)) return;
        this.noise(.05, .06, 3400, 'highpass'); this.tone(880, .05, 'triangle', .05, -320); break;
      case 'gun': if (!this.throttle('gun', 30)) return;
        this.tone(180, .07, 'square', .14, -90); this.noise(.06, .12, 2200, 'highpass'); break;
      case 'staff': if (!this.throttle('staff', 40)) return;
        this.tone(520, .16, 'sine', .1, 260); this.tone(1040, .1, 'triangle', .05, 180); break;
      case 'blade': if (!this.throttle('blade', 32)) return;
        this.noise(.07, .09, 5200, 'highpass'); this.tone(1300, .06, 'sawtooth', .06, -700); break;
      case 'hammer': if (!this.throttle('hammer', 60)) return;
        this.tone(110, .16, 'sawtooth', .2, -46); this.noise(.14, .16, 800); break;
      case 'dart': if (!this.throttle('dart', 26)) return;
        this.tone(1500, .045, 'square', .06, -900); break;

      /* 타격/처치 */
      case 'bigcrit': this.tone(1500, .1, 'square', .2, 900);
        this.tone(300, .16, 'sawtooth', .16, -120); this.noise(.14, .16, 5200, 'highpass'); break;
      case 'pierce': if (!this.throttle('pierce', 40)) return;
        this.tone(2100, .09, 'sawtooth', .09, -1500); break;
      case 'bosshit': if (!this.throttle('bosshit', 90)) return;
        this.tone(140, .18, 'square', .18, -60); this.noise(.16, .14, 1400); break;
      case 'bossdie': [160, 120, 90, 60].forEach((f, i) => setTimeout(() => {
        this.tone(f, .8, 'sawtooth', .3, -22); this.noise(.7, .24, 460);
      }, i * 170)); break;

      /* 상태이상 */
      case 'burn': if (!this.throttle('burn', 200)) return; this.noise(.5, .06, 1100); break;
      case 'poison': if (!this.throttle('poison', 220)) return;
        this.tone(220, .28, 'sine', .07, -70); this.noise(.24, .05, 700); break;
      case 'shock': if (!this.throttle('shock', 90)) return;
        this.noise(.12, .16, 6200, 'highpass'); this.tone(2200, .08, 'square', .07, -1400); break;
      case 'curse': if (!this.throttle('curse', 200)) return;
        this.tone(150, .4, 'sawtooth', .1, -50); this.tone(151, .4, 'sawtooth', .08, -48); break;
      case 'stun': this.tone(700, .14, 'square', .12, -400); this.noise(.12, .1, 1800); break;
      case 'shieldbreak': this.noise(.24, .2, 4200, 'highpass');
        [900, 1300, 700].forEach((f, i) => setTimeout(() => this.tone(f, .1, 'square', .1, -300), i * 45)); break;

      /* 가챠 — 등급이 올라갈수록 길고 화려하게 */
      case 'pull': this.tone(300, .1, 'triangle', .12, 180); this.noise(.08, .06, 3000, 'highpass'); break;
      case 'drumroll': for (let i = 0; i < 14; i++) setTimeout(() => this.noise(.05, .08, 900), i * 62); break;
      case 'rare': [523, 784].forEach((f, i) => setTimeout(() => this.tone(f, .26, 'triangle', .17), i * 90)); break;
      case 'epic': [523, 659, 880, 1046].forEach((f, i) => setTimeout(() => {
        this.tone(f, .34, 'sine', .2); this.tone(f * 2, .2, 'triangle', .07);
      }, i * 90)); break;
      case 'ultimate': [392, 523, 659, 784, 1046, 1318, 1568].forEach((f, i) => setTimeout(() => {
        this.tone(f, .55, 'sine', .24); this.tone(f * 1.5, .34, 'triangle', .12);
        if (i % 2 === 0) this.noise(.2, .07, 6000, 'highpass');
      }, i * 105)); break;
      case 'primordial': [262, 330, 392, 523, 659, 784, 1046, 1568, 2093].forEach((f, i) => setTimeout(() => {
        this.tone(f, .7, 'sine', .26); this.tone(f * 2, .45, 'triangle', .12);
        this.tone(f / 2, .5, 'sawtooth', .08);
        this.noise(.24, .08, 7000, 'highpass');
      }, i * 115)); break;
      case 'jackpot': for (let i = 0; i < 6; i++) setTimeout(() => {
        this.tone(1200 + i * 220, .1, 'square', .14, 300); this.noise(.08, .1, 6000, 'highpass');
      }, i * 70); break;

      /* 스킬 조합 */
      case 'charge': this.tone(160, .5, 'sawtooth', .12, 900); break;
      case 'combo2': [660, 990].forEach((f, i) => setTimeout(() => {
        this.tone(f, .2, 'square', .16, 200); }, i * 60));
        this.noise(.2, .1, 4000, 'highpass'); break;
      case 'combo3': [523, 784, 1046, 1568].forEach((f, i) => setTimeout(() => {
        this.tone(f, .3, 'sine', .2); this.tone(f * 1.5, .2, 'square', .1);
      }, i * 70)); this.tone(70, .5, 'sawtooth', .24, -30); break;
      case 'nuke': this.tone(50, .9, 'sawtooth', .32, -18); this.noise(1.0, .3, 380);
        setTimeout(() => this.noise(.7, .18, 900), 160); break;

      /* UI */
      case 'tab': this.tone(560, .04, 'triangle', .07); break;
      case 'open': [440, 660].forEach((f, i) => setTimeout(() => this.tone(f, .1, 'sine', .1), i * 50)); break;
      case 'close': [660, 440].forEach((f, i) => setTimeout(() => this.tone(f, .09, 'sine', .08), i * 45)); break;
      case 'buy': this.tone(880, .07, 'square', .1); setTimeout(() => this.tone(1320, .12, 'square', .1), 60);
        setTimeout(() => this.tone(1760, .14, 'sine', .08), 130); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() =>
        this.tone(f, .22, 'square', .15), i * 65)); break;
      case 'achieve': [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => {
        this.tone(f, .3, 'sine', .18); this.tone(f * 2, .18, 'triangle', .07);
      }, i * 85)); break;
      case 'place': this.tone(420, .07, 'triangle', .1, -120); this.noise(.05, .05, 1400); break;
      case 'pickup': this.tone(620, .06, 'triangle', .09, 200); break;
      case 'countdown': this.tone(880, .1, 'square', .12); break;
      case 'warning': [440, 0, 440].forEach((f, i) => { if (f) setTimeout(() => this.tone(f, .16, 'sawtooth', .14), i * 180); }); break;
    }
  },

  /** 등급 인덱스에 맞는 획득 팡파레 */
  playRarity(ri) {
    this.play(ri >= 7 ? 'primordial' : ri >= 6 ? 'ultimate' : ri >= 5 ? 'mythic'
      : ri >= 4 ? 'legendary' : ri >= 3 ? 'epic' : ri >= 2 ? 'rare' : 'pull');
  },

  /* 아주 단순한 절차적 BGM (아르페지오 + 베이스) */
  musicTick(dt, intensity = 0) {
    if (!this.enabled || !this.ctx || !this.musicOn) return;
    this._musicTimer -= dt;
    if (this._musicTimer > 0) return;
    const bpm = 96 + intensity * 34;
    const beat = 60 / bpm / 2;
    this._musicTimer = beat;
    const step = this._step++;
    const chordIdx = Math.floor(step / 8) % 4;
    const chords = [0, -3, 5, 3];
    const base = this._root * Math.pow(2, (chords[chordIdx]) / 12);
    if (step % 8 === 0) this.tone(base, beat * 3.4, 'triangle', .16, 0, this.musicGain);
    const n = this._scale[step % this._scale.length];
    const f = base * 4 * Math.pow(2, n / 12);
    this.tone(f, beat * 1.5, 'sine', .055 + intensity * .02, 0, this.musicGain);
    if (intensity > .4 && step % 4 === 2) this.tone(base * 2, beat * .8, 'square', .035, 0, this.musicGain);
  },
  toggleMusic(on) {
    this.musicOn = on;
    if (this.musicGain) this.musicGain.gain.value = on ? this.musicVolume : 0;
  }
};

/* ================================================================== 저장 */
const Store = {
  KEY: 'itd_save_v1',
  save(data) { try { localStorage.setItem(this.KEY, JSON.stringify(data)); return true; } catch (e) { return false; } },
  load() { try { const s = localStorage.getItem(this.KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  wipe() { try { localStorage.removeItem(this.KEY); } catch (e) { } }
};

/* ================================================================== 오브젝트 풀 */
class Pool {
  constructor(factory) { this.factory = factory; this.free = []; }
  get() { return this.free.length ? this.free.pop() : this.factory(); }
  put(o) { if (this.free.length < 600) this.free.push(o); }
}

window.U = U; window.FX = FX; window.SFX = SFX; window.Store = Store; window.Pool = Pool; window.Particle = Particle;
