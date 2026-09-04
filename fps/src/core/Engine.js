// 렌더러 / 씬 / 카메라 / 하늘 / 환경맵 / 품질 티어를 소유한다.

import {
  WebGLRenderer, Scene, PerspectiveCamera, FogExp2, Color,
  ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace,
  Mesh, SphereGeometry, ShaderMaterial, BackSide, Vector3,
  PMREMGenerator, HalfFloatType,
} from 'three';
import { settings } from './Settings.js';
import { clamp, Ema } from './Util.js';

export const QUALITY_TIERS = {
  high: {
    shadowSize: 2048, shadowDistance: 48, renderScale: 1.0,
    bloom: true, smaa: true, particleScale: 1.0, maxDecals: 220,
    shadowsOn: true, softShadows: true, anisotropy: 8,
  },
  medium: {
    shadowSize: 1024, shadowDistance: 34, renderScale: 0.85,
    bloom: true, smaa: false, particleScale: 0.65, maxDecals: 140,
    shadowsOn: true, softShadows: false, anisotropy: 4,
  },
  low: {
    shadowSize: 512, shadowDistance: 22, renderScale: 0.68,
    bloom: false, smaa: false, particleScale: 0.35, maxDecals: 70,
    shadowsOn: false, softShadows: false, anisotropy: 1,
  },
};

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

