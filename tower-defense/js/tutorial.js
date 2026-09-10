/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  tutorial.js
 *  최초 플레이 시 단계별 안내 오버레이
 * ========================================================================= */
'use strict';

const Tutorial = {
  KEY: 'itd_tutorial_done',
  active: false,
  step: 0,
  el: null,

  STEPS: [
    {
      target: '#btnSummon',
      title: '① 유닛 소환',
      text: '골드를 써서 무작위 유닛을 소환한다. 등급이 높을수록 강하다.\n소환은 무작위 — 운이 곧 힘이다!',
      cond: () => Game.units.length >= 1,
      hint: '소환 버튼을 눌러 유닛 1기를 배치하라.',
    },
    {
      target: '#btnMerge',
      title: '② 합성',
      text: '같은 유닛 3기를 모으면 합성해 성급이 오른다.\n3성 3기를 합치면 다음 등급의 새 유닛으로 승급한다!',
      cond: () => Game.stats.merges >= 1 || Game.units.length >= 6,
      hint: '유닛을 더 모으고 자동합성을 눌러보라.',
    },
    {
      target: '#btnWave',
      title: '③ 웨이브',
      text: '적이 경로를 따라 몰려온다. 끝에 도달하면 생명이 줄어든다.\n자동 웨이브를 끄면 준비할 시간을 벌 수 있다.',
      cond: () => Game.wave >= 1,
      hint: '웨이브를 시작하라.',
    },
    {
      target: '#skillBar',
      title: '④ 스킬',
      text: '마나를 모아 강력한 액티브 스킬을 쓴다.\n메테오·뇌우·섬멸 등 14종이 있다. 위기에서 판을 뒤집어라.',
      cond: () => Game.stats.skillUses >= 1 || Game.wave >= 3,
      hint: '마나가 차면 스킬을 써보라.',
    },
    {
      target: '#btnResearch',
      title: '⑤ 연구',
      text: '남는 골드로 공격력·공속·사거리·행운 등을 강화한다.\n연구는 이번 판에만 적용된다.',
      cond: () => Game.wave >= 4,
      hint: '연구소를 열어 강화를 구매하라.',
    },
    {
      target: '#synPanel',
      title: '⑥ 시너지',
      text: '같은 클래스/원소 유닛을 모으면 자동으로 시너지가 발동한다.\n왼쪽 목록이 금색이면 활성화된 것이다.',
      cond: () => Game.wave >= 6,
      hint: '유닛을 모아 시너지를 켜보라.',
    },
    {
      target: '#blessStrip',
      title: '⑦ 축복',
      text: '3웨이브를 넘길 때마다 축복 3장 중 1장을 고른다.\n이번 판이 끝날 때까지 유지되니, 무엇을 고르느냐가 곧 이번 판의 빌드다.\n위험을 감수하는 계약 카드도 섞여 있다.',
      cond: () => Game.wave >= 9,
      hint: '웨이브를 넘기고 축복을 골라 보라.',
    },
    {
      target: '#hud',
      title: '⑧ 보물 적',
      text: '가끔 금빛 후광을 두른 보물 적이 섞여 나온다.\n아주 빠르지만 약하다 — 도망치기 전에 잡으면 골드와 젬이 쏟아진다.\n놓쳐도 생명은 깎이지 않으니 마음껏 노려라.',
      cond: () => Game.wave >= 12,
      hint: '💰 표시가 뜨면 그쪽으로 화력을 모아라.',
    },
  ],

  isDone() {
    try { return localStorage.getItem(this.KEY) === '1'; } catch (e) { return true; }
  },
  markDone() {
    try { localStorage.setItem(this.KEY, '1'); } catch (e) { }
    this.active = false;
    this.hide();
  },

  start(force) {
    if (!force && this.isDone()) return;
    this.active = true;
    this.step = 0;
    this.build();
    this.show();
  },

  build() {
    if (this.el) return;
    const d = document.createElement('div');
    d.id = 'tutorial';
    d.className = 'tut hidden';
    d.innerHTML = `
      <div class="tut-box">
        <div class="tut-step" id="tutStep"></div>
        <div class="tut-title" id="tutTitle"></div>
        <div class="tut-text" id="tutText"></div>
        <div class="tut-hint" id="tutHint"></div>
        <div class="tut-btns">
          <button class="tut-skip" id="tutSkip">건너뛰기</button>
          <button class="tut-next" id="tutNext">알겠다</button>
        </div>
      </div>
      <div class="tut-ring" id="tutRing"></div>`;
    document.body.appendChild(d);
    this.el = d;
    document.getElementById('tutSkip').onclick = () => { SFX.play('click'); this.markDone(); };
    document.getElementById('tutNext').onclick = () => { SFX.play('click'); this.next(); };
  },

  show() { if (this.el) this.el.classList.remove('hidden'); this.render(); },
  hide() { if (this.el) this.el.classList.add('hidden'); },

  next() {
    this.step++;
    if (this.step >= this.STEPS.length) { this.markDone(); return; }
    this.render();
  },

  render() {
    if (!this.active || !this.el) return;
    const s = this.STEPS[this.step];
    if (!s) { this.markDone(); return; }
    document.getElementById('tutStep').textContent = `${this.step + 1} / ${this.STEPS.length}`;
    document.getElementById('tutTitle').textContent = s.title;
    document.getElementById('tutText').textContent = s.text;
    document.getElementById('tutHint').textContent = '👉 ' + s.hint;
    /* 하이라이트 링 위치 */
    const ring = document.getElementById('tutRing');
    const t = document.querySelector(s.target);
    if (t && t.offsetParent !== null) {
      const r = t.getBoundingClientRect();
      ring.style.display = 'block';
      ring.style.left = (r.left - 8) + 'px';
      ring.style.top = (r.top - 8) + 'px';
      ring.style.width = (r.width + 16) + 'px';
      ring.style.height = (r.height + 16) + 'px';
    } else ring.style.display = 'none';
  },

  /** 매 프레임 조건 체크 : 조건 만족 시 자동 진행 */
  tick() {
    if (!this.active || !this.el || this.el.classList.contains('hidden')) return;
    const s = this.STEPS[this.step];
    if (!s) return;
    if (s.cond && s.cond()) {
      this.step++;
      if (this.step >= this.STEPS.length) { this.markDone(); return; }
      SFX.play('unlock');
      this.render();
    } else if (this._reposition-- <= 0) {
      this._reposition = 20;
      this.render();
    }
  },
  _reposition: 20,
};

window.Tutorial = Tutorial;
