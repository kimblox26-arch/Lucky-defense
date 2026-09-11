/* =========================================================================
 *  mesher.js — 청크 → 정점 버퍼
 *  면 컬링 + 앰비언트 오클루전 + 부드러운 조명(주변 4칸 평균)
 *  정점 = pos(3) uv(2) layer(1) light(sky, block, shade*ao) => 9 float
 * ========================================================================= */
'use strict';

const VERT_FLOATS = 9;
const AO_LEVELS = [0.42, 0.62, 0.82, 1.0];

class MeshBuilder {
  constructor(cap = 4096) {
    this.data = new Float32Array(cap * VERT_FLOATS);
    this.idx = new Uint32Array(cap * 1.5 | 0);
    this.vcount = 0;
    this.icount = 0;
  }
  reset() { this.vcount = 0; this.icount = 0; }
  _ensureV(n) {
    if ((this.vcount + n) * VERT_FLOATS <= this.data.length) return;
    let cap = this.data.length;
    while ((this.vcount + n) * VERT_FLOATS > cap) cap *= 2;
    const nd = new Float32Array(cap);
    nd.set(this.data.subarray(0, this.vcount * VERT_FLOATS));
    this.data = nd;
  }
  _ensureI(n) {
    if (this.icount + n <= this.idx.length) return;
    let cap = this.idx.length || 16;
    while (this.icount + n > cap) cap *= 2;
    const ni = new Uint32Array(cap);
    ni.set(this.idx.subarray(0, this.icount));
    this.idx = ni;
  }
  /** 사각형 하나 추가. verts = [ [x,y,z,u,v,layer,sky,blk,shade] x4 ] (BL,BR,TR,TL) */
  quad(v0, v1, v2, v3, flip) {
    this._ensureV(4); this._ensureI(6);
    const base = this.vcount;
    const d = this.data;
    let p = base * VERT_FLOATS;
    for (const v of [v0, v1, v2, v3]) {
      d[p] = v[0]; d[p + 1] = v[1]; d[p + 2] = v[2];
      d[p + 3] = v[3]; d[p + 4] = v[4]; d[p + 5] = v[5];
      d[p + 6] = v[6]; d[p + 7] = v[7]; d[p + 8] = v[8];
      p += VERT_FLOATS;
    }
    const I = this.idx;
    let q = this.icount;
    if (flip) {
      I[q] = base + 1; I[q + 1] = base + 2; I[q + 2] = base + 3;
      I[q + 3] = base + 1; I[q + 4] = base + 3; I[q + 5] = base;
    } else {
      I[q] = base; I[q + 1] = base + 1; I[q + 2] = base + 2;
      I[q + 3] = base; I[q + 4] = base + 2; I[q + 5] = base + 3;
    }
    this.vcount += 4; this.icount += 6;
  }
  vertexArray() { return this.data.subarray(0, this.vcount * VERT_FLOATS); }
  indexArray() { return this.idx.subarray(0, this.icount); }
}

const _mbOpaque = new MeshBuilder(8192);
const _mbWater = new MeshBuilder(2048);

/** 이 면을 그려야 하는가 */
function shouldRenderFace(world, id, nx, ny, nz) {
  const nid = world.getBlock(nx, ny, nz);
  if (nid === 0) return true;
  if (nid === id) {
    const b = Blocks[id];
    if (b.fullCube) return false;         // 같은 블록끼리는 내부면 숨김
    return false;
  }
  const nb = Blocks[nid];
  if (!nb) return true;
  if (nb.opaque && nb.fullCube) return false;
  if (nb.liquid) {
    const b = Blocks[id];
    return !b.liquid;
  }
  return true;
}

