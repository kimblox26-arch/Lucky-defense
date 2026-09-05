/* ===== 물리 엔진 =====
   단위: 질량 1e24 kg / 길이 Mm(1000km) / 시간 s
   G = 6.674e-11 m^3/kg/s^2  →  6.674e-5 Mm^3/(1e24kg)/s^2 */
(function (root) {
  const G0 = 6.674e-5;
  const C_LIGHT = 299.792458;          // Mm/s
  const SB = 5.670374419e-8;           // 스테판-볼츠만
  let UID = 1;

  function Body(o) {
    this.uid = UID++;
    this.cid = o.cid || 'custom';       // 카탈로그 id
    this.label = o.label || '';
    this.cat = o.cat || 'custom';
    this.m = o.m || 1;                  // 1e24 kg
    this.r = o.r || 1;                  // Mm
    this.T = o.T != null ? o.T : 250;   // K
    this.tex = o.tex || 'rock';
    this.col = o.col != null ? o.col : 0x999999;
    this.x = Object.assign({}, o.x || {});
    this.px = o.px || 0; this.py = o.py || 0; this.pz = o.pz || 0;
    this.vx = o.vx || 0; this.vy = o.vy || 0; this.vz = o.vz || 0;
    this.ax = 0; this.ay = 0; this.az = 0;
    this.deb = !!o.deb;                 // 파편 여부
    this.alive = true;
    this.seed = o.seed != null ? o.seed : (Math.random() * 1000) | 0;
    this.spin = o.spin != null ? o.spin : (Math.random() - 0.5) * 4e-4;
    this.tilt = o.tilt != null ? o.tilt : (this.x.tilt || 0);
    this.age = 0;
    this.tidal = 0;                     // 조석 가열량 (표시용)
    this.trail = [];
    this.mesh = null;
    this.fixed = !!o.fixed;
  }
  Body.prototype.density = function () {                     // kg/m^3
    return this.m * 1e24 / ((4 / 3) * Math.PI * Math.pow(this.r * 1e6, 3));
  };
  Body.prototype.setDensity = function (rho) {
    this.r = Math.pow(this.m * 1e24 / (rho * (4 / 3) * Math.PI), 1 / 3) / 1e6;
  };
  Body.prototype.surfaceG = function () { return G0 * this.m / (this.r * this.r) * 1e6; };  // m/s^2
  Body.prototype.escapeV = function () { return Math.sqrt(2 * G0 * this.m / this.r); };     // Mm/s
  Body.prototype.speed = function () { return Math.hypot(this.vx, this.vy, this.vz); };
  Body.prototype.isStar = function () { return this.cat === 'star' || this.cat === 'wd' || this.cat === 'ns' || this.x.lum > 0; };
  Body.prototype.lum = function () {                                     // 태양광도 단위
    if (this.x.lum) return this.x.lum;
    if (!this.isStar()) return 0;
    const R = this.r * 1e6;
    return 4 * Math.PI * R * R * SB * Math.pow(this.T, 4) / 3.828e26;
  };
  Body.prototype.schwarzschild = function () { return 2 * G0 * this.m / (C_LIGHT * C_LIGHT); };

  /* ---------- 시뮬레이션 ---------- */
  function Sim() {
    this.bodies = [];
    this.debris = [];
    this.t = 0;             // 경과 시간(초)
    this.dtBase = 60;       // 실시간 1초당 시뮬 60초 (기본)
    this.timeScale = 1;
    this.paused = false;
    this.reverse = false;
    this.substeps = 4;
    this.gmul = 1;
    this.maxBodies = 220;
    this.maxDebris = 900;
    this.collisions = true;
    this.colMode = 'realistic';   // merge | bounce | shatter | realistic
    this.debrisOn = true;
    this.selfGrav = false;
    this.accretion = true;
    this.tidalHeat = true;
    this.rocheOn = true;
    this.events = [];             // {type, body, pos}
    this.softening = 1e-3;
  }
  Sim.prototype.G = function () { return G0 * this.gmul; };
  Sim.prototype.all = function () { return this.bodies.concat(this.debris); };
  Sim.prototype.add = function (b) {
    if (b.deb) { if (this.debris.length >= this.maxDebris) this.debris.shift(); this.debris.push(b); }
    else { if (this.bodies.length >= this.maxBodies) return null; this.bodies.push(b); }
    return b;
  };
  Sim.prototype.remove = function (b) {
    b.alive = false;
    const a = b.deb ? this.debris : this.bodies;
    const i = a.indexOf(b); if (i >= 0) a.splice(i, 1);
  };
  Sim.prototype.clear = function () { this.bodies.length = 0; this.debris.length = 0; this.t = 0; };
  Sim.prototype.byUid = function (u) { return this.all().find(b => b.uid === u); };

  /* 로슈 한계 (유체): d = 2.44 R_M (rho_M/rho_m)^(1/3) */
  Sim.prototype.rocheLimit = function (M, m, rigid) {
    const rM = M.density(), rm = Math.max(50, m.density());
    return (rigid ? 1.26 : 2.44) * M.r * Math.pow(rM / rm, 1 / 3);
  };

  /* 가속도 계산 */
  Sim.prototype.accel = function () {
    const B = this.bodies, D = this.debris, G = this.G(), eps = this.softening;
    for (let i = 0; i < B.length; i++) { B[i].ax = B[i].ay = B[i].az = 0; B[i]._amax = 0; B[i].dref = 0; }
    for (let i = 0; i < B.length; i++) {
      const a = B[i];
      for (let j = i + 1; j < B.length; j++) {
        const b = B[j];
        const dx = b.px - a.px, dy = b.py - a.py, dz = b.pz - a.pz;
        const d2 = dx * dx + dy * dy + dz * dz + eps;
        const inv = 1 / (d2 * Math.sqrt(d2));
        const f = G * inv;
        const fa = f * b.m, fb = f * a.m;
        a.ax += dx * fa; a.ay += dy * fa; a.az += dz * fa;
        b.ax -= dx * fb; b.ay -= dy * fb; b.az -= dz * fb;
        const d1 = Math.sqrt(d2);
        if (fa * d1 > a._amax) { a._amax = fa * d1; a.dref = d1; }
        if (fb * d1 > b._amax) { b._amax = fb * d1; b.dref = d1; }
      }
    }
    for (let k = 0; k < D.length; k++) {
      const d = D[k]; d.ax = d.ay = d.az = 0;
      for (let i = 0; i < B.length; i++) {
        const b = B[i];
        const dx = b.px - d.px, dy = b.py - d.py, dz = b.pz - d.pz;
        const d2 = dx * dx + dy * dy + dz * dz + eps;
        const f = G * b.m / (d2 * Math.sqrt(d2));
        d.ax += dx * f; d.ay += dy * f; d.az += dz * f;
      }
      if (this.selfGrav) {
        for (let j = 0; j < D.length; j++) {
          if (j === k) continue;
          const b = D[j];
          const dx = b.px - d.px, dy = b.py - d.py, dz = b.pz - d.pz;
          const d2 = dx * dx + dy * dy + dz * dz + eps;
          const f = G * b.m / (d2 * Math.sqrt(d2));
          d.ax += dx * f; d.ay += dy * f; d.az += dz * f;
        }
      }
    }
  };

  /* 속도 베를레 적분 */
  Sim.prototype.integrate = function (dt) {
    const A = this.all();
    for (let i = 0; i < A.length; i++) {
      const b = A[i]; if (b.fixed) continue;
      b.vx += b.ax * dt * 0.5; b.vy += b.ay * dt * 0.5; b.vz += b.az * dt * 0.5;
      b.px += b.vx * dt; b.py += b.vy * dt; b.pz += b.vz * dt;
    }
    this.accel();
    for (let i = 0; i < A.length; i++) {
      const b = A[i]; if (b.fixed) continue;
      b.vx += b.ax * dt * 0.5; b.vy += b.ay * dt * 0.5; b.vz += b.az * dt * 0.5;
      b.age += Math.abs(dt);
    }
  };

  /* ---------- 파편 생성 ---------- */
  Sim.prototype.spawnDebris = function (b, n, speed, massFrac, dirBias) {
    if (!this.debrisOn) return [];
    const out = [];
    const totM = b.m * (massFrac || 0.05);
    const each = totM / Math.max(1, n);
    const rho = Math.max(300, b.density());
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, rr = Math.sqrt(1 - u * u);
      let dx = rr * Math.cos(th), dy = u, dz = rr * Math.sin(th);
      if (dirBias) { dx = dx * 0.4 + dirBias[0]; dy = dy * 0.4 + dirBias[1]; dz = dz * 0.4 + dirBias[2]; const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L; }
      const sp = speed * (0.45 + Math.random() * 1.1);
      const rad = Math.pow(each * 1e24 / (rho * (4 / 3) * Math.PI), 1 / 3) / 1e6;
      const d = new Body({
        cat: 'debris', deb: true, cid: 'debris', m: each, r: Math.max(rad, b.r * 0.012),
        T: b.T * (1 + Math.random() * 0.4), tex: b.tex, col: b.col, x: { irr: 1 },
        px: b.px + dx * b.r * 1.15, py: b.py + dy * b.r * 1.15, pz: b.pz + dz * b.r * 1.15,
        vx: b.vx + dx * sp, vy: b.vy + dy * sp, vz: b.vz + dz * sp
      });
      this.add(d); out.push(d);
      this.events.push({ type: 'debris', x: d.px, y: d.py, z: d.pz });
    }
    return out;
  };

  /* 천체 파쇄: 큰 조각 여러 개 (파편이 아닌 실제 천체로) */
  Sim.prototype.shatter = function (b, n, spread, reason) {
    const parts = [];
    const rho = Math.max(300, b.density());
    n = Math.max(2, n | 0);
    // 질량 분포: 큰 조각 하나 + 나머지
    const w = [];
    let sum = 0;
    for (let i = 0; i < n; i++) { const v = Math.pow(Math.random(), 2) + 0.08; w.push(v); sum += v; }
    // 접선 방향(궤도 진행 방향) 기준으로 퍼뜨림 → 이동 경로를 따라 호(arc)를 이룬다
    const sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
    const tx = b.vx / sp, ty = b.vy / sp, tz = b.vz / sp;
    for (let i = 0; i < n; i++) {
      const mm = b.m * w[i] / sum;
      const rad = Math.pow(mm * 1e24 / (rho * (4 / 3) * Math.PI), 1 / 3) / 1e6;
      const k = (i / (n - 1) - 0.5) * 2;                 // -1..1  진행방향 오프셋
      const jx = (Math.random() - 0.5), jy = (Math.random() - 0.5), jz = (Math.random() - 0.5);
      const off = b.r * (1.1 + Math.abs(k) * 1.6);
      const crowded = this.bodies.length > this.maxBodies * 0.7;
      const p = new Body({
        cat: (b.cat === 'debris' || crowded) ? 'debris' : 'asteroid',
        deb: b.deb || crowded || rad < b.r * 0.16,
        cid: b.cid, label: b.label, m: mm, r: rad, T: b.T * 1.15, tex: b.tex, col: b.col,
        x: { irr: 1, frag: 1, from: b.cid },
        px: b.px + tx * off * k + jx * b.r * 0.9,
        py: b.py + ty * off * k + jy * b.r * 0.9,
        pz: b.pz + tz * off * k + jz * b.r * 0.9,
        vx: b.vx + tx * spread * k * 0.6 + jx * spread,
        vy: b.vy + ty * spread * k * 0.6 + jy * spread,
        vz: b.vz + tz * spread * k * 0.6 + jz * spread
      });
      this.add(p); parts.push(p);
    }
    this.events.push({ type: reason || 'shatter', x: b.px, y: b.py, z: b.pz, r: b.r });
    this.remove(b);
    return parts;
  };

  /* 합체 */
  Sim.prototype.mergeBodies = function (a, b) {
    const big = a.m >= b.m ? a : b, small = a.m >= b.m ? b : a;
    const M = a.m + b.m;
    const relv = Math.hypot(a.vx - b.vx, a.vy - b.vy, a.vz - b.vz);
    // 운동량 보존
    const vx = (a.m * a.vx + b.m * b.vx) / M, vy = (a.m * a.vy + b.m * b.vy) / M, vz = (a.m * a.vz + b.m * b.vz) / M;
    const px = (a.m * a.px + b.m * b.px) / M, py = (a.m * a.py + b.m * b.py) / M, pz = (a.m * a.pz + b.m * b.pz) / M;
    // 충돌 방향(파편은 충돌면 방향으로 뿜어져 나감)
    const dx = small.px - big.px, dy = small.py - big.py, dz = small.pz - big.pz;
    const L = Math.hypot(dx, dy, dz) || 1;
    // 부피 합 → 새 반지름
    const V = (4 / 3) * Math.PI * (Math.pow(big.r, 3) + Math.pow(small.r, 3));
    const newR = Math.pow(V / ((4 / 3) * Math.PI), 1 / 3);
    // 충돌 에너지 → 온도 상승
    const dT = Math.min(4000, relv * relv * 1e4 * (small.m / M));
    big.m = M; big.r = newR; big.T = big.T + dT;
    big.px = px; big.py = py; big.pz = pz; big.vx = vx; big.vy = vy; big.vz = vz;
    if (big.cat === 'debris' && big.m > 1e-4) { big.cat = 'asteroid'; big.deb = false; }
    this.remove(small);
    this.events.push({ type: 'merge', x: px, y: py, z: pz, r: newR, e: dT });
    // 충돌 분출물 → 원반을 이루고 강착하여 위성이 된다
    const ej = Math.min(30, Math.round(8 + (small.m / M) * 70));
    this.impactEjecta(big, [dx / L, dy / L, dz / L],
      [small.vx - big.vx, small.vy - big.vy, small.vz - big.vz], ej, Math.min(0.1, small.m / M * 0.4));
    return big;
  };

  /* 충돌 분출물: 충돌면 법선 n 과 충돌체 상대속도 t 가 이루는 평면에
     거의 원궤도 속도로 뿌려 → 파편 원반 → 강착 → 위성 형성 */
  Sim.prototype.impactEjecta = function (big, n, t, count, massFrac) {
    if (!this.debrisOn) return [];
    const out = [];
    const each = big.m * (massFrac || 0.05) / Math.max(1, count);
    const rho = Math.max(600, big.density());
    // 궤도면 법선 h = n × t
    let hx = n[1] * t[2] - n[2] * t[1], hy = n[2] * t[0] - n[0] * t[2], hz = n[0] * t[1] - n[1] * t[0];
    let hL = Math.hypot(hx, hy, hz);
    if (hL < 1e-12) { hx = 0; hy = 1; hz = 0; hL = 1; }
    hx /= hL; hy /= hL; hz /= hL;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      // 궤도면 내 기저 (n 을 h 축으로 회전)
      const bx = n[0], by = n[1], bz = n[2];
      const cx = hy * bz - hz * by, cy = hz * bx - hx * bz, cz = hx * by - hy * bx;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      let ux = bx * ca + cx * sa, uy = by * ca + cy * sa, uz = bz * ca + cz * sa;
      const uL = Math.hypot(ux, uy, uz) || 1; ux /= uL; uy /= uL; uz /= uL;
      const rr = big.r * (1.45 + Math.random() * 1.6);
      // 접선 방향 = h × u
      const tx = hy * uz - hz * uy, ty = hz * ux - hx * uz, tz = hx * uy - hy * ux;
      const vc = Math.sqrt(this.G() * big.m / rr) * (0.92 + Math.random() * 0.28);
      const rad = Math.pow(each * 1e24 / (rho * (4 / 3) * Math.PI), 1 / 3) / 1e6;
      const d = new Body({
        cat: 'debris', deb: true, cid: 'debris', m: each, r: Math.max(rad, big.r * 0.008),
        T: big.T * 1.2, tex: big.tex === 'earth' ? 'crater' : big.tex, col: big.col, x: { irr: 1 },
        px: big.px + ux * rr, py: big.py + uy * rr, pz: big.pz + uz * rr,
        vx: big.vx + tx * vc, vy: big.vy + ty * vc, vz: big.vz + tz * vc
      });
      this.add(d); out.push(d);
    }
    this.events.push({ type: 'debris', x: big.px, y: big.py, z: big.pz });
    return out;
  };

  /* 충돌 판정 & 처리 */
  Sim.prototype.collide = function () {
    if (!this.collisions) return;
    const B = this.bodies;
    for (let i = 0; i < B.length; i++) {
      const a = B[i]; if (!a.alive) continue;
      for (let j = i + 1; j < B.length; j++) {
        const b = B[j]; if (!b.alive || !a.alive) continue;
        const dx = b.px - a.px, dy = b.py - a.py, dz = b.pz - a.pz;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        // 블랙홀은 사건의 지평선 안으로 들어오면 흡수
        if (a.cat === 'bh' || b.cat === 'bh') {
          const bh = a.cat === 'bh' ? a : b, o = a.cat === 'bh' ? b : a;
          if (d < bh.r + o.r * 0.2) {
            bh.m += o.m; bh.r = Math.max(bh.r, bh.schwarzschild());
            this.events.push({ type: 'swallow', x: o.px, y: o.py, z: o.pz, r: o.r });
            this.remove(o); continue;
          }
          continue;
        }
        if (d >= a.r + b.r) continue;
        const relv = Math.hypot(a.vx - b.vx, a.vy - b.vy, a.vz - b.vz);
        const big = a.m >= b.m ? a : b, small = a.m >= b.m ? b : a;
        const vesc = Math.sqrt(2 * this.G() * (a.m + b.m) / (a.r + b.r));
        let mode = this.colMode;
        if (mode === 'realistic') {
          if (relv < vesc * 1.35) mode = 'merge';
          else if (small.m / big.m < 0.02) mode = 'merge';
          else mode = 'shatter';
        }
        if (mode === 'bounce') {
          // 탄성 반발 + 겹침 보정
          const nx = dx / (d || 1), ny = dy / (d || 1), nz = dz / (d || 1);
          const rvx = b.vx - a.vx, rvy = b.vy - a.vy, rvz = b.vz - a.vz;
          const vn = rvx * nx + rvy * ny + rvz * nz;
          if (vn < 0) {
            const e = 0.55, im = -(1 + e) * vn / (1 / a.m + 1 / b.m);
            a.vx -= im * nx / a.m; a.vy -= im * ny / a.m; a.vz -= im * nz / a.m;
            b.vx += im * nx / b.m; b.vy += im * ny / b.m; b.vz += im * nz / b.m;
          }
          const ov = (a.r + b.r - d) * 0.5;
          a.px -= nx * ov; a.py -= ny * ov; a.pz -= nz * ov;
          b.px += nx * ov; b.py += ny * ov; b.pz += nz * ov;
          this.events.push({ type: 'bounce', x: (a.px + b.px) / 2, y: (a.py + b.py) / 2, z: (a.pz + b.pz) / 2, r: small.r });
        } else if (mode === 'shatter') {
          // 고속 충돌: 둘 다 파쇄되고 대량의 파편 발생
          const sp = Math.max(relv * 0.5, Math.sqrt(this.G() * big.m / big.r) * 0.4);
          this.events.push({ type: 'bigimpact', x: small.px, y: small.py, z: small.pz, r: big.r });
          this.spawnDebris(big, 40, sp, 0.16);
          this.shatter(small, 5, sp * 0.7, 'shatter');
          if (small.m / big.m > 0.35) this.shatter(big, 6, sp * 0.5, 'shatter');
          else { big.T += Math.min(5000, relv * relv * 8e3); }
        } else {
          this.mergeBodies(a, b);
        }
      }
    }
    // 파편 vs 천체
    for (let k = this.debris.length - 1; k >= 0; k--) {
      const d = this.debris[k]; if (!d.alive) continue;
      for (let i = 0; i < B.length; i++) {
        const b = B[i]; if (!b.alive) continue;
        const dx = b.px - d.px, dy = b.py - d.py, dz = b.pz - d.pz;
        const dd = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dd < b.r + d.r) {
          b.m += d.m; this.remove(d);
          this.events.push({ type: 'dust', x: d.px, y: d.py, z: d.pz, r: d.r });
          break;
        }
      }
    }
    // 파편끼리 강착 → 위성 형성
    if (this.accretion) this.accrete();
  };

  /* 파편 강착: 가까운 파편끼리 저속 충돌 시 뭉치고, 충분히 커지면 위성이 된다 */
  Sim.prototype.accrete = function () {
    const D = this.debris;
    if (D.length < 2) return;
    const cell = {}, size = Math.max(0.02, D[0].r * 40);
    for (let i = 0; i < D.length; i++) {
      const d = D[i];
      const k = ((d.px / size) | 0) + '_' + ((d.py / size) | 0) + '_' + ((d.pz / size) | 0);
      (cell[k] || (cell[k] = [])).push(d);
    }
    for (const k in cell) {
      const g = cell[k];
      for (let i = 0; i < g.length; i++) {
        const a = g[i]; if (!a.alive) continue;
        for (let j = i + 1; j < g.length; j++) {
          const b = g[j]; if (!b.alive || !a.alive) continue;
          const dx = b.px - a.px, dy = b.py - a.py, dz = b.pz - a.pz;
          const dd = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const touch = (a.r + b.r) * 2.4;
          if (dd > touch) continue;
          const relv = Math.hypot(a.vx - b.vx, a.vy - b.vy, a.vz - b.vz);
          const vesc = Math.sqrt(2 * this.G() * (a.m + b.m) / Math.max(1e-6, a.r + b.r));
          if (relv > Math.max(vesc * 3.5, 2e-4)) continue;      // 너무 빠르면 튕겨나감
          const M = a.m + b.m;
          a.px = (a.m * a.px + b.m * b.px) / M; a.py = (a.m * a.py + b.m * b.py) / M; a.pz = (a.m * a.pz + b.m * b.pz) / M;
          a.vx = (a.m * a.vx + b.m * b.vx) / M; a.vy = (a.m * a.vy + b.m * b.vy) / M; a.vz = (a.m * a.vz + b.m * b.vz) / M;
          const rho = Math.max(300, a.density());
          a.m = M; a.r = Math.pow(M * 1e24 / (rho * (4 / 3) * Math.PI), 1 / 3) / 1e6;
          a.nAcc = (a.nAcc || 1) + (b.nAcc || 1);
          this.remove(b);
          // 충분히 많은 파편이 뭉쳐 충분히 무거워지면 위성으로 승격
          if (a.nAcc >= 3 && a.m > this.moonThreshold() && this.bodies.length < this.maxBodies * 0.85) {
            this.remove(a);
            a.alive = true; a.deb = false; a.cat = 'moon'; a.tex = a.tex === 'debris' ? 'crater' : a.tex;
            a.label = 'newmoon'; a.x = Object.assign({}, a.x, { born: 1 });
            this.bodies.push(a);
            this.events.push({ type: 'moonborn', x: a.px, y: a.py, z: a.pz, r: a.r, body: a });
          }
        }
      }
    }
  };
  Sim.prototype.moonThreshold = function () {
    let mx = 0;
    for (const b of this.bodies) if (b.m > mx) mx = b.m;
    return Math.max(1e-6, mx * 4e-3);
  };

  /* 로슈 한계 검사 → 조석 붕괴 */
  Sim.prototype.checkRoche = function () {
    if (!this.rocheOn) return;
    const B = this.bodies;
    for (let i = 0; i < B.length; i++) {
      const M = B[i]; if (!M.alive) continue;
      for (let j = 0; j < B.length; j++) {
        if (i === j) continue;
        const m = B[j];
        if (!m.alive || m.m > M.m * 0.05 || m.cat === 'bh') continue;
        const dx = m.px - M.px, dy = m.py - M.py, dz = m.pz - M.pz;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const rl = this.rocheLimit(M, m, false);
        if (d > rl) { m.tidal *= 0.96; continue; }
        // 조석 가열
        if (this.tidalHeat) {
          const s = Math.pow(rl / Math.max(d, M.r * 0.5), 3);
          m.tidal = Math.min(1, m.tidal + s * 0.004);
          m.T += s * 0.02;
        }
        const rigid = this.rocheLimit(M, m, true);
        if (d < rigid * 1.02 && d > M.r + m.r) {
          const orbv = Math.sqrt(this.G() * M.m / Math.max(d, 1e-6));
          // 이미 충분히 잘게 부서진 조각은 더 쪼개지 않고 파편(먼지 고리)으로 남는다
          if (m.r < Math.max(M.r * 0.0015, 0.02) || m.m < M.m * 1e-11 || this.bodies.length > this.maxBodies * 0.7) {
            const n = Math.max(4, Math.min(18, Math.round(m.r * 40 + 5)));
            this.spawnDebris(m, n, orbv * 0.02, 1);
            this.remove(m);
            this.events.push({ type: 'roche', x: m.px, y: m.py, z: m.pz, r: m.r, primary: M });
            return;
          }
          // 강체 로슈 한계 통과 → 산산조각, 궤도 진행 방향을 따라 호를 이룬다
          const parts = this.shatter(m, Math.min(8, 4 + Math.round(m.r * 1.5)), orbv * 0.012, 'roche');
          const n = Math.max(8, Math.min(40, Math.round(m.m * 1e3 + 12)));
          parts.forEach(p => this.spawnDebris(p, Math.max(1, Math.round(n / parts.length)), orbv * 0.02, 0.5));
          this.events.push({ type: 'roche', x: m.px, y: m.py, z: m.pz, r: m.r, primary: M });
          return;
        }
      }
    }
  };

  /* 항성 복사 → 평형 온도 */
  Sim.prototype.updateTemps = function () {
    const stars = this.bodies.filter(b => b.isStar() && b.lum() > 0);
    if (!stars.length) return;
    for (const b of this.bodies) {
      if (b.isStar() || b.cat === 'bh') continue;
      let flux = 0;
      for (const s of stars) {
        const d = Math.hypot(b.px - s.px, b.py - s.py, b.pz - s.pz) / 149600;  // AU
        if (d < 1e-9) continue;
        flux += s.lum() / (d * d);
      }
      const alb = b.tex === 'ice' ? 0.6 : b.tex === 'earth' ? 0.3 : 0.15;
      const Teq = 278.6 * Math.pow(flux * (1 - alb) / 0.7, 0.25);
      const target = Teq + (b.x.atmo ? Teq * 0.15 * b.x.atmo : 0) + b.tidal * 260;
      b.T += (target - b.T) * 0.02;
    }
  };

  /* 한 프레임 진행 */
  Sim.prototype.update = function (realDt) {
    this.events.length = 0;
    if (this.paused) return;
    const dtTot = this.dtBase * this.timeScale * realDt * (this.reverse ? -1 : 1);
    // 적응형 서브스텝: 가장 빠른 궤도 시간척도 tc = sqrt(d/a) 기준
    this.accel();
    let tmin = Infinity;
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      const a = Math.hypot(b.ax, b.ay, b.az);
      if (a > 0 && b.dref > 0) { const tc = Math.sqrt(b.dref / a); if (tc < tmin) tmin = tc; }
    }
    const cap = Math.max(1, Math.min(64, this.substeps * 8));
    let n = 1;
    if (isFinite(tmin) && tmin > 0) n = Math.ceil(Math.abs(dtTot) / (0.06 * tmin));
    n = Math.max(1, Math.min(cap, n));
    this.lastSubsteps = n;
    const dt = dtTot / n;
    for (let s = 0; s < n; s++) this.integrate(dt);
    this.t += dtTot;
    this.collide();
    this.checkRoche();
    if (this.tCounter === undefined) this.tCounter = 0;
    if (++this.tCounter % 10 === 0) this.updateTemps();
  };

  /* ---------- 궤도 유틸 ---------- */
  Sim.prototype.dominant = function (b) {
    let best = null, bestF = 0;
    for (const o of this.bodies) {
      if (o === b || !o.alive) continue;
      const d2 = Math.pow(o.px - b.px, 2) + Math.pow(o.py - b.py, 2) + Math.pow(o.pz - b.pz, 2) + 1e-9;
      const f = o.m / d2;
      if (f > bestF) { bestF = f; best = o; }
    }
    return best;
  };
  Sim.prototype.orbitElements = function (b, primary) {
    const P = primary || this.dominant(b);
    if (!P) return null;
    const mu = this.G() * (P.m + b.m);
    const rx = b.px - P.px, ry = b.py - P.py, rz = b.pz - P.pz;
    const vx = b.vx - P.vx, vy = b.vy - P.vy, vz = b.vz - P.vz;
    const r = Math.hypot(rx, ry, rz), v2 = vx * vx + vy * vy + vz * vz;
    const a = 1 / (2 / r - v2 / mu);
    const hx = ry * vz - rz * vy, hy = rz * vx - rx * vz, hz = rx * vy - ry * vx;
    const h = Math.hypot(hx, hy, hz);
    const e = Math.sqrt(Math.max(0, 1 - (h * h) / (mu * a)));
    const T = a > 0 ? 2 * Math.PI * Math.sqrt(a * a * a / mu) : Infinity;
    return { primary: P, a, e, T, r, v: Math.sqrt(v2), apo: a > 0 ? a * (1 + e) : Infinity, peri: a * (1 - e), h };
  };
  /* 원궤도 속도 벡터 (임의 경사) */
  Sim.prototype.circularVel = function (P, px, py, pz, incl) {
    const rx = px - P.px, ry = py - P.py, rz = pz - P.pz;
    const r = Math.hypot(rx, ry, rz) || 1;
    const v = Math.sqrt(this.G() * P.m / r);
    let ux = 0, uy = 1, uz = 0;
    if (Math.abs(ry / r) > 0.95) { ux = 1; uy = 0; }
    if (incl) { const c = Math.cos(incl), s = Math.sin(incl); const t = uy; uy = t * c - uz * s; uz = t * s + uz * c; }
    let tx = uy * rz - uz * ry, ty = uz * rx - ux * rz, tz = ux * ry - uy * rx;
    const L = Math.hypot(tx, ty, tz) || 1;
    return { x: P.vx + tx / L * v, y: P.vy + ty / L * v, z: P.vz + tz / L * v };
  };
  Sim.prototype.totalEnergy = function () {
    let K = 0, U = 0, G = this.G();
    const B = this.bodies;
    for (let i = 0; i < B.length; i++) {
      const a = B[i]; K += 0.5 * a.m * (a.vx * a.vx + a.vy * a.vy + a.vz * a.vz);
      for (let j = i + 1; j < B.length; j++) {
        const b = B[j], d = Math.hypot(b.px - a.px, b.py - a.py, b.pz - a.pz) + 1e-9;
        U -= G * a.m * b.m / d;
      }
    }
    return { K, U, E: K + U };
  };
  Sim.prototype.centerOfMass = function () {
    let M = 0, x = 0, y = 0, z = 0;
    for (const b of this.bodies) { M += b.m; x += b.m * b.px; y += b.m * b.py; z += b.m * b.pz; }
    return M ? { x: x / M, y: y / M, z: z / M, M } : { x: 0, y: 0, z: 0, M: 0 };
  };

  root.PHYS = { Body, Sim, G0, C_LIGHT };
})(window);
