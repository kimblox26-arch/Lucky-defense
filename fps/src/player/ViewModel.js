// 1인칭 무기 모델. 전부 코드로 생성한 로우폴리 메시이며,
// 벽에 파고들지 않도록 별도의 씬/카메라로 렌더한다(깊이 버퍼 분리).

import {
  Scene, PerspectiveCamera, Group, Mesh, BoxGeometry, CylinderGeometry,
  MeshStandardMaterial, DirectionalLight, HemisphereLight,
  Vector3, Color, PointLight, Box3,
} from 'three';
import { damp, clamp, clamp01, lerp, Spring, rng } from '../core/Util.js';

const MAT = {};
function mat(color, rough = 0.55, metal = 0.75) {
  const key = `${color}|${rough}|${metal}`;
  if (!MAT[key]) {
    MAT[key] = new MeshStandardMaterial({
      color: new Color(color), roughness: rough, metalness: metal,
      envMapIntensity: 1.1,
    });
  }
  return MAT[key];
}

const C = {
  steel: '#3c4046',
  dark: '#212428',
  polymer: '#1b1d1f',
  wood: '#6b4a28',
  brass: '#b08d3c',
  accent: '#8a3a22',
  glass: '#0d1518',
};

function b(parent, x, y, z, w, h, d, color, rough = 0.5, metal = 0.8, rot = null) {
  const m = new Mesh(new BoxGeometry(w, h, d), mat(color, rough, metal));
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  m.castShadow = false; m.receiveShadow = false;
  parent.add(m);
  return m;
}

function cyl(parent, x, y, z, r, len, color, rough = 0.45, metal = 0.85, axis = 'z') {
  const m = new Mesh(new CylinderGeometry(r, r, len, 12, 1), mat(color, rough, metal));
  m.position.set(x, y, z);
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  parent.add(m);
  return m;
}

// ─────────────────────────── 무기 모델 ───────────────────────────

function buildPistol() {
  const g = new Group();
  b(g, 0, 0.014, -0.09, 0.042, 0.05, 0.21, C.steel, 0.38, 0.9);          // 슬라이드
  b(g, 0, 0.014, -0.202, 0.03, 0.032, 0.03, C.dark, 0.4, 0.9);           // 총구
  b(g, 0, -0.021, -0.07, 0.036, 0.03, 0.17, C.polymer, 0.7, 0.2);        // 프레임
  b(g, 0, -0.078, 0.012, 0.038, 0.11, 0.055, C.polymer, 0.78, 0.15, [0.22, 0, 0]); // 그립
  b(g, 0, -0.048, -0.028, 0.03, 0.036, 0.012, C.dark, 0.6, 0.4);         // 트리거 가드
  b(g, 0, 0.041, -0.175, 0.008, 0.012, 0.008, C.dark, 0.4, 0.6);         // 가늠쇠
  b(g, 0, 0.041, 0.0, 0.024, 0.012, 0.01, C.dark, 0.4, 0.6);             // 가늠자
  g.userData.muzzle = new Vector3(0, 0.014, -0.222);
  g.userData.eject = new Vector3(0.03, 0.02, -0.03);
  g.userData.sightY = 0.047;
  return g;
}

function buildSmg() {
  const g = new Group();
  b(g, 0, 0.005, -0.14, 0.046, 0.068, 0.3, C.polymer, 0.66, 0.25);
  b(g, 0, 0.018, -0.315, 0.026, 0.026, 0.11, C.steel, 0.35, 0.9);
  b(g, 0, 0.018, -0.375, 0.032, 0.032, 0.035, C.dark, 0.4, 0.85);
  b(g, 0, -0.085, -0.075, 0.03, 0.115, 0.05, C.dark, 0.7, 0.3, [0.06, 0, 0]);  // 탄창
  b(g, 0, -0.062, 0.02, 0.034, 0.085, 0.05, C.polymer, 0.78, 0.15, [0.18, 0, 0]); // 그립
  b(g, 0, 0.0, 0.075, 0.036, 0.05, 0.09, C.dark, 0.7, 0.3);              // 스톡
  b(g, 0, 0.047, -0.2, 0.016, 0.014, 0.16, C.dark, 0.5, 0.6);            // 상부 레일
  b(g, 0, 0.062, -0.26, 0.008, 0.016, 0.01, C.dark, 0.4, 0.6);
  b(g, 0, 0.062, -0.09, 0.02, 0.016, 0.012, C.dark, 0.4, 0.6);
  g.userData.muzzle = new Vector3(0, 0.018, -0.398);
  g.userData.eject = new Vector3(0.028, 0.02, -0.09);
  g.userData.sightY = 0.07;
  return g;
}

