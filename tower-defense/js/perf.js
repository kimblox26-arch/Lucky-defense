/* =========================================================================
 *  성능 패널 — FPS · 핑 · 플레이 타이머 + 최적화(품질) 설정
 *
 *  렉이 걸릴 때 뭘 끄면 되는지 플레이어가 직접 고를 수 있어야 한다.
 *  품질 단계를 낮추면 무거운 연출부터 순서대로 꺼진다.
 * ========================================================================= */
'use strict';

const Perf = {
  el: null, fpsEl: null, pingEl: null, timeEl: null,
  show: true,

  /* --- FPS --- */
  _frames: 0, _last: 0, fps: 60, _acc: 0,
  /* --- 핑 --- */
  ping: 0, _pingTimer: 0,
  /* --- 플레이 시간 --- */
  playStart: 0, playSec: 0,

  /**
   * 품질 단계
   *  3 = 최고 (모든 연출)
   *  2 = 높음 (파티클 소폭 감소)
   *  1 = 보통 (그림자/오라/날씨 축소)
   *  0 = 최저 (연출 최소, 프레임 우선)
   */
  quality: 3,
  QUALITY_NAME: ['최저', '보통', '높음', '최고'],

  init() {
    this.playStart = performance.now();
    this._last = performance.now();
    this.build();
    this.load();
    this.measurePing();
    setInterval(() => this.measurePing(), 15000);
  },

  build() {
    const el = document.createElement('div');
    el.id = 'perfHud';
    el.innerHTML =
      '<span class="pf-i" id="pfFps">-- FPS</span>' +
      '<span class="pf-sep"></span>' +
      '<span class="pf-i" id="pfPing">-- ms</span>' +
      '<span class="pf-sep"></span>' +
      '<span class="pf-i" id="pfTime">00:00</span>' +
      '<button class="pf-btn" id="pfOpt" title="최적화 · 품질 단계">⚡</button>';
    /* 화면 위에 띄우면 하단 버튼을 덮는다. 상단 HUD 줄 안에 넣어
       레이아웃을 따라가게 하면 어떤 화면 크기에서도 겹치지 않는다. */
    const row = document.querySelector('.hud-row2');
    (row || document.body).appendChild(el);
    this.el = el;
    this.fpsEl = document.getElementById('pfFps');
    this.pingEl = document.getElementById('pfPing');
    this.timeEl = document.getElementById('pfTime');
    document.getElementById('pfOpt').onclick = (e) => { e.stopPropagation(); this.cycleQuality(); };
  },

  /** 매 프레임 호출 */
  tick(dt) {
    this._frames++;
    const now = performance.now();
    if (now - this._last >= 500) {
      this.fps = Math.round(this._frames * 1000 / (now - this._last));
      this._frames = 0; this._last = now;
      if (this.fpsEl) {
        this.fpsEl.textContent = this.fps + ' FPS';
        this.fpsEl.className = 'pf-i ' + (this.fps >= 50 ? 'good' : this.fps >= 30 ? 'mid' : 'bad');
      }
      /* 자동 최적화 : 오래 낮은 프레임이면 품질을 한 단계 내린다 */
      if (this.auto && this.fps < 28 && this.quality > 0) {
        this._lowStreak = (this._lowStreak || 0) + 1;
        if (this._lowStreak >= 4) { this._lowStreak = 0; this.setQuality(this.quality - 1, true); }
      } else this._lowStreak = 0;
    }
    /* 플레이 시간 */
    this.playSec = (now - this.playStart) / 1000;
    if (this.timeEl) {
      const s = Math.floor(this.playSec);
      const m = Math.floor(s / 60), ss = s % 60;
      const h = Math.floor(m / 60);
      this.timeEl.textContent = (h ? h + ':' + String(m % 60).padStart(2, '0') : m)
        + ':' + String(ss).padStart(2, '0');
    }
  },

  /**
   * 핑 측정.
   * 이 게임은 서버가 없어서 왕복할 상대가 없다. 대신 자기 자신(현재 페이지)에
   * 캐시를 무시한 요청을 보내 네트워크 왕복 시간을 잰다. 오프라인이면 '--'.
   */
  measurePing() {
    /* file:// 로 직접 연 경우엔 fetch 가 막힌다 — 오프라인이 아니라 "로컬" 이다 */
    if (location.protocol === 'file:') {
      if (this.pingEl) { this.pingEl.textContent = '로컬'; this.pingEl.className = 'pf-i'; }
      return;
    }
    const t0 = performance.now();
    fetch(location.href, { method: 'HEAD', cache: 'no-store' })
      .then(() => {
        this.ping = Math.round(performance.now() - t0);
        if (this.pingEl) {
          this.pingEl.textContent = this.ping + ' ms';
          this.pingEl.className = 'pf-i ' + (this.ping < 80 ? 'good' : this.ping < 200 ? 'mid' : 'bad');
        }
      })
      .catch(() => { if (this.pingEl) { this.pingEl.textContent = '오프라인'; this.pingEl.className = 'pf-i bad'; } });
  },

  cycleQuality() {
    this.setQuality(this.quality >= 3 ? 0 : this.quality + 1);
    SFX.play('tab');
  },

  setQuality(q, auto) {
    this.quality = U.clamp(q, 0, 3);
    this.apply();
    this.save();
    if (window.UI && UI.toast) {
      UI.toast((auto ? '자동 최적화 · ' : '품질 ') + this.QUALITY_NAME[this.quality],
        auto ? '#ffcf3f' : '#8fe0ff');
    }
  },

  /** 품질 단계를 실제 렌더 설정에 반영 */
  apply() {
    const q = this.quality;
    /* 파티클 총량 */
    if (window.FX) FX.budget = [.3, .55, .8, 1][q];
    /* 캐릭터 외곽선 : 최저에서는 끈다 */
    if (window.GFX) GFX.outlineBudget = q >= 1;
    /* 날씨 입자 */
    if (window.GFX) GFX.weatherBudget = [0, .4, .7, 1][q];
    /* 그림자·오라 */
    if (window.GFX) GFX.fancyBudget = q >= 2;
    /* 화면 흔들림은 최저에서 절반 */
    if (window.FX) FX.shakeScale = q === 0 ? .4 : 1;
    const b = document.getElementById('pfOpt');
    if (b) b.textContent = ['🐢', '🚶', '🏃', '⚡'][q];
  },

  save() {
    try {
      localStorage.setItem('itd_perf', JSON.stringify({ q: this.quality, auto: this.auto !== false, show: this.show }));
    } catch (e) { /* 저장 불가여도 게임은 계속된다 */ }
  },
  load() {
    let o = null;
    try { o = JSON.parse(localStorage.getItem('itd_perf') || 'null'); } catch (e) { o = null; }
    this.quality = o && typeof o.q === 'number' ? o.q : 3;
    this.auto = !o || o.auto !== false;
    this.show = !o || o.show !== false;
    this.apply();
    this.setVisible(this.show);
  },

  setVisible(v) {
    this.show = v;
    if (this.el) this.el.classList.toggle('hidden', !v);
    this.save();
  },
};

window.Perf = Perf;