/** 면의 코너 조명 + AO 계산 */
function cornerLight(world, bx, by, bz, face, s, t, out) {
  const F = FACES[face];
  const n = F.n, U = F.u, V = F.v;
  const px = bx + n[0], py = by + n[1], pz = bz + n[2];
  const ux = U[0] * s, uy = U[1] * s, uz = U[2] * s;
  const vx = V[0] * t, vy = V[1] * t, vz = V[2] * t;

  const p1 = [px + ux, py + uy, pz + uz];
  const p2 = [px + vx, py + vy, pz + vz];
  const p3 = [px + ux + vx, py + uy + vy, pz + uz + vz];

  const o0 = blockOpacity(world.getBlock(px, py, pz)) >= 15;
  const o1 = blockOpacity(world.getBlock(p1[0], p1[1], p1[2])) >= 15;
  const o2 = blockOpacity(world.getBlock(p2[0], p2[1], p2[2])) >= 15;
  const o3 = blockOpacity(world.getBlock(p3[0], p3[1], p3[2])) >= 15;

  let ao;
  if (o1 && o2) ao = 0;
  else ao = 3 - ((o1 ? 1 : 0) + (o2 ? 1 : 0) + (o3 ? 1 : 0));

  /* 부드러운 조명: 막히지 않은 칸들의 평균 */
  let sky = 0, blk = 0, cnt = 0;
  if (!o0) { sky += world.getSkyLight(px, py, pz); blk += world.getBlockLight(px, py, pz); cnt++; }
  if (!o1) { sky += world.getSkyLight(p1[0], p1[1], p1[2]); blk += world.getBlockLight(p1[0], p1[1], p1[2]); cnt++; }
  if (!o2) { sky += world.getSkyLight(p2[0], p2[1], p2[2]); blk += world.getBlockLight(p2[0], p2[1], p2[2]); cnt++; }
  if (!o3 && !(o1 && o2)) { sky += world.getSkyLight(p3[0], p3[1], p3[2]); blk += world.getBlockLight(p3[0], p3[1], p3[2]); cnt++; }
  if (cnt === 0) { sky = world.getSkyLight(px, py, pz); blk = world.getBlockLight(px, py, pz); cnt = 1; }

  out[0] = sky / cnt / 15;
  out[1] = blk / cnt / 15;
  out[2] = AO_LEVELS[ao] * F.shade;
  return out;
}

const _cl = [0, 0, 0];

/** 정육면체 한 면 추가 */
function addCubeFace(mb, world, x, y, z, face, layer, yScale) {
  const F = FACES[face];
  const n = F.n, U = F.u, V = F.v;
  const verts = [];
  const aos = [];
  for (let i = 0; i < 4; i++) {
    const s = CORNERS[i][0], t = CORNERS[i][1];
    let vx = 0.5 + 0.5 * n[0] + 0.5 * s * U[0] + 0.5 * t * V[0];
    let vy = 0.5 + 0.5 * n[1] + 0.5 * s * U[1] + 0.5 * t * V[1];
    let vz = 0.5 + 0.5 * n[2] + 0.5 * s * U[2] + 0.5 * t * V[2];
    if (yScale !== undefined && yScale !== 1) vy = vy * yScale;
    cornerLight(world, x, y, z, face, s, t, _cl);
    aos.push(_cl[2]);
    verts.push([
      x + vx, y + vy, z + vz,
      (s + 1) / 2, (1 - t) / 2, layer,
      _cl[0], _cl[1], _cl[2],
    ]);
  }
  const flip = (aos[0] + aos[2]) < (aos[1] + aos[3]);
  mb.quad(verts[0], verts[1], verts[2], verts[3], flip);
}