function buildShotgun() {
  const g = new Group();
  b(g, 0, 0.0, -0.2, 0.05, 0.072, 0.4, C.steel, 0.45, 0.85);
  cyl(g, 0, 0.032, -0.5, 0.017, 0.34, C.dark, 0.35, 0.92);               // 총열
  cyl(g, 0, -0.005, -0.47, 0.014, 0.28, C.steel, 0.4, 0.88);             // 튜브 매거진
  b(g, 0, 0.014, -0.4, 0.048, 0.05, 0.13, C.wood, 0.85, 0.05);           // 펌프
  b(g, 0, -0.055, 0.035, 0.036, 0.09, 0.06, C.wood, 0.85, 0.05, [0.28, 0, 0]);
  b(g, 0, -0.012, 0.13, 0.04, 0.06, 0.16, C.wood, 0.85, 0.05, [0.06, 0, 0]);  // 개머리판
  b(g, 0, 0.06, -0.66, 0.008, 0.016, 0.01, C.brass, 0.3, 0.9);           // 가늠쇠
  b(g, 0, 0.058, -0.69, 0.05, 0.006, 0.04, C.dark, 0.5, 0.7);            // 총구 초크
  g.userData.muzzle = new Vector3(0, 0.032, -0.678);
  g.userData.eject = new Vector3(0.03, 0.0, -0.16);
  g.userData.sightY = 0.068;
  return g;
}

function buildRifle() {
  const g = new Group();
  b(g, 0, 0.0, -0.2, 0.046, 0.075, 0.38, C.steel, 0.5, 0.82);
  b(g, 0, 0.012, -0.42, 0.04, 0.046, 0.16, C.wood, 0.82, 0.05);          // 핸드가드
  cyl(g, 0, 0.02, -0.56, 0.011, 0.2, C.dark, 0.35, 0.92);
  b(g, 0, 0.02, -0.665, 0.03, 0.03, 0.05, C.dark, 0.4, 0.88);            // 소염기
  b(g, 0, -0.105, -0.13, 0.032, 0.15, 0.06, C.dark, 0.65, 0.35, [0.34, 0, 0]); // 바나나 탄창
  b(g, 0, -0.06, 0.01, 0.032, 0.09, 0.05, C.polymer, 0.8, 0.12, [0.2, 0, 0]);
  b(g, 0, -0.012, 0.13, 0.042, 0.062, 0.19, C.wood, 0.82, 0.05, [0.04, 0, 0]);
  b(g, 0, 0.052, -0.585, 0.01, 0.028, 0.012, C.dark, 0.45, 0.7);         // 가늠쇠
  b(g, 0, 0.05, -0.3, 0.026, 0.016, 0.03, C.dark, 0.45, 0.7);            // 가늠자
  b(g, 0, 0.032, -0.09, 0.05, 0.022, 0.11, C.steel, 0.4, 0.88);          // 노리쇠 커버
  g.userData.muzzle = new Vector3(0, 0.02, -0.694);
  g.userData.eject = new Vector3(0.032, 0.02, -0.09);
  g.userData.sightY = 0.062;
  return g;
}

function buildSniper() {
  const g = new Group();
  b(g, 0, 0.0, -0.24, 0.052, 0.08, 0.46, C.dark, 0.55, 0.75);
  cyl(g, 0, 0.018, -0.66, 0.014, 0.44, C.steel, 0.32, 0.92);
  b(g, 0, 0.018, -0.9, 0.052, 0.038, 0.09, C.dark, 0.4, 0.88);           // 총구 제동기
  b(g, 0.032, 0.018, -0.9, 0.012, 0.03, 0.07, C.dark, 0.4, 0.88);
  b(g, -0.032, 0.018, -0.9, 0.012, 0.03, 0.07, C.dark, 0.4, 0.88);
  // 조준경
  cyl(g, 0, 0.082, -0.29, 0.026, 0.3, C.dark, 0.3, 0.85);
  cyl(g, 0, 0.082, -0.45, 0.034, 0.06, C.dark, 0.3, 0.85);
  const lens = cyl(g, 0, 0.082, -0.482, 0.03, 0.006, C.glass, 0.08, 0.2);
  lens.material = new MeshStandardMaterial({
    color: new Color(0x0a1a22), roughness: 0.06, metalness: 0.4,
    emissive: new Color(0x14323e), emissiveIntensity: 0.6, envMapIntensity: 2.4,
  });
  b(g, 0, 0.052, -0.24, 0.02, 0.04, 0.03, C.dark, 0.5, 0.7);
  b(g, 0, 0.052, -0.4, 0.02, 0.04, 0.03, C.dark, 0.5, 0.7);
  b(g, 0, -0.096, -0.13, 0.03, 0.12, 0.055, C.dark, 0.65, 0.35);          // 탄창
  b(g, 0, -0.062, 0.005, 0.034, 0.095, 0.05, C.polymer, 0.8, 0.12, [0.2, 0, 0]);
  b(g, 0, -0.018, 0.14, 0.044, 0.075, 0.22, C.polymer, 0.8, 0.12, [0.03, 0, 0]);
  b(g, 0, -0.06, 0.2, 0.036, 0.05, 0.09, C.polymer, 0.8, 0.12);          // 치크 라이저
  g.userData.muzzle = new Vector3(0, 0.018, -0.95);
  g.userData.eject = new Vector3(0.034, 0.02, -0.1);
  g.userData.sightY = 0.082;
  g.userData.scoped = true;
  return g;
}

