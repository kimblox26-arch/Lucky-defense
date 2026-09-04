// 무기 정의 + 사격/재장전/조준 로직.
// 명중 판정은 game.hitscan()에 위임한다(월드와 적을 함께 처리).

import { rng, clamp, clamp01, lerp } from '../core/Util.js';

export const WEAPONS = [
  {
    id: 'pistol', name: 'M9 사이드암', short: '권총', slot: 1, icon: '🔫',
    damage: 26, headMul: 2.2, legMul: 0.7,
    rpm: 420, auto: false, pellets: 1, penetration: 0,
    magSize: 15, reserveMax: Infinity, reloadTime: 1.35,
    spreadBase: 0.0045, spreadMove: 0.016, spreadAir: 0.03,
    spreadPerShot: 0.011, spreadMax: 0.075, spreadRecover: 0.09,
    recoilPitch: 0.030, recoilYaw: 0.011, recoilRecover: 0.6,
    range: 90, falloffStart: 28, falloffEnd: 60, falloffMin: 0.55,
    adsFov: 0.82, adsTime: 0.16, adsSpreadMul: 0.25,
    tracerEvery: 2, tracerTint: [2.4, 1.5, 0.6], tracerWidth: 0.024,
    muzzleSize: 0.34, shellSize: 0.9, kickFov: 1.2,
    unlocked: true,
  },
  {
    id: 'smg', name: 'MP7 기관단총', short: 'SMG', slot: 2, icon: '💥',
    damage: 17, headMul: 1.8, legMul: 0.7,
    rpm: 900, auto: true, pellets: 1, penetration: 0,
    magSize: 40, reserveMax: 280, reloadTime: 1.75,
    spreadBase: 0.010, spreadMove: 0.022, spreadAir: 0.05,
    spreadPerShot: 0.0075, spreadMax: 0.095, spreadRecover: 0.13,
    recoilPitch: 0.017, recoilYaw: 0.010, recoilRecover: 0.5,
    range: 70, falloffStart: 16, falloffEnd: 38, falloffMin: 0.45,
    adsFov: 0.86, adsTime: 0.14, adsSpreadMul: 0.42,
    tracerEvery: 3, tracerTint: [2.2, 1.4, 0.6], tracerWidth: 0.022,
    muzzleSize: 0.3, shellSize: 0.8, kickFov: 0.8,
  },
  {
    id: 'shotgun', name: 'SPAS-12 산탄총', short: '산탄총', slot: 3, icon: '🧨',
    damage: 15, headMul: 1.5, legMul: 0.8,
    rpm: 78, auto: false, pellets: 10, penetration: 1,
    magSize: 7, reserveMax: 84, reloadTime: 0.42, shellReload: true,
    spreadBase: 0.055, spreadMove: 0.018, spreadAir: 0.03,
    spreadPerShot: 0.004, spreadMax: 0.09, spreadRecover: 0.2,
    recoilPitch: 0.085, recoilYaw: 0.022, recoilRecover: 0.7,
    range: 34, falloffStart: 7, falloffEnd: 22, falloffMin: 0.22,
    adsFov: 0.92, adsTime: 0.2, adsSpreadMul: 0.62,
    tracerEvery: 0, tracerTint: [2.0, 1.2, 0.5], tracerWidth: 0.02,
    muzzleSize: 0.62, shellSize: 1.5, kickFov: 2.6, knockback: 2.2,
  },
  {
    id: 'rifle', name: 'AK-74 돌격소총', short: '소총', slot: 4, icon: '🎯',
    damage: 31, headMul: 2.0, legMul: 0.75,
    rpm: 620, auto: true, pellets: 1, penetration: 1,
    magSize: 30, reserveMax: 240, reloadTime: 2.1,
    spreadBase: 0.006, spreadMove: 0.024, spreadAir: 0.055,
    spreadPerShot: 0.010, spreadMax: 0.085, spreadRecover: 0.11,
    recoilPitch: 0.030, recoilYaw: 0.013, recoilRecover: 0.55,
    range: 110, falloffStart: 34, falloffEnd: 75, falloffMin: 0.6,
    adsFov: 0.7, adsTime: 0.19, adsSpreadMul: 0.2,
    tracerEvery: 2, tracerTint: [2.6, 1.6, 0.6], tracerWidth: 0.026,
    muzzleSize: 0.42, shellSize: 1.1, kickFov: 1.6,
  },
  {
    id: 'sniper', name: 'M82 대물저격총', short: '저격총', slot: 5, icon: '🎖️',
    damage: 210, headMul: 2.6, legMul: 0.9,
    rpm: 48, auto: false, pellets: 1, penetration: 4,
    magSize: 5, reserveMax: 40, reloadTime: 3.0,
    spreadBase: 0.0016, spreadMove: 0.05, spreadAir: 0.1,
    spreadPerShot: 0.03, spreadMax: 0.12, spreadRecover: 0.35,
    recoilPitch: 0.14, recoilYaw: 0.02, recoilRecover: 0.75,
    range: 200, falloffStart: 120, falloffEnd: 200, falloffMin: 0.85,
    adsFov: 0.32, adsTime: 0.28, adsSpreadMul: 0.02,
    tracerEvery: 1, tracerTint: [3.2, 2.2, 1.2], tracerWidth: 0.038,
    muzzleSize: 0.8, shellSize: 1.8, kickFov: 3.4, knockback: 3.0,
  },
];

