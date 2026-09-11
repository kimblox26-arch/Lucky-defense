/* =========================================================================
 *  entity.js — 엔티티 시스템
 *  물리(AABB 스윕) · 몹 AI(좀비/스켈레톤/크리퍼/거미/돼지/소/양/닭)
 *  드롭 아이템 · 화살 · 점화된 TNT · 떨어지는 블록 · 경험치 구슬
 * ========================================================================= */
'use strict';

let _entityId = 1;

class Entity {
  constructor(world, x, y, z, w, h) {
    this.id = _entityId++;
    this.world = world;
    this.x = x; this.y = y; this.z = z;
    this.px = x; this.py = y; this.pz = z;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.width = w; this.height = h;
    this.yaw = 0; this.pitch = 0;
    this.onGround = false;
    this.dead = false;
    this.age = 0;
    this.inWater = false;
    this.inLava = false;
    this.health = 1; this.maxHealth = 1;
    this.hurtTime = 0;
    this.fallDistance = 0;
    this.gravity = 26;
    this.stepHeight = 0.55;
    this.type = 'entity';
    this._boxes = [];
    this._box = new AABB(0, 0, 0, 0, 0, 0);
  }

  get aabb() {
    const r = this.width / 2;
    return this._box.set(this.x - r, this.y, this.z - r, this.x + r, this.y + this.height, this.z + r);
  }
  aabbAt(x, y, z) {
    const r = this.width / 2;
    return new AABB(x - r, y, z - r, x + r, y + this.height, z + r);
  }

  /* ------------------------------------------------------------ 물리 */
  /** 축별 스윕 이동 + 자동 계단 오르기 */
  move(dx, dy, dz) {
    const w = this.world;
    const startY = this.y;
    const canStep = this.onGround && this.stepHeight > 0;
    const origX = dx, origZ = dz;

    /* Y */
    let box = this.aabb.copy();
    if (dy !== 0) {
      const swept = box.expand(0, dy, 0).grow(0.001);
      w.getCollisionBoxes(swept, this._boxes);
      for (const b of this._boxes) {
        if (box.x1 <= b.x0 || box.x0 >= b.x1 || box.z1 <= b.z0 || box.z0 >= b.z1) continue;
        if (dy > 0 && box.y1 <= b.y0 + 1e-6) dy = Math.min(dy, b.y0 - box.y1);
        else if (dy < 0 && box.y0 >= b.y1 - 1e-6) dy = Math.max(dy, b.y1 - box.y0);
      }
      this.y += dy;
      box = this.aabb.copy();
    }
    const hitY = Math.abs(dy) < Math.abs(this.vy * 0.0001 + dy) ? false : false;
    void hitY;

    /* X */
    let blockedX = false;
    if (dx !== 0) {
      const swept = box.expand(dx, 0, 0).grow(0.001);
      w.getCollisionBoxes(swept, this._boxes);
      let ndx = dx;
      for (const b of this._boxes) {
        if (box.y1 <= b.y0 || box.y0 >= b.y1 || box.z1 <= b.z0 || box.z0 >= b.z1) continue;
        if (dx > 0 && box.x1 <= b.x0 + 1e-6) ndx = Math.min(ndx, b.x0 - box.x1);
        else if (dx < 0 && box.x0 >= b.x1 - 1e-6) ndx = Math.max(ndx, b.x1 - box.x0);
      }
      if (Math.abs(ndx - dx) > 1e-6) blockedX = true;
      this.x += ndx;
      box = this.aabb.copy();
    }
    /* Z */
    let blockedZ = false;
    if (dz !== 0) {
      const swept = box.expand(0, 0, dz).grow(0.001);
      w.getCollisionBoxes(swept, this._boxes);
      let ndz = dz;
      for (const b of this._boxes) {
        if (box.y1 <= b.y0 || box.y0 >= b.y1 || box.x1 <= b.x0 || box.x0 >= b.x1) continue;
        if (dz > 0 && box.z1 <= b.z0 + 1e-6) ndz = Math.min(ndz, b.z0 - box.z1);
        else if (dz < 0 && box.z0 >= b.z1 - 1e-6) ndz = Math.max(ndz, b.z1 - box.z0);
      }
      if (Math.abs(ndz - dz) > 1e-6) blockedZ = true;
      this.z += ndz;
    }

    /* 계단 오르기 */
    if (canStep && (blockedX || blockedZ)) {
      const sx = this.x, sy = this.y, sz = this.z;
      this.x = this.px; this.y = startY; this.z = this.pz;
      let ok = false;
      const upBox = this.aabbAt(this.x, this.y + this.stepHeight, this.z);
      w.getCollisionBoxes(upBox, this._boxes);
      if (this._boxes.length === 0) {
        this.y += this.stepHeight;
        const beforeX = this.x, beforeZ = this.z;
        this.move2D(origX, origZ);
        if (Math.abs(this.x - beforeX) > Math.abs(sx - beforeX) + 1e-4 ||
          Math.abs(this.z - beforeZ) > Math.abs(sz - beforeZ) + 1e-4) {
          /* 성공: 착지 위치로 내림 */
          ok = true;
          let drop = 0;
          const testBox = this.aabb.copy();
          const swept = testBox.expand(0, -this.stepHeight, 0).grow(0.001);
          w.getCollisionBoxes(swept, this._boxes);
          drop = -this.stepHeight;
          for (const b of this._boxes) {
            if (testBox.x1 <= b.x0 || testBox.x0 >= b.x1 || testBox.z1 <= b.z0 || testBox.z0 >= b.z1) continue;
            if (testBox.y0 >= b.y1 - 1e-6) drop = Math.max(drop, b.y1 - testBox.y0);
          }
          this.y += drop;
        }
      }
      if (!ok) { this.x = sx; this.y = sy; this.z = sz; }
    }

    /* 접지 판정 */
    const feet = this.aabb.copy();
    feet.y0 -= 0.04; feet.y1 = this.y + 0.02;
    w.getCollisionBoxes(feet, this._boxes);
    let ground = false;
    for (const b of this._boxes) {
      if (feet.x1 <= b.x0 || feet.x0 >= b.x1 || feet.z1 <= b.z0 || feet.z0 >= b.z1) continue;
      if (this.y >= b.y1 - 0.08) { ground = true; break; }
    }
    if (dy < 0 && !ground) ground = false;
    this.onGround = ground;
    if (ground) { if (this.vy < 0) this.vy = 0; }
  }

