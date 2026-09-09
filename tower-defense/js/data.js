/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  data.js
 *  원소 / 등급 / 유닛 44종 / 적 42종 / 보스 / 맵 / 스킬 / 연구 / 업적 / 시너지
 * ========================================================================= */
'use strict';

/* ------------------------------------------------------------- 원소 */
const ELEM = {
  phys: { name: '물리', color: '#e8e4d8', icon: '⚔', desc: '방어력에 크게 영향받지만 안정적' },
  fire: { name: '화염', color: '#ff6b35', icon: '🔥', desc: '화상 : 지속 피해' },
  ice: { name: '냉기', color: '#5bc8ff', icon: '❄', desc: '둔화 & 빙결' },
  thunder: { name: '뇌전', color: '#ffe14d', icon: '⚡', desc: '연쇄 번개 & 감전' },
  poison: { name: '맹독', color: '#7bdd52', icon: '☠', desc: '중첩 독 피해' },
  holy: { name: '신성', color: '#fff2b0', icon: '✦', desc: '언데드/암흑 특효' },
  dark: { name: '암흑', color: '#b57bff', icon: '🌑', desc: '저주 : 받는 피해 증가' },
  nature: { name: '자연', color: '#3fd68c', icon: '🌿', desc: '속박 & 추가 골드' },
  arcane: { name: '비전', color: '#ff5bd0', icon: '✧', desc: '방어 무시 고정 피해' },
  void: { name: '공허', color: '#8f7bff', icon: '◈', desc: '보호막 파괴 & 즉살' },
};

/* ------------------------------------------------------------- 등급 */
const RARITY = [
  { key: 'common', name: '일반', color: '#b9c4cf', glow: '#dfe8f0', mul: 1.00, w: 3800, sell: 40 },
  { key: 'uncommon', name: '고급', color: '#63d471', glow: '#a8f5b2', mul: 1.85, w: 2500, sell: 90 },
  { key: 'rare', name: '희귀', color: '#4ea8ff', glow: '#9fd2ff', mul: 3.45, w: 1500, sell: 200 },
  { key: 'epic', name: '영웅', color: '#b46bff', glow: '#dcb4ff', mul: 6.4, w: 720, sell: 460 },
  { key: 'legendary', name: '전설', color: '#ffb300', glow: '#ffe08a', mul: 12.2, w: 260, sell: 1100 },
  { key: 'mythic', name: '신화', color: '#ff4f7e', glow: '#ffb6c8', mul: 24.0, w: 78, sell: 2800 },
  { key: 'ultimate', name: '초월', color: '#6ffff0', glow: '#c9fffa', mul: 48.0, w: 14, sell: 7200 },
];
const RARITY_IDX = {}; RARITY.forEach((r, i) => RARITY_IDX[r.key] = i);

/* ------------------------------------------------------------- 클래스 */
const CLASSES = {
  archer: { name: '궁수', icon: '🏹', desc: '단일 표적 고속 사격' },
  mage: { name: '마법사', icon: '🔮', desc: '광역 마법 피해' },
  artillery: { name: '포격', icon: '💣', desc: '느리지만 강력한 범위 폭발' },
  support: { name: '지원', icon: '✚', desc: '주변 아군 강화' },
  assassin: { name: '암살자', icon: '🗡', desc: '치명타 & 처형' },
  guardian: { name: '수호', icon: '🛡', desc: '근거리 고화력 & 방어 관통' },
  sniper: { name: '저격', icon: '🎯', desc: '초장거리 관통 사격' },
  summoner: { name: '소환사', icon: '👁', desc: '분신/드론 소환' },
};

/* =========================================================================
 *  유닛 44종
 *  dmg   : 기본 타격 피해   spd : 초당 공격 횟수   rng : 사거리(타일)
 *  art   : {b:몸통, h:머리, w:무기}
 * ========================================================================= */
