/* =========================================================================
 *  textures.js — 모든 텍스처를 코드로 그린다 (외부 리소스 0개)
 *  16x16 타일들을 만들어 WebGL2 TEXTURE_2D_ARRAY 로 올린다.
 *  UI(인벤토리/핫바)는 같은 캔버스를 2D로 확대해 그린다.
 * ========================================================================= */
'use strict';

const TILE_SIZE = 16;

const Textures = {
  tiles: [],          // [{name, canvas, ctx}]
  index: Object.create(null),
  built: false,

  id(name) {
    const i = Textures.index[name];
    if (i === undefined) {
      console.warn('[textures] 알 수 없는 타일:', name);
      return Textures.index['missing'] || 0;
    }
    return i;
  },
  canvasOf(name) { return Textures.tiles[Textures.id(name)].canvas; },
};

/* --------------------------------------------------------- 그리기 헬퍼 */
function _newTile() {
  const c = document.createElement('canvas');
  c.width = TILE_SIZE; c.height = TILE_SIZE;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { canvas: c, ctx: g };
}

function defTile(name, drawFn) {
  const t = _newTile();
  drawFn(t.ctx, mulberry32(_strHash(name)));
  Textures.index[name] = Textures.tiles.length;
  Textures.tiles.push({ name, canvas: t.canvas, ctx: t.ctx });
  return Textures.tiles.length - 1;
}

function _strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function P(g, x, y, color) { g.fillStyle = color; g.fillRect(x, y, 1, 1); }
function R(g, x, y, w, h, color) { g.fillStyle = color; g.fillRect(x, y, w, h); }

/** 기본색 + 픽셀 단위 밝기 노이즈로 채우기 */
function noiseFill(g, rng, baseHex, amount = 0.14, alpha = 1) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const f = 1 + (rng() - 0.5) * 2 * amount;
      const c = shadeColor(baseHex, f);
      g.fillStyle = `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${alpha})`;
      g.fillRect(x, y, 1, 1);
    }
  }
}

/** 얼룩(클러스터) 뿌리기 */
function speckle(g, rng, colorHex, count, size = 1, alpha = 1) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * 16), y = Math.floor(rng() * 16);
    const s = size === 1 ? 1 : 1 + Math.floor(rng() * size);
    const c = shadeColor(colorHex, 0.85 + rng() * 0.3);
    g.fillStyle = `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${alpha})`;
    g.fillRect(x, y, s, s);
  }
}

/**
 * 문자 마스크로 그리기. rows 길이가 16 미만이면 세로 중앙 정렬.
 * map: { 문자: '#rrggbb' | null }
 */
function drawMask(g, rows, map) {
  const oy = Math.floor((16 - rows.length) / 2);
  for (let r = 0; r < rows.length; r++) {
    const line = rows[r];
    const ox = Math.floor((16 - line.length) / 2);
    for (let c = 0; c < line.length; c++) {
      const col = map[line[c]];
      if (!col) continue;
      P(g, ox + c, oy + r, col);
    }
  }
}

/* ==========================================================================
 *                        블록 텍스처 제너레이터
 * ====================================================================== */

function texStone(g, rng) {
  noiseFill(g, rng, 0x7d7d7d, 0.12);
  speckle(g, rng, 0x6b6b6b, 26, 2, 0.6);
  speckle(g, rng, 0x8e8e8e, 18, 1, 0.5);
}

function texCobble(g, rng) {
  noiseFill(g, rng, 0x6f6f6f, 0.1);
  // 돌덩이 덩어리 배치
  const blobs = [[0, 0, 6, 5], [7, 0, 5, 4], [13, 0, 3, 6], [0, 6, 4, 5], [5, 5, 6, 6],
  [12, 7, 4, 5], [0, 12, 7, 4], [8, 12, 4, 4], [13, 13, 3, 3]];
  for (const [x, y, w, h] of blobs) {
    const base = shadeColor(0x8a8a8a, 0.8 + rng() * 0.45);
    R(g, x, y, w, h, hexStr(base));
    for (let i = 0; i < w * h * 0.6; i++) {
      P(g, x + Math.floor(rng() * w), y + Math.floor(rng() * h), hexStr(shadeColor(base, 0.82 + rng() * 0.3)));
    }
    R(g, x, y, w, 1, hexStr(shadeColor(base, 1.22)));
    R(g, x, y + h - 1, w, 1, hexStr(shadeColor(base, 0.68)));
  }
}

function texMossy(g, rng) {
  texCobble(g, rng);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (rng() < 0.42) P(g, x, y, hexStr(shadeColor(0x5d7a35, 0.75 + rng() * 0.5)));
  }
}

function texDirt(g, rng) {
  noiseFill(g, rng, 0x8b6647, 0.16);
  speckle(g, rng, 0x6f4f36, 30, 2, 0.7);
  speckle(g, rng, 0x9d7a58, 20, 1, 0.6);
}

function texGrassTop(g, rng) {
  noiseFill(g, rng, 0x69a544, 0.16);
  speckle(g, rng, 0x5a9137, 28, 2, 0.6);
  speckle(g, rng, 0x7cba50, 22, 1, 0.6);
}

function texGrassSide(g, rng) {
  texDirt(g, rng);
  // 위쪽 잔디 가장자리 (들쭉날쭉)
  for (let x = 0; x < 16; x++) {
    const h = 2 + Math.floor(rng() * 3);
    for (let y = 0; y < h; y++) {
      P(g, x, y, hexStr(shadeColor(0x69a544, 0.85 + rng() * 0.35)));
    }
  }
}

function texSnowSide(g, rng) {
  texDirt(g, rng);
  for (let x = 0; x < 16; x++) {
    const h = 3 + Math.floor(rng() * 3);
    for (let y = 0; y < h; y++) P(g, x, y, hexStr(shadeColor(0xf2fbfb, 0.93 + rng() * 0.08)));
  }
}

function texSand(g, rng) {
  noiseFill(g, rng, 0xdbcf8f, 0.09);
  speckle(g, rng, 0xc9bb75, 22, 1, 0.5);
  speckle(g, rng, 0xeee3ae, 14, 1, 0.5);
}

function texGravel(g, rng) {
  noiseFill(g, rng, 0x82817d, 0.14);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rng() * 15), y = Math.floor(rng() * 15);
    const c = shadeColor(rng() < 0.5 ? 0x6a6a68 : 0x9b9a95, 0.85 + rng() * 0.3);
    R(g, x, y, 2, 2, hexStr(c));
  }
}

function texBedrock(g, rng) {
  noiseFill(g, rng, 0x565656, 0.2);
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rng() * 14), y = Math.floor(rng() * 14);
    R(g, x, y, 2 + Math.floor(rng() * 2), 2 + Math.floor(rng() * 2),
      hexStr(shadeColor(0x333333, 0.7 + rng() * 0.9)));
  }
}

