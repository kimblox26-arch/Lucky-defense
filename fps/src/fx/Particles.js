// 파티클 시스템. 구조체 배열(SoA) + 인스턴스 쿼드 배치.
// 가산(스파크·화염)과 알파(연기·피·먼지) 두 레이어, 그리고 3D 파편 레이어.

import {
  InstancedMesh, BoxGeometry, MeshStandardMaterial, Object3D, Color,
  Quaternion, Vector3, DynamicDrawUsage,
} from 'three';
import { QuadBatch } from './QuadBatch.js';
import { softDot, smokePuff, streak } from '../core/Textures.js';
import { rng, clamp01 } from '../core/Util.js';

const GRAV = 22;

class Layer {
  constructor(capacity, batch) {
    this.cap = capacity;
    this.batch = batch;
    this.n = 0;                       // 활성 개수 (앞쪽에 압축 보관)
    const c = capacity;
    this.px = new Float32Array(c); this.py = new Float32Array(c); this.pz = new Float32Array(c);
    this.vx = new Float32Array(c); this.vy = new Float32Array(c); this.vz = new Float32Array(c);
    this.life = new Float32Array(c); this.maxLife = new Float32Array(c);
    this.s0 = new Float32Array(c); this.s1 = new Float32Array(c);
    this.stretch = new Float32Array(c);
    this.rot = new Float32Array(c); this.rotV = new Float32Array(c);
    this.drag = new Float32Array(c); this.grav = new Float32Array(c);
    this.c0 = new Float32Array(c * 4); this.c1 = new Float32Array(c * 4);
    this.groundY = new Float32Array(c);
    this.flags = new Uint8Array(c);   // 1 = 바닥 충돌, 2 = 충돌 시 소멸
  }

  spawn() {
    if (this.n >= this.cap) return -1;
    return this.n++;
  }

  kill(i) {
    const last = --this.n;
    if (i === last) return;
    const move = (a, stride = 1) => {
      for (let k = 0; k < stride; k++) a[i * stride + k] = a[last * stride + k];
    };
    move(this.px); move(this.py); move(this.pz);
    move(this.vx); move(this.vy); move(this.vz);
    move(this.life); move(this.maxLife);
    move(this.s0); move(this.s1); move(this.stretch);
    move(this.rot); move(this.rotV);
    move(this.drag); move(this.grav);
    move(this.groundY); move(this.flags);
    move(this.c0, 4); move(this.c1, 4);
  }
}

export class Particles {
  constructor(engine, collision) {
    this.engine = engine;
    this.collision = collision;
    const q = engine.quality.particleScale;

    const capAdd = Math.max(64, Math.round(420 * q));
    const capAlpha = Math.max(64, Math.round(360 * q));
    const capDebris = Math.max(24, Math.round(150 * q));

    this.add = new Layer(capAdd, new QuadBatch({
      capacity: capAdd, texture: softDot(), blending: 'additive', renderOrder: 12,
    }));
    this.alpha = new Layer(capAlpha, new QuadBatch({
      capacity: capAlpha, texture: smokePuff(), blending: 'normal', renderOrder: 10,
    }));
    this.streaks = new Layer(Math.max(32, Math.round(180 * q)), new QuadBatch({
      capacity: Math.max(32, Math.round(180 * q)), texture: streak(), blending: 'additive', renderOrder: 13,
    }));

    engine.scene.add(this.alpha.batch.mesh, this.add.batch.mesh, this.streaks.batch.mesh);
    for (const l of [this.add, this.alpha, this.streaks]) l.batch.syncFog(engine.scene.fog);

    // ── 3D 파편 (탄피, 기브, 콘크리트 조각) ──
    this.debrisCap = capDebris;
    const geo = new BoxGeometry(1, 1, 1);
    const mat = new MeshStandardMaterial({ roughness: 0.72, metalness: 0.25, vertexColors: false });
    this.debrisMesh = new InstancedMesh(geo, mat, capDebris);
    this.debrisMesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.debrisMesh.castShadow = false;
    this.debrisMesh.receiveShadow = false;
    this.debrisMesh.frustumCulled = false;
    this.debrisMesh.count = 0;
    engine.scene.add(this.debrisMesh);

    this.dn = 0;
    const c = capDebris;
    this.d = {
      px: new Float32Array(c), py: new Float32Array(c), pz: new Float32Array(c),
      vx: new Float32Array(c), vy: new Float32Array(c), vz: new Float32Array(c),
      qx: new Float32Array(c), qy: new Float32Array(c), qz: new Float32Array(c), qw: new Float32Array(c),
      ax: new Float32Array(c), ay: new Float32Array(c), az: new Float32Array(c),
      sx: new Float32Array(c), sy: new Float32Array(c), sz: new Float32Array(c),
      life: new Float32Array(c), maxLife: new Float32Array(c),
      groundY: new Float32Array(c), bounce: new Float32Array(c),
      col: new Float32Array(c * 3),
      settled: new Uint8Array(c),
    };

    this._dummy = new Object3D();
    this._q = new Quaternion();
    this._spin = new Quaternion();
    this._axis = new Vector3();
    this._col = new Color();
    this.onDecal = null;      // (x,y,z,nx,ny,nz,kind) — 피가 바닥에 닿을 때
  }