// 종말 이후의 황혼: 지평선 근처 호박색 헤이즈, 천정은 짙은 청록, 낮게 깔린 태양.
const SKY_FRAG = /* glsl */`
  varying vec3 vDir;
  uniform vec3 uSunDir;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uSunColor;
  uniform float uSunSize;
  uniform float uHaze;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;

    // 지평선 → 천정 그라디언트.
    // 지수 감쇠를 써서 지평선의 밝은 색이 하늘 전체로 번지지 않게 한다.
    float t = 1.0 - exp(-max(h, 0.0) * 5.0);
    vec3 sky = mix(uHorizon, uZenith, t);

    // 지면 방향은 흙먼지 색으로
    float g = clamp(-h * 3.2, 0.0, 1.0);
    sky = mix(sky, uGround, g);

    // 태양 + 광범위한 산란 후광
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    float disc = smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.3, sd);
    float glow = pow(sd, 64.0) * 0.5 + pow(sd, 8.0) * 0.16;
    sky += uSunColor * (disc * 6.0 + glow * uHaze);

    // 지평선 헤이즈 밴드
    float band = exp(-abs(h) * 12.0) * uHaze * 0.28;
    sky += uHorizon * band;

    // 밴딩 방지를 위한 미세 디더
    sky += (hash(gl_FragCoord.xy) - 0.5) * 0.006;

    gl_FragColor = vec4(max(sky, 0.0), 1.0);
  }
`;

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,          // SMAA 패스로 대체
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.info.autoReset = false;

    this.maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    this.scene = new Scene();
    this.scene.background = new Color(0x0a0d10);
    this.fogColor = new Color(0x453224);
    this.scene.fog = new FogExp2(this.fogColor.getHex(), 0.0135);

    this.camera = new PerspectiveCamera(settings.fov, 1, 0.06, 500);
    this.camera.rotation.order = 'YXZ';

    this.sunDir = new Vector3(-0.46, 0.47, -0.75).normalize();

    this._buildSky();

    this.tier = 'high';
    this.quality = { ...QUALITY_TIERS.high };
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = 1; this.height = 1;

    this.frameMs = new Ema(0.06, 16.7);
    this._autoTimer = 0;
    this._autoCooldown = 0;

    this.postfx = null;   // PostFX가 나중에 주입
    this.onResize = null; // (w,h) 콜백

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
      this.onContextLost?.();
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      this.onContextRestored?.();
    });
  }

  _buildSky() {
    this.skyUniforms = {
      uSunDir: { value: this.sunDir.clone() },
      uZenith: { value: new Color(0x4c7ba6).convertSRGBToLinear() },
      uHorizon: { value: new Color(0xc9793a).convertSRGBToLinear() },
      uGround: { value: new Color(0x3a2a1c).convertSRGBToLinear() },
      uSunColor: { value: new Color(0xffd6a0).convertSRGBToLinear() },
      uSunSize: { value: 0.0009 },
      uHaze: { value: 1.0 },
    };
    const mat = new ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: true,
    });
    this.sky = new Mesh(new SphereGeometry(400, 32, 16), mat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1000;
    this.scene.add(this.sky);
  }

  /** 하늘을 PMREM으로 구워 전 머티리얼의 IBL로 사용. 씬 구성 후 1회 호출. */
  bakeEnvironment() {
    const pmrem = new PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const envScene = new Scene();
    const skyClone = this.sky.clone();
    skyClone.material = this.sky.material;   // 유니폼 공유
    envScene.add(skyClone);
    const rt = pmrem.fromScene(envScene, 0, 0.1, 500);
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = 1.15;
    this._envRT?.dispose();
    this._envRT = rt;
    pmrem.dispose();
    envScene.remove(skyClone);
  }

  setQuality(tier) {
    if (tier === 'auto') {
      tier = this._detectTier();
      this._autoEnabled = true;
    } else {
      this._autoEnabled = false;
    }
    if (!QUALITY_TIERS[tier]) tier = 'medium';
    this.tier = tier;
    this.quality = { ...QUALITY_TIERS[tier] };
    this.renderer.shadowMap.enabled = this.quality.shadowsOn;
    this.renderer.shadowMap.needsUpdate = true;
    this.onQualityChange?.(this.quality, tier);
    this.resize();
  }

  _detectTier() {
    const dpr = window.devicePixelRatio || 1;
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    const touch = 'ontouchstart' in window;
    if (touch && (cores <= 6 || mem <= 4)) return 'low';
    if (touch) return 'medium';
    if (cores >= 8 && mem >= 8 && dpr <= 2) return 'high';
    if (cores >= 4) return 'medium';
    return 'low';
  }

  /** 프레임타임을 보고 자동으로 티어를 낮춘다 (자동 모드에서만). */
  updateAdaptive(rawDtMs) {
    this.frameMs.push(rawDtMs);
    if (!this._autoEnabled) return;
    if (this._autoCooldown > 0) { this._autoCooldown -= rawDtMs / 1000; return; }
    const avg = this.frameMs.value;
    if (avg > 26 && this.tier !== 'low') {
      const next = this.tier === 'high' ? 'medium' : 'low';
      this.tier = next;
      this.quality = { ...QUALITY_TIERS[next] };
      this.renderer.shadowMap.enabled = this.quality.shadowsOn;
      this.onQualityChange?.(this.quality, next);
      this.resize();
      this._autoCooldown = 6;
      this.frameMs.value = 16.7;
    } else if (avg < 11 && this.tier === 'low') {
      this.tier = 'medium';
      this.quality = { ...QUALITY_TIERS.medium };
      this.renderer.shadowMap.enabled = true;
      this.onQualityChange?.(this.quality, 'medium');
      this.resize();
      this._autoCooldown = 12;
      this.frameMs.value = 16.7;
    }
  }

  resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.width = w; this.height = h;

    const scale = clamp(this.quality.renderScale * settings.renderScale, 0.4, 1.0);
    const dpr = Math.min(window.devicePixelRatio || 1, this.tier === 'high' ? 2 : 1.5);
    this.renderer.setPixelRatio(dpr * scale);
    this.renderer.setSize(w, h, false);

    this.camera.aspect = w / h;
    this.camera.fov = settings.fov;
    this.camera.updateProjectionMatrix();

    const bw = Math.floor(w * dpr * scale);
    const bh = Math.floor(h * dpr * scale);
    this.postfx?.setSize(bw, bh);
    this.onResize?.(w, h, bw, bh);
  }

  render() {
    this.renderer.info.reset();
    if (this.postfx) this.postfx.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._envRT?.dispose();
    this.sky.geometry.dispose();
    this.sky.material.dispose();
    this.renderer.dispose();
  }
}
