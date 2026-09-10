/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  entities.js
 *  적 / 유닛 / 투사체 / 소환수 / 장판 / 빔  +  전투 계산 파이프라인
 * ========================================================================= */
'use strict';

/* ============================================================ 전투 계산 */
const Combat = {
  /** 무기/투사체 종류 → 발사음 (유닛마다 소리가 달라야 전투가 리듬감 있게 들린다) */
  fireSound(def) {
    const w = (def.look && def.look.weapon) || '';
    if (w === 'bow' || w === 'crossbow') return 'bow';
    if (w === 'rifle' || w === 'cannon' || w === 'launcher') return 'gun';
    if (w === 'staff' || w === 'wand' || w === 'orb' || w === 'tome') return 'staff';
    if (w === 'sword' || w === 'greatsword' || w === 'dagger' || w === 'scythe'
      || w === 'axe' || w === 'claw' || w === 'chakram') return 'blade';
    if (w === 'hammer' || w === 'halberd' || w === 'spear') return 'hammer';
    if (w === 'dart' || w === 'sling') return 'dart';
    const p = def.proj;
    return p === 'arrow' || p === 'bolt' || p === 'dart' ? 'bow'
      : p === 'bomb' ? 'cannon' : p === 'bullet' ? 'gun' : 'staff';
  },

  /**
   * 최종 피해 계산 & 적용
   * opts: {elem, crit, critMul, pen, trueDmg, splash, isDot, source, tag}
   */
  hit(g, enemy, base, opts = {}) {
    if (!enemy || enemy.dead) return 0;
    const elem = opts.elem || 'phys';
    let dmg = base;

    /* 원소 저항 / 취약 (맵 모디파이어 포함) */
    let res = (enemy.def.resist && enemy.def.resist[elem]) || 0;
    res += g.modResist(elem);
    if (res) dmg *= Math.max(.05, 1 - res);
    /* 맵 원소 특화 */
    const eb = g.modElem(elem);
    if (eb) dmg *= (1 + eb);

    /* 언데드 특효 */
    if (opts.holyBonus && enemy.hasFlag('undead')) dmg *= (1 + opts.holyBonus);
    /* 보스 특효 */
    if (opts.bossBonus && enemy.boss) dmg *= (1 + opts.bossBonus);
    /* 보스 피해 연구 */
    if (enemy.boss) dmg *= (1 + g.research.boss * .06);

    /* 방어력 */
    if (!opts.trueDmg) {
      let armor = enemy.armor * (1 - U.clamp((opts.pen || 0) + enemy.armorBreak, 0, 1));
      armor = Math.max(0, armor);
      dmg *= 100 / (100 + armor);
    }

    /* 저주 / 표식 */
    if (enemy.curse > 0) dmg *= (1 + enemy.curseAmt);
    if (enemy.markAmt > 0) dmg *= (1 + enemy.markAmt);
    /* 빙결 대상 추가 피해 */
    if (enemy.frozen > 0) dmg *= 1.25;

    /* 치명타 */
    let crit = false;
    if (!opts.isDot && opts.crit && Math.random() < opts.crit) {
      crit = true;
      dmg *= (opts.critMul || 2);
    }

    dmg = Math.max(1, dmg);

    /* 보호막 우선 소모 */
    if (enemy.shield > 0) {
      const mult = opts.shieldBreak || 1;
      const absorbed = Math.min(enemy.shield, dmg * mult);
      enemy.shield -= absorbed;
      const leftover = dmg - absorbed / mult;
      if (enemy.shield <= 0) {
        enemy.shield = 0;
        VFX.shieldBreak(enemy.x, enemy.y, g);
        SFX.play('shieldbreak');
      }
      if (leftover <= 0) {
        enemy.hitFlash = .1;
        if (!opts.isDot) FX.popText(enemy.x, enemy.y - g.ts * .4, U.fmt(dmg), '#8fd8ff', 12);
        return 0;
      }
      dmg = leftover;
    }

    /* 처형 */
    if (opts.execute && !enemy.boss && enemy.hp / enemy.maxHp <= opts.execute) {
      dmg = enemy.hp;
      FX.popText(enemy.x, enemy.y - g.ts * .5, '처형!', '#ff4f7e', 17);
      VFX.execute(enemy.x, enemy.y, g);
      SFX.play('bigcrit');
    }

    const applied = Math.min(enemy.hp, dmg);
    enemy.hp -= dmg;
    enemy.hitFlash = .12;
    g.stats.totalDmg += applied;
    if (opts.source) { opts.source.dmgDone += applied; }

    /* 대미지 숫자 */
    if (!opts.isDot || Math.random() < .25) {
      const col = crit ? '#ffd24d' : (ELEM[elem] ? ELEM[elem].color : '#fff');
      FX.popText(
        enemy.x + U.rand(-8, 8), enemy.y - g.ts * .35,
        (crit ? '✦' : '') + U.fmt(applied),
        col, crit ? 19 : (opts.isDot ? 10 : 13)
      );
    }
    if (crit) {
      VFX.crit(enemy.x, enemy.y, g);
      SFX.play('crit');
    } else if (!opts.isDot && Math.random() < .5) {
      VFX.hit(elem, enemy.x, enemy.y, U.clamp(applied / Math.max(1, enemy.maxHp) * 6, .4, 2), g);
    }

    if (enemy.hp <= 0) enemy.die(opts.source);
    return applied;
  },

  /** 광역 피해 */
  splash(g, x, y, radius, base, opts = {}) {
    const r2 = radius * radius;
    let n = 0;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const d2 = U.dist2(x, y, e.x, e.y);
      if (d2 <= r2) {
        const falloff = opts.falloff === false ? 1 : U.lerp(.55, 1, 1 - Math.sqrt(d2) / radius);
        Combat.hit(g, e, base * falloff, opts);
        if (opts.status) Combat.status(g, e, opts.status, opts);
        n++;
      }
    }
    return n;
  },

  /** 상태이상 부여 */
  status(g, e, s, opts = {}) {
    if (!s || e.dead) return;
    if (s.slow) {
      const amt = s.slow.amt * (1 + g.bonus.slow);
      if (amt >= e.chillAmt || e.chill <= 0) { e.chillAmt = Math.min(.85, amt); }
      e.chill = Math.max(e.chill, s.slow.dur);
    }
    if (s.freeze && Math.random() < (s.freeze + g.bonus.freeze)) {
      if (!e.boss || Math.random() < .35) {
        e.frozen = Math.max(e.frozen, e.boss ? .6 : 1.4);
        FX.ring(e.x, e.y, '#8fe0ff', g.ts * .7, .3);
        SFX.play('freeze');
      }
    }
    if (s.burn) {
      SFX.play('burn');
      e.burn = Math.max(e.burn, s.burn.dur);
      e.burnDps = Math.max(e.burnDps, s.burn.dps * (1 + g.bonus.dot) * (opts.dmgScale || 1));
      e.burnSrc = opts.source || null;
    }
    if (s.poison) {
      SFX.play('poison');
      e.poisonStacks = Math.min(s.poison.stack || 5, e.poisonStacks + 1);
      e.poison = Math.max(e.poison, s.poison.dur);
      e.poisonDps = Math.max(e.poisonDps, s.poison.dps * (1 + g.bonus.dot) * (opts.dmgScale || 1));
      e.poisonSrc = opts.source || null;
    }
    if (s.stun && Math.random() < (s.stun + g.bonus.stun)) {
      SFX.play('stun');
      if (!e.boss) { e.stun = Math.max(e.stun, .8); }
      else e.chill = Math.max(e.chill, 1), e.chillAmt = Math.max(e.chillAmt, .3);
    }
    if (s.curse) {
      SFX.play('curse');
      e.curse = Math.max(e.curse, s.curse.dur);
      e.curseAmt = Math.max(e.curseAmt, s.curse.amt + g.bonus.curse);
    }
    if (s.bleed) {
      e.bleedStacks = Math.min(s.bleed.stack || 5, e.bleedStacks + 1);
      e.bleed = Math.max(e.bleed, s.bleed.dur);
      e.bleedDps = Math.max(e.bleedDps, s.bleed.dps * (1 + g.bonus.dot) * (opts.dmgScale || 1));
      e.bleedSrc = opts.source || null;
    }
    if (s.root && Math.random() < s.root) {
      e.root = Math.max(e.root, .9);
    }
  },
};