  get budget() { return this.engine.quality.particleScale; }

  // ───────────────────────── 저수준 스폰 ─────────────────────────

  _emit(layer, o) {
    const i = layer.spawn();
    if (i < 0) return -1;
    layer.px[i] = o.x; layer.py[i] = o.y; layer.pz[i] = o.z;
    layer.vx[i] = o.vx || 0; layer.vy[i] = o.vy || 0; layer.vz[i] = o.vz || 0;
    layer.life[i] = 0;
    layer.maxLife[i] = o.life;
    layer.s0[i] = o.size0; layer.s1[i] = o.size1 ?? o.size0;
    layer.stretch[i] = o.stretch ?? 1;
    layer.rot[i] = o.rot ?? rng.range(0, Math.PI * 2);
    layer.rotV[i] = o.rotV ?? 0;
    layer.drag[i] = o.drag ?? 0.6;
    layer.grav[i] = o.grav ?? 0;
    layer.groundY[i] = o.groundY ?? -999;
    layer.flags[i] = o.flags ?? 0;
    const c0 = o.color0, c1 = o.color1 ?? o.color0;
    layer.c0[i * 4] = c0[0]; layer.c0[i * 4 + 1] = c0[1];
    layer.c0[i * 4 + 2] = c0[2]; layer.c0[i * 4 + 3] = c0[3];
    layer.c1[i * 4] = c1[0]; layer.c1[i * 4 + 1] = c1[1];
    layer.c1[i * 4 + 2] = c1[2]; layer.c1[i * 4 + 3] = c1[3];
    return i;
  }

  _emitDebris(o) {
    if (this.dn >= this.debrisCap) return;
    const i = this.dn++;
    const d = this.d;
    d.px[i] = o.x; d.py[i] = o.y; d.pz[i] = o.z;
    d.vx[i] = o.vx; d.vy[i] = o.vy; d.vz[i] = o.vz;
    d.qx[i] = 0; d.qy[i] = 0; d.qz[i] = 0; d.qw[i] = 1;
    d.ax[i] = rng.range(-1, 1) * o.spin; d.ay[i] = rng.range(-1, 1) * o.spin; d.az[i] = rng.range(-1, 1) * o.spin;
    d.sx[i] = o.sx; d.sy[i] = o.sy; d.sz[i] = o.sz;
    d.life[i] = 0; d.maxLife[i] = o.life;
    d.groundY[i] = o.groundY;
    d.bounce[i] = o.bounce ?? 0.32;
    d.col[i * 3] = o.color[0]; d.col[i * 3 + 1] = o.color[1]; d.col[i * 3 + 2] = o.color[2];
    d.settled[i] = 0;
  }

  _ground(x, z, y) {
    const g = this.collision.groundHeight(x, z, y + 0.2);
    return g === -Infinity ? 0 : g;
  }

  // ───────────────────────── 이펙트 프리셋 ─────────────────────────

