/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  config.js
 * -------------------------------------------------------------------------
 *  ▷ Google 로그인을 켜려면 :
 *     1. https://console.cloud.google.com 에서 프로젝트를 만들고
 *        "API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트 ID(웹)" 생성
 *     2. "승인된 자바스크립트 원본"에 게임을 서빙할 주소를 등록
 *        (예: https://<사용자>.github.io , http://localhost:8080)
 *     3. 발급된 클라이언트 ID를 아래 GOOGLE_CLIENT_ID 에 붙여넣기
 *
 *  ※ 클라이언트 ID는 공개되어도 되는 값이다(비밀키가 아니다).
 *  ※ file:// 로 열면 구글 로그인은 동작하지 않는다. 웹 서버로 접속할 것.
 *  ※ 비워두면 게임은 로컬 계정 / 게스트 모드로 정상 동작한다.
 *
 *  ▷ 온라인 랭킹을 켜려면 :
 *     LEADERBOARD_URL 에 아래 두 가지만 하는 엔드포인트 주소를 넣으면 된다.
 *       GET  {URL}?map=meadow&diff=normal&limit=50
 *            → { entries: [ { name, uid, wave, map, diff, kills, bossKills, at } ] }
 *       POST {URL}  body(JSON): { name, uid, wave, map, diff, kills, bossKills, at, sig }
 *            → { ok: true, rank: 12 }
 *     이 사이트 출처를 CORS 로 허용해야 한다.
 *     비워 두면 이 기기의 기록만 모아 로컬 순위표로 동작한다.
 *
 *  ※ 클라이언트만으로 도는 게임이라 점수는 근본적으로 조작될 수 있다.
 *    진지하게 운영하려면 서버가 값의 타당성을 직접 판정해야 한다.
 * ========================================================================= */
window.ITD_CONFIG = {
  GOOGLE_CLIENT_ID: '',          // 예: '1234567890-abcdefg.apps.googleusercontent.com'
  LEADERBOARD_URL: '',           // 예: 'https://itd-rank.example.workers.dev/scores'
  GAME_TITLE: 'INFINITE TOWER DEFENSE',
  VERSION: '2.0.0',
};
