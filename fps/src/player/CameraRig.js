// 카메라의 모든 "느낌"을 담당한다: 시야 회전, 헤드밥, 반동, 흔들림,
// FOV 킥, 착지 딥, 피격 틸트. 게임 로직은 여기에 임펄스만 던진다.

import { Vector3, Euler } from 'three';
import { clamp, damp, Spring, Spring2, deg } from '../core/Util.js';
import { settings } from '../core/Settings.js';

const PITCH_LIMIT = Math.PI / 2 - 0.015;

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0;

    // 반동: 카메라 각도에 더해지는 스프링. 사격이 멈추면 원위치로 복귀.
    this.recoil = new Spring2(190, 21);
    this.recoilRecover = new Spring2(48, 12);   // 느리게 되돌아오는 성분

    this.bobPhase = 0;
    this.bobAmount = 0;
    this.landDip = new Spring(150, 15);
    this.roll = 0;
    this.trauma = 0;
    this.damageTilt = new Spring2(90, 11);

    this.fov = settings.fov;
    this.targetFov = settings.fov;
    this.fovKick = new Spring(120, 16);

    this.forward = new Vector3(0, 0, -1);
    this.right = new Vector3(1, 0, 0);
    this.flatForward = new Vector3(0, 0, -1);
    this._euler = new Euler(0, 0, 0, 'YXZ');
    this._shakeSeed = Math.random() * 100;
  }

  look(dx, dy) {
    this.yaw -= dx;
    this.pitch -= dy;
    this.pitch = clamp(this.pitch, -PITCH_LIMIT, PITCH_LIMIT);
  }

  /** 사격 반동. pitchKick은 위로(+), yawKick은 좌우. */
  addRecoil(pitchKick, yawKick, recoverRatio = 0.55) {
    this.recoil.kick(pitchKick * (1 - recoverRatio), yawKick * (1 - recoverRatio));
    this.recoilRecover.kick(pitchKick * recoverRatio, yawKick * recoverRatio);
  }

  /** 폭발/피격 등 화면 흔들림. 0~1 누적. */
  addTrauma(amount) {
    this.trauma = clamp(this.trauma + amount * settings.shake, 0, 1);
  }

  /** 피격 방향에 따라 카메라를 밀어낸다. angle은 플레이어 기준 방위각. */
  addDamageKick(angle, power) {
    this.damageTilt.kick(Math.cos(angle) * power, Math.sin(angle) * power);
  }

  land(impact) {
    this.landDip.kick(-impact);
    this.addTrauma(clamp(impact * 0.22, 0, 0.35));
  }

  setFov(target) { this.targetFov = target; }
  kickFov(amount) { this.fovKick.kick(amount); }

  update(dt, player, time) {
    // ── 반동 감쇠 ──
    this.recoil.update(dt);
    this.recoilRecover.update(dt);
    this.recoilRecover.x.target = 0;
    this.recoilRecover.y.target = 0;
    this.damageTilt.update(dt);
    this.landDip.update(dt);

    // ── 헤드밥 ──
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    const moving = player.grounded && speed > 0.6;
    const targetBob = moving ? clamp(speed / 7.5, 0, 1) : 0;
    this.bobAmount = damp(this.bobAmount, targetBob, 9, dt);
    if (moving) this.bobPhase += dt * (5.4 + speed * 0.62);
    const bobY = Math.sin(this.bobPhase * 2) * 0.034 * this.bobAmount;
    const bobX = Math.cos(this.bobPhase) * 0.026 * this.bobAmount;
    const bobRoll = Math.cos(this.bobPhase) * deg(0.42) * this.bobAmount;

    // ── 스트레이프 린 ──
    const lean = clamp(-player.strafeInput, -1, 1) * deg(1.35);
    this.roll = damp(this.roll, lean, 8, dt);

    // ── 흔들림 ──
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const sh = this.trauma * this.trauma;
    const t = time * 34 + this._shakeSeed;
    const shakeP = (Math.sin(t * 1.13) + Math.sin(t * 2.71) * 0.5) * deg(1.9) * sh;
    const shakeY = (Math.sin(t * 0.91 + 2.1) + Math.sin(t * 3.17) * 0.5) * deg(2.2) * sh;
    const shakeR = Math.sin(t * 1.47 + 1.3) * deg(1.5) * sh;

    // ── FOV ──
    this.fovKick.update(dt);
    this.fov = damp(this.fov, this.targetFov, 11, dt) ;
    this.camera.fov = clamp(this.fov + this.fovKick.value, 30, 130);
    this.camera.updateProjectionMatrix();

    // ── 최종 합성 ──
    const totalPitch = this.pitch
      + this.recoil.valueX + this.recoilRecover.valueX
      + shakeP + this.damageTilt.valueX * 0.6 + this.landDip.value * 0.5;
    const totalYaw = this.yaw
      + this.recoil.valueY + this.recoilRecover.valueY
      + shakeY + this.damageTilt.valueY * 0.6;

    this._euler.set(
      clamp(totalPitch, -PITCH_LIMIT - 0.2, PITCH_LIMIT + 0.2),
      totalYaw,
      this.roll + bobRoll + shakeR,
    );
    this.camera.quaternion.setFromEuler(this._euler);

    const eye = player.eyeY + bobY + this.landDip.value * 0.12;
    this.camera.position.set(
      player.position.x + bobX * Math.cos(this.yaw),
      player.position.y + eye,
      player.position.z - bobX * Math.sin(this.yaw),
    );

    // 조준 방향 캐시 (사격/AI에서 재사용)
    this.camera.getWorldDirection(this.forward);
    this.right.set(this.forward.z, 0, -this.forward.x).normalize();
    this.flatForward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  reset(yaw = 0, pitch = 0) {
    this.yaw = yaw; this.pitch = pitch;
    this.recoil.x.set(0); this.recoil.y.set(0);
    this.recoilRecover.x.set(0); this.recoilRecover.y.set(0);
    this.damageTilt.x.set(0); this.damageTilt.y.set(0);
    this.landDip.set(0);
    this.trauma = 0;
    this.bobPhase = 0; this.bobAmount = 0;
    this.roll = 0;
    this.fov = this.targetFov = settings.fov;
    this.fovKick.set(0);
  }
}
