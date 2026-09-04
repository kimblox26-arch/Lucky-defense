// 감염체 매니저. 개체는 풀에서 재사용하고,
// 렌더는 부위별 InstancedMesh 7개(몸통/머리/양팔/양다리/눈)로 처리해
// 개체 수와 무관하게 드로우콜을 7개로 고정한다.

import {
  InstancedMesh, BoxGeometry, MeshStandardMaterial, MeshBasicMaterial,
  Matrix4, Vector3, Quaternion, Color, DynamicDrawUsage, SphereGeometry,
} from 'three';
import { TYPES, TYPE } from './Types.js';
import { Surfaces } from '../core/Textures.js';
import { setVertexColor } from '../world/GeoUtil.js';
import { rng, clamp, clamp01, lerp, damp } from '../core/Util.js';

const MAX = 96;
const BASE_H = 1.78;

const STATE = { CHASE: 0, ATTACK: 1, STAGGER: 2, DEAD: 3, LUNGE: 4, WINDUP_RANGED: 5 };

// 기본 체형(높이 1.78 기준). [폭, 높이, 깊이] 와 피벗 y
const RIG = {
  leg: { size: [0.17, 0.8, 0.19], pivotY: 0.8, offX: 0.15 },
  torso: { size: [0.52, 0.74, 0.32], centerY: 1.17 },
  head: { size: [0.30, 0.32, 0.30], centerY: 1.66 },
  arm: { size: [0.145, 0.64, 0.17], pivotY: 1.44, offX: 0.33 },
  eye: { size: [0.055, 0.05, 0.03], offX: 0.075, y: 1.70, z: 0.155 },   // 모델은 +Z를 바라본다
};

const _m = new Matrix4();
const _p = new Vector3();
const _q = new Quaternion();
const _qy = new Quaternion();
const _qx = new Quaternion();
const _s = new Vector3();
const _c = new Color();
const _axisX = new Vector3(1, 0, 0);
const _axisY = new Vector3(0, 1, 0);
const _axisZ = new Vector3(0, 0, 1);

export class Enemies {
  constructor(game) {
    this.game = game;
    this.engine = game.engine;
    this.collision = game.collision;
    this.flow = null;                 // Game이 주입

    this.list = [];
    for (let i = 0; i < MAX; i++) this.list.push(makeZombie());
    this.active = 0;                  // 앞쪽 active개가 살아있거나 사망 연출 중

    this._buildMeshes();
    this._buildProjectiles();

    this._flowDir = { x: 0, z: 0 };
    this._hits = [];
    this._rayOut = {};
    this._flowTimer = 0;
    this._sepGrid = new Map();

    this.onKill = null;               // (zombie, isCrit)
    this.onPlayerHit = null;          // (zombie, damage)
    this.killCount = 0;
    this._threat = 0;
  }

  /** 0..1 — 음악/긴장 연출용 위협도 */
  get threat() { return clamp01(this._threat / 9); }

  // ───────────────────────── 렌더 자원 ─────────────────────────

  _buildMeshes() {
    const surf = Surfaces.flesh();
    // instanceColor는 머티리얼에 vertexColors가 켜져 있어야 프래그먼트까지 전달된다.
    // 그리고 geometry에 흰색 color 속성이 없으면 vColor가 0이 되므로 함께 넣는다.
    const skin = new MeshStandardMaterial({
      map: surf.map, normalMap: surf.normalMap, roughnessMap: surf.roughnessMap,
      roughness: 0.9, metalness: 0.02, envMapIntensity: 1.35,
      emissive: new Color(0x0b0d10), emissiveIntensity: 1,
      vertexColors: true,
    });
    const geo = setVertexColor(new BoxGeometry(1, 1, 1), '#ffffff');
    const mk = (name, castShadow = true) => {
      const m = new InstancedMesh(geo, skin, MAX);
      m.name = 'zombie-' + name;
      m.instanceMatrix.setUsage(DynamicDrawUsage);
      m.castShadow = castShadow;
      m.receiveShadow = false;
      m.frustumCulled = false;
      m.count = 0;
      this.engine.scene.add(m);
      return m;
    };
    this.mTorso = mk('torso');
    this.mHead = mk('head');
    this.mArmL = mk('armL', false);
    this.mArmR = mk('armR', false);
    this.mLegL = mk('legL', false);
    this.mLegR = mk('legR', false);
    this.parts = [this.mTorso, this.mHead, this.mArmL, this.mArmR, this.mLegL, this.mLegR];

    // 눈 — 어두운 환경에서 실루엣을 읽게 해주는 핵심 요소. 블룸을 타도록 밝게.
    const eyeMat = new MeshBasicMaterial({ toneMapped: true, fog: true, vertexColors: true });
    const eyeGeo = setVertexColor(new BoxGeometry(1, 1, 1), '#ffffff');
    this.mEyes = new InstancedMesh(eyeGeo, eyeMat, MAX * 2);
    this.mEyes.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mEyes.frustumCulled = false;
    this.mEyes.count = 0;
    this.mEyes.renderOrder = 2;
    this.engine.scene.add(this.mEyes);

    this.skinMat = skin;
  }

  _buildProjectiles() {
    this.projectiles = [];
    const mat = new MeshBasicMaterial({ color: new Color(0.4, 3.2, 0.5), toneMapped: true });
    this.mProj = new InstancedMesh(new SphereGeometry(0.16, 8, 6), mat, 32);
    this.mProj.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mProj.frustumCulled = false;
    this.mProj.count = 0;
    this.engine.scene.add(this.mProj);
  }

