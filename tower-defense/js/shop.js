/* =============================================================================
 *  전투 중 상점
 *
 *  골드를 쓸 곳이 소환·강화뿐이라, 후반에 돈이 남아도 쓸 데가 없었다.
 *  상점은 "지금 이 골드를 무엇으로 바꿀까" 를 한 겹 더 만든다.
 *
 *    · 웨이브를 넘길 때마다 매물 4개가 새로 깔린다
 *    · 재고는 1개씩 — 망설이면 다음 웨이브에 사라진다
 *    · 새로고침은 골드를 내고, 값은 누를수록 오른다
 * ========================================================================== */
'use strict';

const SHOP_ITEMS = [
  /* ---------------------------------------------------------- 즉시 효과 */
  {
    k: 'heal', n: '응급 수리', i: '💚', col: '#7cff9c', w: 22,
    d: '목숨 3 회복', cost: 1.0,
    can: g => g.life < g.maxLife,
    buy(g) {
      g.life = Math.min(g.maxLife, g.life + 3);
      FX.popText(g.endX, g.endY - g.ts, '♥ +3', '#7cff9c', 22, { life: 1.2, vy: -30, big: true });
    },
  },
  {
    k: 'mana', n: '마나 정수', i: '🔷', col: '#7fd8ff', w: 20,
    d: '마나를 가득 채운다', cost: .7,
    can: g => g.mana < g.maxMana * .9,
    buy(g) { g.mana = g.maxMana; },
  },
  {
    k: 'cdreset', n: '시간 되감기', i: '⏪', col: '#c48fff', w: 12,
    d: '모든 스킬 쿨다운 초기화', cost: 1.3,
    can: g => Object.keys(g.skillCd).some(k => g.skillCd[k] > 0),
    buy(g) { for (const k in g.skillCd) g.skillCd[k] = 0; },
  },

  /* ---------------------------------------------------------- 소환 */
  {
    k: 'sum_rare', n: '희귀 확정 소환', i: '🎫', col: '#4ea8ff', w: 18,
    d: '희귀 이상 유닛 1기', cost: 2.2,
    can: g => g.units.length < g.slotMax(),
    buy(g) { g.summon({ minRarity: 2, free: true }); },
  },
  {
    k: 'sum_epic', n: '영웅 확정 소환', i: '👑', col: '#c48fff', w: 9,
    d: '영웅 이상 유닛 1기', cost: 5.0,
    can: g => g.units.length < g.slotMax(),
    buy(g) { g.summon({ minRarity: 3, free: true }); },
  },
  {
    k: 'sum_leg', n: '전설 확정 소환', i: '🌟', col: '#ffd24d', w: 3,
    d: '전설 이상 유닛 1기', cost: 12.0, minWave: 12,
    can: g => g.units.length < g.slotMax(),
    buy(g) { g.summon({ minRarity: 4, free: true }); },
  },

  /* ---------------------------------------------------------- 유닛 강화 */
  {
    k: 'star', n: '성급 각인', i: '⭐', col: '#ffd24d', w: 10,
    d: '무작위 유닛 1기의 성급 +1', cost: 4.0,
    can: g => g.units.some(u => u.star < 5),
    buy(g) {
      const c = g.units.filter(u => u.star < 5);
      const u = U.pick(c);
      u.star++; g.refreshAll();
      FX.popText(u.px, u.py - g.ts * .7, '★ 각인!', '#ffd24d', 20, { life: 1.2, vy: -28, big: true });
      if (window.VFX) VFX.jackpot(u.px, u.py, 3, '#ffd24d', g);
    },
  },
  {
    k: 'pathfree', n: '설계도', i: '📐', col: '#7fd8ff', w: 11,
    d: '무작위 유닛 1기의 경로를 한 단계 무료로 올린다', cost: 3.2,
    can: g => !!window.Path && g.units.length > 0,
    buy(g) {
      /* 지금 올릴 수 있는 (유닛, 경로) 조합 중 하나 */
      const opts = [];
      for (const u of g.units) {
        for (const p of PATHS) {
          const c = Path.canBuy(u, p.key, { gold: Infinity, wave: g.wave, spendGold: () => true });
          if (c.tier != null && c.reason !== 'MAX' && !c.reason) opts.push([u, p.key]);
        }
      }
      if (!opts.length) { g.addGold(600); return; }
      const [u, key] = U.pick(opts);
      const st = Path.state(u);
      st[key] = (st[key] || 0) + 1;
      u.refresh(); u.buffFlash = 1;
      const p = PATH_MAP[key];
      VFX.castRing(u.px, u.py, p.col, st[key]);
      FX.popText(u.px, u.py - g.ts * .7, p.i + ' ' + p.tiers[st[key] - 1].n, p.col, 17, { life: 1.2 });
    },
  },

  /* ---------------------------------------------------------- 임시 버프 */
  {
    k: 'rage', n: '전투 각성제', i: '💢', col: '#ff6b4d', w: 16,
    d: '다음 3웨이브 동안 공격력 +35%', cost: 2.0,
    buy(g) { g.shopBuff = g.shopBuff || {}; g.shopBuff.dmg = { amt: .35, waves: 3 }; g.refreshAll(); },
  },
  {
    k: 'haste', n: '신속의 약', i: '💨', col: '#7fd8ff', w: 16,
    d: '다음 3웨이브 동안 공격속도 +30%', cost: 2.0,
    buy(g) { g.shopBuff = g.shopBuff || {}; g.shopBuff.spd = { amt: .30, waves: 3 }; g.refreshAll(); },
  },
  {
    k: 'slow', n: '끈끈이 덫', i: '🕸', col: '#b8f07a', w: 14,
    d: '다음 2웨이브 동안 적 이동속도 -25%', cost: 1.8,
    buy(g) { g.shopBuff = g.shopBuff || {}; g.shopBuff.enemySlow = { amt: .25, waves: 2 }; },
  },

  /* ---------------------------------------------------------- 경제 */
  {
    k: 'interest', n: '금고 계약', i: '🏦', col: '#ffd24d', w: 12,
    d: '이번 판 내내 웨이브 이자 +5%', cost: 3.0,
    buy(g) { g.bless.interest += .05; },
  },
  {
    k: 'gembag', n: '보석 주머니', i: '💎', col: '#7fd8ff', w: 7,
    d: '젬 +5 (계정에 남는다)', cost: 6.0,
    buy(g) { g.gems += 5; g.saveMeta(); },
  },
  {
    k: 'blesscard', n: '축복 한 장', i: '🃏', col: '#ff7ad0', w: 6,
    d: '축복을 지금 한 장 고른다', cost: 8.0, minWave: 6,
    can: g => !!window.Bless && !Bless.open,
    buy(g) { setTimeout(() => Bless.show(g), 120); },
  },
];

