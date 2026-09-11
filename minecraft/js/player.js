/* =========================================================================
 *  player.js — 플레이어
 *  이동(걷기/달리기/웅크리기/수영/비행) · 채굴 · 설치 · 전투 ·
 *  체력/허기/산소/경험치 · 1인칭 손 렌더
 * ========================================================================= */
'use strict';

const GM_SURVIVAL = 0, GM_CREATIVE = 1;

const PLAYER_WIDTH = 0.6;
const PLAYER_HEIGHT = 1.8;
const EYE_HEIGHT = 1.62;
const SNEAK_EYE = 1.44;

class Player extends Entity {
  constructor(world, x, y, z) {
    super(world, x, y, z, PLAYER_WIDTH, PLAYER_HEIGHT);
    this.type = 'player';
    this.maxHealth = 20;
    this.health = 20;
    this.food = 20;
    this.saturation = 5;
    this.exhaustion = 0;
    this.air = 300;
    this.xp = 0;
    this.xpLevel = 0;
    this.gameMode = GM_SURVIVAL;
    this.flying = false;
    this.sprinting = false;
    this.sneaking = false;
    this.inventory = new Inventory();
    this.craftGrid = new CraftingGrid(2);
    this.cursorStack = null;

    this.yaw = 0; this.pitch = 0;
    this.eyeHeight = EYE_HEIGHT;
    this.bobPhase = 0;
    this.bobAmount = 0;

    /* 채굴 상태 */
    this.mining = false;
    this.miningX = 0; this.miningY = 0; this.miningZ = 0;
    this.miningProgress = 0;
    this.miningTime = 0;
    this.target = null;
    this.swing = 0;
    this.swingActive = false;
    this.useCooldown = 0;
    this.eatTimer = 0;
    this.bowCharge = 0;
    this.placeCooldown = 0;
    this.regenTimer = 0;
    this.starveTimer = 0;
    this.stepDistance = 0;
    this.lastStep = 0;
    this.respawnPoint = { x, y, z };
    this.damageTint = 0;
    this.deathTime = 0;
    this.pickupFlash = 0;
    this.stats = { blocksMined: 0, blocksPlaced: 0, mobsKilled: 0, distance: 0, deaths: 0 };
  }

  get eyeY() { return this.y + this.eyeHeight; }

  get camera() {
    return { x: this.x, y: this.eyeY, z: this.z, yaw: this.yaw, pitch: this.pitch };
  }

  lookDir() {
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    return [Math.sin(this.yaw) * cp, -sp, -Math.cos(this.yaw) * cp];
  }

  get xpForNextLevel() {
    const l = this.xpLevel;
    if (l < 16) return 2 * l + 7;
    if (l < 31) return 5 * l - 38;
    return 9 * l - 158;
  }

  addXP(n) {
    if (this.gameMode === GM_CREATIVE) return;
    this.xp += n;
    while (this.xp >= this.xpForNextLevel) {
      this.xp -= this.xpForNextLevel;
      this.xpLevel++;
      AudioSys.levelUp();
    }
  }

  /* ==================================================================
   *  업데이트
   * ================================================================ */
  update(dt, input, game) {
    if (this.dead) {
      this.deathTime += dt;
      return;
    }
    this.age += dt;
    if (this.hurtTime > 0) this.hurtTime -= dt;
    if (this.damageTint > 0) this.damageTint -= dt * 2;
    if (this.useCooldown > 0) this.useCooldown -= dt;
    if (this.placeCooldown > 0) this.placeCooldown -= dt;
    if (this.pickupFlash > 0) this.pickupFlash -= dt;

    this.updateLiquidState();
    this.eyeHeight = lerp(this.eyeHeight, this.sneaking ? SNEAK_EYE : EYE_HEIGHT, Math.min(1, dt * 14));

    this.handleMovement(dt, input);
    this.updateTarget(game);
    this.handleActions(dt, input, game);
    this.updateVitals(dt, game);
    this.pickupItems(game);

    /* 손 스윙 */
    if (this.swingActive) {
      this.swing += dt / 0.26;
      if (this.swing >= 1) { this.swing = 0; this.swingActive = false; }
    }
  }

