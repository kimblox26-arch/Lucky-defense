/* =========================================================================
 *  renderer.js — WebGL2 렌더러 (외부 라이브러리 없음)
 *  하늘 그라디언트 · 태양/달/별 · 구름 · 청크 지형 · 물 · 엔티티 ·
 *  파티클 · 선택 상자 · 1인칭 손/아이템 · 수중 오버레이
 * ========================================================================= */
'use strict';

const VS_WORLD = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in float aLayer;
layout(location=3) in vec3 aLight;
uniform mat4 uVP;
uniform mat4 uModel;
uniform vec3 uCam;
out vec2 vUV;
out float vLayer;
out vec3 vLight;
out float vDist;
void main(){
  vec4 wp = uModel * vec4(aPos, 1.0);
  gl_Position = uVP * wp;
  vUV = aUV;
  vLayer = aLayer;
  vLight = aLight;
  vDist = length(wp.xyz - uCam);
}`;

const FS_WORLD = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 vUV;
in float vLayer;
in vec3 vLight;
in float vDist;
uniform sampler2DArray uTex;
uniform float uDayLight;
uniform vec3 uFogColor;
uniform float uFogStart;
uniform float uFogEnd;
uniform float uAlphaTest;
uniform vec4 uTint;
out vec4 outColor;
void main(){
  vec4 c = texture(uTex, vec3(vUV, vLayer));
  if (c.a < uAlphaTest) discard;
  float sky = vLight.x * uDayLight;
  float blk = vLight.y;
  float l = max(sky, blk * 1.02);
  float lit = 0.055 + 0.945 * pow(clamp(l, 0.0, 1.0), 1.35);
  c.rgb *= lit * vLight.z;
  c *= uTint;
  float f = clamp((vDist - uFogStart) / max(0.001, uFogEnd - uFogStart), 0.0, 1.0);
  c.rgb = mix(c.rgb, uFogColor, f);
  outColor = c;
}`;

const VS_SKY = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vNdc;
void main(){ vNdc = aPos; gl_Position = vec4(aPos, 0.999999, 1.0); }`;

const FS_SKY = `#version 300 es
precision highp float;
in vec2 vNdc;
uniform mat4 uInvVP;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
out vec4 outColor;
void main(){
  vec4 p0 = uInvVP * vec4(vNdc, -1.0, 1.0);
  vec4 p1 = uInvVP * vec4(vNdc, 1.0, 1.0);
  vec3 dir = normalize(p1.xyz / p1.w - p0.xyz / p0.w);
  float h = clamp(dir.y * 1.6 + 0.12, -1.0, 1.0);
  vec3 col;
  if (h > 0.0) col = mix(uHorizon, uTop, pow(h, 0.62));
  else col = mix(uHorizon, uBottom, pow(-h, 0.55));
  float sd = max(0.0, dot(dir, normalize(uSunDir)));
  col += uSunColor * pow(sd, 18.0) * 0.85;
  col += uSunColor * pow(sd, 3.0) * 0.10;
  outColor = vec4(col, 1.0);
}`;

const VS_LINE = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uVP;
void main(){ gl_Position = uVP * vec4(aPos, 1.0); }`;