const BUILDERS = {
  pistol: buildPistol, smg: buildSmg, shotgun: buildShotgun,
  rifle: buildRifle, sniper: buildSniper,
};

// 장갑 낀 손 + 팔뚝. 무기를 쥔 것처럼 보이게 하는 스타일라이즈드 로우폴리.
const GLOVE = '#2a2c30';
const SKIN = '#c98d63';
function buildHand(side = 1) {
  const g = new Group();
  // 손등
  b(g, 0, 0, 0, 0.058, 0.03, 0.075, GLOVE, 0.9, 0.04);
  // 손가락 4개 — 아래로 말아 총을 감싼다
  for (let i = 0; i < 4; i++) {
    b(g, -0.02 + i * 0.013, -0.026, -0.03, 0.011, 0.03, 0.02, GLOVE, 0.9, 0.04);
  }
  // 엄지
  b(g, side * 0.032, -0.006, 0.0, 0.014, 0.018, 0.032, GLOVE, 0.9, 0.04, [0, 0, side * -0.5]);
  // 손목 + 팔뚝 (카메라 쪽으로)
  b(g, 0, 0.004, 0.06, 0.05, 0.036, 0.06, GLOVE, 0.9, 0.04);
  b(g, 0, 0.006, 0.14, 0.056, 0.05, 0.12, SKIN, 0.85, 0.02);
  b(g, 0, 0.006, 0.24, 0.062, 0.058, 0.1, GLOVE, 0.85, 0.05);   // 소매
  return g;
}

// 무기별 포즈. z는 "모델의 가장 뒤쪽 면"이 카메라에서 얼마나 떨어지는지를 뜻한다
// (모델은 생성 후 뒷면이 z=0에 오도록 자동 정렬된다).
// rotation.x가 양수면 총구가 위를 향한다(반동 방향). 기본 자세는 살짝 아래로.
// rotation.y가 양수면 총구가 화면 중앙 쪽(왼쪽)으로 모인다.
const POSE = {
  pistol: { hip: [0.115, -0.118, -0.30], hipRot: [-0.030, 0.050, 0], adsZ: -0.26 },
  smg: { hip: [0.135, -0.132, -0.38], hipRot: [-0.035, 0.040, 0], adsZ: -0.34 },
  shotgun: { hip: [0.148, -0.142, -0.45], hipRot: [-0.040, 0.034, 0], adsZ: -0.41 },
  rifle: { hip: [0.145, -0.138, -0.45], hipRot: [-0.038, 0.034, 0], adsZ: -0.41 },
  sniper: { hip: [0.152, -0.150, -0.48], hipRot: [-0.035, 0.030, 0], adsZ: -0.46 },
};

/**
 * 모델의 가장 뒤쪽(+Z) 면이 로컬 원점에 오도록 자식들을 이동시킨다.
 * 이렇게 하면 무기 길이와 무관하게 포즈의 z가 "카메라와의 거리"로 일관되게 읽힌다.
 */
function alignToRear(group) {
  const bbox = new Box3().setFromObject(group);
  const dz = -bbox.max.z;
  for (const c of group.children) c.position.z += dz;
  for (const key of ['muzzle', 'eject']) {
    if (group.userData[key]) group.userData[key].z += dz;
  }
  group.userData.length = bbox.max.z - bbox.min.z;
  return group;
}

