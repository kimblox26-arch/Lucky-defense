/* ===== 시나리오(프리셋) 구성 ===== */
(function (root) {
  const AU = 149600;   // Mm

  function make(id, over) {
    const c = CAT_BY_ID[id];
    const o = Object.assign({
      cid: c.id, cat: c.cat, m: c.m, r: c.r, T: c.T, tex: c.tex, col: c.col,
      x: Object.assign({}, c.x), p: c.p
    }, over || {});
    return new PHYS.Body(o);
  }

  function orbit(sim, b, P, dist, incl, ecc, phase) {
    const ph = phase != null ? phase : Math.random() * 6.2832;
    const i = incl || 0;
    const x = Math.cos(ph) * dist, z = Math.sin(ph) * dist, y = Math.sin(ph) * dist * Math.sin(i);
    b.px = P.px + x; b.py = P.py + y; b.pz = P.pz + z;
    const v = sim.circularVel(P, b.px, b.py, b.pz, i) ;
    const k = ecc ? Math.sqrt(1 - (ecc || 0)) : 1;
    b.vx = P.vx + (v.x - P.vx) * k; b.vy = P.vy + (v.y - P.vy) * k; b.vz = P.vz + (v.z - P.vz) * k;
    return b;
  }

  function add(sim, id, P, dist, opt) {
    opt = opt || {};
    const b = make(id, opt.over);
    sim.add(b);
    if (P) orbit(sim, b, P, dist, opt.incl, opt.ecc, opt.phase);
    return b;
  }

  const S = {
    empty(sim) { sim.clear(); },

    solar(sim) {
      sim.clear();
      const sun = add(sim, 'sun'); sun.fixed = false;
      const P = {};
      [['mercury', 0.387, 0.12], ['venus', 0.723, 0.06], ['earth', 1, 0], ['mars', 1.524, 0.03],
      ['jupiter', 5.203, 0.02], ['saturn', 9.537, 0.04], ['uranus', 19.19, 0.01], ['neptune', 30.07, 0.03],
      ['pluto', 39.48, 0.3]].forEach(([id, au, inc]) => { P[id] = add(sim, id, sun, au * AU, { incl: inc }); });
      add(sim, 'moon', P.earth, 384.4, { incl: 0.09 });
      add(sim, 'phobos', P.mars, 9.376);
      add(sim, 'deimos', P.mars, 23.46);
      ['io', 'europa', 'ganymede', 'callisto'].forEach(id => add(sim, id, P.jupiter, CAT_BY_ID[id].x.d));
      ['mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus'].forEach(id => add(sim, id, P.saturn, CAT_BY_ID[id].x.d));
      ['miranda', 'ariel', 'umbriel', 'titania', 'oberon'].forEach(id => add(sim, id, P.uranus, CAT_BY_ID[id].x.d, { incl: 1.6 }));
      add(sim, 'triton', P.neptune, 354.8, { incl: 0.4 });
      add(sim, 'charon', P.pluto, 19.6);
      add(sim, 'ceres', sun, 2.77 * AU, { incl: 0.18 });
      add(sim, 'vesta', sun, 2.36 * AU, { incl: 0.12 });
      add(sim, 'halley', sun, 3 * AU, { incl: 2.9, ecc: 0.9 });
      // 소행성대 (파편)
      for (let i = 0; i < 160; i++) {
        const a = (2.1 + Math.random() * 1.2) * AU, ph = Math.random() * 6.2832, inc = (Math.random() - 0.5) * 0.2;
        const b = new PHYS.Body({
          cat: 'debris', deb: true, cid: 'debris', m: 1e-9 * Math.random(), r: 0.4 + Math.random() * 1.6,
          T: 180, tex: 'rock', col: 0x8a7f70, x: { irr: 1 },
          px: sun.px + Math.cos(ph) * a, py: sun.py + Math.sin(inc) * a * 0.4, pz: sun.pz + Math.sin(ph) * a
        });
        const v = sim.circularVel(sun, b.px, b.py, b.pz, 0);
        b.vx = v.x; b.vy = v.y; b.vz = v.z;
        sim.add(b);
      }
      return { focus: P.earth, dist: 62 };
    },

    earthMoon(sim) {
      sim.clear();
      const e = add(sim, 'earth');
      const m = add(sim, 'moon', e, 384.4, { incl: 0.09 });
      return { focus: e, dist: 900 };
    },

    jupiter(sim) {
      sim.clear();
      const j = add(sim, 'jupiter');
      ['io', 'europa', 'ganymede', 'callisto', 'amalthea'].forEach(id => add(sim, id, j, CAT_BY_ID[id].x.d, { incl: (Math.random() - .5) * .05 }));
      return { focus: j, dist: 4000 };
    },

    saturn(sim) {
      sim.clear();
      const s = add(sim, 'saturn');
      ['mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus', 'hyperion'].forEach(id => add(sim, id, s, CAT_BY_ID[id].x.d));
      return { focus: s, dist: 3000 };
    },

    binary(sim) {
      sim.clear();
      const d = 0.12 * AU;
      const a = add(sim, 'alphacenA'); const b = add(sim, 'alphacenB');
      const M = a.m + b.m;
      a.px = -d * b.m / M; b.px = d * a.m / M;
      const v = Math.sqrt(sim.G() * M / d);
      a.vz = -v * b.m / M; b.vz = v * a.m / M;
      // 주위를 도는 행성
      const p = add(sim, 'c_terra'); p.px = 2.4 * AU;
      const vv = Math.sqrt(sim.G() * M / (2.4 * AU)); p.vz = vv;
      return { focus: a, dist: 0.4 * AU };
    },

    blackhole(sim) {
      sim.clear();
      const bh = add(sim, 'bh_stellar');
      const star = add(sim, 'c_star', bh, 40, { over: { m: 2e6, r: 8 } });
      for (let i = 0; i < 420; i++) {
        const rr = 0.6 + Math.pow(Math.random(), 0.6) * 26;
        const ph = Math.random() * 6.2832, h = (Math.random() - 0.5) * rr * 0.03;
        const b = new PHYS.Body({
          cat: 'debris', deb: true, cid: 'debris', m: 1e-12, r: 0.004 + Math.random() * 0.012,
          T: 4000 + 20000 / rr, tex: 'lava', col: 0xffaa55, x: {},
          px: Math.cos(ph) * rr, py: h, pz: Math.sin(ph) * rr
        });
        const v = sim.circularVel(bh, b.px, b.py, b.pz, 0);
        b.vx = v.x * (0.97 + Math.random() * 0.05); b.vy = v.y; b.vz = v.z * (0.97 + Math.random() * 0.05);
        sim.add(b);
      }
      return { focus: bh, dist: 60 };
    },

    /* 로슈 한계 실험: 위성이 서서히 안으로 끌려들어가 붕괴 */
    roche(sim) {
      sim.clear();
      const j = add(sim, 'saturn');
      // 밀도가 낮은 잔해더미형 위성 (로슈 한계가 행성 표면보다 훨씬 바깥)
      const over = { r: 0.30, tex: 'ice', label: '' };
      const probe = make('mimas', over);
      const rigid = sim.rocheLimit(j, probe, true);      // 강체 로슈 한계
      const fluid = sim.rocheLimit(j, probe, false);     // 유체 로슈 한계
      // ① 강체 한계 바로 안쪽의 원궤도 → 즉시 조석 붕괴하여 고리를 이룬다
      const d1 = Math.max(j.r * 1.25, rigid * 0.94);
      add(sim, 'mimas', j, d1, { phase: 0, over: over });
      // ② 유체 한계 바깥의 안정 궤도 (비교용)
      add(sim, 'enceladus', j, fluid * 1.5, { phase: 2.1 });
      // ③ 타원 궤도로 접근하다 근점에서 붕괴하는 혜성
      const c = add(sim, 'sl9', j, fluid * 2.6, { incl: 0.3 });
      c.vx = j.vx + (c.vx - j.vx) * 0.45; c.vy = j.vy + (c.vy - j.vy) * 0.45; c.vz = j.vz + (c.vz - j.vz) * 0.45;
      return { focus: j, dist: 900 };
    },

    /* 충돌 → 파편 → 위성 형성 (테이아 충돌 시나리오) */
    moonmake(sim) {
      sim.clear();
      sim.accretion = true; sim.debrisOn = true;
      const e = add(sim, 'earth');
      const th = make('c_terra', { m: 0.7, r: 3.4, label: 'Theia', col: 0xb06a4a, tex: 'lava', T: 1400 });
      th.px = -70; th.py = 6; th.pz = -34;
      th.vx = 0.0072; th.vz = 0.0035;
      sim.add(th);
      return { focus: e, dist: 220 };
    },

    trappist(sim) {
      sim.clear();
      const s = add(sim, 'trappist1');
      [['trap1b', 0.01154], ['trap1c', 0.01580], ['trap1d', 0.02227], ['trap1e', 0.02925],
      ['trap1f', 0.03849], ['trap1g', 0.04683], ['trap1h', 0.06189]].forEach(([id, au]) => add(sim, id, s, au * AU));
      return { focus: s, dist: 0.05 * AU };
    },

    chaos(sim) {
      sim.clear();
      const ids = ['sun', 'proxima', 'siriusA', 'vega', 'barnard', 'alphacenA', 'alphacenB'];
      for (let i = 0; i < 7; i++) {
        const b = make(ids[i % ids.length]);
        const rr = 3000 + Math.random() * 30000, ph = Math.random() * 6.2832;
        b.px = Math.cos(ph) * rr; b.py = (Math.random() - .5) * rr * 0.4; b.pz = Math.sin(ph) * rr;
        const v = 0.02 + Math.random() * 0.03;
        b.vx = -Math.sin(ph) * v; b.vz = Math.cos(ph) * v;
        sim.add(b);
      }
      for (let i = 0; i < 40; i++) {
        const b = make(Math.random() < .5 ? 'c_terra' : 'c_gas');
        const rr = 2000 + Math.random() * 30000, ph = Math.random() * 6.2832;
        b.px = Math.cos(ph) * rr; b.py = (Math.random() - .5) * rr * 0.5; b.pz = Math.sin(ph) * rr;
        const v = 0.02 + Math.random() * 0.04;
        b.vx = -Math.sin(ph) * v * (0.6 + Math.random()); b.vz = Math.cos(ph) * v;
        sim.add(b);
      }
      return { focus: null, dist: 40000 };
    },

    /* 구슬 상자: 똑같은 구슬 천체들이 서로 중력으로 뭉친다 */
    marble(sim) {
      sim.clear();
      // 중앙의 빛나는 구슬 항성
      const core = make('c_star', { m: 5200, r: 30, T: 5600, col: 0xffe6b4, x: { lum: 1.2, glow: 1.3 } });
      core.label = '';
      sim.add(core);
      const N = 62, list = [];
      for (let i = 0; i < N; i++) {
        const b = make('c_marble', {
          m: 3 + Math.random() * 7, r: 13 + Math.random() * 13,
          seed: (Math.random() * 999) | 0,
          col: [0x66ddff, 0xff8ad0, 0xffe08a, 0x9d7bff, 0x8affc0, 0xff7f7f, 0x7fa8ff][i % 7]
        });
        const rr = 150 + Math.pow(Math.random(), 0.75) * 520;
        const u = (Math.random() - 0.5) * 0.42, ph = Math.random() * 6.2832;
        b.px = Math.cos(ph) * rr; b.py = u * rr * 0.3; b.pz = Math.sin(ph) * rr;
        list.push([b, rr]);
        sim.add(b);
      }
      // 내부 질량 기준 원궤도 → 서로 부딪히지 않고 도는 구슬 성단
      list.forEach(([b, rr]) => {
        let Min = core.m;
        list.forEach(([o, r2]) => { if (r2 < rr) Min += o.m; });
        const v = Math.sqrt(sim.G() * Min / rr);
        const L = Math.hypot(b.px, b.pz) || 1;
        b.vx = -b.pz / L * v; b.vz = b.px / L * v;
        b.vy = (Math.random() - 0.5) * v * 0.04;
      });
      return { focus: null, dist: 1150 };
    },

    /* 초신성: 수명이 거의 다한 거대 항성 + 주변 행성계 */
    supernova(sim) {
      sim.clear();
      sim.evolution = true;
      const st = make('rigel', { m: 21 * 1988400, r: 78.9 * 696.34 });
      st.r0 = st.r; st.T0 = st.T;
      st.stellarAge = sim.stellarLifetime(st) * 0.9985;   // 곧 폭발
      sim.add(st);
      [['c_gas', 4], ['c_terra', 7], ['c_ice', 11], ['c_rock', 15]].forEach(([id, au], i) =>
        add(sim, id, st, au * AU, { incl: (Math.random() - .5) * .1, phase: i * 1.6 }));
      return { focus: st, dist: 3.2 * AU };
    },

    /* 블랙홀 조석 파괴: 별이 블랙홀에 다가가 찢기며 강착 원반이 된다 */
    tde(sim) {
      sim.clear();
      const bh = add(sim, 'bh_stellar', null, 0, { over: { m: 12 * 1988400 } });
      bh.r = bh.schwarzschild(); bh.fixed = true;
      // 조석 반경 근처를 지나는 타원 궤도의 항성
      const star = make('c_star', { m: 0.8 * 1988400, r: 0.9 * 696.34, T: 5200 });
      const Rt = star.r * Math.pow(2 * bh.m / star.m, 1 / 3);
      const r0 = Rt * 1.9;
      star.px = r0; star.py = 0; star.pz = 0;
      const vc = Math.sqrt(sim.G() * bh.m / r0);
      star.vz = vc * 0.55; star.vx = -vc * 0.35;   // 근점이 조석 반경 안쪽인 타원 궤도
      sim.add(star);
      // 이미 존재하는 파편 원반 (강착 진행 중)
      for (let i = 0; i < 260; i++) {
        const rr = bh.r * (6 + Math.pow(Math.random(), 0.6) * 90);
        const ph = Math.random() * 6.2832, h = (Math.random() - 0.5) * rr * 0.04;
        const d = new PHYS.Body({
          cat: 'debris', deb: true, cid: 'debris', m: 1e-10, r: bh.r * 0.09,
          T: 6000, tex: 'lava', col: 0xffb060, x: { hot: 1, irr: 1 },
          px: Math.cos(ph) * rr, py: h, pz: Math.sin(ph) * rr
        });
        const v = sim.circularVel(bh, d.px, d.py, d.pz, 0);
        d.vx = v.x * (0.98 + Math.random() * 0.04); d.vy = v.y; d.vz = v.z * (0.98 + Math.random() * 0.04);
        sim.add(d);
      }
      return { focus: bh, dist: bh.r * 220 };
    },

    random(sim) {
      sim.clear();
      const starIds = ['sun', 'proxima', 'siriusA', 'alphacenA', 'barnard', 'vega', 'kepler452', 'trappist1'];
      const st = add(sim, starIds[(Math.random() * starIds.length) | 0]);
      const n = 4 + (Math.random() * 7) | 0;
      const pool = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
        'c_terra', 'c_ocean', 'c_desert', 'c_ice', 'c_lava', 'c_gas', 'c_ring', 'k218b', 'kepler452b'];
      let a = 0.25 + Math.random() * 0.4;
      for (let i = 0; i < n; i++) {
        const id = pool[(Math.random() * pool.length) | 0];
        const p = add(sim, id, st, a * AU, { incl: (Math.random() - 0.5) * 0.2, ecc: Math.random() * 0.15 });
        if (Math.random() < 0.5) {
          const mid = ['moon', 'europa', 'titan', 'c_rock', 'enceladus'][(Math.random() * 5) | 0];
          add(sim, mid, p, p.r * (6 + Math.random() * 30));
        }
        a *= 1.5 + Math.random() * 0.7;
      }
      return { focus: st, dist: a * AU * 0.5 };
    }
  };

  root.SCEN = S;
  root.mkBody = make;
  root.AU_MM = AU;
  root.placeOrbit = orbit;
})(window);