  /** 총알이 단단한 표면을 때렸을 때: 스파크 + 먼지 + 파편 */
  impact(x, y, z, nx, ny, nz, surface = 0, scale = 1) {
    const b = this.budget;
    const sparks = Math.round((surface === 1 ? 11 : 5) * scale * b);
    for (let i = 0; i < sparks; i++) {
      const sx = nx + rng.range(-0.85, 0.85);
      const sy = ny + rng.range(-0.5, 1.0);
      const sz = nz + rng.range(-0.85, 0.85);
      const sp = rng.range(3.5, 11) * scale;
      this._emit(this.streaks, {
        x, y, z, vx: sx * sp, vy: sy * sp, vz: sz * sp,
        life: rng.range(0.12, 0.34), size0: 0.035, size1: 0.008,
        stretch: 7, drag: 2.4, grav: 13,
        color0: [4.0, 2.2, 0.7, 1], color1: [2.0, 0.5, 0.05, 0],
      });
    }
    // 충격 플래시
    this._emit(this.add, {
      x: x + nx * 0.04, y: y + ny * 0.04, z: z + nz * 0.04,
      life: 0.07, size0: 0.42 * scale, size1: 0.06,
      color0: [3.2, 2.2, 1.1, 1], color1: [1, 0.5, 0.2, 0],
    });
    // 먼지 퍼프
    const dust = Math.round(3 * scale * b);
    for (let i = 0; i < dust; i++) {
      this._emit(this.alpha, {
        x: x + nx * 0.05, y: y + ny * 0.05, z: z + nz * 0.05,
        vx: nx * rng.range(0.4, 1.7) + rng.range(-0.5, 0.5),
        vy: ny * rng.range(0.4, 1.7) + rng.range(0.1, 0.8),
        vz: nz * rng.range(0.4, 1.7) + rng.range(-0.5, 0.5),
        life: rng.range(0.4, 0.95), size0: 0.1 * scale, size1: 0.55 * scale,
        rotV: rng.range(-2, 2), drag: 2.6, grav: -0.6,
        color0: [0.42, 0.38, 0.33, 0.5], color1: [0.3, 0.28, 0.25, 0],
      });
    }
    // 파편 조각
    if (b > 0.5 && rng.chance(0.65 * scale)) {
      const gy = this._ground(x, z, y);
      for (let i = 0; i < 2; i++) {
        const s = rng.range(0.025, 0.06);
        this._emitDebris({
          x, y, z,
          vx: nx * rng.range(1, 4) + rng.range(-1.6, 1.6),
          vy: ny * rng.range(1, 3) + rng.range(1, 3.6),
          vz: nz * rng.range(1, 4) + rng.range(-1.6, 1.6),
          sx: s, sy: s * rng.range(0.5, 1), sz: s * rng.range(0.5, 1),
          spin: 16, life: rng.range(1.1, 2.2), groundY: gy,
          color: surface === 1 ? [0.25, 0.2, 0.16] : [0.36, 0.34, 0.31],
        });
      }
    }
  }

  /** 피격 시 피 분무 + 바닥 얼룩 유발 */
  blood(x, y, z, dx, dy, dz, amount = 1) {
    const b = this.budget;
    const n = Math.round(rng.irange(7, 12) * amount * b);
    const gy = this._ground(x, z, y);
    for (let i = 0; i < n; i++) {
      const sp = rng.range(1.6, 6.5) * amount;
      this._emit(this.alpha, {
        x, y, z,
        vx: dx * sp + rng.range(-1.8, 1.8),
        vy: dy * sp + rng.range(0.2, 2.6),
        vz: dz * sp + rng.range(-1.8, 1.8),
        life: rng.range(0.5, 1.1), size0: rng.range(0.05, 0.13) * amount, size1: 0.02,
        drag: 0.9, grav: 15, groundY: gy, flags: 3,
        color0: [0.34, 0.018, 0.012, 0.95], color1: [0.16, 0.01, 0.008, 0.8],
      });
    }
    // 붉은 미스트
    const m = Math.round(4 * amount * b);
    for (let i = 0; i < m; i++) {
      this._emit(this.alpha, {
        x, y, z,
        vx: dx * rng.range(0.5, 2) + rng.range(-0.7, 0.7),
        vy: dy * rng.range(0.5, 2) + rng.range(0, 1.1),
        vz: dz * rng.range(0.5, 2) + rng.range(-0.7, 0.7),
        life: rng.range(0.35, 0.7), size0: 0.14 * amount, size1: 0.5 * amount,
        rotV: rng.range(-1.5, 1.5), drag: 3.2, grav: 1.2,
        color0: [0.42, 0.03, 0.02, 0.42], color1: [0.2, 0.02, 0.015, 0],
      });
    }
  }

