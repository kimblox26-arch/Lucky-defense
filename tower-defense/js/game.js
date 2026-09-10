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
    this.maxLife = 20 + (this.perks.life || 0) * 5 + (boost.startlife ? 10 : 0);
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

  /* ---------------------------------------------------------- 메타 저장 */
  loadMeta() {
    const d = (window.Account && Account.current) ? Account.loadProfileData() : Store.load();
    this.gems = d && d.gems || 0;
    this.perks = d && d.perks || { atk: 0, gold: 0, luck: 0, life: 0, gold0: 0 };
    this.unlockedMaps = d && d.unlockedMaps || { meadow: 1 };
    this.achieved = d && d.achieved || {};
    this.collection = d && d.collection || {};
    this.boosters = d && d.boosters || {};
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
      achieved: this.achieved, metaStats: this.metaStats, settings: this.settings,
      collection: this.collection, boosters: this.boosters,
    };
    if (window.Account && Account.current) Account.saveProfileData(data);
    else Store.save(data);
  },

  /* ---------------------------------------------------------- 스케일 */
  /** 현재 배치된 전군의 총 DPS (합성/레벨/연구 반영된 실전력) */
  armyDPS() {
    let s = 0;
    for (const u of this.units) s += (u.dps || 0);
    return s;
  },

  enemyScale(def, hpMul) {
    const w = this.wave + this.loop * 100;
    const diff = this.map.diff;
    let hp = 24 * def.hp * Math.pow(1.16, w - 1) * diff * (hpMul || 1) * this.modNum('hpMul', 1);
    /* 동적 난이도 보정: 웨이브 고정 곡선만으로는 합성/가챠로 인한 화력 스노우볼을
       따라잡지 못해(가챠 대박, 대량 합성 시 순식간에 수십~수백 배 화력 격차 발생),
       현재 전군 DPS를 웨이브별 기대 화력과 비교해 체력을 자동 보정한다.
       화력이 기대치보다 낮으면 오히려 체력을 낮춰 초반/불운 유저를 배려한다. */
    const dpsRef = 55 * Math.pow(1.075, w - 1);
    const powerRatio = U.clamp(this.armyDPS() / dpsRef, .35, 60);
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
    const budget = 6 + w * 1.9 + Math.pow(w, 1.25) * .5;
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

  startWave() {
    if (this.waveActive) return;
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
        const e = this.spawnEnemy(s.key, { hpMul: s.elite ? 3.2 : 1 });
        if (e && s.elite) {
          e.maxHp *= 1; e.bounty *= 2.4;
          e.elite = true;
          FX.ring(e.x, e.y, '#ffd24d', this.ts, .5);
        }
        this.spawnTimer = s.delay * (1 / 1);
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
    const interest = Math.floor(this.gold * this.research.interest * .01);
    this.addGold(reward + interest);
    this.mana = Math.min(this.maxMana, this.mana + 25);
    this.breakTime = 5.0;

    FX.popText(this.W / 2, this.H * .38, `웨이브 ${w} 클리어!`, '#7cff9c', 30, { life: 1.6, vy: -30 });
    FX.popText(this.W / 2, this.H * .38 + 34, `+${U.fmt(reward)}G` + (interest ? ` (이자 +${U.fmt(interest)})` : ''), '#ffd24d', 18, { life: 1.6, vy: -24 });
    SFX.play('win');
    VFX.waveClear(this);

    this.checkAchievements();
    if (this.wave >= 100 && this.loop === 0) this.victory();
    this.prepareNextWave();
    if (window.UI) UI.onWaveEnd(w);
    this.saveMeta();
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
    return (1 + this.research.gold * .07) * (1 + (this.perks.gold || 0) * .1) * this.modNum('goldMul', 1);
  },
  get manaMul() { return (1 + this.research.mana * .09) * this.modNum('manaMul', 1); },

  addCombo() {
    this.combo++;
    this.comboTimer = 2.6;
    this.maxComboRun = Math.max(this.maxComboRun, this.combo);
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
    if (this.combo % 10 === 0) {
      SFX._combo = this.combo; SFX.play('combo');
      FX.popText(this.W / 2, this.H * .3, this.combo + ' COMBO!', '#ffd24d', 22 + Math.min(20, this.combo * .06), { life: .8, vy: -20 });
      FX.pulse(.02);
    }
    if (this.combo === 50 || this.combo === 100 || this.combo === 200 || this.combo === 500) {
      FX.flash('#ffd24d', .3); FX.shake(6);
    }
  },
  resetCombo() { this.combo = 0; this.comboTimer = 0; },
  comboGoldMul() { return 1 + Math.min(2.5, this.combo * .012); },

  addShakeForSplash(R) { FX.shake(Math.min(6, R * .05)); },

  /* ---------------------------------------------------------- 소환 */
  summonCost() {
    const base = 30 + this.summonCount * 7.4;
    return Math.max(12, Math.floor(base * (1 - this.research.summoncost * .02)));
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
      total += Math.max(12, Math.floor(base * (1 - this.research.summoncost * .02)));
      count++;
    }
    return total;
  },

  rollRarity() {
    const luck = this.research.luck * .05 + (this.perks.luck || 0) * .08 + (this.luckBoost || 0);
    const list = RARITY.map((r, i) => ({ r, w: r.w * Math.pow(1 + luck, i) }));
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
    if (this.freeSummons > 0) { this.freeSummons--; cost = 0; }
    else if (!this.spendGold(cost)) return null;
    this.summonCount++; this.stats.summons++;

    const rar = this.rollRarity();
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
      SFX.play(ri >= 4 ? 'legendary' : 'coin');
      FX.popText(u.px, u.py - this.ts * .8, def.name, col, 13 + ri);
    }
    this.checkAchievements();
    if (window.UI) UI.refresh();
    return { unit: u, def, rar, ri, isNew };
  },

  /** 등급별 소환 이펙트 (단독 소환용) */
  playSummonFx(u, def, rar, ri) {
    const col = rar.color;
    FX.popText(u.px, u.py - this.ts * .8, def.name, col, 14 + ri);
    if (ri >= 6) { SFX.play('mythic'); FX.flash(col, .6); FX.shake(14); FX.stop(.14); if (window.UI) UI.rarityBanner(def, rar); }
    else if (ri >= 5) { SFX.play('mythic'); FX.flash(col, .45); FX.shake(10); if (window.UI) UI.rarityBanner(def, rar); }
    else if (ri >= 4) { SFX.play('legendary'); FX.flash(col, .3); FX.shake(6); if (window.UI) UI.rarityBanner(def, rar); }
    else if (ri >= 3) { SFX.play('upgrade'); FX.flash(col, .18); FX.shake(3); if (window.UI) UI.rarityBanner(def, rar); }
    else if (ri >= 2) { SFX.play('summon'); if (window.UI) UI.rarityBanner(def, rar); }
    else SFX.play('summon');
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

  slotMax() { return 20 + this.research.slot; },

  /* ---------------------------------------------------------- 맵 모디파이어 */
  get mods() { return (this.map && this.map.mods) || []; },
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
    for (const x of grp) if (x !== u) this.removeUnit(x, false);

    this.stats.merges++;
    if (u.star < 3) {
      u.star++;
      FX.explosion(u.px, u.py, this.ts * 1.2, RARITY[RARITY_IDX[u.def.rarity]].color, '#fff');
      VFX.ascend(u.px, u.py, RARITY[RARITY_IDX[u.def.rarity]].color, this);
      FX.popText(u.px, u.py - this.ts, U.roman(u.star) + '성 달성!', '#ffd24d', 18);
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
      FX.flash(nextRar.color, .45); FX.shake(12); FX.stop(.1);
      FX.popText(nu.px, nu.py - this.ts, '승급! ' + nd.name, nextRar.color, 20, { life: 1.4 });
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

    /* 전역 보너스 */
    this.bonus.dmg = (this.perks.atk || 0) * .08;
    this.bonus.crit = 0; this.bonus.gold = 0;
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
    this.maxLife = 20 + this.research.hp * 2 + (this.perks.life || 0) * 5;

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
  canUseSkill(key) {
    const s = SKILLS.find(x => x.key === key);
    return this.skillCd[key] <= 0 && this.mana >= s.mana;
  },
  useSkill(key, wx, wy) {
    const s = SKILLS.find(x => x.key === key);
    if (!this.canUseSkill(key)) {
      SFX.play('error');
      if (window.UI) UI.toast(this.mana < s.mana ? '마나가 부족하다!' : '재사용 대기중', '#ff6b6b');
      return false;
    }
    this.mana -= s.mana;
    this.skillCd[key] = s.cd * (1 - Math.min(.6, this.research.skillcd * .03));
    this.stats.skillUses++;
    SFX.play('skill');

    const dmgBase = 260 * Math.pow(1.19, this.wave) * (1 + this.research.atk * .06);

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
    this.state = 'gameover';
    this.mergeMetaStats();
    SFX.play('lose');
    FX.flash('#ff2a2a', .8); FX.shake(26);
    if (window.UI) UI.showGameOver(false);
    this.saveMeta();
  },
  victory() {
    this.mergeMetaStats();
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
        /* 패널은 손을 뗄 때(=드래그가 아니었을 때) 연다. 누르자마자 열면
           화면 절반을 덮어 드래그로 옮길 칸이 보이지 않는다. */
      } else {
        this.selected = null;
        if (window.UI) UI.showUnitPanel(null);
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
          SFX.play('click');
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
          const s = SKILLS[parseInt(e.key) - 1];
          if (s) { if (s.type === 'target') { this.targetingSkill = s.key; if (window.UI) UI.setSkillTargeting(s.key); } else this.useSkill(s.key); }
          break;
        }
        case 'escape': this.targetingSkill = null; this.selected = null; if (window.UI) { UI.setSkillTargeting(null); UI.closeAll(); } break;
      }
    });
  },

  cycleSpeed() {
    this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
    SFX.play('click');
    if (window.UI) UI.refresh();
  },

  /* ---------------------------------------------------------- 루프 */
  frame(t) {
    const raw = Math.min(.05, (t - this.lastT) / 1000);
    this.lastT = t;
    if (FX.hitStop > 0) { FX.hitStop -= raw; }
    else if (!this.paused && this.state === 'playing') {
      const steps = this.speed > 1 ? this.speed : 1;
      const dt = raw * (this.speed / steps);
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
  },

  /* ---------------------------------------------------------- 렌더 */
  render() {
    const c = this.ctx, W = this.W, H = this.H;
    /* 유닛이 아주 많을 때는 스티커 외곽선을 자동으로 생략해 프레임을 지킨다 */
    /* 유닛 스프라이트를 캐시하게 되면서 외곽선 비용이 사실상 사라져(20기 21ms → 1.2ms)
       유닛 수와 무관하게 항상 켜 둔다 */
    GFX.outlineBudget = true;
    c.save();
    c.clearRect(0, 0, W, H);
    /* 바깥 배경 */
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d1117'); bg.addColorStop(1, '#05070b');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);

    /* 화면 흔들림 */
    c.translate(FX.shakeX, FX.shakeY);
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

    /* 저체력 비네트 */
    const lifePct = this.life / this.maxLife;
    if (lifePct < .4) Draw.vignette(c, W, H, (1 - lifePct / .4) * .5, '#ff2a2a');
    if (this.buffs.overdrive > 0) Draw.vignette(c, W, H, .25, '#ff4f7e');
    if (this.buffs.goldrush > 0) Draw.vignette(c, W, H, .2, '#ffd24d');
    Draw.overlay(c, W, H);
  },
};

window.Game = Game;
