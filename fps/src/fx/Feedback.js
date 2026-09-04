// "손맛" 계층. 무기/전투 이벤트를 파티클·트레이서·데칼·HUD 연출로 번역한다.
// 게임 로직과 연출을 분리해 어느 쪽도 서로를 몰라도 되게 한다.

import { Vector3 } from 'three';
import { Particles } from './Particles.js';
import { Decals } from './Decals.js';
import { Tracers } from './Tracers.js';
import { SURFACE } from '../world/Collision.js';
import { rng, clamp01, formatNumber } from '../core/Util.js';
import { settings } from '../core/Settings.js';
import { $ } from '../ui/Screens.js';

const DMG_POOL = 26;
const ARROW_POOL = 8;

export class Feedback {
  constructor(game) {
    this.game = game;
    const engine = game.engine;

    this.particles = new Particles(engine, game.collision);
    this.decals = new Decals(engine);
    this.tracers = new Tracers(engine);

    this.particles.onDecal = (x, y, z, nx, ny, nz) => {
      if (rng.chance(0.5)) this.decals.bloodSplat(x, y, z, nx, ny, nz, rng.range(0.5, 1));
    };

    this._v = new Vector3();
    this._muzzle = new Vector3();
    this._eject = new Vector3();

    // ── DOM 연출 풀 ──
    this.hitmarker = $('#hitmarker');
    this.flashEl = $('#flash');
    this.vignetteEl = $('#dmgVignette');
    this.lowHpEl = $('#lowHp');
    this.killfeedEl = $('#killfeed');

    this.dmgLayer = $('#dmgNumbers');
    this.dmgNodes = [];
    for (let i = 0; i < DMG_POOL; i++) {
      const el = document.createElement('div');
      el.className = 'dmgNum';
      el.style.opacity = '0';
      this.dmgLayer.appendChild(el);
      this.dmgNodes.push({ el, active: false, t: 0, life: 1, x: 0, y: 0, vx: 0, vy: 0, world: new Vector3() });
    }
    this.dmgHead = 0;

    this.arrowLayer = $('#dmgIndicators');
    this.arrows = [];
    for (let i = 0; i < ARROW_POOL; i++) {
      const el = document.createElement('div');
      el.className = 'dmgArrow';
      this.arrowLayer.appendChild(el);
      this.arrows.push({ el, t: 0, life: 0, angle: 0 });
    }
    this.arrowHead = 0;

    this._hitTimer = 0;
    this._flashT = 0;
    this._vigT = 0;
    this._pendingDmg = new Map();  // 같은 대상에 대한 데미지 숫자 합산
  }

  // ───────────────────────── 사격 ─────────────────────────

  onFire(weapon, dirV, anyHit) {
    const def = weapon.def;
    const vm = this.game.viewModel;
    const cam = this.game.engine.camera;
    vm.fireKick(def);

    const m = vm.muzzleWorld(cam, this._muzzle);
    this.tracers.muzzle(m.x, m.y, m.z, def.muzzleSize);
    this.particles.muzzleSmoke(m.x, m.y, m.z, dirV.x, dirV.y, dirV.z, def.muzzleSize * 1.4);

    // 탄피 배출 — 카메라 오른쪽 위로 튀어나간다
    {
      const e = vm.ejectWorld(cam, this._eject);
      const right = this.game.rig.right;
      const gy = this.game.collision.groundHeight(e.x, e.z, e.y) ;
      this.particles.shell(
        e.x, e.y, e.z,
        right.x * rng.range(1.6, 2.8) + dirV.x * 0.6 + rng.range(-0.3, 0.3),
        rng.range(1.4, 2.6),
        right.z * rng.range(1.6, 2.8) + dirV.z * 0.6 + rng.range(-0.3, 0.3),
        gy === -Infinity ? 0 : gy,
        def.id !== 'shotgun',
      );
    }
    void anyHit;
  }

  /** 무기 시스템이 예광탄을 요청할 때 */
  tracer(dx, dy, dz, distance, def, widthMul = 1) {
    const vm = this.game.viewModel;
    const m = vm.muzzleWorld(this.game.engine.camera, this._muzzle);
    this.tracers.fire(m.x, m.y, m.z, dx, dy, dz, distance, {
      width: def.tracerWidth * widthMul,
      tint: def.tracerTint,
      speed: def.id === 'sniper' ? 420 : 250,
      trail: def.id === 'sniper' ? 14 : 6,
    });
  }

  /** 월드 표면 명중 */
  worldHit(x, y, z, nx, ny, nz, surface, scale = 1) {
    this.particles.impact(x, y, z, nx, ny, nz, surface === SURFACE.METAL ? 1 : 0, scale);
    this.decals.bulletHole(x, y, z, nx, ny, nz, scale);
  }

  /** 적 명중 */
  enemyHit(hit, damage, isCrit, isKill, enemyName) {
    this.particles.blood(
      hit.x, hit.y, hit.z,
      hit.nx, hit.ny, hit.nz,
      clamp01(damage / 60) * 0.8 + 0.4,
    );
    this.showHitmarker(isKill ? 'kill' : isCrit ? 'crit' : '');
    this.game.audio?.hitmarker(isCrit, isKill);
    if (settings.damageNumbers) this.damageNumber(hit.x, hit.y, hit.z, damage, isCrit, isKill);
    if (isKill) {
      this.killFeed(enemyName || '감염체', isCrit);
      this.game.time.slowmo(0.55, 0.055);
      this.flash(isCrit ? 0.1 : 0.055);
    }
  }

  enemyDeath(x, y, z, gore = 6, tint) {
    this.particles.gibs(x, y, z, gore, tint);
    const gy = this.game.collision.groundHeight(x, z, y);
    if (gy !== -Infinity) {
      this.decals.bloodSplat(x, gy, z, 0, 1, 0, rng.range(1.0, 1.7));
    }
  }

