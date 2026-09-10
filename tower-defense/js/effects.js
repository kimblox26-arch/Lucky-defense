/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  effects.js
 * -------------------------------------------------------------------------
 *  전투 연출 라이브러리
 *   · 원소별 타격 이펙트 (14종)
 *   · 충격파 링 / 지면 데칼 / 잔상 / 궤적
 *   · 처치 · 처형 · 치명타 · 보호막 파괴 연출
 *   · 보스 등장 시네마틱 · 웨이브 클리어 축포 · 레벨업
 *   · 화면 왜곡(근사) · 스피드라인 · 슬로우모션
 * ========================================================================= */
'use strict';

const VFX = {
  decals: [],       // 지면에 남는 자국
  shockwaves: [],   // 확장 링
  streaks: [],      // 스피드라인
  MAX_DECALS: 60,

  /* =================================================================
   *  원소별 타격
   * ================================================================= */
  hit(elem, x, y, power = 1, g) {
    const col = ELEM[elem] ? ELEM[elem].color : '#ffffff';
    const s = U.clamp(power, .4, 3);
    switch (elem) {
      case 'fire':
        FX.burst(x, y, '#ff9a3a', 7 * s, { speed: 130 * s, size: 4 * s, color2: '#ffe07a', drag: .88 });
        for (let i = 0; i < 3; i++) FX.spawn({
          x: x + U.rand(-6, 6), y: y + U.rand(-6, 6), vx: U.rand(-16, 16), vy: U.rand(-52, -20),
          life: .5, size: 7 * s, size2: 1, color: '#ff6b35', color2: '#2a2028', shape: 'smoke', glow: false
        });
        break;
      case 'ice':
        FX.burst(x, y, '#bfe8ff', 8 * s, { speed: 150 * s, size: 4 * s, shape: 'shard', drag: .84 });
        this.shockwave(x, y, 6, 26 * s, '#8fe0ff', .28, 2);
        break;
      case 'thunder':
        FX.sparks(x, y, '#ffe14d', 9 * s, 320 * s);
        this.arc(x, y, 20 * s, '#ffe14d', g);
        break;
      case 'poison':
        for (let i = 0; i < 6 * s; i++) FX.spawn({
          x, y, vx: U.rand(-60, 60), vy: U.rand(-60, 20), gravity: 90,
          life: U.rand(.4, .8), size: 3.6 * s, color: '#7bdd52', shape: 'circle', drag: .9
        });
        this.decal(x, y, 12 * s, '#7bdd52', 2.2);
        break;
      case 'holy':
        this.shockwave(x, y, 4, 34 * s, '#fff2b0', .34, 3);
        for (let i = 0; i < 5; i++) {
          const a = U.rand(U.TAU);
          FX.spawn({
            x: x + Math.cos(a) * 8, y: y + Math.sin(a) * 8,
            vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 40,
            life: .45, size: 5 * s, color: '#fff6d0', shape: 'star', vrot: 6
          });
        }
        break;
      case 'dark':
        for (let i = 0; i < 7 * s; i++) FX.spawn({
          x, y, vx: U.rand(-70, 70), vy: U.rand(-70, 70), life: .5, size: 5 * s,
          color: '#b57bff', color2: '#2a1040', shape: 'circle', drag: .87
        });
        this.shockwave(x, y, 8, 24 * s, '#b57bff', .3, 2);
        break;
      case 'nature':
        for (let i = 0; i < 5 * s; i++) FX.spawn({
          x, y, vx: U.rand(-70, 70), vy: U.rand(-90, -20), gravity: 160,
          life: .6, size: 4 * s, color: '#3fd68c', shape: 'shard', vrot: U.rand(-7, 7)
        });
        break;
      case 'arcane':
        this.shockwave(x, y, 3, 30 * s, '#ff5bd0', .3, 2.5);
        FX.burst(x, y, '#ff5bd0', 6 * s, { speed: 170 * s, size: 3.6 * s, shape: 'star' });
        break;
      case 'void':
        this.implode(x, y, 28 * s, '#8f7bff');
        break;
      case 'wind':
        for (let i = 0; i < 4; i++) {
          const a = U.rand(U.TAU);
          this.streak(x, y, a, 40 * s, '#9ff5e0');
        }
        break;
      case 'earth':
        for (let i = 0; i < 6 * s; i++) FX.spawn({
          x, y, vx: U.rand(-90, 90), vy: U.rand(-140, -50), gravity: 420,
          life: .7, size: 5 * s, color: '#d2a15e', shape: 'shard', vrot: U.rand(-9, 9)
        });
        this.decal(x, y, 14 * s, '#8a6a3a', 3);
        break;
      case 'blood':
        for (let i = 0; i < 8 * s; i++) FX.spawn({
          x, y, vx: U.rand(-110, 110), vy: U.rand(-110, 40), gravity: 380,
          life: .55, size: 3.4 * s, color: '#ff3d5e', shape: 'circle', drag: .93
        });
        this.decal(x, y, 10 * s, '#8a1020', 4);
        break;
      case 'time':
        this.shockwave(x, y, 5, 28 * s, '#a8b8ff', .5, 2);
        this.shockwave(x, y, 5, 18 * s, '#ffffff', .35, 1.4);
        break;
      default:
        FX.burst(x, y, col, 6 * s, { speed: 130 * s, size: 3.6 * s });
        FX.sparks(x, y, '#ffffff', 3, 200);
    }
  },

  /* =================================================================
   *  기본 프리미티브
   * ================================================================= */
  shockwave(x, y, w, r, color, life, lineW) {
    if (this.shockwaves.length > 40) this.shockwaves.shift();
    this.shockwaves.push({
      x, y, r0: w, r1: r, life, maxLife: life, color, lw: lineW || 2, dead: false
    });
  },

  implode(x, y, r, color) {
    for (let i = 0; i < 14; i++) {
      const a = U.rand(U.TAU), d = r * U.rand(.8, 1.6);
      FX.spawn({
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
        vx: -Math.cos(a) * d * 3.4, vy: -Math.sin(a) * d * 3.4,
        life: .32, size: 4, color, shape: 'spark'
      });
    }
    FX.spawn({ x, y, life: .3, size: r * .9, size2: 0, color, shape: 'glow' });
  },

  decal(x, y, r, color, life) {
    if (this.decals.length >= this.MAX_DECALS) this.decals.shift();
    this.decals.push({
      x, y, r: r * U.rand(.85, 1.2), color,
      life, maxLife: life, rot: U.rand(U.TAU), seed: U.rand(100)
    });
  },

  streak(x, y, ang, len, color) {
    if (this.streaks.length > 30) this.streaks.shift();
    this.streaks.push({ x, y, ang, len, color, life: .22, maxLife: .22 });
  },

  /** 짧은 번개 아크 */
  arc(x, y, r, color, g) {
    if (!g) return;
    const pts = [];
    const a0 = U.rand(U.TAU);
    let cx = x + Math.cos(a0) * r, cy = y + Math.sin(a0) * r;
    pts.push({ x: cx, y: cy });
    for (let i = 0; i < 3; i++) {
      cx += U.rand(-r * .8, r * .8); cy += U.rand(-r * .8, r * .8);
      pts.push({ x: cx, y: cy });
    }
    g.beams.push(new Beam(pts, color, .1, 2.5));
  },

  /* =================================================================
   *  상황별 연출
   * ================================================================= */
  crit(x, y, g) {
    this.shockwave(x, y, 4, 40, '#ffd24d', .26, 3);
    FX.sparks(x, y, '#ffd24d', 10, 340);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * U.TAU + .4;
      this.streak(x, y, a, 34, '#ffe9a0');
    }
    FX.shake(2.6);
  },

  execute(x, y, g) {
    this.shockwave(x, y, 6, 60, '#ff4f7e', .4, 4);
    this.implode(x, y, 34, '#ff4f7e');
    FX.burst(x, y, '#ff4f7e', 18, { speed: 300, shape: 'shard', size: 6 });
    FX.stop(.05);
    FX.shake(6);
  },

  shieldBreak(x, y, g) {
    this.shockwave(x, y, 8, 46, '#7fd8ff', .35, 3);
    for (let i = 0; i < 14; i++) {
      const a = U.rand(U.TAU);
      FX.spawn({
        x, y, vx: Math.cos(a) * U.rand(120, 260), vy: Math.sin(a) * U.rand(120, 260),
        life: .55, size: 5, color: '#bfe8ff', shape: 'shard', vrot: U.rand(-10, 10), gravity: 120
      });
    }
    FX.flash('#7fd8ff', .16);
  },

  kill(x, y, color, boss, g) {
    if (boss) {
      for (let ring = 0; ring < 3; ring++) {
        setTimeout(() => this.shockwave(x, y, 10, 160 + ring * 60, color, .55, 5), ring * 110);
      }
      FX.burst(x, y, color, 40, { speed: 380, size: 9, shape: 'star' });
      FX.burst(x, y, '#ffffff', 26, { speed: 260, size: 6 });
      this.decal(x, y, 60, color, 6);
      FX.stop(.14); FX.shake(20); FX.flash('#ffffff', .5);
    } else {
      this.shockwave(x, y, 3, 26, color, .22, 2);
      FX.burst(x, y, color, 9, { speed: 160, size: 4.4, drag: .88 });
      this.decal(x, y, 9, color, 1.6);
    }
  },

  /** 보스 등장 시네마틱 */
  bossIntro(e, g) {
    FX.flash('#ff2a2a', .5);
    FX.shake(16);
    SFX.play('boss');
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.shockwave(e.x, e.y, 12, 200, e.def.color, .8, 6), i * 160);
    }
    for (let i = 0; i < 26; i++) {
      const a = U.rand(U.TAU), d = U.rand(60, 200);
      FX.spawn({
        x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d,
        vx: -Math.cos(a) * d * 2.2, vy: -Math.sin(a) * d * 2.2,
        life: .6, size: 6, color: e.def.color, shape: 'spark'
      });
    }
    FX.popText(e.x, e.y - g.ts * 2, e.def.name, e.def.color, 22, { life: 2, vy: -18 });
  },

  /** 웨이브 클리어 축포 */
  waveClear(g) {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const x = U.rand(g.W * .2, g.W * .8), y = U.rand(g.H * .2, g.H * .5);
        const col = U.pick(['#ffd24d', '#5ce07a', '#4ea8ff', '#ff4f7e', '#6ffff0']);
        this.shockwave(x, y, 4, 90, col, .5, 3);
        FX.burst(x, y, col, 26, { speed: 260, size: 5, shape: 'star', gravity: 180 });
        SFX.play('coin');
      }, i * 150);
    }
  },

  /** 레벨업 / 승급 */
  ascend(x, y, color, g) {
    for (let ring = 0; ring < 3; ring++) {
      setTimeout(() => this.shockwave(x, y, 6, 70 + ring * 34, color, .5, 3), ring * 120);
    }
    for (let i = 0; i < 22; i++) {
      const a = U.rand(U.TAU);
      FX.spawn({
        x: x + Math.cos(a) * 12, y: y + Math.sin(a) * 12,
        vx: Math.cos(a) * 40, vy: -U.rand(120, 260),
        life: 1.0, size: 6, color, shape: 'star', vrot: U.rand(-8, 8), gravity: 90
      });
    }
    FX.flash(color, .3);
  },

  /** 소환 연출 (등급별) */
  /**
   * 소환 연출의 "뜸 들이기".
   * 가챠의 재미는 터지는 순간보다 터지기 직전의 기대감에서 나온다.
   * 등급이 높을수록 오래, 여러 겹으로 빨려 들어왔다가 터진다.
   */
  gachaCharge(x, y, ri, color, g) {
    const dur = .18 + ri * .07;               /* 등급이 높을수록 길게 뜸 들인다 */
    const rings = 2 + ri;
    for (let i = 0; i < rings; i++) {
      setTimeout(() => {
        if (!g || g.state !== 'playing') return;
        /* 바깥에서 안으로 빨려 들어오는 입자 */
        const r0 = g.ts * (2.4 + ri * .5);
        for (let k = 0; k < 6 + ri * 2; k++) {
          const a = U.rand(U.TAU);
          FX.spawn({
            x: x + Math.cos(a) * r0, y: y + Math.sin(a) * r0,
            vx: -Math.cos(a) * r0 / dur * .9, vy: -Math.sin(a) * r0 / dur * .9,
            life: dur, size: 3 + ri * .5, color, shape: ri >= 4 ? 'star' : 'circle',
          });
        }
        SFX.play('charge');
      }, i * (dur * 1000 / rings));
    }
    /* 발밑이 점점 밝아진다 */
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!g || g.state !== 'playing') return;
        FX.ring(x, y, color, g.ts * (1.4 - i * .28), .18);
      }, i * (dur * 250));
    }
    return dur * 1000;
  },

  summon(x, y, rarityIdx, color, g) {
    const n = 8 + rarityIdx * 5;
    this.shockwave(x, y, 4, 40 + rarityIdx * 14, color, .45, 2 + rarityIdx * .4);
    FX.burst(x, y, color, n, {
      speed: 140 + rarityIdx * 40, size: 4 + rarityIdx * .8,
      shape: rarityIdx >= 4 ? 'star' : 'circle'
    });
    if (rarityIdx >= 4) {
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * U.TAU;
        this.streak(x, y, a, 40 + rarityIdx * 8, color);
      }
    }
    if (rarityIdx >= 6) {
      for (let ring = 0; ring < 3; ring++)
        setTimeout(() => this.shockwave(x, y, 8, 120 + ring * 50, color, .6, 4), ring * 130);
    }
  },

  /* =================================================================
   *  업데이트 / 렌더
   * ================================================================= */
  update(dt) {
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.life -= dt;
      if (d.life <= 0) this.decals.splice(i, 1);
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life -= dt;
      if (s.life <= 0) this.shockwaves.splice(i, 1);
    }
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const s = this.streaks[i];
      s.life -= dt;
      if (s.life <= 0) this.streaks.splice(i, 1);
    }
  },

  /** 지면 데칼 (유닛/적보다 아래) */
  drawGround(c) {
    for (const d of this.decals) {
      const a = U.clamp(d.life / d.maxLife, 0, 1);
      c.save();
      c.globalAlpha = a * .4;
      c.translate(d.x, d.y); c.rotate(d.rot);
      c.fillStyle = d.color;
      c.beginPath();
      for (let i = 0; i < 7; i++) {
        const ang = i / 7 * U.TAU;
        const rr = d.r * (.7 + GFX.hash(i, d.seed | 0, 13) * .5);
        i ? c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr * .55)
          : c.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr * .55);
      }
      c.closePath(); c.fill();
      c.restore();
    }
  },

  /** 상단 이펙트 */
  drawTop(c) {
    for (const s of this.shockwaves) {
      const t = 1 - s.life / s.maxLife;
      const r = U.lerp(s.r0, s.r1, U.easeOut(t));
      c.save();
      c.globalAlpha = (1 - t) * .9;
      c.strokeStyle = s.color; c.lineWidth = s.lw * (1 - t * .6);
      c.shadowColor = s.color; c.shadowBlur = 12;
      c.beginPath(); c.arc(s.x, s.y, r, 0, U.TAU); c.stroke();
      c.restore();
    }
    for (const s of this.streaks) {
      const a = s.life / s.maxLife;
      c.save();
      c.globalAlpha = a;
      c.strokeStyle = s.color; c.lineWidth = 2.2; c.lineCap = 'round';
      c.shadowColor = s.color; c.shadowBlur = 10;
      const d0 = s.len * (1 - a) * .6;
      c.beginPath();
      c.moveTo(s.x + Math.cos(s.ang) * d0, s.y + Math.sin(s.ang) * d0);
      c.lineTo(s.x + Math.cos(s.ang) * (d0 + s.len * a), s.y + Math.sin(s.ang) * (d0 + s.len * a));
      c.stroke();
      c.restore();
    }
  },

  clear() {
    this.decals.length = 0;
    this.shockwaves.length = 0;
    this.streaks.length = 0;
  },
};

window.VFX = VFX;