const FS_LINE = `#version 300 es
precision highp float;
uniform vec4 uColor;
out vec4 outColor;
void main(){ outColor = uColor; }`;

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      antialias: false, alpha: false, depth: true, stencil: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error('WebGL2를 사용할 수 없습니다');
    this.gl = gl;

    this.progWorld = this._program(VS_WORLD, FS_WORLD);
    this.progSky = this._program(VS_SKY, FS_SKY);
    this.progLine = this._program(VS_LINE, FS_LINE);

    this.uWorld = this._uniforms(this.progWorld,
      ['uVP', 'uModel', 'uCam', 'uTex', 'uDayLight', 'uFogColor', 'uFogStart', 'uFogEnd', 'uAlphaTest', 'uTint']);
    this.uSky = this._uniforms(this.progSky, ['uInvVP', 'uTop', 'uBottom', 'uHorizon', 'uSunDir', 'uSunColor']);
    this.uLine = this._uniforms(this.progLine, ['uVP', 'uColor']);

    this.proj = Mat4.create();
    this.view = Mat4.create();
    this.vp = Mat4.create();
    this.invVP = Mat4.create();
    this.model = Mat4.create();
    this.frustum = new Frustum();

    this._initTexture();
    this._initSkyQuad();
    this._initDynamic();
    this._initLines();
    this._initStars();
    this._initClouds();

    this.chunkMeshes = new Map();
    this.stats = { drawCalls: 0, triangles: 0, chunksDrawn: 0 };
    this.fov = 70;
    this.renderDistance = 6;
  }

  /* ------------------------------------------------------- 셰이더 도구 */
  _shader(type, src) {
    const gl = this.gl;
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('셰이더 컴파일 실패: ' + gl.getShaderInfoLog(s) + '\n' + src);
    }
    return s;
  }
  _program(vs, fs) {
    const gl = this.gl;
    const p = gl.createProgram();
    gl.attachShader(p, this._shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, this._shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('프로그램 링크 실패: ' + gl.getProgramInfoLog(p));
    }
    return p;
  }
  _uniforms(prog, names) {
    const gl = this.gl;
    const o = {};
    for (const n of names) o[n] = gl.getUniformLocation(prog, n);
    return o;
  }

  /* ---------------------------------------------------------- 텍스처 */
  _initTexture() {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    const n = Textures.tiles.length;
    const data = texturesToArrayBuffer();
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, TILE_SIZE, TILE_SIZE, n, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) {
      const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(gl.TEXTURE_2D_ARRAY, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, max));
    }
    this.texture = tex;
  }

  _initSkyQuad() {
    const gl = this.gl;
    this.skyVAO = gl.createVertexArray();
    gl.bindVertexArray(this.skyVAO);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  /* --------------------------------------------------- 동적 메시(엔티티) */
  _initDynamic() {
    const gl = this.gl;
    this.dynBuilder = new MeshBuilder(8192);
    this.dynVAO = gl.createVertexArray();
    this.dynVBO = gl.createBuffer();
    this.dynEBO = gl.createBuffer();
    gl.bindVertexArray(this.dynVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynVBO);
    this._setupAttribs();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.dynEBO);
    gl.bindVertexArray(null);
    this.dynCapV = 0; this.dynCapI = 0;
  }

  _setupAttribs() {
    const gl = this.gl;
    const stride = VERT_FLOATS * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 20);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, stride, 24);
  }

  _initLines() {
    const gl = this.gl;
    this.lineVAO = gl.createVertexArray();
    this.lineVBO = gl.createBuffer();
    gl.bindVertexArray(this.lineVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVBO);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.lineData = new Float32Array(1024 * 3);
  }

  /* -------------------------------------------------------------- 별 */
  _initStars() {
    const gl = this.gl;
    const rng = mulberry32(20260911);
    const verts = [];
    const idx = [];
    const layer = Textures.id('particle');
    let v = 0;
    for (let i = 0; i < 900; i++) {
      /* 구면 균등 분포 */
      const u = rng() * 2 - 1;
      const th = rng() * TAU;
      const r = Math.sqrt(1 - u * u);
      const dir = [r * Math.cos(th), u, r * Math.sin(th)];
      if (dir[1] < -0.15) continue;
      const dist = 180;
      const s = 0.35 + rng() * 0.9;
      /* 빌보드: 시선 기준이 아니라 고정 방향 쿼드 */
      const up = Math.abs(dir[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
      const rx = [
        dir[1] * up[2] - dir[2] * up[1],
        dir[2] * up[0] - dir[0] * up[2],
        dir[0] * up[1] - dir[1] * up[0],
      ];
      const rl = Math.hypot(rx[0], rx[1], rx[2]) || 1;
      rx[0] /= rl; rx[1] /= rl; rx[2] /= rl;
      const ry = [
        dir[1] * rx[2] - dir[2] * rx[1],
        dir[2] * rx[0] - dir[0] * rx[2],
        dir[0] * rx[1] - dir[1] * rx[0],
      ];
      const cx = dir[0] * dist, cy = dir[1] * dist, cz = dir[2] * dist;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (const [sx, sy] of corners) {
        verts.push(
          cx + (rx[0] * sx + ry[0] * sy) * s, cy + (rx[1] * sx + ry[1] * sy) * s,
          cz + (rx[2] * sx + ry[2] * sy) * s,
          (sx + 1) / 2, (1 - sy) / 2, layer, 0, 1, 1);
      }
      idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
      v += 4;
    }
    this.starVAO = gl.createVertexArray();
    gl.bindVertexArray(this.starVAO);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    this._setupAttribs();
    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.starCount = idx.length;
  }

  /* ------------------------------------------------------------ 구름 */
  _initClouds() {
    const gl = this.gl;
    const noise = new Perlin(4242);
    const mb = new MeshBuilder(4096);
    const layer = Textures.id('particle');
    const N = 48, CELL = 12;
    const grid = [];
    for (let z = 0; z < N; z++) {
      grid[z] = [];
      for (let x = 0; x < N; x++) {
        grid[z][x] = noise.fbm2(x / 9, z / 9, 3) > 0.14;
      }
    }
    const L = (sk, bl, sh) => [sk, bl, sh];
    void L;
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        if (!grid[z][x]) continue;
        const x0 = (x - N / 2) * CELL, z0 = (z - N / 2) * CELL;
        const x1 = x0 + CELL, z1 = z0 + CELL;
        const y0 = 0, y1 = 4;
        const V = (px, py, pz, u, v, sh) => [px, py, pz, u, v, layer, 1, 0, sh];
        /* 윗면 */
        mb.quad(V(x0, y1, z1, 0, 1, 1.0), V(x1, y1, z1, 1, 1, 1.0), V(x1, y1, z0, 1, 0, 1.0), V(x0, y1, z0, 0, 0, 1.0), false);
        /* 아랫면 */
        mb.quad(V(x0, y0, z0, 0, 1, 0.62), V(x1, y0, z0, 1, 1, 0.62), V(x1, y0, z1, 1, 0, 0.62), V(x0, y0, z1, 0, 0, 0.62), false);
        /* 가장자리 옆면만 */
        if (!grid[z][(x + 1) % N]) mb.quad(V(x1, y0, z1, 0, 1, 0.8), V(x1, y0, z0, 1, 1, 0.8), V(x1, y1, z0, 1, 0, 0.8), V(x1, y1, z1, 0, 0, 0.8), false);
        if (!grid[z][(x - 1 + N) % N]) mb.quad(V(x0, y0, z0, 0, 1, 0.8), V(x0, y0, z1, 1, 1, 0.8), V(x0, y1, z1, 1, 0, 0.8), V(x0, y1, z0, 0, 0, 0.8), false);
        if (!grid[(z + 1) % N][x]) mb.quad(V(x0, y0, z1, 0, 1, 0.86), V(x1, y0, z1, 1, 1, 0.86), V(x1, y1, z1, 1, 0, 0.86), V(x0, y1, z1, 0, 0, 0.86), false);
        if (!grid[(z - 1 + N) % N][x]) mb.quad(V(x1, y0, z0, 0, 1, 0.86), V(x0, y0, z0, 1, 1, 0.86), V(x0, y1, z0, 1, 0, 0.86), V(x1, y1, z0, 0, 0, 0.86), false);
      }
    }
    this.cloudVAO = gl.createVertexArray();
    gl.bindVertexArray(this.cloudVAO);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mb.vertexArray(), gl.STATIC_DRAW);
    this._setupAttribs();
    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mb.indexArray(), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    this.cloudCount = mb.icount;
    this.cloudSize = N * CELL;
  }

  /* ================================================================== */
  resize() {
    const c = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(c.clientWidth * dpr), h = Math.floor(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) {
      c.width = w; c.height = h;
    }
    this.gl.viewport(0, 0, c.width, c.height);
    this.aspect = c.width / Math.max(1, c.height);
  }

  /* ------------------------------------------------------- 청크 메시 */
  uploadChunkMesh(chunk, meshData) {
    const gl = this.gl;
    let m = this.chunkMeshes.get(chunk.key);
    if (!m) {
      m = { opaque: this._createMeshObj(), water: this._createMeshObj() };
      this.chunkMeshes.set(chunk.key, m);
      chunk.mesh = m;
    }
    this._uploadMeshObj(m.opaque, meshData.opaque);
    this._uploadMeshObj(m.water, meshData.water);
  }
  _createMeshObj() {
    const gl = this.gl;
    const o = { vao: gl.createVertexArray(), vbo: gl.createBuffer(), ebo: gl.createBuffer(), count: 0 };
    gl.bindVertexArray(o.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, o.vbo);
    this._setupAttribs();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.ebo);
    gl.bindVertexArray(null);
    return o;
  }
  _uploadMeshObj(o, data) {
    const gl = this.gl;
    o.count = data.idx.length;
    if (o.count === 0) return;
    gl.bindVertexArray(o.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, o.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data.verts, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }
  disposeChunkMesh(chunk) {
    const m = this.chunkMeshes.get(chunk.key);
    if (!m) return;
    const gl = this.gl;
    for (const o of [m.opaque, m.water]) {
      gl.deleteVertexArray(o.vao); gl.deleteBuffer(o.vbo); gl.deleteBuffer(o.ebo);
    }
    this.chunkMeshes.delete(chunk.key);
    chunk.mesh = null;
  }

  /* ==================================================================
   *  프레임 렌더링
   * ================================================================ */
  beginFrame(camera, world, opts = {}) {
    const gl = this.gl;
    this.resize();
    this.camera = camera;
    this.world = world;

    const daylight = world ? world.daylight : 1;
    this.daylight = daylight;

    /* 안개/하늘색 */
    const underwater = opts.underwater;
    const nightMix = 1 - daylight;
    let sky = mixHex(0x78a7ff, 0x05070f, nightMix);
    let horizon = mixHex(0xbcd8ff, 0x0b1020, nightMix);
    /* 노을 */
    const t = world ? world.time : 0;
    let sunset = 0;
    if (t > 11200 && t < 13800) sunset = 1 - Math.abs(t - 12500) / 1300;
    else if (t > 21800 && t < 23800) sunset = 1 - Math.abs(t - 22800) / 1000;
    if (sunset > 0) horizon = mixHex(horizon, 0xff8a3d, sunset * 0.8);

    this.fogColor = underwater ? [0.06, 0.19, 0.42] : hexToRgbArr(horizon);
    const far = this.renderDistance * 16;
    this.fogStart = underwater ? 0.2 : far * 0.55;
    this.fogEnd = underwater ? 14 : far * 0.98;

    Mat4.perspective(this.proj, (opts.fov || this.fov) * DEG, this.aspect, 0.05, Math.max(260, far * 2.2));
    Mat4.view(this.view, camera.x, camera.y, camera.z, camera.yaw, camera.pitch);
    Mat4.multiply(this.vp, this.proj, this.view);
    this.frustum.fromMatrix(this.vp);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(this.fogColor[0], this.fogColor[1], this.fogColor[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.stats.drawCalls = 0; this.stats.triangles = 0; this.stats.chunksDrawn = 0;
    this.skyColors = { sky, horizon, sunset };
  }

  drawSky(world, underwater) {
    if (underwater) return;
    const gl = this.gl;
    const t = world.time;
    const ang = ((t - 6000) / 24000) * TAU;
    const sunDir = [Math.cos(ang) * 0.2, Math.sin(ang), Math.cos(ang)];
    this.sunDir = sunDir;

    gl.useProgram(this.progSky);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    /* invVP: 회전만 (위치 제거) */
    const v = Mat4.create();
    Mat4.view(v, 0, 0, 0, this.camera.yaw, this.camera.pitch);
    const vp = Mat4.multiply(Mat4.create(), this.proj, v);
    this._invert(this.invVP, vp);
    gl.uniformMatrix4fv(this.uSky.uInvVP, false, this.invVP);
    const nightMix = 1 - this.daylight;
    gl.uniform3fv(this.uSky.uTop, hexToRgbArr(mixHex(0x4b8bf5, 0x03050c, nightMix)));
    gl.uniform3fv(this.uSky.uHorizon, hexToRgbArr(this.skyColors.horizon));
    gl.uniform3fv(this.uSky.uBottom, hexToRgbArr(mixHex(0x9dc4ff, 0x05070f, nightMix)));
    gl.uniform3fv(this.uSky.uSunDir, new Float32Array(sunDir));
    const sunCol = this.skyColors.sunset > 0
      ? hexToRgbArr(mixHex(0xfff0c0, 0xff7a2a, this.skyColors.sunset))
      : hexToRgbArr(0xfff6d8);
    gl.uniform3fv(this.uSky.uSunColor,
      new Float32Array(sunCol.map((c) => c * this.daylight * 0.9)));
    gl.bindVertexArray(this.skyVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    this.stats.drawCalls++;
  }

  /** 태양/달/별 */
  drawCelestial(world) {
    const gl = this.gl;
    const cam = this.camera;
    const t = world.time;
    const ang = ((t - 6000) / 24000) * TAU;

    this.dynBuilder.reset();
    const sunLayer = Textures.id('sun'), moonLayer = Textures.id('moon');
    const R = 120, S = 16;
    const addQuad = (dirX, dirY, layer, size) => {
      const cx = cam.x + dirX * R, cy = cam.y + dirY * R, cz = cam.z + 0;
      const rx = [0, 0, 1];
      const ry = [-dirY, dirX, 0];
      const V = (sx, sy, u, v) => [
        cx + rx[0] * sx * size + ry[0] * sy * size,
        cy + rx[1] * sx * size + ry[1] * sy * size,
        cz + rx[2] * sx * size + ry[2] * sy * size,
        u, v, layer, 1, 1, 1];
      this.dynBuilder.quad(V(-1, -1, 0, 1), V(1, -1, 1, 1), V(1, 1, 1, 0), V(-1, 1, 0, 0), false);
    };
    addQuad(Math.cos(ang), Math.sin(ang), sunLayer, S);
    addQuad(-Math.cos(ang), -Math.sin(ang), moonLayer, S * 0.75);

    gl.useProgram(this.progWorld);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    this._setWorldUniforms({ dayLight: 1, alphaTest: 0.05, fog: false });
    this._drawDynamic();

    /* 별 */
    if (this.daylight < 0.85) {
      const alpha = 1 - this.daylight;
      Mat4.identity(this.model);
      Mat4.translate(this.model, this.model, cam.x, cam.y, cam.z);
      Mat4.rotateZ(this.model, this.model, ang);
      gl.uniformMatrix4fv(this.uWorld.uModel, false, this.model);
      gl.uniform4f(this.uWorld.uTint, 1, 1, 1, alpha);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(this.starVAO);
      gl.drawElements(gl.TRIANGLES, this.starCount, gl.UNSIGNED_INT, 0);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
      gl.uniform4f(this.uWorld.uTint, 1, 1, 1, 1);
      Mat4.identity(this.model);
      gl.uniformMatrix4fv(this.uWorld.uModel, false, this.model);
      this.stats.drawCalls++;
    }
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
  }

  drawClouds(world, underwater) {
    if (underwater) return;
    const gl = this.gl;
    gl.useProgram(this.progWorld);
    this._setWorldUniforms({ dayLight: this.daylight, alphaTest: 0.05, fog: true });
    const drift = world.tickCount * 0.055;
    const size = this.cloudSize;
    const cx = Math.floor(this.camera.x / size) * size;
    const cz = Math.floor(this.camera.z / size) * size;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform4f(this.uWorld.uTint, 1, 1, 1, 0.82);
    gl.depthMask(false);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        Mat4.identity(this.model);
        Mat4.translate(this.model, this.model, cx + dx * size + (drift % size), 118, cz + dz * size);
        gl.uniformMatrix4fv(this.uWorld.uModel, false, this.model);
        gl.bindVertexArray(this.cloudVAO);
        gl.drawElements(gl.TRIANGLES, this.cloudCount, gl.UNSIGNED_INT, 0);
        this.stats.drawCalls++;
      }
    }
    gl.bindVertexArray(null);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.uniform4f(this.uWorld.uTint, 1, 1, 1, 1);
    Mat4.identity(this.model);
    gl.uniformMatrix4fv(this.uWorld.uModel, false, this.model);
  }

  _setWorldUniforms(o = {}) {
    const gl = this.gl;
    gl.useProgram(this.progWorld);
    gl.uniformMatrix4fv(this.uWorld.uVP, false, this.vp);
    Mat4.identity(this.model);
    gl.uniformMatrix4fv(this.uWorld.uModel, false, this.model);
    gl.uniform3f(this.uWorld.uCam, this.camera.x, this.camera.y, this.camera.z);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.texture);
    gl.uniform1i(this.uWorld.uTex, 0);
    gl.uniform1f(this.uWorld.uDayLight, o.dayLight === undefined ? Math.max(0.12, this.daylight) : o.dayLight);
    gl.uniform3fv(this.uWorld.uFogColor, new Float32Array(this.fogColor));
    gl.uniform1f(this.uWorld.uFogStart, o.fog === false ? 1e9 : this.fogStart);
    gl.uniform1f(this.uWorld.uFogEnd, o.fog === false ? 1e9 + 1 : this.fogEnd);
    gl.uniform1f(this.uWorld.uAlphaTest, o.alphaTest === undefined ? 0.5 : o.alphaTest);
    gl.uniform4f(this.uWorld.uTint, 1, 1, 1, 1);
  }

  /** 지형(불투명) */
  drawTerrain(world) {
    const gl = this.gl;
    this._setWorldUniforms({ alphaTest: 0.5 });
    this._visibleChunks = [];
    for (const [key, m] of this.chunkMeshes) {
      const c = world.chunks.get(key);
      if (!c) continue;
      const x0 = c.cx * 16, z0 = c.cz * 16;
      if (!this.frustum.boxVisible(x0, 0, z0, x0 + 16, CHUNK_HEIGHT, z0 + 16)) continue;
      const dx = x0 + 8 - this.camera.x, dz = z0 + 8 - this.camera.z;
      this._visibleChunks.push({ m, d: dx * dx + dz * dz });
      if (m.opaque.count) {
        gl.bindVertexArray(m.opaque.vao);
        gl.drawElements(gl.TRIANGLES, m.opaque.count, gl.UNSIGNED_INT, 0);
        this.stats.drawCalls++;
        this.stats.triangles += m.opaque.count / 3;
        this.stats.chunksDrawn++;
      }
    }
    gl.bindVertexArray(null);
  }

  /** 물 (반투명) */
  drawWater() {
    const gl = this.gl;
    if (!this._visibleChunks) return;
    this._visibleChunks.sort((a, b) => b.d - a.d);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    this._setWorldUniforms({ alphaTest: 0.02 });
    for (const { m } of this._visibleChunks) {
      if (!m.water.count) continue;
      gl.bindVertexArray(m.water.vao);
      gl.drawElements(gl.TRIANGLES, m.water.count, gl.UNSIGNED_INT, 0);
      this.stats.drawCalls++;
      this.stats.triangles += m.water.count / 3;
    }
    gl.bindVertexArray(null);
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  /* ------------------------------------------------- 동적 메시 드로우 */
  _drawDynamic(alphaBlend) {
    const gl = this.gl;
    const mb = this.dynBuilder;
    if (mb.icount === 0) return;
    gl.bindVertexArray(this.dynVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynVBO);
    const vdata = mb.vertexArray();
    if (vdata.length > this.dynCapV) {
      gl.bufferData(gl.ARRAY_BUFFER, vdata, gl.DYNAMIC_DRAW);
      this.dynCapV = vdata.length;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, vdata);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.dynEBO);
    const idata = mb.indexArray();
    if (idata.length > this.dynCapI) {
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idata, gl.DYNAMIC_DRAW);
      this.dynCapI = idata.length;
    } else {
      gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, idata);
    }
    if (alphaBlend) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    gl.drawElements(gl.TRIANGLES, mb.icount, gl.UNSIGNED_INT, 0);
    if (alphaBlend) gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    this.stats.drawCalls++;
    this.stats.triangles += mb.icount / 3;
  }

  /** 엔티티/파티클/아이템: 매 프레임 CPU에서 메시를 만들어 한 번에 그린다 */
  drawDynamicScene(buildFn, opts = {}) {
    const gl = this.gl;
    this.dynBuilder.reset();
    buildFn(this.dynBuilder);
    if (this.dynBuilder.icount === 0) return;
    this._setWorldUniforms({ alphaTest: opts.alphaTest === undefined ? 0.2 : opts.alphaTest });
    if (opts.noCull) gl.disable(gl.CULL_FACE);
    this._drawDynamic(opts.blend);
    if (opts.noCull) gl.enable(gl.CULL_FACE);
  }

  /* ------------------------------------------------------- 선택 상자 */
  drawSelectionBox(x, y, z, aabb) {
    const gl = this.gl;
    const a = aabb || [0, 0, 0, 1, 1, 1];
    const e = 0.002;
    const x0 = x + a[0] - e, y0 = y + a[1] - e, z0 = z + a[2] - e;
    const x1 = x + a[3] + e, y1 = y + a[4] + e, z1 = z + a[5] + e;
    const pts = [
      [x0, y0, z0], [x1, y0, z0], [x1, y0, z0], [x1, y0, z1], [x1, y0, z1], [x0, y0, z1], [x0, y0, z1], [x0, y0, z0],
      [x0, y1, z0], [x1, y1, z0], [x1, y1, z0], [x1, y1, z1], [x1, y1, z1], [x0, y1, z1], [x0, y1, z1], [x0, y1, z0],
      [x0, y0, z0], [x0, y1, z0], [x1, y0, z0], [x1, y1, z0], [x1, y0, z1], [x1, y1, z1], [x0, y0, z1], [x0, y1, z1],
    ];
    let p = 0;
    for (const v of pts) { this.lineData[p++] = v[0]; this.lineData[p++] = v[1]; this.lineData[p++] = v[2]; }
    gl.useProgram(this.progLine);
    gl.uniformMatrix4fv(this.uLine.uVP, false, this.vp);
    gl.uniform4f(this.uLine.uColor, 0, 0, 0, 0.45);
    gl.bindVertexArray(this.lineVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVBO);
    gl.bufferData(gl.ARRAY_BUFFER, this.lineData.subarray(0, p), gl.DYNAMIC_DRAW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.LINES, 0, pts.length);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    this.stats.drawCalls++;
  }

  /* ------------------------------------------------------ 1인칭 손 */
  drawHand(buildFn) {
    const gl = this.gl;
    gl.clear(gl.DEPTH_BUFFER_BIT);
    const proj = Mat4.perspective(Mat4.create(), 70 * DEG, this.aspect, 0.02, 8);
    const saveVP = this.vp;
    this.vp = proj;
    const saveCam = this.camera;
    this.camera = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
    this.dynBuilder.reset();
    buildFn(this.dynBuilder);
    if (this.dynBuilder.icount > 0) {
      this._setWorldUniforms({ alphaTest: 0.2, fog: false, dayLight: 1 });
      this._drawDynamic(false);
    }
    this.vp = saveVP;
    this.camera = saveCam;
  }

  /* --------------------------------------------------------- 행렬 역변환 */
  _invert(out, m) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return out;
    det = 1.0 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }
}

