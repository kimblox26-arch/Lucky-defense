/* =========================================================================
 *  world.js — 월드 코어
 *  청크 로드/언로드, 블록 읽기/쓰기, 조명(하늘광+블록광) 전파,
 *  유체 흐름, 중력 블록, 작물 성장, 예약 틱, 레이캐스트, 충돌 질의
 * ========================================================================= */
'use strict';

const LIGHT_SKY = 0, LIGHT_BLOCK = 1;

class World {
  constructor(seed, opts = {}) {
    this.seed = seed | 0;
    this.gen = new WorldGen(this.seed);
    this.chunks = new Map();            // 'cx,cz' → Chunk
    this.pendingBlocks = new Map();     // 'cx,cz' → [[idx, id, ifAir]]
    this.genQueue = [];
    this.meshQueue = [];
    this.renderDistance = opts.renderDistance || 6;

    /* 조명 큐 */
    this._addSky = [];
    this._remSky = [];
    this._addBlk = [];
    this._remBlk = [];

    /* 예약 틱 */
    this.scheduled = [];
    this.tickCount = 0;
    this.time = 1000;                   // 0..23999 (1000 = 아침)
    this.dayCount = 0;

    this.entities = null;               // EntityManager 가 주입
    this.onBlockChange = null;          // (x,y,z,oldId,newId)
    this.stats = { chunksLoaded: 0, generated: 0, meshed: 0 };
    this._rng = mulberry32(this.seed ^ 0x5f3a2b1c);
    this._neighborCache = null;
  }

  /* ==================================================================
   *  청크 관리
   * ================================================================ */
  key(cx, cz) { return cx + ',' + cz; }
  getChunk(cx, cz) { return this.chunks.get(cx + ',' + cz) || null; }

  getOrCreateChunk(cx, cz) {
    const k = cx + ',' + cz;
    let c = this.chunks.get(k);
    if (!c) {
      c = new Chunk(cx, cz);
      this.chunks.set(k, c);
      this.genQueue.push(c);
    }
    return c;
  }

  chunkAtBlock(x, z) {
    return this.getChunk(x >> 4, z >> 4);
  }

  /** 플레이어 주변 청크 로드/언로드 큐 갱신 */
  updateChunkQueue(px, pz) {
    const pcx = Math.floor(px) >> 4, pcz = Math.floor(pz) >> 4;
    const rd = this.renderDistance;
    const wanted = new Set();

    for (let dz = -rd; dz <= rd; dz++) {
      for (let dx = -rd; dx <= rd; dx++) {
        if (dx * dx + dz * dz > (rd + 0.5) * (rd + 0.5)) continue;
        const cx = pcx + dx, cz = pcz + dz;
        wanted.add(cx + ',' + cz);
        if (!this.chunks.has(cx + ',' + cz)) this.getOrCreateChunk(cx, cz);
      }
    }
    /* 멀어진 청크 해제 */
    const unloadR = (rd + 3) * (rd + 3);
    for (const [k, c] of this.chunks) {
      const dx = c.cx - pcx, dz = c.cz - pcz;
      if (dx * dx + dz * dz > unloadR) {
        if (c.mesh && this.renderer) this.renderer.disposeChunkMesh(c);
        this.chunks.delete(k);
      }
    }
    /* 생성 큐를 플레이어 거리 순으로 정렬 */
    this.genQueue = this.genQueue.filter((c) => this.chunks.has(c.key) && !c.generated);
    this.genQueue.sort((a, b) => {
      const da = (a.cx - pcx) ** 2 + (a.cz - pcz) ** 2;
      const db = (b.cx - pcx) ** 2 + (b.cz - pcz) ** 2;
      return da - db;
    });
    this.stats.chunksLoaded = this.chunks.size;
    void wanted;
  }

  /** 시간 예산 안에서 청크 생성/장식/조명 처리 */
  processGeneration(budgetMs = 6) {
    const t0 = now();
    let count = 0;
    while (this.genQueue.length && now() - t0 < budgetMs) {
      const c = this.genQueue.shift();
      if (!c || c.generated) continue;
      this.gen.generateChunk(c);
      /* 저장된 변경분 적용 */
      const saved = this.savedChanges && this.savedChanges[c.key];
      if (saved) { c.applyChanges(saved); c.recalcHeightMap(); }
      /* 보류 중이던 이웃 장식 블록 적용 */
      const pend = this.pendingBlocks.get(c.key);
      if (pend) {
        for (const [idx, id, ifAir] of pend) {
          if (!ifAir || c.blocks[idx] === 0) c.blocks[idx] = id;
        }
        this.pendingBlocks.delete(c.key);
        c.recalcHeightMap();
      }
      this.stats.generated++;
      count++;
    }
    /* 장식 + 조명: 이웃이 생성된 청크만 */
    for (const [, c] of this.chunks) {
      if (!c.generated || c.decorated) continue;
      if (now() - t0 > budgetMs * 2) break;
      this.gen.decorateChunk(c, this);
      c.recalcHeightMap();
    }
    for (const [, c] of this.chunks) {
      if (!c.generated || !c.decorated || c.lit) continue;
      if (now() - t0 > budgetMs * 3) break;
      this.initChunkLight(c);
    }
    return count;
  }

