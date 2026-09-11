/* =========================================================================
 *  worldgen.js — 지형 생성
 *  대륙/침식/산맥 노이즈 → 높이, 기온·습도 → 바이옴,
 *  3D 노이즈 동굴, 광맥, 나무/식물 장식, 바다·강·용암 호수
 * ========================================================================= */
'use strict';

/* 바이옴 상수 */
const BIOME_OCEAN = 0, BIOME_BEACH = 1, BIOME_PLAINS = 2, BIOME_FOREST = 3,
  BIOME_DESERT = 4, BIOME_TAIGA = 5, BIOME_MOUNTAINS = 6, BIOME_SAVANNA = 7, BIOME_SWAMP = 8;

const BIOME_INFO = {
  [BIOME_OCEAN]: { name: '바다', grass: 0x3f8f6f, tree: 0, sky: 0x78a7ff },
  [BIOME_BEACH]: { name: '해변', grass: 0x79c05a, tree: 0, sky: 0x78a7ff },
  [BIOME_PLAINS]: { name: '평원', grass: 0x79c05a, tree: 0.008, sky: 0x78a7ff },
  [BIOME_FOREST]: { name: '숲', grass: 0x59a83a, tree: 0.09, sky: 0x76a5ff },
  [BIOME_DESERT]: { name: '사막', grass: 0xbfb755, tree: 0, sky: 0x8cb3ff },
  [BIOME_TAIGA]: { name: '침엽수림', grass: 0x4d8f6b, tree: 0.06, sky: 0x83a9d6 },
  [BIOME_MOUNTAINS]: { name: '산악', grass: 0x6ba05a, tree: 0.01, sky: 0x7fb0ff },
  [BIOME_SAVANNA]: { name: '사바나', grass: 0xa8b04f, tree: 0.004, sky: 0x8cb3ff },
  [BIOME_SWAMP]: { name: '늪', grass: 0x4c763c, tree: 0.02, sky: 0x6f8fbf },
};

class WorldGen {
  constructor(seed) {
    this.seed = seed | 0;
    this.n = new NoiseSet(this.seed);
    this._hCache = new Map();
  }

  /* ------------------------------------------------------- 열 단위 계산 */
  /** 지형 높이 (연속값) */
  heightAt(wx, wz) {
    const n = this.n;
    const cont = n.continent.fbm2(wx / 900, wz / 900, 4);          // -1..1 대륙
    const ero = n.erosion.fbm2(wx / 320, wz / 320, 3);
    const det = n.detail.fbm2(wx / 55, wz / 55, 4);
    const ridge = n.mountain.ridged2(wx / 260, wz / 260, 4);        // 0..1
    const mMask = clamp((cont + 0.15) * 1.6, 0, 1) * clamp((ridge - 0.45) * 3.2, 0, 1);

    let h = SEA_LEVEL + cont * 22 + det * 4.5 - ero * 5;
    h += mMask * ridge * 46;

    /* 강: river 노이즈의 0 부근을 깎아낸다 */
    const riv = Math.abs(n.river.fbm2(wx / 520, wz / 520, 2));
    if (riv < 0.045) {
      const t = 1 - riv / 0.045;
      h = lerp(h, SEA_LEVEL - 3.5, smoothstep(t) * 0.9);
    }
    return h;
  }

  temperatureAt(wx, wz) { return this.n.temperature.fbm2(wx / 680, wz / 680, 3); }
  humidityAt(wx, wz) { return this.n.humidity.fbm2(wx / 540, wz / 540, 3); }

  biomeAt(wx, wz, h) {
    if (h === undefined) h = this.heightAt(wx, wz);
    const t = this.temperatureAt(wx, wz);
    const hum = this.humidityAt(wx, wz);
    if (h < SEA_LEVEL - 1.5) return BIOME_OCEAN;
    if (h < SEA_LEVEL + 1.6) return (t > 0.2 || hum < 0.1) ? BIOME_BEACH : BIOME_SWAMP;
    if (h > 92) return BIOME_MOUNTAINS;
    if (t < -0.28) return BIOME_TAIGA;
    if (t > 0.32 && hum < -0.05) return BIOME_DESERT;
    if (t > 0.2 && hum < 0.16) return BIOME_SAVANNA;
    if (hum > 0.12) return BIOME_FOREST;
    return BIOME_PLAINS;
  }