/* =========================================================================
 *  박스 메시 헬퍼 — 엔티티/파티클/손에서 공통 사용
 * ========================================================================= */
const _boxCorner = [0, 0, 0];

/**
 * 변환 행렬 m 을 적용해 직육면체를 추가한다.
 * tiles: 6면 텍스처 레이어 (숫자 하나면 전체 동일)
 */
function pushBox(mb, m, x0, y0, z0, x1, y1, z1, tiles, sky, blk, bright = 1) {
  const T = typeof tiles === 'number' ? [tiles, tiles, tiles, tiles, tiles, tiles] : tiles;
  for (let face = 0; face < 6; face++) {
    const F = FACES[face];
    const n = F.n, U = F.u, V = F.v;
    const verts = [];
    for (let i = 0; i < 4; i++) {
      const s = CORNERS[i][0], t = CORNERS[i][1];
      const lx = 0.5 + 0.5 * n[0] + 0.5 * s * U[0] + 0.5 * t * V[0];
      const ly = 0.5 + 0.5 * n[1] + 0.5 * s * U[1] + 0.5 * t * V[1];
      const lz = 0.5 + 0.5 * n[2] + 0.5 * s * U[2] + 0.5 * t * V[2];
      const px = x0 + lx * (x1 - x0);
      const py = y0 + ly * (y1 - y0);
      const pz = z0 + lz * (z1 - z0);
      transformPoint(m, px, py, pz, _boxCorner);
      verts.push([
        _boxCorner[0], _boxCorner[1], _boxCorner[2],
        (s + 1) / 2, (1 - t) / 2, T[face],
        sky, blk, F.shade * bright,
      ]);
    }
    mb.quad(verts[0], verts[1], verts[2], verts[3], false);
  }
}

/** 평면 쿼드 (아이템 스프라이트 등) */
function pushQuad(mb, m, pts, layer, sky, blk, bright = 1) {
  const verts = [];
  const uv = [[0, 1], [1, 1], [1, 0], [0, 0]];
  for (let i = 0; i < 4; i++) {
    transformPoint(m, pts[i][0], pts[i][1], pts[i][2], _boxCorner);
    verts.push([_boxCorner[0], _boxCorner[1], _boxCorner[2], uv[i][0], uv[i][1], layer, sky, blk, bright]);
  }
  mb.quad(verts[0], verts[1], verts[2], verts[3], false);
}

function transformPoint(m, x, y, z, out) {
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
  return out;
}
