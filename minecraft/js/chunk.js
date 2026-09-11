/* =========================================================================
 *  chunk.js — 16 x 128 x 16 청크 저장소
 *  blocks / meta(물 높이·작물 성장) / light(하늘4bit + 블록4bit) / 높이맵
 * ========================================================================= */
'use strict';

const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 128;
const CHUNK_AREA = CHUNK_SIZE * CHUNK_SIZE;
const CHUNK_VOLUME = CHUNK_AREA * CHUNK_HEIGHT;
const SEA_LEVEL = 62;

/** 로컬 좌표 → 배열 인덱스 */
function cidx(x, y, z) { return (y << 8) | (z << 4) | x; }

class Chunk {
  constructor(cx, cz) {
    this.cx = cx; this.cz = cz;
    this.key = cx + ',' + cz;
    this.blocks = new Uint8Array(CHUNK_VOLUME);
    this.meta = new Uint8Array(CHUNK_VOLUME);
    this.light = new Uint8Array(CHUNK_VOLUME);       // 상위 4bit 하늘광, 하위 4bit 블록광
    this.heightMap = new Int16Array(CHUNK_AREA);     // 각 열의 최고 불투명 블록 y+1

    this.generated = false;
    this.decorated = false;
    this.lit = false;
    this.dirty = false;          // 저장 필요
    this.meshDirty = true;
    this.meshing = false;
    this.mesh = null;            // 렌더러 핸들 {opaque, water}
    this.empty = true;           // 전부 공기
    this.blockEntities = new Map(); // 'lx,y,lz' → {type,...}
    this.changes = null;         // 저장용 변경 목록 (idx → block|meta)
  }

  /* ------------------------------------------------------------ 접근자 */
  get(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    return this.blocks[cidx(x, y, z)];
  }
  set(x, y, z, id) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    this.blocks[cidx(x, y, z)] = id;
    if (id !== 0) this.empty = false;
  }
  getMeta(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    return this.meta[cidx(x, y, z)];
  }
  setMeta(x, y, z, m) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    this.meta[cidx(x, y, z)] = m;
  }
  getSky(x, y, z) {
    if (y < 0) return 0;
    if (y >= CHUNK_HEIGHT) return 15;
    return this.light[cidx(x, y, z)] >> 4;
  }
  setSky(x, y, z, v) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    const i = cidx(x, y, z);
    this.light[i] = (this.light[i] & 0x0f) | (v << 4);
  }
  getBlockLight(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    return this.light[cidx(x, y, z)] & 0x0f;
  }
  setBlockLight(x, y, z, v) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    const i = cidx(x, y, z);
    this.light[i] = (this.light[i] & 0xf0) | v;
  }

  /* -------------------------------------------------------- 높이맵 갱신 */
  recalcHeightMap() {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        let h = 0;
        for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
          const id = this.blocks[cidx(x, y, z)];
          if (id !== 0 && blockOpacity(id) > 0) { h = y + 1; break; }
        }
        this.heightMap[z * CHUNK_SIZE + x] = h;
      }
    }
  }
  heightAt(x, z) { return this.heightMap[z * CHUNK_SIZE + x]; }

  updateHeightAt(x, z) {
    let h = 0;
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const id = this.blocks[cidx(x, y, z)];
      if (id !== 0 && blockOpacity(id) > 0) { h = y + 1; break; }
    }
    this.heightMap[z * CHUNK_SIZE + x] = h;
    return h;
  }

  /* ------------------------------------------------- 하늘광 초기 채우기 */
  /** 위에서 아래로 15를 내려보내고, 반투명 블록에서 감쇠 */
  initSkyLight() {
    const L = this.light, B = this.blocks;
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        let level = 15;
        for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
          const i = cidx(x, y, z);
          const op = blockOpacity(B[i]);
          if (op >= 15) level = 0;
          else if (op > 0) level = Math.max(0, level - op);
          L[i] = (L[i] & 0x0f) | (level << 4);
          if (level === 0) {
            // 아래로는 전부 0
            for (let yy = y - 1; yy >= 0; yy--) {
              const j = cidx(x, yy, z);
              L[j] = L[j] & 0x0f;
            }
            break;
          }
        }
      }
    }
  }

  /** 발광 블록들을 찾아 초기 블록광 큐에 넣는다 */
  collectLightSources(out) {
    const B = this.blocks;
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const id = B[cidx(x, y, z)];
          if (id === 0) continue;
          const lv = blockLightLevel(id);
          if (lv > 0) {
            this.setBlockLight(x, y, z, lv);
            out.push({
              x: this.cx * CHUNK_SIZE + x, y, z: this.cz * CHUNK_SIZE + z, level: lv,
            });
          }
        }
      }
    }
  }

  /* ------------------------------------------------------- 블록 엔티티 */
  beKey(x, y, z) { return x + ',' + y + ',' + z; }
  getBlockEntity(x, y, z) { return this.blockEntities.get(this.beKey(x, y, z)) || null; }
  setBlockEntity(x, y, z, data) {
    if (data) this.blockEntities.set(this.beKey(x, y, z), data);
    else this.blockEntities.delete(this.beKey(x, y, z));
  }

  /* ------------------------------------------------------- 저장 직렬화 */
  /** 변경분만 저장: {i: [blockId, meta]} */
  recordChange(idx) {
    if (!this.changes) this.changes = new Map();
    this.changes.set(idx, (this.blocks[idx] << 8) | this.meta[idx]);
    this.dirty = true;
  }

  serializeChanges() {
    if (!this.changes || this.changes.size === 0) return null;
    const arr = new Array(this.changes.size * 2);
    let i = 0;
    for (const [k, v] of this.changes) { arr[i++] = k; arr[i++] = v; }
    const be = [];
    for (const [k, v] of this.blockEntities) be.push([k, v]);
    return { c: arr, b: be.length ? be : undefined };
  }

  applyChanges(data) {
    if (!data) return;
    if (data.c) {
      if (!this.changes) this.changes = new Map();
      for (let i = 0; i < data.c.length; i += 2) {
        const idx = data.c[i], v = data.c[i + 1];
        this.blocks[idx] = (v >> 8) & 0xff;
        this.meta[idx] = v & 0xff;
        this.changes.set(idx, v);
      }
    }
    if (data.b) for (const [k, v] of data.b) this.blockEntities.set(k, v);
    this.empty = false;
  }
}