  move2D(dx, dz) {
    const w = this.world;
    let box = this.aabb.copy();
    if (dx !== 0) {
      const swept = box.expand(dx, 0, 0).grow(0.001);
      w.getCollisionBoxes(swept, this._boxes);
      for (const b of this._boxes) {
        if (box.y1 <= b.y0 || box.y0 >= b.y1 || box.z1 <= b.z0 || box.z0 >= b.z1) continue;
        if (dx > 0 && box.x1 <= b.x0 + 1e-6) dx = Math.min(dx, b.x0 - box.x1);
        else if (dx < 0 && box.x0 >= b.x1 - 1e-6) dx = Math.max(dx, b.x1 - box.x0);
      }
      this.x += dx; box = this.aabb.copy();
    }
    if (dz !== 0) {
      const swept = box.expand(0, 0, dz).grow(0.001);
      w.getCollisionBoxes(swept, this._boxes);
      for (const b of this._boxes) {
        if (box.y1 <= b.y0 || box.y0 >= b.y1 || box.x1 <= b.x0 || box.x0 >= b.x1) continue;
        if (dz > 0 && box.z1 <= b.z0 + 1e-6) dz = Math.min(dz, b.z0 - box.z1);
        else if (dz < 0 && box.z0 >= b.z1 - 1e-6) dz = Math.max(dz, b.z1 - box.z0);
      }
      this.z += dz;
    }
  }

  updateLiquidState() {
    const box = this.aabb;
    this.inWater = this.world.isBoxInMaterial(box, BlockIds.water);
    this.inLava = this.world.isBoxInMaterial(box, BlockIds.lava);
    this.headInWater = this.world.getBlock(
      Math.floor(this.x), Math.floor(this.y + this.height * 0.9), Math.floor(this.z)) === BlockIds.water;
  }

  applyGravity(dt) {
    if (this.inWater) {
      this.vy -= this.gravity * 0.22 * dt;
      this.vy = Math.max(this.vy, -3.2);
      this.vx *= Math.pow(0.55, dt * 20);
      this.vz *= Math.pow(0.55, dt * 20);
    } else if (this.inLava) {
      this.vy -= this.gravity * 0.12 * dt;
      this.vy = Math.max(this.vy, -1.6);
      this.vx *= Math.pow(0.35, dt * 20);
      this.vz *= Math.pow(0.35, dt * 20);
    } else {
      this.vy -= this.gravity * dt;
      this.vy = Math.max(this.vy, -60);
    }
  }

  light() {
    const bx = Math.floor(this.x), by = Math.floor(this.y + this.height * 0.5), bz = Math.floor(this.z);
    return {
      sky: this.world.getSkyLight(bx, by, bz) / 15,
      blk: this.world.getBlockLight(bx, by, bz) / 15,
    };
  }

  hurt(amount, source) {
    if (this.hurtTime > 0.25 || this.dead) return false;
    this.health -= amount;
    this.hurtTime = 0.5;
    if (source) {
      const dx = this.x - source.x, dz = this.z - source.z;
      const d = Math.hypot(dx, dz) || 1;
      this.vx += dx / d * 5.2;
      this.vz += dz / d * 5.2;
      this.vy = Math.max(this.vy, 4.2);
    }
    if (this.health <= 0) { this.health = 0; this.onDeath(source); this.dead = true; }
    return true;
  }
  onDeath() { }
  update() { }
  render() { }
}

/* =========================================================================
 *  드롭 아이템
 * ========================================================================= */
class ItemEntity extends Entity {
  constructor(world, x, y, z, stack) {
    super(world, x, y, z, 0.25, 0.25);
    this.type = 'item';
    this.stack = stack;
    this.pickupDelay = 0.6;
    this.lifeTime = 300;
    this.bob = Math.random() * TAU;
    this.spin = Math.random() * TAU;
    this.vx = (Math.random() - 0.5) * 2.2;
    this.vy = 2.2 + Math.random();
    this.vz = (Math.random() - 0.5) * 2.2;
    this.stepHeight = 0;
  }
  update(dt, mgr) {
    this.age += dt;
    this.lifeTime -= dt;
    if (this.lifeTime <= 0) { this.dead = true; return; }
    if (this.pickupDelay > 0) this.pickupDelay -= dt;
    this.updateLiquidState();
    this.applyGravity(dt);
    if (this.inWater) this.vy = Math.min(this.vy + 12 * dt, 1.4);
    this.px = this.x; this.py = this.y; this.pz = this.z;
    this.move(this.vx * dt, this.vy * dt, this.vz * dt);
    const fr = this.onGround ? Math.pow(0.06, dt) : Math.pow(0.72, dt);
    this.vx *= fr; this.vz *= fr;
    this.spin += dt * 1.6;
    this.bob += dt * 3;

    /* 같은 아이템끼리 병합 */
    if (this.age > 0.5 && (mgr.tickIndex % 10) === 0) {
      for (const e of mgr.entities) {
        if (e === this || e.type !== 'item' || e.dead) continue;
        if (!sameItem(e.stack, this.stack)) continue;
        if (dist2(e.x, e.y, e.z, this.x, this.y, this.z) > 1.1) continue;
        const max = stackMaxSize(this.stack);
        if (this.stack.count + e.stack.count <= max) {
          this.stack.count += e.stack.count;
          e.dead = true;
        }
      }
    }
  }
  render(mb, world) {
    const l = this.light();
    const def = getItem(this.stack.id);
    const m = Mat4.create();
    const bobY = Math.sin(this.bob) * 0.06;
    Mat4.identity(m);
    Mat4.translate(m, m, this.x, this.y + 0.12 + bobY, this.z);
    Mat4.rotateY(m, m, this.spin);
    if (def && def.isBlock && Blocks[this.stack.id] && Blocks[this.stack.id].render === RENDER_CUBE) {
      const t = Blocks[this.stack.id].tiles;
      pushBox(mb, m, -0.14, 0, -0.14, 0.14, 0.28, 0.14, Array.from(t), l.sky, l.blk);
    } else {
      const layer = Textures.id(def && def.tex ? def.tex : 'missing');
      const th = 0.02;
      pushBox(mb, m, -0.16, 0, -th, 0.16, 0.32, th, layer, l.sky, l.blk, 1.25);
    }
  }
}