/* ================================================================= 적 */
class Enemy {
  constructor(g, key, opts = {}) {
    const def = ENEMY_MAP[key];
    this.g = g; this.key = key; this.def = def;
    this.seed = U.rand(100);
    this.boss = !!def.boss;

    const w = g.wave;
    const scale = g.enemyScale(def, opts.hpMul || 1);
    this.maxHp = scale.hp;
    this.hp = this.maxHp;
    this.armor = scale.armor;
    this.bounty = scale.bounty;
    const waveSpdMul = 1 + Math.min(1.6, (w + g.loop * 100 - 1) * .014);
    this.baseSpeed = def.spd * g.ts * .95 * (g.map.diff > 1.6 ? 1.06 : 1) * g.modNum('spdMul', 1) * waveSpdMul;

    this.maxShield = (def.shield || 0) * this.maxHp * .3 * g.modNum('shieldMul', 1);
    this.shield = this.maxShield;

    /* 정예 — buildWave 가 표시해 두는 강화 개체 */
    this.elite = !!opts.elite;
    if (this.elite) {
      this.maxHp *= 3; this.hp = this.maxHp;
      this.armor *= 1.4; this.bounty *= 3.2;
      this.baseSpeed *= .88;
    }

    /* 보물 적 — 빠르게 도망친다. 잡으면 큰 보상, 놓쳐도 목숨은 안 깎인다.
       "쫓아가서 잡아야 하는 순간" 을 웨이브마다 하나씩 만들어 준다. */
    this.treasure = !!opts.treasure;
    if (this.treasure) {
      this.maxHp *= .30; this.hp = this.maxHp;
      this.armor *= .3;
      this.bounty *= 16;
      this.baseSpeed *= 2.0;
      this.maxShield = 0; this.shield = 0;
    }

    this.dist = opts.dist !== undefined ? opts.dist : 0;
    this.x = 0; this.y = 0; this.dirX = 1; this.dirY = 0;
    this.dead = false; this.leaked = false;

    /* 상태 */
    this.chill = 0; this.chillAmt = 0; this.frozen = 0; this.stun = 0; this.root = 0;
    this.burn = 0; this.burnDps = 0; this.burnSrc = null;
    this.poison = 0; this.poisonStacks = 0; this.poisonDps = 0; this.poisonSrc = null;
    this.bleed = 0; this.bleedStacks = 0; this.bleedDps = 0; this.bleedSrc = null;
    this.curse = 0; this.curseAmt = 0; this.markAmt = 0; this.armorBreak = 0;
    this.hitFlash = 0;
    this.raging = false;
    this.summonCd = def.summonCd ? U.rand(1, def.summonCd) : 0;
    this.healCd = 0;
    this.teleCd = U.rand(4, 9) * (g.modFlag('teleportBias') ? .5 : 1);
    this.flying = this.hasFlag('flying');
    this.updatePos();
  }