export class WeaponSystem {
  constructor(game) {
    this.game = game;
    this.list = WEAPONS.map((w) => ({
      def: w,
      unlocked: !!w.unlocked,
      mag: w.magSize,
      reserve: w.reserveMax === Infinity ? Infinity : Math.round(w.reserveMax * 0.6),
    }));
    this.index = 0;
    this.spread = 0;
    this.cooldown = 0;
    this.reloading = false;
    this.reloadT = 0;
    this.reloadDur = 0;
    this.switching = 0;
    this.switchTo = -1;
    this.ads = 0;              // 0..1
    this.adsHeld = false;
    this.shotsFired = 0;
    this.recoilStep = 0;

    // 강화로 변하는 배수
    this.mods = {
      damage: 1, fireRate: 1, reloadSpeed: 1, magSize: 1,
      spread: 1, headshot: 1, penetration: 0, lifesteal: 0,
      explosive: 0, ammoGain: 1,
    };

    this.onFire = null;        // (weapon, originV, dirV, spread)
    this.onHit = null;         // (hitInfo, damage, isKill)
    this.onReloadStart = null;
    this.onReloadEnd = null;
    this.onSwitch = null;
    this.onDryFire = null;
    this.onAmmoChange = null;
  }

  get cur() { return this.list[this.index]; }
  get def() { return this.list[this.index].def; }
  get isReloading() { return this.reloading; }
  get adsAmount() { return this.ads; }

  unlock(id) {
    const w = this.list.find((x) => x.def.id === id);
    if (!w || w.unlocked) return false;
    w.unlocked = true;
    w.mag = Math.round(w.def.magSize * this.mods.magSize);
    w.reserve = w.def.reserveMax === Infinity ? Infinity : w.def.reserveMax;
    return true;
  }

  maxMag(w = this.cur) { return Math.round(w.def.magSize * this.mods.magSize); }

  giveAmmo(fraction = 0.35) {
    for (const w of this.list) {
      if (!w.unlocked || w.def.reserveMax === Infinity) continue;
      w.reserve = Math.min(w.def.reserveMax, w.reserve + Math.ceil(w.def.reserveMax * fraction));
    }
    this.onAmmoChange?.();
  }

  refillAll() {
    for (const w of this.list) {
      if (!w.unlocked) continue;
      w.mag = this.maxMag(w);
      if (w.def.reserveMax !== Infinity) w.reserve = w.def.reserveMax;
    }
    this.reloading = false;
    this.onAmmoChange?.();
  }

  resetForRun() {
    for (const w of this.list) {
      w.unlocked = !!w.def.unlocked;
      w.mag = w.def.magSize;
      w.reserve = w.def.reserveMax === Infinity ? Infinity : Math.round(w.def.reserveMax * 0.6);
    }
    for (const k of Object.keys(this.mods)) this.mods[k] = (k === 'penetration' || k === 'lifesteal' || k === 'explosive') ? 0 : 1;
    this.index = 0;
    this.spread = 0;
    this.cooldown = 0;
    this.reloading = false;
    this.switching = 0;
    this.ads = 0;
    this.onAmmoChange?.();
    this.onSwitch?.(this.cur, true);
  }

  switchTo_(idx) {
    if (idx === this.index || idx < 0 || idx >= this.list.length) return false;
    if (!this.list[idx].unlocked) return false;
    if (this.switching > 0) return false;
    this.switching = 0.42;
    this.switchTo = idx;
    this.reloading = false;
    return true;
  }

  cycle(dir) {
    const n = this.list.length;
    for (let k = 1; k <= n; k++) {
      const i = ((this.index + dir * k) % n + n) % n;
      if (this.list[i].unlocked) return this.switchTo_(i);
    }
    return false;
  }

