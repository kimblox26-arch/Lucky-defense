/* =============================================================================
 *  리더보드
 *
 *  이 게임은 서버가 없는 정적 사이트다. 그래서 "온라인"을 이렇게 나눴다.
 *
 *    · local  (기본)  — 이 기기의 계정들이 남긴 기록만 모아 순위를 낸다.
 *                       서버 없이도 지금 바로 동작한다.
 *    · rest   (온라인) — config.js 에 LEADERBOARD_URL 을 적으면 그 주소와
 *                       실제로 통신한다. 주소만 꽂으면 전 세계 순위가 된다.
 *
 *  ⚠ 클라이언트만으로 돌아가는 게임의 점수는 근본적으로 신뢰할 수 없다.
 *    서명을 붙여 두긴 했지만 이건 "장난으로 고치는 것"을 조금 귀찮게 할 뿐,
 *    진짜 검증이 아니다. 진지하게 운영하려면 서버가 판정을 해야 한다.
 *    (아래 SERVER_SPEC 에 최소 계약을 적어 두었다.)
 * ========================================================================== */
'use strict';

/**
 * 서버를 붙일 때 지켜야 할 최소 계약.
 *
 *   GET  {URL}?map=meadow&diff=normal&limit=50
 *        → { entries: [ { name, uid, wave, map, diff, kills, bossKills, at } ] }
 *
 *   POST {URL}   body(JSON): { name, uid, wave, map, diff, kills, bossKills, at, sig }
 *        → { ok: true, rank: 12 }
 *
 * CORS 로 이 사이트 출처를 허용해야 한다.
 */
const LB_SERVER_SPEC = 'GET ?map&diff&limit → {entries:[…]} / POST {record} → {ok,rank}';