  hasFlag(f) { return this.def.flags ? this.def.flags.indexOf(f) >= 0 : false; }

  updatePos() {
    const p = this.g.posAt(this.dist);
    this.x = p.x; this.y = p.y; this.dirX = p.dx; this.dirY = p.dy;
  }

  get speed() {
    let s = this.baseSpeed;
    if (this.frozen > 0 || this.stun > 0 || this.root > 0) return 0;
    if (this.chill > 0) s *= (1 - this.chillAmt);
    if (this.raging) s *= (this.def.rageSpd || 1.5);
    s *= this.g.enemySpeedMul;
    return s;
  }

  update(dt) {
    if (this.dead) return;
    /* 타이머 감소 */
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.chill > 0) { this.chill -= dt; if (this.chill <= 0) this.chillAmt = 0; }
    if (this.frozen > 0) this.frozen -= dt;
    if (this.stun > 0) this.stun -= dt;
    if (this.root > 0) this.root -= dt;
    if (this.curse > 0) { this.curse -= dt; if (this.curse <= 0) this.curseAmt = 0; }

    /* 지속 피해 */
    if (this.burn > 0) {
      this.burn -= dt;
      Combat.hit(this.g, this, this.burnDps * dt * this.maxHp * .012 + this.burnDps * dt * 6, {
        elem: 'fire', isDot: true, trueDmg: false, pen: .3, source: this.burnSrc
      });
      if (Math.random() < dt * 14) FX.spawn({
        x: this.x + U.rand(-8, 8), y: this.y + U.rand(-10, 4), vx: U.rand(-10, 10), vy: U.rand(-46, -22),
        life: .4, size: 4, color: '#ff8a2a', color2: '#ffd24d', shape: 'circle'
      });
    }
    if (this.poison > 0 && !this.dead) {
      this.poison -= dt;
      Combat.hit(this.g, this, this.poisonDps * this.poisonStacks * dt * 5 + this.poisonDps * dt * this.maxHp * .004 * this.poisonStacks, {
        elem: 'poison', isDot: true, trueDmg: true, source: this.poisonSrc
      });
      if (Math.random() < dt * 8) FX.spawn({
        x: this.x + U.rand(-8, 8), y: this.y + U.rand(-6, 6), vx: 0, vy: U.rand(-24, -8),
        life: .5, size: 3, color: '#7bdd52', shape: 'circle'
      });
      if (this.poison <= 0) this.poisonStacks = 0;
    }
    if (this.bleed > 0 && !this.dead) {
      this.bleed -= dt;
      /* 출혈 : 방어 무시 + 이동 중일수록 강하게 */
      const moveMul = this.speed > 0 ? 1.35 : .6;
      Combat.hit(this.g, this, this.bleedDps * this.bleedStacks * dt * 4 * moveMul
        + this.bleedDps * dt * this.maxHp * .003 * this.bleedStacks, {
        elem: 'blood', isDot: true, trueDmg: true, source: this.bleedSrc
      });
      if (this.bleed <= 0) this.bleedStacks = 0;
    }
    if (this.dead) return;

