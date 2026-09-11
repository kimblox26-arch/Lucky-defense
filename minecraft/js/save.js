/* =========================================================================
 *  save.js — localStorage 저장/불러오기
 *  월드는 "생성 결과 대비 변경분"만 저장하므로 용량이 작다.
 * ========================================================================= */
'use strict';

const SAVE_KEY = 'mc_js_world_v1';
const SETTINGS_KEY = 'mc_js_settings_v1';

const SaveSystem = {
  hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  },

  save(game) {
    try {
      const data = {
        version: 1,
        savedAt: Date.now(),
        world: game.world.serialize(),
        player: game.player.serialize(),
      };
      const json = JSON.stringify(data);
      localStorage.setItem(SAVE_KEY, json);
      return { ok: true, bytes: json.length };
    } catch (e) {
      console.error('저장 실패', e);
      return { ok: false, error: e.message };
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('불러오기 실패', e);
      return null;
    }
  },

  deleteSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { void e; }
  },

  info() {
    const d = this.load();
    if (!d) return null;
    return {
      seed: d.world ? d.world.seed : 0,
      day: d.world ? d.world.dayCount : 0,
      savedAt: d.savedAt,
    };
  },

  loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { void e; }
  },
};
