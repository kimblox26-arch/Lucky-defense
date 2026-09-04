// 웨이브 디렉터. 예산 기반으로 구성을 짜고 게이트에서 순차적으로 투입한다.

import { TYPE } from '../enemy/Types.js';
import { Rng, clamp, clamp01, lerp } from '../core/Util.js';

export const PHASE = {
  IDLE: 'idle',
  TELEGRAPH: 'telegraph',   // 게이트 경고 (사이렌 + 붉은 안개)
  ACTIVE: 'active',
  CLEARED: 'cleared',
  PREP: 'prep',
};

// [타입, 해금 웨이브, 예산 비중]
const ROSTER = [
  { type: TYPE.WALKER, from: 1, weight: 1.0 },
  { type: TYPE.RUNNER, from: 3, weight: 0.55 },
  { type: TYPE.SPITTER, from: 5, weight: 0.3 },
  { type: TYPE.BOMBER, from: 7, weight: 0.28 },
  { type: TYPE.BRUTE, from: 9, weight: 0.35 },
];

export const PREP_TIME = 12;
const TELEGRAPH_TIME = 2.6;

export class Waves {
  constructor(game, enemies) {
    this.game = game;
    this.enemies = enemies;
    this.rng = new Rng(0xdead + 0x5eed);

    this.wave = 0;
    this.phase = PHASE.IDLE;
    this.phaseT = 0;
    this.queue = [];          // 남은 스폰 목록
    this.spawnedTotal = 0;
    this.waveTotal = 0;
    this.spawnTimer = 0;
    this.activeGates = [];
    this.autoStart = true;

    this.onWaveStart = null;
    this.onWaveComplete = null;
    this.onPrepTick = null;
  }

  get concurrentCap() {
    const q = this.game.engine.quality.particleScale;
    return q >= 0.9 ? 44 : q >= 0.6 ? 32 : 22;
  }

  reset() {
    this.wave = 0;
    this.phase = PHASE.IDLE;
    this.phaseT = 0;
    this.queue.length = 0;
    this.spawnedTotal = 0;
    this.waveTotal = 0;
    this.rng.reseed(0xdead + 0x5eed);
  }

  /** 다음 웨이브 준비 단계로 (게임 시작 직후에도 사용) */
  beginPrep(duration = PREP_TIME) {
    this.phase = PHASE.PREP;
    this.phaseT = duration;
  }

  startNextWave() {
    this.wave++;
    this._composeWave(this.wave);
    this.phase = PHASE.TELEGRAPH;
    this.phaseT = TELEGRAPH_TIME;
    this.onWaveStart?.(this.wave, this.waveTotal, this.isBossWave(this.wave));
  }

  isBossWave(n) { return n % 5 === 0; }

  /** 웨이브 난이도 예산 */
  budgetFor(n) {
    return 7 + n * 3.4 + Math.pow(n, 1.55) * 0.9;
  }

  buffFor(n) {
    return {
      health: 1 + (n - 1) * 0.085 + Math.pow(Math.max(0, n - 10), 1.25) * 0.02,
      speed: 1 + Math.min(0.45, (n - 1) * 0.014),
      damage: 1 + (n - 1) * 0.042,
    };
  }

