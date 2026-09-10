/* =========================================================================
 *  INFINITE TOWER DEFENSE  —  data.js
 * -------------------------------------------------------------------------
 *  원소 14 / 클래스 11 / 등급 8 / 유닛 96 / 적 110(보스 20) / 맵 10
 *  스킬 14 / 연구 24 / 시너지 / 업적 40 / 프로필 커스터마이즈 / 상점 / 퀘스트
 * ========================================================================= */
'use strict';

/* =========================================================================
 *  원소
 * ========================================================================= */
const ELEM = {
  phys: { name: '물리', color: '#e8e4d8', icon: '⚔', desc: '방어력 영향이 크지만 안정적이다' },
  fire: { name: '화염', color: '#ff6b35', icon: '🔥', desc: '화상 : 시간당 지속 피해' },
  ice: { name: '냉기', color: '#5bc8ff', icon: '❄', desc: '둔화 & 빙결' },
  thunder: { name: '뇌전', color: '#ffe14d', icon: '⚡', desc: '연쇄 번개 & 감전 기절' },
  poison: { name: '맹독', color: '#7bdd52', icon: '☠', desc: '중첩되는 방어 무시 독' },
  holy: { name: '신성', color: '#fff2b0', icon: '✦', desc: '언데드/암흑 특효 & 아군 강화' },
  dark: { name: '암흑', color: '#b57bff', icon: '🌑', desc: '저주 : 받는 피해 증가' },
  nature: { name: '자연', color: '#3fd68c', icon: '🌿', desc: '속박 & 추가 골드' },
  arcane: { name: '비전', color: '#ff5bd0', icon: '✧', desc: '방어 무시 고정 피해' },
  void: { name: '공허', color: '#8f7bff', icon: '◈', desc: '보호막 파괴 & 즉살' },
  wind: { name: '질풍', color: '#9ff5e0', icon: '🌪', desc: '공격 속도 & 다중 사격' },
  earth: { name: '대지', color: '#d2a15e', icon: '⛰', desc: '방어 관통 & 광역 진동' },
  blood: { name: '혈기', color: '#ff3d5e', icon: '🩸', desc: '처형 & 출혈 중첩' },
  time: { name: '시간', color: '#a8b8ff', icon: '⏳', desc: '적 둔화 & 아군 가속' },
};

/* =========================================================================
 *  등급 (8단계)
 * ========================================================================= */
const RARITY = [
  { key: 'common', name: '일반', color: '#b9c4cf', glow: '#dfe8f0', mul: 1.00, w: 3800, sell: 40, aura: null, auraN: 0 },
  { key: 'uncommon', name: '고급', color: '#63d471', glow: '#a8f5b2', mul: 1.85, w: 2500, sell: 90, aura: null, auraN: 0 },
  { key: 'rare', name: '희귀', color: '#4ea8ff', glow: '#9fd2ff', mul: 3.45, w: 1500, sell: 200, aura: 'runes', auraN: 3 },
  { key: 'epic', name: '영웅', color: '#b46bff', glow: '#dcb4ff', mul: 6.4, w: 720, sell: 460, aura: 'runes', auraN: 4 },
  { key: 'legendary', name: '전설', color: '#ffb300', glow: '#ffe08a', mul: 12.2, w: 260, sell: 1100, aura: 'runes', auraN: 6 },
  { key: 'mythic', name: '신화', color: '#ff4f7e', glow: '#ffb6c8', mul: 24.0, w: 78, sell: 2800, aura: 'flame', auraN: 8 },
  { key: 'ultimate', name: '초월', color: '#6ffff0', glow: '#c9fffa', mul: 48.0, w: 14, sell: 7200, aura: 'divine', auraN: 12 },
  { key: 'primordial', name: '태초', color: '#ff2fd0', glow: '#ffb0f0', mul: 96.0, w: 2, sell: 20000, aura: 'void', auraN: 14 },
];
const RARITY_IDX = {}; RARITY.forEach((r, i) => RARITY_IDX[r.key] = i);

/* =========================================================================
 *  클래스
 * ========================================================================= */
const CLASSES = {
  archer: { name: '궁수', icon: '🏹', desc: '단일 표적 고속 사격' },
  mage: { name: '마법사', icon: '🔮', desc: '광역 마법 피해' },
  artillery: { name: '포격', icon: '💣', desc: '느리지만 강력한 범위 폭발' },
  support: { name: '지원', icon: '✚', desc: '주변 아군 강화 오라' },
  assassin: { name: '암살자', icon: '🗡', desc: '치명타 & 처형' },
  guardian: { name: '수호', icon: '🛡', desc: '근거리 고화력 & 방어 관통' },
  sniper: { name: '저격', icon: '🎯', desc: '초장거리 관통 사격' },
  summoner: { name: '소환사', icon: '👁', desc: '분신/정령 소환' },
  bard: { name: '음유시인', icon: '🎵', desc: '광범위 공속 & 골드 오라' },
  engineer: { name: '기술자', icon: '⚙', desc: '드론 & 기계 화력' },
  warlock: { name: '흑마법사', icon: '🕯', desc: '저주 & 지속 피해 특화' },
};

/* =========================================================================
 *  유닛 96종
 *  look : legs / torso / head / hair / gear / weapon / wings / skin / hairCol
 * ========================================================================= */