/** 십자형 식물 */
function addCrossBlock(mb, world, x, y, z, layer, heightScale = 1) {
  const sky = world.getSkyLight(x, y, z) / 15;
  const blk = world.getBlockLight(x, y, z) / 15;
  const sh = 0.92;
  const h = heightScale;
  const o = 0.1464;    // (1 - 1/sqrt(2)) / 2 근사 → 대각선이 블록 안에 들어오도록
  const planes = [
    [[o, 0, o], [1 - o, 0, 1 - o]],
    [[1 - o, 0, o], [o, 0, 1 - o]],
  ];
  for (const [a, b] of planes) {
    for (let side = 0; side < 2; side++) {
      const p0 = side ? b : a, p1 = side ? a : b;
      const v0 = [x + p0[0], y, z + p0[2], 0, 1, layer, sky, blk, sh];
      const v1 = [x + p1[0], y, z + p1[2], 1, 1, layer, sky, blk, sh];
      const v2 = [x + p1[0], y + h, z + p1[2], 1, 0, layer, sky, blk, sh];
      const v3 = [x + p0[0], y + h, z + p0[2], 0, 0, layer, sky, blk, sh];
      mb.quad(v0, v1, v2, v3, false);
    }
  }
}

/** 작물: 평행한 4개 면 */
function addCropBlock(mb, world, x, y, z, layer) {
  const sky = world.getSkyLight(x, y, z) / 15;
  const blk = world.getBlockLight(x, y, z) / 15;
  const sh = 0.95;
  const offs = [0.25, 0.75];
  for (const ox of offs) {
    for (let side = 0; side < 2; side++) {
      const zz0 = side ? 1 : 0, zz1 = side ? 0 : 1;
      mb.quad(
        [x + ox, y, z + zz0, 0, 1, layer, sky, blk, sh],
        [x + ox, y, z + zz1, 1, 1, layer, sky, blk, sh],
        [x + ox, y + 1, z + zz1, 1, 0, layer, sky, blk, sh],
        [x + ox, y + 1, z + zz0, 0, 0, layer, sky, blk, sh], false);
    }
  }
  for (const oz of offs) {
    for (let side = 0; side < 2; side++) {
      const xx0 = side ? 0 : 1, xx1 = side ? 1 : 0;
      mb.quad(
        [x + xx0, y, z + oz, 0, 1, layer, sky, blk, sh],
        [x + xx1, y, z + oz, 1, 1, layer, sky, blk, sh],
        [x + xx1, y + 1, z + oz, 1, 0, layer, sky, blk, sh],
        [x + xx0, y + 1, z + oz, 0, 0, layer, sky, blk, sh], false);
    }
  }
}

/** 횃불: 가운데 작은 기둥 */
function addTorch(mb, world, x, y, z, layer) {
  const sky = world.getSkyLight(x, y, z) / 15;
  const blk = Math.max(world.getBlockLight(x, y, z), 14) / 15;
  const r = 0.0625, h = 0.625;
  const x0 = x + 0.5 - r, x1 = x + 0.5 + r;
  const z0 = z + 0.5 - r, z1 = z + 0.5 + r;
  const y0 = y, y1 = y + h;
  const sh = 1.0;
  const V = (px, py, pz, u, v, s) => [px, py, pz, u, v, layer, sky, blk, s];
  /* 4 옆면 */
  mb.quad(V(x1, y0, z1, 0, 1, 0.8), V(x1, y0, z0, 1, 1, 0.8), V(x1, y1, z0, 1, 0.35, 0.8), V(x1, y1, z1, 0, 0.35, 0.8), false);
  mb.quad(V(x0, y0, z0, 0, 1, 0.8), V(x0, y0, z1, 1, 1, 0.8), V(x0, y1, z1, 1, 0.35, 0.8), V(x0, y1, z0, 0, 0.35, 0.8), false);
  mb.quad(V(x0, y0, z1, 0, 1, 0.9), V(x1, y0, z1, 1, 1, 0.9), V(x1, y1, z1, 1, 0.35, 0.9), V(x0, y1, z1, 0, 0.35, 0.9), false);
  mb.quad(V(x1, y0, z0, 0, 1, 0.9), V(x0, y0, z0, 1, 1, 0.9), V(x0, y1, z0, 1, 0.35, 0.9), V(x1, y1, z0, 0, 0.35, 0.9), false);
  /* 윗면 (불꽃) */
  mb.quad(V(x0, y1, z1, 0.4, 0.6, sh), V(x1, y1, z1, 0.6, 0.6, sh), V(x1, y1, z0, 0.6, 0.4, sh), V(x0, y1, z0, 0.4, 0.4, sh), false);
}