  /* ------------------------------------------------------------ 이동 */
  handleMovement(dt, input) {
    const creative = this.gameMode === GM_CREATIVE;
    this.sneaking = input.sneak && !this.flying;
    const wantSprint = input.sprint && input.forward && !this.sneaking && (this.food > 6 || creative);
    this.sprinting = wantSprint;

    let speed = 4.317;
    if (this.sneaking) speed = 1.31;
    else if (this.sprinting) speed = 5.6;
    if (this.flying) speed = this.sprinting ? 21.6 : 10.9;
    if (this.inWater && !this.flying) speed *= 0.55;

    /* 입력 → 월드 방향 */
    let mx = 0, mz = 0;
    if (input.forward) mz -= 1;
    if (input.back) mz += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    const len = Math.hypot(mx, mz);
    if (len > 0) { mx /= len; mz /= len; }
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const wx = mx * cy - mz * sy;
    const wz = mx * sy + mz * cy;

    if (this.flying) {
      const accel = 42;
      this.vx += wx * accel * dt;
      this.vz += wz * accel * dt;
      if (input.jump) this.vy = speed * 0.8;
      else if (input.sneak) this.vy = -speed * 0.8;
      else this.vy *= Math.pow(0.02, dt);
      const sp = Math.hypot(this.vx, this.vz);
      if (sp > speed) { this.vx = this.vx / sp * speed; this.vz = this.vz / sp * speed; }
      this.move(this.vx * dt, this.vy * dt, this.vz * dt);
      this.vx *= Math.pow(0.02, dt); this.vz *= Math.pow(0.02, dt);
      this.fallDistance = 0;
      return;
    }

    /* 사다리 */
    const onLadder = this.world.getBlock(Math.floor(this.x), Math.floor(this.y + 0.5), Math.floor(this.z)) === BlockIds.ladder;

    const accel = this.onGround ? 52 : (this.inWater ? 16 : 12);
    this.vx += wx * accel * dt;
    this.vz += wz * accel * dt;
    const sp = Math.hypot(this.vx, this.vz);
    const maxSp = speed;
    if (sp > maxSp) { this.vx = this.vx / sp * maxSp; this.vz = this.vz / sp * maxSp; }

    /* 점프 / 수영 */
    if (input.jump) {
      if (this.inWater) this.vy = 3.2;
      else if (onLadder) this.vy = 3.0;
      else if (this.onGround) {
        this.vy = 8.4;
        if (this.sprinting) { this.vx += wx * 1.6; this.vz += wz * 1.6; }
        this.addExhaustion(this.sprinting ? 0.2 : 0.05);
      }
    }
    if (onLadder && !input.jump) {
      this.vy = input.sneak ? 0 : Math.max(this.vy, -1.4);
    }

    this.applyGravity(dt);

    /* 웅크리기: 모서리에서 떨어지지 않게 */
    const preX = this.x, preZ = this.z;
    this.px = this.x; this.py = this.y; this.pz = this.z;
    const beforeGround = this.onGround;
    this.move(this.vx * dt, this.vy * dt, this.vz * dt);
    if (this.sneaking && beforeGround && !this.onGround && this.vy <= 0) {
      this.x = preX; this.z = preZ; this.onGround = true;
      this.vx = 0; this.vz = 0;
    }

    const fr = this.onGround ? Math.pow(0.0025, dt) : Math.pow(0.42, dt);
    this.vx *= fr; this.vz *= fr;

    /* 낙하 피해 */
    if (!this.onGround && this.vy < 0) this.fallDistance += -this.vy * dt;
    else if (this.onGround) {
      if (this.fallDistance > 3.1 && !this.inWater) {
        const dmg = Math.floor(this.fallDistance - 3);
        if (dmg > 0) { this.hurt(dmg, null); AudioSys.hurt(); }
      }
      this.fallDistance = 0;
    }
    if (this.inWater) this.fallDistance = 0;

    /* 걷기 소리 / 흔들림 */
    const moved = Math.hypot(this.x - this.px, this.z - this.pz);
    this.stats.distance += moved;
    this.stepDistance += moved;
    this.bobAmount = lerp(this.bobAmount, this.onGround ? Math.min(1, moved / (dt * 5)) : 0, dt * 10);
    this.bobPhase += moved * 2.4;
    if (this.onGround && this.stepDistance > (this.sneaking ? 2.4 : 1.6)) {
      this.stepDistance = 0;
      const below = this.world.getBlock(Math.floor(this.x), Math.floor(this.y - 0.2), Math.floor(this.z));
      if (below) AudioSys.step(Blocks[below].material);
      this.addExhaustion(this.sprinting ? 0.1 : 0.01);
    }

    /* 선인장 피해 */
    const box = this.aabb.grow(-0.02);
    if (this.world.isBoxInMaterial(box, BlockIds.cactus)) {
      if (this.hurtTime <= 0) { this.hurt(1, null); AudioSys.hurt(); }
    }
    if (this.inLava) {
      this.lavaTimer = (this.lavaTimer || 0) + dt;
      if (this.lavaTimer > 0.5) { this.lavaTimer = 0; this.hurt(4, null); AudioSys.hurt(); }
    }
    if (this.y < -8) this.hurt(1000, null);
  }

