// 감염체 5종. 실루엣·색·눈빛이 서로 확실히 달라야 전투 중에 즉시 구분된다.

export const TYPE = {
  WALKER: 0,
  RUNNER: 1,
  BRUTE: 2,
  SPITTER: 3,
  BOMBER: 4,
};

/**
 * scale: [torsoW, torsoH, torsoD, headScale, limbScale]
 * hitbox: 반지름과 각 부위 높이 구간 — 명중 판정에 그대로 쓰인다.
 */
export const TYPES = [
  {
    id: TYPE.WALKER, key: 'walker', name: '보행체', cost: 1,
    health: 100, speed: 1.75, speedVar: 0.22,
    damage: 11, attackRange: 1.75, attackWind: 0.42, attackCd: 1.15,
    radius: 0.34, height: 1.78, mass: 1,
    staggerResist: 0, knockback: 1.0,
    color: '#8a9c72', accent: '#5c6a4c', eye: '#ff5a2a', eyeIntensity: 2.6,
    scale: [1, 1, 1, 1, 1],
    score: 100, gore: 6,
  },
  {
    id: TYPE.RUNNER, key: 'runner', name: '질주체', cost: 2,
    health: 62, speed: 4.6, speedVar: 0.3,
    damage: 8, attackRange: 1.7, attackWind: 0.24, attackCd: 0.72,
    radius: 0.3, height: 1.66, mass: 0.7,
    staggerResist: 0, knockback: 1.5,
    color: '#a76050', accent: '#6d3c30', eye: '#ffdc3a', eyeIntensity: 4.0,
    scale: [0.82, 0.96, 0.8, 0.88, 1.12],
    score: 160, gore: 5,
    lunge: { range: 5.2, speed: 9.5, cd: 3.2 },
  },
  {
    id: TYPE.BRUTE, key: 'brute', name: '중장갑체', cost: 6,
    health: 520, speed: 1.35, speedVar: 0.1,
    damage: 32, attackRange: 2.1, attackWind: 0.72, attackCd: 1.9,
    radius: 0.58, height: 2.5, mass: 4,
    staggerResist: 0.9, knockback: 0.15,
    color: '#6f7684', accent: '#454b56', eye: '#ff2a1a', eyeIntensity: 3.2,
    scale: [1.75, 1.35, 1.7, 1.15, 1.5],
    score: 600, gore: 12,
    armor: 0.35,               // 몸통 피격 시 35% 감소 (머리는 예외)
  },
  {
    id: TYPE.SPITTER, key: 'spitter', name: '분사체', cost: 4,
    health: 130, speed: 1.5, speedVar: 0.15,
    damage: 16, attackRange: 15, attackWind: 0.95, attackCd: 2.8,
    radius: 0.36, height: 1.82, mass: 1.1,
    staggerResist: 0.2, knockback: 1.0,
    color: '#729d7b', accent: '#456349', eye: '#7dff5c', eyeIntensity: 2.3,
    scale: [1.05, 1.0, 1.05, 1.45, 0.92],
    score: 320, gore: 7,
    ranged: { speed: 17, gravity: 7.5, radius: 2.2, keepDistance: 9 },
  },
  {
    id: TYPE.BOMBER, key: 'bomber', name: '자폭체', cost: 3,
    health: 85, speed: 2.9, speedVar: 0.2,
    damage: 46, attackRange: 2.0, attackWind: 1.05, attackCd: 99,
    radius: 0.42, height: 1.7, mass: 1.2,
    staggerResist: 0.4, knockback: 0.8,
    color: '#ac9542', accent: '#6b5b26', eye: '#ff8c1a', eyeIntensity: 3.4,
    scale: [1.3, 0.92, 1.3, 0.95, 0.9],
    score: 280, gore: 14,
    explode: { radius: 4.6, damage: 46, selfDamage: true },
  },
];

/** 피격 부위 판정 경계 (전체 높이 대비 비율) */
export const PART = {
  headTop: 1.0,
  headBottom: 0.83,
  torsoBottom: 0.46,
};

export function typeOf(id) { return TYPES[id]; }
