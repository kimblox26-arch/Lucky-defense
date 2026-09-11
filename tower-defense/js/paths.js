/* =============================================================================
 *  유닛 업그레이드 분기 경로 (Upgrade Paths)
 *
 *  기존 "강화"는 레벨을 올려 전 스탯을 조금씩 밀어 올리는 단일 축이라,
 *  어떤 유닛이든 강화할수록 똑같아졌다. 분기 경로는 같은 유닛이라도
 *  무엇에 투자했느냐에 따라 다른 물건이 되게 한다.
 *
 *  규칙 (타워디펜스의 고전적인 제약을 그대로 쓴다)
 *    · 경로는 3갈래, 각 4티어.
 *    · 한 경로만 끝(4티어)까지 갈 수 있고,
 *      두 번째 경로는 2티어까지만, 세 번째는 아예 못 탄다.
 *      → "무엇을 포기할 것인가" 가 매번 선택이 된다.
 *    · 4티어는 스탯이 아니라 고유 능력을 준다.
 *
 *  효과는 Unit.pathBonus() 로 합산되어 entities.js refresh 에서 읽힌다.
 * ========================================================================== */
'use strict';

const PATHS = [
  {
    key: 'power', n: '파괴', i: '⚔', col: '#ff6b4d',
    desc: '한 방의 무게에 모든 것을 건다',
    tiers: [
      { n: '벼린 날', d: '공격력 +30%', cost: 1.0, b: { dmg: .30 } },
      { n: '분쇄', d: '공격력 +35% · 방어 관통 +10%', cost: 1.9, b: { dmg: .35, pen: .10 } },
      { n: '치명', d: '공격력 +40% · 치명타 피해 +80%', cost: 3.4, b: { dmg: .40, critdmg: .80 } },
      {
        n: '일격필살', d: '치명타가 터질 때 주변까지 함께 터진다 (광역 +120%)',
        cost: 6.2, b: { dmg: .45, splash: 1.2 }, flag: 'critBlast',
      },
    ],
  },
  {
    key: 'rapid', n: '속사', i: '🏹', col: '#7fd8ff',
    desc: '쉬지 않고 쏟아붓는다',
    tiers: [
      { n: '속사 훈련', d: '공격속도 +28%', cost: 1.0, b: { spd: .28 } },
      { n: '연사 장치', d: '공격속도 +30% · 치명타 +6%', cost: 1.9, b: { spd: .30, crit: .06 } },
      { n: '쌍발', d: '다중 사격 +1 · 공격속도 +20%', cost: 3.4, b: { multishot: 1, spd: .20 } },
      {
        n: '탄막', d: '다중 사격 +2 · 공격이 1명 더 튕긴다',
        cost: 6.2, b: { multishot: 2, chain: 1, spd: .25 }, flag: 'barrage',
      },
    ],
  },
  {
    key: 'precision', n: '정밀', i: '🎯', col: '#c48fff',
    desc: '멀리서, 정확하게, 급소만',
    tiers: [
      { n: '장거리 조준', d: '사거리 +25%', cost: 1.0, b: { rng: .25 } },
      { n: '약점 간파', d: '방어 관통 +15% · 치명타 +8%', cost: 1.9, b: { pen: .15, crit: .08 } },
      { n: '급소 사격', d: '처형 +8% · 치명타 피해 +60%', cost: 3.4, b: { execute: .08, critdmg: .60 } },
      {
        n: '저격', d: '보스에게 주는 피해 +60% · 처형 +12%',
        cost: 6.2, b: { execute: .12, rng: .25, crit: .10 }, flag: 'sniper',
      },
    ],
  },
];

const PATH_MAP = {};
for (const p of PATHS) PATH_MAP[p.key] = p;

