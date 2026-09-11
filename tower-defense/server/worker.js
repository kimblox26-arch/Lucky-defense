/**
 * 리더보드 참조 서버 — Cloudflare Workers + KV 최소 구현.
 *
 * 배포
 *   1) npm i -g wrangler && wrangler login
 *   2) wrangler kv namespace create SCORES
 *   3) wrangler.toml 에 그 namespace 를 SCORES 로 바인딩
 *   4) wrangler deploy
 *   5) 나온 주소를 tower-defense/js/config.js 의 LEADERBOARD_URL 에 넣는다
 *
 * 계약
 *   GET  /?map=meadow&diff=normal&limit=50 → { entries: [...] }
 *   POST /  body: { name, uid, wave, map, diff, kills, bossKills, at, sig }
 *          → { ok: true, rank: n }
 *
 * ⚠ 클라이언트가 보낸 값을 그대로 믿는 구조다. 상한선으로 말도 안 되는 값만
 *   쳐내고 계정당 1개만 남길 뿐, 진짜 검증이 아니다. 경쟁이 의미를 가지려면
 *   서버가 판정에 필요한 근거(리플레이 등)를 받아 스스로 계산해야 한다.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_WAVE = 100000;          /* 이 이상은 명백한 조작 */
const MAX_KILLS = 50000000;
const KEEP = 200;                 /* 조합별로 보관할 상위 기록 수 */

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

/** 게임 클라이언트와 같은 FNV-1a 서명 */
function sign(r) {
  const base = `${r.uid}|${r.wave}|${r.map}|${r.diff}|${r.kills}|${r.at}`;
  let h = 2166136261;
  for (let i = 0; i < base.length; i++) {
    h ^= base.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

const bucket = (map, diff) => `lb:${map || 'all'}:${diff || 'all'}`;

function sortRows(rows) {
  rows.sort((a, b) => (b.wave - a.wave) || (b.kills - a.kills) || (a.at - b.at));
  return rows;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);

    /* ------------------------------------------------------------- 조회 */
    if (req.method === 'GET') {
      const map = url.searchParams.get('map') || 'all';
      const diff = url.searchParams.get('diff') || 'all';
      const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10) || 50);
      const raw = await env.SCORES.get(bucket(map, diff));
      const rows = raw ? JSON.parse(raw) : [];
      return json({ entries: sortRows(rows).slice(0, limit) });
    }

    /* ------------------------------------------------------------- 제출 */
    if (req.method === 'POST') {
      let r;
      try { r = await req.json(); } catch (e) { return json({ ok: false, error: 'bad json' }, 400); }

      if (!r || typeof r.uid !== 'string' || typeof r.map !== 'string')
        return json({ ok: false, error: 'bad record' }, 400);
      r.wave = Math.floor(Number(r.wave) || 0);
      r.kills = Math.floor(Number(r.kills) || 0);
      r.bossKills = Math.floor(Number(r.bossKills) || 0);
      r.at = Math.floor(Number(r.at) || Date.now());
      if (r.wave < 1 || r.wave > MAX_WAVE || r.kills < 0 || r.kills > MAX_KILLS)
        return json({ ok: false, error: 'out of range' }, 400);
      if (r.sig !== sign(r)) return json({ ok: false, error: 'bad sig' }, 400);

      r.name = String(r.name || '익명').slice(0, 16);
      r.uid = r.uid.slice(0, 64);
      r.map = r.map.slice(0, 32);
      r.diff = String(r.diff || 'normal').slice(0, 16);
      delete r.sig;

      /* 해당 조합 + 전체 버킷 양쪽에 반영한다 */
      for (const key of [bucket(r.map, r.diff), bucket('all', 'all')]) {
        const raw = await env.SCORES.get(key);
        let rows = raw ? JSON.parse(raw) : [];
        /* 계정당 최고 기록 하나만 */
        const i = rows.findIndex(x => x.uid === r.uid);
        if (i >= 0) { if (rows[i].wave >= r.wave) continue; rows[i] = r; }
        else rows.push(r);
        rows = sortRows(rows).slice(0, KEEP);
        await env.SCORES.put(key, JSON.stringify(rows));
      }

      const raw2 = await env.SCORES.get(bucket(r.map, r.diff));
      const rows2 = raw2 ? JSON.parse(raw2) : [];
      const rank = rows2.findIndex(x => x.uid === r.uid) + 1;
      return json({ ok: true, rank: rank || null });
    }

    return json({ ok: false, error: 'method' }, 405);
  },
};
