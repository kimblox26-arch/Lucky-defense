// 태양(그림자) + 반구 앰비언트. 그림자 절두체를 플레이어 주변에 붙여
// 낮은 해상도로도 선명한 그림자를 얻는다.

import { DirectionalLight, HemisphereLight, Color, Vector3 } from 'three';

const _warm = new Color();
const _cold = new Color();

export class Lighting {
  constructor(engine) {
    this.engine = engine;
    const scene = engine.scene;

    this.sun = new DirectionalLight(0xffd9b4, 3.1);
    this.sun.position.copy(engine.sunDir).multiplyScalar(60);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.045;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 160;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new HemisphereLight(0x93b0d4, 0x54402c, 1.05);
    scene.add(this.hemi);

    this._center = new Vector3();
    this.applyQuality(engine.quality);
    engine.onQualityChange = (q) => this.applyQuality(q);
  }

  applyQuality(q) {
    const s = this.sun.shadow;
    s.mapSize.set(q.shadowSize, q.shadowSize);
    if (s.map) { s.map.dispose(); s.map = null; }
    const d = q.shadowDistance;
    s.camera.left = -d; s.camera.right = d;
    s.camera.top = d; s.camera.bottom = -d;
    s.camera.updateProjectionMatrix();
    this.sun.castShadow = q.shadowsOn;
    this.shadowDistance = d;
  }

  /** 그림자 볼륨을 플레이어 앞쪽으로 이동 — 보이는 영역에 해상도를 집중 */
  update(playerPos, forward) {
    const d = this.shadowDistance;
    this._center.copy(playerPos).addScaledVector(forward, d * 0.32);
    // 텍셀 스냅 — 카메라 이동 시 그림자 가장자리가 지글거리는 것을 방지
    const texel = (d * 2) / this.engine.quality.shadowSize;
    this._center.x = Math.round(this._center.x / texel) * texel;
    this._center.z = Math.round(this._center.z / texel) * texel;
    this.sun.target.position.copy(this._center);
    this.sun.position.copy(this._center).addScaledVector(this.engine.sunDir, 70);
    this.sun.target.updateMatrixWorld();
  }

  /** 웨이브 진행에 따라 하늘을 어둡게 — 긴장감 상승 */
  setMood(t) {
    const e = this.engine;
    _warm.set(0xc9793a); _cold.set(0x6e2f30);
    e.skyUniforms.uHorizon.value.copy(_warm).lerp(_cold, t).convertSRGBToLinear();
    _warm.set(0x4c7ba6); _cold.set(0x1c2438);
    e.skyUniforms.uZenith.value.copy(_warm).lerp(_cold, t).convertSRGBToLinear();
    e.skyUniforms.uHaze.value = 1 + t * 0.6;
    this.sun.intensity = 3.1 * (1 - t * 0.5);
    this.hemi.intensity = 1.05 * (1 - t * 0.4);
    e.scene.fog.density = 0.0135 + t * 0.011;

    // 환경맵은 한 번 구운 결과라 하늘이 크게 바뀌면 다시 굽는다 (웨이브당 최대 1회 수준)
    if (this._lastBake === undefined || Math.abs(t - this._lastBake) > 0.22) {
      this._lastBake = t;
      e.bakeEnvironment();
    }
  }
}
