// 태양(그림자) + 반구 앰비언트. 그림자 절두체를 플레이어 주변에 붙여
// 낮은 해상도로도 선명한 그림자를 얻는다.

import { DirectionalLight, HemisphereLight, Color, Vector3 } from 'three';

const _warm = new Color();
const _cold = new Color();

export class Lighting {
  constructor(engine) {
    this.engine = engine;
    const scene = engine.scene;

    this.sun = new DirectionalLight(0xfff2dc, 3.4);
    this.sun.position.copy(engine.sunDir).multiplyScalar(60);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.045;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 200;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new HemisphereLight(0xbcd7f0, 0x6a5f4a, 1.28);
    scene.add(this.hemi);

    // 맵이 시간대/색조를 덮어쓸 수 있는 기준 팔레트 (기본: 청명한 대낮)
    this.palette = {
      zenith: 0x3b78c4, horizon: 0xd3e0e8, ground: 0x76705c,
      sun: 0xfff3d8, sunColor: 0xfff2dc, sunI: 3.4, hemiSky: 0xbcd7f0,
      hemiGround: 0x6a5f4a, hemiI: 1.28, haze: 0.72, fog: 0xaec3d4, fogD: 0.0072,
      // 무드(t=1, 후반 웨이브)에서 향하는 목표 — 황혼 골든아워
      moodHorizon: 0xe6a85a, moodZenith: 0x2c548a, moodHaze: 1.3, moodFog: 0xc7a878,
    };

    this._center = new Vector3();
    this.applyQuality(engine.quality);
    engine.onQualityChange = (q) => this.applyQuality(q);
  }

  /** 맵별 하늘·조명 색조 적용 (Arena.build 이후 1회) */
  applyMapPalette(p) {
    Object.assign(this.palette, p);
    const e = this.engine;
    const P = this.palette;
    e.skyUniforms.uZenith.value.set(P.zenith).convertSRGBToLinear();
    e.skyUniforms.uHorizon.value.set(P.horizon).convertSRGBToLinear();
    e.skyUniforms.uGround.value.set(P.ground).convertSRGBToLinear();
    e.skyUniforms.uSunColor.value.set(P.sun).convertSRGBToLinear();
    e.skyUniforms.uHaze.value = P.haze;
    e.fogColor.set(P.fog);
    e.scene.fog.color.set(P.fog);
    e.scene.fog.density = P.fogD;
    e.scene.background.set(P.zenith);
    this.sun.color.set(P.sunColor);
    this.sun.intensity = P.sunI;
    this.hemi.color.set(P.hemiSky);
    this.hemi.groundColor.set(P.hemiGround);
    this.hemi.intensity = P.hemiI;
    this._lastBake = undefined;
    e.bakeEnvironment();
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

  /** 웨이브 진행에 따라 대낮 → 황혼 골든아워로 (야간까지 가지 않음) */
  setMood(t) {
    const e = this.engine;
    const P = this.palette;
    _warm.set(P.horizon); _cold.set(P.moodHorizon);
    e.skyUniforms.uHorizon.value.copy(_warm).lerp(_cold, t).convertSRGBToLinear();
    _warm.set(P.zenith); _cold.set(P.moodZenith);
    e.skyUniforms.uZenith.value.copy(_warm).lerp(_cold, t).convertSRGBToLinear();
    e.skyUniforms.uHaze.value = P.haze + (P.moodHaze - P.haze) * t;
    this.sun.intensity = P.sunI * (1 - t * 0.22);
    this.hemi.intensity = P.hemiI * (1 - t * 0.24);
    _warm.set(P.fog); _cold.set(P.moodFog);
    e.fogColor.copy(_warm).lerp(_cold, t);
    e.scene.fog.color.copy(e.fogColor);
    e.scene.fog.density = P.fogD + t * 0.004;

    // 환경맵은 한 번 구운 결과라 하늘이 크게 바뀌면 다시 굽는다 (웨이브당 최대 1회 수준)
    if (this._lastBake === undefined || Math.abs(t - this._lastBake) > 0.22) {
      this._lastBake = t;
      e.bakeEnvironment();
    }
  }
}