  /** 사망 시 살점 파편 */
  gibs(x, y, z, count = 6, tint = [0.32, 0.05, 0.04]) {
    const b = this.budget;
    const n = Math.round(count * b);
    const gy = this._ground(x, z, y);
    for (let i = 0; i < n; i++) {
      const s = rng.range(0.06, 0.16);
      this._emitDebris({
        x: x + rng.range(-0.15, 0.15), y: y + rng.range(-0.2, 0.3), z: z + rng.range(-0.15, 0.15),
        vx: rng.range(-4, 4), vy: rng.range(2, 6.5), vz: rng.range(-4, 4),
        sx: s, sy: s * rng.range(0.6, 1.3), sz: s * rng.range(0.6, 1.3),
        spin: 22, life: rng.range(2.4, 4.2), groundY: gy, bounce: 0.16,
        color: tint,
      });
    }
    this.blood(x, y, z, 0, 0.4, 0, 1.6);
  }

  /** 탄피 배출 */
  shell(x, y, z, vx, vy, vz, groundY, gold = true) {
    this._emitDebris({
      x, y, z, vx, vy, vz,
      sx: 0.017, sy: 0.055, sz: 0.017,
      spin: 26, life: 3.0, groundY, bounce: 0.42,
      color: gold ? [0.72, 0.5, 0.14] : [0.5, 0.5, 0.52],
    });
  }

  /** 총구 연기 */
  muzzleSmoke(x, y, z, dx, dy, dz, power = 1) {
    const n = Math.round(3 * power * this.budget);
    for (let i = 0; i < n; i++) {
      this._emit(this.alpha, {
        x, y, z,
        vx: dx * rng.range(0.8, 2.4) + rng.range(-0.35, 0.35),
        vy: dy * rng.range(0.8, 2.4) + rng.range(0.1, 0.6),
        vz: dz * rng.range(0.8, 2.4) + rng.range(-0.35, 0.35),
        life: rng.range(0.45, 0.95), size0: 0.06 * power, size1: 0.42 * power,
        rotV: rng.range(-1.6, 1.6), drag: 2.8, grav: -0.9,
        color0: [0.55, 0.52, 0.5, 0.3], color1: [0.4, 0.38, 0.36, 0],
      });
    }
  }

  /** 폭발 — 화구 + 충격 먼지 + 파편 */
  explosion(x, y, z, radius = 3.5) {
    const b = this.budget;
    const gy = this._ground(x, z, y);
    // 코어 플래시
    this._emit(this.add, {
      x, y, z, life: 0.16, size0: radius * 0.9, size1: radius * 1.7,
      color0: [6, 4.2, 1.6, 1], color1: [2, 0.6, 0.1, 0],
    });
    // 화염
    for (let i = 0; i < Math.round(16 * b); i++) {
      const a = rng.range(0, Math.PI * 2), e = rng.range(-0.3, 1.1);
      const sp = rng.range(2, 9);
      this._emit(this.add, {
        x, y, z,
        vx: Math.cos(a) * sp, vy: e * sp * 0.8 + 2, vz: Math.sin(a) * sp,
        life: rng.range(0.25, 0.6), size0: radius * 0.32, size1: radius * 0.7,
        rotV: rng.range(-3, 3), drag: 2.2, grav: -3,
        color0: [5, 2.6, 0.6, 1], color1: [1.4, 0.28, 0.04, 0],
      });
    }
    // 검은 연기
    for (let i = 0; i < Math.round(14 * b); i++) {
      const a = rng.range(0, Math.PI * 2), sp = rng.range(1, 6);
      this._emit(this.alpha, {
        x, y, z,
        vx: Math.cos(a) * sp, vy: rng.range(0.5, 4), vz: Math.sin(a) * sp,
        life: rng.range(0.9, 2.0), size0: radius * 0.35, size1: radius * 1.5,
        rotV: rng.range(-1.2, 1.2), drag: 1.5, grav: -1.6,
        color0: [0.16, 0.14, 0.13, 0.72], color1: [0.3, 0.28, 0.27, 0],
      });
    }
    // 파편
    for (let i = 0; i < Math.round(10 * b); i++) {
      const a = rng.range(0, Math.PI * 2), sp = rng.range(4, 13);
      const s = rng.range(0.03, 0.1);
      this._emitDebris({
        x, y, z,
        vx: Math.cos(a) * sp, vy: rng.range(3, 10), vz: Math.sin(a) * sp,
        sx: s, sy: s, sz: s, spin: 24, life: rng.range(1.6, 3), groundY: gy,
        color: [0.2, 0.18, 0.16],
      });
    }
    // 지면 링
    for (let i = 0; i < Math.round(10 * b); i++) {
      const a = (i / 10) * Math.PI * 2 + rng.range(-0.2, 0.2);
      this._emit(this.alpha, {
        x, y: gy + 0.1, z,
        vx: Math.cos(a) * radius * 2.4, vy: rng.range(0.2, 1.2), vz: Math.sin(a) * radius * 2.4,
        life: rng.range(0.5, 1.0), size0: radius * 0.25, size1: radius * 0.9,
        rotV: rng.range(-2, 2), drag: 3.4, grav: -0.4,
        color0: [0.42, 0.36, 0.3, 0.55], color1: [0.35, 0.32, 0.28, 0],
      });
    }
  }