const Path = {
  /** 한 경로를 끝까지 (4티어), 두 번째는 2티어까지, 세 번째는 0 */
  MAIN_MAX: 4,
  SUB_MAX: 2,

  /** 이 유닛의 경로 상태 (없으면 만들어 준다) */
  state(u) {
    if (!u.paths) u.paths = { power: 0, rapid: 0, precision: 0 };
    return u.paths;
  },

  /**
   * 지금 이 경로를 한 단계 더 올릴 수 있는가.
   * 반환 {ok, tier, cost, reason}
   */
  canBuy(u, key, g) {
    const st = this.state(u);
    const cur = st[key] || 0;
    const p = PATH_MAP[key];
    if (!p) return { ok: false, reason: '없는 경로' };
    if (cur >= p.tiers.length) return { ok: false, tier: cur, reason: 'MAX' };

    /* 이미 투자한 다른 경로들 */
    const others = PATHS.filter(x => x.key !== key).map(x => st[x.key] || 0);
    const investedOthers = others.filter(v => v > 0).length;
    const maxOther = Math.max(0, ...others);

    /* 세 번째 경로는 못 탄다 */
    if (cur === 0 && investedOthers >= 2)
      return { ok: false, tier: cur, reason: '경로는 둘까지만 탈 수 있다' };

    /* 이 경로를 3티어 이상으로 올리려면, 다른 경로가 2티어를 넘으면 안 된다 */
    if (cur + 1 > this.SUB_MAX && maxOther > this.SUB_MAX)
      return { ok: false, tier: cur, reason: '주력 경로는 하나뿐이다' };

    /* 반대로, 다른 경로가 이미 주력(3티어 이상)이면 여기는 2티어까지 */
    if (cur + 1 > this.SUB_MAX && maxOther >= 3)
      return { ok: false, tier: cur, reason: '이 경로는 2티어까지다' };

    const cost = this.cost(u, key, cur, g);
    return { ok: g.gold >= cost, tier: cur, cost, reason: g.gold >= cost ? '' : '골드 부족' };
  },

  /** 다음 티어 비용 — 등급·성급이 높을수록 비싸다 */
  cost(u, key, cur, g) {
    const p = PATH_MAP[key];
    const t = p.tiers[cur];
    if (!t) return Infinity;
    const rar = RARITY[RARITY_IDX[u.def.rarity]];
    const base = 90 + rar.sell * 1.35;
    const waveMul = Math.pow(1.055, (g ? g.wave : 1) - 1);
    return Math.floor(base * t.cost * (1 + (u.star - 1) * .7) * waveMul);
  },

  /** 구매 */
  buy(u, key, g) {
    const chk = this.canBuy(u, key, g);
    if (!chk.ok) {
      SFX.play('error');
      if (window.UI && chk.reason) UI.toast(chk.reason, '#ff6b6b');
      return false;
    }
    if (!g.spendGold(chk.cost)) return false;
    const st = this.state(u);
    st[key] = (st[key] || 0) + 1;
    u.invested += chk.cost;
    u.refresh();
    u.buffFlash = 1;

    const p = PATH_MAP[key], t = p.tiers[st[key] - 1];
    FX.ring(u.px, u.py, p.col, g.ts * 1.1, .4);
    VFX.castRing(u.px, u.py, p.col, st[key]);
    FX.popText(u.px, u.py - g.ts * .8, p.i + ' ' + t.n, p.col, 17 + st[key] * 2,
      { life: 1.2, big: st[key] >= 3 });
    FX.impact(u.px, u.py, p.col, .2 + st[key] * .12);
    SFX.play(st[key] >= 4 ? 'legendary' : st[key] >= 3 ? 'rare' : 'upgrade');
    if (st[key] >= 4 && window.UI) UI.toast(`${p.i} ${t.n} 개방!`, p.col);
    if (window.UI) UI.refresh();
    return true;
  },

  /** 경로가 주는 스탯 가산치 합계 */
  bonus(u) {
    const out = { dmg: 0, spd: 0, rng: 0, crit: 0, critdmg: 0, pen: 0, splash: 0, chain: 0, multishot: 0, execute: 0 };
    const st = u.paths;
    if (!st) return out;
    for (const p of PATHS) {
      const lv = st[p.key] || 0;
      for (let i = 0; i < lv; i++) {
        const b = p.tiers[i].b;
        for (const k in b) out[k] = (out[k] || 0) + b[k];
      }
    }
    return out;
  },

  /** 4티어 고유 능력을 가지고 있는가 */
  hasFlag(u, flag) {
    const st = u.paths;
    if (!st) return false;
    for (const p of PATHS) {
      if ((st[p.key] || 0) >= p.tiers.length && p.tiers[p.tiers.length - 1].flag === flag) return true;
    }
    return false;
  },

  /** 투자한 총 티어 수 (표시용) */
  total(u) {
    const st = u.paths;
    if (!st) return 0;
    return PATHS.reduce((a, p) => a + (st[p.key] || 0), 0);
  },

  /** 요약 문자열 — "⚔4 · 🏹2" */
  summary(u) {
    const st = u.paths;
    if (!st) return '';
    return PATHS.filter(p => (st[p.key] || 0) > 0)
      .map(p => `${p.i}${st[p.key]}`).join(' · ');
  },
};

window.PATHS = PATHS;
window.PATH_MAP = PATH_MAP;
window.Path = Path;