  // ───────────────────────── 스폰 ─────────────────────────

  get aliveCount() {
    let n = 0;
    for (let i = 0; i < this.active; i++) if (this.list[i].state !== STATE.DEAD) n++;
    return n;
  }

  get totalActive() { return this.active; }

  /** 지정 지점에서 maxDist 이내 가장 가까운 살아있는 적 (아군 AI 타게팅용) */
  nearestEnemy(x, z, maxDist = 40) {
    let best = null, bestD = maxDist * maxDist;
    for (let i = 0; i < this.active; i++) {
      const e = this.list[i];
      if (e.state === STATE.DEAD || e.health <= 0) continue;
      const dx = e.pos.x - x, dz = e.pos.z - z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  spawn(typeId, x, z, buff = null) {
    if (this.active >= MAX) return null;
    const t = TYPES[typeId];
    const z0 = this.list[this.active++];
    const hpMul = buff?.health ?? 1;
    const spMul = buff?.speed ?? 1;
    const dmgMul = buff?.damage ?? 1;

    z0.type = typeId;
    z0.def = t;
    z0.pos.set(x, this.collision.groundHeight(x, z, 4), z);
    if (!isFinite(z0.pos.y)) z0.pos.y = 0;
    z0.vel.set(0, 0, 0);
    z0.yaw = rng.range(0, Math.PI * 2);
    z0.maxHealth = t.health * hpMul;
    z0.health = z0.maxHealth;
    z0.speed = t.speed * spMul * (1 + rng.range(-t.speedVar, t.speedVar));
    z0.damage = t.damage * dmgMul;
    z0.state = STATE.CHASE;
    z0.stateT = 0;
    z0.phase = rng.range(0, Math.PI * 2);
    z0.attackCd = rng.range(0, 0.5);
    z0.headAlive = true;
    z0.legHurt = 0;
    z0.hitFlash = 0;
    z0.deathT = 0;
    z0.fallDir = 0;
    z0.grounded = true;
    z0.lungeCd = rng.range(1, 3);
    z0.spawnT = 0;
    z0.lastSound = rng.range(0, 4);
    z0.stuckT = 0;
    z0.scale = 1 + rng.range(-0.06, 0.08);
    z0.attackDone = false;
    z0.animSpeed = 0;
    z0.fuse = 0;
    z0.distToPlayer = 99;
    z0.baseColor.set(t.color).convertSRGBToLinear();
    z0.accentColor.set(t.accent).convertSRGBToLinear();
    z0.eyeColor.set(t.eye).convertSRGBToLinear().multiplyScalar(t.eyeIntensity);
    return z0;
  }

  _despawn(i) {
    const last = --this.active;
    if (i !== last) {
      const tmp = this.list[i];
      this.list[i] = this.list[last];
      this.list[last] = tmp;
    }
  }

  clear() {
    this.active = 0;
    this.projectiles.length = 0;
    this.killCount = 0;
    for (const m of this.parts) m.count = 0;
    this.mEyes.count = 0;
    this.mProj.count = 0;
  }

  // ───────────────────────── 시뮬레이션 ─────────────────────────

  update(dt, playerPos, playing) {
    if (!playing) return;

    // 플로우 필드 갱신 (초당 ~6회)
    this._flowTimer -= dt;
    if (this._flowTimer <= 0 && this.flow) {
      this._flowTimer = 1 / 6;
      this.flow.rebuild(playerPos.x, playerPos.z);
    }

    this._buildSeparationGrid();
    this._threat = 0;

    for (let i = 0; i < this.active; i++) {
      const z = this.list[i];
      if (z.state === STATE.DEAD) {
        this._updateDead(z, dt);
        if (z.deathT > 3.4) { this._despawn(i); i--; }
        continue;
      }
      this._updateAlive(z, dt, playerPos, i);
    }

    this._updateProjectiles(dt, playerPos);
  }

  _buildSeparationGrid() {
    // 2m 셀 해시 — 개체끼리 겹치지 않게 밀어내기 위한 브로드페이즈
    const g = this._sepGrid;
    g.clear();
    for (let i = 0; i < this.active; i++) {
      const z = this.list[i];
      if (z.state === STATE.DEAD) continue;
      const key = (Math.floor(z.pos.x / 2) * 73856093) ^ (Math.floor(z.pos.z / 2) * 19349663);
      let b = g.get(key);
      if (!b) { b = []; g.set(key, b); }
      b.push(i);
    }
  }

  _separation(z, outX, out) {
    const g = this._sepGrid;
    const cx = Math.floor(z.pos.x / 2), cz = Math.floor(z.pos.z / 2);
    let sx = 0, sz = 0;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const b = g.get(((cx + ox) * 73856093) ^ ((cz + oz) * 19349663));
        if (!b) continue;
        for (let k = 0; k < b.length; k++) {
          const o = this.list[b[k]];
          if (o === z) continue;
          const dx = z.pos.x - o.pos.x, dz = z.pos.z - o.pos.z;
          const minD = z.def.radius + o.def.radius;
          const d2 = dx * dx + dz * dz;
          if (d2 > minD * minD || d2 < 1e-6) continue;
          const d = Math.sqrt(d2);
          const push = (minD - d) / minD;
          // 무거운 쪽이 덜 밀린다
          const w = push * (o.def.mass / (z.def.mass + o.def.mass)) * 2;
          sx += (dx / d) * w;
          sz += (dz / d) * w;
        }
      }
    }
    out.x = sx; out.z = sz;
  }