const UNITS = [
  /* ---------- 일반 ---------- */
  { key: 'archer', name: '견습 궁수', rarity: 'common', cls: 'archer', elem: 'phys', art: { b: 'cloak', h: 'hood', w: 'bow' }, dmg: 13, spd: 1.35, rng: 3.6, proj: 'arrow', desc: '평범하지만 믿음직한 첫 걸음.' },
  { key: 'spear', name: '신병 창병', rarity: 'common', cls: 'guardian', elem: 'phys', art: { b: 'armor', h: 'helm', w: 'spear' }, dmg: 20, spd: 1.0, rng: 2.0, proj: 'none', pen: .25, desc: '방어력 25% 관통.' },
  { key: 'sling', name: '돌팔매꾼', rarity: 'common', cls: 'artillery', elem: 'phys', art: { b: 'robe', h: 'none', w: 'sling' }, dmg: 22, spd: .78, rng: 3.2, proj: 'bomb', splash: .8, desc: '작은 범위 폭발.' },
  { key: 'apprentice', name: '견습 마법사', rarity: 'common', cls: 'mage', elem: 'arcane', art: { b: 'robe', h: 'hood', w: 'wand' }, dmg: 16, spd: 1.0, rng: 3.4, proj: 'ball', splash: .7, desc: '방어 무시 비전 탄.' },
  { key: 'torch', name: '화톳불 지기', rarity: 'common', cls: 'mage', elem: 'fire', art: { b: 'robe', h: 'none', w: 'torch' }, dmg: 11, spd: 1.5, rng: 2.8, proj: 'ball', burn: { dps: .45, dur: 3 }, desc: '화상을 남긴다.' },
  { key: 'sapling', name: '나무 정령', rarity: 'common', cls: 'support', elem: 'nature', art: { b: 'spirit', h: 'leaf', w: 'none' }, dmg: 9, spd: .9, rng: 2.6, proj: 'ball', aura: { type: 'gold', amt: .08, radius: 3 }, desc: '주변 처치 골드 +8%.' },

  /* ---------- 고급 ---------- */
  { key: 'crossbow', name: '석궁병', rarity: 'uncommon', cls: 'archer', elem: 'phys', art: { b: 'armor', h: 'helm', w: 'crossbow' }, dmg: 26, spd: 1.5, rng: 4.0, proj: 'bolt', pierce: 1, desc: '적 1명 관통.' },
  { key: 'frostboy', name: '얼음 견습생', rarity: 'uncommon', cls: 'mage', elem: 'ice', art: { b: 'robe', h: 'hood', w: 'staff' }, dmg: 18, spd: 1.1, rng: 3.5, proj: 'shard', splash: .8, slow: { amt: .28, dur: 2 }, desc: '이동속도 28% 둔화.' },
  { key: 'bomber', name: '폭탄병', rarity: 'uncommon', cls: 'artillery', elem: 'fire', art: { b: 'armor', h: 'mask', w: 'bomb' }, dmg: 46, spd: .62, rng: 3.4, proj: 'bomb', splash: 1.35, desc: '넓은 폭발.' },
  { key: 'wolfmaster', name: '늑대 조련사', rarity: 'uncommon', cls: 'summoner', elem: 'nature', art: { b: 'cloak', h: 'horn', w: 'claw' }, dmg: 15, spd: 1.2, rng: 3.0, proj: 'none', summon: { count: 1, dmg: .55, spd: 1.4, life: 999 }, desc: '늑대 1마리를 항상 곁에 둔다.' },
  { key: 'priest', name: '수도 사제', rarity: 'uncommon', cls: 'support', elem: 'holy', art: { b: 'robe', h: 'halo', w: 'orb' }, dmg: 14, spd: 1.0, rng: 3.2, proj: 'orb', aura: { type: 'dmg', amt: .12, radius: 2.8 }, desc: '주변 아군 공격력 +12%.' },
  { key: 'blowdart', name: '독침 사수', rarity: 'uncommon', cls: 'archer', elem: 'poison', art: { b: 'cloak', h: 'mask', w: 'dart' }, dmg: 12, spd: 1.9, rng: 3.6, proj: 'dart', poison: { dps: .5, dur: 4, stack: 5 }, desc: '독을 5중첩까지 쌓는다.' },
  { key: 'sparker', name: '번개 도제', rarity: 'uncommon', cls: 'mage', elem: 'thunder', art: { b: 'robe', h: 'none', w: 'wand' }, dmg: 20, spd: 1.15, rng: 3.3, proj: 'chain', chain: 2, desc: '번개가 2회 튄다.' },

  /* ---------- 희귀 ---------- */
  { key: 'marksman', name: '명사수', rarity: 'rare', cls: 'archer', elem: 'phys', art: { b: 'cloak', h: 'hat', w: 'bow' }, dmg: 44, spd: 1.7, rng: 4.4, proj: 'arrow', crit: .2, critMul: 2.2, desc: '치명타 20% / 220%.' },
  { key: 'pyro', name: '화염술사', rarity: 'rare', cls: 'mage', elem: 'fire', art: { b: 'robe', h: 'horn', w: 'staff' }, dmg: 40, spd: 1.05, rng: 3.6, proj: 'ball', splash: 1.4, burn: { dps: .8, dur: 4 }, desc: '광역 화상 폭발.' },
  { key: 'frostwitch', name: '서리 마녀', rarity: 'rare', cls: 'mage', elem: 'ice', art: { b: 'robe', h: 'hat', w: 'staff' }, dmg: 34, spd: 1.1, rng: 3.8, proj: 'shard', splash: 1.2, slow: { amt: .4, dur: 2.5 }, freeze: .07, desc: '7% 확률 1.2초 빙결.' },
  { key: 'storm', name: '폭풍술사', rarity: 'rare', cls: 'mage', elem: 'thunder', art: { b: 'robe', h: 'hood', w: 'staff' }, dmg: 38, spd: 1.2, rng: 3.9, proj: 'chain', chain: 4, stun: .06, desc: '4연쇄 번개 / 6% 기절.' },
  { key: 'shadow', name: '그림자 단검', rarity: 'rare', cls: 'assassin', elem: 'dark', art: { b: 'cloak', h: 'mask', w: 'dagger' }, dmg: 30, spd: 2.4, rng: 2.6, proj: 'none', crit: .28, critMul: 2.4, curse: { amt: .12, dur: 3 }, desc: '저주 : 대상이 받는 피해 +12%.' },
  { key: 'paladin', name: '성기사', rarity: 'rare', cls: 'guardian', elem: 'holy', art: { b: 'armor', h: 'halo', w: 'sword' }, dmg: 62, spd: .95, rng: 2.3, proj: 'none', pen: .5, holyBonus: .6, desc: '방어 50% 관통, 언데드에 +60%.' },
  { key: 'cannon', name: '대포', rarity: 'rare', cls: 'artillery', elem: 'phys', art: { b: 'construct', h: 'none', w: 'cannon' }, dmg: 96, spd: .5, rng: 4.0, proj: 'bomb', splash: 1.7, desc: '묵직한 한 방.' },
  { key: 'huntress', name: '정글 사냥꾼', rarity: 'rare', cls: 'archer', elem: 'nature', art: { b: 'cloak', h: 'leaf', w: 'bow' }, dmg: 33, spd: 1.55, rng: 4.0, proj: 'arrow', multishot: 2, root: .08, desc: '2발 동시 사격 / 8% 속박.' },
  { key: 'alchemist', name: '연금술사', rarity: 'rare', cls: 'artillery', elem: 'poison', art: { b: 'robe', h: 'mask', w: 'flask' }, dmg: 42, spd: .8, rng: 3.5, proj: 'bomb', splash: 1.5, poison: { dps: .9, dur: 5, stack: 8 }, desc: '독 웅덩이를 남긴다.' },

  /* ---------- 영웅 ---------- */
  { key: 'sniper', name: '저격수', rarity: 'epic', cls: 'sniper', elem: 'phys', art: { b: 'cloak', h: 'goggle', w: 'rifle' }, dmg: 210, spd: .62, rng: 7.5, proj: 'bullet', pierce: 3, crit: .3, critMul: 2.6, desc: '초장거리 3관통.' },
  { key: 'infernal', name: '지옥불 군주', rarity: 'epic', cls: 'mage', elem: 'fire', art: { b: 'demon', h: 'horn', w: 'orb' }, dmg: 95, spd: 1.0, rng: 4.0, proj: 'ball', splash: 2.0, burn: { dps: 1.6, dur: 5 }, desc: '지옥의 불길이 퍼진다.' },
  { key: 'glacier', name: '빙하 여왕', rarity: 'epic', cls: 'mage', elem: 'ice', art: { b: 'robe', h: 'crown', w: 'staff' }, dmg: 82, spd: 1.05, rng: 4.2, proj: 'shard', splash: 1.8, slow: { amt: .55, dur: 3 }, freeze: .14, desc: '광역 빙결 지배.' },
  { key: 'thunderpriest', name: '뇌신 사제', rarity: 'epic', cls: 'mage', elem: 'thunder', art: { b: 'robe', h: 'halo', w: 'hammer' }, dmg: 88, spd: 1.25, rng: 4.2, proj: 'chain', chain: 6, stun: .1, desc: '6연쇄 / 10% 기절.' },
  { key: 'plague', name: '역병 연금술사', rarity: 'epic', cls: 'artillery', elem: 'poison', art: { b: 'robe', h: 'beak', w: 'flask' }, dmg: 105, spd: .78, rng: 4.0, proj: 'bomb', splash: 2.2, poison: { dps: 2.2, dur: 6, stack: 12 }, desc: '역병이 12중첩까지.' },
  { key: 'darkknight', name: '암흑 기사', rarity: 'epic', cls: 'guardian', elem: 'dark', art: { b: 'armor', h: 'horn', w: 'sword' }, dmg: 175, spd: 1.0, rng: 2.6, proj: 'none', pen: .7, curse: { amt: .22, dur: 4 }, desc: '방어 70% 관통 + 강한 저주.' },
  { key: 'runecannon', name: '룬 포격기', rarity: 'epic', cls: 'artillery', elem: 'arcane', art: { b: 'construct', h: 'orb', w: 'cannon' }, dmg: 260, spd: .42, rng: 5.0, proj: 'bomb', splash: 2.4, trueDmg: true, desc: '방어 완전 무시 고정 피해.' },
  { key: 'elementalist', name: '정령 소환사', rarity: 'epic', cls: 'summoner', elem: 'arcane', art: { b: 'robe', h: 'orb', w: 'orb' }, dmg: 60, spd: 1.1, rng: 3.6, proj: 'orb', summon: { count: 2, dmg: .5, spd: 1.6, life: 999 }, desc: '정령 2기를 항시 소환.' },
  { key: 'ranger', name: '질풍 유격대', rarity: 'epic', cls: 'archer', elem: 'nature', art: { b: 'cloak', h: 'hood', w: 'crossbow' }, dmg: 74, spd: 2.6, rng: 4.4, proj: 'bolt', pierce: 2, multishot: 2, desc: '초고속 2연발 관통.' },

  /* ---------- 전설 ---------- */
  { key: 'dragoon', name: '용기사', rarity: 'legendary', cls: 'guardian', elem: 'fire', art: { b: 'dragonoid', h: 'horn', w: 'spear' }, dmg: 430, spd: 1.35, rng: 3.0, proj: 'none', pen: .8, splash: 1.4, burn: { dps: 4, dur: 5 }, desc: '용의 창이 대지를 가른다.' },
  { key: 'sunpriest', name: '태양 신관', rarity: 'legendary', cls: 'support', elem: 'holy', art: { b: 'robe', h: 'crown', w: 'orb' }, dmg: 220, spd: 1.1, rng: 4.4, proj: 'beam', holyBonus: 1.0, aura: { type: 'dmg', amt: .3, radius: 3.6 }, desc: '주변 공격력 +30%, 언데드 2배.' },
  { key: 'zero', name: '절대 영도', rarity: 'legendary', cls: 'mage', elem: 'ice', art: { b: 'spirit', h: 'crown', w: 'staff' }, dmg: 330, spd: 1.0, rng: 4.6, proj: 'shard', splash: 2.6, slow: { amt: .7, dur: 3.5 }, freeze: .25, desc: '25% 확률 광역 빙결.' },
  { key: 'judge', name: '천둥의 심판자', rarity: 'legendary', cls: 'mage', elem: 'thunder', art: { b: 'armor', h: 'halo', w: 'hammer' }, dmg: 300, spd: 1.4, rng: 4.6, proj: 'chain', chain: 9, stun: .16, desc: '9연쇄 심판의 번개.' },
  { key: 'abyss', name: '심연의 마녀', rarity: 'legendary', cls: 'assassin', elem: 'dark', art: { b: 'spirit', h: 'hat', w: 'scythe' }, dmg: 260, spd: 2.1, rng: 3.2, proj: 'none', crit: .4, critMul: 3.0, curse: { amt: .4, dur: 5 }, execute: .08, desc: '체력 8% 이하 즉시 처형.' },
  { key: 'chrono', name: '시간술사', rarity: 'legendary', cls: 'support', elem: 'arcane', art: { b: 'robe', h: 'orb', w: 'orb' }, dmg: 180, spd: 1.2, rng: 4.0, proj: 'orb', trueDmg: true, aura: { type: 'spd', amt: .35, radius: 3.6 }, desc: '주변 공격속도 +35%.' },
  { key: 'devastator', name: '파괴포 MK-VII', rarity: 'legendary', cls: 'artillery', elem: 'phys', art: { b: 'construct', h: 'goggle', w: 'cannon' }, dmg: 1250, spd: .34, rng: 5.6, proj: 'bomb', splash: 3.2, pen: .6, desc: '한 발로 무리를 지운다.' },

  /* ---------- 신화 ---------- */
  { key: 'phoenix', name: '불사조', rarity: 'mythic', cls: 'summoner', elem: 'fire', art: { b: 'beast', h: 'crown', w: 'none' }, dmg: 720, spd: 1.5, rng: 4.6, proj: 'ball', splash: 2.4, burn: { dps: 14, dur: 6 }, summon: { count: 2, dmg: .8, spd: 2.0, life: 999 }, desc: '불꽃 새 2마리를 거느린다.' },
  { key: 'worldtree', name: '세계수', rarity: 'mythic', cls: 'support', elem: 'nature', art: { b: 'construct', h: 'leaf', w: 'none' }, dmg: 480, spd: 1.0, rng: 5.0, proj: 'ball', splash: 2.6, root: .3, aura: { type: 'all', amt: .28, radius: 5.0 }, desc: '광범위 전체 강화 +28%.' },
  { key: 'voidlord', name: '공허의 군주', rarity: 'mythic', cls: 'mage', elem: 'void', art: { b: 'demon', h: 'crown', w: 'orb' }, dmg: 900, spd: 1.15, rng: 5.0, proj: 'orb', splash: 3.0, trueDmg: true, shieldBreak: 3, desc: '보호막을 3배로 부순다.' },
  { key: 'starsniper', name: '별의 저격수', rarity: 'mythic', cls: 'sniper', elem: 'arcane', art: { b: 'cloak', h: 'goggle', w: 'rifle' }, dmg: 3200, spd: .55, rng: 99, proj: 'bullet', pierce: 6, crit: .45, critMul: 3.5, trueDmg: true, desc: '맵 전체를 사거리로 삼는다.' },
  { key: 'godslayer', name: '신멸의 검', rarity: 'mythic', cls: 'assassin', elem: 'holy', art: { b: 'armor', h: 'crown', w: 'sword' }, dmg: 1400, spd: 2.2, rng: 3.0, proj: 'none', crit: .5, critMul: 3.2, execute: .15, bossBonus: 1.2, desc: '보스에게 +120% 피해.' },

  /* ---------- 초월 ---------- */
  {
    key: 'omega', name: 'OMEGA 코어', rarity: 'ultimate', cls: 'artillery', elem: 'arcane', art: { b: 'construct', h: 'orb', w: 'cannon' },
    dmg: 9000, spd: .8, rng: 7.0, proj: 'bomb', splash: 4.2, trueDmg: true, pierce: 2, desc: '규격 외의 화력. 모든 것을 지운다.'
  },
  {
    key: 'genesis', name: '창조의 용', rarity: 'ultimate', cls: 'guardian', elem: 'nature', art: { b: 'dragonoid', h: 'crown', w: 'claw' },
    dmg: 6200, spd: 2.0, rng: 4.4, proj: 'wave', splash: 3.4, pen: 1, aura: { type: 'all', amt: .45, radius: 6 }, desc: '전 아군 +45% / 방어 완전 관통.'
  },
  {
    key: 'omen', name: '종말 관측자', rarity: 'ultimate', cls: 'mage', elem: 'void', art: { b: 'spirit', h: 'orb', w: 'scythe' },
    dmg: 7400, spd: 1.4, rng: 6.4, proj: 'beam', splash: 3.0, trueDmg: true, execute: .2, curse: { amt: .8, dur: 6 }, shieldBreak: 5, desc: '체력 20% 이하 모든 존재를 지운다.'
  },
];
const UNIT_MAP = {}; UNITS.forEach(u => UNIT_MAP[u.key] = u);
const UNITS_BY_RARITY = {};
RARITY.forEach(r => UNITS_BY_RARITY[r.key] = UNITS.filter(u => u.rarity === r.key));

