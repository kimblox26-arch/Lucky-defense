// 웨이브 사이 강화 선택. 3장 중 1장을 고른다.
// 무기 해금도 카드로 등장해 "보급"의 의미를 준다.

import { Rng } from '../core/Util.js';
import { $ } from '../ui/Screens.js';
import { WEAPONS } from '../player/Weapons.js';

/**
 * apply(game): 효과 적용
 * max: 최대 중첩 (없으면 무제한)
 * rarity: common | rare | epic | weapon
 * minWave: 등장 최소 웨이브
 */
export const UPGRADES = [
  {
    id: 'damage', icon: '🔥', name: '고관통탄', short: '피해',
    rarity: 'common', desc: '모든 무기 피해 +18%',
    apply: (g) => { g.weapons.mods.damage *= 1.18; },
  },
  {
    id: 'firerate', icon: '⚡', name: '경량 노리쇠', short: '연사',
    rarity: 'common', desc: '연사 속도 +14%', max: 6,
    apply: (g) => { g.weapons.mods.fireRate *= 1.14; },
  },
  {
    id: 'reload', icon: '🔁', name: '속사 탄창', short: '재장전',
    rarity: 'common', desc: '재장전 속도 +22%', max: 5,
    apply: (g) => { g.weapons.mods.reloadSpeed *= 1.22; },
  },
  {
    id: 'mag', icon: '📦', name: '확장 탄창', short: '탄창',
    rarity: 'common', desc: '탄창 용량 +30%', max: 5,
    apply: (g) => { g.weapons.mods.magSize *= 1.3; g.weapons.refillAll(); },
  },
  {
    id: 'accuracy', icon: '🎯', name: '총열 안정기', short: '정확도',
    rarity: 'common', desc: '탄 퍼짐 -22%', max: 5,
    apply: (g) => { g.weapons.mods.spread *= 0.78; },
  },
  {
    id: 'health', icon: '❤️', name: '아드레날린 팩', short: '체력',
    rarity: 'common', desc: '최대 체력 +25, 즉시 회복',
    apply: (g) => {
      g.player.maxHealth += 25;
      g.player.tuning.maxHealth = g.player.maxHealth;
      g.player.heal(9999);
    },
  },
  {
    id: 'speed', icon: '🥾', name: '경량 각반', short: '이동',
    rarity: 'common', desc: '이동 속도 +10%', max: 5,
    apply: (g) => { g.player.speedMul *= 1.1; },
  },
  {
    id: 'regen', icon: '🩹', name: '나노 봉합', short: '재생',
    rarity: 'rare', desc: '체력 재생 속도 2배, 대기 시간 절반', max: 3,
    apply: (g) => {
      g.player.tuning.regenRate *= 2;
      g.player.tuning.regenDelay *= 0.5;
    },
  },
  {
    id: 'armor', icon: '🛡️', name: '방탄 조끼', short: '방어',
    rarity: 'rare', desc: '보호막 +50 (웨이브마다 재충전)', max: 4,
    apply: (g) => {
      g.player.armorMax += 50;
      g.player.armor = g.player.armorMax;
    },
  },
  {
    id: 'headshot', icon: '💀', name: '정밀 조준경', short: '헤드샷',
    rarity: 'rare', desc: '헤드샷 배수 +35%', max: 4,
    apply: (g) => { g.weapons.mods.headshot *= 1.35; },
  },
  {
    id: 'pierce', icon: '🏹', name: '관통탄', short: '관통',
    rarity: 'rare', desc: '탄이 적 1명을 추가로 관통', max: 3,
    apply: (g) => { g.weapons.mods.penetration += 1; },
  },
  {
    id: 'lifesteal', icon: '🧬', name: '기생 혈청', short: '흡혈',
    rarity: 'epic', desc: '처치 시 체력 6 회복', max: 4,
    apply: (g) => { g.weapons.mods.lifesteal += 6; },
  },
  {
    id: 'explosive', icon: '💣', name: '작약탄', short: '폭발',
    rarity: 'epic', desc: '처치 시 작은 폭발 발생', max: 3, minWave: 4,
    apply: (g) => { g.weapons.mods.explosive += 1; },
  },
  {
    id: 'ammo', icon: '🔋', name: '보급 계약', short: '탄약',
    rarity: 'common', desc: '예비 탄약 전량 보충 + 최대치 상향',
    apply: (g) => { g.weapons.mods.ammoGain *= 1.25; g.weapons.refillAll(); },
  },
  {
    id: 'damage2', icon: '☠️', name: '열화 우라늄', short: '피해+',
    rarity: 'epic', desc: '모든 무기 피해 +35%', max: 3, minWave: 6,
    apply: (g) => { g.weapons.mods.damage *= 1.35; },
  },
];