  _updateAlive(z, dt, playerPos, index) {
    const t = z.def;
    z.spawnT += dt;
    z.stateT += dt;
    z.attackCd -= dt;
    z.lungeCd -= dt;
    z.hitFlash = Math.max(0, z.hitFlash - dt * 5.5);

    const dx = playerPos.x - z.pos.x;
    const dz = playerPos.z - z.pos.z;
    const distSq = dx * dx + dz * dz;
    const dist = Math.sqrt(distSq);
    z.distToPlayer = dist;
    // 음악 강도용 위협도 — 가깝고 무거운 개체일수록 크게
    if (dist < 20) this._threat += (1 - dist / 20) * (0.5 + t.mass * 0.35);

    // ── 상태 전이 ──
    if (z.state === STATE.STAGGER) {
      if (z.stateT > z.staggerDur) this._setState(z, STATE.CHASE);
    } else if (z.state === STATE.ATTACK) {
      if (z.stateT >= t.attackWind && !z.attackDone) {
        z.attackDone = true;
        this._resolveAttack(z, playerPos, dist);
      }
      if (z.stateT > t.attackWind + 0.45) {
        this._setState(z, STATE.CHASE);
        z.attackCd = t.attackCd;
      }
    } else if (z.state === STATE.WINDUP_RANGED) {
      if (z.stateT >= t.attackWind) {
        this._spit(z, playerPos);
        this._setState(z, STATE.CHASE);
        z.attackCd = t.attackCd;
      }
    } else if (z.state === STATE.LUNGE) {
      if (z.stateT > 0.45 || z.grounded && z.stateT > 0.2) this._setState(z, STATE.CHASE);
    } else {
      // CHASE — 공격 조건 검사
      const canSee = dist < 30 && !this.collision.losBlocked(
        z.pos.x, z.pos.y + t.height * 0.72, z.pos.z,
        playerPos.x, playerPos.y + 1.4, playerPos.z,
      );
      if (t.ranged) {
        if (z.attackCd <= 0 && dist < t.attackRange && canSee) {
          this._setState(z, STATE.WINDUP_RANGED);
        }
      } else if (dist < t.attackRange + t.radius && z.attackCd <= 0) {
        z.attackDone = false;
        this._setState(z, STATE.ATTACK);
      } else if (t.lunge && z.lungeCd <= 0 && dist < t.lunge.range && dist > 2.2 && canSee) {
        this._setState(z, STATE.LUNGE);
        const inv = 1 / Math.max(0.01, dist);
        z.vel.x = dx * inv * t.lunge.speed;
        z.vel.z = dz * inv * t.lunge.speed;
        z.vel.y = 3.6;
        z.grounded = false;
        z.lungeCd = t.lunge.cd;
      }
    }

    // ── 이동 ──
    let wishX = 0, wishZ = 0, moveSpeed = 0;
    if (z.state === STATE.CHASE) {
      const inv = 1 / Math.max(0.01, dist);
      // 가까우면 직접 추적, 멀면 플로우 필드
      let useDirect = dist < 6;
      if (useDirect) {
        useDirect = !this.collision.losBlocked(
          z.pos.x, z.pos.y + 0.9, z.pos.z,
          playerPos.x, playerPos.y + 0.9, playerPos.z,
        );
      }
      if (useDirect) {
        wishX = dx * inv; wishZ = dz * inv;
      } else if (this.flow && this.flow.sample(z.pos.x, z.pos.z, this._flowDir)) {
        wishX = this._flowDir.x; wishZ = this._flowDir.z;
      } else {
        wishX = dx * inv; wishZ = dz * inv;
      }

      moveSpeed = z.speed * (1 - z.legHurt * 0.45);
      // 분사체는 사거리를 유지한다
      if (t.ranged && dist < t.ranged.keepDistance) {
        wishX = -wishX; wishZ = -wishZ;
        moveSpeed *= 0.8;
      } else if (!t.ranged) {
        // 사거리 안에 들어오면 멈춘다. 계속 밀고 들어오면 몸통이 카메라를 가린다.
        const stop = t.attackRange * 0.72 + t.radius + 0.36;
        if (dist < stop) moveSpeed = 0;
        else if (dist < stop + 0.8) moveSpeed *= (dist - stop) / 0.8;
      }
      // 자폭체는 접근할수록 빨라진다
      if (t.explode && dist < 9) moveSpeed *= 1.35;
    } else if (z.state === STATE.STAGGER) {
      moveSpeed = 0;
    }

    // 분리 조향
    this._separation(z, 0, _sep);
    const sepW = z.state === STATE.LUNGE ? 0.4 : 1;
    wishX += _sep.x * sepW;
    wishZ += _sep.z * sepW;

    const wl = Math.hypot(wishX, wishZ);
    if (wl > 1e-4) { wishX /= wl; wishZ /= wl; }

    if (z.state !== STATE.LUNGE) {
      // 도약 중에는 관성을 그대로 유지한다
      const accel = z.grounded ? 22 : 5;
      z.vel.x = approach(z.vel.x, wishX * moveSpeed, accel * dt);
      z.vel.z = approach(z.vel.z, wishZ * moveSpeed, accel * dt);
    }

    // 넉백 감쇠
    z.vel.x *= Math.exp(-1.2 * dt * (z.state === STATE.STAGGER ? 3 : 0.3));
    z.vel.z *= Math.exp(-1.2 * dt * (z.state === STATE.STAGGER ? 3 : 0.3));

    z.vel.y -= 24 * dt;

    _delta.set(z.vel.x * dt, z.vel.y * dt, z.vel.z * dt);
    const hit = this.collision.moveBox(z.pos, t.radius, t.height, _delta, _moveOut, 0.5);
    if (hit.grounded) { z.vel.y = 0; z.grounded = true; }
    else { z.grounded = false; if (hit.ceiling) z.vel.y = Math.min(0, z.vel.y); }
    if (hit.wall) {
      if (hit.wallNormalX) z.vel.x = 0;
      if (hit.wallNormalZ) z.vel.z = 0;
    }

    // ── 플레이어와의 겹침 해소 ──
    // 이걸 하지 않으면 감염체가 플레이어를 통과해 카메라 안쪽까지 들어와
    // 화면이 몸통으로 가려진다. 질량 비율로 서로를 밀어낸다.
    {
      const p = this.game.player;
      const minD = t.radius + p.radius + 0.06;
      const ddx = z.pos.x - p.position.x;
      const ddz = z.pos.z - p.position.z;
      const d2 = ddx * ddx + ddz * ddz;
      const vertical = z.pos.y + t.height > p.position.y && z.pos.y < p.position.y + p.height;
      if (vertical && d2 < minD * minD && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = minD - d;
        const nx = ddx / d, nz = ddz / d;
        // 무거운 개체일수록 플레이어를 더 밀어낸다
        const zShare = clamp(1 / (1 + t.mass * 0.55), 0.25, 0.85);
        z.pos.x += nx * push * zShare;
        z.pos.z += nz * push * zShare;
        // 밀림이 너무 세면 뒷걸음질만으로 영원히 도망칠 수 있으므로 약하게 제한
        const pShare = Math.min((push * (1 - zShare)) / Math.max(dt, 1e-4), 1.6);
        p.velocity.x -= nx * pShare;
        p.velocity.z -= nz * pShare;
      }
    }

    // 벽에 끼면 잠시 옆으로 비켜간다
    const moved = Math.hypot(hit.movedX ?? 0, hit.movedZ ?? 0);
    if (z.state === STATE.CHASE && moveSpeed > 0.4 && moved < moveSpeed * dt * 0.25) {
      z.stuckT += dt;
      if (z.stuckT > 0.35) {
        z.vel.x += -wishZ * moveSpeed * 0.9;
        z.vel.z += wishX * moveSpeed * 0.9;
        z.stuckT = 0;
      }
    } else {
      z.stuckT = Math.max(0, z.stuckT - dt);
    }

    // ── 회전 ──
    const speed = Math.hypot(z.vel.x, z.vel.z);
    let targetYaw = z.yaw;
    if (z.state === STATE.ATTACK || z.state === STATE.WINDUP_RANGED || dist < 4) {
      targetYaw = Math.atan2(dx, dz);
    } else if (speed > 0.2) {
      targetYaw = Math.atan2(z.vel.x, z.vel.z);
    }
    let diff = targetYaw - z.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    z.yaw += diff * Math.min(1, dt * (z.state === STATE.LUNGE ? 4 : 9));

    // ── 애니메이션 위상 ──
    z.phase += dt * (2.4 + speed * 2.1);
    z.animSpeed = damp(z.animSpeed, clamp01(speed / Math.max(0.5, z.speed)), 8, dt);

    // ── 자폭체 점화 ──
    if (t.explode && z.state === STATE.ATTACK) {
      z.fuse = clamp01(z.stateT / t.attackWind);
    }

    // ── 신음 ──
    z.lastSound -= dt;
    if (z.lastSound <= 0 && dist < 26) {
      z.lastSound = rng.range(3.5, 8);
      this.game.audio?.zombieGrowl(z.pos.x, z.pos.y + 1.4, z.pos.z, t.key);
    }

    void index;
  }

