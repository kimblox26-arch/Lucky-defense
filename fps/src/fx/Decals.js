// 탄흔·핏자국 데칼. 표면 방향으로 정렬된 인스턴스 쿼드를 링 버퍼로 관리하고
// 오래된 것부터 서서히 사라지게 한다.

import { Quaternion, Vector3 } from 'three';
import { QuadBatch } from './QuadBatch.js';
import { bulletHole, bloodSplat } from '../core/Textures.js';
import { rng, clamp01 } from '../core/Util.js';

const UP = new Vector3(0, 0, 1);
const _n = new Vector3();
const _q = new Quaternion();

class DecalSet {
  constructor(capacity, texture, renderOrder) {
    this.cap = capacity;
    this.batch = new QuadBatch({
      capacity, texture, mode: 'oriented', blending: 'normal',
      depthWrite: false, renderOrder, polygonOffset: true,
    });
    this.n = 0;
    this.head = 0;
    const c = capacity;
    this.px = new Float32Array(c); this.py = new Float32Array(c); this.pz = new Float32Array(c);
    this.qx = new Float32Array(c); this.qy = new Float32Array(c);
    this.qz = new Float32Array(c); this.qw = new Float32Array(c);
    this.size = new Float32Array(c);
    this.age = new Float32Array(c);
    this.life = new Float32Array(c);
    this.alpha = new Float32Array(c);
    this.tint = new Float32Array(c * 3);
  }

  add(x, y, z, nx, ny, nz, size, life, alpha, tint) {
    // 링 버퍼: 가득 차면 가장 오래된 것을 덮어쓴다
    const i = this.n < this.cap ? this.n++ : this.head;
    if (this.n >= this.cap) this.head = (this.head + 1) % this.cap;

    _n.set(nx, ny, nz).normalize();
    _q.setFromUnitVectors(UP, _n);
    // 표면 법선을 축으로 무작위 회전 — 반복 패턴을 깬다
    const roll = rng.range(0, Math.PI * 2);
    const s = Math.sin(roll / 2), c = Math.cos(roll / 2);
    const rq = { x: _n.x * s, y: _n.y * s, z: _n.z * s, w: c };
    const ox = _q.x, oy = _q.y, oz = _q.z, ow = _q.w;
    this.qx[i] = rq.w * ox + rq.x * ow + rq.y * oz - rq.z * oy;
    this.qy[i] = rq.w * oy - rq.x * oz + rq.y * ow + rq.z * ox;
    this.qz[i] = rq.w * oz + rq.x * oy - rq.y * ox + rq.z * ow;
    this.qw[i] = rq.w * ow - rq.x * ox - rq.y * oy - rq.z * oz;

    // 표면에서 살짝 띄워 Z 파이팅 방지
    this.px[i] = x + nx * 0.012;
    this.py[i] = y + ny * 0.012;
    this.pz[i] = z + nz * 0.012;
    this.size[i] = size;
    this.age[i] = 0;
    this.life[i] = life;
    this.alpha[i] = alpha;
    this.tint[i * 3] = tint[0];
    this.tint[i * 3 + 1] = tint[1];
    this.tint[i * 3 + 2] = tint[2];
  }

  update(dt) {
    for (let i = 0; i < this.n; i++) this.age[i] += dt;
  }

  flush() {
    const b = this.batch;
    b.begin();
    for (let i = 0; i < this.n; i++) {
      const t = this.age[i] / this.life[i];
      if (t >= 1) continue;
      // 수명의 마지막 30%에서만 페이드
      const a = this.alpha[i] * clamp01((1 - t) / 0.3);
      if (a <= 0.004) continue;
      b.pushOriented(
        this.px[i], this.py[i], this.pz[i],
        this.size[i], this.size[i],
        this.qx[i], this.qy[i], this.qz[i], this.qw[i],
        this.tint[i * 3], this.tint[i * 3 + 1], this.tint[i * 3 + 2], a,
      );
    }
    b.end();
  }

  clear() { this.n = 0; this.head = 0; }
}

export class Decals {
  constructor(engine) {
    this.engine = engine;
    const cap = engine.quality.maxDecals;
    this.holes = new DecalSet(cap, bulletHole(), 6);
    this.blood = new DecalSet(Math.round(cap * 0.9), bloodSplat(0), 7);
    this.blood2 = new DecalSet(Math.round(cap * 0.6), bloodSplat(1), 7);
    engine.scene.add(this.holes.batch.mesh, this.blood.batch.mesh, this.blood2.batch.mesh);
    this.syncFog();
  }

  bulletHole(x, y, z, nx, ny, nz, scale = 1) {
    this.holes.add(x, y, z, nx, ny, nz,
      rng.range(0.10, 0.17) * scale, 26, 0.95, [1, 1, 1]);
  }

  bloodSplat(x, y, z, nx, ny, nz, scale = 1) {
    const set = rng.chance(0.5) ? this.blood : this.blood2;
    // 어둡고 채도 낮은 붉은색 — 새 자국일수록 진하다
    set.add(x, y, z, nx, ny, nz,
      rng.range(0.35, 0.85) * scale, 32, rng.range(0.6, 0.92),
      [0.55, 0.09, 0.07]);
  }

  scorch(x, y, z, nx, ny, nz, scale = 1) {
    this.blood.add(x, y, z, nx, ny, nz,
      rng.range(1.6, 2.4) * scale, 40, 0.8, [0.055, 0.05, 0.045]);
  }

  update(dt) {
    this.holes.update(dt);
    this.blood.update(dt);
    this.blood2.update(dt);
  }

  flush() {
    this.holes.flush();
    this.blood.flush();
    this.blood2.flush();
  }

  clear() {
    this.holes.clear();
    this.blood.clear();
    this.blood2.clear();
  }

  syncFog() {
    const fog = this.engine.scene.fog;
    this.holes.batch.syncFog(fog);
    this.blood.batch.syncFog(fog);
    this.blood2.batch.syncFog(fog);
  }
}
