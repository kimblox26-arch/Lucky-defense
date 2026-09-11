/* =============================================================================
 *  도감 수집 보너스
 *
 *  유닛이 404종인데 도감을 다 채워도 숫자만 올라갈 뿐 아무 일도 없었다.
 *  "모으면 세진다" 가 있어야 도감을 채울 이유가 생긴다.
 *
 *  두 갈래로 준다.
 *    · 등급별 수집률 — 해당 등급을 N종 모을 때마다 영구 보너스
 *    · 전체 이정표   — 총 수집 수가 문턱을 넘을 때 큰 보너스 + 젬
 *
 *  모두 계정에 귀속되는 영구 성장이라, 판을 넘겨 쌓인다.
 * ========================================================================== */
'use strict';

const Collection = {
  /** 등급별 보너스 : 그 등급을 step 종 모을 때마다 아래 수치가 붙는다 */
  PER_RARITY: {
    common: { step: 8, dmg: .010, label: '공격력' },
    uncommon: { step: 8, dmg: .012, label: '공격력' },
    rare: { step: 8, spd: .010, label: '공격속도' },
    epic: { step: 8, crit: .004, label: '치명타' },
    legendary: { step: 6, dmg: .022, label: '공격력' },
    mythic: { step: 6, gold: .020, label: '골드' },
    ultimate: { step: 5, luck: .015, label: '행운' },
    primordial: { step: 4, dmg: .040, label: '공격력' },
  },

  /** 전체 수집 이정표 */
  MILESTONES: [
    { n: 20, gem: 10, b: { dmg: .03 }, d: '공격력 +3%' },
    { n: 50, gem: 20, b: { gold: .05 }, d: '골드 +5%' },
    { n: 100, gem: 40, b: { dmg: .05, spd: .03 }, d: '공격력 +5% · 공속 +3%' },
    { n: 150, gem: 60, b: { luck: .05 }, d: '행운 +5%' },
    { n: 200, gem: 90, b: { dmg: .08, crit: .02 }, d: '공격력 +8% · 치명타 +2%' },
    { n: 260, gem: 130, b: { gold: .12, spd: .05 }, d: '골드 +12% · 공속 +5%' },
    { n: 320, gem: 200, b: { dmg: .12, luck: .08 }, d: '공격력 +12% · 행운 +8%' },
    { n: 404, gem: 400, b: { dmg: .20, spd: .10, crit: .05, gold: .20, luck: .10 }, d: '전 항목 대폭 상승 — 완전 수집' },
  ],

  /** 등급별 {수집, 전체} */
  counts(g) {
    const found = (g || Game).collection || {};
    const out = {};
    for (const r of RARITY) out[r.key] = { n: 0, t: 0 };
    for (const u of UNITS) {
      const k = u.rarity;
      if (!out[k]) out[k] = { n: 0, t: 0 };
      out[k].t++;
      if (found[u.key]) out[k].n++;
    }
    return out;
  },

  total(g) { return Object.keys(((g || Game).collection) || {}).length; },

  /**
   * 지금까지 모은 것이 주는 보너스 합계.
   * refreshAll 에서 한 번 계산해 Game.collBonus 에 담아 둔다.
   */
  bonus(g) {
    const out = { dmg: 0, spd: 0, crit: 0, gold: 0, luck: 0 };
    const c = this.counts(g);
    for (const key in this.PER_RARITY) {
      const def = this.PER_RARITY[key];
      const got = c[key] ? c[key].n : 0;
      const steps = Math.floor(got / def.step);
      if (!steps) continue;
      for (const k in def) {
        if (k === 'step' || k === 'label') continue;
        out[k] = (out[k] || 0) + def[k] * steps;
      }
    }
    const tot = this.total(g);
    for (const m of this.MILESTONES) {
      if (tot < m.n) break;
      for (const k in m.b) out[k] = (out[k] || 0) + m.b[k];
    }
    return out;
  },

  /**
   * 새로 넘긴 이정표가 있으면 젬을 지급한다.
   * collect() 가 새 유닛을 등록할 때마다 호출된다.
   */
  checkMilestones(g) {
    const G = g || Game;
    if (!G.collMile) G.collMile = {};
    const tot = this.total(G);
    let gained = 0;
    for (const m of this.MILESTONES) {
      if (tot >= m.n && !G.collMile[m.n]) {
        G.collMile[m.n] = 1;
        G.gems += m.gem;
        gained += m.gem;
        if (window.UI) {
          UI.toast(`📖 도감 ${m.n}종 달성 — 💎 +${m.gem}`, '#ffd24d');
          FX.popText(G.W / 2, G.H * .34, `도감 ${m.n}종!`, '#ffd24d', 28, { life: 1.6, vy: -30, big: true });
          if (window.VFX) VFX.confetti(G.W / 2, G.H * .38, '#ffd24d', 60);
          FX.impact(G.W / 2, G.H * .38, '#ffd24d', .7);
        }
        SFX.play('unlock');
      }
    }
    if (gained) G.saveMeta();
    return gained;
  },

  /** 다음 이정표까지 얼마나 남았나 */
  nextMilestone(g) {
    const tot = this.total(g);
    return this.MILESTONES.find(m => tot < m.n) || null;
  },

  /** 다음 등급 보너스까지 몇 종 남았나 */
  nextStep(key, g) {
    const def = this.PER_RARITY[key];
    if (!def) return null;
    const c = this.counts(g)[key];
    if (!c || c.n >= c.t) return null;
    const need = def.step - (c.n % def.step);
    return { need, of: def.step };
  },
};

window.Collection = Collection;