    /* 재생 */
    if (this.def.regen && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.def.regen * this.g.modNum('regenMul', 1) * dt);
    }
    /* 격노 */
    if (this.hasFlag('rage') && !this.raging && this.hp / this.maxHp < .4) {
      this.raging = true;
      FX.ring(this.x, this.y, '#ff3a3a', this.g.ts, .4);
      FX.popText(this.x, this.y - 20, '격노!', '#ff5a5a', 15);
      SFX.play('boss');
    }
    /* 치유 오라 */
    if (this.hasFlag('healer')) {
      this.healCd -= dt;
      if (this.healCd <= 0) {
        this.healCd = 1.0;
        const r = (this.def.healRadius || 3) * this.g.ts;
        let healed = 0;
        for (const e of this.g.enemies) {
          if (e === this || e.dead) continue;
          if (U.dist2(this.x, this.y, e.x, e.y) < r * r && e.hp < e.maxHp) {
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * (this.def.healAmt || .02));
            healed++;
            FX.spawn({ x: e.x, y: e.y, vx: 0, vy: -30, life: .5, size: 5, color: '#7cff9c', shape: 'circle' });
          }
        }
        if (healed) FX.ring(this.x, this.y, '#7cff9c', r * .6, .35);
      }
    }
    /* 소환 */
    if (this.def.summonKey) {
      this.summonCd -= dt;
      if (this.summonCd <= 0 && this.g.enemies.length < 260) {
        this.summonCd = this.def.summonCd || 5;
        for (let i = 0; i < (this.def.summonN || 1); i++) {
          this.g.spawnEnemy(this.def.summonKey, {
            dist: Math.max(0, this.dist - U.rand(0, this.g.ts * .6)), hpMul: .7
          });
        }
        FX.ring(this.x, this.y, '#b57bff', this.g.ts * .9, .4);
        FX.burst(this.x, this.y, '#b57bff', 14, { speed: 160 });
      }
    }
    /* 순간이동 */
    if (this.hasFlag('teleport')) {
      this.teleCd -= dt;
      if (this.teleCd <= 0) {
        this.teleCd = U.rand(6, 11);
        const jump = this.g.ts * U.rand(2, 3.5);
        FX.burst(this.x, this.y, '#c6b3ff', 16, { speed: 200, shape: 'spark' });
        this.dist = Math.min(this.g.pathLen, this.dist + jump);
        this.updatePos();
        FX.burst(this.x, this.y, '#c6b3ff', 16, { speed: 200, shape: 'spark' });
        FX.ring(this.x, this.y, '#c6b3ff', this.g.ts, .3);
      }
    }

    /* 이동 */
    const sp = this.speed;
    if (sp > 0) {
      this.dist += sp * dt;
      this.updatePos();
      if (this.dist >= this.g.pathLen) this.leak();
    }
  }

  die(source) {
    if (this.dead) return;
    this.dead = true;
    const g = this.g;
    /* 골드 */
    let gold = this.bounty * g.goldMul;
    if (source && source.goldAura) gold *= (1 + source.goldAura);
    gold *= g.comboGoldMul();
    if (g.buffs.goldrush > 0) gold *= 3;
    gold = Math.max(1, Math.round(gold));
    g.addGold(gold);
    /* 전리품 축복 — 가끔 한 번씩 크게 떨어진다 */
    if (g.bless && g.bless.loot > 0 && Math.random() < g.bless.loot) {
      const extra = Math.max(20, Math.round(gold * 7));
      g.addGold(extra);
      FX.popText(this.px, this.py - 14, '💰 +' + U.fmt(extra), '#ffd24d', 15, { life: 1, vy: -34 });
      SFX.play('coin');
    }
    g.stats.kills++;
    if (this.boss) g.stats.bossKills++;
    g.addCombo();
    g.mana = Math.min(g.maxMana, g.mana + (this.boss ? 12 : .35) * g.manaMul);
    g.waveKilled++;

    if (source) source.kills++;

    /* 이펙트 */
    const col = this.def.color;
    const r = g.ts * .36 * (this.def.scale || 1);
    VFX.kill(this.x, this.y, col, this.boss, g);
    if (this.boss) {
      FX.explosion(this.x, this.y, r * 3.2, col, '#fff');
      FX.flash('#fff', .55); FX.shake(18); FX.stop(.12);
      SFX.play('explode');
      for (let i = 0; i < 5; i++) setTimeout(() => FX.explosion(this.x + U.rand(-50, 50), this.y + U.rand(-40, 40), r * 1.6, col), i * 90);
      FX.popText(this.x, this.y - 40, 'BOSS DOWN!', '#ffd24d', 26, { life: 1.6, vy: -40 });
    } else {
      FX.burst(this.x, this.y, col, 10, { speed: 150, size: 4.5, drag: .88 });
      FX.sparks(this.x, this.y, '#fff', 5, 200);
      SFX.play(this.boss ? 'bossdie' : 'die');
    }
    FX.popText(this.x + U.rand(-10, 10), this.y - g.ts * .55, '+' + U.fmt(gold), '#ffd24d', 13);

    /* 보물 적 — 잡으면 한 번 크게 터진다 */
    if (this.treasure && !this.leaked) {
      const gem = U.chance(.35) ? 1 + Math.floor(g.wave / 25) : 0;
      if (gem) { g.gems += gem; g.saveMeta(); }
      FX.popText(this.x, this.y - g.ts * 1.0, '💰 보물 획득!', '#ffd24d', 22, { life: 1.5, vy: -42 });
      if (gem) FX.popText(this.x, this.y - g.ts * 1.5, '💎 +' + gem, '#7fd8ff', 17, { life: 1.5, vy: -34 });
      if (window.VFX) VFX.confetti(this.x, this.y, '#ffd24d', 46);
      FX.flash('#ffd24d', .22); FX.shake(9);
      SFX.play('jackpot');
      if (window.UI) UI.toast('💰 보물 적 처치! +' + U.fmt(gold) + 'G' + (gem ? ` · 💎${gem}` : ''), '#ffd24d');
    }

    /* 맵 모디파이어 : 부활의 저주 */
    const revive = g.modVal('reviveChance', 0);
    if (revive && !this.leaked && !this.boss && Math.random() < revive) {
      g.spawnEnemy('skeleton', { dist: this.dist, hpMul: .8 });
      FX.popText(this.x, this.y - 14, '부활!', '#e6e2d0', 13);
    }

    /* 분열 */
    if (this.def.splitInto && !this.leaked) {
      for (let i = 0; i < (this.def.splitN || 2); i++) {
        g.spawnEnemy(this.def.splitInto, {
          dist: Math.max(0, this.dist - U.rand(4, 18)), hpMul: .55
        });
      }
    }
  }

  leak() {
    if (this.dead) return;
    this.dead = true; this.leaked = true;
    const g = this.g;
    /* 보물 적은 도망칠 뿐이다 — 아쉬움만 남기고 목숨은 건드리지 않는다 */
    if (this.treasure) {
      FX.popText(g.endX, g.endY - 30, '보물이 도망쳤다…', '#8a7f5c', 17, { life: 1.4, vy: -26 });
      SFX.play('error');
      return;
    }
    const dmg = this.boss ? 10 : (this.def.tier >= 3 ? 3 : this.def.tier >= 1 ? 2 : 1);
    if (g.buffs.sanctuary > 0) {
      FX.popText(g.endX, g.endY - 30, '방어됨!', '#fff2b0', 18);
      FX.ring(g.endX, g.endY, '#fff2b0', g.ts * 1.4, .4);
      return;
    }
    /* 관리자 무적 */
    if (window.Admin && Admin.godMode) {
      FX.popText(g.endX, g.endY - 30, '무적', '#ff8a96', 18);
      return;
    }
    /* 수호 장벽 : 남은 횟수만큼 누수를 대신 막는다 */
    if (g.bulwarkCharges > 0) {
      g.bulwarkCharges--;
      FX.popText(g.endX, g.endY - 30, '장벽! 남은 ' + g.bulwarkCharges, '#7fd0ff', 18);
      FX.ring(g.endX, g.endY, '#7fd0ff', g.ts * 1.6, .45);
      SFX.play('heal');
      return;
    }
    g.life -= dmg;
    g.stats.leaks++;
    FX.flash('#ff2a2a', .5); FX.shake(10);
    FX.explosion(this.x, this.y, g.ts * 1.2, '#ff4d4d');
    FX.popText(g.endX, g.endY - 30, '-' + dmg + ' ♥', '#ff4d5e', 22, { life: 1.2, vy: -50 });
    SFX.play('leak');
    g.resetCombo();
    if (g.life <= 0) g.gameOver();
  }
}