const UNITS = [
  /* ---------------------------------------------------------- 일반 12 */
  {
    key: 'archer', name: '견습 궁수', rarity: 'common', cls: 'archer', elem: 'phys', dmg: 13, spd: 1.35, rng: 3.6, proj: 'arrow',
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'none', weapon: 'bow', skin: '#f0c9a0', hairCol: '#6b4a2a' },
    desc: '평범하지만 믿음직한 첫 걸음.'
  },
  {
    key: 'spear', name: '신병 창병', rarity: 'common', cls: 'guardian', elem: 'phys', dmg: 20, spd: 1.0, rng: 2.0, proj: 'none', pen: .25,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'none', gear: 'helm', weapon: 'spear', skin: '#e8bf95' },
    desc: '방어력 25% 관통.'
  },
  {
    key: 'sling', name: '돌팔매꾼', rarity: 'common', cls: 'artillery', elem: 'earth', dmg: 22, spd: .78, rng: 3.2, proj: 'bomb', splash: .8,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'spiky', gear: 'none', weapon: 'sling', skin: '#d9a978', hairCol: '#3a2a1a' },
    desc: '작은 범위 폭발.'
  },
  {
    key: 'apprentice', name: '견습 마법사', rarity: 'common', cls: 'mage', elem: 'arcane', dmg: 16, spd: 1.0, rng: 3.4, proj: 'ball', splash: .7,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'wizardHat', weapon: 'wand', skin: '#f2d0ad', hairCol: '#8a5a3a' },
    desc: '방어 무시 비전 탄.'
  },
  {
    key: 'torch', name: '화톳불 지기', rarity: 'common', cls: 'mage', elem: 'fire', dmg: 11, spd: 1.5, rng: 2.8, proj: 'ball', burn: { dps: .45, dur: 3 },
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'none', weapon: 'torch', skin: '#e8bf95', hairCol: '#c04a2a' },
    desc: '화상을 남긴다.'
  },
  {
    key: 'sapling', name: '나무 정령', rarity: 'common', cls: 'support', elem: 'nature', dmg: 9, spd: .9, rng: 2.6, proj: 'ball',
    aura: { type: 'gold', amt: .08, radius: 3 },
    look: { legs: 'float', torso: 'spectral', head: 'orb', hair: 'none', gear: 'laurel', weapon: 'none', skin: '#7fe0a0' },
    desc: '주변 처치 골드 +8%.'
  },
  {
    key: 'militia', name: '민병대원', rarity: 'common', cls: 'guardian', elem: 'phys', dmg: 17, spd: 1.15, rng: 1.9, proj: 'none',
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'none', weapon: 'sword', skin: '#f0c9a0', hairCol: '#4a3524' },
    desc: '숫자가 곧 힘이다.'
  },
  {
    key: 'scout', name: '척후병', rarity: 'common', cls: 'archer', elem: 'wind', dmg: 10, spd: 1.9, rng: 3.4, proj: 'arrow',
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'pony', gear: 'none', weapon: 'bow', skin: '#e8bf95', hairCol: '#c8a05a' },
    desc: '빠른 연사.'
  },
  {
    key: 'acolyte', name: '수련 사제', rarity: 'common', cls: 'support', elem: 'holy', dmg: 10, spd: 1.0, rng: 3.0, proj: 'orb',
    aura: { type: 'dmg', amt: .07, radius: 2.6 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'none', weapon: 'orb', skin: '#f6dcbe', hairCol: '#e8d9a0' },
    desc: '주변 공격력 +7%.'
  },
  {
    key: 'ratcatcher', name: '쥐잡이', rarity: 'common', cls: 'assassin', elem: 'poison', dmg: 12, spd: 1.6, rng: 2.2, proj: 'none',
    poison: { dps: .3, dur: 3, stack: 3 },
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'mask', weapon: 'dagger', skin: '#d9a978', hairCol: '#2a2018' },
    desc: '녹슨 칼날의 독.'
  },
  {
    key: 'digger', name: '광부', rarity: 'common', cls: 'guardian', elem: 'earth', dmg: 24, spd: .85, rng: 1.8, proj: 'none', pen: .35,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'none', gear: 'helm', weapon: 'axe', skin: '#c99a6a' },
    desc: '단단한 것을 부순다.'
  },
  {
    key: 'busker', name: '거리 악사', rarity: 'common', cls: 'bard', elem: 'wind', dmg: 8, spd: 1.2, rng: 3.0, proj: 'wave',
    aura: { type: 'spd', amt: .08, radius: 2.8 },
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'long', gear: 'none', weapon: 'harp', skin: '#f0c9a0', hairCol: '#7a4a2a' },
    desc: '주변 공격속도 +8%.'
  },

  /* ---------------------------------------------------------- 고급 14 */
  {
    key: 'crossbow', name: '석궁병', rarity: 'uncommon', cls: 'archer', elem: 'phys', dmg: 26, spd: 1.5, rng: 4.0, proj: 'bolt', pierce: 1,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'none', gear: 'helm', weapon: 'crossbow', skin: '#e8bf95' },
    desc: '적 1명 관통.'
  },
  {
    key: 'frostboy', name: '얼음 견습생', rarity: 'uncommon', cls: 'mage', elem: 'ice', dmg: 18, spd: 1.1, rng: 3.5, proj: 'shard', splash: .8,
    slow: { amt: .28, dur: 2 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'hood', weapon: 'staff', skin: '#eddcc8', hairCol: '#8fd8ff' },
    desc: '이동속도 28% 둔화.'
  },
  {
    key: 'bomber', name: '폭탄병', rarity: 'uncommon', cls: 'artillery', elem: 'fire', dmg: 46, spd: .62, rng: 3.4, proj: 'bomb', splash: 1.35,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'none', gear: 'mask', weapon: 'launcher', skin: '#d9a978' },
    desc: '넓은 폭발.'
  },
  {
    key: 'wolfmaster', name: '늑대 조련사', rarity: 'uncommon', cls: 'summoner', elem: 'nature', dmg: 15, spd: 1.2, rng: 3.0, proj: 'none',
    summon: { count: 1, dmg: .55, spd: 1.4 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'antlers', weapon: 'claw', skin: '#e0b088', hairCol: '#5a3a20' },
    desc: '늑대 1마리를 항상 곁에 둔다.'
  },
  {
    key: 'priest', name: '수도 사제', rarity: 'uncommon', cls: 'support', elem: 'holy', dmg: 14, spd: 1.0, rng: 3.2, proj: 'orb',
    aura: { type: 'dmg', amt: .12, radius: 2.8 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'halo', weapon: 'orb', skin: '#f6dcbe', hairCol: '#d8c48a' },
    desc: '주변 아군 공격력 +12%.'
  },
  {
    key: 'blowdart', name: '독침 사수', rarity: 'uncommon', cls: 'archer', elem: 'poison', dmg: 12, spd: 1.9, rng: 3.6, proj: 'dart',
    poison: { dps: .5, dur: 4, stack: 5 },
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'none', gear: 'mask', weapon: 'dart', skin: '#c99a6a' },
    desc: '독을 5중첩까지 쌓는다.'
  },
  {
    key: 'sparker', name: '번개 도제', rarity: 'uncommon', cls: 'mage', elem: 'thunder', dmg: 20, spd: 1.15, rng: 3.3, proj: 'chain', chain: 2,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'none', weapon: 'wand', skin: '#f0c9a0', hairCol: '#ffe14d' },
    desc: '번개가 2회 튄다.'
  },
  {
    key: 'duelist', name: '결투가', rarity: 'uncommon', cls: 'assassin', elem: 'phys', dmg: 22, spd: 1.85, rng: 2.2, proj: 'none',
    crit: .16, critMul: 2.1,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'sword', skin: '#f0c9a0', hairCol: '#2a2028' },
    desc: '치명타 16%.'
  },
  {
    key: 'sandmage', name: '모래 술사', rarity: 'uncommon', cls: 'mage', elem: 'earth', dmg: 24, spd: 1.0, rng: 3.4, proj: 'ball', splash: 1.1,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'none', gear: 'hood', weapon: 'staff', skin: '#c99a6a' },
    desc: '모래 폭풍이 퍼진다.'
  },
  {
    key: 'tinker', name: '땜장이', rarity: 'uncommon', cls: 'engineer', elem: 'phys', dmg: 18, spd: 1.4, rng: 3.4, proj: 'bullet',
    summon: { count: 1, dmg: .4, spd: 1.8 },
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'visor', weapon: 'drone', skin: '#e8bf95', hairCol: '#8a6a3a' },
    desc: '정찰 드론 1기 운용.'
  },
  {
    key: 'graverobber', name: '도굴꾼', rarity: 'uncommon', cls: 'warlock', elem: 'dark', dmg: 21, spd: 1.1, rng: 3.2, proj: 'ball',
    curse: { amt: .1, dur: 3 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'short', gear: 'hood', weapon: 'tome', skin: '#c8a888', hairCol: '#2a2028' },
    desc: '저주 : 받는 피해 +10%.'
  },
  {
    key: 'windblade', name: '질풍검사', rarity: 'uncommon', cls: 'assassin', elem: 'wind', dmg: 16, spd: 2.3, rng: 2.4, proj: 'none',
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'none', weapon: 'dagger', skin: '#f0c9a0', hairCol: '#9ff5e0' },
    desc: '베어내는 속도가 눈에 보이지 않는다.'
  },
  {
    key: 'lamplighter', name: '등불지기', rarity: 'uncommon', cls: 'support', elem: 'fire', dmg: 16, spd: 1.1, rng: 3.0, proj: 'ball',
    burn: { dps: .5, dur: 3 }, aura: { type: 'rng', amt: .12, radius: 3.0 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'none', weapon: 'torch', skin: '#f0c9a0', hairCol: '#c8a05a' },
    desc: '주변 사거리 +12%.'
  },
  {
    key: 'hourglass', name: '모래시계 학도', rarity: 'uncommon', cls: 'support', elem: 'time', dmg: 15, spd: 1.0, rng: 3.2, proj: 'orb',
    slow: { amt: .2, dur: 2 }, aura: { type: 'spd', amt: .12, radius: 2.8 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'none', weapon: 'orb', skin: '#f2d0ad', hairCol: '#a8b8ff' },
    desc: '주변 공격속도 +12%.'
  },

  /* ---------------------------------------------------------- 희귀 16 */
  {
    key: 'marksman', name: '명사수', rarity: 'rare', cls: 'archer', elem: 'phys', dmg: 44, spd: 1.7, rng: 4.4, proj: 'arrow',
    crit: .2, critMul: 2.2,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'bow', skin: '#e8bf95', hairCol: '#c8a05a' },
    desc: '치명타 20% / 220%.'
  },
  {
    key: 'pyro', name: '화염술사', rarity: 'rare', cls: 'mage', elem: 'fire', dmg: 40, spd: 1.05, rng: 3.6, proj: 'ball', splash: 1.4,
    burn: { dps: .8, dur: 4 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'flame', gear: 'none', weapon: 'staff', skin: '#f0c9a0' },
    desc: '광역 화상 폭발.'
  },
  {
    key: 'frostwitch', name: '서리 마녀', rarity: 'rare', cls: 'mage', elem: 'ice', dmg: 34, spd: 1.1, rng: 3.8, proj: 'shard', splash: 1.2,
    slow: { amt: .4, dur: 2.5 }, freeze: .07,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'wizardHat', weapon: 'staff', skin: '#eddcc8', hairCol: '#bfe8ff' },
    desc: '7% 확률 1.2초 빙결.'
  },
  {
    key: 'storm', name: '폭풍술사', rarity: 'rare', cls: 'mage', elem: 'thunder', dmg: 38, spd: 1.2, rng: 3.9, proj: 'chain', chain: 4, stun: .06,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'hood', weapon: 'staff', skin: '#f0c9a0', hairCol: '#ffe14d' },
    desc: '4연쇄 번개 / 6% 기절.'
  },
  {
    key: 'shadow', name: '그림자 단검', rarity: 'rare', cls: 'assassin', elem: 'dark', dmg: 30, spd: 2.4, rng: 2.6, proj: 'none',
    crit: .28, critMul: 2.4, curse: { amt: .12, dur: 3 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'none', gear: 'hood', weapon: 'dagger', skin: '#a88fa0' },
    desc: '저주 : 대상이 받는 피해 +12%.'
  },
  {
    key: 'paladin', name: '성기사', rarity: 'rare', cls: 'guardian', elem: 'holy', dmg: 62, spd: .95, rng: 2.3, proj: 'none',
    pen: .5, holyBonus: .6,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'none', gear: 'halo', weapon: 'sword', skin: '#f6dcbe' },
    desc: '방어 50% 관통, 언데드에 +60%.'
  },
  {
    key: 'cannon', name: '대포', rarity: 'rare', cls: 'artillery', elem: 'phys', dmg: 96, spd: .5, rng: 4.0, proj: 'bomb', splash: 1.7,
    look: { legs: 'track', torso: 'core', head: 'machine', hair: 'none', gear: 'none', weapon: 'cannon', skin: '#9aa4b2' },
    desc: '묵직한 한 방.'
  },
  {
    key: 'huntress', name: '정글 사냥꾼', rarity: 'rare', cls: 'archer', elem: 'nature', dmg: 33, spd: 1.55, rng: 4.0, proj: 'arrow',
    multishot: 2, root: .08,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'laurel', weapon: 'bow', skin: '#c99a6a', hairCol: '#3fd68c' },
    desc: '2발 동시 사격 / 8% 속박.'
  },
  {
    key: 'alchemist', name: '연금술사', rarity: 'rare', cls: 'artillery', elem: 'poison', dmg: 42, spd: .8, rng: 3.5, proj: 'bomb', splash: 1.5,
    poison: { dps: .9, dur: 5, stack: 8 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'none', gear: 'plague', weapon: 'flask', skin: '#d9c0a0' },
    desc: '독 웅덩이를 남긴다.'
  },
  {
    key: 'gladiator', name: '검투사', rarity: 'rare', cls: 'guardian', elem: 'blood', dmg: 58, spd: 1.3, rng: 2.1, proj: 'none',
    crit: .2, critMul: 2.3, bleed: { dps: .6, dur: 4, stack: 5 },
    look: { legs: 'biped', torso: 'brute', head: 'human', hair: 'spiky', gear: 'helm', weapon: 'axe', skin: '#c99a6a', hairCol: '#2a1a10' },
    desc: '출혈을 5중첩까지.'
  },
  {
    key: 'geomancer', name: '대지술사', rarity: 'rare', cls: 'mage', elem: 'earth', dmg: 50, spd: .85, rng: 3.4, proj: 'bomb', splash: 1.8,
    pen: .4, stun: .05,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'none', gear: 'hood', weapon: 'hammer', skin: '#c08a5a' },
    desc: '대지가 흔들린다. 5% 기절.'
  },
  {
    key: 'gunner', name: '총병', rarity: 'rare', cls: 'engineer', elem: 'phys', dmg: 30, spd: 2.2, rng: 4.2, proj: 'bullet', pierce: 1,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'visor', weapon: 'rifle', skin: '#e8bf95', hairCol: '#4a3524' },
    desc: '연발 관통 사격.'
  },
  {
    key: 'minstrel', name: '음유시인', rarity: 'rare', cls: 'bard', elem: 'wind', dmg: 26, spd: 1.4, rng: 3.8, proj: 'wave', splash: 1.0,
    aura: { type: 'spd', amt: .18, radius: 3.4 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'none', weapon: 'harp', skin: '#f0c9a0', hairCol: '#c8a05a' },
    desc: '주변 공격속도 +18%.'
  },
  {
    key: 'hexer', name: '주술사', rarity: 'rare', cls: 'warlock', elem: 'dark', dmg: 36, spd: 1.1, rng: 3.6, proj: 'orb',
    curse: { amt: .2, dur: 4 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'mask', weapon: 'tome', skin: '#b89a9a', hairCol: '#5a3a6a' },
    desc: '강력한 저주 +20%.'
  },
  {
    key: 'clockwork', name: '태엽 인형', rarity: 'rare', cls: 'summoner', elem: 'time', dmg: 28, spd: 1.3, rng: 3.4, proj: 'orb',
    summon: { count: 2, dmg: .4, spd: 1.5 }, slow: { amt: .2, dur: 2 },
    look: { legs: 'biped', torso: 'core', head: 'machine', hair: 'none', gear: 'none', weapon: 'drone', skin: '#c8b8a0' },
    desc: '태엽 인형 2기를 부린다.'
  },
  {
    key: 'skyknight', name: '창공 기사', rarity: 'rare', cls: 'guardian', elem: 'wind', dmg: 48, spd: 1.4, rng: 2.6, proj: 'none', pen: .4,
    look: { legs: 'float', torso: 'plate', head: 'human', hair: 'none', gear: 'helm', weapon: 'spear', wings: 'feather', skin: '#f0c9a0' },
    desc: '하늘에서 내리꽂는다.'
  },

  /* ---------------------------------------------------------- 영웅 18 */
  {
    key: 'sniper', name: '저격수', rarity: 'epic', cls: 'sniper', elem: 'phys', dmg: 210, spd: .62, rng: 7.5, proj: 'bullet',
    pierce: 3, crit: .3, critMul: 2.6,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'short', gear: 'visor', weapon: 'rifle', skin: '#d9b088', hairCol: '#3a2a1a' },
    desc: '초장거리 3관통.'
  },
  {
    key: 'infernal', name: '지옥불 군주', rarity: 'epic', cls: 'mage', elem: 'fire', dmg: 95, spd: 1.0, rng: 4.0, proj: 'ball', splash: 2.0,
    burn: { dps: 1.6, dur: 5 },
    look: { legs: 'biped', torso: 'scaled', head: 'demonHead', hair: 'flame', gear: 'horns', weapon: 'orb', skin: '#d94a2a' },
    desc: '지옥의 불길이 퍼진다.'
  },
  {
    key: 'glacier', name: '빙하 여왕', rarity: 'epic', cls: 'mage', elem: 'ice', dmg: 82, spd: 1.05, rng: 4.2, proj: 'shard', splash: 1.8,
    slow: { amt: .55, dur: 3 }, freeze: .14,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'ice', gear: 'crown', weapon: 'staff', skin: '#e8f2ff' },
    desc: '광역 빙결 지배.'
  },
  {
    key: 'thunderpriest', name: '뇌신 사제', rarity: 'epic', cls: 'mage', elem: 'thunder', dmg: 88, spd: 1.25, rng: 4.2, proj: 'chain',
    chain: 6, stun: .1,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'halo', weapon: 'hammer', skin: '#f6dcbe', hairCol: '#ffe9a0' },
    desc: '6연쇄 / 10% 기절.'
  },
  {
    key: 'plague', name: '역병 연금술사', rarity: 'epic', cls: 'artillery', elem: 'poison', dmg: 105, spd: .78, rng: 4.0, proj: 'bomb', splash: 2.2,
    poison: { dps: 2.2, dur: 6, stack: 12 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'none', gear: 'plague', weapon: 'flask', skin: '#b8c0a8' },
    desc: '역병이 12중첩까지.'
  },
  {
    key: 'darkknight', name: '암흑 기사', rarity: 'epic', cls: 'guardian', elem: 'dark', dmg: 175, spd: 1.0, rng: 2.6, proj: 'none',
    pen: .7, curse: { amt: .22, dur: 4 },
    look: { legs: 'biped', torso: 'plate', head: 'skull', hair: 'none', gear: 'horns', weapon: 'greatsword', skin: '#4d4a68' },
    desc: '방어 70% 관통 + 강한 저주.'
  },
  {
    key: 'runecannon', name: '룬 포격기', rarity: 'epic', cls: 'artillery', elem: 'arcane', dmg: 260, spd: .42, rng: 5.0, proj: 'bomb',
    splash: 2.4, trueDmg: true,
    look: { legs: 'track', torso: 'core', head: 'orb', hair: 'none', gear: 'none', weapon: 'cannon', skin: '#b088d8' },
    desc: '방어 완전 무시 고정 피해.'
  },
  {
    key: 'elementalist', name: '정령 소환사', rarity: 'epic', cls: 'summoner', elem: 'arcane', dmg: 60, spd: 1.1, rng: 3.6, proj: 'orb',
    summon: { count: 2, dmg: .5, spd: 1.6 },
    look: { legs: 'float', torso: 'robe', head: 'orb', hair: 'none', gear: 'none', weapon: 'orb', skin: '#ff8fd8' },
    desc: '정령 2기를 항시 소환.'
  },
  {
    key: 'ranger', name: '질풍 유격대', rarity: 'epic', cls: 'archer', elem: 'wind', dmg: 74, spd: 2.6, rng: 4.4, proj: 'bolt',
    pierce: 2, multishot: 2,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'pony', gear: 'hood', weapon: 'crossbow', skin: '#e0b088', hairCol: '#9ff5e0' },
    desc: '초고속 2연발 관통.'
  },
  {
    key: 'bloodreaver', name: '피의 약탈자', rarity: 'epic', cls: 'assassin', elem: 'blood', dmg: 120, spd: 1.9, rng: 2.6, proj: 'none',
    crit: .32, critMul: 2.6, execute: .06, bleed: { dps: 2.0, dur: 5, stack: 8 },
    look: { legs: 'biped', torso: 'brute', head: 'human', hair: 'spiky', gear: 'mask', weapon: 'axe', skin: '#c07a6a', hairCol: '#8a1a2a' },
    desc: '체력 6% 이하 처형.'
  },
  {
    key: 'titanfist', name: '거암의 주먹', rarity: 'epic', cls: 'guardian', elem: 'earth', dmg: 190, spd: .8, rng: 2.2, proj: 'none',
    pen: .8, splash: 1.4, stun: .1,
    look: { legs: 'biped', torso: 'brute', head: 'machine', hair: 'none', gear: 'none', weapon: 'hammer', skin: '#9a8a76' },
    desc: '내려찍어 광역 기절.'
  },
  {
    key: 'chronoblade', name: '시간의 검', rarity: 'epic', cls: 'assassin', elem: 'time', dmg: 110, spd: 2.2, rng: 2.8, proj: 'none',
    crit: .26, critMul: 2.5, slow: { amt: .3, dur: 2.5 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'none', weapon: 'chakram', skin: '#e8dcf0', hairCol: '#a8b8ff' },
    desc: '벤 자리에 시간이 멈춘다.'
  },
  {
    key: 'artillerist', name: '중포병', rarity: 'epic', cls: 'engineer', elem: 'fire', dmg: 230, spd: .5, rng: 5.2, proj: 'bomb', splash: 2.2,
    burn: { dps: 1.4, dur: 4 },
    look: { legs: 'track', torso: 'core', head: 'machine', hair: 'none', gear: 'visor', weapon: 'launcher', skin: '#8a94a4' },
    desc: '광역 소이탄 발사.'
  },
  {
    key: 'soulbinder', name: '영혼 결속자', rarity: 'epic', cls: 'warlock', elem: 'void', dmg: 130, spd: 1.0, rng: 4.0, proj: 'orb',
    trueDmg: true, curse: { amt: .3, dur: 5 }, shieldBreak: 2,
    look: { legs: 'wisp', torso: 'spectral', head: 'skull', hair: 'none', gear: 'hood', weapon: 'tome', skin: '#a08fd8' },
    desc: '보호막 2배 파괴 + 저주.'
  },
  {
    key: 'warchanter', name: '전쟁 성가대', rarity: 'epic', cls: 'bard', elem: 'holy', dmg: 90, spd: 1.3, rng: 4.2, proj: 'wave', splash: 1.6,
    aura: { type: 'all', amt: .16, radius: 3.8 },
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'long', gear: 'laurel', weapon: 'banner', skin: '#f6dcbe', hairCol: '#e8d090' },
    desc: '주변 전 능력 +16%.'
  },
  {
    key: 'venomlord', name: '맹독 군주', rarity: 'epic', cls: 'warlock', elem: 'poison', dmg: 100, spd: 1.2, rng: 3.8, proj: 'ball', splash: 1.6,
    poison: { dps: 2.6, dur: 6, stack: 14 },
    look: { legs: 'biped', torso: 'chitin', head: 'insectHead', hair: 'none', gear: 'none', weapon: 'flask', skin: '#6fbf4a', wings: 'insectWing' },
    desc: '독 14중첩. 방어 무시.'
  },
  {
    key: 'stormrider', name: '폭풍 기수', rarity: 'epic', cls: 'archer', elem: 'thunder', dmg: 84, spd: 2.0, rng: 4.6, proj: 'chain', chain: 3,
    look: { legs: 'float', torso: 'leather', head: 'human', hair: 'spiky', gear: 'none', weapon: 'bow', wings: 'energy', skin: '#e8bf95', hairCol: '#ffe14d' },
    desc: '번개 화살이 3회 튄다.'
  },
  {
    key: 'sunblade', name: '태양검', rarity: 'epic', cls: 'guardian', elem: 'holy', dmg: 165, spd: 1.25, rng: 2.5, proj: 'none',
    pen: .55, holyBonus: .8, splash: 1.2,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'short', gear: 'crown', weapon: 'greatsword', skin: '#f6dcbe', hairCol: '#ffd24d' },
    desc: '빛의 참격이 광역으로 퍼진다.'
  },

  /* ---------------------------------------------------------- 전설 16 */
  {
    key: 'dragoon', name: '용기사', rarity: 'legendary', cls: 'guardian', elem: 'fire', dmg: 430, spd: 1.35, rng: 3.0, proj: 'none',
    pen: .8, splash: 1.4, burn: { dps: 4, dur: 5 },
    look: { legs: 'biped', torso: 'scaled', head: 'dragonHead', hair: 'none', gear: 'horns', weapon: 'halberd', skin: '#e0552a', wings: 'bat' },
    desc: '용의 창이 대지를 가른다.'
  },
  {
    key: 'sunpriest', name: '태양 신관', rarity: 'legendary', cls: 'support', elem: 'holy', dmg: 220, spd: 1.1, rng: 4.4, proj: 'beam',
    holyBonus: 1.0, aura: { type: 'dmg', amt: .3, radius: 3.6 },
    look: { legs: 'float', torso: 'robe', head: 'human', hair: 'long', gear: 'halo', weapon: 'orb', skin: '#fff0d8', hairCol: '#ffe9a0', wings: 'feather' },
    desc: '주변 공격력 +30%, 언데드 2배.'
  },
  {
    key: 'zero', name: '절대 영도', rarity: 'legendary', cls: 'mage', elem: 'ice', dmg: 330, spd: 1.0, rng: 4.6, proj: 'shard', splash: 2.6,
    slow: { amt: .7, dur: 3.5 }, freeze: .25,
    look: { legs: 'float', torso: 'crystal', head: 'orb', hair: 'ice', gear: 'crown', weapon: 'staff', skin: '#bfe8ff' },
    desc: '25% 확률 광역 빙결.'
  },
  {
    key: 'judge', name: '천둥의 심판자', rarity: 'legendary', cls: 'mage', elem: 'thunder', dmg: 300, spd: 1.4, rng: 4.6, proj: 'chain',
    chain: 9, stun: .16,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'none', gear: 'halo', weapon: 'hammer', skin: '#f6dcbe', wings: 'energy' },
    desc: '9연쇄 심판의 번개.'
  },
  {
    key: 'abyss', name: '심연의 마녀', rarity: 'legendary', cls: 'assassin', elem: 'dark', dmg: 260, spd: 2.1, rng: 3.2, proj: 'none',
    crit: .4, critMul: 3.0, curse: { amt: .4, dur: 5 }, execute: .08,
    look: { legs: 'wisp', torso: 'spectral', head: 'human', hair: 'long', gear: 'wizardHat', weapon: 'scythe', skin: '#d8c8e8', hairCol: '#7a4ac0' },
    desc: '체력 8% 이하 즉시 처형.'
  },
  {
    key: 'chrono', name: '시간술사', rarity: 'legendary', cls: 'support', elem: 'time', dmg: 180, spd: 1.2, rng: 4.0, proj: 'orb',
    trueDmg: true, aura: { type: 'spd', amt: .35, radius: 3.6 }, slow: { amt: .35, dur: 3 },
    look: { legs: 'float', torso: 'robe', head: 'orb', hair: 'none', gear: 'none', weapon: 'orb', skin: '#a8b8ff' },
    desc: '주변 공격속도 +35%.'
  },
  {
    key: 'devastator', name: '파괴포 MK-VII', rarity: 'legendary', cls: 'artillery', elem: 'phys', dmg: 1250, spd: .34, rng: 5.6, proj: 'bomb',
    splash: 3.2, pen: .6,
    look: { legs: 'track', torso: 'core', head: 'machine', hair: 'none', gear: 'visor', weapon: 'cannon', skin: '#8e99a8' },
    desc: '한 발로 무리를 지운다.'
  },
  {
    key: 'bloodmoon', name: '핏빛 달', rarity: 'legendary', cls: 'warlock', elem: 'blood', dmg: 340, spd: 1.5, rng: 3.8, proj: 'ball', splash: 1.8,
    bleed: { dps: 6, dur: 6, stack: 12 }, execute: .1,
    look: { legs: 'wisp', torso: 'cloak', head: 'human', hair: 'long', gear: 'crown', weapon: 'scythe', skin: '#e8c0c8', hairCol: '#c01a3a' },
    desc: '출혈 12중첩 · 10% 처형.'
  },
  {
    key: 'worldforge', name: '세계 대장장이', rarity: 'legendary', cls: 'engineer', elem: 'earth', dmg: 520, spd: 1.0, rng: 4.2, proj: 'bomb',
    splash: 2.4, pen: .9, summon: { count: 2, dmg: .6, spd: 1.6 },
    look: { legs: 'biped', torso: 'brute', head: 'machine', hair: 'none', gear: 'helm', weapon: 'hammer', skin: '#b08a5a' },
    desc: '망치질마다 자동 포탑이 늘어난다.'
  },
  {
    key: 'galewarden', name: '질풍의 수호자', rarity: 'legendary', cls: 'archer', elem: 'wind', dmg: 260, spd: 3.0, rng: 5.0, proj: 'arrow',
    multishot: 3, pierce: 2,
    look: { legs: 'float', torso: 'cloak', head: 'human', hair: 'long', gear: 'laurel', weapon: 'bow', skin: '#f0d8c0', hairCol: '#9ff5e0', wings: 'feather' },
    desc: '3연사 관통 폭풍.'
  },
  {
    key: 'necrarch', name: '사령 대공', rarity: 'legendary', cls: 'summoner', elem: 'dark', dmg: 240, spd: 1.2, rng: 4.0, proj: 'orb',
    summon: { count: 3, dmg: .6, spd: 1.5 }, curse: { amt: .25, dur: 4 },
    look: { legs: 'wisp', torso: 'spectral', head: 'skull', hair: 'none', gear: 'crown', weapon: 'tome', skin: '#c8b0ff' },
    desc: '망령 3기를 부린다.'
  },
  {
    key: 'starcaller', name: '별을 부르는 자', rarity: 'legendary', cls: 'mage', elem: 'arcane', dmg: 400, spd: 1.1, rng: 5.0, proj: 'ball',
    splash: 2.6, trueDmg: true,
    look: { legs: 'float', torso: 'robe', head: 'orb', hair: 'none', gear: 'wizardHat', weapon: 'staff', skin: '#ff8fd8' },
    desc: '별빛이 방어를 무시한다.'
  },
  {
    key: 'tyrantguard', name: '폭군의 방패', rarity: 'legendary', cls: 'guardian', elem: 'phys', dmg: 600, spd: .9, rng: 2.6, proj: 'none',
    pen: 1.0, splash: 1.6,
    look: { legs: 'biped', torso: 'plate', head: 'machine', hair: 'none', gear: 'helm', weapon: 'greatsword', skin: '#7f8a9a' },
    desc: '방어력을 완전히 무시한다.'
  },
  {
    key: 'venomqueen', name: '독의 여왕', rarity: 'legendary', cls: 'warlock', elem: 'poison', dmg: 300, spd: 1.4, rng: 4.2, proj: 'ball',
    splash: 2.0, poison: { dps: 7, dur: 7, stack: 20 },
    look: { legs: 'biped', torso: 'chitin', head: 'insectHead', hair: 'long', gear: 'crown', weapon: 'staff', skin: '#5fc44a', wings: 'insectWing' },
    desc: '독 20중첩. 모든 것을 녹인다.'
  },
  {
    key: 'echomaestro', name: '메아리 지휘자', rarity: 'legendary', cls: 'bard', elem: 'wind', dmg: 280, spd: 1.6, rng: 5.0, proj: 'wave',
    splash: 2.2, aura: { type: 'all', amt: .26, radius: 4.4 },
    look: { legs: 'float', torso: 'cloak', head: 'human', hair: 'long', gear: 'laurel', weapon: 'harp', skin: '#f0d8c0', hairCol: '#9ff5e0' },
    desc: '전 능력 +26% 광역 오라.'
  },
  {
    key: 'oblivion', name: '망각의 사수', rarity: 'legendary', cls: 'sniper', elem: 'void', dmg: 1400, spd: .55, rng: 8.5, proj: 'bullet',
    pierce: 4, crit: .35, critMul: 3.0, trueDmg: true, shieldBreak: 3,
    look: { legs: 'biped', torso: 'cloak', head: 'skull', hair: 'none', gear: 'visor', weapon: 'rifle', skin: '#a08fd8' },
    desc: '보호막을 3배로 부수는 저격.'
  },

  /* ---------------------------------------------------------- 신화 12 */
  {
    key: 'phoenix', name: '불사조', rarity: 'mythic', cls: 'summoner', elem: 'fire', dmg: 720, spd: 1.5, rng: 4.6, proj: 'ball', splash: 2.4,
    burn: { dps: 14, dur: 6 }, summon: { count: 2, dmg: .8, spd: 2.0 },
    look: { legs: 'float', torso: 'scaled', head: 'dragonHead', hair: 'flame', gear: 'crown', weapon: 'none', skin: '#ff8a2a', wings: 'feather', wingCol: '#ff9a3a' },
    desc: '불꽃 새 2마리를 거느린다.'
  },
  {
    key: 'worldtree', name: '세계수', rarity: 'mythic', cls: 'support', elem: 'nature', dmg: 480, spd: 1.0, rng: 5.0, proj: 'ball', splash: 2.6,
    root: .3, aura: { type: 'all', amt: .28, radius: 5.0 },
    look: { legs: 'none', torso: 'brute', head: 'orb', hair: 'none', gear: 'antlers', weapon: 'none', skin: '#3fd68c' },
    desc: '광범위 전체 강화 +28%.'
  },
  {
    key: 'voidlord', name: '공허의 군주', rarity: 'mythic', cls: 'mage', elem: 'void', dmg: 900, spd: 1.15, rng: 5.0, proj: 'orb', splash: 3.0,
    trueDmg: true, shieldBreak: 3,
    look: { legs: 'wisp', torso: 'spectral', head: 'demonHead', hair: 'none', gear: 'crown', weapon: 'orb', skin: '#8f7bff', wings: 'energy' },
    desc: '보호막을 3배로 부순다.'
  },
  {
    key: 'starsniper', name: '별의 저격수', rarity: 'mythic', cls: 'sniper', elem: 'arcane', dmg: 3200, spd: .55, rng: 99, proj: 'bullet',
    pierce: 6, crit: .45, critMul: 3.5, trueDmg: true,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'visor', weapon: 'rifle', skin: '#f0d8f0', hairCol: '#ff8fd8' },
    desc: '맵 전체를 사거리로 삼는다.'
  },
  {
    key: 'godslayer', name: '신멸의 검', rarity: 'mythic', cls: 'assassin', elem: 'holy', dmg: 1400, spd: 2.2, rng: 3.0, proj: 'none',
    crit: .5, critMul: 3.2, execute: .15, bossBonus: 1.2,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'long', gear: 'crown', weapon: 'greatsword', skin: '#fff0d8', hairCol: '#ffe9a0', wings: 'feather' },
    desc: '보스에게 +120% 피해.'
  },
  {
    key: 'leviathan', name: '심해의 리바이어던', rarity: 'mythic', cls: 'artillery', elem: 'ice', dmg: 2400, spd: .6, rng: 5.6, proj: 'bomb',
    splash: 3.4, slow: { amt: .6, dur: 4 }, freeze: .2,
    look: { legs: 'none', torso: 'scaled', head: 'dragonHead', hair: 'none', gear: 'horns', weapon: 'cannon', skin: '#3aa8d8' },
    desc: '얼어붙은 심해가 밀려온다.'
  },
  {
    key: 'ragnarok', name: '라그나로크', rarity: 'mythic', cls: 'guardian', elem: 'blood', dmg: 1900, spd: 1.7, rng: 3.2, proj: 'none',
    pen: 1.0, splash: 2.0, execute: .12, bleed: { dps: 20, dur: 6, stack: 20 },
    look: { legs: 'biped', torso: 'brute', head: 'skull', hair: 'flame', gear: 'horns', weapon: 'greatsword', skin: '#c01a3a' },
    desc: '종말의 검. 출혈 20중첩.'
  },
  {
    key: 'archivist', name: '시간의 기록자', rarity: 'mythic', cls: 'support', elem: 'time', dmg: 900, spd: 1.4, rng: 5.4, proj: 'beam',
    trueDmg: true, slow: { amt: .55, dur: 4 }, aura: { type: 'all', amt: .4, radius: 5.4 },
    look: { legs: 'float', torso: 'robe', head: 'orb', hair: 'none', gear: 'halo', weapon: 'tome', skin: '#a8b8ff' },
    desc: '전 능력 +40% & 광역 둔화.'
  },
  {
    key: 'stormtitan', name: '뇌전 타이탄', rarity: 'mythic', cls: 'mage', elem: 'thunder', dmg: 1500, spd: 1.5, rng: 5.2, proj: 'chain',
    chain: 14, stun: .22,
    look: { legs: 'biped', torso: 'brute', head: 'machine', hair: 'none', gear: 'crown', weapon: 'hammer', skin: '#d8dc50' },
    desc: '14연쇄 · 22% 기절.'
  },
  {
    key: 'gaia', name: '대지모신 가이아', rarity: 'mythic', cls: 'summoner', elem: 'earth', dmg: 1100, spd: 1.1, rng: 4.8, proj: 'bomb',
    splash: 3.0, pen: .9, summon: { count: 4, dmg: .7, spd: 1.4 },
    look: { legs: 'none', torso: 'brute', head: 'human', hair: 'long', gear: 'laurel', weapon: 'none', skin: '#a8c47a', hairCol: '#3fd68c' },
    desc: '바위 정령 4기를 거느린다.'
  },
  {
    key: 'nightsong', name: '밤의 노래', rarity: 'mythic', cls: 'bard', elem: 'dark', dmg: 1000, spd: 2.0, rng: 5.4, proj: 'wave',
    splash: 2.6, curse: { amt: .6, dur: 6 }, aura: { type: 'crit', amt: .18, radius: 5.0 },
    look: { legs: 'wisp', torso: 'cloak', head: 'human', hair: 'long', gear: 'mask', weapon: 'harp', skin: '#d0c0e0', hairCol: '#7a4ac0' },
    desc: '주변 치명타 +18% · 강한 저주.'
  },
  {
    key: 'mechagod', name: '기계신 프로토스', rarity: 'mythic', cls: 'engineer', elem: 'arcane', dmg: 2100, spd: 1.2, rng: 6.0, proj: 'bullet',
    pierce: 4, trueDmg: true, summon: { count: 4, dmg: .8, spd: 2.2 },
    look: { legs: 'track', torso: 'core', head: 'machine', hair: 'none', gear: 'visor', weapon: 'launcher', skin: '#c8a0ff' },
    desc: '전투 드론 4기 · 방어 무시.'
  },

  /* ---------------------------------------------------------- 초월 12 */
  {
    key: 'omega', name: 'OMEGA 코어', rarity: 'ultimate', cls: 'artillery', elem: 'arcane', dmg: 9000, spd: .8, rng: 7.0, proj: 'bomb',
    splash: 4.2, trueDmg: true, pierce: 2,
    look: { legs: 'track', torso: 'core', head: 'orb', hair: 'none', gear: 'none', weapon: 'cannon', skin: '#ff5bd0', wings: 'energy' },
    desc: '규격 외의 화력. 모든 것을 지운다.'
  },
  {
    key: 'genesis', name: '창조의 용', rarity: 'ultimate', cls: 'guardian', elem: 'nature', dmg: 6200, spd: 2.0, rng: 4.4, proj: 'wave',
    splash: 3.4, pen: 1, aura: { type: 'all', amt: .45, radius: 6 },
    look: { legs: 'biped', torso: 'scaled', head: 'dragonHead', hair: 'none', gear: 'crown', weapon: 'claw', skin: '#3fd68c', wings: 'bat', wingCol: '#2aa870' },
    desc: '전 아군 +45% / 방어 완전 관통.'
  },
  {
    key: 'omen', name: '종말 관측자', rarity: 'ultimate', cls: 'mage', elem: 'void', dmg: 7400, spd: 1.4, rng: 6.4, proj: 'beam',
    splash: 3.0, trueDmg: true, execute: .2, curse: { amt: .8, dur: 6 }, shieldBreak: 5,
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', hair: 'none', gear: 'crown', weapon: 'scythe', skin: '#8f7bff' },
    desc: '체력 20% 이하 모든 존재를 지운다.'
  },
  {
    key: 'solaris', name: '태양 그 자체', rarity: 'ultimate', cls: 'mage', elem: 'fire', dmg: 8200, spd: 1.3, rng: 6.0, proj: 'ball',
    splash: 4.0, burn: { dps: 60, dur: 8 },
    look: { legs: 'float', torso: 'spectral', head: 'orb', hair: 'flame', gear: 'halo', weapon: 'orb', skin: '#ffb03a' },
    desc: '지평선을 태우는 항성.'
  },
  {
    key: 'eternity', name: '영겁의 수호자', rarity: 'ultimate', cls: 'support', elem: 'time', dmg: 4800, spd: 1.6, rng: 7.0, proj: 'beam',
    trueDmg: true, slow: { amt: .75, dur: 5 }, aura: { type: 'all', amt: .6, radius: 7 },
    look: { legs: 'float', torso: 'robe', head: 'orb', hair: 'none', gear: 'crown', weapon: 'orb', skin: '#a8b8ff', wings: 'energy' },
    desc: '전 아군 +60% · 시간을 늦춘다.'
  },
  {
    key: 'apocalypse', name: '아포칼립스', rarity: 'ultimate', cls: 'warlock', elem: 'blood', dmg: 7800, spd: 1.5, rng: 5.4, proj: 'ball',
    splash: 3.2, execute: .18, bleed: { dps: 90, dur: 8, stack: 30 }, curse: { amt: .7, dur: 6 },
    look: { legs: 'wisp', torso: 'brute', head: 'skull', hair: 'flame', gear: 'horns', weapon: 'scythe', skin: '#ff2a4a' },
    desc: '출혈 30중첩 · 18% 처형.'
  },
  {
    key: 'aegis', name: '이지스 프로토콜', rarity: 'ultimate', cls: 'engineer', elem: 'thunder', dmg: 6600, spd: 1.8, rng: 6.2, proj: 'chain',
    chain: 20, stun: .3, summon: { count: 6, dmg: .9, spd: 2.4 },
    look: { legs: 'track', torso: 'core', head: 'machine', hair: 'none', gear: 'visor', weapon: 'drone', skin: '#ffe14d' },
    desc: '드론 6기 · 20연쇄 번개.'
  },
  {
    key: 'silence', name: '침묵의 종언', rarity: 'ultimate', cls: 'sniper', elem: 'void', dmg: 24000, spd: .5, rng: 99, proj: 'bullet',
    pierce: 10, crit: .55, critMul: 4.0, trueDmg: true, shieldBreak: 6, execute: .1,
    look: { legs: 'wisp', torso: 'cloak', head: 'skull', hair: 'none', gear: 'hood', weapon: 'rifle', skin: '#8f7bff' },
    desc: '한 발에 전선이 조용해진다.'
  },
  {
    key: 'verdant', name: '만물의 정원사', rarity: 'ultimate', cls: 'summoner', elem: 'nature', dmg: 5200, spd: 1.4, rng: 5.6, proj: 'ball',
    splash: 3.0, root: .4, summon: { count: 6, dmg: .8, spd: 1.8 },
    look: { legs: 'none', torso: 'brute', head: 'orb', hair: 'none', gear: 'laurel', weapon: 'none', skin: '#4ce8a0' },
    desc: '수호 정령 6기가 자란다.'
  },
  {
    key: 'permafrost', name: '영구동토', rarity: 'ultimate', cls: 'mage', elem: 'ice', dmg: 7000, spd: 1.2, rng: 6.2, proj: 'shard',
    splash: 3.6, slow: { amt: .85, dur: 5 }, freeze: .4,
    look: { legs: 'none', torso: 'crystal', head: 'orb', hair: 'ice', gear: 'crown', weapon: 'staff', skin: '#bfe8ff' },
    desc: '40% 확률 광역 빙결.'
  },
  {
    key: 'monolith', name: '태고의 모놀리스', rarity: 'ultimate', cls: 'guardian', elem: 'earth', dmg: 12000, spd: .9, rng: 3.6, proj: 'none',
    pen: 1, splash: 3.0, stun: .25,
    look: { legs: 'none', torso: 'core', head: 'none', hair: 'none', gear: 'none', weapon: 'hammer', skin: '#c8a86a' },
    desc: '움직이는 산맥. 25% 광역 기절.'
  },
  {
    key: 'harmony', name: '천상의 화음', rarity: 'ultimate', cls: 'bard', elem: 'holy', dmg: 5600, spd: 2.4, rng: 6.6, proj: 'wave',
    splash: 3.2, holyBonus: 1.5, aura: { type: 'all', amt: .5, radius: 6.4 },
    look: { legs: 'float', torso: 'robe', head: 'human', hair: 'long', gear: 'halo', weapon: 'harp', skin: '#fff2dc', hairCol: '#ffe9a0', wings: 'feather' },
    desc: '전 아군 +50% · 언데드 특효.'
  },

  /* ---------------------------------------------------------- 태초 8 */
  {
    key: 'p_alpha', name: 'ALPHA — 최초의 빛', rarity: 'primordial', cls: 'mage', elem: 'holy', dmg: 42000, spd: 2.0, rng: 99, proj: 'beam',
    splash: 4.6, trueDmg: true, holyBonus: 2, aura: { type: 'all', amt: .8, radius: 9 },
    look: { legs: 'float', torso: 'spectral', head: 'orb', hair: 'none', gear: 'halo', weapon: 'orb', skin: '#fff6d0', wings: 'feather', wingCol: '#fff2b0' },
    desc: '전 아군 +80%. 맵 전체를 비춘다.'
  },
  {
    key: 'p_nihil', name: 'NIHIL — 무의 심장', rarity: 'primordial', cls: 'warlock', elem: 'void', dmg: 56000, spd: 1.6, rng: 8.0, proj: 'orb',
    splash: 4.4, trueDmg: true, execute: .3, shieldBreak: 10, curse: { amt: 1.2, dur: 8 },
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', hair: 'none', gear: 'crown', weapon: 'scythe', skin: '#8f7bff', wings: 'energy' },
    desc: '체력 30% 이하 존재를 무로 되돌린다.'
  },
  {
    key: 'p_titanos', name: 'TITANOS — 대지의 근원', rarity: 'primordial', cls: 'guardian', elem: 'earth', dmg: 70000, spd: 1.1, rng: 4.4, proj: 'none',
    pen: 1, splash: 4.0, stun: .35,
    look: { legs: 'none', torso: 'brute', head: 'machine', hair: 'none', gear: 'horns', weapon: 'hammer', skin: '#d2a15e' },
    desc: '한 걸음마다 대륙이 갈라진다.'
  },
  {
    key: 'p_chronos', name: 'CHRONOS — 시간의 주인', rarity: 'primordial', cls: 'support', elem: 'time', dmg: 30000, spd: 2.6, rng: 99, proj: 'beam',
    trueDmg: true, slow: { amt: .9, dur: 6 }, aura: { type: 'all', amt: 1.0, radius: 12 },
    look: { legs: 'float', torso: 'robe', head: 'orb', hair: 'none', gear: 'crown', weapon: 'tome', skin: '#a8b8ff', wings: 'energy' },
    desc: '전 아군 +100%. 시간이 멈춘다.'
  },
  {
    key: 'p_infernus', name: 'INFERNUS — 원초의 화염', rarity: 'primordial', cls: 'mage', elem: 'fire', dmg: 62000, spd: 1.8, rng: 7.4, proj: 'ball',
    splash: 5.0, burn: { dps: 400, dur: 10 },
    look: { legs: 'float', torso: 'scaled', head: 'dragonHead', hair: 'flame', gear: 'horns', weapon: 'orb', skin: '#ff5a1a', wings: 'bat', wingCol: '#ff7a2a' },
    desc: '꺼지지 않는 최초의 불.'
  },
  {
    key: 'p_thanatos', name: 'THANATOS — 죽음의 낫', rarity: 'primordial', cls: 'assassin', elem: 'blood', dmg: 88000, spd: 2.8, rng: 4.2, proj: 'none',
    crit: .7, critMul: 5.0, execute: .35, bossBonus: 2.0, bleed: { dps: 500, dur: 10, stack: 40 },
    look: { legs: 'wisp', torso: 'cloak', head: 'skull', hair: 'none', gear: 'hood', weapon: 'scythe', skin: '#ff2a4a' },
    desc: '보스에게 +200%. 35% 처형.'
  },
  {
    key: 'p_machina', name: 'MACHINA — 종극 병기', rarity: 'primordial', cls: 'engineer', elem: 'thunder', dmg: 64000, spd: 2.2, rng: 8.4, proj: 'bullet',
    pierce: 12, chain: 24, trueDmg: true, summon: { count: 8, dmg: 1.0, spd: 3.0 },
    look: { legs: 'track', torso: 'core', head: 'machine', hair: 'none', gear: 'visor', weapon: 'launcher', skin: '#ffe14d', wings: 'energy' },
    desc: '드론 8기. 전장을 제압한다.'
  },
  {
    key: 'p_aether', name: 'AETHER — 세계의 씨앗', rarity: 'primordial', cls: 'summoner', elem: 'nature', dmg: 48000, spd: 1.6, rng: 7.0, proj: 'ball',
    splash: 4.2, root: .6, summon: { count: 10, dmg: 1.0, spd: 2.0 }, aura: { type: 'gold', amt: .8, radius: 9 },
    look: { legs: 'none', torso: 'brute', head: 'orb', hair: 'none', gear: 'antlers', weapon: 'none', skin: '#4ce8a0' },
    desc: '정령 10기 · 골드 획득 +80%.'
  },
  /* ------- 생성 : common ------- */
  {
    key: 'phys_archer_co0', name: '무쇠 활잡이', rarity: 'common', cls: 'archer', elem: 'phys', dmg: 8, spd: 1.53, rng: 3.3, proj: 'arrow', crit: 0.1, critMul: 1.9,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'bow', skin: '#f0c9a0', hairCol: '#3a2a1a' },
    desc: '치명 10%.'
  },
  {
    key: 'thunder_sniper_co1', name: '섬전 관측수', rarity: 'common', cls: 'sniper', elem: 'thunder', dmg: 12, spd: 0.46, rng: 6.3, proj: 'arrow', crit: 0.14, critMul: 2.2,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'spiky', gear: 'none', weapon: 'crossbow', skin: '#f0c9a0', hairCol: '#3a2a1a' },
    desc: '치명 14%.'
  },
  {
    key: 'dark_mage_co2', name: '검은 술사', rarity: 'common', cls: 'mage', elem: 'dark', dmg: 9, spd: 0.81, rng: 3.1, proj: 'ball', splash: 0.71,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'none', weapon: 'staff', skin: '#ffe0c0', hairCol: '#6b4a2a' },
    desc: '범위 폭발.'
  },
  {
    key: 'void_artillery_co3', name: '균열 포격수', rarity: 'common', cls: 'artillery', elem: 'void', dmg: 16, spd: 0.48, rng: 3.4, proj: 'bomb', splash: 0.71,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'none', weapon: 'sling', skin: '#c89268', hairCol: '#d94f4f' },
    desc: '범위 폭발.'
  },
  {
    key: 'blood_guardian_co4', name: '핏빛 검사', rarity: 'common', cls: 'guardian', elem: 'blood', dmg: 12, spd: 0.85, rng: 1.8, proj: 'none', pen: 0.17,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'spiky', gear: 'none', weapon: 'greatsword', skin: '#f2d0ad', hairCol: '#2b2b33' },
    desc: '방어 17% 관통.'
  },
  {
    key: 'fire_assassin_co5', name: '잿불 밀정', rarity: 'common', cls: 'assassin', elem: 'fire', dmg: 10, spd: 1.64, rng: 1.9, proj: 'none', burn: { dps: 0.12, dur: 4 },
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'spiky', gear: 'none', weapon: 'dagger', skin: '#d9a978', hairCol: '#c9a227' },
    desc: '화상.'
  },
  {
    key: 'poison_support_co6', name: '썩은 성직자', rarity: 'common', cls: 'support', elem: 'poison', dmg: 8, spd: 0.94, rng: 2.7, proj: 'ball', aura: { type: 'dmg', amt: 0.14, radius: 4 },
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'pony', gear: 'none', weapon: 'flask', skin: '#f0c9a0', hairCol: '#d94f4f' },
    desc: '공격력 오라 +14%.'
  },
  {
    key: 'nature_bard_co7', name: '수호림 전율자', rarity: 'common', cls: 'bard', elem: 'nature', dmg: 8, spd: 1.27, rng: 3, proj: 'ball', aura: { type: 'dmg', amt: 0.16, radius: 2 }, regen: 0.02,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'pony', gear: 'none', weapon: 'banner', skin: '#e8bf95', hairCol: '#6b4a2a' },
    desc: '생명 재생 · 공격력 오라 +16%.'
  },
  {
    key: 'wind_summoner_co8', name: '유랑 조련사', rarity: 'common', cls: 'summoner', elem: 'wind', dmg: 10, spd: 1.06, rng: 2.8, proj: 'ball', summon: { count: 1, dmg: 3, spd: 1.2 }, multishot: 2,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'none', weapon: 'staff', skin: '#f2d0ad', hairCol: '#2b2b33' },
    desc: '2연사 · 정령 1기 소환.'
  },
  {
    key: 'time_engineer_co9', name: '영겁 조립공', rarity: 'common', cls: 'engineer', elem: 'time', dmg: 13, spd: 1.16, rng: 3.3, proj: 'bolt', slow: 0.24,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'braid', gear: 'none', weapon: 'flask', skin: '#b9825a', hairCol: '#2b2b33' },
    desc: '둔화 24%.'
  },
  {
    key: 'ice_warlock_co10', name: '설야 금술사', rarity: 'common', cls: 'warlock', elem: 'ice', dmg: 14, spd: 0.83, rng: 3.1, proj: 'ball', poison: { dps: 0.14, dur: 6, stack: 2 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'pony', gear: 'none', weapon: 'wand', skin: '#ffe0c0', hairCol: '#2b2b33' },
    desc: '중독.'
  },
  {
    key: 'dark_archer_co11', name: '검은 궁병', rarity: 'common', cls: 'archer', elem: 'dark', dmg: 9, spd: 1.54, rng: 3.3, proj: 'arrow', curse: 0.14,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'bow', skin: '#f0c9a0', hairCol: '#4a3524' },
    desc: '저주.'
  },
  {
    key: 'void_sniper_co12', name: '단절 관측수', rarity: 'common', cls: 'sniper', elem: 'void', dmg: 23, spd: 0.6, rng: 6.2, proj: 'arrow', crit: 0.13, critMul: 2,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'none', weapon: 'rifle', skin: '#c89268', hairCol: '#8a5a3a' },
    desc: '치명 13%.'
  },
  {
    key: 'blood_mage_co13', name: '붉은 사도', rarity: 'common', cls: 'mage', elem: 'blood', dmg: 14, spd: 1.13, rng: 3.2, proj: 'ball', splash: 0.76,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'none', weapon: 'orb', skin: '#e8bf95', hairCol: '#6b4a2a' },
    desc: '범위 폭발.'
  },
  {
    key: 'fire_artillery_co14', name: '겁화 폭격수', rarity: 'common', cls: 'artillery', elem: 'fire', dmg: 24, spd: 0.53, rng: 3.3, proj: 'bomb', burn: { dps: 0.29, dur: 4 },
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'sling', skin: '#e8bf95', hairCol: '#6b4a2a' },
    desc: '화상.'
  },
  {
    key: 'poison_guardian_co15', name: '괴저 파수꾼', rarity: 'common', cls: 'guardian', elem: 'poison', dmg: 18, spd: 0.96, rng: 1.9, proj: 'none', crit: 0.14, critMul: 1.9,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'pony', gear: 'none', weapon: 'axe', skin: '#b9825a', hairCol: '#3a2a1a' },
    desc: '치명 14%.'
  },
  {
    key: 'nature_assassin_co16', name: '수호림 암살자', rarity: 'common', cls: 'assassin', elem: 'nature', dmg: 14, spd: 2.15, rng: 1.8, proj: 'none', crit: 0.1, critMul: 1.8,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'none', weapon: 'dagger', skin: '#c89268', hairCol: '#d94f4f' },
    desc: '치명 10%.'
  },
  {
    key: 'wind_support_co17', name: '유랑 조율사', rarity: 'common', cls: 'support', elem: 'wind', dmg: 9, spd: 1.37, rng: 2.8, proj: 'ball', aura: { type: 'gold', amt: 0.07, radius: 3 },
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'long', gear: 'none', weapon: 'tome', skin: '#e8bf95', hairCol: '#4a3524' },
    desc: '골드 오라 +7%.'
  },
  {
    key: 'time_bard_co18', name: '모래시계 음유시인', rarity: 'common', cls: 'bard', elem: 'time', dmg: 10, spd: 1.63, rng: 2.9, proj: 'ball', aura: { type: 'gold', amt: 0.15, radius: 3 }, slow: 0.16,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'short', gear: 'none', weapon: 'harp', skin: '#e8bf95', hairCol: '#8a5a3a' },
    desc: '둔화 16% · 골드 오라 +15%.'
  },
  {
    key: 'ice_summoner_co19', name: '서리 부름꾼', rarity: 'common', cls: 'summoner', elem: 'ice', dmg: 15, spd: 0.7, rng: 3, proj: 'ball', summon: { count: 1, dmg: 5, spd: 1.2 }, slow: 0.39,
    look: { legs: 'float', torso: 'robe', head: 'human', hair: 'pony', gear: 'none', weapon: 'orb', skin: '#e8bf95', hairCol: '#8a5a3a' },
    desc: '둔화 39% · 정령 1기 소환.'
  },
  {
    key: 'holy_engineer_co20', name: '여명 기술자', rarity: 'common', cls: 'engineer', elem: 'holy', dmg: 22, spd: 1.01, rng: 3.3, proj: 'bolt', splash: 0.73,
    look: { legs: 'biped', torso: 'core', head: 'human', hair: 'pony', gear: 'none', weapon: 'rifle', skin: '#d9a978', hairCol: '#d94f4f' },
    desc: '범위 폭발.'
  },
  {
    key: 'arcane_warlock_co21', name: '룬 금술사', rarity: 'common', cls: 'warlock', elem: 'arcane', dmg: 21, spd: 1, rng: 3.2, proj: 'ball', poison: { dps: 0.21, dur: 5, stack: 2 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'none', weapon: 'scythe', skin: '#f2d0ad', hairCol: '#4a3524' },
    desc: '중독.'
  },
  {
    key: 'blood_archer_co22', name: '적혈 사궁', rarity: 'common', cls: 'archer', elem: 'blood', dmg: 15, spd: 1.4, rng: 3.2, proj: 'arrow', crit: 0.12, critMul: 2.1,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'spiky', gear: 'none', weapon: 'crossbow', skin: '#f0c9a0', hairCol: '#2b2b33' },
    desc: '치명 12%.'
  },
  {
    key: 'fire_sniper_co23', name: '작열 저격수', rarity: 'common', cls: 'sniper', elem: 'fire', dmg: 24, spd: 0.45, rng: 5.8, proj: 'arrow', crit: 0.15, critMul: 2,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'rifle', skin: '#f2d0ad', hairCol: '#8a5a3a' },
    desc: '치명 15%.'
  },
  {
    key: 'poison_mage_co24', name: '독무 주술사', rarity: 'common', cls: 'mage', elem: 'poison', dmg: 22, spd: 1.23, rng: 3.1, proj: 'ball', splash: 0.7,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'pony', gear: 'none', weapon: 'wand', skin: '#e8bf95', hairCol: '#3a2a1a' },
    desc: '범위 폭발.'
  },
  {
    key: 'nature_artillery_co25', name: '이끼 투석수', rarity: 'common', cls: 'artillery', elem: 'nature', dmg: 24, spd: 0.59, rng: 3.5, proj: 'bomb', splash: 0.71,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'long', gear: 'none', weapon: 'cannon', skin: '#d9a978', hairCol: '#c9a227' },
    desc: '범위 폭발.'
  },
  /* ------- 생성 : uncommon ------- */
  {
    key: 'holy_sniper_un0', name: '성역 저격수', rarity: 'uncommon', cls: 'sniper', elem: 'holy', dmg: 19, spd: 0.8, rng: 5.9, proj: 'arrow', pen: 0.2,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'crossbow', skin: '#d9a978', hairCol: '#d94f4f' },
    desc: '방어 20% 관통.'
  },
  {
    key: 'arcane_mage_un1', name: '고대 사도', rarity: 'uncommon', cls: 'mage', elem: 'arcane', dmg: 12, spd: 0.97, rng: 3.3, proj: 'ball', splash: 0.88,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'none', weapon: 'orb', skin: '#f0c9a0', hairCol: '#3a2a1a' },
    desc: '범위 폭발.'
  },
  {
    key: 'earth_artillery_un2', name: '바위 포격수', rarity: 'uncommon', cls: 'artillery', elem: 'earth', dmg: 22, spd: 0.79, rng: 3.3, proj: 'bomb', splash: 0.84,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'long', gear: 'none', weapon: 'launcher', skin: '#b9825a', hairCol: '#2b2b33' },
    desc: '범위 폭발.'
  },
  {
    key: 'phys_guardian_un3', name: '강습 파수꾼', rarity: 'uncommon', cls: 'guardian', elem: 'phys', dmg: 16, spd: 0.89, rng: 1.8, proj: 'none', crit: 0.15, critMul: 2,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'pony', gear: 'none', weapon: 'sword', skin: '#ffe0c0', hairCol: '#c9a227' },
    desc: '치명 15%.'
  },
  {
    key: 'thunder_assassin_un4', name: '번개 그림자', rarity: 'uncommon', cls: 'assassin', elem: 'thunder', dmg: 12, spd: 1.73, rng: 2.1, proj: 'none', chain: 3,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'none', weapon: 'chakram', skin: '#e8bf95', hairCol: '#4a3524' },
    desc: '3회 연쇄.'
  },
  {
    key: 'dark_support_un5', name: '검은 축복자', rarity: 'uncommon', cls: 'support', elem: 'dark', dmg: 12, spd: 1, rng: 2.6, proj: 'ball', aura: { type: 'rng', amt: 0.13, radius: 2 }, curse: 0.19,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'none', weapon: 'tome', skin: '#c89268', hairCol: '#8e5b9e' },
    desc: '저주 · 사거리 오라 +13%.'
  },
  {
    key: 'void_bard_un6', name: '공허 전율자', rarity: 'uncommon', cls: 'bard', elem: 'void', dmg: 12, spd: 1.49, rng: 2.8, proj: 'ball', aura: { type: 'rng', amt: 0.1, radius: 3 }, pen: 0.23,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'none', weapon: 'harp', skin: '#b9825a', hairCol: '#3a2a1a' },
    desc: '방어 23% 관통 · 사거리 오라 +10%.'
  },
  {
    key: 'blood_summoner_un7', name: '선혈 조련사', rarity: 'uncommon', cls: 'summoner', elem: 'blood', dmg: 13, spd: 0.91, rng: 3.1, proj: 'ball', summon: { count: 1, dmg: 4, spd: 1.2 }, lifesteal: 0.14,
    look: { legs: 'float', torso: 'cloak', head: 'human', hair: 'pony', gear: 'none', weapon: 'staff', skin: '#f2d0ad', hairCol: '#d94f4f' },
    desc: '흡혈 · 정령 1기 소환.'
  },
  {
    key: 'fire_engineer_un8', name: '용광로 장인', rarity: 'uncommon', cls: 'engineer', elem: 'fire', dmg: 18, spd: 1.37, rng: 3.4, proj: 'bolt', splash: 0.83,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'pony', gear: 'none', weapon: 'drone', skin: '#f2d0ad', hairCol: '#6b4a2a' },
    desc: '범위 폭발.'
  },
  {
    key: 'poison_warlock_un9', name: '농창 흑마법사', rarity: 'uncommon', cls: 'warlock', elem: 'poison', dmg: 19, spd: 1.08, rng: 3.1, proj: 'ball', poison: { dps: 0.19, dur: 4, stack: 2 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'none', weapon: 'wand', skin: '#f2d0ad', hairCol: '#6b4a2a' },
    desc: '중독.'
  },
  {
    key: 'nature_archer_un10', name: '초원 사궁', rarity: 'uncommon', cls: 'archer', elem: 'nature', dmg: 13, spd: 1.46, rng: 3.4, proj: 'arrow', crit: 0.1, critMul: 2.1,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'crossbow', skin: '#ffe0c0', hairCol: '#6b4a2a' },
    desc: '치명 10%.'
  },
  {
    key: 'earth_sniper_un11', name: '암반 응시자', rarity: 'uncommon', cls: 'sniper', elem: 'earth', dmg: 29, spd: 0.65, rng: 5.6, proj: 'arrow', pen: 0.18,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'short', gear: 'none', weapon: 'rifle', skin: '#c89268', hairCol: '#c9a227' },
    desc: '방어 18% 관통.'
  },
  {
    key: 'phys_mage_un12', name: '백년 사도', rarity: 'uncommon', cls: 'mage', elem: 'phys', dmg: 22, spd: 0.82, rng: 3.3, proj: 'ball', splash: 0.88,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'braid', gear: 'none', weapon: 'wand', skin: '#e8bf95', hairCol: '#8a5a3a' },
    desc: '범위 폭발.'
  },
  {
    key: 'thunder_artillery_un13', name: '낙뢰 척탄병', rarity: 'uncommon', cls: 'artillery', elem: 'thunder', dmg: 41, spd: 0.46, rng: 3.3, proj: 'bomb', splash: 0.64,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'long', gear: 'none', weapon: 'launcher', skin: '#ffe0c0', hairCol: '#3a2a1a' },
    desc: '범위 폭발.'
  },
  {
    key: 'dark_guardian_un14', name: '그믐 중갑병', rarity: 'uncommon', cls: 'guardian', elem: 'dark', dmg: 29, spd: 0.91, rng: 1.9, proj: 'none', pen: 0.18,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'pony', gear: 'none', weapon: 'hammer', skin: '#e8bf95', hairCol: '#8e5b9e' },
    desc: '방어 18% 관통.'
  },
  {
    key: 'void_assassin_un15', name: '무형 단검술사', rarity: 'uncommon', cls: 'assassin', elem: 'void', dmg: 23, spd: 2.13, rng: 1.9, proj: 'none', crit: 0.11, critMul: 2.2,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'pony', gear: 'none', weapon: 'chakram', skin: '#d9a978', hairCol: '#8a5a3a' },
    desc: '치명 11%.'
  },
  {
    key: 'blood_support_un16', name: '낭자한 수도자', rarity: 'uncommon', cls: 'support', elem: 'blood', dmg: 13, spd: 1.05, rng: 2.6, proj: 'ball', aura: { type: 'gold', amt: 0.14, radius: 4 }, lifesteal: 0.12,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'none', weapon: 'staff', skin: '#ffe0c0', hairCol: '#c9a227' },
    desc: '흡혈 · 골드 오라 +14%.'
  },
  {
    key: 'fire_bard_un17', name: '연옥 가인', rarity: 'uncommon', cls: 'bard', elem: 'fire', dmg: 15, spd: 1.66, rng: 2.8, proj: 'ball', aura: { type: 'dmg', amt: 0.19, radius: 4 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'none', weapon: 'banner', skin: '#f2d0ad', hairCol: '#8e5b9e' },
    desc: '공격력 오라 +19%.'
  },
  {
    key: 'poison_summoner_un18', name: '창백한 군주', rarity: 'uncommon', cls: 'summoner', elem: 'poison', dmg: 23, spd: 1.04, rng: 3.2, proj: 'ball', summon: { count: 1, dmg: 7, spd: 1.2 }, poison: { dps: 0.23, dur: 7, stack: 6 },
    look: { legs: 'float', torso: 'robe', head: 'human', hair: 'long', gear: 'none', weapon: 'staff', skin: '#f0c9a0', hairCol: '#4a3524' },
    desc: '중독 · 정령 1기 소환.'
  },
  {
    key: 'nature_engineer_un19', name: '이끼 조립공', rarity: 'uncommon', cls: 'engineer', elem: 'nature', dmg: 28, spd: 1.13, rng: 3.2, proj: 'bolt', splash: 0.89,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'spiky', gear: 'none', weapon: 'drone', skin: '#ffe0c0', hairCol: '#3a2a1a' },
    desc: '범위 폭발.'
  },
  {
    key: 'wind_warlock_un20', name: '유랑 역술사', rarity: 'uncommon', cls: 'warlock', elem: 'wind', dmg: 28, spd: 1.08, rng: 3.4, proj: 'ball', poison: { dps: 0.28, dur: 4, stack: 2 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'pony', gear: 'none', weapon: 'scythe', skin: '#ffe0c0', hairCol: '#4a3524' },
    desc: '중독.'
  },
  {
    key: 'time_archer_un21', name: '정지된 사수', rarity: 'uncommon', cls: 'archer', elem: 'time', dmg: 20, spd: 1.87, rng: 3.4, proj: 'arrow',
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'none', weapon: 'bow', skin: '#f2d0ad', hairCol: '#c9a227' },
    desc: '견실한 기본기.'
  },
  {
    key: 'thunder_sniper_un22', name: '폭뢰 명사수', rarity: 'uncommon', cls: 'sniper', elem: 'thunder', dmg: 44, spd: 0.42, rng: 5.7, proj: 'arrow', pen: 0.14,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'none', weapon: 'crossbow', skin: '#e8bf95', hairCol: '#3a2a1a' },
    desc: '방어 14% 관통.'
  },
  {
    key: 'dark_mage_un23', name: '그림자 현자', rarity: 'uncommon', cls: 'mage', elem: 'dark', dmg: 31, spd: 0.99, rng: 3.3, proj: 'ball',
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'none', weapon: 'wand', skin: '#f2d0ad', hairCol: '#3a2a1a' },
    desc: '견실한 기본기.'
  },
  {
    key: 'void_artillery_un24', name: '공동 파쇄자', rarity: 'uncommon', cls: 'artillery', elem: 'void', dmg: 46, spd: 0.75, rng: 3.2, proj: 'bomb', pen: 0.49,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'braid', gear: 'none', weapon: 'launcher', skin: '#f0c9a0', hairCol: '#8e5b9e' },
    desc: '방어 49% 관통.'
  },
  {
    key: 'blood_guardian_un25', name: '혈맹 수호자', rarity: 'uncommon', cls: 'guardian', elem: 'blood', dmg: 40, spd: 1.05, rng: 1.8, proj: 'none', pen: 0.15,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'spiky', gear: 'none', weapon: 'sword', skin: '#ffe0c0', hairCol: '#3a2a1a' },
    desc: '방어 15% 관통.'
  },
  {
    key: 'fire_assassin_un26', name: '화염 척살자', rarity: 'uncommon', cls: 'assassin', elem: 'fire', dmg: 32, spd: 2.49, rng: 2, proj: 'none', crit: 0.19, critMul: 2,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'none', weapon: 'claw', skin: '#c89268', hairCol: '#8a5a3a' },
    desc: '치명 19%.'
  },
  {
    key: 'poison_support_un27', name: '맹독 축복자', rarity: 'uncommon', cls: 'support', elem: 'poison', dmg: 21, spd: 0.93, rng: 2.7, proj: 'ball', aura: { type: 'dmg', amt: 0.18, radius: 3 }, poison: { dps: 0.21, dur: 5, stack: 3 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'none', weapon: 'flask', skin: '#b9825a', hairCol: '#d94f4f' },
    desc: '중독 · 공격력 오라 +18%.'
  },
  {
    key: 'nature_bard_un28', name: '야생 선창자', rarity: 'uncommon', cls: 'bard', elem: 'nature', dmg: 20, spd: 1.47, rng: 3.1, proj: 'ball', aura: { type: 'gold', amt: 0.12, radius: 3 }, regen: 0.06,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'none', weapon: 'harp', skin: '#e8bf95', hairCol: '#8e5b9e' },
    desc: '생명 재생 · 골드 오라 +12%.'
  },
  {
    key: 'wind_summoner_un29', name: '창공 소환사', rarity: 'uncommon', cls: 'summoner', elem: 'wind', dmg: 32, spd: 0.78, rng: 2.9, proj: 'ball', summon: { count: 1, dmg: 10, spd: 1.2 }, multishot: 2,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'none', weapon: 'orb', skin: '#c89268', hairCol: '#6b4a2a' },
    desc: '2연사 · 정령 1기 소환.'
  },
  {
    key: 'time_engineer_un30', name: '태엽 기계공', rarity: 'uncommon', cls: 'engineer', elem: 'time', dmg: 38, spd: 1.41, rng: 3.4, proj: 'bolt', splash: 0.62,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'short', gear: 'none', weapon: 'drone', skin: '#c89268', hairCol: '#8a5a3a' },
    desc: '범위 폭발.'
  },
  {
    key: 'ice_warlock_un31', name: '설야 역술사', rarity: 'uncommon', cls: 'warlock', elem: 'ice', dmg: 40, spd: 1.13, rng: 3.1, proj: 'ball', poison: { dps: 0.4, dur: 6, stack: 2 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'none', weapon: 'tome', skin: '#d9a978', hairCol: '#4a3524' },
    desc: '중독.'
  },
  {
    key: 'holy_archer_un32', name: '성역 궁수', rarity: 'uncommon', cls: 'archer', elem: 'holy', dmg: 29, spd: 1.48, rng: 3.4, proj: 'arrow', crit: 0.19, critMul: 2.1,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'none', weapon: 'bow', skin: '#f2d0ad', hairCol: '#6b4a2a' },
    desc: '치명 19%.'
  },
  {
    key: 'void_sniper_un33', name: '침묵 응시자', rarity: 'uncommon', cls: 'sniper', elem: 'void', dmg: 46, spd: 0.72, rng: 5.7, proj: 'arrow', pen: 0.16,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'rifle', skin: '#f0c9a0', hairCol: '#8e5b9e' },
    desc: '방어 16% 관통.'
  },
  /* ------- 생성 : rare ------- */
  {
    key: 'wind_mage_ra0', name: '바람 술사', rarity: 'rare', cls: 'mage', elem: 'wind', dmg: 28, spd: 1.31, rng: 3.2, proj: 'ball', splash: 0.61,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'none', weapon: 'staff', skin: '#d9a978', hairCol: '#6b4a2a' },
    desc: '범위 폭발.'
  },
  {
    key: 'time_artillery_ra1', name: '시간 포격수', rarity: 'rare', cls: 'artillery', elem: 'time', dmg: 45, spd: 0.78, rng: 3.6, proj: 'bomb', splash: 0.78, slow: 0.27,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'cannon', skin: '#ffe0c0', hairCol: '#4a3524' },
    desc: '범위 폭발 · 둔화 27%.'
  },
  {
    key: 'ice_guardian_ra2', name: '눈보라 파수꾼', rarity: 'rare', cls: 'guardian', elem: 'ice', dmg: 30, spd: 1.22, rng: 2, proj: 'none', pen: 0.17,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'spiky', gear: 'none', weapon: 'halberd', skin: '#f2d0ad', hairCol: '#d94f4f' },
    desc: '방어 17% 관통.'
  },
  {
    key: 'holy_assassin_ra3', name: '신성 그림자', rarity: 'rare', cls: 'assassin', elem: 'holy', dmg: 27, spd: 2.23, rng: 2.1, proj: 'none', holyBonus: 0.48,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'none', weapon: 'claw', skin: '#c89268', hairCol: '#6b4a2a' },
    desc: '견실한 기본기.'
  },
  {
    key: 'arcane_support_ra4', name: '주문 조율사', rarity: 'rare', cls: 'support', elem: 'arcane', dmg: 26, spd: 1.2, rng: 2.9, proj: 'ball', aura: { type: 'spd', amt: 0.15, radius: 4 }, pen: 0.18,
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'pony', gear: 'none', weapon: 'tome', skin: '#f2d0ad', hairCol: '#3a2a1a' },
    desc: '방어 18% 관통 · 공속 오라 +15%.'
  },
  {
    key: 'earth_bard_ra5', name: '바위 전율자', rarity: 'rare', cls: 'bard', elem: 'earth', dmg: 26, spd: 1.46, rng: 3.1, proj: 'ball', aura: { type: 'dmg', amt: 0.16, radius: 4 }, stun: 0.12,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'none', weapon: 'harp', skin: '#ffe0c0', hairCol: '#8e5b9e' },
    desc: '기절 · 공격력 오라 +16%.'
  },
  {
    key: 'phys_summoner_ra6', name: '맹진 군주', rarity: 'rare', cls: 'summoner', elem: 'phys', dmg: 28, spd: 0.8, rng: 2.9, proj: 'ball', summon: { count: 2, dmg: 8, spd: 1.2 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'short', gear: 'none', weapon: 'tome', skin: '#b9825a', hairCol: '#3a2a1a' },
    desc: '정령 2기 소환.'
  },
  {
    key: 'thunder_engineer_ra7', name: '천둥 설계자', rarity: 'rare', cls: 'engineer', elem: 'thunder', dmg: 38, spd: 1.38, rng: 3.4, proj: 'bolt',
    look: { legs: 'biped', torso: 'core', head: 'human', hair: 'short', gear: 'none', weapon: 'rifle', skin: '#ffe0c0', hairCol: '#c9a227' },
    desc: '견실한 기본기.'
  },
  {
    key: 'dark_warlock_ra8', name: '심연 금술사', rarity: 'rare', cls: 'warlock', elem: 'dark', dmg: 36, spd: 1.08, rng: 3.1, proj: 'ball', poison: { dps: 0.36, dur: 4, stack: 3 }, curse: 0.09,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'none', weapon: 'scythe', skin: '#c89268', hairCol: '#6b4a2a' },
    desc: '중독 · 저주.'
  },
  {
    key: 'void_archer_ra9', name: '무형 활잡이', rarity: 'rare', cls: 'archer', elem: 'void', dmg: 26, spd: 1.4, rng: 3.5, proj: 'arrow', pen: 0.29,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'none', weapon: 'bow', skin: '#f0c9a0', hairCol: '#4a3524' },
    desc: '방어 29% 관통.'
  },
  {
    key: 'blood_sniper_ra10', name: '붉은 장궁병', rarity: 'rare', cls: 'sniper', elem: 'blood', dmg: 57, spd: 0.77, rng: 5.7, proj: 'arrow', crit: 0.1, critMul: 1.9, lifesteal: 0.16,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'none', weapon: 'crossbow', skin: '#e8bf95', hairCol: '#8e5b9e' },
    desc: '치명 10% · 흡혈.'
  },
  {
    key: 'ice_mage_ra11', name: '서리 마법사', rarity: 'rare', cls: 'mage', elem: 'ice', dmg: 41, spd: 1.3, rng: 3.5, proj: 'ball', slow: 0.24,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'pony', gear: 'none', weapon: 'wand', skin: '#d9a978', hairCol: '#8a5a3a' },
    desc: '둔화 24%.'
  },
  {
    key: 'holy_artillery_ra12', name: '서광 파쇄자', rarity: 'rare', cls: 'artillery', elem: 'holy', dmg: 69, spd: 0.62, rng: 3.2, proj: 'bomb', splash: 0.9, holyBonus: 0.37,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'none', weapon: 'sling', skin: '#b9825a', hairCol: '#8e5b9e' },
    desc: '범위 폭발.'
  },
  {
    key: 'arcane_guardian_ra13', name: '술식 수호자', rarity: 'rare', cls: 'guardian', elem: 'arcane', dmg: 52, spd: 0.93, rng: 2, proj: 'none', pen: 0.18, crit: 0.14, critMul: 2.3,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'braid', gear: 'none', weapon: 'hammer', skin: '#ffe0c0', hairCol: '#6b4a2a' },
    desc: '방어 18% 관통 · 치명 14%.'
  },
  {
    key: 'earth_assassin_ra14', name: '대지 암살자', rarity: 'rare', cls: 'assassin', elem: 'earth', dmg: 41, spd: 2.02, rng: 1.8, proj: 'none', crit: 0.11, critMul: 2, stun: 0.06,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'none', weapon: 'chakram', skin: '#d9a978', hairCol: '#2b2b33' },
    desc: '치명 11% · 기절.'
  },
  {
    key: 'phys_support_ra15', name: '역전의 축복자', rarity: 'rare', cls: 'support', elem: 'phys', dmg: 26, spd: 1.09, rng: 3, proj: 'ball', aura: { type: 'gold', amt: 0.17, radius: 3 },
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'braid', gear: 'none', weapon: 'flask', skin: '#e8bf95', hairCol: '#6b4a2a' },
    desc: '골드 오라 +17%.'
  },
  {
    key: 'thunder_bard_ra16', name: '번개 음유시인', rarity: 'rare', cls: 'bard', elem: 'thunder', dmg: 29, spd: 1.27, rng: 2.9, proj: 'ball', aura: { type: 'gold', amt: 0.21, radius: 3 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'none', weapon: 'banner', skin: '#c89268', hairCol: '#8e5b9e' },
    desc: '골드 오라 +21%.'
  },
  {
    key: 'dark_summoner_ra17', name: '심연 사역자', rarity: 'rare', cls: 'summoner', elem: 'dark', dmg: 41, spd: 0.97, rng: 3.1, proj: 'ball', summon: { count: 2, dmg: 12, spd: 1.2 }, curse: 0.16,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'none', weapon: 'tome', skin: '#c89268', hairCol: '#6b4a2a' },
    desc: '저주 · 정령 2기 소환.'
  },
  {
    key: 'void_engineer_ra18', name: '허공 조립공', rarity: 'rare', cls: 'engineer', elem: 'void', dmg: 52, spd: 1.03, rng: 3.4, proj: 'bolt', splash: 0.63,
    look: { legs: 'biped', torso: 'core', head: 'human', hair: 'braid', gear: 'none', weapon: 'drone', skin: '#ffe0c0', hairCol: '#2b2b33' },
    desc: '범위 폭발.'
  },
  {
    key: 'blood_warlock_ra19', name: '적혈 주박사', rarity: 'rare', cls: 'warlock', elem: 'blood', dmg: 52, spd: 0.85, rng: 3.4, proj: 'ball', poison: { dps: 0.52, dur: 6, stack: 3 }, curse: 0.09,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'none', weapon: 'tome', skin: '#e8bf95', hairCol: '#d94f4f' },
    desc: '중독 · 저주.'
  },
  {
    key: 'fire_archer_ra20', name: '섬화 사궁', rarity: 'rare', cls: 'archer', elem: 'fire', dmg: 42, spd: 1.41, rng: 3.3, proj: 'arrow', multishot: 2, crit: 0.15, critMul: 2.3,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'none', weapon: 'crossbow', skin: '#b9825a', hairCol: '#4a3524' },
    desc: '치명 15% · 2연사.'
  },
  {
    key: 'poison_sniper_ra21', name: '부식 조준자', rarity: 'rare', cls: 'sniper', elem: 'poison', dmg: 88, spd: 0.67, rng: 6, proj: 'arrow',
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'pony', gear: 'none', weapon: 'rifle', skin: '#f2d0ad', hairCol: '#2b2b33' },
    desc: '견실한 기본기.'
  },
  {
    key: 'arcane_mage_ra22', name: '오의 마법사', rarity: 'rare', cls: 'mage', elem: 'arcane', dmg: 58, spd: 0.87, rng: 3.5, proj: 'ball', splash: 0.76,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'none', weapon: 'staff', skin: '#e8bf95', hairCol: '#4a3524' },
    desc: '범위 폭발.'
  },
  {
    key: 'earth_artillery_ra23', name: '대지 파쇄자', rarity: 'rare', cls: 'artillery', elem: 'earth', dmg: 95, spd: 0.54, rng: 3.6, proj: 'bomb', stun: 0.13,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'sling', skin: '#e8bf95', hairCol: '#4a3524' },
    desc: '기절.'
  },
  {
    key: 'phys_guardian_ra24', name: '강철 파수꾼', rarity: 'rare', cls: 'guardian', elem: 'phys', dmg: 67, spd: 1.04, rng: 2, proj: 'none', pen: 0.16, crit: 0.12, critMul: 2.3,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'spiky', gear: 'none', weapon: 'halberd', skin: '#ffe0c0', hairCol: '#c9a227' },
    desc: '방어 16% 관통 · 치명 12%.'
  },
  {
    key: 'thunder_assassin_ra25', name: '낙뢰 그림자', rarity: 'rare', cls: 'assassin', elem: 'thunder', dmg: 55, spd: 2.15, rng: 1.8, proj: 'none', crit: 0.14, critMul: 2,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'chakram', skin: '#e8bf95', hairCol: '#2b2b33' },
    desc: '치명 14%.'
  },
  {
    key: 'dark_support_ra26', name: '흑야 성직자', rarity: 'rare', cls: 'support', elem: 'dark', dmg: 34, spd: 1.2, rng: 2.7, proj: 'ball', aura: { type: 'dmg', amt: 0.15, radius: 4 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'braid', gear: 'none', weapon: 'tome', skin: '#b9825a', hairCol: '#4a3524' },
    desc: '공격력 오라 +15%.'
  },
  {
    key: 'void_bard_ra27', name: '공동 전율자', rarity: 'rare', cls: 'bard', elem: 'void', dmg: 36, spd: 1.44, rng: 3.2, proj: 'ball', aura: { type: 'spd', amt: 0.08, radius: 2 }, pen: 0.21,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'pony', gear: 'none', weapon: 'harp', skin: '#b9825a', hairCol: '#d94f4f' },
    desc: '방어 21% 관통 · 공속 오라 +8%.'
  },
  {
    key: 'blood_summoner_ra28', name: '진홍 지배자', rarity: 'rare', cls: 'summoner', elem: 'blood', dmg: 52, spd: 1.19, rng: 3.3, proj: 'ball', summon: { count: 2, dmg: 16, spd: 1.2 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'none', weapon: 'tome', skin: '#f0c9a0', hairCol: '#d94f4f' },
    desc: '정령 2기 소환.'
  },
  {
    key: 'fire_engineer_ra29', name: '연옥 설계자', rarity: 'rare', cls: 'engineer', elem: 'fire', dmg: 71, spd: 1.26, rng: 3.5, proj: 'bolt', splash: 0.9,
    look: { legs: 'biped', torso: 'core', head: 'human', hair: 'short', gear: 'none', weapon: 'flask', skin: '#d9a978', hairCol: '#c9a227' },
    desc: '범위 폭발.'
  },
  {
    key: 'poison_warlock_ra30', name: '맹독 역술사', rarity: 'rare', cls: 'warlock', elem: 'poison', dmg: 62, spd: 0.97, rng: 3.2, proj: 'ball', poison: { dps: 0.62, dur: 6, stack: 3 }, curse: 0.12,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'braid', gear: 'none', weapon: 'scythe', skin: '#d9a978', hairCol: '#8a5a3a' },
    desc: '중독 · 저주.'
  },
  {
    key: 'nature_archer_ra31', name: '이끼 연사수', rarity: 'rare', cls: 'archer', elem: 'nature', dmg: 52, spd: 1.7, rng: 3.4, proj: 'arrow',
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'pony', gear: 'none', weapon: 'bow', skin: '#ffe0c0', hairCol: '#6b4a2a' },
    desc: '견실한 기본기.'
  },
  {
    key: 'wind_sniper_ra32', name: '질풍 응시자', rarity: 'rare', cls: 'sniper', elem: 'wind', dmg: 96, spd: 0.61, rng: 5.7, proj: 'arrow', pen: 0.25, pierce: 2,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'spiky', gear: 'none', weapon: 'crossbow', skin: '#f2d0ad', hairCol: '#c9a227' },
    desc: '방어 25% 관통 · 관통 사격.'
  },
  {
    key: 'phys_mage_ra33', name: '강철 마법사', rarity: 'rare', cls: 'mage', elem: 'phys', dmg: 87, spd: 0.88, rng: 3.3, proj: 'ball', splash: 0.96,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'none', weapon: 'staff', skin: '#f2d0ad', hairCol: '#6b4a2a' },
    desc: '범위 폭발.'
  },
  {
    key: 'thunder_artillery_ra34', name: '천둥 포격수', rarity: 'rare', cls: 'artillery', elem: 'thunder', dmg: 96, spd: 0.51, rng: 3.3, proj: 'bomb', splash: 0.79, chain: 3,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'braid', gear: 'none', weapon: 'cannon', skin: '#b9825a', hairCol: '#d94f4f' },
    desc: '범위 폭발 · 3회 연쇄.'
  },
  {
    key: 'dark_guardian_ra35', name: '심연 파수꾼', rarity: 'rare', cls: 'guardian', elem: 'dark', dmg: 93, spd: 1.19, rng: 2.1, proj: 'none', pen: 0.26, crit: 0.19, critMul: 2.4,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'braid', gear: 'none', weapon: 'halberd', skin: '#f0c9a0', hairCol: '#8e5b9e' },
    desc: '방어 26% 관통 · 치명 19%.'
  },
  {
    key: 'void_assassin_ra36', name: '차원 척살자', rarity: 'rare', cls: 'assassin', elem: 'void', dmg: 74, spd: 2.23, rng: 2, proj: 'none', crit: 0.22, critMul: 2.4, pen: 0.28,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'none', weapon: 'dagger', skin: '#ffe0c0', hairCol: '#2b2b33' },
    desc: '방어 28% 관통 · 치명 22%.'
  },
  {
    key: 'blood_support_ra37', name: '혈맹 조율사', rarity: 'rare', cls: 'support', elem: 'blood', dmg: 46, spd: 1.29, rng: 2.7, proj: 'ball', aura: { type: 'dmg', amt: 0.18, radius: 4 }, lifesteal: 0.07,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'none', weapon: 'tome', skin: '#f0c9a0', hairCol: '#d94f4f' },
    desc: '흡혈 · 공격력 오라 +18%.'
  },
  {
    key: 'fire_bard_ra38', name: '홍염 연주자', rarity: 'rare', cls: 'bard', elem: 'fire', dmg: 44, spd: 1.37, rng: 3, proj: 'ball', aura: { type: 'dmg', amt: 0.19, radius: 4 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'none', weapon: 'banner', skin: '#f2d0ad', hairCol: '#c9a227' },
    desc: '공격력 오라 +19%.'
  },
  {
    key: 'poison_summoner_ra39', name: '괴저 지배자', rarity: 'rare', cls: 'summoner', elem: 'poison', dmg: 73, spd: 1.13, rng: 3.3, proj: 'ball', summon: { count: 2, dmg: 22, spd: 1.2 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'none', weapon: 'staff', skin: '#e8bf95', hairCol: '#6b4a2a' },
    desc: '정령 2기 소환.'
  },
  {
    key: 'nature_engineer_ra40', name: '야생 기계공', rarity: 'rare', cls: 'engineer', elem: 'nature', dmg: 88, spd: 1.35, rng: 3.4, proj: 'bolt', multishot: 2, splash: 0.97,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'spiky', gear: 'none', weapon: 'rifle', skin: '#e8bf95', hairCol: '#d94f4f' },
    desc: '범위 폭발 · 2연사.'
  },
  {
    key: 'wind_warlock_ra41', name: '유랑 흑마법사', rarity: 'rare', cls: 'warlock', elem: 'wind', dmg: 90, spd: 1.06, rng: 3.4, proj: 'ball', poison: { dps: 0.9, dur: 6, stack: 3 }, curse: 0.11,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'none', weapon: 'tome', skin: '#f2d0ad', hairCol: '#4a3524' },
    desc: '중독 · 저주.'
  },
  /* ------- 생성 : epic ------- */
  {
    key: 'fire_artillery_ep0', name: '숙련 불티 포격수', rarity: 'epic', cls: 'artillery', elem: 'fire', dmg: 105, spd: 0.61, rng: 3.1, proj: 'bomb', splash: 0.69, stun: 0.09,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'spiky', gear: 'hood', weapon: 'cannon', skin: '#f2d0ad', hairCol: '#c9a227' },
    desc: '범위 폭발 · 기절.'
  },
  {
    key: 'poison_guardian_ep1', name: '상급 역병 방패병', rarity: 'epic', cls: 'guardian', elem: 'poison', dmg: 68, spd: 1.28, rng: 2, proj: 'none', pen: 0.24, crit: 0.27, critMul: 2.6,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'short', gear: 'mask', weapon: 'axe', skin: '#b9825a', hairCol: '#3a2a1a' },
    desc: '방어 24% 관통 · 치명 27%.'
  },
  {
    key: 'nature_assassin_ep2', name: '대지의 암살자', rarity: 'epic', cls: 'assassin', elem: 'nature', dmg: 60, spd: 1.94, rng: 2.2, proj: 'none', crit: 0.27, critMul: 2.4, regen: 0.06,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'short', gear: 'antlers', weapon: 'claw', skin: '#f2d0ad', hairCol: '#8a5a3a' },
    desc: '치명 27% · 생명 재생.'
  },
  {
    key: 'wind_support_ep3', name: '바람 조율사', rarity: 'epic', cls: 'support', elem: 'wind', dmg: 60, spd: 1.35, rng: 3, proj: 'ball', aura: { type: 'spd', amt: 0.22, radius: 3 }, multishot: 2,
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'short', gear: 'horns', weapon: 'flask', skin: '#d9a978', hairCol: '#c9a227' },
    desc: '2연사 · 공속 오라 +22%.'
  },
  {
    key: 'time_bard_ep4', name: '숙련 모래시계 악사', rarity: 'epic', cls: 'bard', elem: 'time', dmg: 60, spd: 1.45, rng: 3, proj: 'ball', aura: { type: 'dmg', amt: 0.18, radius: 4 }, slow: 0.19,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'halo', weapon: 'banner', skin: '#e8bf95', hairCol: '#c9a227' },
    desc: '둔화 19% · 공격력 오라 +18%.'
  },
  {
    key: 'ice_summoner_ep5', name: '상급 한기 사역자', rarity: 'epic', cls: 'summoner', elem: 'ice', dmg: 63, spd: 0.74, rng: 2.9, proj: 'ball', summon: { count: 2, dmg: 19, spd: 1.2 }, slow: 0.24,
    look: { legs: 'float', torso: 'cloak', head: 'human', hair: 'pony', gear: 'antlers', weapon: 'staff', skin: '#f0c9a0', hairCol: '#d94f4f' },
    desc: '둔화 24% · 정령 2기 소환.'
  },
  {
    key: 'holy_engineer_ep6', name: '천상 장인', rarity: 'epic', cls: 'engineer', elem: 'holy', dmg: 76, spd: 1.07, rng: 3.3, proj: 'bolt', splash: 0.74, holyBonus: 0.27,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'short', gear: 'mask', weapon: 'flask', skin: '#f0c9a0', hairCol: '#8a5a3a' },
    desc: '범위 폭발.'
  },
  {
    key: 'arcane_warlock_ep7', name: '상급 주문 마령술사', rarity: 'epic', cls: 'warlock', elem: 'arcane', dmg: 72, spd: 0.97, rng: 3, proj: 'ball', poison: { dps: 0.72, dur: 5, stack: 3 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'pony', gear: 'crown', weapon: 'tome', skin: '#f0c9a0', hairCol: '#2b2b33' },
    desc: '중독.'
  },
  {
    key: 'earth_archer_ep8', name: '숙련 바위 연사수', rarity: 'epic', cls: 'archer', elem: 'earth', dmg: 60, spd: 1.82, rng: 4, proj: 'arrow', multishot: 2, crit: 0.15, critMul: 1.8,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'spiky', gear: 'mask', weapon: 'crossbow', skin: '#ffe0c0', hairCol: '#c9a227' },
    desc: '치명 15% · 2연사.'
  },
  {
    key: 'phys_sniper_ep9', name: '숙련 무쇠 명사수', rarity: 'epic', cls: 'sniper', elem: 'phys', dmg: 135, spd: 0.67, rng: 7.4, proj: 'arrow', pen: 0.15, pierce: 2,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'horns', weapon: 'rifle', skin: '#ffe0c0', hairCol: '#8e5b9e' },
    desc: '방어 15% 관통 · 관통 사격.'
  },
  {
    key: 'thunder_mage_ep10', name: '전광 사도', rarity: 'epic', cls: 'mage', elem: 'thunder', dmg: 92, spd: 0.99, rng: 3.1, proj: 'ball', splash: 0.73, chain: 3,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'antlers', weapon: 'orb', skin: '#b9825a', hairCol: '#3a2a1a' },
    desc: '범위 폭발 · 3회 연쇄.'
  },
  {
    key: 'nature_artillery_ep11', name: '숙련 푸른 포격수', rarity: 'epic', cls: 'artillery', elem: 'nature', dmg: 170, spd: 0.53, rng: 3.1, proj: 'bomb', splash: 0.64,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'antlers', weapon: 'launcher', skin: '#f0c9a0', hairCol: '#6b4a2a' },
    desc: '범위 폭발.'
  },
  {
    key: 'wind_guardian_ep12', name: '숙련 창공 검사', rarity: 'epic', cls: 'guardian', elem: 'wind', dmg: 110, spd: 0.89, rng: 1.8, proj: 'none', pen: 0.19, crit: 0.15, critMul: 2.6,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'pony', gear: 'antlers', weapon: 'greatsword', skin: '#b9825a', hairCol: '#4a3524' },
    desc: '방어 19% 관통 · 치명 15%.'
  },
  {
    key: 'time_assassin_ep13', name: '상급 모래시계 밀정', rarity: 'epic', cls: 'assassin', elem: 'time', dmg: 89, spd: 1.87, rng: 1.9, proj: 'none', crit: 0.25, critMul: 2.2, execute: 0.11,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'short', gear: 'crown', weapon: 'claw', skin: '#b9825a', hairCol: '#c9a227' },
    desc: '치명 25% · 처형.'
  },
  {
    key: 'ice_support_ep14', name: '숙련 삭풍 수도자', rarity: 'epic', cls: 'support', elem: 'ice', dmg: 60, spd: 1.16, rng: 2.9, proj: 'ball', aura: { type: 'spd', amt: 0.09, radius: 3 }, slow: 0.37,
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'spiky', gear: 'mask', weapon: 'tome', skin: '#e8bf95', hairCol: '#6b4a2a' },
    desc: '둔화 37% · 공속 오라 +9%.'
  },
  {
    key: 'holy_bard_ep15', name: '서광 선창자', rarity: 'epic', cls: 'bard', elem: 'holy', dmg: 62, spd: 1.14, rng: 3.3, proj: 'ball', aura: { type: 'rng', amt: 0.15, radius: 3 }, holyBonus: 0.46,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'braid', gear: 'crown', weapon: 'banner', skin: '#b9825a', hairCol: '#2b2b33' },
    desc: '사거리 오라 +15%.'
  },
  {
    key: 'arcane_summoner_ep16', name: '오의 조련사', rarity: 'epic', cls: 'summoner', elem: 'arcane', dmg: 98, spd: 0.91, rng: 3, proj: 'ball', summon: { count: 2, dmg: 29, spd: 1.2 }, pen: 0.24,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'horns', weapon: 'tome', skin: '#f0c9a0', hairCol: '#8a5a3a' },
    desc: '방어 24% 관통 · 정령 2기 소환.'
  },
  {
    key: 'earth_engineer_ep17', name: '산악 기계공', rarity: 'epic', cls: 'engineer', elem: 'earth', dmg: 110, spd: 1.35, rng: 3.5, proj: 'bolt', stun: 0.12,
    look: { legs: 'biped', torso: 'core', head: 'human', hair: 'pony', gear: 'halo', weapon: 'rifle', skin: '#b9825a', hairCol: '#2b2b33' },
    desc: '기절.'
  },
  {
    key: 'phys_warlock_ep18', name: '숙련 패도 금술사', rarity: 'epic', cls: 'warlock', elem: 'phys', dmg: 105, spd: 0.86, rng: 3.4, proj: 'ball',
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'crown', weapon: 'scythe', skin: '#f2d0ad', hairCol: '#2b2b33' },
    desc: '견실한 기본기.'
  },
  {
    key: 'thunder_archer_ep19', name: '상급 낙뢰 사수', rarity: 'epic', cls: 'archer', elem: 'thunder', dmg: 87, spd: 2.17, rng: 3.8, proj: 'arrow', chain: 3,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'mask', weapon: 'crossbow', skin: '#d9a978', hairCol: '#d94f4f' },
    desc: '3회 연쇄.'
  },
  {
    key: 'dark_sniper_ep20', name: '나락 관측수', rarity: 'epic', cls: 'sniper', elem: 'dark', dmg: 205, spd: 0.7, rng: 5.6, proj: 'arrow', pen: 0.13, curse: 0.17,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'pony', gear: 'hood', weapon: 'rifle', skin: '#e8bf95', hairCol: '#2b2b33' },
    desc: '방어 13% 관통 · 저주.'
  },
  {
    key: 'void_mage_ep21', name: '무저 술사', rarity: 'epic', cls: 'mage', elem: 'void', dmg: 125, spd: 1.28, rng: 3.2, proj: 'ball', splash: 0.77, pen: 0.31,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'pony', gear: 'hood', weapon: 'wand', skin: '#f0c9a0', hairCol: '#8e5b9e' },
    desc: '범위 폭발 · 방어 31% 관통.'
  },
  {
    key: 'time_artillery_ep22', name: '모래시계 포수', rarity: 'epic', cls: 'artillery', elem: 'time', dmg: 245, spd: 0.59, rng: 3.1, proj: 'bomb', splash: 0.86, slow: 0.2,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'spiky', gear: 'horns', weapon: 'sling', skin: '#c89268', hairCol: '#4a3524' },
    desc: '범위 폭발 · 둔화 20%.'
  },
  {
    key: 'ice_guardian_ep23', name: '숙련 설야 검사', rarity: 'epic', cls: 'guardian', elem: 'ice', dmg: 160, spd: 1.22, rng: 1.7, proj: 'none', pen: 0.35, crit: 0.24, critMul: 2.6,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'pony', gear: 'halo', weapon: 'greatsword', skin: '#e8bf95', hairCol: '#8a5a3a' },
    desc: '방어 35% 관통 · 치명 24%.'
  },
  {
    key: 'holy_assassin_ep24', name: '상급 신성 자객', rarity: 'epic', cls: 'assassin', elem: 'holy', dmg: 130, spd: 1.9, rng: 2, proj: 'none', crit: 0.15, critMul: 2, execute: 0.05,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'halo', weapon: 'chakram', skin: '#d9a978', hairCol: '#3a2a1a' },
    desc: '치명 15% · 처형.'
  },
  {
    key: 'arcane_support_ep25', name: '숙련 오의 성직자', rarity: 'epic', cls: 'support', elem: 'arcane', dmg: 79, spd: 1.27, rng: 2.8, proj: 'ball', aura: { type: 'spd', amt: 0.17, radius: 3 }, pen: 0.31,
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'long', gear: 'visor', weapon: 'flask', skin: '#c89268', hairCol: '#2b2b33' },
    desc: '방어 31% 관통 · 공속 오라 +17%.'
  },
  {
    key: 'earth_bard_ep26', name: '숙련 암반 연주자', rarity: 'epic', cls: 'bard', elem: 'earth', dmg: 77, spd: 1.38, rng: 2.9, proj: 'ball', aura: { type: 'dmg', amt: 0.17, radius: 3 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'antlers', weapon: 'harp', skin: '#b9825a', hairCol: '#8a5a3a' },
    desc: '공격력 오라 +17%.'
  },
  {
    key: 'phys_summoner_ep27', name: '상급 강철 조련사', rarity: 'epic', cls: 'summoner', elem: 'phys', dmg: 125, spd: 1.18, rng: 2.9, proj: 'ball', summon: { count: 2, dmg: 38, spd: 1.2 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'short', gear: 'antlers', weapon: 'tome', skin: '#f2d0ad', hairCol: '#4a3524' },
    desc: '정령 2기 소환.'
  },
  {
    key: 'thunder_engineer_ep28', name: '자전 정비사', rarity: 'epic', cls: 'engineer', elem: 'thunder', dmg: 170, spd: 1.08, rng: 3.3, proj: 'bolt', multishot: 2, splash: 1.05,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'pony', gear: 'halo', weapon: 'drone', skin: '#f2d0ad', hairCol: '#6b4a2a' },
    desc: '범위 폭발 · 2연사.'
  },
  {
    key: 'dark_warlock_ep29', name: '상급 암흑 금술사', rarity: 'epic', cls: 'warlock', elem: 'dark', dmg: 170, spd: 1.01, rng: 3.2, proj: 'ball', poison: { dps: 1.7, dur: 4, stack: 3 }, curse: 0.07,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'halo', weapon: 'tome', skin: '#ffe0c0', hairCol: '#c9a227' },
    desc: '중독 · 저주.'
  },
  {
    key: 'void_archer_ep30', name: '상급 공허 활잡이', rarity: 'epic', cls: 'archer', elem: 'void', dmg: 130, spd: 1.8, rng: 3.9, proj: 'arrow', crit: 0.13, critMul: 2.1, pen: 0.49,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'braid', gear: 'horns', weapon: 'bow', skin: '#e8bf95', hairCol: '#8a5a3a' },
    desc: '방어 49% 관통 · 치명 13%.'
  },
  {
    key: 'blood_sniper_ep31', name: '상급 진홍 저격수', rarity: 'epic', cls: 'sniper', elem: 'blood', dmg: 245, spd: 0.48, rng: 7, proj: 'arrow', pen: 0.13, pierce: 2,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'braid', gear: 'mask', weapon: 'crossbow', skin: '#e8bf95', hairCol: '#d94f4f' },
    desc: '방어 13% 관통 · 관통 사격.'
  },
  {
    key: 'fire_mage_ep32', name: '상급 불티 사도', rarity: 'epic', cls: 'mage', elem: 'fire', dmg: 180, spd: 1.2, rng: 3.2, proj: 'ball', splash: 0.97, burn: { dps: 2.16, dur: 4 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'hood', weapon: 'staff', skin: '#ffe0c0', hairCol: '#8a5a3a' },
    desc: '범위 폭발 · 화상.'
  },
  {
    key: 'holy_artillery_ep33', name: '숙련 성스러운 폭격수', rarity: 'epic', cls: 'artillery', elem: 'holy', dmg: 260, spd: 0.49, rng: 3.9, proj: 'bomb', splash: 0.92, holyBonus: 0.38,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'visor', weapon: 'cannon', skin: '#f2d0ad', hairCol: '#3a2a1a' },
    desc: '범위 폭발.'
  },
  {
    key: 'arcane_guardian_ep34', name: '숙련 주문 수호자', rarity: 'epic', cls: 'guardian', elem: 'arcane', dmg: 215, spd: 1.15, rng: 2, proj: 'none', pen: 0.31,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'long', gear: 'antlers', weapon: 'spear', skin: '#b9825a', hairCol: '#6b4a2a' },
    desc: '방어 31% 관통.'
  },
  {
    key: 'earth_assassin_ep35', name: '상급 융기 그림자', rarity: 'epic', cls: 'assassin', elem: 'earth', dmg: 165, spd: 2.21, rng: 1.9, proj: 'none', crit: 0.11, critMul: 2.2, execute: 0.06,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'spiky', gear: 'mask', weapon: 'dagger', skin: '#f2d0ad', hairCol: '#c9a227' },
    desc: '치명 11% · 처형.'
  },
  {
    key: 'phys_support_ep36', name: '숙련 역전의 조율사', rarity: 'epic', cls: 'support', elem: 'phys', dmg: 105, spd: 1.31, rng: 2.7, proj: 'ball', aura: { type: 'gold', amt: 0.11, radius: 3 },
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'long', gear: 'antlers', weapon: 'flask', skin: '#e8bf95', hairCol: '#8a5a3a' },
    desc: '골드 오라 +11%.'
  },
  {
    key: 'thunder_bard_ep37', name: '숙련 천둥 음유시인', rarity: 'epic', cls: 'bard', elem: 'thunder', dmg: 120, spd: 1.34, rng: 2.8, proj: 'ball', aura: { type: 'gold', amt: 0.14, radius: 4 }, chain: 2,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'braid', gear: 'halo', weapon: 'harp', skin: '#d9a978', hairCol: '#c9a227' },
    desc: '2회 연쇄 · 골드 오라 +14%.'
  },
  {
    key: 'dark_summoner_ep38', name: '숙련 나락 지배자', rarity: 'epic', cls: 'summoner', elem: 'dark', dmg: 185, spd: 0.86, rng: 2.9, proj: 'ball', summon: { count: 2, dmg: 56, spd: 1.2 }, curse: 0.13,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'pony', gear: 'antlers', weapon: 'tome', skin: '#f0c9a0', hairCol: '#6b4a2a' },
    desc: '저주 · 정령 2기 소환.'
  },
  {
    key: 'void_engineer_ep39', name: '숙련 침묵 기계공', rarity: 'epic', cls: 'engineer', elem: 'void', dmg: 225, spd: 1.12, rng: 3.1, proj: 'bolt', multishot: 2,
    look: { legs: 'biped', torso: 'core', head: 'human', hair: 'braid', gear: 'crown', weapon: 'drone', skin: '#e8bf95', hairCol: '#4a3524' },
    desc: '2연사.'
  },
  {
    key: 'blood_warlock_ep40', name: '상급 핏빛 흑마법사', rarity: 'epic', cls: 'warlock', elem: 'blood', dmg: 190, spd: 1.11, rng: 3, proj: 'ball', poison: { dps: 1.9, dur: 6, stack: 3 }, lifesteal: 0.16,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'braid', gear: 'mask', weapon: 'scythe', skin: '#b9825a', hairCol: '#2b2b33' },
    desc: '중독 · 흡혈.'
  },
  {
    key: 'fire_archer_ep41', name: '겁화 사궁', rarity: 'epic', cls: 'archer', elem: 'fire', dmg: 175, spd: 1.51, rng: 3.5, proj: 'arrow', crit: 0.17, critMul: 2.2,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'horns', weapon: 'crossbow', skin: '#b9825a', hairCol: '#4a3524' },
    desc: '치명 17%.'
  },
  {
    key: 'poison_sniper_ep42', name: '숙련 역병 저격수', rarity: 'epic', cls: 'sniper', elem: 'poison', dmg: 260, spd: 0.65, rng: 7, proj: 'arrow', pen: 0.28, pierce: 2,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'spiky', gear: 'horns', weapon: 'rifle', skin: '#e8bf95', hairCol: '#8a5a3a' },
    desc: '방어 28% 관통 · 관통 사격.'
  },
  {
    key: 'nature_mage_ep43', name: '만엽 마법사', rarity: 'epic', cls: 'mage', elem: 'nature', dmg: 235, spd: 1.15, rng: 3.4, proj: 'ball', splash: 1.07, regen: 0.06,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'hood', weapon: 'staff', skin: '#e8bf95', hairCol: '#8a5a3a' },
    desc: '범위 폭발 · 생명 재생.'
  },
  {
    key: 'earth_artillery_ep44', name: '상급 토석 투석수', rarity: 'epic', cls: 'artillery', elem: 'earth', dmg: 260, spd: 0.49, rng: 3.6, proj: 'bomb', splash: 0.67, stun: 0.08,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'spiky', gear: 'mask', weapon: 'launcher', skin: '#ffe0c0', hairCol: '#c9a227' },
    desc: '범위 폭발 · 기절.'
  },
  {
    key: 'phys_guardian_ep45', name: '철갑 중갑병', rarity: 'epic', cls: 'guardian', elem: 'phys', dmg: 260, spd: 1.25, rng: 2, proj: 'none', pen: 0.33,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'long', gear: 'antlers', weapon: 'greatsword', skin: '#f2d0ad', hairCol: '#d94f4f' },
    desc: '방어 33% 관통.'
  },
  {
    key: 'thunder_assassin_ep46', name: '숙련 낙뢰 그림자', rarity: 'epic', cls: 'assassin', elem: 'thunder', dmg: 215, spd: 2.46, rng: 2.1, proj: 'none', crit: 0.18, critMul: 1.9, execute: 0.05,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'hood', weapon: 'dagger', skin: '#d9a978', hairCol: '#8e5b9e' },
    desc: '치명 18% · 처형.'
  },
  {
    key: 'dark_support_ep47', name: '숙련 암흑 조율사', rarity: 'epic', cls: 'support', elem: 'dark', dmg: 125, spd: 0.9, rng: 2.8, proj: 'ball', aura: { type: 'spd', amt: 0.17, radius: 4 }, curse: 0.11,
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'pony', gear: 'halo', weapon: 'tome', skin: '#f2d0ad', hairCol: '#8a5a3a' },
    desc: '저주 · 공속 오라 +17%.'
  },
  /* ------- 생성 : legendary ------- */
  {
    key: 'dark_guardian_le0', name: '흑야 수호자', rarity: 'legendary', cls: 'guardian', elem: 'dark', dmg: 245, spd: 0.83, rng: 2.2, proj: 'none', pen: 0.33, crit: 0.26, critMul: 2,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'short', gear: 'antlers', weapon: 'spear', skin: '#e8bf95', hairCol: '#2b2b33', wings: 'energy' },
    desc: '방어 33% 관통 · 치명 26%.'
  },
  {
    key: 'void_assassin_le1', name: '전설의 별빛 없는 밀정', rarity: 'legendary', cls: 'assassin', elem: 'void', dmg: 190, spd: 1.81, rng: 2, proj: 'none',
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'antlers', weapon: 'claw', skin: '#b9825a', hairCol: '#2b2b33', wings: 'insectWing' },
    desc: '견실한 기본기.'
  },
  {
    key: 'blood_support_le2', name: '대 혈맹 수도자', rarity: 'legendary', cls: 'support', elem: 'blood', dmg: 180, spd: 1.14, rng: 3, proj: 'ball', aura: { type: 'spd', amt: 0.12, radius: 2 }, lifesteal: 0.07,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'crown', weapon: 'flask', skin: '#b9825a', hairCol: '#2b2b33', wings: 'energy' },
    desc: '흡혈 · 공속 오라 +12%.'
  },
  {
    key: 'fire_bard_le3', name: '잿불 선창자', rarity: 'legendary', cls: 'bard', elem: 'fire', dmg: 180, spd: 1.49, rng: 3.2, proj: 'ball', aura: { type: 'spd', amt: 0.09, radius: 3 }, burn: { dps: 2.16, dur: 4 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'halo', weapon: 'harp', skin: '#e8bf95', hairCol: '#3a2a1a', wings: 'insectWing' },
    desc: '화상 · 공속 오라 +9%.'
  },
  {
    key: 'poison_summoner_le4', name: '창백한 지배자', rarity: 'legendary', cls: 'summoner', elem: 'poison', dmg: 195, spd: 0.75, rng: 3.5, proj: 'ball', summon: { count: 2, dmg: 59, spd: 1.2 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'visor', weapon: 'staff', skin: '#e8bf95', hairCol: '#4a3524', wings: 'feather' },
    desc: '정령 2기 소환.'
  },
  {
    key: 'nature_engineer_le5', name: '대 만엽 장인', rarity: 'legendary', cls: 'engineer', elem: 'nature', dmg: 285, spd: 1.57, rng: 3.6, proj: 'bolt', multishot: 3, splash: 0.66, regen: 0.05,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'braid', gear: 'horns', weapon: 'flask', skin: '#b9825a', hairCol: '#d94f4f', wings: 'insectWing' },
    desc: '범위 폭발 · 3연사 · 생명 재생.'
  },
  {
    key: 'wind_warlock_le6', name: '전설의 삭풍 주박사', rarity: 'legendary', cls: 'warlock', elem: 'wind', dmg: 295, spd: 1.01, rng: 3.3, proj: 'ball', poison: { dps: 2.95, dur: 4, stack: 4 }, curse: 0.16,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'halo', weapon: 'scythe', skin: '#ffe0c0', hairCol: '#6b4a2a', wings: 'energy' },
    desc: '중독 · 저주.'
  },
  {
    key: 'time_archer_le7', name: '대 연대 활잡이', rarity: 'legendary', cls: 'archer', elem: 'time', dmg: 200, spd: 1.64, rng: 3.2, proj: 'arrow', crit: 0.25, critMul: 1.9, slow: 0.28,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'braid', gear: 'antlers', weapon: 'crossbow', skin: '#d9a978', hairCol: '#c9a227', wings: 'insectWing' },
    desc: '치명 25% · 둔화 28%.'
  },
  {
    key: 'ice_sniper_le8', name: '대 눈보라 응시자', rarity: 'legendary', cls: 'sniper', elem: 'ice', dmg: 480, spd: 0.72, rng: 7.1, proj: 'arrow', pen: 0.4, pierce: 2, crit: 0.21, critMul: 2.3,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'braid', gear: 'hood', weapon: 'rifle', skin: '#b9825a', hairCol: '#8a5a3a', wings: 'feather' },
    desc: '방어 40% 관통 · 치명 21% · 관통 사격.'
  },
  {
    key: 'holy_mage_le9', name: '성스러운 마도사', rarity: 'legendary', cls: 'mage', elem: 'holy', dmg: 370, spd: 1.33, rng: 3.2, proj: 'ball', splash: 0.79, holyBonus: 0.43,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'pony', gear: 'horns', weapon: 'wand', skin: '#d9a978', hairCol: '#8e5b9e', wings: 'insectWing' },
    desc: '범위 폭발.'
  },
  {
    key: 'arcane_artillery_le10', name: '대 신비 투석수', rarity: 'legendary', cls: 'artillery', elem: 'arcane', dmg: 720, spd: 0.55, rng: 3.9, proj: 'bomb', stun: 0.07, pen: 0.2,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'long', gear: 'hood', weapon: 'sling', skin: '#b9825a', hairCol: '#4a3524', wings: 'feather' },
    desc: '방어 20% 관통 · 기절.'
  },
  {
    key: 'blood_guardian_le11', name: '고명한 적혈 검사', rarity: 'legendary', cls: 'guardian', elem: 'blood', dmg: 475, spd: 0.97, rng: 2, proj: 'none', pen: 0.35, crit: 0.25, critMul: 2.6, lifesteal: 0.14,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'pony', gear: 'halo', weapon: 'axe', skin: '#f0c9a0', hairCol: '#6b4a2a', wings: 'feather' },
    desc: '방어 35% 관통 · 치명 25% · 흡혈.'
  },
  {
    key: 'fire_assassin_le12', name: '전설의 홍염 단검술사', rarity: 'legendary', cls: 'assassin', elem: 'fire', dmg: 385, spd: 2.16, rng: 1.9, proj: 'none', burn: { dps: 4.62, dur: 4 },
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'spiky', gear: 'antlers', weapon: 'dagger', skin: '#b9825a', hairCol: '#4a3524', wings: 'bat' },
    desc: '화상.'
  },
  {
    key: 'poison_support_le13', name: '창백한 축복자', rarity: 'legendary', cls: 'support', elem: 'poison', dmg: 210, spd: 1.05, rng: 3.2, proj: 'ball', aura: { type: 'spd', amt: 0.18, radius: 4 }, poison: { dps: 2.1, dur: 7, stack: 4 },
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'short', gear: 'hood', weapon: 'flask', skin: '#b9825a', hairCol: '#4a3524', wings: 'feather' },
    desc: '중독 · 공속 오라 +18%.'
  },
  {
    key: 'nature_bard_le14', name: '고명한 야생 가인', rarity: 'legendary', cls: 'bard', elem: 'nature', dmg: 265, spd: 1.33, rng: 3.1, proj: 'ball', aura: { type: 'dmg', amt: 0.25, radius: 2 }, regen: 0.04,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'visor', weapon: 'banner', skin: '#ffe0c0', hairCol: '#4a3524', wings: 'feather' },
    desc: '생명 재생 · 공격력 오라 +25%.'
  },
  {
    key: 'wind_summoner_le15', name: '고명한 선풍 조련사', rarity: 'legendary', cls: 'summoner', elem: 'wind', dmg: 375, spd: 0.85, rng: 3.1, proj: 'ball', summon: { count: 2, dmg: 113, spd: 1.2 }, multishot: 2,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'pony', gear: 'horns', weapon: 'tome', skin: '#f0c9a0', hairCol: '#6b4a2a', wings: 'feather' },
    desc: '2연사 · 정령 2기 소환.'
  },
  {
    key: 'time_engineer_le16', name: '순환 기술자', rarity: 'legendary', cls: 'engineer', elem: 'time', dmg: 550, spd: 1.12, rng: 3.2, proj: 'bolt', multishot: 3, slow: 0.23,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'short', gear: 'antlers', weapon: 'flask', skin: '#ffe0c0', hairCol: '#3a2a1a', wings: 'energy' },
    desc: '3연사 · 둔화 23%.'
  },
  {
    key: 'ice_warlock_le17', name: '전설의 눈보라 역술사', rarity: 'legendary', cls: 'warlock', elem: 'ice', dmg: 490, spd: 0.76, rng: 3.6, proj: 'ball', poison: { dps: 4.9, dur: 6, stack: 4 }, curse: 0.14, slow: 0.42,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'short', gear: 'mask', weapon: 'tome', skin: '#c89268', hairCol: '#8e5b9e', wings: 'insectWing' },
    desc: '중독 · 둔화 42% · 저주.'
  },
  {
    key: 'holy_archer_le18', name: '고명한 성스러운 사궁', rarity: 'legendary', cls: 'archer', elem: 'holy', dmg: 400, spd: 1.65, rng: 3.9, proj: 'arrow', multishot: 3, crit: 0.27, critMul: 2.2, holyBonus: 0.37,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'mask', weapon: 'crossbow', skin: '#f2d0ad', hairCol: '#2b2b33', wings: 'insectWing' },
    desc: '치명 27% · 3연사.'
  },
  {
    key: 'arcane_sniper_le19', name: '현자의 응시자', rarity: 'legendary', cls: 'sniper', elem: 'arcane', dmg: 920, spd: 0.48, rng: 6.4, proj: 'arrow', pen: 0.31,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'hood', weapon: 'crossbow', skin: '#d9a978', hairCol: '#c9a227', wings: 'bat' },
    desc: '방어 31% 관통.'
  },
  {
    key: 'earth_mage_le20', name: '대 단단한 마도사', rarity: 'legendary', cls: 'mage', elem: 'earth', dmg: 600, spd: 0.83, rng: 3.2, proj: 'ball', stun: 0.05,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'braid', gear: 'horns', weapon: 'orb', skin: '#b9825a', hairCol: '#2b2b33', wings: 'feather' },
    desc: '기절.'
  },
  {
    key: 'phys_artillery_le21', name: '대 역전의 포수', rarity: 'legendary', cls: 'artillery', elem: 'phys', dmg: 1150, spd: 0.48, rng: 3.2, proj: 'bomb', splash: 0.65,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'long', gear: 'horns', weapon: 'launcher', skin: '#f0c9a0', hairCol: '#8a5a3a', wings: 'feather' },
    desc: '범위 폭발.'
  },
  {
    key: 'poison_guardian_le22', name: '창백한 수호자', rarity: 'legendary', cls: 'guardian', elem: 'poison', dmg: 795, spd: 1.24, rng: 1.8, proj: 'none', pen: 0.25, crit: 0.3, critMul: 2.2,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'pony', gear: 'halo', weapon: 'hammer', skin: '#c89268', hairCol: '#8a5a3a', wings: 'feather' },
    desc: '방어 25% 관통 · 치명 30%.'
  },
  {
    key: 'nature_assassin_le23', name: '고명한 만엽 단검술사', rarity: 'legendary', cls: 'assassin', elem: 'nature', dmg: 540, spd: 1.8, rng: 2.3, proj: 'none', crit: 0.2, critMul: 2.7, regen: 0.06,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'halo', weapon: 'chakram', skin: '#ffe0c0', hairCol: '#8e5b9e', wings: 'feather' },
    desc: '치명 20% · 생명 재생.'
  },
  {
    key: 'wind_support_le24', name: '전설의 창공 성직자', rarity: 'legendary', cls: 'support', elem: 'wind', dmg: 400, spd: 1.3, rng: 3.1, proj: 'ball', aura: { type: 'dmg', amt: 0.15, radius: 4 }, multishot: 2,
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'spiky', gear: 'halo', weapon: 'staff', skin: '#c89268', hairCol: '#4a3524', wings: 'bat' },
    desc: '2연사 · 공격력 오라 +15%.'
  },
  {
    key: 'time_bard_le25', name: '고명한 모래시계 연주자', rarity: 'legendary', cls: 'bard', elem: 'time', dmg: 455, spd: 1.14, rng: 2.8, proj: 'ball', aura: { type: 'dmg', amt: 0.12, radius: 3 }, slow: 0.23,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'short', gear: 'visor', weapon: 'harp', skin: '#f2d0ad', hairCol: '#2b2b33', wings: 'feather' },
    desc: '둔화 23% · 공격력 오라 +12%.'
  },
  {
    key: 'ice_summoner_le26', name: '전설의 눈보라 소환사', rarity: 'legendary', cls: 'summoner', elem: 'ice', dmg: 575, spd: 1.1, rng: 3.5, proj: 'ball', summon: { count: 2, dmg: 173, spd: 1.2 }, slow: 0.41,
    look: { legs: 'float', torso: 'robe', head: 'human', hair: 'braid', gear: 'hood', weapon: 'tome', skin: '#f0c9a0', hairCol: '#6b4a2a', wings: 'bat' },
    desc: '둔화 41% · 정령 2기 소환.'
  },
  {
    key: 'holy_engineer_le27', name: '천상 정비사', rarity: 'legendary', cls: 'engineer', elem: 'holy', dmg: 780, spd: 1.11, rng: 3.1, proj: 'bolt', multishot: 3,
    look: { legs: 'biped', torso: 'core', head: 'human', hair: 'short', gear: 'mask', weapon: 'flask', skin: '#ffe0c0', hairCol: '#3a2a1a', wings: 'bat' },
    desc: '3연사.'
  },
  {
    key: 'arcane_warlock_le28', name: '오의 마령술사', rarity: 'legendary', cls: 'warlock', elem: 'arcane', dmg: 840, spd: 0.99, rng: 3.1, proj: 'ball', poison: { dps: 8.4, dur: 4, stack: 4 }, pen: 0.22,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'pony', gear: 'visor', weapon: 'tome', skin: '#ffe0c0', hairCol: '#4a3524', wings: 'insectWing' },
    desc: '방어 22% 관통 · 중독.'
  },
  {
    key: 'earth_archer_le29', name: '대 암반 사궁', rarity: 'legendary', cls: 'archer', elem: 'earth', dmg: 605, spd: 2.17, rng: 3.5, proj: 'arrow', crit: 0.15, critMul: 2.3, stun: 0.14,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'spiky', gear: 'horns', weapon: 'bow', skin: '#f2d0ad', hairCol: '#8a5a3a', wings: 'insectWing' },
    desc: '치명 15% · 기절.'
  },
  {
    key: 'phys_sniper_le30', name: '고명한 패도 명사수', rarity: 'legendary', cls: 'sniper', elem: 'phys', dmg: 1250, spd: 0.63, rng: 7, proj: 'arrow', pen: 0.32, pierce: 2, crit: 0.15, critMul: 2,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'braid', gear: 'mask', weapon: 'crossbow', skin: '#ffe0c0', hairCol: '#4a3524', wings: 'feather' },
    desc: '방어 32% 관통 · 치명 15% · 관통 사격.'
  },
  {
    key: 'thunder_mage_le31', name: '자전 주술사', rarity: 'legendary', cls: 'mage', elem: 'thunder', dmg: 1000, spd: 0.84, rng: 3.1, proj: 'ball', splash: 1.12, chain: 4,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'halo', weapon: 'staff', skin: '#e8bf95', hairCol: '#8e5b9e', wings: 'insectWing' },
    desc: '범위 폭발 · 4회 연쇄.'
  },
  {
    key: 'dark_artillery_le32', name: '흑요 포수', rarity: 'legendary', cls: 'artillery', elem: 'dark', dmg: 1400, spd: 0.66, rng: 3.4, proj: 'bomb', splash: 1, curse: 0.19,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'long', gear: 'mask', weapon: 'cannon', skin: '#c89268', hairCol: '#4a3524', wings: 'energy' },
    desc: '범위 폭발 · 저주.'
  },
  {
    key: 'wind_guardian_le33', name: '대 바람 검사', rarity: 'legendary', cls: 'guardian', elem: 'wind', dmg: 1250, spd: 1.28, rng: 1.9, proj: 'none', pen: 0.27, multishot: 2,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'pony', gear: 'antlers', weapon: 'hammer', skin: '#d9a978', hairCol: '#c9a227', wings: 'bat' },
    desc: '방어 27% 관통 · 2연사.'
  },
  {
    key: 'time_assassin_le34', name: '순환 그림자', rarity: 'legendary', cls: 'assassin', elem: 'time', dmg: 920, spd: 2.1, rng: 2.2, proj: 'none', crit: 0.23, critMul: 2.6, execute: 0.14, slow: 0.28,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'hood', weapon: 'claw', skin: '#c89268', hairCol: '#c9a227', wings: 'feather' },
    desc: '치명 23% · 둔화 28% · 처형.'
  },
  {
    key: 'ice_support_le35', name: '서리 사제', rarity: 'legendary', cls: 'support', elem: 'ice', dmg: 525, spd: 1.01, rng: 2.9, proj: 'ball', aura: { type: 'gold', amt: 0.13, radius: 4 }, slow: 0.23,
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'pony', gear: 'hood', weapon: 'staff', skin: '#d9a978', hairCol: '#4a3524', wings: 'bat' },
    desc: '둔화 23% · 골드 오라 +13%.'
  },
  {
    key: 'holy_bard_le36', name: '대 성스러운 전율자', rarity: 'legendary', cls: 'bard', elem: 'holy', dmg: 655, spd: 1.43, rng: 3, proj: 'ball', aura: { type: 'rng', amt: 0.18, radius: 2 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'hood', weapon: 'harp', skin: '#d9a978', hairCol: '#3a2a1a', wings: 'feather' },
    desc: '사거리 오라 +18%.'
  },
  {
    key: 'arcane_summoner_le37', name: '전설의 마력 조련사', rarity: 'legendary', cls: 'summoner', elem: 'arcane', dmg: 870, spd: 0.71, rng: 3.5, proj: 'ball', summon: { count: 2, dmg: 261, spd: 1.2 }, pen: 0.16,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'visor', weapon: 'staff', skin: '#f2d0ad', hairCol: '#d94f4f', wings: 'insectWing' },
    desc: '방어 16% 관통 · 정령 2기 소환.'
  },
  {
    key: 'earth_engineer_le38', name: '전설의 융기 기계공', rarity: 'legendary', cls: 'engineer', elem: 'earth', dmg: 1050, spd: 1.12, rng: 3.3, proj: 'bolt', multishot: 3, splash: 1.16, stun: 0.13,
    look: { legs: 'biped', torso: 'core', head: 'human', hair: 'pony', gear: 'visor', weapon: 'drone', skin: '#e8bf95', hairCol: '#d94f4f', wings: 'insectWing' },
    desc: '범위 폭발 · 3연사 · 기절.'
  },
  {
    key: 'phys_warlock_le39', name: '전설의 백년 주박사', rarity: 'legendary', cls: 'warlock', elem: 'phys', dmg: 1050, spd: 0.8, rng: 3.3, proj: 'ball', poison: { dps: 10.5, dur: 4, stack: 4 }, curse: 0.07,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'braid', gear: 'halo', weapon: 'tome', skin: '#f2d0ad', hairCol: '#8a5a3a', wings: 'feather' },
    desc: '중독 · 저주.'
  },
  {
    key: 'thunder_archer_le40', name: '폭뢰 사궁', rarity: 'legendary', cls: 'archer', elem: 'thunder', dmg: 830, spd: 1.67, rng: 3.5, proj: 'arrow', crit: 0.19, critMul: 2.7,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'pony', gear: 'mask', weapon: 'crossbow', skin: '#b9825a', hairCol: '#d94f4f', wings: 'bat' },
    desc: '치명 19%.'
  },
  {
    key: 'dark_sniper_le41', name: '고명한 암흑 명사수', rarity: 'legendary', cls: 'sniper', elem: 'dark', dmg: 1400, spd: 0.73, rng: 6.7, proj: 'arrow', pen: 0.4, crit: 0.15, critMul: 2.6,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'antlers', weapon: 'crossbow', skin: '#f0c9a0', hairCol: '#8a5a3a', wings: 'insectWing' },
    desc: '방어 40% 관통 · 치명 15%.'
  },
  {
    key: 'void_mage_le42', name: '대 무형 현자', rarity: 'legendary', cls: 'mage', elem: 'void', dmg: 1350, spd: 0.92, rng: 3.6, proj: 'ball',
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'pony', gear: 'mask', weapon: 'orb', skin: '#b9825a', hairCol: '#8a5a3a', wings: 'feather' },
    desc: '견실한 기본기.'
  },
  {
    key: 'blood_artillery_le43', name: '전설의 혈족 투석수', rarity: 'legendary', cls: 'artillery', elem: 'blood', dmg: 1400, spd: 0.71, rng: 3.7, proj: 'bomb', splash: 0.82, lifesteal: 0.06,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'long', gear: 'crown', weapon: 'sling', skin: '#ffe0c0', hairCol: '#2b2b33', wings: 'insectWing' },
    desc: '범위 폭발 · 흡혈.'
  },
  {
    key: 'ice_guardian_le44', name: '대 설야 수호자', rarity: 'legendary', cls: 'guardian', elem: 'ice', dmg: 1400, spd: 1.19, rng: 2.1, proj: 'none', pen: 0.16, slow: 0.34,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'long', gear: 'antlers', weapon: 'axe', skin: '#f2d0ad', hairCol: '#d94f4f', wings: 'bat' },
    desc: '방어 16% 관통 · 둔화 34%.'
  },
  {
    key: 'holy_assassin_le45', name: '정화의 밀정', rarity: 'legendary', cls: 'assassin', elem: 'holy', dmg: 1200, spd: 2.29, rng: 2.1, proj: 'none', crit: 0.27, critMul: 2.4, holyBonus: 0.29,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'short', gear: 'antlers', weapon: 'dagger', skin: '#f0c9a0', hairCol: '#d94f4f', wings: 'insectWing' },
    desc: '치명 27%.'
  },
  /* ------- 생성 : mythic ------- */
  {
    key: 'earth_assassin_my0', name: '신화의 대지 단검술사', rarity: 'mythic', cls: 'assassin', elem: 'earth', dmg: 480, spd: 2.5, rng: 2.1, proj: 'none', stun: 0.13,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'horns', weapon: 'dagger', skin: '#f0c9a0', hairCol: '#d94f4f', wings: 'feather' },
    desc: '기절.'
  },
  {
    key: 'phys_support_my1', name: '전승의 패도 성직자', rarity: 'mythic', cls: 'support', elem: 'phys', dmg: 480, spd: 1.33, rng: 3.1, proj: 'ball', aura: { type: 'spd', amt: 0.22, radius: 2 },
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'pony', gear: 'visor', weapon: 'staff', skin: '#e8bf95', hairCol: '#4a3524', wings: 'bat' },
    desc: '공속 오라 +22%.'
  },
  {
    key: 'thunder_bard_my2', name: '전승의 뇌전 선창자', rarity: 'mythic', cls: 'bard', elem: 'thunder', dmg: 480, spd: 1.55, rng: 3.2, proj: 'ball', aura: { type: 'spd', amt: 0.2, radius: 4 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'horns', weapon: 'harp', skin: '#ffe0c0', hairCol: '#2b2b33', wings: 'energy' },
    desc: '공속 오라 +20%.'
  },
  {
    key: 'dark_summoner_my3', name: '전승의 나락 부름꾼', rarity: 'mythic', cls: 'summoner', elem: 'dark', dmg: 535, spd: 1.18, rng: 2.9, proj: 'ball', summon: { count: 2, dmg: 161, spd: 1.2 }, curse: 0.18,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'short', gear: 'hood', weapon: 'orb', skin: '#b9825a', hairCol: '#4a3524', wings: 'bat' },
    desc: '저주 · 정령 2기 소환.'
  },
  {
    key: 'void_engineer_my4', name: '전승의 균열 기계공', rarity: 'mythic', cls: 'engineer', elem: 'void', dmg: 670, spd: 1.4, rng: 3.7, proj: 'bolt', multishot: 3, splash: 0.7,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'spiky', gear: 'antlers', weapon: 'rifle', skin: '#f0c9a0', hairCol: '#4a3524', wings: 'bat' },
    desc: '범위 폭발 · 3연사.'
  },
  {
    key: 'blood_warlock_my5', name: '초월한 혈맹 금술사', rarity: 'mythic', cls: 'warlock', elem: 'blood', dmg: 760, spd: 0.91, rng: 3.2, proj: 'ball', poison: { dps: 7.6, dur: 4, stack: 4 }, curse: 0.06, lifesteal: 0.08,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'halo', weapon: 'tome', skin: '#ffe0c0', hairCol: '#6b4a2a', wings: 'insectWing' },
    desc: '중독 · 흡혈 · 저주.'
  },
  {
    key: 'fire_archer_my6', name: '신화의 불티 사수', rarity: 'mythic', cls: 'archer', elem: 'fire', dmg: 570, spd: 1.92, rng: 3.3, proj: 'arrow', multishot: 3, crit: 0.14, critMul: 2.3, burn: { dps: 6.84, dur: 5 },
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'horns', weapon: 'crossbow', skin: '#b9825a', hairCol: '#8a5a3a', wings: 'bat' },
    desc: '치명 14% · 3연사 · 화상.'
  },
  {
    key: 'poison_sniper_my7', name: '전승의 독무 조준자', rarity: 'mythic', cls: 'sniper', elem: 'poison', dmg: 1350, spd: 0.4, rng: 6.7, proj: 'arrow', pen: 0.12, pierce: 2, crit: 0.3, critMul: 2.8,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'crown', weapon: 'rifle', skin: '#f0c9a0', hairCol: '#2b2b33', wings: 'energy' },
    desc: '방어 12% 관통 · 치명 30% · 관통 사격.'
  },
  {
    key: 'nature_mage_my8', name: '초월한 덩굴 마도사', rarity: 'mythic', cls: 'mage', elem: 'nature', dmg: 960, spd: 0.88, rng: 4, proj: 'ball', splash: 0.84,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'braid', gear: 'hood', weapon: 'orb', skin: '#f0c9a0', hairCol: '#6b4a2a', wings: 'bat' },
    desc: '범위 폭발.'
  },
  {
    key: 'wind_artillery_my9', name: '신화의 선풍 파쇄자', rarity: 'mythic', cls: 'artillery', elem: 'wind', dmg: 1500, spd: 0.67, rng: 3.4, proj: 'bomb', splash: 0.74, stun: 0.1, multishot: 2,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'pony', gear: 'hood', weapon: 'sling', skin: '#d9a978', hairCol: '#3a2a1a', wings: 'energy' },
    desc: '범위 폭발 · 2연사 · 기절.'
  },
  {
    key: 'time_guardian_my10', name: '전승의 시간 방패병', rarity: 'mythic', cls: 'guardian', elem: 'time', dmg: 1250, spd: 1.15, rng: 1.8, proj: 'none', pen: 0.31, crit: 0.23, critMul: 1.8, slow: 0.17,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'long', gear: 'halo', weapon: 'axe', skin: '#e8bf95', hairCol: '#d94f4f', wings: 'insectWing' },
    desc: '방어 31% 관통 · 치명 23% · 둔화 17%.'
  },
  {
    key: 'thunder_assassin_my11', name: '전승의 낙뢰 암살자', rarity: 'mythic', cls: 'assassin', elem: 'thunder', dmg: 870, spd: 2.3, rng: 2.1, proj: 'none', crit: 0.14, critMul: 2.8, execute: 0.09,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'spiky', gear: 'antlers', weapon: 'claw', skin: '#f0c9a0', hairCol: '#8e5b9e', wings: 'insectWing' },
    desc: '치명 14% · 처형.'
  },
  {
    key: 'dark_support_my12', name: '초월한 흑요 치유사', rarity: 'mythic', cls: 'support', elem: 'dark', dmg: 510, spd: 1.01, rng: 3.1, proj: 'ball', aura: { type: 'spd', amt: 0.22, radius: 3 }, curse: 0.2,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'crown', weapon: 'flask', skin: '#c89268', hairCol: '#8a5a3a', wings: 'feather' },
    desc: '저주 · 공속 오라 +22%.'
  },
  {
    key: 'void_bard_my13', name: '초월한 단절 연주자', rarity: 'mythic', cls: 'bard', elem: 'void', dmg: 675, spd: 1.2, rng: 3, proj: 'ball', aura: { type: 'gold', amt: 0.18, radius: 2 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'hood', weapon: 'banner', skin: '#ffe0c0', hairCol: '#d94f4f', wings: 'insectWing' },
    desc: '골드 오라 +18%.'
  },
  {
    key: 'blood_summoner_my14', name: '전승의 붉은 부름꾼', rarity: 'mythic', cls: 'summoner', elem: 'blood', dmg: 965, spd: 0.94, rng: 2.8, proj: 'ball', summon: { count: 2, dmg: 290, spd: 1.2 }, lifesteal: 0.09,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'visor', weapon: 'staff', skin: '#e8bf95', hairCol: '#c9a227', wings: 'feather' },
    desc: '흡혈 · 정령 2기 소환.'
  },
  {
    key: 'fire_engineer_my15', name: '전승의 용광로 기계공', rarity: 'mythic', cls: 'engineer', elem: 'fire', dmg: 1400, spd: 1.37, rng: 3.5, proj: 'bolt', splash: 0.62, burn: { dps: 16.8, dur: 5 },
    look: { legs: 'biped', torso: 'core', head: 'human', hair: 'spiky', gear: 'hood', weapon: 'drone', skin: '#d9a978', hairCol: '#8e5b9e', wings: 'bat' },
    desc: '범위 폭발 · 화상.'
  },
  {
    key: 'poison_warlock_my16', name: '전승의 맹독 역술사', rarity: 'mythic', cls: 'warlock', elem: 'poison', dmg: 1450, spd: 1.05, rng: 3.2, proj: 'ball', poison: { dps: 14.5, dur: 5, stack: 4 }, curse: 0.07,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'braid', gear: 'visor', weapon: 'tome', skin: '#c89268', hairCol: '#c9a227', wings: 'energy' },
    desc: '중독 · 저주.'
  },
  {
    key: 'nature_archer_my17', name: '초월한 덩굴 사궁', rarity: 'mythic', cls: 'archer', elem: 'nature', dmg: 965, spd: 1.61, rng: 4, proj: 'arrow', crit: 0.11, critMul: 2.5, regen: 0.02,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'visor', weapon: 'crossbow', skin: '#ffe0c0', hairCol: '#d94f4f', wings: 'feather' },
    desc: '치명 11% · 생명 재생.'
  },
  {
    key: 'wind_sniper_my18', name: '초월한 삭풍 응시자', rarity: 'mythic', cls: 'sniper', elem: 'wind', dmg: 2400, spd: 0.75, rng: 6.6, proj: 'arrow', pen: 0.38, pierce: 2, crit: 0.34, critMul: 2,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'hood', weapon: 'crossbow', skin: '#ffe0c0', hairCol: '#8e5b9e', wings: 'bat' },
    desc: '방어 38% 관통 · 치명 34% · 관통 사격.'
  },
  {
    key: 'time_mage_my19', name: '신화의 모래시계 현자', rarity: 'mythic', cls: 'mage', elem: 'time', dmg: 1550, spd: 1.15, rng: 3.6, proj: 'ball', splash: 0.84, slow: 0.15,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'braid', gear: 'halo', weapon: 'wand', skin: '#c89268', hairCol: '#2b2b33', wings: 'bat' },
    desc: '범위 폭발 · 둔화 15%.'
  },
  {
    key: 'ice_artillery_my20', name: '초월한 빙하 척탄병', rarity: 'mythic', cls: 'artillery', elem: 'ice', dmg: 3000, spd: 0.56, rng: 3.3, proj: 'bomb', splash: 0.73,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'short', gear: 'mask', weapon: 'launcher', skin: '#c89268', hairCol: '#2b2b33', wings: 'energy' },
    desc: '범위 폭발.'
  },
  {
    key: 'holy_guardian_my21', name: '정화의 기사', rarity: 'mythic', cls: 'guardian', elem: 'holy', dmg: 1800, spd: 1.11, rng: 1.9, proj: 'none', crit: 0.2, critMul: 2.2,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'pony', gear: 'halo', weapon: 'spear', skin: '#f0c9a0', hairCol: '#2b2b33', wings: 'energy' },
    desc: '치명 20%.'
  },
  {
    key: 'void_assassin_my22', name: '신화의 공동 단검술사', rarity: 'mythic', cls: 'assassin', elem: 'void', dmg: 1650, spd: 2.04, rng: 2.2, proj: 'none', crit: 0.14, critMul: 2.6, pen: 0.27,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'halo', weapon: 'dagger', skin: '#ffe0c0', hairCol: '#c9a227', wings: 'energy' },
    desc: '방어 27% 관통 · 치명 14%.'
  },
  {
    key: 'blood_support_my23', name: '초월한 혈맹 사제', rarity: 'mythic', cls: 'support', elem: 'blood', dmg: 900, spd: 1.04, rng: 3.1, proj: 'ball', aura: { type: 'rng', amt: 0.11, radius: 3 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'braid', gear: 'crown', weapon: 'staff', skin: '#b9825a', hairCol: '#8a5a3a', wings: 'feather' },
    desc: '사거리 오라 +11%.'
  },
  {
    key: 'fire_bard_my24', name: '신화의 잿불 연주자', rarity: 'mythic', cls: 'bard', elem: 'fire', dmg: 1200, spd: 1.53, rng: 3.2, proj: 'ball', aura: { type: 'spd', amt: 0.11, radius: 4 }, burn: { dps: 14.4, dur: 5 },
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'spiky', gear: 'halo', weapon: 'harp', skin: '#ffe0c0', hairCol: '#d94f4f', wings: 'bat' },
    desc: '화상 · 공속 오라 +11%.'
  },
  {
    key: 'poison_summoner_my25', name: '전승의 독아 소환사', rarity: 'mythic', cls: 'summoner', elem: 'poison', dmg: 1600, spd: 1.17, rng: 2.9, proj: 'ball', summon: { count: 2, dmg: 480, spd: 1.2 }, poison: { dps: 16, dur: 7, stack: 5 },
    look: { legs: 'float', torso: 'robe', head: 'human', hair: 'spiky', gear: 'hood', weapon: 'staff', skin: '#f0c9a0', hairCol: '#8e5b9e', wings: 'energy' },
    desc: '중독 · 정령 2기 소환.'
  },
  {
    key: 'nature_engineer_my26', name: '전승의 초원 정비사', rarity: 'mythic', cls: 'engineer', elem: 'nature', dmg: 2050, spd: 1.16, rng: 3.3, proj: 'bolt', splash: 0.73, regen: 0.03,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'braid', gear: 'halo', weapon: 'rifle', skin: '#f2d0ad', hairCol: '#3a2a1a', wings: 'bat' },
    desc: '범위 폭발 · 생명 재생.'
  },
  {
    key: 'wind_warlock_my27', name: '신화의 창공 흑마법사', rarity: 'mythic', cls: 'warlock', elem: 'wind', dmg: 2100, spd: 0.97, rng: 3, proj: 'ball', multishot: 2,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'braid', gear: 'horns', weapon: 'tome', skin: '#e8bf95', hairCol: '#c9a227', wings: 'insectWing' },
    desc: '2연사.'
  },
  {
    key: 'time_archer_my28', name: '초월한 시간 궁수', rarity: 'mythic', cls: 'archer', elem: 'time', dmg: 1650, spd: 2.15, rng: 3.8, proj: 'arrow', crit: 0.25, critMul: 2,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'hood', weapon: 'bow', skin: '#d9a978', hairCol: '#d94f4f', wings: 'bat' },
    desc: '치명 25%.'
  },
  {
    key: 'ice_sniper_my29', name: '신화의 삭풍 장궁병', rarity: 'mythic', cls: 'sniper', elem: 'ice', dmg: 3200, spd: 0.73, rng: 7, proj: 'arrow', pen: 0.17, pierce: 2, crit: 0.3, critMul: 2.6,
    look: { legs: 'biped', torso: 'cloak', head: 'human', hair: 'long', gear: 'halo', weapon: 'rifle', skin: '#b9825a', hairCol: '#3a2a1a', wings: 'insectWing' },
    desc: '방어 17% 관통 · 치명 30% · 관통 사격.'
  },
  {
    key: 'holy_mage_my30', name: '신화의 천상 술사', rarity: 'mythic', cls: 'mage', elem: 'holy', dmg: 2650, spd: 0.91, rng: 3.8, proj: 'ball', splash: 0.76,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'pony', gear: 'halo', weapon: 'orb', skin: '#f0c9a0', hairCol: '#6b4a2a', wings: 'feather' },
    desc: '범위 폭발.'
  },
  {
    key: 'arcane_artillery_my31', name: '현자의 척탄병', rarity: 'mythic', cls: 'artillery', elem: 'arcane', dmg: 3200, spd: 0.74, rng: 3.7, proj: 'bomb', splash: 1.26,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'crown', weapon: 'launcher', skin: '#b9825a', hairCol: '#4a3524', wings: 'energy' },
    desc: '범위 폭발.'
  },
  {
    key: 'earth_guardian_my32', name: '초월한 지축 수호자', rarity: 'mythic', cls: 'guardian', elem: 'earth', dmg: 3000, spd: 0.92, rng: 1.9, proj: 'none', pen: 0.19, crit: 0.25, critMul: 1.9, stun: 0.08,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'long', gear: 'antlers', weapon: 'sword', skin: '#d9a978', hairCol: '#8a5a3a', wings: 'insectWing' },
    desc: '방어 19% 관통 · 치명 25% · 기절.'
  },
  {
    key: 'fire_assassin_my33', name: '초월한 겁화 단검술사', rarity: 'mythic', cls: 'assassin', elem: 'fire', dmg: 2400, spd: 2.02, rng: 2, proj: 'none', crit: 0.13, critMul: 2.1, execute: 0.09, burn: { dps: 28.8, dur: 4 },
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'antlers', weapon: 'dagger', skin: '#c89268', hairCol: '#4a3524', wings: 'feather' },
    desc: '치명 13% · 화상 · 처형.'
  },
  {
    key: 'poison_support_my34', name: '초월한 독아 성직자', rarity: 'mythic', cls: 'support', elem: 'poison', dmg: 1350, spd: 1.36, rng: 2.9, proj: 'ball', aura: { type: 'dmg', amt: 0.22, radius: 2 }, poison: { dps: 13.5, dur: 5, stack: 3 },
    look: { legs: 'biped', torso: 'spectral', head: 'human', hair: 'long', gear: 'mask', weapon: 'flask', skin: '#d9a978', hairCol: '#8a5a3a', wings: 'insectWing' },
    desc: '중독 · 공격력 오라 +22%.'
  },
  {
    key: 'nature_bard_my35', name: '신화의 만엽 음유시인', rarity: 'mythic', cls: 'bard', elem: 'nature', dmg: 1700, spd: 1.35, rng: 3.3, proj: 'ball', aura: { type: 'gold', amt: 0.11, radius: 4 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'mask', weapon: 'harp', skin: '#c89268', hairCol: '#8e5b9e', wings: 'feather' },
    desc: '골드 오라 +11%.'
  },
  {
    key: 'wind_summoner_my36', name: '신화의 유랑 부름꾼', rarity: 'mythic', cls: 'summoner', elem: 'wind', dmg: 2250, spd: 0.71, rng: 3, proj: 'ball', summon: { count: 2, dmg: 675, spd: 1.2 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'horns', weapon: 'tome', skin: '#b9825a', hairCol: '#d94f4f', wings: 'feather' },
    desc: '정령 2기 소환.'
  },
  {
    key: 'time_engineer_my37', name: '신화의 모래시계 설계자', rarity: 'mythic', cls: 'engineer', elem: 'time', dmg: 3050, spd: 1.22, rng: 3.7, proj: 'bolt', splash: 0.7, slow: 0.19,
    look: { legs: 'biped', torso: 'core', head: 'human', hair: 'short', gear: 'hood', weapon: 'flask', skin: '#e8bf95', hairCol: '#8a5a3a', wings: 'energy' },
    desc: '범위 폭발 · 둔화 19%.'
  },
  {
    key: 'ice_warlock_my38', name: '신화의 결빙 흑마법사', rarity: 'mythic', cls: 'warlock', elem: 'ice', dmg: 2700, spd: 1.12, rng: 3.2, proj: 'ball', poison: { dps: 27, dur: 5, stack: 4 }, curse: 0.1, slow: 0.42,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'pony', gear: 'horns', weapon: 'scythe', skin: '#b9825a', hairCol: '#3a2a1a', wings: 'energy' },
    desc: '중독 · 둔화 42% · 저주.'
  },
  {
    key: 'holy_archer_my39', name: '초월한 천상 궁수', rarity: 'mythic', cls: 'archer', elem: 'holy', dmg: 2150, spd: 1.65, rng: 4.1, proj: 'arrow', holyBonus: 0.38,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'halo', weapon: 'bow', skin: '#ffe0c0', hairCol: '#6b4a2a', wings: 'feather' },
    desc: '견실한 기본기.'
  },
  /* ------- 생성 : ultimate ------- */
  {
    key: 'ice_support_ul0', name: '천계의 설야 수도자', rarity: 'ultimate', cls: 'support', elem: 'ice', dmg: 4800, spd: 0.96, rng: 2.7, proj: 'ball', aura: { type: 'gold', amt: 0.27, radius: 2 }, slow: 0.42,
    look: { legs: 'biped', torso: 'robe', head: 'dragonHead', gear: 'hood', weapon: 'tome', skin: '#e8bf95', hairCol: '#4a3524', wings: 'bat' },
    desc: '둔화 42% · 골드 오라 +27%.'
  },
  {
    key: 'holy_bard_ul1', name: '초월 여명 악사', rarity: 'ultimate', cls: 'bard', elem: 'holy', dmg: 4800, spd: 1.5, rng: 3.2, proj: 'ball', aura: { type: 'dmg', amt: 0.15, radius: 2 }, holyBonus: 0.2,
    look: { legs: 'biped', torso: 'robe', head: 'orb', gear: 'horns', weapon: 'harp', skin: '#b9825a', hairCol: '#8a5a3a', wings: 'bat' },
    desc: '공격력 오라 +15%.'
  },
  {
    key: 'arcane_summoner_ul2', name: '극의 룬 부름꾼', rarity: 'ultimate', cls: 'summoner', elem: 'arcane', dmg: 4800, spd: 1, rng: 3.5, proj: 'ball', summon: { count: 3, dmg: 1440, spd: 1.2 }, pen: 0.31,
    look: { legs: 'biped', torso: 'robe', head: 'demonHead', gear: 'crown', weapon: 'tome', skin: '#d9a978', hairCol: '#4a3524', wings: 'energy' },
    desc: '방어 31% 관통 · 정령 3기 소환.'
  },
  {
    key: 'earth_engineer_ul3', name: '천계의 지맥 장인', rarity: 'ultimate', cls: 'engineer', elem: 'earth', dmg: 5500, spd: 1.5, rng: 3.2, proj: 'bolt', multishot: 3, splash: 1.01, stun: 0.1,
    look: { legs: 'biped', torso: 'core', head: 'demonHead', gear: 'halo', weapon: 'flask', skin: '#d9a978', hairCol: '#d94f4f', wings: 'feather' },
    desc: '범위 폭발 · 3연사 · 기절.'
  },
  {
    key: 'phys_warlock_ul4', name: '극의 무쇠 금술사', rarity: 'ultimate', cls: 'warlock', elem: 'phys', dmg: 6700, spd: 1.15, rng: 3.7, proj: 'ball',
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'spiky', gear: 'horns', weapon: 'wand', skin: '#f2d0ad', hairCol: '#6b4a2a', wings: 'energy' },
    desc: '견실한 기본기.'
  },
  {
    key: 'thunder_archer_ul5', name: '극의 천둥 궁수', rarity: 'ultimate', cls: 'archer', elem: 'thunder', dmg: 5300, spd: 2.06, rng: 3.2, proj: 'arrow', multishot: 3, crit: 0.32, critMul: 2.9,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'long', gear: 'hood', weapon: 'bow', skin: '#e8bf95', hairCol: '#8e5b9e', wings: 'bat' },
    desc: '치명 32% · 3연사.'
  },
  {
    key: 'dark_sniper_ul6', name: '초월 나락 응시자', rarity: 'ultimate', cls: 'sniper', elem: 'dark', dmg: 10100, spd: 0.58, rng: 6.2, proj: 'arrow', pen: 0.15, pierce: 3, crit: 0.24, critMul: 1.9,
    look: { legs: 'biped', torso: 'cloak', head: 'orb', gear: 'mask', weapon: 'crossbow', skin: '#e8bf95', hairCol: '#4a3524', wings: 'insectWing' },
    desc: '방어 15% 관통 · 치명 24% · 관통 사격.'
  },
  {
    key: 'void_mage_ul7', name: '초월 허공 마도사', rarity: 'ultimate', cls: 'mage', elem: 'void', dmg: 8100, spd: 1.24, rng: 3.4, proj: 'ball', splash: 0.73,
    look: { legs: 'biped', torso: 'robe', head: 'demonHead', gear: 'crown', weapon: 'orb', skin: '#d9a978', hairCol: '#6b4a2a', wings: 'bat' },
    desc: '범위 폭발.'
  },
  {
    key: 'blood_artillery_ul8', name: '초월 흡혈 투석수', rarity: 'ultimate', cls: 'artillery', elem: 'blood', dmg: 14400, spd: 0.79, rng: 3.9, proj: 'bomb', splash: 1.06, lifesteal: 0.15,
    look: { legs: 'biped', torso: 'plate', head: 'dragonHead', gear: 'antlers', weapon: 'launcher', skin: '#d9a978', hairCol: '#c9a227', wings: 'insectWing' },
    desc: '범위 폭발 · 흡혈.'
  },
  {
    key: 'fire_guardian_ul9', name: '천계의 홍염 파수꾼', rarity: 'ultimate', cls: 'guardian', elem: 'fire', dmg: 9450, spd: 0.9, rng: 1.7, proj: 'none', crit: 0.16, critMul: 2.8, burn: { dps: 113.4, dur: 5 },
    look: { legs: 'biped', torso: 'plate', head: 'demonHead', gear: 'mask', weapon: 'axe', skin: '#f2d0ad', hairCol: '#4a3524', wings: 'bat' },
    desc: '치명 16% · 화상.'
  },
  {
    key: 'poison_assassin_ul10', name: '창백한 밀정', rarity: 'ultimate', cls: 'assassin', elem: 'poison', dmg: 7500, spd: 2.59, rng: 2, proj: 'none', crit: 0.27, critMul: 2.7, execute: 0.11,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'pony', gear: 'crown', weapon: 'dagger', skin: '#b9825a', hairCol: '#d94f4f', wings: 'energy' },
    desc: '치명 27% · 처형.'
  },
  {
    key: 'arcane_support_ul11', name: '초월 신비 수도자', rarity: 'ultimate', cls: 'support', elem: 'arcane', dmg: 5050, spd: 1.07, rng: 3.3, proj: 'ball', aura: { type: 'dmg', amt: 0.28, radius: 4 }, pen: 0.3,
    look: { legs: 'biped', torso: 'robe', head: 'demonHead', gear: 'visor', weapon: 'flask', skin: '#f0c9a0', hairCol: '#2b2b33', wings: 'energy' },
    desc: '방어 30% 관통 · 공격력 오라 +28%.'
  },
  {
    key: 'earth_bard_ul12', name: '천계의 반석 음유시인', rarity: 'ultimate', cls: 'bard', elem: 'earth', dmg: 5950, spd: 1.2, rng: 3.5, proj: 'ball', aura: { type: 'dmg', amt: 0.28, radius: 2 },
    look: { legs: 'biped', torso: 'cloak', head: 'demonHead', gear: 'horns', weapon: 'harp', skin: '#f2d0ad', hairCol: '#c9a227', wings: 'bat' },
    desc: '공격력 오라 +28%.'
  },
  {
    key: 'phys_summoner_ul13', name: '극의 불굴 소환사', rarity: 'ultimate', cls: 'summoner', elem: 'phys', dmg: 8500, spd: 1.02, rng: 3.1, proj: 'ball', summon: { count: 3, dmg: 2550, spd: 1.2 },
    look: { legs: 'biped', torso: 'robe', head: 'dragonHead', gear: 'hood', weapon: 'tome', skin: '#ffe0c0', hairCol: '#8a5a3a', wings: 'energy' },
    desc: '정령 3기 소환.'
  },
  {
    key: 'thunder_engineer_ul14', name: '극의 뇌명 기계공', rarity: 'ultimate', cls: 'engineer', elem: 'thunder', dmg: 10800, spd: 1.33, rng: 3.1, proj: 'bolt', splash: 0.61,
    look: { legs: 'biped', torso: 'plate', head: 'demonHead', gear: 'mask', weapon: 'drone', skin: '#b9825a', hairCol: '#8a5a3a', wings: 'bat' },
    desc: '범위 폭발.'
  },
  {
    key: 'dark_warlock_ul15', name: '초월 어스름 주박사', rarity: 'ultimate', cls: 'warlock', elem: 'dark', dmg: 12550, spd: 0.72, rng: 3.4, proj: 'ball', poison: { dps: 125.5, dur: 6, stack: 5 },
    look: { legs: 'biped', torso: 'cloak', head: 'demonHead', gear: 'visor', weapon: 'wand', skin: '#ffe0c0', hairCol: '#4a3524', wings: 'energy' },
    desc: '중독.'
  },
  {
    key: 'void_archer_ul16', name: '초월 무형 궁수', rarity: 'ultimate', cls: 'archer', elem: 'void', dmg: 9150, spd: 1.91, rng: 4.3, proj: 'arrow', multishot: 3,
    look: { legs: 'biped', torso: 'cloak', head: 'orb', gear: 'halo', weapon: 'crossbow', skin: '#ffe0c0', hairCol: '#6b4a2a', wings: 'energy' },
    desc: '3연사.'
  },
  {
    key: 'blood_sniper_ul17', name: '초월 진홍 관측수', rarity: 'ultimate', cls: 'sniper', elem: 'blood', dmg: 17850, spd: 0.78, rng: 7, proj: 'arrow', pen: 0.14, crit: 0.18, critMul: 2.1, lifesteal: 0.17,
    look: { legs: 'biped', torso: 'cloak', head: 'orb', gear: 'horns', weapon: 'crossbow', skin: '#c89268', hairCol: '#6b4a2a', wings: 'bat' },
    desc: '방어 14% 관통 · 치명 18% · 흡혈.'
  },
  {
    key: 'fire_mage_ul18', name: '천계의 겁화 마법사', rarity: 'ultimate', cls: 'mage', elem: 'fire', dmg: 15350, spd: 1.21, rng: 3.1, proj: 'ball', burn: { dps: 184.2, dur: 4 },
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'pony', gear: 'crown', weapon: 'wand', skin: '#d9a978', hairCol: '#8e5b9e', wings: 'energy' },
    desc: '화상.'
  },
  {
    key: 'poison_artillery_ul19', name: '극의 늪지 투석수', rarity: 'ultimate', cls: 'artillery', elem: 'poison', dmg: 24000, spd: 0.73, rng: 3.7, proj: 'bomb', splash: 1.06, stun: 0.05, poison: { dps: 240, dur: 7, stack: 5 },
    look: { legs: 'biped', torso: 'plate', head: 'demonHead', gear: 'halo', weapon: 'sling', skin: '#c89268', hairCol: '#8e5b9e', wings: 'bat' },
    desc: '범위 폭발 · 중독 · 기절.'
  },
  {
    key: 'nature_guardian_ul20', name: '천계의 초원 검사', rarity: 'ultimate', cls: 'guardian', elem: 'nature', dmg: 17250, spd: 0.88, rng: 2, proj: 'none', crit: 0.3, critMul: 1.9,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'long', gear: 'horns', weapon: 'hammer', skin: '#d9a978', hairCol: '#8a5a3a', wings: 'energy' },
    desc: '치명 30%.'
  },
  {
    key: 'wind_assassin_ul21', name: '극의 표풍 자객', rarity: 'ultimate', cls: 'assassin', elem: 'wind', dmg: 13000, spd: 1.72, rng: 2.2, proj: 'none', crit: 0.21, critMul: 2, execute: 0.07, multishot: 2,
    look: { legs: 'biped', torso: 'leather', head: 'dragonHead', gear: 'antlers', weapon: 'chakram', skin: '#e8bf95', hairCol: '#4a3524', wings: 'feather' },
    desc: '치명 21% · 2연사 · 처형.'
  },
  {
    key: 'phys_support_ul22', name: '초월 강철 사제', rarity: 'ultimate', cls: 'support', elem: 'phys', dmg: 7400, spd: 1.19, rng: 3, proj: 'ball', aura: { type: 'gold', amt: 0.14, radius: 3 },
    look: { legs: 'biped', torso: 'spectral', head: 'orb', gear: 'antlers', weapon: 'tome', skin: '#ffe0c0', hairCol: '#c9a227', wings: 'bat' },
    desc: '골드 오라 +14%.'
  },
  {
    key: 'thunder_bard_ul23', name: '천계의 뇌명 전율자', rarity: 'ultimate', cls: 'bard', elem: 'thunder', dmg: 10250, spd: 1.49, rng: 3.3, proj: 'ball', aura: { type: 'dmg', amt: 0.27, radius: 2 }, chain: 3,
    look: { legs: 'biped', torso: 'robe', head: 'orb', gear: 'antlers', weapon: 'harp', skin: '#d9a978', hairCol: '#2b2b33', wings: 'bat' },
    desc: '3회 연쇄 · 공격력 오라 +27%.'
  },
  {
    key: 'dark_summoner_ul24', name: '천계의 흑요 소환사', rarity: 'ultimate', cls: 'summoner', elem: 'dark', dmg: 15250, spd: 0.98, rng: 3.7, proj: 'ball', summon: { count: 3, dmg: 4575, spd: 1.2 }, curse: 0.09,
    look: { legs: 'float', torso: 'robe', head: 'demonHead', gear: 'horns', weapon: 'tome', skin: '#ffe0c0', hairCol: '#d94f4f', wings: 'feather' },
    desc: '저주 · 정령 3기 소환.'
  },
  {
    key: 'void_engineer_ul25', name: '초월 허공 설계자', rarity: 'ultimate', cls: 'engineer', elem: 'void', dmg: 17900, spd: 1.17, rng: 3.1, proj: 'bolt', multishot: 3, splash: 1.17, pen: 0.26,
    look: { legs: 'biped', torso: 'core', head: 'orb', gear: 'visor', weapon: 'drone', skin: '#b9825a', hairCol: '#2b2b33', wings: 'feather' },
    desc: '범위 폭발 · 방어 26% 관통 · 3연사.'
  },
  {
    key: 'blood_warlock_ul26', name: '초월 혈맹 저주술사', rarity: 'ultimate', cls: 'warlock', elem: 'blood', dmg: 19000, spd: 0.8, rng: 3.7, proj: 'ball', poison: { dps: 190, dur: 5, stack: 5 }, curse: 0.11,
    look: { legs: 'biped', torso: 'cloak', head: 'orb', gear: 'crown', weapon: 'scythe', skin: '#b9825a', hairCol: '#3a2a1a', wings: 'energy' },
    desc: '중독 · 저주.'
  },
  {
    key: 'fire_archer_ul27', name: '천계의 용광로 활잡이', rarity: 'ultimate', cls: 'archer', elem: 'fire', dmg: 12900, spd: 1.79, rng: 3.6, proj: 'arrow', multishot: 3, crit: 0.35, critMul: 2.5, burn: { dps: 154.8, dur: 5 },
    look: { legs: 'biped', torso: 'leather', head: 'demonHead', gear: 'antlers', weapon: 'bow', skin: '#d9a978', hairCol: '#8e5b9e', wings: 'insectWing' },
    desc: '치명 35% · 3연사 · 화상.'
  },
  {
    key: 'poison_sniper_ul28', name: '초월 썩은 관측수', rarity: 'ultimate', cls: 'sniper', elem: 'poison', dmg: 24000, spd: 0.72, rng: 6.1, proj: 'arrow', poison: { dps: 240, dur: 5, stack: 5 },
    look: { legs: 'biped', torso: 'cloak', head: 'demonHead', gear: 'halo', weapon: 'rifle', skin: '#c89268', hairCol: '#d94f4f', wings: 'insectWing' },
    desc: '중독.'
  },
  {
    key: 'nature_mage_ul29', name: '극의 야생 현자', rarity: 'ultimate', cls: 'mage', elem: 'nature', dmg: 19500, spd: 1.2, rng: 3, proj: 'ball', splash: 0.7,
    look: { legs: 'biped', torso: 'robe', head: 'orb', gear: 'halo', weapon: 'orb', skin: '#d9a978', hairCol: '#6b4a2a', wings: 'insectWing' },
    desc: '범위 폭발.'
  },
  {
    key: 'wind_artillery_ul30', name: '천계의 질풍 파쇄자', rarity: 'ultimate', cls: 'artillery', elem: 'wind', dmg: 24000, spd: 0.7, rng: 3.1, proj: 'bomb', splash: 0.81,
    look: { legs: 'biped', torso: 'plate', head: 'human', hair: 'braid', gear: 'horns', weapon: 'cannon', skin: '#e8bf95', hairCol: '#d94f4f', wings: 'feather' },
    desc: '범위 폭발.'
  },
  {
    key: 'time_guardian_ul31', name: '천계의 순환 기사', rarity: 'ultimate', cls: 'guardian', elem: 'time', dmg: 23800, spd: 1.04, rng: 1.8, proj: 'none', pen: 0.34, crit: 0.17, critMul: 2.5, slow: 0.26,
    look: { legs: 'biped', torso: 'plate', head: 'demonHead', gear: 'hood', weapon: 'greatsword', skin: '#b9825a', hairCol: '#8a5a3a', wings: 'feather' },
    desc: '방어 34% 관통 · 치명 17% · 둔화 26%.'
  },
  {
    key: 'ice_assassin_ul32', name: '극의 빙정 척살자', rarity: 'ultimate', cls: 'assassin', elem: 'ice', dmg: 19250, spd: 1.95, rng: 2, proj: 'none', crit: 0.37, critMul: 2.5, execute: 0.15, slow: 0.42,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'braid', gear: 'halo', weapon: 'chakram', skin: '#d9a978', hairCol: '#d94f4f', wings: 'bat' },
    desc: '치명 37% · 둔화 42% · 처형.'
  },
  {
    key: 'dark_support_ul33', name: '천계의 나락 치유사', rarity: 'ultimate', cls: 'support', elem: 'dark', dmg: 11000, spd: 0.9, rng: 2.8, proj: 'ball', aura: { type: 'spd', amt: 0.17, radius: 2 }, curse: 0.14,
    look: { legs: 'biped', torso: 'spectral', head: 'orb', gear: 'horns', weapon: 'staff', skin: '#c89268', hairCol: '#3a2a1a', wings: 'feather' },
    desc: '저주 · 공속 오라 +17%.'
  },
  /* ------- 생성 : primordial ------- */
  {
    key: 'nature_bard_pr0', name: '대지의 연주자', rarity: 'primordial', cls: 'bard', elem: 'nature', dmg: 30000, spd: 1.23, rng: 3.4, proj: 'ball', aura: { type: 'gold', amt: 0.29, radius: 3 }, regen: 0.06,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'long', gear: 'hood', weapon: 'harp', skin: '#d9a978', hairCol: '#d94f4f', wings: 'energy' },
    desc: '생명 재생 · 골드 오라 +29%.'
  },
  {
    key: 'wind_summoner_pr1', name: '태초의 창공 사역자', rarity: 'primordial', cls: 'summoner', elem: 'wind', dmg: 30000, spd: 1.06, rng: 3.1, proj: 'ball', summon: { count: 3, dmg: 9000, spd: 1.2 },
    look: { legs: 'biped', torso: 'cloak', head: 'orb', gear: 'horns', weapon: 'staff', skin: '#f0c9a0', hairCol: '#8a5a3a', wings: 'bat' },
    desc: '정령 3기 소환.'
  },
  {
    key: 'time_engineer_pr2', name: '태초의 시류 정비사', rarity: 'primordial', cls: 'engineer', elem: 'time', dmg: 34650, spd: 1.1, rng: 3.8, proj: 'bolt', splash: 1.21, slow: 0.23,
    look: { legs: 'biped', torso: 'plate', head: 'orb', gear: 'antlers', weapon: 'rifle', skin: '#f2d0ad', hairCol: '#6b4a2a', wings: 'bat' },
    desc: '범위 폭발 · 둔화 23%.'
  },
  {
    key: 'ice_warlock_pr3', name: '창세의 빙정 저주술사', rarity: 'primordial', cls: 'warlock', elem: 'ice', dmg: 33000, spd: 1.09, rng: 3.3, proj: 'ball', poison: { dps: 330, dur: 4, stack: 5 }, curse: 0.22, slow: 0.33,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'braid', gear: 'mask', weapon: 'wand', skin: '#f0c9a0', hairCol: '#2b2b33', wings: 'feather' },
    desc: '중독 · 둔화 33% · 저주.'
  },
  {
    key: 'holy_archer_pr4', name: '태초의 성역 연사수', rarity: 'primordial', cls: 'archer', elem: 'holy', dmg: 30000, spd: 1.64, rng: 4.1, proj: 'arrow', crit: 0.15, critMul: 2.2, holyBonus: 0.25,
    look: { legs: 'biped', torso: 'cloak', head: 'dragonHead', gear: 'visor', weapon: 'crossbow', skin: '#c89268', hairCol: '#c9a227', wings: 'bat' },
    desc: '치명 15%.'
  },
  {
    key: 'arcane_sniper_pr5', name: '창세의 마력 명사수', rarity: 'primordial', cls: 'sniper', elem: 'arcane', dmg: 60100, spd: 0.5, rng: 7, proj: 'arrow', pen: 0.32, crit: 0.42, critMul: 2.5,
    look: { legs: 'biped', torso: 'leather', head: 'demonHead', gear: 'mask', weapon: 'crossbow', skin: '#f2d0ad', hairCol: '#4a3524', wings: 'bat' },
    desc: '방어 32% 관통 · 치명 42%.'
  },
  {
    key: 'earth_mage_pr6', name: '창세의 대지 주술사', rarity: 'primordial', cls: 'mage', elem: 'earth', dmg: 39400, spd: 1.25, rng: 3.3, proj: 'ball', stun: 0.06,
    look: { legs: 'biped', torso: 'robe', head: 'dragonHead', gear: 'horns', weapon: 'orb', skin: '#c89268', hairCol: '#c9a227', wings: 'bat' },
    desc: '기절.'
  },
  {
    key: 'phys_artillery_pr7', name: '원초 강습 폭격수', rarity: 'primordial', cls: 'artillery', elem: 'phys', dmg: 67150, spd: 0.69, rng: 4.1, proj: 'bomb', splash: 1.02, stun: 0.07,
    look: { legs: 'biped', torso: 'plate', head: 'demonHead', gear: 'halo', weapon: 'sling', skin: '#e8bf95', hairCol: '#8a5a3a', wings: 'bat' },
    desc: '범위 폭발 · 기절.'
  },
  {
    key: 'thunder_guardian_pr8', name: '원초 섬전 검사', rarity: 'primordial', cls: 'guardian', elem: 'thunder', dmg: 55800, spd: 1.3, rng: 2.3, proj: 'none', pen: 0.57, crit: 0.21, critMul: 2.1, chain: 2,
    look: { legs: 'biped', torso: 'plate', head: 'demonHead', gear: 'visor', weapon: 'hammer', skin: '#f0c9a0', hairCol: '#4a3524', wings: 'energy' },
    desc: '방어 57% 관통 · 치명 21% · 2회 연쇄.'
  },
  {
    key: 'dark_assassin_pr9', name: '원초 검은 자객', rarity: 'primordial', cls: 'assassin', elem: 'dark', dmg: 44450, spd: 1.92, rng: 2.4, proj: 'none', crit: 0.36, critMul: 2.2, execute: 0.15, curse: 0.12,
    look: { legs: 'biped', torso: 'cloak', head: 'orb', gear: 'hood', weapon: 'chakram', skin: '#d9a978', hairCol: '#6b4a2a', wings: 'feather' },
    desc: '치명 36% · 처형 · 저주.'
  },
  {
    key: 'void_support_pr10', name: '태초의 차원 수도자', rarity: 'primordial', cls: 'support', elem: 'void', dmg: 30000, spd: 1.04, rng: 2.8, proj: 'ball', aura: { type: 'spd', amt: 0.29, radius: 2 }, pen: 0.2,
    look: { legs: 'biped', torso: 'robe', head: 'dragonHead', gear: 'horns', weapon: 'staff', skin: '#ffe0c0', hairCol: '#8a5a3a', wings: 'feather' },
    desc: '방어 20% 관통 · 공속 오라 +29%.'
  },
  {
    key: 'time_bard_pr11', name: '태초의 시간 악사', rarity: 'primordial', cls: 'bard', elem: 'time', dmg: 30000, spd: 1.47, rng: 3.4, proj: 'ball', aura: { type: 'gold', amt: 0.13, radius: 2 }, slow: 0.21,
    look: { legs: 'biped', torso: 'robe', head: 'human', hair: 'braid', gear: 'hood', weapon: 'harp', skin: '#ffe0c0', hairCol: '#2b2b33', wings: 'bat' },
    desc: '둔화 21% · 골드 오라 +13%.'
  },
  {
    key: 'ice_summoner_pr12', name: '원초 삭풍 부름꾼', rarity: 'primordial', cls: 'summoner', elem: 'ice', dmg: 42900, spd: 0.86, rng: 2.9, proj: 'ball', summon: { count: 3, dmg: 12870, spd: 1.2 },
    look: { legs: 'biped', torso: 'robe', head: 'orb', gear: 'hood', weapon: 'orb', skin: '#e8bf95', hairCol: '#8e5b9e', wings: 'energy' },
    desc: '정령 3기 소환.'
  },
  {
    key: 'holy_engineer_pr13', name: '정화의 설계자', rarity: 'primordial', cls: 'engineer', elem: 'holy', dmg: 50300, spd: 1.3, rng: 4, proj: 'bolt', splash: 1.2,
    look: { legs: 'biped', torso: 'core', head: 'human', hair: 'long', gear: 'crown', weapon: 'rifle', skin: '#b9825a', hairCol: '#c9a227', wings: 'feather' },
    desc: '범위 폭발.'
  },
  {
    key: 'arcane_warlock_pr14', name: '창세의 신비 마령술사', rarity: 'primordial', cls: 'warlock', elem: 'arcane', dmg: 52350, spd: 1, rng: 3.4, proj: 'ball', curse: 0.09,
    look: { legs: 'biped', torso: 'cloak', head: 'orb', gear: 'mask', weapon: 'tome', skin: '#f2d0ad', hairCol: '#c9a227', wings: 'insectWing' },
    desc: '저주.'
  },
  {
    key: 'earth_archer_pr15', name: '태초의 반석 궁병', rarity: 'primordial', cls: 'archer', elem: 'earth', dmg: 46250, spd: 1.95, rng: 4.1, proj: 'arrow', multishot: 3, crit: 0.31, critMul: 2.9, stun: 0.09,
    look: { legs: 'biped', torso: 'cloak', head: 'dragonHead', gear: 'visor', weapon: 'bow', skin: '#f2d0ad', hairCol: '#8e5b9e', wings: 'insectWing' },
    desc: '치명 31% · 3연사 · 기절.'
  },
  {
    key: 'phys_sniper_pr16', name: '원초 천군 저격수', rarity: 'primordial', cls: 'sniper', elem: 'phys', dmg: 88000, spd: 0.41, rng: 7.3, proj: 'arrow', pen: 0.54, crit: 0.16, critMul: 2,
    look: { legs: 'biped', torso: 'leather', head: 'demonHead', gear: 'halo', weapon: 'rifle', skin: '#b9825a', hairCol: '#4a3524', wings: 'insectWing' },
    desc: '방어 54% 관통 · 치명 16%.'
  },
  {
    key: 'thunder_mage_pr17', name: '창세의 천둥 사도', rarity: 'primordial', cls: 'mage', elem: 'thunder', dmg: 60750, spd: 1.29, rng: 4.1, proj: 'ball', splash: 1.19, chain: 4,
    look: { legs: 'biped', torso: 'robe', head: 'orb', gear: 'horns', weapon: 'wand', skin: '#d9a978', hairCol: '#8e5b9e', wings: 'insectWing' },
    desc: '범위 폭발 · 4회 연쇄.'
  },
  {
    key: 'dark_artillery_pr18', name: '원초 나락 파쇄자', rarity: 'primordial', cls: 'artillery', elem: 'dark', dmg: 88000, spd: 0.45, rng: 3.9, proj: 'bomb', splash: 0.96, stun: 0.15, curse: 0.12,
    look: { legs: 'biped', torso: 'leather', head: 'human', hair: 'short', gear: 'hood', weapon: 'cannon', skin: '#f0c9a0', hairCol: '#8e5b9e', wings: 'insectWing' },
    desc: '범위 폭발 · 기절 · 저주.'
  },
  {
    key: 'void_guardian_pr19', name: '원초 공동 검사', rarity: 'primordial', cls: 'guardian', elem: 'void', dmg: 88000, spd: 0.83, rng: 2, proj: 'none', pen: 0.36,
    look: { legs: 'biped', torso: 'plate', head: 'dragonHead', gear: 'crown', weapon: 'sword', skin: '#b9825a', hairCol: '#2b2b33', wings: 'bat' },
    desc: '방어 36% 관통.'
  },
  {
    key: 'blood_assassin_pr20', name: '태초의 혈향 암살자', rarity: 'primordial', cls: 'assassin', elem: 'blood', dmg: 65000, spd: 2.09, rng: 2.3, proj: 'none', crit: 0.14, critMul: 2.3,
    look: { legs: 'biped', torso: 'leather', head: 'demonHead', gear: 'visor', weapon: 'chakram', skin: '#c89268', hairCol: '#8e5b9e', wings: 'energy' },
    desc: '치명 14%.'
  },
  {
    key: 'fire_support_pr21', name: '태초의 겁화 사제', rarity: 'primordial', cls: 'support', elem: 'fire', dmg: 39800, spd: 1.14, rng: 3.2, proj: 'ball', aura: { type: 'rng', amt: 0.16, radius: 2 },
    look: { legs: 'biped', torso: 'robe', head: 'demonHead', gear: 'crown', weapon: 'staff', skin: '#c89268', hairCol: '#8a5a3a', wings: 'insectWing' },
    desc: '사거리 오라 +16%.'
  },
  {
    key: 'holy_bard_pr22', name: '원초 백광 악사', rarity: 'primordial', cls: 'bard', elem: 'holy', dmg: 47550, spd: 1.47, rng: 3.3, proj: 'ball', aura: { type: 'rng', amt: 0.26, radius: 2 }, holyBonus: 0.29,
    look: { legs: 'biped', torso: 'cloak', head: 'orb', gear: 'mask', weapon: 'harp', skin: '#e8bf95', hairCol: '#8e5b9e', wings: 'energy' },
    desc: '사거리 오라 +26%.'
  },
  {
    key: 'arcane_summoner_pr23', name: '창세의 고대 소환사', rarity: 'primordial', cls: 'summoner', elem: 'arcane', dmg: 63550, spd: 0.87, rng: 3, proj: 'ball', summon: { count: 3, dmg: 19065, spd: 1.2 },
    look: { legs: 'float', torso: 'cloak', head: 'human', hair: 'short', gear: 'mask', weapon: 'tome', skin: '#b9825a', hairCol: '#c9a227', wings: 'bat' },
    desc: '정령 3기 소환.'
  },
  {
    key: 'earth_engineer_pr24', name: '원초 융기 기술자', rarity: 'primordial', cls: 'engineer', elem: 'earth', dmg: 80550, spd: 1.45, rng: 3.3, proj: 'bolt', splash: 0.87, stun: 0.11,
    look: { legs: 'biped', torso: 'core', head: 'demonHead', gear: 'hood', weapon: 'flask', skin: '#d9a978', hairCol: '#2b2b33', wings: 'insectWing' },
    desc: '범위 폭발 · 기절.'
  },
  {
    key: 'phys_warlock_pr25', name: '역전의 금술사', rarity: 'primordial', cls: 'warlock', elem: 'phys', dmg: 80700, spd: 1.17, rng: 3.2, proj: 'ball', poison: { dps: 807, dur: 6, stack: 5 }, curse: 0.09,
    look: { legs: 'biped', torso: 'cloak', head: 'demonHead', gear: 'mask', weapon: 'wand', skin: '#d9a978', hairCol: '#4a3524', wings: 'insectWing' },
    desc: '중독 · 저주.'
  },
];
const UNIT_MAP = {}; UNITS.forEach(u => UNIT_MAP[u.key] = u);
const UNITS_BY_RARITY = {};
RARITY.forEach(r => UNITS_BY_RARITY[r.key] = UNITS.filter(u => u.rarity === r.key));

