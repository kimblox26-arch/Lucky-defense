/* =============================================================================
 *  축복 (Blessing) — 웨이브를 넘길 때마다 3장 중 1장을 고르는 로그라이크 드래프트
 *
 *  이 게임에서 가장 큰 재미는 "이번 판은 어떤 판이 될까" 다.
 *  연구·특성은 판을 넘어 쌓이는 고정 성장이라 매 판이 똑같아진다.
 *  축복은 반대로 그 판에서만 유효하고, 뽑히는 조합이 매번 달라서
 *  같은 맵을 돌아도 매번 다른 빌드가 나온다.
 *
 *  효과는 두 갈래로 들어간다.
 *    - Game.bless.*  : 아군 스탯 가산치 (entities.js refresh 에서 읽는다)
 *    - Game.runMods  : 적 쪽 배수 (기존 맵 모디파이어 배관을 그대로 탄다)
 * ========================================================================== */
'use strict';

/** 축복 등급 — 뽑힐 가중치와 카드 색 */
const BLESS_TIER = {
  common:    { n: '일반',   w: 100, col: '#8fa8cc', glow: 'rgba(143,168,204,.5)' },
  rare:      { n: '희귀',   w: 46,  col: '#4ea8ff', glow: 'rgba(78,168,255,.6)' },
  epic:      { n: '영웅',   w: 17,  col: '#c48fff', glow: 'rgba(196,143,255,.65)' },
  legendary: { n: '전설',   w: 5,   col: '#ffd24d', glow: 'rgba(255,210,77,.75)' },
};

/**
 * 축복 목록.
 *   max  : 한 판에 몇 번까지 겹쳐 먹을 수 있는가 (없으면 1회)
 *   need : 등장 조건 (웨이브 등)
 *   fn   : 즉시 실행형 효과 (스탯이 아닌 것)
 */