function texPlanks(base) {
  return (g, rng) => {
    noiseFill(g, rng, base, 0.08);
    for (let y = 0; y < 16; y += 4) {
      R(g, 0, y, 16, 1, hexStr(shadeColor(base, 0.72)));       // 판자 경계
      R(g, 0, y + 3, 16, 1, hexStr(shadeColor(base, 0.88)));
      // 나뭇결
      for (let x = 0; x < 16; x++) {
        if (rng() < 0.3) P(g, x, y + 1 + Math.floor(rng() * 2), hexStr(shadeColor(base, 0.86 + rng() * 0.2)));
      }
      const nx = Math.floor(rng() * 14);
      if (rng() < 0.5) P(g, nx, y + 2, hexStr(shadeColor(base, 0.62)));
    }
  };
}

function texLogSide(bark, ring) {
  return (g, rng) => {
    noiseFill(g, rng, bark, 0.12);
    for (let x = 0; x < 16; x++) {
      if (rng() < 0.45) {
        const h = 3 + Math.floor(rng() * 9);
        const y = Math.floor(rng() * (16 - h));
        R(g, x, y, 1, h, hexStr(shadeColor(bark, 0.76 + rng() * 0.22)));
      }
    }
    R(g, 0, 0, 1, 16, hexStr(shadeColor(ring, 0.9)));
    R(g, 15, 0, 1, 16, hexStr(shadeColor(ring, 0.9)));
  };
}

function texLogTop(bark, ring) {
  return (g, rng) => {
    noiseFill(g, rng, ring, 0.1);
    const cx = 8, cy = 8;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - cx + 0.5, y - cy + 0.5);
      if (d > 7.2) { P(g, x, y, hexStr(shadeColor(bark, 0.85 + rng() * 0.25))); continue; }
      const r = Math.floor(d) % 3;
      if (r === 0) P(g, x, y, hexStr(shadeColor(ring, 0.82 + rng() * 0.1)));
    }
  };
}

function texLeaves(base) {
  return (g, rng) => {
    g.clearRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (rng() < 0.12) continue;                     // 잎 사이 구멍 (알파 컷아웃)
      const c = shadeColor(base, 0.72 + rng() * 0.55);
      P(g, x, y, hexStr(c));
    }
  };
}

function texOre(spot, spotDark) {
  return (g, rng) => {
    texStone(g, rng);
    const blobs = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < blobs; i++) {
      const bx = 1 + Math.floor(rng() * 12), by = 1 + Math.floor(rng() * 12);
      const w = 2 + Math.floor(rng() * 2), h = 2 + Math.floor(rng() * 2);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (rng() < 0.16) continue;
        P(g, bx + x, by + y, hexStr(shadeColor(spot, 0.88 + rng() * 0.28)));
      }
      P(g, bx, by + h - 1, hexStr(spotDark));
      P(g, bx + w - 1, by, hexStr(spotDark));
    }
  };
}

function texMetalBlock(base) {
  return (g, rng) => {
    noiseFill(g, rng, base, 0.06);
    R(g, 0, 0, 16, 1, hexStr(shadeColor(base, 1.25)));
    R(g, 0, 0, 1, 16, hexStr(shadeColor(base, 1.18)));
    R(g, 0, 15, 16, 1, hexStr(shadeColor(base, 0.7)));
    R(g, 15, 0, 1, 16, hexStr(shadeColor(base, 0.76)));
    for (let i = 0; i < 3; i++) {
      const x = 3 + Math.floor(rng() * 9), y = 3 + Math.floor(rng() * 9);
      P(g, x, y, hexStr(shadeColor(base, 1.3)));
    }
  };
}

function texGem(base) {
  return (g, rng) => {
    noiseFill(g, rng, base, 0.05);
    const pts = [[3, 3], [9, 3], [3, 9], [9, 9]];
    for (const [px, py] of pts) {
      R(g, px, py, 4, 4, hexStr(shadeColor(base, 1.22)));
      R(g, px + 1, py + 1, 2, 2, hexStr(shadeColor(base, 1.45)));
      R(g, px, py + 3, 4, 1, hexStr(shadeColor(base, 0.72)));
    }
  };
}

function texWater(g, rng) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const w = Math.sin((x + y * 0.6) * 0.9) * 0.5 + Math.sin(x * 1.7 - y) * 0.25;
      const f = 0.88 + w * 0.12 + (rng() - 0.5) * 0.06;
      const c = shadeColor(0x2f5fd0, f);
      g.fillStyle = `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},0.78)`;
      g.fillRect(x, y, 1, 1);
    }
  }
}

function texLava(g, rng) {
  noiseFill(g, rng, 0xd45a12, 0.18);
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(rng() * 14), y = Math.floor(rng() * 14);
    R(g, x, y, 1 + Math.floor(rng() * 3), 1 + Math.floor(rng() * 2),
      hexStr(shadeColor(rng() < 0.5 ? 0xffc02a : 0x8c2b06, 0.9 + rng() * 0.3)));
  }
}

function texGlass(g, rng) {
  g.clearRect(0, 0, 16, 16);
  g.fillStyle = 'rgba(225,245,250,0.16)';
  g.fillRect(0, 0, 16, 16);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1);
  g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  g.fillRect(2, 2, 4, 1); g.fillRect(2, 3, 1, 3);
  g.fillRect(11, 9, 3, 1);
}

function texIce(g, rng) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const f = 0.9 + (rng() - 0.5) * 0.18;
    const c = shadeColor(0x8ec3f5, f);
    g.fillStyle = `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},0.86)`;
    g.fillRect(x, y, 1, 1);
  }
  /* 균열: 안티에일리어싱 없이 픽셀 단위로 (선 그리기 금지) */
  for (let y = 0; y < 16; y++) {
    P(g, clamp(2 + Math.floor(y * 0.44), 0, 15), y, 'rgba(255,255,255,0.5)');
    P(g, clamp(14 - Math.floor(y * 0.5), 0, 15), y, 'rgba(255,255,255,0.38)');
  }
}

function texSnow(g, rng) { noiseFill(g, rng, 0xf4fbfb, 0.05); speckle(g, rng, 0xdfeaf2, 10, 1, 0.5); }
function texClay(g, rng) { noiseFill(g, rng, 0xa3a7b6, 0.09); speckle(g, rng, 0x8f93a5, 16, 2, 0.5); }
function texObsidian(g, rng) {
  noiseFill(g, rng, 0x160d25, 0.3);
  speckle(g, rng, 0x4a2d7a, 14, 2, 0.8);
  speckle(g, rng, 0x2c1b47, 20, 1, 0.7);
}
function texGlowstone(g, rng) {
  noiseFill(g, rng, 0xb59341, 0.12);
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(rng() * 14), y = Math.floor(rng() * 14);
    R(g, x, y, 2, 2, hexStr(shadeColor(0xffeaa0, 0.85 + rng() * 0.3)));
  }
}

function texBricks(g, rng) {
  noiseFill(g, rng, 0x8f4034, 0.08);
  R(g, 0, 0, 16, 16, hexStr(0x9b4c3c));
  const mortar = '#b0a49b';
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    R(g, 0, y + 3, 16, 1, mortar);
    const off = row % 2 ? 0 : 4;
    for (let x = off; x < 16; x += 8) R(g, x, y, 1, 3, mortar);
  }
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (rng() < 0.12) P(g, x, y, 'rgba(0,0,0,0.10)');
    }
  }
}

