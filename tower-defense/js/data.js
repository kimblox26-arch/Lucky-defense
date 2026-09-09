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
  { key: 'hp', name: '성벽 보강', icon: '🏰', max: 25, base: 300, growth: 1.32, per: 2, desc: '최대 생명 +2/레벨' },
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