  explosion(x, y, z, radius) {
    this.particles.explosion(x, y, z, radius);
    const gy = this.game.collision.groundHeight(x, z, y);
    if (gy !== -Infinity) this.decals.scorch(x, gy, z, 0, 1, 0, radius / 3.5);
    const d = Math.hypot(
      x - this.game.player.position.x,
      z - this.game.player.position.z,
    );
    this.game.rig.addTrauma(clamp01(1 - d / (radius * 4)) * 0.85);
    this.flash(clamp01(1 - d / (radius * 5)) * 0.35);
  }

  // ───────────────────────── HUD 연출 ─────────────────────────

  showHitmarker(kind) {
    const el = this.hitmarker;
    el.className = '';
    // 리플로우를 강제해 애니메이션을 재시작
    void el.offsetWidth;
    el.className = 'show' + (kind ? ' ' + kind : '');
  }

  flash(amount) {
    this._flashT = Math.max(this._flashT, amount);
  }

  hurtVignette(amount) {
    this._vigT = Math.min(1, this._vigT + amount);
    this.game.postfx?.flashHurt(Math.min(1, amount * 1.2));
  }

  damageDirection(angle) {
    const a = this.arrows[this.arrowHead];
    this.arrowHead = (this.arrowHead + 1) % ARROW_POOL;
    a.t = 0; a.life = 1.1; a.angle = angle;
    // 화면 기준 방위: 0이 정면, 시계 방향
    a.el.style.transform = `rotate(${(angle * 180) / Math.PI}deg)`;
    a.el.style.opacity = '1';
  }

  damageNumber(x, y, z, damage, isCrit, isKill) {
    const n = this.dmgNodes[this.dmgHead];
    this.dmgHead = (this.dmgHead + 1) % DMG_POOL;
    n.active = true;
    n.t = 0;
    n.life = isKill ? 1.0 : 0.72;
    n.world.set(x, y + 0.15, z);
    n.vx = rng.range(-26, 26);
    n.vy = rng.range(-64, -40);
    n.el.textContent = formatNumber(Math.max(1, Math.round(damage)));
    n.el.className = 'dmgNum' + (isKill ? ' kill' : isCrit ? ' crit' : '');
    n.el.style.opacity = '1';
  }

  killFeed(name, crit) {
    const el = document.createElement('div');
    el.className = 'kfItem' + (crit ? ' crit' : '');
    el.textContent = crit ? `${name} · 헤드샷` : `${name} 제거`;
    this.killfeedEl.appendChild(el);
    while (this.killfeedEl.children.length > 5) this.killfeedEl.removeChild(this.killfeedEl.firstChild);
    setTimeout(() => el.remove(), 3200);
  }

  // ───────────────────────── 프레임 갱신 ─────────────────────────

  update(dt) {
    this.particles.update(dt);
    this.decals.update(dt);
    this.tracers.update(dt);
  }

  preRender(dt) {
    this.particles.flush();
    this.decals.flush();
    this.tracers.flush();
    this._updateDom(dt);
  }

  _updateDom(dt) {
    // 화면 플래시
    if (this._flashT > 0) {
      this._flashT = Math.max(0, this._flashT - dt * 4.5);
      this.flashEl.style.opacity = String(this._flashT * 0.55);
    } else if (this.flashEl.style.opacity !== '0') {
      this.flashEl.style.opacity = '0';
    }

    // 피격 비네트
    if (this._vigT > 0) {
      this._vigT = Math.max(0, this._vigT - dt * 1.35);
      this.vignetteEl.style.opacity = String(this._vigT);
    } else if (this.vignetteEl.style.opacity !== '0') {
      this.vignetteEl.style.opacity = '0';
    }

    // 방향 표시
    for (const a of this.arrows) {
      if (a.life <= 0) continue;
      a.t += dt;
      if (a.t >= a.life) { a.life = 0; a.el.style.opacity = '0'; continue; }
      a.el.style.opacity = String(1 - a.t / a.life);
    }

    // 데미지 숫자: 월드 좌표 → 화면 좌표
    const cam = this.game.engine.camera;
    const hw = window.innerWidth / 2, hh = window.innerHeight / 2;
    for (const n of this.dmgNodes) {
      if (!n.active) continue;
      n.t += dt;
      if (n.t >= n.life) {
        n.active = false;
        n.el.style.opacity = '0';
        continue;
      }
      this._v.copy(n.world).project(cam);
      if (this._v.z > 1) { n.active = false; n.el.style.opacity = '0'; continue; }
      const t = n.t / n.life;
      const px = hw + this._v.x * hw + n.vx * n.t;
      const py = hh - this._v.y * hh + n.vy * n.t + 90 * n.t * n.t;
      n.el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) scale(${(1.25 - t * 0.4).toFixed(2)})`;
      n.el.style.opacity = String(1 - t * t);
    }
  }

  setLowHealth(on) {
    this.lowHpEl.classList.toggle('on', on);
  }

  clear() {
    this.particles.clear();
    this.decals.clear();
    this.tracers.clear();
    for (const n of this.dmgNodes) { n.active = false; n.el.style.opacity = '0'; }
    for (const a of this.arrows) { a.life = 0; a.el.style.opacity = '0'; }
    this.killfeedEl.innerHTML = '';
    this._flashT = 0; this._vigT = 0;
    this.flashEl.style.opacity = '0';
    this.vignetteEl.style.opacity = '0';
    this.setLowHealth(false);
  }

  syncFog() {
    this.particles.syncFog();
    this.decals.syncFog();
    this.tracers.syncFog();
  }
}