/* =========================================================================
 *  적 42종
 *  hp/spd/armor 는 "기본계수" — 실제 값은 웨이브 스케일과 곱해진다.
 *  flags : fast, flying, armored, shield, regen, split, healer, summoner,
 *          teleport, rage, ghost, undead, boss, magicres, physres, cloak
 * ========================================================================= */
const ENEMIES = [
  /* --- 초반 --- */
  { key: 'slime', name: '슬라임', tier: 0, art: { b: 'slime', h: 'none' }, color: '#7ce07c', hp: .8, spd: .95, armor: 0, bounty: 1.0, flags: ['split'], splitInto: 'slimelet', splitN: 2 },
  { key: 'slimelet', name: '작은 슬라임', tier: 0, art: { b: 'slime', h: 'none' }, color: '#a8f0a8', hp: .28, spd: 1.25, armor: 0, bounty: .4, scale: .62 },
  { key: 'goblin', name: '고블린', tier: 0, art: { b: 'humanoid', h: 'ear' }, color: '#8fbf5a', hp: 1.0, spd: 1.15, armor: 0, bounty: 1.0 },
  { key: 'rat', name: '거대 쥐', tier: 0, art: { b: 'beast', h: 'ear' }, color: '#9a8f7a', hp: .7, spd: 1.5, armor: 0, bounty: .9, flags: ['fast'] },
  { key: 'bat', name: '동굴 박쥐', tier: 0, art: { b: 'wing', h: 'ear' }, color: '#8a6bb0', hp: .6, spd: 1.7, armor: 0, bounty: 1.0, flags: ['flying', 'fast'] },
  { key: 'skeleton', name: '해골 병사', tier: 0, art: { b: 'skeleton', h: 'skull' }, color: '#e6e2d0', hp: 1.15, spd: 1.0, armor: 2, bounty: 1.1, flags: ['undead'] },

  /* --- 중반 초입 --- */
  { key: 'orc', name: '오크 전사', tier: 1, art: { b: 'humanoid', h: 'tusk' }, color: '#6f9c4a', hp: 2.4, spd: .92, armor: 6, bounty: 1.4, flags: ['armored'] },
  { key: 'wolf', name: '서리늑대', tier: 1, art: { b: 'beast', h: 'ear' }, color: '#9fc9e8', hp: 1.6, spd: 1.75, armor: 2, bounty: 1.3, flags: ['fast'] },
  { key: 'zombie', name: '역병 좀비', tier: 1, art: { b: 'humanoid', h: 'none' }, color: '#7a9e6a', hp: 3.0, spd: .68, armor: 3, bounty: 1.4, flags: ['undead', 'regen'], regen: .012 },
  { key: 'spider', name: '독거미', tier: 1, art: { b: 'insect', h: 'eye' }, color: '#a05fbf', hp: 1.5, spd: 1.35, armor: 1, bounty: 1.3, flags: ['fast'] },
  { key: 'imp', name: '임프', tier: 1, art: { b: 'wing', h: 'horn' }, color: '#ff8a5a', hp: 1.4, spd: 1.5, armor: 0, bounty: 1.4, flags: ['flying'], resist: { fire: .5 } },
  { key: 'shielder', name: '방패병', tier: 1, art: { b: 'humanoid', h: 'helm' }, color: '#c0c8d4', hp: 2.2, spd: .8, armor: 10, bounty: 1.6, flags: ['armored', 'shield'], shield: .5 },
  { key: 'mage_e', name: '고블린 주술사', tier: 1, art: { b: 'robe', h: 'hood' }, color: '#b06fd6', hp: 1.8, spd: .95, armor: 2, bounty: 1.7, flags: ['healer'], healAmt: .02, healRadius: 2.5 },

  /* --- 중반 --- */
  { key: 'ogre', name: '오우거', tier: 2, art: { b: 'big', h: 'tusk' }, color: '#a8834f', hp: 6.5, spd: .72, armor: 12, bounty: 2.2, flags: ['armored'], scale: 1.3 },
  { key: 'wraith', name: '망령', tier: 2, art: { b: 'ghost', h: 'hood' }, color: '#9fb6ff', hp: 3.2, spd: 1.3, armor: 0, bounty: 2.0, flags: ['flying', 'ghost', 'undead'], resist: { phys: .55 } },
  { key: 'golem', name: '바위 골렘', tier: 2, art: { b: 'construct', h: 'none' }, color: '#8c8c8c', hp: 11, spd: .55, armor: 26, bounty: 2.6, flags: ['armored'], scale: 1.35, resist: { phys: .25 } },
  { key: 'harpy', name: '하피', tier: 2, art: { b: 'wing', h: 'ear' }, color: '#ffd36b', hp: 3.0, spd: 2.0, armor: 3, bounty: 2.1, flags: ['flying', 'fast'] },
  { key: 'necro', name: '강령술사', tier: 2, art: { b: 'robe', h: 'skull' }, color: '#a06fd6', hp: 4.0, spd: .85, armor: 5, bounty: 2.8, flags: ['summoner', 'undead'], summonKey: 'skeleton', summonN: 2, summonCd: 5 },
  { key: 'brute', name: '광폭 오크', tier: 2, art: { b: 'big', h: 'tusk' }, color: '#c0562f', hp: 5.5, spd: 1.0, armor: 8, bounty: 2.3, flags: ['rage'], rageSpd: 1.9 },
  { key: 'crystal', name: '수정 정령', tier: 2, art: { b: 'crystal', h: 'none' }, color: '#6be3ff', hp: 4.5, spd: 1.0, armor: 6, bounty: 2.5, flags: ['shield'], shield: 1.2, resist: { ice: .8 } },
  { key: 'blob', name: '거대 점액', tier: 2, art: { b: 'slime', h: 'none' }, color: '#5ac9a0', hp: 8.0, spd: .7, armor: 4, bounty: 2.4, flags: ['split'], splitInto: 'slime', splitN: 3, scale: 1.4 },

  /* --- 후반 --- */
  { key: 'knight_e', name: '흑기사', tier: 3, art: { b: 'armor', h: 'helm' }, color: '#4d4a68', hp: 16, spd: .95, armor: 45, bounty: 3.4, flags: ['armored'], resist: { phys: .3 } },
  { key: 'demon', name: '심연 악마', tier: 3, art: { b: 'demon', h: 'horn' }, color: '#e0466b', hp: 20, spd: 1.05, armor: 22, bounty: 3.8, resist: { fire: .7, dark: .5 } },
  { key: 'lich', name: '리치', tier: 3, art: { b: 'robe', h: 'crown' }, color: '#7fd6ff', hp: 18, spd: .8, armor: 18, bounty: 4.2, flags: ['summoner', 'undead', 'magicres'], summonKey: 'wraith', summonN: 2, summonCd: 6, resist: { arcane: .5 } },
  { key: 'juggernaut', name: '철갑 거인', tier: 3, art: { b: 'big', h: 'helm' }, color: '#7f8fa6', hp: 42, spd: .5, armor: 90, bounty: 5.0, flags: ['armored'], scale: 1.55, resist: { phys: .45 } },
  { key: 'phantom', name: '유령 암살자', tier: 3, art: { b: 'ghost', h: 'mask' }, color: '#c6b3ff', hp: 12, spd: 1.6, armor: 5, bounty: 3.6, flags: ['ghost', 'teleport', 'fast'], resist: { phys: .6 } },
  { key: 'hydra', name: '히드라', tier: 3, art: { b: 'beast', h: 'triple' }, color: '#3fbf8f', hp: 30, spd: .85, armor: 26, bounty: 4.6, flags: ['regen', 'split'], regen: .03, splitInto: 'wolf', splitN: 2, scale: 1.35 },
  { key: 'seraph_e', name: '타락 천사', tier: 3, art: { b: 'wing', h: 'halo' }, color: '#ffe9a8', hp: 24, spd: 1.25, armor: 20, bounty: 4.4, flags: ['flying', 'healer'], healAmt: .035, healRadius: 3.4, resist: { holy: .8 } },
  { key: 'mech', name: '전투 기계', tier: 3, art: { b: 'construct', h: 'goggle' }, color: '#b0b8c4', hp: 34, spd: .95, armor: 60, bounty: 4.8, flags: ['armored', 'shield'], shield: 2.0, resist: { poison: .9, thunder: -.4 } },

  /* --- 극후반 --- */
  { key: 'voidling', name: '공허 파편', tier: 4, art: { b: 'crystal', h: 'eye' }, color: '#a78bff', hp: 55, spd: 1.2, armor: 40, bounty: 6.0, flags: ['ghost', 'teleport'], resist: { arcane: .6, void: -.5 } },
  { key: 'behemoth', name: '베히모스', tier: 4, art: { b: 'big', h: 'horn' }, color: '#c2683f', hp: 130, spd: .55, armor: 140, bounty: 8.0, flags: ['armored', 'rage'], rageSpd: 1.6, scale: 1.7, resist: { phys: .5 } },
  { key: 'revenant', name: '리븐넌트', tier: 4, art: { b: 'skeleton', h: 'crown' }, color: '#e8e0ff', hp: 80, spd: 1.15, armor: 55, bounty: 7.0, flags: ['undead', 'regen', 'summoner'], regen: .05, summonKey: 'skeleton', summonN: 3, summonCd: 4 },
  { key: 'archdemon', name: '대악마', tier: 4, art: { b: 'demon', h: 'crown' }, color: '#ff3f5f', hp: 110, spd: .95, armor: 80, bounty: 8.5, flags: ['rage'], rageSpd: 1.5, resist: { fire: .85, holy: -.4 }, scale: 1.4 },
  { key: 'stormdrake', name: '폭풍 비룡', tier: 4, art: { b: 'dragon', h: 'horn' }, color: '#7fd0ff', hp: 95, spd: 1.35, armor: 65, bounty: 8.0, flags: ['flying', 'fast'], resist: { thunder: .9 }, scale: 1.35 },
  { key: 'nullwalker', name: '무의 보행자', tier: 4, art: { b: 'ghost', h: 'orb' }, color: '#cfd8ff', hp: 150, spd: .9, armor: 100, bounty: 9.5, flags: ['ghost', 'shield', 'magicres'], shield: 4.0, resist: { arcane: .7, phys: .5 } },
  { key: 'titan', name: '고대 타이탄', tier: 4, art: { b: 'construct', h: 'crown' }, color: '#d8c48a', hp: 260, spd: .48, armor: 220, bounty: 12, flags: ['armored', 'shield'], shield: 3.0, scale: 1.8, resist: { phys: .55, poison: .9 } },
  { key: 'swarmer', name: '공허 군체', tier: 4, art: { b: 'insect', h: 'eye' }, color: '#b06bff', hp: 40, spd: 1.55, armor: 30, bounty: 5.5, flags: ['fast', 'split'], splitInto: 'voidling', splitN: 2 },

  /* --- 보스 --- */
  { key: 'B_goblinking', name: '고블린 왕', tier: 9, boss: true, art: { b: 'big', h: 'crown' }, color: '#7fbf3f', hp: 34, spd: .58, armor: 14, bounty: 22, flags: ['boss', 'summoner', 'armored'], summonKey: 'goblin', summonN: 4, summonCd: 4.5, scale: 2.0 },
  { key: 'B_bonecolossus', name: '뼈의 거신', tier: 9, boss: true, art: { b: 'skeleton', h: 'skull' }, color: '#f0ead4', hp: 90, spd: .5, armor: 45, bounty: 34, flags: ['boss', 'undead', 'armored', 'regen'], regen: .02, summonKey: 'skeleton', summonN: 4, summonCd: 5, scale: 2.2 },
  { key: 'B_frostmonarch', name: '서리 군주', tier: 9, boss: true, art: { b: 'big', h: 'crown' }, color: '#8fe0ff', hp: 200, spd: .55, armor: 70, bounty: 46, flags: ['boss', 'armored', 'shield'], shield: 3, resist: { ice: .95 }, scale: 2.2 },
  { key: 'B_infernus', name: '인페르누스', tier: 9, boss: true, art: { b: 'demon', h: 'horn' }, color: '#ff5a2a', hp: 420, spd: .62, armor: 95, bounty: 60, flags: ['boss', 'rage'], rageSpd: 1.8, resist: { fire: .95 }, summonKey: 'imp', summonN: 4, summonCd: 4, scale: 2.3 },
  { key: 'B_theironhorn', name: '강철 뿔', tier: 9, boss: true, art: { b: 'construct', h: 'horn' }, color: '#9fb0c4', hp: 900, spd: .5, armor: 260, bounty: 80, flags: ['boss', 'armored', 'shield'], shield: 5, resist: { phys: .6, poison: .95 }, scale: 2.4 },
  { key: 'B_dreadlich', name: '공포의 리치', tier: 9, boss: true, art: { b: 'robe', h: 'crown' }, color: '#a37fff', hp: 1600, spd: .6, armor: 200, bounty: 110, flags: ['boss', 'undead', 'summoner', 'magicres', 'teleport'], summonKey: 'wraith', summonN: 5, summonCd: 3.5, resist: { arcane: .7, dark: .9 }, scale: 2.3 },
  { key: 'B_worldeater', name: '세계를 먹는 자', tier: 9, boss: true, art: { b: 'dragon', h: 'crown' }, color: '#ff3f7f', hp: 3400, spd: .55, armor: 380, bounty: 160, flags: ['boss', 'flying', 'rage', 'shield'], shield: 6, rageSpd: 1.7, resist: { fire: .8, phys: .5 }, scale: 2.8 },
  { key: 'B_voidsovereign', name: '공허의 주권자', tier: 9, boss: true, art: { b: 'ghost', h: 'crown' }, color: '#c0a8ff', hp: 7000, spd: .6, armor: 520, bounty: 230, flags: ['boss', 'ghost', 'teleport', 'shield', 'magicres'], shield: 8, resist: { arcane: .8, phys: .6, holy: .5 }, scale: 2.8 },
  { key: 'B_omegatyrant', name: 'OMEGA 폭군', tier: 9, boss: true, art: { b: 'construct', h: 'crown' }, color: '#ffd24d', hp: 16000, spd: .55, armor: 900, bounty: 340, flags: ['boss', 'armored', 'shield', 'rage', 'summoner'], shield: 10, rageSpd: 1.5, summonKey: 'mech', summonN: 3, summonCd: 4, resist: { phys: .6, poison: .95, ice: .5 }, scale: 3.0 },
  { key: 'B_finality', name: '종언', tier: 9, boss: true, art: { b: 'dragon', h: 'orb' }, color: '#ff2fd0', hp: 42000, spd: .6, armor: 1500, bounty: 600, flags: ['boss', 'flying', 'ghost', 'shield', 'rage', 'magicres', 'teleport'], shield: 14, rageSpd: 1.6, resist: { phys: .6, fire: .6, ice: .6, arcane: .6, holy: .4, dark: .4 }, scale: 3.2 },
];
const ENEMY_MAP = {}; ENEMIES.forEach(e => ENEMY_MAP[e.key] = e);
const BOSS_ORDER = ENEMIES.filter(e => e.boss).map(e => e.key);

