// 외부 에셋 없이 캔버스로 PBR 텍스처와 스프라이트를 생성한다.
// 전부 타일 가능(seamless)하도록 주기적 밸류 노이즈를 사용.

import {
  CanvasTexture, RepeatWrapping, SRGBColorSpace, LinearFilter,
  LinearMipmapLinearFilter, DataTexture, RGBAFormat,
} from 'three';
import { mulberry32, clamp01, lerp, smootherstep } from './Util.js';

const cache = new Map();
function memo(key, fn) {
  let v = cache.get(key);
  if (!v) { v = fn(); cache.set(key, v); }
  return v;
}

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/** 주기 period로 타일링되는 밸류 노이즈. 반환 f(x,y) — x,y는 0..1 UV. */
function tileNoise(period, seed) {
  const rand = mulberry32(seed);
  const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  return (u, v) => {
    const x = u * period, y = v * period;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smootherstep(x - x0), fy = smootherstep(y - y0);
    const xa = ((x0 % period) + period) % period;
    const ya = ((y0 % period) + period) % period;
    const xb = (xa + 1) % period, yb = (ya + 1) % period;
    const n00 = g[ya * period + xa], n10 = g[ya * period + xb];
    const n01 = g[yb * period + xa], n11 = g[yb * period + xb];
    return lerp(lerp(n00, n10, fx), lerp(n01, n11, fx), fy);
  };
}

function fbmField(size, basePeriod, octaves, seed, gain = 0.5) {
  const layers = [];
  for (let o = 0; o < octaves; o++) layers.push(tileNoise(basePeriod << o, seed + o * 977));
  const out = new Float32Array(size * size);
  let min = Infinity, max = -Infinity;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      let sum = 0, amp = 1, norm = 0;
      for (let o = 0; o < octaves; o++) {
        sum += layers[o](u, v) * amp;
        norm += amp;
        amp *= gain;
      }
      const val = sum / norm;
      out[y * size + x] = val;
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }
  const inv = 1 / Math.max(1e-6, max - min);
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - min) * inv;
  return out;
}