  startReload() {
    const w = this.cur;
    if (this.reloading || this.switching > 0) return false;
    if (w.mag >= this.maxMag(w)) return false;
    if (w.reserve !== Infinity && w.reserve <= 0) return false;
    this.reloading = true;
    this.reloadT = 0;
    this.reloadDur = (w.def.shellReload ? w.def.reloadTime : w.def.reloadTime) / this.mods.reloadSpeed;
    this.onReloadStart?.(w, this.reloadDur);
    return true;
  }

  _finishReload() {
    const w = this.cur;
    const max = this.maxMag(w);
    if (w.def.shellReload) {
      // 산탄총: 한 발씩 장전, 가득 찰 때까지 반복
      if (w.reserve === Infinity) w.mag = Math.min(max, w.mag + 1);
      else { const n = Math.min(1, w.reserve, max - w.mag); w.mag += n; w.reserve -= n; }
      this.onReloadEnd?.(w, w.mag < max && (w.reserve === Infinity || w.reserve > 0));
      if (w.mag < max && (w.reserve === Infinity || w.reserve > 0)) {
        this.reloadT = 0;
        this.reloadDur = w.def.reloadTime / this.mods.reloadSpeed;
        return;
      }
    } else {
      const need = max - w.mag;
      if (w.reserve === Infinity) w.mag = max;
      else { const n = Math.min(need, w.reserve); w.mag += n; w.reserve -= n; }
      this.onReloadEnd?.(w, false);
    }
    this.reloading = false;
    this.onAmmoChange?.();
  }

  cancelReload() {
    if (!this.reloading) return;
    this.reloading = false;
    this.onReloadEnd?.(this.cur, false);
  }

  /** 현재 조준 확산(라디안). 크로스헤어 크기 계산에도 사용. */
  currentSpread(player) {
    const d = this.def;
    let s = d.spreadBase + this.spread;
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    s += d.spreadMove * clamp01(speed / 7.5);
    if (!player.grounded) s += d.spreadAir;
    if (player.crouching) s *= 0.7;
    s *= lerp(1, d.adsSpreadMul, this.ads);
    s *= this.mods.spread;
    return s;
  }

  update(dt, intent, player, playing) {
    const d = this.def;

    // ── 무기 전환 ──
    if (this.switching > 0) {
      const prev = this.switching;
      this.switching -= dt;
      if (prev > 0.21 && this.switching <= 0.21 && this.switchTo >= 0) {
        this.index = this.switchTo;
        this.switchTo = -1;
        this.onSwitch?.(this.cur, false);
        this.onAmmoChange?.();
      }
      if (this.switching < 0) this.switching = 0;
    }

    // ── 조준 ──
    const wantAds = playing && !!intent.ads && this.switching === 0;
    this.adsHeld = wantAds;
    const adsSpeed = dt / Math.max(0.02, d.adsTime / this.mods.fireRate ** 0.2);
    this.ads = clamp(this.ads + (wantAds ? adsSpeed : -adsSpeed * 1.4), 0, 1);
    player.setAds(this.ads > 0.35);

    // ── 확산 회복 ──
    this.spread = Math.max(0, this.spread - d.spreadRecover * dt * (1 + this.ads));
    if (this.spread < 1e-5) { this.spread = 0; this.recoilStep = 0; }

    // ── 재장전 ──
    if (this.reloading) {
      this.reloadT += dt;
      if (this.reloadT >= this.reloadDur) this._finishReload();
    }

    this.cooldown -= dt;
    if (!playing) return;

    // ── 입력 처리 ──
    if (intent.weaponSlot > 0) {
      const idx = this.list.findIndex((w) => w.def.slot === intent.weaponSlot);
      if (idx >= 0) this.switchTo_(idx);
    }
    if (intent.weaponCycle) this.cycle(intent.weaponCycle > 0 ? 1 : -1);
    if (intent.reload) this.startReload();

    const wantFire = d.auto ? intent.fire : intent.firePressed;
    if (wantFire && this.canFire()) this._fire(player);
    else if (intent.firePressed && this.cur.mag <= 0 && !this.reloading && this.switching === 0) {
      this.onDryFire?.(this.cur);
      this.startReload();
    }
  }

  canFire() {
    return this.cooldown <= 0 && !this.reloading && this.switching === 0 && this.cur.mag > 0;
  }

