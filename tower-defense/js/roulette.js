/* =========================================================================
 *  룰렛 — 하루 한 번 무료로 돌리는 보상 휠 + 젬으로 추가 회전
 *
 *  가챠와 별개로 "확정된 보상"을 주는 장치라, 운이 나쁜 판에서도
 *  뭔가 얻어 가는 맛이 있다.
 * ========================================================================= */
'use strict';

const Roulette = {
  /* 칸 구성 — weight 가 클수록 자주 걸린다 */
  SLOTS: [
    { key: 'gold_s', name: '골드 소량', icon: '🪙', color: '#ffd24d', weight: 22, desc: '골드 +2,000' },
    { key: 'gold_m', name: '골드 다량', icon: '💰', color: '#ffb300', weight: 12, desc: '골드 +12,000' },
    { key: 'gold_l', name: '황금 잭팟', icon: '🏆', color: '#ff9a3c', weight: 3, desc: '골드 +60,000' },
    { key: 'gem_s', name: '젬', icon: '💎', color: '#6fe0d0', weight: 14, desc: '젬 +8' },
    { key: 'gem_m', name: '젬 다발', icon: '💠', color: '#4ec8ff', weight: 5, desc: '젬 +30' },
    { key: 'summon', name: '무료 소환권', icon: '🎟', color: '#b48aff', weight: 16, desc: '무료 소환 5회' },
    { key: 'summon10', name: '10연 소환권', icon: '🎰', color: '#ff7ac4', weight: 6, desc: '무료 소환 15회' },
    { key: 'luck', name: '행운 축복', icon: '🍀', color: '#7cf0a8', weight: 10, desc: '이번 판 고등급 확률 대폭 상승' },
    { key: 'unit', name: '유닛 지급', icon: '⚔', color: '#ffd24d', weight: 9, desc: '희귀 이상 유닛 1기' },
    { key: 'jackpot', name: '대박', icon: '🌟', color: '#ff2fd0', weight: 2, desc: '전설 이상 유닛 + 젬 50' },
  ],

  spinning: false,
  angle: 0,
  el: null,

  /** 오늘 무료 회전을 썼는지 */
  freeUsed() {
    const d = new Date().toISOString().slice(0, 10);
    return (Game.rouletteDay || '') === d && (Game.rouletteFree || 0) >= 1;
  },
  markFree() {
    Game.rouletteDay = new Date().toISOString().slice(0, 10);
    Game.rouletteFree = (Game.rouletteFree || 0) + 1;
    Game.saveMeta && Game.saveMeta();
  },
  /** 젬 비용 (무료 소진 후) */
  cost() { return 15; },

  open() {
    if (this.el) return;
    const wrap = document.createElement('div');
    wrap.id = 'rouletteWrap';
    wrap.className = 'roulette-wrap';
    wrap.innerHTML = `
      <div class="rl-box">
        <div class="rl-head">
          <h2>행운의 룰렛</h2>
          <button class="close" id="rlClose">✕</button>
        </div>
        <div class="rl-stage">
          <canvas id="rlCv" width="520" height="520"></canvas>
          <div class="rl-pin">▼</div>
        </div>
        <div class="rl-result" id="rlResult">돌려서 보상을 받아라</div>
        <button class="bigbtn" id="rlSpin"></button>
        <div class="rl-note" id="rlNote"></div>
      </div>`;
    document.body.appendChild(wrap);
    this.el = wrap;
    document.getElementById('rlClose').onclick = () => this.close();
    document.getElementById('rlSpin').onclick = () => this.spin();
    wrap.onclick = (e) => { if (e.target === wrap) this.close(); };
    this.refreshBtn();
    this.draw();
    SFX.play('open');
  },

  close() {
    if (!this.el) return;
    this.el.remove(); this.el = null; this.spinning = false;
    SFX.play('close');
  },

  refreshBtn() {
    const b = document.getElementById('rlSpin');
    const n = document.getElementById('rlNote');
    if (!b) return;
    const free = !this.freeUsed();
    b.textContent = free ? '무료로 돌리기' : `젬 ${this.cost()}개로 돌리기`;
    b.classList.toggle('dis', !free && Game.gems < this.cost());
    if (n) n.textContent = free ? '하루 한 번 무료' : `보유 젬 ${U.fmt(Game.gems)}`;
  },

  /** 휠 그리기 */
  draw() {
    const cv = document.getElementById('rlCv');
    if (!cv) return;
    const c = cv.getContext('2d');
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = W * .46;
    c.clearRect(0, 0, W, H);
    const n = this.SLOTS.length;
    const step = Math.PI * 2 / n;

    c.save();
    c.translate(cx, cy);
    c.rotate(this.angle);
    for (let i = 0; i < n; i++) {
      const s = this.SLOTS[i];
      const a0 = i * step - Math.PI / 2 - step / 2;
      const a1 = a0 + step;
      /* 부채꼴 */
      const g = c.createRadialGradient(0, 0, R * .18, 0, 0, R);
      g.addColorStop(0, U.mixHex(s.color, '#101423', .45));
      g.addColorStop(1, U.mixHex(s.color, '#101423', .05));
      c.fillStyle = g;
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, a0, a1); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(10,12,20,.85)'; c.lineWidth = 3; c.stroke();
      /* 아이콘 + 이름 */
      c.save();
      const mid = a0 + step / 2;
      c.rotate(mid);
      /* 휠 왼쪽 절반에서는 글자가 거꾸로 서므로 뒤집어 준다 */
      const flipped = Math.cos(mid + this.angle) < 0;
      if (flipped) { c.rotate(Math.PI); c.textAlign = 'left'; }
      else c.textAlign = 'right';
      c.textBaseline = 'middle';
      const tx = flipped ? -R * .86 : R * .86;
      c.font = '700 30px system-ui';
      c.fillText(s.icon, tx, -10);
      c.font = '800 13px system-ui';
      c.fillStyle = '#f2f6ff';
      c.fillText(s.name, flipped ? -R * .9 : R * .9, 14);
      c.restore();
    }
    c.restore();

    /* 가운데 허브 */
    c.fillStyle = '#141a26';
    c.beginPath(); c.arc(cx, cy, R * .17, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ffd24d'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#ffd24d'; c.font = '800 22px system-ui';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('🎡', cx, cy);
    /* 바깥 테두리 */
    c.strokeStyle = '#ffd24d'; c.lineWidth = 6;
    c.beginPath(); c.arc(cx, cy, R + 3, 0, Math.PI * 2); c.stroke();
  },

  pickSlot() {
    const list = this.SLOTS.map(s => ({ s, w: s.weight }));
    let total = 0; for (const x of list) total += x.w;
    let r = Math.random() * total;
    for (const x of list) { r -= x.w; if (r <= 0) return x.s; }
    return this.SLOTS[0];
  },

  spin() {
    if (this.spinning) return;
    const free = !this.freeUsed();
    if (!free) {
      if (Game.gems < this.cost()) {
        SFX.play('error');
        UI.toast('젬이 부족하다', '#ff6b6b');
        return;
      }
      Game.gems -= this.cost();
    }
    if (free) this.markFree();

    this.spinning = true;
    const target = this.pickSlot();
    const idx = this.SLOTS.indexOf(target);
    const n = this.SLOTS.length;
    const step = Math.PI * 2 / n;
    /* 핀은 위(-90°)에 있다 — 해당 칸이 핀에 오도록 회전량을 계산 */
    const turns = 5 + Math.floor(Math.random() * 3);
    const endAngle = Math.PI * 2 * turns - idx * step;
    const startAngle = this.angle % (Math.PI * 2);
    const dur = 3600;
    const t0 = performance.now();
    const res = document.getElementById('rlResult');
    if (res) res.textContent = '돌리는 중…';
    document.getElementById('rlSpin').classList.add('dis');

    let lastTick = -1;
    const frame = () => {
      const p = U.clamp((performance.now() - t0) / dur, 0, 1);
      /* 처음엔 빠르고 끝에서 천천히 (감속) */
      const e = 1 - Math.pow(1 - p, 3.2);
      this.angle = startAngle + (endAngle - startAngle) * e;
      this.draw();
      /* 칸을 지날 때마다 딸깍 */
      const tick = Math.floor(this.angle / step);
      if (tick !== lastTick) { lastTick = tick; if (p < .98) SFX.play('tab'); }
      if (p < 1) requestAnimationFrame(frame);
      else this.finish(target);
    };
    frame();
  },

  finish(slot) {
    this.spinning = false;
    const res = document.getElementById('rlResult');
    if (res) {
      res.innerHTML = `<b style="color:${slot.color}">${slot.icon} ${slot.name}</b><br><span>${slot.desc}</span>`;
    }
    this.grant(slot);
    this.refreshBtn();

    /* 연출 — 등급이 큰 보상일수록 화려하게 */
    const big = slot.key === 'jackpot' || slot.key === 'gold_l' || slot.key === 'summon10';
    FX.flash(slot.color, big ? .55 : .25);
    FX.shake(big ? 18 : 8);
    SFX.play(big ? 'jackpot' : 'buy');
    const cv = document.getElementById('rlCv');
    if (cv) {
      const r = cv.getBoundingClientRect();
      VFX.confetti && VFX.confetti(r.left + r.width / 2, r.top + r.height / 2, slot.color, big ? 60 : 24);
    }
    if (window.UI) UI.refresh();
  },

  /** 실제 보상 지급 */
  grant(slot) {
    const G = window.Game;
    switch (slot.key) {
      case 'gold_s': G.addGold(2000); break;
      case 'gold_m': G.addGold(12000); break;
      case 'gold_l': G.addGold(60000); break;
      case 'gem_s': G.gems += 8; break;
      case 'gem_m': G.gems += 30; break;
      case 'summon': G.freeSummons = (G.freeSummons || 0) + 5; break;
      case 'summon10': G.freeSummons = (G.freeSummons || 0) + 15; break;
      case 'luck':
        /* 이번 판 동안 유지되는 축복 */
        G.luckBoost = (G.luckBoost || 0) + .6;
        break;
      case 'unit': this.grantUnit(2); break;
      case 'jackpot': this.grantUnit(4); G.gems += 50; break;
    }
    G.saveMeta && G.saveMeta();
  },

  /** 최소 등급 이상 유닛을 하나 지급 */
  grantUnit(minRi) {
    const G = window.Game;
    if (G.state !== 'playing' || !G.units) return;
    if (G.units.length >= G.slotMax()) { UI.toast('자리가 없어 골드로 대신 받았다', '#ffcf3f'); G.addGold(9000); return; }
    const ri = Math.min(RARITY.length - 1, minRi + (Math.random() < .3 ? 1 : 0));
    const rar = RARITY[ri];
    const pool = (G.runPool && G.runPool[rar.key]) || UNITS_BY_RARITY[rar.key];
    if (!pool || !pool.length) return;
    const def = U.pick(pool);
    const free = G.freeTiles ? G.freeTiles() : [];
    if (!free.length) { G.addGold(9000); return; }
    const [gx, gy] = U.pick(free);
    const u = new Unit(G, def.key, 1, gx, gy);
    G.units.push(u);
    G.collect && G.collect(def.key);
    G.stats.bestRarity = Math.max(G.stats.bestRarity, ri);
    G.refreshAll && G.refreshAll();
    if (window.UI) UI.rarityBanner(def, rar);
  },
};

window.Roulette = Roulette;