function texStoneBricks(g, rng) {
  noiseFill(g, rng, 0x797979, 0.1);
  const line = '#5f5f5f';
  R(g, 0, 7, 16, 1, line); R(g, 0, 15, 16, 1, line);
  R(g, 7, 0, 1, 8, line); R(g, 3, 8, 1, 8, line); R(g, 11, 8, 1, 8, line);
  speckle(g, rng, 0x8c8c8c, 14, 1, 0.4);
}

function texSandstoneTop(g, rng) { noiseFill(g, rng, 0xe0d5a0, 0.06); speckle(g, rng, 0xcabd84, 12, 1, 0.4); }
function texSandstoneSide(g, rng) {
  noiseFill(g, rng, 0xdccf96, 0.05);
  R(g, 0, 0, 16, 4, hexStr(0xe6dbaa));
  R(g, 0, 4, 16, 1, hexStr(0xc4b47b));
  R(g, 0, 12, 16, 1, hexStr(0xc4b47b));
  for (let x = 0; x < 16; x++) if (rng() < 0.3) R(g, x, 5 + Math.floor(rng() * 7), 1, 1, hexStr(0xcec08a));
}

function texCactusSide(g, rng) {
  noiseFill(g, rng, 0x4d7a2c, 0.1);
  R(g, 0, 0, 1, 16, hexStr(0x3b5f21)); R(g, 15, 0, 1, 16, hexStr(0x3b5f21));
  for (let y = 1; y < 16; y += 4) for (let x = 3; x < 14; x += 5) {
    P(g, x, y, '#dfe7c8'); P(g, x, y + 1, '#b9c79a');
  }
}
function texCactusTop(g, rng) {
  noiseFill(g, rng, 0x5b8c34, 0.08);
  R(g, 3, 3, 10, 10, hexStr(0x6ea43f));
  R(g, 5, 5, 6, 6, hexStr(0x7cb44a));
}

function texCraftingTop(g, rng) {
  texPlanks(0xa07545)(g, rng);
  R(g, 0, 0, 16, 1, '#6e4f2c'); R(g, 0, 0, 1, 16, '#6e4f2c');
  R(g, 1, 1, 14, 14, '#8a6438');
  const grid = '#5d4126';
  for (const o of [4, 8, 12]) { R(g, o, 1, 1, 14, grid); R(g, 1, o, 14, 1, grid); }
  speckle(g, rng, 0x9c7341, 16, 1, 0.4);
}
function texCraftingSide(g, rng) {
  texPlanks(0xa07545)(g, rng);
  R(g, 1, 4, 6, 5, '#6e4f2c'); R(g, 9, 4, 6, 5, '#6e4f2c');
  R(g, 2, 5, 4, 3, '#8b6a3d'); R(g, 10, 5, 4, 3, '#8b6a3d');
}
function texCraftingFront(g, rng) {
  texPlanks(0xa07545)(g, rng);
  R(g, 2, 3, 12, 10, '#6e4f2c');
  R(g, 3, 4, 10, 8, '#8b6a3d');
  R(g, 5, 6, 2, 2, '#5d4126'); R(g, 9, 6, 2, 2, '#5d4126');
  R(g, 5, 9, 6, 1, '#5d4126');
}

function texFurnaceSide(g, rng) { noiseFill(g, rng, 0x6d6d6d, 0.1); speckle(g, rng, 0x5c5c5c, 18, 2, 0.5); }
function texFurnaceTop(g, rng) {
  texFurnaceSide(g, rng);
  R(g, 3, 3, 10, 10, '#565656'); R(g, 4, 4, 8, 8, '#616161');
}
function texFurnaceFront(on) {
  return (g, rng) => {
    texFurnaceSide(g, rng);
    R(g, 2, 4, 12, 10, '#3c3c3c');
    R(g, 3, 5, 10, 8, on ? '#2a1a08' : '#1e1e1e');
    if (on) {
      for (let i = 0; i < 26; i++) {
        const x = 3 + Math.floor(rng() * 10), y = 8 + Math.floor(rng() * 5);
        P(g, x, y, hexStr(shadeColor(rng() < 0.5 ? 0xffb02a : 0xd8500e, 0.85 + rng() * 0.35)));
      }
      R(g, 3, 12, 10, 1, '#ffd35c');
    } else {
      R(g, 3, 5, 10, 1, '#2b2b2b');
    }
    R(g, 2, 2, 12, 2, '#7a7a7a');
  };
}

function texChestFront(g, rng) {
  noiseFill(g, rng, 0x8a6132, 0.08);
  R(g, 0, 0, 16, 5, hexStr(0x9a6d38));
  R(g, 0, 5, 16, 1, '#5c3d1d');
  R(g, 0, 6, 16, 10, hexStr(0x8a6132));
  R(g, 6, 3, 4, 5, '#6b6b6b');           // 자물쇠
  R(g, 7, 5, 2, 2, '#2e2e2e');
  R(g, 0, 15, 16, 1, '#5c3d1d');
  R(g, 0, 0, 1, 16, '#5c3d1d'); R(g, 15, 0, 1, 16, '#5c3d1d');
}
function texChestSide(g, rng) {
  noiseFill(g, rng, 0x8a6132, 0.08);
  R(g, 0, 5, 16, 1, '#5c3d1d');
  R(g, 0, 0, 1, 16, '#5c3d1d'); R(g, 15, 0, 1, 16, '#5c3d1d');
  R(g, 0, 15, 16, 1, '#5c3d1d');
}
function texChestTop(g, rng) {
  noiseFill(g, rng, 0x96693a, 0.08);
  R(g, 0, 0, 16, 1, '#5c3d1d'); R(g, 0, 15, 16, 1, '#5c3d1d');
  R(g, 0, 0, 1, 16, '#5c3d1d'); R(g, 15, 0, 1, 16, '#5c3d1d');
  R(g, 6, 0, 4, 4, '#6b6b6b');
}

function texTntSide(g, rng) {
  noiseFill(g, rng, 0xc63a2c, 0.07);
  R(g, 0, 0, 16, 3, hexStr(0xcfcfcf));
  R(g, 0, 13, 16, 3, hexStr(0xcfcfcf));
  R(g, 0, 4, 16, 8, hexStr(0xd8453a));
  // "TNT"
  const w = '#ffffff';
  R(g, 2, 6, 4, 1, w); R(g, 3, 6, 1, 4, w);
  R(g, 7, 6, 1, 4, w); R(g, 8, 7, 1, 2, w); R(g, 9, 6, 1, 4, w);
  R(g, 11, 6, 4, 1, w); R(g, 12, 6, 1, 4, w);
}
function texTntTop(g, rng) {
  noiseFill(g, rng, 0xd8453a, 0.07);
  R(g, 0, 0, 16, 2, hexStr(0xcfcfcf));
  R(g, 5, 5, 6, 6, '#3b3b3b'); R(g, 6, 6, 4, 4, '#d0d0d0');
}
function texTntBottom(g, rng) { noiseFill(g, rng, 0xb0b0b0, 0.07); }

