// 게임 오케스트레이터: 시스템 소유, 상태머신, 고정 스텝 루프.

import { Vector3 } from 'three';
import { Engine } from '../core/Engine.js';
import { Time, FIXED_DT } from '../core/Time.js';
import { Input, isTouchDevice } from '../core/Input.js';
import { settings } from '../core/Settings.js';
import { CollisionWorld } from '../world/Collision.js';
import { Arena, ARENA } from '../world/Arena.js';
import { Lighting } from '../world/Lighting.js';
import { Player } from '../player/Player.js';
import { CameraRig } from '../player/CameraRig.js';
import { Screens, $ } from '../ui/Screens.js';
import { clamp } from '../core/Util.js';

export const STATE = {
  LOADING: 'loading',
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  UPGRADE: 'upgrade',
  GAMEOVER: 'gameover',
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = STATE.LOADING;
    this.time = new Time();
    this.engine = new Engine(canvas);
    this.input = new Input(canvas);
    this.screens = new Screens();

    this.collision = new CollisionWorld();
    this.rig = new CameraRig(this.engine.camera);
    this.player = new Player(this.collision, this.rig);

    this.systems = [];        // { update(dt), render?(alpha) }
    this.elapsed = 0;
    this.running = false;

    this._forward = new Vector3();
    this._bound = this._frame.bind(this);

    this.input.onLockLost = () => {
      if (this.state === STATE.PLAYING) this.pause();
    };
    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === STATE.PLAYING) this.pause();
    });
  }

  /** 무거운 초기화. onProgress(0..1, label) */
  async init(onProgress = () => {}) {
    const step = async (p, label, fn) => {
      onProgress(p, label);
      await nextFrame();
      fn();
    };

    this.engine.setQuality(settings.quality);
    await step(0.08, '지형 데이터 해석 중…', () => {
      this.arena = new Arena(this.engine, this.collision);
    });
    await step(0.25, '표면 재질 합성 중…', () => {
      this.arena.build();
    });
    await step(0.62, '조명 배치 중…', () => {
      this.lighting = new Lighting(this.engine);
    });
    await step(0.78, '환경 반사 계산 중…', () => {
      this.engine.bakeEnvironment();
    });
    await step(0.9, '셰이더 컴파일 중…', () => {
      this.player.position.copy(this.arena.playerStart);
      this.rig.update(FIXED_DT, this.player, 0);
      this.engine.renderer.compile(this.engine.scene, this.engine.camera);
    });
    await step(1, '준비 완료', () => {});

    this.state = STATE.MENU;
    this.screens.show('scMenu');
    if (isTouchDevice) document.body.classList.add('touch');
    this.start();
    return this;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.time._last = 0;
    requestAnimationFrame(this._bound);
  }

  // ───────────────────────── 상태 전환 ─────────────────────────

  beginRun() {
    this.elapsed = 0;
    this.player.reset(this.arena.playerStart.x, this.arena.playerStart.y, this.arena.playerStart.z, 0);
    this.rig.reset(0, 0);
    this.lighting.setMood(0);
    for (const s of this.systems) s.onRunStart?.();
    this._enterPlaying();
  }

  _enterPlaying() {
    this.state = STATE.PLAYING;
    this.screens.hide();
    $('#hud').classList.remove('hidden');
    this.input.enabled = true;
    this.time.paused = false;
    this.time.resetScale();
    if (isTouchDevice) $('#touch').classList.remove('hidden');
    else this.input.requestLock();
  }

  pause() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.PAUSED;
    this.input.enabled = false;
    this.input.exitLock();
    this.time.paused = true;
    $('#hud').classList.add('hidden');
    $('#touch').classList.add('hidden');
    this.screens.show('scPause');
    for (const s of this.systems) s.onPause?.();
  }

  resume() {
    if (this.state !== STATE.PAUSED) return;
    this._enterPlaying();
    for (const s of this.systems) s.onResume?.();
  }

  quitToMenu() {
    this.state = STATE.MENU;
    this.input.enabled = false;
    this.input.exitLock();
    this.time.paused = false;
    this.time.resetScale();
    $('#hud').classList.add('hidden');
    $('#touch').classList.add('hidden');
    this.screens.show('scMenu');
    for (const s of this.systems) s.onRunEnd?.();
  }

  _onKeyDown(e) {
    if (e.code === 'Escape') {
      if (this.state === STATE.PLAYING) { e.preventDefault(); this.pause(); }
      else if (this.state === STATE.PAUSED) { e.preventDefault(); this.resume(); }
    }
    if (e.code === 'KeyP' && this.state === STATE.PLAYING) this.pause();
  }

  // ───────────────────────── 루프 ─────────────────────────

  _frame(nowMs) {
    if (!this.running) return;
    requestAnimationFrame(this._bound);
    if (this.engine.contextLost) return;

    const steps = this.time.begin(nowMs);
    this.engine.updateAdaptive(this.time.rawFrameDt * 1000);

    const intent = this.input.update();

    // 시야 회전은 렌더 프레임 단위로 (입력 지연 최소화)
    if (this.state === STATE.PLAYING && (intent.lookX || intent.lookY)) {
      const sens = this._adsSens ?? 1;
      this.rig.look(intent.lookX * sens, intent.lookY * sens);
    }

    for (let i = 0; i < steps; i++) {
      this._fixedUpdate(FIXED_DT, intent);
      this.time.step();
    }

    this._preRender(this.time.frameDt);
    this.engine.render();
    this.input.endFrame();
  }

  _fixedUpdate(dt, intent) {
    this.elapsed += dt;
    const playing = this.state === STATE.PLAYING;

    this.player.update(dt, intent, playing);

    for (const s of this.systems) s.update?.(dt, intent, playing);
  }

  _preRender(dt) {
    this.rig.update(dt || 1 / 240, this.player, this.time.raw);
    this._forward.copy(this.rig.flatForward);
    this.lighting.update(this.player.position, this._forward);
    this.arena.update(this.time.raw);
    for (const s of this.systems) s.preRender?.(dt, this.time.raw);
  }

  // ───────────────────────── 유틸 ─────────────────────────

  /** 조준 감도 배율 (ADS 시 낮춤) */
  setAimSensitivity(mul) { this._adsSens = clamp(mul, 0.05, 4); }

  addSystem(sys) { this.systems.push(sys); return sys; }

  get arenaBounds() { return ARENA; }
}

function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}
