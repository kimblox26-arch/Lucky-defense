// PC(포인터락 + 키보드)와 모바일(가상 스틱)을 동일한 intent 구조로 수렴시킨다.
// 게임 로직은 입력 장치를 전혀 모른다.

import { settings } from './Settings.js';
import { clamp } from './Util.js';

export const isTouchDevice =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) &&
  !window.matchMedia('(pointer: fine)').matches;

const KEY_MAP = {
  KeyW: 'fwd', ArrowUp: 'fwd',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'jump',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  ControlLeft: 'crouch', KeyC: 'crouch',
  KeyR: 'reload',
  KeyE: 'interact', KeyF: 'interact',
  KeyQ: 'cyclePrev',
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.locked = false;
    this.enabled = false;      // 게임 플레이 중에만 true
    this.keys = Object.create(null);
    this.mouse = { left: false, right: false };

    // 프레임 단위로 소비되는 시야 델타 (라디안 아님 — 픽셀 단위)
    this._lookX = 0;
    this._lookY = 0;

    // ui/Touch.js가 직접 기록하는 값
    this.touch = {
      moveX: 0, moveY: 0,
      lookX: 0, lookY: 0,
      fire: false, ads: false,
      jump: false, reload: false, sprint: false, crouch: false, interact: false,
      sprintLock: false, crouchLock: false,   // 모바일 토글 버튼
      active: false,
    };

    this.intent = {
      moveX: 0, moveY: 0,          // -1..1 (스트레이프, 전진)
      lookX: 0, lookY: 0,          // 이번 프레임 시야 회전량(라디안)
      fire: false, firePressed: false,
      ads: false,
      jump: false, jumpPressed: false,
      reload: false,
      sprint: false, crouch: false,
      interact: false,
      weaponSlot: -1,              // 1..5 눌렸으면 해당 슬롯, 아니면 -1
      weaponCycle: 0,              // -1/+1
      usingTouch: false,
    };

    this._prev = { fire: false, jump: false };
    this._prevAds = false;
    this._adsToggle = false;      // 조준 토글 모드에서 유지되는 상태
    this._prevInteract = false;
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    this._bind();
  }

  _bind() {
    const opts = { passive: false };
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const a = KEY_MAP[e.code];
      if (a) { this.keys[a] = true; if (this.enabled) e.preventDefault(); }
      if (e.code.startsWith('Digit')) {
        const n = +e.code.slice(5);
        if (n >= 1 && n <= 5) this.intent.weaponSlot = n;
      }
      if (e.code === 'Tab' && this.enabled) e.preventDefault();
      this.onKey?.(e);
    }, opts);

    window.addEventListener('keyup', (e) => {
      const a = KEY_MAP[e.code];
      if (a) this.keys[a] = false;
    });

    window.addEventListener('blur', () => this.releaseAll());

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) this.mouse.right = true;
      if (!this.locked) this.requestLock();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this._lookX += e.movementX || 0;
      this._lookY += e.movementY || 0;
    });

    window.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      this.intent.weaponCycle += e.deltaY > 0 ? 1 : -1;
    }, { passive: true });

    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('pointerlockerror', () => { this.locked = false; });
  }

  _onPointerLockChange() {
    const was = this.locked;
    this.locked = document.pointerLockElement === this.canvas;
    if (was && !this.locked) {
      this.releaseAll();
      this.onLockLost?.();
    }
  }

  requestLock() {
    if (isTouchDevice) return;
    const p = this.canvas.requestPointerLock?.({ unadjustedMovement: true });
    if (p && typeof p.catch === 'function') {
      // unadjustedMovement 미지원 브라우저 폴백
      p.catch(() => { try { this.canvas.requestPointerLock(); } catch { /* ignore */ } });
    }
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  releaseAll() {
    for (const k in this.keys) this.keys[k] = false;
    this.mouse.left = this.mouse.right = false;
    this._lookX = this._lookY = 0;
  }

  /** 조준 토글 해제 (무기 전환 등) */
  resetAds() { this._adsToggle = false; this._prevAds = false; }

  /** 렌더 프레임 시작 시 1회 호출 — intent를 갱신하고 델타를 소비한다. */
  update() {
    const it = this.intent;
    const t = this.touch;
    const usingTouch = t.active;
    it.usingTouch = usingTouch;

    if (!this.enabled) {
      it.moveX = it.moveY = 0;
      it.lookX = it.lookY = 0;
      it.fire = it.firePressed = it.ads = it.jump = it.jumpPressed = false;
      it.reload = it.sprint = it.crouch = it.interact = it.interactPressed = false;
      it.weaponSlot = -1; it.weaponCycle = 0;
      this._lookX = this._lookY = 0;
      this._adsToggle = false; this._prevAds = false; this._prevInteract = false;
      return it;
    }

    // ── 이동 ──
    let mx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    let my = (this.keys.fwd ? 1 : 0) - (this.keys.back ? 1 : 0);
    if (usingTouch) { mx += t.moveX; my += t.moveY; }
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    it.moveX = mx; it.moveY = my;

    // ── 시야 ──
    // 픽셀 → 라디안. 0.0022는 일반적인 FPS의 400DPI 기준 감각.
    const base = 0.0022 * settings.sensitivity;
    let lx = this._lookX * base;
    let ly = this._lookY * base * (settings.invertY ? -1 : 1);
    if (usingTouch) {
      const tb = 0.0032 * settings.touchSensitivity;
      lx += t.lookX * tb;
      ly += t.lookY * tb * (settings.invertY ? -1 : 1);
      t.lookX = 0; t.lookY = 0;
    }
    it.lookX = lx; it.lookY = ly;
    this._lookX = 0; this._lookY = 0;

    // ── 액션 ──
    const fire = this.mouse.left || (usingTouch && t.fire);
    const jump = !!this.keys.jump || (usingTouch && t.jump);
    it.fire = fire;
    it.firePressed = fire && !this._prev.fire;
    it.jump = jump;
    it.jumpPressed = jump && !this._prev.jump;
    // 조준: 토글 모드면 누를 때마다 상태 반전, 아니면 길게 누르기
    const rawAds = this.mouse.right || (usingTouch && t.ads);
    if (settings.adsToggle) {
      if (rawAds && !this._prevAds) this._adsToggle = !this._adsToggle;
      it.ads = this._adsToggle;
    } else {
      it.ads = rawAds;
    }
    this._prevAds = rawAds;

    it.reload = !!this.keys.reload || (usingTouch && t.reload);
    it.sprint = !!this.keys.sprint || (usingTouch && (t.sprint || t.sprintLock));
    it.crouch = !!this.keys.crouch || (usingTouch && (t.crouch || t.crouchLock));
    const interact = !!this.keys.interact || (usingTouch && t.interact);
    it.interact = interact;
    it.interactPressed = interact && !this._prevInteract;
    this._prevInteract = interact;

    if (this.keys.cyclePrev) { it.weaponCycle -= 1; this.keys.cyclePrev = false; }
    it.weaponCycle = clamp(it.weaponCycle, -3, 3);

    this._prev.fire = fire;
    this._prev.jump = jump;
    return it;
  }

  /** 프레임 종료 후 1회성 입력 소거 */
  endFrame() {
    this.intent.weaponSlot = -1;
    this.intent.weaponCycle = 0;
    this.touch.reload = false;
    this.touch.jump = false;
    this.touch.interact = false;
  }
}