/** 하이트필드 → 탄젠트 공간 노멀맵 (Sobel) */
function normalFromHeight(height, size, strength = 2.0) {
  const data = new Uint8Array(size * size * 4);
  const at = (x, y) => height[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let nx = -dx, ny = -dy, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * size + x) * 4;
      data[i] = (nx * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * 0.5 + 0.5) * 255;
      data[i + 2] = (nz * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new DataTexture(data, size, size, RGBAFormat);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.needsUpdate = true;
  tex.generateMipmaps = true;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

function fieldToTexture(size, write, { srgb = true, repeat = true } = {}) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  write(img.data, size);
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(c);
  if (repeat) tex.wrapS = tex.wrapT = RepeatWrapping;
  if (srgb) tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * 표면 텍스처 세트 생성.
 * @returns {{map:Texture, normalMap:Texture, roughnessMap:Texture}}
 */
function surface(key, opts) {
  return memo(key, () => {
    const {
      size = 512, period = 8, octaves = 5, seed = 1,
      base = [0.42, 0.42, 0.44], variance = 0.28,
      tint = [0, 0, 0], speckle = 0.0, speckleColor = [0.1, 0.1, 0.1],
      roughBase = 0.85, roughVar = 0.25, normalStrength = 2.2,
      cracks = 0,
    } = opts;

    const h = fbmField(size, period, octaves, seed);
    const detail = fbmField(size, period * 4, 3, seed + 4231);
    const rand = mulberry32(seed + 99);

    // 균열: 얇은 리지 노이즈
    let crackField = null;
    if (cracks > 0) {
      // 리지 노이즈를 좁게 잘라 가느다란 균열망을 만든다.
      // 주기를 크게 잡아야 "대리석 무늬"가 아니라 균열로 읽힌다.
      const cf = fbmField(size, Math.max(12, period * 2), 3, seed + 7717);
      crackField = new Float32Array(size * size);
      for (let i = 0; i < cf.length; i++) {
        const r = 1 - Math.abs(cf[i] * 2 - 1);
        crackField[i] = clamp01((r - 0.92) * 13) * cracks;
      }
    }

    const height = new Float32Array(size * size);
    for (let i = 0; i < height.length; i++) {
      height[i] = h[i] * 0.7 + detail[i] * 0.3 - (crackField ? crackField[i] * 0.35 : 0);
    }

    const map = fieldToTexture(size, (d) => {
      for (let i = 0, p = 0; i < height.length; i++, p += 4) {
        const n = h[i] * 0.7 + detail[i] * 0.3;
        const shade = 1 + (n - 0.5) * variance * 2;
        let r = base[0] * shade + tint[0] * (n - 0.5);
        let g = base[1] * shade + tint[1] * (n - 0.5);
        let b = base[2] * shade + tint[2] * (n - 0.5);
        if (speckle > 0 && rand() < speckle) {
          const t = 0.35 + rand() * 0.65;
          r = lerp(r, speckleColor[0], t);
          g = lerp(g, speckleColor[1], t);
          b = lerp(b, speckleColor[2], t);
        }
        if (crackField) {
          const c = crackField[i];
          r = lerp(r, r * 0.55, c); g = lerp(g, g * 0.55, c); b = lerp(b, b * 0.55, c);
        }
        d[p] = clamp01(r) * 255;
        d[p + 1] = clamp01(g) * 255;
        d[p + 2] = clamp01(b) * 255;
        d[p + 3] = 255;
      }
    });

    const roughnessMap = fieldToTexture(size, (d) => {
      for (let i = 0, p = 0; i < height.length; i++, p += 4) {
        let r = roughBase + (detail[i] - 0.5) * roughVar;
        if (crackField) r = lerp(r, 1, crackField[i]);
        const v = clamp01(r) * 255;
        d[p] = d[p + 1] = d[p + 2] = v;
        d[p + 3] = 255;
      }
    }, { srgb: false });

    const normalMap = normalFromHeight(height, size, normalStrength);
    return { map, normalMap, roughnessMap };
  });
}

// ─────────────────────────────── 표면 프리셋 ───────────────────────────────

// 맵은 "디테일 레이어"다: 거의 흰색을 기준으로 명암·얼룩·균열만 담는다.
// 실제 색(알베도)은 버텍스 컬러가 담당한다. 둘을 곱해도 어두워지지 않도록
// base를 0.9 근처로 유지하는 것이 핵심.
export const Surfaces = {
  asphalt: () => surface('asphalt', {
    size: 512, period: 20, octaves: 5, seed: 1337,
    base: [0.90, 0.895, 0.885], variance: 0.18,
    speckle: 0.07, speckleColor: [1.0, 0.99, 0.96],
    roughBase: 0.94, roughVar: 0.14, normalStrength: 0.9, cracks: 0.8,
  }),
  concrete: () => surface('concrete', {
    size: 512, period: 12, octaves: 5, seed: 90210,
    base: [0.92, 0.915, 0.905], variance: 0.20,
    speckle: 0.02, speckleColor: [0.62, 0.59, 0.55],
    roughBase: 0.88, roughVar: 0.2, normalStrength: 0.85, cracks: 0.45,
  }),
  rustMetal: () => surface('rustMetal', {
    size: 512, period: 10, octaves: 5, seed: 5150,
    base: [0.90, 0.83, 0.76], variance: 0.42, tint: [0.22, 0.04, -0.06],
    speckle: 0.03, speckleColor: [1.0, 0.72, 0.42],
    roughBase: 0.74, roughVar: 0.3, normalStrength: 1.0,
  }),
  paintedMetal: () => surface('paintedMetal', {
    size: 512, period: 8, octaves: 4, seed: 24601,
    base: [0.94, 0.935, 0.93], variance: 0.14,
    speckle: 0.014, speckleColor: [0.55, 0.33, 0.18],
    roughBase: 0.5, roughVar: 0.32, normalStrength: 0.7,
  }),
  dirt: () => surface('dirt', {
    size: 512, period: 14, octaves: 5, seed: 8080,
    base: [0.90, 0.87, 0.83], variance: 0.42, tint: [0.10, 0.04, -0.02],
    speckle: 0.05, speckleColor: [1.0, 0.92, 0.78],
    roughBase: 0.97, roughVar: 0.1, normalStrength: 1.3,
  }),
  flesh: () => surface('flesh', {
    size: 256, period: 8, octaves: 4, seed: 31337,
    base: [0.92, 0.9, 0.86], variance: 0.36, tint: [0.10, -0.03, -0.05],
    speckle: 0.03, speckleColor: [0.85, 0.32, 0.28],
    roughBase: 0.82, roughVar: 0.22, normalStrength: 1.1,
  }),
};

// ─────────────────────────────── 스프라이트 ───────────────────────────────

function spriteTexture(size, draw) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

/** 부드러운 원형 그라디언트 — 연기/피/글로우 파티클용 */
export const softDot = () => memo('softDot', () => spriteTexture(128, (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.62)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}));

/** 거친 연기 퍼프 — 소프트닷보다 노이즈가 섞여 자연스럽다 */
export const smokePuff = () => memo('smokePuff', () => spriteTexture(128, (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const rand = mulberry32(4242);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 60; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * s * 0.45;
    const x = s / 2 + Math.cos(a) * r, y = s / 2 + Math.sin(a) * r;
    const rr = 3 + rand() * 14;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, rr);
    gg.addColorStop(0, `rgba(0,0,0,${0.25 + rand() * 0.35})`);
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}));