/* =========================================================================
 *  경험치 구슬
 * ========================================================================= */
class XPOrb extends Entity {
  constructor(world, x, y, z, amount) {
    super(world, x, y, z, 0.22, 0.22);
    this.type = 'xp';
    this.amount = amount;
    this.vy = 1.6 + Math.random();
    this.vx = (Math.random() - 0.5) * 1.4;
    this.vz = (Math.random() - 0.5) * 1.4;
    this.lifeTime = 180;
    this.bob = Math.random() * TAU;
  }
  update(dt, mgr) {
    this.age += dt; this.lifeTime -= dt;
    if (this.lifeTime <= 0) { this.dead = true; return; }
    this.bob += dt * 5;
    const p = mgr.player;
    if (p && !p.dead) {
      const d = dist3(p.x, p.y + 0.9, p.z, this.x, this.y, this.z);
      if (d < 6 && this.age > 0.3) {
        const k = 16 / Math.max(0.6, d);
        this.vx += (p.x - this.x) * k * dt;
        this.vy += (p.y + 0.9 - this.y) * k * dt;
        this.vz += (p.z - this.z) * k * dt;
      }
      if (d < 0.9) {
        p.addXP(this.amount);
        AudioSys.pop();
        this.dead = true;
        return;
      }
    }
    this.updateLiquidState();
    this.vy -= 10 * dt;
    this.move(this.vx * dt, this.vy * dt, this.vz * dt);
    const fr = Math.pow(0.5, dt);
    this.vx *= fr; this.vz *= fr;
  }
  render(mb) {
    const l = this.light();
    const m = Mat4.create();
    Mat4.identity(m);
    Mat4.translate(m, m, this.x, this.y + Math.sin(this.bob) * 0.04, this.z);
    Mat4.rotateY(m, m, this.age * 2);
    const layer = Textures.id('emerald');
    pushBox(mb, m, -0.08, 0, -0.08, 0.08, 0.16, 0.08, layer, l.sky, Math.max(l.blk, 0.8), 1.6);
  }
}

/* =========================================================================
 *  화살
 * ========================================================================= */
class ArrowEntity extends Entity {
  constructor(world, x, y, z, vx, vy, vz, owner, damage) {
    super(world, x, y, z, 0.2, 0.2);
    this.type = 'arrow';
    this.vx = vx; this.vy = vy; this.vz = vz;
    this.owner = owner;
    this.damage = damage || 4;
    this.stuck = false;
    this.lifeTime = 60;
    this.gravity = 12;
  }
  update(dt, mgr) {
    this.age += dt; this.lifeTime -= dt;
    if (this.lifeTime <= 0) { this.dead = true; return; }
    if (this.stuck) return;

    this.yaw = Math.atan2(this.vx, -this.vz);
    this.pitch = -Math.atan2(this.vy, Math.hypot(this.vx, this.vz));

    const steps = 3;
    for (let s = 0; s < steps; s++) {
      const sdt = dt / steps;
      const nx = this.x + this.vx * sdt, ny = this.y + this.vy * sdt, nz = this.z + this.vz * sdt;
      const id = this.world.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz));
      if (id !== 0 && Blocks[id].solid) {
        this.stuck = true; this.lifeTime = Math.min(this.lifeTime, 20);
        this.vx = this.vy = this.vz = 0;
        return;
      }
      /* 엔티티 명중 */
      for (const e of mgr.entities) {
        if (e === this || e === this.owner || e.dead) continue;
        if (!(e instanceof Mob) && e.type !== 'player') continue;
        const box = e.aabb.grow(0.18);
        if (box.contains(nx, ny, nz)) {
          e.hurt(this.damage, this);
          AudioSys.mobHurt(e.kind || 'zombie');
          this.dead = true;
          return;
        }
      }
      this.x = nx; this.y = ny; this.z = nz;
      this.vy -= this.gravity * sdt;
      this.vx *= (1 - 0.12 * sdt); this.vz *= (1 - 0.12 * sdt);
    }
  }
  render(mb) {
    const l = this.light();
    const m = Mat4.create();
    Mat4.identity(m);
    Mat4.translate(m, m, this.x, this.y, this.z);
    Mat4.rotateY(m, m, -this.yaw);
    Mat4.rotateX(m, m, this.pitch);
    const layer = Textures.id('arrow');
    pushBox(mb, m, -0.03, -0.03, -0.35, 0.03, 0.03, 0.35, layer, l.sky, l.blk);
  }
}

/* =========================================================================
 *  점화된 TNT
 * ========================================================================= */