  _setState(z, s) {
    z.state = s;
    z.stateT = 0;
  }

  _resolveAttack(z, playerPos, dist) {
    const t = z.def;
    if (t.explode) {
      this.explode(z.pos.x, z.pos.y + 0.9, z.pos.z, t.explode.radius, z.damage, z);
      this._kill(z, false, true);
      return;
    }
    if (dist <= t.attackRange + t.radius + 0.35) {
      this.game.player.damage(z.damage, z.pos, 'melee');
      this.onPlayerHit?.(z, z.damage);
      // 밀치기
      const inv = 1 / Math.max(0.01, dist);
      this.game.player.applyImpulse(
        (playerPos.x - z.pos.x) * inv * (t.id === TYPE.BRUTE ? 5.5 : 1.6),
        t.id === TYPE.BRUTE ? 2.4 : 0,
        (playerPos.z - z.pos.z) * inv * (t.id === TYPE.BRUTE ? 5.5 : 1.6),
      );
    }
    this.game.audio?.zombieAttack(z.pos.x, z.pos.y + 1.2, z.pos.z);
  }

  _spit(z, playerPos) {
    const t = z.def.ranged;
    const ox = z.pos.x, oy = z.pos.y + z.def.height * 0.78, oz = z.pos.z;
    const dx = playerPos.x - ox, dy = (playerPos.y + 1.2) - oy, dz = playerPos.z - oz;
    const d = Math.hypot(dx, dz);
    const time = d / t.speed;
    // 중력 보정된 발사각
    const vy = dy / Math.max(0.05, time) + 0.5 * t.gravity * time;
    this.projectiles.push({
      x: ox, y: oy, z: oz,
      vx: (dx / Math.max(0.01, d)) * t.speed,
      vy,
      vz: (dz / Math.max(0.01, d)) * t.speed,
      life: 0, damage: z.damage, radius: t.radius, gravity: t.gravity,
    });
    this.game.audio?.zombieSpit(ox, oy, oz);
  }

