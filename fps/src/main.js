// 부트스트랩: 로딩 → 메뉴 → 게임. 디버그 훅 노출.

import { Game, STATE } from './game/Game.js';
import { $, $$ } from './ui/Screens.js';
import { settings, setSetting } from './core/Settings.js';
import { isTouchDevice } from './core/Input.js';
import { MAPS, mapById } from './world/Maps.js';

const canvas = document.getElementById('cv');

function fatal(msg, err) {
  console.error('[OverKill 1]', msg, err || '');
  $('#errorText').textContent = msg;
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $('#scError').classList.add('active');
  $('#overlay').classList.add('on');
}

function checkWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    return true;
  } catch { return false; }
}

async function boot() {
  if (!checkWebGL()) {
    fatal('이 브라우저에서 WebGL을 사용할 수 없습니다. 최신 크롬·엣지·사파리에서 실행해 주세요.');
    return;
  }

  let game;
  try {
    game = new Game(canvas);
  } catch (e) {
    fatal('렌더러를 초기화하지 못했습니다: ' + (e?.message || e), e);
    return;
  }

  const fill = $('#loadFill');
  const text = $('#loadText');

  try {
    await game.init((p, label) => {
      fill.style.width = Math.round(p * 100) + '%';
      if (label) text.textContent = label;
    });
  } catch (e) {
    fatal('월드를 생성하지 못했습니다: ' + (e?.message || e), e);
    return;
  }

  wireMenu(game);

  window.__GAME = game;
  window.__GAME_READY = true;
  window.__debug = {
    game,
    start: () => game.beginRun(),
    pause: () => game.pause(),
    state: () => game.state,
    stats: () => ({
      state: game.state,
      fps: 1000 / game.engine.frameMs.value,
      frameMs: game.engine.frameMs.value,
      tier: game.engine.tier,
      draws: game.engine.renderer.info.render.calls,
      tris: game.engine.renderer.info.render.triangles,
      programs: game.engine.renderer.info.programs?.length ?? 0,
      pos: game.player.position.toArray().map((v) => +v.toFixed(2)),
      hp: Math.round(game.player.health),
    }),
    teleport: (x, y, z) => game.player.position.set(x, y, z),
    look: (yaw, pitch = 0) => { game.rig.yaw = yaw; game.rig.pitch = pitch; },
    /** 준비 시간을 건너뛰고 바로 다음 웨이브 */
    skipPrep: () => { if (game.waves.phase === 'prep') game.waves.phaseT = 0.01; },
    /** 특정 웨이브로 점프 */
    setWave: (n) => { game.waves.wave = n - 1; game.waves.phase = 'prep'; game.waves.phaseT = 0.01; },
    enemies: () => ({
      alive: game.enemies.aliveCount,
      active: game.enemies.active,
      wave: game.waves.wave,
      phase: game.waves.phase,
      remaining: game.waves.remaining,
    }),
    spawn: (type, n = 1) => {
      const g = game.arena.gates[0];
      for (let i = 0; i < n; i++) {
        game.enemies.spawn(type, g.spawns[1].x + i * 0.9, g.spawns[1].z, { health: 1, speed: 1, damage: 1 });
      }
    },
    god: (on = true) => { game.player.invuln = on ? 1e9 : 0; },
    unlockAll: () => { for (const w of game.weapons.list) game.weapons.unlock(w.def.id); game.hud.refreshSlots(); },
  };
  document.dispatchEvent(new CustomEvent('deadwave:ready'));
}