  /* ------------------------------------------------------ 조준 대상 */
  updateTarget(game) {
    const d = this.lookDir();
    const reach = this.gameMode === GM_CREATIVE ? 5.5 : 4.5;
    const hit = this.world.raycast(this.x, this.eyeY, this.z, d[0], d[1], d[2], reach);
    this.target = hit.hit ? hit : null;
    this.targetEntity = game && game.entities
      ? game.entities.raycastEntity(this.x, this.eyeY, this.z, d[0], d[1], d[2],
        this.target ? Math.min(reach, this.target.dist) : reach, this)
      : null;
  }

  /* ------------------------------------------------------------ 행동 */
  handleActions(dt, input, game) {
    const held = this.inventory.held;
    const heldDef = held ? getItem(held.id) : null;

    /* 좌클릭 — 채굴 / 공격 */
    if (input.attack) {
      if (this.targetEntity && this.useCooldown <= 0) {
        this.attackEntity(this.targetEntity.entity, game);
        this.useCooldown = 0.32;
        this.startSwing();
        this.mining = false;
      } else if (this.target) {
        this.mineTick(dt, game);
      } else {
        if (!this.swingActive) this.startSwing();
        this.mining = false;
        this.miningProgress = 0;
      }
    } else {
      this.mining = false;
      this.miningProgress = 0;
    }

    /* 우클릭 — 설치 / 사용 */
    if (input.use) {
      if (heldDef && heldDef.food && this.canEat()) {
        this.eatTimer += dt;
        if (this.eatTimer > 1.5) { this.finishEating(held, heldDef); this.eatTimer = 0; }
        if (Math.random() < dt * 12) AudioSys.eat();
      } else if (heldDef && heldDef.ranged) {
        this.bowCharge = Math.min(1, this.bowCharge + dt / 1.1);
      } else if (this.placeCooldown <= 0) {
        this.useItem(game);
        this.placeCooldown = 0.22;
      }
    } else {
      this.eatTimer = 0;
      if (this.bowCharge > 0.12) this.shootArrow(game);
      this.bowCharge = 0;
    }
  }

  startSwing() { this.swingActive = true; this.swing = 0; }