  _updateProjectiles(dt, playerPos) {
    const ps = this.projectiles;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.life += dt;
      p.vy -= p.gravity * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;

      let hit = false;
      const dirX = nx - p.x, dirY = ny - p.y, dirZ = nz - p.z;
      const len = Math.hypot(dirX, dirY, dirZ);
      if (len > 1e-5) {
        const r = this.collision.raycast(p.x, p.y, p.z, dirX / len, dirY / len, dirZ / len, len, this._rayOut);
        if (r) hit = true;
      }
      // 플레이어 근접 판정
      const pdx = nx - playerPos.x, pdy = ny - (playerPos.y + 1.0), pdz = nz - playerPos.z;
      if (pdx * pdx + pdy * pdy + pdz * pdz < 0.7 * 0.7) hit = true;

      p.x = nx; p.y = ny; p.z = nz;
      this.game.fx?.particles.sparkle(p.x, p.y, p.z, [0.25, 1.6, 0.3], 1);

      if (hit || p.life > 5) {
        if (hit) this._acidBurst(p, playerPos);
        ps.splice(i, 1); i--;
      }
    }
  }

  _acidBurst(p, playerPos) {
    const fx = this.game.fx;
    fx?.particles.explosion(p.x, p.y, p.z, p.radius * 0.8);
    const d = Math.hypot(p.x - playerPos.x, p.y - (playerPos.y + 1), p.z - playerPos.z);
    if (d < p.radius) {
      const falloff = 1 - d / p.radius;
      this.game.player.damage(p.damage * falloff, { x: p.x, y: p.y, z: p.z }, 'acid');
    }
    this.game.audio?.acidHit(p.x, p.y, p.z);
  }

  // ───────────────────────── 피격 / 사망 ─────────────────────────

  /** @param {object} hit hitscan 결과 (부위 포함) */
  damage(z, amount, hit, isCrit) {
    if (z.state === STATE.DEAD) return;
    const t = z.def;
    let dmg = amount;
    if (t.armor && hit?.part !== 'head') dmg *= (1 - t.armor);
    z.health -= dmg;
    z.hitFlash = 1;

    if (hit?.part === 'leg') z.legHurt = Math.min(1, z.legHurt + dmg / (z.maxHealth * 0.55));

    const killed = z.health <= 0;
    this.game.fx.enemyHit(
      hit ?? { x: z.pos.x, y: z.pos.y + t.height * 0.6, z: z.pos.z, nx: 0, ny: 1, nz: 0 },
      dmg, isCrit, killed, t.name,
    );

    if (killed) {
      this._kill(z, isCrit && hit?.part === 'head', false);
      return;
    }

    // 넉백 / 스태거
    if (hit) {
      const kb = (dmg / z.maxHealth) * 14 * t.knockback;
      z.vel.x += -hit.nx * kb;
      z.vel.z += -hit.nz * kb;
    }
    const staggerChance = clamp01((dmg / (z.maxHealth * 0.18)) * (1 - t.staggerResist));
    if (rng.chance(staggerChance) && z.state !== STATE.LUNGE) {
      this._setState(z, STATE.STAGGER);
      z.staggerDur = 0.18 + Math.min(0.35, dmg / z.maxHealth);
    }
    this.game.audio?.zombieHurt(z.pos.x, z.pos.y + 1.3, z.pos.z);
  }

  _kill(z, decapitate, silent) {
    const t = z.def;
    z.state = STATE.DEAD;
    z.deathT = 0;
    z.health = 0;
    z.fallDir = rng.range(-0.6, 0.6);
    z.fallBack = z.vel.x * Math.sin(z.yaw) + z.vel.z * Math.cos(z.yaw) < 0 ? -1 : 1;
    if (decapitate) z.headAlive = false;
    this.killCount++;

    const cx = z.pos.x, cy = z.pos.y + t.height * 0.55, cz = z.pos.z;
    if (!silent) {
      this.game.fx.enemyDeath(cx, cy, cz, t.gore, [
        z.baseColor.r * 0.6 + 0.18, z.baseColor.g * 0.3 + 0.04, z.baseColor.b * 0.3 + 0.03,
      ]);
      if (decapitate) {
        this.game.fx.particles.gibs(z.pos.x, z.pos.y + t.height * 0.92, z.pos.z, 8, [0.3, 0.05, 0.04]);
      }
      this.game.audio?.zombieDie(cx, cy, cz, t.key);
    }
    this.onKill?.(z, decapitate);
  }

  _updateDead(z, dt) {
    z.deathT += dt;
    // 넘어짐 → 지면에 눕기 → 가라앉으며 사라짐
    z.vel.y -= 24 * dt;
    _delta.set(z.vel.x * dt, z.vel.y * dt, z.vel.z * dt);
    this.collision.moveBox(z.pos, z.def.radius, 0.5, _delta, _moveOut, 0);
    if (_moveOut.grounded) { z.vel.y = 0; z.vel.x *= 0.86; z.vel.z *= 0.86; }
  }

  /** 폭발 — 플레이어와 모든 감염체에 피해 */
  explode(x, y, z, radius, damage, source = null) {
    this.game.fx.explosion(x, y, z, radius);
    this.game.audio?.explosion(x, y, z);

    for (let i = 0; i < this.active; i++) {
      const e = this.list[i];
      if (e.state === STATE.DEAD || e === source) continue;
      const dx = e.pos.x - x, dy = (e.pos.y + e.def.height * 0.5) - y, dz = e.pos.z - z;
      const d = Math.hypot(dx, dy, dz);
      if (d > radius) continue;
      const falloff = 1 - d / radius;
      const inv = 1 / Math.max(0.01, d);
      this.damage(e, damage * falloff * 1.4, {
        x: e.pos.x, y: e.pos.y + e.def.height * 0.5, z: e.pos.z,
        nx: -dx * inv, ny: -dy * inv, nz: -dz * inv, part: 'body',
      }, false);
      if (e.state !== STATE.DEAD) {
        e.vel.x += dx * inv * falloff * 12;
        e.vel.y += falloff * 6;
        e.vel.z += dz * inv * falloff * 12;
        e.grounded = false;
      }
    }

    const p = this.game.player;
    const pdx = p.position.x - x, pdy = (p.position.y + 1) - y, pdz = p.position.z - z;
    const pd = Math.hypot(pdx, pdy, pdz);
    if (pd < radius) {
      const falloff = 1 - pd / radius;
      p.damage(damage * falloff, { x, y, z }, 'explosion');
      const inv = 1 / Math.max(0.01, pd);
      p.applyImpulse(pdx * inv * falloff * 7, falloff * 4.5, pdz * inv * falloff * 7);
    }
  }

  // ───────────────────────── 명중 판정 ─────────────────────────

  /**
   * 레이와 교차하는 적을 거리순으로 반환.
   * @returns {Array<{enemy, part, t}>}
   */
  raycast(ox, oy, oz, dx, dy, dz, maxDist) {
    const out = this._hits;
    out.length = 0;
    for (let i = 0; i < this.active; i++) {
      const z = this.list[i];
      if (z.state === STATE.DEAD) continue;
      const t = z.def;
      const h = t.height * z.scale;
      const r = t.radius * z.scale;

      // 구 근사로 빠르게 기각
      const cx = z.pos.x - ox, cy = (z.pos.y + h * 0.5) - oy, cz = z.pos.z - oz;
      const proj = cx * dx + cy * dy + cz * dz;
      if (proj < -r || proj > maxDist + h) continue;
      const perp2 = (cx * cx + cy * cy + cz * cz) - proj * proj;
      const rad = Math.max(r, h * 0.5) + 0.05;
      if (perp2 > rad * rad) continue;

      // 부위별 AABB 정밀 판정
      const segs = [
        z.headAlive ? ['head', h * 0.83, h * 1.0, r * 0.66] : null,
        ['body', h * 0.46, h * 0.86, r * 1.02],
        ['leg', 0, h * 0.48, r * 0.86],
      ];
      let bestT = Infinity, bestPart = null;
      for (const s of segs) {
        if (!s) continue;
        const tt = rayBox(ox, oy, oz, dx, dy, dz,
          z.pos.x - s[3], z.pos.y + s[1], z.pos.z - s[3],
          z.pos.x + s[3], z.pos.y + s[2], z.pos.z + s[3], maxDist);
        if (tt !== null && tt < bestT) { bestT = tt; bestPart = s[0]; }
      }
      if (bestPart) out.push({ enemy: z, part: bestPart, t: bestT });
    }
    out.sort(byT);
    return out;
  }

  /** 조준 보정용 — 조준선에 가장 가까운 적의 방향을 찾는다 */
  findAimTarget(ox, oy, oz, dx, dy, dz, maxDist, maxAngle) {
    let best = null, bestScore = Math.cos(maxAngle);
    for (let i = 0; i < this.active; i++) {
      const z = this.list[i];
      if (z.state === STATE.DEAD) continue;
      const h = z.def.height * z.scale;
      const cx = z.pos.x - ox, cy = (z.pos.y + h * 0.62) - oy, cz = z.pos.z - oz;
      const d = Math.hypot(cx, cy, cz);
      if (d > maxDist || d < 0.5) continue;
      const dot = (cx * dx + cy * dy + cz * dz) / d;
      if (dot > bestScore) { bestScore = dot; best = z; }
    }
    return best;
  }

  /** 화면 밖 적의 방위각 목록 (나침반용) */
  compassAngles(playerPos, yaw, camForward, maxCount = 6) {
    const out = [];
    for (let i = 0; i < this.active && out.length < maxCount; i++) {
      const z = this.list[i];
      if (z.state === STATE.DEAD) continue;
      const dx = z.pos.x - playerPos.x, dz = z.pos.z - playerPos.z;
      const d = Math.hypot(dx, dz);
      if (d > 22) continue;
      const ang = Math.atan2(dx, -dz) - yaw;
      const norm = Math.atan2(Math.sin(ang), Math.cos(ang));
      if (Math.abs(norm) < 0.55) continue;   // 화면 안에 있으면 표시하지 않음
      out.push(norm);
    }
    void camForward;
    return out;
  }

  // ───────────────────────── 렌더 ─────────────────────────

  preRender(alpha, time) {
    let n = 0, eyeN = 0;
    for (let i = 0; i < this.active; i++) {
      const z = this.list[i];
      const t = z.def;
      const sc = z.scale * (t.height / BASE_H);
      const [tw, th, td, hs, ls] = t.scale;

      let fall = 0, sink = 0, fade = 1;
      if (z.state === STATE.DEAD) {
        fall = clamp01(z.deathT / 0.55) * (Math.PI / 2) * z.fallBack;
        if (z.deathT > 2.0) {
          const k = clamp01((z.deathT - 2.0) / 1.4);
          sink = k * 1.1;
          fade = 1 - k;
        }
        if (fade <= 0.02) continue;
      }

      const bob = z.state === STATE.DEAD ? 0
        : Math.sin(z.phase * 2) * 0.035 * z.animSpeed;
      const lean = z.state === STATE.ATTACK
        ? 0.35 * Math.sin(clamp01(z.stateT / t.attackWind) * Math.PI)
        : 0.14 + z.animSpeed * 0.1;

      const rootY = z.pos.y - sink;
      _qy.setFromAxisAngle(_axisY, z.yaw);
      // 사망 시에는 발밑을 축으로 몸 전체가 넘어간다: world = Ry(yaw) * Rx(fall)
      const useFall = z.state === STATE.DEAD;
      let rootQ = _qy;
      if (useFall) {
        _qx.setFromAxisAngle(_axisX, fall);
        rootQ = _qBody.copy(_qy).multiply(_qx);
      }

      // 색상: 피격 시 흰색으로 번쩍
      _c.copy(z.baseColor).lerp(WHITE, z.hitFlash * 0.85);
      if (z.state === STATE.DEAD) _c.multiplyScalar(0.55 + 0.45 * fade);
      // 자폭체 점화 시 붉게 달아오름
      if (t.explode && z.state === STATE.ATTACK) {
        _c.lerp(EMBER, clamp01(z.fuse ?? 0) * (0.5 + 0.5 * Math.sin(time * 30)));
      }

      // ── 다리 ──
      const swing = Math.sin(z.phase) * (0.55 * z.animSpeed + 0.05);
      for (let side = 0; side < 2; side++) {
        const sgn = side === 0 ? -1 : 1;
        const ang = side === 0 ? swing : -swing;
        this._limb(
          side === 0 ? this.mLegL : this.mLegR, n,
          z, rootY, rootQ,
          RIG.leg.offX * sgn * tw * sc, RIG.leg.pivotY * sc, 0,
          RIG.leg.size[0] * ls * sc, RIG.leg.size[1] * sc, RIG.leg.size[2] * ls * sc,
          ang, 0,
        );
      }

      // ── 몸통 ──
      _p.set(0, (RIG.torso.centerY + bob) * sc, 0);
      applyRoot(_p, z.pos, rootY, rootQ);
      _q.setFromAxisAngle(_axisX, lean * 0.5);
      _q.premultiply(rootQ);
      _s.set(RIG.torso.size[0] * tw * sc, RIG.torso.size[1] * th * sc, RIG.torso.size[2] * td * sc);
      _m.compose(_p, _q, _s);
      this.mTorso.setMatrixAt(n, _m);
      this.mTorso.setColorAt(n, _c);

      // ── 머리 ──
      if (z.headAlive) {
        _p.set(0, (RIG.head.centerY + bob * 1.4) * sc, lean * 0.16 * sc);
        applyRoot(_p, z.pos, rootY, rootQ);
        _q.setFromAxisAngle(_axisX, lean * 0.8);
        _q.premultiply(rootQ);
        const hsz = RIG.head.size[0] * hs * sc;
        _s.set(hsz, RIG.head.size[1] * hs * sc, RIG.head.size[2] * hs * sc);
        _m.compose(_p, _q, _s);
        this.mHead.setMatrixAt(n, _m);
        this.mHead.setColorAt(n, _c);

        // ── 눈 ──
        if (fade > 0.4) {
          for (let e = 0; e < 2; e++) {
            const sgn = e === 0 ? -1 : 1;
            _p.set(RIG.eye.offX * sgn * hs * sc,
              (RIG.eye.y + bob * 1.4) * sc,
              (RIG.eye.z * hs + lean * 0.16) * sc);
            applyRoot(_p, z.pos, rootY, rootQ);
            _q.setFromAxisAngle(_axisX, lean * 0.8);
            _q.premultiply(rootQ);
            _s.set(RIG.eye.size[0] * hs * sc, RIG.eye.size[1] * hs * sc, RIG.eye.size[2] * sc);
            _m.compose(_p, _q, _s);
            this.mEyes.setMatrixAt(eyeN, _m);
            this.mEyes.setColorAt(eyeN, z.eyeColor);
            eyeN++;
          }
        }
      } else {
        // 머리가 없으면 화면 밖으로 치운다
        _m.makeScale(0, 0, 0);
        this.mHead.setMatrixAt(n, _m);
        this.mHead.setColorAt(n, _c);
      }

      // ── 팔 ──
      const attackReach = z.state === STATE.ATTACK
        ? Math.sin(clamp01(z.stateT / (t.attackWind + 0.2)) * Math.PI) * 1.15 : 0;
      const armBase = -1.15 - attackReach * 0.5;
      for (let side = 0; side < 2; side++) {
        const sgn = side === 0 ? -1 : 1;
        const ang = armBase + Math.sin(z.phase + (side ? Math.PI : 0)) * 0.28 * z.animSpeed;
        this._limb(
          side === 0 ? this.mArmL : this.mArmR, n,
          z, rootY, rootQ,
          RIG.arm.offX * sgn * tw * sc, (RIG.arm.pivotY + bob) * sc, 0,
          RIG.arm.size[0] * ls * sc, RIG.arm.size[1] * ls * sc, RIG.arm.size[2] * ls * sc,
          ang, sgn * 0.12,
        );
      }

      n++;
    }

    for (const m of this.parts) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    this.mEyes.count = eyeN;
    if (eyeN > 0) {
      this.mEyes.instanceMatrix.needsUpdate = true;
      if (this.mEyes.instanceColor) this.mEyes.instanceColor.needsUpdate = true;
    }

    // 투사체
    const pn = Math.min(this.projectiles.length, 32);
    for (let i = 0; i < pn; i++) {
      const p = this.projectiles[i];
      _m.makeTranslation(p.x, p.y, p.z);
      this.mProj.setMatrixAt(i, _m);
    }
    this.mProj.count = pn;
    if (pn > 0) this.mProj.instanceMatrix.needsUpdate = true;

    void alpha;
  }

  /** 관절에서 회전하는 사지 하나를 기록 */
  _limb(mesh, n, z, rootY, rootQ, px, pivotY, pz, sx, sy, sz, angX, angZ) {
    _qLimb.setFromAxisAngle(_axisX, angX);
    if (angZ) { _qTmp.setFromAxisAngle(_axisZ, angZ); _qLimb.multiply(_qTmp); }
    // 피벗(관절)에서 아래로 길이의 절반만큼 내려간 지점이 중심
    _p.set(0, -sy * 0.5, 0).applyQuaternion(_qLimb);
    _p.x += px; _p.y += pivotY; _p.z += pz;
    applyRoot(_p, z.pos, rootY, rootQ);
    _q.copy(_qLimb).premultiply(rootQ);
    _s.set(sx, sy, sz);
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(n, _m);
    mesh.setColorAt(n, _c);
  }
}

