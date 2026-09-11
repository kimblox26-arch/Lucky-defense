/* =========================================================================
 *  util.js — 수학 / 난수 / AABB / 방향 테이블 등 엔진 전역 유틸리티
 *  (클래식 스크립트: 최상위 선언이 전역으로 공유됨 — file:// 에서도 동작)
 * ========================================================================= */
'use strict';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/* ---------------------------------------------------------------- 수학 */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(t) { return t * t * (3 - 2 * t); }
function smootherstep(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function mod(a, n) { return ((a % n) + n) % n; }
function sign(v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); }
function approach(cur, target, step) {
  if (cur < target) return Math.min(cur + step, target);
  if (cur > target) return Math.max(cur - step, target);
  return target;
}
function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}
function dist2(ax, ay, az, bx, by, bz) {
  const dx = ax - bx, dy = ay - by, dz = az - bz;
  return dx * dx + dy * dy + dz * dz;
}
function dist3(ax, ay, az, bx, by, bz) { return Math.sqrt(dist2(ax, ay, az, bx, by, bz)); }

/* ---------------------------------------------------------------- 난수 */
/** 결정론적 32bit PRNG (mulberry32) */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 좌표 해시 → 0..1 (월드 생성용 결정론 난수) */
function hash2(x, z, seed) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(z | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function hash3(x, y, z, seed) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x85ebca6b) ^
    Math.imul(z | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h ^= h >>> 15; h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function randInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
function chance(rng, p) { return rng() < p; }

/* ---------------------------------------------------------------- AABB */
class AABB {
  constructor(x0, y0, z0, x1, y1, z1) {
    this.x0 = x0; this.y0 = y0; this.z0 = z0;
    this.x1 = x1; this.y1 = y1; this.z1 = z1;
  }
  static fromSize(cx, y, cz, w, h) {
    const r = w / 2;
    return new AABB(cx - r, y, cz - r, cx + r, y + h, cz + r);
  }
  set(x0, y0, z0, x1, y1, z1) {
    this.x0 = x0; this.y0 = y0; this.z0 = z0; this.x1 = x1; this.y1 = y1; this.z1 = z1; return this;
  }
  copy() { return new AABB(this.x0, this.y0, this.z0, this.x1, this.y1, this.z1); }
  offset(dx, dy, dz) {
    this.x0 += dx; this.y0 += dy; this.z0 += dz;
    this.x1 += dx; this.y1 += dy; this.z1 += dz; return this;
  }
  expand(dx, dy, dz) {
    return new AABB(
      Math.min(this.x0, this.x0 + dx), Math.min(this.y0, this.y0 + dy), Math.min(this.z0, this.z0 + dz),
      Math.max(this.x1, this.x1 + dx), Math.max(this.y1, this.y1 + dy), Math.max(this.z1, this.z1 + dz));
  }
  grow(g) {
    return new AABB(this.x0 - g, this.y0 - g, this.z0 - g, this.x1 + g, this.y1 + g, this.z1 + g);
  }
  intersects(o) {
    return this.x0 < o.x1 && this.x1 > o.x0 &&
      this.y0 < o.y1 && this.y1 > o.y0 &&
      this.z0 < o.z1 && this.z1 > o.z0;
  }
  contains(x, y, z) {
    return x >= this.x0 && x <= this.x1 && y >= this.y0 && y <= this.y1 && z >= this.z0 && z <= this.z1;
  }
  get cx() { return (this.x0 + this.x1) / 2; }
  get cy() { return (this.y0 + this.y1) / 2; }
  get cz() { return (this.z0 + this.z1) / 2; }
}

/* ------------------------------------------------------- 면(face) 정의
 * 0:+X(동) 1:-X(서) 2:+Y(위) 3:-Y(아래) 4:+Z(남) 5:-Z(북)
 * N=법선, U=화면상 오른쪽, V=화면상 위쪽 (텍스처 좌표축)
 * 코너 위치 = 0.5 + 0.5*N + 0.5*s*U + 0.5*t*V,  (s,t)=(-1,-1)(1,-1)(1,1)(-1,1)
 */
const FACES = [
  { name: 'east', n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], shade: 0.62 },
  { name: 'west', n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], shade: 0.62 },
  { name: 'top', n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], shade: 1.00 },
  { name: 'bottom', n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.48 },
  { name: 'south', n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.82 },
  { name: 'north', n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], shade: 0.82 },
];
const FACE_EAST = 0, FACE_WEST = 1, FACE_TOP = 2, FACE_BOTTOM = 3, FACE_SOUTH = 4, FACE_NORTH = 5;
const FACE_OPPOSITE = [1, 0, 3, 2, 5, 4];
/** (s,t) 코너 부호 — BL, BR, TR, TL */
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