function texBookshelf(g, rng) {
  texPlanks(0xa07545)(g, rng);
  R(g, 0, 1, 16, 6, '#4d3a22');
  R(g, 0, 9, 16, 6, '#4d3a22');
  const cols = [0xb04a3a, 0x3a6ab0, 0xb0a23a, 0x4aa04a, 0x8a4ab0, 0xb07a3a];
  for (const y of [1, 9]) {
    let x = 0;
    while (x < 16) {
      const w = 1 + Math.floor(rng() * 2);
      R(g, x, y, w, 6, hexStr(shadeColor(pick(rng, cols), 0.8 + rng() * 0.4)));
      x += w + (rng() < 0.25 ? 1 : 0);
    }
  }
}

function texPumpkinSide(g, rng) {
  noiseFill(g, rng, 0xdb8016, 0.07);
  for (let x = 1; x < 16; x += 3) R(g, x, 0, 1, 16, hexStr(shadeColor(0xb2620d, 0.95)));
}
function texPumpkinTop(g, rng) {
  noiseFill(g, rng, 0xc9750f, 0.07);
  R(g, 6, 6, 4, 4, '#6f5a25'); R(g, 7, 5, 2, 6, '#7d6529');
}
function texPumpkinFace(g, rng) {
  texPumpkinSide(g, rng);
  const d = '#4a2c06';
  drawMask(g, [
    '................',
    '..##........##..',
    '..###......###..',
    '..####....####..',
    '...###....###...',
    '................',
    '................',
    '..############..',
    '..#.##.##.##.#..',
    '..#..#..#..#.#..',
    '..############..',
    '................',
  ], { '#': d });
}

function texWool(base) {
  return (g, rng) => {
    noiseFill(g, rng, base, 0.07);
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(rng() * 15), y = Math.floor(rng() * 15);
      P(g, x, y, hexStr(shadeColor(base, 0.9 + rng() * 0.2)));
      P(g, x + 1, y + 1, hexStr(shadeColor(base, 0.9 + rng() * 0.2)));
    }
  };
}

function texFarmland(wet) {
  return (g, rng) => {
    noiseFill(g, rng, wet ? 0x5d3b1e : 0x8b6647, 0.12);
    for (let y = 2; y < 16; y += 5) R(g, 0, y, 16, 1, hexStr(wet ? 0x452c14 : 0x6f4f36));
    speckle(g, rng, wet ? 0x3d2712 : 0x9d7a58, 18, 1, 0.5);
  };
}

function texWheat(stage) {
  return (g, rng) => {
    g.clearRect(0, 0, 16, 16);
    const grown = stage / 3;
    const col = stage >= 3 ? 0xd9c34a : mixHex(0x4f8f30, 0xb9b03e, grown);
    for (let x = 2; x < 16; x += 4) {
      const h = Math.round(5 + grown * 9);
      for (let y = 16 - h; y < 16; y++) {
        P(g, x, y, hexStr(shadeColor(col, 0.85 + rng() * 0.3)));
        if (stage >= 2 && y < 16 - h + 4) {
          P(g, x - 1, y, hexStr(shadeColor(col, 0.75 + rng() * 0.3)));
          P(g, x + 1, y, hexStr(shadeColor(col, 0.75 + rng() * 0.3)));
        }
      }
    }
  };
}

/* ---- 십자(cross) 렌더 식물 ---- */
function texTallGrass(g, rng) {
  g.clearRect(0, 0, 16, 16);
  for (let i = 0; i < 7; i++) {
    const x = 1 + i * 2 + Math.floor(rng() * 2);
    const h = 6 + Math.floor(rng() * 8);
    const col = shadeColor(0x5d9c3a, 0.8 + rng() * 0.45);
    for (let y = 16 - h; y < 16; y++) {
      const bend = Math.floor((16 - y) * 0.12 * (rng() < 0.5 ? 1 : -1));
      P(g, clamp(x + bend, 0, 15), y, hexStr(col));
    }
  }
}
function texFlower(petal, center) {
  return (g, rng) => {
    g.clearRect(0, 0, 16, 16);
    R(g, 7, 8, 2, 8, '#3f7a2c');               // 줄기
    P(g, 5, 11, '#3f7a2c'); P(g, 4, 12, '#3f7a2c');
    P(g, 10, 10, '#3f7a2c'); P(g, 11, 11, '#3f7a2c');
    const p = hexStr(petal);
    R(g, 5, 3, 6, 5, p); R(g, 4, 4, 8, 3, p);
    R(g, 6, 2, 4, 1, p); R(g, 6, 8, 4, 1, p);
    R(g, 7, 5, 2, 2, hexStr(center));
  };
}
function texDeadBush(g, rng) {
  g.clearRect(0, 0, 16, 16);
  const c = '#8a6a34';
  R(g, 7, 6, 2, 10, c);
  for (const [x, y] of [[5, 8], [4, 9], [10, 7], [11, 8], [5, 12], [11, 12], [3, 11], [12, 11]]) P(g, x, y, c);
}
function texSugarCane(g, rng) {
  g.clearRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y++) {
    const c = shadeColor(0x9bc26a, 0.85 + (y % 4 === 0 ? -0.12 : rng() * 0.2));
    R(g, 6, y, 4, 1, hexStr(c));
  }
  R(g, 5, 3, 1, 9, '#86ab5c'); R(g, 10, 5, 1, 9, '#86ab5c');
}
function texSapling(leaf) {
  return (g, rng) => {
    g.clearRect(0, 0, 16, 16);
    R(g, 7, 9, 2, 7, '#6b4a24');
    for (let i = 0; i < 30; i++) {
      const x = 3 + Math.floor(rng() * 10), y = 2 + Math.floor(rng() * 8);
      P(g, x, y, hexStr(shadeColor(leaf, 0.75 + rng() * 0.5)));
    }
  };
}
function texMushroom(cap, spot) {
  return (g, rng) => {
    g.clearRect(0, 0, 16, 16);
    R(g, 6, 10, 4, 6, '#e0d6c0');
    R(g, 4, 5, 8, 5, hexStr(cap));
    R(g, 5, 4, 6, 1, hexStr(cap));
    R(g, 3, 9, 10, 1, hexStr(shadeColor(cap, 0.8)));
    P(g, 6, 6, hexStr(spot)); P(g, 9, 7, hexStr(spot)); P(g, 7, 8, hexStr(spot));
  };
}
function texTorch(g, rng) {
  g.clearRect(0, 0, 16, 16);
  R(g, 7, 8, 2, 8, '#6b4a24');
  R(g, 7, 9, 1, 7, '#563a1b');
  R(g, 7, 6, 2, 2, '#ffdd55');
  P(g, 6, 7, '#ffaa22'); P(g, 9, 7, '#ffaa22'); P(g, 8, 5, '#fff3a0');
}
function texLadder(g, rng) {
  g.clearRect(0, 0, 16, 16);
  R(g, 2, 0, 2, 16, '#9b6e3c'); R(g, 12, 0, 2, 16, '#9b6e3c');
  for (let y = 2; y < 16; y += 5) R(g, 4, y, 8, 2, '#b07f47');
}

