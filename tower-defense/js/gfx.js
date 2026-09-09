/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  gfx.js   (고급 그래픽 엔진)
 * -------------------------------------------------------------------------
 *  · 레이어드 캐릭터 리그 : 그림자 → 다리 → 망토 → 몸통 → 팔 → 머리 → 헤어
 *                          → 헤드기어 → 무기 → 날개/꼬리 → 오라
 *  · 스프라이트 캐시     : (종류,크기,프레임) 단위 오프스크린 캔버스
 *  · 지형 렌더러         : 해시 노이즈 텍스처 · 장식물 · 액체 애니메이션
 *  · 환경                : 날씨(비/눈/불티/안개/모래) · 조명 · 시간대 색보정
 * ========================================================================= */
'use strict';

const GFX = {

  /* ===================================================================
   *  0. 저수준 유틸
   * =================================================================== */

  /** 결정론적 해시 노이즈 (0~1) */
  hash(x, y, seed) {
    /* 32비트 정수 연산으로 고정 (부동소수 오버플로 방지) */
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  },
  /** 부드러운 2D 값 노이즈 */
  noise2(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = this.hash(xi, yi, seed), b = this.hash(xi + 1, yi, seed);
    const c = this.hash(xi, yi + 1, seed), d = this.hash(xi + 1, yi + 1, seed);
    return U.lerp(U.lerp(a, b, u), U.lerp(c, d, u), v);
  },
  fbm(x, y, seed, oct = 3) {
    let v = 0, amp = .5, f = 1;
    for (let i = 0; i < oct; i++) { v += this.noise2(x * f, y * f, seed + i * 71) * amp; amp *= .5; f *= 2; }
    return v;
  },

  /** 색 램프 : 하이라이트/기본/음영/외곽 5단계 */
  ramp(hex) {
    if (this._rampCache[hex]) return this._rampCache[hex];
    const r = {
      hi: U.mixHex(hex, '#ffffff', .55),
      lit: U.mixHex(hex, '#ffffff', .26),
      base: hex,
      sh: U.mixHex(hex, '#0a0d16', .34),
      deep: U.mixHex(hex, '#05070c', .58),
      line: U.mixHex(hex, '#04060a', .72),
    };
    this._rampCache[hex] = r;
    return r;
  },
  _rampCache: {},

  /** 세로 그라디언트 (천/피부) */
  vgrad(c, x0, y0, y1, top, bottom) {
    const g = c.createLinearGradient(x0, y0, x0, y1);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    return g;
  },
  /** 금속 그라디언트 (밴드 4개) */
  metal(c, x0, y0, x1, y1, R) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, R.sh); g.addColorStop(.28, R.lit);
    g.addColorStop(.46, R.hi); g.addColorStop(.62, R.base);
    g.addColorStop(1, R.deep);
    return g;
  },
  /** 방사형 광 */
  radial(c, x, y, r, inner, outer) {
    const g = c.createRadialGradient(x, y, 0, x, y, Math.max(.01, r));
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    return g;
  },

  /** 경로에 외곽선 + 채우기 */
  fillLine(c, fill, line, w) {
    c.fillStyle = fill; c.fill();
    if (line) { c.strokeStyle = line; c.lineWidth = w || 1.1; c.lineJoin = 'round'; c.stroke(); }
  },

  /** 타원 그림자 (블러 흉내: 3중첩) */
  groundShadow(c, x, y, rx, ry, a = .34) {
    for (let i = 3; i >= 1; i--) {
      c.fillStyle = `rgba(0,0,0,${a / (i * 1.6)})`;
      c.beginPath(); c.ellipse(x, y, rx * (1 + i * .16), ry * (1 + i * .2), 0, 0, U.TAU); c.fill();
    }
  },

  /** 좌상단 림라이트 */
  rim(c, path, col, w) {
    c.save(); c.clip(path);
    c.strokeStyle = col; c.lineWidth = w; c.globalAlpha = .8;
    c.stroke(path); c.restore();
  },

  /* ===================================================================
   *  1. 캐릭터 파츠 — 다리
   * =================================================================== */
  legs: {
    /** 두 다리 걷기 사이클 */
    biped(c, S, R, ph, style) {
      const sw = Math.sin(ph) * S * .26;
      const lift = Math.max(0, Math.sin(ph)) * S * .1;
      const w = S * .19;
      for (let i = 0; i < 2; i++) {
        const dir = i ? 1 : -1;
        const ox = dir * S * .21;
        const off = dir > 0 ? sw : -sw;
        const up = dir > 0 ? lift : Math.max(0, -Math.sin(ph)) * S * .1;
        c.save();
        c.translate(ox + off * .5, S * .52 - up);
        c.fillStyle = dir > 0 ? R.base : R.sh;
        c.beginPath(); c.roundRect(-w / 2, 0, w, S * .46, w * .45); c.fill();
        c.strokeStyle = R.line; c.lineWidth = S * .035; c.stroke();
        /* 신발 */
        c.fillStyle = style === 'boot' ? R.deep : R.line;
        c.beginPath(); c.roundRect(-w * .62, S * .38, w * 1.34, S * .16, w * .3); c.fill();
        c.restore();
      }
    },
    /** 4족 */
    quad(c, S, R, ph) {
      for (let i = 0; i < 4; i++) {
        const front = i < 2, side = i % 2 ? 1 : -1;
        const p = ph + (front ? 0 : Math.PI) + (side > 0 ? 0 : Math.PI);
        const sw = Math.sin(p) * S * .2;
        c.save();
        c.translate((front ? S * .34 : -S * .3) + sw * .4, S * .48);
        c.fillStyle = side > 0 ? R.base : R.sh;
        c.beginPath(); c.roundRect(-S * .07, 0, S * .14, S * .42, S * .06); c.fill();
        c.strokeStyle = R.line; c.lineWidth = S * .03; c.stroke();
        c.restore();
      }
    },
    /** 유령 : 흩어지는 하단 */
    wisp(c, S, R, ph, t) {
      c.beginPath();
      c.moveTo(-S * .42, S * .3);
      for (let i = 0; i <= 8; i++) {
        const x = -S * .42 + (S * .84) * (i / 8);
        const y = S * (.72 + Math.sin(t * 3 + i * .9) * .12 + (i % 2 ? .08 : 0));
        c.lineTo(x, y);
      }
      c.lineTo(S * .42, S * .3); c.closePath();
      const g = GFX.vgrad(c, 0, S * .2, S * .85, R.base, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.globalAlpha = .8; c.fill(); c.globalAlpha = 1;
    },
    /** 부유 : 아래 에너지 원뿔 */
    float(c, S, R, ph, t) {
      const p = .5 + Math.sin(t * 2.6) * .5;
      c.fillStyle = GFX.radial(c, 0, S * .62, S * .4, U.rgba(R.base, .55), U.rgba(R.base, 0));
      c.beginPath(); c.ellipse(0, S * .62, S * .4, S * .16 + p * S * .03, 0, 0, U.TAU); c.fill();
    },
    /** 바퀴/궤도 */
    track(c, S, R) {
      c.fillStyle = R.deep;
      c.beginPath(); c.roundRect(-S * .56, S * .42, S * 1.12, S * .3, S * .12); c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .04; c.stroke();
      c.fillStyle = R.sh;
      for (let i = -2; i <= 2; i++) {
        c.beginPath(); c.arc(i * S * .2, S * .57, S * .06, 0, U.TAU); c.fill();
      }
    },
    /** 다리 없음(슬라임/구체) */
    none() { },
  },

  /* ===================================================================
   *  2. 캐릭터 파츠 — 몸통
   * =================================================================== */
  torso: {
    /** 로브 : 넓게 퍼지는 천 */
    robe(c, S, R, t) {
      const p = new Path2D();
      p.moveTo(-S * .3, -S * .34);
      p.quadraticCurveTo(-S * .42, S * .1, -S * .66, S * .62);
      p.quadraticCurveTo(0, S * .78, S * .66, S * .62);
      p.quadraticCurveTo(S * .42, S * .1, S * .3, -S * .34);
      p.closePath();
      c.fillStyle = GFX.vgrad(c, 0, -S * .34, S * .66, R.lit, R.sh);
      c.fill(p);
      c.strokeStyle = R.line; c.lineWidth = S * .045; c.stroke(p);
      /* 주름 */
      c.strokeStyle = U.rgba('#000000', .18); c.lineWidth = S * .035;
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(i * S * .18, -S * .18);
        c.quadraticCurveTo(i * S * .26, S * .2, i * S * .34, S * .6);
        c.stroke();
      }
      /* 옷깃 */
      c.fillStyle = R.hi;
      c.beginPath(); c.moveTo(-S * .3, -S * .34); c.lineTo(0, -S * .06); c.lineTo(S * .3, -S * .34);
      c.lineTo(0, -S * .2); c.closePath(); c.fill();
    },
    /** 판금 갑옷 */
    plate(c, S, R) {
      const p = new Path2D();
      p.moveTo(-S * .38, -S * .3);
      p.lineTo(S * .38, -S * .3);
      p.quadraticCurveTo(S * .46, S * .2, S * .3, S * .5);
      p.lineTo(-S * .3, S * .5);
      p.quadraticCurveTo(-S * .46, S * .2, -S * .38, -S * .3);
      p.closePath();
      c.fillStyle = GFX.metal(c, -S * .4, -S * .3, S * .4, S * .5, R);
      c.fill(p);
      c.strokeStyle = R.line; c.lineWidth = S * .05; c.stroke(p);
      /* 흉갑 라인 */
      c.strokeStyle = U.rgba('#ffffff', .3); c.lineWidth = S * .035;
      c.beginPath(); c.moveTo(0, -S * .26); c.lineTo(0, S * .44); c.stroke();
      c.beginPath(); c.arc(0, -S * .1, S * .22, .3, Math.PI - .3); c.stroke();
      /* 어깨 견장 */
      for (const d of [-1, 1]) {
        c.fillStyle = GFX.metal(c, d * S * .5, -S * .4, d * S * .5, -S * .05, R);
        c.beginPath(); c.ellipse(d * S * .44, -S * .26, S * .19, S * .15, d * .3, 0, U.TAU); c.fill();
        c.strokeStyle = R.line; c.lineWidth = S * .04; c.stroke();
      }
    },
    /** 가죽/경장 */
    leather(c, S, R) {
      const p = new Path2D();
      p.roundRect(-S * .33, -S * .3, S * .66, S * .8, S * .18);
      c.fillStyle = GFX.vgrad(c, 0, -S * .3, S * .5, R.lit, R.sh);
      c.fill(p);
      c.strokeStyle = R.line; c.lineWidth = S * .045; c.stroke(p);
      /* 벨트 */
      c.fillStyle = R.deep;
      c.fillRect(-S * .35, S * .18, S * .7, S * .12);
      c.fillStyle = '#e8c46a';
      c.fillRect(-S * .07, S * .17, S * .14, S * .14);
      /* 어깨끈 */
      c.strokeStyle = R.deep; c.lineWidth = S * .07;
      c.beginPath(); c.moveTo(-S * .26, -S * .26); c.lineTo(S * .2, S * .18); c.stroke();
    },
    /** 후드 망토(암살자) */
    cloak(c, S, R, t) {
      const sway = Math.sin(t * 2.2) * S * .05;
      const p = new Path2D();
      p.moveTo(0, -S * .38);
      p.quadraticCurveTo(S * .55, -S * .1, S * .46 + sway, S * .62);
      p.quadraticCurveTo(0, S * .74, -S * .46 + sway, S * .62);
      p.quadraticCurveTo(-S * .55, -S * .1, 0, -S * .38);
      c.fillStyle = GFX.vgrad(c, 0, -S * .38, S * .66, R.base, R.deep);
      c.fill(p);
      c.strokeStyle = R.line; c.lineWidth = S * .045; c.stroke(p);
      /* 안감 */
      c.fillStyle = U.rgba('#ffffff', .12);
      c.beginPath(); c.moveTo(0, -S * .3); c.quadraticCurveTo(S * .18, S * .2, S * .1, S * .6);
      c.lineTo(-S * .1, S * .6); c.quadraticCurveTo(-S * .18, S * .2, 0, -S * .3); c.fill();
    },
    /** 기계 코어 */
    core(c, S, R, t) {
      const p = new Path2D();
      p.roundRect(-S * .44, -S * .34, S * .88, S * .86, S * .14);
      c.fillStyle = GFX.metal(c, -S * .44, -S * .34, S * .44, S * .52, R);
      c.fill(p);
      c.strokeStyle = R.line; c.lineWidth = S * .05; c.stroke(p);
      /* 패널 라인 */
      c.strokeStyle = U.rgba('#000000', .35); c.lineWidth = S * .03;
      c.beginPath(); c.moveTo(-S * .44, S * .1); c.lineTo(S * .44, S * .1); c.stroke();
      /* 발광 코어 */
      const pulse = .55 + Math.sin(t * 4) * .45;
      c.fillStyle = GFX.radial(c, 0, -S * .05, S * .26, U.rgba(R.hi, .95), U.rgba(R.hi, 0));
      c.beginPath(); c.arc(0, -S * .05, S * .26, 0, U.TAU); c.fill();
      c.fillStyle = R.hi; c.globalAlpha = .6 + pulse * .4;
      c.beginPath(); c.arc(0, -S * .05, S * .1, 0, U.TAU); c.fill();
      c.globalAlpha = 1;
      /* 리벳 */
      c.fillStyle = R.deep;
      for (const dx of [-.34, .34]) for (const dy of [-.24, .38]) {
        c.beginPath(); c.arc(dx * S, dy * S, S * .035, 0, U.TAU); c.fill();
      }
    },
    /** 근육질 거구 */
    brute(c, S, R) {
      const p = new Path2D();
      p.moveTo(-S * .5, -S * .28);
      p.quadraticCurveTo(-S * .62, S * .16, -S * .38, S * .52);
      p.lineTo(S * .38, S * .52);
      p.quadraticCurveTo(S * .62, S * .16, S * .5, -S * .28);
      p.quadraticCurveTo(0, -S * .46, -S * .5, -S * .28);
      c.fillStyle = GFX.vgrad(c, 0, -S * .4, S * .52, R.lit, R.sh);
      c.fill(p);
      c.strokeStyle = R.line; c.lineWidth = S * .05; c.stroke(p);
      /* 복근 라인 */
      c.strokeStyle = U.rgba('#000000', .22); c.lineWidth = S * .035;
      for (let i = 0; i < 2; i++) {
        c.beginPath(); c.moveTo(-S * .2, S * (.06 + i * .16)); c.lineTo(S * .2, S * (.06 + i * .16)); c.stroke();
      }
      c.beginPath(); c.moveTo(0, -S * .06); c.lineTo(0, S * .4); c.stroke();
    },
    /** 젤리/슬라임 */
    blob(c, S, R, t) {
      const sq = 1 + Math.sin(t * 5.2) * .12;
      const p = new Path2D();
      p.ellipse(0, S * .18, S * .58 / sq, S * .52 * sq, 0, 0, U.TAU);
      c.fillStyle = GFX.radial(c, -S * .16, S * .02, S * .7, R.lit, R.sh);
      c.fill(p);
      c.strokeStyle = U.rgba(R.line, .7); c.lineWidth = S * .04; c.stroke(p);
      /* 하이라이트 */
      c.fillStyle = 'rgba(255,255,255,.55)';
      c.beginPath(); c.ellipse(-S * .2, -S * .08, S * .12, S * .08, -.5, 0, U.TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.25)';
      c.beginPath(); c.ellipse(S * .14, S * .26, S * .16, S * .1, .3, 0, U.TAU); c.fill();
    },
    /** 곤충 껍질 */
    chitin(c, S, R, t) {
      c.fillStyle = GFX.vgrad(c, 0, -S * .3, S * .5, R.lit, R.deep);
      c.beginPath(); c.ellipse(0, S * .2, S * .48, S * .4, 0, 0, U.TAU); c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .045; c.stroke();
      c.strokeStyle = U.rgba('#000000', .3); c.lineWidth = S * .03;
      for (let i = 0; i < 3; i++) {
        c.beginPath(); c.ellipse(0, S * .2, S * (.44 - i * .12), S * (.36 - i * .1), 0, .4, Math.PI - .4); c.stroke();
      }
    },
    /** 결정체 */
    crystal(c, S, R, t) {
      c.save(); c.rotate(Math.sin(t * .8) * .12);
      const p = new Path2D();
      p.moveTo(0, -S * .5); p.lineTo(S * .4, -S * .06); p.lineTo(S * .24, S * .5);
      p.lineTo(-S * .24, S * .5); p.lineTo(-S * .4, -S * .06); p.closePath();
      c.fillStyle = GFX.vgrad(c, 0, -S * .5, S * .5, R.hi, R.sh);
      c.fill(p);
      c.strokeStyle = R.line; c.lineWidth = S * .04; c.stroke(p);
      c.fillStyle = 'rgba(255,255,255,.4)';
      c.beginPath(); c.moveTo(0, -S * .46); c.lineTo(S * .14, -S * .04); c.lineTo(-S * .04, S * .3); c.lineTo(-S * .1, -S * .04); c.fill();
      c.restore();
    },
    /** 뼈대 */
    bone(c, S, R) {
      c.strokeStyle = R.hi; c.lineWidth = S * .12; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -S * .28); c.lineTo(0, S * .4); c.stroke();
      c.strokeStyle = R.base; c.lineWidth = S * .09;
      for (let i = 0; i < 4; i++) {
        const y = -S * .18 + i * S * .15;
        const w = S * (.3 - Math.abs(i - 1.5) * .05);
        c.beginPath(); c.moveTo(-w, y); c.quadraticCurveTo(0, y + S * .05, w, y); c.stroke();
      }
      c.fillStyle = R.sh;
      c.beginPath(); c.ellipse(0, S * .44, S * .22, S * .12, 0, 0, U.TAU); c.fill();
    },
    /** 드래곤 흉부 */
    scaled(c, S, R, t) {
      const p = new Path2D();
      p.moveTo(-S * .4, -S * .3);
      p.quadraticCurveTo(-S * .5, S * .2, -S * .3, S * .55);
      p.lineTo(S * .3, S * .55);
      p.quadraticCurveTo(S * .5, S * .2, S * .4, -S * .3);
      p.closePath();
      c.fillStyle = GFX.vgrad(c, 0, -S * .3, S * .55, R.lit, R.deep);
      c.fill(p);
      c.strokeStyle = R.line; c.lineWidth = S * .05; c.stroke(p);
      /* 배 비늘 */
      c.fillStyle = U.rgba('#ffe9c0', .55);
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.ellipse(0, S * (-.12 + i * .17), S * .17, S * .07, 0, 0, U.TAU); c.fill();
      }
      /* 비늘 무늬 */
      c.strokeStyle = U.rgba('#000000', .2); c.lineWidth = S * .022;
      for (let row = 0; row < 3; row++) for (let col = -1; col <= 1; col++) {
        c.beginPath();
        c.arc(col * S * .2 + (row % 2 ? S * .1 : 0), S * (-.16 + row * .18), S * .1, Math.PI, 0);
        c.stroke();
      }
    },
    /** 영체 */
    spectral(c, S, R, t) {
      const w = S * (.44 + Math.sin(t * 2.4) * .03);
      const p = new Path2D();
      p.moveTo(0, -S * .4);
      p.quadraticCurveTo(w, -S * .1, w * .8, S * .45);
      p.quadraticCurveTo(0, S * .6, -w * .8, S * .45);
      p.quadraticCurveTo(-w, -S * .1, 0, -S * .4);
      c.globalAlpha = .85;
      c.fillStyle = GFX.vgrad(c, 0, -S * .4, S * .5, R.hi, U.rgba(R.base, .25));
      c.fill(p);
      c.globalAlpha = 1;
      c.strokeStyle = U.rgba(R.hi, .6); c.lineWidth = S * .035; c.stroke(p);
    },
  },

  /* ===================================================================
   *  3. 캐릭터 파츠 — 팔 (무기를 든 팔은 aim 방향으로 회전)
   * =================================================================== */
  drawArm(c, S, R, sx, sy, ang, len, thick, hand) {
    const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
    const mx = sx + Math.cos(ang - .5) * len * .55, my = sy + Math.sin(ang - .5) * len * .55;
    c.strokeStyle = R.sh; c.lineWidth = thick * 1.35; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
    c.strokeStyle = R.base; c.lineWidth = thick;
    c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
    if (hand !== false) {
      c.fillStyle = R.hi;
      c.beginPath(); c.arc(ex, ey, thick * .62, 0, U.TAU); c.fill();
      c.strokeStyle = R.line; c.lineWidth = thick * .2; c.stroke();
    }
    return { x: ex, y: ey };
  },

  /* ===================================================================
   *  4. 캐릭터 파츠 — 머리 / 얼굴 / 헤어
   * =================================================================== */
  head: {
    human(c, S, skin, t, blink) {
      const R = GFX.ramp(skin);
      const p = new Path2D();
      p.ellipse(0, 0, S * .27, S * .3, 0, 0, U.TAU);
      c.fillStyle = GFX.radial(c, -S * .08, -S * .1, S * .42, R.hi, R.base);
      c.fill(p);
      c.strokeStyle = R.line; c.lineWidth = S * .04; c.stroke(p);
      /* 볼 */
      c.fillStyle = 'rgba(255,140,140,.28)';
      c.beginPath(); c.arc(-S * .16, S * .07, S * .06, 0, U.TAU); c.fill();
      c.beginPath(); c.arc(S * .16, S * .07, S * .06, 0, U.TAU); c.fill();
    },
    skull(c, S, skin, t) {
      const R = GFX.ramp('#f2efe2');
      const p = new Path2D();
      p.moveTo(-S * .26, -S * .04);
      p.quadraticCurveTo(-S * .3, -S * .34, 0, -S * .34);
      p.quadraticCurveTo(S * .3, -S * .34, S * .26, -S * .04);
      p.quadraticCurveTo(S * .2, S * .16, S * .1, S * .2);
      p.lineTo(-S * .1, S * .2);
      p.quadraticCurveTo(-S * .2, S * .16, -S * .26, -S * .04);
      c.fillStyle = GFX.vgrad(c, 0, -S * .34, S * .2, R.hi, R.sh);
      c.fill(p); c.strokeStyle = R.line; c.lineWidth = S * .035; c.stroke(p);
      /* 눈구멍 */
      c.fillStyle = '#0a0a10';
      c.beginPath(); c.ellipse(-S * .11, -S * .04, S * .075, S * .085, .2, 0, U.TAU); c.fill();
      c.beginPath(); c.ellipse(S * .11, -S * .04, S * .075, S * .085, -.2, 0, U.TAU); c.fill();
      /* 발광 눈 */
      const gl = .5 + Math.sin(t * 3) * .5;
      c.fillStyle = `rgba(255,90,60,${.5 + gl * .5})`;
      c.beginPath(); c.arc(-S * .11, -S * .04, S * .03, 0, U.TAU); c.arc(S * .11, -S * .04, S * .03, 0, U.TAU); c.fill();
      /* 이빨 */
      c.strokeStyle = R.line; c.lineWidth = S * .02;
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * S * .045, S * .1); c.lineTo(i * S * .045, S * .2); c.stroke(); }
    },
    beastHead(c, S, skin, t) {
      const R = GFX.ramp(skin);
      c.fillStyle = GFX.vgrad(c, 0, -S * .3, S * .2, R.lit, R.sh);
      c.beginPath(); c.ellipse(0, 0, S * .3, S * .26, 0, 0, U.TAU); c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .04; c.stroke();
      /* 주둥이 */
      c.fillStyle = R.hi;
      c.beginPath(); c.ellipse(S * .2, S * .06, S * .16, S * .11, 0, 0, U.TAU); c.fill();
      c.strokeStyle = R.line; c.stroke();
      c.fillStyle = '#2a2028';
      c.beginPath(); c.arc(S * .33, S * .04, S * .045, 0, U.TAU); c.fill();
      /* 귀 */
      for (const d of [-1, 1]) {
        c.fillStyle = R.base;
        c.beginPath(); c.moveTo(d * S * .12, -S * .2);
        c.lineTo(d * S * .3, -S * .46); c.lineTo(d * S * .26, -S * .12); c.closePath(); c.fill();
        c.strokeStyle = R.line; c.lineWidth = S * .03; c.stroke();
      }
    },
    orb(c, S, skin, t) {
      const R = GFX.ramp(skin);
      const pulse = .5 + Math.sin(t * 3.4) * .5;
      c.fillStyle = GFX.radial(c, 0, 0, S * .4, U.rgba(R.hi, .9), U.rgba(R.base, 0));
      c.beginPath(); c.arc(0, 0, S * .4, 0, U.TAU); c.fill();
      c.fillStyle = R.hi; c.globalAlpha = .7 + pulse * .3;
      c.beginPath(); c.arc(0, 0, S * .17, 0, U.TAU); c.fill();
      c.globalAlpha = 1;
      c.strokeStyle = U.rgba('#ffffff', .6); c.lineWidth = S * .025;
      c.beginPath(); c.arc(0, 0, S * .24, t * 1.4, t * 1.4 + 2.2); c.stroke();
    },
    demonHead(c, S, skin, t) {
      const R = GFX.ramp(skin);
      c.fillStyle = GFX.vgrad(c, 0, -S * .32, S * .24, R.lit, R.deep);
      c.beginPath();
      c.moveTo(-S * .26, -S * .06); c.quadraticCurveTo(-S * .28, -S * .32, 0, -S * .32);
      c.quadraticCurveTo(S * .28, -S * .32, S * .26, -S * .06);
      c.quadraticCurveTo(S * .18, S * .24, 0, S * .26);
      c.quadraticCurveTo(-S * .18, S * .24, -S * .26, -S * .06);
      c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .04; c.stroke();
      /* 사악한 눈 */
      c.fillStyle = '#ffe14d'; c.shadowColor = '#ff8a2a'; c.shadowBlur = S * .3;
      c.beginPath(); c.moveTo(-S * .2, -S * .06); c.lineTo(-S * .04, -S * .02); c.lineTo(-S * .2, S * .04); c.fill();
      c.beginPath(); c.moveTo(S * .2, -S * .06); c.lineTo(S * .04, -S * .02); c.lineTo(S * .2, S * .04); c.fill();
      c.shadowBlur = 0;
    },
    dragonHead(c, S, skin, t) {
      const R = GFX.ramp(skin);
      c.fillStyle = GFX.vgrad(c, 0, -S * .3, S * .3, R.lit, R.sh);
      c.beginPath(); c.ellipse(0, 0, S * .28, S * .24, 0, 0, U.TAU); c.fill();
      c.beginPath(); c.moveTo(S * .1, -S * .06);
      c.quadraticCurveTo(S * .52, -S * .02, S * .5, S * .12);
      c.quadraticCurveTo(S * .3, S * .2, S * .1, S * .14); c.closePath(); c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .035; c.stroke();
      /* 콧구멍 & 눈 */
      c.fillStyle = R.deep;
      c.beginPath(); c.arc(S * .44, S * .04, S * .025, 0, U.TAU); c.fill();
      c.fillStyle = '#ffd24d'; c.shadowColor = '#ff9a2a'; c.shadowBlur = S * .25;
      c.beginPath(); c.ellipse(S * .04, -S * .06, S * .07, S * .045, -.3, 0, U.TAU); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#1a1016';
      c.beginPath(); c.ellipse(S * .05, -S * .06, S * .02, S * .04, 0, 0, U.TAU); c.fill();
    },
    machine(c, S, skin, t) {
      const R = GFX.ramp(skin);
      c.fillStyle = GFX.metal(c, -S * .26, -S * .26, S * .26, S * .22, R);
      c.beginPath(); c.roundRect(-S * .26, -S * .26, S * .52, S * .48, S * .1); c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .04; c.stroke();
      /* 스캔 아이 */
      c.fillStyle = '#0d1018';
      c.beginPath(); c.roundRect(-S * .21, -S * .12, S * .42, S * .16, S * .05); c.fill();
      const scan = (Math.sin(t * 2.2) * .5 + .5);
      c.fillStyle = '#6ff0ff'; c.shadowColor = '#6ff0ff'; c.shadowBlur = S * .3;
      c.beginPath(); c.roundRect(-S * .19 + scan * S * .26, -S * .1, S * .1, S * .12, S * .04); c.fill();
      c.shadowBlur = 0;
      /* 안테나 */
      c.strokeStyle = R.sh; c.lineWidth = S * .03;
      c.beginPath(); c.moveTo(S * .18, -S * .26); c.lineTo(S * .26, -S * .44); c.stroke();
      c.fillStyle = '#ff5a5a';
      c.beginPath(); c.arc(S * .26, -S * .46, S * .04, 0, U.TAU); c.fill();
    },
    insectHead(c, S, skin, t) {
      const R = GFX.ramp(skin);
      c.fillStyle = GFX.vgrad(c, 0, -S * .26, S * .18, R.lit, R.deep);
      c.beginPath(); c.ellipse(0, 0, S * .24, S * .21, 0, 0, U.TAU); c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .035; c.stroke();
      /* 겹눈 */
      for (const d of [-1, 1]) {
        c.fillStyle = '#1b1020';
        c.beginPath(); c.ellipse(d * S * .12, -S * .04, S * .09, S * .11, d * .3, 0, U.TAU); c.fill();
        c.fillStyle = 'rgba(255,90,140,.7)';
        c.beginPath(); c.ellipse(d * S * .13, -S * .07, S * .04, S * .05, 0, 0, U.TAU); c.fill();
      }
      /* 더듬이 */
      c.strokeStyle = R.sh; c.lineWidth = S * .028; c.lineCap = 'round';
      for (const d of [-1, 1]) {
        c.beginPath(); c.moveTo(d * S * .1, -S * .18);
        c.quadraticCurveTo(d * S * .3, -S * .42, d * S * .16, -S * .5); c.stroke();
      }
    },
    none() { },
  },

  hair: {
    none() { },
    short(c, S, col) {
      const R = GFX.ramp(col);
      c.fillStyle = R.base;
      c.beginPath();
      c.moveTo(-S * .28, -S * .04);
      c.quadraticCurveTo(-S * .32, -S * .38, 0, -S * .36);
      c.quadraticCurveTo(S * .32, -S * .38, S * .28, -S * .04);
      c.quadraticCurveTo(S * .16, -S * .2, 0, -S * .17);
      c.quadraticCurveTo(-S * .16, -S * .2, -S * .28, -S * .04);
      c.fill();
      c.fillStyle = U.rgba('#ffffff', .22);
      c.beginPath(); c.ellipse(-S * .1, -S * .26, S * .1, S * .05, -.4, 0, U.TAU); c.fill();
    },
    long(c, S, col, t) {
      const R = GFX.ramp(col);
      const sway = Math.sin(t * 1.8) * S * .03;
      c.fillStyle = R.sh;
      c.beginPath();
      c.moveTo(-S * .28, -S * .1);
      c.quadraticCurveTo(-S * .42 + sway, S * .3, -S * .3 + sway, S * .6);
      c.lineTo(S * .3 + sway, S * .6);
      c.quadraticCurveTo(S * .42 + sway, S * .3, S * .28, -S * .1);
      c.fill();
      GFX.hair.short(c, S, col);
    },
    pony(c, S, col, t) {
      const R = GFX.ramp(col);
      const sw = Math.sin(t * 3) * S * .06;
      c.strokeStyle = R.base; c.lineWidth = S * .13; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-S * .2, -S * .18);
      c.quadraticCurveTo(-S * .5 + sw, S * .0, -S * .42 + sw, S * .34); c.stroke();
      GFX.hair.short(c, S, col);
    },
    spiky(c, S, col) {
      const R = GFX.ramp(col);
      c.fillStyle = R.base;
      c.beginPath();
      c.moveTo(-S * .3, -S * .04);
      for (let i = 0; i <= 5; i++) {
        const x = -S * .3 + (S * .6) * (i / 5);
        c.lineTo(x + S * .05, -S * .5 - (i % 2 ? S * .06 : 0));
        c.lineTo(x + S * .11, -S * .16);
      }
      c.lineTo(S * .3, -S * .04); c.closePath(); c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .025; c.stroke();
    },
    braid(c, S, col, t) {
      const R = GFX.ramp(col);
      GFX.hair.short(c, S, col);
      c.fillStyle = R.sh;
      for (const d of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          c.ellipse(d * S * (.3 + i * .02), S * (.02 + i * .16), S * .08, S * .1, 0, 0, U.TAU);
          c.fill();
        }
      }
    },
    flame(c, S, col, t) {
      c.save();
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI + (i / 6) * Math.PI;
        const h = S * (.36 + Math.sin(t * 8 + i) * .1);
        c.fillStyle = i % 2 ? '#ff9a3a' : '#ffd24d';
        c.globalAlpha = .85;
        c.beginPath();
        c.moveTo(Math.cos(a) * S * .26, Math.sin(a) * S * .2 - S * .06);
        c.quadraticCurveTo(Math.cos(a) * S * .32, -S * .3 - h, Math.cos(a) * S * .1, -S * .2 - h * .5);
        c.quadraticCurveTo(Math.cos(a) * S * .12, -S * .1, Math.cos(a) * S * .26, Math.sin(a) * S * .2 - S * .06);
        c.fill();
      }
      c.globalAlpha = 1; c.restore();
    },
    ice(c, S, col, t) {
      c.fillStyle = 'rgba(190,240,255,.85)';
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(i * S * .12, -S * .16);
        c.lineTo(i * S * .12 + S * .05, -S * .52 - Math.abs(i) * -S * .04);
        c.lineTo(i * S * .12 + S * .1, -S * .16);
        c.fill();
      }
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = S * .02; c.stroke();
    },
  },

  /* ===================================================================
   *  5. 캐릭터 파츠 — 헤드기어
   * =================================================================== */
  gear: {
    none() { },
    hood(c, S, R) {
      c.fillStyle = GFX.vgrad(c, 0, -S * .5, S * .1, R.lit, R.deep);
      c.beginPath();
      c.moveTo(-S * .34, S * .06);
      c.quadraticCurveTo(-S * .4, -S * .46, 0, -S * .46);
      c.quadraticCurveTo(S * .4, -S * .46, S * .34, S * .06);
      c.quadraticCurveTo(S * .2, -S * .06, 0, -S * .06);
      c.quadraticCurveTo(-S * .2, -S * .06, -S * .34, S * .06);
      c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .04; c.stroke();
      /* 그늘 */
      c.fillStyle = 'rgba(0,0,0,.55)';
      c.beginPath(); c.ellipse(0, -S * .08, S * .2, S * .13, 0, 0, U.TAU); c.fill();
      /* 눈빛 */
      c.fillStyle = U.rgba(R.hi, .95);
      c.beginPath(); c.arc(-S * .08, -S * .08, S * .035, 0, U.TAU); c.arc(S * .08, -S * .08, S * .035, 0, U.TAU); c.fill();
    },
    helm(c, S, R) {
      c.fillStyle = GFX.metal(c, -S * .3, -S * .48, S * .3, S * .1, R);
      c.beginPath();
      c.moveTo(-S * .3, S * .02);
      c.quadraticCurveTo(-S * .34, -S * .46, 0, -S * .46);
      c.quadraticCurveTo(S * .34, -S * .46, S * .3, S * .02);
      c.lineTo(S * .3, S * .1); c.lineTo(-S * .3, S * .1); c.closePath();
      c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .045; c.stroke();
      /* 눈구멍 */
      c.fillStyle = '#0b0e14';
      c.beginPath(); c.roundRect(-S * .22, -S * .14, S * .44, S * .1, S * .04); c.fill();
      c.fillStyle = '#ff6b4d';
      c.beginPath(); c.arc(-S * .1, -S * .09, S * .025, 0, U.TAU); c.arc(S * .1, -S * .09, S * .025, 0, U.TAU); c.fill();
      /* 볏 */
      c.fillStyle = '#d94a4a';
      c.beginPath(); c.moveTo(0, -S * .46); c.quadraticCurveTo(S * .04, -S * .74, -S * .16, -S * .72);
      c.quadraticCurveTo(-S * .04, -S * .58, -S * .04, -S * .46); c.fill();
    },
    crown(c, S, R) {
      const G = GFX.ramp('#ffd24d');
      c.fillStyle = GFX.metal(c, -S * .3, -S * .6, S * .3, -S * .2, G);
      c.beginPath();
      c.moveTo(-S * .3, -S * .26); c.lineTo(-S * .3, -S * .5);
      c.lineTo(-S * .15, -S * .36); c.lineTo(0, -S * .64);
      c.lineTo(S * .15, -S * .36); c.lineTo(S * .3, -S * .5); c.lineTo(S * .3, -S * .26);
      c.closePath(); c.fill();
      c.strokeStyle = G.line; c.lineWidth = S * .035; c.stroke();
      /* 보석 */
      const gems = ['#ff4d6d', '#4ea8ff', '#5ce07a'];
      gems.forEach((gc, i) => {
        c.fillStyle = gc; c.shadowColor = gc; c.shadowBlur = S * .2;
        c.beginPath(); c.arc((i - 1) * S * .16, -S * .33, S * .045, 0, U.TAU); c.fill();
      });
      c.shadowBlur = 0;
    },
    halo(c, S, R, t) {
      const p = .6 + Math.sin(t * 2.2) * .4;
      c.strokeStyle = `rgba(255,238,170,${.6 + p * .4})`;
      c.lineWidth = S * .07;
      c.shadowColor = '#ffe9a0'; c.shadowBlur = S * .5 * p;
      c.beginPath(); c.ellipse(0, -S * .56, S * .3, S * .1, 0, 0, U.TAU); c.stroke();
      c.shadowBlur = 0;
    },
    horns(c, S, R) {
      const H = GFX.ramp('#f0e6d0');
      for (const d of [-1, 1]) {
        c.fillStyle = GFX.vgrad(c, 0, -S * .7, -S * .2, H.hi, H.sh);
        c.beginPath();
        c.moveTo(d * S * .2, -S * .26);
        c.quadraticCurveTo(d * S * .56, -S * .5, d * S * .34, -S * .78);
        c.quadraticCurveTo(d * S * .3, -S * .5, d * S * .1, -S * .3);
        c.closePath(); c.fill();
        c.strokeStyle = H.line; c.lineWidth = S * .03; c.stroke();
      }
    },
    antlers(c, S, R) {
      c.strokeStyle = '#d9c9a8'; c.lineWidth = S * .05; c.lineCap = 'round';
      for (const d of [-1, 1]) {
        c.beginPath();
        c.moveTo(d * S * .16, -S * .3);
        c.quadraticCurveTo(d * S * .4, -S * .6, d * S * .3, -S * .84); c.stroke();
        c.beginPath(); c.moveTo(d * S * .3, -S * .56); c.lineTo(d * S * .52, -S * .66); c.stroke();
        c.beginPath(); c.moveTo(d * S * .32, -S * .7); c.lineTo(d * S * .5, -S * .84); c.stroke();
      }
    },
    wizardHat(c, S, R) {
      c.fillStyle = GFX.vgrad(c, 0, -S * .95, -S * .2, R.lit, R.deep);
      c.beginPath();
      c.moveTo(-S * .3, -S * .28);
      c.quadraticCurveTo(-S * .06, -S * .8, S * .24, -S * .96);
      c.quadraticCurveTo(S * .16, -S * .5, S * .3, -S * .28);
      c.closePath(); c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .04; c.stroke();
      /* 챙 */
      c.fillStyle = R.sh;
      c.beginPath(); c.ellipse(0, -S * .26, S * .44, S * .1, 0, 0, U.TAU); c.fill();
      c.strokeStyle = R.line; c.stroke();
      /* 별 장식 */
      c.fillStyle = '#ffd24d';
      GFX.star(c, S * .06, -S * .58, S * .07, 5);
    },
    visor(c, S, R) {
      c.fillStyle = GFX.metal(c, -S * .3, -S * .3, S * .3, S * .05, R);
      c.beginPath(); c.roundRect(-S * .3, -S * .34, S * .6, S * .26, S * .08); c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .035; c.stroke();
      c.fillStyle = 'rgba(120,240,255,.85)'; c.shadowColor = '#6ff0ff'; c.shadowBlur = S * .3;
      c.beginPath(); c.roundRect(-S * .24, -S * .27, S * .48, S * .1, S * .04); c.fill();
      c.shadowBlur = 0;
    },
    mask(c, S, R) {
      c.fillStyle = R.deep;
      c.beginPath(); c.roundRect(-S * .27, -S * .1, S * .54, S * .24, S * .06); c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .03; c.stroke();
      c.fillStyle = '#ff4d6d';
      c.beginPath(); c.moveTo(-S * .18, -S * .02); c.lineTo(-S * .02, S * .02); c.lineTo(-S * .18, S * .06); c.fill();
      c.beginPath(); c.moveTo(S * .18, -S * .02); c.lineTo(S * .02, S * .02); c.lineTo(S * .18, S * .06); c.fill();
    },
    plague(c, S, R) {
      c.fillStyle = GFX.vgrad(c, 0, -S * .4, S * .2, R.lit, R.deep);
      c.beginPath(); c.ellipse(0, -S * .12, S * .28, S * .3, 0, 0, U.TAU); c.fill();
      c.fillStyle = R.sh;
      c.beginPath(); c.moveTo(0, -S * .12); c.quadraticCurveTo(S * .34, S * .0, S * .38, S * .26);
      c.quadraticCurveTo(S * .1, S * .12, 0, S * .1); c.closePath(); c.fill();
      c.strokeStyle = R.line; c.lineWidth = S * .03; c.stroke();
      c.fillStyle = '#c8f0ff';
      c.beginPath(); c.arc(-S * .1, -S * .16, S * .06, 0, U.TAU); c.arc(S * .1, -S * .16, S * .06, 0, U.TAU); c.fill();
      c.fillStyle = '#20242e';
      c.beginPath(); c.arc(-S * .1, -S * .16, S * .03, 0, U.TAU); c.arc(S * .1, -S * .16, S * .03, 0, U.TAU); c.fill();
    },
    laurel(c, S, R) {
      c.strokeStyle = '#7fd07f'; c.lineWidth = S * .04;
      for (const d of [-1, 1]) {
        c.beginPath(); c.arc(0, -S * .18, S * .36, d > 0 ? -2.5 : -.65, d > 0 ? -.65 : -2.5, d < 0); c.stroke();
        for (let i = 0; i < 4; i++) {
          const a = -2.3 + i * .45;
          const x = Math.cos(a) * S * .36 * d, y = -S * .18 + Math.sin(a) * S * .36;
          c.fillStyle = '#6fc46f';
          c.beginPath(); c.ellipse(x, y, S * .07, S * .035, a, 0, U.TAU); c.fill();
        }
      }
    },
  },

  /* ===================================================================
   *  6. 캐릭터 파츠 — 무기 (손 위치 기준, aim 방향 회전 적용됨)
   * =================================================================== */
  weapon: {
    none() { },
    bow(c, S, col) {
      const W = GFX.ramp('#c8a05a');
      c.strokeStyle = W.sh; c.lineWidth = S * .1; c.lineCap = 'round';
      c.beginPath(); c.arc(S * .06, 0, S * .46, -1.25, 1.25); c.stroke();
      c.strokeStyle = W.hi; c.lineWidth = S * .05;
      c.beginPath(); c.arc(S * .06, 0, S * .46, -1.25, 1.25); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = S * .022;
      const ex = S * .06 + Math.cos(1.25) * S * .46, ey = Math.sin(1.25) * S * .46;
      c.beginPath(); c.moveTo(ex, -ey); c.lineTo(ex - S * .12, 0); c.lineTo(ex, ey); c.stroke();
      /* 장전된 화살 */
      c.strokeStyle = col; c.lineWidth = S * .04;
      c.beginPath(); c.moveTo(ex - S * .12, 0); c.lineTo(S * .5, 0); c.stroke();
    },
    crossbow(c, S, col) {
      const W = GFX.ramp('#8a6a3a');
      c.fillStyle = W.base;
      c.beginPath(); c.roundRect(-S * .1, -S * .06, S * .62, S * .12, S * .04); c.fill();
      c.strokeStyle = W.line; c.lineWidth = S * .025; c.stroke();
      c.strokeStyle = GFX.ramp('#5a6470').sh; c.lineWidth = S * .06;
      c.beginPath(); c.moveTo(S * .3, -S * .3); c.quadraticCurveTo(S * .42, 0, S * .3, S * .3); c.stroke();
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = S * .2;
      c.beginPath(); c.moveTo(S * .56, 0); c.lineTo(S * .44, -S * .07); c.lineTo(S * .44, S * .07); c.fill();
      c.shadowBlur = 0;
    },
    rifle(c, S, col) {
      const M = GFX.ramp('#39414f');
      c.fillStyle = GFX.metal(c, -S * .1, -S * .08, S * .7, S * .08, M);
      c.beginPath(); c.roundRect(-S * .16, -S * .06, S * .86, S * .12, S * .03); c.fill();
      c.strokeStyle = M.line; c.lineWidth = S * .025; c.stroke();
      c.fillStyle = M.deep;
      c.beginPath(); c.roundRect(-S * .2, -S * .02, S * .22, S * .22, S * .05); c.fill();
      /* 조준경 */
      c.fillStyle = M.sh;
      c.beginPath(); c.roundRect(S * .12, -S * .16, S * .26, S * .1, S * .03); c.fill();
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = S * .25;
      c.beginPath(); c.arc(S * .68, 0, S * .05, 0, U.TAU); c.fill();
      c.shadowBlur = 0;
    },
    staff(c, S, col, t) {
      const W = GFX.ramp('#8a6a3a');
      c.strokeStyle = W.sh; c.lineWidth = S * .09; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-S * .3, S * .3); c.lineTo(S * .32, -S * .5); c.stroke();
      c.strokeStyle = W.hi; c.lineWidth = S * .04;
      c.beginPath(); c.moveTo(-S * .3, S * .3); c.lineTo(S * .32, -S * .5); c.stroke();
      /* 보석 감싼 발톱 */
      const p = .6 + Math.sin(t * 4) * .4;
      c.strokeStyle = W.deep; c.lineWidth = S * .05;
      c.beginPath(); c.arc(S * .36, -S * .58, S * .14, .6, 5.2); c.stroke();
      c.fillStyle = GFX.radial(c, S * .36, -S * .58, S * .26, col, U.rgba(col, 0));
      c.beginPath(); c.arc(S * .36, -S * .58, S * .26, 0, U.TAU); c.fill();
      c.fillStyle = '#fff'; c.globalAlpha = .5 + p * .5;
      c.beginPath(); c.arc(S * .36, -S * .58, S * .07, 0, U.TAU); c.fill();
      c.globalAlpha = 1;
    },
    wand(c, S, col, t) {
      c.strokeStyle = GFX.ramp('#6a5a3a').base; c.lineWidth = S * .06; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-S * .16, S * .2); c.lineTo(S * .34, -S * .18); c.stroke();
      c.fillStyle = GFX.radial(c, S * .38, -S * .22, S * .2, col, U.rgba(col, 0));
      c.beginPath(); c.arc(S * .38, -S * .22, S * .2, 0, U.TAU); c.fill();
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + i / 3 * U.TAU;
        c.fillStyle = col;
        c.beginPath(); c.arc(S * .38 + Math.cos(a) * S * .14, -S * .22 + Math.sin(a) * S * .14, S * .025, 0, U.TAU); c.fill();
      }
    },
    sword(c, S, col) {
      const M = GFX.ramp('#dfe7f2');
      c.fillStyle = GFX.metal(c, -S * .1, -S * .1, S * .6, S * .1, M);
      c.beginPath();
      c.moveTo(S * .04, -S * .07); c.lineTo(S * .56, -S * .05);
      c.lineTo(S * .66, 0); c.lineTo(S * .56, S * .05); c.lineTo(S * .04, S * .07);
      c.closePath(); c.fill();
      c.strokeStyle = M.line; c.lineWidth = S * .025; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = S * .02;
      c.beginPath(); c.moveTo(S * .08, 0); c.lineTo(S * .54, 0); c.stroke();
      /* 가드 & 손잡이 */
      c.fillStyle = GFX.ramp(col).base;
      c.beginPath(); c.roundRect(-S * .02, -S * .16, S * .07, S * .32, S * .03); c.fill();
      c.fillStyle = '#5a4636';
      c.beginPath(); c.roundRect(-S * .2, -S * .045, S * .19, S * .09, S * .03); c.fill();
      c.fillStyle = GFX.ramp(col).hi;
      c.beginPath(); c.arc(-S * .22, 0, S * .06, 0, U.TAU); c.fill();
    },
    greatsword(c, S, col) {
      const M = GFX.ramp('#cfd8e6');
      c.fillStyle = GFX.metal(c, 0, -S * .16, S * .8, S * .16, M);
      c.beginPath();
      c.moveTo(S * .02, -S * .13); c.lineTo(S * .64, -S * .1);
      c.lineTo(S * .82, 0); c.lineTo(S * .64, S * .1); c.lineTo(S * .02, S * .13);
      c.closePath(); c.fill();
      c.strokeStyle = M.line; c.lineWidth = S * .03; c.stroke();
      c.fillStyle = U.rgba(col, .55);
      c.beginPath(); c.moveTo(S * .1, 0); c.lineTo(S * .6, -S * .04); c.lineTo(S * .6, S * .04); c.fill();
      c.fillStyle = GFX.ramp(col).base;
      c.beginPath(); c.roundRect(-S * .04, -S * .24, S * .09, S * .48, S * .04); c.fill();
      c.fillStyle = '#4a3a2a';
      c.beginPath(); c.roundRect(-S * .26, -S * .05, S * .24, S * .1, S * .04); c.fill();
    },
    spear(c, S, col) {
      c.strokeStyle = GFX.ramp('#8a6a3a').base; c.lineWidth = S * .06;
      c.beginPath(); c.moveTo(-S * .35, S * .1); c.lineTo(S * .5, -S * .1); c.stroke();
      const M = GFX.ramp('#e6edf7');
      c.fillStyle = GFX.metal(c, S * .4, -S * .2, S * .8, 0, M);
      c.beginPath();
      c.moveTo(S * .82, -S * .16); c.lineTo(S * .5, -S * .22); c.lineTo(S * .48, -S * .02); c.closePath();
      c.fill(); c.strokeStyle = M.line; c.lineWidth = S * .022; c.stroke();
      c.fillStyle = U.rgba(col, .8);
      c.beginPath(); c.arc(S * .46, -S * .1, S * .05, 0, U.TAU); c.fill();
    },
    halberd(c, S, col) {
      c.strokeStyle = GFX.ramp('#6a5030').base; c.lineWidth = S * .07;
      c.beginPath(); c.moveTo(-S * .34, S * .3); c.lineTo(S * .4, -S * .48); c.stroke();
      const M = GFX.ramp('#d8e2ee');
      c.fillStyle = GFX.metal(c, S * .2, -S * .7, S * .6, -S * .2, M);
      c.beginPath();
      c.moveTo(S * .42, -S * .5); c.quadraticCurveTo(S * .74, -S * .44, S * .66, -S * .12);
      c.quadraticCurveTo(S * .5, -S * .26, S * .38, -S * .3); c.closePath(); c.fill();
      c.strokeStyle = M.line; c.lineWidth = S * .025; c.stroke();
      c.beginPath(); c.moveTo(S * .44, -S * .52); c.lineTo(S * .5, -S * .78); c.lineTo(S * .36, -S * .54); c.fill();
    },
    axe(c, S, col) {
      c.strokeStyle = GFX.ramp('#7a5a34').base; c.lineWidth = S * .07;
      c.beginPath(); c.moveTo(-S * .28, S * .28); c.lineTo(S * .34, -S * .34); c.stroke();
      const M = GFX.ramp('#c9d4e2');
      c.fillStyle = GFX.metal(c, S * .1, -S * .6, S * .7, 0, M);
      c.beginPath();
      c.moveTo(S * .3, -S * .32);
      c.quadraticCurveTo(S * .78, -S * .5, S * .68, -S * .02);
      c.quadraticCurveTo(S * .46, -S * .1, S * .26, -S * .18);
      c.closePath(); c.fill();
      c.strokeStyle = M.line; c.lineWidth = S * .028; c.stroke();
      c.fillStyle = U.rgba(col, .45);
      c.beginPath(); c.arc(S * .5, -S * .26, S * .1, 0, U.TAU); c.fill();
    },
    hammer(c, S, col, t) {
      c.strokeStyle = GFX.ramp('#7a5a34').base; c.lineWidth = S * .08;
      c.beginPath(); c.moveTo(-S * .3, S * .3); c.lineTo(S * .3, -S * .3); c.stroke();
      const M = GFX.ramp(col);
      c.fillStyle = GFX.metal(c, S * .1, -S * .6, S * .6, -S * .1, M);
      c.beginPath(); c.roundRect(S * .16, -S * .62, S * .48, S * .36, S * .07); c.fill();
      c.strokeStyle = M.line; c.lineWidth = S * .03; c.stroke();
      /* 스파크 */
      const p = .5 + Math.sin(t * 6) * .5;
      c.fillStyle = U.rgba(M.hi, p);
      c.beginPath(); c.arc(S * .4, -S * .44, S * .07 * p, 0, U.TAU); c.fill();
    },
    dagger(c, S, col) {
      const M = GFX.ramp('#e0e8f2');
      c.fillStyle = GFX.metal(c, 0, -S * .06, S * .38, S * .06, M);
      c.beginPath();
      c.moveTo(S * .02, -S * .05); c.lineTo(S * .36, -S * .02);
      c.lineTo(S * .42, 0); c.lineTo(S * .36, S * .03); c.lineTo(S * .02, S * .05);
      c.closePath(); c.fill();
      c.strokeStyle = M.line; c.lineWidth = S * .02; c.stroke();
      c.fillStyle = '#3a2f3a';
      c.beginPath(); c.roundRect(-S * .16, -S * .04, S * .18, S * .08, S * .03); c.fill();
      c.fillStyle = U.rgba(col, .8);
      c.beginPath(); c.arc(-S * .18, 0, S * .05, 0, U.TAU); c.fill();
    },
    scythe(c, S, col, t) {
      c.strokeStyle = GFX.ramp('#3a2f42').base; c.lineWidth = S * .07;
      c.beginPath(); c.moveTo(-S * .34, S * .34); c.lineTo(S * .3, -S * .44); c.stroke();
      c.strokeStyle = col; c.lineWidth = S * .11; c.lineCap = 'round';
      c.shadowColor = col; c.shadowBlur = S * .4;
      c.beginPath(); c.arc(S * .0, -S * .44, S * .46, -.5, 1.15); c.stroke();
      c.shadowBlur = 0;
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = S * .035;
      c.beginPath(); c.arc(S * .0, -S * .44, S * .46, -.45, 1.05); c.stroke();
    },
    cannon(c, S, col, t) {
      const M = GFX.ramp('#4d5666');
      c.fillStyle = GFX.metal(c, -S * .1, -S * .18, S * .7, S * .18, M);
      c.beginPath(); c.roundRect(-S * .12, -S * .17, S * .78, S * .34, S * .08); c.fill();
      c.strokeStyle = M.line; c.lineWidth = S * .035; c.stroke();
      /* 링 */
      c.fillStyle = M.deep;
      for (const x of [.1, .34]) { c.beginPath(); c.roundRect(S * x, -S * .21, S * .06, S * .42, S * .02); c.fill(); }
      /* 포구 */
      c.fillStyle = '#12161e';
      c.beginPath(); c.ellipse(S * .66, 0, S * .07, S * .15, 0, 0, U.TAU); c.fill();
      c.fillStyle = U.rgba(col, .8); c.shadowColor = col; c.shadowBlur = S * .3;
      c.beginPath(); c.ellipse(S * .66, 0, S * .04, S * .09, 0, 0, U.TAU); c.fill();
      c.shadowBlur = 0;
    },
    launcher(c, S, col) {
      const M = GFX.ramp('#556070');
      c.fillStyle = GFX.metal(c, -S * .1, -S * .2, S * .6, S * .2, M);
      c.beginPath(); c.roundRect(-S * .1, -S * .2, S * .68, S * .4, S * .1); c.fill();
      c.strokeStyle = M.line; c.lineWidth = S * .035; c.stroke();
      c.fillStyle = '#20252e';
      c.beginPath(); c.arc(S * .58, 0, S * .14, 0, U.TAU); c.fill();
      c.fillStyle = col;
      c.beginPath(); c.arc(S * .58, 0, S * .07, 0, U.TAU); c.fill();
      /* 탄창 */
      c.fillStyle = M.sh;
      c.beginPath(); c.roundRect(S * .06, S * .12, S * .28, S * .2, S * .05); c.fill();
    },
    orb(c, S, col, t) {
      const p = .5 + Math.sin(t * 3.2) * .5;
      c.fillStyle = GFX.radial(c, S * .3, -S * .05, S * .34, U.rgba(col, .9), U.rgba(col, 0));
      c.beginPath(); c.arc(S * .3, -S * .05, S * .34, 0, U.TAU); c.fill();
      c.fillStyle = col;
      c.beginPath(); c.arc(S * .3, -S * .05, S * .15 + p * S * .02, 0, U.TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.75)';
      c.beginPath(); c.arc(S * .25, -S * .11, S * .05, 0, U.TAU); c.fill();
      /* 궤도 링 */
      c.strokeStyle = U.rgba('#ffffff', .5); c.lineWidth = S * .02;
      c.beginPath(); c.ellipse(S * .3, -S * .05, S * .24, S * .09, t * 1.6, 0, U.TAU); c.stroke();
    },
    tome(c, S, col, t) {
      const B = GFX.ramp(col);
      c.fillStyle = B.deep;
      c.beginPath(); c.roundRect(S * .04, -S * .2, S * .38, S * .4, S * .04); c.fill();
      c.fillStyle = '#f4ecd8';
      c.beginPath(); c.roundRect(S * .08, -S * .16, S * .32, S * .32, S * .02); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = S * .015;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(S * .12, -S * .1 + i * S * .08); c.lineTo(S * .36, -S * .1 + i * S * .08); c.stroke(); }
      const p = .5 + Math.sin(t * 3) * .5;
      c.fillStyle = U.rgba(B.hi, .3 + p * .4);
      c.beginPath(); c.arc(S * .24, 0, S * .1, 0, U.TAU); c.fill();
    },
    flask(c, S, col) {
      c.fillStyle = 'rgba(230,240,255,.4)';
      c.beginPath();
      c.moveTo(S * .12, -S * .22); c.lineTo(S * .3, -S * .22);
      c.lineTo(S * .38, S * .12); c.quadraticCurveTo(S * .21, S * .3, S * .04, S * .12);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = S * .02; c.stroke();
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(S * .07, -S * .02); c.lineTo(S * .35, -S * .02);
      c.lineTo(S * .38, S * .12); c.quadraticCurveTo(S * .21, S * .3, S * .04, S * .12);
      c.closePath(); c.fill();
      c.fillStyle = '#6a5a3a';
      c.beginPath(); c.roundRect(S * .14, -S * .3, S * .14, S * .09, S * .02); c.fill();
    },
    torch(c, S, col, t) {
      c.strokeStyle = GFX.ramp('#7a5a2a').base; c.lineWidth = S * .07;
      c.beginPath(); c.moveTo(-S * .1, S * .22); c.lineTo(S * .2, -S * .12); c.stroke();
      const f = .85 + Math.sin(t * 13) * .15;
      c.fillStyle = GFX.radial(c, S * .24, -S * .3, S * .3 * f, 'rgba(255,190,90,.9)', 'rgba(255,90,30,0)');
      c.beginPath(); c.arc(S * .24, -S * .3, S * .3 * f, 0, U.TAU); c.fill();
      c.fillStyle = '#ff9a3a';
      c.beginPath(); c.ellipse(S * .24, -S * .3, S * .1 * f, S * .18 * f, 0, 0, U.TAU); c.fill();
      c.fillStyle = '#ffe9a0';
      c.beginPath(); c.ellipse(S * .24, -S * .27, S * .05 * f, S * .1 * f, 0, 0, U.TAU); c.fill();
    },
    claw(c, S, col) {
      c.strokeStyle = '#f2ecd8'; c.lineWidth = S * .06; c.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(S * .08, i * S * .14);
        c.quadraticCurveTo(S * .42, i * S * .2, S * .5, i * S * .06);
        c.stroke();
      }
      c.fillStyle = U.rgba(col, .5);
      c.beginPath(); c.arc(S * .28, 0, S * .16, 0, U.TAU); c.fill();
    },
    sling(c, S, col) {
      c.strokeStyle = '#a08a5a'; c.lineWidth = S * .03;
      c.beginPath(); c.moveTo(0, -S * .06); c.lineTo(S * .38, S * .14);
      c.moveTo(0, -S * .06); c.lineTo(S * .38, -S * .22); c.stroke();
      c.fillStyle = GFX.ramp('#8f8f96').base;
      c.beginPath(); c.arc(S * .4, -S * .04, S * .09, 0, U.TAU); c.fill();
    },
    dart(c, S, col) {
      c.fillStyle = '#6a5a3a';
      c.beginPath(); c.roundRect(0, -S * .035, S * .4, S * .07, S * .03); c.fill();
      c.fillStyle = col;
      c.beginPath(); c.moveTo(S * .46, 0); c.lineTo(S * .36, -S * .08); c.lineTo(S * .36, S * .08); c.fill();
      c.fillStyle = '#e8e8f0';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-S * .1, -S * .07); c.lineTo(-S * .06, 0); c.lineTo(-S * .1, S * .07); c.fill();
    },
    chakram(c, S, col, t) {
      c.save(); c.translate(S * .3, 0); c.rotate(t * 5);
      c.strokeStyle = col; c.lineWidth = S * .07;
      c.shadowColor = col; c.shadowBlur = S * .3;
      c.beginPath(); c.arc(0, 0, S * .2, 0, U.TAU); c.stroke();
      c.shadowBlur = 0;
      c.fillStyle = 'rgba(255,255,255,.8)';
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * U.TAU;
        c.beginPath(); c.moveTo(Math.cos(a) * S * .2, Math.sin(a) * S * .2);
        c.lineTo(Math.cos(a + .25) * S * .3, Math.sin(a + .25) * S * .3);
        c.lineTo(Math.cos(a + .5) * S * .2, Math.sin(a + .5) * S * .2);
        c.fill();
      }
      c.restore();
    },
    harp(c, S, col, t) {
      c.strokeStyle = GFX.ramp(col).base; c.lineWidth = S * .06;
      c.beginPath(); c.arc(S * .2, 0, S * .28, -1.9, 1.2); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = S * .015;
      for (let i = 0; i < 5; i++) {
        const y = -S * .2 + i * S * .1;
        c.beginPath(); c.moveTo(S * .06, y); c.lineTo(S * .3 + Math.sin(t * 8 + i) * S * .02, y); c.stroke();
      }
    },
    banner(c, S, col, t) {
      c.strokeStyle = GFX.ramp('#7a5a34').base; c.lineWidth = S * .05;
      c.beginPath(); c.moveTo(S * .1, S * .3); c.lineTo(S * .16, -S * .58); c.stroke();
      const wave = Math.sin(t * 3) * S * .05;
      c.fillStyle = GFX.ramp(col).base;
      c.beginPath();
      c.moveTo(S * .16, -S * .54);
      c.quadraticCurveTo(S * .48 + wave, -S * .46, S * .5, -S * .12);
      c.quadraticCurveTo(S * .3, -S * .2, S * .16, -S * .1);
      c.closePath(); c.fill();
      c.strokeStyle = GFX.ramp(col).line; c.lineWidth = S * .02; c.stroke();
    },
    drone(c, S, col, t) {
      for (let i = 0; i < 2; i++) {
        const a = t * 4 + i * Math.PI;
        const x = S * .3 + Math.cos(a) * S * .16, y = Math.sin(a) * S * .1;
        c.fillStyle = col; c.shadowColor = col; c.shadowBlur = S * .25;
        c.beginPath(); c.arc(x, y, S * .07, 0, U.TAU); c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(x, y, S * .03, 0, U.TAU); c.fill();
      }
    },
  },

  /* ===================================================================
   *  7. 부가 파츠 — 날개 / 꼬리 / 오라
   * =================================================================== */
  wings: {
    none() { },
    feather(c, S, col, t) {
      const f = Math.sin(t * 7) * .3;
      for (const d of [-1, 1]) {
        c.save(); c.rotate(d * (.4 + f * d * .5));
        const R = GFX.ramp(col);
        c.fillStyle = GFX.vgrad(c, 0, -S * .5, S * .3, '#ffffff', R.base);
        c.beginPath();
        c.moveTo(0, -S * .1);
        c.quadraticCurveTo(d * S * 1.0, -S * .6, d * S * .95, S * .1);
        c.quadraticCurveTo(d * S * .5, S * .05, 0, S * .18);
        c.closePath(); c.fill();
        c.strokeStyle = U.rgba(R.line, .5); c.lineWidth = S * .02;
        for (let i = 1; i <= 4; i++) {
          c.beginPath(); c.moveTo(d * S * .12, -S * .04);
          c.quadraticCurveTo(d * S * .5, -S * .3 + i * S * .1, d * S * .9, i * S * .05 - S * .12);
          c.stroke();
        }
        c.restore();
      }
    },
    bat(c, S, col, t) {
      const f = Math.sin(t * 9) * .34;
      for (const d of [-1, 1]) {
        c.save(); c.rotate(d * (.3 + f * d * .5));
        c.fillStyle = U.rgba(GFX.ramp(col).deep, .92);
        c.beginPath();
        c.moveTo(0, -S * .1);
        c.lineTo(d * S * .95, -S * .5);
        c.lineTo(d * S * .8, -S * .12);
        c.lineTo(d * S * .92, S * .12);
        c.lineTo(d * S * .6, -S * .02);
        c.lineTo(d * S * .68, S * .3);
        c.lineTo(0, S * .12);
        c.closePath(); c.fill();
        c.strokeStyle = U.rgba('#000000', .4); c.lineWidth = S * .02; c.stroke();
        c.restore();
      }
    },
    insectWing(c, S, col, t) {
      const f = Math.sin(t * 26) * .22;
      for (const d of [-1, 1]) {
        c.save(); c.rotate(d * (.5 + f));
        c.globalAlpha = .45;
        c.fillStyle = GFX.vgrad(c, 0, -S * .3, S * .2, '#ffffff', U.rgba(col, .2));
        c.beginPath(); c.ellipse(d * S * .55, -S * .18, S * .5, S * .17, d * .3, 0, U.TAU); c.fill();
        c.globalAlpha = 1;
        c.strokeStyle = U.rgba('#ffffff', .45); c.lineWidth = S * .015;
        c.beginPath(); c.ellipse(d * S * .55, -S * .18, S * .5, S * .17, d * .3, 0, U.TAU); c.stroke();
        c.restore();
      }
    },
    energy(c, S, col, t) {
      for (const d of [-1, 1]) {
        c.save();
        c.globalAlpha = .55 + Math.sin(t * 3 + d) * .2;
        c.fillStyle = GFX.radial(c, d * S * .6, -S * .1, S * .55, U.rgba(col, .8), U.rgba(col, 0));
        c.beginPath(); c.ellipse(d * S * .6, -S * .1, S * .55, S * .3, d * .5, 0, U.TAU); c.fill();
        c.globalAlpha = 1;
        c.restore();
      }
    },
  },

  aura: {
    none() { },
    /** 등급 오라 : 회전 룬 링 */
    runes(c, S, col, t, count) {
      c.save();
      c.globalAlpha = .75;
      c.strokeStyle = col; c.lineWidth = S * .02;
      c.beginPath(); c.ellipse(0, S * .62, S * .62, S * .2, 0, 0, U.TAU); c.stroke();
      for (let i = 0; i < count; i++) {
        const a = t * 1.1 + i / count * U.TAU;
        const x = Math.cos(a) * S * .62, y = S * .62 + Math.sin(a) * S * .2;
        const sc = .7 + Math.sin(a) * .3;
        c.fillStyle = col; c.shadowColor = col; c.shadowBlur = S * .25;
        GFX.star(c, x, y, S * .07 * sc, 4);
        c.shadowBlur = 0;
      }
      c.globalAlpha = 1;
      c.restore();
    },
    /** 불꽃 오라 */
    flame(c, S, col, t) {
      for (let i = 0; i < 8; i++) {
        const a = t * 2 + i / 8 * U.TAU;
        const rr = S * (.5 + Math.sin(t * 5 + i) * .08);
        c.fillStyle = U.rgba(i % 2 ? '#ffd24d' : col, .5);
        c.beginPath();
        c.ellipse(Math.cos(a) * rr, S * .5 + Math.sin(a) * rr * .3, S * .07, S * .13, 0, 0, U.TAU);
        c.fill();
      }
    },
    /** 신성 광휘 */
    divine(c, S, col, t) {
      c.save();
      c.globalAlpha = .35 + Math.sin(t * 2) * .1;
      for (let i = 0; i < 12; i++) {
        const a = t * .5 + i / 12 * U.TAU;
        c.strokeStyle = col; c.lineWidth = S * .03;
        c.beginPath();
        c.moveTo(Math.cos(a) * S * .5, Math.sin(a) * S * .5);
        c.lineTo(Math.cos(a) * S * .85, Math.sin(a) * S * .85);
        c.stroke();
      }
      c.globalAlpha = 1; c.restore();
    },
    /** 공허 */
    void(c, S, col, t) {
      c.save();
      c.globalAlpha = .5;
      for (let i = 0; i < 3; i++) {
        const rr = S * (.5 + i * .16) + Math.sin(t * 2 + i) * S * .04;
        c.strokeStyle = U.rgba(col, .5 - i * .12); c.lineWidth = S * .03;
        c.beginPath(); c.ellipse(0, S * .2, rr, rr * .5, t * (i % 2 ? .6 : -.6), 0, U.TAU); c.stroke();
      }
      c.globalAlpha = 1; c.restore();
    },
  },

  /** 별 그리기 */
  star(c, x, y, r, points) {
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 ? r * .45 : r;
      const a = (i / (points * 2)) * U.TAU - Math.PI / 2;
      i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
        : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath(); c.fill();
  },

  /* ===================================================================
   *  8. 통합 캐릭터 드로잉
   *  look = {legs, torso, head, hair, hairCol, skin, gear, weapon, wings,
   *          aura, color, accent}
   *  st   = {t, phase, aim, recoil, flip, scale}
   * =================================================================== */
  /** 운빨겜 스타일 : 큰 머리(치비) 비율 배수 — 몸은 그대로, 머리/헤어/장비만 키운다 */
  CHIBI_HEAD: 1.16,

  drawChar(c, x, y, S, look, st) {
    const t = st.t || 0;
    const R = GFX.ramp(look.color || '#8fa5c4');
    const A = GFX.ramp(look.accent || look.color || '#8fa5c4');
    const ph = st.phase || 0;
    const aim = st.aim === undefined ? 0 : st.aim;
    const recoil = st.recoil || 0;
    const seed = st.seed || 0;

    /* 통통 튀는 젤리 애니메이션 : 위아래로 튀면서 눌렸다 늘어난다 (스쿼시&스트레치) */
    const bouncePh = Math.sin(t * 2.1 + seed);
    const bob = bouncePh * S * .04 - recoil * S * .06;
    const squashY = 1 + bouncePh * .045 - recoil * .1;
    const squashX = 1 - bouncePh * .035 + recoil * .12;

    c.save();
    c.translate(x, y + bob);
    const baseScale = st.scale || 1;
    c.scale(baseScale * squashX, baseScale * squashY);
    if (st.flip) c.scale(-1, 1);

    /* 오라(뒤) */
    if (look.aura && GFX.aura[look.aura]) GFX.aura[look.aura](c, S, A.hi, t, look.auraCount || 5);
    /* 날개(뒤) */
    if (look.wings && GFX.wings[look.wings]) GFX.wings[look.wings](c, S, look.wingCol || A.base, t);
    /* 다리 */
    if (look.legs && GFX.legs[look.legs]) GFX.legs[look.legs](c, S, R, ph, look.legStyle, t);
    /* 뒷팔 */
    if (look.arms !== false) GFX.drawArm(c, S, R, -S * .3, -S * .12, Math.PI * .72 + Math.sin(ph) * .2, S * .34, S * .12);
    /* 몸통 */
    if (look.torso && GFX.torso[look.torso]) GFX.torso[look.torso](c, S, R, t);
    /* 머리 — 치비 비율로 살짝 확대 */
    const hS = S * this.CHIBI_HEAD;
    c.save();
    c.translate(0, -S * .58 + Math.sin(t * 2.1 + 1) * S * .015);
    const tilt = U.clamp(Math.sin(t * 1.3) * .06, -.11, .11);
    c.rotate(tilt);
    if (look.head && GFX.head[look.head]) GFX.head[look.head](c, hS, look.skin || '#f0c9a0', t);
    if (look.hair && GFX.hair[look.hair]) GFX.hair[look.hair](c, hS, look.hairCol || '#4a3728', t);
    if (look.gear && GFX.gear[look.gear]) GFX.gear[look.gear](c, hS, A, t);
    /* 운빨겜 스타일 : 어떤 생김새든 크고 동글동글한 눈을 붙인다 */
    if (look.head && look.head !== 'none' && look.cuteEyes !== false) this.cuteEyes(c, hS, t, seed);
    c.restore();
    /* 앞팔 + 무기 (조준 방향) */
    if (look.weapon && look.weapon !== 'none') {
      const wa = st.flip ? Math.PI - aim : aim;
      const armAng = U.clamp(wa, -1.1, 1.1);
      const hand = GFX.drawArm(c, S, R, S * .26, -S * .14, armAng * .55 + .1, S * .36 + recoil * -S * .06, S * .13);
      c.save();
      c.translate(hand.x, hand.y);
      c.rotate(armAng * .85 - recoil * .35);
      GFX.weapon[look.weapon](c, S, A.base, t);
      c.restore();
    } else if (look.arms !== false) {
      GFX.drawArm(c, S, R, S * .28, -S * .12, .5 + Math.sin(ph + 3) * .25, S * .34, S * .12);
    }
    c.restore();
  },

  /** 운빨겜 스타일 동글동글 눈 — 머리 종류와 무관하게 통일된 사랑스러운 얼굴을 준다 */
  cuteEyes(c, S, t, seed) {
    const blink = (Math.sin(t * 1.7 + seed) > .985) ? .12 : 1;
    const r = S * .095, dx = S * .135, ey = -S * .03;
    for (const d of [-1, 1]) {
      const ex = d * dx;
      c.fillStyle = '#fff';
      c.beginPath(); c.ellipse(ex, ey, r, r * blink, 0, 0, U.TAU); c.fill();
      c.strokeStyle = 'rgba(20,14,16,.55)'; c.lineWidth = Math.max(.6, S * .014);
      c.stroke();
      if (blink > .4) {
        c.fillStyle = '#241a1e';
        c.beginPath(); c.arc(ex + d * r * .18, ey + r * .18, r * .58, 0, U.TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.95)';
        c.beginPath(); c.arc(ex - d * r * .22, ey - r * .28, r * .24, 0, U.TAU); c.fill();
        c.beginPath(); c.arc(ex + d * r * .35, ey + r * .38, r * .12, 0, U.TAU); c.fill();
      }
    }
  },

  /* ===================================================================
   *  운빨겜 스타일 두꺼운 외곽선 — 실루엣을 여러 방향으로 겹쳐 찍어
   *  스티커 같은 검은 테두리를 값싸게 흉내낸다 (셰이프별 재작업 없이 적용)
   * =================================================================== */
  _outlineCv: null,
  /** 화면에 살아있는 유닛이 많을 때는 자동으로 외곽선을 생략해 프레임을 지킨다
   *  (Game.render 에서 매 프레임 갱신) */
  outlineBudget: true,
  drawCharOutlined(c, x, y, S, look, st, outlineColor, outlineW) {
    if (!this.outlineBudget) { this.drawChar(c, x, y, S, look, st); return; }
    outlineColor = outlineColor || '#241a16';
    outlineW = outlineW !== undefined ? outlineW : Math.max(1.4, S * .085);
    const pad = Math.ceil(outlineW * 2 + 4);
    const w = Math.ceil(S * 3.4) + pad * 2, h = Math.ceil(S * 3.9) + pad * 2;
    let sc = this._outlineCv;
    if (!sc) sc = this._outlineCv = document.createElement('canvas');
    if (sc.width !== w || sc.height !== h) { sc.width = w; sc.height = h; }
    const cx = sc.getContext('2d');
    cx.clearRect(0, 0, w, h);
    const ox = w / 2, oy = h * .64;
    this.drawChar(cx, ox, oy, S, look, st);
    cx.globalCompositeOperation = 'source-in';
    cx.fillStyle = outlineColor;
    cx.fillRect(0, 0, w, h);
    cx.globalCompositeOperation = 'source-over';
    const dirs = 8;
    for (let i = 0; i < dirs; i++) {
      const a = i / dirs * U.TAU;
      c.drawImage(sc, x - ox + Math.cos(a) * outlineW, y - oy + Math.sin(a) * outlineW);
    }
    this.drawChar(c, x, y, S, look, st);
  },

  /* ===================================================================
   *  9. 스프라이트 캐시
   * =================================================================== */
  cache: new Map(),
  cacheHits: 0, cacheMiss: 0,
  MAX_CACHE: 900,

  /** look 을 캐시된 캔버스로 렌더 (프레임 단위) */
  sprite(look, S, frame, frames, extra) {
    const key = (look.id || '?') + '|' + Math.round(S) + '|' + frame + (extra || '');
    let cv = this.cache.get(key);
    if (cv) { this.cacheHits++; return cv; }
    this.cacheMiss++;
    const outlineW = Math.max(1.4, S * .085);
    const pad = S * 1.5 + outlineW * 2 + 4;
    const w = Math.ceil(S * 3 + pad), h = Math.ceil(S * 3.4 + pad);
    cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    const t = (frame / frames) * (Math.PI * 2 / 2.1);
    const ox = w / 2, oy = h * .62;
    const st = { t, phase: (frame / frames) * U.TAU, aim: 0, seed: 0 };
    /* 외곽선을 캐시된 비트맵에 직접 구워 넣는다 — 프레임당 1회만 비용 발생, 이후엔 공짜 */
    let sc = this._outlineCv;
    if (!sc) sc = this._outlineCv = document.createElement('canvas');
    if (sc.width !== w || sc.height !== h) { sc.width = w; sc.height = h; }
    const scx = sc.getContext('2d');
    scx.clearRect(0, 0, w, h);
    this.drawChar(scx, ox, oy, S, look, st);
    scx.globalCompositeOperation = 'source-in';
    scx.fillStyle = '#241a16';
    scx.fillRect(0, 0, w, h);
    scx.globalCompositeOperation = 'source-over';
    const dirs = 10;
    for (let i = 0; i < dirs; i++) {
      const a = i / dirs * U.TAU;
      c.drawImage(sc, Math.cos(a) * outlineW, Math.sin(a) * outlineW);
    }
    this.drawChar(c, ox, oy, S, look, st);
    cv._ox = ox; cv._oy = oy; cv._key = key;
    if (this.cache.size > this.MAX_CACHE) {
      /* 오래된 절반 제거 */
      let i = 0;
      for (const k of this.cache.keys()) { this.cache.delete(k); if (++i > this.MAX_CACHE * .4) break; }
    }
    this.cache.set(key, cv);
    return cv;
  },
  /** 스프라이트 색 틴트 (상태이상 표현) — 결과도 캐시 */
  tint(cv, color, amt) {
    amt = U.clamp(amt, 0, 1);
    const bucket = Math.round(amt * 5) / 5;
    if (bucket <= 0) return cv;
    const key = (cv._key || '?') + '#' + color + bucket;
    let out = this.cache.get(key);
    if (out) return out;
    out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height;
    const c = out.getContext('2d');
    c.drawImage(cv, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.globalAlpha = bucket;
    c.fillStyle = color;
    c.fillRect(0, 0, cv.width, cv.height);
    out._ox = cv._ox; out._oy = cv._oy; out._key = key;
    this.cache.set(key, out);
    return out;
  },

  clearCache() { this.cache.clear(); this.terrainKey = ''; this.terrainCanvas = null; },

  /* ===================================================================
   *  10. 지형 렌더링
   * =================================================================== */
  terrainCanvas: null, terrainKey: '',

  /** 맵 배경(정적 부분)을 오프스크린에 한 번만 그려 재사용 */
  buildTerrain(g) {
    const key = `${g.map.key}|${g.ts}|${g.gw}x${g.gh}|${g.ox},${g.oy}`;
    if (this.terrainKey === key && this.terrainCanvas) return this.terrainCanvas;
    const m = g.map, ts = g.ts;
    const W = g.gw * ts, H = g.gh * ts;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, W); cv.height = Math.max(1, H);
    const c = cv.getContext('2d');
    const seed = m.key.length * 977 + m.diff * 131;

    /* --- 기본 지면 --- */
    const bg = c.createLinearGradient(0, 0, W * .3, H);
    bg.addColorStop(0, m.bg); bg.addColorStop(1, m.bg2);
    c.fillStyle = bg; c.fillRect(0, 0, W, H);

    /* --- 노이즈 텍스처 --- */
    const cell = Math.max(4, Math.floor(ts / 5));
    for (let py = 0; py < H; py += cell) {
      for (let px = 0; px < W; px += cell) {
        const n = this.fbm(px / (ts * 1.6), py / (ts * 1.6), seed, 3);
        const a = (n - .5) * .22;
        c.fillStyle = a > 0 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${-a})`;
        c.fillRect(px, py, cell, cell);
      }
    }

    /* --- 타일 격자(아주 은은하게) --- */
    c.strokeStyle = 'rgba(255,255,255,.045)'; c.lineWidth = 1;
    for (let i = 0; i <= g.gw; i++) { c.beginPath(); c.moveTo(i * ts, 0); c.lineTo(i * ts, H); c.stroke(); }
    for (let j = 0; j <= g.gh; j++) { c.beginPath(); c.moveTo(0, j * ts); c.lineTo(W, j * ts); c.stroke(); }

    /* --- 지형 장식물 --- */
    const deco = m.deco || ['rock', 'grass'];
    for (let gy = 0; gy < g.gh; gy++) {
      for (let gx = 0; gx < g.gw; gx++) {
        if (g.isPath(gx, gy)) continue;
        const h1 = this.hash(gx, gy, seed);
        if (h1 > .74) {
          const kind = deco[Math.floor(this.hash(gx, gy, seed + 7) * deco.length)];
          const px = gx * ts + ts * (.25 + this.hash(gx, gy, seed + 3) * .5);
          const py = gy * ts + ts * (.25 + this.hash(gx, gy, seed + 5) * .5);
          this.deco(c, kind, px, py, ts * (.3 + this.hash(gx, gy, seed + 9) * .28), m, seed + gx * 31 + gy);
        }
      }
    }

    /* --- 경로 --- */
    const pts = g.pathPts.map(p => ({ x: p.x - g.ox, y: p.y - g.oy }));
    const road = GFX.ramp(m.road);
    /* 바깥 테두리(흙 둔덕) */
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = road.deep; c.lineWidth = ts * 1.02;
    this.strokePath(c, pts);
    c.strokeStyle = road.sh; c.lineWidth = ts * .92;
    this.strokePath(c, pts);
    /* 본 도로 */
    c.strokeStyle = road.base; c.lineWidth = ts * .8;
    this.strokePath(c, pts);
    /* 도로 텍스처 : 경로를 따라 자갈을 흩뿌린다 */
    let total = 0;
    const segLen = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const l = U.dist(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      segLen.push(l); total += l;
    }
    const stones = Math.floor(total / ts * 9);
    for (let i = 0; i < stones; i++) {
      let d = this.hash(i, 21, seed) * total;
      let si = 0;
      while (si < segLen.length - 1 && d > segLen[si]) { d -= segLen[si]; si++; }
      const a = pts[si], b2 = pts[si + 1] || pts[si];
      const t = segLen[si] ? d / segLen[si] : 0;
      const off = (this.hash(i, 23, seed) - .5) * ts * .62;
      const nx = -(b2.y - a.y), ny = (b2.x - a.x);
      const nl = Math.hypot(nx, ny) || 1;
      const px = U.lerp(a.x, b2.x, t) + nx / nl * off;
      const py = U.lerp(a.y, b2.y, t) + ny / nl * off;
      const rr = ts * (.028 + this.hash(i, 11, seed) * .055);
      c.fillStyle = this.hash(i, 13, seed) > .5 ? U.rgba(road.hi, .2) : U.rgba(road.deep, .28);
      c.beginPath(); c.ellipse(px, py, rr, rr * .7, this.hash(i, 17, seed) * 3, 0, U.TAU); c.fill();
    }
    /* 도로 가장자리 밝은 선 */
    c.strokeStyle = U.rgba(road.hi, .2); c.lineWidth = ts * .05;
    this.strokePath(c, pts);

    cv._road = pts;
    this.terrainCanvas = cv; this.terrainKey = key;
    return cv;
  },

  strokePath(c, pts) {
    c.beginPath();
    pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
    c.stroke();
  },

  /** 장식물 */
  deco(c, kind, x, y, s, m, seed) {
    switch (kind) {
      case 'grass': {
        c.strokeStyle = U.rgba(m.accent, .5); c.lineWidth = s * .09; c.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
          c.beginPath(); c.moveTo(x + i * s * .14, y + s * .3);
          c.quadraticCurveTo(x + i * s * .18, y - s * .1, x + i * s * .3, y - s * .4);
          c.stroke();
        }
        break;
      }
      case 'rock': {
        const R = GFX.ramp('#6f7684');
        c.fillStyle = GFX.vgrad(c, x, y - s * .5, y + s * .4, R.lit, R.deep);
        c.beginPath();
        c.moveTo(x - s * .5, y + s * .34); c.lineTo(x - s * .3, y - s * .3);
        c.lineTo(x + s * .12, y - s * .44); c.lineTo(x + s * .5, y - s * .05);
        c.lineTo(x + s * .38, y + s * .34); c.closePath(); c.fill();
        c.strokeStyle = R.line; c.lineWidth = s * .07; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.14)';
        c.beginPath(); c.moveTo(x - s * .28, y - s * .28); c.lineTo(x + s * .1, y - s * .4);
        c.lineTo(x - s * .05, y - s * .05); c.fill();
        break;
      }
      case 'tree': {
        c.fillStyle = '#4a3520';
        c.fillRect(x - s * .1, y - s * .1, s * .2, s * .55);
        const G = GFX.ramp(m.accent);
        for (let i = 0; i < 3; i++) {
          c.fillStyle = i === 0 ? G.sh : i === 1 ? G.base : G.lit;
          c.beginPath();
          c.moveTo(x, y - s * (.85 + i * .18));
          c.lineTo(x + s * (.5 - i * .1), y - s * (.1 + i * .22));
          c.lineTo(x - s * (.5 - i * .1), y - s * (.1 + i * .22));
          c.closePath(); c.fill();
        }
        break;
      }
      case 'deadtree': {
        c.strokeStyle = '#4d4239'; c.lineWidth = s * .13; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x, y + s * .45); c.lineTo(x, y - s * .5); c.stroke();
        c.lineWidth = s * .08;
        for (const d of [-1, 1]) {
          c.beginPath(); c.moveTo(x, y - s * .1); c.lineTo(x + d * s * .45, y - s * .5); c.stroke();
          c.beginPath(); c.moveTo(x, y - s * .34); c.lineTo(x + d * s * .3, y - s * .72); c.stroke();
        }
        break;
      }
      case 'crystalDeco': {
        const R = GFX.ramp(m.accent);
        for (let i = -1; i <= 1; i++) {
          const h = s * (.6 - Math.abs(i) * .2);
          c.fillStyle = GFX.vgrad(c, x, y - h, y + s * .3, R.hi, R.sh);
          c.beginPath();
          c.moveTo(x + i * s * .26, y + s * .3);
          c.lineTo(x + i * s * .26 - s * .13, y - h * .3);
          c.lineTo(x + i * s * .26, y - h);
          c.lineTo(x + i * s * .26 + s * .13, y - h * .3);
          c.closePath(); c.fill();
          c.strokeStyle = U.rgba(R.line, .6); c.lineWidth = s * .04; c.stroke();
        }
        break;
      }
      case 'bone': {
        c.strokeStyle = '#ded6c2'; c.lineWidth = s * .1; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - s * .3, y + s * .2); c.lineTo(x + s * .3, y - s * .1); c.stroke();
        c.fillStyle = '#ded6c2';
        c.beginPath(); c.arc(x - s * .34, y + s * .16, s * .09, 0, U.TAU);
        c.arc(x - s * .26, y + s * .28, s * .08, 0, U.TAU);
        c.arc(x + s * .34, y - s * .06, s * .09, 0, U.TAU);
        c.arc(x + s * .26, y - s * .18, s * .08, 0, U.TAU); c.fill();
        break;
      }
      case 'skullDeco': {
        c.fillStyle = '#e8e2d0';
        c.beginPath(); c.arc(x, y, s * .26, 0, U.TAU); c.fill();
        c.fillStyle = '#20242c';
        c.beginPath(); c.arc(x - s * .1, y - s * .03, s * .07, 0, U.TAU);
        c.arc(x + s * .1, y - s * .03, s * .07, 0, U.TAU); c.fill();
        c.fillRect(x - s * .04, y + s * .12, s * .08, s * .1);
        break;
      }
      case 'ice': {
        c.fillStyle = 'rgba(190,235,255,.55)';
        c.beginPath();
        c.moveTo(x, y - s * .5); c.lineTo(x + s * .3, y + s * .1);
        c.lineTo(x, y + s * .34); c.lineTo(x - s * .3, y + s * .1);
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = s * .05; c.stroke();
        break;
      }
      case 'lavaCrack': {
        c.strokeStyle = '#ff6a2a'; c.lineWidth = s * .09; c.lineCap = 'round';
        c.shadowColor = '#ff4a1a'; c.shadowBlur = s * .5;
        c.beginPath();
        c.moveTo(x - s * .5, y);
        c.lineTo(x - s * .1, y - s * .18); c.lineTo(x + s * .16, y + s * .12); c.lineTo(x + s * .5, y - s * .06);
        c.stroke(); c.shadowBlur = 0;
        break;
      }
      case 'mushroom': {
        c.fillStyle = '#e8e0d0';
        c.fillRect(x - s * .07, y - s * .05, s * .14, s * .3);
        c.fillStyle = m.accent;
        c.beginPath(); c.ellipse(x, y - s * .08, s * .26, s * .18, 0, Math.PI, 0); c.fill();
        c.fillStyle = 'rgba(255,255,255,.5)';
        c.beginPath(); c.arc(x - s * .08, y - s * .14, s * .04, 0, U.TAU);
        c.arc(x + s * .1, y - s * .1, s * .035, 0, U.TAU); c.fill();
        break;
      }
      case 'ruin': {
        const R = GFX.ramp('#8a8578');
        c.fillStyle = R.base;
        c.beginPath(); c.roundRect(x - s * .2, y - s * .6, s * .4, s * .9, s * .05); c.fill();
        c.strokeStyle = R.line; c.lineWidth = s * .05; c.stroke();
        c.fillStyle = R.sh;
        c.beginPath(); c.roundRect(x - s * .3, y - s * .72, s * .6, s * .16, s * .04); c.fill();
        break;
      }
      case 'voidRift': {
        c.fillStyle = GFX.radial(c, x, y, s * .6, 'rgba(160,110,255,.55)', 'rgba(90,40,160,0)');
        c.beginPath(); c.ellipse(x, y, s * .6, s * .3, .4, 0, U.TAU); c.fill();
        c.fillStyle = '#120a20';
        c.beginPath(); c.ellipse(x, y, s * .3, s * .12, .4, 0, U.TAU); c.fill();
        break;
      }
      case 'sandDune': {
        c.strokeStyle = 'rgba(255,230,180,.16)'; c.lineWidth = s * .1;
        c.beginPath(); c.moveTo(x - s * .5, y + s * .1);
        c.quadraticCurveTo(x, y - s * .2, x + s * .5, y + s * .05); c.stroke();
        break;
      }
      case 'flower': {
        c.fillStyle = ['#ff7ab0', '#ffd24d', '#8fd8ff'][Math.floor(GFX.hash(x | 0, y | 0, seed) * 3)];
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * U.TAU;
          c.beginPath(); c.ellipse(x + Math.cos(a) * s * .12, y + Math.sin(a) * s * .12, s * .08, s * .05, a, 0, U.TAU); c.fill();
        }
        c.fillStyle = '#fff3b0';
        c.beginPath(); c.arc(x, y, s * .06, 0, U.TAU); c.fill();
        break;
      }
    }
  },

  /* ===================================================================
   *  11. 날씨 / 환경
   * =================================================================== */
  weather: { kind: null, parts: [], wind: 0 },

  setWeather(kind, g) {
    this.weather.kind = kind;
    this.weather.parts.length = 0;
    if (!kind) return;
    const n = kind === 'rain' ? 160 : kind === 'snow' ? 120 : kind === 'ember' ? 70 : kind === 'sand' ? 130 : 40;
    for (let i = 0; i < n; i++) {
      this.weather.parts.push({
        x: U.rand(g.W), y: U.rand(g.H),
        v: U.rand(.6, 1.5), s: U.rand(.6, 1.4), p: U.rand(U.TAU),
      });
    }
  },

  updateWeather(dt, g) {
    const w = this.weather;
    if (!w.kind) return;
    w.wind = Math.sin(g.time * .3) * 40;
    for (const p of w.parts) {
      switch (w.kind) {
        case 'rain': p.y += 900 * p.v * dt; p.x += (60 + w.wind) * dt; break;
        case 'snow': p.y += 90 * p.v * dt; p.x += (Math.sin(g.time * 1.4 + p.p) * 34 + w.wind * .4) * dt; break;
        case 'ember': p.y -= 70 * p.v * dt; p.x += (Math.sin(g.time * 2 + p.p) * 26 + w.wind * .3) * dt; break;
        case 'sand': p.x += (260 * p.v + w.wind) * dt; p.y += Math.sin(g.time * 3 + p.p) * 22 * dt; break;
        case 'ash': p.y += 40 * p.v * dt; p.x += (Math.sin(g.time + p.p) * 20 + w.wind * .5) * dt; break;
      }
      if (p.y > g.H + 20) { p.y = -20; p.x = U.rand(g.W); }
      if (p.y < -20) { p.y = g.H + 20; p.x = U.rand(g.W); }
      if (p.x > g.W + 20) p.x = -20;
      if (p.x < -20) p.x = g.W + 20;
    }
  },

  drawWeather(c, g) {
    const w = this.weather;
    if (!w.kind) return;
    c.save();
    switch (w.kind) {
      case 'rain':
        c.strokeStyle = 'rgba(170,210,255,.42)'; c.lineWidth = 1.4; c.lineCap = 'round';
        for (const p of w.parts) {
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - 3.5, p.y - 15 * p.v); c.stroke();
        }
        break;
      case 'snow':
        for (const p of w.parts) {
          c.fillStyle = `rgba(255,255,255,${.35 + p.s * .3})`;
          c.beginPath(); c.arc(p.x, p.y, p.s * 1.8, 0, U.TAU); c.fill();
        }
        break;
      case 'ember':
        for (const p of w.parts) {
          const a = .35 + Math.sin(g.time * 6 + p.p) * .3;
          c.fillStyle = `rgba(255,${140 + p.s * 60 | 0},60,${a})`;
          c.beginPath(); c.arc(p.x, p.y, p.s * 1.6, 0, U.TAU); c.fill();
        }
        break;
      case 'sand':
        c.strokeStyle = 'rgba(240,210,150,.2)'; c.lineWidth = 1.2;
        for (const p of w.parts) {
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - 16 * p.v, p.y); c.stroke();
        }
        break;
      case 'ash':
        for (const p of w.parts) {
          c.fillStyle = `rgba(190,190,200,${.2 + p.s * .2})`;
          c.beginPath(); c.arc(p.x, p.y, p.s * 1.5, 0, U.TAU); c.fill();
        }
        break;
    }
    c.restore();
  },

  /** 화면 전체 색보정 + 비네트 */
  ambient(c, g) {
    const m = g.map;
    if (m.ambient) {
      c.save();
      c.beginPath();
      c.rect(g.ox, g.oy, g.gw * g.ts, g.gh * g.ts);
      c.clip();
      c.globalCompositeOperation = 'soft-light';
      c.fillStyle = U.rgba(m.ambient, (m.ambientAmt || .18) * .8);
      c.fillRect(g.ox, g.oy, g.gw * g.ts, g.gh * g.ts);
      c.restore();
    }
    /* 상단 광원 */
    const lg = c.createLinearGradient(0, g.oy, 0, g.oy + g.gh * g.ts);
    lg.addColorStop(0, 'rgba(255,255,255,.07)');
    lg.addColorStop(.4, 'rgba(255,255,255,0)');
    lg.addColorStop(1, 'rgba(0,0,0,.22)');
    c.fillStyle = lg;
    c.fillRect(g.ox, g.oy, g.gw * g.ts, g.gh * g.ts);
  },
};

window.GFX = GFX;
