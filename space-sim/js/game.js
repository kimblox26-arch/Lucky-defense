/* ===== Marble Cosmos — 메인 게임 로직 ===== */
(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const AU = 149600;

  const G = {
    sim: null, ren: null, sel: null, tool: 'select', running: false,
    started: false, lastT: 0, fps: 60, frames: 0, fpsT: 0,
    spawnPick: 'earth', autoOrbit: true, measure: [], hoverBody: null,
    st: {   // 설정
      quality: 1, sizeScale: 1, trails: true, trailLen: 260, labels: true, marble: true,
      substeps: 4, gmul: 1, maxBodies: 220, colMode: 'realistic', debris: true,
      selfGrav: false, accretion: true, tidal: true, sound: true, showFps: true, glow: true
    }
  };
  window.G = G;

  /* ---------- 단위 표기 ---------- */
  const U = window.UNITS;
  function fmtMass(m) {                                  // m: 1e24 kg
    if (m >= U.MS * 0.05) return (m / U.MS).toFixed(m / U.MS < 10 ? 2 : 0) + ' M☉';
    if (m >= U.MJ * 0.1) return (m / U.MJ).toFixed(2) + ' M♃';
    if (m >= 0.01) return (m / U.ME).toFixed(m / U.ME < 10 ? 3 : 1) + ' M⊕';
    return (m * 1e24).toExponential(2) + ' kg';
  }
  function fmtDist(d) {                                  // d: Mm
    const km = d * 1000;
    if (d > 6.3e10) return (d / 9.461e12 * 1e3).toFixed(3) + ' ly';
    if (d > AU * 0.02) return (d / AU).toFixed(3) + ' AU';
    if (km >= 1e6) return (km / 1e6).toFixed(3) + ' M km';
    if (km >= 1) return km.toFixed(km < 100 ? 2 : 0) + ' km';
    return (km * 1000).toFixed(1) + ' m';
  }
  function fmtTime(s) {
    const a = Math.abs(s);
    if (a < 120) return s.toFixed(1) + ' s';
    if (a < 7200) return (s / 60).toFixed(1) + ' min';
    if (a < 172800) return (s / 3600).toFixed(1) + ' h';
    if (a < 3.15e7) return (s / 86400).toFixed(1) + ' d';
    if (a < 3.15e10) return (s / 3.156e7).toFixed(2) + ' yr';
    return (s / 3.156e7).toExponential(2) + ' yr';
  }
  function fmtVel(v) { return (v * 1000).toFixed(v * 1000 < 10 ? 3 : 2) + ' km/s'; }
  function fmtTemp(t) { return Math.round(t) + ' K (' + Math.round(t - 273.15) + '°C)'; }
  function hex(c) { return '#' + ('000000' + (c >>> 0).toString(16)).slice(-6); }

  /* ---------- 토스트 ---------- */
  let toastT = 0;
  function toast(msg, ms) {
    if (!G.started) return;
    const el = document.createElement('div');
    el.className = 'tt'; el.textContent = msg;
    $('#toast').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = 0; setTimeout(() => el.remove(), 320); }, ms || 1700);
    while ($('#toast').children.length > 4) $('#toast').firstChild.remove();
  }
  G.toast = toast;

  /* ---------- 사운드 (WebAudio, 가벼운 효과음) ---------- */
  let AC = null, audioOK = false;
  function enableAudio() {
    audioOK = true;
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {}
  }
  function beep(freq, dur, type, vol) {
    if (!G.st.sound || !audioOK || !G.started) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, AC.currentTime);
      g.gain.linearRampToValueAtTime(vol || 0.06, AC.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + (dur || 0.18));
      o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + (dur || 0.18) + 0.02);
    } catch (e) {}
  }

  /* ---------- 시간 배속 ---------- */
  const SPEEDS = [
    [1, '1 s/s'], [60, '1 min/s'], [600, '10 min/s'], [3600, '1 h/s'], [21600, '6 h/s'],
    [86400, '1 d/s'], [604800, '1 wk/s'], [2592000, '30 d/s'], [3.156e7, '1 yr/s'],
    [3.156e8, '10 yr/s'], [3.156e9, '100 yr/s'], [3.156e10, '1000 yr/s']
  ];
  let speedIdx = 5;
  function applySpeed() {
    G.sim.timeScale = SPEEDS[speedIdx][0];
    $('#t_speed').textContent = (G.sim.reverse ? '⏪ ' : '') + SPEEDS[speedIdx][1];
  }

  /* ---------- 초기화 ---------- */
  function init() {
    I18N.init();
    G.sim = new PHYS.Sim();
    G.sim.dtBase = 1;
    G.ren = new Renderer($('#gl'));
    G.ren.sizeScale = G.st.sizeScale;
    applySettings();
    applySpeed();
    buildSpawnPanel();
    bindUI();
    bindInput();
    // 메인 화면 배경용 데모 계
    SCEN.marble(G.sim);
    G.ren.dist = 900; G.ren.follow = null;
    G.sim.paused = false;
    G.sim.collisions = false; G.sim.timeScale = 900; G.ren.showTrails = false;
    I18N.refresh();
    // 실사 텍스처 선행 로딩
    if (window.REALTEX) {
      const bar = $('#lfill'), num = $('#lnum');
      REALTEX.setProgress((a, b) => {
        if (bar) bar.style.width = (a / Math.max(1, b) * 100).toFixed(0) + '%';
        if (num) num.textContent = 'TEXTURES ' + a + ' / ' + b;
      });
      REALTEX.preload(() => {
        const l = $('#loading'); if (l) l.classList.add('done');
        rebuildAll();
      });
    }
    addEventListener('resize', () => { G.ren.resize(); resizeDrag(); });
    resizeDrag();
    G.lastT = performance.now();
    requestAnimationFrame(loop);
  }

  /* ---------- 메인 루프 ---------- */
  function loop(now) {
    requestAnimationFrame(loop);
    let dt = (now - G.lastT) / 1000; G.lastT = now;
    if (dt > 0.1) dt = 0.1;
    G.frames++; G.fpsT += dt;
    if (G.fpsT > 0.5) { G.fps = G.frames / G.fpsT; G.frames = 0; G.fpsT = 0; if (G.started) updStats(); }

    if (!G.started) { G.ren.theta += dt * 0.035; }        // 메인 화면 천천히 회전

    G.sim.update(dt);
    handleEvents();
    pushTrails();
    G.ren.sync(G.sim, G.sel, dt);
    G.ren.render();
    if (G.started) { drawLabels(); drawOverlay(); if (G.sel) refreshInspLive(); }
  }

  let trailAccum = 0;
  function pushTrails() {
    if (!G.ren.showTrails) return;
    trailAccum++;
    for (const b of G.sim.bodies) {
      const t = b.trail;
      const last = t[t.length - 1];
      if (!last || Math.hypot(b.px - last[0], b.py - last[1], b.pz - last[2]) > b.r * 0.06) {
        t.push([b.px, b.py, b.pz]);
        if (t.length > G.st.trailLen) t.shift();
      }
    }
  }

  /* ---------- 시뮬 이벤트 → 이펙트 ---------- */
  function handleEvents() {
    for (const e of G.sim.events) {
      if (e.type === 'merge') { G.ren.boom(e.x, e.y, e.z, e.r * 1.4, 0xffc070, 0.8); beep(180, .2, 'sine', .05); }
      else if (e.type === 'bigimpact') { G.ren.boom(e.x, e.y, e.z, e.r * 2.2, 0xff8040, 1.4); beep(90, .5, 'sawtooth', .07); toast('💥 ' + I18N.t('ev_shatter')); }
      else if (e.type === 'roche') { G.ren.boom(e.x, e.y, e.z, e.r * 3, 0x9d7bff, 1.6); beep(320, .5, 'triangle', .07); toast('🌀 ' + I18N.t('ev_roche')); }
      else if (e.type === 'swallow') { G.ren.boom(e.x, e.y, e.z, e.r * 2, 0xff6040, 1.0); toast('🕳 ' + I18N.t('ev_swallow')); }
      else if (e.type === 'moonborn') { G.ren.boom(e.x, e.y, e.z, e.r * 6, 0x5ff0ff, 1.2); beep(660, .35, 'sine', .06); toast('🌙 ' + I18N.t('ev_moonborn')); }
      else if (e.type === 'shatter') { G.ren.boom(e.x, e.y, e.z, e.r * 1.6, 0xffa060, 0.9); }
    }
  }

  /* ---------- 라벨 ---------- */
  const labPool = [];
  function drawLabels() {
    const host = $('#labels');
    if (!G.st.labels) { labPool.forEach(l => l.style.display = 'none'); return; }
    const list = G.sim.bodies;
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const p = G.ren.project(b.px, b.py, b.pz);
      const rpx = G.ren.projRadiusPx(b);
      if (!p.vis || p.x < -80 || p.x > innerWidth + 80 || p.y < -40 || p.y > innerHeight + 40) continue;
      if (rpx < 1.2 && b.cat === 'debris') continue;
      let el = labPool[n];
      if (!el) { el = document.createElement('div'); el.className = 'lab'; host.appendChild(el); labPool[n] = el; }
      el.style.display = '';
      el.style.left = p.x + 'px';
      el.style.top = (p.y - Math.max(12, Math.min(rpx + 12, 90))) + 'px';
      const nm = bodyName(b);
      if (el._nm !== nm) { el.innerHTML = nm + (b.cat === 'moon' && b.x.born ? '<i>NEW</i>' : ''); el._nm = nm; }
      el.className = 'lab' + (b === G.sel ? ' sel' : '');
      n++;
      if (n > 90) break;
    }
    for (let i = n; i < labPool.length; i++) labPool[i].style.display = 'none';
  }
  function bodyName(b) {
    if (b.label === 'newmoon') return I18N.t('newmoon');
    if (b.label) return b.label;
    const c = CAT_BY_ID[b.cid];
    const base = c ? I18N.bodyName(c) : (I18N.cur === 'ko' ? '천체' : 'Body');
    return b.x.frag ? base + ' ' + I18N.t('frag') : base;
  }
  G.bodyName = bodyName;
  window.__show = b => showInspector(b);

  /* ---------- 오버레이(드래그선/측정) ---------- */
  let dcv, dctx;
  function resizeDrag() {
    dcv = $('#dragline'); dcv.width = innerWidth; dcv.height = innerHeight; dctx = dcv.getContext('2d');
  }
  function drawOverlay() {
    dctx.clearRect(0, 0, dcv.width, dcv.height);
    if (drag.active && (G.tool === 'launch' || G.tool === 'place') && drag.moved) {
      dctx.strokeStyle = 'rgba(95,240,255,.9)'; dctx.lineWidth = 2;
      dctx.setLineDash([6, 5]);
      dctx.beginPath(); dctx.moveTo(drag.sx, drag.sy); dctx.lineTo(drag.x, drag.y); dctx.stroke();
      dctx.setLineDash([]);
      const d = Math.hypot(drag.x - drag.sx, drag.y - drag.sy);
      dctx.fillStyle = '#5ff0ff'; dctx.font = 'bold 12px system-ui';
      dctx.fillText(fmtVel(d * launchK()), drag.x + 10, drag.y - 8);
      dctx.beginPath(); dctx.arc(drag.sx, drag.sy, 8, 0, 6.2832); dctx.stroke();
    }
    if (G.tool === 'measure' && G.measure.length) {
      const pts = G.measure.map(p => G.ren.project(p.x, p.y, p.z));
      dctx.strokeStyle = '#ffcf6b'; dctx.lineWidth = 2;
      dctx.beginPath();
      pts.forEach((p, i) => i ? dctx.lineTo(p.x, p.y) : dctx.moveTo(p.x, p.y));
      dctx.stroke();
      pts.forEach(p => { dctx.beginPath(); dctx.arc(p.x, p.y, 5, 0, 6.2832); dctx.stroke(); });
      if (G.measure.length === 2) {
        const a = G.measure[0], b = G.measure[1];
        const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        dctx.fillStyle = '#ffcf6b'; dctx.font = 'bold 13px system-ui';
        dctx.fillText(fmtDist(d), (pts[0].x + pts[1].x) / 2 + 8, (pts[0].y + pts[1].y) / 2 - 8);
      }
    }
  }
  function launchK() { return G.ren.dist * 2.2e-6; }   // px → Mm/s

  function updStats() {
    $('#s_fps').textContent = G.fps.toFixed(0);
    $('#s_bodies').textContent = G.sim.bodies.length;
    $('#s_deb').textContent = G.sim.debris.length;
    $('#s_scale').textContent = fmtDist(G.ren.dist);
    $('#t_elapsed').textContent = 'T+' + fmtTime(G.sim.t);
    $('#stats').style.display = G.st.showFps ? '' : 'none';
  }

  /* ---------- 설정 적용 ---------- */
  function applySettings() {
    const s = G.st, r = G.ren, sim = G.sim;
    r.sizeScale = s.sizeScale; r.showTrails = s.trails; r.trailLen = s.trailLen; r.marbleMode = s.marble;
    sim.substeps = s.substeps; sim.gmul = s.gmul; sim.maxBodies = s.maxBodies; sim.colMode = s.colMode;
    sim.debrisOn = s.debris; sim.selfGrav = s.selfGrav; sim.accretion = s.accretion; sim.tidalHeat = s.tidal;
    try { localStorage.setItem('mc_st', JSON.stringify(s)); } catch (e) {}
  }
  function loadSettings() {
    try { const j = JSON.parse(localStorage.getItem('mc_st') || 'null'); if (j) Object.assign(G.st, j); } catch (e) {}
  }
  window.onLangChange = function () {
    buildSpawnPanel();
    if (G.sel) showInspector(G.sel);
    applySpeed();
  };

  /* ================= 소환 브라우저 ================= */
  let spawnCat = 'all', spawnQ = '';
  function buildSpawnPanel() {
    const cats = $('#spawn_cats'); if (!cats) return;
    cats.innerHTML = '';
    CAT_ORDER.forEach(c => {
      const b = document.createElement('button');
      b.className = 'cat' + (c === spawnCat ? ' on' : '');
      b.textContent = I18N.t('cat_' + c);
      b.onclick = () => { spawnCat = c; buildSpawnPanel(); };
      cats.appendChild(b);
    });
    const list = $('#spawn_list'); list.innerHTML = '';
    const q = spawnQ.trim().toLowerCase();
    CATALOG.filter(c => (spawnCat === 'all' || c.cat === spawnCat) &&
      (!q || (c.ko + c.en + c.ja + c.id).toLowerCase().includes(q)))
      .forEach(c => {
        const it = document.createElement('div');
        it.className = 'item';
        const col = hex(c.col);
        it.innerHTML = '<div class="orb" style="background:radial-gradient(circle at 34% 28%,' +
          shade(c.col, 1.5) + ',' + col + ' 55%,' + shade(c.col, .35) + ')"></div>' +
          '<div style="min-width:0;flex:1"><div class="nm">' + I18N.bodyName(c) + '</div>' +
          '<div class="ds">' + fmtMass(c.m) + ' · R ' + fmtDist(c.r) + '</div></div>';
        it.onclick = () => {
          G.spawnPick = c.id;
          if (G.tool !== 'place') setTool('place');
          $('#spawn_hint').textContent = I18N.bodyName(c) + ' — ' + I18N.t('hint_place');
          $$('#spawn_list .item').forEach(x => x.style.borderColor = 'rgba(95,240,255,.12)');
          it.style.borderColor = 'var(--c1)';
        };
        list.appendChild(it);
      });
  }
  function shade(c, k) {
    const r = Math.min(255, ((c >> 16) & 255) * k) | 0, g = Math.min(255, ((c >> 8) & 255) * k) | 0, b = Math.min(255, (c & 255) * k) | 0;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ================= 천체 정보 패널 ================= */
  function showInspector(b) {
    G.sel = b;
    const p = $('#insp');
    if (!b || !b.alive) { p.classList.add('hide'); G.sel = null; return; }
    p.classList.remove('hide');
    $('#spawn').classList.add('hide');
    $('#insp_name').textContent = bodyName(b);
    const el = $('#insp_body');
    // 표면 = 실제 천체 사진 목록 (+ 구슬)
    const TEXES = window.REALTEX
      ? Object.keys(REALTEX.BYTEX).filter((v, i, a) => a.indexOf(v) === i).concat(['marble'])
      : ['earth', 'mars', 'venus', 'crater', 'rock', 'ice', 'lava', 'gas_j', 'gas_s', 'gas_u', 'gas_n', 'sun', 'marble'];
    el.innerHTML =
      '<div id="i_live"></div>' +
      '<div class="sec">' + I18N.t('edit') + '</div>' +
      '<div class="row"><label>' + I18N.t('bname') + '</label><input type="text" id="i_name" value="' +
      bodyName(b).replace(/"/g, '') + '"></div>' +
      row(I18N.t('mass'), 'i_mass', -6, 9, Math.log10(Math.max(1e-18, b.m))) +
      row(I18N.t('radius'), 'i_rad', -4, 6, Math.log10(Math.max(1e-6, b.r))) +
      row(I18N.t('density'), 'i_rho', 1.7, 4.6, Math.log10(Math.max(50, Math.min(40000, b.density())))) +
      row(I18N.t('temp'), 'i_temp', 0, 6, Math.log10(Math.max(1, b.T))) +
      '<div class="row"><label>' + I18N.t('velocity') + '</label><input type="range" id="i_vel" min="0" max="300" value="100"></div>' +
      '<div class="row"><label>' + I18N.t('spin') + '</label><input type="range" id="i_spin" min="-20" max="20" step="0.5" value="' + (b.spin * 1e4).toFixed(1) + '"></div>' +
      '<div class="sec">' + I18N.t('appearance') + '</div>' +
      '<div class="row"><label>' + I18N.t('surface') + '</label><select id="i_tex">' +
      TEXES.map(t => '<option value="' + t + '"' + (t === b.tex ? ' selected' : '') + '>' + t + '</option>').join('') +
      '</select></div>' +
      '<div class="row"><label>' + I18N.t('color') + '</label><input type="color" id="i_col" value="' + hex(b.col) + '" style="width:52px;padding:2px"></div>' +
      '<div class="grid2" style="margin-top:4px">' +
      btn('i_t_ring', '💫 ' + I18N.t('addring'), b.x.rings ? 'on' : '') +
      btn('i_t_atmo', '🌫 ' + I18N.t('atmo'), b.x.atmo ? 'on' : '') +
      btn('i_t_cloud', '☁ ' + I18N.t('cloudsL'), b.x.clouds ? 'on' : '') +
      btn('i_t_tail', '☄ ' + I18N.t('tail'), b.x.tail ? 'on' : '') +
      btn('i_t_irr', '🪨 ' + I18N.t('irr'), b.x.irr ? 'on' : '') +
      btn('i_t_fix', '📌 ' + I18N.t('fixed'), b.fixed ? 'on' : '') +
      '</div>' +
      '<div class="sec">' + I18N.t('tools') + '</div>' +
      '<div class="grid2">' +
      btn('i_follow', '🎯 ' + I18N.t('follow')) + btn('i_center', '📍 ' + I18N.t('center')) +
      btn('i_dup', '⧉ ' + I18N.t('duplicate')) + btn('i_ring', '💫 ' + I18N.t('addring')) +
      btn('i_frag', '🪨 ' + I18N.t('fragment')) + btn('i_boom', '💥 ' + I18N.t('explode')) +
      btn('i_orbit', '🌀 ' + I18N.t('orbitit')) + btn('i_del', '🗑 ' + I18N.t('del'), 'warn') +
      '</div>';
    const g = id => document.getElementById(id);
    g('i_name').oninput = e => { b.label = e.target.value; $('#insp_name').textContent = e.target.value; };
    g('i_mass').oninput = e => { b.m = Math.pow(10, +e.target.value); };
    g('i_rad').oninput = e => { b.r = Math.pow(10, +e.target.value); };
    g('i_rho').oninput = e => { b.setDensity(Math.pow(10, +e.target.value)); };
    g('i_temp').oninput = e => { b.T = Math.pow(10, +e.target.value); };
    g('i_spin').oninput = e => { b.spin = +e.target.value * 1e-4; };
    g('i_tex').onchange = e => { b.tex = e.target.value; b.x.texOverride = 1; G.ren.dispose(b.uid); };
    g('i_col').oninput = e => { b.col = parseInt(e.target.value.slice(1), 16); G.ren.dispose(b.uid); };
    const flag = (id, key, val) => g(id).onclick = () => {
      b.x[key] = b.x[key] ? 0 : (val || 1);
      g(id).classList.toggle('on', !!b.x[key]); G.ren.dispose(b.uid);
    };
    flag('i_t_ring', 'rings'); flag('i_t_atmo', 'atmo', 0.7); flag('i_t_cloud', 'clouds');
    flag('i_t_tail', 'tail'); flag('i_t_irr', 'irr');
    g('i_t_fix').onclick = () => { b.fixed = !b.fixed; g('i_t_fix').classList.toggle('on', b.fixed); };
    g('i_vel').oninput = e => {
      const k = +e.target.value / 100;
      const s = Math.hypot(b.vx, b.vy, b.vz);
      if (s > 0) { const f = k / (b._vk || 1); b.vx *= f; b.vy *= f; b.vz *= f; b._vk = k; }
    };
    b._vk = 1;
    g('i_follow').onclick = () => { G.ren.focus(b, true); toast('🎯 ' + bodyName(b)); };
    g('i_center').onclick = () => { G.ren.target.set(b.px, b.py, b.pz); G.ren.follow = b; };
    g('i_dup').onclick = () => {
      const c = new PHYS.Body(Object.assign({}, b, { x: Object.assign({}, b.x) }));
      c.uid = undefined; const n = new PHYS.Body({
        cid: b.cid, cat: b.cat, m: b.m, r: b.r, T: b.T, tex: b.tex, col: b.col, x: Object.assign({}, b.x),
        px: b.px + b.r * 3, py: b.py, pz: b.pz + b.r * 3, vx: b.vx, vy: b.vy, vz: b.vz, label: b.label
      });
      G.sim.add(n); toast('⧉ ' + bodyName(b));
    };
    g('i_ring').onclick = () => { b.x.rings = b.x.rings ? 0 : 1; G.ren.dispose(b.uid); };
    g('i_frag').onclick = () => {
      const parts = G.sim.shatter(b, 7, b.escapeV() * 0.35, 'shatter');
      parts.forEach(p => G.sim.spawnDebris(p, 6, b.escapeV() * 0.4, 0.4));
      showInspector(parts[0]); toast('🪨 ' + I18N.t('fragment'));
    };
    g('i_boom').onclick = () => {
      G.ren.boom(b.px, b.py, b.pz, b.r * 3, 0xffaa44, 1.4); beep(70, .6, 'sawtooth', .08);
      G.sim.spawnDebris(b, 70, b.escapeV() * 1.6, 0.9);
      G.sim.remove(b); showInspector(null);
    };
    g('i_orbit').onclick = () => {
      const P = G.sim.dominant(b);
      if (!P) return toast('!');
      const v = G.sim.circularVel(P, b.px, b.py, b.pz, 0);
      b.vx = v.x; b.vy = v.y; b.vz = v.z; toast('🌀 ' + bodyName(P));
    };
    g('i_del').onclick = () => { G.sim.remove(b); showInspector(null); toast(I18N.t('ev_del')); };
    refreshInspLive();
  }
  function row(label, id, min, max, val) {
    return '<div class="row"><label>' + label + '</label><input type="range" id="' + id + '" min="' + min +
      '" max="' + max + '" step="0.01" value="' + val + '"></div>';
  }
  function btn(id, txt, cls) { return '<button class="b sm ' + (cls || '') + '" id="' + id + '">' + txt + '</button>'; }
  /* 자동 원궤도 토글용 */
  G.setAutoOrbit = v => { G.autoOrbit = v; };

  function refreshInspLive() {
    const b = G.sel; if (!b) return;
    if (!b.alive) { showInspector(null); return; }
    const el = document.getElementById('i_live'); if (!el) return;
    const oe = G.sim.orbitElements(b);
    const c = CAT_BY_ID[b.cid];
    let h = '<div class="sec">' + I18N.t('inspector') + '</div>' +
      kv(I18N.t('type'), I18N.t('cat_' + (b.cat === 'debris' ? 'asteroid' : b.cat)) || b.cat) +
      kv(I18N.t('mass'), fmtMass(b.m)) +
      kv(I18N.t('radius'), fmtDist(b.r)) +
      kv(I18N.t('density'), (b.density() / 1000).toFixed(2) + ' g/cm³') +
      kv(I18N.t('temp'), fmtTemp(b.T)) +
      kv(I18N.t('gravity'), b.surfaceG().toFixed(2) + ' m/s² (' + (b.surfaceG() / 9.807).toFixed(2) + ' g)') +
      kv(I18N.t('escape'), fmtVel(b.escapeV())) +
      kv(I18N.t('velocity'), fmtVel(b.speed()));
    if (b.cat === 'bh') h += kv('Rs', fmtDist(b.schwarzschild()));
    if (b.isStar()) h += kv('L', b.lum().toExponential(2) + ' L☉');
    if (oe && isFinite(oe.a)) {
      h += '<div class="sec">' + I18N.t('period') + '</div>' +
        kv(I18N.t('primary'), bodyName(oe.primary)) +
        kv(I18N.t('distance'), fmtDist(oe.r)) +
        kv(I18N.t('semi'), oe.a > 0 ? fmtDist(oe.a) : '—') +
        kv(I18N.t('ecc'), oe.e.toFixed(4)) +
        kv(I18N.t('period'), isFinite(oe.T) ? fmtTime(oe.T) : '∞') +
        kv(I18N.t('apo'), oe.a > 0 ? fmtDist(oe.apo) : '—') +
        kv(I18N.t('peri'), fmtDist(oe.peri));
      const rl = G.sim.rocheLimit(oe.primary, b, false), rr = G.sim.rocheLimit(oe.primary, b, true);
      h += '<div class="sec">' + I18N.t('roche') + '</div>' +
        kv(I18N.t('fluidL'), fmtDist(rl)) +
        kv(I18N.t('rigidL'), fmtDist(rr)) +
        kv('', oe.r < rr ? '<span style="color:var(--bad)">⚠ ' + I18N.t('st_break') + '</span>' :
          oe.r < rl ? '<span style="color:var(--c3)">' + I18N.t('st_tidal') + '</span>' :
            '<span style="color:#7fe6a0">' + I18N.t('st_stable') + '</span>');
      if (b.tidal > 0.01) h += kv(I18N.t('tidal'), (b.tidal * 100).toFixed(0) + '%');
    }
    el.innerHTML = h;
  }
  function kv(k, v) { return '<div class="kv"><span>' + k + '</span><b>' + v + '</b></div>'; }

  /* ================= 모달 ================= */
  function modal(title, bodyHTML, onBuild) {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = '<div class="panel"><div class="ttl"><span class="dot"></span>' + title +
      '<button class="b sm" id="mo_close" style="margin-left:auto">✕</button></div><div class="bd">' + bodyHTML + '</div></div>';
    $('#modals').appendChild(wrap);
    wrap.querySelector('#mo_close').onclick = () => wrap.remove();
    wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };
    if (onBuild) onBuild(wrap);
    return wrap;
  }
  function sw(id, on) { return '<div class="sw' + (on ? ' on' : '') + '" id="' + id + '"></div>'; }
  function srow(label, sub, ctrl) {
    return '<div class="row"><label>' + label + (sub ? '<span class="sub">' + sub + '</span>' : '') + '</label>' + ctrl + '</div>';
  }

  function openSettings() {
    const s = G.st;
    const html =
      '<div class="sec">' + I18N.t('graphics') + '</div>' +
      srow(I18N.t('quality'), '', '<select id="o_q"><option value="0">Low</option><option value="1">Medium</option><option value="2">High</option></select>') +
      srow(I18N.t('sizescale'), '×1 ~ ×2000', '<input type="range" id="o_size" min="0" max="3.3" step="0.01" value="' + Math.log10(s.sizeScale) + '"><b id="o_sizev" style="min-width:52px;text-align:right">×' + s.sizeScale.toFixed(1) + '</b>') +
      srow(I18N.t('trailLen'), '', '<input type="range" id="o_trail" min="20" max="900" step="10" value="' + s.trailLen + '">') +
      srow(I18N.t('labels'), '', sw('o_lab', s.labels)) +
      srow(I18N.t('marble'), '', sw('o_marb', s.marble)) +
      srow(I18N.t('showfps'), '', sw('o_fps', s.showFps)) +
      srow(I18N.t('sound'), '', sw('o_snd', s.sound)) +
      '<div class="sec">' + I18N.t('physics') + '</div>' +
      srow(I18N.t('substeps'), '1 ~ 8', '<input type="range" id="o_sub" min="1" max="8" step="1" value="' + s.substeps + '">') +
      srow(I18N.t('gmul'), '×0 ~ ×5', '<input type="range" id="o_g" min="0" max="5" step="0.05" value="' + s.gmul + '"><b id="o_gv" style="min-width:40px;text-align:right">×' + s.gmul.toFixed(2) + '</b>') +
      srow(I18N.t('maxbody'), '', '<input type="range" id="o_max" min="20" max="600" step="10" value="' + s.maxBodies + '">') +
      srow(I18N.t('colmode'), '', '<select id="o_col"><option value="realistic">' + I18N.t('realistic') + '</option><option value="merge">' + I18N.t('merge') + '</option><option value="bounce">' + I18N.t('bounce') + '</option><option value="shatter">' + I18N.t('shatter') + '</option></select>') +
      srow(I18N.t('debris'), '', sw('o_deb', s.debris)) +
      srow(I18N.t('accretion'), '', sw('o_acc', s.accretion)) +
      srow(I18N.t('selfgrav'), '', sw('o_sg', s.selfGrav)) +
      srow(I18N.t('tidal'), '', sw('o_tid', s.tidal)) +
      '<div class="row"><button class="b" id="o_reset" style="width:100%">' + I18N.t('reset') + '</button></div>';
    modal('⚙ ' + I18N.t('settings'), html, w => {
      const q = w.querySelector('#o_q'); q.value = s.quality;
      q.onchange = () => { s.quality = +q.value; G.ren.setQuality(s.quality); TEX.clearCache(); rebuildAll(); applySettings(); };
      const cm = w.querySelector('#o_col'); cm.value = s.colMode;
      cm.onchange = () => { s.colMode = cm.value; applySettings(); };
      w.querySelector('#o_size').oninput = e => {
        s.sizeScale = Math.pow(10, +e.target.value);
        w.querySelector('#o_sizev').textContent = '×' + (s.sizeScale < 10 ? s.sizeScale.toFixed(1) : s.sizeScale.toFixed(0));
        applySettings();
      };
      w.querySelector('#o_trail').oninput = e => { s.trailLen = +e.target.value; applySettings(); rebuildAll(); };
      w.querySelector('#o_sub').oninput = e => { s.substeps = +e.target.value; applySettings(); };
      w.querySelector('#o_g').oninput = e => { s.gmul = +e.target.value; w.querySelector('#o_gv').textContent = '×' + s.gmul.toFixed(2); applySettings(); };
      w.querySelector('#o_max').oninput = e => { s.maxBodies = +e.target.value; applySettings(); };
      const tog = (id, key, after) => {
        const el = w.querySelector('#' + id);
        el.onclick = () => { s[key] = !s[key]; el.classList.toggle('on', s[key]); applySettings(); if (after) after(); };
      };
      tog('o_lab', 'labels'); tog('o_marb', 'marble', () => rebuildAll()); tog('o_fps', 'showFps');
      tog('o_snd', 'sound'); tog('o_deb', 'debris'); tog('o_acc', 'accretion');
      tog('o_sg', 'selfGrav'); tog('o_tid', 'tidal');
      w.querySelector('#o_reset').onclick = () => {
        Object.assign(s, {
          quality: 1, sizeScale: 1, trails: true, trailLen: 260, labels: true, marble: true, substeps: 4,
          gmul: 1, maxBodies: 220, colMode: 'realistic', debris: true, selfGrav: false, accretion: true,
          tidal: true, sound: true, showFps: true, glow: true
        });
        applySettings(); rebuildAll(); w.remove(); openSettings();
      };
    });
  }

  function openLang() {
    let h = '';
    I18N.langs.forEach(l => {
      h += '<div class="row"><label>' + I18N.name(l) + '</label><button class="b sm' + (l === I18N.cur ? ' on' : '') +
        '" data-l="' + l + '">' + (l === I18N.cur ? '✓' : '＞') + '</button></div>';
    });
    modal('🌐 ' + I18N.t('language'), h, w => {
      w.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { I18N.set(b.dataset.l); w.remove(); openLang(); });
    });
  }

  const PRESETS = [
    ['preset_solar', '☀️', 'solar'], ['preset_em', '🌍', 'earthMoon'], ['preset_jup', '🪐', 'jupiter'],
    ['preset_sat', '💫', 'saturn'], ['preset_binary', '✨', 'binary'], ['preset_bh', '🕳', 'blackhole'],
    ['preset_roche', '🌀', 'roche'], ['preset_moonmake', '🌙', 'moonmake'], ['preset_trappist', '🔴', 'trappist'],
    ['preset_chaos', '🌌', 'chaos'], ['preset_marble', '🔮', 'marble'], ['randomSys', '🎲', 'random'],
    ['preset_empty', '⬛', 'empty']
  ];
  function openPresets() {
    let h = '<div class="grid2">';
    PRESETS.forEach(([k, ic, fn]) => h += '<button class="b" data-s="' + fn + '" style="justify-content:flex-start">' + ic + ' ' + I18N.t(k) + '</button>');
    h += '</div>';
    modal('🌌 ' + I18N.t('presets'), h, w => {
      w.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
        loadScenario(b.dataset.s); w.remove();
      });
    });
  }
  function loadScenario(name) {
    G.sel = null; showInspector(null);
    const res = SCEN[name](G.sim);
    G.sim.bodies.forEach(b => b.trail.length = 0);
    if (res) {
      G.ren.follow = res.focus || null;
      if (!res.focus) G.ren.target.set(0, 0, 0);
      G.ren.dist = res.dist || 1000;
    }
    G.sim.t = 0;
    rebuildAll();
    toast('🌌 ' + name);
  }
  G.loadScenario = loadScenario;

  function rebuildAll() {
    Array.from(G.ren.meshes.keys()).forEach(uid => G.ren.dispose(uid));
  }

  function openPause() {
    const h = '<div class="grid2">' +
      '<button class="b" id="p_resume">▶ ' + I18N.t('resume') + '</button>' +
      '<button class="b" id="p_set">⚙ ' + I18N.t('settings') + '</button>' +
      '<button class="b" id="p_lang">🌐 ' + I18N.t('language') + '</button>' +
      '<button class="b" id="p_scen">🌌 ' + I18N.t('presets') + '</button>' +
      '<button class="b" id="p_save">💾 ' + I18N.t('save') + '</button>' +
      '<button class="b" id="p_load">📂 ' + I18N.t('load') + '</button>' +
      '<button class="b warn" id="p_menu" style="grid-column:1/3">🏠 ' + I18N.t('quit') + '</button></div>';
    modal('☰', h, w => {
      w.querySelector('#p_resume').onclick = () => w.remove();
      w.querySelector('#p_set').onclick = () => { w.remove(); openSettings(); };
      w.querySelector('#p_lang').onclick = () => { w.remove(); openLang(); };
      w.querySelector('#p_scen').onclick = () => { w.remove(); openPresets(); };
      w.querySelector('#p_save').onclick = () => { saveGame(); w.remove(); };
      w.querySelector('#p_load').onclick = () => { loadGame(); w.remove(); };
      w.querySelector('#p_menu').onclick = () => { w.remove(); toMenu(); };
    });
  }

  /* ---------- 저장/불러오기 ---------- */
  function saveGame() {
    const d = {
      t: G.sim.t,
      b: G.sim.bodies.map(b => ({
        cid: b.cid, cat: b.cat, m: b.m, r: b.r, T: b.T, tex: b.tex, col: b.col, x: b.x, label: b.label,
        p: [b.px, b.py, b.pz], v: [b.vx, b.vy, b.vz], seed: b.seed
      }))
    };
    try { localStorage.setItem('mc_save', JSON.stringify(d)); toast('💾 ' + I18N.t('ev_saved')); }
    catch (e) { toast('⚠ ' + e.message); }
  }
  function loadGame() {
    try {
      const d = JSON.parse(localStorage.getItem('mc_save') || 'null');
      if (!d) return toast('—');
      G.sim.clear(); G.sel = null; showInspector(null);
      d.b.forEach(o => G.sim.add(new PHYS.Body({
        cid: o.cid, cat: o.cat, m: o.m, r: o.r, T: o.T, tex: o.tex, col: o.col, x: o.x, label: o.label,
        px: o.p[0], py: o.p[1], pz: o.p[2], vx: o.v[0], vy: o.v[1], vz: o.v[2], seed: o.seed
      })));
      G.sim.t = d.t || 0; rebuildAll(); toast('📂 ' + I18N.t('ev_loaded'));
    } catch (e) { toast('⚠ ' + e.message); }
  }

  /* ================= 천체 생성 ================= */
  function createBody(id, pos, vel) {
    const c = CAT_BY_ID[id] || CAT_BY_ID.c_rock;
    const b = mkBody(id, {
      px: pos.x, py: pos.y, pz: pos.z,
      vx: vel ? vel.x : 0, vy: vel ? vel.y : 0, vz: vel ? vel.z : 0
    });
    if (!G.sim.add(b)) { toast('⚠ max'); return null; }
    G.ren.boom(pos.x, pos.y, pos.z, b.r * 2.2, c.col, 0.6);
    beep(520, .12, 'triangle', .05);
    return b;
  }
  function spawnAt(sx, sy, dragVec) {
    const p = G.ren.unproject(sx, sy);
    let vel = { x: 0, y: 0, z: 0 };
    const P = G.sim.dominant({ px: p.x, py: p.y, pz: p.z });
    if (G.autoOrbit && P && !dragVec) {
      const v = G.sim.circularVel(P, p.x, p.y, p.z, 0);
      vel = v;
    } else if (P) { vel = { x: P.vx, y: P.vy, z: P.vz }; }
    if (dragVec) {
      // 화면 드래그 → 카메라 평면 속도
      const cp = G.ren.cam;
      const right = new THREE.Vector3().setFromMatrixColumn(cp.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(cp.matrixWorld, 1);
      const k = launchK();
      vel = {
        x: vel.x + (right.x * dragVec.x + up.x * -dragVec.y) * k,
        y: vel.y + (right.y * dragVec.x + up.y * -dragVec.y) * k,
        z: vel.z + (right.z * dragVec.x + up.z * -dragVec.y) * k
      };
    }
    const b = createBody(G.spawnPick, p, vel);
    if (b) { showInspector(b); toast('🪐 ' + bodyName(b)); }
    return b;
  }
  function sprayMarbles(sx, sy) {
    const p = G.ren.unproject(sx, sy);
    const P = G.sim.dominant({ px: p.x, py: p.y, pz: p.z });
    const scale = G.ren.dist * 0.004;
    const b = new PHYS.Body({
      cid: 'c_marble', cat: 'custom', m: Math.max(1e-8, scale * scale * scale * 0.02),
      r: scale, T: 250, tex: 'marble', col: [0x66ddff, 0xff8ad0, 0xffe08a, 0x9d7bff, 0x8affc0][(Math.random() * 5) | 0],
      x: { marble: 1 }, seed: (Math.random() * 999) | 0,
      px: p.x + (Math.random() - .5) * scale * 8, py: p.y + (Math.random() - .5) * scale * 8, pz: p.z + (Math.random() - .5) * scale * 8
    });
    if (P) { const v = G.sim.circularVel(P, b.px, b.py, b.pz, 0); b.vx = v.x; b.vy = v.y; b.vz = v.z; }
    G.sim.add(b);
  }

  /* ================= 툴 ================= */
  const TOOLS = ['select', 'place', 'launch', 'spray', 'measure'];
  function setTool(t) {
    G.tool = t; G.measure = [];
    TOOLS.forEach(x => $('#tool_' + x).classList.toggle('on', x === t));
    const hints = { select: 'hint_cam', place: 'hint_place', launch: 'hint_launch', spray: 'hint_cam', measure: 'hint_measure' };
    $('#help').textContent = I18N.t(hints[t] || 'hint_cam');
  }

  /* ================= UI 바인딩 ================= */
  function bindUI() {
    // 메인 메뉴
    addEventListener('pointerdown', enableAudio, { once: true });
    $('#m_play').onclick = startGame;
    $('#m_settings').onclick = openSettings;
    $('#m_lang').onclick = openLang;
    $('#m_quit').onclick = quitGame;

    // 시간
    $('#t_pause').onclick = () => {
      G.sim.paused = !G.sim.paused;
      $('#t_pause').textContent = G.sim.paused ? '▶' : '⏸';
      $('#t_pause').classList.toggle('on', G.sim.paused);
    };
    $('#t_slow').onclick = () => { speedIdx = Math.max(0, speedIdx - 1); applySpeed(); };
    $('#t_fast').onclick = () => { speedIdx = Math.min(SPEEDS.length - 1, speedIdx + 1); applySpeed(); };
    $('#t_rev').onclick = () => { G.sim.reverse = !G.sim.reverse; $('#t_rev').classList.toggle('on', G.sim.reverse); applySpeed(); };
    $('#t_menu').onclick = openPause;

    // 툴
    TOOLS.forEach(t => $('#tool_' + t).onclick = () => setTool(t));
    $('#btn_spawn').onclick = () => {
      const p = $('#spawn'); p.classList.toggle('hide');
      if (!p.classList.contains('hide')) { $('#insp').classList.add('hide'); buildSpawnPanel(); }
    };
    $('#spawn_close').onclick = () => $('#spawn').classList.add('hide');
    $('#insp_close').onclick = () => { $('#insp').classList.add('hide'); G.sel = null; };
    $('#spawn_search').oninput = e => { spawnQ = e.target.value; buildSpawnPanel(); };
    $('#btn_presets').onclick = openPresets;
    $('#btn_settings').onclick = openSettings;

    // 토글
    const T = (id, get, set) => {
      const el = $('#' + id);
      el.onclick = () => { set(!get()); el.classList.toggle('on', get()); };
      el.classList.toggle('on', get());
    };
    T('g_trails', () => G.ren.showTrails, v => { G.ren.showTrails = v; G.st.trails = v; applySettings(); });
    T('g_roche', () => G.ren.showRoche, v => G.ren.showRoche = v);
    T('g_labels', () => G.st.labels, v => { G.st.labels = v; applySettings(); });
    T('g_grid', () => G.ren.showGrid, v => G.ren.showGrid = v);
    T('g_hz', () => G.ren.showHZ, v => G.ren.showHZ = v);
    T('g_vec', () => G.ren.showVectors, v => G.ren.showVectors = v);
    T('g_marble', () => G.st.marble, v => { G.st.marble = v; applySettings(); rebuildAll(); });
    T('g_col', () => G.sim.collisions, v => G.sim.collisions = v);
    $('#g_clear').onclick = () => { loadScenario('empty'); };
  }

  function startGame() {
    G.started = true;
    $('#menu').classList.add('fade');
    setTimeout(() => $('#menu').classList.add('hide'), 300);
    $('#hud').classList.remove('hide');
    G.sim.collisions = true; $('#g_col').classList.add('on');
    G.ren.showTrails = G.st.trails; $('#g_trails').classList.toggle('on', G.st.trails);
    loadScenario('solar');
    speedIdx = 5; applySpeed();
    setTool('select');
    beep(660, .12, 'sine', .05); setTimeout(() => beep(880, .18, 'sine', .05), 110);
    toast('🚀 ' + I18N.t('play'));
  }
  function toMenu() {
    G.started = false; G.sel = null; showInspector(null);
    $('#hud').classList.add('hide');
    $('#spawn').classList.add('hide');
    $('#menu').classList.remove('hide');
    requestAnimationFrame(() => $('#menu').classList.remove('fade'));
    SCEN.marble(G.sim); rebuildAll();
    G.sim.collisions = false; G.sim.timeScale = 900; G.ren.showTrails = false;
    G.ren.follow = null; G.ren.target.set(0, 0, 0); G.ren.dist = 1150;
  }
  function quitGame() {
    const h = '<p style="font-size:13px;line-height:1.6;color:var(--dim)">' + I18N.t('quitMsg') + '</p>' +
      '<div class="grid2"><button class="b warn" id="q_yes">' + I18N.t('confirm') + '</button>' +
      '<button class="b" id="q_no">' + I18N.t('cancel') + '</button></div>';
    modal('⏻ ' + I18N.t('quit'), h, w => {
      w.querySelector('#q_no').onclick = () => w.remove();
      w.querySelector('#q_yes').onclick = () => {
        w.remove();
        window.open('', '_self'); window.close();
        document.body.innerHTML = '<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
          'flex-direction:column;gap:12px;background:#03050c;color:#5ff0ff;font-family:system-ui;letter-spacing:.2em">' +
          '<h1 style="font-size:26px;margin:0">GOODBYE, TRAVELER</h1>' +
          '<p style="color:#7f9dbd;font-size:13px">' + (I18N.cur === 'ko' ? '창을 닫아 주세요.' : I18N.cur === 'ja' ? 'ウィンドウを閉じてください。' : 'You may close this window.') + '</p></div>';
      };
    });
  }

  /* ================= 입력 ================= */
  const drag = { active: false, sx: 0, sy: 0, x: 0, y: 0, moved: false, btn: 0, id: null, pan: false };
  let pointers = new Map(), pinchD = 0, lastTap = 0, tapBody = null;

  function bindInput() {
    const cv = $('#gl');
    cv.style.touchAction = 'none';

    cv.addEventListener('pointerdown', e => {
      enableAudio();
      cv.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const p = Array.from(pointers.values());
        pinchD = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        drag.active = false;
        return;
      }
      drag.active = true; drag.moved = false; drag.btn = e.button;
      drag.sx = drag.x = e.clientX; drag.sy = drag.y = e.clientY;
      drag.pan = e.button === 2 || e.shiftKey;
      tapBody = G.ren.pick(G.sim, e.clientX, e.clientY);
    });

    cv.addEventListener('pointermove', e => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const p = Array.from(pointers.values());
        const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (pinchD > 0) G.ren.zoom(Math.pow(pinchD / d, 1.0));
        pinchD = d;
        return;
      }
      if (!drag.active) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 5) drag.moved = true;
      if (G.tool === 'spray' && drag.moved) { sprayMarbles(e.clientX, e.clientY); return; }
      if (G.tool === 'launch' || (G.tool === 'place' && drag.moved && !drag.pan)) return;  // 오버레이에서 표시
      if (drag.pan) G.ren.pan(dx, dy);
      else G.ren.orbit(dx, dy);
    });

    const up = e => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchD = 0;
      if (!drag.active) return;
      drag.active = false;
      const dvx = drag.x - drag.sx, dvy = drag.y - drag.sy;
      if (G.tool === 'place') {
        if (!drag.pan) spawnAt(drag.sx, drag.sy, drag.moved ? { x: dvx, y: dvy } : null);
      } else if (G.tool === 'launch') {
        if (!drag.pan) spawnAt(drag.sx, drag.sy, { x: dvx, y: dvy });
      } else if (G.tool === 'measure') {
        const p = tapBody ? { x: tapBody.px, y: tapBody.py, z: tapBody.pz } : G.ren.unproject(drag.sx, drag.sy);
        if (G.measure.length >= 2) G.measure = [];
        G.measure.push(p);
      } else if (!drag.moved) {
        const b = G.ren.pick(G.sim, drag.sx, drag.sy);
        const now = performance.now();
        if (b) {
          showInspector(b);
          if (now - lastTap < 320 && b === G.sel) G.ren.focus(b, true);
          lastTap = now;
        } else { showInspector(null); }
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      G.ren.zoom(Math.pow(1.0016, e.deltaY));
    }, { passive: false });

    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); $('#t_pause').click(); }
      else if (k === 'escape') { if ($('.modal')) $$('.modal').forEach(m => m.remove()); else if (G.started) openPause(); }
      else if (k === '+' || k === '=' || k === 'arrowright') $('#t_fast').click();
      else if (k === '-' || k === 'arrowleft') $('#t_slow').click();
      else if (k === 't') $('#g_trails').click();
      else if (k === 'r') $('#g_roche').click();
      else if (k === 'g') $('#g_grid').click();
      else if (k === 'l') $('#g_labels').click();
      else if (k === 'm') $('#g_marble').click();
      else if (k === 'v') $('#g_vec').click();
      else if (k === 'h') $('#g_hz').click();
      else if (k === 'f' && G.sel) G.ren.focus(G.sel, true);
      else if (k === 'delete' && G.sel) { G.sim.remove(G.sel); showInspector(null); }
      else if (k === 'q') $('#btn_spawn').click();
      else if (k === 'p') openPresets();
      else if (k >= '1' && k <= '5') setTool(TOOLS[+k - 1]);
    });
  }

  /* ---------- 시작 ---------- */
  loadSettings();
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();
})();
