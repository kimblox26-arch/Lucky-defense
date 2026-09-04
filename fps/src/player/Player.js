// 1인칭 캐릭터 컨트롤러.
// 가속/마찰 기반 이동 + 코요테 타임 + 점프 버퍼 + 앉기 + 지면 높이 스무딩.

import { Vector3 } from 'three';
import { clamp, damp } from '../core/Util.js';

const STAND_H = 1.8;
const CROUCH_H = 1.12;
const STAND_EYE = 1.63;
const CROUCH_EYE = 0.98;
const RADIUS = 0.36;

export const PLAYER_TUNING = {
  walkSpeed: 5.3,
  sprintSpeed: 8.0,
  crouchSpeed: 2.7,
  adsSpeed: 3.2,
  groundAccel: 68,
  airAccel: 14,
  friction: 11,
  gravity: 25,
  jumpVel: 7.5,
  coyote: 0.12,
  jumpBuffer: 0.13,
  stepHeight: 0.46,
  maxHealth: 100,
  regenDelay: 5.0,
  regenRate: 9.0,
  armorMax: 0,
};

export class Player {
  constructor(collision, rig) {
    this.collision = collision;
    this.rig = rig;

    this.position = new Vector3(0, 0, 16);
    this.velocity = new Vector3();
    this.height = STAND_H;
    this.eyeY = STAND_EYE;
    this._eyeTarget = STAND_EYE;
    this.radius = RADIUS;

    this.grounded = false;
    this.wasGrounded = false;
    this.crouching = false;
    this.sprinting = false;
    this.strafeInput = 0;
    this.moveSpeed = 0;

    this.health = PLAYER_TUNING.maxHealth;
    this.maxHealth = PLAYER_TUNING.maxHealth;
    this.armor = 0;
    this.armorMax = 0;
    this.alive = true;
    this.lastDamageAt = -999;
    this.invuln = 0;

    this.tuning = { ...PLAYER_TUNING };
    this.speedMul = 1;

    this._coyote = 0;
    this._jumpBuf = 0;
    this._delta = new Vector3();
    this._wish = new Vector3();
    this._hit = {};
    this._fallSpeed = 0;
    this._groundY = 0;
    this._groundSmooth = 0;

    this.onLand = null;
    this.onDamage = null;
    this.onDeath = null;
    this.onFootstep = null;
    this._stepDist = 0;
  }

  reset(x, y, z, yaw = 0) {
    // 강화로 바뀐 수치를 전부 초기값으로 되돌린다
    this.tuning = { ...PLAYER_TUNING };
    this.maxHealth = PLAYER_TUNING.maxHealth;
    this.armorMax = PLAYER_TUNING.armorMax;
    this.speedMul = 1;
    this._sinceDamage = 99;
    this._stepDist = 0;
    this._ads = false;

    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.armor = this.armorMax;
    this.alive = true;
    this.crouching = false;
    this.height = STAND_H;
    this.eyeY = this._eyeTarget = STAND_EYE;
    this.grounded = true;
    this._groundSmooth = y;
    this.invuln = 0.6;
    this.rig?.reset(yaw, 0);
  }

  /** ADS 상태는 무기 시스템이 매 스텝 설정한다 (이동속도에 영향) */
  setAds(v) { this._ads = v; }