  /* ---------------------------------------------------------- 채굴 */
  mineTick(dt, game) {
    const t = this.target;
    const id = this.world.getBlock(t.x, t.y, t.z);
    if (id === 0) { this.mining = false; return; }
    const b = Blocks[id];

    if (this.miningX !== t.x || this.miningY !== t.y || this.miningZ !== t.z) {
      this.miningX = t.x; this.miningY = t.y; this.miningZ = t.z;
      this.miningProgress = 0;
    }
    this.mining = true;
    if (!this.swingActive) this.startSwing();

    if (this.gameMode === GM_CREATIVE) {
      this.breakBlock(t.x, t.y, t.z, game);
      this.placeCooldown = 0.16;
      this.miningProgress = 0;
      return;
    }

    const held = this.inventory.held;
    const heldDef = held ? getItem(held.id) : null;
    const time = breakTime(b, heldDef, this.headInWater, this.onGround);
    if (time === Infinity) { this.miningProgress = 0; return; }
    this.miningTime = time;
    this.miningProgress += time > 0 ? dt / time : 1;

    /* 채굴 파티클/소리 */
    this._digSoundTimer = (this._digSoundTimer || 0) - dt;
    if (this._digSoundTimer <= 0) {
      this._digSoundTimer = 0.22;
      AudioSys.dig(b.material);
      game.particles.blockHit(t.x, t.y, t.z, t.face, id);
    }

    if (this.miningProgress >= 1) {
      this.breakBlock(t.x, t.y, t.z, game);
      this.miningProgress = 0;
      this.addExhaustion(0.005);
    }
  }

  breakBlock(x, y, z, game) {
    const id = this.world.getBlock(x, y, z);
    if (id === 0) return;
    const b = Blocks[id];
    if (b.hardness < 0 && this.gameMode !== GM_CREATIVE) return;

    const held = this.inventory.held;
    const heldDef = held ? getItem(held.id) : null;

    if (this.gameMode !== GM_CREATIVE) {
      const drops = computeDrops(b, heldDef, Math.random);
      for (const st of drops) game.entities.spawnItem(x + 0.5, y + 0.4, z + 0.5, st);
      if (b.xp) game.entities.spawnXP(x + 0.5, y + 0.5, z + 0.5, b.xp);
      /* 도구 내구도 */
      if (held && heldDef && heldDef.durability && heldDef.tool) {
        held.damage = (held.damage || 0) + 1;
        if (held.damage >= heldDef.durability) {
          this.inventory.setHeld(null);
          AudioSys.breakBlock('wood');
        }
      }
    }

    /* 위의 식물도 같이 제거 */
    const above = this.world.getBlock(x, y + 1, z);
    if (above && Blocks[above].plant) {
      const ab = Blocks[above];
      if (this.gameMode !== GM_CREATIVE) {
        for (const st of computeDrops(ab, null, Math.random)) {
          game.entities.spawnItem(x + 0.5, y + 1.4, z + 0.5, st);
        }
      }
      this.world.setBlock(x, y + 1, z, 0);
    }

    game.particles.blockBreak(x, y, z, id);
    AudioSys.breakBlock(b.material);
    this.world.setBlock(x, y, z, 0);
    this.stats.blocksMined++;

    /* 나무를 베면 잎이 서서히 사라지도록 예약 */
    if (id === BlockIds.oak_log || id === BlockIds.birch_log || id === BlockIds.spruce_log) {
      for (let dy = -1; dy <= 5; dy++) {
        for (let dz = -4; dz <= 4; dz++) {
          for (let dx = -4; dx <= 4; dx++) {
            const lid = this.world.getBlock(x + dx, y + dy, z + dz);
            if (lid === BlockIds.oak_leaves || lid === BlockIds.birch_leaves || lid === BlockIds.spruce_leaves) {
              this.world.scheduleTick(x + dx, y + dy, z + dz, 40 + Math.floor(Math.random() * 60));
            }
          }
        }
      }
    }
  }

