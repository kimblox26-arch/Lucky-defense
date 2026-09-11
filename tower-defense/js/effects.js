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
  /**
   * 치명타 — 크기(power 0~1)에 따라 "툭" 부터 "쾅" 까지 같은 문법으로 커진다.
   * 십자 섬광 + 조각 파편 + 히트스톱 + 색수차 + 카메라 킥.
   */
  crit(x, y, g, power, ang) {
    const p = U.clamp(power == null ? .3 : power, 0, 1);
    const R = 34 + p * 70;
    this.shockwave(x, y, 4, R, '#ffd24d', .26 + p * .18, 3 + p * 4);
    this.shockwave(x, y, 2, R * .55, '#ffffff', .18 + p * .1, 2 + p * 2);
    FX.sparks(x, y, '#ffd24d', 10 + Math.round(p * 20), 340 + p * 340);
    /* 십자 섬광 — 치명타는 "베였다" 는 느낌이 나야 한다 */
    const base = ang != null ? ang : .4;
    for (let i = 0; i < 4; i++) this.streak(x, y, base + i / 4 * U.TAU, 34 + p * 62, '#ffe9a0');
    /* 노란 유리 조각 */
    for (let i = 0; i < 4 + Math.round(p * 10); i++) {
      const a = U.rand(U.TAU), sp = U.rand(180, 420 + p * 320);
      FX.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: U.rand(.26, .5), size: 4 + p * 5, color: '#fff2b0', color2: '#ffa726',
        shape: 'shard', vrot: U.rand(-14, 14), drag: .88
      });
    }
    FX.spawn({ x, y, life: .22 + p * .16, size: R * .9, size2: 0, color: '#ffd24d', shape: 'glow' });
    FX.impact(x, y, '#ffd24d', .18 + p * .42, ang);
  },

  execute(x, y, g) {
    this.shockwave(x, y, 6, 60, '#ff4f7e', .4, 4);
    this.shockwave(x, y, 2, 110, '#ffffff', .3, 2);
    this.implode(x, y, 40, '#ff4f7e');
    FX.burst(x, y, '#ff4f7e', 24, { speed: 340, shape: 'shard', size: 7 });
    /* 위아래로 갈라지는 처형 섬광 */
    this.streak(x, y, -Math.PI / 2, 90, '#ffffff');
    this.streak(x, y, Math.PI / 2, 90, '#ffffff');
    FX.spawn({ x, y, life: .3, size: 70, size2: 0, color: '#ff4f7e', shape: 'glow' });
    FX.impact(x, y, '#ff4f7e', .6);
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

  /**
   * 처치.
   *  - 잡몹 : 맞은 방향으로 튀는 비산 + 짧은 링
   *  - 보스 : 화면을 훑는 3중 링 · 빛기둥 · 슬로우모션까지 가는 풀 시네마틱
   */
  kill(x, y, color, boss, g, ang) {
    if (boss) {
      /* 빨려들었다가 터진다 — 사이에 슬로우모션이 끼면 체감이 몇 배가 된다 */
      this.implode(x, y, 90, color);
      FX.slowmo(.75, .2);
      FX.stop(.16);
      for (let ring = 0; ring < 4; ring++) {
        setTimeout(() => {
          this.shockwave(x, y, 10, 170 + ring * 70, ring % 2 ? '#ffffff' : color, .6, 6 - ring);
          FX.ripple(x, y, ring % 2 ? '#ffffff' : color, 1500 + ring * 420, .55, 7 - ring);
          FX.shake(14 - ring * 2);
        }, 120 + ring * 110);
      }
      /* 사방으로 뻗는 빛줄기 */
      for (let i = 0; i < 14; i++) this.streak(x, y, i / 14 * U.TAU, 130 + U.rand(0, 90), '#fff6d0');
      FX.burst(x, y, color, 48, { speed: 420, size: 10, shape: 'star', drag: .92 });
      FX.burst(x, y, '#ffffff', 34, { speed: 300, size: 7 });
      for (let i = 0; i < 22; i++) {
        const a = U.rand(U.TAU), sp = U.rand(120, 520);
        FX.spawn({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
          life: U.rand(.8, 1.6), size: U.rand(4, 9), color, color2: '#fff2b0',
          shape: 'shard', vrot: U.rand(-12, 12), gravity: 320, drag: .96
        });
      }
      FX.spawn({ x, y, life: .5, size: 200, size2: 0, color: '#ffffff', shape: 'glow' });
      this.decal(x, y, 70, color, 6);
      FX.speedLines(1.5, color);
      FX.aberrate(13);
      FX.pulse(.06);
      FX.flash('#ffffff', .62);
    } else {
      this.shockwave(x, y, 3, 30, color, .24, 2.4);
      /* 맞은 방향으로 비산 — 대칭 폭발보다 "맞아서 날아갔다" 는 느낌이 산다 */
      const n = 11;
      for (let i = 0; i < n; i++) {
        const a = ang != null ? ang + U.rand(-.85, .85) : U.rand(U.TAU);
        const sp = U.rand(130, 330);
        FX.spawn({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
          life: U.rand(.28, .55), size: U.rand(3, 5.5), color, color2: '#ffffff',
          shape: i % 3 ? 'circle' : 'shard', drag: .87, gravity: 260, vrot: U.rand(-9, 9)
        });
      }
      FX.spawn({ x, y, life: .16, size: 26, size2: 0, color, shape: 'glow' });
      this.decal(x, y, 9, color, 1.6);
      FX.shake(1.4);
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
  /** 합성 : 재료가 있던 자리에서 결과물 쪽으로 빛이 빨려 들어온다 */
  mergeSuck(fx, fy, tx, ty, color) {
    const d = Math.hypot(tx - fx, ty - fy) || 1;
    const dur = .26;
    for (let i = 0; i < 9; i++) {
      const jx = fx + U.rand(-14, 14), jy = fy + U.rand(-14, 14);
      FX.spawn({
        x: jx, y: jy,
        vx: (tx - jx) / dur, vy: (ty - jy) / dur,
        life: dur * U.rand(.85, 1), size: U.rand(3, 6), size2: 0,
        color, color2: '#ffffff', shape: i % 3 ? 'circle' : 'star', drag: 1
      });
    }
    this.streak(fx, fy, U.ang(fx, fy, tx, ty), Math.min(140, d), color);
    FX.ring(fx, fy, color, 22, .2);
  },

  /** 스킬 시전 링 — 발동 지점에서 빛이 솟고 링이 퍼진다 */
  castRing(x, y, color, chain) {
    const n = U.clamp(chain || 1, 1, 4);
    this.shockwave(x, y, 6, 90 + n * 26, color, .42, 3 + n);
    this.shockwave(x, y, 2, 46, '#ffffff', .26, 2);
    /* 아래에서 위로 솟는 마력 기둥 */
    for (let i = 0; i < 12 + n * 5; i++) {
      const a = U.rand(U.TAU), d = U.rand(10, 62 + n * 12);
      FX.spawn({
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * .5 + 16,
        vx: Math.cos(a) * 18, vy: -U.rand(140, 300 + n * 60),
        life: U.rand(.35, .7), size: U.rand(3, 6), color, color2: '#ffffff',
        shape: i % 4 ? 'circle' : 'star', drag: .94
      });
    }
    FX.spawn({ x, y, life: .3, size: 90 + n * 20, size2: 0, color, shape: 'glow' });
    for (let i = 0; i < 6; i++) this.streak(x, y, i / 6 * U.TAU + .3, 60 + n * 16, color);
  },

  /**
   * 고등급 소환 화면 장악 — 등급(ri)이 높을수록 화면 전체가 반응한다.
   * revealSummon 이 뽑기 결과를 보여 줄 때 같이 터뜨린다.
   */
  jackpot(x, y, ri, color, g) {
    const p = U.clamp((ri - 1) / 6, 0, 1);
    if (ri < 2) return;
    /* 사방으로 뻗는 빛기둥 */
    const rays = 8 + ri * 3;
    for (let i = 0; i < rays; i++)
      this.streak(x, y, i / rays * U.TAU + U.rand(-.1, .1), 120 + p * 220, i % 2 ? '#ffffff' : color);
    for (let i = 0; i < 3 + ri; i++)
      setTimeout(() => {
        this.shockwave(x, y, 8, 120 + i * 80 + p * 160, i % 2 ? '#ffffff' : color, .55, 6 - i * .6);
        FX.ripple(x, y, i % 2 ? '#ffffff' : color, 1100 + i * 380, .5, 6 - i);
      }, i * 95);
    FX.burst(x, y, color, 24 + ri * 8, { speed: 260 + p * 320, size: 6 + p * 6, shape: 'star', drag: .93 });
    FX.spawn({ x, y, life: .45, size: 120 + p * 160, size2: 0, color: '#ffffff', shape: 'glow' });
    this.confetti(x, y, color, 30 + Math.round(p * 90));
    FX.impact(x, y, color, .5 + p * .5);
    FX.speedLines(.9 + p * .7, color);
    if (ri >= 4) { FX.slowmo(.45 + p * .4, .26); FX.flash(color, .35 + p * .3); }
  },

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

  /**
   * 총구 섬광 — 유닛이 "쏘는 순간"을 보여 준다.
   * 발사체는 빠르게 지나가 버려서, 발사 순간에 아무 표시가 없으면
   * 유닛이 일하고 있는지조차 안 보인다.
   */
  muzzle(x, y, ang, color, g, power) {
    const ts = g ? g.ts : 40;
    const p = power || 1;
    /* 앞으로 뻗는 빛 원뿔 */
    const len = ts * (.42 * p), w = ts * (.2 * p);
    FX.spawn({
      x: x + Math.cos(ang) * len * .4, y: y + Math.sin(ang) * len * .4,
      vx: Math.cos(ang) * 40, vy: Math.sin(ang) * 40,
      life: .11, size: w * 1.5, size2: 0,
      color: '#ffffff', color2: color, shape: 'glow',
    });
    /* 튀는 불똥 */
    for (let i = 0; i < 3; i++) {
      const a = ang + U.rand(-.42, .42);
      FX.spawn({
        x, y, vx: Math.cos(a) * U.rand(90, 210) * p, vy: Math.sin(a) * U.rand(90, 210) * p,
        life: U.rand(.1, .2), size: U.rand(1.6, 3) * p, color, shape: 'spark', drag: .86,
      });
    }
    /* 반동 링 */
    this.shockwave(x, y, 2, ts * .17 * p, color, .12, 1.6);
  },

  /** 화면 좌표 기준 색종이 (룰렛·대박 연출용) */
  confetti(x, y, color, n) {
    const cols = [color, '#ffd24d', '#7cf0a8', '#6fd0ff', '#ff8ac4', '#ffffff'];
    for (let i = 0; i < (n || 30); i++) {
      const a = U.rand(U.TAU), sp = U.rand(120, 420);
      FX.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - U.rand(40, 160),
        gravity: 520, drag: .96,
        life: U.rand(.8, 1.6), size: U.rand(4, 9),
        color: U.pick(cols), shape: Math.random() < .5 ? 'shard' : 'circle',
        vrot: U.rand(-12, 12),
      });
    }
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