/** 액체 */
function addLiquid(mb, world, x, y, z, id, layer) {
  const above = world.getBlock(x, y + 1, z);
  const sameAbove = above === id;
  const meta = world.getMeta(x, y, z);
  const maxLvl = id === BlockIds.lava ? 3 : 7;
  const top = sameAbove ? 1 : (1 - (meta / (maxLvl + 1)) * 0.85) * 0.92;

  for (let face = 0; face < 6; face++) {
    const F = FACES[face];
    const nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
    const nid = world.getBlock(nx, ny, nz);
    if (nid === id) continue;
    const nb = Blocks[nid];
    if (nid !== 0 && nb && nb.opaque && nb.fullCube) continue;
    if (face === FACE_BOTTOM && nid !== 0 && nb && nb.solid) continue;

    const n = F.n, U = F.u, V = F.v;
    const sky = world.getSkyLight(nx, ny, nz) / 15;
    const blk = Math.max(world.getBlockLight(nx, ny, nz), blockLightLevel(id)) / 15;
    const verts = [];
    for (let i = 0; i < 4; i++) {
      const s = CORNERS[i][0], t = CORNERS[i][1];
      let vx = 0.5 + 0.5 * n[0] + 0.5 * s * U[0] + 0.5 * t * V[0];
      let vy = 0.5 + 0.5 * n[1] + 0.5 * s * U[1] + 0.5 * t * V[1];
      let vz = 0.5 + 0.5 * n[2] + 0.5 * s * U[2] + 0.5 * t * V[2];
      if (vy > 0.99) vy = top;
      verts.push([x + vx, y + vy, z + vz, (s + 1) / 2, (1 - t) / 2, layer, sky, blk, F.shade]);
    }
    mb.quad(verts[0], verts[1], verts[2], verts[3], false);
  }
}

/* ------------------------------------------------------------- 메인 */
function meshChunk(world, chunk) {
  _mbOpaque.reset();
  _mbWater.reset();
  const ox = chunk.cx * CHUNK_SIZE, oz = chunk.cz * CHUNK_SIZE;
  const B = chunk.blocks;

  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const id = B[cidx(lx, y, lz)];
        if (id === 0) continue;
        const b = Blocks[id];
        if (!b) continue;
        const x = ox + lx, z = oz + lz;

        switch (b.render) {
          case RENDER_CUBE: {
            const wet = (id === BlockIds.farmland && chunk.meta[cidx(lx, y, lz)] === 1);
            for (let face = 0; face < 6; face++) {
              const F = FACES[face];
              if (!shouldRenderFace(world, id, x + F.n[0], y + F.n[1], z + F.n[2])) continue;
              const layer = (wet && face === FACE_TOP) ? b.wetTile : b.tiles[face];
              const yScale = (id === BlockIds.farmland && face === FACE_TOP) ? 0.9375 : 1;
              addCubeFace(_mbOpaque, world, x, y, z, face, layer, yScale);
            }
            break;
          }
          case RENDER_CROSS:
            addCrossBlock(_mbOpaque, world, x, y, z, b.tiles[0]);
            break;
          case RENDER_CROP: {
            const stage = chunk.meta[cidx(lx, y, lz)];
            addCropBlock(_mbOpaque, world, x, y, z, b.cropTiles[clamp(stage, 0, 3)]);
            break;
          }
          case RENDER_TORCH:
            addTorch(_mbOpaque, world, x, y, z, b.tiles[0]);
            break;
          case RENDER_LIQUID:
            addLiquid(_mbWater, world, x, y, z, id, b.tiles[0]);
            break;
          default: break;
        }
      }
    }
  }

  return {
    opaque: { verts: _mbOpaque.vertexArray(), idx: _mbOpaque.indexArray() },
    water: { verts: _mbWater.vertexArray(), idx: _mbWater.indexArray() },
  };
}
