// AI 동료(협동). 플레이어를 따라다니며 가까운 감염체를 자동 사격한다.
// game.systems에 등록. settings.allyCount(0~2)만큼 생성된다.

import {
  Group, Mesh, BoxGeometry, CylinderGeometry, MeshStandardMaterial, Color, Vector3,
} from 'three';
import { settings } from '../core/Settings.js';
import { clamp, clamp01, damp, rng } from '../core/Util.js';

const NAMES = ['델타', '브라보', '에코', '폭스'];
const WALK = 4.6;
const RADIUS = 0.34;
const HEIGHT = 1.8;

function mat(color, rough = 0.7, metal = 0.1, emissive = 0) {
  return new MeshStandardMaterial({
    color: new Color(color), roughness: rough, metalness: metal,
    emissive: new Color(emissive), emissiveIntensity: emissive ? 1 : 0, envMapIntensity: 0.9,
  });
}

function part(parent, geo, m, x, y, z) {
  const mesh = new Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// 아군 병사 — 청색 전술 복장, 발광 바이저로 감염체와 구분
function buildSoldier() {
  const g = new Group();
  const suit = mat('#2f4a6b', 0.7, 0.15);
  const armor = mat('#3d5f86', 0.55, 0.25);
  const skin = mat('#c98d63', 0.8, 0.02);
  const dark = mat('#1c1f24', 0.7, 0.2);

  const hips = new Group(); hips.position.y = 0.92; g.add(hips);
  // 다리
  const legGeo = new BoxGeometry(0.17, 0.82, 0.2);
  const legL = part(hips, legGeo, suit, -0.12, -0.5, 0);
  const legR = part(hips, legGeo, suit, 0.12, -0.5, 0);
  // 몸통 + 방탄
  part(hips, new BoxGeometry(0.44, 0.6, 0.26), suit, 0, 0.02, 0);
  part(hips, new BoxGeometry(0.48, 0.44, 0.3), armor, 0, 0.06, 0);
  // 어깨/팔
  const armGeo = new BoxGeometry(0.13, 0.5, 0.15);
  const armL = part(hips, armGeo, suit, -0.3, -0.05, 0.02);
  const armR = part(hips, armGeo, suit, 0.3, -0.05, 0.02);
  // 머리 + 헬멧 + 바이저(발광)
  part(hips, new BoxGeometry(0.22, 0.24, 0.23), skin, 0, 0.46, 0);
  part(hips, new BoxGeometry(0.26, 0.16, 0.27), dark, 0, 0.54, 0);
  const visor = part(hips, new BoxGeometry(0.2, 0.06, 0.02), mat('#0a1a22', 0.3, 0.4, 0x39b6ff), 0, 0.45, 0.13);
  // 소총 (오른팔 앞)
  const gun = new Group(); gun.position.set(0.3, 0.15, 0.18); hips.add(gun);
  part(gun, new BoxGeometry(0.06, 0.09, 0.5), dark, 0, 0, -0.1);
  part(gun, new CylinderGeometry(0.02, 0.02, 0.3, 6).rotateX(Math.PI / 2), dark, 0, 0.02, -0.4);

  g.userData = { hips, legL, legR, armL, armR, gun, visor, muzzle: new Vector3(0.3, 1.07, -0.4) };
  return g;
}

class Ally {
  constructor(game, idx) {
    this.game = game;
    this.idx = idx;
    this.name = NAMES[idx % NAMES.length];
    this.mesh = buildSoldier();
    this.pos = new Vector3();
    this.vel = new Vector3();
    this.yaw = 0;
    this.health = 120;
    this.maxHealth = 120;
    this.downed = false;
    this.reviveT = 0;
    this.fireCd = rng.range(0, 0.6);
    this.reloadT = 0;
    this.ammo = 30;
    this.walkPhase = rng.range(0, 6.28);
    this.moveAmt = 0;
    this._delta = new Vector3();
    this._out = {};
    this._muzzle = new Vector3();
    game.engine.scene.add(this.mesh);
  }

  spawnAt(x, z) {
    const y = this.game.collision.groundHeight(x, z, 4);
    this.pos.set(x, isFinite(y) ? y : 0, z);
    this.vel.set(0, 0, 0);
    this.health = this.maxHealth;
    this.downed = false;
    this.ammo = 30;
  }

  /** 플레이어 기준 편대 위치 (좌우로 벌려 선다) */
  _formation(out) {
    const p = this.game.player.position;
    const yaw = this.game.rig.yaw;
    const side = this.idx === 0 ? -1 : 1;
    const lx = 2.3 * side, lz = 1.8;   // 살짝 뒤 측면
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    out.set(
      p.x + (lx * cos - lz * sin),
      p.y,
      p.z + (-lx * sin - lz * cos),
    );
    return out;
  }

  update(dt) {
    const g = this.game;
    if (this.downed) {
      this.reviveT -= dt;
      if (this.reviveT <= 0) { this.health = this.maxHealth; this.downed = false; }
      return;
    }

    // ── 타겟팅 ──
    const target = g.enemies.nearestEnemy(this.pos.x, this.pos.z, 34);
    this._target = target;
    let toEnemy = null, enemyDist = Infinity;
    if (target) {
      toEnemy = _t.set(target.pos.x - this.pos.x, 0, target.pos.z - this.pos.z);
      enemyDist = toEnemy.length();
    }

    // ── 이동 목표: 적이 멀면 편대 유지, 적이 있으면 사거리 확보 후 정지 ──
    const form = this._formation(_form);
    let goalX = form.x, goalZ = form.z;
    const engaging = target && enemyDist < 30;
    if (engaging && enemyDist < 8) {
      // 너무 가까우면 약간 뒤로 (카이팅)
      goalX = this.pos.x - (toEnemy.x / enemyDist) * 2;
      goalZ = this.pos.z - (toEnemy.z / enemyDist) * 2;
    }
    const dx = goalX - this.pos.x, dz = goalZ - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const stopDist = engaging ? 0.6 : 1.1;
    let mvx = 0, mvz = 0;
    if (dist > stopDist) {
      const spd = WALK * (dist > 6 ? 1.35 : 1);   // 뒤처지면 가속
      mvx = (dx / dist) * spd;
      mvz = (dz / dist) * spd;
    }
    this.vel.x = damp(this.vel.x, mvx, 12, dt);
    this.vel.z = damp(this.vel.z, mvz, 12, dt);

    // 중력 + 충돌
    this.vel.y = (this.vel.y || 0) - 25 * dt;
    this._delta.set(this.vel.x * dt, this.vel.y * dt, this.vel.z * dt);
    const hit = g.collision.moveBox(this.pos, RADIUS, HEIGHT, this._delta, this._out, 0.5);
    if (hit.grounded) this.vel.y = 0;
    if (hit.wall) { if (hit.wallNormalX) this.vel.x = 0; if (hit.wallNormalZ) this.vel.z = 0; }

    // 바라보는 방향: 교전 중엔 적, 아니면 이동 방향
    const faceX = engaging ? toEnemy.x : this.vel.x;
    const faceZ = engaging ? toEnemy.z : this.vel.z;
    if (Math.abs(faceX) + Math.abs(faceZ) > 0.05) {
      const targetYaw = Math.atan2(faceX, faceZ);
      this.yaw = dampAngle(this.yaw, targetYaw, 10, dt);
    }
    this.moveAmt = damp(this.moveAmt, Math.hypot(this.vel.x, this.vel.z) / WALK, 8, dt);

    // ── 사격 ──
    this.fireCd -= dt;
    if (engaging && enemyDist < 32 && this.fireCd <= 0 && this.ammo > 0 && !this.downed) {
      this._shoot(target, enemyDist);
    }
    if (this.ammo <= 0) {
      this.reloadT += dt;
      if (this.reloadT > 2.2) { this.ammo = 30; this.reloadT = 0; }
    }

    // ── 근접 감염체에게 피해 (동료도 위험) ──
    if (target && enemyDist < 1.9) {
      this.health -= target.def.damage * 0.5 * dt;
      if (this.health <= 0) this._down();
    } else if (this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + 5 * dt);
    }
  }

  _shoot(target, dist) {
    const g = this.game;
    this.fireCd = rng.range(0.34, 0.5);
    this.ammo--;
    // 총구 월드 위치
    const mz = this.mesh.userData.muzzle;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const mx = this.pos.x + (mz.x * cos - mz.z * sin);
    const my = this.pos.y + mz.y;
    const mzz = this.pos.z + (-mz.x * sin - mz.z * cos);
    // 목표(적 상체)로의 방향 + 약간의 산포
    const tx = target.pos.x + rng.range(-0.4, 0.4);
    const ty = target.pos.y + target.def.height * 0.6;
    const tz = target.pos.z + rng.range(-0.4, 0.4);
    let ddx = tx - mx, ddy = ty - my, ddz = tz - mzz;
    const len = Math.hypot(ddx, ddy, ddz) || 1;
    ddx /= len; ddy /= len; ddz /= len;
    // 명중 (히트스캔 근사 — 조준이 좋은 편)
    const hitChance = clamp01(0.92 - dist * 0.012);
    if (rng.chance(hitChance)) {
      const crit = rng.chance(0.16);
      const dmg = (crit ? 34 : 16) * (1 + this.idx * 0.0);
      g.enemies.damage(target, dmg, {
        x: target.pos.x, y: ty, z: target.pos.z, nx: -ddx, ny: -ddy, nz: -ddz,
      }, crit);
    }
    g.fx?.tracers?.fire(mx, my, mzz, ddx, ddy, ddz, Math.min(len, 34), {
      width: 0.02, tint: [1.2, 2.0, 3.0], speed: 300, trail: 6,
    });
    g.audio?.allyShot?.(mx, my, mzz);
    // 총구 반짝임
    this.mesh.userData.gun.userData = this.mesh.userData.gun.userData || {};
    this._flash = 0.05;
  }

  _down() {
    this.downed = true;
    this.health = 0;
    this.reviveT = 12;
    this.game.hud?.banner_(`${this.name} 무력화 — 재정비 중`);
  }

  preRender(raw, dt) {
    const u = this.mesh.userData;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;
    if (this.downed) {
      // 쓰러짐
      this.mesh.rotation.z = damp(this.mesh.rotation.z, 1.4, 8, dt);
      u.hips.position.y = damp(u.hips.position.y, 0.35, 8, dt);
      return;
    }
    this.mesh.rotation.z = damp(this.mesh.rotation.z, 0, 8, dt);
    u.hips.position.y = damp(u.hips.position.y, 0.92, 8, dt);
    // 걷기 스윙
    this.walkPhase += dt * (5 + this.moveAmt * 6);
    const sw = Math.sin(this.walkPhase) * 0.5 * this.moveAmt;
    u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
    u.armL.rotation.x = -sw * 0.5; u.armR.rotation.x = sw * 0.5;
    // 바이저 발광 점멸
    if (this._flash > 0) this._flash -= dt;
  }
}

function dampAngle(cur, target, lambda, dt) {
  let d = target - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + d * (1 - Math.exp(-lambda * dt));
}

const _t = new Vector3();
const _form = new Vector3();

export class Allies {
  constructor(game) {
    this.game = game;
    this.list = [];
    this._raw = 0;
  }

  onRunStart() {
    const count = clamp(settings.allyCount | 0, 0, 2);
    // 필요한 만큼 생성/재사용
    while (this.list.length < count) this.list.push(new Ally(this.game, this.list.length));
    for (let i = 0; i < this.list.length; i++) {
      const a = this.list[i];
      a.mesh.visible = i < count;
      if (i < count) {
        const p = this.game.arena.playerStart;
        a.spawnAt(p.x + (i === 0 ? -2 : 2), p.z + 1.5);
      }
    }
    this.active = count;
  }

  onRunEnd() {
    for (const a of this.list) a.mesh.visible = false;
  }

  update(dt, intent, playing) {
    if (!playing) return;
    for (let i = 0; i < this.active; i++) this.list[i].update(dt);
    this.game.hud?.setAllies?.(this.list.slice(0, this.active));
  }

  preRender(d, raw) {
    for (let i = 0; i < this.active; i++) this.list[i].preRender(raw, d);
  }
}