  /** 메시 갱신 대상 수집 (이웃 4방향이 준비된 청크만) */
  collectMeshJobs(px, pz, max = 4) {
    const pcx = Math.floor(px) >> 4, pcz = Math.floor(pz) >> 4;
    const jobs = [];
    for (const [, c] of this.chunks) {
      if (!c.meshDirty || !c.generated || !c.lit) continue;
      if (!this.neighborsReady(c)) continue;
      const d = (c.cx - pcx) ** 2 + (c.cz - pcz) ** 2;
      jobs.push({ chunk: c, d });
    }
    jobs.sort((a, b) => a.d - b.d);
    return jobs.slice(0, max).map((j) => j.chunk);
  }

  neighborsReady(c) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = this.getChunk(c.cx + dx, c.cz + dz);
      if (!n || !n.generated || !n.decorated) return false;
    }
    return true;
  }

  /* ==================================================================
   *  블록 접근
   * ================================================================ */
  getBlock(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    const c = this.chunks.get((x >> 4) + ',' + (z >> 4));
    if (!c) return 0;
    return c.blocks[cidx(x & 15, y, z & 15)];
  }
  getMeta(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    const c = this.chunks.get((x >> 4) + ',' + (z >> 4));
    if (!c) return 0;
    return c.meta[cidx(x & 15, y, z & 15)];
  }
  getSkyLight(x, y, z) {
    if (y < 0) return 0;
    if (y >= CHUNK_HEIGHT) return 15;
    const c = this.chunks.get((x >> 4) + ',' + (z >> 4));
    if (!c) return 15;
    return c.light[cidx(x & 15, y, z & 15)] >> 4;
  }
  getBlockLight(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    const c = this.chunks.get((x >> 4) + ',' + (z >> 4));
    if (!c) return 0;
    return c.light[cidx(x & 15, y, z & 15)] & 15;
  }
  /** 렌더용 결합 밝기 0..15 */
  getCombinedLight(x, y, z, daylight) {
    const s = this.getSkyLight(x, y, z) * daylight;
    const b = this.getBlockLight(x, y, z);
    return Math.max(s, b);
  }

  isLoaded(x, z) { return this.chunks.has((x >> 4) + ',' + (z >> 4)); }

  /* ------------------------------------------- 월드 생성 중 블록 쓰기 */
  setGenBlock(x, y, z, id) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    const cx = x >> 4, cz = z >> 4, k = cx + ',' + cz;
    const c = this.chunks.get(k);
    const idx = cidx(x & 15, y, z & 15);
    if (c && c.generated) {
      c.blocks[idx] = id;
      c.meshDirty = true;
      c.empty = false;
    } else {
      let arr = this.pendingBlocks.get(k);
      if (!arr) { arr = []; this.pendingBlocks.set(k, arr); }
      arr.push([idx, id, false]);
    }
  }
  setGenBlockIfAir(x, y, z, id) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    const cx = x >> 4, cz = z >> 4, k = cx + ',' + cz;
    const c = this.chunks.get(k);
    const idx = cidx(x & 15, y, z & 15);
    if (c && c.generated) {
      if (c.blocks[idx] === 0) { c.blocks[idx] = id; c.meshDirty = true; c.empty = false; }
    } else {
      let arr = this.pendingBlocks.get(k);
      if (!arr) { arr = []; this.pendingBlocks.set(k, arr); }
      arr.push([idx, id, true]);
    }
  }
  getBlockGen(x, y, z) { return this.getBlock(x, y, z); }

  /* ------------------------------------------------------- 블록 설치 */
  /**
   * 블록 변경 + 조명/메시/틱 갱신.
   * @returns {boolean} 실제로 바뀌었는지
   */
  setBlock(x, y, z, id, meta = 0, opts = {}) {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const cx = x >> 4, cz = z >> 4;
    const c = this.chunks.get(cx + ',' + cz);
    if (!c || !c.generated) return false;
    const lx = x & 15, lz = z & 15;
    const idx = cidx(lx, y, lz);
    const old = c.blocks[idx];
    const oldMeta = c.meta[idx];
    if (old === id && oldMeta === meta) return false;

    c.blocks[idx] = id;
    c.meta[idx] = meta;
    c.empty = false;
    c.recordChange(idx);

    /* 블록 엔티티 정리 */
    if (old !== id) {
      const ob = Blocks[old];
      if (ob && ob.entity) c.setBlockEntity(lx, y, lz, null);
      const nb = Blocks[id];
      if (nb && nb.entity && !c.getBlockEntity(lx, y, lz)) {
        c.setBlockEntity(lx, y, lz, this.createBlockEntity(nb.entity));
      }
    }

    /* 높이맵 + 조명 */
    const oldH = c.heightAt(lx, lz);
    const newH = c.updateHeightAt(lx, lz);
    this.updateLightForBlockChange(x, y, z, old, id, oldH, newH);

    /* 메시 갱신 */
    this.markDirtyAround(x, y, z);

    /* 주변 갱신(유체·중력·식물) */
    if (opts.noUpdate !== true) {
      this.notifyNeighbors(x, y, z);
      const nb = Blocks[id];
      if (nb && nb.liquid) this.scheduleTick(x, y, z, nb.id === BlockIds.lava ? 15 : 5);
    }
    if (this.onBlockChange) this.onBlockChange(x, y, z, old, id);
    return true;
  }

  setMeta(x, y, z, meta) {
    const c = this.chunks.get((x >> 4) + ',' + (z >> 4));
    if (!c) return;
    const idx = cidx(x & 15, y, z & 15);
    if (c.meta[idx] === meta) return;
    c.meta[idx] = meta;
    c.recordChange(idx);
    this.markDirtyAround(x, y, z);
  }

  createBlockEntity(type) {
    if (type === 'chest') return { type: 'chest', items: new Array(27).fill(null) };
    if (type === 'furnace') {
      return {
        type: 'furnace', input: null, fuel: null, output: null,
        burnTime: 0, burnTotal: 0, cookTime: 0,
      };
    }
    return { type };
  }

  getBlockEntity(x, y, z) {
    const c = this.chunks.get((x >> 4) + ',' + (z >> 4));
    if (!c) return null;
    let be = c.getBlockEntity(x & 15, y, z & 15);
    if (!be) {
      const b = Blocks[this.getBlock(x, y, z)];
      if (b && b.entity) {
        be = this.createBlockEntity(b.entity);
        c.setBlockEntity(x & 15, y, z & 15, be);
      }
    }
    return be;
  }

  markDirtyAround(x, y, z) {
    const lx = x & 15, lz = z & 15;
    const cx = x >> 4, cz = z >> 4;
    const mark = (a, b) => { const c = this.getChunk(a, b); if (c) c.meshDirty = true; };
    mark(cx, cz);
    if (lx === 0) mark(cx - 1, cz);
    if (lx === 15) mark(cx + 1, cz);
    if (lz === 0) mark(cx, cz - 1);
    if (lz === 15) mark(cx, cz + 1);
    void y;
  }

  /** 이웃 블록에게 변화 알림 — 중력/유체/식물 지지 검사 */
  notifyNeighbors(x, y, z) {
    const dirs = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
    for (const [dx, dy, dz] of dirs) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      const id = this.getBlock(nx, ny, nz);
      if (id === 0) continue;
      const b = Blocks[id];
      if (!b) continue;
      if (b.gravity) this.scheduleTick(nx, ny, nz, 2);
      else if (b.liquid) this.scheduleTick(nx, ny, nz, id === BlockIds.lava ? 15 : 5);
      else if (b.plant) this.scheduleTick(nx, ny, nz, 1);
    }
    const above = this.getBlock(x, y + 1, z);
    if (above) {
      const b = Blocks[above];
      if (b.gravity || b.plant) this.scheduleTick(x, y + 1, z, 2);
    }
  }

  /* ==================================================================
   *  조명 엔진
   * ================================================================ */
  initChunkLight(c) {
    c.initSkyLight();
    const sources = [];
    c.collectLightSources(sources);
    /* 하늘광 수평 전파 시드: 청크 내 모든 셀을 전파 큐에 넣는다 */
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const h = c.heightAt(x, z);
        for (let y = Math.max(0, h - 1); y < CHUNK_HEIGHT; y++) {
          const lv = c.getSky(x, y, z);
          if (lv > 1) this._addSky.push([c.cx * 16 + x, y, c.cz * 16 + z]);
        }
        /* 지면 아래 가장자리도 시드 */
        for (let y = 0; y < Math.max(0, h - 1); y++) {
          if (c.getSky(x, y, z) > 1) this._addSky.push([c.cx * 16 + x, y, c.cz * 16 + z]);
        }
      }
    }
    for (const s of sources) this._addBlk.push([s.x, s.y, s.z]);
    this.flushLight(20000);
    c.lit = true;
    c.meshDirty = true;
    /* 이웃도 다시 조명 전파되도록 메시 갱신 */
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = this.getChunk(c.cx + dx, c.cz + dz);
      if (n && n.lit) n.meshDirty = true;
    }
  }

  _setSky(x, y, z, v) {
    const c = this.chunks.get((x >> 4) + ',' + (z >> 4));
    if (!c) return;
    const i = cidx(x & 15, y, z & 15);
    c.light[i] = (c.light[i] & 0x0f) | (v << 4);
  }
  _setBlk(x, y, z, v) {
    const c = this.chunks.get((x >> 4) + ',' + (z >> 4));
    if (!c) return;
    const i = cidx(x & 15, y, z & 15);
    c.light[i] = (c.light[i] & 0xf0) | v;
  }

  /** 블록 변경에 따른 조명 재계산 */
  updateLightForBlockChange(x, y, z, oldId, newId, oldH, newH) {
    const oldOp = blockOpacity(oldId), newOp = blockOpacity(newId);
    const oldEmit = blockLightLevel(oldId), newEmit = blockLightLevel(newId);

    /* --- 블록광 --- */
    if (oldEmit > 0 || newOp !== oldOp) {
      const cur = this.getBlockLight(x, y, z);
      if (cur > 0) {
        this._remBlk.push([x, y, z, cur]);
        this._setBlk(x, y, z, 0);
      }
    }
    if (newEmit > 0) {
      this._setBlk(x, y, z, newEmit);
      this._addBlk.push([x, y, z]);
    }
    /* 새 블록이 투명해졌다면 주변 빛이 흘러들어오게 */
    if (newOp < oldOp) {
      for (const [dx, dy, dz] of NEIGHBOR6) {
        this._addBlk.push([x + dx, y + dy, z + dz]);
        this._addSky.push([x + dx, y + dy, z + dz]);
      }
    }

    /* --- 하늘광: 해당 열 재계산 --- */
    const top = Math.max(oldH, newH);
    if (newOp > oldOp) {
      /* 더 어두워짐 → 제거 후 재전파 */
      for (let yy = 0; yy <= Math.max(top, y); yy++) {
        const cur = this.getSkyLight(x, yy, z);
        if (cur > 0) { this._remSky.push([x, yy, z, cur]); this._setSky(x, yy, z, 0); }
      }
      /* 열 위쪽부터 직사광 재설정 */
      this._recolumnSky(x, z);
    } else if (newOp < oldOp) {
      this._recolumnSky(x, z);
      for (let yy = 0; yy <= Math.max(top, y) + 1; yy++) {
        this._addSky.push([x, yy, z]);
      }
    }
    this.flushLight(8000);
  }

  /** 한 열의 직사 하늘광을 위에서 아래로 다시 계산 */
  _recolumnSky(x, z) {
    let level = 15;
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const op = blockOpacity(this.getBlock(x, y, z));
      if (op >= 15) level = 0;
      else if (op > 0) level = Math.max(0, level - op);
      const cur = this.getSkyLight(x, y, z);
      if (level > cur) {
        this._setSky(x, y, z, level);
        this._addSky.push([x, y, z]);
      }
      if (level === 0) break;
    }
  }

  /** 조명 큐 처리 (최대 N 스텝) */
  flushLight(maxSteps = 4000) {
    let steps = 0;
    /* 제거 우선 */
    while (this._remBlk.length && steps < maxSteps) {
      const [x, y, z, lvl] = this._remBlk.pop(); steps++;
      for (const [dx, dy, dz] of NEIGHBOR6) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (ny < 0 || ny >= CHUNK_HEIGHT) continue;
        const nl = this.getBlockLight(nx, ny, nz);
        if (nl === 0) continue;
        if (nl < lvl) {
          this._setBlk(nx, ny, nz, 0);
          this._remBlk.push([nx, ny, nz, nl]);
          this.markDirtyAround(nx, ny, nz);
        } else {
          this._addBlk.push([nx, ny, nz]);
        }
      }
    }
    while (this._remSky.length && steps < maxSteps) {
      const [x, y, z, lvl] = this._remSky.pop(); steps++;
      for (const [dx, dy, dz] of NEIGHBOR6) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (ny < 0 || ny >= CHUNK_HEIGHT) continue;
        const nl = this.getSkyLight(nx, ny, nz);
        if (nl === 0) continue;
        if (nl < lvl || (dy === -1 && lvl === 15)) {
          this._setSky(nx, ny, nz, 0);
          this._remSky.push([nx, ny, nz, nl]);
          this.markDirtyAround(nx, ny, nz);
        } else {
          this._addSky.push([nx, ny, nz]);
        }
      }
    }
    /* 전파 */
    while (this._addBlk.length && steps < maxSteps) {
      const [x, y, z] = this._addBlk.pop(); steps++;
      const lvl = this.getBlockLight(x, y, z);
      if (lvl <= 1) continue;
      for (const [dx, dy, dz] of NEIGHBOR6) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (ny < 0 || ny >= CHUNK_HEIGHT) continue;
        if (!this.isLoaded(nx, nz)) continue;
        const op = blockOpacity(this.getBlock(nx, ny, nz));
        if (op >= 15) continue;
        const target = lvl - Math.max(1, op);
        if (target <= 0) continue;
        if (this.getBlockLight(nx, ny, nz) < target) {
          this._setBlk(nx, ny, nz, target);
          this._addBlk.push([nx, ny, nz]);
          this.markDirtyAround(nx, ny, nz);
        }
      }
    }
    while (this._addSky.length && steps < maxSteps) {
      const [x, y, z] = this._addSky.pop(); steps++;
      if (y < 0 || y >= CHUNK_HEIGHT) continue;
      const lvl = this.getSkyLight(x, y, z);
      if (lvl <= 1) continue;
      for (const [dx, dy, dz] of NEIGHBOR6) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (ny < 0 || ny >= CHUNK_HEIGHT) continue;
        if (!this.isLoaded(nx, nz)) continue;
        const op = blockOpacity(this.getBlock(nx, ny, nz));
        if (op >= 15) continue;
        /* 아래 방향은 감쇠 없음 (직사광) */
        const target = (dy === -1 && lvl === 15 && op === 0) ? 15 : lvl - Math.max(1, op);
        if (target <= 0) continue;
        if (this.getSkyLight(nx, ny, nz) < target) {
          this._setSky(nx, ny, nz, target);
          this._addSky.push([nx, ny, nz]);
          this.markDirtyAround(nx, ny, nz);
        }
      }
    }
    return steps;
  }

  /* ==================================================================
   *  예약 틱 / 월드 업데이트
   * ================================================================ */
  scheduleTick(x, y, z, delay) {
    for (const s of this.scheduled) {
      if (s.x === x && s.y === y && s.z === z) return;
    }
    this.scheduled.push({ x, y, z, t: this.tickCount + delay });
  }

  tick() {
    this.tickCount++;
    this.time = (this.time + 1) % 24000;
    if (this.time === 0) this.dayCount++;

    /* 예약 틱 */
    if (this.scheduled.length) {
      const due = [];
      const rest = [];
      for (const s of this.scheduled) {
        if (s.t <= this.tickCount) due.push(s); else rest.push(s);
      }
      this.scheduled = rest;
      let n = 0;
      for (const s of due) {
        if (n++ > 600) { this.scheduled.push(s); continue; }
        this.doScheduledTick(s.x, s.y, s.z);
      }
    }

    /* 랜덤 틱 */
    this.randomTicks();

    /* 화로 */
    this.tickFurnaces();

    /* 조명 큐 잔여 처리 */
    this.flushLight(3000);
  }

  doScheduledTick(x, y, z) {
    const id = this.getBlock(x, y, z);
    if (id === 0) return;
    const b = Blocks[id];
    if (!b) return;

    if (b.gravity) { this.tickGravity(x, y, z, id); return; }
    if (b.liquid) { this.tickFluid(x, y, z, id); return; }
    if (b.plant) {
      const below = this.getBlock(x, y - 1, z);
      const ok = this.plantSupportOK(id, below, x, y, z);
      if (!ok) this.breakBlockNatural(x, y, z, id);
    }
  }

  plantSupportOK(id, below, x, y, z) {
    if (id === BlockIds.sugar_cane) {
      if (below === BlockIds.sugar_cane) return true;
      if (below !== BlockIds.grass_block && below !== BlockIds.dirt && below !== BlockIds.sand) return false;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (this.getBlock(x + dx, y - 1, z + dz) === BlockIds.water) return true;
      }
      return false;
    }
    if (id === BlockIds.cactus) {
      return below === BlockIds.sand || below === BlockIds.cactus;
    }
    if (id === BlockIds.wheat) return below === BlockIds.farmland;
    if (id === BlockIds.torch) return isFullCube(below) || below === BlockIds.torch;
    return below === BlockIds.grass_block || below === BlockIds.dirt ||
      below === BlockIds.farmland || below === BlockIds.sand || below === BlockIds.snow_block;
  }

  /** 자연 파괴 — 아이템 드롭 포함 */
  breakBlockNatural(x, y, z, id) {
    const b = Blocks[id];
    if (!b) return;
    const drops = computeDrops(b, null, this._rng);
    this.setBlock(x, y, z, 0);
    if (this.entities) {
      for (const st of drops) this.entities.spawnItem(x + 0.5, y + 0.25, z + 0.5, st);
    }
  }

  tickGravity(x, y, z, id) {
    const below = this.getBlock(x, y - 1, z);
    const bb = Blocks[below];
    if (below === 0 || (bb && (bb.liquid || bb.replaceable))) {
      this.setBlock(x, y, z, 0);
      if (this.entities) this.entities.spawnFallingBlock(x + 0.5, y, z + 0.5, id);
    }
  }

  /* ------------------------------------------------------------ 유체 */
  tickFluid(x, y, z, id) {
    const isLava = id === BlockIds.lava;
    const maxLevel = isLava ? 3 : 7;
    const delay = isLava ? 15 : 5;
    const meta = this.getMeta(x, y, z);
    const isSource = meta === 0;

    /* 자신의 레벨 재계산 (소스 제외) */
    if (!isSource) {
      const above = this.getBlock(x, y + 1, z);
      let newLevel = 99;
      if (above === id) newLevel = 1;
      else {
        for (const [dx, dz] of HORIZ4) {
          const nid = this.getBlock(x + dx, y, z + dz);
          if (nid !== id) continue;
          const nm = this.getMeta(x + dx, y, z + dz);
          newLevel = Math.min(newLevel, nm + 1);
        }
      }
      if (newLevel > maxLevel) {
        this.setBlock(x, y, z, 0, 0, { noUpdate: true });
        for (const [dx, dy, dz] of NEIGHBOR6) {
          if (this.getBlock(x + dx, y + dy, z + dz) === id) {
            this.scheduleTick(x + dx, y + dy, z + dz, delay);
          }
        }
        this.markDirtyAround(x, y, z);
        return;
      }
      if (newLevel !== meta) {
        this.setMeta(x, y, z, newLevel);
      }
    }

    const level = isSource ? 0 : this.getMeta(x, y, z);

    /* 아래로 흐름 */
    const belowId = this.getBlock(x, y - 1, z);
    const bb = Blocks[belowId];
    if (y > 0 && (belowId === 0 || (bb && bb.replaceable && belowId !== id))) {
      if (belowId !== 0 && !bb.liquid) this.breakBlockNatural(x, y - 1, z, belowId);
      this.setBlock(x, y - 1, z, id, 1, { noUpdate: true });
      this.scheduleTick(x, y - 1, z, delay);
      this.markDirtyAround(x, y - 1, z);
      /* 용암이 물을 만나면 돌 */
      return;
    }

    /* 옆으로 흐름 */
    if (level < maxLevel) {
      for (const [dx, dz] of HORIZ4) {
        const nx = x + dx, nz = z + dz;
        const nid = this.getBlock(nx, y, nz);
        const nbdef = Blocks[nid];
        if (nid === id) {
          const nm = this.getMeta(nx, y, nz);
          if (nm > level + 1) { this.setMeta(nx, y, nz, level + 1); this.scheduleTick(nx, y, nz, delay); }
          continue;
        }
        if (nid === 0 || (nbdef && nbdef.replaceable && !nbdef.liquid)) {
          if (nid !== 0) this.breakBlockNatural(nx, y, nz, nid);
          this.setBlock(nx, y, nz, id, level + 1, { noUpdate: true });
          this.scheduleTick(nx, y, nz, delay);
          this.markDirtyAround(nx, y, nz);
        } else if (nbdef && nbdef.liquid && nid !== id) {
          /* 물 + 용암 = 돌/흑요석 */
          this.mixLiquids(nx, y, nz, nid, id);
        }
      }
    }
    /* 아래가 다른 유체면 섞임 */
    if (belowId && belowId !== id && Blocks[belowId] && Blocks[belowId].liquid) {
      this.mixLiquids(x, y - 1, z, belowId, id);
    }
  }

  mixLiquids(x, y, z, thereId, hereId) {
    const lava = thereId === BlockIds.lava ? { x, y, z } : null;
    if (thereId === BlockIds.lava && hereId === BlockIds.water) {
      const meta = this.getMeta(x, y, z);
      this.setBlock(x, y, z, meta === 0 ? BlockIds.obsidian : BlockIds.cobblestone);
    } else if (thereId === BlockIds.water && hereId === BlockIds.lava) {
      this.setBlock(x, y, z, BlockIds.stone);
    }
    void lava;
  }

  /* ----------------------------------------------------------- 랜덤 틱 */
  randomTicks() {
    const rng = this._rng;
    let processed = 0;
    for (const [, c] of this.chunks) {
      if (!c.generated || !c.lit) continue;
      if (processed++ > 90) break;
      for (let i = 0; i < 3; i++) {
        const lx = Math.floor(rng() * CHUNK_SIZE);
        const lz = Math.floor(rng() * CHUNK_SIZE);
        const ly = Math.floor(rng() * CHUNK_HEIGHT);
        const id = c.blocks[cidx(lx, ly, lz)];
        if (id === 0) continue;
        const wx = c.cx * 16 + lx, wz = c.cz * 16 + lz;
        this.randomTickBlock(wx, ly, wz, id, rng);
      }
    }
  }

  randomTickBlock(x, y, z, id, rng) {
    switch (id) {
      case BlockIds.grass_block: {
        const above = this.getBlock(x, y + 1, z);
        if (blockOpacity(above) >= 15 && above !== 0) {
          this.setBlock(x, y, z, BlockIds.dirt);        // 덮이면 흙으로
          return;
        }
        /* 잔디 번식 */
        if (rng() < 0.35) {
          const dx = randInt(rng, -1, 1), dy = randInt(rng, -1, 1), dz = randInt(rng, -1, 1);
          const tx = x + dx, ty = y + dy, tz = z + dz;
          if (this.getBlock(tx, ty, tz) === BlockIds.dirt &&
            blockOpacity(this.getBlock(tx, ty + 1, tz)) < 15 &&
            this.getSkyLight(tx, ty + 1, tz) >= 9) {
            this.setBlock(tx, ty, tz, BlockIds.grass_block);
          }
        }
        break;
      }
      case BlockIds.farmland: {
        /* 물 근처면 젖은 상태 유지, 아니면 마름 */
        let wet = false;
        for (let dz = -4; dz <= 4 && !wet; dz++) {
          for (let dx = -4; dx <= 4 && !wet; dx++) {
            for (let dy = 0; dy <= 1 && !wet; dy++) {
              if (this.getBlock(x + dx, y + dy, z + dz) === BlockIds.water) wet = true;
            }
          }
        }
        const meta = this.getMeta(x, y, z);
        if (wet && meta === 0) this.setMeta(x, y, z, 1);
        else if (!wet && meta === 1 && rng() < 0.3) this.setMeta(x, y, z, 0);
        else if (!wet && meta === 0 && rng() < 0.12 &&
          this.getBlock(x, y + 1, z) !== BlockIds.wheat) {
          this.setBlock(x, y, z, BlockIds.dirt);
        }
        break;
      }
      case BlockIds.wheat: {
        const stage = this.getMeta(x, y, z);
        if (stage >= 3) break;
        const light = Math.max(this.getSkyLight(x, y, z), this.getBlockLight(x, y, z));
        if (light < 9) break;
        const wet = this.getMeta(x, y - 1, z) === 1;
        if (rng() < (wet ? 0.35 : 0.12)) this.setMeta(x, y, z, stage + 1);
        break;
      }
      case BlockIds.oak_sapling: case BlockIds.birch_sapling: case BlockIds.spruce_sapling: {
        const light = Math.max(this.getSkyLight(x, y, z), this.getBlockLight(x, y, z));
        if (light < 9 || rng() > 0.06) break;
        this.setBlock(x, y, z, 0, 0, { noUpdate: true });
        const r = mulberry32((x * 73856093) ^ (z * 19349663) ^ this.tickCount);
        if (id === BlockIds.oak_sapling) this.gen._oak(this, x, y, z, r);
        else if (id === BlockIds.birch_sapling) this.gen._birch(this, x, y, z, r);
        else this.gen._spruce(this, x, y, z, r);
        this.relightArea(x, y, z, 6);
        break;
      }
      case BlockIds.oak_leaves: case BlockIds.birch_leaves: case BlockIds.spruce_leaves: {
        /* 잎 삭기: 주변 4칸 내 원목 없으면 사라짐 */
        if (rng() > 0.25) break;
        if (!this.hasLogNearby(x, y, z, 4)) this.breakBlockNatural(x, y, z, id);
        break;
      }
      case BlockIds.ice: {
        const light = this.getBlockLight(x, y, z);
        if (light > 11) this.setBlock(x, y, z, BlockIds.water);
        break;
      }
      case BlockIds.cactus: {
        if (rng() < 0.1 && this.getBlock(x, y + 1, z) === 0) {
          let h = 0;
          for (let i = 1; i <= 3; i++) if (this.getBlock(x, y - i, z) === BlockIds.cactus) h++;
          if (h < 2) this.setBlock(x, y + 1, z, BlockIds.cactus);
        }
        break;
      }
      case BlockIds.sugar_cane: {
        if (rng() < 0.12 && this.getBlock(x, y + 1, z) === 0) {
          let h = 0;
          for (let i = 1; i <= 3; i++) if (this.getBlock(x, y - i, z) === BlockIds.sugar_cane) h++;
          if (h < 2) this.setBlock(x, y + 1, z, BlockIds.sugar_cane);
        }
        break;
      }
      default: break;
    }
  }

  hasLogNearby(x, y, z, r) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const id = this.getBlock(x + dx, y + dy, z + dz);
          if (id === BlockIds.oak_log || id === BlockIds.birch_log || id === BlockIds.spruce_log) return true;
        }
      }
    }
    return false;
  }

  relightArea(x, y, z, r) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        this._recolumnSky(x + dx, z + dz);
      }
    }
    this.flushLight(20000);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const c = this.getChunk((x >> 4) + dx, (z >> 4) + dz);
      if (c) c.meshDirty = true;
    }
    void y;
  }

  /* ---------------------------------------------------------- 화로 */
  tickFurnaces() {
    for (const [, c] of this.chunks) {
      if (!c.blockEntities.size) continue;
      for (const [k, be] of c.blockEntities) {
        if (be.type !== 'furnace') continue;
        const changed = this.tickFurnace(be);
        if (changed) {
          const [lx, y, lz] = k.split(',').map(Number);
          const wx = c.cx * 16 + lx, wz = c.cz * 16 + lz;
          const cur = this.getBlock(wx, y, wz);
          const want = be.burnTime > 0 ? BlockIds.furnace_lit : BlockIds.furnace;
          if (cur === BlockIds.furnace || cur === BlockIds.furnace_lit) {
            if (cur !== want) {
              const saved = be;
              this.setBlock(wx, y, wz, want);
              c.setBlockEntity(lx, y, lz, saved);
            }
          }
        }
      }
    }
  }

  tickFurnace(be) {
    let stateChanged = false;
    const wasBurning = be.burnTime > 0;
    if (be.burnTime > 0) be.burnTime--;

    const recipe = be.input ? smeltResult(be.input.id) : null;
    const canOutput = recipe && (!be.output ||
      (be.output.id === recipe.out && be.output.count + recipe.count <= stackMaxSize(be.output)));

    if (be.burnTime === 0 && canOutput && be.fuel) {
      const fv = fuelValue(be.fuel.id);
      if (fv > 0) {
        be.burnTime = be.burnTotal = fv;
        const isBucket = be.fuel.id === ItemIds.lava_bucket;
        be.fuel.count--;
        if (be.fuel.count <= 0) be.fuel = isBucket ? makeStack('bucket', 1) : null;
        stateChanged = true;
      }
    }

    if (be.burnTime > 0 && canOutput) {
      be.cookTime++;
      if (be.cookTime >= 200) {
        be.cookTime = 0;
        if (be.output) be.output.count += recipe.count;
        else be.output = makeStack(recipe.out, recipe.count);
        be.input.count--;
        if (be.input.count <= 0) be.input = null;
        be.xp = (be.xp || 0) + recipe.xp;
      }
    } else if (be.cookTime > 0) {
      be.cookTime = Math.max(0, be.cookTime - 2);
    }

    if (wasBurning !== (be.burnTime > 0)) stateChanged = true;
    return stateChanged;
  }

  /* ==================================================================
   *  질의 (충돌 / 레이캐스트)
   * ================================================================ */
  /** AABB 와 겹치는 블록 충돌 박스 수집 */
  getCollisionBoxes(box, out = []) {
    out.length = 0;
    const x0 = Math.floor(box.x0), x1 = Math.floor(box.x1);
    const y0 = Math.floor(box.y0), y1 = Math.floor(box.y1);
    const z0 = Math.floor(box.z0), z1 = Math.floor(box.z1);
    for (let y = y0; y <= y1; y++) {
      if (y < 0 || y >= CHUNK_HEIGHT) continue;
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const id = this.getBlock(x, y, z);
          if (id === 0) continue;
          const b = Blocks[id];
          if (!b || !b.solid) continue;
          blockAABBs(id, x, y, z, out);
        }
      }
    }
    return out;
  }

  /** 박스 안에 특정 재질이 있는지 */
  isBoxInMaterial(box, blockId) {
    const x0 = Math.floor(box.x0), x1 = Math.floor(box.x1);
    const y0 = Math.floor(box.y0), y1 = Math.floor(box.y1);
    const z0 = Math.floor(box.z0), z1 = Math.floor(box.z1);
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          if (this.getBlock(x, y, z) === blockId) return true;
        }
      }
    }
    return false;
  }

  /** 복셀 레이캐스트 (Amanatides & Woo) */
  raycast(ox, oy, oz, dx, dy, dz, maxDist, fluidHit = false) {
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const stepX = sign(dx), stepY = sign(dy), stepZ = sign(dz);
    const tDeltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
    const tDeltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
    const tDeltaZ = dz === 0 ? Infinity : Math.abs(1 / dz);
    let tMaxX = dx === 0 ? Infinity : ((stepX > 0 ? (x + 1 - ox) : (ox - x)) * tDeltaX);
    let tMaxY = dy === 0 ? Infinity : ((stepY > 0 ? (y + 1 - oy) : (oy - y)) * tDeltaY);
    let tMaxZ = dz === 0 ? Infinity : ((stepZ > 0 ? (z + 1 - oz) : (oz - z)) * tDeltaZ);
    let face = -1;
    let t = 0;

    while (t <= maxDist) {
      const id = this.getBlock(x, y, z);
      if (id !== 0) {
        const b = Blocks[id];
        const hittable = fluidHit ? true : (b.solid || b.render === RENDER_CROSS ||
          b.render === RENDER_TORCH || b.render === RENDER_CROP);
        if (hittable && !(b.liquid && !fluidHit)) {
          return { hit: true, x, y, z, id, face, dist: t };
        }
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += stepX; t = tMaxX; tMaxX += tDeltaX; face = stepX > 0 ? FACE_WEST : FACE_EAST;
      } else if (tMaxY < tMaxZ) {
        y += stepY; t = tMaxY; tMaxY += tDeltaY; face = stepY > 0 ? FACE_BOTTOM : FACE_TOP;
        if (y < 0 || y >= CHUNK_HEIGHT) break;
      } else {
        z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; face = stepZ > 0 ? FACE_NORTH : FACE_SOUTH;
      }
    }
    return { hit: false };
  }

  /** 특정 위치의 지표면 y */
  surfaceHeight(x, z) {
    const c = this.chunkAtBlock(x, z);
    if (c && c.generated) {
      for (let y = CHUNK_HEIGHT - 1; y > 0; y--) {
        const id = c.blocks[cidx(x & 15, y, z & 15)];
        if (id !== 0 && Blocks[id].solid) return y + 1;
      }
      return 1;
    }
    return Math.round(this.gen.heightAt(x, z)) + 1;
  }

  getBiome(x, z) {
    const c = this.chunkAtBlock(x, z);
    if (c && c.biomes) return c.biomes[(z & 15) * CHUNK_SIZE + (x & 15)];
    return this.gen.biomeAt(x, z);
  }

  /* ==================================================================
   *  시간 / 저장
   * ================================================================ */
  get dayFraction() { return this.time / 24000; }
  get isNight() { return this.time > 13000 && this.time < 23000; }

  /** 0(밤) ~ 1(낮) */
  get daylight() {
    const t = this.time;
    if (t < 12000) return 1;
    if (t < 13500) return 1 - (t - 12000) / 1500 * 0.8;
    if (t < 22500) return 0.2;
    return 0.2 + (t - 22500) / 1500 * 0.8;
  }

  serialize() {
    const changes = {};
    for (const [k, c] of this.chunks) {
      const s = c.serializeChanges();
      if (s) changes[k] = s;
    }
    /* 이전에 로드했다가 언로드된 청크의 변경분도 유지 */
    if (this.savedChanges) {
      for (const k in this.savedChanges) if (!(k in changes)) changes[k] = this.savedChanges[k];
    }
    return { seed: this.seed, time: this.time, dayCount: this.dayCount, changes };
  }

  loadSave(data) {
    if (!data) return;
    this.time = data.time || 1000;
    this.dayCount = data.dayCount || 0;
    this.savedChanges = data.changes || {};
  }
}

/* 방향 상수 */
const NEIGHBOR6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const HORIZ4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
