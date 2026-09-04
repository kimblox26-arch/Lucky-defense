// 정적 AABB 월드 + 공간 해시 브로드페이즈.
// 캐릭터는 축 정렬 박스로 근사하고 축별 스윕-슬라이드로 이동한다.
// 고정 60Hz 스텝에서 델타가 작으므로 축별 해결로 충분히 안정적이다.

import { Vector3 } from 'three';

const EPS = 1e-3;
const CELL = 4;

export const SURFACE = {
  CONCRETE: 0,
  METAL: 1,
  DIRT: 2,
  WOOD: 3,
};

export class CollisionWorld {
  constructor() {
    /** @type {Float32Array} 박스당 6개 값 (minX,minY,minZ,maxX,maxY,maxZ) */
    this.data = [];
    this.surface = [];
    this.blocksNav = [];
    this.count = 0;
    this.grid = new Map();
    this.bounds = { minX: Infinity, minZ: Infinity, maxX: -Infinity, maxZ: -Infinity };
  }

  /** 중심 + 반크기로 박스 추가 */
  addBox(cx, cy, cz, hx, hy, hz, surface = SURFACE.CONCRETE, blocksNav = true) {
    const i = this.count++;
    this.data.push(cx - hx, cy - hy, cz - hz, cx + hx, cy + hy, cz + hz);
    this.surface.push(surface);
    this.blocksNav.push(blocksNav);
    this.bounds.minX = Math.min(this.bounds.minX, cx - hx);
    this.bounds.minZ = Math.min(this.bounds.minZ, cz - hz);
    this.bounds.maxX = Math.max(this.bounds.maxX, cx + hx);
    this.bounds.maxZ = Math.max(this.bounds.maxZ, cz + hz);
    return i;
  }

