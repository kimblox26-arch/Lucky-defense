// 고정 타임스텝 시뮬레이션 + 렌더 보간을 관리한다.
// timeScale로 킬 슬로우모/게임오버 감속을 표현.

import { damp } from './Util.js';

export const FIXED_DT = 1 / 60;
const MAX_STEPS = 5;          // 스파이럴 오브 데스 방지
const MAX_FRAME = 0.25;       // 탭 복귀 시 큰 델타 컷

export class Time {
  constructor() {
    this.now = 0;             // 시뮬레이션 누적 시간(스케일 적용)
    this.raw = 0;             // 실제 누적 시간
    this.dt = FIXED_DT;
    this.frameDt = 0;         // 이번 렌더 프레임의 실 델타(스케일 적용)
    this.rawFrameDt = 0;
    this.alpha = 0;           // 렌더 보간 계수 [0,1)
    this.timeScale = 1;
    this._targetScale = 1;
    this._scaleHold = 0;
    this._acc = 0;
    this._last = 0;
    this.paused = false;
    this.frame = 0;
  }

  /** 일시적인 슬로우모. duration 동안 scale 유지 후 1로 복귀. */
  slowmo(scale, duration) {
    this._targetScale = scale;
    this._scaleHold = Math.max(this._scaleHold, duration);
  }

  /** 지속적인 스케일 (게임오버 등). hold=Infinity */
  setScale(scale) {
    this._targetScale = scale;
    this._scaleHold = Infinity;
  }

  resetScale() {
    this._targetScale = 1;
    this._scaleHold = 0;
  }

  /**
   * 렌더 프레임 시작 시 호출. 실행해야 할 고정 스텝 수를 반환한다.
   * @param {number} nowMs performance.now()
   */
  begin(nowMs) {
    const t = nowMs / 1000;
    if (this._last === 0) this._last = t;
    let raw = t - this._last;
    this._last = t;
    if (raw > MAX_FRAME) raw = MAX_FRAME;
    if (raw < 0) raw = 0;

    this.rawFrameDt = raw;
    this.raw += raw;

    // 스케일 감쇠 (복귀는 부드럽게, 진입은 즉시)
    if (this._scaleHold > 0) {
      this._scaleHold -= raw;
      this.timeScale = this._targetScale;
    } else {
      this.timeScale = damp(this.timeScale, 1, 8, raw);
      if (Math.abs(this.timeScale - 1) < 0.002) this.timeScale = 1;
    }

    if (this.paused) {
      this.frameDt = 0;
      this.alpha = 1;
      return 0;
    }

    const scaled = raw * this.timeScale;
    this.frameDt = scaled;
    this._acc += scaled;

    let steps = 0;
    while (this._acc >= FIXED_DT && steps < MAX_STEPS) {
      this._acc -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_STEPS) this._acc = 0; // 밀린 시간 버림

    this.alpha = this._acc / FIXED_DT;
    this.frame++;
    return steps;
  }

  /** 고정 스텝 소비 시 호출 */
  step() {
    this.now += FIXED_DT;
  }
}