/* ---- 파괴 진행 크랙 오버레이 ---- */
function texCrack(stage) {
  return (g, rng) => {
    g.clearRect(0, 0, 16, 16);
    const density = (stage + 1) / 10;
    g.fillStyle = 'rgba(0,0,0,0.55)';
    // 중앙에서 뻗어나가는 균열
    const branches = 2 + stage;
    for (let b = 0; b < branches; b++) {
      let x = 8, y = 8;
      const ang = (b / branches) * TAU + rng() * 0.6;
      const len = 3 + density * 9;
      for (let s = 0; s < len; s++) {
        x += Math.cos(ang) + (rng() - 0.5) * 1.1;
        y += Math.sin(ang) + (rng() - 0.5) * 1.1;
        const ix = clamp(Math.round(x), 0, 15), iy = clamp(Math.round(y), 0, 15);
        g.fillRect(ix, iy, 1, 1);
        if (stage > 4 && rng() < 0.5) g.fillRect(clamp(ix + 1, 0, 15), iy, 1, 1);
      }
    }
  };
}

/* ==========================================================================
 *                          아이템 텍스처
 * ====================================================================== */

const TOOL_MASKS = {
  pickaxe: [
    '...ooo....ooo...',
    '..oxxxoooxxxo...',
    '..oxxxxxxxxxxo..',
    '...ooo.hh.ooo...',
    '.......hh.......',
    '......hh........',
    '......hh........',
    '.....hh.........',
    '.....hh.........',
    '....hh..........',
    '....hh..........',
    '...hh...........',
    '...dd...........',
  ],
  axe: [
    '.....oooo.......',
    '....oxxxxo......',
    '...oxxxxxxo.....',
    '...oxxxxxxo.....',
    '...oxxxhho......',
    '....oxxhh.......',
    '.....oohh.......',
    '.......hh.......',
    '......hh........',
    '......hh........',
    '.....hh.........',
    '.....hh.........',
    '....dd..........',
  ],
  shovel: [
    '......ooo.......',
    '.....oxxxo......',
    '.....oxxxo......',
    '.....oxxxo......',
    '......ohho......',
    '......hh........',
    '......hh........',
    '.....hh.........',
    '.....hh.........',
    '....hh..........',
    '....hh..........',
    '...hh...........',
    '...dd...........',
  ],
  sword: [
    '............xxo.',
    '...........xxxo.',
    '..........xxxo..',
    '.........xxxo...',
    '........xxxo....',
    '.......xxxo.....',
    '......xxxo......',
    '..o..xxxo.......',
    '..oo.xxo........',
    '...oohho........',
    '..ohhhhh........',
    '..ohh.oo........',
    '.ohh............',
    '.oo.............',
  ],
  hoe: [
    '....ooooooo.....',
    '....oxxxxxo.....',
    '....oxxoooo.....',
    '....ooohh.......',
    '.......hh.......',
    '......hh........',
    '......hh........',
    '.....hh.........',
    '.....hh.........',
    '....hh..........',
    '....hh..........',
    '...hh...........',
    '...dd...........',
  ],
};

function texTool(kind, matHex) {
  return (g) => {
    g.clearRect(0, 0, 16, 16);
    drawMask(g, TOOL_MASKS[kind], {
      x: hexStr(matHex),
      o: hexStr(shadeColor(matHex, 0.65)),
      h: '#9b6e3c',
      d: '#6b4a24',
    });
  };
}

const ARMOR_MASKS = {
  helmet: [
    '...xxxxxxxxxx...',
    '..xoxxxxxxxxox..',
    '..xx........xx..',
    '..xx........xx..',
    '..xxxx....xxxx..',
    '..xx.xxxxxx.xx..',
    '..xx........xx..',
    '..oo........oo..',
  ],
  chestplate: [
    '..xx........xx..',
    '.xxxx......xxxx.',
    '.xxxxxxxxxxxxxx.',
    '.xxoxxxxxxxxoxx.',
    '.xx.xxxxxxxx.xx.',
    '.xx.xxxxxxxx.xx.',
    '....xxxxxxxx....',
    '....xxoooxxx....',
    '....xxxxxxxx....',
    '....oo....oo....',
  ],
  leggings: [
    '..xxxxxxxxxxxx..',
    '..xxxxxxxxxxxx..',
    '..xxoxxxxxxoxx..',
    '..xxxx....xxxx..',
    '..xxxx....xxxx..',
    '..xxxx....xxxx..',
    '..xxx......xxx..',
    '..ooo......ooo..',
  ],
  boots: [
    '..xxxx....xxxx..',
    '..xxxx....xxxx..',
    '..xxxxx..xxxxx..',
    '.xxxxxx..xxxxxx.',
    '.xoxxxx..xxxxox.',
    '.oooooo..oooooo.',
  ],
};

function texArmor(kind, matHex) {
  return (g) => {
    g.clearRect(0, 0, 16, 16);
    drawMask(g, ARMOR_MASKS[kind], {
      x: hexStr(matHex), o: hexStr(shadeColor(matHex, 0.62)),
    });
  };
}

function texIngot(base) {
  return (g) => {
    g.clearRect(0, 0, 16, 16);
    drawMask(g, [
      '................',
      '....oooooo......',
      '...oxxxxxxo.....',
      '..oxxxxxxxxo....',
      '..oxxxxxxxxo....',
      '...oxxxxxxo.....',
      '....oooooo......',
      '................',
    ], { x: hexStr(base), o: hexStr(shadeColor(base, 0.6)) });
  };
}

function texGemItem(base) {
  return (g) => {
    g.clearRect(0, 0, 16, 16);
    drawMask(g, [
      '.....oooo.....',
      '...ooxxxxoo...',
      '..oxxxxxxxxo..',
      '..oxxlxxxxxo..',
      '..oxxxxxxxxo..',
      '...oxxxxxxo...',
      '....oxxxxo....',
      '.....oxxo.....',
      '......oo......',
    ], { x: hexStr(base), o: hexStr(shadeColor(base, 0.6)), l: '#ffffff' });
  };
}

function texDust(base) {
  return (g, rng) => {
    g.clearRect(0, 0, 16, 16);
    for (let i = 0; i < 46; i++) {
      const a = rng() * TAU, r = rng() * 6;
      P(g, Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r),
        hexStr(shadeColor(base, 0.75 + rng() * 0.5)));
    }
  };
}

function texStickItem(g) {
  g.clearRect(0, 0, 16, 16);
  drawMask(g, [
    '..........xx..',
    '.........xxd..',
    '........xxd...',
    '.......xxd....',
    '......xxd.....',
    '.....xxd......',
    '....xxd.......',
    '...xxd........',
    '..xxd.........',
    '..xd..........',
  ], { x: '#a9793f', d: '#6b4a24' });
}

