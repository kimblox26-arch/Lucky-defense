/* =========================================================================
 *  particles.js — 블록 파괴 조각, 물보라, 폭발 연기, 불꽃, 하트/연기 효과
 * ========================================================================= */
'use strict';

class Particle {
  constructor() { this.alive = false; }
  init(x, y, z, vx, vy, vz, layer, u0, v0, u1, v1, size, life, gravity, bright) {
    this.x = x; this.y = y; this.z = z;
    this.vx = vx; this.vy = vy; this.vz = vz;
    this.layer = layer;
    this.u0 = u0; this.v0 = v0; this.u1 = u1; this.v1 = v1;
    this.size = size; this.life = life; this.maxLife = life;
    this.gravity = gravity;
    this.bright = bright === undefined ? 1 : bright;
    this.alive = true;
    this.onGround = false;
    return this;
  }
}

class ParticleSystem {
  constructor(world, max = 900) {
    this.world = world;
    this.pool = [];
    this.max = max;
    for (let i = 0; i < max; i++) this.pool.push(new Particle());
    this.cursor = 0;
  }

  _next() {
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.max;
      if (!p.alive) return p;
    }
    return this.pool[this.cursor];
  }

  spawn(x, y, z, vx, vy, vz, layer, uv, size, life, gravity, bright) {
    const p = this._next();
    p.init(x, y, z, vx, vy, vz, layer, uv[0], uv[1], uv[2], uv[3], size, life, gravity, bright);
    return p;
  }

  /** 블록 파괴 조각 */
  blockBreak(x, y, z, blockId, count = 14) {
    const b = Blocks[blockId];
    if (!b || !b.tiles) return;
    const layer = b.tiles[FACE_TOP];
    for (let i = 0; i < count; i++) {
      const u = Math.floor(Math.random() * 4) / 4;
      const v = Math.floor(Math.random() * 4) / 4;
      this.spawn(
        x + 0.15 + Math.random() * 0.7, y + 0.15 + Math.random() * 0.7, z + 0.15 + Math.random() * 0.7,
        (Math.random() - 0.5) * 3.2, Math.random() * 3.6 + 0.6, (Math.random() - 0.5) * 3.2,
        layer, [u, v, u + 0.25, v + 0.25],
        0.11 + Math.random() * 0.06, 0.6 + Math.random() * 0.5, 16);
    }
  }

  /** 채굴 중 튀는 조각 */
  blockHit(x, y, z, face, blockId) {
    const b = Blocks[blockId];
    if (!b || !b.tiles) return;
    const layer = b.tiles[face < 0 ? FACE_TOP : face];
    const F = FACES[face < 0 ? FACE_TOP : face];
    const u = Math.floor(Math.random() * 4) / 4;
    const v = Math.floor(Math.random() * 4) / 4;
    this.spawn(
      x + 0.5 + F.n[0] * 0.56 + (Math.random() - 0.5) * 0.6,
      y + 0.5 + F.n[1] * 0.56 + (Math.random() - 0.5) * 0.6,
      z + 0.5 + F.n[2] * 0.56 + (Math.random() - 0.5) * 0.6,
      F.n[0] * 1.2 + (Math.random() - 0.5), Math.random() * 1.6, F.n[2] * 1.2 + (Math.random() - 0.5),
      layer, [u, v, u + 0.25, v + 0.25], 0.08, 0.4 + Math.random() * 0.3, 14);
  }

  /** 물보라 */
  splash(x, y, z, n = 12) {
    const layer = Textures.id('water');
    for (let i = 0; i < n; i++) {
      this.spawn(x + (Math.random() - 0.5) * 0.8, y + 0.1, z + (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 2.5, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 2.5,
        layer, [0.25, 0.25, 0.5, 0.5], 0.07, 0.5, 14, 1.4);
    }
  }

  /** 연기 / 폭발 */
  smoke(x, y, z, n = 10, spread = 0.6, big = false) {
    const layer = Textures.id('particle');
    for (let i = 0; i < n; i++) {
      this.spawn(
        x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread, z + (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * (big ? 4 : 0.6), Math.random() * (big ? 3 : 1.2), (Math.random() - 0.5) * (big ? 4 : 0.6),
        layer, [0, 0, 1, 1], big ? 0.5 + Math.random() * 0.5 : 0.16, big ? 1.2 : 0.9,
        big ? 1.2 : -1.2, 0.22);
    }
  }

  /** 불꽃 (횃불/용암) */
  flame(x, y, z) {
    const layer = Textures.id('particle');
    this.spawn(x + (Math.random() - 0.5) * 0.16, y + (Math.random() - 0.5) * 0.12, z + (Math.random() - 0.5) * 0.16,
      0, 0.25 + Math.random() * 0.2, 0, layer, [0, 0, 1, 1], 0.07, 0.7, -0.4, 4.2);
  }

  /** 크리티컬/회복 등 강조 */
  crit(x, y, z, n = 8) {
    const layer = Textures.id('particle');
    for (let i = 0; i < n; i++) {
      this.spawn(x + (Math.random() - 0.5) * 0.7, y + Math.random() * 1.2, z + (Math.random() - 0.5) * 0.7,
        (Math.random() - 0.5) * 1.5, Math.random() * 1.5, (Math.random() - 0.5) * 1.5,
        layer, [0, 0, 1, 1], 0.08, 0.5, 4, 3.0);
    }
  }

  update(dt) {
    const w = this.world;
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }

      p.vy -= p.gravity * dt;
      let nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;

      /* 간단한 블록 충돌 */
      if (isFullCube(w.getBlock(Math.floor(nx), Math.floor(p.y), Math.floor(p.z)))) { nx = p.x; p.vx *= -0.3; }
      if (isFullCube(w.getBlock(Math.floor(p.x), Math.floor(ny), Math.floor(p.z)))) {
        ny = p.y; p.vy *= -0.28;
        p.vx *= 0.72; p.vz *= 0.72;
      }
      if (isFullCube(w.getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(nz)))) { nz = p.z; p.vz *= -0.3; }
      p.x = nx; p.y = ny; p.z = nz;
      p.vx *= (1 - 1.2 * dt); p.vz *= (1 - 1.2 * dt);
    }
  }

  build(mb, camera) {
    const w = this.world;
    const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
    const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
    /* 카메라 우측/상단 벡터 */
    const rx = cy, ry = 0, rz = -sy;
    const ux = sy * sp, uy = cp, uz = cy * sp;
    for (const p of this.pool) {
      if (!p.alive) continue;
      const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
      const sky = w.getSkyLight(bx, by, bz) / 15;
      const blk = w.getBlockLight(bx, by, bz) / 15;
      const s = p.size * (0.4 + 0.6 * Math.min(1, p.life / p.maxLife * 2));
      const V = (ox, oy, u, v) => [
        p.x + rx * ox * s + ux * oy * s,
        p.y + ry * ox * s + uy * oy * s,
        p.z + rz * ox * s + uz * oy * s,
        u, v, p.layer, sky, blk, p.bright];
      mb.quad(
        V(-1, -1, p.u0, p.v1), V(1, -1, p.u1, p.v1),
        V(1, 1, p.u1, p.v0), V(-1, 1, p.u0, p.v0), false);
    }
  }

  clear() { for (const p of this.pool) p.alive = false; }
}