// ───────────────────────── 헬퍼 ─────────────────────────

const _sep = { x: 0, z: 0 };
const _delta = new Vector3();
const _moveOut = {};
const _qBody = new Quaternion();
const _qLimb = new Quaternion();
const _qTmp = new Quaternion();
const WHITE = new Color(1.6, 1.5, 1.4);
const EMBER = new Color(3.2, 0.5, 0.12);

/** 로컬 좌표 → 월드. rootQ에는 요(yaw)와 (사망 시) 넘어짐이 이미 합성돼 있다. */
function applyRoot(local, pos, rootY, rootQ) {
  local.applyQuaternion(rootQ);
  local.x += pos.x;
  local.y += rootY;
  local.z += pos.z;
}

function approach(cur, target, maxDelta) {
  const d = target - cur;
  if (d > maxDelta) return cur + maxDelta;
  if (d < -maxDelta) return cur - maxDelta;
  return target;
}

function byT(a, b) { return a.t - b.t; }

/** 레이 vs AABB. 히트하면 t, 아니면 null */
function rayBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1, maxDist) {
  const ix = 1 / (dx || 1e-9), iy = 1 / (dy || 1e-9), iz = 1 / (dz || 1e-9);
  let t1 = (x0 - ox) * ix, t2 = (x1 - ox) * ix;
  let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
  t1 = (y0 - oy) * iy; t2 = (y1 - oy) * iy;
  tmin = Math.max(tmin, Math.min(t1, t2));
  tmax = Math.min(tmax, Math.max(t1, t2));
  t1 = (z0 - oz) * iz; t2 = (z1 - oz) * iz;
  tmin = Math.max(tmin, Math.min(t1, t2));
  tmax = Math.min(tmax, Math.max(t1, t2));
  if (tmax < 0 || tmin > tmax || tmin > maxDist) return null;
  return tmin < 0 ? 0 : tmin;
}

function makeZombie() {
  return {
    type: 0, def: TYPES[0],
    pos: new Vector3(), vel: new Vector3(),
    yaw: 0, health: 100, maxHealth: 100, speed: 2, damage: 10,
    state: STATE.CHASE, stateT: 0, staggerDur: 0.2,
    phase: 0, animSpeed: 0, attackCd: 0, attackDone: false,
    headAlive: true, legHurt: 0, hitFlash: 0,
    deathT: 0, fallDir: 0, fallBack: 1, grounded: true,
    lungeCd: 0, spawnT: 0, lastSound: 0, stuckT: 0,
    scale: 1, distToPlayer: 99, fuse: 0,
    baseColor: new Color(), accentColor: new Color(), eyeColor: new Color(),
  };
}

export { STATE as ZOMBIE_STATE };