  /* -------------------------------------------------------- 아이템 사용 */
  useItem(game) {
    const held = this.inventory.held;
    const def = held ? getItem(held.id) : null;

    /* 1) 블록 상호작용 (제작대/화로/상자) */
    if (this.target && !this.sneaking) {
      const id = this.world.getBlock(this.target.x, this.target.y, this.target.z);
      const b = Blocks[id];
      if (b && b.interact) {
        game.gui.openScreen(b.interact, this.target.x, this.target.y, this.target.z);
        AudioSys.click();
        return;
      }
      /* 밀 수확 */
      if (id === BlockIds.wheat && this.world.getMeta(this.target.x, this.target.y, this.target.z) >= 3) {
        game.entities.spawnItem(this.target.x + 0.5, this.target.y + 0.3, this.target.z + 0.5, makeStack('wheat_item', 1));
        game.entities.spawnItem(this.target.x + 0.5, this.target.y + 0.3, this.target.z + 0.5,
          makeStack('seeds', 1 + Math.floor(Math.random() * 2)));
        this.world.setBlock(this.target.x, this.target.y, this.target.z, 0);
        AudioSys.breakBlock('grass');
        return;
      }
    }

    if (!held || !def) { this.startSwing(); return; }

    /* 2) 양동이 */
    if (def.name === 'bucket') { this.useBucketFill(game); return; }
    if (def.liquid) { this.useBucketEmpty(game, def); return; }

    /* 3) 괭이 */
    if (def.tool && def.tool.kind === 'hoe' && this.target) {
      const id = this.world.getBlock(this.target.x, this.target.y, this.target.z);
      if ((id === BlockIds.grass_block || id === BlockIds.dirt) &&
        this.world.getBlock(this.target.x, this.target.y + 1, this.target.z) === 0) {
        this.world.setBlock(this.target.x, this.target.y, this.target.z, BlockIds.farmland);
        AudioSys.dig('dirt');
        this.startSwing();
        this.damageHeld(1);
        return;
      }
    }

    /* 4) 씨앗 심기 */
    if (def.name === 'seeds' && this.target) {
      const id = this.world.getBlock(this.target.x, this.target.y, this.target.z);
      if (id === BlockIds.farmland && this.world.getBlock(this.target.x, this.target.y + 1, this.target.z) === 0) {
        this.world.setBlock(this.target.x, this.target.y + 1, this.target.z, BlockIds.wheat, 0);
        this.consumeHeld();
        AudioSys.dig('grass');
        this.startSwing();
        return;
      }
    }

    /* 5) 블록 설치 */
    if (def.isBlock || def.placeBlock) {
      this.placeBlock(game, def);
      return;
    }
    this.startSwing();
  }

  placeBlock(game, def) {
    if (!this.target) return;
    const t = this.target;
    const F = FACES[t.face < 0 ? FACE_TOP : t.face];
    let px = t.x + F.n[0], py = t.y + F.n[1], pz = t.z + F.n[2];

    const existing = this.world.getBlock(px, py, pz);
    if (existing !== 0 && !isReplaceable(existing)) return;

    const blockName = def.placeBlock || def.name;
    const blockId = BlockIds[blockName];
    if (blockId === undefined) return;
    const nb = Blocks[blockId];

    /* 식물은 지지대 필요 */
    if (nb.plant) {
      const below = this.world.getBlock(px, py - 1, pz);
      if (!this.world.plantSupportOK(blockId, below, px, py, pz)) return;
    }
    /* 플레이어와 겹치면 불가 */
    if (nb.solid) {
      const box = new AABB(px, py, pz, px + 1, py + 1, pz + 1);
      if (box.intersects(this.aabb)) return;
      for (const e of game.entities.entities) {
        if (e.dead || (e.type !== 'mob')) continue;
        if (box.intersects(e.aabb)) return;
      }
    }

    this.world.setBlock(px, py, pz, blockId, 0);
    AudioSys.place(nb.material);
    this.startSwing();
    this.stats.blocksPlaced++;
    if (this.gameMode !== GM_CREATIVE) this.consumeHeld();
  }

  useBucketFill(game) {
    const d = this.lookDir();
    const hit = this.world.raycast(this.x, this.eyeY, this.z, d[0], d[1], d[2], 5, true);
    if (!hit.hit) return;
    const id = this.world.getBlock(hit.x, hit.y, hit.z);
    if (id === BlockIds.water || id === BlockIds.lava) {
      if (this.world.getMeta(hit.x, hit.y, hit.z) !== 0) return;
      this.world.setBlock(hit.x, hit.y, hit.z, 0);
      const newName = id === BlockIds.water ? 'water_bucket' : 'lava_bucket';
      if (this.gameMode !== GM_CREATIVE) {
        this.consumeHeld();
        const left = this.inventory.addStack(makeStack(newName, 1));
        if (left) game.entities.spawnItem(this.x, this.y + 1, this.z, left);
      }
      AudioSys.splash();
      this.startSwing();
    }
  }