function texFoodApple(g) {
  g.clearRect(0, 0, 16, 16);
  drawMask(g, [
    '.......gg.......',
    '....ggg.........',
    '...rrrrrrr......',
    '..rrrrrrrrr.....',
    '..rrrhrrrrr.....',
    '..rrhrrrrrr.....',
    '..rrrrrrrrr.....',
    '...rrrrrrr......',
    '....rrrrr.......',
  ], { r: '#c8342b', h: '#ef6a5c', g: '#4f8f30' });
}

function texBread(g, rng) {
  g.clearRect(0, 0, 16, 16);
  drawMask(g, [
    '...dddddddd...',
    '..dbbbbbbbbd..',
    '.dbbbhbbhbbbd.',
    '.dbbbbbbbbbbd.',
    '.dbbhbbbbhbbd.',
    '..dbbbbbbbbd..',
    '...dddddddd...',
  ], { b: '#c08b45', d: '#8a5e29', h: '#d8a866' });
}

function texMeat(raw, cooked, kind) {
  return (g, rng) => {
    g.clearRect(0, 0, 16, 16);
    const base = raw ? cooked : cooked;
    void kind;
    drawMask(g, [
      '....oooooo....',
      '..ooxxxxxxoo..',
      '.oxxxxxxxxxxo.',
      '.oxxxfffxxxxo.',
      '.oxxxxxxxxxxo.',
      '..oxxxxxxxxo..',
      '...oooooooo...',
    ], { x: hexStr(base), o: hexStr(shadeColor(base, 0.62)), f: hexStr(shadeColor(base, 1.35)) });
  };
}

function texBucket(fillHex) {
  return (g) => {
    g.clearRect(0, 0, 16, 16);
    const rows = [
      '..o........o..',
      '..oo......oo..',
      '...oooooooo...',
      '...offffffo...',
      '...offffffo...',
      '...offffffo...',
      '...offffffo...',
      '....oooooo....',
    ];
    drawMask(g, rows, { o: '#b8bcc4', f: fillHex ? hexStr(fillHex) : '#dfe3e9' });
  };
}

function texSeeds(g, rng) {
  g.clearRect(0, 0, 16, 16);
  for (let i = 0; i < 10; i++) {
    const x = 3 + Math.floor(rng() * 10), y = 4 + Math.floor(rng() * 8);
    R(g, x, y, 2, 1, '#84a44a'); P(g, x, y + 1, '#5f7a33');
  }
}

function texWheatItem(g, rng) {
  g.clearRect(0, 0, 16, 16);
  for (const x of [4, 8, 11]) {
    for (let y = 2; y < 15; y++) P(g, x, y, '#c9a93a');
    for (let y = 2; y < 9; y += 2) { P(g, x - 1, y, '#e0c45a'); P(g, x + 1, y + 1, '#e0c45a'); }
  }
}

function texBow(g) {
  g.clearRect(0, 0, 16, 16);
  drawMask(g, [
    '.........ooo....',
    '........o..xo...',
    '.......o....x...',
    '......s.....xo..',
    '.....s......xo..',
    '....s.......xo..',
    '...s........xo..',
    '...s........xo..',
    '....s.......xo..',
    '.....s......xo..',
    '......s.....xo..',
    '.......o....x...',
    '........o..xo...',
    '.........ooo....',
  ], { x: '#9b6e3c', o: '#6b4a24', s: '#e8e8e8' });
}

function texArrowItem(g) {
  g.clearRect(0, 0, 16, 16);
  drawMask(g, [
    '.............xx.',
    '............xxx.',
    '...........xx...',
    '..........xx....',
    '.........xx.....',
    '........xx......',
    '.......xx.......',
    '......xx........',
    '.....xx.........',
    '..f.xx..........',
    '.fffx...........',
    '..ffff..........',
    '.f..ff..........',
    '.....f..........',
  ], { x: '#c9c9c9', f: '#e8e8e8' });
}

function texBone(g) {
  g.clearRect(0, 0, 16, 16);
  drawMask(g, [
    '...........oo...',
    '..........o..o..',
    '...........oo...',
    '..........oo....',
    '.........oo.....',
    '........oo......',
    '.......oo.......',
    '......oo........',
    '.....oo.........',
    '....oo..........',
    '...oo...........',
    '..o..o..........',
    '...oo...........',
  ], { o: '#e8e4d4' });
}

function texFeather(g) {
  g.clearRect(0, 0, 16, 16);
  drawMask(g, [
    '...........ww...',
    '..........wwww..',
    '.........wwwww..',
    '........wwwww...',
    '.......wwwww....',
    '......wwwww.....',
    '.....wwww.......',
    '....www.........',
    '...ww...........',
    '..w.............',
  ], { w: '#f2f2f2' });
}

function texString(g) {
  g.clearRect(0, 0, 16, 16);
  drawMask(g, [
    '.....ww.........',
    '....w..w........',
    '....w...w.......',
    '.....w..w.......',
    '......ww........',
    '.......w........',
    '.......w........',
    '......w.........',
    '......w.........',
    '.....w..........',
  ], { w: '#e6e6e6' });
}

function texLeather(g, rng) {
  g.clearRect(0, 0, 16, 16);
  drawMask(g, [
    '...oooooooo...',
    '..oxxxxxxxxo..',
    '..oxxxxxxxxo..',
    '..oxxxxxxxxo..',
    '..oxxxxxxxxo..',
    '...oooooooo...',
  ], { x: '#a06a3c', o: '#6f4526' });
}

function texPaper(g) {
  g.clearRect(0, 0, 16, 16);
  R(g, 3, 3, 10, 11, '#f2f2ea');
  R(g, 4, 6, 8, 1, '#c8c8c0'); R(g, 4, 9, 8, 1, '#c8c8c0');
}

function texFlint(g, rng) {
  g.clearRect(0, 0, 16, 16);
  drawMask(g, [
    '.....ooo......',
    '...oo###oo....',
    '..o#######o...',
    '..o#######o...',
    '...oo####o....',
    '.....oooo.....',
  ], { '#': '#3a3a42', o: '#26262c' });
}

function texClayBall(g) {
  g.clearRect(0, 0, 16, 16);
  drawMask(g, [
    '....oooo....',
    '...oxxxxo...',
    '..oxxxxxxo..',
    '..oxxxxxxo..',
    '...oxxxxo...',
    '....oooo....',
  ], { x: '#b1b5c4', o: '#8f93a5' });
}

function texBrickItem(g) {
  g.clearRect(0, 0, 16, 16);
  drawMask(g, [
    '..oooooooooo..',
    '..oxxxxxxxxo..',
    '..oxxxxxxxxo..',
    '..oooooooooo..',
  ], { x: '#a4503f', o: '#7c3a2d' });
}

/* ==========================================================================
 *                          몹 텍스처
 * ====================================================================== */

