// HUD 갱신. DOM은 index.html에 이미 있고 여기서는 값만 밀어 넣는다.
// 매 프레임 문자열을 새로 쓰지 않도록 이전 값을 캐시한다.

import { $ } from './Screens.js';
import { clamp, clamp01, damp, formatNumber } from '../core/Util.js';
import { settings } from '../core/Settings.js';
import { WEAPONS } from '../player/Weapons.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this.root = $('#hud');

    this.ammoMag = $('#ammoMag');
    this.ammoRes = $('#ammoRes');
    this.weaponName = $('#weaponName');
    this.reloadWrap = $('#reloadWrap');
    this.reloadBar = $('#reloadBar');
    this.slots = $('#weaponSlots');

    this.hpBar = $('#hpBar');
    this.hpLag = $('#hpBarLag');
    this.hpVal = $('#hpVal');
    this.armorRow = $('#armorRow');
    this.armorBar = $('#armorBar');

    this.waveNum = $('#waveNum');
    this.waveBar = $('#waveBar');
    this.enemyLeft = $('#enemyLeft');
    this.prepTimer = $('#prepTimer');
    this.prepSec = $('#prepSec');
    this.prepLabel = $('#prepLabel');
    this.banner = $('#banner');

    this.scoreVal = $('#scoreVal');
    this.comboWrap = $('#comboWrap');
    this.comboMul = $('#comboMul');
    this.comboBar = $('#comboBar');
    this.fpsMeter = $('#fpsMeter');

    this.crosshair = $('#crosshair');
    this.chT = $('#chT'); this.chB = $('#chB');
    this.chL = $('#chL'); this.chR = $('#chR');
    this.chDot = $('#chDot');

    this.compass = $('#compass');
    this.perkRow = $('#perkRow');
    this.promptEl = $('#prompt');

    this._cache = {};
    this._hpLagVal = 1;
    this._gap = 10;
    this._compassTicks = [];
    this._scoreShown = 0;

    this.buildSlots();
    this.fpsMeter.classList.toggle('hidden', !settings.showFps);
  }

  set(el, key, value) {
    if (this._cache[key] === value) return;
    this._cache[key] = value;
    el.textContent = value;
  }

  style(el, key, prop, value) {
    if (this._cache[key] === value) return;
    this._cache[key] = value;
    el.style[prop] = value;
  }

  buildSlots() {
    this.slots.innerHTML = WEAPONS.map((w) =>
      `<div class="wslot locked" data-id="${w.id}"><i>${w.slot}</i>${w.short}</div>`).join('');
    this.slotEls = {};
    for (const el of this.slots.children) {
      this.slotEls[el.dataset.id] = el;
      // 탭/클릭으로 무기 전환 (모바일 편의)
      el.addEventListener('click', () => {
        const ws = this.game.weapons;
        const idx = ws.list.findIndex((w) => w.def.id === el.dataset.id);
        if (idx >= 0 && ws.list[idx].unlocked) ws.switchTo_(idx);
      });
    }
  }

  /** 아군 체력 표시 */
  setAllies(list) {
    if (!this.allyRow) this.allyRow = $('#allyRow');
    if (list.length !== this._allyN) {
      this._allyN = list.length;
      this.allyRow.innerHTML = list.map((a, i) =>
        `<div class="allyChip" data-i="${i}"><span class="an">${a.name}</span><div class="abar"><div class="afill"></div></div></div>`).join('');
      this._allyFills = Array.from(this.allyRow.querySelectorAll('.afill'));
      this._allyChips = Array.from(this.allyRow.querySelectorAll('.allyChip'));
    }
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (this._allyFills[i]) this._allyFills[i].style.width = clamp01(a.health / a.maxHealth) * 100 + '%';
      if (this._allyChips[i]) this._allyChips[i].classList.toggle('down', a.downed);
    }
  }

  refreshSlots() {
    const ws = this.game.weapons;
    for (const w of ws.list) {
      const el = this.slotEls[w.def.id];
      if (!el) continue;
      el.classList.toggle('locked', !w.unlocked);
      el.classList.toggle('active', ws.cur === w);
    }
  }

  // ───────────────────────── 프레임 갱신 ─────────────────────────

  update(dt) {
    const g = this.game;
    const p = g.player;
    const ws = g.weapons;

    // ── 탄약 ──
    const w = ws.cur;
    this.set(this.ammoMag, 'mag', String(w.mag));
    this.set(this.ammoRes, 'res', w.reserve === Infinity ? '∞' : String(w.reserve));
    this.ammoMag.classList.toggle('low', w.mag <= Math.max(1, Math.ceil(ws.maxMag(w) * 0.25)));
    this.set(this.weaponName, 'wname', w.def.name);

    if (ws.isReloading) {
      this.reloadWrap.classList.remove('hidden');
      const t = clamp01(ws.reloadT / ws.reloadDur);
      this.reloadBar.style.width = (t * 100).toFixed(1) + '%';
    } else if (!this.reloadWrap.classList.contains('hidden')) {
      this.reloadWrap.classList.add('hidden');
    }

    // ── 체력 ──
    const hpRatio = clamp01(p.health / p.maxHealth);
    this.style(this.hpBar, 'hp', 'width', (hpRatio * 100).toFixed(1) + '%');
    this.set(this.hpVal, 'hpv', String(Math.ceil(p.health)));
    this.hpBar.classList.toggle('low', hpRatio < 0.35);
    this._hpLagVal = damp(this._hpLagVal, hpRatio, 2.4, dt);
    if (this._hpLagVal < hpRatio) this._hpLagVal = hpRatio;
    this.hpLag.style.width = (this._hpLagVal * 100).toFixed(1) + '%';

    if (p.armorMax > 0) {
      this.armorRow.classList.remove('hidden');
      this.style(this.armorBar, 'ar', 'width', ((p.armor / p.armorMax) * 100).toFixed(1) + '%');
    } else if (!this.armorRow.classList.contains('hidden')) {
      this.armorRow.classList.add('hidden');
    }

    // ── 조준선 ──
    this.updateCrosshair(dt);

    // ── FPS ──
    if (settings.showFps) {
      const fps = Math.round(1000 / Math.max(1, g.engine.frameMs.value));
      this.set(this.fpsMeter, 'fps', `${fps} FPS · ${g.engine.tier}`);
    }
  }

  updateCrosshair(dt) {
    const g = this.game;
    const ws = g.weapons;
    if (!settings.crosshair) { this.crosshair.style.opacity = '0'; return; }

    // 저격총 조준 시에는 조준선을 숨긴다 (스코프 대체)
    const hideForScope = ws.def.id === 'sniper' && ws.ads > 0.6;
    this.crosshair.style.opacity = hideForScope ? '0' : '1';
    if (hideForScope) return;

    const px = ws.crosshairGap(g.player, window.innerHeight, g.engine.camera.fov);
    // SVG 뷰박스는 100 단위, 크로스헤어 요소는 88px → 스케일 변환
    const size = this.crosshair.clientHeight || 88;
    const gap = clamp(4 + (px / size) * 100, 4, 46);
    this._gap = damp(this._gap, gap, 22, dt);
    const gp = this._gap;
    const len = clamp(9 - (gp - 6) * 0.08, 5, 10);

    this.chT.setAttribute('y1', String(-gp));
    this.chT.setAttribute('y2', String(-gp - len));
    this.chB.setAttribute('y1', String(gp));
    this.chB.setAttribute('y2', String(gp + len));
    this.chL.setAttribute('x1', String(-gp));
    this.chL.setAttribute('x2', String(-gp - len));
    this.chR.setAttribute('x1', String(gp));
    this.chR.setAttribute('x2', String(gp + len));
    this.chDot.setAttribute('r', ws.ads > 0.5 ? '0.9' : '1.3');
  }

  setHostile(on) {
    this.crosshair.classList.toggle('hostile', on);
  }

  // ───────────────────────── 웨이브 / 점수 ─────────────────────────

  setWave(n, total, remaining) {
    this.set(this.waveNum, 'wave', String(n));
    this.set(this.enemyLeft, 'left', String(remaining));
    const ratio = total > 0 ? remaining / total : 0;
    this.style(this.waveBar, 'wbar', 'width', (ratio * 100).toFixed(1) + '%');
  }

  setPrep(seconds, label = '다음 웨이브') {
    if (seconds === null) {
      this.prepTimer.classList.add('hidden');
      return;
    }
    this.prepTimer.classList.remove('hidden');
    this.set(this.prepLabel, 'plabel', label);
    this.set(this.prepSec, 'psec', String(Math.ceil(seconds)));
  }

  setScore(score) {
    this._scoreShown = score;
    this.set(this.scoreVal, 'score', formatNumber(score));
  }

  setCombo(mul, ratio) {
    if (mul <= 1.001) {
      this.comboWrap.classList.add('hidden');
      return;
    }
    this.comboWrap.classList.remove('hidden');
    this.set(this.comboMul, 'cmul', 'x' + mul.toFixed(1));
    this.comboBar.style.width = (clamp01(ratio) * 100).toFixed(1) + '%';
  }

  setPerks(perks) {
    this.perkRow.innerHTML = perks
      .map((p) => `<span class="perkChip">${p.icon} ${p.short}${p.stacks > 1 ? `<b>×${p.stacks}</b>` : ''}</span>`)
      .join('');
  }

  banner_(text) {
    this.banner.className = '';
    void this.banner.offsetWidth;
    this.banner.textContent = text;
    this.banner.className = 'show';
  }

  prompt(text) {
    if (!text) { this.promptEl.classList.add('hidden'); return; }
    this.promptEl.classList.remove('hidden');
    this.promptEl.innerHTML = text;
  }

  /** 화면 밖 적의 방향을 나침반 눈금으로 표시 */
  setCompass(angles) {
    const need = angles.length;
    while (this._compassTicks.length < need) {
      const el = document.createElement('div');
      el.className = 'cmpTick';
      this.compass.appendChild(el);
      this._compassTicks.push(el);
    }
    for (let i = 0; i < this._compassTicks.length; i++) {
      const el = this._compassTicks[i];
      if (i < need) {
        el.style.display = 'block';
        el.style.transform = `translate(-1.5px,-132px) rotate(${(angles[i] * 180) / Math.PI}deg)`;
      } else if (el.style.display !== 'none') {
        el.style.display = 'none';
      }
    }
  }

  reset() {
    this._cache = {};
    this._hpLagVal = 1;
    this.setCombo(1, 0);
    this.setPerks([]);
    this.prompt(null);
    this.setPrep(null);
    this.setCompass([]);
    this.refreshSlots();
    if (this.allyRow) { this.allyRow.innerHTML = ''; this._allyN = -1; }
  }
}