/* 웨이브 별 등장 가능 풀 */
const SPAWN_TABLE = [
  { from: 1, keys: ['slime', 'goblin', 'rat'] },
  { from: 3, keys: ['bat', 'skeleton'] },
  { from: 6, keys: ['orc', 'wolf'] },
  { from: 9, keys: ['zombie', 'spider', 'imp'] },
  { from: 12, keys: ['shielder', 'mage_e'] },
  { from: 15, keys: ['ogre', 'wraith'] },
  { from: 18, keys: ['golem', 'harpy'] },
  { from: 21, keys: ['necro', 'brute'] },
  { from: 24, keys: ['crystal', 'blob'] },
  { from: 28, keys: ['knight_e', 'demon'] },
  { from: 32, keys: ['lich', 'phantom'] },
  { from: 36, keys: ['juggernaut', 'hydra'] },
  { from: 40, keys: ['seraph_e', 'mech'] },
  { from: 45, keys: ['voidling', 'swarmer'] },
  { from: 50, keys: ['behemoth', 'revenant'] },
  { from: 56, keys: ['archdemon', 'stormdrake'] },
  { from: 62, keys: ['nullwalker'] },
  { from: 70, keys: ['titan'] },
];

/* =========================================================================
 *  맵 — 타일 그리드 좌표(웨이포인트). GRID_W x GRID_H 기준.
 * ========================================================================= */