function mobFace(base, eye, extra) {
  return (g, rng) => {
    noiseFill(g, rng, base, 0.08);
    R(g, 3, 5, 3, 3, hexStr(eye));
    R(g, 10, 5, 3, 3, hexStr(eye));
    if (extra === 'mouth') R(g, 5, 11, 6, 2, hexStr(shadeColor(base, 0.55)));
    if (extra === 'creeper') {
      R(g, 6, 8, 4, 3, '#0d0d0d'); R(g, 5, 11, 2, 3, '#0d0d0d'); R(g, 9, 11, 2, 3, '#0d0d0d');
    }
    if (extra === 'snout') {
      R(g, 5, 9, 6, 5, hexStr(shadeColor(base, 1.12)));
      R(g, 6, 11, 1, 2, hexStr(shadeColor(base, 0.6))); R(g, 9, 11, 1, 2, hexStr(shadeColor(base, 0.6)));
    }
    if (extra === 'beak') { R(g, 6, 9, 4, 3, '#e0a32a'); }
  };
}
function mobSkin(base, spots) {
  return (g, rng) => {
    noiseFill(g, rng, base, 0.09);
    if (spots) for (let i = 0; i < 8; i++) {
      const x = Math.floor(rng() * 13), y = Math.floor(rng() * 13);
      R(g, x, y, 2 + Math.floor(rng() * 2), 2 + Math.floor(rng() * 2),
        hexStr(shadeColor(spots, 0.85 + rng() * 0.3)));
    }
  };
}

/* ==========================================================================
 *                          하늘 / 기타
 * ====================================================================== */
function texSun(g) {
  g.clearRect(0, 0, 16, 16);
  R(g, 0, 0, 16, 16, '#fff3c4');
  R(g, 1, 1, 14, 14, '#ffe680');
  R(g, 3, 3, 10, 10, '#fff8d8');
}
function texMoon(g, rng) {
  g.clearRect(0, 0, 16, 16);
  R(g, 2, 2, 12, 12, '#e8eef5');
  for (let i = 0; i < 6; i++) {
    const x = 3 + Math.floor(rng() * 9), y = 3 + Math.floor(rng() * 9);
    R(g, x, y, 2, 2, '#c9d3dd');
  }
}
function texParticleGeneric(g) {
  g.clearRect(0, 0, 16, 16);
  R(g, 0, 0, 16, 16, '#ffffff');
}
function texMissing(g) {
  R(g, 0, 0, 8, 8, '#000000'); R(g, 8, 8, 8, 8, '#000000');
  R(g, 8, 0, 8, 8, '#ff00ff'); R(g, 0, 8, 8, 8, '#ff00ff');
}

/* ==========================================================================
 *                        전체 타일 등록
 * ====================================================================== */
