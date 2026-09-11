/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  game.js
 *  코어 엔진 : 루프 / 맵 / 웨이브 / 경제 / 소환 / 합성 / 스킬 / 시너지 / 저장
 * ========================================================================= */
'use strict';

const Game = {
  /* ---------------------------------------------------------- 상태 */
  state: 'menu',          // menu | playing | gameover | victory
  canvas: null, ctx: null,
  W: 0, H: 0, ts: 40, ox: 0, oy: 0,
  time: 0, speed: 1, paused: false,
  lastT: 0, acc: 0,

  map: MAPS[0],
  pathPts: [], pathLen: 0, pathTiles: null,
  endX: 0, endY: 0,

  enemies: [], units: [], projectiles: [], beams: [], zones: [],

  wave: 0, waveTimer: 0, spawnQueue: [], spawnTimer: 0,
  waveActive: false, waveKilled: 0, waveTotal: 0,
  autoWave: true, breakTime: 0,

  gold: 0, gems: 0, life: 20, maxLife: 20,
  mana: 0, maxMana: 100,
  summonCount: 0,
  combo: 0, comboTimer: 0, maxComboRun: 0,

  research: {}, buffs: {}, skillCd: {},
  perks: {}, unlockedMaps: {}, achieved: {},
  bonus: { dmg: 0, crit: 0, gold: 0, dot: 0, slow: 0, freeze: 0, stun: 0, curse: 0 },
  synCache: { cls: {}, elem: {} },
  synActive: [],

  selected: null, placing: false, dragUnit: null, dragPos: null,
  targetingSkill: null,
  enemySpeedMul: 1,

  stats: null, metaStats: null,
  slots: 20,
  loop: 0,          // 100웨이브 클리어 후 회차
  settings: { music: true, sfx: true, particles: true, damageNumbers: true },

  /* ---------------------------------------------------------- 초기화 */
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.loadMeta();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindInput();
    this.resetRun(this.map);
    this.lastT = performance.now();
    requestAnimationFrame(t => this.frame(t));
  },

  /** 세로 화면이면 그리드를 90° 전치해 화면을 꽉 채운다 */
  layout() {
    const w = window.innerWidth, h = window.innerHeight;
    this.portrait = h > w * 1.15;
    this.narrow = w < 560;
    this.gw = this.portrait ? GRID_H : GRID_W;
    this.gh = this.portrait ? GRID_W : GRID_H;
    this.pathCoords = this.portrait ? this.map.path.map(p => [p[1], p[0]]) : this.map.path;
  },

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = w * dpr; this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w; this.H = h;
    this.layout();
    /* 타일 크기 = 화면에 그리드가 들어가도록 */
    const padTop = this.narrow ? 148 : 92;
    const padBottom = this.narrow ? 132 : 122;
    const padSide = this.narrow ? 6 : 66;
    this.ts = Math.floor(Math.min((w - padSide * 2) / this.gw, (h - padTop - padBottom) / this.gh));
    this.ts = Math.max(18, this.ts);
    this.ox = Math.floor((w - this.gw * this.ts) / 2);
    this.oy = Math.floor(padTop + (h - padTop - padBottom - this.gh * this.ts) / 2);
    this.buildPath();
    for (const u of this.units) u.setPos();
  },

  /* ---------------------------------------------------------- 경로 */
  buildPath() {
    this.layout();
    const ts = this.ts;
    const coords = this.pathCoords;
    this.pathPts = coords.map(p => ({ x: this.ox + (p[0] + .5) * ts, y: this.oy + (p[1] + .5) * ts }));
    this.segs = []; this.pathLen = 0;
    for (let i = 0; i < this.pathPts.length - 1; i++) {
      const a = this.pathPts[i], b = this.pathPts[i + 1];
      const len = U.dist(a.x, a.y, b.x, b.y);
      this.segs.push({ a, b, len, start: this.pathLen, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len });
      this.pathLen += len;
    }
    const e = this.pathPts[this.pathPts.length - 1];
    this.endX = e.x; this.endY = e.y;
    /* 경로 타일 집합 */
    this.pathTiles = new Set();
    for (let i = 0; i < coords.length - 1; i++) {
      const [x1, y1] = coords[i], [x2, y2] = coords[i + 1];
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
      for (let s = 0; s <= steps; s++) {
        const gx = Math.round(U.lerp(x1, x2, s / steps)), gy = Math.round(U.lerp(y1, y2, s / steps));
        this.pathTiles.add(gx + ',' + gy);
        /* 경로 인접 타일도 배치 불가(길 폭) */
        this.pathTiles.add(gx + ',' + gy);
      }
    }
  },

  posAt(d) {
    d = U.clamp(d, 0, this.pathLen);
    for (let i = 0; i < this.segs.length; i++) {
      const s = this.segs[i];
      if (d <= s.start + s.len || i === this.segs.length - 1) {
        const t = (d - s.start);
        return { x: s.a.x + s.dx * t, y: s.a.y + s.dy * t, dx: s.dx, dy: s.dy };
      }
    }
    const l = this.pathPts[this.pathPts.length - 1];
    return { x: l.x, y: l.y, dx: 1, dy: 0 };
  },

  isPath(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.gw || gy >= this.gh) return true;
    return this.pathTiles.has(gx + ',' + gy);
  },
  /** 화면 좌표에서 가장 가까운 적 (탭 판정) */
  enemyAt(x, y) {
    const r = this.ts * .55, r2 = r * r;
    let best = null, bd = Infinity;
    for (const e of this.enemies) {
      const d = U.dist2(x, y, e.x, e.y);
      if (d < r2 && d < bd) { bd = d; best = e; }
    }
    return best;
  },

  unitAt(gx, gy) {
    for (const u of this.units) if (u.gx === gx && u.gy === gy) return u;
    return null;
  },
  freeTiles() {
    const out = [];
    for (let y = 0; y < this.gh; y++) for (let x = 0; x < this.gw; x++) {
      if (!this.isPath(x, y) && !this.unitAt(x, y)) out.push([x, y]);
    }
    return out;
  },

  /* ---------------------------------------------------------- 런 리셋 */
  resetRun(map) {
    this.map = map || this.map;
    this.state = 'playing';
    this.time = 0; this.speed = 1; this.paused = false;
    this.enemies.length = 0; this.units.length = 0;
    this.projectiles.length = 0; this.beams.length = 0; this.zones.length = 0;
    FX.clear();

    this.wave = 0; this.waveActive = false; this.waveKilled = 0; this.waveTotal = 0;
    this.spawnQueue = []; this.breakTime = 3.5; this.loop = 0;
    this.buildRunPool();

    const boost = this.boosters || {};
    this.maxLife = Math.max(5, 20 + (this.perks.life || 0) * 5 + (boost.startlife ? 10 : 0)
      + this.diffDef().life);
    this.life = this.maxLife;
    this.gold = 260 + (this.perks.gold0 || 0) * 120 + (boost.startgold ? 1000 : 0);
    this.freeSummons = boost.freeSummon ? 5 : 0;
    this.luckBoost = boost.luckycharm ? .5 : 0;
    this.mana = 30; this.maxMana = 100;
    this.summonCount = 0;
    this.combo = 0; this.comboTimer = 0; this.maxComboRun = 0;
    this.selected = null; this.dragUnit = null; this.targetingSkill = null;
    this.enemySpeedMul = 1;
    this.slots = 20;
    this.glassCannon = false;
    this.dailyCostMul = 1; this.dailyCountMul = 1;
    this.dailyLife = null; this.dailyLifeMul = 0;
    this.shopBuff = {};
    if (window.Shop) Shop.reset();
    this.resetBless();

    this.research = {};
    RESEARCH.forEach(r => this.research[r.key] = 0);
    this.buffs = { goldrush: 0, overdrive: 0, sanctuary: 0, timewarp: 0, timestop: 0, bloodpact: 0 };
    this.bulwarkCharges = 0;
    this.skillCd = {};
    SKILLS.forEach(s => this.skillCd[s.key] = 0);

    this.stats = {
      kills: 0, bossKills: 0, totalDmg: 0, totalGold: 0, leaks: 0,
      merges: 0, summons: 0, maxCombo: 0, skillUses: 0, maxUnits: 0,
      maxWave: 0, bestRarity: 0, mapsUnlocked: Object.keys(this.unlockedMaps).length + 1,
    };
    if (this.boosters && Object.keys(this.boosters).length) {
      this.boosters = {};
      this.saveMeta();
    }
    this.buildPath();
    GFX.clearCache();
    VFX.clear();
    GFX.setWeather(this.map.weather, this);
    this.refreshAll();
    this.nextWaveList = null; this.nextWaveNo = 0;
    this.prepareNextWave();
    if (window.UI) UI.onRunStart();
  },

  /* =================================================================
   *  이어하기 — 판 도중에 나가도 그 자리에서 다시 시작할 수 있게
   *  진행 중인 판 전체(유닛 배치·웨이브·연구·축복)를 프로필에 담아 둔다.
   * ================================================================= */
  RUN_KEY: 'itd_run_v1',

  snapshotRun() {
    if (this.state !== 'playing' || this.wave < 1) return null;
    return {
      v: 1, at: Date.now(),
      map: this.map.key, difficulty: this.difficulty,
      wave: this.wave, loop: this.loop,
      life: this.life, maxLife: this.maxLife,
      gold: this.gold, mana: this.mana,
      summonCount: this.summonCount, freeSummons: this.freeSummons || 0,
      autoWave: !!this.autoWave, speed: this.speed,
      research: Object.assign({}, this.research),
      skillCd: Object.assign({}, this.skillCd),
      loadout: (this.loadout || []).slice(),
      glassCannon: !!this.glassCannon,
      bless: this.bless ? JSON.parse(JSON.stringify(this.bless)) : null,
      runMods: this.runMods ? JSON.parse(JSON.stringify(this.runMods)) : [],
      runPool: this.runPool ? Object.keys(this.runPool).reduce((o, k) => {
        o[k] = this.runPool[k].map(d => d.key); return o;
      }, {}) : null,
      stats: Object.assign({}, this.stats),
      units: this.units.map(u => ({
        key: u.key, star: u.star, level: u.level, gx: u.gx, gy: u.gy,
        invested: u.invested || 0, locked: !!u.locked, targetMode: u.targetMode,
        kills: u.kills || 0, dmgDone: u.dmgDone || 0,
        paths: u.paths ? Object.assign({}, u.paths) : null,
      })),
    };
  },

  saveRun() {
    const snap = this.snapshotRun();
    if (!snap) return false;
    try {
      if (window.Account && Account.profile) {
        Account.profile.run = snap; Account.saveProfile();
      } else localStorage.setItem(this.RUN_KEY, JSON.stringify(snap));
    } catch (e) { return false; }
    return true;
  },

  loadRunSnapshot() {
    try {
      if (window.Account && Account.profile) return Account.profile.run || null;
      const raw = localStorage.getItem(this.RUN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  clearRun() {
    try {
      if (window.Account && Account.profile) { Account.profile.run = null; Account.saveProfile(); }
      localStorage.removeItem(this.RUN_KEY);
    } catch (e) { }
  },

  hasRun() {
    const r = this.loadRunSnapshot();
    return !!(r && r.units && MAPS.some(m => m.key === r.map));
  },

  /** 저장해 둔 판을 그 자리에서 다시 연다 */
  resumeRun() {
    const r = this.loadRunSnapshot();
    if (!r) return false;
    const map = MAPS.find(m => m.key === r.map);
    if (!map) return false;

    this.difficulty = r.difficulty || 'normal';
    this.resetRun(map);                 /* 판 구조부터 새로 깔고 */

    /* 그 위에 저장된 상태를 덮는다 */
    this.wave = r.wave; this.loop = r.loop || 0;
    this.maxLife = r.maxLife; this.life = r.life;
    this.gold = r.gold; this.mana = r.mana;
    this.summonCount = r.summonCount || 0;
    this.freeSummons = r.freeSummons || 0;
    this.autoWave = !!r.autoWave; this.speed = r.speed || 1;
    this.glassCannon = !!r.glassCannon;
    if (r.research) Object.assign(this.research, r.research);
    if (r.skillCd) Object.assign(this.skillCd, r.skillCd);
    if (r.loadout && r.loadout.length) this.loadout = r.loadout.slice();
    if (r.bless) this.bless = r.bless;
    if (r.runMods) this.runMods = r.runMods;
    if (r.stats) Object.assign(this.stats, r.stats);
    /* 이번 판 명단도 그대로 되살린다 — 안 그러면 합성이 갑자기 막힌다 */
    if (r.runPool) {
      const pool = {};
      for (const k in r.runPool) {
        pool[k] = r.runPool[k].map(key => UNIT_MAP[key]).filter(Boolean);
        if (!pool[k].length) pool[k] = UNITS_BY_RARITY[k];
      }
      this.runPool = pool;
    }

    this.units.length = 0;
    for (const u of r.units) {
      if (!UNIT_MAP[u.key]) continue;
      const n = new Unit(this, u.key, u.star, u.gx, u.gy);
      n.level = u.level || 1;
      n.invested = u.invested || 0;
      n.locked = !!u.locked;
      if (u.targetMode) n.targetMode = u.targetMode;
      n.kills = u.kills || 0; n.dmgDone = u.dmgDone || 0;
      if (u.paths) n.paths = Object.assign({}, u.paths);
      this.units.push(n);
    }
    this.waveActive = false;
    this.spawnQueue = [];
    this.breakTime = 5;
    this.nextWaveList = null; this.nextWaveNo = 0;
    this.refreshAll();
    for (const u of this.units) u.spawnMinions();
    this.prepareNextWave();
    if (window.UI) { UI.onRunStart(); UI.buildSkillBar(); }
    return true;
  },

  /* ---------------------------------------------------------- 메타 저장 */
  loadMeta() {
    const d = (window.Account && Account.current) ? Account.loadProfileData() : Store.load();
    this.gems = d && d.gems || 0;
    this.perks = d && d.perks || { atk: 0, gold: 0, luck: 0, life: 0, gold0: 0 };
    this.difficulty = (d && d.difficulty) || 'normal';
    this.unlockedMaps = d && d.unlockedMaps || { meadow: 1 };
    this.achieved = d && d.achieved || {};
    this.collection = d && d.collection || {};
    this.collMile = d && d.collMile || {};
    this.boosters = d && d.boosters || {};
    this.loadout = (d && d.loadout && d.loadout.length) ? d.loadout.slice() : this.DEFAULT_LOADOUT.slice();
    this.rouletteDay = (d && d.rouletteDay) || '';
    this.rouletteFree = (d && d.rouletteFree) || 0;
    this.metaStats = d && d.metaStats || {
      kills: 0, bossKills: 0, totalDmg: 0, leaks: 0, merges: 0, summons: 0,
      maxCombo: 0, skillUses: 0, maxUnits: 0, maxWave: 0, bestRarity: 0, totalGold: 0,
      runs: 0, wins: 0, mapsUnlocked: 1,
    };
    if (d && d.settings) Object.assign(this.settings, d.settings);
    SFX.toggleMusic(this.settings.music);
    SFX.enabled = this.settings.sfx !== false;
  },
  saveMeta() {
    this.metaStats.mapsUnlocked = Object.keys(this.unlockedMaps).length;
    const data = {
      gems: this.gems, perks: this.perks, unlockedMaps: this.unlockedMaps,
      difficulty: this.difficulty,
      achieved: this.achieved, metaStats: this.metaStats, settings: this.settings,
      collection: this.collection, collMile: this.collMile, boosters: this.boosters,
      rouletteDay: this.rouletteDay, rouletteFree: this.rouletteFree, loadout: this.loadout,
    };
    if (window.Account && Account.current) Account.saveProfileData(data);
    else Store.save(data);
  },

  /* ----------------------------------------------------------- 난이도
   * 맵마다 고정 난이도(diff)가 따로 있고, 이건 플레이어가 판마다 고르는 축이다.
   * 쉬움은 연습·도감 채우기용, 악몽은 보상을 노리는 판. */
  DIFFS: [
    { key: 'easy',      n: '쉬움',   i: '🌱', col: '#7cff9c', hp: .68, spd: .92, gold: 1.10, gem: .6, life: 10, desc: '적 체력 -32% · 시작 목숨 +10' },
    { key: 'normal',    n: '보통',   i: '⚔',  col: '#4ea8ff', hp: 1,   spd: 1,   gold: 1,    gem: 1,  life: 0,  desc: '기준 난이도' },
    { key: 'hard',      n: '어려움', i: '🔥', col: '#ffb347', hp: 1.45, spd: 1.08, gold: 1.35, gem: 1.6, life: -5, desc: '적 체력 +45% · 이동 +8% · 목숨 -5 · 보상 +35%' },
    { key: 'nightmare', n: '악몽',   i: '💀', col: '#ff5c4d', hp: 2.10, spd: 1.18, gold: 1.80, gem: 2.6, life: -10, desc: '적 체력 +110% · 이동 +18% · 목숨 -10 · 보상 +80%' },
  ],
  difficulty: 'normal',
  diffDef() { return this.DIFFS.find(d => d.key === this.difficulty) || this.DIFFS[1]; },

  /* ---------------------------------------------------------- 스케일 */
  /** 현재 배치된 전군의 총 DPS (합성/레벨/연구 반영된 실전력) */
  armyDPS() {
    let s = 0;
    for (const u of this.units) s += (u.dps || 0);
    return s;
  },

  /** 축복이 순수하게 얹어 준 화력 배수 (동적 난이도 보정에서 제외할 몫) */
  blessPower() {
    const b = this.bless;
    if (!b) return 1;
    return (1 + b.dmg) * (1 + b.spd) * (1 + b.multishot * .55)
      * (1 + b.crit * (b.critdmg || 1)) * (1 + b.chain * .22);
  },

  /** 상점 임시 버프 값 (없으면 0) */
  shopBuffVal(k) {
    const b = this.shopBuff && this.shopBuff[k];
    return b ? b.amt : 0;
  },

  enemyScale(def, hpMul) {
    const w = this.wave + this.loop * 100;
    const diff = this.map.diff;
    let hp = 30 * def.hp * Math.pow(1.175, w - 1) * diff * (hpMul || 1)
      * this.diffDef().hp * this.modNum('hpMul', 1);
    /* 동적 난이도 보정: 웨이브 고정 곡선만으로는 합성/가챠로 인한 화력 스노우볼을
       따라잡지 못해(가챠 대박, 대량 합성 시 순식간에 수십~수백 배 화력 격차 발생),
       현재 전군 DPS를 웨이브별 기대 화력과 비교해 체력을 자동 보정한다.
       화력이 기대치보다 낮으면 오히려 체력을 낮춰 초반/불운 유저를 배려한다. */
    const dpsRef = 55 * Math.pow(1.075, w - 1);
    /* 하한을 .35 로 두면 화력이 약할 때 적 체력이 40% 수준까지 떨어져,
       일반 등급 유닛만으로도 적이 우수수 녹았다. 하한을 올려 "약한 군대라도
       기본 난이도는 감당해야" 하도록 바꾼다. */
    /* 축복으로 얻은 화력은 이 보정에서 빼 준다.
       빼지 않으면 "공격력 +45%" 를 골라도 적 체력이 같이 1.45^1.18 배로 불어나
       고르기 전보다 오히려 약해진다 — 보상이 보상으로 느껴지지 않는다.
       이 보정의 목적은 어디까지나 가챠 대박·대량 합성 스노우볼을 막는 것이다. */
    const powerRatio = U.clamp(this.armyDPS() / this.blessPower() / dpsRef, .85, 60);
    /* 지수를 1보다 크게 잡아, 기대치보다 화력이 넘칠수록 체력이 그 이상으로 불어나게 한다
       (그냥 맞춰주기만 하면 물량으로 찍어누르는 스노우볼을 못 막는다). */
    hp *= Math.pow(powerRatio, 1.18);
    hp *= (1 + this.loop * 2.8);
    let armor = def.armor * (1 + (w - 1) * .13) * diff * Math.pow(powerRatio, .18);
    let bounty = (3.4 + w * .95) * def.bounty * Math.pow(1.028, w) * (1 + this.loop * .8);
    return { hp, armor, bounty };
  },

  /* ---------------------------------------------------------- 웨이브 */
  availableEnemies() {
    const out = [];
    for (const t of SPAWN_TABLE) if (this.wave >= t.from) out.push(...t.keys);
    if (!out.length) out.push('slime', 'goblin');
    /* 최근 등장분에 가중 */
    return out;
  },

  buildWave(w) {
    const list = [];
    let pool = this.availableEnemies();
    /* 맵 편향 */
    if (this.modFlag('undeadBias')) {
      const und = pool.filter(k => (ENEMY_MAP[k].flags || []).includes('undead'));
      if (und.length) pool = pool.concat(und, und);
    }
    if (this.modFlag('flyBias')) {
      const fly = pool.filter(k => (ENEMY_MAP[k].flags || []).includes('flying'));
      if (fly.length) pool = pool.concat(fly, fly, fly);
    }
    /* 정예 몬스터 (웨이브 20+) */
    if (w >= 20) {
      const elites = ENEMIES.filter(e => e.elite && e.tier <= 3 + Math.floor(w / 30)).map(e => e.key);
      if (elites.length && w % 5 === 0) pool = pool.concat(elites);
    }
    const budget = (6 + w * 1.9 + Math.pow(w, 1.25) * .5) * (this.dailyCountMul || 1);
    let spent = 0;
    /* 보스 */
    const bossEvery = this.modVal('bossEvery', 10);
    if (w % bossEvery === 0) {
      const bi = Math.floor(w / bossEvery) - 1;
      const key = BOSS_ORDER[Math.min(BOSS_ORDER.length - 1, bi)] || BOSS_ORDER[BOSS_ORDER.length - 1];
      list.push({ key, delay: .3 });
      /* 보스 호위 */
      const guardN = 6 + Math.floor(w / 8);
      for (let i = 0; i < guardN; i++) list.push({ key: U.pick(pool), delay: .35 });
    } else {
      /* 일반 */
      const types = U.shuffle(pool.slice()).slice(0, Math.min(pool.length, 2 + Math.floor(w / 7)));
      while (spent < budget && list.length < 90) {
        const k = U.pick(types);
        const d = ENEMY_MAP[k];
        list.push({ key: k, delay: .55 - Math.min(.36, w * .004) });
        spent += 1 + d.hp * .35;
      }
      /* 정예 (10% 확률로 체력 3배 개체) */
      if (w > 8 && U.chance(.45)) {
        for (let i = 0; i < 1 + Math.floor(w / 25); i++)
          list.push({ key: U.pick(types), delay: .5, elite: true });
      }
    }
    U.shuffle(list);

    /* 보물 적 — 웨이브 4부터 가끔 한 마리. 웨이브 중반쯤 끼워 넣는다.
       쫓아가서 잡아야 하는 짧은 긴장을, 실패해도 손해는 없게. */
    /* 보스 웨이브에는 넣지 않는다 — 보스전은 그 자체로 집중해야 하는 순간인데
       빠른 보물 적이 끼면 화력이 엉뚱한 데로 새어 나간다. */
    if (w >= 4 && w % bossEvery !== 0 && U.chance(.42)) {
      const at = Math.floor(list.length * U.rand(.25, .7));
      const tier0 = pool.filter(k => ENEMY_MAP[k].tier <= 1);
      list.splice(at, 0, { key: U.pick(tier0.length ? tier0 : pool), delay: .5, treasure: true });
    }
    return list;
  },

  /** 다음 웨이브 구성을 미리 확정해 둔다 (미리보기용) */
  prepareNextWave() {
    let nw = this.wave + 1;
    if (nw > 100) nw = 1;
    this.nextWaveNo = nw;
    this.nextWaveList = this.buildWave(nw);
    if (window.UI) UI.renderWavePreview();
  },

  /**
   * 조기 호출 보너스.
   * 쉬는 시간이 남았는데 웨이브를 당겨 부르면, 남은 초에 비례해 골드를 준다.
   * "준비를 더 할까, 지금 불러서 돈을 벌까" 라는 선택이 매 웨이브마다 생긴다.
   */
  earlyBonus() {
    if (this.waveActive || this.breakTime <= .3) return 0;
    const t = U.clamp(this.breakTime / 5, 0, 1);
    return Math.floor((28 + this.wave * 11) * t * this.goldMul);
  },

  startWave() {
    if (this.waveActive) return;
    /* 당겨 부른 만큼 보너스 */
    const early = this.earlyBonus();
    if (early > 0) {
      this.addGold(early);
      FX.popText(this.W / 2, this.H * .34, '⏩ 조기 호출  +' + U.fmt(early) + 'G', '#ffd24d', 24,
        { life: 1.3, vy: -30, big: true });
      FX.ripple(this.W / 2, this.H * .34, '#ffd24d', 1400, .45, 4);
      SFX.play('coin');
    }
    this.breakTime = 0;
    this.wave++;
    if (this.wave > 100) { this.loop++; this.wave = 1; }
    this.waveActive = true;
    this.spawnQueue = (this.nextWaveList && this.nextWaveNo === this.wave)
      ? this.nextWaveList : this.buildWave(this.wave);
    this.nextWaveList = null;
    this.waveTotal = this.spawnQueue.length;
    this.waveKilled = 0;
    this.spawnTimer = 0;
    this.stats.maxWave = Math.max(this.stats.maxWave, this.wave + this.loop * 100);

    const boss = this.wave % 10 === 0;
    SFX.play(boss ? 'boss' : 'wave');
    if (boss) {
      FX.flash('#ff3a3a', .35);
      if (window.UI) UI.bossBanner(this.wave);
    }
    if (window.UI) UI.onWaveStart(this.wave);
  },

  spawnEnemy(key, opts) {
    if (this.enemies.length > 320) return null;
    const e = new Enemy(this, key, opts || {});
    this.enemies.push(e);
    if (e.boss) VFX.bossIntro(e, this);
    return e;
  },

  updateWave(dt) {
    if (!this.waveActive) {
      this.breakTime -= dt;
      if (this.breakTime <= 0 && this.autoWave) this.startWave();
      return;
    }
    if (this.spawnQueue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const s = this.spawnQueue.shift();
        /* 강화 종류는 Enemy 생성자에서 한 번에 처리한다 (여기서 또 곱하면 이중 적용) */
        const e = this.spawnEnemy(s.key, { elite: !!s.elite, treasure: !!s.treasure });
        if (e && s.elite) FX.ring(e.x, e.y, '#ffd24d', this.ts, .5);
        if (e && s.treasure) {
          FX.ring(e.x, e.y, '#ffd24d', this.ts * 1.6, .7);
          FX.popText(e.x, e.y - this.ts * .7, '💰 보물 적!', '#ffd24d', 17, { life: 1.5, vy: -30 });
          SFX.play('rare');
          if (window.UI) UI.toast('💰 보물 적 등장 — 도망치기 전에 잡아라!', '#ffd24d');
        }
        this.spawnTimer = s.delay;
      }
    } else if (this.enemies.length === 0) {
      this.endWave();
    }
  },

  endWave() {
    this.waveActive = false;
    const w = this.wave;
    /* 보상 */
    let reward = Math.floor(42 + w * 14 + Math.pow(w, 1.42) * 1.7);
    reward = Math.floor(reward * (1 + (this.perks.gold || 0) * .1));
    const interest = Math.floor(this.gold * (this.research.interest * .01 + this.bless.interest));
    this.addGold(reward + interest);
    this.mana = Math.min(this.maxMana, this.mana + 25);
    this.breakTime = 5.0;

    /* 축복이 주는 웨이브 정산 보너스 */
    if (this.bless.liferegen > 0 && this.life < this.maxLife) {
      this.life = Math.min(this.maxLife, this.life + this.bless.liferegen);
      FX.popText(this.W / 2, this.H * .38 + 60, `♥ +${this.bless.liferegen}`, '#ff6b8a', 17, { life: 1.4, vy: -22 });
    }
    if (this.bless.gemwave > 0) {
      this.gems += this.bless.gemwave;
      FX.popText(this.W / 2, this.H * .38 + 82, `💎 +${this.bless.gemwave}`, '#7fd8ff', 17, { life: 1.4, vy: -22 });
    }

    FX.popText(this.W / 2, this.H * .38, `웨이브 ${w} 클리어!`, '#7cff9c', 30, { life: 1.6, vy: -30 });
    FX.popText(this.W / 2, this.H * .38 + 34, `+${U.fmt(reward)}G` + (interest ? ` (이자 +${U.fmt(interest)})` : ''), '#ffd24d', 18, { life: 1.6, vy: -24 });
    SFX.play('win');
    VFX.waveClear(this);

    this.checkAchievements();
    if (this.wave >= 100 && this.loop === 0) this.victory();
    if (window.Shop) Shop.onWaveEnd(this);
    this.prepareNextWave();
    if (window.UI) UI.onWaveEnd(w);
    this.saveMeta();

    /* 축복 드래프트 — 몇 웨이브마다 3장 중 1장을 고르게 한다 */
    if (window.Bless && this.state === 'playing' && Bless.due(w)) {
      const wasPaused = this.paused;
      setTimeout(() => {
        if (this.state !== 'playing') return;
        if (!Bless.show(this)) return;
        Bless.wasPaused = wasPaused;   /* 원래 멈춰 있었다면 닫은 뒤에도 멈춰 둔다 */
      }, 700);
    }
  },

  /* ---------------------------------------------------------- 경제 */
  addGold(v) {
    this.gold += v;
    this.stats.totalGold += v;
  },
  spendGold(v) {
    if (this.gold < v) { SFX.play('error'); if (window.UI) UI.toast('골드가 부족하다!', '#ff6b6b'); return false; }
    this.gold -= v; return true;
  },
  get goldMul() {
    return (1 + this.research.gold * .07) * (1 + (this.perks.gold || 0) * .1)
      * (1 + this.bless.gold + ((this.collBonus && this.collBonus.gold) || 0))
      * this.diffDef().gold * this.modNum('goldMul', 1);
  },
  get manaMul() { return (1 + this.research.mana * .09) * this.modNum('manaMul', 1); },

  addCombo() {
    this.combo++;
    this.comboTimer = 2.6;
    this.maxComboRun = Math.max(this.maxComboRun, this.combo);
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
    if (this.combo % 10 === 0) {
      SFX._combo = this.combo; SFX.play('combo');
      /* 콤보가 쌓일수록 글자색·크기·화면 반응이 같이 커진다 */
      const tierCol = this.combo >= 200 ? '#ff5c4d' : this.combo >= 100 ? '#ff7ad0'
        : this.combo >= 50 ? '#c48fff' : this.combo >= 20 ? '#7fd8ff' : '#ffd24d';
      FX.popText(this.W / 2, this.H * .3, this.combo + ' COMBO!', tierCol,
        24 + Math.min(26, this.combo * .09), { life: .9, vy: -22, big: this.combo >= 30 });
      FX.pulse(.02 + Math.min(.03, this.combo * .0001));
      FX.ripple(this.W / 2, this.H * .3, tierCol, 1500, .45, 3);
    }
    if (this.combo === 50 || this.combo === 100 || this.combo === 200 || this.combo === 500) {
      const c2 = this.combo >= 200 ? '#ff5c4d' : this.combo >= 100 ? '#ff7ad0' : '#c48fff';
      FX.flash(c2, .38); FX.shake(10); FX.aberrate(8);
      FX.speedLines(1.3, c2);
      FX.slowmo(.28, .35);
      for (let i = 0; i < 3; i++)
        setTimeout(() => FX.ripple(this.W / 2, this.H * .38, c2, 1700, .5, 5 - i), i * 90);
      if (window.VFX) VFX.confetti(this.W / 2, this.H * .38, c2, 50);
    }
  },
  resetCombo() { this.combo = 0; this.comboTimer = 0; },
  comboGoldMul() { return 1 + Math.min(2.5, this.combo * .012); },

  addShakeForSplash(R) { FX.shake(Math.min(6, R * .05)); },

  /* ---------------------------------------------------------- 소환 */
  summonCost() {
    const base = 30 + this.summonCount * 7.4;
    const off = Math.min(.7, this.research.summoncost * .02 + this.bless.cost);
    return Math.max(12, Math.floor(base * (1 - off) * (this.dailyCostMul || 1)));
  },

  /**
   * 이번 판에 등장할 유닛 명단을 등급별로 추린다.
   *
   * 유닛 종류를 전부 뽑기 풀에 넣으면 같은 유닛 3기가 모이지 않아 합성이
   * 사실상 불가능해진다 (404종으로 늘린 직후 자동플레이에서 합성 0회 ·
   * 9웨이브 전멸을 확인했다). 그래서 판마다 등급별로 일부만 골라
   * "이번 판의 명단"을 만든다. 늘어난 종류는 판이 바뀔 때마다 달라지는
   * 다양성으로 살리고, 한 판 안에서는 중복이 충분히 나오게 한다.
   */
  ROSTER_PER_RARITY: { common: 8, uncommon: 9, rare: 10, epic: 11, legendary: 10, mythic: 9, ultimate: 8, primordial: 6 },

  buildRunPool() {
    this.runPool = {};
    for (const r of RARITY) {
      const all = UNITS_BY_RARITY[r.key] || [];
      const want = Math.min(all.length, this.ROSTER_PER_RARITY[r.key] || 10);
      this.runPool[r.key] = U.shuffle(all.slice()).slice(0, want);
    }
  },

  /** 이번 판 명단 (UI 표시용) */
  runRoster() {
    if (!this.runPool) return [];
    const out = [];
    for (const r of RARITY) for (const d of (this.runPool[r.key] || [])) out.push(d);
    return out;
  },
  /** N연차 소환의 예상 총 비용 (무료 소환권은 앞에서부터 소모됨을 감안) */
  summonCostN(n) {
    let total = 0, free = this.freeSummons || 0, count = this.summonCount;
    for (let i = 0; i < n; i++) {
      if (free > 0) { free--; continue; }
      const base = 30 + count * 6;
      const off = Math.min(.7, this.research.summoncost * .02 + this.bless.cost);
      total += Math.max(12, Math.floor(base * (1 - off)));
      count++;
    }
    return total;
  },

  /**
   * 등급 추첨.
   *
   * 예전에는 행운을 Math.pow(1+luck, i) 로 곱해서, 등급이 올라갈수록 배수가
   * 지수로 커졌다. 그 결과 연구/특성을 다 올리면 최고 등급(태초)이 9.6%,
   * 신화가 24.8% 나왔다 — 희귀도가 사실상 사라진 상태였다.
   *
   * 지금은 등급 인덱스에 "선형" 으로만 붙이고, 상위 등급일수록 행운이 덜 먹도록
   * 감쇠시킨다. 게다가 신화 이상은 총 확률에 상한을 둬서 아무리 올려도
   * 대박이 대박으로 남게 한다.
   */
  RARE_CAP: [1, 1, 1, 1, .12, .04, .012, .003],   /* 등급별 최대 등장 확률 */

  rollRarity() {
    const luck = this.research.luck * .05 + (this.perks.luck || 0) * .08
      + (this.luckBoost || 0) + this.bless.luck + ((this.collBonus && this.collBonus.luck) || 0);
    /* 상위 등급일수록 행운 효과를 줄인다 (i 가 클수록 감쇠) */
    const list = RARITY.map((r, i) => ({
      r, w: r.w * (1 + luck * i * .45 / (1 + i * .55)),
    }));
    /* 상한 적용 : 총합 대비 비율이 상한을 넘으면 눌러 준다 */
    let total = list.reduce((a, x) => a + x.w, 0);
    for (let i = list.length - 1; i >= 4; i--) {
      const cap = this.RARE_CAP[i];
      if (list[i].w / total > cap) {
        total -= list[i].w;
        list[i].w = cap * total / (1 - cap);
        total += list[i].w;
      }
    }
    return U.weighted(list).r;
  },

  summon(opts) {
    opts = opts || {};
    const silent = !!opts.silent;
    if (this.units.length >= this.slotMax()) {
      if (!silent) { SFX.play('error'); if (window.UI) UI.toast('배치 공간이 없다! (진지 확장 연구)', '#ff6b6b'); }
      return null;
    }
    let cost = this.summonCost();
    if (opts.free) cost = 0;
    else if (this.freeSummons > 0) { this.freeSummons--; cost = 0; }
    else if (!this.spendGold(cost)) return null;
    this.summonCount++; this.stats.summons++;

    /* minRarity : 축복 등으로 최소 등급이 보장된 소환 */
    let rar = this.rollRarity();
    if (opts.minRarity != null) {
      let guard = 0;
      while (RARITY_IDX[rar.key] < opts.minRarity && guard++ < 60) rar = this.rollRarity();
      if (RARITY_IDX[rar.key] < opts.minRarity) rar = RARITY[opts.minRarity];
    }
    const pool = this.runPool ? this.runPool[rar.key] : UNITS_BY_RARITY[rar.key];
    const def = U.pick(pool);
    const free = this.freeTiles();
    if (!free.length) { this.gold += cost; if (!silent && window.UI) UI.toast('빈 칸이 없다!', '#ff6b6b'); return null; }
    const [gx, gy] = U.pick(free);
    const u = new Unit(this, def.key, 1, gx, gy);
    this.units.push(u);
    this.refreshAll();

    const ri = RARITY_IDX[rar.key];
    const isNew = this.collect(def.key);
    this.stats.bestRarity = Math.max(this.stats.bestRarity, ri);
    this.stats.maxUnits = Math.max(this.stats.maxUnits, this.units.length);

    /* 연출 — 운빨겜 스타일 : 등급이 높을수록 화면 전체가 반응한다 */
    const col = rar.color;
    VFX.summon(u.px, u.py, ri, col, this);
    if (!silent) {
      this.playSummonFx(u, def, rar, ri);
    } else {
      /* 대량소환 중에는 가볍게 : 자리마다 스파크만 튀긴다 */
      SFX.play(ri >= 4 ? 'jackpot' : ri >= 2 ? 'rare' : 'pull');
      FX.popText(u.px, u.py - this.ts * .8, def.name, col, 13 + ri);
    }
    this.checkAchievements();
    if (window.UI) UI.refresh();
    return { unit: u, def, rar, ri, isNew };
  },

  /** 등급별 소환 이펙트 (단독 소환용) */
  playSummonFx(u, def, rar, ri) {
    const col = rar.color;
    /* 희귀 이상은 뜸을 들였다가 터뜨린다 — 기대감이 곧 재미다 */
    if (ri >= 2) {
      const wait = VFX.gachaCharge(u.px, u.py, ri, col, this);
      setTimeout(() => {
        if (this.state !== 'playing') return;
        this.revealSummon(u, def, rar, ri);
      }, wait);
      return;
    }
    this.revealSummon(u, def, rar, ri);
  },

  /** 뜸 들이기가 끝난 뒤 실제로 터뜨리는 부분 */
  revealSummon(u, def, rar, ri) {
    const col = rar.color;
    FX.popText(u.px, u.py - this.ts * .8, def.name, col, 14 + ri * 2, { big: ri >= 3, life: 1.1 });
    /* 등급마다 다른 팡파레 — 소리만 듣고도 무엇이 나왔는지 알 수 있게 */
    SFX.playRarity(ri);
    /* 등급이 높을수록 화면 전체가 반응한다 (빛기둥·다중 링·꽃가루·슬로우모션) */
    VFX.jackpot(u.px, u.py, ri, col, this);
    if (ri >= 5) SFX.play('jackpot');
    if (ri >= 6) FX.stop(.16);
    if (ri >= 2 && window.UI) UI.rarityBanner(def, rar);
  },

  /** 운빨존많겜식 N연차 소환 — 결과를 모았다가 한 번에 화려하게 공개한다 */
  summonMulti(n) {
    const results = [];
    for (let i = 0; i < n; i++) {
      const r = this.summon({ silent: true });
      if (!r) break;
      results.push(r);
    }
    if (!results.length) {
      SFX.play('error');
      if (window.UI) UI.toast(this.freeSummons > 0 ? '배치 공간이 없다!' : '골드가 부족하다!', '#ff6b6b');
      return results;
    }
    if (window.UI) UI.multiPullBanner(results);
    return results;
  },

  slotMax() { return 20 + this.research.slot + this.bless.slot; },

  /* ---------------------------------------------------------- 맵 모디파이어 */
  get mods() {
    const mm = (this.map && this.map.mods) || [];
    return this.runMods && this.runMods.length ? mm.concat(this.runMods) : mm;
  },

  /* ---------------------------------------------------------- 축복 (판 한정) */
  /** 축복이 얹는 아군 스탯 가산치. entities.js refresh 에서 읽는다. */
  resetBless() {
    this.runMods = [];
    this.bless = {
      taken: {}, order: [],
      dmg: 0, spd: 0, rng: 0, crit: 0, critdmg: 0, pen: 0, splash: 0,
      chain: 0, multishot: 0, execute: 0,
      gold: 0, interest: 0, loot: 0, cost: 0, gemwave: 0,
      life: 0, liferegen: 0, revive: 0,
      luck: 0, slot: 0, skillcd: 0, skilldmg: 0, echo: 0,
    };
    if (window.Bless) Bless.reset();
  },
  /** 곱연산 모디파이어 */
  modNum(key, base) {
    let v = base;
    for (const m of this.mods) if (m[key] !== undefined) v *= m[key];
    return v;
  },
  /** 값 모디파이어 (첫 번째 값) */
  modVal(key, base) {
    for (const m of this.mods) if (m[key] !== undefined) return m[key];
    return base;
  },
  /** 불리언 모디파이어 */
  modFlag(key) { return this.mods.some(m => !!m[key]); },
  /** 원소 피해 보너스 합 */
  modElem(elem) {
    let v = 0;
    for (const m of this.mods) if (m.elemBonus && m.elemBonus[elem]) v += m.elemBonus[elem];
    return v;
  },
  /** 적 원소 저항 가산 */
  modResist(elem) {
    let v = 0;
    for (const m of this.mods) if (m.resistAdd && m.resistAdd[elem]) v += m.resistAdd[elem];
    return v;
  },

  /** 도감 등록 */
  collect(key) {
    if (!this.collection) this.collection = {};
    if (this.collection[key]) return false;
    this.collection[key] = 1;
    const def = UNIT_MAP[key];
    if (window.UI && def) UI.toast('📖 신규 발견 : ' + def.name, RARITY[RARITY_IDX[def.rarity]].color);
    if (window.Collection) Collection.checkMilestones(this);
    this.refreshAll();          /* 수집 보너스가 바로 반영되도록 */
    this.saveMeta();
    return true;
  },
  collectedCount() { return this.collection ? Object.keys(this.collection).length : 0; },

  /* ---------------------------------------------------------- 합성 */
  findMergeGroup(u) {
    const same = this.units.filter(x => x.key === u.key && x.star === u.star && (!x.locked || x === u));
    return same.length >= 3 ? same.slice(0, 3) : null;
  },
  updateMergeFlags() {
    const counts = {};
    for (const u of this.units) {
      const k = u.key + '_' + u.star;
      counts[k] = (counts[k] || 0) + 1;
    }
    for (const u of this.units) u.mergeReady = counts[u.key + '_' + u.star] >= 3;
  },

  merge(u) {
    const grp = this.findMergeGroup(u);
    if (!grp) { SFX.play('error'); if (window.UI) UI.toast('같은 유닛 3기가 필요하다', '#ff6b6b'); return false; }
    const gx = u.gx, gy = u.gy;
    /* 재료가 서 있던 자리를 기억해 둔다 — 거기서 빛이 빨려 들어오는 연출에 쓴다 */
    const mergedFrom = grp.filter(x => x !== u).map(x => ({ x: x.px, y: x.py }));
    for (const x of grp) if (x !== u) this.removeUnit(x, false);

    this.stats.merges++;
    if (u.star < 3) {
      u.star++;
      const mc = RARITY[RARITY_IDX[u.def.rarity]].color;
      FX.explosion(u.px, u.py, this.ts * 1.2, mc, '#fff');
      VFX.ascend(u.px, u.py, mc, this);
      /* 재료가 있던 자리에서 빛이 빨려 들어온다 — 세 개가 하나가 됐다는 게 보이게 */
      for (const m of mergedFrom) VFX.mergeSuck(m.x, m.y, u.px, u.py, mc);
      VFX.castRing(u.px, u.py, mc, u.star);
      FX.popText(u.px, u.py - this.ts, U.roman(u.star) + '성 달성!', '#ffd24d', 22 + u.star * 3,
        { life: 1.2, big: u.star >= 3 });
      FX.impact(u.px, u.py, mc, .28 + u.star * .1);
      SFX.play('merge');
      u.refresh(); u.spawnMinions();
    } else {
      /* 등급 승급 */
      const ri = RARITY_IDX[u.def.rarity];
      const nextIdx = Math.min(RARITY.length - 1, ri + 1);
      const nextRar = RARITY[nextIdx];
      const pool = (this.runPool && this.runPool[nextRar.key]) || UNITS_BY_RARITY[nextRar.key];
      const nd = U.pick(pool);
      this.removeUnit(u, false);
      const nu = new Unit(this, nd.key, 1, gx, gy);
      this.units.push(nu);
      FX.explosion(nu.px, nu.py, this.ts * 2, nextRar.color, '#fff');
      VFX.ascend(nu.px, nu.py, nextRar.color, this);
      for (const m of mergedFrom) VFX.mergeSuck(m.x, m.y, nu.px, nu.py, nextRar.color);
      /* 등급 승급은 판에서 손꼽히는 순간 — 소환 대박과 같은 급으로 터뜨린다 */
      VFX.jackpot(nu.px, nu.py, nextIdx, nextRar.color, this);
      FX.popText(nu.px, nu.py - this.ts, '승급!', nextRar.color, 30, { life: 1.5, vy: -34, big: true });
      FX.popText(nu.px, nu.py - this.ts + 40, nd.name, nextRar.color, 22, { life: 1.4, vy: -24, big: true });
      SFX.play(nextIdx >= 5 ? 'mythic' : 'legendary');
      this.stats.bestRarity = Math.max(this.stats.bestRarity, nextIdx);
      this.collect(nd.key);
      this.selected = nu;
      if (nextIdx >= 4 && window.UI) UI.rarityBanner(nd, nextRar);
    }
    this.refreshAll();
    this.checkAchievements();
    if (window.UI) UI.refresh();
    return true;
  },

  /* ---------------------------------------------------------- 편의 기능 */

  /** 유닛 잠금 토글 (합성/판매 보호) */
  toggleLock(u) {
    u.locked = !u.locked;
    SFX.play('click');
    FX.popText(u.px, u.py - this.ts * .7, u.locked ? '🔒 잠금' : '🔓 해제', '#9fd2ff', 13);
    this.updateMergeFlags();
    if (window.UI) UI.refresh();
    return u.locked;
  },

  /** 경로 커버리지가 좋은 칸으로 유닛을 자동 재배치 */
  autoArrange() {
    /* 각 배치 가능 칸의 "경로 노출 점수" 계산 */
    const tiles = [];
    const step = Math.max(6, Math.floor(this.pathLen / 160));
    for (let gy = 0; gy < this.gh; gy++) {
      for (let gx = 0; gx < this.gw; gx++) {
        if (this.isPath(gx, gy)) continue;
        const px = this.ox + (gx + .5) * this.ts;
        const py = this.oy + (gy + .5) * this.ts;
        let score = 0;
        for (let d = 0; d < this.pathLen; d += step) {
          const p = this.posAt(d);
          const dist = U.dist(px, py, p.x, p.y) / this.ts;
          if (dist < 6) score += 1 / (1 + dist * dist * .25);
        }
        tiles.push({ gx, gy, score });
      }
    }
    tiles.sort((a, b) => b.score - a.score);

    /* 사거리가 짧은 유닛일수록 좋은 자리에 */
    const units = this.units.slice().sort((a, b) => a.stat.rng - b.stat.rng);
    let moved = 0;
    units.forEach((u, i) => {
      const t = tiles[i];
      if (!t) return;
      if (u.gx !== t.gx || u.gy !== t.gy) {
        u.gx = t.gx; u.gy = t.gy; u.setPos(); moved++;
        FX.ring(u.px, u.py, '#9fd2ff', this.ts * .8, .35);
      }
    });
    this.refreshAll();
    SFX.play('upgrade');
    if (window.UI) {
      UI.toast(moved ? `${moved}기를 최적 위치로 재배치했다` : '이미 최적 배치다', '#9fd2ff');
      UI.refresh();
    }
    return moved;
  },

  /** 특정 등급 이하 유닛 일괄 판매 (잠금 제외) */
  sellBelow(rarityIdx) {
    const targets = this.units.filter(u =>
      !u.locked && RARITY_IDX[u.def.rarity] < rarityIdx && u.star === 1);
    if (!targets.length) {
      if (window.UI) UI.toast('판매할 유닛이 없다', '#ffcf3f');
      SFX.play('error');
      return 0;
    }
    let gain = 0;
    for (const u of targets) {
      gain += Math.floor(u.cost() * .6 + u.invested * .5);
      this.removeUnit(u, false);
    }
    this.addGold(gain);
    SFX.play('coin');
    FX.popText(this.W / 2, this.H * .45, '+' + U.fmt(gain) + 'G', '#ffd24d', 24, { life: 1.4, vy: -30 });
    if (window.UI) {
      UI.toast(`${targets.length}기 판매 · +${U.fmt(gain)}G`, '#ffd24d');
      UI.refresh();
    }
    return targets.length;
  },

  /** 유닛별 기여도 순위 */
  dpsRanking() {
    return this.units.slice()
      .sort((a, b) => b.dmgDone - a.dmgDone)
      .map(u => ({
        name: u.def.name, star: u.star, level: u.level,
        rarity: u.def.rarity, elem: u.def.elem,
        dmg: u.dmgDone, kills: u.kills, dps: u.dps, unit: u,
      }));
  },

  autoMergeAll() {
    let n = 0;
    let again = true;
    while (again && n < 200) {
      again = false;
      const counts = {};
      for (const u of this.units) {
        if (u.locked) continue;
        const k = u.key + '_' + u.star;
        (counts[k] = counts[k] || []).push(u);
      }
      for (const k in counts) {
        if (counts[k].length >= 3) {
          this.merge(counts[k][0]); n++; again = true; break;
        }
      }
    }
    if (n) { if (window.UI) UI.toast(`${n}회 합성 완료!`, '#7cff9c'); }
    else { SFX.play('error'); if (window.UI) UI.toast('합성 가능한 조합이 없다', '#ffcf3f'); }
    return n;
  },

  removeUnit(u, refund) {
    if (refund) {
      const back = Math.floor(u.cost() * .6 + u.invested * .5);
      this.addGold(back);
      FX.popText(u.px, u.py, '+' + U.fmt(back) + 'G', '#ffd24d', 15);
      SFX.play('coin');
    }
    for (const m of u.minions) m.dead = true;
    U.remove(this.units, u);
    if (this.selected === u) this.selected = null;
    FX.burst(u.px, u.py, RARITY[RARITY_IDX[u.def.rarity]].color, 10, { speed: 130 });
    this.refreshAll();
    if (window.UI) UI.refresh();
  },

  upgradeUnit(u) {
    const c = u.upgradeCost();
    if (!this.spendGold(c)) return false;
    u.level++; u.invested += c;
    u.refresh();
    u.buffFlash = 1;
    FX.ring(u.px, u.py, '#ffd24d', this.ts, .35);
    FX.popText(u.px, u.py - this.ts * .7, 'Lv.' + u.level, '#ffd24d', 15);
    SFX.play('upgrade');
    if (window.UI) UI.refresh();
    return true;
  },

  moveUnit(u, gx, gy) {
    if (this.isPath(gx, gy)) return false;
    const other = this.unitAt(gx, gy);
    if (other && other !== u) {
      /* 같은 유닛이면 합성 시도 */
      if (other.key === u.key && other.star === u.star) {
        const grp = this.findMergeGroup(u);
        if (grp) { this.merge(other); return true; }
      }
      /* 자리 교환 */
      const ox = u.gx, oy = u.gy;
      u.gx = gx; u.gy = gy; other.gx = ox; other.gy = oy;
      u.setPos(); other.setPos();
      this.refreshAll();
      return true;
    }
    u.gx = gx; u.gy = gy; u.setPos();
    this.refreshAll();
    return true;
  },

  /* ---------------------------------------------------------- 시너지 */
  refreshAll() {
    /* 시너지 카운트 */
    const cls = {}, elem = {};
    for (const u of this.units) {
      cls[u.def.cls] = (cls[u.def.cls] || 0) + 1;
      elem[u.def.elem] = (elem[u.def.elem] || 0) + 1;
    }
    this.synCache.cls = {}; this.synCache.elem = {};
    this.synActive = [];
    for (const k in cls) {
      const tiers = SYNERGY.class[k]; if (!tiers) continue;
      let best = null;
      for (const t of tiers) if (cls[k] >= t.n) best = t;
      if (best) {
        this.synCache.cls[k] = best;
        this.synActive.push({ type: 'class', key: k, name: CLASSES[k].name, icon: CLASSES[k].icon, count: cls[k], tier: best });
      } else {
        const next = tiers[0];
        this.synActive.push({ type: 'class', key: k, name: CLASSES[k].name, icon: CLASSES[k].icon, count: cls[k], tier: null, need: next.n });
      }
    }
    for (const k in elem) {
      const tiers = SYNERGY.elem[k]; if (!tiers) continue;
      let best = null;
      for (const t of tiers) if (elem[k] >= t.n) best = t;
      if (best) {
        this.synCache.elem[k] = best;
        this.synActive.push({ type: 'elem', key: k, name: ELEM[k].name, icon: ELEM[k].icon, count: elem[k], tier: best });
      } else {
        this.synActive.push({ type: 'elem', key: k, name: ELEM[k].name, icon: ELEM[k].icon, count: elem[k], tier: null, need: tiers[0].n });
      }
    }

    /* 도감 수집 보너스 — 한 번만 계산해 캐시 (매 유닛 refresh 마다 404종을 세면 낭비다) */
    this.collBonus = window.Collection ? Collection.bonus(this)
      : { dmg: 0, spd: 0, crit: 0, gold: 0, luck: 0 };

    /* 전역 보너스 */
    this.bonus.dmg = (this.perks.atk || 0) * .08 + this.collBonus.dmg;
    this.bonus.crit = this.collBonus.crit; this.bonus.gold = 0;
    this.bonus.dot = this.research.dot * .10;
    this.bonus.slow = this.research.slow * .04;
    this.bonus.freeze = 0; this.bonus.stun = 0;
    this.bonus.curse = this.research.curse * .04;
    for (const k in this.synCache.elem) {
      const t = this.synCache.elem[k];
      if (t.slow) this.bonus.slow += t.slow;
      if (t.freeze) this.bonus.freeze += t.freeze;
      if (t.stun) this.bonus.stun += t.stun;
      if (t.curse) this.bonus.curse += t.curse;
      if (t.dot) this.bonus.dot += t.dot;
    }
    this.maxLife = Math.max(1, 20 + this.research.hp * 2 + (this.perks.life || 0) * 5
      + this.bless.life + this.diffDef().life);
    /* 일일 도전 규칙 — refreshAll 이 목숨을 다시 계산하므로 여기서 마지막에 덮는다.
       (start() 에서 maxLife 를 직접 쓰면 이 줄에 곧바로 지워졌다) */
    if (this.dailyLife != null) this.maxLife = this.dailyLife;
    if (this.dailyLifeMul) this.maxLife = Math.max(1, Math.round(this.maxLife * this.dailyLifeMul));
    if (this.glassCannon) this.maxLife = Math.min(this.maxLife, 5);
    this.life = Math.min(this.life, this.maxLife);

    for (const u of this.units) u.refresh();
    this.updateMergeFlags();
    this.stats.maxUnits = Math.max(this.stats.maxUnits, this.units.length);
  },

  synergyFor(def) {
    const out = { dmg: 0, spd: 0, rng: 0, splash: 0, crit: 0, critdmg: 0, pen: 0, aura: 0, chain: 0, gold: 0, summon: 0 };
    const c = this.synCache.cls[def.cls], e = this.synCache.elem[def.elem];
    for (const t of [c, e]) {
      if (!t) continue;
      for (const k in out) if (t[k]) out[k] += t[k];
    }
    return out;
  },

  /* ---------------------------------------------------------- 연구 */
  researchCost(key) {
    const r = RESEARCH.find(x => x.key === key);
    const lv = this.research[key];
    return Math.floor(r.base * Math.pow(r.growth, lv));
  },
  buyResearch(key) {
    const r = RESEARCH.find(x => x.key === key);
    if (this.research[key] >= r.max) { SFX.play('error'); return false; }
    const c = this.researchCost(key);
    if (!this.spendGold(c)) return false;
    this.research[key]++;
    if (key === 'hp') this.life = Math.min(this.maxLife + 2, this.life + 2);
    this.refreshAll();
    SFX.play('upgrade');
    FX.flash('#ffd24d', .12);
    if (window.UI) UI.refresh();
    return true;
  },

  /* ---------------------------------------------------------- 스킬 */
  /* ---------------------------------------------------------- 스킬 장착 */
  /**
   * 스킬 18종을 한 줄에 다 늘어놓으면 화면 밖으로 넘쳐 쓸 수가 없다.
   * 전투에 가져갈 6개를 미리 고르게 해서 UI 를 정리하고, "무엇을 챙길지"라는
   * 전략과 연계(콤보) 설계를 함께 만든다.
   */
  LOADOUT_SIZE: 6,
  DEFAULT_LOADOUT: ['meteor', 'blizzard', 'thunderstorm', 'goldrush', 'overdrive', 'sanctuary'],

  /** 현재 장착한 스킬 정의 배열 */
  activeSkills() {
    const keys = (this.loadout && this.loadout.length) ? this.loadout : this.DEFAULT_LOADOUT;
    const out = [];
    for (const k of keys) {
      const s = SKILLS.find(x => x.key === k);
      if (s) out.push(s);
    }
    return out;
  },
  isEquipped(key) { return this.activeSkills().some(s => s.key === key); },

  /** 장착/해제 토글 — 가득 찼으면 실패 */
  toggleSkill(key) {
    if (!this.loadout) this.loadout = this.DEFAULT_LOADOUT.slice();
    const i = this.loadout.indexOf(key);
    if (i >= 0) { this.loadout.splice(i, 1); this.saveMeta(); return true; }
    if (this.loadout.length >= this.LOADOUT_SIZE) return false;
    this.loadout.push(key);
    this.saveMeta();
    return true;
  },

  canUseSkill(key) {
    const s = SKILLS.find(x => x.key === key);
    return this.skillCd[key] <= 0 && this.mana >= s.mana;
  },

  /* ---------------------------------------------------------- 스킬 연계 */
  /**
   * 원소 궁합표 — 앞선 스킬이 깔아 둔 판을 받아 터뜨리면 보너스가 붙는다.
   * (예: 얼려 놓고 부수기, 기름 대신 화상 깔고 폭발시키기)
   */
  SKILL_ELEM: {
    meteor: 'fire', meteorshower: 'fire', poisonfog: 'poison', blizzard: 'ice',
    thunderstorm: 'thunder', earthquake: 'earth', judgement: 'holy',
    blackhole: 'void', railgun: 'phys', annihilate: 'void',
    timewarp: 'time', timestop: 'time', sanctuary: 'holy',
    overdrive: 'fire', bloodpact: 'blood', goldrush: 'gold',
    summonwave: 'nature', bulwark: 'holy',
  },
  /** 이어 쓰면 특별한 이름이 붙는 조합 (연출·배수 강화) */
  SKILL_COMBOS: [
    { a: 'ice', b: 'earth', name: '빙결 붕괴', mul: 2.2, col: '#8fe0ff' },
    { a: 'ice', b: 'phys', name: '산산조각', mul: 2.0, col: '#bfe9ff' },
    { a: 'fire', b: 'thunder', name: '폭염 폭풍', mul: 2.1, col: '#ffb24d' },
    { a: 'poison', b: 'fire', name: '유독 연소', mul: 2.3, col: '#b8f07a' },
    { a: 'time', b: 'void', name: '시공 붕괴', mul: 2.6, col: '#c48fff' },
    { a: 'holy', b: 'void', name: '명암 교차', mul: 2.4, col: '#fff2b0' },
    { a: 'thunder', b: 'void', name: '뇌전 특이점', mul: 2.2, col: '#d0a8ff' },
  ],
  /** 연계 유효 시간 (초) */
  CHAIN_WINDOW: 4.5,

  /**
   * 스킬 사용 기록을 쌓아 연계 배수를 계산한다.
   * 반환 {mul, n, name} — mul 은 이번 스킬의 피해 배수.
   */
  pushSkillChain(key) {
    const now = this.time;
    if (!this.skillChain) this.skillChain = [];
    /* 시간이 지난 기록은 버린다 */
    this.skillChain = this.skillChain.filter(e => now - e.t <= this.CHAIN_WINDOW);
    const prev = this.skillChain[this.skillChain.length - 1];
    this.skillChain.push({ key, t: now, elem: this.SKILL_ELEM[key] || 'phys' });

    const n = this.skillChain.length;
    if (n < 2) return { mul: 1, n: 1, name: null };

    /* 기본 연계 : 2연 1.35배, 3연 1.7배, 4연 이상 2.1배 */
    let mul = n === 2 ? 1.35 : n === 3 ? 1.7 : 2.1;
    let name = n + '연계';
    let col = '#ffd24d';

    /* 원소 궁합이 맞으면 특별 조합으로 승격 */
    const curElem = this.SKILL_ELEM[key] || 'phys';
    const prevElem = prev ? prev.elem : null;
    const found = this.SKILL_COMBOS.find(c =>
      (c.a === prevElem && c.b === curElem) || (c.a === curElem && c.b === prevElem));
    if (found) { mul = Math.max(mul, found.mul); name = found.name; col = found.col; }

    /* 연출 : 이름을 크게 박고 화면 전체가 반응한다 */
    FX.popText(this.W / 2, this.H * .28, name + '!', col, 30 + n * 3,
      { life: 1.5, vy: -30, big: true });
    FX.popText(this.W / 2, this.H * .28 + 40, '×' + mul.toFixed(2), col, 22 + n * 2,
      { life: 1.4, vy: -22, big: true });
    FX.flash(col, .2 + n * .06);
    FX.shake(8 + n * 4);
    FX.aberrate(5 + n * 2.5);
    FX.speedLines(.8 + n * .2, col);
    for (let i = 0; i < Math.min(3, n); i++)
      setTimeout(() => FX.ripple(this.W / 2, this.H * .38, col, 1500 + i * 300, .5, 5 - i), i * 85);
    if (found) { FX.slowmo(.34, .3); if (window.VFX) VFX.confetti(this.W / 2, this.H * .38, col, 46); }
    SFX.play(found ? 'combo3' : n >= 3 ? 'combo3' : 'combo2');
    if (window.UI) UI.toast('연계 ' + name + '  x' + mul.toFixed(2), col);
    return { mul, n, name, col };
  },
  useSkill(key, wx, wy) {
    const s = SKILLS.find(x => x.key === key);
    if (!this.canUseSkill(key)) {
      SFX.play('error');
      if (window.UI) UI.toast(this.mana < s.mana ? '마나가 부족하다!' : '재사용 대기중', '#ff6b6b');
      return false;
    }
    this.mana -= s.mana;
    this.skillCd[key] = s.cd * (1 - Math.min(.85, this.research.skillcd * .03 + this.bless.skillcd));
    /* 메아리 시전 — 확률적으로 쿨다운을 통째로 날린다 */
    if (this.bless.echo > 0 && Math.random() < this.bless.echo) {
      this.skillCd[key] = 0;
      FX.popText(this.W / 2, this.H * .3, '🔁 메아리 시전!', '#c48fff', 20, { life: 1, vy: -26 });
      SFX.play('rare');
    }
    this.stats.skillUses++;
    SFX.play('skill');

    /* 스킬 연계 — 짧은 시간 안에 이어 쓰면 위력이 붙는다 */
    const combo = this.pushSkillChain(key);

    /* 시전 연출 — 스킬은 "발동했다" 가 몸으로 느껴져야 한다.
       (연계 이름·배수 표시는 pushSkillChain 한 곳에서만 한다) */
    const cx = wx != null ? wx : this.W / 2, cy = wy != null ? wy : this.H * .45;
    VFX.castRing(cx, cy, s.color || '#fff', combo.n || 1);
    FX.impact(cx, cy, s.color || '#fff', .4 + Math.min(.35, (combo.mul - 1) * .35));
    const dmgBase = 260 * Math.pow(1.19, this.wave) * (1 + this.research.atk * .06)
      * (1 + this.bless.skilldmg) * combo.mul;

    switch (key) {
      case 'meteor': {
        const R = s.radius * this.ts;
        for (let i = 0; i < 4; i++) {
          setTimeout(() => {
            const px = wx + U.rand(-R * .4, R * .4), py = wy + U.rand(-R * .4, R * .4);
            FX.explosion(px, py, R * .55, '#ff6b35', '#ffd24d');
            Combat.splash(this, px, py, R * .7, dmgBase * 1.2, {
              elem: 'fire', trueDmg: false, pen: .5,
              status: { burn: { dps: 6, dur: 5 } }
            });
            SFX.play('explode');
          }, i * 130);
        }
        FX.flash('#ff6b35', .4); FX.shake(16);
        this.zones.push(new Zone(this, wx, wy, R, '#ff6b35', 5, dmgBase * .5, { elem: 'fire', pen: .5 }));
        break;
      }
      case 'blizzard': {
        for (const e of this.enemies) {
          if (e.dead) continue;
          e.frozen = Math.max(e.frozen, e.boss ? 1.8 : 4);
          e.chill = 6; e.chillAmt = .6;
          Combat.hit(this, e, dmgBase * .8, { elem: 'ice', pen: .4 });
          FX.ring(e.x, e.y, '#8fe0ff', this.ts * .7, .35);
        }
        FX.flash('#8fe0ff', .5); FX.shake(8); SFX.play('freeze');
        break;
      }
      case 'thunderstorm': {
        const targets = U.shuffle(this.enemies.filter(e => !e.dead)).slice(0, 25);
        targets.forEach((e, i) => setTimeout(() => {
          if (e.dead) return;
          const pts = [{ x: e.x + U.rand(-30, 30), y: -20 }];
          for (let k = 1; k < 6; k++) pts.push({ x: U.lerp(pts[0].x, e.x, k / 5) + U.rand(-14, 14), y: U.lerp(-20, e.y, k / 5) });
          this.beams.push(new Beam(pts, '#ffe14d', .22, 5));
          Combat.hit(this, e, dmgBase * 1.6, { elem: 'thunder', pen: .6, status: { stun: .5 } });
          Combat.splash(this, e.x, e.y, this.ts * 1.2, dmgBase * .5, { elem: 'thunder' });
          FX.explosion(e.x, e.y, this.ts * .7, '#ffe14d');
          if (i % 4 === 0) SFX.play('thunder');
        }, i * 55));
        FX.flash('#ffe14d', .4);
        break;
      }
      case 'goldrush': {
        this.buffs.goldrush = 12;
        const inst = Math.floor(200 + this.wave * 90);
        this.addGold(inst);
        FX.popText(this.W / 2, this.H * .4, '+' + U.fmt(inst) + ' GOLD!', '#ffd24d', 30, { life: 1.5, vy: -40 });
        for (let i = 0; i < 40; i++) FX.spawn({
          x: U.rand(this.W), y: -20, vx: U.rand(-30, 30), vy: U.rand(160, 380),
          life: 2, size: 7, color: '#ffd24d', shape: 'star', vrot: U.rand(-6, 6), rot: U.rand(6)
        });
        FX.flash('#ffd24d', .35); SFX.play('coin');
        break;
      }
      case 'overdrive': {
        this.buffs.overdrive = 10;
        this.refreshAll();
        for (const u of this.units) { u.buffFlash = 1; FX.ring(u.px, u.py, '#ff4f7e', this.ts, .4); }
        FX.flash('#ff4f7e', .4); FX.shake(10);
        break;
      }
      case 'annihilate': {
        for (const e of this.enemies) {
          if (e.dead) continue;
          const cut = e.hp * (e.boss ? .18 : .35);
          Combat.hit(this, e, cut + dmgBase * 3, { elem: 'arcane', trueDmg: true });
          FX.explosion(e.x, e.y, this.ts * .9, '#ff2fd0');
        }
        FX.flash('#ff2fd0', .7); FX.shake(24); FX.stop(.16); SFX.play('explode');
        break;
      }
      case 'timewarp': {
        this.buffs.timewarp = 8;
        FX.flash('#8f7bff', .35);
        for (const e of this.enemies) FX.ring(e.x, e.y, '#8f7bff', this.ts * .6, .4);
        break;
      }
      case 'sanctuary': {
        this.buffs.sanctuary = 8;
        this.life = Math.min(this.maxLife, this.life + 3);
        FX.flash('#fff2b0', .4);
        FX.popText(this.W / 2, this.H * .42, '성역 발동! +3 ♥', '#fff2b0', 24, { life: 1.4, vy: -30 });
        SFX.play('heal');
        break;
      }
      case 'poisonfog': {
        const R = s.radius * this.ts;
        this.zones.push(new Zone(this, wx, wy, R, '#7bdd52', 8, dmgBase * .9, {
          elem: 'poison', trueDmg: true,
          status: { poison: { dps: 3, dur: 5, stack: 10 } }
        }));
        FX.ring(wx, wy, '#7bdd52', R, .6);
        for (let i = 0; i < 30; i++) {
          const a = U.rand(U.TAU), d = U.rand(0, R);
          FX.spawn({
            x: wx + Math.cos(a) * d, y: wy + Math.sin(a) * d, vx: U.rand(-20, 20), vy: U.rand(-30, -6),
            life: U.rand(1, 2), size: 9, size2: 3, color: '#7bdd52', shape: 'smoke', glow: false
          });
        }
        SFX.play('explode');
        break;
      }
      case 'blackhole': {
        const R = s.radius * this.ts;
        const dur = 5;
        this.zones.push(new Zone(this, wx, wy, R, '#b57bff', dur, dmgBase * 1.1, {
          elem: 'void', trueDmg: true, pull: true, shieldBreak: 2
        }));
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (U.dist2(wx, wy, e.x, e.y) < R * R * 2.2) {
            e.root = Math.max(e.root, dur);
            e.markAmt = Math.max(e.markAmt, .3);
          }
        }
        FX.ring(wx, wy, '#b57bff', R * 1.4, .7);
        for (let i = 0; i < 40; i++) {
          const a = U.rand(U.TAU), d = U.rand(R * .6, R * 1.8);
          FX.spawn({
            x: wx + Math.cos(a) * d, y: wy + Math.sin(a) * d,
            vx: -Math.cos(a) * d * 1.6, vy: -Math.sin(a) * d * 1.6,
            life: .8, size: 5, color: '#b57bff', shape: 'spark'
          });
        }
        FX.flash('#b57bff', .3); FX.shake(12);
        break;
      }
      case 'railgun': {
        /* 경로 전체를 훑는 광선 : 지정 지점에서 가장 가까운 경로 구간 방향 */
        const ang = U.ang(wx, wy, this.endX, this.endY);
        const far = Math.max(this.W, this.H) * 1.4;
        const x2 = wx + Math.cos(ang) * far, y2 = wy + Math.sin(ang) * far;
        const x1 = wx - Math.cos(ang) * far, y1 = wy - Math.sin(ang) * far;
        this.beams.push(new Beam([{ x: x1, y: y1 }, { x: x2, y: y2 }], '#6ffff0', .35, 16));
        const width = s.radius * this.ts;
        for (const e of this.enemies) {
          if (e.dead) continue;
          /* 선분까지 거리 */
          const vx = x2 - x1, vy = y2 - y1;
          const t = U.clamp(((e.x - x1) * vx + (e.y - y1) * vy) / (vx * vx + vy * vy), 0, 1);
          const px = x1 + vx * t, py = y1 + vy * t;
          if (U.dist2(px, py, e.x, e.y) < width * width) {
            Combat.hit(this, e, dmgBase * 6, { elem: 'arcane', trueDmg: true, shieldBreak: 3 });
            FX.explosion(e.x, e.y, this.ts * .8, '#6ffff0');
          }
        }
        FX.flash('#6ffff0', .5); FX.shake(16); FX.stop(.08);
        SFX.play('laser');
        break;
      }
      case 'summonwave': {
        let n = 0;
        for (let i = 0; i < 3; i++) {
          if (this.units.length >= this.slotMax()) break;
          const free = this.freeTiles();
          if (!free.length) break;
          const rar = this.rollRarity();
          const def = U.pick((this.runPool && this.runPool[rar.key]) || UNITS_BY_RARITY[rar.key]);
          const [gx, gy] = U.pick(free);
          const u = new Unit(this, def.key, 1, gx, gy);
          this.units.push(u);
          this.collect(def.key);
          this.stats.bestRarity = Math.max(this.stats.bestRarity, RARITY_IDX[rar.key]);
          FX.ring(u.px, u.py, rar.color, this.ts * 1.5, .5);
          FX.burst(u.px, u.py, rar.color, 16, { speed: 200, shape: 'star', size: 6 });
          n++;
        }
        this.refreshAll();
        SFX.play('summon');
        FX.popText(this.W / 2, this.H * .4, `긴급 증원 ${n}기!`, '#a48bff', 24, { life: 1.4, vy: -30 });
        break;
      }
      case 'earthquake': {
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (!e.boss) e.stun = Math.max(e.stun, 2);
          else { e.chill = Math.max(e.chill, 3); e.chillAmt = Math.max(e.chillAmt, .5); }
          e.armorBreak = Math.min(.9, e.armorBreak + .4);
          Combat.hit(this, e, dmgBase * 2.2, { elem: 'earth', pen: .6 });
        }
        FX.flash('#d2a15e', .45); FX.shake(26); FX.stop(.12);
        for (let i = 0; i < 24; i++) {
          FX.spawn({
            x: U.rand(this.ox, this.ox + this.gw * this.ts), y: U.rand(this.oy, this.oy + this.gh * this.ts),
            vx: U.rand(-40, 40), vy: U.rand(-120, -40), gravity: 260,
            life: .9, size: 7, color: '#d2a15e', shape: 'shard', vrot: U.rand(-8, 8)
          });
        }
        SFX.play('explode');
        break;
      }
      case 'judgement': {
        let executed = 0;
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (!e.boss && e.hp / e.maxHp <= .4) {
            e.shield = 0;
            Combat.hit(this, e, e.hp * 10, { elem: 'holy', trueDmg: true });
            executed++;
          } else {
            Combat.hit(this, e, dmgBase * 8, { elem: 'holy', trueDmg: true, holyBonus: 1, bossBonus: .5 });
          }
          FX.spawn({
            x: e.x, y: e.y - 200, vx: 0, vy: 900, life: .3, size: 14, color: '#fff2b0', shape: 'spark'
          });
          FX.explosion(e.x, e.y, this.ts, '#fff2b0', '#ffffff');
        }
        FX.flash('#ffffff', .85); FX.shake(30); FX.stop(.2);
        FX.popText(this.W / 2, this.H * .36, '최후의 심판', '#fff2b0', 34, { life: 1.8, vy: -26 });
        if (executed) FX.popText(this.W / 2, this.H * .36 + 40, executed + '기 숙청', '#ffd24d', 20, { life: 1.6, vy: -20 });
        SFX.play('mythic');
        break;
      }

      /* ---- 추가 스킬 ---- */
      case 'meteorshower': {
        /* 메테오보다 넓게, 3파에 걸쳐 쏟아진다 */
        const R = s.radius * this.ts;
        for (let wave = 0; wave < 3; wave++) {
          setTimeout(() => {
            if (this.state !== 'playing') return;
            for (let i = 0; i < 3; i++) {
              const px = wx + U.rand(-R * .7, R * .7), py = wy + U.rand(-R * .7, R * .7);
              FX.explosion(px, py, this.ts * 1.5, '#ff7a3c', '#ffe08a');
              FX.ring(px, py, '#ff7a3c', this.ts * 1.7, .45);
              for (const e of this.enemies) {
                if (e.dead) continue;
                if (U.dist2(e.x, e.y, px, py) > (this.ts * 1.7) ** 2) continue;
                Combat.hit(this, e, dmgBase * 2.2, {
                  elem: 'fire', status: { burn: { dps: dmgBase * .05, dur: 4 } }
                });
              }
            }
            FX.shake(11);
          }, wave * 320);
        }
        FX.flash('#ff7a3c', .3);
        FX.popText(wx, wy - this.ts * 2, '유성우!', '#ff7a3c', 24, { life: 1.2, vy: -24 });
        break;
      }
      case 'timestop': {
        /* timewarp 는 감속(0.3배)이지만 이쪽은 완전 정지 */
        this.buffs.timestop = 5;
        FX.flash('#b4a8ff', .5);
        for (const e of this.enemies) FX.ring(e.x, e.y, '#b4a8ff', this.ts * .7, .5);
        FX.popText(this.W / 2, this.H * .38, '시간 정지', '#b4a8ff', 32, { life: 1.6, vy: -22 });
        SFX.play('mythic');
        break;
      }
      case 'bloodpact': {
        /* 강력한 대신 생명 1을 대가로 지불한다 */
        this.buffs.bloodpact = 12;
        if (this.life > 1) this.life -= 1;
        FX.flash('#e04a5a', .45); FX.shake(14);
        FX.popText(this.W / 2, this.H * .4, '피의 계약 −1 ♥', '#e04a5a', 26, { life: 1.6, vy: -24 });
        if (window.UI) UI.refresh();
        break;
      }
      case 'bulwark': {
        this.bulwarkCharges = (this.bulwarkCharges || 0) + 3;
        FX.flash('#7fd0ff', .35);
        FX.ring(this.endX, this.endY, '#7fd0ff', this.ts * 2.4, .7);
        FX.popText(this.endX, this.endY - this.ts, '장벽 ' + this.bulwarkCharges + '회', '#7fd0ff', 22, { life: 1.5, vy: -22 });
        SFX.play('heal');
        break;
      }
    }
    this.checkAchievements();
    if (window.UI) UI.refresh();
    return true;
  },

  /* ---------------------------------------------------------- 업적 */
  checkAchievements() {
    const s = {
      kills: this.stats.kills + this.metaStats.kills,
      bossKills: this.stats.bossKills + this.metaStats.bossKills,
      maxWave: Math.max(this.stats.maxWave, this.metaStats.maxWave),
      bestRarity: Math.max(this.stats.bestRarity, this.metaStats.bestRarity),
      merges: this.stats.merges + this.metaStats.merges,
      totalGold: this.stats.totalGold + this.metaStats.totalGold,
      maxCombo: Math.max(this.stats.maxCombo, this.metaStats.maxCombo),
      leaks: this.stats.leaks,
      totalDmg: this.stats.totalDmg + this.metaStats.totalDmg,
      mapsUnlocked: Object.keys(this.unlockedMaps).length,
      skillUses: this.stats.skillUses + this.metaStats.skillUses,
      maxUnits: Math.max(this.stats.maxUnits, this.metaStats.maxUnits),
      collected: this.collectedCount(),
      runs: this.metaStats.runs,
    };
    for (const a of ACHIEVEMENTS) {
      if (this.achieved[a.key]) continue;
      if (a.check(s)) {
        this.achieved[a.key] = 1;
        this.gems += a.gem;
        SFX.play('unlock');
        if (window.UI) UI.achievementPopup(a);
        this.saveMeta();
      }
    }
  },

  /* ---------------------------------------------------------- 종료 */
  gameOver() {
    if (this.state !== 'playing') return;
    /* 불사조의 깃 — 판을 한 번 되살린다 */
    if (this.bless && this.bless.revive > 0) {
      this.bless.revive--;
      this.life = Math.min(this.maxLife, 10);
      for (const e of this.enemies) e.hp = 0;
      FX.flash('#ffd24d', .9); FX.shake(30);
      FX.popText(this.W / 2, this.H * .4, '🔥 불사조의 부활!', '#ffd24d', 34, { life: 2, vy: -30 });
      if (window.VFX) VFX.confetti(this.W / 2, this.H * .4, '#ffd24d', 100);
      SFX.play('jackpot');
      if (window.UI) { UI.toast('불사조의 깃이 그대를 되살렸다', '#ffd24d'); UI.refresh(); }
      return;
    }
    this.state = 'gameover';
    this.clearRun();
    if (window.Daily && Daily.active) Daily.finish();
    this.mergeMetaStats();
    SFX.play('lose');
    FX.flash('#ff2a2a', .8); FX.shake(26);
    if (window.UI) UI.showGameOver(false);
    this.saveMeta();
  },
  victory() {
    this.mergeMetaStats();
    this.clearRun();
    if (window.Daily && Daily.active) Daily.finish();
    this.metaStats.wins++;
    /* 다음 맵 해금 */
    const idx = MAPS.findIndex(m => m.key === this.map.key);
    if (idx >= 0 && idx + 1 < MAPS.length) this.unlockedMaps[MAPS[idx + 1].key] = 1;
    this.gems += 25;
    SFX.play('win');
    if (window.UI) UI.showGameOver(true);
    this.saveMeta();
  },
  mergeMetaStats() {
    const m = this.metaStats, s = this.stats;
    m.kills += s.kills; m.bossKills += s.bossKills; m.totalDmg += s.totalDmg;
    m.leaks += s.leaks; m.merges += s.merges; m.summons += s.summons;
    m.totalGold += s.totalGold; m.skillUses += s.skillUses;
    m.maxCombo = Math.max(m.maxCombo, s.maxCombo);
    m.maxUnits = Math.max(m.maxUnits, s.maxUnits);
    m.maxWave = Math.max(m.maxWave, s.maxWave);
    m.bestRarity = Math.max(m.bestRarity, s.bestRarity);
    m.runs++;
    this.checkAchievements();
  },

  /* ---------------------------------------------------------- 입력 */
  bindInput() {
    const cv = this.canvas;
    let downPos = null, downTime = 0, dragging = false;

    const toWorld = (ev) => {
      const r = cv.getBoundingClientRect();
      const t = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const toGrid = (p) => ({
      gx: Math.floor((p.x - this.ox) / this.ts),
      gy: Math.floor((p.y - this.oy) / this.ts)
    });

    const onDown = (ev) => {
      SFX.init(); SFX.resume();
      if (this.state !== 'playing') return;
      const p = toWorld(ev);
      downPos = p; downTime = U.now(); dragging = false;

      if (this.targetingSkill) {
        this.useSkill(this.targetingSkill, p.x, p.y);
        this.targetingSkill = null;
        if (window.UI) UI.setSkillTargeting(null);
        return;
      }
      const { gx, gy } = toGrid(p);
      const u = this.unitAt(gx, gy);
      if (u) {
        this.selected = u;
        this.dragUnit = u;
        this.dragPos = p;
        SFX.play('pickup');
        /* 패널은 손을 뗄 때(=드래그가 아니었을 때) 연다. 누르자마자 열면
           화면 절반을 덮어 드래그로 옮길 칸이 보이지 않는다. */
      } else {
        this.selected = null;
        if (window.UI) UI.showUnitPanel(null);
        /* 빈 칸을 눌렀는데 그 자리에 적이 있으면 적 정보를 띄운다 */
        const e = this.enemyAt(p.x, p.y);
        if (e && window.UI) UI.showEnemyInfo(e);
      }
    };
    const onMove = (ev) => {
      if (!downPos) return;
      const p = toWorld(ev);
      if (U.dist(p.x, p.y, downPos.x, downPos.y) > 8) dragging = true;
      if (this.dragUnit) { this.dragPos = p; ev.preventDefault && ev.preventDefault(); }
    };
    const onUp = (ev) => {
      const u = this.dragUnit;
      if (u && dragging && this.dragPos) {
        const { gx, gy } = toGrid(this.dragPos);
        if (gx >= 0 && gy >= 0 && gx < this.gw && gy < this.gh && !this.isPath(gx, gy)) {
          this.moveUnit(u, gx, gy);
          SFX.play('place');
        } else {
          SFX.play('error');
        }
      } else if (u && !dragging) {
        /* 그냥 탭 : 이때 상세 패널을 연다 */
        if (window.UI) UI.showUnitPanel(u);
      }
      this.dragUnit = null; this.dragPos = null; downPos = null; dragging = false;
    };

    cv.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    cv.addEventListener('touchstart', e => { onDown(e); }, { passive: true });
    cv.addEventListener('touchmove', e => { onMove(e); }, { passive: false });
    cv.addEventListener('touchend', e => { onUp(e); });

    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      switch (e.key.toLowerCase()) {
        case ' ': e.preventDefault(); this.paused = !this.paused; if (window.UI) UI.refresh(); break;
        case 'q': this.summon(); break;
        case 'w': this.autoMergeAll(); break;
        case 'e': if (!this.waveActive) this.startWave(); break;
        case 'r': this.cycleSpeed(); break;
        case 'a': this.autoArrange(); break;
        case 'l': if (this.selected) this.toggleLock(this.selected); break;
        case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': {
          const s = this.activeSkills()[parseInt(e.key) - 1];
          if (s) { if (s.type === 'target') { this.targetingSkill = s.key; if (window.UI) UI.setSkillTargeting(s.key); } else this.useSkill(s.key); }
          break;
        }
        case 'escape': this.targetingSkill = null; this.selected = null; if (window.UI) { UI.setSkillTargeting(null); UI.closeAll(); } break;
      }
    });
  },

  SPEEDS: [1, 2, 3, 4],
  cycleSpeed() {
    const i = this.SPEEDS.indexOf(this.speed);
    this.speed = this.SPEEDS[(i + 1) % this.SPEEDS.length];
    SFX.play('click');
    if (window.UI) UI.refresh();
  },

  /* ---------------------------------------------------------- 루프 */
  frame(t) {
    const raw = Math.min(.05, (t - this.lastT) / 1000);
    this.lastT = t;
    if (FX.hitStop > 0) { FX.hitStop -= raw; }
    else if (!this.paused && this.state === 'playing') {
      /* 슬로우모션 — 큰 순간에만 시간이 늘어진다 (연출용이라 파티클은 그대로 흐른다) */
      const slow = FX.slowT > 0 ? FX.slowScale : 1;
      const steps = this.speed > 1 ? this.speed : 1;
      const dt = raw * (this.speed / steps) * slow;
      for (let i = 0; i < steps; i++) this.update(dt);
    }
    FX.update(raw);
    this.render();
    requestAnimationFrame(nt => this.frame(nt));
  },

  update(dt) {
    this.time += dt;

    /* 마나 */
    this.mana = Math.min(this.maxMana, this.mana + 3.2 * this.manaMul * dt);

    /* 콤보 */
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    /* 버프 */
    let odWas = this.buffs.overdrive > 0;
    for (const k in this.buffs) if (this.buffs[k] > 0) this.buffs[k] -= dt;
    if (odWas && this.buffs.overdrive <= 0) this.refreshAll();
    this.enemySpeedMul = this.buffs.timestop > 0 ? 0 : this.buffs.timewarp > 0 ? .3 : 1;

    /* 스킬 쿨 */
    for (const k in this.skillCd) if (this.skillCd[k] > 0) this.skillCd[k] -= dt;

    /* 웨이브 */
    this.updateWave(dt);

    /* 엔티티 */
    for (const u of this.units) u.update(dt);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt);
      if (e.dead) this.enemies.splice(i, 1);
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]; p.update(dt);
      if (p.dead) this.projectiles.splice(i, 1);
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i]; b.update(dt);
      if (b.dead) this.beams.splice(i, 1);
    }
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]; z.update(dt);
      if (z.dead) this.zones.splice(i, 1);
    }

    GFX.updateWeather(dt, this);
    VFX.update(dt);
    if (window.Tutorial) Tutorial.tick();

    /* 음악 강도 */
    const intensity = U.clamp(this.enemies.length / 40 + (this.wave % 10 === 0 ? .4 : 0), 0, 1);
    SFX.musicTick(dt, intensity);

    if (window.UI) UI.tick(dt);
    if (window.Perf) Perf.tick(dt);
  },

  /* ---------------------------------------------------------- 렌더 */
  /**
   * 화면 그리기.
   *
   * 색수차가 켜져 있는 동안에만 오프스크린 캔버스에 한 번 그린 뒤 겹쳐 찍는다.
   * 화면에 붙은 캔버스에서 픽셀을 되읽으면(drawImage(cv,…)) GPU 동기화가 걸려
   * 목적지 크기와 무관하게 18~24ms/프레임이 나온다 — 60fps 예산을 혼자 다 먹는다.
   * 오프스크린에 그리고 blit 하는 경로는 4.5ms 라, 효과가 도는 0.3~0.6초 동안만
   * 그 값을 내고 평소에는 한 푼도 쓰지 않는다.
   */
  render() {
    const amt = FX.chromatic;
    /* 이 경로는 효과가 도는 동안 6ms/프레임을 쓴다. 예산이 넉넉한 단계에서만 켠다
       (Perf 가 28fps 밑으로 떨어지면 알아서 단계를 내리고, 그때 자동으로 꺼진다). */
    const useChroma = amt >= .35 && (!window.Perf || Perf.quality >= 2);
    if (!useChroma) { this.renderScene(this.ctx); return; }

    /* 오프스크린은 CSS 해상도(=dpr 1)로 뜬다. 화면과 같은 배율로 뜨면 픽셀이 4배가
       되고, 이 캔버스는 GPU 가속을 못 받아 시간이 픽셀 수에 그대로 비례한다.
       0.3초짜리 충격 연출이라 살짝 무른 것은 오히려 색수차답게 보인다. */
    const W = this.W, H = this.H;
    let off = this._chromaCv;
    if (!off) off = this._chromaCv = document.createElement('canvas');
    if (off.width !== W || off.height !== H) { off.width = W; off.height = H; }
    const ox = off.getContext('2d');
    ox.setTransform(1, 0, 0, 1, 0, 0);
    this.renderScene(ox);

    const c = this.ctx;
    c.clearRect(0, 0, W, H);
    c.drawImage(off, 0, 0, W, H);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = U.clamp(amt * .06, 0, .42);
    /* 붉은 쪽은 왼쪽으로, 푸른 쪽은 오른쪽으로 */
    c.drawImage(off, -amt, 0, W, H);
    c.drawImage(off, amt, 0, W, H);
    c.restore();
  },

  renderScene(c) {
    const W = this.W, H = this.H;
    /* 유닛이 아주 많을 때는 스티커 외곽선을 자동으로 생략해 프레임을 지킨다 */
    /* 유닛 스프라이트를 캐시하게 되면서 외곽선 비용이 사실상 사라져(20기 21ms → 1.2ms)
       기본은 항상 켠다. 단, 최적화 단계를 최저로 내리면 꺼서 프레임을 확보한다. */
    GFX.outlineBudget = !window.Perf || Perf.quality >= 1;
    c.save();
    c.clearRect(0, 0, W, H);
    /* 바깥 배경 */
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d1117'); bg.addColorStop(1, '#05070b');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);

    /* 화면 흔들림 + 충격 방향 카메라 킥 */
    c.translate(FX.shakeX + FX.kickX, FX.shakeY + FX.kickY);
    if (FX.zoomPulse > 0) {
      c.translate(W / 2, H / 2); c.scale(1 + FX.zoomPulse, 1 + FX.zoomPulse); c.translate(-W / 2, -H / 2);
    }

    Draw.drawMap(c, this);
    VFX.drawGround(c);
    Draw.drawPlacement(c, this);
    for (const z of this.zones) Draw.drawZone(c, z, this);

    /* 유닛 (뒤→앞) */
    const sorted = this.units.slice().sort((a, b) => a.py - b.py);
    for (const u of sorted) {
      if (this.dragUnit === u && this.dragPos) continue;
      Draw.drawUnit(c, u, this);
      for (const m of u.minions) Draw.drawMinion(c, m, this);
    }

    /* 적 */
    const es = this.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of es) Draw.drawEnemy(c, e, this);

    /* 투사체 & 빔 */
    for (const p of this.projectiles) Draw.drawProj(c, p, this);
    for (const b of this.beams) Draw.drawBeam(c, b, this);

    /* 충격파 · 스피드라인 */
    VFX.drawTop(c);

    /* 환경광 */
    GFX.ambient(c, this);

    /* 파티클 */
    FX.draw(c);

    /* 날씨 */
    GFX.drawWeather(c, this);

    /* 드래그 중인 유닛 — 손가락을 따라 들어올려진 유닛을 그린다 */
    if (this.dragUnit && this.dragPos) {
      const u = this.dragUnit;
      const ts = this.ts;
      const gx = Math.floor((this.dragPos.x - this.ox) / ts);
      const gy = Math.floor((this.dragPos.y - this.oy) / ts);
      const inGrid = gx >= 0 && gy >= 0 && gx < this.gw && gy < this.gh;
      const occupant = inGrid ? this.unitAt(gx, gy) : null;
      const canMerge = occupant && occupant !== u && occupant.key === u.key && occupant.star === u.star;
      const valid = inGrid && !this.isPath(gx, gy);
      const col = !valid ? '#ff5a5a' : canMerge ? '#ffd24d' : '#7cff9c';

      /* 놓을 칸 표시 */
      if (inGrid) {
        const cx = this.ox + gx * ts, cy = this.oy + gy * ts;
        c.save();
        c.fillStyle = U.rgba(col, .18);
        c.fillRect(cx + 2, cy + 2, ts - 4, ts - 4);
        c.strokeStyle = col; c.lineWidth = 3; c.setLineDash([7, 5]);
        c.lineDashOffset = -this.time * 26;
        c.strokeRect(cx + 2, cy + 2, ts - 4, ts - 4);
        c.setLineDash([]);
        if (canMerge) {
          c.fillStyle = col; c.font = `900 ${Math.round(ts * .3)}px system-ui`;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText('합성', cx + ts / 2, cy + ts / 2);
        }
        c.restore();
      }

      /* 사거리 미리보기 */
      c.save();
      c.fillStyle = U.rgba(ELEM[u.def.elem].color, .07);
      c.beginPath(); c.arc(this.dragPos.x, this.dragPos.y, u.stat.rng * ts, 0, U.TAU); c.fill();
      c.strokeStyle = U.rgba(ELEM[u.def.elem].color, .5); c.lineWidth = 2;
      c.beginPath(); c.arc(this.dragPos.x, this.dragPos.y, u.stat.rng * ts, 0, U.TAU); c.stroke();
      c.restore();

      /* 들어올린 느낌 : 바닥 그림자는 원래 칸에, 본체는 손가락 위로 살짝 띄워 크게 */
      const lift = ts * .34;
      GFX.groundShadow(c, this.dragPos.x, this.dragPos.y + ts * .1, ts * .3, ts * .1, .32);
      c.save();
      c.globalAlpha = .95;
      GFX.drawUnitChar(c, this.dragPos.x, this.dragPos.y - lift, ts * .5,
        Draw.unitLook(u.def),
        { t: this.time + u.seed, phase: this.time * 1.6, aim: 0, recoil: 0, seed: u.seed });
      c.restore();
    }

    /* 스킬 조준 */
    if (this.targetingSkill) {
      const s = SKILLS.find(x => x.key === this.targetingSkill);
      c.strokeStyle = s.color; c.lineWidth = 2;
      c.setLineDash([8, 6]); c.lineDashOffset = -this.time * 40;
      c.beginPath(); c.arc(this.lastMouseX || W / 2, this.lastMouseY || H / 2, (s.radius || 3) * this.ts, 0, U.TAU); c.stroke();
      c.setLineDash([]);
    }

    c.restore();

    /* 충격 링 · 속도선 (흔들림 밖에서 화면 기준으로) */
    FX.drawImpact(c, W, H);

    /* 저체력 비네트 */
    const lifePct = this.life / this.maxLife;
    if (lifePct < .4) Draw.vignette(c, W, H, (1 - lifePct / .4) * .5, '#ff2a2a');
    if (this.buffs.overdrive > 0) Draw.vignette(c, W, H, .25, '#ff4f7e');
    if (this.buffs.goldrush > 0) Draw.vignette(c, W, H, .2, '#ffd24d');
    Draw.overlay(c, W, H);
  },
};

window.Game = Game;