const BLESSINGS = [
  /* ---------------------------------------------------------------- 공격 */
  { k: 'edge',    n: '예리한 칼날',   i: '🗡', t: 'common', max: 6, d: '모든 유닛 공격력 +15%',      b: { dmg: .15 } },
  { k: 'frenzy',  n: '광폭화',       i: '💢', t: 'common', max: 6, d: '모든 유닛 공격속도 +12%',    b: { spd: .12 } },
  { k: 'scope',   n: '망원 조준',     i: '🔭', t: 'common', max: 4, d: '모든 유닛 사거리 +12%',      b: { rng: .12 } },
  { k: 'vital',   n: '급소 노리기',   i: '🎯', t: 'rare',   max: 4, d: '치명타 확률 +8%',            b: { crit: .08 } },
  { k: 'brutal',  n: '잔혹한 일격',   i: '💥', t: 'rare',   max: 4, d: '치명타 피해 +45%',           b: { critdmg: .45 } },
  { k: 'sunder',  n: '갑옷 파쇄',     i: '🪓', t: 'rare',   max: 3, d: '방어 관통 +12%',             b: { pen: .12 } },
  { k: 'burst',   n: '폭발 탄두',     i: '🧨', t: 'rare',   max: 3, d: '광역 피해 범위 +35%',        b: { splash: .35 } },
  { k: 'arc',     n: '연쇄 번개',     i: '⚡', t: 'epic',   max: 2, d: '모든 공격이 1명 더 튕긴다',   b: { chain: 1 } },
  { k: 'twin',    n: '이중 사격',     i: '🏹', t: 'epic',   max: 2, d: '모든 유닛 다중 사격 +1',      b: { multishot: 1 } },
  { k: 'exec',    n: '처형인',       i: '☠', t: 'epic',   max: 3, d: '체력 10% 이하 적 즉사 확률 +10%', b: { execute: .10 } },

  /* ---------------------------------------------------------------- 경제 */
  { k: 'midas',   n: '황금 손',      i: '🪙', t: 'common', max: 6, d: '골드 획득 +20%',              b: { gold: .20 } },
  { k: 'compound', n: '복리 이자',   i: '🏦', t: 'rare',   max: 3, d: '웨이브 정산 이자 +4%',        b: { interest: .04 } },
  { k: 'loot',    n: '전리품',       i: '💰', t: 'rare',   max: 3, d: '적 처치 시 8% 확률로 보너스 골드', b: { loot: .08 } },
  { k: 'bargain', n: '떨이 흥정',     i: '🏷', t: 'rare',   max: 4, d: '소환 비용 -12%',              b: { cost: .12 } },
  { k: 'ticket',  n: '무료 소환권',   i: '🎫', t: 'common', max: 9, d: '즉시 무료 소환 5회',
    fn(g) { g.freeSummons = (g.freeSummons || 0) + 5; } },
  { k: 'gemvein', n: '젬 광맥',      i: '💎', t: 'epic',   max: 3, d: '웨이브를 넘길 때마다 젬 +1',   b: { gemwave: 1 } },

  /* ---------------------------------------------------------------- 생존 */
  { k: 'rampart', n: '성벽 보강',     i: '🧱', t: 'common', max: 5, d: '최대 목숨 +5 (즉시 회복)',
    b: { life: 5 }, fn(g) { g.life = Math.min(g.maxLife + 5, g.life + 5); } },
  { k: 'mend',    n: '재생의 기도',   i: '💚', t: 'rare',   max: 3, d: '웨이브를 넘길 때마다 목숨 +1', b: { liferegen: 1 } },
  { k: 'ward',    n: '지연의 결계',   i: '🕸', t: 'rare',   max: 3, d: '적 이동속도 -8%',            m: { spdMul: .92 } },
  { k: 'wither',  n: '쇠약의 저주',   i: '🥀', t: 'epic',   max: 3, d: '적 체력 -10%',               m: { hpMul: .90 } },
  { k: 'phoenix', n: '불사조의 깃',   i: '🔥', t: 'legendary',      d: '목숨이 다해도 1회 부활한다 (목숨 10 회복)',
    b: { revive: 1 } },

  /* ------------------------------------------------------------ 소환·운 */
  { k: 'star',    n: '행운의 별',     i: '⭐', t: 'common', max: 5, d: '뽑기 행운 +12%',              b: { luck: .12 } },
  { k: 'slots',   n: '진영 확장',     i: '📐', t: 'common', max: 4, d: '유닛 배치 칸 +3',            b: { slot: 3 } },
  { k: 'awaken',  n: '각성',         i: '✨', t: 'rare',   max: 4, d: '무작위 유닛 1기의 성급 +1',
    fn(g) {
      const c = g.units.filter(u => u.star < 5);
      if (!c.length) { g.addGold(1500); return; }
      const u = U.pick(c); u.star++; u.refresh();
      FX.popText(u.px, u.py - g.ts * .6, '★ 각성!', '#ffd24d', 20, { life: 1.2, vy: -30 });
      if (window.VFX) VFX.confetti(u.px, u.py, '#ffd24d', 26);
    } },
  { k: 'callhero', n: '천상의 부름',  i: '👑', t: 'epic',   max: 3, d: '즉시 영웅 등급 이상 유닛 1기 소환',
    fn(g) { g.summon({ minRarity: 3, free: true }); } },
  { k: 'legion',  n: '군단 소집',     i: '⚔', t: 'legendary',      d: '배치 칸 +8 · 공격력 +12%',
    b: { slot: 8, dmg: .12 } },

  /* ---------------------------------------------------------------- 스킬 */
  { k: 'spring',  n: '마나의 샘',     i: '🌀', t: 'common', max: 5, d: '마나 회복 +25%',             m: { manaMul: 1.25 } },
  { k: 'haste',   n: '신속한 재시전', i: '⏱', t: 'rare',   max: 3, d: '스킬 쿨다운 -15%',           b: { skillcd: .15 } },
  { k: 'arcane',  n: '대마법 연구',   i: '📜', t: 'rare',   max: 4, d: '스킬 피해 +30%',             b: { skilldmg: .30 } },
  { k: 'echo',    n: '메아리 시전',   i: '🔁', t: 'epic',   max: 2, d: '스킬 사용 시 25% 확률로 즉시 재사용 가능', b: { echo: .25 } },
  { k: 'chrono',  n: '시간의 지배자', i: '⌛', t: 'legendary',      d: '모든 스킬 쿨다운 -40% · 마나 회복 +40%',
    b: { skillcd: .40 }, m: { manaMul: 1.4 } },

  /* ------------------------------------------------------- 위험한 계약 */
  { k: 'pact',    n: '악마의 계약',   i: '😈', t: 'rare',   max: 3, d: '공격력 +45% — 대신 최대 목숨 -6',
    risk: 1, b: { dmg: .45, life: -6 }, fn(g) { g.life = Math.max(1, g.life - 6); } },
  { k: 'glass',   n: '유리 대포',     i: '🔮', t: 'legendary', d: '공격력 +90% — 대신 목숨이 5로 고정된다',
    risk: 1, b: { dmg: .90 }, need: g => g.life > 5,
    fn(g) { g.glassCannon = true; g.life = Math.min(g.life, 5); } },
  { k: 'toll',    n: '피의 대가',     i: '🩸', t: 'rare',   max: 3, d: '골드 +60% — 대신 적 체력 +18%',
    risk: 1, b: { gold: .60 }, m: { hpMul: 1.18 } },
  { k: 'overrun', n: '폭주 기관',     i: '🚂', t: 'rare',   max: 3, d: '공격속도 +40% — 대신 사거리 -18%',
    risk: 1, b: { spd: .40, rng: -.18 } },
  { k: 'rush',    n: '가속 침공',     i: '🌪', t: 'epic',   max: 2, d: '골드 +45% — 대신 적 이동속도 +12%',
    risk: 1, b: { gold: .45 }, m: { spdMul: 1.12 } },

  /* ---------------------------------------------------------------- 전설 */
  { k: 'gilded',  n: '황금기',       i: '🏆', t: 'legendary', d: '골드 획득 +100%', b: { gold: 1.0 } },
  { k: 'ascend',  n: '별의 축복',     i: '🌟', t: 'legendary', d: '3성 이하 유닛 전부 성급 +1',
    fn(g) {
      let n = 0;
      for (const u of g.units) if (u.star <= 3) { u.star++; n++; }
      g.refreshAll();
      if (window.UI) UI.toast(`🌟 ${n}기 각성!`, '#ffd24d');
    } },
  { k: 'apex',    n: '정점',         i: '💠', t: 'legendary', d: '공격력 +25% · 치명타 +15% · 관통 +15%',
    b: { dmg: .25, crit: .15, pen: .15 } },
];