/* ================================================================ 유닛 */
class Unit {
  constructor(g, key, star, gx, gy) {
    this.g = g; this.key = key; this.def = UNIT_MAP[key];
    this.star = star || 1;
    this.gx = gx; this.gy = gy;
    this.seed = U.rand(100);
    this.cd = U.rand(0, .4);
    this.target = null;
    this.recoil = 0;
    this.buffFlash = 0;
    this.kills = 0; this.dmgDone = 0;
    this.mergeReady = false;
    this.targetMode = 'first';
    this.level = 1;         /* 골드 강화 레벨 */
    this.invested = 0;
    this.minions = [];
    this.goldAura = 0;
    this.stat = {};
    this.setPos();
    this.refresh();
    this.spawnMinions();
  }

  setPos() {
    const g = this.g;
    this.px = g.ox + (this.gx + .5) * g.ts;
    this.py = g.oy + (this.gy + .5) * g.ts;
  }

  /** 등급/성급/연구/시너지/오라 반영한 최종 스탯 */
  refresh() {
    const d = this.def, g = this.g;
    const rar = RARITY[RARITY_IDX[d.rarity]];
    const starMul = Math.pow(2.15, this.star - 1);
    const lvMul = 1 + (this.level - 1) * .18;
    const syn = g.synergyFor(d);

    const bl = g.bless || {};
    let dmg = d.dmg * rar.mul * starMul * lvMul;
    dmg *= (1 + g.research.atk * .06);
    dmg *= (1 + syn.dmg + g.bonus.dmg + (bl.dmg || 0));
    dmg *= (1 + this.auraVal('dmg'));
    if (g.buffs.overdrive > 0) dmg *= 1.6;
    if (g.buffs.bloodpact > 0) dmg *= 1.7;

    let spd = d.spd * (1 + g.research.spd * .04) * (1 + (syn.spd || 0) + (bl.spd || 0)) * (1 + this.auraVal('spd'));
    if (g.buffs.overdrive > 0) spd *= 2.2;

    let rng = d.rng * (1 + g.research.rng * .04) * (1 + (syn.rng || 0) + (bl.rng || 0)) * (1 + this.auraVal('rng'))
      * g.modNum('rngMul', 1);

    let crit = (d.crit || 0) + g.research.crit * .02 + (syn.crit || 0) + g.bonus.crit + (bl.crit || 0);
    let critMul = (d.critMul || 2) + g.research.critdmg * .12 + (syn.critdmg || 0) + (bl.critdmg || 0);
    let pen = (d.pen || 0) + g.research.pen * .03 + (syn.pen || 0) + (bl.pen || 0);
    let splash = (d.splash || 0) * (1 + g.research.splash * .05 + (syn.splash || 0) + (bl.splash || 0)) * g.modNum('splashMul', 1);

    /* 다중 사격 : 연구/시너지로 확률적 추가 발사 */
    const msBonus = g.research.multishot * .3 + (syn.multishot || 0) + (bl.multishot || 0);
    let multishot = (d.multishot || 1) + Math.floor(msBonus);
    this.msChance = msBonus % 1;

    this.stat = {
      dmg, spd: Math.min(14, spd), rng, crit: U.clamp(crit, 0, .95), critMul, pen: U.clamp(pen, 0, 1),
      splash,
      chain: (d.chain || 0) + (syn.chain || 0) + Math.floor(g.research.chain * .5) + (bl.chain || 0),
      pierce: d.pierce || 0,
      multishot,
      execute: (d.execute || 0) + g.research.exec * .01 + (bl.execute || 0),
      summonMul: 1 + g.research.summon * .08 + (syn.summon || 0),
    };
    this.goldAura = this.auraVal('gold') + (syn.gold || 0) + g.bonus.gold;
    this.dps = this.stat.dmg * this.stat.spd * this.stat.multishot;
  }