class TNTEntity extends Entity {
  constructor(world, x, y, z, fuse = 4) {
    super(world, x, y, z, 0.92, 0.92);
    this.type = 'tnt';
    this.fuse = fuse;
    this.vy = 3.2;
    this.vx = (Math.random() - 0.5) * 0.6;
    this.vz = (Math.random() - 0.5) * 0.6;
  }
  update(dt, mgr) {
    this.age += dt;
    this.fuse -= dt;
    this.updateLiquidState();
    this.applyGravity(dt);
    this.move(this.vx * dt, this.vy * dt, this.vz * dt);
    if (this.onGround) { this.vx *= Math.pow(0.02, dt); this.vz *= Math.pow(0.02, dt); }
    if ((this.age * 4 | 0) !== ((this.age - dt) * 4 | 0)) {
      mgr.particles.smoke(this.x, this.y + 1, this.z, 1, 0.2);
    }
    if (this.fuse <= 0) {
      mgr.explode(this.x, this.y + 0.5, this.z, 4.2, this);
      this.dead = true;
    }
  }
  render(mb) {
    const l = this.light();
    const m = Mat4.create();
    const flash = (Math.sin(this.age * 24) > 0 && this.fuse < 2) ? 2.6 : 1;
    Mat4.identity(m);
    Mat4.translate(m, m, this.x, this.y, this.z);
    const b = Blocks[BlockIds.tnt];
    pushBox(mb, m, -0.46, 0, -0.46, 0.46, 0.92, 0.46, Array.from(b.tiles), l.sky, l.blk, flash);
  }
}

/* =========================================================================
 *  떨어지는 블록 (모래/자갈)
 * ========================================================================= */
class FallingBlockEntity extends Entity {
  constructor(world, x, y, z, blockId) {
    super(world, x, y, z, 0.96, 0.96);
    this.type = 'falling';
    this.blockId = blockId;
    this.stepHeight = 0;
  }
  update(dt, mgr) {
    this.age += dt;
    this.vy -= this.gravity * dt;
    this.vy = Math.max(this.vy, -40);
    const ny = this.y + this.vy * dt;
    const bx = Math.floor(this.x), bz = Math.floor(this.z);
    const belowY = Math.floor(ny);
    const below = this.world.getBlock(bx, belowY, bz);
    const bd = Blocks[below];
    if ((below !== 0 && bd && bd.solid) || ny <= 0) {
      const landY = Math.floor(this.y);
      const target = this.world.getBlock(bx, landY, bz);
      if (target === 0 || (Blocks[target] && Blocks[target].replaceable)) {
        this.world.setBlock(bx, landY, bz, this.blockId);
      } else {
        mgr.spawnItem(this.x, this.y, this.z, makeStack(Blocks[this.blockId].name, 1));
      }
      AudioSys.place(Blocks[this.blockId].material);
      mgr.particles.blockBreak(bx, landY, bz, this.blockId, 6);
      this.dead = true;
      return;
    }
    this.y = ny;
    if (this.age > 60) this.dead = true;
  }
  render(mb) {
    const l = this.light();
    const m = Mat4.create();
    Mat4.identity(m);
    Mat4.translate(m, m, this.x - 0.5, this.y, this.z - 0.5);
    const b = Blocks[this.blockId];
    pushBox(mb, m, 0, 0, 0, 1, 1, 1, Array.from(b.tiles), l.sky, l.blk);
  }
}

/* =========================================================================
 *  몹 정의
 * ========================================================================= */
const MOB_DEFS = {
  zombie: {
    ko: '좀비', hp: 20, speed: 2.1, damage: 3, hostile: true, model: 'biped',
    size: [0.6, 1.9], burnsInDay: true, xp: 5,
    tiles: { face: 'zombie_face', skin: 'zombie_skin', body: 'zombie_shirt' },
    drops: [{ name: 'feather', min: 0, max: 1, chance: 0.2 }],
  },
  skeleton: {
    ko: '스켈레톤', hp: 20, speed: 2.1, damage: 2, hostile: true, model: 'biped',
    size: [0.6, 1.9], burnsInDay: true, ranged: true, xp: 5,
    tiles: { face: 'skeleton_face', skin: 'skeleton_skin', body: 'skeleton_skin' },
    drops: [{ name: 'bone', min: 0, max: 2 }, { name: 'arrow', min: 0, max: 2 }],
  },
  creeper: {
    ko: '크리퍼', hp: 20, speed: 2.0, damage: 0, hostile: true, model: 'creeper',
    size: [0.6, 1.7], explodes: true, xp: 5,
    tiles: { face: 'creeper_face', skin: 'creeper_skin', body: 'creeper_skin' },
    drops: [{ name: 'gunpowder', min: 0, max: 2 }],
  },
  spider: {
    ko: '거미', hp: 16, speed: 2.8, damage: 2, hostile: true, model: 'spider',
    size: [1.2, 0.9], xp: 5,
    tiles: { face: 'spider_face', skin: 'spider_skin', body: 'spider_skin' },
    drops: [{ name: 'string', min: 0, max: 2 }],
  },
  pig: {
    ko: '돼지', hp: 10, speed: 1.4, damage: 0, hostile: false, model: 'quadruped',
    size: [0.9, 0.9], xp: 1,
    tiles: { face: 'pig_face', skin: 'pig_skin', body: 'pig_skin' },
    drops: [{ name: 'porkchop', min: 1, max: 3 }],
  },
  cow: {
    ko: '소', hp: 10, speed: 1.3, damage: 0, hostile: false, model: 'quadruped',
    size: [0.9, 1.3], xp: 1,
    tiles: { face: 'cow_face', skin: 'cow_skin', body: 'cow_skin' },
    drops: [{ name: 'beef', min: 1, max: 3 }, { name: 'leather', min: 0, max: 2 }],
  },
  sheep: {
    ko: '양', hp: 8, speed: 1.4, damage: 0, hostile: false, model: 'quadruped',
    size: [0.9, 1.2], xp: 1,
    tiles: { face: 'sheep_face', skin: 'sheep_skin', body: 'sheep_skin' },
    drops: [{ name: 'mutton', min: 1, max: 2 }, { name: 'wool_white', min: 1, max: 1 }],
  },
  chicken: {
    ko: '닭', hp: 4, speed: 1.3, damage: 0, hostile: false, model: 'chicken',
    size: [0.5, 0.7], xp: 1,
    tiles: { face: 'chicken_face', skin: 'chicken_skin', body: 'chicken_skin' },
    drops: [{ name: 'chicken', min: 1, max: 1 }, { name: 'feather', min: 0, max: 2 }],
  },
};