const GRID_W = 18, GRID_H = 11;
const MAPS = [
  {
    key: 'meadow', name: '초원의 길', diff: 1.0, bg: '#243a1c', bg2: '#1a2b14', road: '#5b4a2c', accent: '#7fbf4a',
    desc: '완만한 S자 경로. 입문에 알맞다.',
    path: [[-1, 2], [4, 2], [4, 5], [9, 5], [9, 2], [13, 2], [13, 8], [3, 8], [3, 10], [18, 10]]
  },
  {
    key: 'canyon', name: '메마른 협곡', diff: 1.25, bg: '#3a2418', bg2: '#2a1a11', road: '#7a5a34', accent: '#e0913f',
    desc: '길이 길어 사거리가 빛난다.',
    path: [[-1, 9], [2, 9], [2, 1], [6, 1], [6, 8], [10, 8], [10, 1], [14, 1], [14, 9], [18, 9]]
  },
  {
    key: 'frost', name: '얼어붙은 성채', diff: 1.5, bg: '#1c2c40', bg2: '#14202e', road: '#7d90a8', accent: '#8fd8ff',
    desc: '적이 빠르다. 둔화가 필수.',
    path: [[-1, 5], [3, 5], [3, 2], [8, 2], [8, 9], [12, 9], [12, 4], [15, 4], [15, 8], [18, 8]]
  },
  {
    key: 'abyss', name: '심연의 균열', diff: 1.9, bg: '#241832', bg2: '#180f24', road: '#5a3f7a', accent: '#c07fff',
    desc: '짧은 경로. 순간 화력이 전부다.',
    path: [[-1, 1], [5, 1], [5, 6], [1, 6], [1, 10], [11, 10], [11, 3], [16, 3], [16, 10], [18, 10]]
  },
  {
    key: 'inferno', name: '종말의 화산', diff: 2.4, bg: '#3a1414', bg2: '#280d0d', road: '#8a3a24', accent: '#ff6a3a',
    desc: '최고 난이도. 살아남아라.',
    path: [[-1, 6], [3, 6], [3, 2], [7, 2], [7, 9], [11, 9], [11, 1], [15, 1], [15, 6], [18, 6]]
  },
];