  /** 스포너 게이트의 붉은 안개 */
  spawnFog(x, y, z, radius = 1.6) {
    if (!rng.chance(0.5 * this.budget)) return;
    this._emit(this.alpha, {
      x: x + rng.range(-radius, radius), y: y + rng.range(0, 0.6), z: z + rng.range(-radius, radius),
      vx: rng.range(-0.2, 0.2), vy: rng.range(0.15, 0.5), vz: rng.range(-0.2, 0.2),
      life: rng.range(1.4, 2.6), size0: 0.5, size1: 1.9,
      rotV: rng.range(-0.5, 0.5), drag: 0.8, grav: -0.2,
      color0: [0.32, 0.05, 0.05, 0.24], color1: [0.18, 0.03, 0.03, 0],
    });
  }

  /** 회복/보급 등 상승하는 빛 입자 */
  sparkle(x, y, z, color = [0.4, 2.2, 1.4], count = 10) {
    for (let i = 0; i < Math.round(count * this.budget); i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(0, 0.5);
      this._emit(this.add, {
        x: x + Math.cos(a) * r, y: y + rng.range(0, 0.4), z: z + Math.sin(a) * r,
        vx: rng.range(-0.3, 0.3), vy: rng.range(0.8, 2.2), vz: rng.range(-0.3, 0.3),
        life: rng.range(0.5, 1.1), size0: 0.09, size1: 0.01,
        drag: 1.2, grav: -1,
        color0: [color[0], color[1], color[2], 1], color1: [color[0] * 0.3, color[1] * 0.3, color[2] * 0.3, 0],
      });
    }
  }

  // ───────────────────────── 시뮬레이션 ─────────────────────────

  update(dt) {
    this._stepLayer(this.add, dt);
    this._stepLayer(this.alpha, dt);
    this._stepLayer(this.streaks, dt);
    this._stepDebris(dt);
  }

  _stepLayer(L, dt) {
    for (let i = 0; i < L.n; i++) {
      L.life[i] += dt;
      if (L.life[i] >= L.maxLife[i]) { L.kill(i); i--; continue; }

      const d = Math.exp(-L.drag[i] * dt);
      L.vx[i] *= d; L.vz[i] *= d;
      L.vy[i] = L.vy[i] * d - L.grav[i] * dt;

      L.px[i] += L.vx[i] * dt;
      L.py[i] += L.vy[i] * dt;
      L.pz[i] += L.vz[i] * dt;
      L.rot[i] += L.rotV[i] * dt;

      if ((L.flags[i] & 1) && L.py[i] <= L.groundY[i] + 0.01 && L.vy[i] < 0) {
        if (this.onDecal && (L.flags[i] & 2)) {
          this.onDecal(L.px[i], L.groundY[i], L.pz[i], 0, 1, 0, 'blood');
        }
        L.kill(i); i--; continue;
      }
    }
  }

  _stepDebris(dt) {
    const d = this.d;
    for (let i = 0; i < this.dn; i++) {
      d.life[i] += dt;
      if (d.life[i] >= d.maxLife[i]) { this._killDebris(i); i--; continue; }
      if (d.settled[i]) continue;

      d.vy[i] -= GRAV * dt;
      d.px[i] += d.vx[i] * dt;
      d.py[i] += d.vy[i] * dt;
      d.pz[i] += d.vz[i] * dt;

      const half = d.sy[i] * 0.5;
      if (d.py[i] - half <= d.groundY[i]) {
        d.py[i] = d.groundY[i] + half;
        if (Math.abs(d.vy[i]) < 1.1) {
          d.settled[i] = 1;
          d.vx[i] = d.vy[i] = d.vz[i] = 0;
        } else {
          d.vy[i] = -d.vy[i] * d.bounce[i];
          d.vx[i] *= 0.55; d.vz[i] *= 0.55;
          d.ax[i] *= 0.5; d.ay[i] *= 0.5; d.az[i] *= 0.5;
        }
      }

      // 각속도 → 쿼터니언 적분
      const sp = Math.hypot(d.ax[i], d.ay[i], d.az[i]);
      if (sp > 1e-4) {
        this._axis.set(d.ax[i] / sp, d.ay[i] / sp, d.az[i] / sp);
        this._spin.setFromAxisAngle(this._axis, sp * dt);
        this._q.set(d.qx[i], d.qy[i], d.qz[i], d.qw[i]).premultiply(this._spin).normalize();
        d.qx[i] = this._q.x; d.qy[i] = this._q.y; d.qz[i] = this._q.z; d.qw[i] = this._q.w;
      }
    }
  }

