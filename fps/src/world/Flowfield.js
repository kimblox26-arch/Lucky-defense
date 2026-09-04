// 플레이어를 향하는 플로우 필드.
// BFS로 적분 필드를 만들고 그 기울기에서 방향 벡터를 얻는다.
// 개체 수와 무관하게 비용이 일정하므로 대규모 무리에 적합하다.

export class Flowfield {
  /**
   * @param {CollisionWorld} collision
   * @param {number} min 그리드 최소 좌표 (X/Z 공통)
   * @param {number} max 그리드 최대 좌표
   * @param {number} cell 셀 크기
   */
  constructor(collision, min, max, cell = 1) {
    this.collision = collision;
    this.min = min;
    this.cell = cell;
    this.size = Math.ceil((max - min) / cell);
    const n = this.size * this.size;

    this.blocked = new Uint8Array(n);
    this.groundY = new Float32Array(n);
    this.dist = new Float32Array(n);
    this.dirX = new Float32Array(n);
    this.dirZ = new Float32Array(n);
    this.queue = new Int32Array(n);
    this.INF = 1e9;

    // 한 번에 오르내릴 수 있는 높이 차. 램프/계단은 통과, 컨테이너 위는 불가.
    this.stepHeight = 0.62;
    // 이 높이를 넘는 면은 "서 있을 수 있는 바닥"으로 보지 않는다 (담장 위 등)
    this.maxStandY = 6.0;
    // 감염체가 지나가려면 필요한 머리 위 여유
    this.clearance = 1.55;

    this.goalIndex = -1;
    this._bake();
  }

  idx(cx, cz) { return cz * this.size + cx; }
  toCell(w) { return Math.floor((w - this.min) / this.cell); }
  toWorld(c) { return this.min + (c + 0.5) * this.cell; }
  inBounds(cx, cz) { return cx >= 0 && cz >= 0 && cx < this.size && cz < this.size; }

  /**
   * 보행 가능면을 굽는다.
   * 셀마다 (1) 설 수 있는 바닥 높이와 (2) 그 위를 막는 구조물이 있는지를 구한다.
   * 높이 차로 인한 통행 가능 여부는 BFS에서 stepHeight로 따로 판정하므로,
   * 램프·계단은 자연스럽게 통과되고 컨테이너 위는 올라갈 수 없게 된다.
   */
  _bake() {
    const c = this.collision;
    const a = c.arr;
    const half = this.cell * 0.5;
    const pad = 0.3;                 // 감염체 반지름 여유
    const scratch = new Int32Array(Math.max(1, c.count));

    for (let cz = 0; cz < this.size; cz++) {
      for (let cx = 0; cx < this.size; cx++) {
        const wx = this.toWorld(cx), wz = this.toWorld(cz);
        const n = c.query(wx - half - pad, wz - half - pad, wx + half + pad, wz + half + pad, scratch);

        // 1) 이 셀에서 설 수 있는 가장 높은 면
        let ground = -Infinity;
        for (let k = 0; k < n; k++) {
          const i = scratch[k], o = i * 6;
          if (wx + half <= a[o] || wx - half >= a[o + 3]) continue;
          if (wz + half <= a[o + 2] || wz - half >= a[o + 5]) continue;
          const top = a[o + 4];
          if (top <= this.maxStandY && top > ground) ground = top;
        }
        const gi = this.idx(cx, cz);
        if (ground === -Infinity) {
          this.blocked[gi] = 1;
          this.groundY[gi] = 0;
          continue;
        }
        this.groundY[gi] = ground;

        // 2) 그 위를 가로막는 구조물이 있는가 (반지름 여유 포함)
        let blocked = 0;
        for (let k = 0; k < n; k++) {
          const i = scratch[k], o = i * 6;
          if (!c.nav[i]) continue;
          if (wx + half + pad <= a[o] || wx - half - pad >= a[o + 3]) continue;
          if (wz + half + pad <= a[o + 2] || wz - half - pad >= a[o + 5]) continue;
          // 바닥면보다 확실히 위로 솟아 있고, 머리 높이까지 걸치면 통행 불가
          if (a[o + 4] > ground + this.stepHeight && a[o + 1] < ground + this.clearance) {
            blocked = 1; break;
          }
        }
        this.blocked[gi] = blocked;
      }
    }
  }