/* =========================================================================
 *  액티브 스킬
 * ========================================================================= */
const SKILLS = [
  {
    key: 'meteor', name: '메테오', icon: '☄', cd: 26, mana: 40, color: '#ff6b35',
    desc: '지정 지역에 운석 낙하. 거대한 화염 폭발 + 화상.', type: 'target', radius: 3.2
  },
  {
    key: 'blizzard', name: '절대 빙결', icon: '❄', cd: 30, mana: 45, color: '#5bc8ff',
    desc: '화면의 모든 적을 4초간 빙결시킨다.', type: 'global'
  },
  {
    key: 'thunderstorm', name: '뇌우', icon: '⚡', cd: 24, mana: 38, color: '#ffe14d',
    desc: '무작위 적 25명에게 연쇄 벼락.', type: 'global'
  },
  {
    key: 'goldrush', name: '골드 러시', icon: '💰', cd: 40, mana: 30, color: '#ffcf3f',
    desc: '12초간 처치 골드 3배 & 즉시 골드 획득.', type: 'buff'
  },
  {
    key: 'overdrive', name: '오버드라이브', icon: '🔥', cd: 45, mana: 55, color: '#ff4f7e',
    desc: '10초간 모든 유닛 공격속도 +120%, 피해 +60%.', type: 'buff'
  },
  {
    key: 'annihilate', name: '섬멸', icon: '💥', cd: 75, mana: 90, color: '#ff2fd0',
    desc: '모든 적에게 현재 체력의 35% + 고정 대미지.', type: 'global'
  },
  {
    key: 'timewarp', name: '시간 왜곡', icon: '🕒', cd: 50, mana: 50, color: '#8f7bff',
    desc: '8초간 적 이동속도 -70%.', type: 'global'
  },
  {
    key: 'sanctuary', name: '성역', icon: '✚', cd: 60, mana: 45, color: '#fff2b0',
    desc: '생명 3 회복 & 8초간 무적 방벽.', type: 'buff'
  },
];