  _killDebris(i) {
    const last = --this.dn;
    if (i === last) return;
    const d = this.d;
    for (const k of ['px', 'py', 'pz', 'vx', 'vy', 'vz', 'qx', 'qy', 'qz', 'qw',
      'ax', 'ay', 'az', 'sx', 'sy', 'sz', 'life', 'maxLife', 'groundY', 'bounce', 'settled']) {
      d[k][i] = d[k][last];
    }
    d.col[i * 3] = d.col[last * 3];
    d.col[i * 3 + 1] = d.col[last * 3 + 1];
    d.col[i * 3 + 2] = d.col[last * 3 + 2];
  }

  /** 렌더 직전에 GPU 버퍼를 채운다 */
  flush() {
    this._fill(this.add, false);
    this._fill(this.alpha, false);
    this._fill(this.streaks, true);
    this._fillDebris();
  }

  _fill(L, stretched) {
    const b = L.batch;
    b.begin();
    for (let i = 0; i < L.n; i++) {
      const t = clamp01(L.life[i] / L.maxLife[i]);
      const s = L.s0[i] + (L.s1[i] - L.s0[i]) * t;
      const o = i * 4;
      const r = L.c0[o] + (L.c1[o] - L.c0[o]) * t;
      const g = L.c0[o + 1] + (L.c1[o + 1] - L.c0[o + 1]) * t;
      const bl = L.c0[o + 2] + (L.c1[o + 2] - L.c0[o + 2]) * t;
      const a = L.c0[o + 3] + (L.c1[o + 3] - L.c0[o + 3]) * t;
      if (a <= 0.002) continue;
      let sx = s, sy = s, rot = L.rot[i];
      if (stretched) {
        // 속도 방향으로 늘려 스파크 궤적처럼 보이게
        const vlen = Math.hypot(L.vx[i], L.vy[i], L.vz[i]);
        sy = s * (1 + L.stretch[i] * Math.min(1, vlen / 10));
        sx = s;
        rot = this._screenAngle(L.vx[i], L.vy[i], L.vz[i]);
      }
      b.push(L.px[i], L.py[i], L.pz[i], sx, sy, rot, r, g, bl, a);
    }
    b.end();
  }

  /** 속도 벡터를 화면 공간 각도로 — 스트릭 정렬용 */
  _screenAngle(vx, vy, vz) {
    const cam = this.engine.camera;
    const e = cam.matrixWorldInverse.elements;
    const sx = e[0] * vx + e[4] * vy + e[8] * vz;
    const sy = e[1] * vx + e[5] * vy + e[9] * vz;
    return Math.atan2(sx, sy);
  }

  _fillDebris() {
    const d = this.d;
    const mesh = this.debrisMesh;
    const dummy = this._dummy;
    mesh.count = this.dn;
    for (let i = 0; i < this.dn; i++) {
      dummy.position.set(d.px[i], d.py[i], d.pz[i]);
      dummy.quaternion.set(d.qx[i], d.qy[i], d.qz[i], d.qw[i]);
      dummy.scale.set(d.sx[i], d.sy[i], d.sz[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      this._col.setRGB(d.col[i * 3], d.col[i * 3 + 1], d.col[i * 3 + 2]);
      mesh.setColorAt(i, this._col);
    }
    if (this.dn > 0) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  clear() {
    this.add.n = this.alpha.n = this.streaks.n = 0;
    this.dn = 0;
    this.debrisMesh.count = 0;
  }

  syncFog() {
    const fog = this.engine.scene.fog;
    for (const l of [this.add, this.alpha, this.streaks]) l.batch.syncFog(fog);
  }
}
