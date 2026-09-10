/* =========================================================================
 *  관리자 모드 — 개발/디버그용 치트 패널
 *
 *  일반 플레이어가 실수로 켜지 않도록 두 가지 경로로만 연다.
 *    · 키보드 : ` (백틱) 또는 F9
 *    · 모바일 : 상단 웨이브 표시를 2초 안에 7번 탭
 *  켜져 있는 동안에는 화면 우상단에 배지가 떠서, 치트 상태에서 낸 기록을
 *  정상 기록으로 착각하지 않게 한다.
 * ========================================================================= */
const Admin = {
  on: false,
  el: null,
  godMode: false,
  _taps: [],

  init() {
    window.addEventListener('keydown', (e) => {
      if (e.key === '`' || e.key === 'F9') { e.preventDefault(); this.toggle(); }
    });
    const wave = document.getElementById('statWave');
    if (wave) {
      wave.addEventListener('click', () => {
        const now = Date.now();
        this._taps = this._taps.filter(t => now - t < 2000);
        this._taps.push(now);
        if (this._taps.length >= 7) { this._taps = []; this.toggle(); }
      });
    }
  },

  toggle() { this.on ? this.close() : this.open(); },

  close() {
    this.on = false;
    if (this.el) { this.el.remove(); this.el = null; }
    this._badge(false);
  },

  _badge(show) {
    let b = document.getElementById('adminBadge');
    if (!show) { if (b) b.remove(); return; }
    if (b) return;
    b = document.createElement('div');
    b.id = 'adminBadge';
    b.textContent = '관리자 모드';
    b.style.cssText = 'position:fixed;top:6px;right:6px;z-index:9998;background:#e04a5a;' +
      'color:#fff;font:700 11px system-ui;padding:4px 9px;border-radius:999px;' +
      'box-shadow:0 2px 8px rgba(0,0,0,.5);pointer-events:none';
    document.body.appendChild(b);
  },

  /* 버튼 한 줄 만들기 */
  _btn(label, fn, col) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'flex:1 1 auto;min-width:92px;padding:9px 8px;border-radius:12px;' +
      'border:2px solid rgba(255,255,255,.16);background:' + (col || '#2c3550') + ';' +
      'color:#eaf0ff;font:700 12px system-ui;cursor:pointer';
    b.onclick = (e) => { e.stopPropagation(); fn(); this.refresh(); };
    return b;
  },
  _row(...els) {
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px';
    for (const e of els) d.appendChild(e);
    return d;
  },
  _label(t) {
    const d = document.createElement('div');
    d.textContent = t;
    d.style.cssText = 'color:#8fa8cc;font:700 11px system-ui;margin:8px 0 4px';
    return d;
  },

  open() {
    this.on = true;
    this._badge(true);
    const el = document.createElement('div');
    this.el = el;
    el.id = 'adminPanel';
    el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);' +
      'z-index:9999;width:min(400px,94vw);max-height:86vh;overflow:auto;' +
      'background:#141a26;border:3px solid #e04a5a;border-radius:18px;padding:14px;' +
      'box-shadow:0 18px 48px rgba(0,0,0,.6)';

    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';
    const h = document.createElement('b');
    h.textContent = '관리자 모드';
    h.style.cssText = 'color:#ff8a96;font:800 16px system-ui';
    const x = document.createElement('button');
    x.textContent = '✕';
    x.style.cssText = 'background:none;border:none;color:#8fa8cc;font-size:19px;cursor:pointer';
    x.onclick = () => this.close();
    head.append(h, x);
    el.appendChild(head);

    const info = document.createElement('div');
    info.id = 'adminInfo';
    info.style.cssText = 'color:#9fb0cc;font:600 11px/1.6 system-ui;background:#0e131d;' +
      'padding:8px 10px;border-radius:10px;margin-bottom:8px;white-space:pre-wrap';
    el.appendChild(info);

    const G = window.Game;

    el.appendChild(this._label('재화'));
    el.appendChild(this._row(
      this._btn('골드 +10만', () => G.addGold(100000)),
      this._btn('골드 +1000만', () => G.addGold(10000000)),
      this._btn('젬 +500', () => { G.gems = (G.gems || 0) + 500; G.saveMeta && G.saveMeta(); }),
    ));

    el.appendChild(this._label('웨이브'));
    el.appendChild(this._row(
      this._btn('다음 웨이브', () => { if (!G.waveActive) G.startWave(); }),
      this._btn('+10 웨이브', () => { G.wave += 10; }),
      this._btn('적 전멸', () => {
        for (const e of G.enemies) if (!e.dead) e.die ? e.die() : (e.dead = true);
      }, '#4a2c3c'),
    ));

    el.appendChild(this._label('소환'));
    const rr = document.createElement('div');
    rr.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap;margin-bottom:7px';
    for (const r of RARITY) {
      const b = this._btn(r.name, () => this.grant(r.key), '#20283c');
      b.style.borderColor = r.color;
      b.style.color = r.color;
      b.style.minWidth = '62px';
      rr.appendChild(b);
    }
    el.appendChild(rr);
    el.appendChild(this._row(
      this._btn('10연 소환', () => { G.gold += 9e9; G.summonMulti && G.summonMulti(10); }),
      this._btn('전부 3성으로', () => { for (const u of G.units) { u.star = 3; u.refresh(); } }),
      this._btn('유닛 전멸', () => { G.units.length = 0; G.refreshAll && G.refreshAll(); }, '#4a2c3c'),
    ));

    el.appendChild(this._label('치트'));
    el.appendChild(this._row(
      this._btn('무적 전환', () => { this.godMode = !this.godMode; }),
      this._btn('마나 최대', () => { G.mana = G.maxMana; }),
      this._btn('스킬 쿨 초기화', () => { for (const k in G.skillCd) G.skillCd[k] = 0; }),
    ));
    el.appendChild(this._row(
      this._btn('연구 전부 최대', () => {
        for (const r of RESEARCH) G.research[r.key] = r.max;
        G.refreshAll && G.refreshAll();
      }),
      this._btn('맵 전부 해금', () => {
        for (const m of MAPS) G.unlockedMaps[m.key] = 1;
        G.saveMeta && G.saveMeta();
      }),
      this._btn('배속 x' + ((G.speed || 1) >= 4 ? 1 : (G.speed || 1) * 2),
        () => { G.speed = (G.speed || 1) >= 4 ? 1 : (G.speed || 1) * 2; }),
    ));

    el.appendChild(this._label('그래픽'));
    el.appendChild(this._row(
      this._btn('픽셀모드 전환', () => {
        GFX.PIXEL.on = !GFX.PIXEL.on;
        GFX.clearCache();
        UI && UI.toast && UI.toast('픽셀 모드 ' + (GFX.PIXEL.on ? 'ON' : 'OFF'), '#8fe0ff');
      }),
      this._btn('도트 크기 ' + GFX.PIXEL.scale, () => {
        GFX.PIXEL.scale = GFX.PIXEL.scale >= 4 ? 2 : GFX.PIXEL.scale + 1;
        GFX.clearCache();
      }),
      this._btn('색 단계 ' + GFX.PIXEL.levels, () => {
        GFX.PIXEL.levels = GFX.PIXEL.levels >= 12 ? 4 : GFX.PIXEL.levels + 2;
        GFX.clearCache();
      }),
    ));

    el.appendChild(this._label('도감 / 저장'));
    el.appendChild(this._row(
      this._btn('도감 전부 수집', () => {
        for (const u of UNITS) G.collection[u.key] = 1;
        G.saveMeta && G.saveMeta();
      }),
      this._btn('저장 초기화', () => {
        if (confirm('저장 데이터를 모두 지웁니다. 계속할까요?')) {
          localStorage.clear(); location.reload();
        }
      }, '#5a2430'),
    ));

    document.body.appendChild(el);
    this.refresh();
  },

  /** 특정 등급 유닛을 하나 지급 */
  grant(rarityKey) {
    const G = window.Game;
    const pool = UNITS_BY_RARITY[rarityKey];
    if (!pool || !pool.length) return;
    const def = U.pick(pool);
    const spot = G.freeSpot ? G.freeSpot() : null;
    if (G.units.length >= G.slotMax()) { UI && UI.toast && UI.toast('자리가 없다', '#ff6b6b'); return; }
    /* 빈 칸 찾기 */
    let gx = -1, gy = -1;
    for (let y = 0; y < G.gh && gx < 0; y++) for (let x = 0; x < G.gw; x++) {
      if (!G.isPath(x, y) && !G.unitAt(x, y)) { gx = x; gy = y; break; }
    }
    if (gx < 0) return;
    const u = new Unit(G, def.key, 1, gx, gy);
    G.units.push(u);
    G.collect && G.collect(def.key);
    G.refreshAll && G.refreshAll();
    if (window.UI) UI.refresh();
  },

  refresh() {
    const info = document.getElementById('adminInfo');
    if (!info) return;
    const G = window.Game;
    const cache = window.GFX ? GFX.cache.size : 0;
    info.textContent =
      `웨이브 ${G.wave} · 생명 ${G.life}/${G.maxLife} · 무적 ${this.godMode ? 'ON' : 'OFF'}\n` +
      `유닛 ${G.units.length}/${G.slotMax()} · 적 ${G.enemies.length} · 배속 x${G.speed || 1}\n` +
      `골드 ${Math.floor(G.gold).toLocaleString()} · 스프라이트 캐시 ${cache}장\n` +
      `콘텐츠 : 유닛 ${UNITS.length} · 적 ${ENEMIES.length} · 맵 ${MAPS.length} · 스킬 ${SKILLS.length}`;
    if (window.UI) UI.refresh();
  },
};

window.Admin = Admin;