function wireMenu(game) {
  const s = game.screens;

  const best = game.score.best;
  $('#bestScore').textContent = best.score.toLocaleString('ko-KR');
  $('#bestWave').textContent = String(best.wave);

  // 어떤 버튼이든 첫 클릭에서 오디오 컨텍스트를 깨운다
  document.addEventListener('pointerdown', () => game.audio?.init(), { once: true });
  document.addEventListener('click', (e) => {
    if (e.target instanceof HTMLElement && e.target.closest('.mbtn, .tbtn, .seg button')) {
      game.audio?.uiClick();
    }
  });

  // 선택 맵 상태
  let selectedMap = settings.mapId || 'quarantine';
  const refreshMapName = () => { $('#menuMapName').textContent = mapById(selectedMap).name; };
  refreshMapName();

  $('#btnStart').addEventListener('click', () => game.beginRun(selectedMap));
  $('#btnResume').addEventListener('click', () => game.resume());
  $('#btnQuit').addEventListener('click', () => game.quitToMenu());
  $('#btnMenu')?.addEventListener('click', () => game.quitToMenu());
  $('#btnRetry')?.addEventListener('click', () => game.beginRun(selectedMap));

  $('#btnMaps').addEventListener('click', () => {
    buildMaps(() => selectedMap, (id) => { selectedMap = id; refreshMapName(); });
    s.push('scMaps');
  });
  $('#btnMapsBack').addEventListener('click', () => s.pop());

  $('#btnHelp').addEventListener('click', () => { buildHelp(); s.push('scHelp'); });
  $('#btnHelpBack').addEventListener('click', () => s.pop());
  $('#btnSettings').addEventListener('click', () => { buildSettings(game); s.push('scSettings'); });
  $('#btnPauseSettings').addEventListener('click', () => { buildSettings(game); s.push('scSettings'); });
  $('#btnSettingsBack').addEventListener('click', () => s.pop());

  // 포인터락이 풀린 뒤 클릭으로 복귀
  document.addEventListener('click', (e) => {
    if (game.state === STATE.PLAYING && !isTouchDevice && !game.input.locked) {
      if (e.target === canvas) game.input.requestLock();
    }
  });

  if (isTouchDevice) $('#menuHint').textContent = '왼쪽으로 이동 · 오른쪽으로 시야 · 하단 버튼으로 사격';
}

function buildMaps(getSel, onSelect) {
  const wrap = $('#mapCards');
  wrap.innerHTML = MAPS.map((m) => `
    <div class="mapCard ${m.id === getSel() ? 'sel' : ''}" data-id="${m.id}">
      <div class="mapThumb" style="background:linear-gradient(160deg, ${m.thumb[0]}, ${m.thumb[1]})"></div>
      <span class="selMark">선택됨</span>
      <div class="mapBody">
        <div class="mn">${m.name}</div>
        <div class="md">${m.desc}</div>
        <div class="mapMeta"><span>${m.size}</span><span>난이도 ${m.difficulty}</span></div>
      </div>
    </div>`).join('');
  wrap.querySelectorAll('.mapCard').forEach((el) => {
    el.addEventListener('click', () => {
      onSelect(el.dataset.id);
      setSetting('mapId', el.dataset.id);
      wrap.querySelectorAll('.mapCard').forEach((c) => c.classList.remove('sel'));
      el.classList.add('sel');
    });
  });
}

function buildHelp() {
  const rows = isTouchDevice ? [
    ['좌측 화면', '가상 스틱으로 이동'],
    ['우측 화면', '드래그로 시야 회전'],
    ['사격 버튼', '발사 (조준 보정 적용)'],
    ['조준 버튼', '정밀 조준'],
    ['재장전 버튼', '탄창 교체'],
    ['전환 버튼', '무기 변경'],
  ] : [
    ['W A S D', '이동'],
    ['Shift', '전력 질주'],
    ['Ctrl / C', '앉기'],
    ['Space', '점프'],
    ['마우스 좌', '사격'],
    ['마우스 우', '정밀 조준'],
    ['R', '재장전'],
    ['1 ~ 5 / 휠', '무기 전환'],
    ['F / E', '상호작용'],
    ['ESC', '일시정지'],
  ];
  $('#helpBody').innerHTML = rows
    .map(([k, v]) => `<div class="helpRow"><kbd>${k}</kbd><span>${v}</span></div>`)
    .join('');
}