  update(dt, intent, canMove = true) {
    const T = this.tuning;
    this.wasGrounded = this.grounded;

    if (!canMove || !this.alive) {
      intent = { moveX: 0, moveY: 0, jumpPressed: false, sprint: false, crouch: false };
    }

    // ── 앉기 ──
    const wantCrouch = !!intent.crouch;
    if (wantCrouch !== this.crouching) {
      if (wantCrouch) {
        this.crouching = true;
      } else if (this._canStand()) {
        this.crouching = false;
      }
    }
    const targetH = this.crouching ? CROUCH_H : STAND_H;
    this.height = damp(this.height, targetH, 16, dt);
    this._eyeTarget = this.crouching ? CROUCH_EYE : STAND_EYE;

    // ── 원하는 이동 방향 (요 기준) ──
    const yaw = this.rig.yaw;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const wish = this._wish.set(
      intent.moveX * cos - intent.moveY * sin,
      0,
      -intent.moveX * sin - intent.moveY * cos,
    );
    const wishLen = wish.length();
    if (wishLen > 1e-4) wish.multiplyScalar(1 / wishLen);
    this.strafeInput = intent.moveX;

    // ── 목표 속도 ──
    const movingForward = intent.moveY > 0.35;
    this.sprinting = !!intent.sprint && movingForward && !this.crouching && this.grounded && !this._ads;
    let maxSpeed = T.walkSpeed;
    if (this.crouching) maxSpeed = T.crouchSpeed;
    else if (this.sprinting) maxSpeed = T.sprintSpeed;
    else if (this._ads) maxSpeed = T.adsSpeed;
    maxSpeed *= this.speedMul;
    const target = wishLen > 1e-4 ? maxSpeed * Math.min(1, wishLen) : 0;

    // ── 수평 가속 / 마찰 ──
    const v = this.velocity;
    if (this.grounded) {
      if (target > 0) {
        const accel = T.groundAccel * dt;
        v.x = approach(v.x, wish.x * target, accel);
        v.z = approach(v.z, wish.z * target, accel);
      }
      // 마찰은 항상 적용 (입력이 있으면 약하게)
      const fr = target > 0 ? T.friction * 0.32 : T.friction;
      const sp = Math.hypot(v.x, v.z);
      if (sp > 0) {
        const drop = Math.max(0, sp - Math.max(sp * fr * dt, target > 0 ? 0 : 0.6 * fr * dt));
        const scale = sp > 1e-5 ? drop / sp : 0;
        v.x *= scale; v.z *= scale;
      }
    } else if (target > 0) {
      // 공중 제어 — 방향 전환은 되지만 가속은 제한
      const accel = T.airAccel * dt;
      const cur = v.x * wish.x + v.z * wish.z;
      const add = clamp(target - cur, 0, accel);
      v.x += wish.x * add;
      v.z += wish.z * add;
    }

    // ── 점프 ──
    if (intent.jumpPressed) this._jumpBuf = T.jumpBuffer;
    this._jumpBuf -= dt;
    this._coyote = this.grounded ? T.coyote : this._coyote - dt;
    if (this._jumpBuf > 0 && this._coyote > 0 && !this.crouching) {
      v.y = T.jumpVel;
      this._jumpBuf = 0;
      this._coyote = 0;
      this.grounded = false;
    }

    // ── 중력 ──
    v.y -= T.gravity * dt;
    if (v.y < -60) v.y = -60;
    this._fallSpeed = v.y;

    // ── 이동 & 충돌 ──
    const d = this._delta.set(v.x * dt, v.y * dt, v.z * dt);
    const hit = this.collision.moveBox(this.position, RADIUS, this.height, d, this._hit, T.stepHeight);

    if (hit.grounded) {
      if (!this.wasGrounded && this._fallSpeed < -4.5) {
        const impact = clamp((-this._fallSpeed - 4.5) / 14, 0, 1);
        this.onLand?.(impact, hit.surface);
        this.rig.land(impact * 0.34);
      }
      v.y = 0;
      this.grounded = true;
      this._groundY = hit.groundY ?? this.position.y;
    } else {
      this.grounded = false;
      if (hit.ceiling) v.y = Math.min(v.y, 0);
    }
    if (hit.wall) {
      if (hit.wallNormalX !== 0) v.x = 0;
      if (hit.wallNormalZ !== 0) v.z = 0;
    }

    // ── 눈높이: 계단형 충돌의 지글거림을 흡수 ──
    if (this.grounded) {
      this._groundSmooth = damp(this._groundSmooth, this.position.y, 22, dt);
      if (Math.abs(this._groundSmooth - this.position.y) > 0.7) this._groundSmooth = this.position.y;
    } else {
      this._groundSmooth = this.position.y;
    }
    const smoothOffset = this._groundSmooth - this.position.y;
    this.eyeY = damp(this.eyeY, this._eyeTarget, 15, dt) + smoothOffset;

    // ── 발소리 ──
    this.moveSpeed = Math.hypot(v.x, v.z);
    if (this.grounded && this.moveSpeed > 0.8) {
      this._stepDist += this.moveSpeed * dt;
      const stride = this.crouching ? 2.4 : this.sprinting ? 2.35 : 1.95;
      if (this._stepDist >= stride) {
        this._stepDist = 0;
        this.onFootstep?.(hit.surface, this.moveSpeed / this.tuning.sprintSpeed);
      }
    } else if (!this.grounded) {
      this._stepDist = 1.4;
    }

    // ── 체력 재생 ──
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.alive && this.health < this.maxHealth) {
      const since = this._sinceDamage = (this._sinceDamage ?? 99) + dt;
      if (since > T.regenDelay) {
        this.health = Math.min(this.maxHealth, this.health + T.regenRate * dt);
      }
    }
  }

  _canStand() {
    const p = this.position;
    const probe = _probePos.copy(p);
    // 위로 STAND_H만큼 공간이 있는지: 미세 이동으로 천장 겹침만 검사
    this.collision.moveBox(probe, RADIUS, STAND_H, _probeDelta, _probeOut, 0);
    return Math.abs(probe.y - p.y) < 0.05;
  }

  damage(amount, fromPos = null, type = 'hit') {
    if (!this.alive || this.invuln > 0) return 0;
    let dmg = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, dmg * 0.6);
      this.armor -= absorbed;
      dmg -= absorbed;
    }
    this.health -= dmg;
    this._sinceDamage = 0;

    let angle = 0;
    if (fromPos) {
      const dx = fromPos.x - this.position.x;
      const dz = fromPos.z - this.position.z;
      // 플레이어 기준 방위각 (0 = 정면)
      angle = Math.atan2(dx, -dz) - this.rig.yaw;
    }
    this.onDamage?.(dmg, angle, type);
    this.rig.addDamageKick(angle + Math.PI, Math.min(3.2, dmg * 0.09));
    this.rig.addTrauma(clamp(dmg / 45, 0.06, 0.55));

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.onDeath?.();
    }
    return dmg;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addArmor(amount) {
    this.armor = Math.min(this.armorMax, this.armor + amount);
  }

  /** 폭발 등에 의한 밀림 */
  applyImpulse(x, y, z) {
    this.velocity.x += x;
    this.velocity.y += y;
    this.velocity.z += z;
    if (y > 0.5) this.grounded = false;
  }

  get eyePosition() {
    return { x: this.position.x, y: this.position.y + this.eyeY, z: this.position.z };
  }
}

function approach(cur, target, maxDelta) {
  const d = target - cur;
  if (d > maxDelta) return cur + maxDelta;
  if (d < -maxDelta) return cur - maxDelta;
  return target;
}

const _probePos = new Vector3();
const _probeDelta = new Vector3(0, 0.001, 0);
const _probeOut = {};