/** 총구 화염 — 중심 코어 + 방사형 스파이크 */
export const muzzleFlash = () => memo('muzzleFlash', () => spriteTexture(256, (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  const rand = mulberry32(777);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const len = s * (0.22 + rand() * 0.26);
    const w = 3 + rand() * 12;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, 'rgba(255,240,200,0.9)');
    g.addColorStop(0.4, 'rgba(255,180,60,0.45)');
    g.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -w); ctx.lineTo(len, 0); ctx.lineTo(0, w);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.2);
  core.addColorStop(0, 'rgba(255,255,245,1)');
  core.addColorStop(0.35, 'rgba(255,220,140,0.85)');
  core.addColorStop(1, 'rgba(255,140,30,0)');
  ctx.fillStyle = core; ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = 'source-over';
}));

/** 탄흔 데칼 — 어두운 구멍 + 방사형 균열 */
export const bulletHole = () => memo('bulletHole', () => spriteTexture(128, (ctx, s) => {
  ctx.clearRect(0, 0, s, s);
  const cx = s / 2, cy = s / 2;
  const rand = mulberry32(2024);
  // 먼지 링
  const ring = ctx.createRadialGradient(cx, cy, s * 0.09, cx, cy, s * 0.46);
  ring.addColorStop(0, 'rgba(60,55,50,0.75)');
  ring.addColorStop(0.55, 'rgba(90,85,78,0.30)');
  ring.addColorStop(1, 'rgba(120,115,108,0)');
  ctx.fillStyle = ring; ctx.fillRect(0, 0, s, s);
  // 균열
  ctx.strokeStyle = 'rgba(25,22,20,0.65)';
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const len = s * (0.12 + rand() * 0.28);
    ctx.lineWidth = 1 + rand() * 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * s * 0.07, cy + Math.sin(a) * s * 0.07);
    const a2 = a + (rand() - 0.5) * 0.7;
    ctx.lineTo(cx + Math.cos(a2) * len, cy + Math.sin(a2) * len);
    ctx.stroke();
  }
  // 구멍
  const hole = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.11);
  hole.addColorStop(0, 'rgba(8,7,6,1)');
  hole.addColorStop(0.7, 'rgba(14,12,10,0.95)');
  hole.addColorStop(1, 'rgba(20,18,16,0)');
  ctx.fillStyle = hole;
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.12, 0, Math.PI * 2); ctx.fill();
}));

/** 핏자국 데칼 — 불규칙한 얼룩 + 튄 방울 */
export const bloodSplat = (variant = 0) => memo('bloodSplat' + variant, () => spriteTexture(256, (ctx, s) => {
  ctx.clearRect(0, 0, s, s);
  const cx = s / 2, cy = s / 2;
  const rand = mulberry32(1000 + variant * 613);
  ctx.fillStyle = 'rgba(96,10,10,0.92)';
  // 중심 얼룩 — 방사형 반지름 변조
  ctx.beginPath();
  const pts = 26;
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const r = s * (0.16 + 0.13 * (0.4 + rand() * 0.6) * (0.7 + 0.6 * Math.sin(a * 3 + variant)));
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  // 튄 방울
  for (let i = 0; i < 42; i++) {
    const a = rand() * Math.PI * 2;
    const d = s * (0.16 + rand() * 0.3);
    const r = 1.2 + rand() * 6.5 * (1 - d / (s * 0.5));
    ctx.globalAlpha = 0.35 + rand() * 0.55;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, r * (0.6 + rand() * 0.8), a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 가장자리를 부드럽게
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createRadialGradient(cx, cy, s * 0.2, cx, cy, s * 0.5);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.8, 'rgba(0,0,0,0.9)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = 'source-over';
}));

/** 스파크/트레이서용 세로 스트릭 */
export const streak = () => memo('streak', () => spriteTexture(64, (ctx, s) => {
  const g = ctx.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(s * 0.35, 0, s * 0.3, s);
  ctx.filter = 'blur(3px)';
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = 'none';
}));

export function disposeTextures() {
  for (const v of cache.values()) {
    if (v?.dispose) v.dispose();
    else if (v && typeof v === 'object') for (const t of Object.values(v)) t?.dispose?.();
  }
  cache.clear();
}