/* =========================================================================
 *  연구(영구 강화) — 코스트는 레벨에 따라 증가
 * ========================================================================= */
const RESEARCH = [
  { key: 'atk', name: '무기 연마', icon: '⚔', max: 50, base: 120, growth: 1.22, per: .06, desc: '모든 유닛 피해 +6%/레벨' },
  { key: 'spd', name: '전술 훈련', icon: '⏱', max: 40, base: 150, growth: 1.24, per: .04, desc: '공격 속도 +4%/레벨' },
  { key: 'rng', name: '망원 조준', icon: '🎯', max: 25, base: 180, growth: 1.26, per: .04, desc: '사거리 +4%/레벨' },
  { key: 'crit', name: '급소 연구', icon: '✹', max: 30, base: 200, growth: 1.25, per: .02, desc: '치명타 확률 +2%/레벨' },
  { key: 'critdmg', name: '치명 강화', icon: '💢', max: 30, base: 220, growth: 1.25, per: .12, desc: '치명타 피해 +12%/레벨' },
  { key: 'gold', name: '전리품 감정', icon: '💰', max: 40, base: 160, growth: 1.23, per: .07, desc: '골드 획득 +7%/레벨' },
  { key: 'luck', name: '행운의 부적', icon: '🍀', max: 30, base: 260, growth: 1.30, per: .05, desc: '고등급 소환 확률 +5%/레벨' },
  { key: 'mana', name: '마나 순환', icon: '🔷', max: 25, base: 190, growth: 1.25, per: .09, desc: '마나 회복 +9%/레벨' },
  { key: 'pen', name: '방어 파쇄', icon: '🪓', max: 25, base: 230, growth: 1.27, per: .03, desc: '방어 관통 +3%p/레벨' },
  { key: 'splash', name: '폭발 공학', icon: '💥', max: 20, base: 240, growth: 1.28, per: .05, desc: '범위 반경 +5%/레벨' },
  { key: 'dot', name: '고통 증폭', icon: '☣', max: 25, base: 210, growth: 1.26, per: .10, desc: '화상/독 피해 +10%/레벨' },
  { key: 'slot', name: '진지 확장', icon: '⬛', max: 12, base: 500, growth: 1.45, per: 1, desc: '배치 가능 유닛 +1/레벨' },
  { key: 'hp', name: '성벽 보강', icon: '🏰', max: 20, base: 300, growth: 1.32, per: 2, desc: '최대 생명 +2/레벨' },
  { key: 'interest', name: '이자 운용', icon: '🏦', max: 15, base: 400, growth: 1.35, per: .01, desc: '웨이브 종료 시 이자 +1%/레벨' },
  { key: 'summoncost', name: '소환 효율', icon: '♻', max: 20, base: 280, growth: 1.30, per: .02, desc: '소환 비용 -2%/레벨' },
  { key: 'boss', name: '거인 사냥', icon: '👑', max: 20, base: 320, growth: 1.30, per: .06, desc: '보스 피해 +6%/레벨' },
];

/* =========================================================================
 *  시너지 (같은 클래스/원소 보유 수)
 * ========================================================================= */
const SYNERGY = {
  class: {
    archer: [{ n: 3, dmg: .12 }, { n: 5, dmg: .28 }, { n: 8, dmg: .55, spd: .2 }],
    mage: [{ n: 3, splash: .15 }, { n: 5, splash: .35, dmg: .2 }, { n: 8, splash: .6, dmg: .45 }],
    artillery: [{ n: 2, dmg: .18 }, { n: 4, dmg: .4 }, { n: 6, dmg: .8, splash: .3 }],
    support: [{ n: 2, aura: .3 }, { n: 4, aura: .8 }, { n: 6, aura: 1.4 }],
    assassin: [{ n: 2, crit: .1 }, { n: 4, crit: .22, critdmg: .5 }, { n: 6, crit: .35, critdmg: 1.1 }],
    guardian: [{ n: 2, pen: .15 }, { n: 4, pen: .35 }, { n: 6, pen: .6, dmg: .3 }],
    sniper: [{ n: 2, rng: .2, dmg: .2 }, { n: 3, rng: .4, dmg: .5 }],
    summoner: [{ n: 2, summon: .3 }, { n: 4, summon: .8 }],
  },
  elem: {
    fire: [{ n: 3, dot: .4 }, { n: 6, dot: 1.0, dmg: .2 }],
    ice: [{ n: 3, slow: .15 }, { n: 6, slow: .35, freeze: .08 }],
    thunder: [{ n: 3, chain: 1 }, { n: 6, chain: 3, stun: .06 }],
    poison: [{ n: 3, dot: .5 }, { n: 6, dot: 1.2 }],
    holy: [{ n: 3, dmg: .18 }, { n: 6, dmg: .45 }],
    dark: [{ n: 3, curse: .12 }, { n: 6, curse: .3 }],
    nature: [{ n: 3, gold: .15 }, { n: 6, gold: .4 }],
    arcane: [{ n: 3, dmg: .2 }, { n: 6, dmg: .5 }],
    void: [{ n: 2, dmg: .35 }, { n: 3, dmg: .9 }],
    phys: [{ n: 3, pen: .1 }, { n: 6, pen: .25, dmg: .2 }],
  }
};

