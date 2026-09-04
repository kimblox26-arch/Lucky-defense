// 예광탄 + 총구 화염. 원통형 빌보드 빔으로 한 번에 그린다.

import { QuadBatch } from './QuadBatch.js';
import { streak, muzzleFlash } from '../core/Textures.js';
import { clamp01, rng } from '../core/Util.js';

const MAX = 48;
const MAX_FLASH = 12;

export class Tracers {
  constructor(engine) {
    this.engine = engine;
    this.batch = new QuadBatch({
      capacity: MAX, texture: streak(), mode: 'beam',
      blending: 'additive', renderOrder: 14,
    });
    this.flash = new QuadBatch({
      capacity: MAX_FLASH, texture: muzzleFlash(), mode: 'billboard',
      blending: 'additive', renderOrder: 15, depthTest: true,
    });
    engine.scene.add(this.batch.mesh, this.flash.mesh);
    this.batch.syncFog(engine.scene.fog);
    this.flash.syncFog(engine.scene.fog);

    this.n = 0;
    this.sx = new Float32Array(MAX); this.sy = new Float32Array(MAX); this.sz = new Float32Array(MAX);
    this.dx = new Float32Array(MAX); this.dy = new Float32Array(MAX); this.dz = new Float32Array(MAX);
    this.len = new Float32Array(MAX);
    this.travel = new Float32Array(MAX);   // 현재 선단까지의 거리
    this.speed = new Float32Array(MAX);
    this.age = new Float32Array(MAX); this.life = new Float32Array(MAX);
    this.width = new Float32Array(MAX);
    this.tint = new Float32Array(MAX * 3);
    this._dist = new Float32Array(MAX);

    this.fn = 0;
    this.fx = new Float32Array(MAX_FLASH); this.fy = new Float32Array(MAX_FLASH); this.fz = new Float32Array(MAX_FLASH);
    this.fsize = new Float32Array(MAX_FLASH);
    this.frot = new Float32Array(MAX_FLASH);
    this.fage = new Float32Array(MAX_FLASH); this.flife = new Float32Array(MAX_FLASH);
  }

  /** 발사 지점에서 착탄 지점까지 날아가는 예광탄 */
  fire(x, y, z, dx, dy, dz, distance, opts = {}) {
    const i = this.n < MAX ? this.n++ : (MAX - 1);
    this.sx[i] = x; this.sy[i] = y; this.sz[i] = z;
    this.dx[i] = dx; this.dy[i] = dy; this.dz[i] = dz;
    this.len[i] = Math.min(distance, opts.trail ?? 7);
    this.travel[i] = 0;
    this.speed[i] = opts.speed ?? 260;
    this.age[i] = 0;
    this.life[i] = distance / (opts.speed ?? 260) + 0.05;
    this.width[i] = opts.width ?? 0.028;
    const t = opts.tint ?? [2.6, 1.5, 0.55];
    this.tint[i * 3] = t[0]; this.tint[i * 3 + 1] = t[1]; this.tint[i * 3 + 2] = t[2];
    this._dist[i] = distance;
  }

  /** 총구 화염 스프라이트 */
  muzzle(x, y, z, size = 0.5) {
    const i = this.fn < MAX_FLASH ? this.fn++ : (MAX_FLASH - 1);
    this.fx[i] = x; this.fy[i] = y; this.fz[i] = z;
    this.fsize[i] = size * rng.range(0.85, 1.2);
    this.frot[i] = rng.range(0, Math.PI * 2);
    this.fage[i] = 0;
    this.flife[i] = 0.055;
  }

  update(dt) {
    for (let i = 0; i < this.n; i++) {
      this.age[i] += dt;
      this.travel[i] += this.speed[i] * dt;
      if (this.age[i] >= this.life[i]) { this._kill(i); i--; }
    }
    for (let i = 0; i < this.fn; i++) {
      this.fage[i] += dt;
      if (this.fage[i] >= this.flife[i]) { this._killFlash(i); i--; }
    }
  }

  _kill(i) {
    const last = --this.n;
    if (i === last) return;
    for (const a of ['sx', 'sy', 'sz', 'dx', 'dy', 'dz', 'len', 'travel', 'speed', 'age', 'life', 'width', '_dist']) {
      if (this[a]) this[a][i] = this[a][last];
    }
    this.tint[i * 3] = this.tint[last * 3];
    this.tint[i * 3 + 1] = this.tint[last * 3 + 1];
    this.tint[i * 3 + 2] = this.tint[last * 3 + 2];
  }

  _killFlash(i) {
    const last = --this.fn;
    if (i === last) return;
    for (const a of ['fx', 'fy', 'fz', 'fsize', 'frot', 'fage', 'flife']) this[a][i] = this[a][last];
  }

  flush() {
    const b = this.batch;
    b.begin();
    for (let i = 0; i < this.n; i++) {
      const total = this._dist[i];
      const head = Math.min(this.travel[i], total);
      const tail = Math.max(0, head - this.len[i]);
      const segLen = head - tail;
      if (segLen <= 0.01) continue;
      const fade = 1 - clamp01(this.age[i] / this.life[i]) * 0.35;
      b.pushBeam(
        this.sx[i] + this.dx[i] * tail,
        this.sy[i] + this.dy[i] * tail,
        this.sz[i] + this.dz[i] * tail,
        this.dx[i], this.dy[i], this.dz[i],
        this.width[i], segLen,
        this.tint[i * 3], this.tint[i * 3 + 1], this.tint[i * 3 + 2], fade,
      );
    }
    b.end();

    const f = this.flash;
    f.begin();
    for (let i = 0; i < this.fn; i++) {
      const t = clamp01(this.fage[i] / this.flife[i]);
      const a = 1 - t;
      const s = this.fsize[i] * (0.7 + t * 0.55);
      f.push(this.fx[i], this.fy[i], this.fz[i], s, s, this.frot[i], 3.4, 2.2, 1.0, a);
    }
    f.end();
  }

  clear() { this.n = 0; this.fn = 0; }

  syncFog() {
    const fog = this.engine.scene.fog;
    this.batch.syncFog(fog);
    this.flash.syncFog(fog);
  }
}