/* =========================================================================
 *  적 110종
 *  look : legs / torso / head / gear / weapon / wings
 *  flags: fast flying armored shield regen split healer summoner teleport
 *         rage ghost undead magicres boss
 * ========================================================================= */
const ENEMIES = [
  /* ------------------------------------------------ 티어 0 : 웨이브 1~8 */
  {
    key: 'slime', name: '슬라임', tier: 0, color: '#7ce07c', hp: .8, spd: .95, armor: 0, bounty: 1.0,
    flags: ['split'], splitInto: 'slimelet', splitN: 2,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'slimelet', name: '작은 슬라임', tier: 0, color: '#a8f0a8', hp: .28, spd: 1.25, armor: 0, bounty: .4, scale: .62,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'goblin', name: '고블린', tier: 0, color: '#8fbf5a', hp: 1.0, spd: 1.15, armor: 0, bounty: 1.0,
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'dagger' }
  },
  {
    key: 'rat', name: '거대 쥐', tier: 0, color: '#9a8f7a', hp: .7, spd: 1.5, armor: 0, bounty: .9, flags: ['fast'],
    look: { legs: 'quad', torso: 'chitin', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'bat', name: '동굴 박쥐', tier: 0, color: '#8a6bb0', hp: .6, spd: 1.7, armor: 0, bounty: 1.0, flags: ['flying', 'fast'],
    look: { legs: 'float', torso: 'chitin', head: 'beastHead', weapon: 'none', wings: 'bat' }
  },
  {
    key: 'skeleton', name: '해골 병사', tier: 0, color: '#e6e2d0', hp: 1.15, spd: 1.0, armor: 2, bounty: 1.1, flags: ['undead'],
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'sword' }
  },
  {
    key: 'kobold', name: '코볼드', tier: 0, color: '#c88a4a', hp: .9, spd: 1.3, armor: 1, bounty: 1.0,
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'spear' }
  },
  {
    key: 'mushling', name: '버섯 요괴', tier: 0, color: '#d86a8a', hp: 1.2, spd: .85, armor: 0, bounty: 1.1,
    flags: ['split'], splitInto: 'spore', splitN: 2,
    look: { legs: 'biped', torso: 'blob', head: 'orb', weapon: 'none' }
  },
  {
    key: 'spore', name: '포자', tier: 0, color: '#f0a0c0', hp: .22, spd: 1.5, armor: 0, bounty: .35, scale: .55,
    look: { legs: 'float', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'crow', name: '까마귀 떼', tier: 0, color: '#5a5468', hp: .55, spd: 1.85, armor: 0, bounty: .9, flags: ['flying', 'fast'],
    look: { legs: 'float', torso: 'chitin', head: 'beastHead', weapon: 'none', wings: 'feather' }
  },

  /* ------------------------------------------------ 티어 1 : 웨이브 6~18 */
  {
    key: 'orc', name: '오크 전사', tier: 1, color: '#6f9c4a', hp: 2.4, spd: .92, armor: 6, bounty: 1.4, flags: ['armored'],
    look: { legs: 'biped', torso: 'brute', head: 'beastHead', weapon: 'axe' }
  },
  {
    key: 'wolf', name: '서리늑대', tier: 1, color: '#9fc9e8', hp: 1.6, spd: 1.75, armor: 2, bounty: 1.3, flags: ['fast'],
    look: { legs: 'quad', torso: 'chitin', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'zombie', name: '역병 좀비', tier: 1, color: '#7a9e6a', hp: 3.0, spd: .68, armor: 3, bounty: 1.4,
    flags: ['undead', 'regen'], regen: .012,
    look: { legs: 'biped', torso: 'leather', head: 'human', weapon: 'none' }
  },
  {
    key: 'spider', name: '독거미', tier: 1, color: '#a05fbf', hp: 1.5, spd: 1.35, armor: 1, bounty: 1.3, flags: ['fast'],
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'imp', name: '임프', tier: 1, color: '#ff8a5a', hp: 1.4, spd: 1.5, armor: 0, bounty: 1.4, flags: ['flying'],
    resist: { fire: .5 },
    look: { legs: 'float', torso: 'leather', head: 'demonHead', weapon: 'none', wings: 'bat' }
  },
  {
    key: 'shielder', name: '방패병', tier: 1, color: '#c0c8d4', hp: 2.2, spd: .8, armor: 10, bounty: 1.6,
    flags: ['armored', 'shield'], shield: .5,
    look: { legs: 'biped', torso: 'plate', head: 'human', gear: 'helm', weapon: 'sword' }
  },
  {
    key: 'mage_e', name: '고블린 주술사', tier: 1, color: '#b06fd6', hp: 1.8, spd: .95, armor: 2, bounty: 1.7,
    flags: ['healer'], healAmt: .02, healRadius: 2.5,
    look: { legs: 'biped', torso: 'robe', head: 'beastHead', gear: 'hood', weapon: 'staff' }
  },
  {
    key: 'bandit', name: '산적', tier: 1, color: '#b07a4a', hp: 2.0, spd: 1.2, armor: 4, bounty: 1.5,
    look: { legs: 'biped', torso: 'leather', head: 'human', gear: 'mask', weapon: 'dagger' }
  },
  {
    key: 'boarrider', name: '멧돼지 기수', tier: 1, color: '#8a6a4a', hp: 2.8, spd: 1.45, armor: 5, bounty: 1.7, flags: ['fast'],
    look: { legs: 'quad', torso: 'brute', head: 'beastHead', weapon: 'spear' }
  },
  {
    key: 'gnoll', name: '놀 약탈자', tier: 1, color: '#c8a060', hp: 2.2, spd: 1.3, armor: 3, bounty: 1.5,
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'axe' }
  },
  {
    key: 'wisp_e', name: '도깨비불', tier: 1, color: '#8fe8d0', hp: 1.2, spd: 1.6, armor: 0, bounty: 1.6,
    flags: ['flying', 'ghost'], resist: { phys: .5 },
    look: { legs: 'float', torso: 'spectral', head: 'orb', weapon: 'none' }
  },
  {
    key: 'scarab', name: '강철 풍뎅이', tier: 1, color: '#7a8a9a', hp: 2.6, spd: 1.0, armor: 12, bounty: 1.6, flags: ['armored'],
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },

  /* ------------------------------------------------ 티어 2 : 웨이브 15~34 */
  {
    key: 'ogre', name: '오우거', tier: 2, color: '#a8834f', hp: 6.5, spd: .72, armor: 12, bounty: 2.2, flags: ['armored'], scale: 1.3,
    look: { legs: 'biped', torso: 'brute', head: 'beastHead', weapon: 'hammer' }
  },
  {
    key: 'wraith', name: '망령', tier: 2, color: '#9fb6ff', hp: 3.2, spd: 1.3, armor: 0, bounty: 2.0,
    flags: ['flying', 'ghost', 'undead'], resist: { phys: .55 },
    look: { legs: 'wisp', torso: 'spectral', head: 'skull', gear: 'hood', weapon: 'scythe' }
  },
  {
    key: 'golem', name: '바위 골렘', tier: 2, color: '#8c8c8c', hp: 11, spd: .55, armor: 26, bounty: 2.6,
    flags: ['armored'], scale: 1.35, resist: { phys: .25 },
    look: { legs: 'biped', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'harpy', name: '하피', tier: 2, color: '#ffd36b', hp: 3.0, spd: 2.0, armor: 3, bounty: 2.1, flags: ['flying', 'fast'],
    look: { legs: 'float', torso: 'leather', head: 'beastHead', weapon: 'claw', wings: 'feather' }
  },
  {
    key: 'necro', name: '강령술사', tier: 2, color: '#a06fd6', hp: 4.0, spd: .85, armor: 5, bounty: 2.8,
    flags: ['summoner', 'undead'], summonKey: 'skeleton', summonN: 2, summonCd: 5,
    look: { legs: 'biped', torso: 'robe', head: 'skull', gear: 'hood', weapon: 'tome' }
  },
  {
    key: 'brute', name: '광폭 오크', tier: 2, color: '#c0562f', hp: 5.5, spd: 1.0, armor: 8, bounty: 2.3, flags: ['rage'], rageSpd: 1.9,
    look: { legs: 'biped', torso: 'brute', head: 'beastHead', gear: 'horns', weapon: 'greatsword' }
  },
  {
    key: 'crystal', name: '수정 정령', tier: 2, color: '#6be3ff', hp: 4.5, spd: 1.0, armor: 6, bounty: 2.5,
    flags: ['shield'], shield: 1.2, resist: { ice: .8 },
    look: { legs: 'float', torso: 'crystal', head: 'orb', weapon: 'none' }
  },
  {
    key: 'blob', name: '거대 점액', tier: 2, color: '#5ac9a0', hp: 8.0, spd: .7, armor: 4, bounty: 2.4,
    flags: ['split'], splitInto: 'slime', splitN: 3, scale: 1.4,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'centaur', name: '켄타우로스 궁수', tier: 2, color: '#b08a5a', hp: 5.0, spd: 1.4, armor: 8, bounty: 2.5, flags: ['fast'],
    look: { legs: 'quad', torso: 'leather', head: 'human', weapon: 'bow' }
  },
  {
    key: 'gargoyle', name: '가고일', tier: 2, color: '#7a8494', hp: 6.0, spd: .95, armor: 22, bounty: 2.6,
    flags: ['flying', 'armored'], resist: { phys: .35 },
    look: { legs: 'float', torso: 'core', head: 'demonHead', gear: 'horns', weapon: 'none', wings: 'bat' }
  },
  {
    key: 'cultist', name: '광신도', tier: 2, color: '#a04a6a', hp: 3.6, spd: 1.1, armor: 4, bounty: 2.4,
    flags: ['healer'], healAmt: .025, healRadius: 3.0,
    look: { legs: 'biped', torso: 'robe', head: 'human', gear: 'hood', weapon: 'dagger' }
  },
  {
    key: 'mudling', name: '진흙 골렘', tier: 2, color: '#6a5a3a', hp: 7.5, spd: .62, armor: 14, bounty: 2.3,
    flags: ['regen'], regen: .02, resist: { phys: .2 },
    look: { legs: 'none', torso: 'blob', head: 'orb', weapon: 'none' }
  },
  {
    key: 'flameling', name: '화염 정령', tier: 2, color: '#ff7a3a', hp: 4.2, spd: 1.25, armor: 4, bounty: 2.4,
    resist: { fire: .9, ice: -.5 },
    look: { legs: 'float', torso: 'spectral', head: 'orb', weapon: 'none' }
  },
  {
    key: 'frostling', name: '서리 정령', tier: 2, color: '#7fd8ff', hp: 4.2, spd: 1.1, armor: 6, bounty: 2.4,
    resist: { ice: .9, fire: -.5 },
    look: { legs: 'float', torso: 'crystal', head: 'orb', weapon: 'none' }
  },
  {
    key: 'plaguebearer', name: '역병 운반자', tier: 2, color: '#8fbf5a', hp: 6.2, spd: .8, armor: 8, bounty: 2.6,
    flags: ['undead', 'healer'], healAmt: .02, healRadius: 3.2, resist: { poison: .95 },
    look: { legs: 'biped', torso: 'robe', head: 'human', gear: 'plague', weapon: 'flask' }
  },

  /* ------------------------------------------------ 티어 3 : 웨이브 28~55 */
  {
    key: 'knight_e', name: '흑기사', tier: 3, color: '#4d4a68', hp: 16, spd: .95, armor: 45, bounty: 3.4,
    flags: ['armored'], resist: { phys: .3 },
    look: { legs: 'biped', torso: 'plate', head: 'skull', gear: 'helm', weapon: 'greatsword' }
  },
  {
    key: 'demon', name: '심연 악마', tier: 3, color: '#e0466b', hp: 20, spd: 1.05, armor: 22, bounty: 3.8,
    resist: { fire: .7, dark: .5 },
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', gear: 'horns', weapon: 'claw', wings: 'bat' }
  },
  {
    key: 'lich', name: '리치', tier: 3, color: '#7fd6ff', hp: 18, spd: .8, armor: 18, bounty: 4.2,
    flags: ['summoner', 'undead', 'magicres'], summonKey: 'wraith', summonN: 2, summonCd: 6, resist: { arcane: .5 },
    look: { legs: 'wisp', torso: 'robe', head: 'skull', gear: 'crown', weapon: 'staff' }
  },
  {
    key: 'juggernaut', name: '철갑 거인', tier: 3, color: '#7f8fa6', hp: 42, spd: .5, armor: 90, bounty: 5.0,
    flags: ['armored'], scale: 1.55, resist: { phys: .45 },
    look: { legs: 'biped', torso: 'plate', head: 'machine', gear: 'helm', weapon: 'hammer' }
  },
  {
    key: 'phantom', name: '유령 암살자', tier: 3, color: '#c6b3ff', hp: 12, spd: 1.6, armor: 5, bounty: 3.6,
    flags: ['ghost', 'teleport', 'fast'], resist: { phys: .6 },
    look: { legs: 'wisp', torso: 'cloak', head: 'skull', gear: 'mask', weapon: 'dagger' }
  },
  {
    key: 'hydra', name: '히드라', tier: 3, color: '#3fbf8f', hp: 30, spd: .85, armor: 26, bounty: 4.6,
    flags: ['regen', 'split'], regen: .03, splitInto: 'wolf', splitN: 2, scale: 1.35,
    look: { legs: 'quad', torso: 'scaled', head: 'dragonHead', weapon: 'none' }
  },
  {
    key: 'seraph_e', name: '타락 천사', tier: 3, color: '#ffe9a8', hp: 24, spd: 1.25, armor: 20, bounty: 4.4,
    flags: ['flying', 'healer'], healAmt: .035, healRadius: 3.4, resist: { holy: .8 },
    look: { legs: 'float', torso: 'robe', head: 'human', gear: 'halo', weapon: 'sword', wings: 'feather' }
  },
  {
    key: 'mech', name: '전투 기계', tier: 3, color: '#b0b8c4', hp: 34, spd: .95, armor: 60, bounty: 4.8,
    flags: ['armored', 'shield'], shield: 2.0, resist: { poison: .9, thunder: -.4 },
    look: { legs: 'track', torso: 'core', head: 'machine', gear: 'visor', weapon: 'cannon' }
  },
  {
    key: 'minotaur', name: '미노타우로스', tier: 3, color: '#a04a2a', hp: 28, spd: 1.15, armor: 34, bounty: 4.2,
    flags: ['rage'], rageSpd: 1.7, scale: 1.35,
    look: { legs: 'biped', torso: 'brute', head: 'beastHead', gear: 'horns', weapon: 'axe' }
  },
  {
    key: 'banshee', name: '밴시', tier: 3, color: '#b0e8ff', hp: 15, spd: 1.4, armor: 8, bounty: 4.0,
    flags: ['flying', 'ghost', 'undead', 'healer'], healAmt: .03, healRadius: 3.0, resist: { phys: .65 },
    look: { legs: 'wisp', torso: 'spectral', head: 'human', gear: 'hood', weapon: 'none' }
  },
  {
    key: 'warlock_e', name: '어둠 술사', tier: 3, color: '#8a4ad6', hp: 17, spd: .9, armor: 16, bounty: 4.4,
    flags: ['summoner', 'magicres'], summonKey: 'imp', summonN: 3, summonCd: 5, resist: { dark: .8 },
    look: { legs: 'biped', torso: 'robe', head: 'demonHead', gear: 'hood', weapon: 'tome' }
  },
  {
    key: 'sandworm', name: '모래벌레', tier: 3, color: '#d8b070', hp: 36, spd: .95, armor: 30, bounty: 4.6,
    flags: ['teleport'], scale: 1.4, resist: { earth: .8 },
    look: { legs: 'none', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'frostgiant', name: '서리 거인', tier: 3, color: '#8fd0e8', hp: 40, spd: .62, armor: 55, bounty: 4.9,
    flags: ['armored'], scale: 1.5, resist: { ice: .9, fire: -.3 },
    look: { legs: 'biped', torso: 'brute', head: 'human', gear: 'horns', weapon: 'greatsword' }
  },
  {
    key: 'stalker', name: '그림자 추적자', tier: 3, color: '#6a5a8a', hp: 14, spd: 1.75, armor: 12, bounty: 3.8,
    flags: ['fast', 'ghost', 'teleport'], resist: { dark: .7 },
    look: { legs: 'wisp', torso: 'cloak', head: 'orb', gear: 'hood', weapon: 'claw' }
  },
  {
    key: 'siegetower', name: '공성 병기', tier: 3, color: '#8a7a5a', hp: 55, spd: .45, armor: 70, bounty: 5.4,
    flags: ['armored', 'shield'], shield: 1.5, scale: 1.6, resist: { phys: .4 },
    look: { legs: 'track', torso: 'core', head: 'none', weapon: 'launcher' }
  },

  /* ------------------------------------------------ 티어 4 : 웨이브 45~80 */
  {
    key: 'voidling', name: '공허 파편', tier: 4, color: '#a78bff', hp: 55, spd: 1.2, armor: 40, bounty: 6.0,
    flags: ['ghost', 'teleport'], resist: { arcane: .6, void: -.5 },
    look: { legs: 'float', torso: 'crystal', head: 'orb', weapon: 'none' }
  },
  {
    key: 'behemoth', name: '베히모스', tier: 4, color: '#c2683f', hp: 130, spd: .55, armor: 140, bounty: 8.0,
    flags: ['armored', 'rage'], rageSpd: 1.6, scale: 1.7, resist: { phys: .5 },
    look: { legs: 'quad', torso: 'brute', head: 'beastHead', gear: 'horns', weapon: 'none' }
  },
  {
    key: 'revenant', name: '리븐넌트', tier: 4, color: '#e8e0ff', hp: 80, spd: 1.15, armor: 55, bounty: 7.0,
    flags: ['undead', 'regen', 'summoner'], regen: .05, summonKey: 'skeleton', summonN: 3, summonCd: 4,
    look: { legs: 'biped', torso: 'bone', head: 'skull', gear: 'crown', weapon: 'greatsword' }
  },
  {
    key: 'archdemon', name: '대악마', tier: 4, color: '#ff3f5f', hp: 110, spd: .95, armor: 80, bounty: 8.5,
    flags: ['rage'], rageSpd: 1.5, resist: { fire: .85, holy: -.4 }, scale: 1.4,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', gear: 'horns', weapon: 'scythe', wings: 'bat' }
  },
  {
    key: 'stormdrake', name: '폭풍 비룡', tier: 4, color: '#7fd0ff', hp: 95, spd: 1.35, armor: 65, bounty: 8.0,
    flags: ['flying', 'fast'], resist: { thunder: .9 }, scale: 1.35,
    look: { legs: 'float', torso: 'scaled', head: 'dragonHead', gear: 'horns', weapon: 'none', wings: 'bat' }
  },
  {
    key: 'nullwalker', name: '무의 보행자', tier: 4, color: '#cfd8ff', hp: 150, spd: .9, armor: 100, bounty: 9.5,
    flags: ['ghost', 'shield', 'magicres'], shield: 4.0, resist: { arcane: .7, phys: .5 },
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', gear: 'crown', weapon: 'none' }
  },
  {
    key: 'titan', name: '고대 타이탄', tier: 4, color: '#d8c48a', hp: 260, spd: .48, armor: 220, bounty: 12,
    flags: ['armored', 'shield'], shield: 3.0, scale: 1.8, resist: { phys: .55, poison: .9 },
    look: { legs: 'biped', torso: 'core', head: 'machine', gear: 'crown', weapon: 'hammer' }
  },
  {
    key: 'swarmer', name: '공허 군체', tier: 4, color: '#b06bff', hp: 40, spd: 1.55, armor: 30, bounty: 5.5,
    flags: ['fast', 'split'], splitInto: 'voidling', splitN: 2,
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none', wings: 'insectWing' }
  },
  {
    key: 'doomknight', name: '파멸 기사', tier: 4, color: '#5a3a6a', hp: 120, spd: 1.0, armor: 130, bounty: 8.2,
    flags: ['armored', 'rage'], rageSpd: 1.4, resist: { phys: .45, dark: .8 },
    look: { legs: 'biped', torso: 'plate', head: 'skull', gear: 'horns', weapon: 'greatsword' }
  },
  {
    key: 'chronowraith', name: '시간 망령', tier: 4, color: '#a8b8ff', hp: 85, spd: 1.3, armor: 50, bounty: 8.0,
    flags: ['ghost', 'teleport', 'flying'], resist: { time: .9, phys: .5 },
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', gear: 'crown', weapon: 'scythe' }
  },
  {
    key: 'magmaborn', name: '용암 태생', tier: 4, color: '#ff6a2a', hp: 105, spd: .8, armor: 75, bounty: 7.8,
    flags: ['armored', 'regen'], regen: .03, resist: { fire: .95, ice: -.4 },
    look: { legs: 'biped', torso: 'core', head: 'demonHead', gear: 'horns', weapon: 'none' }
  },
  {
    key: 'bloodqueen', name: '피의 여왕', tier: 4, color: '#e01a4a', hp: 130, spd: 1.1, armor: 70, bounty: 9.0,
    flags: ['healer', 'regen', 'flying'], healAmt: .05, healRadius: 4.0, regen: .04, resist: { blood: .9 },
    look: { legs: 'wisp', torso: 'cloak', head: 'human', gear: 'crown', weapon: 'scythe', wings: 'bat' }
  },
  {
    key: 'obelisk', name: '수호 오벨리스크', tier: 4, color: '#c0a8ff', hp: 200, spd: .4, armor: 190, bounty: 10,
    flags: ['armored', 'shield', 'magicres'], shield: 5, scale: 1.7, resist: { arcane: .6, phys: .5 },
    look: { legs: 'none', torso: 'crystal', head: 'orb', weapon: 'none' }
  },
  {
    key: 'reaperling', name: '작은 사신', tier: 4, color: '#8f7bff', hp: 70, spd: 1.6, armor: 45, bounty: 7.2,
    flags: ['fast', 'ghost', 'teleport'], resist: { void: .8, phys: .5 },
    look: { legs: 'wisp', torso: 'cloak', head: 'skull', gear: 'hood', weapon: 'scythe' }
  },

  /* ------------------------------------------------ 티어 5 : 웨이브 70+ */
  {
    key: 'worldbreaker', name: '세계 파쇄자', tier: 5, color: '#ff8a2a', hp: 520, spd: .5, armor: 420, bounty: 18,
    flags: ['armored', 'rage', 'shield'], shield: 4, rageSpd: 1.5, scale: 1.9, resist: { phys: .6, fire: .6 },
    look: { legs: 'biped', torso: 'brute', head: 'machine', gear: 'horns', weapon: 'hammer' }
  },
  {
    key: 'starspawn', name: '별의 자손', tier: 5, color: '#ff5bd0', hp: 400, spd: 1.05, armor: 300, bounty: 16,
    flags: ['flying', 'ghost', 'teleport', 'magicres'], resist: { arcane: .8, phys: .6 },
    look: { legs: 'wisp', torso: 'spectral', head: 'insectHead', gear: 'crown', weapon: 'none', wings: 'energy' }
  },
  {
    key: 'eternalguard', name: '영원의 수문장', tier: 5, color: '#a8b8ff', hp: 700, spd: .42, armor: 620, bounty: 22,
    flags: ['armored', 'shield', 'magicres', 'regen'], shield: 8, regen: .02, scale: 2.0,
    resist: { phys: .6, arcane: .6, time: .9 },
    look: { legs: 'none', torso: 'core', head: 'orb', gear: 'crown', weapon: 'halberd' }
  },
  {
    key: 'devourer', name: '탐식의 화신', tier: 5, color: '#c01a3a', hp: 620, spd: .85, armor: 380, bounty: 20,
    flags: ['rage', 'regen', 'armored'], rageSpd: 1.8, regen: .06, scale: 1.9, resist: { blood: .9, phys: .5 },
    look: { legs: 'quad', torso: 'brute', head: 'demonHead', gear: 'horns', weapon: 'claw' }
  },
  {
    key: 'nullpriest', name: '공허 사제', tier: 5, color: '#8f7bff', hp: 460, spd: .9, armor: 340, bounty: 19,
    flags: ['healer', 'summoner', 'magicres', 'shield'], shield: 6, healAmt: .06, healRadius: 5,
    summonKey: 'voidling', summonN: 3, summonCd: 4, resist: { void: .9, arcane: .7 },
    look: { legs: 'wisp', torso: 'robe', head: 'skull', gear: 'crown', weapon: 'tome' }
  },


  /* ------------------------------------------------ 맵 고유 정예 12 */
  {
    key: 'E_meadowlord', name: '초원의 수호목', tier: 3, elite: true, color: '#6fbf4a', hp: 26, spd: .6, armor: 40, bounty: 5.5,
    flags: ['armored', 'regen', 'healer'], regen: .04, healAmt: .03, healRadius: 3.6, scale: 1.5,
    resist: { nature: .9, fire: -.4 },
    look: { legs: 'none', torso: 'brute', head: 'orb', gear: 'antlers', weapon: 'none' }
  },
  {
    key: 'E_dunestalker', name: '사구의 추적자', tier: 3, elite: true, color: '#e0a860', hp: 22, spd: 1.45, armor: 32, bounty: 5.2,
    flags: ['fast', 'teleport'], resist: { earth: .8, ice: -.3 },
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'E_glacialward', name: '빙결 감시자', tier: 3, elite: true, color: '#9fe4ff', hp: 34, spd: .7, armor: 60, bounty: 6.0,
    flags: ['armored', 'shield'], shield: 3, resist: { ice: .95, fire: -.4 }, scale: 1.4,
    look: { legs: 'float', torso: 'crystal', head: 'orb', gear: 'crown', weapon: 'none' }
  },
  {
    key: 'E_bogfiend', name: '늪의 악귀', tier: 3, elite: true, color: '#6a9a4a', hp: 38, spd: .8, armor: 44, bounty: 6.2,
    flags: ['regen', 'split', 'undead'], regen: .06, splitInto: 'plaguebearer', splitN: 2,
    resist: { poison: .98, holy: -.5 }, scale: 1.45,
    look: { legs: 'biped', torso: 'blob', head: 'skull', gear: 'plague', weapon: 'flask' }
  },
  {
    key: 'E_riftspawn', name: '균열의 산물', tier: 4, elite: true, color: '#c07fff', hp: 62, spd: 1.1, armor: 70, bounty: 7.4,
    flags: ['ghost', 'teleport', 'magicres'], resist: { arcane: .8, dark: .7, void: -.4 },
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', weapon: 'scythe' }
  },
  {
    key: 'E_bonelord', name: '뼈의 영주', tier: 4, elite: true, color: '#efe8d2', hp: 78, spd: .82, armor: 96, bounty: 8.2,
    flags: ['undead', 'armored', 'summoner'], summonKey: 'skeleton', summonN: 4, summonCd: 4,
    resist: { phys: .5, holy: -.5 }, scale: 1.5,
    look: { legs: 'biped', torso: 'bone', head: 'skull', gear: 'crown', weapon: 'halberd' }
  },
  {
    key: 'E_ashwalker', name: '잿빛 보행자', tier: 4, elite: true, color: '#ff7a3a', hp: 88, spd: .95, armor: 88, bounty: 8.4,
    flags: ['rage', 'armored'], rageSpd: 1.7, resist: { fire: .95, ice: -.5 }, scale: 1.45,
    look: { legs: 'biped', torso: 'core', head: 'demonHead', gear: 'horns', weapon: 'greatsword' }
  },
  {
    key: 'E_skyreaver', name: '창공의 약탈자', tier: 4, elite: true, color: '#9ff5e0', hp: 70, spd: 1.6, armor: 62, bounty: 8.0,
    flags: ['flying', 'fast', 'teleport'], resist: { wind: .9, thunder: .5 },
    look: { legs: 'float', torso: 'leather', head: 'beastHead', weapon: 'claw', wings: 'feather' }
  },
  {
    key: 'E_voidherald', name: '공허의 전령', tier: 5, elite: true, color: '#8f7bff', hp: 180, spd: .95, armor: 200, bounty: 11,
    flags: ['ghost', 'shield', 'magicres', 'summoner'], shield: 6,
    summonKey: 'voidling', summonN: 2, summonCd: 5, resist: { void: .9, arcane: .7, phys: .5 }, scale: 1.6,
    look: { legs: 'wisp', torso: 'spectral', head: 'skull', gear: 'crown', weapon: 'tome' }
  },
  {
    key: 'E_originseed', name: '태초의 씨앗', tier: 5, elite: true, color: '#ff5bd0', hp: 240, spd: .78, armor: 260, bounty: 13,
    flags: ['armored', 'shield', 'regen'], shield: 8, regen: .04,
    resist: { phys: .55, arcane: .6, holy: .4 }, scale: 1.7,
    look: { legs: 'none', torso: 'crystal', head: 'orb', gear: 'laurel', weapon: 'none' }
  },
  {
    key: 'E_ironvanguard', name: '강철 선봉대', tier: 4, elite: true, color: '#a8b4c4', hp: 110, spd: .72, armor: 180, bounty: 9.0,
    flags: ['armored', 'shield'], shield: 4, resist: { phys: .6, poison: .95, thunder: -.4 }, scale: 1.5,
    look: { legs: 'track', torso: 'core', head: 'machine', gear: 'visor', weapon: 'launcher' }
  },
  {
    key: 'E_crimsonchoir', name: '핏빛 성가대', tier: 4, elite: true, color: '#ff2a4a', hp: 96, spd: 1.05, armor: 84, bounty: 8.6,
    flags: ['healer', 'regen', 'flying'], healAmt: .06, healRadius: 4.5, regen: .05,
    resist: { blood: .95, dark: .6 },
    look: { legs: 'wisp', torso: 'robe', head: 'human', gear: 'halo', weapon: 'harp', wings: 'bat' }
  },

  /* ------------------------------------------------ 보스 20 */
  {
    key: 'B_goblinking', name: '고블린 왕', tier: 9, boss: true, color: '#7fbf3f', hp: 34, spd: .58, armor: 14, bounty: 22,
    flags: ['boss', 'summoner', 'armored'], summonKey: 'goblin', summonN: 4, summonCd: 4.5, scale: 2.0,
    look: { legs: 'biped', torso: 'brute', head: 'beastHead', gear: 'crown', weapon: 'axe' }
  },
  {
    key: 'B_bonecolossus', name: '뼈의 거신', tier: 9, boss: true, color: '#f0ead4', hp: 90, spd: .5, armor: 45, bounty: 34,
    flags: ['boss', 'undead', 'armored', 'regen'], regen: .02, summonKey: 'skeleton', summonN: 4, summonCd: 5, scale: 2.2,
    look: { legs: 'biped', torso: 'bone', head: 'skull', gear: 'horns', weapon: 'greatsword' }
  },
  {
    key: 'B_swarmmother', name: '군체의 어미', tier: 9, boss: true, color: '#b06bff', hp: 150, spd: .7, armor: 55, bounty: 40,
    flags: ['boss', 'summoner', 'regen'], summonKey: 'spider', summonN: 6, summonCd: 3.5, regen: .03, scale: 2.1,
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', gear: 'crown', weapon: 'none', wings: 'insectWing' }
  },
  {
    key: 'B_frostmonarch', name: '서리 군주', tier: 9, boss: true, color: '#8fe0ff', hp: 200, spd: .55, armor: 70, bounty: 46,
    flags: ['boss', 'armored', 'shield'], shield: 3, resist: { ice: .95 }, scale: 2.2,
    look: { legs: 'biped', torso: 'plate', head: 'human', gear: 'crown', weapon: 'halberd' }
  },
  {
    key: 'B_ironmaw', name: '강철 아가리', tier: 9, boss: true, color: '#9aa8b8', hp: 320, spd: .62, armor: 150, bounty: 52,
    flags: ['boss', 'armored', 'shield', 'rage'], shield: 4, rageSpd: 1.6, resist: { phys: .5 }, scale: 2.2,
    look: { legs: 'track', torso: 'core', head: 'machine', gear: 'visor', weapon: 'cannon' }
  },
  {
    key: 'B_infernus', name: '인페르누스', tier: 9, boss: true, color: '#ff5a2a', hp: 420, spd: .62, armor: 95, bounty: 60,
    flags: ['boss', 'rage'], rageSpd: 1.8, resist: { fire: .95 }, summonKey: 'imp', summonN: 4, summonCd: 4, scale: 2.3,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', gear: 'horns', weapon: 'greatsword', wings: 'bat' }
  },
  {
    key: 'B_venomhive', name: '맹독의 둥지', tier: 9, boss: true, color: '#6fd44a', hp: 560, spd: .55, armor: 130, bounty: 66,
    flags: ['boss', 'summoner', 'regen', 'armored'], summonKey: 'plaguebearer', summonN: 3, summonCd: 4.5,
    regen: .035, resist: { poison: .98 }, scale: 2.3,
    look: { legs: 'none', torso: 'chitin', head: 'insectHead', gear: 'horns', weapon: 'none' }
  },
  {
    key: 'B_theironhorn', name: '강철 뿔', tier: 9, boss: true, color: '#9fb0c4', hp: 900, spd: .5, armor: 260, bounty: 80,
    flags: ['boss', 'armored', 'shield'], shield: 5, resist: { phys: .6, poison: .95 }, scale: 2.4,
    look: { legs: 'biped', torso: 'plate', head: 'machine', gear: 'horns', weapon: 'hammer' }
  },
  {
    key: 'B_stormlord', name: '뇌전 군주', tier: 9, boss: true, color: '#ffe14d', hp: 1200, spd: .75, armor: 210, bounty: 92,
    flags: ['boss', 'flying', 'fast', 'shield'], shield: 4, resist: { thunder: .98 }, scale: 2.3,
    look: { legs: 'float', torso: 'plate', head: 'human', gear: 'crown', weapon: 'hammer', wings: 'energy' }
  },
  {
    key: 'B_dreadlich', name: '공포의 리치', tier: 9, boss: true, color: '#a37fff', hp: 1600, spd: .6, armor: 200, bounty: 110,
    flags: ['boss', 'undead', 'summoner', 'magicres', 'teleport'], summonKey: 'wraith', summonN: 5, summonCd: 3.5,
    resist: { arcane: .7, dark: .9 }, scale: 2.3,
    look: { legs: 'wisp', torso: 'robe', head: 'skull', gear: 'crown', weapon: 'staff' }
  },
  {
    key: 'B_bloodsovereign', name: '피의 군주', tier: 9, boss: true, color: '#e01a4a', hp: 2200, spd: .78, armor: 240, bounty: 124,
    flags: ['boss', 'rage', 'regen', 'flying'], rageSpd: 1.7, regen: .05, resist: { blood: .95, phys: .4 }, scale: 2.4,
    look: { legs: 'wisp', torso: 'cloak', head: 'human', gear: 'crown', weapon: 'scythe', wings: 'bat' }
  },
  {
    key: 'B_worldeater', name: '세계를 먹는 자', tier: 9, boss: true, color: '#ff3f7f', hp: 3400, spd: .55, armor: 380, bounty: 160,
    flags: ['boss', 'flying', 'rage', 'shield'], shield: 6, rageSpd: 1.7, resist: { fire: .8, phys: .5 }, scale: 2.8,
    look: { legs: 'none', torso: 'scaled', head: 'dragonHead', gear: 'crown', weapon: 'none', wings: 'bat' }
  },
  {
    key: 'B_mountaincore', name: '산의 심장', tier: 9, boss: true, color: '#d2a15e', hp: 5200, spd: .38, armor: 900, bounty: 190,
    flags: ['boss', 'armored', 'shield', 'regen'], shield: 8, regen: .02, resist: { phys: .65, earth: .95 }, scale: 3.0,
    look: { legs: 'none', torso: 'core', head: 'machine', gear: 'horns', weapon: 'hammer' }
  },
  {
    key: 'B_voidsovereign', name: '공허의 주권자', tier: 9, boss: true, color: '#c0a8ff', hp: 7000, spd: .6, armor: 520, bounty: 230,
    flags: ['boss', 'ghost', 'teleport', 'shield', 'magicres'], shield: 8,
    resist: { arcane: .8, phys: .6, holy: .5 }, scale: 2.8,
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', gear: 'crown', weapon: 'scythe', wings: 'energy' }
  },
  {
    key: 'B_timeeater', name: '시간을 먹는 자', tier: 9, boss: true, color: '#a8b8ff', hp: 9800, spd: .66, armor: 600, bounty: 270,
    flags: ['boss', 'teleport', 'flying', 'shield', 'magicres'], shield: 9,
    resist: { time: .98, arcane: .7, phys: .5 }, scale: 2.9,
    look: { legs: 'float', torso: 'spectral', head: 'orb', gear: 'crown', weapon: 'tome', wings: 'energy' }
  },
  {
    key: 'B_omegatyrant', name: 'OMEGA 폭군', tier: 9, boss: true, color: '#ffd24d', hp: 16000, spd: .55, armor: 900, bounty: 340,
    flags: ['boss', 'armored', 'shield', 'rage', 'summoner'], shield: 10, rageSpd: 1.5,
    summonKey: 'mech', summonN: 3, summonCd: 4, resist: { phys: .6, poison: .95, ice: .5 }, scale: 3.0,
    look: { legs: 'track', torso: 'core', head: 'machine', gear: 'crown', weapon: 'launcher' }
  },
  {
    key: 'B_seraphtyrant', name: '타락한 대천사', tier: 9, boss: true, color: '#fff2b0', hp: 24000, spd: .7, armor: 1100, bounty: 420,
    flags: ['boss', 'flying', 'healer', 'shield', 'regen'], shield: 12, healAmt: .08, healRadius: 6, regen: .03,
    resist: { holy: .95, phys: .5 }, scale: 3.0,
    look: { legs: 'float', torso: 'plate', head: 'human', gear: 'halo', weapon: 'greatsword', wings: 'feather' }
  },
  {
    key: 'B_finality', name: '종언', tier: 9, boss: true, color: '#ff2fd0', hp: 42000, spd: .6, armor: 1500, bounty: 600,
    flags: ['boss', 'flying', 'ghost', 'shield', 'rage', 'magicres', 'teleport'], shield: 14, rageSpd: 1.6,
    resist: { phys: .6, fire: .6, ice: .6, arcane: .6, holy: .4, dark: .4 }, scale: 3.2,
    look: { legs: 'wisp', torso: 'scaled', head: 'dragonHead', gear: 'crown', weapon: 'scythe', wings: 'energy' }
  },
  {
    key: 'B_primordial', name: '태초의 알', tier: 9, boss: true, color: '#6ffff0', hp: 80000, spd: .5, armor: 2200, bounty: 900,
    flags: ['boss', 'shield', 'regen', 'summoner', 'magicres', 'armored'], shield: 20, regen: .04,
    summonKey: 'starspawn', summonN: 2, summonCd: 5,
    resist: { phys: .6, arcane: .7, void: .5, holy: .5, dark: .5 }, scale: 3.2,
    look: { legs: 'none', torso: 'crystal', head: 'orb', gear: 'crown', weapon: 'none' }
  },
  {
    key: 'B_theend', name: '끝, 그 너머', tier: 9, boss: true, color: '#ffffff', hp: 200000, spd: .55, armor: 4000, bounty: 1600,
    flags: ['boss', 'flying', 'ghost', 'shield', 'rage', 'magicres', 'teleport', 'regen', 'summoner'],
    shield: 30, rageSpd: 1.8, regen: .05, summonKey: 'eternalguard', summonN: 2, summonCd: 6,
    resist: { phys: .7, fire: .7, ice: .7, arcane: .7, holy: .6, dark: .6, void: .5, time: .8 }, scale: 3.4,
    look: { legs: 'float', torso: 'spectral', head: 'orb', gear: 'crown', weapon: 'scythe', wings: 'energy' }
  },
  /* ---------------- 생성 : 추가 몬스터 ---------------- */
  {
    key: 'g_goblinoid_t0_0', name: '그을린 홉고블린', tier: 0, color: '#8fbf5a', hp: 0.91, spd: 1.18, armor: 0, bounty: 0.81,
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_undead_t0_1', name: '그을린 망령', tier: 0, color: '#cfd6e0', hp: 0.53, spd: 1.08, armor: 1, bounty: 1.1, flags: ['undead'],
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'none' }
  },
  {
    key: 'g_beast_t0_2', name: '얼어붙은 멧돼지', tier: 0, color: '#c49a68', hp: 0.57, spd: 1.17, armor: 0, bounty: 0.8, flags: ['regen'],
    look: { legs: 'quad', torso: 'scaled', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_insect_t0_3', name: '살진 전갈', tier: 0, color: '#4aa08a', hp: 0.97, spd: 0.89, armor: 0, bounty: 0.81,
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'g_demon_t0_4', name: '굶주린 마졸', tier: 0, color: '#e07a5a', hp: 0.86, spd: 0.85, armor: 1, bounty: 1.02,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_elemental_t0_5', name: '창백한 얼음정령', tier: 0, color: '#7fd8ff', hp: 0.72, spd: 1.14, armor: 0, bounty: 0.88, scale: 1.14,
    look: { legs: 'float', torso: 'core', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_construct_t0_6', name: '저주받은 철갑차', tier: 0, color: '#9fb0c4', hp: 0.72, spd: 1.25, armor: 0, bounty: 1.12, flags: ['armored'], scale: 1.36,
    look: { legs: 'track', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'g_slime_t0_7', name: '저주받은 포자체', tier: 0, color: '#e07cd0', hp: 0.82, spd: 1.26, armor: 0, bounty: 0.85, flags: ['split'], splitInto: 'slimelet', splitN: 2,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'g_void_t0_8', name: '독기 서린 침묵자', tier: 0, color: '#a06ff0', hp: 0.85, spd: 0.86, armor: 0, bounty: 0.69, flags: ['ghost'],
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_goblinoid_t0_9', name: '피에 젖은 홉고블린', tier: 0, color: '#7cae4a', hp: 0.8, spd: 1.31, armor: 0, bounty: 1.06,
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_undead_t0_10', name: '녹슨 시귀', tier: 0, color: '#b8c2d0', hp: 0.54, spd: 1.14, armor: 0, bounty: 1.08, flags: ['undead'], scale: 1.35,
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'none' }
  },
  {
    key: 'g_beast_t0_11', name: '굶주린 살쾡이', tier: 0, color: '#c49a68', hp: 0.54, spd: 1.08, armor: 0, bounty: 0.72, scale: 1.1,
    look: { legs: 'quad', torso: 'scaled', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_insect_t0_12', name: '음험한 풍뎅이', tier: 0, color: '#8a5bd0', hp: 0.74, spd: 1.2, armor: 0, bounty: 0.6, scale: 1.36,
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'g_demon_t0_13', name: '야윈 흉수', tier: 0, color: '#d05a4a', hp: 0.79, spd: 1.17, armor: 0, bounty: 0.72, scale: 1.4,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_undead_t1_0', name: '그을린 해골', tier: 1, color: '#cfd6e0', hp: 2.28, spd: 0.92, armor: 2, bounty: 1.09, flags: ['undead'], scale: 1.49,
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'none' }
  },
  {
    key: 'g_beast_t1_1', name: '광포한 큰쥐', tier: 1, color: '#a98255', hp: 2.91, spd: 1.2, armor: 2, bounty: 1.14, flags: ['fast', 'regen'],
    look: { legs: 'quad', torso: 'scaled', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_insect_t1_2', name: '야윈 지네', tier: 1, color: '#5b7fd0', hp: 1.68, spd: 1.07, armor: 0, bounty: 1.27, flags: ['fast'], scale: 1.37,
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'g_demon_t1_3', name: '두 머리 흉수', tier: 1, color: '#d05a4a', hp: 1.84, spd: 0.89, armor: 0, bounty: 1.71, scale: 1.11,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_elemental_t1_4', name: '얼어붙은 불정령', tier: 1, color: '#7fd8ff', hp: 1.41, spd: 0.84, armor: 5, bounty: 1.38,
    look: { legs: 'float', torso: 'core', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_construct_t1_5', name: '사나운 파수기', tier: 1, color: '#b4c4d4', hp: 2.08, spd: 0.92, armor: 7, bounty: 2.16, flags: ['armored'],
    look: { legs: 'track', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'g_slime_t1_6', name: '사나운 젤리', tier: 1, color: '#e07cd0', hp: 1.76, spd: 1.27, armor: 7, bounty: 1.25, flags: ['split'], splitInto: 'slimelet', splitN: 2,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'g_void_t1_7', name: '얼어붙은 균열자', tier: 1, color: '#7f5fd0', hp: 1.85, spd: 1.09, armor: 0, bounty: 1.57, flags: ['ghost'],
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_goblinoid_t1_8', name: '단단한 오크', tier: 1, color: '#7cae4a', hp: 2.08, spd: 1.22, armor: 2, bounty: 1.33,
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_undead_t1_9', name: '단단한 망령', tier: 1, color: '#9aa6b8', hp: 2.6, spd: 1.02, armor: 9, bounty: 1.22, flags: ['undead', 'fast'],
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'none' }
  },
  {
    key: 'g_beast_t1_10', name: '피에 젖은 늑대', tier: 1, color: '#8d6c46', hp: 1.48, spd: 1.16, armor: 2, bounty: 1.65, scale: 1.33,
    look: { legs: 'quad', torso: 'scaled', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_insect_t1_11', name: '늙은 전갈', tier: 1, color: '#8a5bd0', hp: 1.88, spd: 0.74, armor: 5, bounty: 1.88,
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'g_demon_t1_12', name: '외눈 임프', tier: 1, color: '#e07a5a', hp: 2.35, spd: 0.97, armor: 7, bounty: 1.83,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_elemental_t1_13', name: '광포한 뇌정령', tier: 1, color: '#b8f07a', hp: 1.63, spd: 1.19, armor: 2, bounty: 1.33, scale: 1.23,
    look: { legs: 'float', torso: 'core', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_construct_t1_14', name: '광포한 파수기', tier: 1, color: '#9fb0c4', hp: 2.67, spd: 1.21, armor: 7, bounty: 1.57, flags: ['armored'],
    look: { legs: 'track', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'g_slime_t1_15', name: '저주받은 젤리', tier: 1, color: '#7cd0e0', hp: 2.43, spd: 1.2, armor: 7, bounty: 1.62, flags: ['split'], splitInto: 'slimelet', splitN: 2,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'g_beast_t2_0', name: '단단한 멧돼지', tier: 2, color: '#8d6c46', hp: 5.1, spd: 1.17, armor: 11, bounty: 1.84, flags: ['shield'],
    look: { legs: 'quad', torso: 'scaled', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_insect_t2_1', name: '음험한 전갈', tier: 2, color: '#4aa08a', hp: 6.79, spd: 1.11, armor: 8, bounty: 3.0, flags: ['magicres', 'flying'],
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none', wings: 'insectWing' }
  },
  {
    key: 'g_demon_t2_2', name: '독기 서린 나찰', tier: 2, color: '#d05a4a', hp: 7.6, spd: 1.08, armor: 0, bounty: 1.97, flags: ['fast', 'magicres'], scale: 1.35,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_elemental_t2_3', name: '음험한 뇌정령', tier: 2, color: '#b8f07a', hp: 4.22, spd: 0.83, armor: 11, bounty: 1.78, scale: 1.28,
    look: { legs: 'float', torso: 'core', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_construct_t2_4', name: '단단한 철갑차', tier: 2, color: '#9fb0c4', hp: 6.35, spd: 1.31, armor: 5, bounty: 2.55, flags: ['armored'],
    look: { legs: 'track', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'g_slime_t2_5', name: '그을린 젤리', tier: 2, color: '#e07cd0', hp: 5.64, spd: 1.31, armor: 13, bounty: 2.11, flags: ['split', 'fast', 'magicres'], splitInto: 'slimelet', splitN: 2,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'g_void_t2_6', name: '두 머리 균열자', tier: 2, color: '#7f5fd0', hp: 6.1, spd: 1.25, armor: 11, bounty: 3.09, flags: ['ghost'], scale: 1.22,
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_goblinoid_t2_7', name: '창백한 오크', tier: 2, color: '#7cae4a', hp: 5.0, spd: 1.17, armor: 5, bounty: 1.65,
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_undead_t2_8', name: '저주받은 망령', tier: 2, color: '#9aa6b8', hp: 3.85, spd: 1.2, armor: 13, bounty: 2.64, flags: ['undead'],
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'none' }
  },
  {
    key: 'g_beast_t2_9', name: '녹슨 늑대', tier: 2, color: '#c49a68', hp: 6.08, spd: 0.83, armor: 11, bounty: 2.96,
    look: { legs: 'quad', torso: 'scaled', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_insect_t2_10', name: '늙은 풍뎅이', tier: 2, color: '#8a5bd0', hp: 5.93, spd: 0.89, armor: 16, bounty: 2.41, scale: 1.43,
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'g_demon_t2_11', name: '피에 젖은 흉수', tier: 2, color: '#b8443a', hp: 6.18, spd: 1.18, armor: 0, bounty: 2.29,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_elemental_t2_12', name: '피에 젖은 바람정령', tier: 2, color: '#b8f07a', hp: 4.51, spd: 0.8, armor: 11, bounty: 2.58, flags: ['shield'],
    look: { legs: 'float', torso: 'core', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_construct_t2_13', name: '민첩한 강철병', tier: 2, color: '#b4c4d4', hp: 4.22, spd: 1.07, armor: 3, bounty: 3.06, flags: ['armored'],
    look: { legs: 'track', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'g_slime_t2_14', name: '사나운 점액괴', tier: 2, color: '#7cd0e0', hp: 7.18, spd: 1.25, armor: 16, bounty: 1.68, flags: ['split'], splitInto: 'slimelet', splitN: 2,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'g_void_t2_15', name: '저주받은 침묵자', tier: 2, color: '#c48ff0', hp: 5.61, spd: 0.87, armor: 11, bounty: 2.11, flags: ['ghost', 'fast'],
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_goblinoid_t2_16', name: '살진 고블린', tier: 2, color: '#8fbf5a', hp: 4.76, spd: 0.86, armor: 5, bounty: 3.16,
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_undead_t2_17', name: '저주받은 구울', tier: 2, color: '#b8c2d0', hp: 3.75, spd: 1.12, armor: 5, bounty: 2.46, flags: ['undead'],
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'none' }
  },
  {
    key: 'g_insect_t3_0', name: '저주받은 지네', tier: 3, color: '#8a5bd0', hp: 35.09, spd: 1.32, armor: 0, bounty: 4.58,
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'g_demon_t3_1', name: '광포한 나찰', tier: 3, color: '#b8443a', hp: 25.51, spd: 1.35, armor: 30, bounty: 4.58, flags: ['fast'],
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_elemental_t3_2', name: '녹슨 뇌정령', tier: 3, color: '#7fd8ff', hp: 32.14, spd: 1.34, armor: 15, bounty: 3.31, flags: ['rage'],
    look: { legs: 'float', torso: 'core', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_construct_t3_3', name: '늙은 강철병', tier: 3, color: '#b4c4d4', hp: 22.1, spd: 0.86, armor: 53, bounty: 5.56, flags: ['armored', 'rage'],
    look: { legs: 'track', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'g_slime_t3_4', name: '녹슨 젤리', tier: 3, color: '#7cd0e0', hp: 33.7, spd: 0.93, armor: 15, bounty: 3.76, flags: ['split', 'shield', 'healer'], splitInto: 'slimelet', splitN: 2,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'g_void_t3_5', name: '그을린 차원수', tier: 3, color: '#7f5fd0', hp: 26.43, spd: 0.98, armor: 15, bounty: 3.44, flags: ['ghost'],
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_goblinoid_t3_6', name: '민첩한 오크', tier: 3, color: '#8fbf5a', hp: 27.35, spd: 1.31, armor: 61, bounty: 3.69, flags: ['fast', 'shield'], scale: 1.2,
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_undead_t3_7', name: '굶주린 구울', tier: 3, color: '#b8c2d0', hp: 27.07, spd: 0.79, armor: 23, bounty: 5.33, flags: ['undead', 'fast', 'magicres'], scale: 1.24,
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'none' }
  },
  {
    key: 'g_beast_t3_8', name: '광포한 멧돼지', tier: 3, color: '#8d6c46', hp: 25.23, spd: 0.91, armor: 45, bounty: 4.41,
    look: { legs: 'quad', torso: 'scaled', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_insect_t3_9', name: '단단한 독거미', tier: 3, color: '#4aa08a', hp: 34.99, spd: 1.13, armor: 61, bounty: 5.52, flags: ['rage'],
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'g_demon_t3_10', name: '녹슨 흉수', tier: 3, color: '#d05a4a', hp: 26.98, spd: 0.98, armor: 23, bounty: 4.55, flags: ['shield'], scale: 1.3,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_elemental_t3_11', name: '외눈 얼음정령', tier: 3, color: '#b8f07a', hp: 24.86, spd: 1.23, armor: 45, bounty: 5.52,
    look: { legs: 'float', torso: 'core', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_construct_t3_12', name: '단단한 파수기', tier: 3, color: '#7f8fa4', hp: 33.98, spd: 0.91, armor: 15, bounty: 5.26, flags: ['armored'],
    look: { legs: 'track', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'g_slime_t3_13', name: '늙은 젤리', tier: 3, color: '#7cd0e0', hp: 20.08, spd: 0.95, armor: 53, bounty: 4.64, flags: ['split', 'fast'], splitInto: 'slimelet', splitN: 2,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'g_void_t3_14', name: '독기 서린 균열자', tier: 3, color: '#7f5fd0', hp: 26.43, spd: 0.76, armor: 8, bounty: 5.05, flags: ['ghost', 'fast'], scale: 1.23,
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_goblinoid_t3_15', name: '사나운 코볼드', tier: 3, color: '#6a9440', hp: 26.06, spd: 0.76, armor: 53, bounty: 3.35, flags: ['fast', 'healer'],
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_undead_t3_16', name: '독기 서린 해골', tier: 3, color: '#9aa6b8', hp: 20.26, spd: 0.78, armor: 53, bounty: 3.63, flags: ['undead'],
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'none' }
  },
  {
    key: 'g_beast_t3_17', name: '독기 서린 살쾡이', tier: 3, color: '#c49a68', hp: 28.18, spd: 1.23, armor: 38, bounty: 3.46, scale: 1.37,
    look: { legs: 'quad', torso: 'scaled', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_insect_t3_18', name: '독기 서린 전갈', tier: 3, color: '#5b7fd0', hp: 17.31, spd: 0.85, armor: 45, bounty: 3.39, flags: ['flying'],
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none', wings: 'insectWing' }
  },
  {
    key: 'g_demon_t3_19', name: '야윈 마졸', tier: 3, color: '#d05a4a', hp: 20.9, spd: 1.02, armor: 30, bounty: 3.78,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_demon_t4_0', name: '저주받은 악귀', tier: 4, color: '#e07a5a', hp: 104.75, spd: 1.09, armor: 47, bounty: 9.17,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_elemental_t4_1', name: '늙은 뇌정령', tier: 4, color: '#7fd8ff', hp: 111.44, spd: 1.3, armor: 156, bounty: 8.96, flags: ['fast', 'shield'],
    look: { legs: 'float', torso: 'core', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_construct_t4_2', name: '피에 젖은 강철병', tier: 4, color: '#7f8fa4', hp: 89.35, spd: 1.19, armor: 156, bounty: 7.02, flags: ['armored'],
    look: { legs: 'track', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'g_slime_t4_3', name: '외눈 늪덩이', tier: 4, color: '#7cd0e0', hp: 82.99, spd: 1.25, armor: 0, bounty: 7.54, flags: ['split', 'magicres'], splitInto: 'slimelet', splitN: 2, scale: 1.17,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'g_void_t4_4', name: '굶주린 공허체', tier: 4, color: '#7f5fd0', hp: 93.7, spd: 0.87, armor: 94, bounty: 10.11, flags: ['ghost'],
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_goblinoid_t4_5', name: '독기 서린 놀', tier: 4, color: '#8fbf5a', hp: 132.52, spd: 1.04, armor: 125, bounty: 9.11, flags: ['regen'],
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_undead_t4_6', name: '야윈 시귀', tier: 4, color: '#cfd6e0', hp: 122.15, spd: 0.97, armor: 125, bounty: 9.26, flags: ['undead'],
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'none' }
  },
  {
    key: 'g_beast_t4_7', name: '그을린 살쾡이', tier: 4, color: '#8d6c46', hp: 104.41, spd: 1.11, armor: 16, bounty: 9.2,
    look: { legs: 'quad', torso: 'scaled', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_insect_t4_8', name: '음험한 독거미', tier: 4, color: '#5b7fd0', hp: 123.82, spd: 1.06, armor: 140, bounty: 8.75, scale: 1.44,
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'g_demon_t4_9', name: '불타는 마졸', tier: 4, color: '#b8443a', hp: 109.1, spd: 0.9, armor: 78, bounty: 8.84, flags: ['magicres'],
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_elemental_t4_10', name: '거대한 바위정령', tier: 4, color: '#ff8a4a', hp: 93.7, spd: 1.28, armor: 78, bounty: 6.06, flags: ['magicres'], scale: 1.37,
    look: { legs: 'float', torso: 'core', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_construct_t4_11', name: '녹슨 강철병', tier: 4, color: '#7f8fa4', hp: 138.88, spd: 0.9, armor: 125, bounty: 5.72, flags: ['armored', 'magicres'],
    look: { legs: 'track', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'g_slime_t4_12', name: '창백한 젤리', tier: 4, color: '#e07cd0', hp: 156.95, spd: 1.32, armor: 0, bounty: 8.54, flags: ['split'], splitInto: 'slimelet', splitN: 2,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'g_void_t4_13', name: '굶주린 차원수', tier: 4, color: '#a06ff0', hp: 118.47, spd: 0.86, armor: 156, bounty: 6.27, flags: ['ghost'],
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_goblinoid_t4_14', name: '외눈 놀', tier: 4, color: '#8fbf5a', hp: 114.12, spd: 1.3, armor: 140, bounty: 8.36, flags: ['regen'],
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_undead_t4_15', name: '광포한 시귀', tier: 4, color: '#cfd6e0', hp: 116.79, spd: 1.28, armor: 78, bounty: 6.87, flags: ['undead'],
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'none' }
  },
  {
    key: 'g_beast_t4_16', name: '그을린 늑대', tier: 4, color: '#8d6c46', hp: 147.25, spd: 0.73, armor: 156, bounty: 8.6, flags: ['regen', 'rage', 'healer'],
    look: { legs: 'quad', torso: 'scaled', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_insect_t4_17', name: '단단한 지네', tier: 4, color: '#4aa08a', hp: 135.53, spd: 0.88, armor: 109, bounty: 8.33,
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'g_demon_t4_18', name: '두 머리 임프', tier: 4, color: '#e07a5a', hp: 121.81, spd: 1.21, armor: 31, bounty: 7.33,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_elemental_t4_19', name: '광포한 얼음정령', tier: 4, color: '#7fd8ff', hp: 89.02, spd: 1, armor: 16, bounty: 9.42,
    look: { legs: 'float', torso: 'core', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_construct_t4_20', name: '독기 서린 강철병', tier: 4, color: '#9fb0c4', hp: 104.41, spd: 0.83, armor: 47, bounty: 7.93, flags: ['armored'], scale: 1.12,
    look: { legs: 'track', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'g_slime_t4_21', name: '녹슨 점액괴', tier: 4, color: '#7ce07c', hp: 150.26, spd: 1.29, armor: 156, bounty: 8.84, flags: ['split'], splitInto: 'slimelet', splitN: 2,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'g_elemental_t5_0', name: '사나운 뇌정령', tier: 5, color: '#7fd8ff', hp: 575.3, spd: 0.89, armor: 729, bounty: 22.42,
    look: { legs: 'float', torso: 'core', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_construct_t5_1', name: '외눈 공성기', tier: 5, color: '#9fb0c4', hp: 752.95, spd: 0.84, armor: 790, bounty: 12.98, flags: ['armored'],
    look: { legs: 'track', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'g_slime_t5_2', name: '불타는 슬라임', tier: 5, color: '#7cd0e0', hp: 561.64, spd: 1.13, armor: 243, bounty: 13.96, flags: ['split'], splitInto: 'slimelet', splitN: 2,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'g_void_t5_3', name: '불타는 침묵자', tier: 5, color: '#c48ff0', hp: 500.14, spd: 1.11, armor: 790, bounty: 20.95, flags: ['ghost'], scale: 1.33,
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_goblinoid_t5_4', name: '불타는 코볼드', tier: 5, color: '#8fbf5a', hp: 407.22, spd: 1.17, armor: 669, bounty: 15.19,
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_undead_t5_5', name: '얼어붙은 해골', tier: 5, color: '#b8c2d0', hp: 457.78, spd: 0.95, armor: 365, bounty: 19.78, flags: ['undead'],
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'none' }
  },
  {
    key: 'g_beast_t5_6', name: '불타는 살쾡이', tier: 5, color: '#c49a68', hp: 676.42, spd: 0.83, armor: 547, bounty: 16.84, flags: ['regen'],
    look: { legs: 'quad', torso: 'scaled', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_insect_t5_7', name: '얼어붙은 전갈', tier: 5, color: '#4aa08a', hp: 374.42, spd: 0.84, armor: 122, bounty: 23.7, flags: ['flying'], scale: 1.29,
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none', wings: 'insectWing' }
  },
  {
    key: 'g_demon_t5_8', name: '살진 나찰', tier: 5, color: '#d05a4a', hp: 728.35, spd: 1.01, armor: 61, bounty: 17.33,
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
  {
    key: 'g_elemental_t5_9', name: '음험한 불정령', tier: 5, color: '#7fd8ff', hp: 385.36, spd: 0.83, armor: 304, bounty: 24.31, flags: ['regen'],
    look: { legs: 'float', torso: 'core', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_construct_t5_10', name: '창백한 강철병', tier: 5, color: '#9fb0c4', hp: 643.63, spd: 1.16, armor: 122, bounty: 24.38, flags: ['armored', 'shield'],
    look: { legs: 'track', torso: 'core', head: 'machine', weapon: 'none' }
  },
  {
    key: 'g_slime_t5_11', name: '살진 슬라임', tier: 5, color: '#e07cd0', hp: 423.62, spd: 0.77, armor: 243, bounty: 13.96, flags: ['split'], splitInto: 'slimelet', splitN: 2,
    look: { legs: 'none', torso: 'blob', head: 'none', weapon: 'none' }
  },
  {
    key: 'g_void_t5_12', name: '독기 서린 공허체', tier: 5, color: '#7f5fd0', hp: 399.02, spd: 1.31, armor: 182, bounty: 20.95, flags: ['ghost'],
    look: { legs: 'wisp', torso: 'spectral', head: 'orb', weapon: 'none' }
  },
  {
    key: 'g_goblinoid_t5_13', name: '창백한 코볼드', tier: 5, color: '#6a9440', hp: 502.88, spd: 0.74, armor: 729, bounty: 20.09, flags: ['fast'],
    look: { legs: 'biped', torso: 'leather', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_undead_t5_14', name: '민첩한 시귀', tier: 5, color: '#b8c2d0', hp: 388.09, spd: 1.25, armor: 669, bounty: 18.37, flags: ['undead', 'fast'],
    look: { legs: 'biped', torso: 'bone', head: 'skull', weapon: 'none' }
  },
  {
    key: 'g_beast_t5_15', name: '저주받은 들개', tier: 5, color: '#8d6c46', hp: 699.65, spd: 0.95, armor: 486, bounty: 20.09, flags: ['rage'],
    look: { legs: 'quad', torso: 'scaled', head: 'beastHead', weapon: 'none' }
  },
  {
    key: 'g_insect_t5_16', name: '굶주린 풍뎅이', tier: 5, color: '#8a5bd0', hp: 713.32, spd: 1.34, armor: 365, bounty: 20.09,
    look: { legs: 'quad', torso: 'chitin', head: 'insectHead', weapon: 'none' }
  },
  {
    key: 'g_demon_t5_17', name: '살진 흉수', tier: 5, color: '#b8443a', hp: 530.21, spd: 0.78, armor: 0, bounty: 16.6, flags: ['rage'],
    look: { legs: 'biped', torso: 'brute', head: 'demonHead', weapon: 'none' }
  },
];
const ENEMY_MAP = {}; ENEMIES.forEach(e => ENEMY_MAP[e.key] = e);
const BOSS_ORDER = ENEMIES.filter(e => e.boss).map(e => e.key);

/* 웨이브별 등장 풀 */
const SPAWN_TABLE = [
  { from: 1, keys: ['slime', 'goblin', 'rat'] },
  { from: 3, keys: ['bat', 'skeleton', 'kobold'] },
  { from: 5, keys: ['mushling', 'crow'] },
  { from: 6, keys: ['orc', 'wolf'] },
  { from: 9, keys: ['zombie', 'spider', 'imp'] },
  { from: 11, keys: ['bandit', 'gnoll'] },
  { from: 12, keys: ['shielder', 'mage_e'] },
  { from: 14, keys: ['boarrider', 'wisp_e', 'scarab'] },
  { from: 15, keys: ['ogre', 'wraith'] },
  { from: 18, keys: ['golem', 'harpy'] },
  { from: 20, keys: ['centaur', 'gargoyle'] },
  { from: 21, keys: ['necro', 'brute'] },
  { from: 23, keys: ['cultist', 'mudling'] },
  { from: 24, keys: ['crystal', 'blob'] },
  { from: 26, keys: ['flameling', 'frostling', 'plaguebearer'] },
  { from: 28, keys: ['knight_e', 'demon'] },
  { from: 30, keys: ['minotaur', 'banshee'] },
  { from: 32, keys: ['lich', 'phantom'] },
  { from: 34, keys: ['warlock_e', 'sandworm'] },
  { from: 36, keys: ['juggernaut', 'hydra'] },
  { from: 38, keys: ['frostgiant', 'stalker'] },
  { from: 40, keys: ['seraph_e', 'mech'] },
  { from: 42, keys: ['siegetower'] },
  { from: 45, keys: ['voidling', 'swarmer'] },
  { from: 48, keys: ['doomknight', 'chronowraith'] },
  { from: 50, keys: ['behemoth', 'revenant'] },
  { from: 53, keys: ['magmaborn', 'bloodqueen'] },
  { from: 56, keys: ['archdemon', 'stormdrake'] },
  { from: 60, keys: ['obelisk', 'reaperling'] },
  { from: 62, keys: ['nullwalker'] },
  { from: 70, keys: ['titan', 'worldbreaker'] },
  { from: 76, keys: ['starspawn', 'devourer'] },
  { from: 84, keys: ['eternalguard', 'nullpriest'] },
  /* ------- 생성 : 추가 몬스터 등장 구간 ------- */
  { from: 2, keys: ['g_goblinoid_t0_0', 'g_undead_t0_1', 'g_beast_t0_2', 'g_insect_t0_3', 'g_demon_t0_4', 'g_elemental_t0_5'] },
  { from: 3, keys: ['g_construct_t0_6', 'g_slime_t0_7', 'g_void_t0_8', 'g_goblinoid_t0_9', 'g_undead_t0_10', 'g_beast_t0_11'] },
  { from: 4, keys: ['g_insect_t0_12', 'g_demon_t0_13'] },
  { from: 8, keys: ['g_undead_t1_0', 'g_beast_t1_1', 'g_insect_t1_2', 'g_demon_t1_3', 'g_elemental_t1_4', 'g_construct_t1_5'] },
  { from: 9, keys: ['g_slime_t1_6', 'g_void_t1_7', 'g_goblinoid_t1_8', 'g_undead_t1_9', 'g_beast_t1_10', 'g_insect_t1_11'] },
  { from: 10, keys: ['g_demon_t1_12', 'g_elemental_t1_13', 'g_construct_t1_14', 'g_slime_t1_15'] },
  { from: 16, keys: ['g_beast_t2_0', 'g_insect_t2_1', 'g_demon_t2_2', 'g_elemental_t2_3', 'g_construct_t2_4', 'g_slime_t2_5'] },
  { from: 17, keys: ['g_void_t2_6', 'g_goblinoid_t2_7', 'g_undead_t2_8', 'g_beast_t2_9', 'g_insect_t2_10', 'g_demon_t2_11'] },
  { from: 18, keys: ['g_elemental_t2_12', 'g_construct_t2_13', 'g_slime_t2_14', 'g_void_t2_15', 'g_goblinoid_t2_16', 'g_undead_t2_17'] },
  { from: 26, keys: ['g_insect_t3_0', 'g_demon_t3_1', 'g_elemental_t3_2', 'g_construct_t3_3', 'g_slime_t3_4', 'g_void_t3_5'] },
  { from: 27, keys: ['g_goblinoid_t3_6', 'g_undead_t3_7', 'g_beast_t3_8', 'g_insect_t3_9', 'g_demon_t3_10', 'g_elemental_t3_11'] },
  { from: 28, keys: ['g_construct_t3_12', 'g_slime_t3_13', 'g_void_t3_14', 'g_goblinoid_t3_15', 'g_undead_t3_16', 'g_beast_t3_17'] },
  { from: 29, keys: ['g_insect_t3_18', 'g_demon_t3_19'] },
  { from: 38, keys: ['g_demon_t4_0', 'g_elemental_t4_1', 'g_construct_t4_2', 'g_slime_t4_3', 'g_void_t4_4', 'g_goblinoid_t4_5'] },
  { from: 39, keys: ['g_undead_t4_6', 'g_beast_t4_7', 'g_insect_t4_8', 'g_demon_t4_9', 'g_elemental_t4_10', 'g_construct_t4_11'] },
  { from: 40, keys: ['g_slime_t4_12', 'g_void_t4_13', 'g_goblinoid_t4_14', 'g_undead_t4_15', 'g_beast_t4_16', 'g_insect_t4_17'] },
  { from: 41, keys: ['g_demon_t4_18', 'g_elemental_t4_19', 'g_construct_t4_20', 'g_slime_t4_21'] },
  { from: 52, keys: ['g_elemental_t5_0', 'g_construct_t5_1', 'g_slime_t5_2', 'g_void_t5_3', 'g_goblinoid_t5_4', 'g_undead_t5_5'] },
  { from: 53, keys: ['g_beast_t5_6', 'g_insect_t5_7', 'g_demon_t5_8', 'g_elemental_t5_9', 'g_construct_t5_10', 'g_slime_t5_11'] },
  { from: 54, keys: ['g_void_t5_12', 'g_goblinoid_t5_13', 'g_undead_t5_14', 'g_beast_t5_15', 'g_insect_t5_16', 'g_demon_t5_17'] },
];

/* =========================================================================
 *  맵 10종
 * ========================================================================= */
const GRID_W = 18, GRID_H = 11;
const MAPS = [
  {
    key: 'meadow', name: '초원의 길', diff: 1.0, bg: '#2c4a20', bg2: '#1a2b14', road: '#8a6a3c', accent: '#7fbf4a',
    deco: ['grass', 'tree', 'flower', 'rock'], weather: null, ambient: '#7fbf4a', ambientAmt: .10,
    desc: '완만한 S자 경로. 입문에 알맞다.',
    path: [[-1, 2], [4, 2], [4, 5], [9, 5], [9, 2], [13, 2], [13, 8], [3, 8], [3, 10], [18, 10]]
  },
  {
    key: 'canyon', name: '메마른 협곡', diff: 1.25, bg: '#5a3524', bg2: '#2a1a11', road: '#b08a58', accent: '#e0913f',
    deco: ['rock', 'sandDune', 'deadtree', 'bone'], weather: 'sand', ambient: '#e0913f', ambientAmt: .14,
    desc: '길이 길어 사거리가 빛난다.',
    path: [[-1, 9], [2, 9], [2, 1], [6, 1], [6, 8], [10, 8], [10, 1], [14, 1], [14, 9], [18, 9]]
  },
  {
    key: 'frost', name: '얼어붙은 성채', diff: 1.5, bg: '#2c4460', bg2: '#14202e', road: '#9fb4cc', accent: '#8fd8ff',
    deco: ['ice', 'rock', 'ruin'], weather: 'snow', ambient: '#8fd8ff', ambientAmt: .16,
    desc: '적이 빠르다. 둔화가 필수.',
    path: [[-1, 5], [3, 5], [3, 2], [8, 2], [8, 9], [12, 9], [12, 4], [15, 4], [15, 8], [18, 8]]
  },
  {
    key: 'swamp', name: '독기의 늪', diff: 1.7, bg: '#2a3a26', bg2: '#141c14', road: '#6a6a44', accent: '#7bdd52',
    deco: ['mushroom', 'deadtree', 'bone', 'grass'], weather: 'ash', ambient: '#7bdd52', ambientAmt: .16,
    desc: '재생하는 적이 우글거린다.',
    path: [[-1, 3], [4, 3], [4, 8], [8, 8], [8, 2], [12, 2], [12, 7], [16, 7], [16, 2], [18, 2]]
  },
  {
    key: 'abyss', name: '심연의 균열', diff: 1.9, bg: '#3a2450', bg2: '#180f24', road: '#7a5aa0', accent: '#c07fff',
    deco: ['crystalDeco', 'voidRift', 'rock'], weather: null, ambient: '#b57bff', ambientAmt: .2,
    desc: '짧은 경로. 순간 화력이 전부다.',
    path: [[-1, 1], [5, 1], [5, 6], [1, 6], [1, 10], [11, 10], [11, 3], [16, 3], [16, 10], [18, 10]]
  },
  {
    key: 'boneyard', name: '뼈의 무덤', diff: 2.1, bg: '#3a3830', bg2: '#1c1a16', road: '#8a8470', accent: '#e8e2d0',
    deco: ['bone', 'skullDeco', 'deadtree', 'ruin'], weather: 'ash', ambient: '#cfc8b0', ambientAmt: .14,
    desc: '언데드가 끝없이 되살아난다.',
    path: [[-1, 6], [2, 6], [2, 2], [7, 2], [7, 9], [11, 9], [11, 2], [15, 2], [15, 9], [18, 9]]
  },
  {
    key: 'inferno', name: '종말의 화산', diff: 2.4, bg: '#5a1e14', bg2: '#280d0d', road: '#b8543a', accent: '#ff6a3a',
    deco: ['lavaCrack', 'rock', 'deadtree'], weather: 'ember', ambient: '#ff6a3a', ambientAmt: .22,
    desc: '불길 속에서 살아남아라.',
    path: [[-1, 6], [3, 6], [3, 2], [7, 2], [7, 9], [11, 9], [11, 1], [15, 1], [15, 6], [18, 6]]
  },
  {
    key: 'skyfall', name: '천공의 폐허', diff: 2.8, bg: '#2a3a5a', bg2: '#141c2e', road: '#a0b0c8', accent: '#9ff5e0',
    deco: ['ruin', 'rock', 'crystalDeco'], weather: 'rain', ambient: '#9ff5e0', ambientAmt: .16,
    desc: '비행 적의 비율이 매우 높다.',
    path: [[-1, 4], [3, 4], [3, 9], [7, 9], [7, 1], [11, 1], [11, 8], [14, 8], [14, 3], [18, 3]]
  },
  {
    key: 'voidgate', name: '공허의 관문', diff: 3.4, bg: '#241832', bg2: '#0e0818', road: '#5a3f7a', accent: '#8f7bff',
    deco: ['voidRift', 'crystalDeco', 'ruin'], weather: null, ambient: '#8f7bff', ambientAmt: .26,
    desc: '보호막과 순간이동의 지옥.',
    path: [[-1, 5], [2, 5], [2, 1], [6, 1], [6, 9], [10, 9], [10, 1], [14, 1], [14, 9], [18, 9]]
  },
  {
    key: 'origin', name: '태초의 성역', diff: 4.2, bg: '#40305a', bg2: '#160f22', road: '#c0a8e0', accent: '#ff2fd0',
    deco: ['crystalDeco', 'ruin', 'voidRift', 'flower'], weather: 'ember', ambient: '#ff2fd0', ambientAmt: .2,
    desc: '모든 것이 시작된 곳. 최종 난이도.',
    path: [[-1, 10], [3, 10], [3, 6], [1, 6], [1, 2], [8, 2], [8, 8], [13, 8], [13, 1], [16, 1], [16, 6], [18, 6]]
  },
  /* ---------------- 생성 : 추가 맵 ---------------- */
  {
    key: 'm_11', name: '서리 협곡', diff: 1.3, bg: '#2a3f52', bg2: '#1a2836', road: '#8fb4cc', accent: '#9fd8ff', deco: ['rock', 'grass'], weather: 'snow', ambient: '#9fd8ff', ambientAmt: 0.09, desc: '급커브가 잦아 범위 공격이 빛난다.',
    path: [[-1, 6], [4, 6], [4, 2], [9, 2], [9, 7], [13, 7], [13, 4], [16, 4], [16, 9], [18, 9]]
  },
  {
    key: 'm_12', name: '잿빛 화산', diff: 1.6, bg: '#3a2320', bg2: '#241413', road: '#c4703c', accent: '#ff8a4a', deco: ['rock', 'deadtree'], weather: 'ember', ambient: '#ff8a4a', ambientAmt: 0.1, desc: '초반부터 압박이 강하다.',
    path: [[-1, 8], [3, 8], [3, 3], [6, 3], [6, 6], [11, 6], [11, 3], [14, 3], [14, 6], [16, 6], [16, 1], [18, 1]]
  },
  {
    key: 'm_13', name: '황금 평원', diff: 1.1, bg: '#4a4520', bg2: '#2e2a14', road: '#d4b45c', accent: '#ffd76a', deco: ['grass', 'tree', 'flower'], weather: null, ambient: '#ffd76a', ambientAmt: 0.14, desc: '초반부터 압박이 강하다.',
    path: [[-1, 1], [2, 1], [2, 8], [7, 8], [7, 1], [10, 1], [10, 6], [13, 6], [13, 2], [16, 2], [16, 5], [18, 5]]
  },
  {
    key: 'm_14', name: '수정 동굴', diff: 1.45, bg: '#25304a', bg2: '#161d2e', road: '#8fa8d4', accent: '#8fe0ff', deco: ['crystalDeco', 'rock'], weather: null, ambient: '#8fe0ff', ambientAmt: 0.11, desc: '적이 빠르게 몰아친다.',
    path: [[-1, 3], [2, 3], [2, 9], [4, 9], [4, 6], [8, 6], [8, 9], [10, 9], [10, 3], [14, 3], [14, 8], [16, 8], [16, 4], [18, 4]]
  },
  {
    key: 'm_15', name: '만조의 해안', diff: 1.25, bg: '#1e4048', bg2: '#12262c', road: '#7fc4bc', accent: '#6fe0d0', deco: ['rock', 'grass'], weather: 'rain', ambient: '#6fe0d0', ambientAmt: 0.15, desc: '적이 빠르게 몰아친다.',
    path: [[-1, 5], [2, 5], [2, 1], [5, 1], [5, 9], [7, 9], [7, 2], [11, 2], [11, 5], [14, 5], [14, 1], [16, 1], [16, 7], [18, 7]]
  },
  {
    key: 'm_16', name: '폐허 시가지', diff: 1.5, bg: '#3a3730', bg2: '#22201c', road: '#a89a80', accent: '#c4b48a', deco: ['rock', 'deadtree'], weather: null, ambient: '#c4b48a', ambientAmt: 0.14, desc: '길이 길어 화력전이 유리하다.',
    path: [[-1, 6], [3, 6], [3, 1], [9, 1], [9, 9], [12, 9], [12, 6], [16, 6], [16, 2], [18, 2]]
  },
  {
    key: 'm_17', name: '붉은 사막', diff: 1.35, bg: '#4a3320', bg2: '#2c1e14', road: '#d49a5c', accent: '#ffb46a', deco: ['rock'], weather: 'sand', ambient: '#ffb46a', ambientAmt: 0.09, desc: '길이 길어 화력전이 유리하다.',
    path: [[-1, 8], [3, 8], [3, 2], [9, 2], [9, 7], [13, 7], [13, 3], [16, 3], [16, 6], [18, 6]]
  },
  {
    key: 'm_18', name: '망자의 늪', diff: 1.55, bg: '#26361f', bg2: '#151f12', road: '#8a9a5c', accent: '#a8d46a', deco: ['deadtree', 'grass'], weather: 'ash', ambient: '#a8d46a', ambientAmt: 0.1, desc: '적이 빠르게 몰아친다.',
    path: [[-1, 1], [3, 1], [3, 7], [7, 7], [7, 1], [10, 1], [10, 8], [13, 8], [13, 1], [16, 1], [16, 5], [18, 5]]
  },
  {
    key: 'm_19', name: '천둥의 고원', diff: 1.7, bg: '#2e2a44', bg2: '#1b1829', road: '#9a8fd4', accent: '#b8a8ff', deco: ['rock', 'grass'], weather: 'rain', ambient: '#b8a8ff', ambientAmt: 0.14, desc: '좁은 길목이 승부처.',
    path: [[-1, 3], [3, 3], [3, 7], [6, 7], [6, 4], [10, 4], [10, 7], [14, 7], [14, 1], [16, 1], [16, 7], [18, 7]]
  },
  {
    key: 'm_20', name: '유리 사원', diff: 1.65, bg: '#2a2a3e', bg2: '#191925', road: '#b4b4d4', accent: '#d4d4ff', deco: ['crystalDeco'], weather: null, ambient: '#d4d4ff', ambientAmt: 0.16, desc: '급커브가 잦아 범위 공격이 빛난다.',
    path: [[-1, 4], [3, 4], [3, 7], [6, 7], [6, 3], [8, 3], [8, 7], [11, 7], [11, 3], [14, 3], [14, 9], [16, 9], [16, 1], [18, 1]]
  },
  {
    key: 'm_21', name: '심연의 균열', diff: 1.9, bg: '#241a38', bg2: '#140f20', road: '#8a5cd4', accent: '#b46aff', deco: ['crystalDeco', 'rock'], weather: 'ash', ambient: '#b46aff', ambientAmt: 0.09, desc: '좁은 길목이 승부처.',
    path: [[-1, 6], [2, 6], [2, 3], [6, 3], [6, 9], [9, 9], [9, 1], [12, 1], [12, 9], [14, 9], [14, 6], [16, 6], [16, 1], [18, 1]]
  },
  {
    key: 'm_22', name: '별무리 회랑', diff: 1.8, bg: '#1c2440', bg2: '#101526', road: '#7f9ad4', accent: '#8fb4ff', deco: ['crystalDeco'], weather: null, ambient: '#8fb4ff', ambientAmt: 0.11, desc: '좁은 길목이 승부처.',
    path: [[-1, 8], [2, 8], [2, 3], [4, 3], [4, 8], [7, 8], [7, 2], [11, 2], [11, 8], [15, 8], [15, 5], [16, 5], [16, 8], [18, 8]]
  },
  {
    key: 'm_23', name: '용의 둥지', diff: 2, bg: '#42221e', bg2: '#281311', road: '#d4784a', accent: '#ff9a5a', deco: ['rock', 'deadtree'], weather: 'ember', ambient: '#ff9a5a', ambientAmt: 0.13, desc: '급커브가 잦아 범위 공격이 빛난다.',
    path: [[-1, 1], [3, 1], [3, 4], [9, 4], [9, 9], [13, 9], [13, 4], [16, 4], [16, 1], [18, 1]]
  },
  {
    key: 'm_24', name: '영원의 정원', diff: 1.75, bg: '#1f3a2a', bg2: '#122318', road: '#7fc48a', accent: '#8fffa8', deco: ['tree', 'flower', 'grass'], weather: null, ambient: '#8fffa8', ambientAmt: 0.14, desc: '길이 길어 화력전이 유리하다.',
    path: [[-1, 3], [3, 3], [3, 7], [9, 7], [9, 4], [12, 4], [12, 1], [16, 1], [16, 9], [18, 9]]
  },
];


/* =========================================================================
 *  맵 모디파이어 — 전장마다 고유 규칙이 적용된다
 * ========================================================================= */
const MAP_MODS = {
  meadow: [
    { icon: '🌿', name: '비옥한 대지', desc: '골드 획득 +15%', goldMul: 1.15 },
  ],
  canyon: [
    { icon: '🏜', name: '건조한 열기', desc: '적 화염 저항 +25%', resistAdd: { fire: .25 } },
    { icon: '🎯', name: '탁 트인 시야', desc: '모든 유닛 사거리 +10%', rngMul: 1.10 },
  ],
  frost: [
    { icon: '❄', name: '살을 에는 한기', desc: '적 이동속도 +12%, 냉기 저항 +30%', spdMul: 1.12, resistAdd: { ice: .3 } },
    { icon: '🔥', name: '온기의 갈망', desc: '화염 피해 +20%', elemBonus: { fire: .2 } },
  ],
  swamp: [
    { icon: '🌫', name: '독기', desc: '적 재생 +50%, 독 피해 +30%', regenMul: 1.5, elemBonus: { poison: .3 } },
    { icon: '🐌', name: '수렁', desc: '적 이동속도 -10%', spdMul: .9 },
  ],
  abyss: [
    { icon: '🌑', name: '심연의 침식', desc: '적 물리 저항 +20%, 암흑 피해 +25%', resistAdd: { phys: .2 }, elemBonus: { dark: .25 } },
    { icon: '💠', name: '마력 과포화', desc: '마나 회복 +40%', manaMul: 1.4 },
  ],
  boneyard: [
    { icon: '💀', name: '망자의 땅', desc: '언데드 비율 급증, 신성 피해 +35%', undeadBias: true, elemBonus: { holy: .35 } },
    { icon: '⚰', name: '부활의 저주', desc: '적 처치 시 10% 확률로 해골이 나타난다', reviveChance: .1 },
  ],
  inferno: [
    { icon: '🌋', name: '작열', desc: '적 화염 저항 +40%, 적 공격 속도 무관', resistAdd: { fire: .4 } },
    { icon: '💥', name: '불안정한 지각', desc: '범위 피해 +25%', splashMul: 1.25 },
  ],
  skyfall: [
    { icon: '🕊', name: '부유하는 폐허', desc: '비행 적 비율 대폭 증가', flyBias: true },
    { icon: '⚡', name: '뇌운', desc: '뇌전 피해 +30%', elemBonus: { thunder: .3 } },
  ],
  voidgate: [
    { icon: '◈', name: '공허의 장막', desc: '적 보호막 +50%', shieldMul: 1.5 },
    { icon: '✨', name: '차원 균열', desc: '적이 더 자주 순간이동한다', teleportBias: true },
  ],
  origin: [
    { icon: '🌠', name: '창세의 압력', desc: '적 체력 +25%, 골드 획득 +40%', hpMul: 1.25, goldMul: 1.4 },
    { icon: '👑', name: '왕의 귀환', desc: '보스가 5웨이브마다 등장한다', bossEvery: 5 },
  ],
};
MAPS.forEach(m => { m.mods = MAP_MODS[m.key] || []; });

/* =========================================================================
 *  액티브 스킬 14종
 * ========================================================================= */
const SKILLS = [
  { key: 'meteor', name: '메테오', icon: '☄', cd: 26, mana: 40, color: '#ff6b35', type: 'target', radius: 3.2, desc: '지정 지역에 운석 낙하. 거대한 화염 폭발 + 화상.' },
  { key: 'blizzard', name: '절대 빙결', icon: '❄', cd: 30, mana: 45, color: '#5bc8ff', type: 'global', desc: '화면의 모든 적을 4초간 빙결시킨다.' },
  { key: 'thunderstorm', name: '뇌우', icon: '⚡', cd: 24, mana: 38, color: '#ffe14d', type: 'global', desc: '무작위 적 25명에게 연쇄 벼락.' },
  { key: 'goldrush', name: '골드 러시', icon: '💰', cd: 40, mana: 30, color: '#ffcf3f', type: 'buff', desc: '12초간 처치 골드 3배 & 즉시 골드 획득.' },
  { key: 'overdrive', name: '오버드라이브', icon: '🔥', cd: 45, mana: 55, color: '#ff4f7e', type: 'buff', desc: '10초간 공격속도 +120%, 피해 +60%.' },
  { key: 'annihilate', name: '섬멸', icon: '💥', cd: 75, mana: 90, color: '#ff2fd0', type: 'global', desc: '모든 적에게 현재 체력의 35% + 고정 피해.' },
  { key: 'timewarp', name: '시간 왜곡', icon: '🕒', cd: 50, mana: 50, color: '#8f7bff', type: 'global', desc: '8초간 적 이동속도 -70%.' },
  { key: 'sanctuary', name: '성역', icon: '✚', cd: 60, mana: 45, color: '#fff2b0', type: 'buff', desc: '생명 3 회복 & 8초간 무적 방벽.' },
  { key: 'poisonfog', name: '맹독 안개', icon: '☠', cd: 34, mana: 42, color: '#7bdd52', type: 'target', radius: 3.6, desc: '지역에 8초간 지속되는 독무를 남긴다.' },
  { key: 'blackhole', name: '블랙홀', icon: '🌀', cd: 55, mana: 60, color: '#b57bff', type: 'target', radius: 3.0, desc: '적을 끌어모으고 5초간 속박 + 지속 피해.' },
  { key: 'railgun', name: '레일건', icon: '🎯', cd: 30, mana: 44, color: '#6ffff0', type: 'target', radius: 1.2, desc: '경로 전체를 관통하는 거대 광선.' },
  { key: 'summonwave', name: '긴급 증원', icon: '✨', cd: 90, mana: 70, color: '#a48bff', type: 'buff', desc: '무작위 유닛 3기를 즉시 무료 소환.' },
  { key: 'earthquake', name: '대지진', icon: '⛰', cd: 42, mana: 52, color: '#d2a15e', type: 'global', desc: '모든 적 기절 2초 + 방어력 40% 파괴.' },
  { key: 'judgement', name: '최후의 심판', icon: '✦', cd: 120, mana: 100, color: '#fff2b0', type: 'global', desc: '체력 40% 이하 적 즉사. 그 외 막대한 신성 피해.' },
  /* ---------------- 생성 : 추가 스킬 ---------------- */
  {
    key: 'meteorshower', name: '유성우', icon: '🌠', cd: 34, mana: 60, color: '#ff7a3c', type: 'target', radius: 3.6,
    desc: '지정 지역에 유성 다발. 3회에 걸쳐 폭발하며 화상을 남긴다.'
  },
  {
    key: 'timestop', name: '시간 정지', icon: '⏱', cd: 70, mana: 95, color: '#b4a8ff', type: 'global',
    desc: '5초간 모든 적이 완전히 멈춘다.'
  },
  {
    key: 'bloodpact', name: '피의 계약', icon: '🩸', cd: 38, mana: 50, color: '#e04a5a', type: 'buff',
    desc: '12초간 공격력 +70%. 대신 생명 1을 지불한다.'
  },
  {
    key: 'bulwark', name: '수호 장벽', icon: '🛡', cd: 44, mana: 45, color: '#7fd0ff', type: 'buff',
    desc: '다음 누수 3회를 막아 준다.'
  },
];

/* =========================================================================
 *  연구 24종 (인게임 골드)
 * ========================================================================= */
const RESEARCH = [
  { key: 'atk', name: '무기 연마', icon: '⚔', max: 60, base: 120, growth: 1.22, per: .06, desc: '모든 유닛 피해 +6%/레벨' },
  { key: 'spd', name: '전술 훈련', icon: '⏱', max: 45, base: 150, growth: 1.24, per: .04, desc: '공격 속도 +4%/레벨' },
  { key: 'rng', name: '망원 조준', icon: '🎯', max: 30, base: 180, growth: 1.26, per: .04, desc: '사거리 +4%/레벨' },
  { key: 'crit', name: '급소 연구', icon: '✹', max: 35, base: 200, growth: 1.25, per: .02, desc: '치명타 확률 +2%p/레벨' },
  { key: 'critdmg', name: '치명 강화', icon: '💢', max: 35, base: 220, growth: 1.25, per: .12, desc: '치명타 피해 +12%/레벨' },
  { key: 'gold', name: '전리품 감정', icon: '💰', max: 45, base: 160, growth: 1.23, per: .07, desc: '골드 획득 +7%/레벨' },
  { key: 'luck', name: '행운의 부적', icon: '🍀', max: 35, base: 260, growth: 1.30, per: .05, desc: '고등급 소환 확률 +5%/레벨' },
  { key: 'mana', name: '마나 순환', icon: '🔷', max: 30, base: 190, growth: 1.25, per: .09, desc: '마나 회복 +9%/레벨' },
  { key: 'pen', name: '방어 파쇄', icon: '🪓', max: 30, base: 230, growth: 1.27, per: .03, desc: '방어 관통 +3%p/레벨' },
  { key: 'splash', name: '폭발 공학', icon: '💥', max: 25, base: 240, growth: 1.28, per: .05, desc: '범위 반경 +5%/레벨' },
  { key: 'dot', name: '고통 증폭', icon: '☣', max: 30, base: 210, growth: 1.26, per: .10, desc: '화상/독/출혈 +10%/레벨' },
  { key: 'slot', name: '진지 확장', icon: '⬛', max: 18, base: 500, growth: 1.42, per: 1, desc: '배치 가능 유닛 +1/레벨' },
  { key: 'hp', name: '성벽 보강', icon: '🏰', max: 18, base: 340, growth: 1.34, per: 1.2, desc: '최대 생명 +1.2/레벨' },
  { key: 'interest', name: '이자 운용', icon: '🏦', max: 20, base: 400, growth: 1.35, per: .01, desc: '웨이브 종료 시 이자 +1%/레벨' },
  { key: 'summoncost', name: '소환 효율', icon: '♻', max: 25, base: 280, growth: 1.30, per: .02, desc: '소환 비용 -2%/레벨' },
  { key: 'boss', name: '거인 사냥', icon: '👑', max: 25, base: 320, growth: 1.30, per: .06, desc: '보스 피해 +6%/레벨' },
  { key: 'chain', name: '전도 회로', icon: '🔗', max: 12, base: 420, growth: 1.38, per: .5, desc: '연쇄 횟수 +0.5/레벨' },
  { key: 'multishot', name: '연발 장전', icon: '🏹', max: 10, base: 600, growth: 1.5, per: .3, desc: '다중 사격 확률 +30%p/레벨' },
  { key: 'slow', name: '한랭 공학', icon: '❄', max: 20, base: 260, growth: 1.28, per: .04, desc: '둔화 효과 +4%p/레벨' },
  { key: 'curse', name: '저주 심화', icon: '🌑', max: 20, base: 270, growth: 1.28, per: .04, desc: '저주 효과 +4%p/레벨' },
  { key: 'skillcd', name: '전술 회복', icon: '🕘', max: 20, base: 350, growth: 1.33, per: .03, desc: '스킬 재사용 -3%/레벨' },
  { key: 'exec', name: '숙청 교리', icon: '🗡', max: 15, base: 480, growth: 1.4, per: .01, desc: '처형 기준 +1%p/레벨' },
  { key: 'summon', name: '소환 강화', icon: '👁', max: 20, base: 380, growth: 1.32, per: .08, desc: '소환수 피해 +8%/레벨' },
  { key: 'aura', name: '지휘 체계', icon: '📯', max: 20, base: 340, growth: 1.31, per: .08, desc: '오라 효과 +8%/레벨' },
];

/* =========================================================================
 *  시너지
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
    summoner: [{ n: 2, summon: .3 }, { n: 4, summon: .8 }, { n: 6, summon: 1.6 }],
    bard: [{ n: 2, spd: .12, aura: .3 }, { n: 4, spd: .3, aura: .9 }],
    engineer: [{ n: 2, dmg: .15, summon: .3 }, { n: 4, dmg: .38, summon: .8 }],
    warlock: [{ n: 2, dot: .3, curse: .08 }, { n: 4, dot: .8, curse: .2 }],
  },
  elem: {
    phys: [{ n: 3, pen: .1 }, { n: 6, pen: .25, dmg: .2 }],
    fire: [{ n: 3, dot: .4 }, { n: 6, dot: 1.0, dmg: .2 }],
    ice: [{ n: 3, slow: .15 }, { n: 6, slow: .35, freeze: .08 }],
    thunder: [{ n: 3, chain: 1 }, { n: 6, chain: 3, stun: .06 }],
    poison: [{ n: 3, dot: .5 }, { n: 6, dot: 1.2 }],
    holy: [{ n: 3, dmg: .18 }, { n: 6, dmg: .45 }],
    dark: [{ n: 3, curse: .12 }, { n: 6, curse: .3 }],
    nature: [{ n: 3, gold: .15 }, { n: 6, gold: .4 }],
    arcane: [{ n: 3, dmg: .2 }, { n: 6, dmg: .5 }],
    void: [{ n: 2, dmg: .35 }, { n: 3, dmg: .9 }],
    wind: [{ n: 3, spd: .18 }, { n: 6, spd: .45, multishot: .4 }],
    earth: [{ n: 3, pen: .18 }, { n: 6, pen: .4, splash: .3 }],
    blood: [{ n: 3, crit: .1, dot: .3 }, { n: 6, crit: .25, dot: .8 }],
    time: [{ n: 2, spd: .16, slow: .1 }, { n: 4, spd: .4, slow: .25 }],
  }
};

/* =========================================================================
 *  업적 40종
 * ========================================================================= */
const ACHIEVEMENTS = [
  { key: 'firstblood', name: '첫 사냥', desc: '적 1마리 처치', icon: '🩸', gem: 1, check: s => s.kills >= 1 },
  { key: 'kill100', name: '학살자', desc: '적 100마리 처치', icon: '💀', gem: 2, check: s => s.kills >= 100 },
  { key: 'kill1000', name: '전장의 지배자', desc: '적 1,000마리 처치', icon: '☠', gem: 5, check: s => s.kills >= 1000 },
  { key: 'kill10000', name: '종말의 사신', desc: '적 10,000마리 처치', icon: '👁', gem: 20, check: s => s.kills >= 10000 },
  { key: 'kill100000', name: '멸종의 이름', desc: '적 100,000마리 처치', icon: '🌌', gem: 60, check: s => s.kills >= 100000 },
  { key: 'wave10', name: '견습 지휘관', desc: '웨이브 10 도달', icon: '🎖', gem: 2, check: s => s.maxWave >= 10 },
  { key: 'wave25', name: '베테랑', desc: '웨이브 25 도달', icon: '🏅', gem: 4, check: s => s.maxWave >= 25 },
  { key: 'wave50', name: '불굴', desc: '웨이브 50 도달', icon: '🛡', gem: 10, check: s => s.maxWave >= 50 },
  { key: 'wave75', name: '역전의 명장', desc: '웨이브 75 도달', icon: '⚔', gem: 18, check: s => s.maxWave >= 75 },
  { key: 'wave100', name: '무한의 끝', desc: '웨이브 100 도달', icon: '♾', gem: 50, check: s => s.maxWave >= 100 },
  { key: 'wave200', name: '2회차 정복자', desc: '누적 웨이브 200 도달', icon: '🔁', gem: 80, check: s => s.maxWave >= 200 },
  { key: 'boss1', name: '보스 슬레이어', desc: '보스 1회 처치', icon: '👑', gem: 3, check: s => s.bossKills >= 1 },
  { key: 'boss10', name: '왕관 수집가', desc: '보스 10회 처치', icon: '💎', gem: 12, check: s => s.bossKills >= 10 },
  { key: 'boss50', name: '군주 사냥꾼', desc: '보스 50회 처치', icon: '🏆', gem: 30, check: s => s.bossKills >= 50 },
  { key: 'legend', name: '전설의 시작', desc: '전설 유닛 획득', icon: '🌟', gem: 5, check: s => s.bestRarity >= 4 },
  { key: 'mythicOwn', name: '신화의 목격자', desc: '신화 유닛 획득', icon: '🔥', gem: 15, check: s => s.bestRarity >= 5 },
  { key: 'ultimate', name: '초월자', desc: '초월 유닛 획득', icon: '✨', gem: 40, check: s => s.bestRarity >= 6 },
  { key: 'primordial', name: '태초를 만지다', desc: '태초 유닛 획득', icon: '🌠', gem: 100, check: s => s.bestRarity >= 7 },
  { key: 'merge50', name: '합성 장인', desc: '50회 합성', icon: '🔨', gem: 4, check: s => s.merges >= 50 },
  { key: 'merge300', name: '연금의 대가', desc: '300회 합성', icon: '⚗', gem: 14, check: s => s.merges >= 300 },
  { key: 'merge2000', name: '창조의 손', desc: '2,000회 합성', icon: '🛠', gem: 45, check: s => s.merges >= 2000 },
  { key: 'gold100k', name: '부자', desc: '누적 골드 100,000', icon: '💰', gem: 6, check: s => s.totalGold >= 100000 },
  { key: 'gold10m', name: '대부호', desc: '누적 골드 10,000,000', icon: '🏦', gem: 25, check: s => s.totalGold >= 10000000 },
  { key: 'gold1b', name: '경제 붕괴', desc: '누적 골드 1,000,000,000', icon: '📈', gem: 70, check: s => s.totalGold >= 1e9 },
  { key: 'combo50', name: '콤보 마스터', desc: '50 콤보 달성', icon: '🎯', gem: 5, check: s => s.maxCombo >= 50 },
  { key: 'combo200', name: '광란의 연쇄', desc: '200 콤보 달성', icon: '🌀', gem: 18, check: s => s.maxCombo >= 200 },
  { key: 'combo1000', name: '멈추지 않는 폭풍', desc: '1,000 콤보 달성', icon: '🌪', gem: 55, check: s => s.maxCombo >= 1000 },
  { key: 'noleak', name: '완벽한 방어', desc: '생명 손실 없이 웨이브 20 도달', icon: '🛡', gem: 12, check: s => s.maxWave >= 20 && s.leaks === 0 },
  { key: 'noleak50', name: '철벽', desc: '생명 손실 없이 웨이브 50 도달', icon: '🏰', gem: 35, check: s => s.maxWave >= 50 && s.leaks === 0 },
  { key: 'dmg1b', name: '10억의 파괴', desc: '누적 피해 1,000,000,000', icon: '💥', gem: 20, check: s => s.totalDmg >= 1e9 },
  { key: 'dmg1t', name: '1조의 파괴', desc: '누적 피해 1,000,000,000,000', icon: '☄', gem: 75, check: s => s.totalDmg >= 1e12 },
  { key: 'allmaps', name: '개척자', desc: '모든 맵 해금', icon: '🗺', gem: 40, check: s => s.mapsUnlocked >= MAPS.length },
  { key: 'skill100', name: '전략가', desc: '스킬 100회 사용', icon: '🎆', gem: 8, check: s => s.skillUses >= 100 },
  { key: 'skill1000', name: '대마법사', desc: '스킬 1,000회 사용', icon: '🔮', gem: 30, check: s => s.skillUses >= 1000 },
  { key: 'army30', name: '대군', desc: '동시에 유닛 30기 배치', icon: '⚔', gem: 8, check: s => s.maxUnits >= 30 },
  { key: 'army40', name: '군단', desc: '동시에 유닛 40기 배치', icon: '🚩', gem: 22, check: s => s.maxUnits >= 40 },
  { key: 'collect30', name: '수집가', desc: '도감 30종 발견', icon: '📖', gem: 10, check: s => s.collected >= 30 },
  { key: 'collect60', name: '박물학자', desc: '도감 60종 발견', icon: '📚', gem: 28, check: s => s.collected >= 60 },
  { key: 'collectAll', name: '완전한 도감', desc: '모든 유닛 발견', icon: '🧾', gem: 120, check: s => s.collected >= UNITS.length },
  { key: 'runs50', name: '불굴의 도전자', desc: '50회 플레이', icon: '🔄', gem: 20, check: s => s.runs >= 50 },
  /* ---------------- 생성 : 추가 업적 ---------------- */
  { key: 'xw30', name: '웨이브 30 돌파', desc: '한 판에서 30웨이브 도달', icon: '🌊', gem: 8, check: s => s.maxWave >= 30 },
  { key: 'xw40', name: '웨이브 40 돌파', desc: '한 판에서 40웨이브 도달', icon: '🌊', gem: 10, check: s => s.maxWave >= 40 },
  { key: 'xw50', name: '웨이브 50 돌파', desc: '한 판에서 50웨이브 도달', icon: '🌊', gem: 13, check: s => s.maxWave >= 50 },
  { key: 'xw60', name: '웨이브 60 돌파', desc: '한 판에서 60웨이브 도달', icon: '🌊', gem: 15, check: s => s.maxWave >= 60 },
  { key: 'xw70', name: '웨이브 70 돌파', desc: '한 판에서 70웨이브 도달', icon: '🌊', gem: 18, check: s => s.maxWave >= 70 },
  { key: 'xw80', name: '웨이브 80 돌파', desc: '한 판에서 80웨이브 도달', icon: '🌊', gem: 20, check: s => s.maxWave >= 80 },
  { key: 'xw90', name: '웨이브 90 돌파', desc: '한 판에서 90웨이브 도달', icon: '🌊', gem: 23, check: s => s.maxWave >= 90 },
  { key: 'xw100', name: '웨이브 100 돌파', desc: '한 판에서 100웨이브 도달', icon: '🌊', gem: 25, check: s => s.maxWave >= 100 },
  { key: 'xw120', name: '웨이브 120 돌파', desc: '한 판에서 120웨이브 도달', icon: '🌊', gem: 30, check: s => s.maxWave >= 120 },
  { key: 'xw150', name: '웨이브 150 돌파', desc: '한 판에서 150웨이브 도달', icon: '🌊', gem: 38, check: s => s.maxWave >= 150 },
  { key: 'xk2000', name: '처치 2,000', desc: '누적 2,000기 처치', icon: '💀', gem: 26, check: s => s.kills >= 2000 },
  { key: 'xk5000', name: '처치 5,000', desc: '누적 5,000기 처치', icon: '💀', gem: 30, check: s => s.kills >= 5000 },
  { key: 'xk25000', name: '처치 25,000', desc: '누적 25,000기 처치', icon: '💀', gem: 35, check: s => s.kills >= 25000 },
  { key: 'xk50000', name: '처치 50,000', desc: '누적 50,000기 처치', icon: '💀', gem: 38, check: s => s.kills >= 50000 },
  { key: 'xk250000', name: '처치 250,000', desc: '누적 250,000기 처치', icon: '💀', gem: 43, check: s => s.kills >= 250000 },
  { key: 'xmg200', name: '합성 200회', desc: '누적 200회 합성', icon: '⇪', gem: 8, check: s => s.merges >= 200 },
  { key: 'xmg500', name: '합성 500회', desc: '누적 500회 합성', icon: '⇪', gem: 13, check: s => s.merges >= 500 },
  { key: 'xmg1000', name: '합성 1000회', desc: '누적 1000회 합성', icon: '⇪', gem: 22, check: s => s.merges >= 1000 },
  { key: 'xmg2500', name: '합성 2500회', desc: '누적 2500회 합성', icon: '⇪', gem: 47, check: s => s.merges >= 2500 },
  { key: 'xmg5000', name: '합성 5000회', desc: '누적 5000회 합성', icon: '⇪', gem: 88, check: s => s.merges >= 5000 },
  { key: 'xgd100000', name: '골드 10만', desc: '누적 골드 100,000', icon: '💰', gem: 12, check: s => s.totalGold >= 100000 },
  { key: 'xgd500000', name: '골드 50만', desc: '누적 골드 500,000', icon: '💰', gem: 12, check: s => s.totalGold >= 500000 },
  { key: 'xgd1000000', name: '골드 100만', desc: '누적 골드 1,000,000', icon: '💰', gem: 12, check: s => s.totalGold >= 1000000 },
  { key: 'xgd5000000', name: '골드 500만', desc: '누적 골드 5,000,000', icon: '💰', gem: 12, check: s => s.totalGold >= 5000000 },
  { key: 'xsm200', name: '소환 200회', desc: '누적 200회 소환', icon: '✨', gem: 10, check: s => s.summons >= 200 },
  { key: 'xsm500', name: '소환 500회', desc: '누적 500회 소환', icon: '✨', gem: 10, check: s => s.summons >= 500 },
  { key: 'xsm1000', name: '소환 1000회', desc: '누적 1000회 소환', icon: '✨', gem: 10, check: s => s.summons >= 1000 },
  { key: 'xsm2000', name: '소환 2000회', desc: '누적 2000회 소환', icon: '✨', gem: 10, check: s => s.summons >= 2000 },
  { key: 'xsm5000', name: '소환 5000회', desc: '누적 5000회 소환', icon: '✨', gem: 10, check: s => s.summons >= 5000 },
  { key: 'xbs10', name: '보스 10기 격파', desc: '누적 보스 10기 처치', icon: '👑', gem: 7.5, check: s => s.bossKills >= 10 },
  { key: 'xbs50', name: '보스 50기 격파', desc: '누적 보스 50기 처치', icon: '👑', gem: 17.5, check: s => s.bossKills >= 50 },
  { key: 'xbs150', name: '보스 150기 격파', desc: '누적 보스 150기 처치', icon: '👑', gem: 42.5, check: s => s.bossKills >= 150 },
  { key: 'xbs400', name: '보스 400기 격파', desc: '누적 보스 400기 처치', icon: '👑', gem: 105, check: s => s.bossKills >= 400 },
  { key: 'xu25', name: '병력 25기', desc: '동시에 25기 배치', icon: '🏰', gem: 15, check: s => s.maxUnits >= 25 },
  { key: 'xu32', name: '병력 32기', desc: '동시에 32기 배치', icon: '🏰', gem: 15, check: s => s.maxUnits >= 32 },
  { key: 'xu38', name: '병력 38기', desc: '동시에 38기 배치', icon: '🏰', gem: 15, check: s => s.maxUnits >= 38 },
  { key: 'xc30', name: '30연속 처치', desc: '최대 콤보 30', icon: '🔥', gem: 12, check: s => s.maxCombo >= 30 },
  { key: 'xc60', name: '60연속 처치', desc: '최대 콤보 60', icon: '🔥', gem: 12, check: s => s.maxCombo >= 60 },
  { key: 'xc120', name: '120연속 처치', desc: '최대 콤보 120', icon: '🔥', gem: 12, check: s => s.maxCombo >= 120 },
];

/* =========================================================================
 *  프로필 커스터마이즈
 * ========================================================================= */
const AVATAR = {
  body: [
    { key: 'leather', name: '가죽 갑옷', cost: 0 },
    { key: 'robe', name: '마법사 로브', cost: 0 },
    { key: 'plate', name: '판금 갑옷', cost: 15 },
    { key: 'cloak', name: '암살자 망토', cost: 15 },
    { key: 'core', name: '기계 코어', cost: 40 },
    { key: 'brute', name: '거인의 몸', cost: 40 },
    { key: 'scaled', name: '용린 갑주', cost: 80 },
    { key: 'spectral', name: '영체', cost: 120 },
    { key: 'crystal', name: '수정체', cost: 150 },
  ],
  head: [
    { key: 'human', name: '인간', cost: 0 },
    { key: 'beastHead', name: '수인', cost: 20 },
    { key: 'skull', name: '해골', cost: 45 },
    { key: 'machine', name: '기계', cost: 60 },
    { key: 'demonHead', name: '악마', cost: 90 },
    { key: 'dragonHead', name: '용', cost: 140 },
    { key: 'orb', name: '정령 구체', cost: 160 },
  ],
  hair: [
    { key: 'short', name: '단발', cost: 0 },
    { key: 'long', name: '장발', cost: 0 },
    { key: 'pony', name: '포니테일', cost: 8 },
    { key: 'spiky', name: '스파이크', cost: 8 },
    { key: 'braid', name: '땋은 머리', cost: 18 },
    { key: 'none', name: '민머리', cost: 0 },
    { key: 'flame', name: '불꽃', cost: 70 },
    { key: 'ice', name: '얼음', cost: 70 },
  ],
  gear: [
    { key: 'none', name: '없음', cost: 0 },
    { key: 'hood', name: '후드', cost: 10 },
    { key: 'helm', name: '투구', cost: 20 },
    { key: 'wizardHat', name: '마법사 모자', cost: 25 },
    { key: 'visor', name: '바이저', cost: 35 },
    { key: 'mask', name: '가면', cost: 35 },
    { key: 'plague', name: '역병 마스크', cost: 55 },
    { key: 'laurel', name: '월계관', cost: 70 },
    { key: 'horns', name: '뿔', cost: 85 },
    { key: 'antlers', name: '사슴뿔', cost: 85 },
    { key: 'halo', name: '후광', cost: 130 },
    { key: 'crown', name: '왕관', cost: 200 },
  ],
  weapon: [
    { key: 'sword', name: '검', cost: 0 },
    { key: 'bow', name: '활', cost: 0 },
    { key: 'staff', name: '지팡이', cost: 0 },
    { key: 'dagger', name: '단검', cost: 10 },
    { key: 'axe', name: '도끼', cost: 15 },
    { key: 'spear', name: '창', cost: 15 },
    { key: 'hammer', name: '망치', cost: 25 },
    { key: 'rifle', name: '소총', cost: 40 },
    { key: 'cannon', name: '대포', cost: 55 },
    { key: 'scythe', name: '낫', cost: 75 },
    { key: 'greatsword', name: '대검', cost: 75 },
    { key: 'halberd', name: '미늘창', cost: 90 },
    { key: 'harp', name: '하프', cost: 60 },
    { key: 'chakram', name: '차크람', cost: 110 },
    { key: 'banner', name: '군기', cost: 110 },
    { key: 'orb', name: '마력구', cost: 130 },
  ],
  wings: [
    { key: 'none', name: '없음', cost: 0 },
    { key: 'feather', name: '천사 날개', cost: 150 },
    { key: 'bat', name: '마족 날개', cost: 150 },
    { key: 'insectWing', name: '요정 날개', cost: 120 },
    { key: 'energy', name: '에너지 날개', cost: 260 },
  ],
  skin: ['#f6dcbe', '#f0c9a0', '#e0b088', '#c99a6a', '#a87a52', '#7a5638', '#c8e8d0', '#d8c8f0', '#8fd8ff', '#ffb0c0'],
  hairCol: ['#2a2028', '#4a3524', '#6b4a2a', '#a8763a', '#c8a05a', '#e8d9a0', '#c04a2a', '#8a2a4a', '#4a3a8a', '#3fd68c', '#8fd8ff', '#ff8fd8', '#ffffff'],
  color: ['#8fa5c4', '#ff6b35', '#5bc8ff', '#ffe14d', '#7bdd52', '#fff2b0', '#b57bff', '#3fd68c', '#ff5bd0', '#8f7bff', '#ff3d5e', '#d2a15e'],
};

/* 칭호 — 조건 달성 시 해금 */
const TITLES = [
  { key: 'rookie', name: '신병', color: '#b9c4cf', cond: () => true, desc: '기본 칭호' },
  { key: 'defender', name: '수호자', color: '#63d471', cond: s => s.maxWave >= 20, desc: '웨이브 20 도달' },
  { key: 'veteran', name: '역전의 용사', color: '#4ea8ff', cond: s => s.maxWave >= 40, desc: '웨이브 40 도달' },
  { key: 'commander', name: '대지휘관', color: '#b46bff', cond: s => s.maxWave >= 60, desc: '웨이브 60 도달' },
  { key: 'legendcmd', name: '전설의 사령관', color: '#ffb300', cond: s => s.maxWave >= 100, desc: '웨이브 100 도달' },
  { key: 'slayer', name: '학살자', color: '#ff4f7e', cond: s => s.kills >= 5000, desc: '5,000 처치' },
  { key: 'bosshunter', name: '보스 사냥꾼', color: '#ff6b35', cond: s => s.bossKills >= 25, desc: '보스 25회 처치' },
  { key: 'tycoon', name: '억만장자', color: '#ffd24d', cond: s => s.totalGold >= 5000000, desc: '누적 골드 500만' },
  { key: 'collector', name: '수집광', color: '#6ffff0', cond: s => s.collected >= 50, desc: '도감 50종' },
  { key: 'immortal', name: '불멸', color: '#fff2b0', cond: s => s.maxWave >= 50 && s.leaks === 0, desc: '무실점 웨이브 50' },
  { key: 'godhand', name: '신의 손', color: '#ff2fd0', cond: s => s.bestRarity >= 7, desc: '태초 유닛 획득' },
  { key: 'eternal', name: '영겁의 방랑자', color: '#a8b8ff', cond: s => s.runs >= 100, desc: '100회 플레이' },
];

/* 프로필 프레임 */
const FRAMES = [
  { key: 'none', name: '없음', color: '#5a6474', cost: 0 },
  { key: 'bronze', name: '청동', color: '#c88a4a', cost: 10 },
  { key: 'silver', name: '은', color: '#c0c8d4', cost: 30 },
  { key: 'gold', name: '황금', color: '#ffd24d', cost: 70 },
  { key: 'emerald', name: '에메랄드', color: '#3fd68c', cost: 110 },
  { key: 'sapphire', name: '사파이어', color: '#4ea8ff', cost: 150 },
  { key: 'ruby', name: '루비', color: '#ff4f7e', cost: 200 },
  { key: 'void', name: '공허', color: '#8f7bff', cost: 300 },
  { key: 'rainbow', name: '무지개', color: '#ff2fd0', cost: 500 },
];

/* 배지 */
const BADGES = [
  { key: 'star', icon: '⭐', name: '별', cost: 0 },
  { key: 'sword', icon: '⚔', name: '검', cost: 5 },
  { key: 'shield', icon: '🛡', name: '방패', cost: 5 },
  { key: 'crown', icon: '👑', name: '왕관', cost: 25 },
  { key: 'fire', icon: '🔥', name: '불꽃', cost: 25 },
  { key: 'skull', icon: '💀', name: '해골', cost: 40 },
  { key: 'dragon', icon: '🐉', name: '용', cost: 80 },
  { key: 'galaxy', icon: '🌌', name: '은하', cost: 140 },
  { key: 'infinity', icon: '♾', name: '무한', cost: 260 },
];

/* =========================================================================
 *  일일 보상 / 퀘스트
 * ========================================================================= */
const DAILY_REWARDS = [
  { day: 1, gem: 3, text: '💎 3' },
  { day: 2, gem: 5, text: '💎 5' },
  { day: 3, gem: 8, text: '💎 8' },
  { day: 4, gem: 12, text: '💎 12' },
  { day: 5, gem: 16, text: '💎 16' },
  { day: 6, gem: 22, text: '💎 22' },
  { day: 7, gem: 40, text: '💎 40 (주간 보상)' },
];

const QUESTS = [
  { key: 'q_kill', name: '오늘의 사냥', desc: '적 300마리 처치', target: 300, stat: 'kills', gem: 4 },
  { key: 'q_wave', name: '진격', desc: '웨이브 15 도달', target: 15, stat: 'maxWave', gem: 4 },
  { key: 'q_merge', name: '합성 훈련', desc: '20회 합성', target: 20, stat: 'merges', gem: 3 },
  { key: 'q_boss', name: '거인 토벌', desc: '보스 2회 처치', target: 2, stat: 'bossKills', gem: 5 },
  { key: 'q_skill', name: '전술 운용', desc: '스킬 15회 사용', target: 15, stat: 'skillUses', gem: 3 },
  { key: 'q_gold', name: '전리품', desc: '골드 50,000 획득', target: 50000, stat: 'totalGold', gem: 4 },
  { key: 'q_summon', name: '증원 요청', desc: '40회 소환', target: 40, stat: 'summons', gem: 3 },
  { key: 'q_combo', name: '연쇄 살상', desc: '80 콤보 달성', target: 80, stat: 'maxCombo', gem: 5 },
];

/* =========================================================================
 *  상점 (젬 소비) — 소모품 & 부스터
 * ========================================================================= */
const SHOP = [
  { key: 'startgold', name: '출발 자금', icon: '💰', cost: 5, desc: '다음 판 시작 골드 +1,000', once: false },
  { key: 'startlife', name: '보급 방벽', icon: '🏰', cost: 8, desc: '다음 판 시작 생명 +10', once: false },
  { key: 'luckycharm', name: '행운의 주사위', icon: '🎲', cost: 12, desc: '다음 판 소환 행운 +50%', once: false },
  { key: 'freeSummon', name: '무료 소환권 x5', icon: '✨', cost: 10, desc: '다음 판 첫 5회 소환 무료', once: false },
  { key: 'reroll', name: '퀘스트 재설정', icon: '🔄', cost: 3, desc: '일일 퀘스트를 새로 뽑는다', once: false },
];

/* ------------------------------------------------------------- 팁 */
const TIPS = [
  '같은 유닛 3기를 모으면 합성해서 성급을 올릴 수 있다.',
  '3성 유닛 3기를 합성하면 다음 등급의 새 유닛으로 승급한다!',
  '지원/음유시인 유닛의 오라 범위 안에 딜러를 배치하자.',
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
  '출혈은 방어를 무시하고, 독은 중첩될수록 무섭다.',
  '비행 적은 경로를 그대로 따라오지만 지형 효과를 무시한다.',
  '프로필에서 아바타를 꾸미면 로비와 결과 화면에 반영된다.',
  '일일 퀘스트와 출석 보상으로 젬을 매일 모을 수 있다.',
];

window.ELEM = ELEM; window.RARITY = RARITY; window.RARITY_IDX = RARITY_IDX; window.CLASSES = CLASSES;
window.UNITS = UNITS; window.UNIT_MAP = UNIT_MAP; window.UNITS_BY_RARITY = UNITS_BY_RARITY;
window.ENEMIES = ENEMIES; window.ENEMY_MAP = ENEMY_MAP; window.BOSS_ORDER = BOSS_ORDER;
window.SPAWN_TABLE = SPAWN_TABLE; window.MAPS = MAPS; window.GRID_W = GRID_W; window.GRID_H = GRID_H;
window.MAP_MODS = MAP_MODS; window.SKILLS = SKILLS; window.RESEARCH = RESEARCH; window.SYNERGY = SYNERGY;
window.ACHIEVEMENTS = ACHIEVEMENTS; window.TIPS = TIPS;
window.AVATAR = AVATAR; window.TITLES = TITLES; window.FRAMES = FRAMES; window.BADGES = BADGES;
window.DAILY_REWARDS = DAILY_REWARDS; window.QUESTS = QUESTS; window.SHOP = SHOP;
