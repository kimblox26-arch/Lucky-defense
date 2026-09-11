/* =============================================================================
 *  일일 도전
 *
 *  날짜에서 시드를 뽑아, 그날은 전 세계가 똑같은 조건으로 달린다.
 *    · 맵 · 난이도 · 특수 규칙 3개가 날짜로 결정된다
 *    · 하루 한 번만 기록이 남는다 (연습은 몇 번이든 가능)
 *    · 리더보드에 map='daily:YYYY-MM-DD' 로 따로 쌓인다
 *
 *  같은 조건이라 "운이 좋았네" 가 아니라 "누가 더 잘했나" 가 남는다.
 * ========================================================================== */
'use strict';

/** 시드 기반 난수 (mulberry32) — 같은 날짜면 누가 돌려도 같은 결과 */
function seedRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 오늘의 도전에 붙을 수 있는 특수 규칙 */
const DAILY_RULES = [
  { k: 'swarm', n: '물량전', i: '🐜', d: '적이 40% 더 많이 몰려온다', m: { count: 1.4 } },
  { k: 'tough', n: '철벽', i: '🛡', d: '적 체력 +35%', m: { hpMul: 1.35 } },
  { k: 'swift', n: '질주', i: '💨', d: '적 이동속도 +22%', m: { spdMul: 1.22 } },
  { k: 'frugal', n: '긴축 재정', i: '🪙', d: '골드 획득 -30%', m: { goldMul: .70 } },
  { k: 'fragile', n: '살얼음', i: '💔', d: '시작 목숨이 5뿐이다', life: 5 },
  { k: 'nogacha', n: '제한된 부름', i: '🎫', d: '소환 비용 +60%', costMul: 1.6 },
  { k: 'richman', n: '풍요', i: '💰', d: '시작 골드 3배', gold0: 3 },
  { k: 'blessed', n: '축복받은 날', i: '🌟', d: '축복을 2웨이브마다 고른다', blessEvery: 2 },
  { k: 'nomercy', n: '무자비', i: '💀', d: '보스가 5웨이브마다 온다', m: { bossEvery: 5 } },
  { k: 'glasswar', n: '유리전쟁', i: '🔮', d: '아군 공격력 +50% · 목숨 절반', dmg: .5, lifeMul: .5 },
  { k: 'chaos', n: '혼돈', i: '🌀', d: '유닛 등급이 매번 무작위로 흔들린다', luck: .35 },
  { k: 'marathon', n: '마라톤', i: '🏃', d: '적 체력 +20% · 골드 +40%', m: { hpMul: 1.2, goldMul: 1.4 } },
];

const Daily = {
  /** 오늘 날짜 키 (UTC 기준 — 전 세계가 같은 날 같은 판을 본다) */
  today() { return new Date().toISOString().slice(0, 10); },

  /** 날짜 문자열 → 정수 시드 */
  seedOf(day) {
    let h = 2166136261;
    const s = 'itd-daily-' + day;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },

  /** 오늘의 도전 구성 */
  build(day) {
    const d = day || this.today();
    const rng = seedRng(this.seedOf(d));
    /* 맵은 해금 여부와 무관하게 전부 후보 — 도전이니까 */
    const map = MAPS[Math.floor(rng() * MAPS.length)];
    const diffKeys = ['normal', 'hard', 'nightmare'];
    const diff = diffKeys[Math.floor(rng() * diffKeys.length)];
    /* 규칙 3개를 겹치지 않게 */
    const pool = DAILY_RULES.slice();
    const rules = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      rules.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    }
    return { day: d, map, diff, rules, seed: this.seedOf(d) };
  },

  /* --------------------------------------------------------- 기록 */
  stateKey: 'itd_daily_v1',
  loadState() {
    try { return JSON.parse(localStorage.getItem(this.stateKey) || '{}') || {}; }
    catch (e) { return {}; }
  },
  saveState(s) {
    try { localStorage.setItem(this.stateKey, JSON.stringify(s)); } catch (e) { }
  },
  /** 오늘 이미 공식 기록을 냈는가 */
  done(day) {
    const s = this.loadState();
    return !!s[day || this.today()];
  },
  best(day) {
    const s = this.loadState();
    return s[day || this.today()] || null;
  },
  record(wave, kills) {
    const d = this.today();
    const s = this.loadState();
    if (!s[d] || wave > s[d].wave) s[d] = { wave, kills, at: Date.now() };
    this.saveState(s);
  },

  /* --------------------------------------------------------- 실행 */
  active: null,

  /** 오늘의 도전을 시작한다. practice=true 면 기록을 남기지 않는다 */
  start(practice) {
    const c = this.build();
    this.active = { cfg: c, practice: !!practice };

    Game.clearRun();
    Game.difficulty = c.diff;
    Game.resetRun(c.map);

    /* 규칙 적용 — 적 쪽 배수는 기존 모디파이어 배관을 그대로 탄다 */
    for (const r of c.rules) {
      if (r.m) Game.runMods.push(Object.assign({}, r.m));
      if (r.life != null) Game.dailyLife = r.life;
      if (r.lifeMul) Game.dailyLifeMul = r.lifeMul;
      if (r.gold0) Game.gold = Math.round(Game.gold * r.gold0);
      if (r.dmg) Game.bless.dmg += r.dmg;
      if (r.luck) Game.bless.luck += r.luck;
      if (r.costMul) Game.dailyCostMul = r.costMul;
      if (r.blessEvery && window.Bless) Bless.EVERY = r.blessEvery;
      if (r.m && r.m.count) Game.dailyCountMul = r.m.count;
    }
    Game.refreshAll();          /* 목숨 규칙은 refreshAll 안에서 마지막에 적용된다 */
    Game.life = Game.maxLife;
    if (window.UI) UI.refresh();
    return this.active;
  },

  /** 도전 중인가 */
  running() { return !!this.active && Game.state === 'playing'; },

  /** 판이 끝났을 때 — 기록과 랭킹 제출 */
  finish() {
    const a = this.active;
    this.active = null;
    if (window.Bless) Bless.EVERY = 3;          /* 규칙으로 바꾼 값 원복 */
    Game.dailyCostMul = 1; Game.dailyCountMul = 1;
    Game.dailyLife = null; Game.dailyLifeMul = 0;
    if (!a || a.practice) return null;
    const wave = Game.wave + Game.loop * 100;
    this.record(wave, Game.stats.kills);
    if (window.Leaderboard) {
      const rec = Leaderboard.buildRecord();
      rec.map = 'daily:' + a.cfg.day;
      rec.mapName = '일일 도전 ' + a.cfg.day;
      rec.diff = a.cfg.diff;
      Leaderboard.submit(rec).catch(() => { });
    }
    return { wave, day: a.cfg.day };
  },
};

window.Daily = Daily;
window.DAILY_RULES = DAILY_RULES;
window.seedRng = seedRng;