  useBucketEmpty(game, def) {
    if (!this.target) return;
    const t = this.target;
    const F = FACES[t.face < 0 ? FACE_TOP : t.face];
    const px = t.x + F.n[0], py = t.y + F.n[1], pz = t.z + F.n[2];
    const existing = this.world.getBlock(px, py, pz);
    if (existing !== 0 && !isReplaceable(existing)) return;
    this.world.setBlock(px, py, pz, BlockIds[def.liquid], 0);
    AudioSys.splash();
    this.startSwing();
    if (this.gameMode !== GM_CREATIVE) {
      this.consumeHeld();
      const left = this.inventory.addStack(makeStack('bucket', 1));
      if (left) game.entities.spawnItem(this.x, this.y + 1, this.z, left);
    }
  }

  shootArrow(game) {
    if (this.gameMode !== GM_CREATIVE && !this.inventory.has(ItemIds.arrow, 1)) return;
    const power = clamp(this.bowCharge, 0.15, 1);
    const d = this.lookDir();
    const spd = 18 + power * 32;
    game.entities.add(new ArrowEntity(this.world,
      this.x + d[0] * 0.6, this.eyeY - 0.1 + d[1] * 0.6, this.z + d[2] * 0.6,
      d[0] * spd, d[1] * spd + 1.2, d[2] * spd, this, 3 + power * 6));
    AudioSys.bow();
    this.startSwing();
    if (this.gameMode !== GM_CREATIVE) {
      this.inventory.consume(ItemIds.arrow, 1);
      this.damageHeld(1);
    }
  }

  attackEntity(e, game) {
    const held = this.inventory.held;
    const def = held ? getItem(held.id) : null;
    let dmg = def ? def.attack : 1;
    if (!this.onGround && this.vy < 0) {
      dmg *= 1.5;
      game.particles.crit(e.x, e.y + e.height * 0.5, e.z, 6);
    }
    const before = e.health;
    if (e.hurt(dmg, this)) {
      AudioSys.mobHurt(e.kind || 'zombie');
      this.addExhaustion(0.1);
      if (def && def.durability && def.tool) this.damageHeld(1);
      if (e.dead && before > 0) this.stats.mobsKilled++;
    }
  }

  damageHeld(n) {
    const held = this.inventory.held;
    if (!held || this.gameMode === GM_CREATIVE) return;
    const def = getItem(held.id);
    if (!def || !def.durability) return;
    held.damage = (held.damage || 0) + n;
    if (held.damage >= def.durability) this.inventory.setHeld(null);
  }

  consumeHeld() {
    const held = this.inventory.held;
    if (!held) return;
    held.count--;
    if (held.count <= 0) this.inventory.setHeld(null);
  }

  /* ---------------------------------------------------------- 생존 */
  canEat() {
    return this.food < 20 || this.gameMode === GM_CREATIVE;
  }

  finishEating(held, def) {
    this.food = Math.min(20, this.food + def.food.hunger);
    this.saturation = Math.min(this.food, this.saturation + def.food.saturation);
    if (this.gameMode !== GM_CREATIVE) this.consumeHeld();
    AudioSys.pop();
  }

  addExhaustion(n) {
    if (this.gameMode === GM_CREATIVE) return;
    this.exhaustion += n;
    while (this.exhaustion >= 4) {
      this.exhaustion -= 4;
      if (this.saturation > 0) this.saturation = Math.max(0, this.saturation - 1);
      else this.food = Math.max(0, this.food - 1);
    }
  }

