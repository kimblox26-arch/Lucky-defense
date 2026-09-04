// 수학/유틸 공용 모듈. 게임 전역에서 재사용.

export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const smootherstep = (t) => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };

/** 프레임레이트 독립 보간. rate가 클수록 빠르게 수렴. */
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

export const wrapPi = (a) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};

export const deg = (d) => (d * Math.PI) / 180;

/** mulberry32 — 작고 빠른 시드 PRNG. 웨이브 구성 재현에 사용. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed = (Math.random() * 0xffffffff) | 0) {
    this.seed = seed;
    this.next = mulberry32(seed);
  }
  reseed(seed) { this.seed = seed; this.next = mulberry32(seed); return this; }
  float() { return this.next(); }
  range(a, b) { return a + (b - a) * this.next(); }
  int(n) { return (this.next() * n) | 0; }
  irange(a, b) { return a + ((this.next() * (b - a + 1)) | 0); }
  pick(arr) { return arr[(this.next() * arr.length) | 0]; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  chance(p) { return this.next() < p; }
  /** Box-Muller 근사 (평균 0, 표준편차 1) */
  gauss() {
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
  /** 단위 원 내부의 균등 분포 점 */
  inDisc(out = { x: 0, y: 0 }) {
    const r = Math.sqrt(this.next());
    const a = this.next() * TAU;
    out.x = Math.cos(a) * r;
    out.y = Math.sin(a) * r;
    return out;
  }
}

export const rng = new Rng();

/**
 * 임계 감쇠 스프링. 반동/카메라 킥/뷰모델 스웨이 전반에 사용.
 * 값·속도를 직접 노출해 외부에서 임펄스를 더할 수 있다.
 */
export class Spring {
  constructor(stiffness = 120, damping = 14, value = 0) {
    this.k = stiffness;
    this.d = damping;
    this.value = value;
    this.vel = 0;
    this.target = value;
  }
  kick(v) { this.vel += v; return this; }
  set(v) { this.value = v; this.vel = 0; return this; }
  update(dt) {
    // 큰 dt에서도 폭발하지 않도록 서브스텝
    const steps = dt > 1 / 60 ? Math.min(4, Math.ceil(dt * 60)) : 1;
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a = (this.target - this.value) * this.k - this.vel * this.d;
      this.vel += a * h;
      this.value += this.vel * h;
    }
    return this.value;
  }
}

/** 2차원(pitch/yaw) 스프링 — 반동에 사용 */
export class Spring2 {
  constructor(stiffness = 120, damping = 14) {
    this.x = new Spring(stiffness, damping);
    this.y = new Spring(stiffness, damping);
  }
  kick(x, y) { this.x.kick(x); this.y.kick(y); return this; }
  update(dt) { this.x.update(dt); this.y.update(dt); return this; }
  get valueX() { return this.x.value; }
  get valueY() { return this.y.value; }
}

/** 고정 크기 객체 풀. 파티클/데칼/트레이서/데미지 숫자 등에 사용. */
export class Pool {
  constructor(factory, size, reset = null) {
    this.items = new Array(size);
    this.free = new Array(size);
    this.reset = reset;
    for (let i = 0; i < size; i++) {
      this.items[i] = factory(i);
      this.free[i] = i;
    }
    this.freeCount = size;
  }
  acquire() {
    if (this.freeCount === 0) return null;
    const idx = this.free[--this.freeCount];
    return this.items[idx];
  }
  /** 인덱스를 알고 있을 때 반납 */
  releaseIndex(idx) {
    if (this.freeCount >= this.items.length) return;
    this.free[this.freeCount++] = idx;
    if (this.reset) this.reset(this.items[idx]);
  }
  get used() { return this.items.length - this.freeCount; }
}

/** 지수 이동 평균 — 프레임타임 추적용 */
export class Ema {
  constructor(alpha = 0.05, initial = 0) { this.a = alpha; this.value = initial; }
  push(v) { this.value += (v - this.value) * this.a; return this.value; }
}

export function formatNumber(n) {
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatTime(sec) {
  sec = Math.max(0, sec);
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