  build() {
    this.arr = new Float32Array(this.data);
    this.surf = new Uint8Array(this.surface);
    this.nav = new Uint8Array(this.blocksNav.map((b) => (b ? 1 : 0)));
    this.grid.clear();
    for (let i = 0; i < this.count; i++) {
      const o = i * 6;
      const x0 = Math.floor(this.arr[o] / CELL), x1 = Math.floor(this.arr[o + 3] / CELL);
      const z0 = Math.floor(this.arr[o + 2] / CELL), z1 = Math.floor(this.arr[o + 5] / CELL);
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          const key = x * 73856093 ^ z * 19349663;
          let bucket = this.grid.get(key);
          if (!bucket) { bucket = []; this.grid.set(key, bucket); }
          bucket.push(i);
        }
      }
    }
    this._scratch = new Int32Array(this.count);
    this._mark = new Int32Array(this.count);
    this._stamp = 0;
    return this;
  }

  /** XZ 사각형과 겹치는 박스 인덱스를 out 배열에 채운다. 반환: 개수 */
  query(minX, minZ, maxX, maxZ, out) {
    const x0 = Math.floor(minX / CELL), x1 = Math.floor(maxX / CELL);
    const z0 = Math.floor(minZ / CELL), z1 = Math.floor(maxZ / CELL);
    const stamp = ++this._stamp;
    let n = 0;
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const bucket = this.grid.get(x * 73856093 ^ z * 19349663);
        if (!bucket) continue;
        for (let k = 0; k < bucket.length; k++) {
          const i = bucket[k];
          if (this._mark[i] === stamp) continue;
          this._mark[i] = stamp;
          out[n++] = i;
        }
      }
    }
    return n;
  }

  /**
   * 캐릭터를 축별로 이동시키고 충돌을 해결한다.
   * @param {Vector3} pos 캐릭터의 발 중심 (y = 바닥)
   * @param {number} radius 수평 반지름
   * @param {number} height 전체 높이
   * @param {Vector3} delta 이번 스텝의 이동량
   * @param {object} out 결과 { grounded, ceiling, wall, groundY, surface }
   * @param {number} stepHeight 자동으로 올라갈 수 있는 턱 높이
   */
  moveBox(pos, radius, height, delta, out, stepHeight = 0.45) {
    out.grounded = false;
    out.ceiling = false;
    out.wall = false;
    out.wallNormalX = 0;
    out.wallNormalZ = 0;
    out.surface = SURFACE.CONCRETE;

    const cand = this._scratch;
    const pad = radius + Math.max(Math.abs(delta.x), Math.abs(delta.z)) + 0.5;
    const n = this.query(pos.x - pad, pos.z - pad, pos.x + pad, pos.z + pad, cand);
    const a = this.arr;

    const startX = pos.x, startY = pos.y, startZ = pos.z;

    // ── Y ──
    pos.y += delta.y;
    for (let k = 0; k < n; k++) {
      const o = cand[k] * 6;
      if (pos.x + radius <= a[o] || pos.x - radius >= a[o + 3]) continue;
      if (pos.z + radius <= a[o + 2] || pos.z - radius >= a[o + 5]) continue;
      if (pos.y + height <= a[o + 1] || pos.y >= a[o + 4]) continue;
      if (delta.y <= 0) {
        pos.y = a[o + 4] + EPS;
        out.grounded = true;
        out.groundY = a[o + 4];
        out.surface = this.surf[cand[k]];
      } else {
        pos.y = a[o + 1] - height - EPS;
        out.ceiling = true;
      }
    }

    // ── 수평 (X, Z 순차) ──
    const tryHorizontal = (dx, dz) => {
      let blocked = false;
      pos.x += dx;
      for (let k = 0; k < n; k++) {
        const o = cand[k] * 6;
        if (pos.y + height <= a[o + 1] || pos.y >= a[o + 4]) continue;
        if (pos.z + radius <= a[o + 2] || pos.z - radius >= a[o + 5]) continue;
        if (pos.x + radius <= a[o] || pos.x - radius >= a[o + 3]) continue;
        if (dx > 0) { pos.x = a[o] - radius - EPS; out.wallNormalX = -1; }
        else if (dx < 0) { pos.x = a[o + 3] + radius + EPS; out.wallNormalX = 1; }
        blocked = true;
      }
      pos.z += dz;
      for (let k = 0; k < n; k++) {
        const o = cand[k] * 6;
        if (pos.y + height <= a[o + 1] || pos.y >= a[o + 4]) continue;
        if (pos.x + radius <= a[o] || pos.x - radius >= a[o + 3]) continue;
        if (pos.z + radius <= a[o + 2] || pos.z - radius >= a[o + 5]) continue;
        if (dz > 0) { pos.z = a[o + 2] - radius - EPS; out.wallNormalZ = -1; }
        else if (dz < 0) { pos.z = a[o + 5] + radius + EPS; out.wallNormalZ = 1; }
        blocked = true;
      }
      return blocked;
    };

    const preX = pos.x, preZ = pos.z, preY = pos.y;
    const blocked = tryHorizontal(delta.x, delta.z);

    // 막혔고 지면에 있으면 스텝업 시도 (낮은 턱/계단 자동 오르기)
    if (blocked && stepHeight > 0 && (out.grounded || delta.y <= 0)) {
      const movedSq = (pos.x - preX) ** 2 + (pos.z - preZ) ** 2;
      const wantSq = delta.x ** 2 + delta.z ** 2;
      if (movedSq < wantSq * 0.9) {
        const sx = pos.x, sy = pos.y, sz = pos.z;
        pos.x = preX; pos.z = preZ; pos.y = preY + stepHeight;
        // 올라간 높이에서 머리가 막히지 않는지 확인
        let headClear = true;
        for (let k = 0; k < n; k++) {
          const o = cand[k] * 6;
          if (pos.x + radius <= a[o] || pos.x - radius >= a[o + 3]) continue;
          if (pos.z + radius <= a[o + 2] || pos.z - radius >= a[o + 5]) continue;
          if (pos.y + height <= a[o + 1] || pos.y >= a[o + 4]) continue;
          headClear = false; break;
        }
        if (headClear) {
          out.wallNormalX = 0; out.wallNormalZ = 0;
          const blocked2 = tryHorizontal(delta.x, delta.z);
          const moved2 = (pos.x - preX) ** 2 + (pos.z - preZ) ** 2;
          if (moved2 > movedSq + 1e-6) {
            // 스텝업 성공 — 지면으로 다시 내림
            let landed = preY + stepHeight;
            for (let k = 0; k < n; k++) {
              const o = cand[k] * 6;
              if (pos.x + radius <= a[o] || pos.x - radius >= a[o + 3]) continue;
              if (pos.z + radius <= a[o + 2] || pos.z - radius >= a[o + 5]) continue;
              if (a[o + 4] <= preY + stepHeight + EPS && a[o + 4] > preY - 0.6) {
                if (a[o + 4] < landed) landed = a[o + 4];
              }
            }
            pos.y = Math.max(preY, landed);
            out.grounded = true;
            out.wall = blocked2;
            out.movedX = pos.x - startX; out.movedZ = pos.z - startZ;
            return out;
          }
        }
        pos.x = sx; pos.y = sy; pos.z = sz;
      }
    }

    out.wall = blocked;
    out.movedX = pos.x - startX;
    out.movedY = pos.y - startY;
    out.movedZ = pos.z - startZ;
    return out;
  }

  /** 발밑이 비어 있으면 false. 착지 판정 보조. */
  isGrounded(pos, radius, tolerance = 0.08) {
    const cand = this._scratch;
    const n = this.query(pos.x - radius, pos.z - radius, pos.x + radius, pos.z + radius, cand);
    const a = this.arr;
    for (let k = 0; k < n; k++) {
      const o = cand[k] * 6;
      if (pos.x + radius <= a[o] || pos.x - radius >= a[o + 3]) continue;
      if (pos.z + radius <= a[o + 2] || pos.z - radius >= a[o + 5]) continue;
      if (pos.y >= a[o + 4] - tolerance && pos.y <= a[o + 4] + tolerance) return true;
    }
    return false;
  }

  /** 지정 위치의 지면 높이 (없으면 -Infinity) */
  groundHeight(x, z, maxY = 100) {
    const cand = this._scratch;
    const n = this.query(x, z, x, z, cand);
    const a = this.arr;
    let best = -Infinity;
    for (let k = 0; k < n; k++) {
      const o = cand[k] * 6;
      if (x < a[o] || x > a[o + 3] || z < a[o + 2] || z > a[o + 5]) continue;
      if (a[o + 4] <= maxY && a[o + 4] > best) best = a[o + 4];
    }
    return best;
  }

  /**
   * 레이 vs 정적 월드. 슬랩 방식.
   * @returns {{t:number, nx:number, ny:number, nz:number, index:number, surface:number}|null}
   */
  raycast(ox, oy, oz, dx, dy, dz, maxDist, out = {}) {
    const a = this.arr;
    const ex = ox + dx * maxDist, ez = oz + dz * maxDist;
    const cand = this._scratch;
    const n = this.query(
      Math.min(ox, ex) - 0.1, Math.min(oz, ez) - 0.1,
      Math.max(ox, ex) + 0.1, Math.max(oz, ez) + 0.1, cand,
    );
    const invX = 1 / (dx || 1e-9), invY = 1 / (dy || 1e-9), invZ = 1 / (dz || 1e-9);

    let bestT = maxDist, hit = -1, nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < n; k++) {
      const i = cand[k], o = i * 6;
      let t1 = (a[o] - ox) * invX, t2 = (a[o + 3] - ox) * invX;
      let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
      let axis = 0, sign = t1 > t2 ? 1 : -1;

      t1 = (a[o + 1] - oy) * invY; t2 = (a[o + 4] - oy) * invY;
      const yMin = Math.min(t1, t2);
      if (yMin > tmin) { tmin = yMin; axis = 1; sign = t1 > t2 ? 1 : -1; }
      tmax = Math.min(tmax, Math.max(t1, t2));

      t1 = (a[o + 2] - oz) * invZ; t2 = (a[o + 5] - oz) * invZ;
      const zMin = Math.min(t1, t2);
      if (zMin > tmin) { tmin = zMin; axis = 2; sign = t1 > t2 ? 1 : -1; }
      tmax = Math.min(tmax, Math.max(t1, t2));

      if (tmax < 0 || tmin > tmax || tmin >= bestT) continue;
      const t = tmin < 0 ? 0 : tmin;
      if (t >= bestT) continue;
      bestT = t; hit = i;
      nx = axis === 0 ? sign : 0;
      ny = axis === 1 ? sign : 0;
      nz = axis === 2 ? sign : 0;
    }

    if (hit < 0) return null;
    out.t = bestT;
    out.nx = nx; out.ny = ny; out.nz = nz;
    out.index = hit;
    out.surface = this.surf[hit];
    return out;
  }

  /** 두 점 사이 시야 차단 여부 (좀비 AI / 오디오 오클루전) */
  losBlocked(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const d = Math.hypot(dx, dy, dz);
    if (d < 1e-4) return false;
    const hit = this.raycast(ax, ay, az, dx / d, dy / d, dz / d, d - 0.05, this._losOut || (this._losOut = {}));
    return !!hit;
  }
}

export const tmpVec = new Vector3();