  /** 주변 지원 유닛 오라 합산 */
  auraVal(type) {
    let v = 0;
    for (const u of this.g.units) {
      if (u === this || !u.def.aura) continue;
      const a = u.def.aura;
      if (a.type !== type && a.type !== 'all') continue;
      const r = a.radius * this.g.ts;
      if (U.dist2(this.px, this.py, u.px, u.py) <= r * r) {
        const rar = RARITY[RARITY_IDX[u.def.rarity]];
        const syn = this.g.synergyFor(u.def);
        v += a.amt * (1 + (u.star - 1) * .35) * (1 + (syn.aura || 0) + this.g.research.aura * .08);
      }
    }
    return v;
  }

  spawnMinions() {
    for (const m of this.minions) m.dead = true;
    this.minions = [];
    if (!this.def.summon) return;
    const syn = this.g.synergyFor(this.def);
    const n = this.def.summon.count + (syn.summon > .6 ? 2 : syn.summon > 0 ? 1 : 0);
    for (let i = 0; i < n; i++) this.minions.push(new Minion(this.g, this, i, n));
  }

  cost() {
    const rar = RARITY[RARITY_IDX[this.def.rarity]];
    return Math.floor(rar.sell * (1 + (this.star - 1) * 1.6));
  }
  upgradeCost() {
    const rar = RARITY[RARITY_IDX[this.def.rarity]];
    return Math.floor((30 + rar.sell * .55) * Math.pow(1.45, this.level - 1) * (1 + (this.star - 1) * .5));
  }

  findTarget() {
    const g = this.g, rng = this.stat.rng * g.ts, r2 = rng * rng;
    let best = null, bestVal = -Infinity;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const d2 = U.dist2(this.px, this.py, e.x, e.y);
      if (d2 > r2) continue;
      let val;
      switch (this.targetMode) {
        case 'last': val = -e.dist; break;
        case 'strong': val = e.hp; break;
        case 'close': val = -d2; break;
        case 'boss': val = (e.boss ? 1e12 : 0) + e.dist; break;
        default: val = e.dist;
      }
      if (val > bestVal) { bestVal = val; best = e; }
    }
    return best;
  }

  update(dt) {
    if (this.recoil > 0) this.recoil -= dt;
    if (this.buffFlash > 0) this.buffFlash -= dt * 2;

    for (const m of this.minions) m.update(dt);

    this.cd -= dt;
    if (this.cd > 0) return;

    if (!this.target || this.target.dead ||
      U.dist2(this.px, this.py, this.target.x, this.target.y) > Math.pow(this.stat.rng * this.g.ts, 2)) {
      this.target = this.findTarget();
    }
    if (!this.target) return;

    this.aimAngle = U.ang(this.px, this.py, this.target.x, this.target.y);
    this.attack(this.target);
    this.cd = 1 / this.stat.spd;
    this.recoil = .12;
  }

  hitOpts(extra) {
    const d = this.def;
    return Object.assign({
      elem: d.elem, crit: this.stat.crit, critMul: this.stat.critMul,
      pen: this.stat.pen, trueDmg: !!d.trueDmg, holyBonus: d.holyBonus,
      bossBonus: d.bossBonus, execute: this.stat.execute, shieldBreak: d.shieldBreak,
      source: this, dmgScale: this.stat.dmg / Math.max(1, d.dmg)
    }, extra || {});
  }
  statusPack() {
    const d = this.def;
    if (!d.slow && !d.burn && !d.poison && !d.stun && !d.curse && !d.freeze && !d.root) return null;
    return { slow: d.slow, burn: d.burn, poison: d.poison, stun: d.stun, curse: d.curse, freeze: d.freeze, root: d.root };
  }

  attack(target) {
    const g = this.g, d = this.def, s = this.stat;
    const col = ELEM[d.elem].color;
    const ang = this.aimAngle;

    /* 총구 화염 */
    FX.spawn({
      x: this.px + Math.cos(ang) * g.ts * .3, y: this.py + Math.sin(ang) * g.ts * .3,
      vx: Math.cos(ang) * 60, vy: Math.sin(ang) * 60, life: .16, size: 7, size2: 1, color: col, shape: 'glow'
    });

    const shots = s.multishot;
    for (let i = 0; i < shots; i++) {
      const delay = i * .06;
      if (delay > 0) setTimeout(() => { if (!this.dead) this.fireOne(target, ang); }, delay * 1000 / g.speed);
      else this.fireOne(target, ang);
    }
  }

  fireOne(target, ang) {
    const g = this.g, d = this.def, s = this.stat;
    const col = ELEM[d.elem].color;
    if (!target || target.dead) {
      target = this.findTarget();
      if (!target) return;
    }
    const status = this.statusPack();

    switch (d.proj) {
      case 'none': {  /* 근접 즉시타격 */
        SFX.play('hit');
        const a = U.ang(this.px, this.py, target.x, target.y);
        g.beams.push(new Beam([
          { x: this.px + Math.cos(a) * g.ts * .3, y: this.py + Math.sin(a) * g.ts * .3 },
          { x: target.x, y: target.y }
        ], col, .12, 5));
        FX.sparks(target.x, target.y, col, 6, 220);
        Combat.hit(g, target, s.dmg, this.hitOpts());
        if (status) Combat.status(g, target, status, this.hitOpts());
        if (s.splash > 0) Combat.splash(g, target.x, target.y, s.splash * g.ts, s.dmg * .55, this.hitOpts({ status }));
        break;
      }
      case 'chain': {
        SFX.play('laser');
        this.chainLightning(target);
        break;
      }
      case 'beam': {
        SFX.play('laser');
        const pts = [{ x: this.px, y: this.py }, { x: target.x, y: target.y }];
        g.beams.push(new Beam(pts, col, .2, 8));
        FX.explosion(target.x, target.y, g.ts * .5, col);
        Combat.hit(g, target, s.dmg, this.hitOpts());
        if (status) Combat.status(g, target, status, this.hitOpts());
        if (s.splash > 0) Combat.splash(g, target.x, target.y, s.splash * g.ts, s.dmg * .6, this.hitOpts({ status }));
        break;
      }
      default: {
        /* 무기 종류마다 다른 발사음 — 전부 같은 소리면 화면이 시끄럽기만 하다 */
        SFX.play(Combat.fireSound(d));
        /* 쏘는 순간을 눈에 보이게 */
        VFX.muzzle(this.px, this.py, Math.atan2(target.y - this.py, target.x - this.px),
          col, g, s.splash > 0 ? 1.4 : 1);
        g.projectiles.push(new Projectile(g, this, target, d.proj, col));
      }
    }
  }

  chainLightning(first) {
    const g = this.g, s = this.stat;
    const col = ELEM[this.def.elem].color;
    const hits = [first];
    const pts = [{ x: this.px, y: this.py }];
    let cur = first, dmg = s.dmg;
    const maxChain = 1 + s.chain;
    const range = g.ts * 2.6;
    for (let i = 0; i < maxChain; i++) {
      if (!cur || cur.dead) break;
      pts.push({ x: cur.x + U.rand(-4, 4), y: cur.y + U.rand(-4, 4) });
      Combat.hit(g, cur, dmg, this.hitOpts());
      const st = this.statusPack();
      if (st) Combat.status(g, cur, st, this.hitOpts());
      FX.sparks(cur.x, cur.y, col, 6, 260);
      dmg *= .82;
      /* 다음 대상 */
      let next = null, bd = Infinity;
      for (const e of g.enemies) {
        if (e.dead || hits.indexOf(e) >= 0) continue;
        const d2 = U.dist2(cur.x, cur.y, e.x, e.y);
        if (d2 < range * range && d2 < bd) { bd = d2; next = e; }
      }
      if (!next) break;
      hits.push(next); cur = next;
    }
    /* 지그재그 */
    const jag = [];
    for (let i = 0; i < pts.length - 1; i++) {
      jag.push(pts[i]);
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      jag.push({ x: mx + U.rand(-10, 10), y: my + U.rand(-10, 10) });
    }
    jag.push(pts[pts.length - 1]);
    g.beams.push(new Beam(jag, col, .16, 4));
  }
}

