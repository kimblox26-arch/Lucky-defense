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
import { WeaponSystem } from '../player/Weapons.js';
import { ViewModel } from '../player/ViewModel.js';
import { PostFX } from '../fx/PostFX.js';
import { Feedback } from '../fx/Feedback.js';
import { HUD } from '../ui/HUD.js';
import { Screens, $ } from '../ui/Screens.js';
import { clamp, lerp } from '../core/Util.js';

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
    this.weapons = new WeaponSystem(this);

    this.systems = [];
    this.enemies = null;      // C단계에서 주입
    this.elapsed = 0;
    this.running = false;

    this._forward = new Vector3();
    this._hits = [];
    this._rayOut = {};
    this._bound = this._frame.bind(this);

    this.input.onLockLost = () => {
      if (this.state === STATE.PLAYING) this.pause();
    };
    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === STATE.PLAYING) this.pause();
    });
  }

  async init(onProgress = () => {}) {
    const step = async (p, label, fn) => {
      onProgress(p, label);
      await nextFrame();
      await fn();
    };

    this.engine.setQuality(settings.quality);

    await step(0.06, '지형 데이터 해석 중…', () => {
      this.arena = new Arena(this.engine, this.collision);
    });
    await step(0.22, '표면 재질 합성 중…', () => {
      this.arena.build();
      this.player.position.copy(this.arena.playerStart);
    });
    await step(0.48, '조명 배치 중…', () => {
      this.lighting = new Lighting(this.engine);
    });
    await step(0.6, '환경 반사 계산 중…', () => {
      this.engine.bakeEnvironment();
    });
    await step(0.7, '장비 점검 중…', () => {
      this.viewModel = new ViewModel(this.engine, this.weapons);
      this.viewModel.syncEnv();
      this.postfx = new PostFX(this.engine, this.viewModel);
    });
    await step(0.82, '전투 시스템 연결 중…', () => {
      this.fx = new Feedback(this);
      this.hud = new HUD(this);
      this._wireWeapons();
      this._wirePlayer();
    });
    await step(0.93, '셰이더 컴파일 중…', () => {
      this.rig.update(FIXED_DT, this.player, 0);
      this.engine.renderer.compile(this.engine.scene, this.engine.camera);
      this.engine.renderer.compile(this.viewModel.scene, this.viewModel.camera);
      this.engine.resize();
    });
    await step(1, '준비 완료', () => {});

    this.engine.onQualityChange = (q) => {
      this.lighting.applyQuality(q);
      this.postfx.applyQuality(q);
    };
    this.engine.onEnvBaked = () => {
      this.viewModel.syncEnv();
      this.fx?.syncFog();
    };

    this.state = STATE.MENU;
    this.screens.show('scMenu');
    this.start();
    return this;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.time._last = 0;
    requestAnimationFrame(this._bound);
  }

  // ───────────────────────── 이벤트 배선 ─────────────────────────

  _wireWeapons() {
    const ws = this.weapons;
    ws.onFire = (w, origin, dir, spread, anyHit) => {
      this.fx.onFire(w, dir, anyHit);
      this.audio?.gunshot(w.def);
    };
    ws.onHit = (hit, damage, isCrit) => {
      if (hit.type === 'world') {
        this.fx.worldHit(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz, hit.surface,
          this.weapons.def.pellets > 1 ? 0.55 : 1);
        this.audio?.impact(hit.x, hit.y, hit.z, hit.surface);
      } else if (hit.type === 'enemy' && this.enemies) {
        this.enemies.damage(hit.enemy, damage, hit, isCrit);
      }
    };
    ws.onReloadStart = (w, dur) => {
      this.viewModel.reload(dur);
      this.audio?.reload(w.def);
    };
    ws.onSwitch = (w) => {
      this.viewModel.setWeapon(w);
      this.viewModel.switchAnim();
      this.hud?.refreshSlots();
      this.audio?.weaponSwitch();
    };
    ws.onDryFire = () => this.audio?.dryFire();
    ws.onAmmoChange = () => { /* HUD가 매 프레임 읽으므로 별도 처리 불필요 */ };
  }

  _wirePlayer() {
    const p = this.player;
    p.onDamage = (dmg, angle) => {
      this.fx.hurtVignette(clamp(dmg / 40, 0.15, 1));
      this.fx.damageDirection(angle);
      this.audio?.playerHurt();
    };
    p.onDeath = () => this.onPlayerDeath?.();
    p.onLand = (impact, surface) => this.audio?.land(impact, surface);
    p.onFootstep = (surface, intensity) => this.audio?.footstep(surface, intensity);
  }

  // ───────────────────────── 명중 판정 ─────────────────────────

  /**
   * 월드와 적을 함께 관통 순서대로 반환한다.
   * @returns {Array<{type,x,y,z,nx,ny,nz,distance,enemy?,part?,surface?}>}
   */
  hitscan(ox, oy, oz, dx, dy, dz, maxDist, penetration = 0) {
    const out = this._hits;
    out.length = 0;

    const world = this.collision.raycast(ox, oy, oz, dx, dy, dz, maxDist, this._rayOut);
    const wallDist = world ? world.t : maxDist;

    if (this.enemies) {
      // 벽보다 가까운 적만 후보
      const eh = this.enemies.raycast(ox, oy, oz, dx, dy, dz, Math.min(wallDist, maxDist));
      const limit = Math.min(eh.length, penetration + 1);
      for (let i = 0; i < limit; i++) {
        const h = eh[i];
        out.push({
          type: 'enemy', enemy: h.enemy, part: h.part, distance: h.t,
          x: ox + dx * h.t, y: oy + dy * h.t, z: oz + dz * h.t,
          nx: -dx, ny: -dy, nz: -dz,
        });
      }
      // 관통 한도를 다 쓰면 벽까지 도달하지 않는다
      if (eh.length > limit) return out;
    }

    if (world) {
      out.push({
        type: 'world', distance: world.t, surface: world.surface,
        x: ox + dx * world.t, y: oy + dy * world.t, z: oz + dz * world.t,
        nx: world.nx, ny: world.ny, nz: world.nz,
      });
    }
    return out;
  }

  // ───────────────────────── 상태 전환 ─────────────────────────

  beginRun() {
    this.elapsed = 0;
    this.player.reset(this.arena.playerStart.x, this.arena.playerStart.y, this.arena.playerStart.z, 0);
    this.rig.reset(0, 0);
    this.weapons.resetForRun();
    this.viewModel.setWeapon(this.weapons.cur);
    this.lighting.setMood(0);
    this.fx.clear();
    this.hud.reset();
    this.hud.setScore(0);
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
    this.audio?.resume();
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
    this.audio?.setPaused(true);
    for (const s of this.systems) s.onPause?.();
  }

  resume() {
    if (this.state !== STATE.PAUSED) return;
    this._enterPlaying();
    this.audio?.setPaused(false);
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
    this.fx.clear();
    this.audio?.setPaused(false);
    for (const s of this.systems) s.onRunEnd?.();
  }

  _onKeyDown(e) {
    if (e.code === 'Escape') {
      if (this.state === STATE.PLAYING) { e.preventDefault(); this.pause(); }
      else if (this.state === STATE.PAUSED) { e.preventDefault(); this.resume(); }
    }
  }

  // ───────────────────────── 루프 ─────────────────────────

  _frame(nowMs) {
    if (!this.running) return;
    requestAnimationFrame(this._bound);
    if (this.engine.contextLost) return;

    const steps = this.time.begin(nowMs);
    this.engine.updateAdaptive(this.time.rawFrameDt * 1000);

    const intent = this.input.update();

    // 시야 회전은 렌더 프레임 단위로 처리해 입력 지연을 최소화한다
    if (this.state === STATE.PLAYING && (intent.lookX || intent.lookY)) {
      const sens = lerp(1, settings.adsSensitivity, this.weapons.ads);
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
    this.weapons.update(dt, intent, this.player, playing);
    this.fx.update(dt);

    for (const s of this.systems) s.update?.(dt, intent, playing);
  }

  _preRender(dt) {
    const d = dt || 1 / 240;
    this.rig.update(d, this.player, this.time.raw);
    this._forward.copy(this.rig.flatForward);
    this.lighting.update(this.player.position, this._forward);
    this.arena.update(this.time.raw);
    this.viewModel.update(d, this.player, this.rig, this.weapons);

    const scopeAds = this.weapons.def.id === 'sniper' ? this.weapons.ads : 0;
    this.postfx.update(d, this.player.health / this.player.maxHealth, scopeAds);

    this.fx.preRender(d);
    this.hud.update(d);
    for (const s of this.systems) s.preRender?.(d, this.time.raw);
  }

  addSystem(sys) { this.systems.push(sys); return sys; }

  get arenaBounds() { return ARENA; }
}

function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}