/* ---------------------------------------------------------- 행렬 (4x4) */
const Mat4 = {
  create() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },
  identity(o) {
    o[0] = 1; o[1] = 0; o[2] = 0; o[3] = 0; o[4] = 0; o[5] = 1; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = 1; o[11] = 0; o[12] = 0; o[13] = 0; o[14] = 0; o[15] = 1;
    return o;
  },
  perspective(o, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    o[0] = f / aspect; o[1] = 0; o[2] = 0; o[3] = 0;
    o[4] = 0; o[5] = f; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = (far + near) * nf; o[11] = -1;
    o[12] = 0; o[13] = 0; o[14] = 2 * far * near * nf; o[15] = 0;
    return o;
  },
  ortho(o, l, r, b, t, n, f) {
    const lr = 1 / (l - r), bt = 1 / (b - t), nf = 1 / (n - f);
    o[0] = -2 * lr; o[1] = 0; o[2] = 0; o[3] = 0;
    o[4] = 0; o[5] = -2 * bt; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = 2 * nf; o[11] = 0;
    o[12] = (l + r) * lr; o[13] = (t + b) * bt; o[14] = (f + n) * nf; o[15] = 1;
    return o;
  },
  multiply(o, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
      a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
      a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (let i = 0; i < 4; i++) {
      const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      o[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    }
    return o;
  },
  translate(o, a, x, y, z) {
    if (o !== a) o.set(a);
    o[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    o[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    o[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    o[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    return o;
  },
  scale(o, a, x, y, z) {
    o[0] = a[0] * x; o[1] = a[1] * x; o[2] = a[2] * x; o[3] = a[3] * x;
    o[4] = a[4] * y; o[5] = a[5] * y; o[6] = a[6] * y; o[7] = a[7] * y;
    o[8] = a[8] * z; o[9] = a[9] * z; o[10] = a[10] * z; o[11] = a[11] * z;
    o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15];
    return o;
  },
  rotateX(o, a, rad) {
    const s = Math.sin(rad), c = Math.cos(rad);
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    if (o !== a) { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; o[3] = a[3]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
    o[4] = a10 * c + a20 * s; o[5] = a11 * c + a21 * s; o[6] = a12 * c + a22 * s; o[7] = a13 * c + a23 * s;
    o[8] = a20 * c - a10 * s; o[9] = a21 * c - a11 * s; o[10] = a22 * c - a12 * s; o[11] = a23 * c - a13 * s;
    return o;
  },
  rotateY(o, a, rad) {
    const s = Math.sin(rad), c = Math.cos(rad);
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    if (o !== a) { o[4] = a[4]; o[5] = a[5]; o[6] = a[6]; o[7] = a[7]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
    o[0] = a00 * c - a20 * s; o[1] = a01 * c - a21 * s; o[2] = a02 * c - a22 * s; o[3] = a03 * c - a23 * s;
    o[8] = a00 * s + a20 * c; o[9] = a01 * s + a21 * c; o[10] = a02 * s + a22 * c; o[11] = a03 * s + a23 * c;
    return o;
  },
  rotateZ(o, a, rad) {
    const s = Math.sin(rad), c = Math.cos(rad);
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
      a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    if (o !== a) { o[8] = a[8]; o[9] = a[9]; o[10] = a[10]; o[11] = a[11]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
    o[0] = a00 * c + a10 * s; o[1] = a01 * c + a11 * s; o[2] = a02 * c + a12 * s; o[3] = a03 * c + a13 * s;
    o[4] = a10 * c - a00 * s; o[5] = a11 * c - a01 * s; o[6] = a12 * c - a02 * s; o[7] = a13 * c - a03 * s;
    return o;
  },
  /** 1인칭 카메라 뷰 행렬 (yaw → pitch 순) */
  view(o, x, y, z, yaw, pitch) {
    Mat4.identity(o);
    Mat4.rotateX(o, o, pitch);
    Mat4.rotateY(o, o, yaw);
    Mat4.translate(o, o, -x, -y, -z);
    return o;
  },
};

/* -------------------------------------------------- 절두체 컬링 (평면 6) */
class Frustum {
  constructor() { this.p = new Float32Array(24); }
  /** viewProj 행렬에서 6개 평면 추출 */
  fromMatrix(m) {
    const p = this.p;
    const rows = [
      [m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]],   // left
      [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]],   // right
      [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]],   // bottom
      [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]],   // top
      [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]],  // near
      [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]],  // far
    ];
    for (let i = 0; i < 6; i++) {
      const r = rows[i];
      const len = Math.hypot(r[0], r[1], r[2]) || 1;
      p[i * 4] = r[0] / len; p[i * 4 + 1] = r[1] / len;
      p[i * 4 + 2] = r[2] / len; p[i * 4 + 3] = r[3] / len;
    }
    return this;
  }
  boxVisible(x0, y0, z0, x1, y1, z1) {
    const p = this.p;
    for (let i = 0; i < 6; i++) {
      const a = p[i * 4], b = p[i * 4 + 1], c = p[i * 4 + 2], d = p[i * 4 + 3];
      const px = a > 0 ? x1 : x0, py = b > 0 ? y1 : y0, pz = c > 0 ? z1 : z0;
      if (a * px + b * py + c * pz + d < 0) return false;
    }
    return true;
  }
}

/* ------------------------------------------------------------ 색 유틸 */
function rgb(r, g, b) { return `rgb(${r | 0},${g | 0},${b | 0})`; }
function shadeColor(hex, amt) {
  const r = clamp(((hex >> 16) & 255) * amt, 0, 255) | 0;
  const g = clamp(((hex >> 8) & 255) * amt, 0, 255) | 0;
  const b = clamp((hex & 255) * amt, 0, 255) | 0;
  return (r << 16) | (g << 8) | b;
}
function hexToRgbArr(hex) { return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]; }
function mixHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((lerp(ar, br, t) | 0) << 16) | ((lerp(ag, bg, t) | 0) << 8) | (lerp(ab, bb, t) | 0);
}
function hexStr(hex) { return '#' + hex.toString(16).padStart(6, '0'); }

/* ----------------------------------------------------------- 기타 도구 */
function formatTime(ticks) {
  const t = mod(ticks, 24000);
  const h = Math.floor(t / 1000 + 6) % 24;
  const m = Math.floor((t % 1000) / 1000 * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function now() { return performance.now(); }

/** 간단한 이동 평균 (FPS 등) */
class Averager {
  constructor(n = 60) { this.n = n; this.buf = []; this.sum = 0; }
  push(v) {
    this.buf.push(v); this.sum += v;
    if (this.buf.length > this.n) this.sum -= this.buf.shift();
    return this.avg;
  }
  get avg() { return this.buf.length ? this.sum / this.buf.length : 0; }
}