  /* --------------------------------------------------------- 청크 생성 */
  generateChunk(chunk) {
    const B = chunk.blocks, M = chunk.meta;
    const ox = chunk.cx * CHUNK_SIZE, oz = chunk.cz * CHUNK_SIZE;
    const rng = mulberry32(this.seed ^ Math.imul(chunk.cx, 0x9e3779b1) ^ Math.imul(chunk.cz, 0x85ebca6b));
    const n = this.n;
    chunk.biomes = new Uint8Array(CHUNK_AREA);
    chunk.surfaceY = new Int16Array(CHUNK_AREA);

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = ox + lx, wz = oz + lz;
        const hf = this.heightAt(wx, wz);
        const h = Math.max(2, Math.min(CHUNK_HEIGHT - 12, Math.round(hf)));
        const biome = this.biomeAt(wx, wz, hf);
        chunk.biomes[lz * CHUNK_SIZE + lx] = biome;
        chunk.surfaceY[lz * CHUNK_SIZE + lx] = h;

        const t = this.temperatureAt(wx, wz);

        /* 표층 구성 */
        let topBlock = BlockIds.grass_block, fillBlock = BlockIds.dirt, fillDepth = 3;
        switch (biome) {
          case BIOME_OCEAN:
            topBlock = (hf < SEA_LEVEL - 8) ? BlockIds.gravel : BlockIds.sand;
            fillBlock = BlockIds.sand; fillDepth = 3; break;
          case BIOME_BEACH:
            topBlock = BlockIds.sand; fillBlock = BlockIds.sand; fillDepth = 4; break;
          case BIOME_DESERT:
            topBlock = BlockIds.sand; fillBlock = BlockIds.sandstone; fillDepth = 5; break;
          case BIOME_SWAMP:
            topBlock = BlockIds.grass_block; fillBlock = BlockIds.dirt; fillDepth = 4; break;
          case BIOME_MOUNTAINS:
            if (h > 104) { topBlock = BlockIds.snow_block; fillBlock = BlockIds.stone; fillDepth = 2; }
            else if (h > 96) { topBlock = BlockIds.stone; fillBlock = BlockIds.stone; fillDepth = 3; }
            break;
          case BIOME_TAIGA:
            topBlock = BlockIds.grass_block; fillBlock = BlockIds.dirt; fillDepth = 3; break;
          default: break;
        }

        for (let y = 0; y <= h; y++) {
          const i = cidx(lx, y, lz);
          if (y === 0) { B[i] = BlockIds.bedrock; continue; }
          if (y <= 3 && rng() < (4 - y) * 0.33) { B[i] = BlockIds.bedrock; continue; }

          if (y === h) B[i] = (h < SEA_LEVEL - 1 && biome !== BIOME_OCEAN) ? BlockIds.dirt : topBlock;
          else if (y > h - 1 - fillDepth) B[i] = fillBlock;
          else B[i] = BlockIds.stone;
        }

        /* 바다/강 채우기 */
        for (let y = h + 1; y <= SEA_LEVEL; y++) {
          const i = cidx(lx, y, lz);
          if (B[i] !== 0) continue;
          if (t < -0.45 && y === SEA_LEVEL) { B[i] = BlockIds.ice; }
          else { B[i] = BlockIds.water; M[i] = 0; }
        }
        /* 추운 지역 눈 덮개 */
        if (t < -0.32 && h > SEA_LEVEL && biome !== BIOME_DESERT) {
          const i = cidx(lx, h + 1, lz);
          if (B[i] === 0 && h + 1 < CHUNK_HEIGHT) B[i] = BlockIds.snow_block;
        }
      }
    }

    this._carveCaves(chunk, ox, oz);
    this._placeOres(chunk, rng, ox, oz);

    chunk.generated = true;
    chunk.empty = false;
    chunk.recalcHeightMap();
  }

  /* ------------------------------------------------------------- 동굴 */
  _carveCaves(chunk, ox, oz) {
    const B = chunk.blocks;
    const n = this.n;
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = ox + lx, wz = oz + lz;
        const surf = chunk.surfaceY[lz * CHUNK_SIZE + lx];
        const maxY = Math.min(surf - 2, CHUNK_HEIGHT - 1);
        for (let y = 1; y <= maxY; y++) {
          const i = cidx(lx, y, lz);
          const id = B[i];
          if (id === 0 || id === BlockIds.bedrock || id === BlockIds.water) continue;

          /* 두 개의 스파게티 노이즈 교집합 → 터널 */
          const a = n.cave.fbm3(wx / 42, y / 26, wz / 42, 3);
          const b = n.cave2.fbm3(wx / 38, y / 22, wz / 38, 3);
          let carve = Math.abs(a) < 0.052 && Math.abs(b) < 0.075;

          /* 치즈 동굴 (큰 공동) */
          if (!carve && y < 48) {
            const c = n.cheese.noise3(wx / 72, y / 34, wz / 72);
            if (c > 0.58) carve = true;
          }
          if (!carve) continue;

          /* 물 아래 얕은 곳은 뚫지 않음 (바다 누수 방지) */
          if (y > surf - 4 && surf <= SEA_LEVEL + 1) continue;

          B[i] = (y <= 9) ? BlockIds.lava : 0;
        }
      }
    }
  }

  /* ------------------------------------------------------------- 광맥 */
  _placeOres(chunk, rng, ox, oz) {
    const veins = [
      { id: BlockIds.dirt, count: 8, size: 20, min: 6, max: 100 },
      { id: BlockIds.gravel, count: 6, size: 18, min: 6, max: 100 },
      { id: BlockIds.coal_ore, count: 18, size: 13, min: 6, max: 110 },
      { id: BlockIds.iron_ore, count: 12, size: 8, min: 5, max: 66 },
      { id: BlockIds.lapis_ore, count: 3, size: 6, min: 12, max: 36 },
      { id: BlockIds.gold_ore, count: 3, size: 7, min: 5, max: 34 },
      { id: BlockIds.redstone_ore, count: 5, size: 8, min: 4, max: 18 },
      { id: BlockIds.diamond_ore, count: 2, size: 6, min: 4, max: 17 },
      { id: BlockIds.emerald_ore, count: 1, size: 2, min: 5, max: 32 },
    ];
    const B = chunk.blocks;
    for (const v of veins) {
      for (let k = 0; k < v.count; k++) {
        if (v.id === BlockIds.emerald_ore && rng() > 0.35) continue;
        const sx = Math.floor(rng() * CHUNK_SIZE);
        const sz = Math.floor(rng() * CHUNK_SIZE);
        const sy = v.min + Math.floor(rng() * (v.max - v.min));
        const size = 2 + Math.floor(rng() * v.size);
        let px = sx, py = sy, pz = sz;
        for (let s = 0; s < size; s++) {
          if (px >= 0 && px < CHUNK_SIZE && pz >= 0 && pz < CHUNK_SIZE && py > 0 && py < CHUNK_HEIGHT) {
            const i = cidx(px, py, pz);
            if (B[i] === BlockIds.stone) B[i] = v.id;
          }
          px += Math.floor(rng() * 3) - 1;
          py += Math.floor(rng() * 3) - 1;
          pz += Math.floor(rng() * 3) - 1;
          px = clamp(px, 0, CHUNK_SIZE - 1); pz = clamp(pz, 0, CHUNK_SIZE - 1);
          py = clamp(py, 1, CHUNK_HEIGHT - 1);
        }
      }
    }

    /* 점토: 물가 바닥 */
    for (let k = 0; k < 3; k++) {
      const sx = Math.floor(rng() * CHUNK_SIZE), sz = Math.floor(rng() * CHUNK_SIZE);
      const surf = chunk.surfaceY[sz * CHUNK_SIZE + sx];
      if (surf > SEA_LEVEL - 1 || surf < SEA_LEVEL - 6) continue;
      for (let d = 0; d < 2; d++) {
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          const x = sx + dx, z = sz + dz, y = surf - d;
          if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 1) continue;
          const i = cidx(x, y, z);
          if (B[i] === BlockIds.sand || B[i] === BlockIds.dirt) B[i] = BlockIds.clay;
        }
      }
    }
  }

  /* ----------------------------------------------------------- 장식 */
  /** 나무·식물. world 를 통해 청크 경계를 넘어 쓸 수 있다. */
  decorateChunk(chunk, world) {
    if (chunk.decorated) return;
    const ox = chunk.cx * CHUNK_SIZE, oz = chunk.cz * CHUNK_SIZE;
    const rng = mulberry32(this.seed ^ Math.imul(chunk.cx + 7919, 0x1b873593) ^ Math.imul(chunk.cz + 104729, 0x27d4eb2d));

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const idx = lz * CHUNK_SIZE + lx;
        const biome = chunk.biomes ? chunk.biomes[idx] : BIOME_PLAINS;
        const surf = chunk.surfaceY ? chunk.surfaceY[idx] : SEA_LEVEL;
        const wx = ox + lx, wz = oz + lz;
        if (surf <= SEA_LEVEL) {
          /* 사탕수수: 물가 */
          if (biome !== BIOME_OCEAN) continue;
          continue;
        }
        const top = chunk.get(lx, surf, lz);
        const above = chunk.get(lx, surf + 1, lz);
        if (above !== 0) continue;

        const info = BIOME_INFO[biome];

        /* --- 나무 --- */
        if (top === BlockIds.grass_block && rng() < info.tree) {
          if (this._spaceForTree(chunk, lx, surf + 1, lz)) {
            if (biome === BIOME_TAIGA) this._spruce(world, wx, surf + 1, wz, rng);
            else if (rng() < 0.22) this._birch(world, wx, surf + 1, wz, rng);
            else this._oak(world, wx, surf + 1, wz, rng);
            continue;
          }
        }

        /* --- 선인장 / 죽은 덤불 --- */
        if (biome === BIOME_DESERT) {
          if (top === BlockIds.sand && rng() < 0.012) {
            const h = 1 + Math.floor(rng() * 3);
            for (let i = 0; i < h; i++) world.setGenBlock(wx, surf + 1 + i, wz, BlockIds.cactus);
            continue;
          }
          if (top === BlockIds.sand && rng() < 0.01) {
            world.setGenBlock(wx, surf + 1, wz, BlockIds.dead_bush);
            continue;
          }
        }

        /* --- 풀 / 꽃 --- */
        if (top === BlockIds.grass_block) {
          const r = rng();
          const grassChance = biome === BIOME_FOREST ? 0.26 : biome === BIOME_PLAINS ? 0.22 :
            biome === BIOME_SWAMP ? 0.3 : biome === BIOME_SAVANNA ? 0.24 : 0.1;
          if (r < grassChance) {
            world.setGenBlock(wx, surf + 1, wz, BlockIds.tall_grass);
          } else if (r < grassChance + 0.022) {
            const flowers = [BlockIds.dandelion, BlockIds.poppy, BlockIds.blue_orchid];
            world.setGenBlock(wx, surf + 1, wz, pick(rng, flowers));
          } else if (r < grassChance + 0.028 && surf < SEA_LEVEL + 6) {
            world.setGenBlock(wx, surf + 1, wz,
              rng() < 0.5 ? BlockIds.red_mushroom : BlockIds.brown_mushroom);
          } else if (r < grassChance + 0.031 && biome === BIOME_PLAINS) {
            world.setGenBlock(wx, surf + 1, wz, BlockIds.pumpkin);
          }
        }

        /* --- 사탕수수: 물 옆 --- */
        if ((top === BlockIds.grass_block || top === BlockIds.sand) && rng() < 0.08) {
          let nearWater = false;
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (world.getBlockGen(wx + dx, surf, wz + dz) === BlockIds.water) { nearWater = true; break; }
          }
          if (nearWater) {
            const h = 2 + Math.floor(rng() * 2);
            for (let i = 0; i < h; i++) world.setGenBlock(wx, surf + 1 + i, wz, BlockIds.sugar_cane);
          }
        }
      }
    }
    chunk.decorated = true;
  }

  _spaceForTree(chunk, lx, y, lz) {
    for (let i = 0; i < 5; i++) {
      if (chunk.get(lx, y + i, lz) !== 0) return false;
    }
    return true;
  }

  /* --------------------------------------------------------- 나무 3종 */
  _oak(world, x, y, z, rng) {
    const h = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < h; i++) world.setGenBlock(x, y + i, z, BlockIds.oak_log);
    const top = y + h;
    for (let dy = -2; dy <= 1; dy++) {
      const r = dy <= -1 ? 2 : (dy === 0 ? 2 : 1);
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx === 0 && dz === 0 && dy < 1) continue;
          if (Math.abs(dx) === r && Math.abs(dz) === r && (rng() < 0.55 || dy === 1)) continue;
          world.setGenBlockIfAir(x + dx, top + dy, z + dz, BlockIds.oak_leaves);
        }
      }
    }
  }
  _birch(world, x, y, z, rng) {
    const h = 5 + Math.floor(rng() * 3);
    for (let i = 0; i < h; i++) world.setGenBlock(x, y + i, z, BlockIds.birch_log);
    const top = y + h;
    for (let dy = -2; dy <= 1; dy++) {
      const r = dy <= 0 ? 2 : 1;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dz === 0 && dy < 1) continue;
        if (Math.abs(dx) === r && Math.abs(dz) === r && rng() < 0.6) continue;
        world.setGenBlockIfAir(x + dx, top + dy, z + dz, BlockIds.birch_leaves);
      }
    }
  }
  _spruce(world, x, y, z, rng) {
    const h = 6 + Math.floor(rng() * 4);
    for (let i = 0; i < h; i++) world.setGenBlock(x, y + i, z, BlockIds.spruce_log);
    let r = 2;
    for (let dy = h - 1; dy >= 2; dy--) {
      const rad = ((h - dy) % 4 === 0) ? 0 : r;
      for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
        if (dx === 0 && dz === 0) continue;
        if (Math.abs(dx) + Math.abs(dz) > rad + 1) continue;
        world.setGenBlockIfAir(x + dx, y + dy, z + dz, BlockIds.spruce_leaves);
      }
      r = ((h - dy) % 2 === 0) ? Math.max(1, r - 1) : Math.min(2, r + 1);
    }
    world.setGenBlockIfAir(x, y + h, z, BlockIds.spruce_leaves);
    world.setGenBlockIfAir(x, y + h + 1, z, BlockIds.spruce_leaves);
  }

  /** 스폰 지점 찾기: 물이 아닌 평평한 곳 */
  findSpawn() {
    for (let r = 0; r < 260; r++) {
      const a = r * 0.7;
      const x = Math.round(Math.cos(a) * r * 1.3);
      const z = Math.round(Math.sin(a) * r * 1.3);
      const h = this.heightAt(x, z);
      if (h > SEA_LEVEL + 1.5 && h < 90) {
        const b = this.biomeAt(x, z, h);
        if (b !== BIOME_OCEAN) return { x: x + 0.5, y: Math.round(h) + 2, z: z + 0.5 };
      }
    }
    return { x: 0.5, y: 80, z: 0.5 };
  }
}
