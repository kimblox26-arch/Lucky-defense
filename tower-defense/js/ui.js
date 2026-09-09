/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  ui.js
 *  DOM UI 바인딩 : HUD / 스킬 / 유닛패널 / 연구 / 도감 / 업적 / 명예강화 / 설정
 * ========================================================================= */
'use strict';

const $ = id => document.getElementById(id);

const PERKS = [
  { key: 'atk', name: '영원한 예리함', icon: '⚔', max: 10, cost: 8, desc: '모든 유닛 피해 +8% / 레벨' },
  { key: 'gold', name: '황금의 축복', icon: '💰', max: 10, cost: 8, desc: '골드 획득 +10% / 레벨' },
  { key: 'luck', name: '운명의 실타래', icon: '🍀', max: 10, cost: 12, desc: '고등급 소환 확률 +8% / 레벨' },
  { key: 'life', name: '불멸의 성벽', icon: '🏰', max: 10, cost: 10, desc: '시작 생명 +5 / 레벨' },
  { key: 'gold0', name: '초기 자본', icon: '🏦', max: 10, cost: 6, desc: '시작 골드 +120 / 레벨' },
];

const UI = {
  selectedMap: MAPS[0],
  modalTab: 'unit',
  lastGold: 0, lastLife: 0,
  toastTimer: 0,

  /* ------------------------------------------------------ 부팅 */
  boot() {
    Game.init($('cv'));
    Game.paused = true;
    this.buildSkillBar();
    this.buildTitle();
    this.bind();
    this.refresh();
    $('titleTip').textContent = '💡 ' + U.pick(TIPS);
    setInterval(() => { if (!$('title').classList.contains('hidden')) $('titleTip').textContent = '💡 ' + U.pick(TIPS); }, 6000);
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

    $('btnStart').onclick = () => this.startGame();
    $('btnCodex').onclick = () => this.openModal('codex');
    $('btnAch').onclick = () => this.openModal('ach');
    $('btnPerks').onclick = () => this.openModal('perks');
    $('btnSettings').onclick = () => this.openModal('settings');
    $('btnRetry').onclick = () => { $('result').classList.add('hidden'); this.startGame(); };
    $('btnToTitle').onclick = () => { $('result').classList.add('hidden'); this.toTitle(); };

    $('btnUpgrade').onclick = () => { if (Game.selected) { Game.upgradeUnit(Game.selected); this.showUnitPanel(Game.selected); } };
    $('btnMergeOne').onclick = () => { if (Game.selected) { const u = Game.selected; Game.merge(u); this.showUnitPanel(Game.selected); } };
    $('btnSell').onclick = () => { if (Game.selected) { Game.removeUnit(Game.selected, true); this.showUnitPanel(null); } };

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

    /* 스킬 조준용 마우스 추적 */
    window.addEventListener('mousemove', e => { Game.lastMouseX = e.clientX; Game.lastMouseY = e.clientY; });
  },

  /* ------------------------------------------------------ 타이틀 */
  buildTitle() {
    const wrap = $('titleMaps'); wrap.innerHTML = '';
    MAPS.forEach((m, i) => {
      const unlocked = i === 0 || Game.unlockedMaps[m.key];
      const d = document.createElement('div');
      d.className = 'mapcard' + (m.key === this.selectedMap.key ? ' on' : '') + (unlocked ? '' : ' lock');
      d.innerHTML = `<canvas width="176" height="104"></canvas>
        <div class="mn">${m.name}</div><div class="md">${m.desc}</div>
        <div class="mdiff">난이도 x${m.diff.toFixed(2)}</div>`;
      d.onclick = () => {
        if (!unlocked) { this.toast('이전 맵을 100웨이브 클리어해야 한다', '#ff6b6b'); SFX.play('error'); return; }
        this.selectedMap = m; SFX.play('click'); this.buildTitle();
      };
      wrap.appendChild(d);
      this.drawMapThumb(d.querySelector('canvas'), m);
    });
    $('titleSub').textContent =
      `${UNITS.length}종의 유닛 · ${ENEMIES.filter(e => !e.boss).length}종의 적 · ${BOSS_ORDER.length}종의 보스 · ${MAPS.length}개 전장 · 100 웨이브 · 무한 회귀`;
    const ms = Game.metaStats;
    $('titleStats').innerHTML = `
      <span>최고 웨이브 <b style="color:#9fd2ff">${ms.maxWave}</b></span>
      <span>총 처치 <b style="color:#ff8a95">${U.fmt(ms.kills)}</b></span>
      <span>보스 <b style="color:#ffd24d">${ms.bossKills}</b></span>
      <span>💎 <b style="color:#6ffff0">${Game.gems}</b></span>
      <span>플레이 <b>${ms.runs}</b>회</span>`;
  },

  drawMapThumb(cv, m) {
    const c = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const ts = Math.min(W / GRID_W, H / GRID_H);
    const ox = (W - GRID_W * ts) / 2, oy = (H - GRID_H * ts) / 2;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, m.bg); g.addColorStop(1, m.bg2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = m.road; c.lineWidth = ts * .8; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath();
    m.path.forEach((p, i) => {
      const x = ox + (p[0] + .5) * ts, y = oy + (p[1] + .5) * ts;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    c.stroke();
    c.strokeStyle = m.accent; c.lineWidth = ts * .18; c.stroke();
  },

  startGame() {
    SFX.init(); SFX.resume();
    $('title').classList.add('hidden');
    Game.resetRun(this.selectedMap);
    Game.paused = false;
    this.refresh();
    this.toast(this.selectedMap.name + ' 진입!', '#7cff9c');
  },
  toTitle() {
    Game.paused = true;
    Game.state = 'playing';
    $('title').classList.remove('hidden');
    this.buildTitle();
  },

  /* ------------------------------------------------------ 스킬바 */
  buildSkillBar() {
    const bar = $('skillBar'); bar.innerHTML = '';
    SKILLS.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'skill'; b.dataset.key = s.key;
      b.style.color = s.color;
      b.innerHTML = `<span class="key">${i + 1}</span><span class="ico">${s.icon}</span>
        <span class="mana">${s.mana}</span><span class="cd hidden"></span>`;
      b.onclick = () => {
        SFX.init(); SFX.resume();
        if (s.type === 'target') {
          Game.targetingSkill = Game.targetingSkill === s.key ? null : s.key;
          this.setSkillTargeting(Game.targetingSkill);
          if (Game.targetingSkill) this.toast('낙하 지점을 선택하라', s.color);
        } else Game.useSkill(s.key);
      };
      b.title = s.name + ' — ' + s.desc;
      bar.appendChild(b);
    });
  },
  setSkillTargeting(key) {
    document.querySelectorAll('.skill').forEach(b => b.classList.toggle('targeting', b.dataset.key === key));
  },

  /* ------------------------------------------------------ 틱 / 갱신 */
  tick(dt) {
    /* 마나/쿨 표시 */
    const mp = Game.mana / Game.maxMana;
    $('manaFill').style.width = (mp * 100) + '%';
    $('vMana').textContent = Math.floor(Game.mana) + '/' + Game.maxMana;

    if (Game.waveActive) {
      const total = Math.max(1, Game.waveTotal);
      const left = Game.spawnQueue.length + Game.enemies.length;
      const done = U.clamp(1 - left / total, 0, 1);
      $('waveFill').style.width = (done * 100) + '%';
      $('vWaveProg').textContent = `잔적 ${left} · ${Game.waveKilled} 처치`;
    } else {
      const p = Game.autoWave ? U.clamp(1 - Game.breakTime / 5, 0, 1) : 0;
      $('waveFill').style.width = (p * 100) + '%';
      $('vWaveProg').textContent = Game.autoWave
        ? `다음 웨이브 ${Math.max(0, Game.breakTime).toFixed(1)}s`
        : '준비 완료';
    }

    document.querySelectorAll('.skill').forEach(b => {
      const k = b.dataset.key;
      const cd = Game.skillCd[k];
      const el = b.querySelector('.cd');
      if (cd > 0) { el.classList.remove('hidden'); el.textContent = Math.ceil(cd); }
      else el.classList.add('hidden');
      b.classList.toggle('ready', Game.canUseSkill(k));
    });

    /* 콤보 */
    const cb = $('comboBox');
    if (Game.combo >= 5) {
      cb.classList.remove('hidden');
      $('vCombo').textContent = Game.combo;
      $('vComboMul').textContent = 'x' + Game.comboGoldMul().toFixed(2);
    } else cb.classList.add('hidden');

    /* 자원 표시 */
    const gold = Math.floor(Game.gold);
    if (gold !== this.lastGold) {
      $('vGold').textContent = U.fmt(gold);
      if (gold > this.lastGold) $('statGold').classList.add('flash');
      setTimeout(() => $('statGold').classList.remove('flash'), 260);
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
    $('summonCost').textContent = U.fmt(cost) + 'G';
    $('btnSummon').classList.toggle('dis', Game.gold < cost || Game.units.length >= Game.slotMax());
    $('btnSummon').classList.toggle('glow', Game.gold >= cost * 3);
    /* 합성 가능 쌍 */
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
    $('vGem').textContent = Game.gems;
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
    const list = Game.synActive.slice().sort((a, b) => (b.tier ? 1 : 0) - (a.tier ? 1 : 0) || b.count - a.count).slice(0, 9);
    p.innerHTML = list.map(s => {
      const on = !!s.tier;
      const col = s.type === 'elem' ? ELEM[s.key].color : '#9fd2ff';
      return `<div class="syn ${on ? 'on' : ''}" style="color:${on ? '' : ''}">
        <span style="color:${col}">${s.icon}</span>
        <span>${s.name}</span>
        <span class="c">${s.count}${on ? '' : '/' + s.need}</span>
      </div>`;
    }).join('');
  },

  /* ------------------------------------------------------ 웨이브 미리보기 */
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
      return `<div class="wp ${e.boss ? 'boss' : ''}" title="${e.name}${(e.flags || []).length ? ' · ' + e.flags.join(',') : ''}">
        <canvas width="72" height="72" data-wp="${k}"></canvas><b>${counts[k]}</b></div>`;
    }).join('');
    host.querySelectorAll('[data-wp]').forEach(cv => {
      const e = ENEMY_MAP[cv.dataset.wp];
      const c = cv.getContext('2d');
      Draw.sprite(c, 36, 42, 22, e.art, e.color, { t: performance.now() / 1000, shadow: false });
    });
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

    this.drawPortrait($('upPortrait'), d, u.star);
  },

  drawPortrait(cv, def, star) {
    const c = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H);
    const rar = RARITY[RARITY_IDX[def.rarity]];
    const g = c.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W / 2);
    g.addColorStop(0, U.rgba(rar.color, .35)); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    Draw.sprite(c, W / 2, H * .48, W * .3, def.art, ELEM[def.elem].color, { t: performance.now() / 1000, shadow: false });
    if (star) {
      c.fillStyle = '#ffd24d'; c.font = '900 14px system-ui'; c.textAlign = 'center';
      c.fillText('★'.repeat(star), W / 2, H - 8);
    }
  },

  /* ------------------------------------------------------ 모달 */
  openModal(tab) {
    this.modalTab = tab;
    $('modalWrap').classList.remove('hidden');
    Game.pausedByModal = Game.paused;
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
      { k: 'perks', n: '💎 명예' },
      { k: 'settings', n: '⚙ 설정' },
      { k: 'menu', n: '☰ 메뉴' },
    ];
    $('modalTabs').innerHTML = tabs.map(t =>
      `<button class="${this.modalTab === t.k ? 'on' : ''}" data-tab="${t.k}">${t.n}</button>`).join('');
    $('modalTabs').querySelectorAll('button').forEach(b =>
      b.onclick = () => { this.modalTab = b.dataset.tab; this.renderModal(); SFX.play('click'); });

    const body = $('modalBody');
    switch (this.modalTab) {
      case 'research': $('modalTitle').textContent = '연구소'; body.innerHTML = this.htmlResearch(); this.bindResearch(); break;
      case 'codex': $('modalTitle').textContent = '도감'; this.renderCodex(body); break;
      case 'ach': $('modalTitle').textContent = '업적'; body.innerHTML = this.htmlAch(); break;
      case 'perks': $('modalTitle').textContent = '명예 강화 (영구)'; body.innerHTML = this.htmlPerks(); this.bindPerks(); break;
      case 'settings': $('modalTitle').textContent = '설정'; body.innerHTML = this.htmlSettings(); this.bindSettings(); break;
      case 'menu': $('modalTitle').textContent = '메뉴'; body.innerHTML = this.htmlMenu(); this.bindMenu(); break;
    }
  },

  /* --------------------------- 연구 */
  htmlResearch() {
    return `<div style="font-size:11.5px;color:var(--dim);margin-bottom:8px">
      연구는 이번 판에만 적용된다. 골드를 투자해 군대를 강화하라.</div>` +
      RESEARCH.map(r => {
        const lv = Game.research[r.key], max = lv >= r.max;
        const cost = Game.researchCost(r.key);
        const can = !max && Game.gold >= cost;
        return `<div class="res-item ${max ? 'max' : ''}">
          <div class="ri">${r.icon}</div>
          <div class="rt">
            <div class="rn">${r.name} <span class="rlv">Lv.${lv}/${r.max}</span></div>
            <div class="rd">${r.desc}</div>
          </div>
          <button data-res="${r.key}" class="${can ? '' : 'dis'}">${max ? 'MAX' : U.fmt(cost) + 'G'}</button>
        </div>`;
      }).join('');
  },
  bindResearch() {
    $('modalBody').querySelectorAll('[data-res]').forEach(b =>
      b.onclick = () => { if (Game.buyResearch(b.dataset.res)) this.renderModal(); });
  },

  /* --------------------------- 도감 */
  renderCodex(body) {
    body.innerHTML = `
      <div class="modal-tabs" style="padding:0 0 8px">
        <button class="${this.codexTab !== 'enemy' && this.codexTab !== 'syn' ? 'on' : ''}" data-cx="unit">유닛 ${UNITS.length}</button>
        <button class="${this.codexTab === 'enemy' ? 'on' : ''}" data-cx="enemy">적 ${ENEMIES.length}</button>
        <button class="${this.codexTab === 'syn' ? 'on' : ''}" data-cx="syn">시너지</button>
      </div>
      <div id="cxHost"></div>`;
    body.querySelectorAll('[data-cx]').forEach(b =>
      b.onclick = () => { this.codexTab = b.dataset.cx; this.renderCodex(body); });

    const host = $('cxHost');
    if (this.codexTab === 'enemy') {
      host.className = 'codex-grid';
      host.innerHTML = ENEMIES.map((e, i) => `
        <div class="cx" style="border-color:${e.boss ? '#ffd24d' : 'var(--line)'}" title="${e.name}">
          <canvas width="104" height="104" data-en="${i}"></canvas>
          <div class="n">${e.name}</div>
          <div class="r" style="color:${e.color}">${e.boss ? '👑 BOSS' : 'T' + e.tier}</div>
          <div class="e">${(e.flags || []).slice(0, 2).join(' ') || '-'}</div>
        </div>`).join('');
      host.querySelectorAll('[data-en]').forEach(cv => {
        const e = ENEMIES[+cv.dataset.en];
        const c = cv.getContext('2d');
        Draw.sprite(c, 52, 58, 30, e.def ? e.def.art : e.art, e.color, { t: performance.now() / 1000, shadow: false });
      });
    } else if (this.codexTab === 'syn') {
      host.className = '';
      let h = '<div style="font-size:11.5px;color:var(--dim);margin-bottom:8px">같은 클래스/원소 유닛을 모으면 발동한다.</div>';
      for (const k in SYNERGY.class) {
        h += `<div class="ach"><div class="ai" style="filter:none">${CLASSES[k].icon}</div><div>
          <div class="an">${CLASSES[k].name}</div><div class="ad">${SYNERGY.class[k].map(t =>
          `${t.n}기: ` + Object.keys(t).filter(x => x !== 'n').map(x => `${x} +${Math.round(t[x] * 100)}%`).join(', ')).join(' / ')}</div></div></div>`;
      }
      for (const k in SYNERGY.elem) {
        h += `<div class="ach"><div class="ai" style="filter:none;color:${ELEM[k].color}">${ELEM[k].icon}</div><div>
          <div class="an" style="color:${ELEM[k].color}">${ELEM[k].name}</div><div class="ad">${SYNERGY.elem[k].map(t =>
          `${t.n}기: ` + Object.keys(t).filter(x => x !== 'n').map(x => `${x} +${Math.round(t[x] * 100)}%`).join(', ')).join(' / ')}</div></div></div>`;
      }
      host.innerHTML = h;
    } else {
      host.className = 'codex-grid';
      host.innerHTML = UNITS.map((u, i) => {
        const r = RARITY[RARITY_IDX[u.rarity]];
        return `<div class="cx" style="border-color:${r.color}" title="${u.desc}">
          <canvas width="104" height="104" data-un="${i}"></canvas>
          <div class="n">${u.name}</div>
          <div class="r" style="color:${r.color}">${r.name}</div>
          <div class="e" style="color:${ELEM[u.elem].color}">${ELEM[u.elem].icon} ${CLASSES[u.cls].name}</div>
        </div>`;
      }).join('');
      host.querySelectorAll('[data-un]').forEach(cv => {
        const u = UNITS[+cv.dataset.un];
        this.drawPortrait(cv, u, 0);
      });
    }
  },

  /* --------------------------- 업적 */
  htmlAch() {
    const done = ACHIEVEMENTS.filter(a => Game.achieved[a.key]).length;
    return `<div style="font-size:12px;color:var(--dim);margin-bottom:8px">
      달성 ${done}/${ACHIEVEMENTS.length} · 보유 💎 ${Game.gems}</div>` +
      ACHIEVEMENTS.map(a => `<div class="ach ${Game.achieved[a.key] ? 'done' : ''}">
        <div class="ai">${a.icon}</div>
        <div><div class="an">${a.name}</div><div class="ad">${a.desc}</div></div>
        <div class="ag">💎${a.gem}</div>
      </div>`).join('');
  },

  /* --------------------------- 명예 강화 */
  htmlPerks() {
    return `<div style="font-size:12px;color:var(--dim);margin-bottom:8px">
      업적으로 얻은 💎로 영구 강화를 구매한다. 보유 💎 <b style="color:var(--cyan)">${Game.gems}</b></div>` +
      PERKS.map(p => {
        const lv = Game.perks[p.key] || 0;
        const max = lv >= p.max;
        const cost = p.cost * (lv + 1);
        const can = !max && Game.gems >= cost;
        return `<div class="perk">
          <div class="pi">${p.icon}</div>
          <div><div class="pn">${p.name} <span style="color:var(--blue);font-size:11px">Lv.${lv}/${p.max}</span></div>
          <div class="pd">${p.desc}</div></div>
          <button data-perk="${p.key}" class="${can ? '' : 'dis'}">${max ? 'MAX' : '💎' + cost}</button>
        </div>`;
      }).join('');
  },
  bindPerks() {
    $('modalBody').querySelectorAll('[data-perk]').forEach(b => b.onclick = () => {
      const p = PERKS.find(x => x.key === b.dataset.perk);
      const lv = Game.perks[p.key] || 0;
      if (lv >= p.max) return;
      const cost = p.cost * (lv + 1);
      if (Game.gems < cost) { SFX.play('error'); this.toast('젬이 부족하다', '#ff6b6b'); return; }
      Game.gems -= cost; Game.perks[p.key] = lv + 1;
      Game.saveMeta(); Game.refreshAll();
      SFX.play('upgrade'); this.renderModal(); this.refresh(); this.buildTitle();
    });
  },

  /* --------------------------- 설정 */
  htmlSettings() {
    const s = Game.settings;
    return `
      <div class="setrow"><span>🎵 배경음</span><div class="toggle ${s.music ? 'on' : ''}" data-t="music"></div></div>
      <div class="setrow"><span>🔊 효과음</span><div class="toggle ${s.sfx ? 'on' : ''}" data-t="sfx"></div></div>
      <div class="setrow"><span>🔈 볼륨</span><input type="range" id="volRange" min="0" max="100" value="${Math.round(SFX.volume * 100)}"></div>
      <div class="setrow"><span>✨ 파티클</span><div class="toggle ${s.particles ? 'on' : ''}" data-t="particles"></div></div>
      <div class="setrow"><span>🔢 대미지 숫자</span><div class="toggle ${s.damageNumbers ? 'on' : ''}" data-t="damageNumbers"></div></div>
      <div style="margin:12px 0 8px;font-size:11.5px;color:var(--dim)">
        조작: Q 소환 · W 자동합성 · E 웨이브 · R 속도 · Space 일시정지 · 1~8 스킬<br>
        유닛을 드래그해 이동/합성할 수 있다.</div>
      <button class="dangerbtn" id="btnWipe">모든 저장 데이터 삭제</button>`;
  },
  bindSettings() {
    $('modalBody').querySelectorAll('[data-t]').forEach(el => el.onclick = () => {
      const k = el.dataset.t;
      Game.settings[k] = !Game.settings[k];
      el.classList.toggle('on', Game.settings[k]);
      if (k === 'music') SFX.toggleMusic(Game.settings.music);
      if (k === 'sfx') SFX.enabled = Game.settings.sfx;
      if (k === 'particles') FX.max = Game.settings.particles ? 1400 : 120;
      Game.saveMeta(); SFX.play('click');
    });
    const vr = $('volRange');
    if (vr) vr.oninput = () => { SFX.init(); SFX.setVolume(vr.value / 100); };
    const w = $('btnWipe');
    if (w) w.onclick = () => {
      if (!confirm('정말 모든 진행도(젬·업적·명예강화)를 삭제할까?')) return;
      Store.wipe(); location.reload();
    };
  },

  /* --------------------------- 메뉴 */
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
    <button class="dangerbtn" id="btnGiveUp" style="margin-bottom:8px">이번 판 포기하고 타이틀로</button>
    <button class="tbtn" style="width:100%" id="btnResume">계속하기</button>`;
  },
  bindMenu() {
    const g = $('btnGiveUp');
    if (g) g.onclick = () => {
      if (!confirm('현재 진행도를 포기하고 타이틀로 돌아갈까?')) return;
      Game.mergeMetaStats(); Game.saveMeta();
      this.closeModal(); this.toTitle();
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
    const cv = $('rbCanvas'), c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    const g = c.createRadialGradient(90, 90, 6, 90, 90, 90);
    g.addColorStop(0, U.rgba(rar.color, .5)); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 180, 180);
    Draw.sprite(c, 90, 96, 52, def.art, ELEM[def.elem].color, { t: performance.now() / 1000, shadow: false });
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

  showGameOver(win) {
    const r = $('result');
    r.classList.remove('hidden');
    r.classList.toggle('win', win);
    $('resTitle').textContent = win ? 'VICTORY!' : 'GAME OVER';
    const s = Game.stats;
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
  },
};

window.UI = UI;
window.addEventListener('DOMContentLoaded', () => UI.boot());
