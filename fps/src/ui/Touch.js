// 모바일 터치 컨트롤. 좌측 가상 스틱(이동) + 우측 드래그(시야) + 액션 버튼.
// 조준 보정(자석 + 히트박스 확대)이 없으면 터치로는 사실상 맞출 수 없다.

import { $ } from './Screens.js';
import { settings } from '../core/Settings.js';
import { clamp, clamp01, damp } from '../core/Util.js';

const STICK_RADIUS = 58;
const DEAD_ZONE = 0.14;

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.input = game.input;
    this.root = $('#touch');
    this.stickZone = $('#stickZone');
    this.lookZone = $('#lookZone');
    this.base = $('#stickBase');
    this.knob = $('#stickKnob');

    this.moveId = -1;
    this.lookId = -1;
    this.originX = 0; this.originY = 0;
    this.lastX = 0; this.lastY = 0;
    this.lookMoved = 0;
    this.tapStart = 0;

    this._bindStick();
    this._bindLook();
    this._bindButtons();
  }

  enable(on) {
    this.root.classList.toggle('hidden', !on);
    if (!on) this._resetAll();
  }

  _resetAll() {
    const t = this.input.touch;
    t.moveX = t.moveY = 0;
    t.lookX = t.lookY = 0;
    t.fire = t.ads = t.jump = t.reload = t.sprint = t.crouch = false;
    t.sprintLock = t.crouchLock = false;
    this.moveId = this.lookId = -1;
    this.base.classList.remove('on');
    $('#btnSprint')?.classList.remove('on');
    $('#btnCrouch')?.classList.remove('on');
  }

  _bindStick() {
    const z = this.stickZone;
    const t = this.input.touch;

    z.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.moveId >= 0) return;
      const touch = e.changedTouches[0];
      this.moveId = touch.identifier;
      this.originX = touch.clientX;
      this.originY = touch.clientY;
      this.base.style.left = this.originX + 'px';
      this.base.style.top = this.originY + 'px';
      this.base.classList.add('on');
      t.active = true;
      this.game.audio?.init();
    }, { passive: false });

    z.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier !== this.moveId) continue;
        let dx = touch.clientX - this.originX;
        let dy = touch.clientY - this.originY;
        const d = Math.hypot(dx, dy);
        if (d > STICK_RADIUS) { dx = (dx / d) * STICK_RADIUS; dy = (dy / d) * STICK_RADIUS; }
        this.knob.style.transform = `translate(${dx - 26}px, ${dy - 26}px)`;
        let mx = dx / STICK_RADIUS;
        let my = -dy / STICK_RADIUS;
        const mag = Math.hypot(mx, my);
        if (mag < DEAD_ZONE) { mx = 0; my = 0; }
        else {
          // 데드존 보정 후 재정규화 — 미세 조작이 자연스러워진다
          const k = (mag - DEAD_ZONE) / (1 - DEAD_ZONE) / mag;
          mx *= k; my *= k;
        }
        t.moveX = clamp(mx, -1, 1);
        t.moveY = clamp(my, -1, 1);
        // 스틱을 끝까지 밀면 자동 전력질주
        t.sprint = Math.hypot(t.moveX, t.moveY) > 0.92 && t.moveY > 0.5;
      }
    }, { passive: false });

    const end = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier !== this.moveId) continue;
        this.moveId = -1;
        t.moveX = 0; t.moveY = 0; t.sprint = false;
        this.knob.style.transform = 'translate(-26px, -26px)';
        this.base.classList.remove('on');
      }
    };
    z.addEventListener('touchend', end);
    z.addEventListener('touchcancel', end);
  }

  _bindLook() {
    const z = this.lookZone;
    const t = this.input.touch;

    z.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.lookId >= 0) return;
      const touch = e.changedTouches[0];
      this.lookId = touch.identifier;
      this.lastX = touch.clientX;
      this.lastY = touch.clientY;
      this.lookMoved = 0;
      this.tapStart = performance.now();
      t.active = true;
      this.game.audio?.init();
    }, { passive: false });

    z.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier !== this.lookId) continue;
        const dx = touch.clientX - this.lastX;
        const dy = touch.clientY - this.lastY;
        this.lastX = touch.clientX;
        this.lastY = touch.clientY;
        t.lookX += dx;
        t.lookY += dy;
        this.lookMoved += Math.abs(dx) + Math.abs(dy);
      }
    }, { passive: false });

    const end = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier !== this.lookId) continue;
        this.lookId = -1;
        // 짧게 탭하면 사격 (버튼을 누르지 않아도 되는 보조 조작)
        if (this.lookMoved < 12 && performance.now() - this.tapStart < 240) {
          this._pulseFire();
        }
      }
    };
    z.addEventListener('touchend', end);
    z.addEventListener('touchcancel', end);
  }

  _pulseFire() {
    const t = this.input.touch;
    t.fire = true;
    clearTimeout(this._pulseTimer);
    this._pulseTimer = setTimeout(() => { t.fire = false; }, 90);
  }

  _bindButtons() {
    const t = this.input.touch;
    const hold = (id, key) => {
      const el = $(id);
      if (!el) return;
      const down = (e) => {
        e.preventDefault();
        t[key] = true;
        t.active = true;
        el.classList.add('on');
        this.game.audio?.init();
      };
      const up = (e) => { e.preventDefault(); t[key] = false; el.classList.remove('on'); };
      el.addEventListener('touchstart', down, { passive: false });
      el.addEventListener('touchend', up, { passive: false });
      el.addEventListener('touchcancel', up, { passive: false });
      el.addEventListener('mousedown', down);
      el.addEventListener('mouseup', up);
      el.addEventListener('mouseleave', up);
    };
    const tap = (id, fn) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        t.active = true;
        el.classList.add('on');
        fn();
        setTimeout(() => el.classList.remove('on'), 120);
      }, { passive: false });
      el.addEventListener('click', (e) => { e.preventDefault(); fn(); });
    };

    const toggle = (id, key) => {
      const el = $(id);
      if (!el) return;
      const fire = () => {
        t[key] = !t[key];
        t.active = true;
        el.classList.toggle('on', t[key]);
        this.game.audio?.init();
      };
      el.addEventListener('touchstart', (e) => { e.preventDefault(); fire(); }, { passive: false });
      el.addEventListener('click', (e) => { e.preventDefault(); fire(); });
    };

    hold('#btnFire', 'fire');
    hold('#btnAds', 'ads');
    tap('#btnReload', () => { t.reload = true; setTimeout(() => { t.reload = false; }, 80); });
    tap('#btnJump', () => { t.jump = true; setTimeout(() => { t.jump = false; }, 90); });
    tap('#btnSwap', () => { this.game.weapons.cycle(1); });
    tap('#btnInteract', () => { t.interact = true; setTimeout(() => { t.interact = false; }, 100); });
    toggle('#btnSprint', 'sprintLock');
    toggle('#btnCrouch', 'crouchLock');
    tap('#btnPause', () => this.game.pause());
    this._btnInteract = $('#btnInteract');
  }

  /** 자동 사격 설정이 켜져 있고 조준선에 적이 있으면 자동으로 발사 */
  update(dt) {
    const t = this.input.touch;
    // 획득 버튼은 근처 보급이 있을 때만 노출
    if (this._btnInteract) {
      this._btnInteract.classList.toggle('hidden', !this.game.loot?._near);
    }
    if (!t.active) return;
    if (settings.autoFire && this.game.state === 'playing') {
      const target = this._aimTarget();
      t.fire = !!target;
    }
    void dt;
  }

  _aimTarget() {
    const g = this.game;
    const eye = g.player.eyePosition;
    const f = g.rig.forward;
    return g.enemies.findAimTarget(eye.x, eye.y, eye.z, f.x, f.y, f.z, 45, 0.055);
  }
}