export class ViewModel {
  constructor(engine, weapons) {
    this.engine = engine;
    this.weapons = weapons;

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(58, 1, 0.008, 8);

    const key = new DirectionalLight(0xfff0dc, 2.6);
    key.position.set(-0.5, 0.9, 0.6);
    const rim = new DirectionalLight(0x8fb4e0, 1.1);
    rim.position.set(0.8, 0.2, -0.9);
    this.scene.add(key, rim, new HemisphereLight(0x9fb6d4, 0x30281e, 0.7));

    // 발사 시 켜지는 총구 조명 — 무기와 손을 순간적으로 밝힌다
    this.muzzleLight = new PointLight(0xffb45a, 0, 2.6, 2);
    this.scene.add(this.muzzleLight);
    this.muzzleLightT = 0;

    this.root = new Group();
    this.scene.add(this.root);

    this.models = {};
    for (const [id, build] of Object.entries(BUILDERS)) {
      const g = alignToRear(build());
      g.visible = false;
      this.root.add(g);
      this.models[id] = g;
    }
    this.current = null;

    // 무기를 쥔 양손 — root에 붙어 무기 포즈를 따라간다
    this.handR = buildHand(1);
    this.handL = buildHand(-1);
    this.root.add(this.handR, this.handL);
    this._gripR = new Vector3();
    this._gripL = new Vector3();

    // 애니메이션 상태
    this.swayX = 0; this.swayY = 0;
    this.bobPhase = 0; this.bobAmt = 0;
    this.sprintT = 0;
    this.switchT = 0;
    this.reloadT = 0;
    this.kickZ = new Spring(210, 19);
    this.kickPitch = new Spring(190, 17);
    this.kickRoll = new Spring(160, 15);

    this._muzzleWorld = new Vector3();
    this._tmp = new Vector3();

    this.setWeapon(weapons.cur);
  }

  syncEnv() {
    this.scene.environment = this.engine.scene.environment;
    this.scene.environmentIntensity = 0.9;
  }

  setWeapon(w) {
    const id = w.def.id;
    if (this.current) this.current.visible = false;
    this.current = this.models[id];
    if (this.current) this.current.visible = true;
    this.pose = POSE[id] || POSE.rifle;
    this.scoped = !!this.current?.userData.scoped;
    // 무기 길이에 맞춰 양손 그립 위치 산출
    const len = this.current?.userData.length || 0.4;
    this._gripR.set(0.012, -0.062, -Math.min(0.12, len * 0.18));
    this._gripL.set(-0.006, -0.056, -Math.min(0.52, len * 0.56));
    this.handR.position.copy(this._gripR);
    this.handR.rotation.set(0.24, 0.08, 0.1);
    this.handL.rotation.set(0.34, -0.1, -0.12);
  }

  /** 발사 반동 애니메이션 */
  fireKick(def) {
    const p = clamp(def.recoilPitch * 9, 0.25, 2.6);
    this.kickZ.kick(p * 1.5);
    this.kickPitch.kick(p * 0.95);
    this.kickRoll.kick(rng.range(-1, 1) * p * 0.45);
    this.muzzleLightT = 0.055;
  }

  reload(duration) { this.reloadT = 0; this.reloadDur = duration; }
  switchAnim() { this.switchT = 0.42; }