class Mob extends Entity {
  constructor(world, kind, x, y, z) {
    const def = MOB_DEFS[kind];
    super(world, x, y, z, def.size[0], def.size[1]);
    this.type = 'mob';
    this.kind = kind;
    this.def = def;
    this.maxHealth = def.hp;
    this.health = def.hp;
    this.speed = def.speed;
    this.target = null;
    this.wanderTimer = 0;
    this.wanderYaw = Math.random() * TAU;
    this.attackCooldown = 0;
    this.limbSwing = 0;
    this.limbAmount = 0;
    this.fuseTime = 0;
    this.shootCooldown = 1 + Math.random() * 2;
    this.ambientTimer = 4 + Math.random() * 12;
    this.burning = 0;
    this.jumpCooldown = 0;
  }

  update(dt, mgr) {
    this.age += dt;
    if (this.hurtTime > 0) this.hurtTime -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.jumpCooldown > 0) this.jumpCooldown -= dt;
    this.updateLiquidState();

    /* 주변 소리 */
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = 8 + Math.random() * 18;
      const p = mgr.player;
      if (p && dist2(p.x, p.y, p.z, this.x, this.y, this.z) < 400) AudioSys.mobAmbient(this.kind);
    }

    /* 낮에 타는 몹 */
    if (this.def.burnsInDay && !this.inWater) {
      const sky = this.world.getSkyLight(Math.floor(this.x), Math.floor(this.y + 1), Math.floor(this.z));
      if (sky >= 14 && this.world.daylight > 0.85) {
        this.burning += dt;
        if ((this.age * 4 | 0) % 2 === 0) mgr.particles.flame(this.x, this.y + 1.2, this.z);
        if (this.burning > 1) { this.burning = 0; this.hurt(1, null); }
      }
    }
    if (this.inLava) {
      this.burning += dt;
      if (this.burning > 0.5) { this.burning = 0; this.hurt(4, null); }
    }

    this.ai(dt, mgr);

    /* 물리 */
    this.applyGravity(dt);
    this.px = this.x; this.py = this.y; this.pz = this.z;
    this.move(this.vx * dt, this.vy * dt, this.vz * dt);
    const friction = this.onGround ? Math.pow(0.0016, dt) : Math.pow(0.32, dt);
    this.vx *= friction; this.vz *= friction;

    /* 낙하 피해 */
    if (!this.onGround && this.vy < 0) this.fallDistance += -this.vy * dt;
    else if (this.onGround) {
      if (this.fallDistance > 3.5) this.hurt(Math.floor(this.fallDistance - 3), null);
      this.fallDistance = 0;
    }

    /* 애니메이션 */
    const spd = Math.hypot(this.x - this.px, this.z - this.pz) / Math.max(dt, 1e-4);
    this.limbAmount = lerp(this.limbAmount, clamp(spd / 4, 0, 1), dt * 8);
    this.limbSwing += spd * dt * 3.2;

    /* 익사 */
    if (this.headInWater) {
      this.airTime = (this.airTime || 12) - dt;
      if (this.airTime < 0) { this.airTime = 1; this.hurt(2, null); }
      this.vy += 16 * dt;                 // 수영으로 떠오름
    } else this.airTime = 12;

    if (this.y < -4) this.hurt(1000, null);
  }

  ai(dt, mgr) {
    const p = mgr.player;
    const def = this.def;
    let moveX = 0, moveZ = 0;

    if (def.hostile && p && !p.dead && p.gameMode !== 1) {
      const d = dist3(p.x, p.y, p.z, this.x, this.y, this.z);
      const canSee = d < (this.kind === 'creeper' ? 18 : 22);
      if (canSee) this.target = p; else if (d > 34) this.target = null;
    } else if (!def.hostile && this.target && this.target.dead) this.target = null;

    if (this.target) {
      const t = this.target;
      const dx = t.x - this.x, dz = t.z - this.z;
      const d = Math.hypot(dx, dz) || 1;
      this.yaw = Math.atan2(dx, -dz);

      if (def.explodes) {
        if (d < 2.6) {
          this.fuseTime += dt;
          if ((this.fuseTime * 3 | 0) !== ((this.fuseTime - dt) * 3 | 0)) AudioSys.fuse();
          if (this.fuseTime > 1.5) {
            mgr.explode(this.x, this.y + 0.8, this.z, 3.4, this);
            this.dead = true;
            return;
          }
        } else this.fuseTime = Math.max(0, this.fuseTime - dt * 0.5);
        if (d > 1.9) { moveX = dx / d; moveZ = dz / d; }
      } else if (def.ranged) {
        this.shootCooldown -= dt;
        if (d > 9) { moveX = dx / d; moveZ = dz / d; }
        else if (d < 5) { moveX = -dx / d * 0.7; moveZ = -dz / d * 0.7; }
        if (this.shootCooldown <= 0 && d < 16) {
          this.shootCooldown = 1.6 + Math.random() * 0.8;
          const sx = t.x - this.x, sy = (t.y + 1.2) - (this.y + 1.4), sz = t.z - this.z;
          const sl = Math.hypot(sx, sy, sz) || 1;
          const spd = 24;
          mgr.add(new ArrowEntity(this.world, this.x, this.y + 1.4, this.z,
            sx / sl * spd + (Math.random() - 0.5), sy / sl * spd + 2.2 + (Math.random() - 0.5),
            sz / sl * spd + (Math.random() - 0.5), this, 4));
          AudioSys.bow();
        }
      } else {
        moveX = dx / d; moveZ = dz / d;
        if (d < 1.4 && this.attackCooldown <= 0) {
          this.attackCooldown = 1.0;
          t.hurt(def.damage, this);
          AudioSys.hurt();
        }
      }
    } else {
      /* 배회 */
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 2 + Math.random() * 5;
        this.wandering = Math.random() < 0.62;
        this.wanderYaw = Math.random() * TAU;
      }
      if (this.wandering) {
        moveX = Math.sin(this.wanderYaw); moveZ = -Math.cos(this.wanderYaw);
        this.yaw = this.wanderYaw;
      }
    }

    /* 이동 적용 */
    if (moveX || moveZ) {
      const s = this.speed * (this.inWater ? 0.5 : 1);
      const accel = this.onGround ? 46 : 8;
      this.vx += moveX * accel * dt;
      this.vz += moveZ * accel * dt;
      const sp = Math.hypot(this.vx, this.vz);
      if (sp > s) { this.vx = this.vx / sp * s; this.vz = this.vz / sp * s; }

      /* 장애물 점프 */
      if (this.onGround && this.jumpCooldown <= 0) {
        const fx = Math.floor(this.x + moveX * 0.65);
        const fz = Math.floor(this.z + moveZ * 0.65);
        const fy = Math.floor(this.y);
        const front = this.world.getBlock(fx, fy, fz);
        const frontUp = this.world.getBlock(fx, fy + 1, fz);
        if (front !== 0 && Blocks[front].solid && (frontUp === 0 || !Blocks[frontUp].solid)) {
          this.vy = 8.4; this.jumpCooldown = 0.4;
        }
      }
      if (this.inWater && Math.random() < dt * 8) this.vy = 3.4;
    }
  }

  onDeath(source) {
    const mgr = this.world.entities;
    const rng = Math.random;
    for (const d of this.def.drops) {
      if (d.chance !== undefined && rng() > d.chance) continue;
      const n = d.min === d.max ? d.min : (d.min + Math.floor(rng() * (d.max - d.min + 1)));
      if (n > 0) mgr.spawnItem(this.x, this.y + 0.4, this.z, makeStack(d.name, n));
    }
    if (this.def.xp) mgr.spawnXP(this.x, this.y + 0.5, this.z, this.def.xp);
    mgr.particles.smoke(this.x, this.y + this.height / 2, this.z, 12, 0.7);
    AudioSys.mobHurt(this.kind);
    void source;
  }

  /* ------------------------------------------------------- 모델 렌더 */
  render(mb, world) {
    const l = this.light();
    const bright = this.hurtTime > 0 ? 2.4 : 1;
    const T = this.def.tiles;
    const face = Textures.id(T.face);
    const skin = Textures.id(T.skin);
    const body = Textures.id(T.body);
    const headTiles = [skin, skin, skin, skin, face, skin];
    const swing = Math.sin(this.limbSwing) * this.limbAmount * 0.9;
    const swing2 = Math.sin(this.limbSwing + Math.PI) * this.limbAmount * 0.9;

    const base = Mat4.create();
    Mat4.identity(base);
    Mat4.translate(base, base, this.x, this.y, this.z);
    Mat4.rotateY(base, base, -this.yaw);

    const part = (rot, ox, oy, oz) => {
      const m = Mat4.create();
      m.set(base);
      Mat4.translate(m, m, ox, oy, oz);
      if (rot) Mat4.rotateX(m, m, rot);
      return m;
    };

    switch (this.def.model) {
      case 'biped': {
        /* 머리 */
        let m = part(0, 0, 1.38, 0);
        if (this.target) Mat4.rotateX(m, m, clamp((this.target.y - this.y - 1.4) * -0.12, -0.5, 0.5));
        pushBox(mb, m, -0.25, 0, -0.25, 0.25, 0.5, 0.25, headTiles, l.sky, l.blk, bright);
        /* 몸통 */
        m = part(0, 0, 0.68, 0);
        pushBox(mb, m, -0.25, 0, -0.13, 0.25, 0.7, 0.13, body, l.sky, l.blk, bright);
        /* 팔 (좀비는 앞으로) */
        const armRot = this.kind === 'zombie' ? -Math.PI / 2 + swing * 0.3 : swing;
        m = part(armRot, -0.37, 1.32, 0);
        pushBox(mb, m, -0.12, -0.64, -0.12, 0.12, 0.06, 0.12, skin, l.sky, l.blk, bright);
        m = part(this.kind === 'zombie' ? -Math.PI / 2 + swing2 * 0.3 : swing2, 0.37, 1.32, 0);
        pushBox(mb, m, -0.12, -0.64, -0.12, 0.12, 0.06, 0.12, skin, l.sky, l.blk, bright);
        /* 다리 */
        m = part(swing2, -0.13, 0.68, 0);
        pushBox(mb, m, -0.12, -0.68, -0.12, 0.12, 0.02, 0.12, skin, l.sky, l.blk, bright);
        m = part(swing, 0.13, 0.68, 0);
        pushBox(mb, m, -0.12, -0.68, -0.12, 0.12, 0.02, 0.12, skin, l.sky, l.blk, bright);
        break;
      }
      case 'creeper': {
        const flash = this.fuseTime > 0 ? (Math.sin(this.fuseTime * 22) > 0 ? 2.6 : 1) : 1;
        let m = part(0, 0, 1.13, 0);
        pushBox(mb, m, -0.25, 0, -0.25, 0.25, 0.5, 0.25, headTiles, l.sky, l.blk, bright * flash);
        m = part(0, 0, 0.4, 0);
        pushBox(mb, m, -0.25, 0, -0.13, 0.25, 0.75, 0.13, body, l.sky, l.blk, bright * flash);
        const legs = [[-0.18, -0.16, swing], [0.18, -0.16, swing2], [-0.18, 0.16, swing2], [0.18, 0.16, swing]];
        for (const [lx, lz, sw] of legs) {
          m = part(sw, lx, 0.4, lz);
          pushBox(mb, m, -0.11, -0.4, -0.11, 0.11, 0.02, 0.11, body, l.sky, l.blk, bright * flash);
        }
        break;
      }
      case 'spider': {
        let m = part(0, 0, 0.28, -0.5);
        pushBox(mb, m, -0.25, 0, -0.25, 0.25, 0.45, 0.25, headTiles, l.sky, l.blk, bright);
        m = part(0, 0, 0.22, 0.25);
        pushBox(mb, m, -0.35, 0, -0.4, 0.35, 0.55, 0.4, body, l.sky, l.blk, bright);
        for (let i = 0; i < 4; i++) {
          const zz = -0.3 + i * 0.22;
          const sw = Math.sin(this.limbSwing * 2 + i) * this.limbAmount * 0.5;
          for (const side of [-1, 1]) {
            m = part(0, side * 0.3, 0.34, zz);
            Mat4.rotateZ(m, m, side * (0.6 + sw));
            pushBox(mb, m, side < 0 ? -0.55 : -0.05, -0.06, -0.05, side < 0 ? 0.05 : 0.55, 0.06, 0.05,
              body, l.sky, l.blk, bright);
          }
        }
        break;
      }
      case 'quadruped': {
        const bodyH = this.height * 0.52;
        let m = part(0, 0, bodyH, -0.55);
        pushBox(mb, m, -0.22, -0.04, -0.3, 0.22, 0.42, 0.1, headTiles, l.sky, l.blk, bright);
        m = part(0, 0, bodyH - 0.06, 0.05);
        pushBox(mb, m, -0.26, 0, -0.45, 0.26, 0.48, 0.45, body, l.sky, l.blk, bright);
        const legs = [[-0.18, -0.3, swing], [0.18, -0.3, swing2], [-0.18, 0.32, swing2], [0.18, 0.32, swing]];
        for (const [lx, lz, sw] of legs) {
          m = part(sw, lx, bodyH - 0.06, lz);
          pushBox(mb, m, -0.1, -(bodyH - 0.06), -0.1, 0.1, 0.02, 0.1, skin, l.sky, l.blk, bright);
        }
        break;
      }
      case 'chicken': {
        let m = part(0, 0, 0.5, -0.2);
        pushBox(mb, m, -0.13, 0, -0.16, 0.13, 0.26, 0.16, headTiles, l.sky, l.blk, bright);
        m = part(0, 0, 0.26, 0.02);
        pushBox(mb, m, -0.16, 0, -0.22, 0.16, 0.3, 0.22, body, l.sky, l.blk, bright);
        for (const side of [-1, 1]) {
          m = part(0, side * 0.18, 0.3, 0);
          Mat4.rotateZ(m, m, side * Math.sin(this.limbSwing * 3) * this.limbAmount * 0.5);
          pushBox(mb, m, -0.03, -0.2, -0.16, 0.03, 0.14, 0.16, skin, l.sky, l.blk, bright);
          m = part(side < 0 ? swing : swing2, side * 0.08, 0.26, 0.02);
          pushBox(mb, m, -0.04, -0.26, -0.04, 0.04, 0.02, 0.04, Textures.id('gold_block'), l.sky, l.blk, bright);
        }
        break;
      }
      default: break;
    }
    void world;
  }
}

