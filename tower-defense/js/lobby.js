/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  lobby.js
 * -------------------------------------------------------------------------
 *  로그인/회원가입 화면 + 메인 로비
 *   · 프로필 카드(아바타·닉네임·칭호·프레임·배지·레벨)
 *   · 전투 시작(맵 선택) · 프로필 꾸미기 · 상점 · 도감 · 업적
 *   · 명예 강화 · 출석 보상 · 일일 퀘스트 · 전적 · 설정
 * ========================================================================= */
'use strict';

const Lobby = {
  el: {},
  panel: null,           // 현재 열린 패널 키
  editCat: 'body',       // 프로필 편집 카테고리
  selectedMap: null,
  avatarT: 0,
  rafId: 0,

  /* =================================================================
   *  초기화
   * ================================================================= */
  init() {
    this.el = {
      auth: document.getElementById('auth'),
      lobby: document.getElementById('lobby'),
      panel: document.getElementById('lobbyPanel'),
      panelBody: document.getElementById('lpBody'),
      panelTitle: document.getElementById('lpTitle'),
      toasts: document.getElementById('toasts'),
    };
    this.selectedMap = MAPS[0];
    this.bindAuth();
    this.bindLobby();

    const user = Account.init();
    if (user) {
      this.applyProfileToGame();
      this.showLobby();
    } else {
      this.showAuth('login');
    }
    this.startAvatarLoop();
  },

  /* =================================================================
   *  토스트
   * ================================================================= */
  toast(msg, color) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    t.style.color = color || '#e8eefb';
    this.el.toasts.appendChild(t);
    setTimeout(() => t.remove(), 1900);
  },

  /* =================================================================
   *  인증 화면
   * ================================================================= */
  authMode: 'login',

  showAuth(mode) {
    this.authMode = mode || 'login';
    this.el.auth.classList.remove('hidden');
    this.el.lobby.classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('bottom').classList.add('hidden');
    document.getElementById('skillBar').classList.add('hidden');
    document.getElementById('synPanel').classList.add('hidden');
    document.getElementById('wavePreview').classList.add('hidden');
    Game.paused = true;
    this.renderAuth();
  },

  renderAuth() {
    const isLogin = this.authMode === 'login';
    document.getElementById('authTabLogin').classList.toggle('on', isLogin);
    document.getElementById('authTabSignup').classList.toggle('on', !isLogin);
    document.getElementById('signupOnly').classList.toggle('hidden', isLogin);
    document.getElementById('authSubmit').textContent = isLogin ? '로그인' : '회원가입';
    document.getElementById('authError').textContent = '';

    /* 구글 버튼 */
    const gwrap = document.getElementById('googleBtn');
    gwrap.innerHTML = '';
    const note = document.getElementById('googleNote');
    if (Account.googleReady) {
      note.textContent = '';
      Account.renderGoogleButton(gwrap);
    } else {
      const msg = Account.googleStatusText();
      note.textContent = msg || '';
      const fake = document.createElement('button');
      fake.className = 'gbtn-fallback';
      fake.innerHTML = `<span class="gico">G</span> Google 계정으로 로그인`;
      fake.onclick = () => {
        if (!Account.promptGoogle()) {
          this.toast('Google 로그인을 사용할 수 없다', '#ff6b6b');
          document.getElementById('authError').textContent = Account.googleStatusText() || '';
        }
      };
      gwrap.appendChild(fake);
    }

    /* 기존 계정 목록(빠른 로그인) */
    const list = document.getElementById('quickAccounts');
    const users = Object.values(Account.users).filter(u => u.kind !== 'guest');
    if (users.length) {
      list.classList.remove('hidden');
      list.innerHTML = '<div class="qa-t">최근 계정</div>' + users.slice(-4).map(u =>
        `<button class="qa" data-uid="${u.uid}">
           <span class="qa-av">${u.kind === 'google' ? 'G' : '👤'}</span>
           <span class="qa-n">${this.esc(u.nick)}</span>
           <span class="qa-k">${u.kind === 'google' ? 'Google' : u.id}</span>
         </button>`).join('');
      list.querySelectorAll('.qa').forEach(b => b.onclick = () => {
        const u = Account.users[b.dataset.uid];
        if (!u) return;
        if (u.kind === 'google') { Account.promptGoogle() || this.toast('구글 재인증이 필요하다', '#ffcf3f'); return; }
        this.authMode = 'login';
        document.getElementById('authId').value = u.id;
        this.renderAuth();
        document.getElementById('authPw').focus();
      });
    } else list.classList.add('hidden');
  },

  bindAuth() {
    document.getElementById('authTabLogin').onclick = () => { this.authMode = 'login'; this.renderAuth(); SFX.play('click'); };
    document.getElementById('authTabSignup').onclick = () => { this.authMode = 'signup'; this.renderAuth(); SFX.play('click'); };

    const submit = async () => {
      SFX.init(); SFX.resume();
      const id = document.getElementById('authId').value.trim();
      const pw = document.getElementById('authPw').value;
      const nick = document.getElementById('authNick').value.trim();
      const errEl = document.getElementById('authError');
      errEl.textContent = '';
      let res;
      if (this.authMode === 'signup') res = await Account.signup(id, pw, nick);
      else res = await Account.login(id, pw);
      if (!res.ok) {
        errEl.textContent = res.error;
        SFX.play('error');
        return;
      }
      SFX.play('unlock');
      this.onLoggedIn(this.authMode === 'signup');
    };
    document.getElementById('authSubmit').onclick = submit;
    ['authId', 'authPw', 'authNick'].forEach(id => {
      document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    });

    document.getElementById('authGuest').onclick = () => {
      SFX.init(); SFX.resume();
      Account.guest();
      this.onLoggedIn(false);
    };
  },

  onGoogleReady() { if (!this.el.auth.classList.contains('hidden')) this.renderAuth(); },

  onLoggedIn(isNew) {
    this.applyProfileToGame();
    if (isNew) {
      this.toast('환영한다, ' + Account.displayName() + '!', '#7cff9c');
      Account.ensureQuests(true);
    }
    this.showLobby();
  },

  /** 계정 프로필에 저장된 진행도를 Game 으로 로드 */
  applyProfileToGame() {
    Game.loadMeta();
    Account.ensureQuests(false);
  },

  /* =================================================================
   *  로비
   * ================================================================= */
  showLobby() {
    this.el.auth.classList.add('hidden');
    this.el.lobby.classList.remove('hidden');
    this.closePanel();
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('bottom').classList.add('hidden');
    document.getElementById('skillBar').classList.add('hidden');
    document.getElementById('synPanel').classList.add('hidden');
    document.getElementById('wavePreview').classList.add('hidden');
    document.getElementById('unitPanel').classList.add('hidden');
    Game.paused = true;
    Game.state = 'playing';
    this.renderLobby();
    this.startLobbyFx();
    this.nextHero();
  },

  hideLobby() {
    this.el.lobby.classList.add('hidden');
    this.stopLobbyFx();
    this.closePanel();
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('bottom').classList.remove('hidden');
    document.getElementById('skillBar').classList.remove('hidden');
    document.getElementById('synPanel').classList.remove('hidden');
    document.getElementById('wavePreview').classList.remove('hidden');
  },

  /* ===================================================================
   *  메인화면 연출 — 배경 입자 + 상단 유닛 쇼케이스
   * =================================================================== */
  heroIdx: 0, _fxParts: null, _lobbyRaf: 0,

  /** 쇼케이스에 세울 유닛을 고른다 : 도감에 모은 게 있으면 그중 최고 등급부터 */
  heroPool() {
    const owned = Object.keys(Game.collection || {});
    const pool = owned.length
      ? owned.map(k => UNIT_MAP[k]).filter(Boolean)
      : UNITS.filter(u => RARITY_IDX[u.rarity] >= 4);
    pool.sort((a, b) => RARITY_IDX[b.rarity] - RARITY_IDX[a.rarity]);
    return pool.slice(0, 24);
  },

  startLobbyFx() {
    const fx = document.getElementById('lbFx');
    const hero = document.getElementById('lbHeroCv');
    if (!fx || !hero) return;
    cancelAnimationFrame(this._lobbyRaf);

    const fit = (cv) => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { c, w: r.width, h: r.height };
    };

    /* 배경 입자 — 천천히 떠오르는 빛 알갱이 */
    let bg = fit(fx), hv = fit(hero);
    if (!this._fxParts) {
      this._fxParts = [];
      for (let i = 0; i < 46; i++) {
        this._fxParts.push({
          x: Math.random(), y: Math.random(),
          r: U.rand(.8, 2.6), sp: U.rand(.004, .018),
          a: U.rand(.15, .5), hue: U.pick([210, 265, 300, 45]),
        });
      }
    }
    const pool = this.heroPool();
    const t0 = performance.now();

    const frame = () => {
      const now = performance.now();
      const t = (now - t0) / 1000;

      /* --- 배경 --- */
      bg.c.clearRect(0, 0, bg.w, bg.h);
      for (const p of this._fxParts) {
        p.y -= p.sp * .01;
        if (p.y < -.05) { p.y = 1.05; p.x = Math.random(); }
        const x = p.x * bg.w, y = p.y * bg.h;
        bg.c.fillStyle = `hsla(${p.hue},90%,72%,${p.a})`;
        bg.c.beginPath(); bg.c.arc(x, y, p.r, 0, Math.PI * 2); bg.c.fill();
      }

      /* --- 쇼케이스 --- */
      hv.c.clearRect(0, 0, hv.w, hv.h);
      const def = pool[this.heroIdx % Math.max(1, pool.length)];
      if (def) {
        const rar = RARITY[RARITY_IDX[def.rarity]];
        /* 등급색 무대 조명 */
        const cx = hv.w * .68;
        const g = hv.c.createRadialGradient(cx, hv.h * .95, 4, cx, hv.h * .95, hv.h * 1.05);
        g.addColorStop(0, U.rgba(rar.glow, .45));
        g.addColorStop(.55, U.rgba(rar.color, .12));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        hv.c.fillStyle = g; hv.c.fillRect(0, 0, hv.w, hv.h);
        /* 뒤로 도는 광선 */
        hv.c.save();
        hv.c.globalCompositeOperation = 'lighter';
        hv.c.translate(cx, hv.h * .78);
        for (let i = 0; i < 10; i++) {
          const a = t * .25 + i / 10 * Math.PI * 2;
          hv.c.fillStyle = U.rgba(rar.glow, .05);
          hv.c.beginPath();
          hv.c.moveTo(0, 0);
          hv.c.arc(0, 0, hv.h * .95, a, a + .16);
          hv.c.closePath(); hv.c.fill();
        }
        hv.c.restore();
        /* 유닛 */
        const S = hv.h * .25;
        GFX.drawCharOutlined(hv.c, cx, hv.h * .82, S,
          Draw.unitLook(def), { t, phase: t * 1.6, aim: 0, seed: this.heroIdx });
        /* 반짝이 */
        for (let i = 0; i < 7; i++) {
          const ph = (t * .5 + i / 7) % 1;
          const a = i / 7 * Math.PI * 2 + t * .4;
          const rr = hv.h * (.2 + ph * .3);
          hv.c.globalAlpha = (1 - ph) * .8;
          hv.c.fillStyle = rar.glow;
          GFX.star(hv.c, cx + Math.cos(a) * rr * 1.2,
            hv.h * .74 + Math.sin(a) * rr * .5, 2.6 * (1 - ph * .5), 4);
        }
        hv.c.globalAlpha = 1;
      }
      this._lobbyRaf = requestAnimationFrame(frame);
    };
    frame();

    /* 화면 크기가 바뀌면 다시 맞춘다 */
    if (!this._lobbyResize) {
      this._lobbyResize = () => { bg = fit(fx); hv = fit(hero); };
      window.addEventListener('resize', this._lobbyResize);
    }
  },

  stopLobbyFx() { cancelAnimationFrame(this._lobbyRaf); this._lobbyRaf = 0; },

  /** 쇼케이스 유닛 교체 */
  nextHero() {
    const pool = this.heroPool();
    if (!pool.length) return;
    this.heroIdx = (this.heroIdx + 1) % pool.length;
    const def = pool[this.heroIdx];
    const rar = RARITY[RARITY_IDX[def.rarity]];
    const n = document.getElementById('lbHeroName');
    const s = document.getElementById('lbHeroSub');
    if (n) { n.textContent = def.name; n.style.background = 'none'; n.style.color = rar.color; }
    if (s) s.textContent = rar.name + ' · ' + (CLASSES[def.cls] ? CLASSES[def.cls].name : def.cls);
    SFX.play('tab');
  },

  renderLobby() {
    const p = Account.profile, u = Account.current;
    if (!p || !u) return;
    const title = Account.titleObj(), frame = Account.frameObj(), badge = Account.badgeObj();
    const m = Game.metaStats;

    document.getElementById('lbNick').textContent = u.nick;
    document.getElementById('lbNick').style.color = frame.key === 'rainbow' ? '#ff9ae8' : '#eef4ff';
    const tEl = document.getElementById('lbTitle');
    tEl.textContent = title.name; tEl.style.color = title.color;
    document.getElementById('lbBadge').textContent = badge.icon;
    document.getElementById('lbKind').textContent = Account.kindLabel();

    const av = document.getElementById('lbAvatar');
    av.className = 'lb-avatar frame-' + frame.key;
    av.style.borderColor = frame.color;
    av.style.boxShadow = `0 0 22px -4px ${frame.color}`;

    /* 레벨 */
    const need = Account.expForLevel(p.level);
    document.getElementById('lbLevel').textContent = 'Lv.' + p.level;
    document.getElementById('lbExpFill').style.width = U.clamp(p.exp / need, 0, 1) * 100 + '%';
    document.getElementById('lbExpText').textContent = `${Math.floor(p.exp)} / ${need}`;

    /* 재화 */
    document.getElementById('lbGem').textContent = U.fmt(Game.gems);

    /* 요약 통계 */
    document.getElementById('lbStats').innerHTML = `
      <div><span>최고 웨이브</span><b>${m.maxWave || 0}</b></div>
      <div><span>총 처치</span><b>${U.fmt(m.kills || 0)}</b></div>
      <div><span>보스 처치</span><b>${m.bossKills || 0}</b></div>
      <div><span>플레이</span><b>${m.runs || 0}회</b></div>
      <div><span>도감</span><b>${Game.collectedCount()}/${UNITS.length}</b></div>
      <div><span>업적</span><b>${Object.keys(Game.achieved).length}/${ACHIEVEMENTS.length}</b></div>`;

    /* 알림 배지 */
    const daily = Account.dailyState();
    document.getElementById('badgeDaily').classList.toggle('hidden', !daily.canClaim);
    const qs = Account.ensureQuests(false);
    const anyQuest = qs.some(q => !q.claimed && Account.questProgress(q.key).pct >= 1);
    document.getElementById('badgeQuest').classList.toggle('hidden', !anyQuest);

    document.getElementById('lbTip').textContent = '💡 ' + U.pick(TIPS);
  },

  bindLobby() {
    const menu = {
      btnPlay: () => this.openPanel('map'),
      btnProfile: () => this.openPanel('profile'),
      btnShop: () => this.openPanel('shop'),
      btnCollection: () => this.openPanel('codex'),
      btnAchieve: () => this.openPanel('ach'),
      btnHonor: () => this.openPanel('perks'),
      btnDaily: () => this.openPanel('daily'),
      btnQuest: () => this.openPanel('quest'),
      btnRecords: () => this.openPanel('records'),
      btnSetting: () => this.openPanel('settings'),
      lbHeroNext: () => this.nextHero(),
      btnAccount: () => this.openPanel('account'),
    };
    for (const id in menu) {
      const el = document.getElementById(id);
      if (el) el.onclick = () => { SFX.init(); SFX.resume(); SFX.play('click'); menu[id](); };
    }
    document.getElementById('lpClose').onclick = () => { this.closePanel(); SFX.play('click'); };
    document.getElementById('lobbyPanel').addEventListener('click', e => {
      if (e.target.id === 'lobbyPanel') this.closePanel();
    });
  },

  /* =================================================================
   *  패널
   * ================================================================= */
  openPanel(key) {
    this.panel = key;
    this.el.panel.classList.remove('hidden');
    this.renderPanel();
  },
  closePanel() {
    this.panel = null;
    this.el.panel.classList.add('hidden');
    this.renderLobby();
  },

  renderPanel() {
    const titles = {
      map: '전장 선택', profile: '프로필 꾸미기', shop: '상점', codex: '도감',
      ach: '업적', perks: '명예 강화', daily: '출석 보상', quest: '일일 퀘스트',
      records: '전적', settings: '설정', account: '계정',
    };
    this.el.panelTitle.textContent = titles[this.panel] || '';
    const b = this.el.panelBody;
    b.scrollTop = 0;
    switch (this.panel) {
      case 'map': this.renderMapPanel(b); break;
      case 'profile': this.renderProfilePanel(b); break;
      case 'shop': this.renderShopPanel(b); break;
      case 'codex': this.renderCodexPanel(b); break;
      case 'ach': this.renderAchPanel(b); break;
      case 'perks': this.renderPerkPanel(b); break;
      case 'daily': this.renderDailyPanel(b); break;
      case 'quest': this.renderQuestPanel(b); break;
      case 'records': this.renderRecordsPanel(b); break;
      case 'settings': this.renderSettingsPanel(b); break;
      case 'account': this.renderAccountPanel(b); break;
    }
  },

  /* --------------------------------------------------- 맵 선택 */
  renderMapPanel(b) {
    /* 스크롤을 내리지 않아도 항상 보이는 상단 고정 시작 바 (핵심 버그 수정) */
    b.innerHTML = `
      <div class="map-sticky-bar" id="mapStickyBar">
        <div class="msb-info">
          <span class="msb-label">선택한 전장</span>
          <b id="msbMapName">${this.esc(this.selectedMap.name)}</b>
        </div>
        <button class="bigbtn msb-start" id="startBattle">⚔ 전투 시작</button>
      </div>
      <div class="p-note">이전 맵을 100웨이브까지 클리어하면 다음 전장이 열린다. 맵을 탭해서 고른 뒤, 위 버튼이나 카드를 한 번 더 탭하면 바로 시작한다.</div>
      <div class="maplist" id="mapList"></div>`;
    const list = document.getElementById('mapList');
    MAPS.forEach((m, i) => {
      const unlocked = i === 0 || Game.unlockedMaps[m.key];
      const isSel = m.key === this.selectedMap.key;
      const d = document.createElement('div');
      d.className = 'mapcard2' + (isSel ? ' on' : '') + (unlocked ? '' : ' lock');
      d.innerHTML = `<canvas width="220" height="130"></canvas>
        <div class="mc-body">
          <div class="mc-n">${m.name} ${unlocked ? '' : '🔒'}</div>
          <div class="mc-d">${m.desc}</div>
          <div class="mc-tags">
            <span class="mc-diff">난이도 ×${m.diff.toFixed(2)}</span>
            ${m.weather ? `<span class="mc-w">${this.weatherName(m.weather)}</span>` : ''}
          </div>
          ${(m.mods || []).map(md => `<div class="mc-mod" title="${md.desc}">${md.icon} ${md.name}
            <i>${md.desc}</i></div>`).join('')}
        </div>`;
      d.onclick = () => {
        if (!unlocked) { this.toast('아직 잠겨 있다', '#ff6b6b'); SFX.play('error'); return; }
        if (isSel) { this.startBattle(); return; }  // 이미 선택된 맵을 다시 탭하면 즉시 시작
        this.selectedMap = m; SFX.play('click'); this.renderMapPanel(b);
      };
      list.appendChild(d);
      this.drawMapThumb(d.querySelector('canvas'), m);
    });
    document.getElementById('startBattle').onclick = () => this.startBattle();
  },

  weatherName(w) {
    return { rain: '🌧 비', snow: '❄ 눈', ember: '🔥 불티', sand: '🏜 모래폭풍', ash: '🌫 잿가루' }[w] || '';
  },

  drawMapThumb(cv, m) {
    const c = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const ts = Math.min(W / GRID_W, H / GRID_H);
    const ox = (W - GRID_W * ts) / 2, oy = (H - GRID_H * ts) / 2;
    const g = c.createLinearGradient(0, 0, W * .4, H);
    g.addColorStop(0, m.bg); g.addColorStop(1, m.bg2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    /* 노이즈 */
    for (let i = 0; i < 220; i++) {
      const x = GFX.hash(i, 1, m.diff * 100) * W, y = GFX.hash(i, 2, m.diff * 100) * H;
      c.fillStyle = GFX.hash(i, 3, 7) > .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.07)';
      c.fillRect(x, y, 3, 3);
    }
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = U.mixHex(m.road, '#000000', .4); c.lineWidth = ts * .9;
    this.thumbPath(c, m, ox, oy, ts);
    c.strokeStyle = m.road; c.lineWidth = ts * .72;
    this.thumbPath(c, m, ox, oy, ts);
    c.strokeStyle = U.rgba(m.accent, .5); c.lineWidth = ts * .12;
    this.thumbPath(c, m, ox, oy, ts);
  },
  thumbPath(c, m, ox, oy, ts) {
    c.beginPath();
    m.path.forEach((p, i) => {
      const x = ox + (p[0] + .5) * ts, y = oy + (p[1] + .5) * ts;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    c.stroke();
  },

  startBattle() {
    SFX.init(); SFX.resume();
    this.hideLobby();
    Game.resetRun(this.selectedMap);
    Game.paused = false;
    UI.refresh();
    UI.toast(this.selectedMap.name + ' 진입!', '#7cff9c');
    SFX.play('wave');
    if (window.Tutorial) setTimeout(() => Tutorial.start(false), 900);
  },

  /* --------------------------------------------------- 프로필 꾸미기 */
  renderProfilePanel(b) {
    const cats = [
      { k: 'body', n: '몸' }, { k: 'head', n: '머리' }, { k: 'hair', n: '헤어' },
      { k: 'gear', n: '장비' }, { k: 'weapon', n: '무기' }, { k: 'wings', n: '날개' },
      { k: 'skin', n: '피부색' }, { k: 'hairCol', n: '머리색' }, { k: 'color', n: '테마색' },
      { k: 'frame', n: '프레임' }, { k: 'badge', n: '배지' }, { k: 'title', n: '칭호' },
    ];
    b.innerHTML = `
      <div class="pe-top">
        <canvas id="peCanvas" width="260" height="260"></canvas>
        <div class="pe-info">
          <div class="pe-nick" id="peNick">${this.esc(Account.displayName())}</div>
          <div class="pe-title" id="peTitleTxt"></div>
          <button class="minibtn" id="peRename">✏ 닉네임 변경</button>
          <button class="minibtn" id="peRandom">🎲 랜덤 코디</button>
          <div class="pe-gem">보유 💎 <b id="peGem">${Game.gems}</b></div>
        </div>
      </div>
      <div class="pe-cats" id="peCats">${cats.map(c =>
      `<button class="${this.editCat === c.k ? 'on' : ''}" data-c="${c.k}">${c.n}</button>`).join('')}</div>
      <div class="pe-items" id="peItems"></div>`;

    b.querySelectorAll('#peCats button').forEach(x => x.onclick = () => {
      this.editCat = x.dataset.c; SFX.play('click'); this.renderProfilePanel(b);
    });
    document.getElementById('peRename').onclick = () => this.promptRename();
    document.getElementById('peRandom').onclick = () => this.randomizeAvatar();

    const t = Account.titleObj();
    const tt = document.getElementById('peTitleTxt');
    tt.textContent = t.name; tt.style.color = t.color;

    this.renderProfileItems();
  },

  renderProfileItems() {
    const host = document.getElementById('peItems');
    if (!host) return;
    const cat = this.editCat, p = Account.profile;
    let html = '';

    if (cat === 'skin' || cat === 'hairCol' || cat === 'color') {
      html = '<div class="swatches">' + AVATAR[cat].map(col =>
        `<button class="sw ${p.avatar[cat] === col ? 'on' : ''}" data-col="${col}" style="background:${col}"></button>`
      ).join('') + '</div>';
      host.innerHTML = html;
      host.querySelectorAll('.sw').forEach(x => x.onclick = () => {
        p.avatar[cat] = x.dataset.col; Account.saveProfile();
        SFX.play('click'); this.renderProfileItems();
      });
      return;
    }

    if (cat === 'title') {
      html = TITLES.map(t => {
        const un = Account.titleUnlocked(t);
        const on = p.title === t.key;
        return `<div class="pitem ${on ? 'on' : ''} ${un ? '' : 'lock'}" data-k="${t.key}">
          <div class="pi-ic" style="color:${t.color}">✦</div>
          <div class="pi-t"><div class="pi-n" style="color:${t.color}">${t.name}</div>
          <div class="pi-d">${t.desc}</div></div>
          <div class="pi-a">${un ? (on ? '착용중' : '착용') : '🔒'}</div></div>`;
      }).join('');
      host.innerHTML = html;
      host.querySelectorAll('.pitem').forEach(x => x.onclick = () => {
        const t = TITLES.find(y => y.key === x.dataset.k);
        if (!Account.titleUnlocked(t)) { this.toast('조건 미달성 : ' + t.desc, '#ff6b6b'); SFX.play('error'); return; }
        Account.equip('title', t.key); SFX.play('upgrade'); this.renderProfilePanel(this.el.panelBody);
      });
      return;
    }

    if (cat === 'frame' || cat === 'badge') {
      const list = cat === 'frame' ? FRAMES : BADGES;
      html = list.map(it => {
        const owned = it.cost === 0 || Account.owns(cat, it.key);
        const on = (cat === 'frame' ? p.frame : p.badge) === it.key;
        return `<div class="pitem ${on ? 'on' : ''}" data-k="${it.key}">
          <div class="pi-ic" style="color:${it.color || '#eef4ff'}">${cat === 'badge' ? it.icon : '◻'}</div>
          <div class="pi-t"><div class="pi-n">${it.name}</div>
          <div class="pi-d">${owned ? '보유 중' : '💎 ' + it.cost}</div></div>
          <div class="pi-a">${owned ? (on ? '착용중' : '착용') : '구매'}</div></div>`;
      }).join('');
      host.innerHTML = html;
      host.querySelectorAll('.pitem').forEach(x => x.onclick = () => {
        const it = list.find(y => y.key === x.dataset.k);
        const owned = it.cost === 0 || Account.owns(cat, it.key);
        if (!owned) {
          const r = Account.buy(cat, it.key, it.cost);
          if (!r.ok) { this.toast(r.error, '#ff6b6b'); SFX.play('error'); return; }
          this.toast(it.name + ' 구매 완료!', '#7cff9c'); SFX.play('unlock');
        }
        Account.equip(cat, it.key);
        SFX.play('upgrade');
        this.renderProfilePanel(this.el.panelBody);
      });
      return;
    }

    /* 아바타 파츠 */
    const list = AVATAR[cat] || [];
    html = list.map(it => {
      const owned = it.cost === 0 || Account.owns(cat, it.key);
      const on = p.avatar[cat] === it.key;
      return `<div class="pitem card ${on ? 'on' : ''}" data-k="${it.key}">
        <canvas width="120" height="120" data-prev="${it.key}"></canvas>
        <div class="pi-n">${it.name}</div>
        <div class="pi-d">${owned ? (on ? '착용중' : '보유') : '💎 ' + it.cost}</div></div>`;
    }).join('');
    host.innerHTML = `<div class="pgrid">${html}</div>`;

    /* 미리보기 렌더 */
    host.querySelectorAll('[data-prev]').forEach(cv => {
      const preview = Object.assign({}, p.avatar);
      preview[cat] = cv.dataset.prev;
      Draw.portraitAvatar(cv, preview, performance.now() / 1000);
    });

    host.querySelectorAll('.pitem').forEach(x => x.onclick = () => {
      const it = list.find(y => y.key === x.dataset.k);
      const owned = it.cost === 0 || Account.owns(cat, it.key);
      if (!owned) {
        const r = Account.buy(cat, it.key, it.cost);
        if (!r.ok) { this.toast(r.error, '#ff6b6b'); SFX.play('error'); return; }
        this.toast(it.name + ' 구매 완료!', '#7cff9c'); SFX.play('unlock');
      }
      Account.equip(cat, it.key);
      SFX.play('click');
      this.renderProfilePanel(this.el.panelBody);
    });
  },

  promptRename() {
    const cur = Account.displayName();
    const n = prompt('새 닉네임 (2~12자)', cur);
    if (n === null) return;
    const r = Account.setNick(n);
    if (!r.ok) { this.toast(r.error, '#ff6b6b'); SFX.play('error'); return; }
    this.toast('닉네임이 변경되었다', '#7cff9c');
    SFX.play('upgrade');
    this.renderProfilePanel(this.el.panelBody);
  },

  randomizeAvatar() {
    const p = Account.profile;
    for (const cat of ['body', 'head', 'hair', 'gear', 'weapon', 'wings']) {
      const owned = AVATAR[cat].filter(it => it.cost === 0 || Account.owns(cat, it.key));
      if (owned.length) p.avatar[cat] = U.pick(owned).key;
    }
    p.avatar.skin = U.pick(AVATAR.skin);
    p.avatar.hairCol = U.pick(AVATAR.hairCol);
    p.avatar.color = U.pick(AVATAR.color);
    Account.saveProfile();
    SFX.play('summon');
    this.renderProfilePanel(this.el.panelBody);
  },

  /* --------------------------------------------------- 상점 */
  renderShopPanel(b) {
    b.innerHTML = `<div class="p-note">젬으로 다음 판에 적용되는 부스터를 구매한다. 보유 💎 <b>${Game.gems}</b></div>` +
      SHOP.map(s => {
        const active = Game.boosters && Game.boosters[s.key];
        return `<div class="shopitem ${active ? 'active' : ''}">
          <div class="si-ic">${s.icon}</div>
          <div class="si-t"><div class="si-n">${s.name}</div><div class="si-d">${s.desc}</div></div>
          <button data-shop="${s.key}" class="${Game.gems >= s.cost ? '' : 'dis'}">${active ? '적용됨' : '💎 ' + s.cost}</button>
        </div>`;
      }).join('');
    b.querySelectorAll('[data-shop]').forEach(x => x.onclick = () => {
      const s = SHOP.find(y => y.key === x.dataset.shop);
      if (s.key === 'reroll') {
        if (Game.gems < s.cost) { this.toast('젬이 부족하다', '#ff6b6b'); SFX.play('error'); return; }
        Game.gems -= s.cost;
        Account.ensureQuests(true);
        Game.saveMeta();
        this.toast('일일 퀘스트를 새로 뽑았다', '#7cff9c'); SFX.play('upgrade');
        this.renderShopPanel(b); return;
      }
      if (Game.boosters[s.key]) { this.toast('이미 적용되어 있다', '#ffcf3f'); return; }
      if (Game.gems < s.cost) { this.toast('젬이 부족하다', '#ff6b6b'); SFX.play('error'); return; }
      Game.gems -= s.cost;
      Game.boosters[s.key] = 1;
      Game.saveMeta();
      SFX.play('coin');
      this.toast(s.name + ' 구매! 다음 전투에 적용된다', '#ffd24d');
      this.renderShopPanel(b);
    });
  },

  /* --------------------------------------------------- 도감 */
  codexTab: 'unit',
  codexFilter: 'all',
  renderCodexPanel(b) {
    const tabs = [['unit', `유닛 ${UNITS.length}`], ['enemy', `적 ${ENEMIES.filter(e => !e.boss).length}`],
    ['boss', `보스 ${BOSS_ORDER.length}`], ['syn', '시너지']];
    b.innerHTML = `<div class="subtabs">${tabs.map(([k, n]) =>
      `<button class="${this.codexTab === k ? 'on' : ''}" data-ct="${k}">${n}</button>`).join('')}</div>
      <div id="cxHost"></div>`;
    b.querySelectorAll('[data-ct]').forEach(x => x.onclick = () => {
      this.codexTab = x.dataset.ct; SFX.play('click'); this.renderCodexPanel(b);
    });
    const host = document.getElementById('cxHost');

    if (this.codexTab === 'syn') { this.renderSynergyList(host); return; }

    if (this.codexTab === 'unit') {
      const found = Game.collection || {};
      host.innerHTML = `<div class="p-note">발견 ${Game.collectedCount()} / ${UNITS.length} — 소환하거나 합성하면 등록된다.</div>
        <div class="cxgrid">` + UNITS.map((u, i) => {
        const r = RARITY[RARITY_IDX[u.rarity]];
        const seen = !!found[u.key];
        return `<div class="cx ${seen ? '' : 'unseen'}" style="border-color:${seen ? r.color : 'rgba(120,160,220,.2)'}"
             data-uk="${u.key}">
            <canvas width="140" height="140" data-un="${i}"></canvas>
            <div class="cx-n">${seen ? u.name : '???'}</div>
            <div class="cx-r" style="color:${r.color}">${r.name}</div>
            <div class="cx-e" style="color:${ELEM[u.elem].color}">${ELEM[u.elem].icon} ${CLASSES[u.cls].name}</div>
          </div>`;
      }).join('') + '</div>';
      host.querySelectorAll('[data-un]').forEach(cv => {
        const u = UNITS[+cv.dataset.un];
        if (Game.collection && Game.collection[u.key]) Draw.portraitUnit(cv, u, 0);
        else this.drawSilhouette(cv, u);
      });
      host.querySelectorAll('.cx').forEach(x => x.onclick = () => this.showUnitDetail(x.dataset.uk));
      return;
    }

    const list = this.codexTab === 'boss' ? ENEMIES.filter(e => e.boss) : ENEMIES.filter(e => !e.boss);
    host.innerHTML = '<div class="cxgrid">' + list.map((e, i) => `
      <div class="cx" style="border-color:${e.boss ? '#ffd24d' : 'rgba(120,160,220,.25)'}" data-ek="${e.key}">
        <canvas width="140" height="140" data-en="${i}"></canvas>
        <div class="cx-n">${e.name}</div>
        <div class="cx-r" style="color:${e.color}">${e.boss ? '👑 BOSS' : 'T' + e.tier}</div>
        <div class="cx-e">${(e.flags || []).slice(0, 2).map(f => this.flagName(f)).join(' ') || '-'}</div>
      </div>`).join('') + '</div>';
    host.querySelectorAll('[data-en]').forEach(cv => Draw.portraitEnemy(cv, list[+cv.dataset.en]));
    host.querySelectorAll('.cx').forEach(x => x.onclick = () => this.showEnemyDetail(x.dataset.ek));
  },

  drawSilhouette(cv, def) {
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    const look = Object.assign({}, Draw.unitLook(def), {
      id: 'sil_' + def.key, color: '#2b3242', accent: '#2b3242', skin: '#2b3242',
      hairCol: '#2b3242', aura: null, wingCol: '#2b3242'
    });
    GFX.drawChar(c, cv.width / 2, cv.height * .62, cv.width * .26, look, { t: 0, phase: 0, aim: 0 });
    c.fillStyle = 'rgba(140,170,210,.7)';
    c.font = '900 30px system-ui'; c.textAlign = 'center';
    c.fillText('?', cv.width / 2, cv.height * .6);
  },

  flagName(f) {
    return {
      fast: '⚡빠름', flying: '🕊비행', armored: '🛡중장갑', shield: '🔷보호막',
      regen: '💚재생', split: '🧬분열', healer: '✚치유', summoner: '👁소환',
      teleport: '✨순간이동', rage: '😡격노', ghost: '👻유령', undead: '💀언데드',
      magicres: '🔮마법저항', boss: '👑보스',
    }[f] || f;
  },

  showUnitDetail(key) {
    const u = UNIT_MAP[key];
    if (!u) return;
    const seen = Game.collection && Game.collection[key];
    if (!seen) { this.toast('아직 발견하지 못한 유닛이다', '#ffcf3f'); return; }
    const r = RARITY[RARITY_IDX[u.rarity]];
    const rows = [
      ['등급', `<b style="color:${r.color}">${r.name}</b>`],
      ['클래스', CLASSES[u.cls].icon + ' ' + CLASSES[u.cls].name],
      ['원소', `<span style="color:${ELEM[u.elem].color}">${ELEM[u.elem].icon} ${ELEM[u.elem].name}</span>`],
      ['기본 피해', U.fmt(u.dmg * r.mul)],
      ['공격 속도', u.spd.toFixed(2) + '/s'],
      ['사거리', u.rng > 20 ? '무한' : u.rng.toFixed(1)],
      ['DPS(1성)', U.fmt(u.dmg * r.mul * u.spd * (u.multishot || 1))],
    ];
    if (u.splash) rows.push(['범위', u.splash.toFixed(1)]);
    if (u.chain) rows.push(['연쇄', u.chain + '회']);
    if (u.pierce) rows.push(['관통', u.pierce + '체']);
    if (u.crit) rows.push(['치명타', U.pct(u.crit) + ' / ' + Math.round((u.critMul || 2) * 100) + '%']);
    if (u.pen) rows.push(['방어 관통', U.pct(u.pen)]);
    if (u.trueDmg) rows.push(['특성', '방어 완전 무시']);
    if (u.execute) rows.push(['처형', '체력 ' + U.pct(u.execute) + ' 이하']);
    if (u.summon) rows.push(['소환', u.summon.count + '기']);
    if (u.aura) rows.push(['오라', `${u.aura.type} +${Math.round(u.aura.amt * 100)}% / ${u.aura.radius}칸`]);

    this.showDetailModal(u.name, cv => Draw.portraitUnit(cv, u, 3), rows, u.desc, r.color);
  },

  showEnemyDetail(key) {
    const e = ENEMY_MAP[key];
    if (!e) return;
    const rows = [
      ['티어', e.boss ? '보스' : 'T' + e.tier],
      ['체력 계수', '×' + e.hp],
      ['이동 속도', e.spd.toFixed(2)],
      ['방어력 계수', '' + e.armor],
      ['보상 계수', '×' + e.bounty],
    ];
    if (e.flags) rows.push(['특성', e.flags.map(f => this.flagName(f)).join(', ')]);
    if (e.resist) {
      rows.push(['저항', Object.keys(e.resist).map(k =>
        `${ELEM[k] ? ELEM[k].name : k} ${e.resist[k] > 0 ? '−' : '+'}${Math.abs(Math.round(e.resist[k] * 100))}%`).join(', ')]);
    }
    if (e.splitInto) rows.push(['분열', `${ENEMY_MAP[e.splitInto] ? ENEMY_MAP[e.splitInto].name : e.splitInto} ×${e.splitN}`]);
    if (e.summonKey) rows.push(['소환', `${ENEMY_MAP[e.summonKey] ? ENEMY_MAP[e.summonKey].name : e.summonKey} ×${e.summonN}`]);
    this.showDetailModal(e.name, cv => Draw.portraitEnemy(cv, e), rows, '', e.color);
  },

  showDetailModal(name, drawFn, rows, desc, color) {
    const wrap = document.getElementById('detailModal');
    wrap.classList.remove('hidden');
    wrap.innerHTML = `<div class="dm-box" style="border-color:${color}">
      <button class="dm-close">✕</button>
      <canvas id="dmCanvas" width="200" height="200"></canvas>
      <div class="dm-name" style="color:${color}">${this.esc(name)}</div>
      ${desc ? `<div class="dm-desc">${this.esc(desc)}</div>` : ''}
      <div class="dm-rows">${rows.map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>
    </div>`;
    drawFn(document.getElementById('dmCanvas'));
    wrap.querySelector('.dm-close').onclick = () => wrap.classList.add('hidden');
    wrap.onclick = e => { if (e.target === wrap) wrap.classList.add('hidden'); };
  },

  renderSynergyList(host) {
    let h = '<div class="p-note">같은 클래스/원소 유닛을 모으면 자동으로 발동한다.</div>';
    h += '<div class="synsec">클래스</div>';
    for (const k in SYNERGY.class) {
      h += `<div class="synrow"><div class="sr-i">${CLASSES[k].icon}</div>
        <div class="sr-t"><div class="sr-n">${CLASSES[k].name}</div>
        <div class="sr-d">${SYNERGY.class[k].map(t => `<b>${t.n}기</b> ` +
        Object.keys(t).filter(x => x !== 'n').map(x => `${this.statName(x)} +${Math.round(t[x] * 100)}%`).join(', ')).join(' / ')}</div></div></div>`;
    }
    h += '<div class="synsec">원소</div>';
    for (const k in SYNERGY.elem) {
      h += `<div class="synrow"><div class="sr-i" style="color:${ELEM[k].color}">${ELEM[k].icon}</div>
        <div class="sr-t"><div class="sr-n" style="color:${ELEM[k].color}">${ELEM[k].name}</div>
        <div class="sr-d">${SYNERGY.elem[k].map(t => `<b>${t.n}기</b> ` +
        Object.keys(t).filter(x => x !== 'n').map(x => `${this.statName(x)} +${Math.round(t[x] * 100)}%`).join(', ')).join(' / ')}</div></div></div>`;
    }
    host.innerHTML = h;
  },
  statName(k) {
    return {
      dmg: '피해', spd: '공속', rng: '사거리', splash: '범위', crit: '치명타',
      critdmg: '치명피해', pen: '관통', aura: '오라', chain: '연쇄', gold: '골드',
      summon: '소환수', dot: '지속피해', slow: '둔화', freeze: '빙결', stun: '기절',
      curse: '저주', multishot: '다중사격',
    }[k] || k;
  },

  /* --------------------------------------------------- 업적 */
  renderAchPanel(b) {
    const done = ACHIEVEMENTS.filter(a => Game.achieved[a.key]).length;
    b.innerHTML = `<div class="p-note">달성 ${done}/${ACHIEVEMENTS.length} · 보유 💎 ${Game.gems}</div>` +
      ACHIEVEMENTS.map(a => `<div class="ach ${Game.achieved[a.key] ? 'done' : ''}">
        <div class="ai">${a.icon}</div>
        <div><div class="an">${a.name}</div><div class="ad">${a.desc}</div></div>
        <div class="ag">💎${a.gem}</div></div>`).join('');
  },

  /* --------------------------------------------------- 명예 강화 */
  renderPerkPanel(b) {
    b.innerHTML = `<div class="p-note">업적으로 얻은 💎로 영구 강화를 구매한다. 보유 💎 <b>${Game.gems}</b></div>` +
      UI.PERKS.map(p => {
        const lv = Game.perks[p.key] || 0;
        const max = lv >= p.max;
        const cost = p.cost * (lv + 1);
        return `<div class="perk">
          <div class="pi">${p.icon}</div>
          <div><div class="pn">${p.name} <span style="color:var(--blue);font-size:11px">Lv.${lv}/${p.max}</span></div>
          <div class="pd">${p.desc}</div></div>
          <button data-perk="${p.key}" class="${!max && Game.gems >= cost ? '' : 'dis'}">${max ? 'MAX' : '💎' + cost}</button>
        </div>`;
      }).join('');
    b.querySelectorAll('[data-perk]').forEach(x => x.onclick = () => {
      const p = UI.PERKS.find(y => y.key === x.dataset.perk);
      const lv = Game.perks[p.key] || 0;
      if (lv >= p.max) return;
      const cost = p.cost * (lv + 1);
      if (Game.gems < cost) { this.toast('젬이 부족하다', '#ff6b6b'); SFX.play('error'); return; }
      Game.gems -= cost; Game.perks[p.key] = lv + 1;
      Game.saveMeta(); Game.refreshAll();
      SFX.play('upgrade');
      this.renderPerkPanel(b);
    });
  },

  /* --------------------------------------------------- 출석 */
  renderDailyPanel(b) {
    const st = Account.dailyState();
    b.innerHTML = `<div class="p-note">매일 접속하면 젬을 받는다. 현재 연속 ${st.streak}일</div>
      <div class="dailygrid">${DAILY_REWARDS.map((d, i) => {
      const claimed = i + 1 < st.day || (!st.canClaim && i + 1 === st.day);
      const today = st.canClaim && i + 1 === st.day;
      return `<div class="dcell ${claimed ? 'done' : ''} ${today ? 'today' : ''}">
          <div class="dc-d">${d.day}일차</div>
          <div class="dc-g">💎</div>
          <div class="dc-n">${d.gem}</div>
          ${claimed ? '<div class="dc-c">✔</div>' : ''}
        </div>`;
    }).join('')}</div>
      <button class="bigbtn ${st.canClaim ? '' : 'dis'}" id="claimDaily">
        ${st.canClaim ? `${st.day}일차 보상 받기` : '오늘은 이미 받았다'}</button>`;
    document.getElementById('claimDaily').onclick = () => {
      const r = Account.claimDaily();
      if (!r.ok) { this.toast(r.error, '#ffcf3f'); SFX.play('error'); return; }
      this.toast(`출석 보상 💎${r.reward.gem} 획득! (연속 ${r.streak}일)`, '#6ffff0');
      SFX.play('unlock');
      FX.flash('#6ffff0', .3);
      this.renderDailyPanel(b);
    };
  },

  /* --------------------------------------------------- 퀘스트 */
  renderQuestPanel(b) {
    const qs = Account.ensureQuests(false);
    b.innerHTML = `<div class="p-note">매일 자정에 새로운 퀘스트가 주어진다.</div>` +
      qs.map(st => {
        const q = QUESTS.find(x => x.key === st.key);
        const pr = Account.questProgress(st.key);
        const can = pr.pct >= 1 && !st.claimed;
        return `<div class="quest ${st.claimed ? 'done' : ''}">
          <div class="q-t"><div class="q-n">${q.name}</div><div class="q-d">${q.desc}</div></div>
          <div class="q-bar"><div class="q-fill" style="width:${pr.pct * 100}%"></div>
            <span>${U.fmt(pr.cur)} / ${U.fmt(pr.target)}</span></div>
          <button data-q="${st.key}" class="${can ? '' : 'dis'}">${st.claimed ? '완료' : '💎' + q.gem}</button>
        </div>`;
      }).join('');
    b.querySelectorAll('[data-q]').forEach(x => x.onclick = () => {
      const r = Account.claimQuest(x.dataset.q);
      if (!r.ok) { this.toast(r.error || '아직이다', '#ffcf3f'); SFX.play('error'); return; }
      this.toast(`퀘스트 완료! 💎${r.gem}`, '#6ffff0');
      SFX.play('unlock');
      this.renderQuestPanel(b);
    });
  },

  /* --------------------------------------------------- 전적 */
  renderRecordsPanel(b) {
    const p = Account.profile;
    const recs = (p.records || []).slice().sort((a, b2) => b2.wave - a.wave).slice(0, 20);
    const m = Game.metaStats;
    b.innerHTML = `
      <div class="recsum">
        <div><span>최고 웨이브</span><b>${m.maxWave || 0}</b></div>
        <div><span>총 플레이</span><b>${m.runs || 0}</b></div>
        <div><span>승리</span><b>${m.wins || 0}</b></div>
        <div><span>누적 처치</span><b>${U.fmt(m.kills || 0)}</b></div>
        <div><span>누적 피해</span><b>${U.fmt(m.totalDmg || 0)}</b></div>
        <div><span>누적 골드</span><b>${U.fmt(m.totalGold || 0)}</b></div>
        <div><span>합성 횟수</span><b>${U.fmt(m.merges || 0)}</b></div>
        <div><span>최고 콤보</span><b>${m.maxCombo || 0}</b></div>
      </div>
      <div class="synsec">최근 전적 (상위 20)</div>
      ${recs.length ? recs.map((r, i) => `<div class="recrow">
          <div class="rr-i">${i + 1}</div>
          <div class="rr-t"><b>웨이브 ${r.wave}</b><span>${r.map}</span></div>
          <div class="rr-k">${U.fmt(r.kills)} 처치</div>
          <div class="rr-d">${new Date(r.date).toLocaleDateString()}</div>
        </div>`).join('') : '<div class="p-note">아직 전적이 없다. 전투를 시작하라!</div>'}`;
  },

  /* --------------------------------------------------- 설정 */
  renderSettingsPanel(b) {
    const s = Game.settings;
    b.innerHTML = `
      <div class="setrow"><span>🎵 배경음</span><div class="toggle ${s.music ? 'on' : ''}" data-t="music"></div></div>
      <div class="setrow"><span>🔊 효과음</span><div class="toggle ${s.sfx ? 'on' : ''}" data-t="sfx"></div></div>
      <div class="setrow"><span>🔈 볼륨</span><input type="range" id="volRange2" min="0" max="100" value="${Math.round(SFX.volume * 100)}"></div>
      <div class="setrow"><span>✨ 파티클</span><div class="toggle ${s.particles ? 'on' : ''}" data-t="particles"></div></div>
      <div class="setrow"><span>🔢 대미지 숫자</span><div class="toggle ${s.damageNumbers ? 'on' : ''}" data-t="damageNumbers"></div></div>
      <div class="p-note">조작 : Q 소환 · W 자동합성 · E 웨이브 · R 배속 · Space 일시정지 · 1~8 스킬<br>
        유닛을 드래그해 이동하거나 같은 유닛 위에 놓아 합성할 수 있다.</div>
      <div class="synsec">데이터</div>
      <button class="dangerbtn" id="wipeAll">이 기기의 모든 데이터 삭제</button>`;
    b.querySelectorAll('[data-t]').forEach(el => el.onclick = () => {
      const k = el.dataset.t;
      Game.settings[k] = !Game.settings[k];
      el.classList.toggle('on', Game.settings[k]);
      if (k === 'music') SFX.toggleMusic(Game.settings.music);
      if (k === 'sfx') SFX.enabled = Game.settings.sfx;
      if (k === 'particles') FX.max = Game.settings.particles ? 1400 : 120;
      Game.saveMeta(); SFX.play('click');
    });
    const vr = document.getElementById('volRange2');
    vr.oninput = () => { SFX.init(); SFX.setVolume(vr.value / 100); };
    document.getElementById('wipeAll').onclick = () => {
      if (!confirm('이 기기의 모든 계정/진행도를 삭제할까? 되돌릴 수 없다.')) return;
      try {
        localStorage.removeItem(Account.KEY_USERS);
        localStorage.removeItem(Account.KEY_SESSION);
        for (const uid in Account.users) localStorage.removeItem(Account.KEY_PROFILE + uid);
        Store.wipe();
      } catch (e) { }
      location.reload();
    };
  },

  /* --------------------------------------------------- 계정 */
  renderAccountPanel(b) {
    const u = Account.current;
    b.innerHTML = `
      <div class="accbox">
        <div class="acc-row"><span>닉네임</span><b>${this.esc(u.nick)}</b></div>
        <div class="acc-row"><span>계정 종류</span><b>${Account.kindLabel()}</b></div>
        <div class="acc-row"><span>아이디</span><b>${this.esc(u.id)}</b></div>
        <div class="acc-row"><span>가입일</span><b>${new Date(u.created).toLocaleDateString()}</b></div>
        <div class="acc-row"><span>레벨</span><b>Lv.${Account.profile.level}</b></div>
      </div>
      ${u.kind === 'local' ? `
        <div class="synsec">비밀번호 변경</div>
        <input class="inp" id="pwOld" type="password" placeholder="현재 비밀번호">
        <input class="inp" id="pwNew" type="password" placeholder="새 비밀번호 (4자 이상)">
        <button class="bigbtn" id="doChangePw">변경하기</button>` : ''}
      ${u.kind === 'guest' ? `<div class="p-note">게스트 계정은 이 브라우저에만 저장된다.
        진행도를 지키려면 회원가입하거나 Google 계정으로 로그인하라.</div>` : ''}
      <div class="synsec">계정 관리</div>
      <button class="bigbtn alt" id="doLogout">로그아웃</button>
      <button class="dangerbtn" id="doDelete">이 계정 삭제</button>`;

    const cp = document.getElementById('doChangePw');
    if (cp) cp.onclick = async () => {
      const r = await Account.changePassword(
        document.getElementById('pwOld').value, document.getElementById('pwNew').value);
      if (!r.ok) { this.toast(r.error, '#ff6b6b'); SFX.play('error'); return; }
      this.toast('비밀번호가 변경되었다', '#7cff9c'); SFX.play('upgrade');
      document.getElementById('pwOld').value = ''; document.getElementById('pwNew').value = '';
    };
    document.getElementById('doLogout').onclick = () => {
      Account.logout();
      this.closePanel();
      this.showAuth('login');
      this.toast('로그아웃되었다', '#9fd2ff');
    };
    document.getElementById('doDelete').onclick = () => {
      if (!confirm('정말 이 계정과 모든 진행도를 삭제할까?')) return;
      Account.deleteAccount();
      this.closePanel();
      this.showAuth('login');
    };
  },

  /* =================================================================
   *  아바타 애니메이션 루프
   * ================================================================= */
  startAvatarLoop() {
    const tick = () => {
      this.avatarT = performance.now() / 1000;
      if (Account.profile) {
        const a = document.getElementById('lbAvatarCv');
        if (a && !this.el.lobby.classList.contains('hidden')) {
          Draw.portraitAvatar(a, Account.profile.avatar, this.avatarT);
        }
        const pe = document.getElementById('peCanvas');
        if (pe && this.panel === 'profile') {
          Draw.portraitAvatar(pe, Account.profile.avatar, this.avatarT);
        }
      }
      this.rafId = requestAnimationFrame(tick);
    };
    tick();
  },

  /* =================================================================
   *  전투 종료 후 호출 : 결과 반영
   * ================================================================= */
  onRunFinished(win) {
    const p = Account.profile;
    if (!p) return;
    if (!p.records) p.records = [];
    p.records.push({
      wave: Game.wave + Game.loop * 100, map: Game.map.name,
      kills: Game.stats.kills, date: Date.now(), win: !!win,
    });
    if (p.records.length > 100) p.records = p.records.slice(-100);
    /* 경험치 : 웨이브 + 처치 */
    const exp = Math.floor(Game.wave * 12 + Game.stats.kills * .35 + Game.stats.bossKills * 40 + (win ? 300 : 0));
    const r = Account.addExp(exp);
    Account.saveProfile();
    return { exp, levels: r.levels, level: r.level };
  },

  esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
};

window.Lobby = Lobby;