  _composeWave(n) {
    const r = this.rng;
    let budget = this.budgetFor(n);
    const pool = ROSTER.filter((e) => n >= e.from);
    const boss = this.isBossWave(n);

    const list = [];
    // 보스 웨이브: 중장갑체를 확정 투입
    if (boss && n >= 5) {
      const brutes = Math.max(1, Math.floor(n / 5));
      for (let i = 0; i < brutes; i++) {
        list.push(TYPE.BRUTE);
        budget -= 6;
      }
    }

    // 나머지 예산을 가중 무작위로 소진
    let guard = 400;
    while (budget > 0 && guard-- > 0) {
      const affordable = pool.filter((e) => {
        const cost = COST[e.type];
        return cost <= budget + 1;
      });
      if (!affordable.length) break;
      const total = affordable.reduce((s, e) => s + e.weight, 0);
      let pick = r.float() * total;
      let chosen = affordable[affordable.length - 1];
      for (const e of affordable) { pick -= e.weight; if (pick <= 0) { chosen = e; break; } }
      list.push(chosen.type);
      budget -= COST[chosen.type];
    }

    // 강한 개체를 뒤쪽에 배치해 난이도가 상승하도록 정렬 후 약간 섞는다
    list.sort((a, b) => COST[a] - COST[b]);
    for (let i = 0; i < list.length; i++) {
      const j = clamp(i + r.irange(-2, 2), 0, list.length - 1);
      const t = list[i]; list[i] = list[j]; list[j] = t;
    }

    // 게이트 배정: 웨이브가 오를수록 여러 방향에서 동시에 들어온다
    const gates = this.game.arena.gates;
    const gateCount = clamp(1 + Math.floor((n - 1) / 2), 1, gates.length);
    const shuffled = [...gates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = r.int(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.activeGates = shuffled.slice(0, gateCount);

    this.queue = list.map((type, i) => ({
      type,
      gate: this.activeGates[i % this.activeGates.length],
    }));
    this.waveTotal = this.queue.length;
    this.spawnedTotal = 0;
    this.buff = this.buffFor(n);
    this.spawnInterval = lerp(0.9, 0.24, clamp01((n - 1) / 18));
    this.spawnTimer = 0;
  }

  update(dt, playing) {
    if (!playing) return;
    const e = this.enemies;

    switch (this.phase) {
      case PHASE.PREP: {
        this.phaseT -= dt;
        this.onPrepTick?.(Math.max(0, this.phaseT));
        if (this.phaseT <= 0) this.startNextWave();
        break;
      }

      case PHASE.TELEGRAPH: {
        this.phaseT -= dt;
        // 게이트에 붉은 안개
        for (const g of this.activeGates) {
          this.game.fx?.particles.spawnFog(
            g.center.x + g.outward.x * 2.2, 0.4, g.center.z + g.outward.z * 2.2, 2.0,
          );
        }
        if (this.phaseT <= 0) {
          this.phase = PHASE.ACTIVE;
          this.spawnTimer = 0;
        }
        break;
      }

      case PHASE.ACTIVE: {
        // 스폰
        this.spawnTimer -= dt;
        if (this.queue.length && this.spawnTimer <= 0 && e.aliveCount < this.concurrentCap) {
          const batch = this.queue.length > 24 ? 2 : 1;
          for (let i = 0; i < batch && this.queue.length; i++) {
            const item = this.queue.shift();
            const spot = this.rng.pick(item.gate.spawns);
            const jx = this.rng.range(-0.8, 0.8);
            const jz = this.rng.range(-0.8, 0.8);
            if (e.spawn(item.type, spot.x + jx, spot.z + jz, this.buff)) {
              this.spawnedTotal++;
            } else {
              this.queue.unshift(item);
              break;
            }
          }
          this.spawnTimer = this.spawnInterval;
        }

        // 게이트 안개 유지
        for (const g of this.activeGates) {
          this.game.fx?.particles.spawnFog(
            g.center.x + g.outward.x * 2.2, 0.4, g.center.z + g.outward.z * 2.2, 2.0,
          );
        }

        if (!this.queue.length && e.aliveCount === 0) {
          this.phase = PHASE.CLEARED;
          this.phaseT = 1.1;
        }
        break;
      }

      case PHASE.CLEARED: {
        this.phaseT -= dt;
        if (this.phaseT <= 0) {
          this.phase = PHASE.IDLE;
          this.onWaveComplete?.(this.wave);
        }
        break;
      }

      default: break;
    }
  }

  /** HUD 표시용 남은 적 수 */
  get remaining() {
    return this.queue.length + this.enemies.aliveCount;
  }

  get total() { return this.waveTotal; }

  /** 웨이브 진행도 0..1 (무드/조명 강도에 사용) */
  get intensity() {
    return clamp01((this.wave - 1) / 24);
  }
}

const COST = [];
COST[TYPE.WALKER] = 1;
COST[TYPE.RUNNER] = 2;
COST[TYPE.BRUTE] = 6;
COST[TYPE.SPITTER] = 4;
COST[TYPE.BOMBER] = 3;