/* ============================================================ 소환수 */
class Minion {
  constructor(g, owner, idx, total) {
    this.g = g; this.owner = owner; this.idx = idx; this.total = total;
    this.seed = U.rand(100);
    this.angle = idx / total * U.TAU;
    this.x = owner.px; this.y = owner.py;
    this.cd = U.rand(0, .5);
    this.dead = false;
  }
  update(dt) {
    if (this.dead) return;
    const o = this.owner, g = this.g;
    this.angle += dt * 1.9;
    const rad = g.ts * .62;
    this.x = o.px + Math.cos(this.angle) * rad;
    this.y = o.py + Math.sin(this.angle) * rad * .6;
    this.cd -= dt;
    if (this.cd > 0) return;
    const sm = o.def.summon;
    const rng = o.stat.rng * g.ts * 1.05;
    let best = null, bv = -Infinity;
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (U.dist2(this.x, this.y, e.x, e.y) > rng * rng) continue;
      if (e.dist > bv) { bv = e.dist; best = e; }
    }
    if (!best) return;
    this.cd = 1 / (sm.spd * (1 + g.research.spd * .04));
    const col = ELEM[o.def.elem].color;
    const p = new Projectile(g, o, best, 'orb', col);
    p.dmgOverride = o.stat.dmg * sm.dmg * (o.stat.summonMul || 1);
    p.size *= .7; p.speed *= 1.15;
    g.projectiles.push(p);
    FX.spawn({ x: this.x, y: this.y, life: .18, size: 6, size2: 0, color: col, shape: 'glow' });
  }
}