/* =========================================================================
 *  엔티티 매니저
 * ========================================================================= */
class EntityManager {
  constructor(world, particles) {
    this.world = world;
    this.particles = particles;
    this.entities = [];
    this.player = null;
    this.tickIndex = 0;
    this.spawnTimer = 0;
    this.maxHostile = 32;
    this.maxPassive = 16;
    world.entities = this;
  }

  add(e) { this.entities.push(e); return e; }
  spawnItem(x, y, z, stack) {
    if (!stack || stack.count <= 0) return null;
    return this.add(new ItemEntity(this.world, x, y, z, stack));
  }
  spawnXP(x, y, z, amount) {
    let left = amount;
    while (left > 0) {
      const n = Math.min(left, 1 + Math.floor(Math.random() * 4));
      this.add(new XPOrb(this.world, x, y, z, n));
      left -= n;
    }
  }
  spawnFallingBlock(x, y, z, id) {
    return this.add(new FallingBlockEntity(this.world, x, y, z, id));
  }
  spawnMob(kind, x, y, z) {
    if (!MOB_DEFS[kind]) return null;
    return this.add(new Mob(this.world, kind, x, y, z));
  }

  countType(hostile) {
    let n = 0;
    for (const e of this.entities) {
      if (e.type === 'mob' && !!e.def.hostile === hostile && !e.dead) n++;
    }
    return n;
  }

