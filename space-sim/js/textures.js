/* ===== 절차적 표면 텍스처 생성기 =====
   실제 천체 사진을 참고한 색·패턴(대륙/구름/줄무늬/대적점/크레이터/라인아이 등)을
   구면좌표 3D 노이즈로 이음매 없이 생성한다. */
(function (root) {
  // ---------- 3D value noise ----------
  const P = new Uint8Array(512);
  (function () {
    const p = new Uint8Array(256);
    let s = 1337;
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { s = (s * 1103515245 + 12345) & 0x7fffffff; const j = s % (i + 1); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  })();
  function h3(x, y, z) { return (P[(P[(P[x & 255] + y) & 255] + z) & 255]) / 255; }
  function sm(t) { return t * t * (3 - 2 * t); }
  function vnoise(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    const fx = sm(x - X), fy = sm(y - Y), fz = sm(z - Z);
    const c000 = h3(X, Y, Z), c100 = h3(X + 1, Y, Z), c010 = h3(X, Y + 1, Z), c110 = h3(X + 1, Y + 1, Z);
    const c001 = h3(X, Y, Z + 1), c101 = h3(X + 1, Y, Z + 1), c011 = h3(X, Y + 1, Z + 1), c111 = h3(X + 1, Y + 1, Z + 1);
    const x00 = c000 + (c100 - c000) * fx, x10 = c010 + (c110 - c010) * fx;
    const x01 = c001 + (c101 - c001) * fx, x11 = c011 + (c111 - c011) * fx;
    const y0 = x00 + (x10 - x00) * fy, y1 = x01 + (x11 - x01) * fy;
    return y0 + (y1 - y0) * fz;
  }
  function fbm(x, y, z, oct, lac, gain) {
    let a = 0.5, f = 1, s = 0, n = 0;
    for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f); n += a; a *= (gain || 0.5); f *= (lac || 2.02); }
    return s / n;
  }
  function ridge(x, y, z, oct) {
    let a = 0.5, f = 1, s = 0, n = 0;
    for (let i = 0; i < oct; i++) { s += a * (1 - Math.abs(vnoise(x * f, y * f, z * f) * 2 - 1)); n += a; a *= 0.5; f *= 2.1; }
    return s / n;
  }
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }
  function ramp(stops, t) {
    t = cl(t, 0, 1);
    for (let i = 0; i < stops.length - 1; i++) {
      if (t <= stops[i + 1][0]) {
        const a = stops[i], b = stops[i + 1];
        const k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
        return mix(a[1], b[1], cl(k, 0, 1));
      }
    }
    return stops[stops.length - 1][1];
  }

  // ---------- 팔레트 (실제 천체 색 참고) ----------
  const PAL = {
    earth: [[0, [7, 22, 60]], [.38, [12, 52, 110]], [.49, [22, 96, 150]], [.505, [200, 186, 140]],
      [.55, [70, 110, 52]], [.68, [46, 88, 40]], [.8, [110, 100, 70]], [.9, [150, 140, 120]], [1, [246, 250, 252]]],
    mars: [[0, [88, 40, 26]], [.35, [140, 66, 38]], [.55, [176, 92, 50]], [.75, [201, 122, 72]], [.9, [222, 160, 110]], [1, [244, 236, 228]]],
    venus: [[0, [176, 132, 60]], [.4, [214, 176, 96]], [.7, [236, 208, 142]], [1, [250, 238, 200]]],
    crater: [[0, [58, 55, 52]], [.4, [110, 106, 100]], [.7, [156, 151, 143]], [1, [206, 202, 196]]],
    rock: [[0, [44, 38, 33]], [.4, [92, 82, 70]], [.75, [140, 126, 108]], [1, [186, 172, 152]]],
    iron: [[0, [56, 50, 44]], [.5, [122, 112, 96]], [.8, [176, 166, 148]], [1, [214, 208, 196]]],
    ice: [[0, [126, 158, 178]], [.4, [186, 212, 228]], [.75, [226, 240, 248]], [1, [255, 255, 255]]],
    desert: [[0, [110, 78, 48]], [.4, [168, 128, 78]], [.7, [206, 170, 110]], [1, [236, 214, 168]]],
    ocean: [[0, [4, 26, 62]], [.45, [12, 62, 116]], [.72, [26, 110, 160]], [.86, [180, 170, 130]], [1, [240, 246, 250]]],
    lava: [[0, [26, 12, 10]], [.35, [70, 24, 14]], [.6, [168, 52, 16]], [.82, [255, 122, 24]], [1, [255, 232, 150]]],
    io: [[0, [122, 70, 24]], [.3, [214, 168, 46]], [.55, [244, 224, 108]], [.8, [252, 244, 196]], [1, [255, 255, 236]]],
    europa: [[0, [148, 122, 96]], [.45, [212, 196, 172]], [.8, [238, 230, 216]], [1, [252, 250, 246]]],
    ganymede: [[0, [70, 62, 54]], [.42, [122, 112, 100]], [.72, [166, 158, 148]], [1, [212, 208, 202]]],
    titan: [[0, [140, 84, 22]], [.45, [198, 138, 46]], [.75, [230, 178, 84]], [1, [246, 214, 148]]],
    triton: [[0, [172, 148, 140]], [.45, [212, 196, 188]], [.8, [238, 230, 224]], [1, [252, 248, 246]]],
    pluto: [[0, [92, 66, 52]], [.35, [150, 116, 90]], [.6, [196, 168, 138]], [.85, [230, 214, 190]], [1, [250, 246, 240]]],
    ceres: [[0, [52, 48, 44]], [.45, [102, 96, 88]], [.78, [140, 134, 126]], [1, [186, 182, 176]]],
    iapetus: [[0, [26, 20, 14]], [.45, [70, 56, 40]], [.6, [150, 140, 126]], [1, [220, 216, 208]]],
    comet: [[0, [24, 22, 20]], [.45, [58, 54, 50]], [.75, [96, 92, 88]], [1, [150, 148, 146]]],
    carbon: [[0, [10, 8, 8]], [.5, [34, 26, 24]], [.8, [70, 48, 40]], [1, [120, 78, 60]]],
    bd: [[0, [40, 22, 34]], [.4, [110, 46, 40]], [.7, [178, 84, 48]], [1, [232, 150, 92]]],
    wd: [[0, [180, 210, 255]], [.6, [230, 240, 255]], [1, [255, 255, 255]]],
    ns: [[0, [150, 190, 255]], [.5, [220, 235, 255]], [1, [255, 255, 255]]]
  };

  // ---------- 캔버스 텍스처 ----------
  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* 구면 좌표 픽셀 루프 */
  function spherePaint(w, h, fn) {
    const c = makeCanvas(w, h), ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      const lat = (0.5 - (y + 0.5) / h) * Math.PI;       // +90 ~ -90
      const cy = Math.cos(lat), sy = Math.sin(lat);
      for (let x = 0; x < w; x++) {
        const lon = ((x + 0.5) / w) * Math.PI * 2;
        const px = cy * Math.cos(lon), py = sy, pz = cy * Math.sin(lon);
        const rgb = fn(px, py, pz, lat, lon);
        const i = (y * w + x) * 4;
        d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  /* 크레이터 필드 (달·수성·칼리스토) */
  function craterField(n, seed) {
    const arr = [];
    let s = seed || 7;
    const rnd = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      arr.push({ x: r * Math.cos(th), y: u, z: r * Math.sin(th), rad: 0.012 + Math.pow(rnd(), 3) * 0.13, d: 0.5 + rnd() * 0.5 });
    }
    return arr;
  }
  function craterVal(cf, px, py, pz) {
    let v = 0;
    for (let i = 0; i < cf.length; i++) {
      const c = cf[i];
      const dx = px - c.x, dy = py - c.y, dz = pz - c.z;
      const dd = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dd < c.rad) {
        const t = dd / c.rad;
        v += c.d * (t > 0.78 ? (1 - t) / 0.22 * 0.55 : -(1 - t * t) * 0.55);
      }
    }
    return v;
  }

  const cache = {};
  /* 메인: 타입별 표면 텍스처 */
  function surface(type, seed, quality) {
    const key = type + '_' + (seed | 0) + '_' + quality;
    if (cache[key]) return cache[key];
    const w = quality >= 2 ? 1024 : quality === 1 ? 512 : 256;
    const h = w / 2;
    const S = (seed || 1) * 3.13;
    let c;

    switch (type) {
      case 'earth': {
        const cf = null;
        c = spherePaint(w, h, (x, y, z, lat) => {
          const n = fbm(x * 2.1 + S, y * 2.1, z * 2.1 + S, 6);
          const detail = fbm(x * 9 + S, y * 9, z * 9, 4) * 0.16;
          let v = n + detail - 0.06;
          const ice = Math.pow(Math.abs(Math.sin(lat)), 6) * 0.55;
          v = cl(v + ice, 0, 1);
          return ramp(PAL.earth, v).map(Math.round);
        }); break;
      }
      case 'ocean': c = spherePaint(w, h, (x, y, z, lat) => {
        const v = cl(fbm(x * 2.6 + S, y * 2.6, z * 2.6, 5) * 0.75 + Math.pow(Math.abs(Math.sin(lat)), 8) * 0.4, 0, 1);
        return ramp(PAL.ocean, v).map(Math.round);
      }); break;
      case 'mars': {
        const cf = craterField(90, seed * 17 + 3);
        c = spherePaint(w, h, (x, y, z, lat) => {
          let v = fbm(x * 2.4 + S, y * 2.4, z * 2.4, 6) * 0.85 + ridge(x * 5 + S, y * 5, z * 5, 4) * 0.2;
          v += craterVal(cf, x, y, z) * 0.35;
          // 발레스 마리네리스 풍의 어두운 협곡대 + 극관
          const canyon = Math.exp(-Math.pow((lat + 0.12) * 7, 2)) * (fbm(x * 6, y * 6 + S, z * 6, 3) - 0.45);
          v -= cl(canyon, 0, 1) * 0.35;
          v = cl(v + Math.pow(Math.abs(Math.sin(lat)), 9) * 0.9, 0, 1);
          return ramp(PAL.mars, v).map(Math.round);
        }); break;
      }
      case 'venus': c = spherePaint(w, h, (x, y, z) => {
        const v = cl(fbm(x * 3.2 + S, y * 5.5, z * 3.2, 6) * 0.9 + 0.12, 0, 1);
        return ramp(PAL.venus, v).map(Math.round);
      }); break;
      case 'crater': {
        const cf = craterField(240, seed * 31 + 11);
        c = spherePaint(w, h, (x, y, z) => {
          let v = fbm(x * 3 + S, y * 3, z * 3, 5) * 0.55 + 0.32;
          v += craterVal(cf, x, y, z) * 0.6;
          const mare = fbm(x * 1.5 + S * 2, y * 1.5, z * 1.5, 3);
          if (mare < 0.42) v -= (0.42 - mare) * 1.1;
          return ramp(PAL.crater, cl(v, 0, 1)).map(Math.round);
        }); break;
      }
      case 'ceres': {
        const cf = craterField(190, seed * 13 + 5);
        c = spherePaint(w, h, (x, y, z) => {
          let v = fbm(x * 3.4 + S, y * 3.4, z * 3.4, 5) * 0.5 + 0.34 + craterVal(cf, x, y, z) * 0.6;
          return ramp(PAL.ceres, cl(v, 0, 1)).map(Math.round);
        }); break;
      }
      case 'rock': case 'iron': {
        const cf = craterField(120, seed * 7 + 2);
        const pal = type === 'iron' ? PAL.iron : PAL.rock;
        c = spherePaint(w, h, (x, y, z) => {
          let v = fbm(x * 4.5 + S, y * 4.5, z * 4.5, 6) * 0.7 + 0.24 + craterVal(cf, x, y, z) * 0.5;
          return ramp(pal, cl(v, 0, 1)).map(Math.round);
        }); break;
      }
      case 'comet': {
        const cf = craterField(150, seed * 5 + 9);
        c = spherePaint(w, h, (x, y, z) => {
          let v = fbm(x * 5 + S, y * 5, z * 5, 6) * 0.7 + 0.2 + craterVal(cf, x, y, z) * 0.6;
          return ramp(PAL.comet, cl(v, 0, 1)).map(Math.round);
        }); break;
      }
      case 'ice': c = spherePaint(w, h, (x, y, z) => {
        const v = cl(fbm(x * 4 + S, y * 4, z * 4, 6) * 0.8 + ridge(x * 8, y * 8 + S, z * 8, 4) * 0.25, 0, 1);
        return ramp(PAL.ice, v).map(Math.round);
      }); break;
      case 'desert': c = spherePaint(w, h, (x, y, z, lat) => {
        const v = cl(fbm(x * 3 + S, y * 7, z * 3, 5) * 0.8 + 0.15 + Math.pow(Math.abs(Math.sin(lat)), 10) * 0.4, 0, 1);
        return ramp(PAL.desert, v).map(Math.round);
      }); break;
      case 'lava': c = spherePaint(w, h, (x, y, z) => {
        const crust = fbm(x * 4 + S, y * 4, z * 4, 6);
        const cracks = 1 - Math.abs(fbm(x * 7 + S * 2, y * 7, z * 7, 4) * 2 - 1);
        const v = cl(crust * 0.5 + Math.pow(cracks, 5) * 1.3, 0, 1);
        return ramp(PAL.lava, v).map(Math.round);
      }); break;
      case 'carbon': c = spherePaint(w, h, (x, y, z) => {
        const v = cl(fbm(x * 4 + S, y * 6, z * 4, 5) * 0.85, 0, 1);
        return ramp(PAL.carbon, v).map(Math.round);
      }); break;
      case 'io': c = spherePaint(w, h, (x, y, z) => {
        const base = fbm(x * 3 + S, y * 3, z * 3, 5);
        const spots = fbm(x * 9 + S * 3, y * 9, z * 9, 3);
        let v = base * 0.75 + 0.25;
        if (spots < 0.36) v -= (0.36 - spots) * 2.0;   // 검은 화산 칼데라
        return ramp(PAL.io, cl(v, 0, 1)).map(Math.round);
      }); break;
      case 'europa': c = spherePaint(w, h, (x, y, z) => {
        const lin = 1 - Math.abs(fbm(x * 3.4 + S, y * 2.2, z * 3.4, 4) * 2 - 1);
        const lin2 = 1 - Math.abs(fbm(x * 7 + S * 2, y * 5, z * 7, 3) * 2 - 1);
        let v = 0.86 - Math.pow(lin, 9) * 0.75 - Math.pow(lin2, 12) * 0.45;
        return ramp(PAL.europa, cl(v, 0, 1)).map(Math.round);
      }); break;
      case 'ganymede': {
        const cf = craterField(140, seed * 23 + 4);
        c = spherePaint(w, h, (x, y, z) => {
          const groove = 1 - Math.abs(fbm(x * 6 + S, y * 3, z * 6, 4) * 2 - 1);
          let v = fbm(x * 2.4 + S, y * 2.4, z * 2.4, 5) * 0.6 + 0.3 + Math.pow(groove, 6) * 0.35 + craterVal(cf, x, y, z) * 0.4;
          return ramp(PAL.ganymede, cl(v, 0, 1)).map(Math.round);
        }); break;
      }
      case 'titan': c = spherePaint(w, h, (x, y, z, lat) => {
        const v = cl(fbm(x * 2.6 + S, y * 4.5, z * 2.6, 5) * 0.7 + 0.25 + Math.pow(Math.abs(Math.sin(lat)), 6) * 0.2, 0, 1);
        return ramp(PAL.titan, v).map(Math.round);
      }); break;
      case 'triton': c = spherePaint(w, h, (x, y, z, lat) => {
        const cant = 1 - Math.abs(fbm(x * 6 + S, y * 6, z * 6, 4) * 2 - 1);   // 칸탈루프 지형
        let v = 0.75 - Math.pow(cant, 7) * 0.5 + Math.pow(Math.abs(Math.sin(lat)), 4) * 0.3;
        return ramp(PAL.triton, cl(v, 0, 1)).map(Math.round);
      }); break;
      case 'iapetus': c = spherePaint(w, h, (x, y, z, lat, lon) => {
        const dark = cl((Math.cos(lon) + 0.15) * 1.6, 0, 1);   // 한쪽 반구만 어두움
        let v = fbm(x * 4 + S, y * 4, z * 4, 5) * 0.4 + 0.55 - dark * 0.6;
        return ramp(PAL.iapetus, cl(v, 0, 1)).map(Math.round);
      }); break;
      case 'pluto': c = spherePaint(w, h, (x, y, z, lat, lon) => {
        // 톰보 영역(하트) 근사
        const hx = Math.cos(lat) * Math.cos(lon - 3.0), hy = Math.sin(lat) + 0.1;
        const heart = Math.exp(-((hx - 0.55) * (hx - 0.55) * 6 + hy * hy * 9));
        let v = fbm(x * 3 + S, y * 3, z * 3, 5) * 0.55 + 0.28 + heart * 0.75;
        return ramp(PAL.pluto, cl(v, 0, 1)).map(Math.round);
      }); break;
      case 'gas_j': c = spherePaint(w, h, (x, y, z, lat, lon) => {
        const warp = fbm(x * 2.4 + S, y * 5.5, z * 2.4, 4) * 0.32;
        const band = Math.sin((lat + warp) * 15.5) * 0.5 + 0.5;
        const t = cl(band * 0.72 + fbm(x * 6, y * 12 + S, z * 6, 3) * 0.3, 0, 1);
        let col = ramp([[0, [122, 82, 54]], [.3, [176, 132, 92]], [.55, [214, 178, 140]], [.8, [238, 216, 190]], [1, [250, 240, 226]]], t);
        // 대적점
        const gx = Math.cos(lat) * Math.cos(lon - 2.1), gy = Math.sin(lat) + 0.32;
        const grs = Math.exp(-((gx - 0.72) * (gx - 0.72) * 24 + gy * gy * 58));
        col = mix(col, [196, 84, 52], cl(grs * 1.5, 0, 1));
        return col.map(Math.round);
      }); break;
      case 'gas_s': c = spherePaint(w, h, (x, y, z, lat) => {
        const warp = fbm(x * 2 + S, y * 5, z * 2, 4) * 0.22;
        const band = Math.sin((lat + warp) * 19) * 0.5 + 0.5;
        const t = cl(band * 0.65 + fbm(x * 5, y * 10 + S, z * 5, 3) * 0.3 + 0.08, 0, 1);
        return ramp([[0, [166, 134, 82]], [.35, [212, 184, 124]], [.65, [234, 212, 162]], [1, [250, 240, 208]]], t).map(Math.round);
      }); break;
      case 'gas_u': c = spherePaint(w, h, (x, y, z, lat) => {
        const band = Math.sin(lat * 9 + fbm(x * 2 + S, y * 3, z * 2, 3) * 0.5) * 0.5 + 0.5;
        const t = cl(band * 0.35 + 0.45 + fbm(x * 4, y * 6 + S, z * 4, 3) * 0.16, 0, 1);
        return ramp([[0, [118, 190, 200]], [.5, [160, 220, 226]], [1, [206, 240, 244]]], t).map(Math.round);
      }); break;
      case 'gas_n': c = spherePaint(w, h, (x, y, z, lat, lon) => {
        const band = Math.sin(lat * 11 + fbm(x * 2 + S, y * 4, z * 2, 3) * 0.7) * 0.5 + 0.5;
        let t = cl(band * 0.45 + 0.35 + fbm(x * 5, y * 9 + S, z * 5, 3) * 0.2, 0, 1);
        let col = ramp([[0, [22, 46, 140]], [.45, [46, 88, 200]], [.75, [92, 138, 226]], [1, [176, 208, 246]]], t);
        const dx = Math.cos(lat) * Math.cos(lon - 4.2), dy = Math.sin(lat) + 0.35;
        const spot = Math.exp(-((dx - 0.66) * (dx - 0.66) * 28 + dy * dy * 62));
        col = mix(col, [14, 26, 78], cl(spot * 1.4, 0, 1));
        return col.map(Math.round);
      }); break;
      case 'bd': c = spherePaint(w, h, (x, y, z, lat) => {
        const band = Math.sin(lat * 12 + fbm(x * 2 + S, y * 4, z * 2, 3) * 0.9) * 0.5 + 0.5;
        return ramp(PAL.bd, cl(band * 0.7 + fbm(x * 5, y * 9, z * 5, 3) * 0.35, 0, 1)).map(Math.round);
      }); break;
      case 'sun': case 'star_red': case 'star_blue': case 'wd': case 'ns': {
        const base = type === 'star_red' ? [[0, [150, 34, 6]], [.45, [232, 96, 20]], [.75, [255, 168, 60]], [1, [255, 236, 190]]]
          : type === 'star_blue' ? [[0, [96, 140, 232]], [.45, [170, 200, 255]], [.8, [226, 238, 255]], [1, [255, 255, 255]]]
            : type === 'wd' ? PAL.wd : type === 'ns' ? PAL.ns
              : [[0, [190, 66, 8]], [.4, [252, 150, 24]], [.7, [255, 208, 88]], [1, [255, 250, 224]]];
        c = spherePaint(w, h, (x, y, z) => {
          const g = fbm(x * 9 + S, y * 9, z * 9, 5);
          const g2 = fbm(x * 26 + S, y * 26, z * 26, 3);
          let v = cl(g * 0.72 + g2 * 0.42, 0, 1);
          // 흑점
          const sp = fbm(x * 3.5 + S * 2, y * 3.5, z * 3.5, 3);
          if (type === 'sun' && sp < 0.33) v -= (0.33 - sp) * 1.6;
          return ramp(base, cl(v, 0, 1)).map(Math.round);
        }); break;
      }
      case 'marble': c = spherePaint(w, h, (x, y, z) => {
        const s1 = Math.sin((x * 3 + fbm(x * 2 + S, y * 2, z * 2, 4) * 6) * 2.2) * 0.5 + 0.5;
        const t = cl(s1 * 0.8 + fbm(x * 6, y * 6 + S, z * 6, 3) * 0.35, 0, 1);
        return ramp([[0, [12, 30, 70]], [.35, [40, 150, 220]], [.55, [255, 255, 255]], [.75, [180, 90, 230]], [1, [255, 220, 120]]], t).map(Math.round);
      }); break;
      default: c = spherePaint(w, h, (x, y, z) => ramp(PAL.rock, cl(fbm(x * 4 + S, y * 4, z * 4, 5), 0, 1)).map(Math.round));
    }
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    cache[key] = tex;
    return tex;
  }

  /* 구름층 (알파) */
  function clouds(seed, quality) {
    const key = 'cloud_' + seed + '_' + quality;
    if (cache[key]) return cache[key];
    const w = quality >= 2 ? 1024 : 512, h = w / 2, S = seed * 5.7;
    const c = makeCanvas(w, h), ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      const lat = (0.5 - (y + 0.5) / h) * Math.PI, cy = Math.cos(lat), sy = Math.sin(lat);
      for (let x = 0; x < w; x++) {
        const lon = ((x + 0.5) / w) * Math.PI * 2;
        const px = cy * Math.cos(lon), py = sy, pz = cy * Math.sin(lon);
        let v = fbm(px * 3.4 + S, py * 6.5, pz * 3.4, 6);
        v = cl((v - 0.46) * 3.2, 0, 1) * (0.55 + 0.45 * Math.pow(Math.cos(lat * 1.6), 2));
        const i = (y * w + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = (v * 235) | 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); cache[key] = t; return t;
  }

  /* 고리 텍스처 (반경 방향 1D) */
  function ringTex(seed) {
    const key = 'ring_' + seed;
    if (cache[key]) return cache[key];
    const w = 512, c = makeCanvas(w, 8), ctx = c.getContext('2d');
    const img = ctx.createImageData(w, 8), d = img.data;
    for (let x = 0; x < w; x++) {
      const t = x / w;
      let a = 0.55 + 0.45 * Math.sin(t * 62 + seed) * Math.sin(t * 17.3);
      a *= cl(1 - Math.abs(t - 0.5) * 1.3, 0, 1);
      if (t > 0.44 && t < 0.49) a *= 0.12;          // 카시니 간극
      if (t < 0.08) a *= t / 0.08;
      const g = 190 + 55 * Math.sin(t * 30);
      for (let y = 0; y < 8; y++) {
        const i = (y * w + x) * 4;
        d[i] = g; d[i + 1] = g * 0.92; d[i + 2] = g * 0.76; d[i + 3] = cl(a, 0, 1) * 225;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); cache[key] = t; return t;
  }

  /* 불꽃(홍염·용암 분출) 스프라이트 */
  function flameTex(seed) {
    const key = 'flame_' + (seed | 0);
    if (cache[key]) return cache[key];
    const n = 256, c = makeCanvas(n, n), ctx = c.getContext('2d');
    const img = ctx.createImageData(n, n), d = img.data;
    const S = (seed || 1) * 7.7;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const u = x / n - 0.5, v = 1 - y / n;          // v: 0(아래) ~ 1(위)
        const spread = 0.06 + v * 0.30;
        const wob = (vnoise(v * 5 + S, S, 2.3) - 0.5) * 0.28 * v;
        let a = Math.exp(-Math.pow((u - wob) / spread, 2)) * Math.pow(1 - v, 0.55);
        a *= 0.55 + 0.75 * fbm(u * 9 + S, v * 5, 1.7, 4);
        a = cl(a, 0, 1);
        const t = cl(v * 1.25 + (1 - a) * 0.35, 0, 1);
        const col = ramp([[0, [255, 250, 225]], [.25, [255, 205, 120]], [.6, [255, 120, 40]], [1, [150, 30, 10]]], t);
        const i = (y * n + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    cache[key] = t; return t;
  }

  /* 코로나 헤일로 (부드러운 방사형 감쇠 — 경계선이 생기지 않는다) */
  function coronaTex() {
    if (cache.corona) return cache.corona;
    const n = 256, c = makeCanvas(n, n), ctx = c.getContext('2d');
    const img = ctx.createImageData(n, n), d = img.data;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = (x + 0.5) / n - 0.5, dy = (y + 0.5) / n - 0.5;
        const r = Math.sqrt(dx * dx + dy * dy) * 2;          // 0~1
        // 별 표면(0.42) 부근에서 최대, 바깥으로 지수 감쇠
        let a = 0;
        if (r < 1) {
          const inner = cl((r - 0.30) / 0.09, 0, 1);
          const outer = Math.exp(-Math.pow((r - 0.40) / 0.20, 2));
          const th = Math.atan2(dy, dx);
          const streak = 0.86 + 0.14 * Math.sin(th * 43 + r * 26) * Math.sin(th * 11 + 1.3);
          a = inner * outer * streak;
        }
        const t = cl((r - 0.3) / 0.6, 0, 1);
        const col = ramp([[0, [255, 250, 232]], [.35, [255, 214, 150]], [.7, [255, 140, 60]], [1, [140, 40, 20]]], t);
        const i = (y * n + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = cl(a, 0, 1) * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    cache.corona = t; return t;
  }

  /* 충격파 링 (초신성) */
  function shockTex() {
    if (cache.shock) return cache.shock;
    const n = 256, c = makeCanvas(n, n), ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.62, 'rgba(180,220,255,0.05)');
    g.addColorStop(0.84, 'rgba(255,240,220,0.85)');
    g.addColorStop(0.93, 'rgba(255,150,80,0.55)');
    g.addColorStop(1, 'rgba(255,80,40,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
    const t = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    cache.shock = t; return t;
  }

  /* 강착 원반 (반경 방향 그라데이션: 내부 청백색 → 외부 주황) */
  function diskTex() {
    if (cache.disk) return cache.disk;
    const w = 512, c = makeCanvas(w, 8), ctx = c.getContext('2d');
    const img = ctx.createImageData(w, 8), d = img.data;
    for (let x = 0; x < w; x++) {
      const t = x / w;
      const col = ramp([[0, [255, 255, 255]], [.12, [200, 230, 255]], [.3, [255, 220, 150]],
      [.55, [255, 150, 50]], [.8, [200, 70, 20]], [1, [60, 16, 6]]], t);
      // 안쪽이 뜨겁고 밝다 + 난류 줄무늬
      let a = Math.pow(1 - t, 1.5) * (0.55 + 0.45 * Math.sin(t * 47) * Math.sin(t * 13.7));
      a *= cl(t * 6, 0, 1);
      for (let y = 0; y < 8; y++) {
        const i = (y * w + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = cl(a, 0, 1) * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    cache.disk = t; return t;
  }

  /* 은하수 배경 (equirect) */
  function galaxy(quality) {
    const key = 'galaxy_' + quality;
    if (cache[key]) return cache[key];
    const w = quality >= 2 ? 4096 : quality === 1 ? 2048 : 1024, h = w / 2;
    const c = makeCanvas(w, h), ctx = c.getContext('2d');
    ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, w, h);
    // 은하면 밴드 + 성간 먼지
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      const v = (y / h - 0.5) * 2;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const warp = Math.sin(u * Math.PI * 2) * 0.09 + Math.sin(u * Math.PI * 4 + 1.1) * 0.03;
        const dist = Math.abs(v - warp);
        let band = Math.exp(-Math.pow(dist * 7.2, 2));
        const bulge = Math.exp(-(Math.pow((u - 0.5) * 5.5, 2) + Math.pow((v - warp) * 12, 2))) * 1.5;
        const nz = fbm(u * 22, v * 22, 3.3, 5);
        const dust = Math.pow(fbm(u * 34 + 9, v * 34, 7.7, 5), 2) * band * 1.9;
        let inten = (band * (0.42 + nz * 0.7) + bulge) * 1.15 - dust;
        inten = cl(inten, 0, 1);
        const i = (y * w + x) * 4;
        d[i] = cl(inten * 210 + bulge * 60, 0, 255);
        d[i + 1] = cl(inten * 196 + bulge * 40, 0, 255);
        d[i + 2] = cl(inten * 232 + nz * 24, 0, 255);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // 별
    let s = 99;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const N = quality >= 2 ? 20000 : quality === 1 ? 11000 : 5000;
    for (let i = 0; i < N; i++) {
      const u = rnd(), vv = rnd() * 2 - 1;
      const warp = Math.sin(u * Math.PI * 2) * 0.09;
      const cluster = Math.exp(-Math.pow((vv - warp) * 5, 2));
      if (rnd() > 0.22 + cluster * 0.85) continue;
      const x = u * w, y = (vv * 0.5 + 0.5) * h;
      const br = Math.pow(rnd(), 3.2);
      const rad = 0.3 + br * 0.55;
      const tint = rnd();
      const col = tint < 0.15 ? [255, 200, 170] : tint > 0.85 ? [190, 215, 255] : [255, 250, 240];
      ctx.globalAlpha = 0.12 + br * 0.4;
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
    }
    // 성운 얼룩
    for (let i = 0; i < (quality >= 1 ? 26 : 12); i++) {
      const u = rnd(), vv = (rnd() - 0.5) * 0.55 + Math.sin(u * Math.PI * 2) * 0.09;
      const x = u * w, y = (vv * 0.5 + 0.5) * h, r = (20 + rnd() * 120) * (w / 2048);
      const hue = rnd();
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const cc = hue < 0.4 ? '120,60,180' : hue < 0.75 ? '60,120,200' : '210,90,110';
      g.addColorStop(0, `rgba(${cc},0.3)`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    t.mapping = THREE.EquirectangularReflectionMapping;
    cache[key] = t; return t;
  }

  /* 방사형 글로우 스프라이트 */
  function glowTex(inner) {
    const key = 'glow_' + inner;
    if (cache[key]) return cache[key];
    const n = 256, c = makeCanvas(n, n), ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(inner || 0.14, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.2)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
    const t = new THREE.CanvasTexture(c); cache[key] = t; return t;
  }

  root.TEX = { surface, clouds, ringTex, diskTex, flameTex, shockTex, coronaTex, galaxy, glowTex, fbm, vnoise, clearCache: () => { for (const k in cache) delete cache[k]; } };
})(window);