/**
 * 조준 보정. 조준선 근처에 적이 있으면 시야를 아주 약하게 끌어당긴다.
 * 완전 자동 조준이 아니라 "따라가기 쉽게" 만드는 정도로 유지해야
 * 조작감이 죽지 않는다.
 */
export class AimAssist {
  constructor(game) {
    this.game = game;
    this.strength = 0;
    this.target = null;
  }

  get enabled() {
    const mode = settings.aimAssist;
    if (mode === 'off') return false;
    if (mode === 'on') return true;
    return this.game.input.intent.usingTouch;   // auto: 터치에서만
  }

  update(dt) {
    const g = this.game;
    if (!this.enabled || g.state !== 'playing') { this.strength = 0; return; }

    const eye = g.player.eyePosition;
    const f = g.rig.forward;
    // 조준 중이면 보정 각도를 좁히고 세기를 높인다
    const cone = g.weapons.ads > 0.5 ? 0.075 : 0.11;
    const target = g.enemies.findAimTarget(eye.x, eye.y, eye.z, f.x, f.y, f.z, 42, cone);
    this.target = target;
    this.strength = damp(this.strength, target ? 1 : 0, 12, dt);
    if (!target || this.strength < 0.02) return;

    // 목표 중심(가슴)으로 향하는 각도 차이를 조금씩 메운다
    const h = target.def.height * target.scale;
    const dx = target.pos.x - eye.x;
    const dy = (target.pos.y + h * 0.62) - eye.y;
    const dz = target.pos.z - eye.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.6) return;

    const desiredYaw = Math.atan2(-dx, -dz);
    const desiredPitch = Math.asin(clamp(dy / len, -1, 1));

    let dYaw = desiredYaw - g.rig.yaw;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    const dPitch = desiredPitch - g.rig.pitch;

    // 거리가 멀수록, 적이 클수록 약하게 — 근접 난전에서만 확실히 도와준다
    const distFactor = clamp01(1 - len / 42);
    const k = 5.2 * this.strength * distFactor * clamp01(dt * 60) * dt;
    g.rig.yaw += dYaw * clamp01(k);
    g.rig.pitch = clamp(g.rig.pitch + dPitch * clamp01(k), -1.55, 1.55);
  }
}