  update(dt, player, rig, weapons) {
    const ads = weapons.ads;
    const pose = this.pose;

    // ── 스프링 감쇠 ──
    this.kickZ.update(dt);
    this.kickPitch.update(dt);
    this.kickRoll.update(dt);

    // ── 스웨이: 카메라 회전을 뒤따라간다 ──
    const swayMul = 0.013 * (1 - ads * 0.7);
    const targetSwayX = clamp(-rig.deltaYaw * swayMul, -0.05, 0.05);
    const targetSwayY = clamp(rig.deltaPitch * swayMul, -0.045, 0.045);
    this.swayX = damp(this.swayX, targetSwayX, 11, dt);
    this.swayY = damp(this.swayY, targetSwayY, 11, dt);

    // ── 보브 ──
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    const moving = player.grounded && speed > 0.6;
    this.bobAmt = damp(this.bobAmt, moving ? clamp01(speed / 7.5) : 0, 8, dt);
    if (moving) this.bobPhase += dt * (5.4 + speed * 0.62);
    const bobX = Math.cos(this.bobPhase) * 0.016 * this.bobAmt * (1 - ads * 0.85);
    const bobY = Math.sin(this.bobPhase * 2) * 0.011 * this.bobAmt * (1 - ads * 0.85);

    // ── 스프린트 포즈 ──
    this.sprintT = damp(this.sprintT, player.sprinting ? 1 : 0, 9, dt);

    // ── 전환 / 재장전 ──
    if (this.switchT > 0) this.switchT = Math.max(0, this.switchT - dt);
    const switchDip = this.switchT > 0
      ? Math.sin(clamp01(this.switchT / 0.42) * Math.PI) : 0;

    let reloadDip = 0, reloadRoll = 0, reloadPitch = 0;
    if (weapons.isReloading) {
      const t = clamp01(weapons.reloadT / weapons.reloadDur);
      // 아래로 내렸다가 탄창 교체 후 복귀
      reloadDip = Math.sin(t * Math.PI) * 0.085;
      reloadRoll = Math.sin(t * Math.PI) * 0.55;
      reloadPitch = Math.sin(t * Math.PI) * 0.42;
      // 탄창 삽입 순간의 덜컹거림
      if (t > 0.58 && t < 0.66) reloadDip += 0.012 * Math.sin((t - 0.58) * 78);
    }

    // ── 최종 포즈 합성 ──
    // 초고연사에서 스프링이 누적돼 모델이 화면 밖으로 튀는 것을 막는다
    const kz = clamp(this.kickZ.value, -1.4, 1.4);
    const kp = clamp(this.kickPitch.value, -1.4, 1.4);
    const kr = clamp(this.kickRoll.value, -1.4, 1.4);
    const adsY = -(this.current?.userData.sightY ?? 0.05);
    const px = lerp(pose.hip[0] + bobX + this.swayX, 0, ads) - switchDip * 0.05;
    const py = lerp(pose.hip[1] + bobY + this.swayY, adsY, ads)
      - switchDip * 0.14 - reloadDip
      - this.sprintT * 0.05;
    const pz = lerp(pose.hip[2], pose.adsZ, ads) + kz * 0.045;

    this.root.position.set(px, py, pz);

    const rx = lerp(pose.hipRot[0], 0, ads) + kp * 0.045
      - reloadPitch - this.sprintT * 0.30 - switchDip * 0.55;
    const ry = lerp(pose.hipRot[1], 0, ads) + this.sprintT * 0.40 + reloadRoll * 0.3;
    const rz = kr * 0.05 + reloadRoll * 0.5
      + this.sprintT * 0.34 - this.swayX * 1.6;
    this.root.rotation.set(rx, ry, rz);

    // ── 지지 손(왼손) 재장전 동작: 탄창을 빼러 내려갔다가 삽입하며 복귀 ──
    let magY = 0, magZ = 0;
    if (weapons.isReloading) {
      const t = clamp01(weapons.reloadT / weapons.reloadDur);
      const phase = t < 0.5
        ? Math.sin(clamp01(t / 0.5) * Math.PI * 0.5)          // 0→1: 탄창 분리
        : 1 - Math.sin(clamp01((t - 0.5) / 0.5) * Math.PI * 0.5); // 1→0: 삽입
      magY = -0.11 * phase;
      magZ = 0.06 * phase;
    }
    this.handL.position.set(this._gripL.x, this._gripL.y + magY, this._gripL.z + magZ);

    // 스코프 사용 시 완전 조준 상태에서는 무기를 숨기고 스코프 오버레이로 대체
    if (this.scoped) this.root.visible = ads < 0.92;
    else this.root.visible = true;

    // ── 총구 조명 ──
    if (this.muzzleLightT > 0) {
      this.muzzleLightT -= dt;
      const k = clamp01(this.muzzleLightT / 0.055);
      this.muzzleLight.intensity = 9 * k;
      const m = this.muzzleLocal();
      this.muzzleLight.position.set(m.x, m.y, m.z + 0.05);
    } else if (this.muzzleLight.intensity !== 0) {
      this.muzzleLight.intensity = 0;
    }

    this.camera.fov = lerp(58, 48, ads);
    this.camera.updateProjectionMatrix();
  }

  /** 뷰 공간에서의 총구 위치 */
  muzzleLocal() {
    const m = this.current?.userData.muzzle;
    if (!m) return this._tmp.set(0, 0, -0.3);
    return this._tmp.copy(m).applyEuler(this.root.rotation).add(this.root.position);
  }

  /** 월드 공간 총구 위치 — 이펙트 스폰용 */
  muzzleWorld(mainCamera, out = this._muzzleWorld) {
    const local = this.muzzleLocal();
    // 뷰 카메라 FOV 차이를 보정해 화면상 위치가 맞아 보이게 한다
    out.set(local.x * 1.15, local.y * 1.15, local.z * 1.0);
    return out.applyMatrix4(mainCamera.matrixWorld);
  }

  ejectWorld(mainCamera, out = new Vector3()) {
    const e = this.current?.userData.eject;
    if (!e) return out.set(0, 0, 0);
    out.copy(e).applyEuler(this.root.rotation).add(this.root.position);
    out.set(out.x * 1.15, out.y * 1.15, out.z);
    return out.applyMatrix4(mainCamera.matrixWorld);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setVisible(v) { this.root.visible = v; }
}