  /** 목표 지점(플레이어)에서 BFS를 다시 돌린다. */
  rebuild(goalX, goalZ) {
    let gx = this.toCell(goalX), gz = this.toCell(goalZ);
    gx = Math.max(0, Math.min(this.size - 1, gx));
    gz = Math.max(0, Math.min(this.size - 1, gz));

    // 목표가 막힌 셀이면 가장 가까운 열린 셀로 옮긴다
    if (this.blocked[this.idx(gx, gz)]) {
      let found = false;
      for (let r = 1; r <= 10 && !found; r++) {
        for (let dz = -r; dz <= r && !found; dz++) {
          for (let dx = -r; dx <= r && !found; dx++) {
            const nx = gx + dx, nz = gz + dz;
            if (nx < 0 || nz < 0 || nx >= this.size || nz >= this.size) continue;
            if (!this.blocked[this.idx(nx, nz)]) { gx = nx; gz = nz; found = true; }
          }
        }
      }
    }

    const S = this.size;
    const dist = this.dist;
    dist.fill(this.INF);

    const q = this.queue;
    let head = 0, tail = 0;
    const gi = this.idx(gx, gz);
    dist[gi] = 0;
    q[tail++] = gi;
    this.goalIndex = gi;

    // 균일 비용 8방향 BFS. 각 셀은 정확히 한 번만 큐에 들어가므로
    // 큐 크기가 셀 수를 넘지 않고 O(n)에 끝난다.
    // (대각선을 √2로 두면 재방문이 생겨 큐가 넘칠 수 있다 — 방향 평활화로 충분히 보정된다.)
    while (head < tail) {
      const cur = q[head++];
      const cx = cur % S, cz = (cur / S) | 0;
      const nd = dist[cur] + 1;
      const curY = this.groundY[cur];
      for (let k = 0; k < 8; k++) {
        const dx = NX[k], dz = NZ[k];
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= S || nz >= S) continue;
        const ni = nz * S + nx;
        if (this.blocked[ni] || dist[ni] < this.INF) continue;
        // 오르내릴 수 있는 높이 차인지 (램프·계단은 통과, 컨테이너 위는 불가)
        if (Math.abs(this.groundY[ni] - curY) > this.stepHeight) continue;
        // 대각선 이동은 두 직교 이웃이 모두 열려 있을 때만 허용 (모서리 관통 방지)
        if (dx !== 0 && dz !== 0
          && (this.blocked[cz * S + nx] || this.blocked[nz * S + cx])) continue;
        dist[ni] = nd;
        q[tail++] = ni;
      }
    }

    this._computeDirections();
  }

  _computeDirections() {
    const S = this.size, dist = this.dist;
    const INF = this.INF;
    for (let cz = 0; cz < S; cz++) {
      for (let cx = 0; cx < S; cx++) {
        const i = cz * S + cx;
        if (this.blocked[i] || dist[i] >= INF) { this.dirX[i] = 0; this.dirZ[i] = 0; continue; }
        // 가장 낮은 거리의 이웃 방향 + 중앙차분 기울기를 섞어 매끄럽게
        let best = dist[i], bx = 0, bz = 0;
        const curY = this.groundY[i];
        for (let k = 0; k < 8; k++) {
          const nx = cx + NX[k], nz = cz + NZ[k];
          if (nx < 0 || nz < 0 || nx >= S || nz >= S) continue;
          const ni = nz * S + nx;
          if (this.blocked[ni]) continue;
          if (Math.abs(this.groundY[ni] - curY) > this.stepHeight) continue;
          const d = dist[ni];
          if (d < best) { best = d; bx = NX[k]; bz = NZ[k]; }
        }
        if (bx === 0 && bz === 0) { this.dirX[i] = 0; this.dirZ[i] = 0; continue; }

        const l = cx > 0 ? dist[i - 1] : dist[i];
        const r = cx < S - 1 ? dist[i + 1] : dist[i];
        const u = cz > 0 ? dist[i - S] : dist[i];
        const d2 = cz < S - 1 ? dist[i + S] : dist[i];
        let gx = (l < INF && r < INF) ? (l - r) : bx * 2;
        let gz = (u < INF && d2 < INF) ? (u - d2) : bz * 2;
        gx = gx * 0.6 + bx * 0.8;
        gz = gz * 0.6 + bz * 0.8;
        const len = Math.hypot(gx, gz);
        if (len < 1e-4) { this.dirX[i] = bx; this.dirZ[i] = bz; continue; }
        this.dirX[i] = gx / len;
        this.dirZ[i] = gz / len;
      }
    }
  }

  /** 월드 좌표에서의 흐름 방향. out에 기록하고 도달 가능 여부를 반환. */
  sample(wx, wz, out) {
    const cx = this.toCell(wx), cz = this.toCell(wz);
    if (cx < 0 || cz < 0 || cx >= this.size || cz >= this.size) { out.x = 0; out.z = 0; return false; }
    const i = this.idx(cx, cz);
    out.x = this.dirX[i];
    out.z = this.dirZ[i];
    return !(out.x === 0 && out.z === 0);
  }

  /** 목표까지의 대략적인 경로 거리 (도달 불가면 Infinity) */
  distanceAt(wx, wz) {
    const cx = this.toCell(wx), cz = this.toCell(wz);
    if (cx < 0 || cz < 0 || cx >= this.size || cz >= this.size) return Infinity;
    const d = this.dist[this.idx(cx, cz)];
    return d >= this.INF ? Infinity : d * this.cell;
  }

  isBlocked(wx, wz) {
    const cx = this.toCell(wx), cz = this.toCell(wz);
    if (cx < 0 || cz < 0 || cx >= this.size || cz >= this.size) return true;
    return !!this.blocked[this.idx(cx, cz)];
  }
}

const NX = [1, -1, 0, 0, 1, 1, -1, -1];
const NZ = [0, 0, 1, -1, 1, -1, 1, -1];
