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
    if (window.Perf) Perf.init();
    if (window.Admin) Admin.init();
    this.refresh();
  },

  /* 소환 버튼을 누르고 있으면 계속 뽑힌다 — 매번 탭할 필요가 없다.
     길게 눌러 자동 소환이 돌아간 경우엔 손을 뗄 때의 click 을 삼킨다. */
  bindHoldSummon() {
    const btn = $('btnSummon');
    let timer = null, rep = null, fired = false;
    const stop = () => {
      clearTimeout(timer); clearInterval(rep); timer = rep = null;
      btn.classList.remove('holding');
    };
    const start = () => {
      if (timer || rep) return;
      fired = false;
      timer = setTimeout(() => {
        timer = null; fired = true;
        btn.classList.add('holding');
        SFX.init(); SFX.resume();
        let n = 0;
        rep = setInterval(() => {
          if (Game.over || Game.units.length >= Game.slotMax() ||
              (Game.gold < Game.summonCost() && !Game.freeSummons)) { stop(); return; }
          Game.summon();
          /* 오래 누를수록 살짝 빨라진다 */
          if (++n === 6 && rep) { clearInterval(rep); rep = setInterval(() => Game.summon(), 90); }
        }, 150);
      }, 420);
    };
    btn.addEventListener('pointerdown', start);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener('click', e => { if (fired) { fired = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  },

  bind() {
    $('btnSummon').onclick = () => { SFX.init(); SFX.resume(); Game.summon(); };
    $('btnSummon10').onclick = () => { SFX.init(); SFX.resume(); Game.summonMulti(10); };
    $('btnMerge').onclick = () => Game.autoMergeAll();
    $('btnWave').onclick = () => {
      if (!Game.waveActive) Game.startWave();
      else { Game.autoWave = !Game.autoWave; this.toast(Game.autoWave ? '자동 웨이브 ON' : '자동 웨이브 OFF', '#4ea8ff'); }
      this.refresh();
    };
    $('btnResearch').onclick = () => this.openModal('research');
    /* 메뉴 안에 묻지 않고 바로 열리는 버튼들 */
    $('btnSkills').onclick = () => this.openModal('skills');
    $('btnCodexIn').onclick = () => this.openModal('codex');
    $('btnToolsIn').onclick = () => this.openModal('tools');
    $('btnRouletteIn').onclick = () => { SFX.init(); SFX.resume(); Roulette.open(); };
    $('btnSpeed').onclick = () => Game.cycleSpeed();
    $('btnPause').onclick = () => { Game.paused = !Game.paused; this.refresh(); SFX.play('click'); };
    $('btnMenu').onclick = () => this.openModal('menu');
    this.bindHoldSummon();

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
    /* 장착한 스킬만 보여 준다 (전체 18종을 늘어놓으면 화면을 넘친다) */
    Game.activeSkills().forEach((s, i) => {
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
      /* 콤보가 오를수록 등급이 올라간다 — 색·크기·흔들림이 같이 커진다 */
      const tier = Game.combo >= 200 ? 4 : Game.combo >= 100 ? 3 : Game.combo >= 50 ? 2 : Game.combo >= 20 ? 1 : 0;
      if (cb.dataset.tier !== String(tier)) {
        cb.dataset.tier = tier;
        cb.classList.remove('t0', 't1', 't2', 't3', 't4');
        cb.classList.add('t' + tier);
        cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump');
      }
      /* 남은 콤보 시간 게이지 */
      cb.style.setProperty('--cbt', U.clamp(Game.comboTimer / 2.6, 0, 1));
    } else { cb.classList.add('hidden'); cb.dataset.tier = ''; }

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
      const dropped = this.lastLife >= 0 && Game.life < this.lastLife;
      $('vLife').textContent = Math.max(0, Game.life) + '/' + Game.maxLife;
      const pct = Game.life / Game.maxLife;
      $('statLife').classList.toggle('low', pct < .35);
      if (dropped) this.hitVignette(pct);
      $('vign').classList.toggle('danger', pct > 0 && pct <= .25);
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

    const cost10 = Game.summonCostN(10);
    $('summon10Cost').textContent = cost10 <= 0 ? '무료!' : U.fmt(cost10) + 'G';
    $('btnSummon10').classList.toggle('dis', Game.gold < cost10 || Game.units.length >= Game.slotMax());
    $('btnSummon10').classList.toggle('glow', Game.gold >= cost10 * 1.5);
    const counts = {};
    for (const u of Game.units) { const k = u.key + '_' + u.star; counts[k] = (counts[k] || 0) + 1; }
    let pairs = 0;
    for (const k in counts) pairs += Math.floor(counts[k] / 3);
    $('mergeCount').textContent = pairs + '쌍';
    $('btnMerge').classList.toggle('glow', pairs > 0);
    $('btnMerge').classList.toggle('dis', pairs === 0);
    this.refreshDots();
  },

  /* 퀵 버튼 위의 빨간 알림 점 — 지금 눌러야 이득인 버튼을 알려준다 */
  refreshDots() {
    const dr = $('dotResearch');
    if (dr) {
      const can = RESEARCH.some(r => Game.research[r.key] < r.max && Game.gold >= Game.researchCost(r.key));
      dr.classList.toggle('hidden', !can);
    }
    const dq = $('dotRoulette');
    if (dq) dq.classList.toggle('hidden', !(window.Roulette && !Roulette.freeUsed()));
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
    $('btnSpeed').querySelector('.tn').textContent = 'x' + Game.speed;
    $('btnPause').querySelector('.ti').textContent = Game.paused ? '▶' : '⏸';
    $('btnPause').querySelector('.tn').textContent = Game.paused ? '재개' : '정지';

    this.refreshSynergy();
    /* 이미 열려 있는 패널의 수치만 갱신한다.
       selected 만 보고 열어버리면 스킬 사용·소환처럼 refresh 를 부르는 모든 행동이
       유닛 패널을 제멋대로 띄운다 (스킬 버튼을 눌렀는데 유닛창이 뜨던 원인). */
    if (this.panelOpen && Game.selected) this.showUnitPanel(Game.selected, true);
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
  /**
   * 유닛 상세 패널.
   * @param u        표시할 유닛 (null 이면 닫는다)
   * @param refresh  true 면 "이미 열려 있는 패널의 수치 갱신"이라는 뜻.
   *                 열려 있지 않으면 아무것도 하지 않는다.
   *
   * 패널이 열려 있는지를 Game.selected 로 판단하면, 선택만 남아 있어도
   * refresh 를 부르는 모든 행동(스킬·소환·웨이브 시작…)이 패널을 멋대로
   * 띄운다. 그래서 열림 여부를 panelOpen 플래그로 따로 관리한다.
   */
  panelOpen: false,
  showUnitPanel(u, refresh) {
    const p = $('unitPanel');
    if (!u) { p.classList.add('hidden'); this.panelOpen = false; Game.selected = null; return; }
    if (refresh && !this.panelOpen) return;
    p.classList.remove('hidden');
    this.panelOpen = true;
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
      { k: 'skills', n: '✨ 스킬' },
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
      case 'skills': $('modalTitle').textContent = '스킬 장착'; body.innerHTML = this.htmlSkills(); this.bindSkills(); break;
      case 'tools': $('modalTitle').textContent = '전투 도구'; body.innerHTML = this.htmlTools(); this.bindTools(); break;
      case 'menu': $('modalTitle').textContent = '메뉴'; body.innerHTML = this.htmlMenu(); this.bindMenu(); break;
    }
  },

  /* ------------------------------------------------------ 스킬 장착 */
  htmlSkills() {
    const eq = Game.activeSkills().map(s => s.key);
    const n = eq.length, max = Game.LOADOUT_SIZE;
    const card = (s) => {
      const on = eq.includes(s.key);
      const idx = eq.indexOf(s.key);
      return `<button class="sk-card ${on ? 'on' : ''}" data-sk="${s.key}" style="--c:${s.color}">
        ${on ? `<i class="sk-slot">${idx + 1}</i>` : ''}
        <span class="sk-ico">${s.icon}</span>
        <span class="sk-n">${s.name}</span>
        <span class="sk-m">마나 ${s.mana} · 쿨 ${s.cd}s</span>
        <span class="sk-d">${s.desc}</span>
      </button>`;
    };
    return `<div class="p-note">전투에 가져갈 스킬을 <b>${max}개</b>까지 고른다.
      지금 ${n}/${max} 장착. 연계는 4.5초 안에 이어 쓸 때 배수가 붙으니, 원소 궁합을 노려 짜 보라.</div>
      <div class="sk-grid">${SKILLS.map(card).join('')}</div>`;
  },
  bindSkills() {
    $('modalBody').querySelectorAll('[data-sk]').forEach(b => {
      b.onclick = () => {
        const ok = Game.toggleSkill(b.dataset.sk);
        if (!ok) { SFX.play('error'); this.toast(`최대 ${Game.LOADOUT_SIZE}개까지 장착할 수 있다`, '#ff6b6b'); return; }
        SFX.play('tab');
        this.buildSkillBar();
        this.renderModal();
      };
    });
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
      ${this.htmlBlessList()}
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
  /** 도구 패널에 이번 판의 축복을 자세히 펼쳐 준다 */
  htmlBlessList() {
    if (!window.Bless) return '';
    const list = Bless.summary(Game);
    const next = Bless.EVERY - (Game.wave % Bless.EVERY);
    if (!list.length) {
      return `<div class="synsec">이 판의 축복</div>
        <div class="p-note">아직 없다. ${Bless.EVERY}웨이브마다 3장 중 1장을 고른다 —
          다음 축복까지 <b style="color:#ffd24d">${next}웨이브</b>.</div>`;
    }
    return `<div class="synsec">이 판의 축복 · ${list.length}종 (다음까지 ${next}웨이브)</div>
      <div class="bl-rows">` + list.map(({ b, n }) => {
      const t = BLESS_TIER[b.t];
      return `<div class="bl-row" style="--c:${t.col}">
        <span class="blr-i">${b.i}</span>
        <span class="blr-n">${b.n}${n > 1 ? ` <em>×${n}</em>` : ''}</span>
        <span class="blr-d">${b.d}</span>
      </div>`;
    }).join('') + '</div>';
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
  /* 적을 놓쳤을 때 화면 가장자리가 붉게 번쩍 — 남은 목숨이 적을수록 진하다 */
  hitVignette(pct) {
    const v = $('vign');
    if (!v) return;
    v.style.setProperty('--vi', (0.5 + (1 - U.clamp(pct, 0, 1)) * 0.5).toFixed(2));
    v.classList.remove('hit'); void v.offsetWidth; v.classList.add('hit');
  },

  toast(msg, color) {
    const box = $('toasts');
    /* 같은 내용이 연달아 오면 새 줄을 쌓지 말고 ×N 으로 묶는다 */
    const last = box.lastElementChild;
    if (last && last.dataset.msg === msg) {
      const n = (+last.dataset.n || 1) + 1;
      last.dataset.n = n;
      last.textContent = msg + ' ×' + n;
      last.classList.remove('again'); void last.offsetWidth; last.classList.add('again');
      clearTimeout(last._t); last._t = setTimeout(() => last.remove(), 1900);
      return;
    }
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg; t.dataset.msg = msg;
    t.style.color = color || '#e8eefb';
    box.appendChild(t);
    /* 화면을 다 덮지 않도록 최대 3줄만 남긴다 */
    while (box.children.length > 3) box.firstElementChild.remove();
    t._t = setTimeout(() => t.remove(), 1900);
  },

  bossBanner(w) {
    const b = $('banner');
    b.classList.remove('hidden');
    b.innerHTML = `<div class="bt">⚠ BOSS WAVE ${w} ⚠<span class="bs">강력한 적이 접근한다</span></div>`;
    setTimeout(() => b.classList.add('hidden'), 2500);
  },

  /** 등급별 태그 — 높을수록 화면을 더 세게 흔든다 (운빨겜 스타일) */
  RARITY_TAGS: { 2: '오오!', 3: 'GREAT!!', 4: 'LEGENDARY!!', 5: 'MYTHIC!!!', 6: 'ULTIMATE!!!!', 7: '대박!!!!!' },

  _rbToken: 0,
  rarityBanner(def, rar, opt) {
    opt = opt || {};
    const ri = RARITY_IDX[rar.key];
    const b = $('rarityBanner');
    /* 세대 토큰 : 오래된 hide 타이머가 뒤늦게 발동해도(레이스 컨디션) 최신 배너를
       실수로 숨기지 않도록 막는다. clearTimeout만으로는 타이밍이 어긋나는 경우를
       완전히 막지 못했던 실사용 버그(전설/신화 등급이 하이라이트 안 뜸)의 근본 수정. */
    const token = ++this._rbToken;
    clearTimeout(this._rbT);
    b.classList.remove('hidden');
    b.className = 'rarity-banner tier-' + ri;
    b.style.color = rar.color;
    $('rbRare').textContent = rar.name.toUpperCase();
    $('rbRare').style.color = rar.color;
    $('rbName').textContent = (opt.prefix || '') + def.name;
    $('rbTag').textContent = this.RARITY_TAGS[ri] || '';
    $('rbTag').style.color = rar.color;
    Draw.portraitUnit($('rbCanvas'), def, 0, { scale: .3 });
    this.spawnConfetti(ri, rar.color);
    const dur = 1500 + ri * 260;
    this._rbT = setTimeout(() => {
      if (this._rbToken !== token) return;   // 이미 다음 배너로 교체됨 — 이 타이머는 무시
      b.classList.add('hidden');
      $('rbConfetti').innerHTML = '';
    }, dur);
  },

  /** DOM 컨페티 — 등급이 높을수록 화면을 가득 채운다 */
  spawnConfetti(ri, color) {
    const host = $('rbConfetti');
    host.innerHTML = '';
    if (ri < 3) return;
    const n = Math.min(60, 10 + ri * 8);
    const shapes = ['★', '✦', '●', '♦'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'confetti-bit';
      s.textContent = U.pick(shapes);
      s.style.left = U.rand(0, 100) + 'vw';
      s.style.color = Math.random() < .5 ? color : '#ffe9a0';
      s.style.fontSize = U.rand(10, 22) + 'px';
      s.style.animationDelay = U.rand(0, .5) + 's';
      s.style.animationDuration = U.rand(1.1, 2.0) + 's';
      host.appendChild(s);
    }
  },

  /** 운빨존많겜식 N연 소환 결과 팝업 */
  multiPullBanner(results) {
    const overlay = $('multiPull');
    overlay.classList.remove('hidden');
    const sorted = results.slice().sort((a, b) => b.ri - a.ri);
    const best = sorted[0];
    $('mpTitle').textContent = `${results.length}연 소환 결과`;
    const grid = $('mpGrid');
    grid.innerHTML = results.map((r, i) => {
      const rar = RARITY[r.ri];
      const isBest = r === best && r.ri >= 2;
      return `<div class="mp-card ${isBest ? 'best' : ''}" style="--d:${i * 65}ms; border-color:${rar.color}">
        <canvas width="100" height="100" data-mp="${i}"></canvas>
        <div class="mp-n" style="color:${rar.color}">${r.isNew ? '✨' : ''}${r.def.name}</div>
        <div class="mp-r" style="color:${rar.color}">${rar.name}${r.unit.star > 1 ? ' ' + '★'.repeat(r.unit.star) : ''}</div>
      </div>`;
    }).join('');
    grid.querySelectorAll('[data-mp]').forEach(cv => {
      const r = results[+cv.dataset.mp];
      Draw.portraitUnit(cv, r.def, 0);
    });
    const closeFn = () => overlay.classList.add('hidden');
    $('mpClose').onclick = closeFn;
    $('mpOk').onclick = closeFn;

    const counts = {};
    for (const r of results) counts[r.ri] = (counts[r.ri] || 0) + 1;
    const summary = Object.keys(counts).sort((a, b) => b - a)
      .map(ri => `${RARITY[ri].name} ×${counts[ri]}`).join(' · ');
    this.toast(summary, RARITY[best.ri].color);

    /* 최고 등급 하이라이트를 잠시 뒤 큰 배너로 한 번 더 터뜨린다 */
    if (best.ri >= 3) {
      SFX.play(best.ri >= 5 ? 'mythic' : 'legendary');
      setTimeout(() => this.rarityBanner(best.def, RARITY[best.ri], { prefix: '★ 최고 등급 ★  ' }), 380);
      if (best.ri >= 5) { FX.flash(RARITY[best.ri].color, .5); FX.shake(12); }
    } else {
      SFX.play('summon');
    }
  },

  _apToken: 0,
  achievementPopup(a) {
    const p = $('achPop');
    const token = ++this._apToken;
    clearTimeout(this._apT);
    p.classList.remove('hidden');
    $('apIco').textContent = a.icon;
    $('apTitle').textContent = '업적 달성 · ' + a.name;
    $('apDesc').textContent = a.desc;
    $('apGem').textContent = '💎 +' + a.gem;
    this._apT = setTimeout(() => {
      if (this._apToken !== token) return;
      p.classList.add('hidden');
    }, 3200);
  },

  /* ------------------------------------------------------ 이벤트 */
  onRunStart() {
    this.lastGold = -1; this.lastLife = -1;
    $('vign').classList.remove('danger', 'hit');
    this.refreshBlessStrip();
    this.refresh();
  },

  /* 이번 판에 모은 축복을 HUD 아래 작은 띠로 보여 준다 */
  refreshBlessStrip() {
    const el = $('blessStrip');
    if (!el || !window.Bless) return;
    const list = Bless.summary(Game);
    if (!list.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    el.classList.remove('hidden');
    el.innerHTML = list.map(({ b, n }) => {
      const t = BLESS_TIER[b.t];
      return `<span class="bl-chip" style="--c:${t.col}" title="${b.n} — ${b.d}">${b.i}${n > 1 ? `<b>${n}</b>` : ''}</span>`;
    }).join('');
  },
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
    /* 이번 판에 골랐던 축복을 회고 — 어떤 빌드였는지가 곧 그 판의 이야기다 */
    const rb = $('resBless');
    if (rb) {
      const list = window.Bless ? Bless.summary(Game) : [];
      rb.innerHTML = list.length
        ? `<h4>이 판의 축복 ${list.length}종</h4><div class="rb-list">` + list.map(({ b, n }) => {
            const t = BLESS_TIER[b.t];
            return `<span class="bl-chip lg" style="--c:${t.col}">${b.i}<em>${b.n}</em>${n > 1 ? `<b>${n}</b>` : ''}</span>`;
          }).join('') + '</div>'
        : '';
    }
    if (win) this.toast('다음 맵이 해금되었다!', '#ffd24d');
    if (res && res.levels) { FX.flash('#ffd24d', .4); SFX.play('legendary'); }
  },
};

window.UI = UI;
window.addEventListener('DOMContentLoaded', () => UI.boot());