function buildSettings(game) {
  const body = $('#settingsBody');
  const rows = [];

  const group = (t) => rows.push(`<div class="setGroup">${t}</div>`);
  const slider = (key, label, min, max, step, fmt) => rows.push(
    `<div class="setRow" data-k="${key}">
       <label>${label}</label>
       <input type="range" min="${min}" max="${max}" step="${step}" value="${settings[key]}">
       <span class="val">${fmt(settings[key])}</span>
     </div>`,
  );
  const seg = (key, label, opts) => rows.push(
    `<div class="setRow" data-k="${key}">
       <label>${label}</label>
       <div class="seg">${opts.map(([v, t]) =>
        `<button data-v="${v}" class="${String(settings[key]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>
     </div>`,
  );
  const pct = (v) => Math.round(v * 100) + '%';

  group('조작');
  slider('sensitivity', '마우스 감도', 0.2, 3, 0.05, (v) => v.toFixed(2));
  if (isTouchDevice) slider('touchSensitivity', '터치 감도', 0.3, 2.5, 0.05, (v) => v.toFixed(2));
  slider('adsSensitivity', '조준 시 감도', 0.2, 1.2, 0.05, (v) => v.toFixed(2));
  slider('fov', '시야각', 60, 110, 1, (v) => v + '°');
  seg('invertY', 'Y축 반전', [[false, '끔'], [true, '켬']]);
  if (isTouchDevice) seg('autoFire', '자동 사격', [[false, '끔'], [true, '켬']]);
  seg('aimAssist', '조준 보정', [['auto', '자동'], ['on', '켬'], ['off', '끔']]);

  group('그래픽');
  seg('quality', '품질', [['auto', '자동'], ['high', '높음'], ['medium', '보통'], ['low', '낮음']]);
  slider('renderScale', '해상도 배율', 0.5, 1, 0.05, pct);
  seg('bloom', '블룸', [[true, '켬'], [false, '끔']]);
  seg('grain', '필름 그레인', [[true, '켬'], [false, '끔']]);
  slider('shake', '화면 흔들림', 0, 1.5, 0.05, pct);
  seg('showFps', 'FPS 표시', [[false, '끔'], [true, '켬']]);

  group('소리');
  slider('masterVolume', '전체 음량', 0, 1, 0.05, pct);
  slider('sfxVolume', '효과음', 0, 1, 0.05, pct);
  slider('musicVolume', '음악', 0, 1, 0.05, pct);

  body.innerHTML = rows.join('');

  body.querySelectorAll('input[type=range]').forEach((el) => {
    const row = el.closest('.setRow');
    const key = row.dataset.k;
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      row.querySelector('.val').textContent = row.querySelector('.val').dataset.raw === '1'
        ? v : formatFor(key, v);
      applySetting(game, key, v);
    });
  });
  body.querySelectorAll('.seg button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.setRow');
      const key = row.dataset.k;
      row.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      let v = btn.dataset.v;
      if (v === 'true') v = true; else if (v === 'false') v = false;
      applySetting(game, key, v);
    });
  });

  $('#btnSettingsReset').onclick = () => {
    import('./core/Settings.js').then((m) => {
      m.resetSettings();
      buildSettings(game);
      applySetting(game, 'quality', settings.quality);
      applySetting(game, 'fov', settings.fov);
    });
  };
}

function formatFor(key, v) {
  if (key === 'fov') return v + '°';
  if (key === 'renderScale' || key.endsWith('Volume') || key === 'shake') return Math.round(v * 100) + '%';
  return v.toFixed(2);
}

function applySetting(game, key, value) {
  import('./core/Settings.js').then((m) => {
    m.setSetting(key, value);
    if (key === 'quality') game.engine.setQuality(value);
    else if (key === 'renderScale' || key === 'fov') game.engine.resize();
    else if (key === 'showFps') $('#fpsMeter').classList.toggle('hidden', !value);
    game.onSettingChanged?.(key, value);
  });
}

boot();
