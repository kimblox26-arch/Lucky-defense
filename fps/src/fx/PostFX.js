// 포스트 프로세싱 체인.
// 월드 → 뷰모델(깊이 분리) → 블룸 → 합성(비네트/그레인/색수차/그레이딩) → SMAA → 출력

import { Vector2, ShaderMaterial, Color } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { settings } from '../core/Settings.js';
import { clamp01, damp } from '../core/Util.js';

const CompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uVignette: { value: 0.42 },
    uGrain: { value: 0.016 },
    uAberration: { value: 0.0016 },
    uDamage: { value: 0 },
    uHurt: { value: 0 },
    uScope: { value: 0 },
    uSaturation: { value: 1.08 },
    uContrast: { value: 1.05 },
    uLift: { value: new Color(0.006, 0.004, 0.012) },
    uTint: { value: new Color(1.015, 1.0, 0.972) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uDamage;
    uniform float uHurt;
    uniform float uScope;
    uniform float uSaturation;
    uniform float uContrast;
    uniform vec3 uLift;
    uniform vec3 uTint;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(443.897, 441.423));
      p += dot(p, p.yx + 19.19);
      return fract((p.x + p.y) * p.x);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // 색수차 — 화면 가장자리로 갈수록, 피격 시 강해진다
      float ab = uAberration * (1.0 + uHurt * 7.0);
      vec3 col;
      if (ab > 0.00002) {
        vec2 off = c * ab * (0.35 + r2 * 2.4);
        col.r = texture2D(tDiffuse, uv + off).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - off).b;
      } else {
        col = texture2D(tDiffuse, uv).rgb;
      }

      // 컬러 그레이딩: 리프트 → 대비 → 채도 → 틴트
      col += uLift;
      col = (col - 0.5) * uContrast + 0.5;
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(lum), col, uSaturation);
      col *= uTint;

      // 체력이 낮을수록 탈색 + 붉은 기운
      if (uDamage > 0.001) {
        col = mix(col, vec3(lum), uDamage * 0.55);
        col.r += uDamage * 0.06;
        col.gb *= (1.0 - uDamage * 0.12);
      }

      // 피격 순간의 붉은 섬광
      col = mix(col, vec3(0.62, 0.03, 0.02), uHurt * 0.42);

      // 비네트
      float vig = 1.0 - uVignette * smoothstep(0.12, 0.82, r2 * 2.0);
      col *= vig;

      // 스코프 비네트 (저격 조준)
      if (uScope > 0.001) {
        float d = length(vec2(c.x * (uResolution.x / uResolution.y), c.y));
        float ring = smoothstep(0.30, 0.42, d);
        col *= mix(1.0, 1.0 - ring, uScope);
        // 조준경 가장자리 색수차
        col.b += (1.0 - smoothstep(0.26, 0.32, d)) * uScope * 0.015;
      }

      // 필름 그레인 (어두운 부분에 더 강하게 — 실제 필름의 거동)
      if (uGrain > 0.001) {
        float n = hash(gl_FragCoord.xy + fract(uTime) * 512.0) - 0.5;
        col += n * uGrain * (1.25 - lum * 0.7);
      }

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

export class PostFX {
  constructor(engine, viewModel) {
    this.engine = engine;
    this.viewModel = viewModel;
    const { renderer, scene, camera } = engine;

    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(1);   // 이미 renderer.setPixelRatio로 스케일 적용됨

    this.worldPass = new RenderPass(scene, camera);
    this.composer.addPass(this.worldPass);

    if (viewModel) {
      this.viewPass = new RenderPass(viewModel.scene, viewModel.camera);
      this.viewPass.clear = false;
      this.viewPass.clearDepth = true;
      this.composer.addPass(this.viewPass);
    }

    // 블룸은 톤매핑 전 HDR 선형 값에서 계산해야 한다
    this.bloom = new UnrealBloomPass(new Vector2(1, 1), 0.52, 0.62, 0.86);
    this.composer.addPass(this.bloom);

    // OutputPass가 톤매핑 + sRGB 변환을 수행한다.
    // 그레인/비네트/대비는 표시 공간에서 계산해야 의도한 세기가 나오므로
    // 반드시 이 뒤에 온다.
    this.output = new OutputPass();
    this.composer.addPass(this.output);

    this.composite = new ShaderPass(new ShaderMaterial({
      uniforms: cloneUniforms(CompositeShader.uniforms),
      vertexShader: CompositeShader.vertexShader,
      fragmentShader: CompositeShader.fragmentShader,
    }), 'tDiffuse');
    this.composer.addPass(this.composite);
    this.u = this.composite.uniforms;

    // SMAA는 톤매핑된 LDR 영상에서 동작하도록 설계되어 있다
    this.smaa = new SMAAPass();
    this.composer.addPass(this.smaa);

    this.hurt = 0;
    this.damage = 0;
    this.scope = 0;
    this._time = 0;

    this.applyQuality(engine.quality);
    engine.postfx = this;
  }

  applyQuality(q) {
    this.bloom.enabled = q.bloom && settings.bloom;
    this.smaa.enabled = q.smaa;
    this.u.uGrain.value = settings.grain ? 0.016 : 0;
    this.u.uAberration.value = q.bloom ? 0.0016 : 0;
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.u.uResolution.value.set(w, h);
    this.viewModel?.resize(w / h);
  }

  /** 피격 순간 붉은 섬광 */
  flashHurt(amount = 1) {
    this.hurt = Math.min(1, this.hurt + amount);
  }

  update(dt, playerHealthRatio, adsScope) {
    this._time += dt;
    this.u.uTime.value = this._time;
    this.hurt = Math.max(0, this.hurt - dt * 2.6);
    this.u.uHurt.value = this.hurt;

    // 체력이 35% 아래로 떨어지면 화면이 탈색된다
    const target = clamp01((0.38 - playerHealthRatio) / 0.38);
    this.damage = damp(this.damage, target, 4, dt);
    this.u.uDamage.value = this.damage;

    this.scope = damp(this.scope, adsScope, 14, dt);
    this.u.uScope.value = this.scope;

    // 저체력에서 비네트가 조여든다
    this.u.uVignette.value = 0.42 + this.damage * 0.3;
  }

  render() {
    this.composer.render();
  }

  dispose() {
    this.composer.dispose?.();
  }
}

/** 유니폼 객체를 얕게 복제 (Vector/Color 인스턴스는 새로 생성) */
function cloneUniforms(src) {
  const out = {};
  for (const [k, v] of Object.entries(src)) {
    const val = v.value;
    if (val && val.isVector2) out[k] = { value: val.clone() };
    else if (val && val.isColor) out[k] = { value: val.clone() };
    else out[k] = { value: val };
  }
  return out;
}
