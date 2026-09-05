/* ===== 실사 텍스처 (실제 탐사선 촬영 자료 기반 표면 맵) =====
   출처: NASA/JPL·USGS·ESA 공개 자료를 정리한 Stellarium 텍스처,
        Planet Pixel Emporium(실제 탐사선 모자이크 기반), NASA Blue Marble / City Lights,
        은하수 전천 파노라마. 자세한 내용은 tex/CREDITS.md */
(function (root) {
  const DIR = 'tex/';
  const cache = {};
  let loader = null, pending = 0, done = 0, onProg = null;

  const LINEAR = { earth_bump: 1, moon_bump: 1, mars_bump: 1, mercury_bump: 1, venus_bump: 1, earth_spec: 1, earth_clouds: 1 };
  /* 내장 데이터 팩이 있으면 그것을 쓴다 (file:// 에서도 CORS 없이 동작) */
  function url(name) {
    if (root.TEXDATA && root.TEXDATA[name]) return root.TEXDATA[name];
    return DIR + name + (name.indexOf('rings') === 0 ? '.png' : '.jpg');
  }

  function tex(name) {
    if (!name) return null;
    if (cache[name]) return cache[name];
    pending++;
    loader = loader || new THREE.TextureLoader();
    const t = loader.load(url(name),
      () => { done++; if (onProg) onProg(done, pending); },
      undefined,
      () => { done++; if (onProg) onProg(done, pending); });
    t.anisotropy = 8;
    t.wrapS = THREE.RepeatWrapping;
    if (!LINEAR[name] && THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    cache[name] = t;
    return t;
  }

  /* 실제 표면 맵이 존재하는 천체 (카탈로그 id 기준) */
  const REAL = {
    sun: { map: 'sun', star: 1 },
    mercury: { map: 'mercury', bump: 'mercury_bump', bs: 0.012, disp: 0.0037 },
    venus: { map: 'venus', bump: 'venus_bump', bs: 0.01, disp: 0.0023 },
    earth: { map: 'earth', bump: 'earth_bump', bs: 0.014, disp: 0.0031, spec: 'earth_spec', night: 'earth_night', clouds: 'earth_clouds' },
    moon: { map: 'moon', bump: 'moon_bump', bs: 0.018, disp: 0.0104 },
    mars: { map: 'mars', bump: 'mars_bump', bs: 0.016, disp: 0.0088 },
    jupiter: { map: 'jupiter' },
    saturn: { map: 'saturn', ring: 'rings_saturn', ri: 1.13, ro: 2.32 },
    uranus: { map: 'uranus', ring: 'rings_uranus', ri: 1.62, ro: 2.02 },
    neptune: { map: 'neptune', ring: 'rings_neptune', ri: 1.7, ro: 2.5 },
    pluto: { map: 'pluto' }, charon: { map: 'charon' },
    phobos: { map: 'phobos' }, deimos: { map: 'deimos' },
    io: { map: 'io' }, europa: { map: 'europa' }, ganymede: { map: 'ganymede' }, callisto: { map: 'callisto' },
    amalthea: { map: 'amalthea' },
    mimas: { map: 'mimas' }, enceladus: { map: 'enceladus' }, tethys: { map: 'tethys' }, dione: { map: 'dione' },
    rhea: { map: 'rhea' }, titan: { map: 'titan' }, hyperion: { map: 'hyperion' }, iapetus: { map: 'iapetus' },
    phoebe: { map: 'phoebe' },
    miranda: { map: 'miranda' }, ariel: { map: 'ariel' }, umbriel: { map: 'umbriel' },
    titania: { map: 'titania' }, oberon: { map: 'oberon' },
    triton: { map: 'triton' }, nereid: { map: 'nereid' }, proteus: { map: 'proteus' },
    ceres: { map: 'ceres' }, vesta: { map: 'vesta' }, eris: { map: 'eris' }, haumea: { map: 'haumea' },
    sedna: { map: 'sedna' }, bennu: { map: 'bennu' }, eros: { map: 'eros' }, gaspra: { map: 'gaspra' },
    ida: { map: 'ida' }
  };

  /* 실사 맵이 없는 천체 → 물리적으로 가장 닮은 실제 천체의 사진을 사용 (+색조 보정) */
  const ALIAS = {
    // 왜소행성·소행성·혜성
    makemake: 'eris', gonggong: 'haumea', quaoar: 'sedna', orcus: 'charon', salacia: 'eris',
    varuna: 'sedna', ixion: 'sedna',
    pallas: 'vesta', hygiea: 'ceres', psyche: 'ida', mathilde: 'bennu', lutetia: 'gaspra',
    itokawa: 'eros', ryugu: 'bennu', apophis: 'eros', chariklo: 'phoebe', chiron: 'phoebe',
    halley: 'bennu', halebopp: 'bennu', c67p: 'bennu', encke: 'bennu', neowise: 'bennu',
    sl9: 'bennu', oumuamua: 'eros', borisov: 'bennu',
    meteor_s: 'ida', meteor_m: 'ida', meteor_iron: 'ida', chelyabinsk: 'eros',
    tunguska: 'bennu', chicxulub: 'eros',
    // 외계행성 (가장 닮은 실제 천체)
    proximab: 'mars', proximac: 'neptune',
    trap1b: 'io', trap1c: 'venus', trap1d: 'mars', trap1e: 'earth', trap1f: 'europa',
    trap1g: 'enceladus', trap1h: 'callisto',
    kepler186f: 'mars', kepler452b: 'earth', kepler22b: 'earth', kepler16b: 'uranus',
    gliese581g: 'mars', gj1214b: 'neptune', k218b: 'uranus', c55e: 'io',
    hd209458b: 'jupiter', hd189733b: 'neptune', peg51b: 'jupiter', wasp12b: 'jupiter',
    wasp121b: 'io', kelt9b: 'io', methuselah: 'jupiter', hd106906b: 'jupiter',
    // 항성·왜성 (실제 태양 광구 + 온도별 색)
    proxima: 'sun', alphacenA: 'sun', alphacenB: 'sun', siriusA: 'sun', vega: 'sun', altair: 'sun',
    arcturus: 'sun', aldebaran: 'sun', pollux: 'sun', capella: 'sun', polaris: 'sun',
    betelgeuse: 'sun', antares: 'sun', rigel: 'sun', deneb: 'sun', spica: 'sun',
    vycma: 'sun', uyscuti: 'sun', etacar: 'sun', r136a1: 'sun', barnard: 'sun',
    trappist1: 'sun', kepler452: 'sun', siriusB: 'sun', procyonB: 'sun', vanmaanen: 'sun',
    ns_generic: 'sun', crabpulsar: 'sun', j0740: 'sun', magnetar: 'sun', b1919: 'sun',
    luhman16a: 'jupiter', wise0855: 'jupiter', m1207: 'jupiter', teide1: 'jupiter',
    // 사용자 정의
    c_terra: 'earth', c_ocean: 'earth', c_desert: 'mars', c_ice: 'europa', c_lava: 'io',
    c_gas: 'jupiter', c_ring: 'saturn', c_rock: 'eros', c_iron: 'ida', c_star: 'sun'
  };

  /* 절차적 표면 타입 → 실제 천체 사진 (표면 종류를 직접 바꿨을 때) */
  const BYTEX = {
    earth: 'earth', ocean: 'earth', desert: 'mars', mars: 'mars', venus: 'venus',
    crater: 'moon', rock: 'eros', iron: 'ida', ice: 'europa', lava: 'io', comet: 'bennu',
    carbon: 'bennu', ceres: 'ceres', io: 'io', europa: 'europa', ganymede: 'ganymede',
    titan: 'titan', triton: 'triton', iapetus: 'iapetus', pluto: 'pluto',
    gas_j: 'jupiter', gas_s: 'saturn', gas_u: 'uranus', gas_n: 'neptune', bd: 'jupiter',
    sun: 'sun', star_red: 'sun', star_blue: 'sun', wd: 'sun', ns: 'sun',
    mercury: 'mercury', moon: 'moon', jupiter: 'jupiter', saturn: 'saturn',
    uranus: 'uranus', neptune: 'neptune', charon: 'charon', vesta: 'vesta', eris: 'eris'
  };

  /* 흑체 복사 색 (항성 온도 → RGB) */
  function blackbody(T) {
    T = Math.max(1000, Math.min(40000, T)) / 100;
    let r, g, b;
    if (T <= 66) { r = 255; g = 99.47 * Math.log(T) - 161.12; }
    else { r = 329.7 * Math.pow(T - 60, -0.1332); g = 288.12 * Math.pow(T - 60, -0.0755); }
    if (T >= 66) b = 255;
    else if (T <= 19) b = 0;
    else b = 138.52 * Math.log(T - 10) - 305.04;
    const c = v => Math.max(0, Math.min(255, v)) / 255;
    return [c(r), c(g), c(b)];
  }

  /* 천체 → 사용할 실사 맵 정보 */
  function forBody(b) {
    if (!b) return null;
    let key = null;
    if (b.x && b.x.texOverride && BYTEX[b.tex]) key = BYTEX[b.tex];
    if (!key && REAL[b.cid]) key = b.cid;
    if (!key && ALIAS[b.cid]) key = ALIAS[b.cid];
    if (!key && BYTEX[b.tex]) key = BYTEX[b.tex];
    if (!key) return null;
    const base = REAL[key];
    if (!base) return null;
    const r = Object.assign({}, base);
    // 원래 천체가 아닌 대체 사진이면 카탈로그 색으로 색조 보정
    r.alias = (key !== b.cid);
    if (b.isStar && b.isStar()) {
      const bb = blackbody(b.T || 5772);
      r.tint = bb; r.star = 1;
    } else if (r.alias) {
      r.tint = null;
      if (b.cat === 'exo' || b.cat === 'custom' || b.cat === 'bd') r.tintCol = b.col;
    }
    return r;
  }

  root.REALTEX = {
    dir: DIR, url, REAL, ALIAS, BYTEX, forBody, tex, blackbody,
    keys: Object.keys(REAL),
    setProgress(fn) { onProg = fn; },
    /* 전체 선행 로딩 (완료 시 cb 1회 호출) */
    preload(cb) {
      const names = [];
      Object.keys(REAL).forEach(k => {
        const r = REAL[k];
        ['map', 'bump', 'spec', 'night', 'clouds', 'ring'].forEach(f => { if (r[f]) names.push(r[f]); });
      });
      names.push('milkyway');
      const uniq = Array.from(new Set(names));
      uniq.forEach(nm => tex(nm));
      let fired = false, tries = 0;
      const finish = () => { if (!fired) { fired = true; if (cb) cb(); } };
      const iv = setInterval(() => {
        tries++;
        let ok = 0;
        uniq.forEach(nm => { const t = cache[nm]; if (t && t.image && (t.image.complete || t.image.width)) ok++; });
        if (onProg) onProg(ok, uniq.length);
        if (ok >= uniq.length || tries > 250) { clearInterval(iv); finish(); }
      }, 80);
    }
  };
})(window);