const Shop = {
  stock: [],
  rerolls: 0,
  open: false,

  reset() {
    this.stock = []; this.rerolls = 0; this.open = false;
    const el = document.getElementById('shopWrap');
    if (el) el.classList.add('hidden');
  },

  /** 매물 가격 — 웨이브가 깊을수록 비싸지만 소환 비용보다 완만하게 */
  price(item, g) {
    return Math.floor((70 + g.wave * 26) * item.cost * Math.pow(1.035, g.wave));
  },

  /** 재고를 새로 깐다 */
  restock(g) {
    const G = g || Game;
    const pool = SHOP_ITEMS.filter(it =>
      (!it.minWave || G.wave >= it.minWave) && (!it.can || it.can(G)));
    const picked = [];
    const used = {};
    for (let i = 0; i < 4 && pool.length; i++) {
      const list = pool.filter(it => !used[it.k]).map(it => ({ it, w: it.w }));
      if (!list.length) break;
      const it = U.weighted(list).it;
      used[it.k] = 1;
      picked.push({ k: it.k, cost: this.price(it, G), sold: false });
    }
    this.stock = picked;
    this.rerolls = 0;
    if (window.UI) UI.refreshShopDot();
  },

  rerollCost(g) {
    return Math.floor((40 + (g || Game).wave * 14) * Math.pow(1.7, this.rerolls));
  },
  reroll(g) {
    const G = g || Game;
    const c = this.rerollCost(G);
    if (!G.spendGold(c)) { SFX.play('error'); if (window.UI) UI.toast('골드가 부족하다', '#ff6b6b'); return; }
    const keep = this.rerolls + 1;
    this.restock(G);
    this.rerolls = keep;
    SFX.play('click');
    this.render();
  },

  buy(idx, g) {
    const G = g || Game;
    const slot = this.stock[idx];
    if (!slot || slot.sold) return false;
    const item = SHOP_ITEMS.find(x => x.k === slot.k);
    if (!item) return false;
    if (item.can && !item.can(G)) {
      SFX.play('error');
      if (window.UI) UI.toast('지금은 쓸 수 없다', '#ff6b6b');
      return false;
    }
    if (!G.spendGold(slot.cost)) {
      SFX.play('error');
      if (window.UI) UI.toast('골드가 부족하다', '#ff6b6b');
      return false;
    }
    slot.sold = true;
    item.buy(G);
    SFX.play('buy');
    if (window.UI) { UI.toast(`${item.i} ${item.n} 구매`, item.col); UI.refresh(); }
    this.render();
    return true;
  },

  /** 웨이브가 끝날 때 — 재고 교체 + 임시 버프 시간 감소 */
  onWaveEnd(g) {
    const G = g || Game;
    if (G.shopBuff) {
      for (const k in G.shopBuff) {
        const b = G.shopBuff[k];
        if (--b.waves <= 0) delete G.shopBuff[k];
      }
      G.refreshAll();
    }
    this.restock(G);
  },

  /* ----------------------------------------------------------------- 화면 */
  show() {
    if (!this.stock.length) this.restock(Game);
    this.open = true;
    document.getElementById('shopWrap').classList.remove('hidden');
    this.render();
    SFX.play('open');
  },
  hide() {
    this.open = false;
    const el = document.getElementById('shopWrap');
    if (el) el.classList.add('hidden');
  },

  render() {
    const wrap = document.getElementById('shopWrap');
    if (!wrap || !this.open) return;
    const g = Game;
    const cards = this.stock.map((slot, i) => {
      const it = SHOP_ITEMS.find(x => x.k === slot.k);
      if (!it) return '';
      const usable = !it.can || it.can(g);
      const afford = g.gold >= slot.cost;
      const cls = slot.sold ? 'sold' : !usable ? 'na' : afford ? '' : 'poor';
      return `<button class="sh-card ${cls}" data-i="${i}" style="--c:${it.col}">
        <span class="sh-i">${it.i}</span>
        <span class="sh-b"><b>${it.n}</b><i>${it.d}</i></span>
        <span class="sh-p">${slot.sold ? '판매됨' : !usable ? '불가'
          : `<em>${U.fmt(slot.cost)}</em>G`}</span>
      </button>`;
    }).join('');
    const rc = this.rerollCost(g);
    wrap.innerHTML = `
      <div class="sh-box">
        <div class="sh-head">
          <h2>🛒 보급 상점</h2>
          <span class="sh-gold">🪙 ${U.fmt(Math.floor(g.gold))}</span>
          <button class="close" id="shClose">✕</button>
        </div>
        <div class="p-note">재고는 웨이브마다 새로 들어온다. 지금 사지 않으면 사라진다.</div>
        <div class="sh-list">${cards}</div>
        <div class="sh-foot">
          <button class="sh-re${g.gold >= rc ? '' : ' dis'}" id="shReroll">
            🎲 새로 진열 <i>${U.fmt(rc)}G</i></button>
          <button class="sh-ok" id="shOk">닫기</button>
        </div>
      </div>`;
    wrap.querySelectorAll('.sh-card').forEach(el =>
      el.onclick = () => this.buy(+el.dataset.i, g));
    document.getElementById('shClose').onclick = () => this.hide();
    document.getElementById('shOk').onclick = () => this.hide();
    document.getElementById('shReroll').onclick = () => this.reroll(g);
    wrap.onclick = e => { if (e.target === wrap) this.hide(); };
  },

  /** 아직 안 산 물건이 있는가 (알림 점용) */
  hasStock() { return this.stock.some(s => !s.sold); },
};

window.Shop = Shop;
window.SHOP_ITEMS = SHOP_ITEMS;
