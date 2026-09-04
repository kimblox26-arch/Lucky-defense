// localStorage에 영속되는 사용자 설정.

const KEY = 'deadwave.settings.v1';

const DEFAULTS = {
  sensitivity: 1.0,       // 마우스 감도 배율
  adsSensitivity: 0.6,    // 조준 시 감도 배율
  touchSensitivity: 1.0,
  fov: 78,                // 기본 수직 FOV
  invertY: false,
  quality: 'auto',        // auto | high | medium | low
  renderScale: 1.0,
  masterVolume: 0.8,
  sfxVolume: 1.0,
  musicVolume: 0.5,
  grain: true,
  bloom: true,
  shake: 1.0,             // 화면 흔들림 배율 (0이면 끔)
  autoFire: false,        // 모바일 자동 사격
  aimAssist: 'auto',      // auto(터치에서만) | on | off
  showFps: false,
  crosshair: true,
  damageNumbers: true,
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    const out = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) {
      if (k in parsed && typeof parsed[k] === typeof DEFAULTS[k]) out[k] = parsed[k];
    }
    return out;
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings = load();

let saveTimer = 0;
export function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* 사파리 프라이빗 모드 등 */ }
  }, 200);
}

export function setSetting(key, value) {
  if (!(key in DEFAULTS)) return;
  settings[key] = value;
  saveSettings();
}

export function resetSettings() {
  Object.assign(settings, DEFAULTS);
  saveSettings();
}

export { DEFAULTS as SETTING_DEFAULTS };

/** 최고 기록 저장 (Score.js에서 사용) */
const BEST_KEY = 'deadwave.best.v1';
export function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return { score: 0, wave: 0, kills: 0 };
    const p = JSON.parse(raw);
    return { score: p.score | 0, wave: p.wave | 0, kills: p.kills | 0 };
  } catch { return { score: 0, wave: 0, kills: 0 }; }
}
export function saveBest(best) {
  try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch { /* ignore */ }
}