/* =========================================================================
 *  업적
 * ========================================================================= */
const ACHIEVEMENTS = [
  { key: 'firstblood', name: '첫 사냥', desc: '적 1마리 처치', icon: '🩸', check: s => s.kills >= 1, gem: 1 },
  { key: 'kill100', name: '학살자', desc: '적 100마리 처치', icon: '💀', check: s => s.kills >= 100, gem: 2 },
  { key: 'kill1000', name: '전장의 지배자', desc: '적 1,000마리 처치', icon: '☠', check: s => s.kills >= 1000, gem: 5 },
  { key: 'kill10000', name: '종말의 사신', desc: '적 10,000마리 처치', icon: '👁', check: s => s.kills >= 10000, gem: 20 },
  { key: 'wave10', name: '견습 지휘관', desc: '웨이브 10 도달', icon: '🎖', check: s => s.maxWave >= 10, gem: 2 },
  { key: 'wave25', name: '베테랑', desc: '웨이브 25 도달', icon: '🏅', check: s => s.maxWave >= 25, gem: 4 },
  { key: 'wave50', name: '불굴', desc: '웨이브 50 도달', icon: '🛡', check: s => s.maxWave >= 50, gem: 10 },
  { key: 'wave100', name: '무한의 끝', desc: '웨이브 100 도달', icon: '♾', check: s => s.maxWave >= 100, gem: 50 },
  { key: 'boss1', name: '보스 슬레이어', desc: '보스 1회 처치', icon: '👑', check: s => s.bossKills >= 1, gem: 3 },
  { key: 'boss10', name: '왕관 수집가', desc: '보스 10회 처치', icon: '💎', check: s => s.bossKills >= 10, gem: 12 },
  { key: 'legend', name: '전설의 시작', desc: '전설 유닛 획득', icon: '🌟', check: s => s.bestRarity >= 4, gem: 5 },
  { key: 'mythicOwn', name: '신화의 목격자', desc: '신화 유닛 획득', icon: '🔥', check: s => s.bestRarity >= 5, gem: 15 },
  { key: 'ultimate', name: '초월자', desc: '초월 유닛 획득', icon: '✨', check: s => s.bestRarity >= 6, gem: 40 },
  { key: 'merge50', name: '합성 장인', desc: '50회 합성', icon: '🔨', check: s => s.merges >= 50, gem: 4 },
  { key: 'merge300', name: '연금의 대가', desc: '300회 합성', icon: '⚗', check: s => s.merges >= 300, gem: 14 },
  { key: 'gold100k', name: '부자', desc: '누적 골드 100,000', icon: '💰', check: s => s.totalGold >= 100000, gem: 6 },
  { key: 'gold10m', name: '대부호', desc: '누적 골드 10,000,000', icon: '🏦', check: s => s.totalGold >= 10000000, gem: 25 },
  { key: 'combo50', name: '콤보 마스터', desc: '50 콤보 달성', icon: '🎯', check: s => s.maxCombo >= 50, gem: 5 },
  { key: 'combo200', name: '광란의 연쇄', desc: '200 콤보 달성', icon: '🌀', check: s => s.maxCombo >= 200, gem: 18 },
  { key: 'noleak', name: '완벽한 방어', desc: '생명 손실 없이 웨이브 20 도달', icon: '🛡', check: s => s.maxWave >= 20 && s.leaks === 0, gem: 12 },
  { key: 'dmg1b', name: '10억의 파괴', desc: '누적 피해 1,000,000,000', icon: '💥', check: s => s.totalDmg >= 1e9, gem: 20 },
  { key: 'allmaps', name: '개척자', desc: '모든 맵 해금', icon: '🗺', check: s => s.mapsUnlocked >= MAPS.length, gem: 10 },
  { key: 'skill100', name: '전략가', desc: '스킬 100회 사용', icon: '🎆', check: s => s.skillUses >= 100, gem: 8 },
  { key: 'army30', name: '대군', desc: '동시에 유닛 30기 배치', icon: '⚔', check: s => s.maxUnits >= 30, gem: 8 },
];

/* ------------------------------------------------------------- 팁 */
const TIPS = [
  '같은 유닛 3기를 모으면 합성해서 성급을 올릴 수 있다.',
  '3성 유닛 3기를 합성하면 다음 등급의 새 유닛으로 승급한다!',
  '지원 유닛의 오라 범위 안에 딜러를 배치하자.',
  '같은 클래스를 여러 개 모으면 시너지 보너스가 붙는다.',
  '보스는 기절에 저항한다. 둔화와 저주로 대응하자.',
  '비전/공허 속성은 방어력을 무시한다. 중장갑 적에게 최고.',
  '골렘·타이탄은 물리 저항이 높다. 마법으로 녹이자.',
  '연쇄 번개는 뭉친 적 무리에 최고의 효율을 낸다.',
  '웨이브 사이에 이자가 붙는다. 골드를 조금 남겨보자.',
  '콤보를 유지하면 골드 배율이 폭발적으로 오른다.',
  '판매하면 투자한 골드의 일부를 돌려받는다.',
  '연구는 이번 판에만 적용된다. 영구 강화는 젬으로 사는 명예 강화다.',
  '보스를 잡을수록 젬이 쌓인다. 업적을 노려라.',
  '맵을 100웨이브까지 클리어하면 다음 전장이 열린다.',
];

window.ELEM = ELEM; window.RARITY = RARITY; window.RARITY_IDX = RARITY_IDX; window.CLASSES = CLASSES;
window.UNITS = UNITS; window.UNIT_MAP = UNIT_MAP; window.UNITS_BY_RARITY = UNITS_BY_RARITY;
window.ENEMIES = ENEMIES; window.ENEMY_MAP = ENEMY_MAP; window.BOSS_ORDER = BOSS_ORDER; window.SPAWN_TABLE = SPAWN_TABLE;
window.MAPS = MAPS; window.GRID_W = GRID_W; window.GRID_H = GRID_H;
window.SKILLS = SKILLS; window.RESEARCH = RESEARCH; window.SYNERGY = SYNERGY; window.ACHIEVEMENTS = ACHIEVEMENTS; window.TIPS = TIPS;