function buildTextures() {
  if (Textures.built) return;

  defTile('missing', texMissing);

  /* --- 자연 --- */
  defTile('stone', texStone);
  defTile('cobblestone', texCobble);
  defTile('mossy_cobblestone', texMossy);
  defTile('dirt', texDirt);
  defTile('grass_top', texGrassTop);
  defTile('grass_side', texGrassSide);
  defTile('snow_side', texSnowSide);
  defTile('sand', texSand);
  defTile('gravel', texGravel);
  defTile('bedrock', texBedrock);
  defTile('clay', texClay);
  defTile('snow', texSnow);
  defTile('ice', texIce);
  defTile('obsidian', texObsidian);
  defTile('glowstone', texGlowstone);
  defTile('water', texWater);
  defTile('lava', texLava);
  defTile('glass', texGlass);

  /* --- 나무 --- */
  defTile('oak_planks', texPlanks(0xa07545));
  defTile('birch_planks', texPlanks(0xc8b98a));
  defTile('spruce_planks', texPlanks(0x745338));
  defTile('oak_log_side', texLogSide(0x6b5334, 0xa9834e));
  defTile('oak_log_top', texLogTop(0x6b5334, 0xb08b56));
  defTile('birch_log_side', texLogSide(0xdcdcd2, 0xc8c0a8));
  defTile('birch_log_top', texLogTop(0xdcdcd2, 0xd8cfae));
  defTile('spruce_log_side', texLogSide(0x453220, 0x7a5a38));
  defTile('spruce_log_top', texLogTop(0x453220, 0x8a6740));
  defTile('oak_leaves', texLeaves(0x3f8f2e));
  defTile('birch_leaves', texLeaves(0x74a63c));
  defTile('spruce_leaves', texLeaves(0x2c6b32));

  /* --- 광물 --- */
  defTile('coal_ore', texOre(0x2b2b2b, '#151515'));
  defTile('iron_ore', texOre(0xd8a173, '#a87a51'));
  defTile('gold_ore', texOre(0xf5d33a, '#c4a520'));
  defTile('diamond_ore', texOre(0x5ce4dd, '#31b0ab'));
  defTile('redstone_ore', texOre(0xd42020, '#8f1212'));
  defTile('lapis_ore', texOre(0x2c56c4, '#1a3585'));
  defTile('emerald_ore', texOre(0x2fd25c, '#17a03d'));

  defTile('iron_block', texMetalBlock(0xd8d8d8));
  defTile('gold_block', texMetalBlock(0xf5d33a));
  defTile('diamond_block', texGem(0x5ce4dd));
  defTile('emerald_block', texGem(0x2fd25c));
  defTile('lapis_block', texGem(0x2c56c4));
  defTile('coal_block', (g, rng) => { noiseFill(g, rng, 0x1d1d1d, 0.2); speckle(g, rng, 0x000000, 20, 2, 0.6); });

  /* --- 가공 블록 --- */
  defTile('bricks', texBricks);
  defTile('stone_bricks', texStoneBricks);
  defTile('sandstone_top', texSandstoneTop);
  defTile('sandstone_side', texSandstoneSide);
  defTile('cactus_side', texCactusSide);
  defTile('cactus_top', texCactusTop);
  defTile('crafting_table_top', texCraftingTop);
  defTile('crafting_table_side', texCraftingSide);
  defTile('crafting_table_front', texCraftingFront);
  defTile('furnace_side', texFurnaceSide);
  defTile('furnace_top', texFurnaceTop);
  defTile('furnace_front', texFurnaceFront(false));
  defTile('furnace_front_on', texFurnaceFront(true));
  defTile('chest_front', texChestFront);
  defTile('chest_side', texChestSide);
  defTile('chest_top', texChestTop);
  defTile('tnt_side', texTntSide);
  defTile('tnt_top', texTntTop);
  defTile('tnt_bottom', texTntBottom);
  defTile('bookshelf', texBookshelf);
  defTile('pumpkin_side', texPumpkinSide);
  defTile('pumpkin_top', texPumpkinTop);
  defTile('pumpkin_face', texPumpkinFace);
  defTile('ladder', texLadder);

  /* --- 양털 --- */
  const WOOLS = {
    white: 0xe9ecec, orange: 0xf07613, magenta: 0xbd44b3, light_blue: 0x3ab3da,
    yellow: 0xf8c627, lime: 0x70b919, pink: 0xed8dac, gray: 0x3e4447,
    light_gray: 0x8e8e86, cyan: 0x158991, purple: 0x792aac, blue: 0x35399d,
    brown: 0x724728, green: 0x546d1b, red: 0xa12722, black: 0x141519,
  };
  for (const k in WOOLS) defTile('wool_' + k, texWool(WOOLS[k]));

  /* --- 농사 / 식물 --- */
  defTile('farmland', texFarmland(false));
  defTile('farmland_wet', texFarmland(true));
  for (let i = 0; i < 4; i++) defTile('wheat' + i, texWheat(i));
  defTile('tall_grass', texTallGrass);
  defTile('dandelion', texFlower(0xf5e642, 0xd8b020));
  defTile('poppy', texFlower(0xd63b2f, 0x2b2b2b));
  defTile('blue_orchid', texFlower(0x3ab3da, 0xf5e642));
  defTile('dead_bush', texDeadBush);
  defTile('sugar_cane', texSugarCane);
  defTile('oak_sapling', texSapling(0x3f8f2e));
  defTile('birch_sapling', texSapling(0x74a63c));
  defTile('spruce_sapling', texSapling(0x2c6b32));
  defTile('red_mushroom', texMushroom(0xc83a2e, 0xe8e8e8));
  defTile('brown_mushroom', texMushroom(0x9b6a42, 0xc19a72));
  defTile('torch', texTorch);

  /* --- 크랙 --- */
  for (let i = 0; i < 10; i++) defTile('crack' + i, texCrack(i));

  /* --- 도구 --- */
  const TOOL_MATS = {
    wooden: 0xa9793f, stone: 0x8a8a8a, iron: 0xdcdcdc, golden: 0xf5d33a, diamond: 0x5ce4dd,
  };
  for (const m in TOOL_MATS) {
    for (const k of ['pickaxe', 'axe', 'shovel', 'sword', 'hoe']) {
      defTile(`${m}_${k}`, texTool(k, TOOL_MATS[m]));
    }
  }
  /* --- 방어구 --- */
  const ARMOR_MATS = { leather: 0xa06a3c, iron: 0xdcdcdc, golden: 0xf5d33a, diamond: 0x5ce4dd };
  for (const m in ARMOR_MATS) {
    for (const k of ['helmet', 'chestplate', 'leggings', 'boots']) {
      defTile(`${m}_${k}`, texArmor(k, ARMOR_MATS[m]));
    }
  }

  /* --- 재료 아이템 --- */
  defTile('stick', texStickItem);
  defTile('coal', texGemItem(0x2b2b2b));
  defTile('charcoal', texGemItem(0x3d3229));
  defTile('iron_ingot', texIngot(0xdcdcdc));
  defTile('gold_ingot', texIngot(0xf5d33a));
  defTile('diamond', texGemItem(0x5ce4dd));
  defTile('emerald', texGemItem(0x2fd25c));
  defTile('redstone', texDust(0xd42020));
  defTile('lapis_lazuli', texGemItem(0x2c56c4));
  defTile('gunpowder', texDust(0xa0a0a0));
  defTile('bone', texBone);
  defTile('feather', texFeather);
  defTile('string', texString);
  defTile('leather', texLeather);
  defTile('paper', texPaper);
  defTile('flint', texFlint);
  defTile('clay_ball', texClayBall);
  defTile('brick_item', texBrickItem);
  defTile('bow', texBow);
  defTile('arrow', texArrowItem);
  defTile('bucket', texBucket(null));
  defTile('water_bucket', texBucket(0x2f5fd0));
  defTile('lava_bucket', texBucket(0xd45a12));
  defTile('seeds', texSeeds);
  defTile('wheat_item', texWheatItem);

  /* --- 음식 --- */
  defTile('apple', texFoodApple);
  defTile('bread', texBread);
  defTile('porkchop', texMeat(true, 0xe89a9a, 'pork'));
  defTile('cooked_porkchop', texMeat(false, 0xb0703a, 'pork'));
  defTile('beef', texMeat(true, 0xc25050, 'beef'));
  defTile('cooked_beef', texMeat(false, 0x8a5029, 'beef'));
  defTile('chicken', texMeat(true, 0xeab89a, 'chicken'));
  defTile('cooked_chicken', texMeat(false, 0xc08a4a, 'chicken'));
  defTile('mutton', texMeat(true, 0xd06a6a, 'mutton'));
  defTile('cooked_mutton', texMeat(false, 0x9a5a32, 'mutton'));

  /* --- 몹 --- */
  defTile('zombie_face', mobFace(0x4b7a42, 0x0d1a0d, 'mouth'));
  defTile('zombie_skin', mobSkin(0x4b7a42, 0x3d6636));
  defTile('zombie_shirt', mobSkin(0x2f6b8f, 0x265877));
  defTile('skeleton_face', mobFace(0xd6d6d0, 0x1a1a1a, 'mouth'));
  defTile('skeleton_skin', mobSkin(0xd6d6d0, 0xb9b9b2));
  defTile('creeper_face', mobFace(0x6bbd5a, 0x0d0d0d, 'creeper'));
  defTile('creeper_skin', mobSkin(0x6bbd5a, 0x4f9142));
  defTile('spider_face', mobFace(0x3a2a24, 0xc42020, null));
  defTile('spider_skin', mobSkin(0x3a2a24, 0x261a16));
  defTile('pig_face', mobFace(0xeda8a8, 0x2a1a1a, 'snout'));
  defTile('pig_skin', mobSkin(0xeda8a8, 0xd68f8f));
  defTile('cow_face', mobFace(0x4b3a2a, 0x1a1a1a, 'snout'));
  defTile('cow_skin', mobSkin(0x4b3a2a, 0xe8e8e8));
  defTile('sheep_face', mobFace(0xe0c9b0, 0x1a1a1a, null));
  defTile('sheep_skin', mobSkin(0xf0f0f0, 0xdedede));
  defTile('chicken_face', mobFace(0xf0f0f0, 0x1a1a1a, 'beak'));
  defTile('chicken_skin', mobSkin(0xf0f0f0, 0xdedede));
  defTile('player_face', mobFace(0xd8a074, 0x2a4a8a, 'mouth'));
  defTile('player_skin', mobSkin(0xd8a074, 0xc08a5c));
  defTile('player_shirt', mobSkin(0x2f8f8f, 0x257676));
  defTile('player_pants', mobSkin(0x3a3a8a, 0x2e2e6e));

  /* --- 하늘 / 파티클 --- */
  defTile('sun', texSun);
  defTile('moon', texMoon);
  defTile('particle', texParticleGeneric);

  Textures.built = true;
  console.log(`[textures] ${Textures.tiles.length}개 타일 생성 완료`);
}

/** 타일 전체를 세로로 이어붙인 RGBA 버퍼 (TEXTURE_2D_ARRAY 업로드용) */
function texturesToArrayBuffer() {
  const n = Textures.tiles.length;
  const out = new Uint8Array(TILE_SIZE * TILE_SIZE * 4 * n);
  for (let i = 0; i < n; i++) {
    const d = Textures.tiles[i].ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
    out.set(d, i * TILE_SIZE * TILE_SIZE * 4);
  }
  return out;
}
