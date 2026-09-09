/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  account.js
 * -------------------------------------------------------------------------
 *  계정 시스템
 *   · 로컬 회원가입 / 로그인  (브라우저 localStorage 기반, 비밀번호는
 *     SHA-256 + 솔트 해시로만 저장한다. 서버가 없으므로 이 기기 안에서만
 *     유효한 "로컬 계정"이다.)
 *   · Google 계정 로그인 (Google Identity Services). config.js 의
 *     GOOGLE_CLIENT_ID 가 설정되고 http(s) 로 서빙될 때만 활성화된다.
 *   · 닉네임 / 아바타 / 칭호 / 프레임 / 배지 등 프로필
 *   · 계정별 저장 슬롯 (진행도·젬·업적·도감 모두 계정에 귀속)
 *   · 출석 보상 · 일일 퀘스트
 * ========================================================================= */
'use strict';

const Account = {
  KEY_USERS: 'itd_users_v1',
  KEY_SESSION: 'itd_session_v1',
  KEY_PROFILE: 'itd_profile_',      // + uid

  users: {},      // uid -> { uid, kind, id, nick, salt, hash, created, picture }
  current: null,  // 현재 로그인된 user 객체
  profile: null,  // 현재 프로필 (아바타/통계/설정)
  googleReady: false,
  googleError: null,

  /* =================================================================
   *  부팅
   * ================================================================= */
  init() {
    this.loadUsers();
    const sid = this.readSession();
    if (sid && this.users[sid]) {
      this.current = this.users[sid];
      this.loadProfile();
    }
    this.initGoogle();
    return this.current;
  },

  loadUsers() {
    try { this.users = JSON.parse(localStorage.getItem(this.KEY_USERS) || '{}') || {}; }
    catch (e) { this.users = {}; }
  },
  saveUsers() {
    try { localStorage.setItem(this.KEY_USERS, JSON.stringify(this.users)); } catch (e) { }
  },
  readSession() {
    try { return localStorage.getItem(this.KEY_SESSION); } catch (e) { return null; }
  },
  writeSession(uid) {
    try { uid ? localStorage.setItem(this.KEY_SESSION, uid) : localStorage.removeItem(this.KEY_SESSION); }
    catch (e) { }
  },

  /* =================================================================
   *  암호 해시 (WebCrypto SHA-256, 없으면 간이 해시로 폴백)
   * ================================================================= */
  async hash(text, salt) {
    const data = new TextEncoder().encode(salt + '::' + text + '::itd');
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      const buf = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    /* file:// 등에서 subtle 이 없을 때의 폴백 (보안 강도 낮음) */
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < data.length; i++) {
      h1 = ((h1 ^ data[i]) * 16777619) >>> 0;
      h2 = ((h2 + data[i] * (i + 7)) * 2654435761) >>> 0;
    }
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  },
  randSalt() {
    const a = new Uint8Array(12);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 256) | 0;
    return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /* =================================================================
   *  검증
   * ================================================================= */
  validateId(id) {
    if (!id || id.length < 3) return '아이디는 3자 이상이어야 한다';
    if (id.length > 20) return '아이디는 20자 이하여야 한다';
    if (!/^[a-zA-Z0-9_.-]+$/.test(id)) return '아이디는 영문/숫자/._- 만 사용할 수 있다';
    return null;
  },
  validatePw(pw) {
    if (!pw || pw.length < 4) return '비밀번호는 4자 이상이어야 한다';
    if (pw.length > 64) return '비밀번호가 너무 길다';
    return null;
  },
  validateNick(nick) {
    if (!nick) return '닉네임을 입력하라';
    const n = nick.trim();
    if (n.length < 2) return '닉네임은 2자 이상이어야 한다';
    if (n.length > 12) return '닉네임은 12자 이하여야 한다';
    if (/[<>&"'`\\/]/.test(n)) return '닉네임에 사용할 수 없는 문자가 있다';
    for (const uid in this.users) {
      if (this.users[uid].nick === n && (!this.current || this.current.uid !== uid))
        return '이미 사용 중인 닉네임이다';
    }
    return null;
  },

  /* =================================================================
   *  로컬 회원가입 / 로그인
   * ================================================================= */
  async signup(id, pw, nick) {
    let err = this.validateId(id) || this.validatePw(pw) || this.validateNick(nick);
    if (err) return { ok: false, error: err };
    const uid = 'local:' + id.toLowerCase();
    if (this.users[uid]) return { ok: false, error: '이미 존재하는 아이디다' };

    const salt = this.randSalt();
    const hash = await this.hash(pw, salt);
    const user = {
      uid, kind: 'local', id, nick: nick.trim(), salt, hash,
      created: Date.now(), picture: null,
    };
    this.users[uid] = user;
    this.saveUsers();
    this.current = user;
    this.writeSession(uid);
    this.createProfile(true);
    return { ok: true, user };
  },

  async login(id, pw) {
    const uid = 'local:' + (id || '').toLowerCase();
    const user = this.users[uid];
    if (!user) return { ok: false, error: '존재하지 않는 아이디다' };
    const h = await this.hash(pw, user.salt);
    if (h !== user.hash) return { ok: false, error: '비밀번호가 일치하지 않는다' };
    this.current = user;
    this.writeSession(uid);
    this.loadProfile();
    return { ok: true, user };
  },

  /** 게스트 : 저장은 되지만 계정에 귀속되지 않는다 */
  guest() {
    const uid = 'guest';
    let user = this.users[uid];
    if (!user) {
      user = { uid, kind: 'guest', id: 'guest', nick: '게스트', created: Date.now(), picture: null };
      this.users[uid] = user;
      this.saveUsers();
    }
    this.current = user;
    this.writeSession(uid);
    this.loadProfile();
    return user;
  },

  logout() {
    this.saveProfile();
    this.current = null;
    this.profile = null;
    this.writeSession(null);
  },

  async changePassword(oldPw, newPw) {
    if (!this.current || this.current.kind !== 'local') return { ok: false, error: '로컬 계정만 변경할 수 있다' };
    const h = await this.hash(oldPw, this.current.salt);
    if (h !== this.current.hash) return { ok: false, error: '현재 비밀번호가 일치하지 않는다' };
    const err = this.validatePw(newPw);
    if (err) return { ok: false, error: err };
    this.current.salt = this.randSalt();
    this.current.hash = await this.hash(newPw, this.current.salt);
    this.saveUsers();
    return { ok: true };
  },

  setNick(nick) {
    const err = this.validateNick(nick);
    if (err) return { ok: false, error: err };
    this.current.nick = nick.trim();
    this.saveUsers();
    return { ok: true };
  },

  deleteAccount() {
    if (!this.current) return;
    const uid = this.current.uid;
    try { localStorage.removeItem(this.KEY_PROFILE + uid); } catch (e) { }
    delete this.users[uid];
    this.saveUsers();
    this.current = null; this.profile = null;
    this.writeSession(null);
  },

  /* =================================================================
   *  Google 로그인 (Google Identity Services)
   * ================================================================= */
  initGoogle() {
    const cid = window.ITD_CONFIG && window.ITD_CONFIG.GOOGLE_CLIENT_ID;
    if (!cid) { this.googleError = 'no-client-id'; return; }
    if (location.protocol === 'file:') { this.googleError = 'file-protocol'; return; }
    if (document.getElementById('gsiScript')) return;

    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true; s.id = 'gsiScript';
    s.onload = () => {
      try {
        google.accounts.id.initialize({
          client_id: cid,
          callback: (res) => this.onGoogleCredential(res),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        this.googleReady = true;
        if (window.Lobby) Lobby.onGoogleReady();
      } catch (e) {
        this.googleError = 'init-failed';
      }
    };
    s.onerror = () => { this.googleError = 'load-failed'; if (window.Lobby) Lobby.onGoogleReady(); };
    document.head.appendChild(s);
  },

  renderGoogleButton(el) {
    if (!this.googleReady || !el) return false;
    try {
      google.accounts.id.renderButton(el, {
        theme: 'filled_black', size: 'large', shape: 'pill',
        text: 'signin_with', logo_alignment: 'left', width: 260,
      });
      return true;
    } catch (e) { return false; }
  },

  promptGoogle() {
    if (!this.googleReady) return false;
    try { google.accounts.id.prompt(); return true; } catch (e) { return false; }
  },

  /** JWT 페이로드 디코드 (서명 검증은 서버가 필요하므로 하지 않는다) */
  decodeJwt(token) {
    try {
      const p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(p).split('').map(
        c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(json);
    } catch (e) { return null; }
  },

  onGoogleCredential(res) {
    const payload = res && res.credential ? this.decodeJwt(res.credential) : null;
    if (!payload) { if (window.Lobby) Lobby.toast('구글 로그인에 실패했다', '#ff6b6b'); return; }
    const uid = 'google:' + payload.sub;
    let user = this.users[uid];
    const isNew = !user;
    if (!user) {
      user = {
        uid, kind: 'google', id: payload.email || payload.sub,
        nick: (payload.given_name || payload.name || '용사').slice(0, 12),
        created: Date.now(), picture: payload.picture || null,
      };
      this.users[uid] = user;
    } else {
      user.picture = payload.picture || user.picture;
    }
    this.saveUsers();
    this.current = user;
    this.writeSession(uid);
    if (isNew) this.createProfile(true); else this.loadProfile();
    if (window.Lobby) Lobby.onLoggedIn(isNew);
  },

  googleStatusText() {
    if (this.googleReady) return null;
    switch (this.googleError) {
      case 'no-client-id':
        return 'Google 로그인을 쓰려면 js/config.js 의 GOOGLE_CLIENT_ID 에 본인 클라이언트 ID를 넣어야 한다.';
      case 'file-protocol':
        return 'Google 로그인은 file:// 로 열면 동작하지 않는다. 웹 서버(https)로 접속해야 한다.';
      case 'load-failed':
        return 'Google 인증 스크립트를 불러오지 못했다 (네트워크 차단).';
      case 'init-failed':
        return 'Google 인증 초기화에 실패했다. 클라이언트 ID와 승인된 도메인을 확인하라.';
      default:
        return 'Google 로그인 준비 중...';
    }
  },

  /* =================================================================
   *  프로필 (계정별 저장)
   * ================================================================= */
  defaultProfile() {
    return {
      avatar: {
        body: 'leather', head: 'human', hair: 'short', gear: 'none',
        weapon: 'sword', wings: 'none',
        skin: AVATAR.skin[1], hairCol: AVATAR.hairCol[1], color: AVATAR.color[0],
      },
      title: 'rookie',
      frame: 'none',
      badge: 'star',
      owned: {
        body: { leather: 1, robe: 1 }, head: { human: 1 }, hair: { short: 1, long: 1, none: 1 },
        gear: { none: 1 }, weapon: { sword: 1, bow: 1, staff: 1 }, wings: { none: 1 },
        frame: { none: 1 }, badge: { star: 1 },
      },
      level: 1, exp: 0,
      lastLogin: 0, loginStreak: 0, dailyClaimed: 0,
      quests: null, questDay: 0, questBase: null,
      save: null,      // 게임 진행도 (Game.saveMeta 형태)
      createdAt: Date.now(),
    };
  },

  createProfile(save) {
    this.profile = this.defaultProfile();
    if (save) this.saveProfile();
    return this.profile;
  },

  loadProfile() {
    if (!this.current) return null;
    try {
      const raw = localStorage.getItem(this.KEY_PROFILE + this.current.uid);
      this.profile = raw ? JSON.parse(raw) : this.defaultProfile();
    } catch (e) { this.profile = this.defaultProfile(); }
    /* 누락 필드 보정 */
    const d = this.defaultProfile();
    for (const k in d) if (this.profile[k] === undefined) this.profile[k] = d[k];
    for (const k in d.owned) if (!this.profile.owned[k]) this.profile.owned[k] = d.owned[k];
    for (const k in d.avatar) if (this.profile.avatar[k] === undefined) this.profile.avatar[k] = d.avatar[k];
    return this.profile;
  },

  saveProfile() {
    if (!this.current || !this.profile) return;
    try {
      localStorage.setItem(this.KEY_PROFILE + this.current.uid, JSON.stringify(this.profile));
    } catch (e) { }
  },

  /** Game 진행도 저장/로드 연결 */
  saveProfileData(data) {
    if (!this.profile) return;
    this.profile.save = data;
    this.saveProfile();
  },
  loadProfileData() {
    return this.profile ? this.profile.save : null;
  },

  /* =================================================================
   *  레벨 / 경험치
   * ================================================================= */
  expForLevel(lv) { return Math.floor(120 * Math.pow(1.18, lv - 1)); },
  addExp(amount) {
    if (!this.profile) return { levels: 0 };
    let levels = 0;
    this.profile.exp += amount;
    while (this.profile.exp >= this.expForLevel(this.profile.level)) {
      this.profile.exp -= this.expForLevel(this.profile.level);
      this.profile.level++;
      levels++;
    }
    this.saveProfile();
    return { levels, level: this.profile.level };
  },

  /* =================================================================
   *  아이템 소유 / 구매
   * ================================================================= */
  owns(cat, key) {
    const p = this.profile;
    if (!p) return false;
    if (!p.owned[cat]) p.owned[cat] = {};
    return !!p.owned[cat][key];
  },
  buy(cat, key, cost) {
    if (!this.profile) return { ok: false, error: '로그인이 필요하다' };
    if (this.owns(cat, key)) return { ok: false, error: '이미 보유 중이다' };
    if (Game.gems < cost) return { ok: false, error: '젬이 부족하다' };
    Game.gems -= cost;
    if (!this.profile.owned[cat]) this.profile.owned[cat] = {};
    this.profile.owned[cat][key] = 1;
    this.saveProfile();
    Game.saveMeta();
    return { ok: true };
  },
  equip(cat, key) {
    if (!this.profile) return false;
    if (cat === 'frame') this.profile.frame = key;
    else if (cat === 'badge') this.profile.badge = key;
    else if (cat === 'title') this.profile.title = key;
    else this.profile.avatar[cat] = key;
    this.saveProfile();
    return true;
  },

  /* =================================================================
   *  칭호 해금 판정
   * ================================================================= */
  titleUnlocked(t) {
    const s = this.statsForCond();
    try { return !!t.cond(s); } catch (e) { return false; }
  },
  statsForCond() {
    const m = Game.metaStats || {};
    return {
      maxWave: m.maxWave || 0, kills: m.kills || 0, bossKills: m.bossKills || 0,
      totalGold: m.totalGold || 0, collected: Game.collectedCount ? Game.collectedCount() : 0,
      leaks: m.leaks || 0, bestRarity: m.bestRarity || 0, runs: m.runs || 0,
    };
  },

  /* =================================================================
   *  출석 보상
   * ================================================================= */
  todayStamp() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  },
  dailyState() {
    const p = this.profile;
    if (!p) return { canClaim: false, day: 1, streak: 0 };
    const today = this.todayStamp();
    const claimedToday = p.dailyClaimed === today;
    let streak = p.loginStreak || 0;
    if (!claimedToday) {
      /* 하루 이상 비었으면 연속 초기화 */
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yStamp = y.getFullYear() * 10000 + (y.getMonth() + 1) * 100 + y.getDate();
      if (p.lastLogin !== yStamp && p.lastLogin !== today) streak = 0;
    }
    return { canClaim: !claimedToday, day: (streak % 7) + 1, streak };
  },
  claimDaily() {
    const st = this.dailyState();
    if (!st.canClaim) return { ok: false, error: '오늘은 이미 받았다' };
    const p = this.profile;
    const reward = DAILY_REWARDS[st.day - 1];
    Game.gems += reward.gem;
    p.loginStreak = st.streak + 1;
    p.lastLogin = this.todayStamp();
    p.dailyClaimed = this.todayStamp();
    this.saveProfile();
    Game.saveMeta();
    return { ok: true, reward, day: st.day, streak: p.loginStreak };
  },

  /* =================================================================
   *  일일 퀘스트
   * ================================================================= */
  ensureQuests(force) {
    const p = this.profile;
    if (!p) return [];
    const today = this.todayStamp();
    if (!force && p.questDay === today && p.quests) return p.quests;
    const pool = U.shuffle(QUESTS.slice()).slice(0, 3);
    const m = Game.metaStats || {};
    p.questBase = {};
    for (const q of pool) p.questBase[q.key] = m[q.stat] || 0;
    p.quests = pool.map(q => ({ key: q.key, done: false, claimed: false }));
    p.questDay = today;
    this.saveProfile();
    return p.quests;
  },
  questProgress(qk) {
    const p = this.profile;
    const q = QUESTS.find(x => x.key === qk);
    if (!p || !q) return { cur: 0, target: 1, pct: 0 };
    const base = (p.questBase && p.questBase[qk]) || 0;
    const m = Game.metaStats || {};
    let cur = (m[q.stat] || 0) - base;
    if (q.stat === 'maxWave' || q.stat === 'maxCombo') cur = (m[q.stat] || 0);
    cur = Math.max(0, cur);
    return { cur: Math.min(cur, q.target), target: q.target, pct: U.clamp(cur / q.target, 0, 1) };
  },
  claimQuest(qk) {
    const p = this.profile;
    if (!p || !p.quests) return { ok: false };
    const st = p.quests.find(x => x.key === qk);
    const q = QUESTS.find(x => x.key === qk);
    if (!st || !q || st.claimed) return { ok: false, error: '이미 받았다' };
    const pr = this.questProgress(qk);
    if (pr.pct < 1) return { ok: false, error: '아직 완료하지 않았다' };
    st.claimed = true; st.done = true;
    Game.gems += q.gem;
    this.saveProfile(); Game.saveMeta();
    return { ok: true, gem: q.gem };
  },

  /* =================================================================
   *  표시용 헬퍼
   * ================================================================= */
  displayName() { return this.current ? this.current.nick : '게스트'; },
  titleObj() {
    const key = this.profile ? this.profile.title : 'rookie';
    return TITLES.find(t => t.key === key) || TITLES[0];
  },
  frameObj() {
    const key = this.profile ? this.profile.frame : 'none';
    return FRAMES.find(f => f.key === key) || FRAMES[0];
  },
  badgeObj() {
    const key = this.profile ? this.profile.badge : 'star';
    return BADGES.find(b => b.key === key) || BADGES[0];
  },
  kindLabel() {
    if (!this.current) return '';
    return this.current.kind === 'google' ? 'Google 계정'
      : this.current.kind === 'guest' ? '게스트 (이 기기 전용)' : '로컬 계정';
  },
};

window.Account = Account;