export class Upgrades {
  constructor(game) {
    this.game = game;
    this.rng = new Rng(0xbeef);
    this.stacks = new Map();
    this.offer = [];
    this.el = $('#upgradeCards');
    this._onKey = this._onKey.bind(this);
  }

  reset() {
    this.stacks.clear();
    this.offer = [];
    this.rng.reseed(0xbeef);
  }

  /** 모든 웨이브 후 강화 선택을 제공한다 */
  hasOffer() { return true; }

  get takenList() {
    const out = [];
    for (const [id, n] of this.stacks) {
      const u = UPGRADES.find((x) => x.id === id);
      if (u) out.push({ icon: u.icon, short: u.short, stacks: n });
    }
    return out;
  }

  _pool(wave) {
    const out = [];
    for (const u of UPGRADES) {
      if (u.minWave && wave < u.minWave) continue;
      const n = this.stacks.get(u.id) ?? 0;
      if (u.max && n >= u.max) continue;
      // 등급에 따른 가중치. 웨이브가 오를수록 상위 등급이 잘 나온다
      let w = u.rarity === 'common' ? 1 : u.rarity === 'rare' ? 0.55 : 0.3;
      w *= u.rarity === 'common' ? 1 : (0.55 + Math.min(1, wave / 12));
      // 이미 쌓은 것은 조금 덜 나오게 해 다양성을 준다
      w *= Math.pow(0.72, n);
      out.push({ u, w });
    }
    return out;
  }

  /** 아직 안 가진 무기를 카드로 제안 */
  _weaponCard(wave) {
    const locked = this.game.weapons.list.filter((w) => !w.unlocked);
    if (!locked.length) return null;
    // 웨이브에 맞는 순서로
    const order = ['smg', 'shotgun', 'rifle', 'sniper'];
    const next = order.find((id) => locked.some((w) => w.def.id === id));
    if (!next) return null;
    const idx = order.indexOf(next);
    if (wave < 2 + idx * 2) return null;
    const def = WEAPONS.find((w) => w.id === next);
    return {
      id: 'weapon_' + next, icon: def.icon, name: def.name, short: def.short,
      rarity: 'weapon', desc: `${def.name} 보급 — 즉시 사용 가능`,
      apply: (g) => {
        g.weapons.unlock(next);
        const i = g.weapons.list.findIndex((w) => w.def.id === next);
        g.weapons.index = i;
        g.viewModel.setWeapon(g.weapons.cur);
        g.hud.refreshSlots();
      },
    };
  }

  present(wave) {
    const cards = [];
    const weapon = this._weaponCard(wave);
    if (weapon) cards.push(weapon);

    const pool = this._pool(wave);
    while (cards.length < 3 && pool.length) {
      const total = pool.reduce((s, e) => s + e.w, 0);
      let pick = this.rng.float() * total;
      let idx = pool.length - 1;
      for (let i = 0; i < pool.length; i++) { pick -= pool[i].w; if (pick <= 0) { idx = i; break; } }
      cards.push(pool[idx].u);
      pool.splice(idx, 1);
    }

    this.offer = cards;
    $('#upWave').textContent = String(wave);
    this.el.innerHTML = cards.map((c, i) => {
      const n = this.stacks.get(c.id) ?? 0;
      return `<div class="ucard ${c.rarity}" data-i="${i}" role="button" tabindex="0">
        <span class="uk">${i + 1}</span>
        <div class="uicon">${c.icon}</div>
        <div>
          <div class="uname">${c.name}</div>
          <div class="udesc">${c.desc}</div>
          ${n > 0 ? `<div class="ustack">보유 ${n}${c.max ? ` / ${c.max}` : ''}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    for (const el of this.el.children) {
      el.addEventListener('click', () => this.choose(+el.dataset.i));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.choose(+el.dataset.i); }
      });
    }
    window.addEventListener('keydown', this._onKey);
    this.el.firstElementChild?.focus?.();
  }

  _onKey(e) {
    const n = +e.key;
    if (n >= 1 && n <= this.offer.length) {
      e.preventDefault();
      this.choose(n - 1);
    }
  }

  choose(i) {
    const card = this.offer[i];
    if (!card) return;
    window.removeEventListener('keydown', this._onKey);
    this.offer = [];
    this.stacks.set(card.id, (this.stacks.get(card.id) ?? 0) + 1);
    card.apply(this.game);
    this.game.audio?.uiSelect();
    this.game.hud.setPerks(this.takenList);
    this.game.closeUpgrades();
  }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
  }
}

