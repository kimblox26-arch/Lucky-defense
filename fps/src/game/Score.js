// 점수 + 연속 처치 배수. 배수는 시간이 지나면 떨어지므로 계속 교전하도록 유도한다.

import { loadBest, saveBest } from '../core/Settings.js';
import { clamp, clamp01 } from '../core/Util.js';

const COMBO_WINDOW = 3.4;
const COMBO_MAX = 5;

export class Score {
  constructor() {
    this.best = loadBest();
    this.reset();
  }

  reset() {
    this.score = 0;
    this.kills = 0;
    this.headshots = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.damageTaken = 0;
    this.comboCount = 0;
    this.comboT = 0;
    this.startedAt = 0;
    this.duration = 0;
    this.wave = 0;
  }

  get multiplier() {
    if (this.comboT <= 0) return 1;
    return clamp(1 + this.comboCount * 0.12, 1, COMBO_MAX);
  }

  get comboRatio() { return clamp01(this.comboT / COMBO_WINDOW); }

  addKill(typeScore, isHeadshot) {
    this.kills++;
    if (isHeadshot) this.headshots++;
    this.comboCount++;
    this.comboT = COMBO_WINDOW;
    const base = typeScore * (isHeadshot ? 1.6 : 1);
    const gained = Math.round(base * this.multiplier);
    this.score += gained;
    return gained;
  }

  addBonus(points) {
    this.score += Math.round(points);
  }

  update(dt) {
    this.duration += dt;
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) { this.comboT = 0; this.comboCount = 0; }
    }
  }

  get accuracy() {
    return this.shotsFired > 0 ? this.shotsHit / this.shotsFired : 0;
  }

  /** 실행 종료 시 최고 기록 갱신. 갱신되었으면 true */
  finish(wave) {
    this.wave = wave;
    let isBest = false;
    if (this.score > this.best.score) { this.best.score = this.score; isBest = true; }
    if (wave > this.best.wave) { this.best.wave = wave; isBest = true; }
    if (this.kills > this.best.kills) this.best.kills = this.kills;
    if (isBest) saveBest(this.best);
    return isBest;
  }
}
