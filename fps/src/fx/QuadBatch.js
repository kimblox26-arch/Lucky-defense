// 인스턴스 쿼드 배치 — 파티클/트레이서/데칼의 공용 렌더 백엔드.
// 하나의 드로우콜로 수백 개의 빌보드 또는 임의 방향 쿼드를 그린다.
// 매 프레임 소유자가 begin() → push() × N → end()로 채운다.

import {
  InstancedBufferGeometry, InstancedBufferAttribute, BufferAttribute,
  Mesh, ShaderMaterial, AdditiveBlending, NormalBlending, Color, Vector2,
} from 'three';

const VERT = /* glsl */`
  attribute vec3 iPos;
  attribute vec2 iScale;
  attribute vec4 iColor;
  #if defined(ORIENTED)
    attribute vec4 iQuat;
  #elif defined(BEAM)
    attribute vec3 iDir;
  #else
    attribute float iRot;
  #endif

  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;

  uniform float uFogDensity;

  #ifdef ORIENTED
  vec3 applyQuat(vec4 q, vec3 v) {
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
  }
  #endif

  void main() {
    vUv = uv;
    vColor = iColor;

    #if defined(ORIENTED)
      vec3 local = vec3(position.xy * iScale, 0.0);
      vec3 world = iPos + applyQuat(iQuat, local);
      vec4 mv = modelViewMatrix * vec4(world, 1.0);
    #elif defined(BEAM)
      // 원통형 빌보드: iDir을 축으로 유지한 채 카메라를 향해 회전
      vec3 axisPos = iPos + iDir * ((position.y + 0.5) * iScale.y);
      vec3 toCam = normalize(cameraPosition - axisPos);
      vec3 side = cross(iDir, toCam);
      float sl = length(side);
      side = sl > 1e-5 ? side / sl : vec3(1.0, 0.0, 0.0);
      vec3 world = axisPos + side * (position.x * iScale.x);
      vec4 mv = modelViewMatrix * vec4(world, 1.0);
    #else
      vec2 p = position.xy * iScale;
      float c = cos(iRot), s = sin(iRot);
      p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
      vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
      mv.xy += p;
    #endif

    float depth = -mv.z;
    float fd = uFogDensity * depth;
    vFog = 1.0 - exp(-fd * fd);

    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uFogColor;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;

  void main() {
    vec4 t = texture2D(uMap, vUv);
    vec3 rgb = vColor.rgb * t.rgb;
    float a = vColor.a * t.a;
    if (a < 0.004) discard;

    #ifdef ADDITIVE
      rgb *= (1.0 - vFog);
    #else
      rgb = mix(rgb, uFogColor, vFog);
    #endif

    gl_FragColor = vec4(rgb, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class QuadBatch {
  /**
   * @param {object} o
   * @param {number} o.capacity 최대 인스턴스 수
   * @param {Texture} o.texture
   * @param {'billboard'|'oriented'|'beam'} o.mode
   * @param {'additive'|'normal'} o.blending
   */
  constructor({
    capacity, texture, mode = 'billboard', blending = 'normal',
    depthWrite = false, depthTest = true, renderOrder = 5,
    polygonOffset = false,
  }) {
    this.capacity = capacity;
    this.mode = mode;
    this.oriented = mode === 'oriented';
    this.beam = mode === 'beam';
    this.count = 0;

    const geo = new InstancedBufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    ]), 3));
    geo.setAttribute('uv', new BufferAttribute(new Float32Array([
      0, 0, 1, 0, 1, 1, 0, 1,
    ]), 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);

    this.aPos = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.aScale = new InstancedBufferAttribute(new Float32Array(capacity * 2), 2);
    this.aColor = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.aPos.setUsage(35048); // DynamicDrawUsage
    this.aScale.setUsage(35048);
    this.aColor.setUsage(35048);
    geo.setAttribute('iPos', this.aPos);
    geo.setAttribute('iScale', this.aScale);
    geo.setAttribute('iColor', this.aColor);

    if (this.oriented) {
      this.aQuat = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
      this.aQuat.setUsage(35048);
      geo.setAttribute('iQuat', this.aQuat);
    } else if (this.beam) {
      this.aDir = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
      this.aDir.setUsage(35048);
      geo.setAttribute('iDir', this.aDir);
    } else {
      this.aRot = new InstancedBufferAttribute(new Float32Array(capacity), 1);
      this.aRot.setUsage(35048);
      geo.setAttribute('iRot', this.aRot);
    }

    geo.instanceCount = 0;
    // 파티클은 넓게 퍼지므로 절두체 컬링을 끈다 (경계 계산 비용 회피)
    geo.boundingSphere = null;

    const defines = {};
    if (this.oriented) defines.ORIENTED = '';
    if (this.beam) defines.BEAM = '';
    if (blending === 'additive') defines.ADDITIVE = '';

    this.material = new ShaderMaterial({
      defines,
      uniforms: {
        uMap: { value: texture },
        uFogColor: { value: new Color(0x000000) },
        uFogDensity: { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite,
      depthTest,
      blending: blending === 'additive' ? AdditiveBlending : NormalBlending,
      polygonOffset,
      polygonOffsetFactor: polygonOffset ? -4 : 0,
      polygonOffsetUnits: polygonOffset ? -4 : 0,
    });

    this.geometry = geo;
    this.mesh = new Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder;
    this.mesh.matrixAutoUpdate = false;
    this._tmp = new Vector2();
  }

  /** 씬의 안개 설정을 배치에 반영 */
  syncFog(fog) {
    if (!fog) return;
    this.material.uniforms.uFogColor.value.copy(fog.color);
    this.material.uniforms.uFogDensity.value = fog.density ?? 0;
  }

  begin() { this.count = 0; }

  /** 빌보드용 */
  push(x, y, z, sx, sy, rot, r, g, b, a) {
    const i = this.count;
    if (i >= this.capacity) return false;
    this.aPos.array[i * 3] = x;
    this.aPos.array[i * 3 + 1] = y;
    this.aPos.array[i * 3 + 2] = z;
    this.aScale.array[i * 2] = sx;
    this.aScale.array[i * 2 + 1] = sy;
    this.aColor.array[i * 4] = r;
    this.aColor.array[i * 4 + 1] = g;
    this.aColor.array[i * 4 + 2] = b;
    this.aColor.array[i * 4 + 3] = a;
    if (this.aRot) this.aRot.array[i] = rot;
    this.count++;
    return true;
  }

  /** 빔용 — iPos는 시작점, dir은 정규화된 방향, sy는 길이, sx는 두께 */
  pushBeam(x, y, z, dx, dy, dz, thickness, length, r, g, b, a) {
    const i = this.count;
    if (i >= this.capacity) return false;
    this.push(x, y, z, thickness, length, 0, r, g, b, a);
    this.aDir.array[i * 3] = dx;
    this.aDir.array[i * 3 + 1] = dy;
    this.aDir.array[i * 3 + 2] = dz;
    return true;
  }

  /** 방향 지정용 (쿼터니언) */
  pushOriented(x, y, z, sx, sy, qx, qy, qz, qw, r, g, b, a) {
    const i = this.count;
    if (i >= this.capacity) return false;
    this.push(x, y, z, sx, sy, 0, r, g, b, a);
    this.aQuat.array[i * 4] = qx;
    this.aQuat.array[i * 4 + 1] = qy;
    this.aQuat.array[i * 4 + 2] = qz;
    this.aQuat.array[i * 4 + 3] = qw;
    return true;
  }

  end() {
    this.geometry.instanceCount = this.count;
    if (this.count === 0) return;
    this.aPos.needsUpdate = true;
    this.aScale.needsUpdate = true;
    this.aColor.needsUpdate = true;
    if (this.aQuat) this.aQuat.needsUpdate = true;
    if (this.aDir) this.aDir.needsUpdate = true;
    if (this.aRot) this.aRot.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