const BLESS_MAP = {};
for (const b of BLESSINGS) BLESS_MAP[b.k] = b;

/* ========================================================================== */
const Bless = {
  /** 몇 웨이브마다 고르게 할지 */
  EVERY: 3,
  open: false,
  offer: [],
  rerolls: 0,

  reset() {
    this.open = false; this.offer = []; this.rerolls = 1;
    const el = document.getElementById('blessWrap');
    if (el) el.classList.add('hidden');
  },

  /** 이번 웨이브를 넘길 때 드래프트를 열어야 하는가 */
  due(wave) { return wave > 0 && wave % this.EVERY === 0; },

  /** 지금 뽑을 수 있는 축복인가 (횟수 상한 · 조건) */
  eligible(b, g) {
    const have = g.bless.taken[b.k] || 0;
    if (have >= (b.max || 1)) return false;
    if (b.need && !b.need(g)) return false;
    return true;
  },

  /** 3장 뽑기 — 웨이브가 깊을수록 상위 등급이 잘 나온다 */
  roll(g, n) {
    const pool = BLESSINGS.filter(b => this.eligible(b, g));
    const depth = Math.min(1.6, g.wave / 40);          /* 후반 보정 */
    const out = [];
    const used = {};
    for (let i = 0; i < (n || 3) && pool.length; i++) {
      const list = pool.filter(b => !used[b.k]).map(b => {
        const t = BLESS_TIER[b.t];
        const rank = b.t === 'legendary' ? 3 : b.t === 'epic' ? 2 : b.t === 'rare' ? 1 : 0;
        return { b, w: t.w * (1 + depth * rank * .9) };
      });
      if (!list.length) break;
      const pick = U.weighted(list).b;
      used[pick.k] = 1;
      out.push(pick);
    }
    return out;
  },

  /* ----------------------------------------------------------------- 화면 */
  show(g) {
    this.offer = this.roll(g, 3);
    if (!this.offer.length) return false;
    this.open = true;
    g.paused = true;
    this.render(g);
    document.getElementById('blessWrap').classList.remove('hidden');
    SFX.play('levelup');
    return true;
  },

  render(g) {
    const wrap = document.getElementById('blessWrap');
    const cards = this.offer.map((b, i) => {
      const t = BLESS_TIER[b.t];
      const have = g.bless.taken[b.k] || 0;
      const stack = have > 0 ? `<i class="bl-stk">보유 ${have}${(b.max || 1) > 1 ? ' / ' + b.max : ''}</i>`
        : (b.max || 1) > 1 ? `<i class="bl-stk">최대 ${b.max}회</i>` : '';
      return `<button class="bl-card${b.risk ? ' risk' : ''}" data-i="${i}"
        style="--c:${t.col};--g:${t.glow};animation-delay:${i * .09}s">
        <span class="bl-tier">${t.n}${b.risk ? ' · 계약' : ''}</span>
        <span class="bl-ico">${b.i}</span>
        <span class="bl-n">${b.n}</span>
        <span class="bl-d">${b.d}</span>${stack}
      </button>`;
    }).join('');
    wrap.innerHTML = `
      <div class="bl-box">
        <div class="bl-head">
          <span class="bl-w">WAVE ${g.wave} 돌파</span>
          <h2>축복을 하나 고르시오</h2>
          <p>이번 판이 끝날 때까지 유지된다</p>
        </div>
        <div class="bl-cards">${cards}</div>
        <div class="bl-foot">
          <button class="bl-reroll${this.rerolls > 0 ? '' : ' dis'}" id="blReroll">
            🎲 다시 뽑기 ${this.rerolls > 0 ? `(${this.rerolls}회 남음)` : `— 젬 ${this.rerollCost()}개`}
          </button>
          <button class="bl-skip" id="blSkip">건너뛰고 골드 받기</button>
        </div>
      </div>`;

    wrap.querySelectorAll('.bl-card').forEach(el => {
      el.onclick = () => this.take(g, this.offer[+el.dataset.i], el);
    });
    document.getElementById('blReroll').onclick = () => this.reroll(g);
    document.getElementById('blSkip').onclick = () => {
      const gold = Math.floor(300 + g.wave * 60);
      g.addGold(gold);
      if (window.UI) UI.toast(`축복 대신 +${U.fmt(gold)}G`, '#ffd24d');
      this.close(g);
    };
  },

  rerollCost() { return 8; },

  reroll(g) {
    if (this.rerolls > 0) this.rerolls--;
    else if (g.gems >= this.rerollCost()) { g.gems -= this.rerollCost(); g.saveMeta(); }
    else { SFX.play('error'); if (window.UI) UI.toast('젬이 부족하다', '#ff6b6b'); return; }
    SFX.play('click');
    this.offer = this.roll(g, 3);
    this.render(g);
  },

  /** 고른 축복을 적용한다 */
  take(g, b, el) {
    if (!this.open) return;
    this.open = false;
    if (el) el.classList.add('picked');
    g.bless.taken[b.k] = (g.bless.taken[b.k] || 0) + 1;
    g.bless.order.push(b.k);

    if (b.b) for (const k in b.b) g.bless[k] = (g.bless[k] || 0) + b.b[k];
    if (b.m) g.runMods.push(Object.assign({}, b.m));
    if (b.fn) b.fn(g);

    g.refreshAll();
    const t = BLESS_TIER[b.t];
    SFX.play(b.t === 'legendary' ? 'jackpot' : b.t === 'epic' ? 'rare' : 'buy');
    if (window.VFX) VFX.confetti(g.W / 2, g.H * .42, t.col, b.t === 'legendary' ? 90 : 40);
    FX.popText(g.W / 2, g.H * .42, b.i + ' ' + b.n, t.col, 30, { life: 1.6, vy: -34 });
    if (window.UI) UI.toast(`${b.i} ${b.n} 획득!`, t.col);

    setTimeout(() => this.close(g), 340);
  },

  close(g) {
    this.open = false;
    document.getElementById('blessWrap').classList.add('hidden');
    g.paused = !!this.wasPaused;
    this.wasPaused = false;
    if (window.UI) { UI.refresh(); UI.refreshBlessStrip(); }
  },

  /** 지금까지 먹은 축복을 요약해 돌려준다 (HUD 띠 / 결과창용) */
  summary(g) {
    const out = [];
    for (const k of Object.keys(g.bless.taken)) {
      const b = BLESS_MAP[k];
      if (b) out.push({ b, n: g.bless.taken[k] });
    }
    return out;
  },
};

window.Bless = Bless;
window.BLESSINGS = BLESSINGS;
window.BLESS_MAP = BLESS_MAP;
window.BLESS_TIER = BLESS_TIER;