  updateVitals(dt, game) {
    if (this.gameMode === GM_CREATIVE) {
      this.air = 300; this.food = 20;
      return;
    }
    /* 산소 */
    if (this.headInWater) {
      this.air -= dt * 20;
      if (this.air <= 0) {
        this.air = 0;
        this.drownTimer = (this.drownTimer || 0) + dt;
        if (this.drownTimer > 1) { this.drownTimer = 0; this.hurt(2, null); AudioSys.hurt(); }
      }
      if (Math.random() < dt * 3) {
        game.particles.splash(this.x, this.eyeY, this.z, 1);
      }
    } else {
      this.air = Math.min(300, this.air + dt * 60);
      this.drownTimer = 0;
    }

    /* 자연 회복 */
    if (this.food >= 18 && this.health < this.maxHealth) {
      this.regenTimer += dt;
      if (this.regenTimer > 3.5) {
        this.regenTimer = 0;
        this.health = Math.min(this.maxHealth, this.health + 1);
        this.addExhaustion(3);
      }
    } else this.regenTimer = 0;

    /* 굶주림 피해 */
    if (this.food <= 0) {
      this.starveTimer += dt;
      if (this.starveTimer > 4) {
        this.starveTimer = 0;
        if (this.health > 1) this.hurt(1, null);
      }
    } else this.starveTimer = 0;
  }

  pickupItems(game) {
    const box = this.aabb.grow(0.8);
    for (const e of game.entities.entities) {
      if (e.dead || e.type !== 'item' || e.pickupDelay > 0) continue;
      if (!box.intersects(e.aabb)) continue;
      const left = this.inventory.addStack(e.stack);
      if (!left) {
        e.dead = true;
        AudioSys.pop();
        this.pickupFlash = 0.3;
        game.hud.showPickup(e.stack);
      } else {
        e.stack = left;
      }
    }
  }