  _fire(player) {
    const w = this.cur;
    const d = w.def;
    const g = this.game;

    w.mag--;
    this.shotsFired++;
    this.recoilStep++;
    this.cooldown = 60 / (d.rpm * this.mods.fireRate);
    this.spread = Math.min(d.spreadMax, this.spread + d.spreadPerShot);

    const spread = this.currentSpread(player);
    const eye = player.eyePosition;
    const fwd = g.rig.forward;
    const right = g.rig.right;
    // 카메라 상방 (forward × right의 반대)
    const upx = right.z * fwd.y - right.y * fwd.z;
    const upy = right.x * fwd.z - right.z * fwd.x;
    const upz = right.y * fwd.x - right.x * fwd.y;

    const pellets = d.pellets;
    const baseDamage = d.damage * this.mods.damage;
    let anyHit = false;

    for (let p = 0; p < pellets; p++) {
      // 원판 내 균등 분포로 확산 — 사각형 분포보다 자연스럽다
      const a = rng.range(0, Math.PI * 2);
      const r = Math.sqrt(rng.float()) * spread * (pellets > 1 ? 1 : 1);
      const ox = Math.cos(a) * r, oy = Math.sin(a) * r;

      let dx = fwd.x + right.x * ox + upx * oy;
      let dy = fwd.y + right.y * ox + upy * oy;
      let dz = fwd.z + right.z * ox + upz * oy;
      const len = Math.hypot(dx, dy, dz);
      dx /= len; dy /= len; dz /= len;

      const pen = d.penetration + this.mods.penetration;
      const hits = g.hitscan(eye.x, eye.y, eye.z, dx, dy, dz, d.range, pen);

      let dist = d.range;
      for (let h = 0; h < hits.length; h++) {
        const hit = hits[h];
        dist = hit.distance;
        if (hit.type === 'enemy') {
          const falloff = this._falloff(d, hit.distance);
          let mul = 1;
          if (hit.part === 'head') mul = d.headMul * this.mods.headshot;
          else if (hit.part === 'leg') mul = d.legMul;
          // 관통할수록 위력 감소
          const penMul = Math.pow(0.72, h);
          const dmg = baseDamage * mul * falloff * penMul;
          this.onHit?.(hit, dmg, hit.part === 'head');
          anyHit = true;
        } else {
          this.onHit?.(hit, 0, false);
          break;
        }
      }
      if (!hits.length) dist = d.range;

      // 예광탄 — 모든 탄에 그리면 지저분하므로 간헐적으로
      const showTracer = d.tracerEvery > 0
        ? (this.shotsFired % d.tracerEvery === 0 || pellets > 1)
        : false;
      if (showTracer || pellets > 1) {
        g.fx?.tracer(dx, dy, dz, Math.min(dist, d.range), d, pellets > 1 ? 0.6 : 1);
      }
    }

    // ── 반동 ──
    const rec = this._recoilPattern(this.recoilStep);
    const adsMul = lerp(1, 0.62, this.ads);
    g.rig.addRecoil(
      d.recoilPitch * rec.p * adsMul,
      d.recoilYaw * rec.y * adsMul,
      d.recoilRecover,
    );
    g.rig.kickFov(d.kickFov * adsMul * 0.5);
    g.rig.addTrauma(clamp01(d.recoilPitch * 2.2) * adsMul);
    if (d.knockback) player.applyImpulse(-fwd.x * d.knockback, 0, -fwd.z * d.knockback);

    this.onFire?.(w, eye, fwd, spread, anyHit);
    this.onAmmoChange?.();

    if (w.mag <= 0) this.startReload();
  }

  /** 무기별 반동 패턴 — 첫 발은 수직, 이후 좌우로 흔들린다 */
  _recoilPattern(step) {
    const s = step;
    const p = 1 + Math.min(0.9, s * 0.05);
    let y;
    if (s <= 3) y = rng.range(-0.35, 0.35);
    else y = Math.sin(s * 0.7) * 0.9 + rng.range(-0.4, 0.4);
    return { p, y };
  }

  _falloff(d, dist) {
    if (dist <= d.falloffStart) return 1;
    if (dist >= d.falloffEnd) return d.falloffMin;
    const t = (dist - d.falloffStart) / (d.falloffEnd - d.falloffStart);
    return lerp(1, d.falloffMin, t);
  }

  /** 크로스헤어 벌어짐(픽셀 단위 반경) */
  crosshairGap(player, viewportH, fovDeg) {
    const s = this.currentSpread(player);
    const halfFov = (fovDeg * Math.PI) / 360;
    return Math.tan(s) / Math.tan(halfFov) * (viewportH / 2);
  }
}
