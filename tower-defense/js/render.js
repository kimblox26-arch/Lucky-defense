/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  render.js
 *  GFX 엔진을 사용해 유닛/적/투사체/맵/이펙트를 그린다.
 * ========================================================================= */
'use strict';

const Draw = {

  /* ===================================================================
   *  look 생성 (데이터 → GFX 파라미터)
   * =================================================================== */
  _unitLooks: {},
  unitLook(def) {
    let L = this._unitLooks[def.key];
    if (L) return L;
    const el = ELEM[def.elem].color;
    const rar = RARITY[RARITY_IDX[def.rarity]];
    const k = def.look || {};
    L = {
      id: 'u_' + def.key,
      legs: k.legs || 'biped',
      torso: k.torso || 'leather',
      head: k.head || 'human',
      hair: k.hair || 'none',
      hairCol: k.hairCol || '#4a3524',
      gear: k.gear || 'none',
      weapon: k.weapon || 'none',
      wings: k.wings || null,
      wingCol: k.wingCol || el,
      skin: k.skin || '#f0c9a0',
      color: el,
      accent: RARITY_IDX[def.rarity] >= 4 ? rar.color : el,
      aura: rar.aura,
      auraCount: rar.auraN,
    };
    this._unitLooks[def.key] = L;
    return L;
  },

  _enemyLooks: {},
  enemyLook(def) {
    let L = this._enemyLooks[def.key];
    if (L) return L;
    const k = def.look || {};
    L = {
      id: 'e_' + def.key,
      legs: k.legs || 'biped',
      torso: k.torso || 'leather',
      head: k.head || 'human',
      hair: 'none',
      gear: k.gear || 'none',
      weapon: k.weapon || 'none',
      wings: k.wings || null,
      wingCol: def.color,
      skin: def.color,
      color: def.color,
      accent: U.mixHex(def.color, '#ffffff', .3),
      aura: def.boss ? 'void' : null,
      auraCount: 8,
      arms: k.legs === 'none' && (k.torso === 'blob' || k.torso === 'crystal') ? false : true,
    };
    this._enemyLooks[def.key] = L;
    return L;
  },

  /** 프로필 아바타 look */
  avatarLook(av) {
    return {
      id: 'av_' + [av.body, av.head, av.hair, av.gear, av.weapon, av.wings, av.skin, av.hairCol, av.color].join('_'),
      legs: 'biped', torso: av.body || 'leather', head: av.head || 'human',
      hair: av.hair || 'short', hairCol: av.hairCol || '#4a3524',
      gear: av.gear || 'none', weapon: av.weapon || 'sword',
      wings: av.wings && av.wings !== 'none' ? av.wings : null,
      wingCol: av.color || '#8fa5c4',
      skin: av.skin || '#f0c9a0',
      color: av.color || '#8fa5c4',
      accent: av.color || '#8fa5c4',
      aura: null, auraCount: 0,
    };
  },

  /* ===================================================================
   *  맵
   * =================================================================== */
  drawMap(c, g) {
    const terr = GFX.buildTerrain(g);
    c.drawImage(terr, g.ox, g.oy);

    /* 경로 위 흐르는 방향 점선 (동적) */
    const ts = g.ts;
    c.save();
    c.setLineDash([ts * .22, ts * .34]);
    c.lineDashOffset = -g.time * 30;
    c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = ts * .1;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    g.pathPts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
    c.stroke();
    c.setLineDash([]);
    c.restore();

    /* 시작 / 도착 표식 */
    const s = g.pathPts[0], e = g.pathPts[g.pathPts.length - 1];
    const pulse = .5 + Math.sin(g.time * 3) * .5;
    /* 시작 : 붉은 균열 */
    c.fillStyle = GFX.radial(c, s.x, s.y, ts * .8, 'rgba(255,70,70,.4)', 'rgba(255,70,70,0)');
    c.beginPath(); c.arc(s.x, s.y, ts * .8, 0, U.TAU); c.fill();
    c.strokeStyle = `rgba(255,110,110,${.4 + pulse * .3})`; c.lineWidth = 3;
    c.beginPath(); c.arc(s.x, s.y, ts * (.42 + pulse * .06), 0, U.TAU); c.stroke();
    /* 도착 : 수호 결계 */
    c.fillStyle = GFX.radial(c, e.x, e.y, ts * .9, 'rgba(120,255,160,.28)', 'rgba(120,255,160,0)');
    c.beginPath(); c.arc(e.x, e.y, ts * .9, 0, U.TAU); c.fill();
    c.strokeStyle = `rgba(140,255,170,${.45 + pulse * .4})`; c.lineWidth = ts * .1;
    c.beginPath(); c.arc(e.x, e.y, ts * (.45 + pulse * .1), 0, U.TAU); c.stroke();
    for (let i = 0; i < 4; i++) {
      const a = g.time * 1.2 + i / 4 * U.TAU;
      c.fillStyle = 'rgba(160,255,190,.8)';
      GFX.star(c, e.x + Math.cos(a) * ts * .58, e.y + Math.sin(a) * ts * .58, ts * .07, 4);
    }
  },

  drawPlacement(c, g) {
    if (!g.dragUnit) return;
    const ts = g.ts;
    for (let gy = 0; gy < g.gh; gy++) for (let gx = 0; gx < g.gw; gx++) {
      if (g.isPath(gx, gy)) continue;
      const occupied = g.unitAt(gx, gy);
      c.fillStyle = occupied ? 'rgba(255,90,90,.10)' : 'rgba(120,255,160,.11)';
      c.fillRect(g.ox + gx * ts + 2, g.oy + gy * ts + 2, ts - 4, ts - 4);
    }
  },

  /* ===================================================================
   *  유닛
   * =================================================================== */
  drawUnit(c, u, g) {
    const ts = g.ts;
    const S = ts * .34;
    const def = u.def, rar = RARITY[RARITY_IDX[def.rarity]];
    const x = u.px, y = u.py;
    const t = g.time + u.seed;

    /* 등급 받침 */
    const glowPulse = .6 + Math.sin(t * 2.4) * .4;
    c.save();
    c.shadowColor = rar.glow;
    c.shadowBlur = 4 + RARITY_IDX[def.rarity] * 2.8 * glowPulse;
    c.fillStyle = U.rgba(rar.color, .18);
    c.beginPath(); c.ellipse(x, y + S * 1.1, S * .95, S * .34, 0, 0, U.TAU); c.fill();
    c.strokeStyle = U.rgba(rar.color, .8); c.lineWidth = 2;
    c.beginPath(); c.ellipse(x, y + S * 1.1, S * .95, S * .34, 0, 0, U.TAU); c.stroke();
    c.shadowBlur = 0;
    c.restore();

    GFX.groundShadow(c, x, y + S * 1.08, S * .5, S * .16, .3);

    const recoil = u.recoil > 0 ? U.easeOut(u.recoil / .12) : 0;
    const aim = u.aimAngle === undefined ? 0 : u.aimAngle;
    const flip = Math.cos(aim) < 0;

    if (u.buffFlash > 0) { c.save(); c.shadowColor = '#ffffff'; c.shadowBlur = 18 * u.buffFlash; }
    GFX.drawCharOutlined(c, x, y, S, this.unitLook(def), {
      t, phase: t * 1.6, aim, recoil, flip, seed: u.seed
    });
    if (u.buffFlash > 0) c.restore();

    /* 성급 */
    const st = u.star, sy = y - S * 1.55;
    for (let i = 0; i < st; i++) {
      const sx = x + (i - (st - 1) / 2) * (S * .4);
      c.fillStyle = st >= 3 ? '#ffd24d' : '#eef4ff';
      c.shadowColor = st >= 3 ? '#ffb300' : '#000'; c.shadowBlur = 6;
      GFX.star(c, sx, sy, S * .17, 5);
      c.shadowBlur = 0;
    }
    /* 레벨 뱃지 */
    if (u.level > 1) {
      c.fillStyle = 'rgba(10,14,22,.8)';
      c.beginPath(); c.roundRect(x + S * .62, y - S * .1, S * .72, S * .44, S * .12); c.fill();
      c.strokeStyle = 'rgba(255,210,77,.8)'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#ffd24d'; c.font = `900 ${Math.max(7, S * .36)}px system-ui`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('' + u.level, x + S * .98, y + S * .13);
    }

    /* 선택 표시 */
    if (g.selected === u) {
      c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2.5;
      c.setLineDash([6, 5]); c.lineDashOffset = -g.time * 30;
      c.beginPath(); c.arc(x, y + S * .2, S * 1.3, 0, U.TAU); c.stroke();
      c.setLineDash([]);
      const rng = u.stat.rng * ts;
      c.fillStyle = U.rgba(ELEM[def.elem].color, .06);
      c.beginPath(); c.arc(x, y, rng, 0, U.TAU); c.fill();
      c.strokeStyle = U.rgba(ELEM[def.elem].color, .45); c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, rng, 0, U.TAU); c.stroke();
    }
    /* 합성 가능 */
    if (u.mergeReady && (g.time % 1) < .62) {
      c.fillStyle = '#ffd24d'; c.shadowColor = '#ffb300'; c.shadowBlur = 10;
      c.font = `900 ${Math.round(S * .8)}px system-ui`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('⇪', x - S * 1.0, y - S * .9);
      c.shadowBlur = 0;
    }
  },

  drawMinion(c, m, g) {
    const r = g.ts * .19;
    const col = ELEM[m.owner.def.elem].color;
    const t = g.time * 4 + m.seed;
    c.save();
    c.shadowColor = col; c.shadowBlur = 10;
    c.fillStyle = GFX.radial(c, m.x, m.y, r * 2, U.rgba(col, .85), U.rgba(col, 0));
    c.beginPath(); c.arc(m.x, m.y, r * 2, 0, U.TAU); c.fill();
    c.fillStyle = col;
    c.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = t + i / 3 * U.TAU;
      c.moveTo(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r);
      c.arc(m.x, m.y, r * .58, a, a + 1.5);
    }
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(m.x, m.y, r * .3, 0, U.TAU); c.fill();
    c.shadowBlur = 0; c.restore();
  },

  /* ===================================================================
   *  적 (스프라이트 캐시 사용)
   * =================================================================== */
  ENEMY_FRAMES: 8,
  drawEnemy(c, e, g) {
    const ts = g.ts;
    const S = ts * .32 * (e.def.scale || 1);
    const x = e.x;
    const fly = e.flying ? -ts * .24 + Math.sin((g.time + e.seed) * 3) * ts * .05 : 0;
    const y = e.y + fly;

    /* 보스 오라 */
    if (e.boss) {
      const p = .5 + Math.sin(g.time * 3) * .5;
      c.save();
      c.fillStyle = GFX.radial(c, x, y, S * 2.4, U.rgba(e.def.color, .22), U.rgba(e.def.color, 0));
      c.beginPath(); c.arc(x, y, S * 2.4, 0, U.TAU); c.fill();
      c.strokeStyle = U.rgba(e.def.color, .3 + p * .3); c.lineWidth = 3;
      c.beginPath(); c.arc(x, y + S * .6, S * (1.5 + p * .12), 0, U.TAU); c.stroke();
      c.restore();
    }
    /* 비행 그림자 */
    if (e.flying) GFX.groundShadow(c, x, e.y + S * .7, S * .5, S * .16, .26);

    /* 프레임 선택 (걷기 위상) */
    const spd = e.def.spd || 1;
    const frame = Math.floor(((g.time * spd * 2.4 + e.seed) % 1) * this.ENEMY_FRAMES) % this.ENEMY_FRAMES;
    let cv = GFX.sprite(this.enemyLook(e.def), S, frame, this.ENEMY_FRAMES);

    /* 상태 틴트 */
    let tintCol = null, tintAmt = 0;
    if (e.hitFlash > 0) { tintCol = '#ffffff'; tintAmt = U.clamp(e.hitFlash * 6, 0, .85); }
    else if (e.frozen > 0) { tintCol = '#8fe0ff'; tintAmt = .6; }
    else if (e.poisonStacks > 0) { tintCol = '#7bdd52'; tintAmt = Math.min(.45, e.poisonStacks * .06); }
    else if (e.burn > 0) { tintCol = '#ff6b35'; tintAmt = .3; }
    else if (e.chill > 0) { tintCol = '#7fc8ff'; tintAmt = .3; }
    else if (e.curse > 0) { tintCol = '#b57bff'; tintAmt = .3; }
    if (tintCol) cv = GFX.tint(cv, tintCol, tintAmt);

    c.save();
    if (e.hasFlag('ghost')) c.globalAlpha = .74;
    if (e.raging) { c.shadowColor = '#ff3a3a'; c.shadowBlur = 14; }
    /* 진행 방향에 맞춰 좌우 반전 */
    if (e.dirX < -0.1) {
      c.translate(x, y); c.scale(-1, 1);
      c.drawImage(cv, -cv._ox, -cv._oy);
    } else {
      c.drawImage(cv, x - cv._ox, y - cv._oy);
    }
    c.restore();

    /* 보호막 */
    if (e.shield > 0) {
      const p = .5 + Math.sin(g.time * 5 + e.seed) * .5;
      c.save();
      c.strokeStyle = `rgba(120,200,255,${.5 + p * .3})`; c.lineWidth = 2.4;
      c.shadowColor = '#7fd8ff'; c.shadowBlur = 10;
      c.beginPath(); c.ellipse(x, y + S * .2, S * 1.25, S * 1.4, 0, 0, U.TAU); c.stroke();
      c.fillStyle = 'rgba(120,200,255,.1)';
      c.beginPath(); c.ellipse(x, y + S * .2, S * 1.25, S * 1.4, 0, 0, U.TAU); c.fill();
      c.restore();
    }
    /* 빙결 결정 */
    if (e.frozen > 0) {
      c.save();
      c.fillStyle = 'rgba(150,225,255,.28)';
      c.strokeStyle = 'rgba(225,248,255,.85)'; c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * U.TAU - .3;
        const rr = S * (1.35 + (i % 2 ? .2 : 0));
        i ? c.lineTo(x + Math.cos(a) * rr, y + S * .2 + Math.sin(a) * rr)
          : c.moveTo(x + Math.cos(a) * rr, y + S * .2 + Math.sin(a) * rr);
      }
      c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
    /* 저주 고리 */
    if (e.curse > 0) {
      c.strokeStyle = 'rgba(181,123,255,.65)'; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y + S * .2, S * 1.45, g.time * 2, g.time * 2 + 2.4); c.stroke();
    }
    /* 기절 별 */
    if (e.stun > 0) {
      for (let i = 0; i < 3; i++) {
        const a = g.time * 6 + i / 3 * U.TAU;
        c.fillStyle = '#ffe14d';
        GFX.star(c, x + Math.cos(a) * S * .8, y - S * 1.5 + Math.sin(a) * S * .2, S * .16, 5);
      }
    }
    /* 출혈 */
    if (e.bleedStacks > 0 && Math.random() < .3) {
      FX.spawn({
        x: x + U.rand(-S * .4, S * .4), y: y + U.rand(-S * .2, S * .5),
        vx: U.rand(-8, 8), vy: U.rand(18, 46), life: .45, size: 2.6, color: '#ff3d5e', gravity: 120
      });
    }

    /* 체력바 */
    const hpPct = U.clamp(e.hp / e.maxHp, 0, 1);
    if (hpPct < 1 || e.boss) {
      const bw = e.boss ? S * 3.0 : S * 1.9, bh = e.boss ? 7 : 4.5;
      const bx = x - bw / 2, by = y - S * (e.boss ? 1.9 : 1.62);
      c.fillStyle = 'rgba(0,0,0,.62)';
      c.beginPath(); c.roundRect(bx - 1.5, by - 1.5, bw + 3, bh + 3, 3.5); c.fill();
      const hc = hpPct > .5 ? '#5ce07a' : hpPct > .22 ? '#ffcc3f' : '#ff4d5e';
      const grd = c.createLinearGradient(bx, by, bx, by + bh);
      grd.addColorStop(0, U.mixHex(hc, '#ffffff', .35)); grd.addColorStop(1, hc);
      c.fillStyle = grd;
      c.beginPath(); c.roundRect(bx, by, bw * hpPct, bh, 2); c.fill();
      if (e.maxShield > 0 && e.shield > 0) {
        c.fillStyle = 'rgba(130,205,255,.95)';
        const sp = U.clamp(e.shield / e.maxShield, 0, 1);
        c.beginPath(); c.roundRect(bx, by - bh - 2.5, bw * sp, bh * .62, 2); c.fill();
      }
      if (e.boss) {
        c.fillStyle = '#ffe9a8'; c.font = '900 10px system-ui';
        c.textAlign = 'center'; c.textBaseline = 'bottom';
        c.fillText(e.def.name, x, by - (e.maxShield ? 12 : 5));
      }
    }
    /* 정예 표식 */
    if (e.elite) {
      c.fillStyle = '#ffd24d'; c.shadowColor = '#ffb300'; c.shadowBlur = 8;
      GFX.star(c, x + S * 1.1, y - S * 1.2, S * .28, 4);
      c.shadowBlur = 0;
    }
  },

  /* ===================================================================
   *  투사체 / 빔 / 장판
   * =================================================================== */
  drawProj(c, p, g) {
    const col = p.color, s = p.size;
    c.save();
    c.shadowColor = col; c.shadowBlur = 12;
    switch (p.kind) {
      case 'arrow': case 'bolt': case 'dart': {
        const a = p.angle;
        c.strokeStyle = U.mixHex(col, '#ffffff', .3); c.lineWidth = s * .6; c.lineCap = 'round';
        c.beginPath();
        c.moveTo(p.x - Math.cos(a) * s * 3.2, p.y - Math.sin(a) * s * 3.2);
        c.lineTo(p.x + Math.cos(a) * s * 1.6, p.y + Math.sin(a) * s * 1.6);
        c.stroke();
        c.fillStyle = '#fff';
        c.beginPath();
        c.moveTo(p.x + Math.cos(a) * s * 2.0, p.y + Math.sin(a) * s * 2.0);
        c.lineTo(p.x + Math.cos(a + 2.5) * s * .9, p.y + Math.sin(a + 2.5) * s * .9);
        c.lineTo(p.x + Math.cos(a - 2.5) * s * .9, p.y + Math.sin(a - 2.5) * s * .9);
        c.fill();
        break;
      }
      case 'bullet': {
        c.strokeStyle = col; c.lineWidth = s * .8; c.lineCap = 'round';
        c.beginPath();
        c.moveTo(p.x - Math.cos(p.angle) * s * 7, p.y - Math.sin(p.angle) * s * 7);
        c.lineTo(p.x, p.y); c.stroke();
        c.strokeStyle = '#fff'; c.lineWidth = s * .3;
        c.beginPath();
        c.moveTo(p.x - Math.cos(p.angle) * s * 4, p.y - Math.sin(p.angle) * s * 4);
        c.lineTo(p.x, p.y); c.stroke();
        break;
      }
      case 'ball': case 'orb': {
        c.fillStyle = GFX.radial(c, p.x, p.y, s * 2.6, '#ffffff', U.rgba(col, 0));
        c.beginPath(); c.arc(p.x, p.y, s * 2.6, 0, U.TAU); c.fill();
        c.fillStyle = GFX.radial(c, p.x, p.y, s * 1.5, col, U.rgba(col, .1));
        c.beginPath(); c.arc(p.x, p.y, s * 1.5, 0, U.TAU); c.fill();
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(p.x - s * .3, p.y - s * .3, s * .4, 0, U.TAU); c.fill();
        break;
      }
      case 'shard': {
        c.save(); c.translate(p.x, p.y); c.rotate(p.angle + g.time * 9);
        c.fillStyle = GFX.vgrad(c, 0, -s * 2, s * 2, '#ffffff', col);
        c.beginPath(); c.moveTo(0, -s * 2); c.lineTo(s * .9, 0); c.lineTo(0, s * 2); c.lineTo(-s * .9, 0);
        c.closePath(); c.fill();
        c.strokeStyle = U.rgba('#ffffff', .8); c.lineWidth = s * .2; c.stroke();
        c.restore();
        break;
      }
      case 'bomb': {
        c.save(); c.translate(p.x, p.y); c.rotate(g.time * 6);
        c.fillStyle = GFX.vgrad(c, 0, -s * 1.4, s * 1.4, '#5a6270', '#252a34');
        c.beginPath(); c.arc(0, 0, s * 1.4, 0, U.TAU); c.fill();
        c.strokeStyle = '#1a1e26'; c.lineWidth = s * .25; c.stroke();
        c.fillStyle = col; c.shadowColor = col; c.shadowBlur = s * 3;
        c.beginPath(); c.arc(0, -s * .35, s * .5, 0, U.TAU); c.fill();
        c.restore();
        break;
      }
      case 'wave': {
        c.strokeStyle = col; c.lineWidth = s * .9; c.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          c.globalAlpha = .8 - i * .22;
          c.beginPath(); c.arc(p.x, p.y, s * (1.8 + i * .9), p.angle - 1.1, p.angle + 1.1); c.stroke();
        }
        c.globalAlpha = 1;
        break;
      }
    }
    c.shadowBlur = 0;
    c.restore();
  },

  drawBeam(c, b, g) {
    const a = b.life / b.maxLife;
    c.save();
    c.globalAlpha = a;
    c.shadowColor = b.color; c.shadowBlur = 20;
    c.strokeStyle = b.color; c.lineWidth = b.width * (.4 + a * .9);
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(b.pts[0].x, b.pts[0].y);
    for (let i = 1; i < b.pts.length; i++) c.lineTo(b.pts[i].x, b.pts[i].y);
    c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = b.width * .35 * a;
    c.stroke();
    c.shadowBlur = 0;
    c.restore();
  },

  drawZone(c, z, g) {
    const a = U.clamp(z.life / z.maxLife, 0, 1);
    c.save();
    c.globalAlpha = .3 * a + .12;
    c.fillStyle = GFX.radial(c, z.x, z.y, z.r, z.color, U.rgba(z.color, 0));
    c.beginPath(); c.arc(z.x, z.y, z.r, 0, U.TAU); c.fill();
    c.globalAlpha = .55 * a;
    c.strokeStyle = z.color; c.lineWidth = 2;
    c.setLineDash([9, 7]); c.lineDashOffset = -g.time * 22;
    c.beginPath(); c.arc(z.x, z.y, z.r, 0, U.TAU); c.stroke();
    c.setLineDash([]);
    c.restore();
  },

  /* ===================================================================
   *  초상화 (UI 공용)
   * =================================================================== */
  portraitUnit(cv, def, star, opts = {}) {
    const c = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H);
    const rar = RARITY[RARITY_IDX[def.rarity]];
    c.fillStyle = GFX.radial(c, W / 2, H * .5, W * .55, U.rgba(rar.color, .3), 'rgba(0,0,0,0)');
    c.fillRect(0, 0, W, H);
    const S = W * (opts.scale || .26);
    GFX.drawCharOutlined(c, W / 2, H * .62, S, this.unitLook(def), { t: performance.now() / 1000, phase: 0, aim: 0 });
    if (star) {
      c.fillStyle = '#ffd24d';
      for (let i = 0; i < star; i++) GFX.star(c, W / 2 + (i - (star - 1) / 2) * W * .12, H * .92, W * .05, 5);
    }
  },

  portraitEnemy(cv, def) {
    const c = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = GFX.radial(c, W / 2, H * .5, W * .55, U.rgba(def.color, .25), 'rgba(0,0,0,0)');
    c.fillRect(0, 0, W, H);
    const S = W * .24 * (def.boss ? 1.1 : 1);
    GFX.drawCharOutlined(c, W / 2, H * .64, S, this.enemyLook(def), { t: performance.now() / 1000, phase: 0, aim: 0 });
  },

  portraitAvatar(cv, av, t) {
    const c = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H);
    const S = W * .24;
    GFX.drawCharOutlined(c, W / 2, H * .66, S, this.avatarLook(av), { t: t || performance.now() / 1000, phase: 0, aim: 0 });
  },

  /* ===================================================================
   *  화면 오버레이
   * =================================================================== */
  overlay(c, W, H) {
    if (FX.flashAlpha > 0.001) {
      c.fillStyle = U.rgba(FX.flashColor, FX.flashAlpha * .55);
      c.fillRect(0, 0, W, H);
    }
  },
  vignette(c, W, H, amt, color) {
    if (amt <= 0.001) return;
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .28, W / 2, H / 2, Math.max(W, H) * .72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, U.rgba(color, amt));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  },
};

/* roundRect 폴리필 */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}
if (!Path2D.prototype.roundRect) {
  Path2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

window.Draw = Draw;