/* ============================================================ 투사체 */
class Projectile {
  constructor(g, owner, target, kind, color) {
    this.g = g; this.owner = owner; this.target = target;
    this.kind = kind; this.color = color;
    this.x = owner.px; this.y = owner.py;
    this.angle = U.ang(this.x, this.y, target.x, target.y);
    this.dead = false;
    this.hitList = [];
    this.life = 3;
    this.dmgOverride = 0;
    const s = owner.stat;
    switch (kind) {
      case 'arrow': this.speed = g.ts * 13; this.size = 4; this.homing = .55; break;
      case 'bolt': this.speed = g.ts * 16; this.size = 3.6; this.homing = .4; break;
      case 'dart': this.speed = g.ts * 15; this.size = 3; this.homing = .6; break;
      case 'bullet': this.speed = g.ts * 34; this.size = 3.4; this.homing = 0; break;
      case 'ball': this.speed = g.ts * 9.5; this.size = 5; this.homing = .8; break;
      case 'orb': this.speed = g.ts * 11; this.size = 5; this.homing = 1.1; break;
      case 'shard': this.speed = g.ts * 12; this.size = 4.4; this.homing = .7; break;
      case 'bomb': this.speed = g.ts * 7.5; this.size = 5.5; this.homing = .35; this.arc = true; break;
      case 'wave': this.speed = g.ts * 10; this.size = 6; this.homing = .5; break;
      default: this.speed = g.ts * 11; this.size = 4.5; this.homing = .6;
    }
    this.pierceLeft = s.pierce || 0;
    this.startX = this.x; this.startY = this.y;
    this.travel = 0;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    const g = this.g;
    /* 유도 */
    if (this.target && !this.target.dead && this.homing > 0) {
      const want = U.ang(this.x, this.y, this.target.x, this.target.y);
      this.angle = U.approachAngle(this.angle, want, this.homing * 14 * dt);
    } else if (this.target && this.target.dead && this.homing > .5) {
      /* 새 타겟 탐색 */
      let best = null, bd = Infinity;
      for (const e of g.enemies) {
        if (e.dead) continue;
        const d2 = U.dist2(this.x, this.y, e.x, e.y);
        if (d2 < bd) { bd = d2; best = e; }
      }
      if (best && bd < Math.pow(g.ts * 5, 2)) this.target = best;
    }
    const vx = Math.cos(this.angle) * this.speed, vy = Math.sin(this.angle) * this.speed;
    this.x += vx * dt; this.y += vy * dt;
    this.travel += this.speed * dt;

    /* 궤적 */
    if (this.kind === 'ball' || this.kind === 'orb' || this.kind === 'shard' || this.kind === 'wave') {
      if (Math.random() < .85) FX.trail(this.x, this.y, this.color, this.size * .8, .22);
    } else if (this.kind === 'bomb') {
      if (Math.random() < .6) FX.spawn({ x: this.x, y: this.y, life: .3, size: 3, color: '#888', shape: 'smoke', glow: false });
    } else if (Math.random() < .3) FX.trail(this.x, this.y, this.color, this.size * .5, .13);

    /* 화면 밖 */
    if (this.x < -60 || this.y < -60 || this.x > g.W + 60 || this.y > g.H + 60) { this.dead = true; return; }

    /* 충돌 */
    const hitR = g.ts * .32 + this.size;
    for (const e of g.enemies) {
      if (e.dead || this.hitList.indexOf(e) >= 0) continue;
      const rr = hitR + g.ts * .2 * ((e.def.scale || 1) - 1);
      if (U.dist2(this.x, this.y, e.x, e.y) <= rr * rr) {
        this.impact(e);
        if (this.dead) return;
      }
    }
  }

  impact(e) {
    const g = this.g, o = this.owner, s = o.stat;
    const dmg = this.dmgOverride || s.dmg;
    const opts = o.hitOpts();
    const status = o.statusPack();
    this.hitList.push(e);

    Combat.hit(g, e, dmg, opts);
    if (status) Combat.status(g, e, status, opts);

    if (s.splash > 0) {
      const R = s.splash * g.ts;
      Combat.splash(g, this.x, this.y, R, dmg * .62, Object.assign({}, opts, { status }));
      FX.explosion(this.x, this.y, R * .6, this.color);
      SFX.play('explode');
      g.addShakeForSplash(R);
    } else {
      FX.burst(this.x, this.y, this.color, 6, { speed: 110, size: 3.4 });
      SFX.play('hit');
    }

    if (this.pierceLeft > 0) { this.pierceLeft--; }
    else this.dead = true;
  }
}

/* ============================================================ 빔 */
class Beam {
  constructor(pts, color, life, width) {
    this.pts = pts; this.color = color;
    this.life = this.maxLife = life; this.width = width;
    this.dead = false;
  }
  update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; }
}

/* ============================================================ 장판 */
class Zone {
  constructor(g, x, y, r, color, life, dps, opts = {}) {
    this.g = g; this.x = x; this.y = y; this.r = r; this.color = color;
    this.life = this.maxLife = life; this.dps = dps; this.opts = opts;
    this.tick = 0; this.dead = false;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.tick -= dt;
    if (this.tick <= 0) {
      this.tick = .25;
      Combat.splash(this.g, this.x, this.y, this.r, this.dps * .25, Object.assign({ isDot: true }, this.opts));
    }
    /* 블랙홀 : 경로를 따라 뒤로 끌어당긴다 */
    if (this.opts.pull) {
      const R2 = this.r * this.r * 2.4;
      for (const e of this.g.enemies) {
        if (e.dead || e.boss) continue;
        if (U.dist2(this.x, this.y, e.x, e.y) < R2) {
          e.dist = Math.max(0, e.dist - this.g.ts * 1.2 * dt);
          e.updatePos();
          if (Math.random() < dt * 6) FX.spawn({
            x: e.x, y: e.y, vx: (this.x - e.x) * 2, vy: (this.y - e.y) * 2,
            life: .35, size: 3, color: this.color, shape: 'spark'
          });
        }
      }
    }
    if (Math.random() < dt * 20) {
      const a = U.rand(U.TAU), d = U.rand(0, this.r);
      FX.spawn({
        x: this.x + Math.cos(a) * d, y: this.y + Math.sin(a) * d,
        vx: 0, vy: U.rand(-30, -8), life: .6, size: 4, color: this.color
      });
    }
  }
}

window.Combat = Combat; window.Enemy = Enemy; window.Unit = Unit;
window.Minion = Minion; window.Projectile = Projectile; window.Beam = Beam; window.Zone = Zone;
