/* =========================================================================
 *  noise.js — 펄린 노이즈(2D/3D), fBm, 리지드 노이즈, 보로노이
 *  월드 생성(지형/바이옴/동굴/광물)의 기반
 * ========================================================================= */
'use strict';

class Perlin {
  constructor(seed = 0) {
    const rng = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {           // Fisher-Yates
      const j = Math.floor(rng() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
    this.seed = seed;
  }

  static _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

  static _grad2(hash, x, y) {
    switch (hash & 7) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      case 4: return x;
      case 5: return -x;
      case 6: return y;
      default: return -y;
    }
  }
  static _grad3(hash, x, y, z) {
    switch (hash & 15) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      case 4: return x + z;
      case 5: return -x + z;
      case 6: return x - z;
      case 7: return -x - z;
      case 8: return y + z;
      case 9: return -y + z;
      case 10: return y - z;
      case 11: return -y - z;
      case 12: return x + y;
      case 13: return -y + z;
      case 14: return -x + y;
      default: return -y - z;
    }
  }

  /** 2D 펄린 → 대략 -1..1 */
  noise2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = Perlin._fade(xf), v = Perlin._fade(yf);
    const P = this.perm;
    const aa = P[P[X] + Y], ab = P[P[X] + Y + 1];
    const ba = P[P[X + 1] + Y], bb = P[P[X + 1] + Y + 1];
    const x1 = lerp(Perlin._grad2(aa, xf, yf), Perlin._grad2(ba, xf - 1, yf), u);
    const x2 = lerp(Perlin._grad2(ab, xf, yf - 1), Perlin._grad2(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v) * 0.7;
  }

  /** 3D 펄린 → 대략 -1..1 */
  noise3(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y), zf = z - Math.floor(z);
    const u = Perlin._fade(xf), v = Perlin._fade(yf), w = Perlin._fade(zf);
    const P = this.perm;
    const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z;
    const B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
    const g = Perlin._grad3;
    const x1 = lerp(g(P[AA], xf, yf, zf), g(P[BA], xf - 1, yf, zf), u);
    const x2 = lerp(g(P[AB], xf, yf - 1, zf), g(P[BB], xf - 1, yf - 1, zf), u);
    const y1 = lerp(x1, x2, v);
    const x3 = lerp(g(P[AA + 1], xf, yf, zf - 1), g(P[BA + 1], xf - 1, yf, zf - 1), u);
    const x4 = lerp(g(P[AB + 1], xf, yf - 1, zf - 1), g(P[BB + 1], xf - 1, yf - 1, zf - 1), u);
    const y2 = lerp(x3, x4, v);
    return lerp(y1, y2, w) * 0.85;
  }

  /** 옥타브 합성 (fractal Brownian motion) */
  fbm2(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.noise2(x * freq, y * freq) * amp;
      norm += amp;
      amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  }
  fbm3(x, y, z, octaves = 4, lacunarity = 2, gain = 0.5) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.noise3(x * freq, y * freq, z * freq) * amp;
      norm += amp;
      amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  }
  /** 리지드 멀티프랙탈 — 산맥 능선 */
  ridged2(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(this.noise2(x * freq, y * freq));
      sum += n * n * amp;
      norm += amp;
      amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  }
  /** 워프된 노이즈 — 자연스러운 뒤틀림 */
  warped2(x, y, strength = 1.5) {
    const wx = this.noise2(x + 5.2, y + 1.3) * strength;
    const wy = this.noise2(x + 9.7, y + 4.1) * strength;
    return this.fbm2(x + wx, y + wy, 4);
  }
}

/** 셀룰러/보로노이 — 바이옴 경계, 광물 클러스터 */
class Voronoi {
  constructor(seed = 0) { this.seed = seed | 0; }
  /** 가장 가까운 셀의 중심과 거리 반환 */
  cell(x, z, scale = 1) {
    const px = x * scale, pz = z * scale;
    const cx = Math.floor(px), cz = Math.floor(pz);
    let best = 1e9, bx = 0, bz = 0, bid = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx, gz = cz + dz;
        const ox = hash2(gx, gz, this.seed);
        const oz = hash2(gx, gz, this.seed ^ 0x5bf03635);
        const fx = gx + ox, fz = gz + oz;
        const d = (fx - px) * (fx - px) + (fz - pz) * (fz - pz);
        if (d < best) {
          best = d; bx = fx; bz = fz;
          bid = Math.floor(hash2(gx, gz, this.seed ^ 0x1b873593) * 1e6);
        }
      }
    }
    return { dist: Math.sqrt(best), x: bx / scale, z: bz / scale, id: bid };
  }
}

/** 노이즈 세트 — 월드 하나당 한 벌 */
class NoiseSet {
  constructor(seed) {
    this.seed = seed | 0;
    this.continent = new Perlin(seed + 1);
    this.erosion = new Perlin(seed + 2);
    this.detail = new Perlin(seed + 3);
    this.mountain = new Perlin(seed + 4);
    this.temperature = new Perlin(seed + 5);
    this.humidity = new Perlin(seed + 6);
    this.cave = new Perlin(seed + 7);
    this.cave2 = new Perlin(seed + 8);
    this.cheese = new Perlin(seed + 9);
    this.ore = new Perlin(seed + 10);
    this.tree = new Perlin(seed + 11);
    this.river = new Perlin(seed + 12);
    this.beach = new Perlin(seed + 13);
    this.cloud = new Perlin(seed + 14);
    this.voronoi = new Voronoi(seed + 15);
  }
}