const Leaderboard = {
  KEY: 'itd_lb_v1',
  MAX_LOCAL: 300,
  cache: null,          /* {key, at, entries} */
  CACHE_MS: 60000,

  url() {
    const c = window.ITD_CONFIG || {};
    return (c.LEADERBOARD_URL || '').trim();
  },
  online() { return !!this.url(); },
  mode() { return this.online() ? 'rest' : 'local'; },

  /* =================================================================
   *  기록 제출
   * ================================================================= */
  /** 이번 판의 결과로 제출용 레코드를 만든다 */
  buildRecord() {
    const g = Game;
    const prof = window.Account && Account.profile;
    const user = window.Account && Account.current;
    return {
      name: (user && user.nick) || '익명',
      uid: (user && user.uid) || 'anon',
      level: (prof && prof.level) || 1,
      wave: g.wave + g.loop * 100,
      map: g.map.key,
      mapName: g.map.name,
      diff: g.difficulty,
      kills: g.stats.kills,
      bossKills: g.stats.bossKills,
      at: Date.now(),
    };
  },

  /** 아주 약한 위변조 방지 서명 (보안이 아니라 실수/장난 방지용) */
  sign(r) {
    const base = `${r.uid}|${r.wave}|${r.map}|${r.diff}|${r.kills}|${r.at}`;
    let h = 2166136261;
    for (let i = 0; i < base.length; i++) {
      h ^= base.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  },

  async submit(rec) {
    const r = rec || this.buildRecord();
    if (!r.wave || r.wave < 1) return { ok: false };
    r.sig = this.sign(r);
    this.saveLocal(r);                      /* 온라인이든 아니든 내 기기엔 항상 남긴다 */
    if (!this.online()) return { ok: true, local: true };
    try {
      const res = await fetch(this.url(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      this.cache = null;
      return { ok: true, rank: j && j.rank };
    } catch (e) {
      /* 서버가 죽어 있어도 게임은 계속돼야 한다 — 로컬 기록은 이미 남았다 */
      this.queue(r);
      return { ok: false, error: String(e.message || e), queued: true };
    }
  },

  /* 전송 실패한 기록은 모아 뒀다가 다음에 다시 시도한다 */
  queue(r) {
    try {
      const q = JSON.parse(localStorage.getItem(this.KEY + '_q') || '[]');
      q.push(r);
      localStorage.setItem(this.KEY + '_q', JSON.stringify(q.slice(-40)));
    } catch (e) { }
  },
  async flushQueue() {
    if (!this.online()) return 0;
    let q = [];
    try { q = JSON.parse(localStorage.getItem(this.KEY + '_q') || '[]'); } catch (e) { return 0; }
    if (!q.length) return 0;
    const left = [];
    let sent = 0;
    for (const r of q) {
      try {
        const res = await fetch(this.url(), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r),
        });
        if (res.ok) sent++; else left.push(r);
      } catch (e) { left.push(r); }
    }
    try { localStorage.setItem(this.KEY + '_q', JSON.stringify(left)); } catch (e) { }
    if (sent) this.cache = null;
    return sent;
  },

  /* =================================================================
   *  조회
   * ================================================================= */
  /**
   * 순위표를 가져온다.
   * filter = { map, diff, limit }
   * 반환 { mode, entries, error }
   */
  async fetchTop(filter) {
    const f = filter || {};
    const key = `${f.map || '*'}|${f.diff || '*'}|${f.limit || 50}`;
    if (this.cache && this.cache.key === key && Date.now() - this.cache.at < this.CACHE_MS)
      return { mode: this.mode(), entries: this.cache.entries, cached: true };

    if (!this.online()) {
      const entries = this.rank(this.loadLocal(), f);
      return { mode: 'local', entries };
    }
    try {
      const q = new URLSearchParams();
      if (f.map && f.map !== '*') q.set('map', f.map);
      if (f.diff && f.diff !== '*') q.set('diff', f.diff);
      q.set('limit', String(f.limit || 50));
      const res = await fetch(this.url() + (this.url().includes('?') ? '&' : '?') + q, {
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      const entries = this.rank(Array.isArray(j) ? j : (j.entries || []), f, true);
      this.cache = { key, at: Date.now(), entries };
      return { mode: 'rest', entries };
    } catch (e) {
      /* 서버가 안 되면 로컬 기록이라도 보여 준다 — 빈 화면보다 낫다 */
      return { mode: 'local', entries: this.rank(this.loadLocal(), f), error: String(e.message || e) };
    }
  },

  /** 계정당 최고 기록 하나만 남기고 정렬 */
  rank(list, f, keepAll) {
    let rows = (list || []).filter(r => r && r.wave > 0);
    if (f.map && f.map !== '*') rows = rows.filter(r => r.map === f.map);
    if (f.diff && f.diff !== '*') rows = rows.filter(r => r.diff === f.diff);
    if (!keepAll) {
      const best = {};
      for (const r of rows) {
        const k = r.uid + '|' + r.map + '|' + r.diff;
        if (!best[k] || r.wave > best[k].wave) best[k] = r;
      }
      rows = Object.values(best);
    }
    rows.sort((a, b) => (b.wave - a.wave) || (b.kills - a.kills) || (a.at - b.at));
    return rows.slice(0, f.limit || 50);
  },

  /* ---------------------------------------------------------- 로컬 저장 */
  loadLocal() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '[]') || []; }
    catch (e) { return []; }
  },
  saveLocal(r) {
    try {
      const list = this.loadLocal();
      list.push(r);
      localStorage.setItem(this.KEY, JSON.stringify(list.slice(-this.MAX_LOCAL)));
    } catch (e) { }
  },

  /** 내 최고 기록 (해당 필터에서) */
  myBest(f) {
    const uid = (window.Account && Account.current && Account.current.uid) || 'anon';
    const rows = this.rank(this.loadLocal(), f || {});
    return rows.find(r => r.uid === uid) || null;
  },
};

window.Leaderboard = Leaderboard;
window.LB_SERVER_SPEC = LB_SERVER_SPEC;
