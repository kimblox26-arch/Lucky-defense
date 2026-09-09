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
 * ========================================================================= */
window.ITD_CONFIG = {
  GOOGLE_CLIENT_ID: '',          // 예: '1234567890-abcdefg.apps.googleusercontent.com'
  GAME_TITLE: 'INFINITE TOWER DEFENSE',
  VERSION: '2.0.0',
};
