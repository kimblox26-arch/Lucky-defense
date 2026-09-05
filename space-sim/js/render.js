/* ===== 렌더러 (three.js) ===== */
(function (root) {
  const V3 = THREE.Vector3;

  /* 로그 깊이 버퍼 청크 — 커스텀 셰이더도 내장 재질과 같은 깊이를 쓰도록 한다.
     (없으면 오버레이가 깊이 테스트에서 버려져 아예 그려지지 않는다) */
  const LGV_P = '#include <common>\n#include <logdepthbuf_pars_vertex>\n';
  const LGV = '\n#include <logdepthbuf_vertex>\n';
  const LGF_P = '#include <common>\n#include <logdepthbuf_pars_fragment>\n';
  const LGF = '\n#include <logdepthbuf_fragment>\n';

  function Renderer(canvas) {
    this.canvas = canvas;
    this.quality = 1;
    this.sizeScale = 1;        // 천체 크기 과장 배율
    this.marbleMode = true;
    this.showTrails = true;
    this.showRoche = true;
    this.showGrid = false;
    this.showVectors = false;
    this.showHZ = false;
    this.trailLen = 260;
    this.origin = new V3(0, 0, 0);   // 부동소수 정밀도 보정용 원점
    this.init();
  }

  Renderer.prototype.init = function () {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    r.setSize(innerWidth, innerHeight);
    r.setClearColor(0x02030a, 1);
    if (THREE.sRGBEncoding !== undefined) r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    this.gl = r;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 1e12);

    // 카메라 궤도 파라미터
    this.target = new V3(0, 0, 0);
    this.dist = 900;
    this.theta = 0.6; this.phi = 1.05;
    this.follow = null;

    this.scene.add(new THREE.AmbientLight(0x223046, 0.14));
    this.sunLights = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 0, 0);
      l.visible = false; this.scene.add(l); this.sunLights.push(l);
    }
    this.fill = new THREE.DirectionalLight(0x8aa8ff, 0.08);
    this.fill.position.set(1, 1, 1); this.scene.add(this.fill);

    // 은하수 스카이박스 (실제 전천 파노라마)
    let gtex;
    if (root.REALTEX) {
      gtex = REALTEX.tex('milkyway');
      gtex.mapping = THREE.EquirectangularReflectionMapping;
      const self = this;
      gtex.image && gtex.image.addEventListener && gtex.image.addEventListener('error', function () {
        const f = TEX.galaxy(self.quality);
        self.envTex = f; self.sky.material.map = f; self.sky.material.needsUpdate = true;
      });
    } else gtex = TEX.galaxy(this.quality);
    this.envTex = gtex;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 32),
      new THREE.MeshBasicMaterial({ map: gtex, side: THREE.BackSide, depthWrite: false, fog: false })
    );
    sky.scale.set(-1, 1, 1);
    sky.renderOrder = -1000;
    this.sky = sky; this.scene.add(sky);

    // 선명한 별 (스크린 고정 픽셀 크기)
    const NS = 5200, sp = new Float32Array(NS * 3), sc = new Float32Array(NS * 3);
    for (let i = 0; i < NS; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * 6.2832, rr = Math.sqrt(1 - u * u);
      // 은하면 쪽에 더 밀집
      const y = u * (Math.random() < 0.55 ? 0.22 : 1);
      const n = Math.hypot(rr * Math.cos(th), y, rr * Math.sin(th)) || 1;
      sp[i * 3] = rr * Math.cos(th) / n; sp[i * 3 + 1] = y / n; sp[i * 3 + 2] = rr * Math.sin(th) / n;
      const b = 0.25 + Math.pow(Math.random(), 2.2) * 0.95, t = Math.random();
      sc[i * 3] = b * (t < 0.16 ? 1 : t > 0.86 ? 0.76 : 1);
      sc[i * 3 + 1] = b * (t < 0.16 ? 0.82 : t > 0.86 ? 0.86 : 0.98);
      sc[i * 3 + 2] = b * (t < 0.16 ? 0.66 : 1);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({
      size: 2.4, sizeAttenuation: false, vertexColors: true, map: TEX.glowTex(0.3),
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
    }));
    this.stars.renderOrder = -999; this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    this.group = new THREE.Group(); this.scene.add(this.group);
    this.fxGroup = new THREE.Group(); this.scene.add(this.fxGroup);
    this.helpers = new THREE.Group(); this.scene.add(this.helpers);
    this.fx = [];
    this.meshes = new Map();      // uid -> {root, surf, marble, glow, ring, clouds, atmo, disk, trail}

    // 파편 인스턴스
    const dg = new THREE.SphereGeometry(1, 8, 6);
    const dm = new THREE.MeshPhongMaterial({
      color: 0xd8d0c4, shininess: 26, specular: 0x333333,
      map: root.REALTEX ? REALTEX.tex('eros') : null
    });
    this.debInst = new THREE.InstancedMesh(dg, dm, 1200);
    this.debInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debInst.count = 0;
    this.debInst.frustumCulled = false;
    this.scene.add(this.debInst);
    // 뜨거운 파편(강착 원반·초신성 잔해): 온도에 따라 빛난다
    const hm = new THREE.MeshBasicMaterial({ map: root.REALTEX ? REALTEX.tex('eros') : null, color: 0xffffff });
    this.debHot = new THREE.InstancedMesh(dg, hm, 900);
    this.debHot.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debHot.count = 0; this.debHot.frustumCulled = false;
    this.scene.add(this.debHot);
    this._col = new THREE.Color();
    this._m4 = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new V3();

    // 로슈/궤도 보조선
    this.rocheGroup = new THREE.Group(); this.helpers.add(this.rocheGroup);
    this.gridMesh = null;
    this.vecGroup = new THREE.Group(); this.helpers.add(this.vecGroup);
    this.hzMesh = null;
    this.bloomOn = true;
    this.terrain = 3;          // 지형 과장 배율
    this.initComposer();
    this.time = 0;
    this.resize();
  };

  /* 블룸(발광) 합성 파이프라인 */
  Renderer.prototype.initComposer = function () {
    if (!THREE.EffectComposer || !THREE.UnrealBloomPass) { this.composer = null; return; }
    const c = new THREE.EffectComposer(this.gl);
    c.addPass(new THREE.RenderPass(this.scene, this.cam));
    const bp = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.34, 0.36, 0.985);
    c.addPass(bp);
    const gp = new THREE.ShaderPass(THREE.GammaCorrectionShader);
    c.addPass(gp);
    this.composer = c; this.bloom = bp;
  };

  Renderer.prototype.resize = function () {
    this.gl.setSize(innerWidth, innerHeight);
    if (this.composer) this.composer.setSize(innerWidth, innerHeight);
    if (this.bloom) this.bloom.setSize(innerWidth, innerHeight);
    this.cam.aspect = innerWidth / innerHeight;
    this.cam.updateProjectionMatrix();
  };

  Renderer.prototype.setQuality = function (q) {
    this.quality = q;
    this.gl.setPixelRatio(Math.min(devicePixelRatio || 1, q >= 2 ? 2 : q === 1 ? 1.5 : 1));
    if (!root.REALTEX) {
      const gtex = TEX.galaxy(q);
      this.envTex = gtex; this.sky.material.map = gtex; this.sky.material.needsUpdate = true;
    }
  };

  // ---------- 메시 생성 ----------
  Renderer.prototype.seg = function () { return this.quality >= 2 ? [128, 72] : this.quality === 1 ? [80, 48] : [40, 24]; };

  Renderer.prototype.build = function (b) {
    const root3 = new THREE.Group();
    const S = this.seg();
    const rec = { root: root3 };
    const isBH = b.cat === 'bh';
    const isStar = b.isStar();

    if (isBH) {
      const core = new THREE.Mesh(new THREE.SphereGeometry(1, S[0], S[1]), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      root3.add(core); rec.surf = core;
      // 강착 원반
      const dInner = 2.3, dOuter = 9.5;
      const dg = new THREE.RingGeometry(dInner, dOuter, 128, 1);
      {   // UV 를 반경 방향으로
        const pp = dg.attributes.position, uv = dg.attributes.uv, v = new V3();
        for (let i = 0; i < pp.count; i++) {
          v.fromBufferAttribute(pp, i);
          uv.setXY(i, (v.length() - dInner) / (dOuter - dInner), 0.5);
        }
      }
      const dm = new THREE.MeshBasicMaterial({
        map: TEX.diskTex(), side: THREE.DoubleSide, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffffff
      });
      const disk = new THREE.Mesh(dg, dm); disk.rotation.x = Math.PI / 2 - 0.28;
      root3.add(disk); rec.disk = disk;
      // 광자 고리
      const ph = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.62, 96), new THREE.MeshBasicMaterial({ color: 0xffd9a0, side: THREE.DoubleSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      ph.rotation.x = Math.PI / 2 - 0.35; root3.add(ph); rec.photon = ph;
    } else {
      const RT = (root.REALTEX && b.tex !== 'marble' && !b.x.marble) ? REALTEX.forBody(b) : null;
      const tex = RT ? REALTEX.tex(RT.map) : TEX.surface(b.tex, b.seed, this.quality);
      rec.real = RT;
      rec.disp = 0;
      const mat = new THREE.MeshPhongMaterial({
        map: tex,
        shininess: 6,
        specular: new THREE.Color(0x060606),   // 암석·얼음 표면은 거의 확산 반사만 (인공적인 광택 제거)
        emissive: new THREE.Color(isStar ? b.col : 0x000000),
        emissiveIntensity: isStar ? 1 : 0,
        emissiveMap: isStar ? tex : null
      });
      let dispS = 0;
      if (RT) {
        if (RT.bump) { mat.bumpMap = REALTEX.tex(RT.bump); mat.bumpScale = RT.bs || 0.02; }
        if (RT.disp && this.quality > 0) {
          // 실제 고도 자료로 지형을 실제로 융기·함몰시킨다 (윤곽선에 산맥이 보인다)
          dispS = RT.disp * (this.terrain || 3);
          mat.displacementMap = REALTEX.tex(RT.bump || RT.map);
          mat.displacementScale = dispS;
          mat.displacementBias = 0;
        }
        else if (!isStar) {
          // 전용 범프가 없는 천체는 표면 사진 자체의 명암을 요철로 사용 → 매끈함 제거
          mat.bumpMap = tex;
          mat.bumpScale = (b.cat === 'moon' || b.cat === 'asteroid' || b.cat === 'dwarf' ||
            b.cat === 'comet' || b.cat === 'meteoroid' || b.cat === 'debris') ? 0.045 : 0.012;
        }
        if (RT.spec) { mat.specularMap = REALTEX.tex(RT.spec); mat.specular.setHex(0x1b242e); mat.shininess = 84; }
        if (RT.tint) {                                   // 항성: 흑체 복사 색
          mat.color.setRGB(RT.tint[0], RT.tint[1], RT.tint[2]);
          if (isStar) mat.emissive.setRGB(RT.tint[0], RT.tint[1], RT.tint[2]);
        } else if (RT.tintCol != null) {                 // 대체 사진 사용 시 카탈로그 색으로 보정
          mat.color.setHex(RT.tintCol).lerp(new THREE.Color(0xffffff), 0.55);
        }
      }
      if (!RT && !isStar && b.tex !== 'marble' && !b.x.marble) { mat.bumpMap = tex; mat.bumpScale = 0.03; }
      if (this.marbleMode && !isStar) { mat.envMap = this.envTex; mat.reflectivity = 0.22; mat.combine = THREE.MixOperation; }
      if (b.x.marble || b.tex === 'marble') {
        mat.color.setHex(b.col); mat.shininess = 90; mat.specular.setHex(0x8899aa);
        mat.emissive.setHex(b.col).multiplyScalar(0.22); mat.emissiveIntensity = 1;
      }
      let geo = new THREE.SphereGeometry(1, S[0], S[1]);
      if (b.x.irr) {                        // 불규칙 천체 (소행성/혜성/파편)
        const p = geo.attributes.position, sd = b.seed * 0.37;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
          let n = 0.58 + 0.62 * TEX.fbm(x * 1.9 + sd, y * 1.9, z * 1.9, 5);
          n += 0.12 * (TEX.fbm(x * 6.5 + sd, y * 6.5, z * 6.5, 3) - 0.5);   // 잔 요철
          n -= 0.16 * Math.pow(TEX.fbm(x * 3.3 + sd * 2, y * 3.3, z * 3.3, 2), 3) * 4;  // 큰 크레이터 함몰
          p.setXYZ(i, x * n, y * n * (b.x.irr === 2 ? 0.42 : 0.88), z * n);
        }
        geo.computeVertexNormals();
      }
      let useMat = mat;
      if (isStar) {
        // 항성: 실제 광구 이미지 + 주연감광(limb darkening) + 흑체 복사 색
        const tc = RT && RT.tint ? new THREE.Color(RT.tint[0], RT.tint[1], RT.tint[2]) : new THREE.Color(b.col);
        useMat = new THREE.ShaderMaterial({
          uniforms: {
            tMap: { value: tex }, tint: { value: tc }, k: { value: 0.80 },
            time: { value: 0 }, act: { value: b.flare || 0.25 }
          },
          vertexShader: LGV_P + 'varying vec2 vUv; varying vec3 vN; varying vec3 vP;' +
            'void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz;' +
            ' gl_Position=projectionMatrix*mv;' + LGV + '}',
          fragmentShader: LGF_P +
            'uniform sampler2D tMap; uniform vec3 tint; uniform float k; uniform float time; uniform float act;' +
            'varying vec2 vUv; varying vec3 vN; varying vec3 vP;' +
            'float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }' +
            'float nz(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);' +
            ' return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }' +
            'void main(){' + LGF +
            ' float mu=clamp(dot(normalize(vN), normalize(-vP)),0.0,1.0);' +
            ' float limb=0.30+0.70*pow(mu,0.55);' +
            // 광구 대류(granulation): 두 겹의 텍스처가 서로 다른 속도로 흐른다
            ' vec3 a=texture2D(tMap, vUv+vec2(time*0.0035,0.0)).rgb;' +
            ' vec3 b2=texture2D(tMap, vUv*1.6+vec2(-time*0.0052, time*0.0011)).rgb;' +
            ' vec3 c=mix(a,b2,0.38);' +
            // 밝기 요동 + 표면 활동(플레어)
            ' float g=nz(vUv*vec2(70.0,35.0)+vec2(time*0.35,-time*0.22));' +
            ' float g2=nz(vUv*vec2(18.0,9.0)-vec2(time*0.12,time*0.07));' +
            ' c *= 0.80 + 0.30*g + 0.22*g2;' +
            ' float fl=smoothstep(0.86,1.0,g2)*act;' +
            ' c += vec3(1.0,0.72,0.35)*fl*1.6;' +
            ' gl_FragColor=vec4(c*tint*limb*k,1.0); }'
        });
      }
      rec.disp = dispS;
      const m = new THREE.Mesh(geo, useMat);
      root3.add(m); rec.surf = m; rec.starMat = isStar ? useMat : null;
      if (isStar) {
        // 코로나: 부드러운 헤일로 (경계선이 생기지 않는 스프라이트)
        const ct = (RT && RT.tint) ? new THREE.Color(RT.tint[0], RT.tint[1], RT.tint[2]) : new THREE.Color(b.col);
        const cor = new THREE.Sprite(new THREE.SpriteMaterial({
          map: TEX.coronaTex(), color: ct, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.45
        }));
        cor.scale.setScalar(3.2);
        root3.add(cor); rec.corona = cor;
        rec.proms = [];
      }

      if (b.x.clouds || (RT && RT.clouds)) {
        const cmat = (RT && RT.clouds)
          ? new THREE.MeshPhongMaterial({
            color: 0xf2f6fa, alphaMap: REALTEX.tex(RT.clouds), transparent: true,
            depthWrite: false, opacity: 0.95, shininess: 1, specular: 0x0a0a0a
          })
          : new THREE.MeshPhongMaterial({ map: TEX.clouds(b.seed, this.quality), transparent: true, depthWrite: false, opacity: 0.8 });
        const cm = new THREE.Mesh(new THREE.SphereGeometry(1 + dispS + 0.004, S[0], Math.max(24, S[1] >> 1)), cmat);
        root3.add(cm); rec.clouds = cm;
      }
      // 밤면 도시 불빛 (실제 NASA City Lights)
      if (RT && RT.night) {
        const nmat = new THREE.ShaderMaterial({
          uniforms: { tMap: { value: REALTEX.tex(RT.night) }, sunDir: { value: new THREE.Vector3(1, 0, 0) }, k: { value: 2.0 } },
          vertexShader: LGV_P + 'varying vec2 vUv; varying vec3 vNW; void main(){ vUv=uv; vNW=normalize(mat3(modelMatrix)*normal);' +
            ' gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);' + LGV + '}',
          fragmentShader: LGF_P + 'uniform sampler2D tMap; uniform vec3 sunDir; uniform float k; varying vec2 vUv; varying vec3 vNW;' +
            'void main(){' + LGF + ' float d=dot(normalize(vNW), normalize(sunDir)); float night=1.0-smoothstep(-0.22,0.10,d);' +
            ' vec3 c=max(texture2D(tMap,vUv).rgb-vec3(0.17,0.17,0.27), 0.0)*2.4;' +
            ' gl_FragColor=vec4(c*night*k,1.0); }',
          blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
        });
        const nmesh = new THREE.Mesh(new THREE.SphereGeometry(1 + dispS + 0.0015, S[0], S[1]), nmat);
        root3.add(nmesh); rec.night = nmesh;
      }
      // 대기: 실제처럼 아주 얇은 산란 테두리 (기압에 따라 두께·밝기 변화)
      if ((b.atmoP || 0) > 1e-6 || b.x.atmo) {
        const ac = this.atmoColor(b);
        const am = new THREE.Mesh(new THREE.SphereGeometry(1.09, 72, 44), new THREE.ShaderMaterial({
          uniforms: {
            col: { value: ac }, strength: { value: 0.5 }, inner: { value: 1 / 1.09 },
            sunDir: { value: new THREE.Vector3(1, 0, 0) }
          },
          vertexShader: LGV_P + 'varying vec3 vN; varying vec3 vP; varying vec3 vW;' +
            'void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz;' +
            ' vW=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*mv;' + LGV + '}',
          fragmentShader: LGF_P + 'uniform vec3 col; uniform float strength; uniform float inner; uniform vec3 sunDir;' +
            'varying vec3 vN; varying vec3 vP; varying vec3 vW;' +
            'void main(){' + LGF +
            ' float mu=abs(dot(normalize(vN), normalize(-vP)));' +
            ' float p=sqrt(max(0.0,1.0-mu*mu));' +                       // 임팩트 파라미터 (0~1)
            ' float t=clamp((p-inner)/max(1e-4,1.0-inner), 0.0, 1.0);' + // 지표(0) → 대기 상단(1)
            ' float dens=exp(-t*2.6)*pow(1.0-t*t,1.6);' +                // 지수적으로 옅어지는 대기
            ' float sun=clamp(dot(normalize(vW), normalize(sunDir))*0.8+0.36, 0.0, 1.0);' +
            ' float a=dens*strength*sun;' +
            ' if(a<0.002) discard;' +
            ' gl_FragColor=vec4(col*a*1.15, a); }',
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide
        }));
        // 원반 위의 옅은 산란 — 테두리가 선처럼 보이지 않고 표면과 자연스럽게 이어진다
        const hz = new THREE.Mesh(new THREE.SphereGeometry(1.004, 48, 32), new THREE.ShaderMaterial({
          uniforms: { col: { value: ac.clone() }, strength: { value: 0.2 }, sunDir: { value: new THREE.Vector3(1, 0, 0) } },
          vertexShader: LGV_P + 'varying vec3 vN; varying vec3 vP; varying vec3 vW;' +
            'void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz;' +
            ' vW=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*mv;' + LGV + '}',
          fragmentShader: LGF_P + 'uniform vec3 col; uniform float strength; uniform vec3 sunDir;' +
            'varying vec3 vN; varying vec3 vP; varying vec3 vW;' +
            'void main(){' + LGF + ' float mu=clamp(dot(normalize(vN), normalize(-vP)),0.0,1.0);' +
            ' float rim=pow(1.0-mu,2.4);' +
            ' float sun=clamp(dot(normalize(vW), normalize(sunDir))*1.1+0.16, 0.0, 1.0);' +
            ' float a=(0.10+0.90*rim)*strength*sun*0.5;' +
            ' if(a<0.002) discard;' +
            ' gl_FragColor=vec4(col*a, a); }',
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide
        }));
        root3.add(hz); rec.haze = hz;
        root3.add(am); rec.atmo = am;
      }
      // 얼음(빙하) 오버레이 — 온도가 내려가면 극지방부터 얼어붙는다
      if (!isStar && (b.comp.gas || 0) < 0.5 && b.cat !== 'bh') {
        const im = new THREE.Mesh(new THREE.SphereGeometry(1 + dispS + 0.0008, S[0], S[1]), new THREE.ShaderMaterial({
          uniforms: { ice: { value: b.ice || 0 } },
          vertexShader: LGV_P + 'varying vec2 vUv; void main(){ vUv=uv;' +
            ' gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);' + LGV + '}',
          fragmentShader: LGF_P + 'uniform float ice; varying vec2 vUv;' +
            'float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }' +
            'float nz(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);' +
            ' return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }' +
            'void main(){' + LGF + ' float lat=abs(vUv.y*2.0-1.0);' +
            ' float n=nz(vUv*vec2(34.0,17.0))*0.09-0.045;' +
            ' float edge=1.055-ice*1.12+n;' +
            ' float a=smoothstep(edge-0.05, edge+0.09, lat)*0.92;' +
            ' if(a<0.004) discard;' +
            ' gl_FragColor=vec4(0.93,0.96,1.0,a); }',
          transparent: true, depthWrite: false
        }));
        root3.add(im); rec.ice = im;
        // 바다 오버레이 — 물을 추가하면 낮은 지형부터 잠긴다
        if (RT && (RT.bump || RT.map)) {
          const om = new THREE.Mesh(new THREE.SphereGeometry(1 + dispS + 0.0006, S[0], S[1]), new THREE.ShaderMaterial({
            uniforms: {
              hMap: { value: REALTEX.tex(RT.bump || RT.map) }, level: { value: 0 },
              deep: { value: new THREE.Color(0x0a2f5c) }, sunDir: { value: new THREE.Vector3(1, 0, 0) }
            },
            vertexShader: LGV_P + 'varying vec2 vUv; varying vec3 vNW; varying vec3 vN; varying vec3 vP;' +
              'void main(){ vUv=uv; vNW=normalize(mat3(modelMatrix)*normal); vN=normalize(normalMatrix*normal);' +
              ' vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz; gl_Position=projectionMatrix*mv;' + LGV + '}',
            fragmentShader: LGF_P + 'uniform sampler2D hMap; uniform float level; uniform vec3 deep; uniform vec3 sunDir;' +
              'varying vec2 vUv; varying vec3 vNW; varying vec3 vN; varying vec3 vP;' +
              'void main(){' + LGF + ' if(level<=0.001) discard;' +
              ' float h=texture2D(hMap,vUv).g;' +
              ' float a=1.0-smoothstep(level-0.02, level+0.03, h);' +
              ' if(a<0.01) discard;' +
              ' float d=clamp((level-h)*3.0,0.0,1.0);' +
              ' vec3 c=mix(vec3(0.30,0.62,0.78), deep, d);' +
              ' float lam=clamp(dot(normalize(vNW), normalize(sunDir)),0.0,1.0);' +
              ' float mu=clamp(dot(normalize(vN), normalize(-vP)),0.0,1.0);' +
              ' float spec=pow(clamp(1.0-mu,0.0,1.0),3.0)*0.35;' +
              ' c *= 0.06 + 1.15*lam;' +
              ' c += vec3(0.9,0.95,1.0)*spec*lam;' +
              ' gl_FragColor=vec4(c, a*(0.35+0.65*lam)); }',
            transparent: true, depthWrite: false
          }));
          root3.add(om); rec.ocean = om;
        }
      }
      if (b.x.rings) {
        const inner = (RT && RT.ring) ? RT.ri : 1.28;
        const outer = (RT && RT.ring) ? RT.ro : 1.28 + 1.35 * b.x.rings;
        const rg = new THREE.RingGeometry(inner, outer, 128, 1);
        // UV 를 반경 방향으로
        const p = rg.attributes.position, uv = rg.attributes.uv, v = new V3();
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i);
          uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
        }
        const rm = new THREE.MeshBasicMaterial({
          map: (RT && RT.ring) ? REALTEX.tex(RT.ring) : TEX.ringTex(b.seed),
          side: THREE.DoubleSide, transparent: true, depthWrite: false, opacity: 0.95
        });
        const ring = new THREE.Mesh(rg, rm); ring.rotation.x = Math.PI / 2;
        root3.add(ring); rec.ring = ring;
      }
      // 구슬 유리 셸 — 구슬 천체에만 (실제 행성에는 윤곽선이 생기지 않도록)
      if (this.marbleMode && !isStar && (b.x.marble || b.tex === 'marble')) {
        const gm = new THREE.Mesh(new THREE.SphereGeometry(1.035, S[0], S[1]), new THREE.MeshPhongMaterial({
          color: 0xffffff, transparent: true, opacity: 0.055, shininess: 150, specular: 0x8fa6bc,
          envMap: this.envTex, reflectivity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending
        }));
        root3.add(gm); rec.marble = gm;
      }
    }
    // 발광 스프라이트
    const glowStrength = isBH ? 1.4 : (b.x.glow || (isStar ? 2.2 : (b.x.glow || 0)));
    if (glowStrength > 0 || isStar || isBH) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: TEX.glowTex(isBH ? 0.05 : 0.12), color: isBH ? 0xffa040 : b.col,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9
      }));
      sp.scale.setScalar(1);
      root3.add(sp); rec.glow = sp; rec.glowK = Math.max(1.2, glowStrength);
    }
    // 혜성 꼬리
    if (b.x.tail) {
      const t = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glowTex(0.02), color: 0x9fe8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      root3.add(t); rec.tail = t;
    }
    // 궤적
    const tl = new Float32Array(this.trailLen * 3);
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(tl, 3));
    tg.setDrawRange(0, 0);
    const tm = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: b.col, transparent: true, opacity: 0.55 }));
    tm.frustumCulled = false;
    this.group.add(tm); rec.trail = tm;

    root3.rotation.z = (b.tilt || 0) * Math.PI / 180;
    this.group.add(root3);
    this.meshes.set(b.uid, rec);
    return rec;
  };

  Renderer.prototype.dispose = function (uid) {
    const rec = this.meshes.get(uid); if (!rec) return;
    if (rec.proms) rec.proms.forEach(p => this.scene.remove(p));
    this.group.remove(rec.root); this.group.remove(rec.trail);
    rec.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    rec.trail.geometry.dispose();
    this.meshes.delete(uid);
  };

  /* 높이맵의 고도 분포(백분위) — 물 비율만큼 정확히 잠기도록 */
  Renderer.prototype.heightProfile = function (tex) {
    if (!tex || !tex.image || !(tex.image.width > 0)) return null;
    if (tex.__hprof) return tex.__hprof;
    try {
      const c = document.createElement('canvas'); c.width = 96; c.height = 48;
      const cx = c.getContext('2d'); cx.drawImage(tex.image, 0, 0, 96, 48);
      const d = cx.getImageData(0, 0, 96, 48).data;
      const arr = [];
      for (let i = 0; i < d.length; i += 4) arr.push(d[i + 1] / 255);
      arr.sort((a, b) => a - b);
      const pr = new Float32Array(101);
      for (let i = 0; i <= 100; i++) pr[i] = arr[Math.min(arr.length - 1, Math.round(i / 100 * (arr.length - 1)))];
      tex.__hprof = pr;
      return pr;
    } catch (e) { return null; }
  };

  /* 대기 산란 색 — 조성과 기압으로 결정 */
  Renderer.prototype.atmoColor = function (b) {
    const c = b.comp || {};
    const P = b.atmoP || 0;
    if (c.gas > 0.5) return new THREE.Color(b.col).lerp(new THREE.Color(0xdfefff), 0.35);  // 가스행성
    if (b.tex === 'titan' || (c.ice > 0.3 && P > 0.5)) return new THREE.Color(0xff9a4a);   // 메탄 헤이즈
    if (P > 8) return new THREE.Color(0xffd9a0);                                           // 금성형 두꺼운 CO2
    if (b.water > 0.05 || (P > 0.2 && P <= 8)) return new THREE.Color(0x6fa8ff);           // 질소·산소 (레일리 산란)
    return new THREE.Color(0xffb08a);                                                      // 희박한 먼지 대기
  };

  // ---------- 카메라 ----------
  Renderer.prototype.camPos = function () {
    const st = Math.sin(this.phi), ct = Math.cos(this.phi);
    return new V3(
      this.target.x + this.dist * st * Math.sin(this.theta),
      this.target.y + this.dist * ct,
      this.target.z + this.dist * st * Math.cos(this.theta)
    );
  };
  Renderer.prototype.orbit = function (dx, dy) {
    this.theta -= dx * 0.005; this.phi -= dy * 0.005;
    this.phi = Math.max(0.02, Math.min(Math.PI - 0.02, this.phi));
  };
  Renderer.prototype.zoom = function (f) {
    this.dist = Math.max(1e-4, Math.min(4e8, this.dist * f));
  };
  Renderer.prototype.pan = function (dx, dy) {
    const cp = this.camPos();
    const fwd = new V3().subVectors(this.target, cp).normalize();
    const right = new V3().crossVectors(fwd, new V3(0, 1, 0)).normalize();
    const up = new V3().crossVectors(right, fwd).normalize();
    const k = this.dist * 0.0016;
    this.target.addScaledVector(right, -dx * k);
    this.target.addScaledVector(up, dy * k);
    this.follow = null;
  };
  Renderer.prototype.focus = function (b, snap) {
    this.follow = b;
    if (snap) this.dist = Math.max(b.r * 6 * this.visScale(b), b.r * 4);
  };
  Renderer.prototype.visScale = function (b) {
    // 아주 작은 천체는 최소 가시 크기 확보
    return 1;
  };
  Renderer.prototype.visRadius = function (b) {
    if (b.cat === 'bh') return Math.max(b.r, this.dist * 0.008);   // 원반/광자고리 가시화
    const r = b.r * this.sizeScale;
    const minR = this.dist * 0.0016;
    return Math.max(r, Math.min(minR, this.dist * 0.02));
  };

  // ---------- 프레임 ----------
  Renderer.prototype.sync = function (sim, sel, dtReal) {
    // 원점 이동 (정밀도)
    if (this.follow && this.follow.alive) this.target.set(this.follow.px, this.follow.py, this.follow.pz);
    else if (this.follow && !this.follow.alive) this.follow = null;
    this.origin.copy(this.target);
    const O = this.origin;

    // 조명: 가장 밝은 항성 4개
    const stars = sim.bodies.filter(b => b.isStar() || b.cat === 'bh').sort((a, c) => c.lum() - a.lum()).slice(0, 4);
    this.sunLights.forEach((l, i) => {
      const s = stars[i];
      if (!s) { l.visible = false; return; }
      l.visible = true;
      l.position.set(s.px - O.x, s.py - O.y, s.pz - O.z);
      // 항성 빛의 색은 온도(흑체 복사) 기준 — 장식용 색이 아니라 실제 색에 가깝게
      if (root.REALTEX && s.T > 0) {
        const bb = REALTEX.blackbody(s.T);
        l.color.setRGB(bb[0], bb[1], bb[2]).lerp(new THREE.Color(1, 1, 1), 0.55);
      } else l.color.setHex(s.col || 0xffffff);
      const d = Math.hypot(s.px - this.target.x, s.py - this.target.y, s.pz - this.target.z);
      l.intensity = Math.min(2.0, 1.32 + Math.log10(Math.max(1e-4, s.lum() + 0.01)) * 0.2);
      l.distance = 0;
    });
    if (!stars.length) this.fill.intensity = 0.8; else this.fill.intensity = 0.07;

    const seen = new Set();
    const bodies = sim.bodies;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i]; seen.add(b.uid);
      let rec = this.meshes.get(b.uid);
      if (!rec) rec = this.build(b);
      const R = this.visRadius(b);
      rec.root.position.set(b.px - O.x, b.py - O.y, b.pz - O.z);
      // 조석 변형: 로슈 한계 안쪽이나 블랙홀 근처에서 주 천체 방향으로 늘어난다
      if (b.tidal > 0.02 && b.cat !== 'bh') {
        const st = 1 + b.tidal * 0.55, sq = 1 / Math.sqrt(st);
        rec.root.scale.set(R * sq, R * sq, R * sq);
        const dv = new V3(b.tdir[0], b.tdir[1], b.tdir[2]);
        rec.root.up.set(0, 1, 0);
        rec.root.lookAt(rec.root.position.x + dv.x, rec.root.position.y + dv.y, rec.root.position.z + dv.z);
        rec.root.scale.z = R * st;                    // lookAt 은 -Z 를 향하므로 Z 로 늘린다
        rec.stretched = true;
      } else if (rec.stretched) {
        rec.root.rotation.set(0, 0, (b.tilt || 0) * Math.PI / 180);
        rec.root.scale.setScalar(R); rec.stretched = false;
      } else rec.root.scale.setScalar(R);
      // 자전: 실제 자전 주기와 시뮬레이션 시간으로 계산 (고배속에서는 스트로브 방지 제한)
      if (rec.surf && !rec.starMat) {
        const dir = (b.rotH || 24) < 0 ? -1 : 1;
        const target = dir * (b.spinRate() * sim.t) % 6.283185;
        let cur = rec.rotAng || 0;
        let d = target - cur;
        while (d > Math.PI) d -= 6.283185;
        while (d < -Math.PI) d += 6.283185;
        cur += Math.max(-0.35, Math.min(0.35, d));
        rec.rotAng = cur;
        rec.surf.rotation.y = cur;
        if (rec.night) rec.night.rotation.y = cur;
        if (rec.ice) rec.ice.rotation.y = cur;
        if (rec.ocean) rec.ocean.rotation.y = cur;
      }
      if (rec.clouds) rec.clouds.rotation.y = (rec.rotAng || 0) * 1.06 + this.time * 0.004;
      // 대기·바다·얼음 상태 반영
      if (rec.atmo) {
        const P = b.atmoP || 0;
        const h = 0.010 + 0.022 * Math.log10(1 + P);          // 실제 대기는 반지름의 1~3% 두께
        const Ra = 1 + (rec.disp || 0) + h;
        rec.atmo.scale.setScalar(Ra / 1.09);
        rec.atmo.material.uniforms.inner.value = (1 + (rec.disp || 0)) / Ra;
        const st = Math.max(0, Math.min(0.85, 0.10 + 0.24 * Math.log10(1 + P * 4)));
        rec.atmo.material.uniforms.strength.value = st;
        rec.atmo.material.uniforms.col.value.copy(this.atmoColor(b)).lerp(new THREE.Color(1, 1, 1), 0.18);
        rec.atmo.visible = P > 1e-5;
        const st0 = stars[0];
        if (st0) rec.atmo.material.uniforms.sunDir.value.set(st0.px - b.px, st0.py - b.py, st0.pz - b.pz).normalize();
        if (rec.haze) {
          rec.haze.scale.setScalar((1 + (rec.disp || 0) + 0.001) / 1.004);
          rec.haze.material.uniforms.strength.value = st;
          rec.haze.material.uniforms.col.value.copy(this.atmoColor(b)).lerp(new THREE.Color(1, 1, 1), 0.25);
          rec.haze.visible = P > 1e-4;
          if (st0) rec.haze.material.uniforms.sunDir.value.copy(rec.atmo.material.uniforms.sunDir.value);
        }
      }
      if (rec.ice) {
        rec.ice.material.uniforms.ice.value = b.ice || 0;
        rec.ice.visible = (b.ice || 0) > 0.004;
      }
      if (rec.ocean) {
        const extra = Math.max(0, (b.water || 0) - (b.water0 || 0));
        const pr = this.heightProfile(rec.ocean.material.uniforms.hMap.value);
        rec.ocean.material.uniforms.level.value = pr
          ? pr[Math.max(0, Math.min(100, Math.round(extra * 100)))]
          : Math.min(1, extra * 1.45);
        rec.ocean.visible = extra > 0.004;
        const st1 = stars[0];
        if (st1 && rec.ocean.visible) rec.ocean.material.uniforms.sunDir.value.set(st1.px - b.px, st1.py - b.py, st1.pz - b.pz).normalize();
      }
      if (rec.clouds) rec.clouds.material.opacity = 0.95 * Math.min(1, 0.25 + (b.atmoP || 0) * 1.2) * (b.water > 0.02 ? 1 : 0.55);
      if (rec.night) {
        rec.night.rotation.y = rec.surf ? rec.surf.rotation.y : 0;
        const st0 = stars[0];
        if (st0) rec.night.material.uniforms.sunDir.value.set(st0.px - b.px, st0.py - b.py, st0.pz - b.pz).normalize();
      }
      if (rec.disk) { rec.disk.rotation.z += 0.4 * (dtReal || 0.016); rec.disk.scale.setScalar(1); }
      if (rec.starMat) {
        rec.starMat.uniforms.time.value = this.time;
        rec.starMat.uniforms.act.value = Math.max(0.12, b.flare || 0.25);
        if (rec.corona) {
          const puls = 1 + 0.035 * Math.sin(this.time * 1.7 + b.seed);
          rec.corona.scale.setScalar(3.2 * puls);
          rec.corona.material.rotation = this.time * 0.03;
          rec.corona.material.opacity = 0.34 + 0.26 * (b.flare || 0.25);
        }
        this.starActivity(b, rec, dtReal || 0.016, R);
      }
      // 용암 분출 (뜨겁거나 조석 가열된 천체)
      if (!b.isStar() && b.cat !== 'bh' && (b.T > 1100 || b.tidal > 0.22) && Math.random() < 0.16) {
        const u = Math.random() * 2 - 1, th = Math.random() * 6.2832, rr = Math.sqrt(1 - u * u);
        const dx = rr * Math.cos(th), dy = u, dz = rr * Math.sin(th);
        this.jet(b.px + dx * b.r, b.py + dy * b.r, b.pz + dz * b.r,
          [dx, dy, dz], R * (0.3 + Math.random() * 0.45), 0xff8a30, 1.25);
      }
      if (rec.glow) {
        const k = rec.glowK * (b.cat === 'bh' ? 5 : (b.isStar() ? 1.55 : 2.4));
        rec.glow.scale.setScalar(k);
        rec.glow.material.color.setHex(b.cat === 'bh' ? 0xffa040 : b.col);
        // 고온 천체는 더 밝게
        rec.glow.material.opacity = b.isStar() ? 0.42 : Math.min(0.9, (b.T > 800 ? (b.T - 800) / 2500 : 0) + b.tidal * 0.6);
        rec.glow.visible = rec.glow.material.opacity > 0.01;
      }
      if (rec.tail) {
        // 태양 반대 방향 꼬리
        const st = stars[0];
        if (st) {
          const dx = b.px - st.px, dy = b.py - st.py, dz = b.pz - st.pz;
          const d = Math.hypot(dx, dy, dz) || 1;
          const k = Math.min(60, 30 * Math.pow(149600 / Math.max(d, 1e3), 0.7));
          rec.tail.position.set(dx / d * k * 0.5, dy / d * k * 0.5, dz / d * k * 0.5);
          rec.tail.scale.set(k * 1.4, k * 1.4, 1);
          rec.tail.material.opacity = Math.min(0.65, k / 90);
        }
      }
      // 표면 온도 → 자체 발광 (용암/항성)
      if (rec.surf && rec.surf.material.emissive && !rec.starMat && !b.isStar() && b.cat !== 'bh') {
        const hot = Math.max(0, Math.min(1, (b.T - 700) / 2200 + b.tidal * 0.5));
        rec.surf.material.emissive.setRGB(hot * 1.0, hot * 0.32, hot * 0.08);
        rec.surf.material.emissiveIntensity = hot;
      }
      // 궤적
      if (this.showTrails) {
        const tr = b.trail;
        const pa = rec.trail.geometry.attributes.position;
        const n = Math.min(tr.length, this.trailLen);
        for (let k = 0; k < n; k++) {
          const p = tr[tr.length - n + k];
          pa.setXYZ(k, p[0] - O.x, p[1] - O.y, p[2] - O.z);
        }
        pa.needsUpdate = true;
        rec.trail.geometry.setDrawRange(0, n);
        rec.trail.visible = n > 2;
      } else rec.trail.visible = false;
    }
    // 삭제된 천체 정리
    for (const uid of Array.from(this.meshes.keys())) if (!seen.has(uid)) this.dispose(uid);

    // 파편 인스턴싱 (차가운 파편 / 뜨거운 파편 분리)
    const D = sim.debris;
    let nc = 0, nh = 0;
    const maxC = this.debInst.instanceMatrix.count, maxH = this.debHot.instanceMatrix.count;
    for (let i = 0; i < D.length; i++) {
      const d = D[i];
      const r = Math.max(d.r * this.sizeScale, this.dist * ((d.T > 1200 || d.x.hot) ? 0.0018 : 0.001));
      this._m4.compose(new V3(d.px - O.x, d.py - O.y, d.pz - O.z), this._q, this._s.setScalar(r));
      if (d.T > 1200 || d.x.hot) {
        if (nh >= maxH) continue;
        this.debHot.setMatrixAt(nh, this._m4);
        const bb = root.REALTEX ? REALTEX.blackbody(d.T) : [1, .6, .3];
        const boost = Math.min(6, 1 + Math.log10(Math.max(1, d.T)) * 0.8);
        this._col.setRGB(bb[0] * boost, bb[1] * boost, bb[2] * boost);
        this.debHot.setColorAt(nh, this._col);
        nh++;
      } else {
        if (nc >= maxC) continue;
        this.debInst.setMatrixAt(nc, this._m4); nc++;
      }
    }
    this.debInst.count = nc; this.debHot.count = nh;
    this.debInst.instanceMatrix.needsUpdate = true;
    this.debHot.instanceMatrix.needsUpdate = true;
    if (this.debHot.instanceColor) this.debHot.instanceColor.needsUpdate = true;

    this.updateHelpers(sim, sel);
    this.updateFx(dtReal);

    // 카메라 배치
    const cp = this.camPos();
    this.cam.position.set(cp.x - O.x, cp.y - O.y, cp.z - O.z);
    this.cam.lookAt(0, 0, 0);
    this.cam.near = Math.max(1e-6, this.dist * 1e-4);
    this.cam.far = Math.max(this.dist * 1e5, 1e7);
    this.cam.updateProjectionMatrix();
    this.sky.position.copy(this.cam.position);
    this.sky.scale.setScalar(-this.cam.far * 0.4);
    this.sky.scale.x *= -1;
    this.stars.position.copy(this.cam.position);
    this.stars.scale.setScalar(this.cam.far * 0.36);
  };

  // ---------- 보조 시각화 ----------
  Renderer.prototype.circle = function (radius, color, segs) {
    const n = segs || 96, pts = [];
    for (let i = 0; i <= n; i++) { const a = i / n * 6.2832; pts.push(new V3(Math.cos(a) * radius, 0, Math.sin(a) * radius)); }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }));
  };

  Renderer.prototype.updateHelpers = function (sim, sel) {
    const O = this.origin;
    // 로슈 한계 링
    while (this.rocheGroup.children.length) { const c = this.rocheGroup.children.pop(); c.geometry.dispose(); this.rocheGroup.remove(c); }
    if (this.showRoche) {
      const big = sim.bodies.filter(b => b.m > 0).sort((a, c) => c.m - a.m).slice(0, 6);
      for (const M of big) {
        // 기준: 밀도 3000 kg/m^3 의 천체가 붕괴하는 거리
        const probe = { density: () => 3000, r: 0 };
        const rl = 2.44 * M.r * Math.pow(M.density() / 3000, 1 / 3);
        const rg = 1.26 * M.r * Math.pow(M.density() / 3000, 1 / 3);
        if (!isFinite(rl) || rl < M.r * 1.02) continue;
        const c1 = this.circle(rl, 0x5ff0ff); c1.material.opacity = 0.22;
        const c2 = this.circle(rg, 0xff6b7d); c2.material.opacity = 0.4;
        c1.position.set(M.px - O.x, M.py - O.y, M.pz - O.z);
        c2.position.copy(c1.position);
        this.rocheGroup.add(c1); this.rocheGroup.add(c2);
      }
    }
    // 속도 벡터
    while (this.vecGroup.children.length) { const c = this.vecGroup.children.pop(); c.geometry.dispose(); this.vecGroup.remove(c); }
    if (this.showVectors) {
      const pts = [];
      for (const b of sim.bodies) {
        const k = this.dist * 0.06 / Math.max(1e-6, Math.hypot(b.vx, b.vy, b.vz) || 1) * Math.min(1, Math.hypot(b.vx, b.vy, b.vz) * 30);
        pts.push(new V3(b.px - O.x, b.py - O.y, b.pz - O.z));
        pts.push(new V3(b.px - O.x + b.vx * k * 60, b.py - O.y + b.vy * k * 60, b.pz - O.z + b.vz * k * 60));
      }
      if (pts.length) {
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        this.vecGroup.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffcf6b, transparent: true, opacity: 0.65 })));
      }
    }
    // 거주가능영역
    if (this.hzMesh) { this.helpers.remove(this.hzMesh); this.hzMesh.geometry.dispose(); this.hzMesh = null; }
    if (this.showHZ) {
      const st = sim.bodies.filter(b => b.isStar()).sort((a, c) => c.lum() - a.lum())[0];
      if (st) {
        const L = Math.max(1e-6, st.lum());
        const rin = Math.sqrt(L / 1.1) * 149600, rout = Math.sqrt(L / 0.53) * 149600;
        const g = new THREE.RingGeometry(rin, rout, 128, 1);
        const m = new THREE.MeshBasicMaterial({ color: 0x4bffa0, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false });
        const mesh = new THREE.Mesh(g, m); mesh.rotation.x = Math.PI / 2;
        mesh.position.set(st.px - O.x, st.py - O.y, st.pz - O.z);
        this.hzMesh = mesh; this.helpers.add(mesh);
      }
    }
    // 중력장 격자
    if (this.gridMesh) { this.helpers.remove(this.gridMesh); this.gridMesh.geometry.dispose(); this.gridMesh = null; }
    if (this.showGrid) {
      const N = 34, span = this.dist * 2.2, half = span / 2, pts = [];
      const pot = (x, z) => {
        let p = 0;
        for (const b of sim.bodies) {
          const d = Math.hypot(x + O.x - b.px, O.y - b.py, z + O.z - b.pz);
          p += b.m / Math.max(d, b.r * 1.1);
        }
        return -Math.min(span * 0.28, p * 6.674e-5 / (this.dist * 3e-7) * 1e-4);
      };
      for (let i = 0; i <= N; i++) {
        for (let j = 0; j < N; j++) {
          const x0 = -half + span * (j / N), x1 = -half + span * ((j + 1) / N), z = -half + span * (i / N);
          pts.push(new V3(x0, pot(x0, z), z), new V3(x1, pot(x1, z), z));
          pts.push(new V3(z, pot(z, x0), x0), new V3(z, pot(z, x1), x1));
        }
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      this.gridMesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x5ff0ff, transparent: true, opacity: 0.14 }));
      this.helpers.add(this.gridMesh);
    }
    // 선택 표시
    if (!this.selRing) {
      this.selRing = this.circle(1, 0x5ff0ff, 64); this.selRing.material.opacity = 0.9;
      this.selRing2 = this.circle(1, 0x5ff0ff, 64); this.selRing2.material.opacity = 0.5;
      this.selRing2.rotation.x = Math.PI / 2;
      this.helpers.add(this.selRing); this.helpers.add(this.selRing2);
    }
    if (sel && sel.alive) {
      const R = this.visRadius(sel) * 1.6;
      this.selRing.visible = this.selRing2.visible = true;
      this.selRing.position.set(sel.px - O.x, sel.py - O.y, sel.pz - O.z);
      this.selRing2.position.copy(this.selRing.position);
      this.selRing.scale.setScalar(R); this.selRing2.scale.setScalar(R);
      this.selRing.lookAt(this.cam.position);
      this.selRing.rotateX(Math.PI / 2);
    } else this.selRing.visible = this.selRing2.visible = false;
  };

  /* 항성 표면 활동: 홍염(prominence)과 플레어 */
  Renderer.prototype.starActivity = function (b, rec, dt, R) {
    if (!rec.proms) rec.proms = [];
    const act = Math.max(0.1, b.flare || 0.25);
    if (rec.proms.length < 7 && Math.random() < dt * (2.2 + act * 6.0)) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: TEX.flameTex((Math.random() * 8) | 0), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0
      }));
      const u = Math.random() * 2 - 1, th = Math.random() * 6.2832, rr = Math.sqrt(1 - u * u);
      sp.userData = {
        d: new V3(rr * Math.cos(th), u, rr * Math.sin(th)),
        t: 0, life: 1.8 + Math.random() * 2.6,
        h: 0.22 + Math.random() * 0.55 * (0.5 + act)
      };
      this.scene.add(sp); rec.proms.push(sp);
    }
    for (let i = rec.proms.length - 1; i >= 0; i--) {
      const sp = rec.proms[i], u = sp.userData;
      u.t += dt;
      const k = u.t / u.life;
      if (k >= 1) { this.scene.remove(sp); rec.proms.splice(i, 1); continue; }
      const grow = Math.sin(Math.min(1, k * 1.15) * Math.PI);
      const h = R * u.h * grow, w = h * 0.75;
      const c = rec.root.position;
      sp.position.set(c.x + u.d.x * (R + h * 0.42), c.y + u.d.y * (R + h * 0.42), c.z + u.d.z * (R + h * 0.42));
      sp.scale.set(w * 2.2, h * 2.2, 1);
      sp.material.opacity = 0.85 * grow;
      const a = this.project(sp.position.x + this.origin.x, sp.position.y + this.origin.y, sp.position.z + this.origin.z);
      const o2 = this.project(c.x + this.origin.x, c.y + this.origin.y, c.z + this.origin.z);
      sp.material.rotation = Math.atan2(a.x - o2.x, -(a.y - o2.y));
    }
  };

  /* 용암·가스 분출 */
  Renderer.prototype.jet = function (x, y, z, dir, size, color, life) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TEX.flameTex((Math.random() * 8) | 0), color: color || 0xff9040,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9
    }));
    sp.position.set(x - this.origin.x, y - this.origin.y, z - this.origin.z);
    sp.userData = { wx: x, wy: y, wz: z, r0: size, t: 0, life: life || 0.9, jet: 1, d: dir };
    sp.scale.set(size, size, 1);
    this.fxGroup.add(sp); this.fx.push(sp);
    if (this.fx.length > 90) { const o = this.fx.shift(); this.fxGroup.remove(o); }
  };

  /* 초신성 충격파 */
  Renderer.prototype.shockwave = function (x, y, z, r0, life) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TEX.shockTex(), color: 0xffffff, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1
    }));
    sp.position.set(x - this.origin.x, y - this.origin.y, z - this.origin.z);
    sp.userData = { wx: x, wy: y, wz: z, r0: r0, t: 0, life: life || 3.2, shock: 1 };
    this.fxGroup.add(sp); this.fx.push(sp);
    const fl = new THREE.PointLight(0xfff0d0, 0, 0, 0);
    fl.position.set(x - this.origin.x, y - this.origin.y, z - this.origin.z);
    this.scene.add(fl);
    this.flash = { light: fl, t: 0, life: 2.4, wx: x, wy: y, wz: z };
  };

  // ---------- 이펙트 ----------
  Renderer.prototype.boom = function (x, y, z, r, color, life) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TEX.glowTex(0.1), color: color || 0xffaa44, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1
    }));
    s.position.set(x - this.origin.x, y - this.origin.y, z - this.origin.z);
    s.userData = { wx: x, wy: y, wz: z, r0: r, t: 0, life: life || 0.9 };
    s.scale.setScalar(r * 2);
    this.fxGroup.add(s); this.fx.push(s);
    if (this.fx.length > 60) { const o = this.fx.shift(); this.fxGroup.remove(o); }
  };
  Renderer.prototype.updateFx = function (dt) {
    dt = dt || 0.016;
    const O = this.origin;
    this.time += dt;
    if (this.flash) {
      const f = this.flash;
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1) { this.scene.remove(f.light); this.flash = null; }
      else {
        f.light.position.set(f.wx - O.x, f.wy - O.y, f.wz - O.z);
        f.light.intensity = 40 * Math.pow(1 - k, 2.5);
        f.light.distance = 0;
      }
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const s = this.fx[i], u = s.userData;
      u.t += dt;
      const k = u.t / u.life;
      if (k >= 1) { this.fxGroup.remove(s); this.fx.splice(i, 1); continue; }
      s.position.set(u.wx - O.x, u.wy - O.y, u.wz - O.z);
      if (u.shock) {
        const g = Math.pow(k, 0.55);
        s.scale.setScalar(u.r0 * (3 + g * 90));
        s.material.opacity = (1 - k) * (1 - k) * 1.0;
      } else if (u.jet) {
        const g = Math.sin(Math.min(1, k * 1.2) * Math.PI);
        s.scale.set(u.r0 * (0.8 + k * 1.1), u.r0 * (1 + k * 2.4), 1);
        s.material.opacity = 0.9 * g;
        if (u.d) {
          const a = this.project(u.wx + u.d[0], u.wy + u.d[1], u.wz + u.d[2]);
          const o2 = this.project(u.wx, u.wy, u.wz);
          s.material.rotation = Math.atan2(a.x - o2.x, -(a.y - o2.y));
        }
      } else {
        s.scale.setScalar(u.r0 * (2 + k * 14));
        s.material.opacity = (1 - k) * 0.95;
      }
    }
  };

  // ---------- 화면 투영 (라벨/피킹) ----------
  Renderer.prototype.project = function (x, y, z) {
    const v = new V3(x - this.origin.x, y - this.origin.y, z - this.origin.z);
    v.project(this.cam);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, z: v.z, vis: v.z < 1 };
  };
  Renderer.prototype.pick = function (sim, sx, sy, radiusPx) {
    let best = null, bd = radiusPx || 34;
    for (const b of sim.bodies) {
      const p = this.project(b.px, b.py, b.pz);
      if (!p.vis) continue;
      const d = Math.hypot(p.x - sx, p.y - sy);
      const rr = Math.max(bd, this.projRadiusPx(b));
      if (d < rr && d < bd + this.projRadiusPx(b)) { if (!best || d < best.d) best = { b, d }; }
    }
    return best ? best.b : null;
  };
  Renderer.prototype.projRadiusPx = function (b) {
    const d = Math.hypot(this.camPos().x - b.px, this.camPos().y - b.py, this.camPos().z - b.pz);
    const R = this.visRadius(b);
    return (R / Math.max(d, 1e-6)) / (2 * Math.tan(this.cam.fov * Math.PI / 360)) * innerHeight;
  };
  /* 화면 좌표 → 카메라 초점 평면 위 3D 위치 */
  Renderer.prototype.unproject = function (sx, sy, depth) {
    const ndc = new THREE.Vector3((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1, 0.5);
    ndc.unproject(this.cam);
    const camLocal = this.cam.position.clone();
    const dir = ndc.sub(camLocal).normalize();
    const t = depth != null ? depth : this.dist;
    const p = camLocal.clone().addScaledVector(dir, t);
    return new V3(p.x + this.origin.x, p.y + this.origin.y, p.z + this.origin.z);
  };

  Renderer.prototype.render = function () {
    if (this.bloomOn && this.composer) this.composer.render();
    else this.gl.render(this.scene, this.cam);
  };

  root.Renderer = Renderer;
})(window);
