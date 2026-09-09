/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  ui.js
 *  인게임 HUD / 스킬바 / 유닛패널 / 연구·도감·업적 모달 / 결과 화면
 * ========================================================================= */
'use strict';

const $ = id => document.getElementById(id);

const UI = {
  PERKS: [
    { key: 'atk', name: '영원한 예리함', icon: '⚔', max: 15, cost: 8, desc: '모든 유닛 피해 +8% / 레벨' },
    { key: 'gold', name: '황금의 축복', icon: '💰', max: 15, cost: 8, desc: '골드 획득 +10% / 레벨' },
    { key: 'luck', name: '운명의 실타래', icon: '🍀', max: 15, cost: 12, desc: '고등급 소환 확률 +8% / 레벨' },
    { key: 'life', name: '불멸의 성벽', icon: '🏰', max: 15, cost: 10, desc: '시작 생명 +5 / 레벨' },
    { key: 'gold0', name: '초기 자본', icon: '🏦', max: 15, cost: 6, desc: '시작 골드 +120 / 레벨' },
  ],

  modalTab: 'research',
  codexTab: 'unit',
  lastGold: -1, lastLife: -1,

  /* ------------------------------------------------------ 부팅 */
  boot() {
    Game.init($('cv'));
    Game.paused = true;
    this.buildSkillBar();
    this.bind();
    Lobby.init();
    this.refresh();
  },

  bind() {
    $('btnSummon').onclick = () => { SFX.init(); SFX.resume(); Game.summon(); };
    $('btnMerge').onclick = () => Game.autoMergeAll();
    $('btnWave').onclick = () => {
      if (!Game.waveActive) Game.startWave();
      else { Game.autoWave = !Game.autoWave; this.toast(Game.autoWave ? '자동 웨이브 ON' : '자동 웨이브 OFF', '#4ea8ff'); }
      this.refresh();
    };
    $('btnResearch').onclick = () => this.openModal('research');
    $('btnSpeed').onclick = () => Game.cycleSpeed();
    $('btnPause').onclick = () => { Game.paused = !Game.paused; this.refresh(); SFX.play('click'); };
    $('btnMenu').onclick = () => this.openModal('menu');

    $('unitClose').onclick = () => this.showUnitPanel(null);
    $('modalClose').onclick = () => this.closeModal();
    $('modalWrap').onclick = e => { if (e.target === $('modalWrap')) this.closeModal(); };

    $('btnRetry').onclick = () => { $('result').classList.add('hidden'); Lobby.startBattle(); };
    $('btnToTitle').onclick = () => { $('result').classList.add('hidden'); Lobby.showLobby(); };

    $('btnUpgrade').onclick = () => { if (Game.selected) { Game.upgradeUnit(Game.selected); this.showUnitPanel(Game.selected); } };
    $('btnMergeOne').onclick = () => { if (Game.selected) { Game.merge(Game.selected); this.showUnitPanel(Game.selected); } };
    $('btnSell').onclick = () => {
      if (!Game.selected) return;
      if (Game.selected.locked) { this.toast('잠긴 유닛은 판매할 수 없다', '#ff6b6b'); SFX.play('error'); return; }
      Game.removeUnit(Game.selected, true); this.showUnitPanel(null);
    };
    $('btnLock').onclick = () => { if (Game.selected) { Game.toggleLock(Game.selected); this.showUnitPanel(Game.selected); } };

    const modes = [['first', '선두'], ['last', '후미'], ['strong', '강함'], ['close', '근접'], ['boss', '보스']];
    const seg = $('upTargets');
    modes.forEach(([k, n]) => {
      const b = document.createElement('button');
      b.textContent = n; b.dataset.mode = k;
      b.onclick = () => {
        if (!Game.selected) return;
        Game.selected.targetMode = k; Game.selected.target = null;
        SFX.play('click'); this.showUnitPanel(Game.selected);
      };
      seg.appendChild(b);
    });

    window.addEventListener('mousemove', e => { Game.lastMouseX = e.clientX; Game.lastMouseY = e.clientY; });
  },

  /* ------------------------------------------------------ 스킬바 */
  buildSkillBar() {
    const bar = $('skillBar'); bar.innerHTML = '';
    SKILLS.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'skill'; b.dataset.key = s.key;
      b.style.color = s.color;
      b.innerHTML = `<span class="key">${i + 1 <= 9 ? i + 1 : ''}</span><span class="ico">${s.icon}</span>
        <span class="mana">${s.mana}</span><span class="cd hidden"></span>`;
      b.onclick = () => {
        SFX.init(); SFX.resume();
        if (s.type === 'target') {
          Game.targetingSkill = Game.targetingSkill === s.key ? null : s.key;
          this.setSkillTargeting(Game.targetingSkill);
          if (Game.targetingSkill) this.toast('사용할 지점을 선택하라', s.color);
        } else Game.useSkill(s.key);
      };
      b.title = s.name + ' — ' + s.desc;
      bar.appendChild(b);
    });
  },
  setSkillTargeting(key) {
    document.querySelectorAll('.skill').forEach(b => b.classList.toggle('targeting', b.dataset.key === key));
  },

  /* ------------------------------------------------------ 틱 */
  tick(dt) {
    const mp = Game.mana / Game.maxMana;
    $('manaFill').style.width = (mp * 100) + '%';
    $('vMana').textContent = Math.floor(Game.mana) + '/' + Game.maxMana;

    if (Game.waveActive) {
      const total = Math.max(1, Game.waveTotal);
      const left = Game.spawnQueue.length + Game.enemies.length;
      $('waveFill').style.width = (U.clamp(1 - left / total, 0, 1) * 100) + '%';
      $('vWaveProg').textContent = `잔적 ${left} · ${Game.waveKilled} 처치`;
    } else {
      const p = Game.autoWave ? U.clamp(1 - Game.breakTime / 5, 0, 1) : 0;
      $('waveFill').style.width = (p * 100) + '%';
      $('vWaveProg').textContent = Game.autoWave
        ? `다음 웨이브 ${Math.max(0, Game.breakTime).toFixed(1)}s` : '준비 완료';
    }

    document.querySelectorAll('.skill').forEach(b => {
      const cd = Game.skillCd[b.dataset.key];
      const el = b.querySelector('.cd');
      if (cd > 0) { el.classList.remove('hidden'); el.textContent = Math.ceil(cd); }
      else el.classList.add('hidden');
      b.classList.toggle('ready', Game.canUseSkill(b.dataset.key));
    });

    const cb = $('comboBox');
    if (Game.combo >= 5) {
      cb.classList.remove('hidden');
      $('vCombo').textContent = Game.combo;
      $('vComboMul').textContent = 'x' + Game.comboGoldMul().toFixed(2);
    } else cb.classList.add('hidden');

    const gold = Math.floor(Game.gold);
    if (gold !== this.lastGold) {
      $('vGold').textContent = U.fmt(gold);
      if (gold > this.lastGold) {
        $('statGold').classList.add('flash');
        setTimeout(() => $('statGold').classList.remove('flash'), 240);
      }
      this.lastGold = gold;
      this.refreshButtons();
    }
    if (Game.life !== this.lastLife) {
      $('vLife').textContent = Math.max(0, Game.life) + '/' + Game.maxLife;
      $('statLife').classList.toggle('low', Game.life / Game.maxLife < .35);
      this.lastLife = Game.life;
    }
    $('vWave').textContent = Game.wave;
    $('vLoop').textContent = Game.loop ? ' +' + Game.loop + '회차' : '';
  },

  refreshButtons() {
    const cost = Game.summonCost();
    $('summonCost').textContent = Game.freeSummons > 0 ? `무료 ×${Game.freeSummons}` : U.fmt(cost) + 'G';
    $('btnSummon').classList.toggle('dis', (Game.gold < cost && !Game.freeSummons) || Game.units.length >= Game.slotMax());
    $('btnSummon').classList.toggle('glow', Game.gold >= cost * 3 || Game.freeSummons > 0);
    const counts = {};
    for (const u of Game.units) { const k = u.key + '_' + u.star; counts[k] = (counts[k] || 0) + 1; }
    let pairs = 0;
    for (const k in counts) pairs += Math.floor(counts[k] / 3);
    $('mergeCount').textContent = pairs + '쌍';
    $('btnMerge').classList.toggle('glow', pairs > 0);
    $('btnMerge').classList.toggle('dis', pairs === 0);
  },

  refresh() {
    $('vGold').textContent = U.fmt(Math.floor(Game.gold));
    $('vGem').textContent = U.fmt(Game.gems);
    $('vLife').textContent = Math.max(0, Game.life) + '/' + Game.maxLife;
    $('vWave').textContent = Game.wave;
    this.refreshButtons();

    $('btnWave').classList.toggle('auto', Game.autoWave && Game.waveActive);
    $('waveSub').textContent = Game.waveActive ? (Game.autoWave ? '자동ON' : '자동OFF') : '시작';
    $('speedIco').textContent = Game.speed === 1 ? '▶' : Game.speed === 2 ? '▶▶' : '▶▶▶';
    $('btnSpeed').querySelector('.bsub').textContent = 'x' + Game.speed;
    $('btnPause').querySelector('.bico').textContent = Game.paused ? '▶' : '⏸';
    $('btnPause').querySelector('.bsub').textContent = Game.paused ? '재개' : '정지';
    $('researchSub').textContent = '유닛 ' + Game.units.length + '/' + Game.slotMax();

    this.refreshSynergy();
    if (Game.selected) this.showUnitPanel(Game.selected);
    if (!$('modalWrap').classList.contains('hidden')) this.renderModal();
  },

  refreshSynergy() {
    const p = $('synPanel');
    const list = Game.synActive.slice()
      .sort((a, b) => (b.tier ? 1 : 0) - (a.tier ? 1 : 0) || b.count - a.count).slice(0, 10);
    p.innerHTML = list.map(s => {
      const on = !!s.tier;
      const col = s.type === 'elem' ? ELEM[s.key].color : '#9fd2ff';
      return `<div class="syn ${on ? 'on' : ''}">
        <span style="color:${col}">${s.icon}</span><span>${s.name}</span>
        <span class="c">${s.count}${on ? '' : '/' + s.need}</span></div>`;
    }).join('');
  },

  /* ------------------------------------------------------ 유닛 패널 */
  showUnitPanel(u) {
    const p = $('unitPanel');
    if (!u) { p.classList.add('hidden'); return; }
    p.classList.remove('hidden');
    const d = u.def, rar = RARITY[RARITY_IDX[d.rarity]];
    $('upName').textContent = d.name;
    const rr = $('upRarity'); rr.textContent = rar.name; rr.style.color = rar.color;
    const rc = $('upClass'); rc.textContent = CLASSES[d.cls].icon + ' ' + CLASSES[d.cls].name; rc.style.color = '#9fd2ff';
    const re = $('upElem'); re.textContent = ELEM[d.elem].icon + ' ' + ELEM[d.elem].name; re.style.color = ELEM[d.elem].color;
    $('upStars').textContent = '★'.repeat(u.star) + '☆'.repeat(3 - u.star) + '  Lv.' + u.level;
    $('upDesc').textContent = d.desc;

    const s = u.stat;
    const rows = [
      ['공격력', U.fmt(s.dmg)],
      ['공격속도', s.spd.toFixed(2) + '/s'],
      ['DPS', U.fmt(u.dps)],
      ['사거리', s.rng > 20 ? '무한' : s.rng.toFixed(1)],
      ['치명타', U.pct(s.crit) + ' / ' + Math.round(s.critMul * 100) + '%'],
      ['방어관통', U.pct(s.pen)],
    ];
    if (s.splash > 0) rows.push(['범위', s.splash.toFixed(1)]);
    if (s.chain > 0) rows.push(['연쇄', s.chain + '회']);
    if (s.pierce > 0) rows.push(['관통', s.pierce + '체']);
    if (s.multishot > 1) rows.push(['다중사격', s.multishot + '발']);
    if (s.execute > 0) rows.push(['처형', U.pct(s.execute)]);
    rows.push(['누적 피해', U.fmt(u.dmgDone)]);
    rows.push(['처치', u.kills + '기']);
    $('upStats').innerHTML = rows.map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');

    document.querySelectorAll('#upTargets button').forEach(b =>
      b.classList.toggle('on', b.dataset.mode === u.targetMode));

    const ucost = u.upgradeCost();
    $('upgCost').textContent = U.fmt(ucost) + 'G';
    $('btnUpgrade').classList.toggle('dis', Game.gold < ucost);
    const grp = Game.findMergeGroup(u);
    $('mergeInfo').textContent = grp ? (u.star < 3 ? U.roman(u.star + 1) + '성으로' : '등급 승급!') : '3기 필요';
    $('btnMergeOne').classList.toggle('dis', !grp);
    $('sellVal').textContent = '+' + U.fmt(Math.floor(u.cost() * .6 + u.invested * .5)) + 'G';
    $('lockState').textContent = u.locked ? '🔒 잠김' : '🔓 해제';
    $('btnLock').classList.toggle('on', !!u.locked);
    $('btnSell').classList.toggle('dis', !!u.locked);

    Draw.portraitUnit($('upPortrait'), d, u.star);
  },

  /* ------------------------------------------------------ 인게임 모달 */
  openModal(tab) {
    this.modalTab = tab;
    $('modalWrap').classList.remove('hidden');
    this.renderModal();
    SFX.play('click');
  },
  closeModal() { $('modalWrap').classList.add('hidden'); SFX.play('click'); },
  closeAll() { this.closeModal(); this.showUnitPanel(null); },

  renderModal() {
    const tabs = [
      { k: 'research', n: '⚗ 연구' },
      { k: 'codex', n: '📖 도감' },
      { k: 'ach', n: '🏆 업적' },
      { k: 'tools', n: '🛠 도구' },
      { k: 'menu', n: '☰ 메뉴' },
    ];
    $('modalTabs').innerHTML = tabs.map(t =>
      `<button class="${this.modalTab === t.k ? 'on' : ''}" data-tab="${t.k}">${t.n}</button>`).join('');
    $('modalTabs').querySelectorAll('button').forEach(b =>
      b.onclick = () => { this.modalTab = b.dataset.tab; this.renderModal(); SFX.play('click'); });

    const body = $('modalBody');
    body.scrollTop = 0;
    switch (this.modalTab) {
      case 'research': $('modalTitle').textContent = '연구소'; body.innerHTML = this.htmlResearch(); this.bindResearch(); break;
      case 'codex': $('modalTitle').textContent = '도감'; this.renderCodex(body); break;
      case 'ach': $('modalTitle').textContent = '업적'; body.innerHTML = this.htmlAch(); break;
      case 'tools': $('modalTitle').textContent = '전투 도구'; body.innerHTML = this.htmlTools(); this.bindTools(); break;
      case 'menu': $('modalTitle').textContent = '메뉴'; body.innerHTML = this.htmlMenu(); this.bindMenu(); break;
    }
  },

  htmlResearch() {
    return `<div class="p-note">연구는 이번 판에만 적용된다. 골드를 투자해 군대를 강화하라.</div>` +
      RESEARCH.map(r => {
        const lv = Game.research[r.key], max = lv >= r.max;
        const cost = Game.researchCost(r.key);
        const can = !max && Game.gold >= cost;
        return `<div class="res-item ${max ? 'max' : ''}">
          <div class="ri">${r.icon}</div>
          <div class="rt"><div class="rn">${r.name} <span class="rlv">Lv.${lv}/${r.max}</span></div>
          <div class="rd">${r.desc}</div></div>
          <button data-res="${r.key}" class="${can ? '' : 'dis'}">${max ? 'MAX' : U.fmt(cost) + 'G'}</button>
        </div>`;
      }).join('');
  },
  bindResearch() {
    $('modalBody').querySelectorAll('[data-res]').forEach(b =>
      b.onclick = () => { if (Game.buyResearch(b.dataset.res)) this.renderModal(); });
  },

  renderCodex(body) {
    body.innerHTML = `<div class="subtabs">
        <button class="${this.codexTab === 'unit' ? 'on' : ''}" data-cx="unit">유닛</button>
        <button class="${this.codexTab === 'enemy' ? 'on' : ''}" data-cx="enemy">적</button>
        <button class="${this.codexTab === 'syn' ? 'on' : ''}" data-cx="syn">시너지</button>
      </div><div id="cxHost"></div>`;
    body.querySelectorAll('[data-cx]').forEach(b =>
      b.onclick = () => { this.codexTab = b.dataset.cx; this.renderCodex(body); });
    const host = $('cxHost');

    if (this.codexTab === 'syn') { Lobby.renderSynergyList(host); return; }
    if (this.codexTab === 'enemy') {
      host.innerHTML = '<div class="cxgrid">' + ENEMIES.map((e, i) => `
        <div class="cx" style="border-color:${e.boss ? '#ffd24d' : 'rgba(120,160,220,.25)'}">
          <canvas width="130" height="130" data-en="${i}"></canvas>
          <div class="cx-n">${e.name}</div>
          <div class="cx-r" style="color:${e.color}">${e.boss ? '👑 BOSS' : 'T' + e.tier}</div>
        </div>`).join('') + '</div>';
      host.querySelectorAll('[data-en]').forEach(cv => Draw.portraitEnemy(cv, ENEMIES[+cv.dataset.en]));
      return;
    }
    const found = Game.collection || {};
    host.innerHTML = '<div class="cxgrid">' + UNITS.map((u, i) => {
      const r = RARITY[RARITY_IDX[u.rarity]];
      const seen = !!found[u.key];
      return `<div class="cx ${seen ? '' : 'unseen'}" style="border-color:${seen ? r.color : 'rgba(120,160,220,.2)'}">
        <canvas width="130" height="130" data-un="${i}"></canvas>
        <div class="cx-n">${seen ? u.name : '???'}</div>
        <div class="cx-r" style="color:${r.color}">${r.name}</div>
      </div>`;
    }).join('') + '</div>';
    host.querySelectorAll('[data-un]').forEach(cv => {
      const u = UNITS[+cv.dataset.un];
      if (found[u.key]) Draw.portraitUnit(cv, u, 0); else Lobby.drawSilhouette(cv, u);
    });
  },

  htmlAch() {
    const done = ACHIEVEMENTS.filter(a => Game.achieved[a.key]).length;
    return `<div class="p-note">달성 ${done}/${ACHIEVEMENTS.length} · 보유 💎 ${Game.gems}</div>` +
      ACHIEVEMENTS.map(a => `<div class="ach ${Game.achieved[a.key] ? 'done' : ''}">
        <div class="ai">${a.icon}</div>
        <div><div class="an">${a.name}</div><div class="ad">${a.desc}</div></div>
        <div class="ag">💎${a.gem}</div></div>`).join('');
  },

  /* --------------------------- 전투 도구 */
  htmlTools() {
    const rank = Game.dpsRanking().slice(0, 12);
    const maxDmg = Math.max(1, rank.length ? rank[0].dmg : 1);
    return `<div class="p-note">배치·정리를 돕는 도구다. 단축키 : A 자동배치 · L 선택 유닛 잠금</div>
      <div class="toolgrid">
        <button class="toolbtn" id="tArrange"><span>🧭</span><b>자동 최적 배치</b><i>경로 노출이 좋은 칸으로 재배치</i></button>
        <button class="toolbtn" id="tMerge"><span>⇪</span><b>전체 자동 합성</b><i>가능한 모든 조합을 합성</i></button>
        <button class="toolbtn" id="tSellC"><span>🧹</span><b>일반 1성 정리</b><i>잠기지 않은 일반 1성 판매</i></button>
        <button class="toolbtn" id="tSellR"><span>🗑</span><b>희귀 미만 정리</b><i>희귀 미만 1성 일괄 판매</i></button>
      </div>
      <div class="synsec">유닛 기여도 순위</div>
      ${rank.length ? rank.map((r, i) => {
      const col = RARITY[RARITY_IDX[r.rarity]].color;
      return `<div class="rankrow">
          <div class="rk-i">${i + 1}</div>
          <div class="rk-n" style="color:${col}">${r.name}
            <span>${'★'.repeat(r.star)}${r.level > 1 ? ' Lv.' + r.level : ''}</span></div>
          <div class="rk-bar"><div style="width:${(r.dmg / maxDmg) * 100}%;
            background:${ELEM[r.elem].color}"></div></div>
          <div class="rk-v">${U.fmt(r.dmg)}<i>${r.kills}킬</i></div>
        </div>`;
    }).join('') : '<div class="p-note">아직 기록이 없다.</div>'}`;
  },
  bindTools() {
    const b = $('modalBody');
    const on = (id, fn) => { const e = b.querySelector('#' + id); if (e) e.onclick = () => { fn(); this.renderModal(); }; };
    on('tArrange', () => Game.autoArrange());
    on('tMerge', () => Game.autoMergeAll());
    on('tSellC', () => Game.sellBelow(1));
    on('tSellR', () => Game.sellBelow(2));
  },

  htmlMenu() {
    const s = Game.stats;
    return `<div class="res-grid" style="grid-template-columns:1fr 1fr;margin-bottom:12px">
      <div><span>웨이브</span><b>${Game.wave}</b></div>
      <div><span>생명</span><b>${Game.life}/${Game.maxLife}</b></div>
      <div><span>처치</span><b>${U.fmt(s.kills)}</b></div>
      <div><span>보스 처치</span><b>${s.bossKills}</b></div>
      <div><span>누적 피해</span><b>${U.fmt(s.totalDmg)}</b></div>
      <div><span>누적 골드</span><b>${U.fmt(s.totalGold)}</b></div>
      <div><span>소환</span><b>${s.summons}</b></div>
      <div><span>합성</span><b>${s.merges}</b></div>
      <div><span>최고 콤보</span><b>${s.maxCombo}</b></div>
      <div><span>유닛</span><b>${Game.units.length}/${Game.slotMax()}</b></div>
    </div>
    <button class="dangerbtn" id="btnGiveUp" style="margin-bottom:8px">이번 판 포기하고 로비로</button>
    <button class="bigbtn" id="btnResume">계속하기</button>`;
  },
  bindMenu() {
    const g = $('btnGiveUp');
    if (g) g.onclick = () => {
      if (!confirm('현재 진행도를 포기하고 로비로 돌아갈까?')) return;
      Game.mergeMetaStats(); Game.saveMeta();
      if (window.Lobby) Lobby.onRunFinished(false);
      this.closeModal(); Lobby.showLobby();
    };
    const r = $('btnResume');
    if (r) r.onclick = () => this.closeModal();
  },

  /* ------------------------------------------------------ 알림 */
  toast(msg, color) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    t.style.color = color || '#e8eefb';
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 1900);
  },

  bossBanner(w) {
    const b = $('banner');
    b.classList.remove('hidden');
    b.innerHTML = `<div class="bt">⚠ BOSS WAVE ${w} ⚠<span class="bs">강력한 적이 접근한다</span></div>`;
    setTimeout(() => b.classList.add('hidden'), 2500);
  },

  rarityBanner(def, rar) {
    const b = $('rarityBanner');
    b.classList.remove('hidden');
    b.style.color = rar.color;
    $('rbRare').textContent = rar.name.toUpperCase();
    $('rbRare').style.color = rar.color;
    $('rbName').textContent = def.name;
    Draw.portraitUnit($('rbCanvas'), def, 0, { scale: .3 });
    clearTimeout(this._rbT);
    this._rbT = setTimeout(() => b.classList.add('hidden'), 2200);
  },

  achievementPopup(a) {
    const p = $('achPop');
    p.classList.remove('hidden');
    $('apIco').textContent = a.icon;
    $('apTitle').textContent = '업적 달성 · ' + a.name;
    $('apDesc').textContent = a.desc;
    $('apGem').textContent = '💎 +' + a.gem;
    clearTimeout(this._apT);
    this._apT = setTimeout(() => p.classList.add('hidden'), 3200);
  },

  /* ------------------------------------------------------ 이벤트 */
  onRunStart() { this.lastGold = -1; this.lastLife = -1; this.refresh(); },
  onWaveStart(w) {
    this.toast(`웨이브 ${w} 시작!`, w % 10 === 0 ? '#ff4f7e' : '#9fd2ff');
    this.renderWavePreview();
    this.refresh();
  },
  onWaveEnd(w) {
    this.refresh();
    if (w % 5 === 0) this.toast('💡 ' + U.pick(TIPS), '#ffd24d');
  },

  renderWavePreview() {
    const host = $('wavePreview');
    if (!host) return;
    const list = Game.nextWaveList;
    if (!list || !list.length || Game.waveActive) { host.innerHTML = ''; return; }
    const counts = {};
    for (const s of list) counts[s.key] = (counts[s.key] || 0) + 1;
    const keys = Object.keys(counts).sort((a, b) =>
      (ENEMY_MAP[b].boss ? 1 : 0) - (ENEMY_MAP[a].boss ? 1 : 0) || counts[b] - counts[a]);
    host.innerHTML = `<span class="wp-title">W${Game.nextWaveNo} 예고</span>` + keys.map(k => {
      const e = ENEMY_MAP[k];
      return `<div class="wp ${e.boss ? 'boss' : ''}" title="${e.name}">
        <canvas width="80" height="80" data-wp="${k}"></canvas><b>${counts[k]}</b></div>`;
    }).join('');
    host.querySelectorAll('[data-wp]').forEach(cv => Draw.portraitEnemy(cv, ENEMY_MAP[cv.dataset.wp]));
  },

  /* ------------------------------------------------------ 결과 */
  showGameOver(win) {
    const r = $('result');
    r.classList.remove('hidden');
    r.classList.toggle('win', win);
    $('resTitle').textContent = win ? 'VICTORY!' : 'GAME OVER';
    const s = Game.stats;
    const res = window.Lobby ? Lobby.onRunFinished(win) : null;
    if (Account.profile) Draw.portraitAvatar($('resAvatar'), Account.profile.avatar, performance.now() / 1000);
    $('resExp').innerHTML = res
      ? `<b>+${U.fmt(res.exp)} EXP</b>${res.levels ? ` · <span style="color:#ffd24d">LEVEL UP! Lv.${res.level}</span>` : ''}`
      : '';
    $('resGrid').innerHTML = `
      <div><span>도달 웨이브</span><b>${Game.wave}${Game.loop ? ' (+' + Game.loop + '회차)' : ''}</b></div>
      <div><span>맵</span><b>${Game.map.name}</b></div>
      <div><span>처치</span><b>${U.fmt(s.kills)}</b></div>
      <div><span>보스 처치</span><b>${s.bossKills}</b></div>
      <div><span>누적 피해</span><b>${U.fmt(s.totalDmg)}</b></div>
      <div><span>누적 골드</span><b>${U.fmt(s.totalGold)}</b></div>
      <div><span>합성</span><b>${s.merges}회</b></div>
      <div><span>최고 콤보</span><b>${s.maxCombo}</b></div>
      <div><span>최종 유닛</span><b>${Game.units.length}기</b></div>
      <div><span>보유 젬</span><b>💎 ${Game.gems}</b></div>`;
    if (win) this.toast('다음 맵이 해금되었다!', '#ffd24d');
    if (res && res.levels) { FX.flash('#ffd24d', .4); SFX.play('legendary'); }
  },
};

window.UI = UI;
window.addEventListener('DOMContentLoaded', () => UI.boot());