  update(dt) {
    this.tickIndex++;
    for (const e of this.entities) {
      if (e.dead) continue;
      try { e.update(dt, this); } catch (err) { console.error('엔티티 업데이트 오류', err); e.dead = true; }
    }
    /* 멀리 떨어진 몹 제거 */
    if (this.player && (this.tickIndex % 40) === 0) {
      for (const e of this.entities) {
        if (e.type !== 'mob' || e.dead) continue;
        const d2 = dist2(e.x, e.y, e.z, this.player.x, this.player.y, this.player.z);
        if (d2 > 110 * 110) e.dead = true;
      }
    }
    if (this.entities.length && (this.tickIndex % 8) === 0) {
      this.entities = this.entities.filter((e) => !e.dead);
    }
    this.trySpawn(dt);
  }

  /* ----------------------------------------------------------- 스폰 */
  trySpawn(dt) {
    const p = this.player;
    if (!p || p.gameMode === 1) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = 1.6;

    const w = this.world;
    const night = w.isNight;
    const hostileCount = this.countType(true);
    const passiveCount = this.countType(false);

    /* 적대 몹 */
    if (hostileCount < this.maxHostile) {
      for (let attempt = 0; attempt < 14; attempt++) {
        const a = Math.random() * TAU;
        const r = 26 + Math.random() * 34;
        const x = Math.floor(p.x + Math.cos(a) * r);
        const z = Math.floor(p.z + Math.sin(a) * r);
        if (!w.isLoaded(x, z)) continue;
        const y = this.findSpawnY(x, z);
        if (y < 0) continue;
        const sky = w.getSkyLight(x, y, z);
        const blk = w.getBlockLight(x, y, z);
        const dark = blk < 6 && (night ? sky < 8 : sky < 5);
        if (!dark) continue;
        const kinds = ['zombie', 'zombie', 'skeleton', 'creeper', 'spider'];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        const def = MOB_DEFS[kind];
        if (!this.canFit(x + 0.5, y, z + 0.5, def.size[0], def.size[1])) continue;
        const group = kind === 'zombie' ? 1 + Math.floor(Math.random() * 3) : 1;
        for (let g = 0; g < group; g++) {
          this.spawnMob(kind, x + 0.5 + (Math.random() - 0.5) * 2, y, z + 0.5 + (Math.random() - 0.5) * 2);
        }
        break;
      }
    }

    /* 우호 몹 (낮, 잔디 위) */
    if (passiveCount < this.maxPassive && !night && Math.random() < 0.45) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const a = Math.random() * TAU;
        const r = 22 + Math.random() * 30;
        const x = Math.floor(p.x + Math.cos(a) * r);
        const z = Math.floor(p.z + Math.sin(a) * r);
        if (!w.isLoaded(x, z)) continue;
        const y = this.findSpawnY(x, z);
        if (y < 0) continue;
        if (w.getBlock(x, y - 1, z) !== BlockIds.grass_block) continue;
        if (w.getSkyLight(x, y, z) < 9) continue;
        const kinds = ['pig', 'cow', 'sheep', 'chicken'];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        const def = MOB_DEFS[kind];
        if (!this.canFit(x + 0.5, y, z + 0.5, def.size[0], def.size[1])) continue;
        const group = 2 + Math.floor(Math.random() * 3);
        for (let g = 0; g < group; g++) {
          this.spawnMob(kind, x + 0.5 + (Math.random() - 0.5) * 3, y, z + 0.5 + (Math.random() - 0.5) * 3);
        }
        break;
      }
    }
  }

  findSpawnY(x, z) {
    const w = this.world;
    const surf = w.surfaceHeight(x, z);
    /* 지표면 우선, 실패하면 지하 동굴 */
    if (surf > 0 && surf < CHUNK_HEIGHT - 2) {
      const below = w.getBlock(x, surf - 1, z);
      if (below !== 0 && Blocks[below].solid && w.getBlock(x, surf, z) === 0 && w.getBlock(x, surf + 1, z) === 0) {
        if (Math.random() < 0.55) return surf;
      }
    }
    for (let i = 0; i < 12; i++) {
      const y = 6 + Math.floor(Math.random() * (Math.min(surf, 70) - 6));
      if (y < 1) continue;
      const below = w.getBlock(x, y - 1, z);
      if (below !== 0 && Blocks[below].solid && w.getBlock(x, y, z) === 0 && w.getBlock(x, y + 1, z) === 0) {
        return y;
      }
    }
    return -1;
  }

  canFit(x, y, z, w, h) {
    const box = AABB.fromSize(x, y, z, w, h);
    const out = [];
    this.world.getCollisionBoxes(box, out);
    return out.length === 0;
  }

  /* ------------------------------------------------------------ 폭발 */
  explode(x, y, z, power, source) {
    const w = this.world;
    AudioSys.explode();
    this.particles.smoke(x, y, z, 40, power * 0.5, true);

    const r = Math.ceil(power);
    for (let dy = -r; dy <= r; dy++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const d = Math.hypot(dx, dy, dz);
          if (d > power) continue;
          const bx = Math.floor(x) + dx, by = Math.floor(y) + dy, bz = Math.floor(z) + dz;
          const id = w.getBlock(bx, by, bz);
          if (id === 0) continue;
          const b = Blocks[id];
          if (b.hardness < 0) continue;
          const resist = Math.min(0.92, b.hardness / 26);
          if (Math.random() < (1 - d / power) * (1 - resist)) {
            if (id === BlockIds.tnt) {
              w.setBlock(bx, by, bz, 0);
              const t = new TNTEntity(w, bx + 0.5, by, bz + 0.5, 0.4 + Math.random());
              this.add(t);
              continue;
            }
            if (Math.random() < 0.28) {
              const drops = computeDrops(b, { tool: { kind: b.tool, tier: 4 } }, Math.random);
              for (const s of drops) this.spawnItem(bx + 0.5, by + 0.5, bz + 0.5, s);
            }
            w.setBlock(bx, by, bz, 0);
          }
        }
      }
    }

    /* 피해 */
    const victims = this.entities.slice();
    if (this.player) victims.push(this.player);
    for (const e of victims) {
      if (e.dead || e === source) continue;
      if (!(e instanceof Mob) && e.type !== 'player') continue;
      const d = dist3(e.x, e.y + e.height / 2, e.z, x, y, z);
      if (d > power * 2) continue;
      const f = 1 - d / (power * 2);
      e.hurt(Math.round(f * f * 28), { x, y, z });
    }
  }

  /* ------------------------------------------------- 레이 기반 충돌 */
  raycastEntity(ox, oy, oz, dx, dy, dz, maxDist, exclude) {
    let best = null, bestT = maxDist;
    for (const e of this.entities) {
      if (e.dead || e === exclude) continue;
      if (e.type !== 'mob' && e.type !== 'item' && e.type !== 'tnt') continue;
      const box = e.aabb.grow(0.12);
      const t = rayAABB(ox, oy, oz, dx, dy, dz, box);
      if (t !== null && t < bestT) { bestT = t; best = e; }
    }
    return best ? { entity: best, dist: bestT } : null;
  }

  buildMesh(mb, camera) {
    const maxD = 96 * 96;
    for (const e of this.entities) {
      if (e.dead) continue;
      if (dist2(e.x, e.y, e.z, camera.x, camera.y, camera.z) > maxD) continue;
      try { e.render(mb, this.world); } catch (err) { void err; }
    }
  }

  clear() { this.entities.length = 0; }
}

/** 레이 - AABB 교차. 없으면 null */
function rayAABB(ox, oy, oz, dx, dy, dz, b) {
  let tmin = 0, tmax = Infinity;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  const lo = [b.x0, b.y0, b.z0], hi = [b.x1, b.y1, b.z1];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-8) {
      if (o[i] < lo[i] || o[i] > hi[i]) return null;
    } else {
      const inv = 1 / d[i];
      let t1 = (lo[i] - o[i]) * inv, t2 = (hi[i] - o[i]) * inv;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}