  hurt(amount, source) {
    if (this.gameMode === GM_CREATIVE) return false;
    if (this.hurtTime > 0.3 || this.dead) return false;
    /* 방어구 감쇠 */
    const def = this.inventory.defense;
    const reduced = amount * (1 - Math.min(0.8, def * 0.04));
    this.inventory.damageArmor(1);
    this.health -= reduced;
    this.hurtTime = 0.55;
    this.damageTint = 1;
    if (source) {
      const dx = this.x - source.x, dz = this.z - source.z;
      const d = Math.hypot(dx, dz) || 1;
      this.vx += dx / d * 4.5;
      this.vz += dz / d * 4.5;
      this.vy = Math.max(this.vy, 4.0);
    }
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.deathTime = 0;
      this.stats.deaths++;
    }
    return true;
  }

  die(game) {
    /* 아이템 드롭 */
    for (let i = 0; i < this.inventory.size; i++) {
      const s = this.inventory.get(i);
      if (s) game.entities.spawnItem(this.x, this.y + 1, this.z, s);
      this.inventory.set(i, null);
    }
    for (let i = 0; i < 4; i++) {
      const s = this.inventory.armor[i];
      if (s) game.entities.spawnItem(this.x, this.y + 1, this.z, s);
      this.inventory.armor[i] = null;
    }
    this.xp = 0; this.xpLevel = 0;
  }

  respawn() {
    const p = this.respawnPoint;
    const y = this.world.surfaceHeight(Math.floor(p.x), Math.floor(p.z));
    this.x = p.x; this.y = Math.max(y, p.y); this.z = p.z;
    this.vx = this.vy = this.vz = 0;
    this.health = this.maxHealth;
    this.food = 20; this.saturation = 5; this.exhaustion = 0;
    this.air = 300;
    this.dead = false;
    this.deathTime = 0;
    this.fallDistance = 0;
    this.hurtTime = 0;
  }

  /* ==================================================================
   *  1인칭 손 / 아이템 렌더
   * ================================================================ */
  buildHand(mb) {
    const held = this.inventory.held;
    const def = held ? getItem(held.id) : null;
    const sw = this.swingActive ? Math.sin(this.swing * Math.PI) : 0;
    const eat = this.eatTimer > 0 ? Math.sin(this.eatTimer * 18) * 0.06 : 0;
    const bob = this.bobAmount;
    const bx = Math.sin(this.bobPhase) * 0.035 * bob;
    const by = -Math.abs(Math.cos(this.bobPhase)) * 0.03 * bob;

    const isBlock = !!(def && def.isBlock && Blocks[held.id] && Blocks[held.id].render === RENDER_CUBE);
    const m = Mat4.create();
    Mat4.identity(m);
    /* 카메라 로컬 좌표: 오른쪽 아래 앞 */
    Mat4.translate(m, m, 0.44 + bx - sw * 0.10, -0.40 + by - sw * 0.24 + eat, -0.70 + sw * 0.18);
    if (isBlock) {
      Mat4.rotateY(m, m, -0.5 - sw * 0.5);
      Mat4.rotateZ(m, m, 0.12 + sw * 0.45);
      Mat4.rotateX(m, m, -0.18 - sw * 0.7 + this.bowCharge * 0.5);
    } else if (!def) {
      /* 맨손: 오른쪽 아래에서 화면 안쪽으로 뻗은 팔 */
      Mat4.rotateY(m, m, -0.34);
      Mat4.rotateX(m, m, -0.62 - sw * 0.8);
      Mat4.rotateZ(m, m, 0.16 + sw * 0.2);
    } else {
      /* 아이템은 판면이 카메라를 향하도록 (살짝만 기울인다) */
      Mat4.rotateY(m, m, -0.22 - sw * 0.35);
      Mat4.rotateX(m, m, -0.12 - sw * 0.6 + this.bowCharge * 0.4);
      Mat4.rotateZ(m, m, 0.62 + sw * 0.35);
    }

    const sky = 1, blk = Math.max(0.35, this.world.getBlockLight(
      Math.floor(this.x), Math.floor(this.eyeY), Math.floor(this.z)) / 15);
    const light = Math.max(this.world.getSkyLight(Math.floor(this.x), Math.floor(this.eyeY), Math.floor(this.z)) / 15 * this.world.daylight, blk);
    void sky;

    if (isBlock) {
      pushBox(mb, m, -0.13, -0.13, -0.13, 0.13, 0.13, 0.13,
        Array.from(Blocks[held.id].tiles), light, blk, 1.15);
    } else if (def) {
      /* 아이템은 얇은 판 — 두께 축은 Z(카메라 방향)로 두어 정면이 보이게 */
      const layer = Textures.id(def.tex || 'missing');
      pushBox(mb, m, -0.15, -0.15, -0.008, 0.15, 0.15, 0.008, layer, light, blk, 1.25);
    } else {
      /* 맨손 — 소매(셔츠) + 손 */
      const skin = Textures.id('player_skin');
      const shirt = Textures.id('player_shirt');
      pushBox(mb, m, -0.055, -0.34, -0.055, 0.055, 0.02, 0.055, shirt, light, blk, 1.15);
      pushBox(mb, m, -0.055, 0.0, -0.055, 0.055, 0.13, 0.055, skin, light, blk, 1.2);
    }
  }

  /* -------------------------------------------------------- 직렬화 */
  serialize() {
    return {
      x: this.x, y: this.y, z: this.z, yaw: this.yaw, pitch: this.pitch,
      health: this.health, food: this.food, saturation: this.saturation,
      xp: this.xp, xpLevel: this.xpLevel, gameMode: this.gameMode,
      inventory: this.inventory.serialize(), respawn: this.respawnPoint,
      stats: this.stats,
    };
  }
  deserialize(d) {
    if (!d) return;
    this.x = d.x; this.y = d.y; this.z = d.z;
    this.yaw = d.yaw || 0; this.pitch = d.pitch || 0;
    this.health = d.health; this.food = d.food; this.saturation = d.saturation || 5;
    this.xp = d.xp || 0; this.xpLevel = d.xpLevel || 0;
    this.gameMode = d.gameMode || 0;
    this.inventory.deserialize(d.inventory);
    if (d.respawn) this.respawnPoint = d.respawn;
    if (d.stats) this.stats = Object.assign(this.stats, d.stats);
  }
}
