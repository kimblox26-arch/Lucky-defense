// "격리 구역 7" — 4개의 게이트로 좀비가 밀려드는 폐쇄 안뜰.
// 정적 지오메트리를 머티리얼별로 병합해 드로우콜을 최소화한다.

import {
  Mesh, MeshStandardMaterial, Group, InstancedMesh, Object3D, Color,
  DoubleSide, PointLight, Vector3, MathUtils,
  BoxGeometry, CylinderGeometry, PlaneGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Surfaces } from '../core/Textures.js';
import { SURFACE } from './Collision.js';
import { box, boxRot, plane, cylinder, ramp, scaleBoxUV, setVertexColor } from './GeoUtil.js';
import { Rng } from '../core/Util.js';

export const ARENA = {
  half: 30,          // 벽 중심선까지의 거리
  wallH: 7,
  wallT: 1,
  gateW: 9,          // 게이트 개구부 폭
  platHalf: 7,
  platH: 1.8,
  navMin: -42,
  navMax: 42,
};

// 알베도(sRGB). 맵이 디테일만 담당하므로 여기가 실제 표면색이 된다.
const COL = {
  ground: '#57534c',
  concrete: '#b6b0a4',
  concreteDark: '#8b857a',
  concreteLight: '#d0c9bb',
  wallStripe: '#e0bf35',
  metal: '#9b948a',
  rust: '#9c6039',
  crate: '#a97c46',
  containerA: '#a24a32',
  containerB: '#37718c',
  containerC: '#66754f',
  containerD: '#c07726',
  containerE: '#828790',
  lamp: '#ffd28a',
};

export class Arena {
  constructor(engine, collision) {
    this.engine = engine;
    this.collision = collision;
    this.group = new Group();
    this.group.name = 'arena';
    this.spawnPoints = [];
    this.gates = [];
    this.lights = [];
    this.playerStart = new Vector3(0, 0, 16);
    this._rng = new Rng(20260904);
  }

  _mat(surfaceSet, opts = {}) {
    const s = surfaceSet();
    const m = new MeshStandardMaterial({
      map: s.map,
      normalMap: s.normalMap,
      roughnessMap: s.roughnessMap,
      vertexColors: true,
      metalness: opts.metalness ?? 0.05,
      roughness: opts.roughness ?? 1.0,
      envMapIntensity: opts.envMapIntensity ?? 0.7,
      ...opts.extra,
    });
    const aniso = Math.min(this.engine.maxAniso, this.engine.quality.anisotropy);
    for (const t of [s.map, s.normalMap, s.roughnessMap]) if (t) t.anisotropy = aniso;
    return m;
  }

  build() {
    this.matGround = this._mat(Surfaces.asphalt, { roughness: 1, metalness: 0.02, envMapIntensity: 0.45 });
    this.matConcrete = this._mat(Surfaces.concrete, { roughness: 0.95, metalness: 0.03, envMapIntensity: 0.6 });
    this.matMetal = this._mat(Surfaces.rustMetal, { roughness: 0.8, metalness: 0.45, envMapIntensity: 1.0 });
    this.matPainted = this._mat(Surfaces.paintedMetal, { roughness: 0.62, metalness: 0.35, envMapIntensity: 1.0 });

    this._ground();
    const concrete = [];
    const metal = [];
    const painted = [];

    this._walls(concrete, painted);
    this._platform(concrete);
    this._containers(painted);
    this._barriers(concrete);
    this._tower(concrete, metal);
    this._pipes(metal);
    this._props();
    this._floodlights(metal);

    this._addMerged(concrete, this.matConcrete, 'concrete');
    this._addMerged(metal, this.matMetal, 'metal');
    this._addMerged(painted, this.matPainted, 'painted');

    this.collision.build();
    this.engine.scene.add(this.group);
    return this;
  }

  _addMerged(geos, material, name) {
    if (!geos.length) return null;
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    merged.computeBoundingSphere();
    const mesh = new Mesh(merged, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    this.group.add(mesh);
    return mesh;
  }

  /** 시각 박스 + 충돌 박스를 함께 추가 */
  _solid(list, x, y, z, w, h, d, color, surface = SURFACE.CONCRETE, tile = 2) {
    list.push(box(x, y, z, w, h, d, color, tile));
    this.collision.addBox(x, y, z, w / 2, h / 2, d / 2, surface);
  }

  _solidRot(list, x, y, z, w, h, d, rotY, color, surface = SURFACE.CONCRETE, tile = 2) {
    list.push(boxRot(x, y, z, w, h, d, rotY, color, tile));
    // 90도 회전만 사용하므로 AABB를 그대로 스왑
    const near90 = Math.abs(Math.abs(rotY) - Math.PI / 2) < 0.01;
    if (near90) this.collision.addBox(x, y, z, d / 2, h / 2, w / 2, surface);
    else this.collision.addBox(x, y, z, w / 2, h / 2, d / 2, surface);
  }

  _ground() {
    const g = plane(0, 0, 0, 110, 110, COL.ground, 4);
    const mesh = new Mesh(g, this.matGround);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.name = 'ground';
    this.group.add(mesh);
    // 바닥 충돌: 아주 두꺼운 박스 (아래로 떨어지지 않게)
    this.collision.addBox(0, -5, 0, 60, 5, 60, SURFACE.CONCRETE);
  }

  _walls(concrete, painted) {
    const { half, wallH, wallT, gateW } = ARENA;
    const g = gateW / 2;
    const segLen = half - g;

    // 4면 × 각 2세그먼트. dir: 0=N(-Z) 1=S(+Z) 2=W(-X) 3=E(+X)
    const dirs = [
      { n: 'N', ax: 'z', sign: -1 },
      { n: 'S', ax: 'z', sign: 1 },
      { n: 'W', ax: 'x', sign: -1 },
      { n: 'E', ax: 'x', sign: 1 },
    ];

    for (const d of dirs) {
      for (const s of [-1, 1]) {
        const centerAlong = s * (g + segLen / 2);
        const px = d.ax === 'z' ? centerAlong : d.sign * half;
        const pz = d.ax === 'z' ? d.sign * half : centerAlong;
        const w = d.ax === 'z' ? segLen : wallT;
        const dd = d.ax === 'z' ? wallT : segLen;
        this._solid(concrete, px, wallH / 2, pz, w, wallH, dd, COL.concrete, SURFACE.CONCRETE, 2.5);
        // 상단 캡
        concrete.push(box(px, wallH + 0.16, pz, w + 0.35, 0.32, dd + 0.35, COL.concreteLight, 2));
      }

      // 게이트 기둥 + 상인방
      for (const s of [-1, 1]) {
        const px = d.ax === 'z' ? s * g : d.sign * half;
        const pz = d.ax === 'z' ? d.sign * half : s * g;
        const w = d.ax === 'z' ? 1.1 : wallT + 0.5;
        const dd = d.ax === 'z' ? wallT + 0.5 : 1.1;
        this._solid(concrete, px, wallH / 2 + 0.3, pz, w, wallH + 0.6, dd, COL.concreteLight, SURFACE.CONCRETE, 2);
      }
      const lx = d.ax === 'z' ? 0 : d.sign * half;
      const lz = d.ax === 'z' ? d.sign * half : 0;
      const lw = d.ax === 'z' ? gateW : wallT + 0.4;
      const ld = d.ax === 'z' ? wallT + 0.4 : gateW;
      this._solid(concrete, lx, wallH - 0.5, lz, lw, 1.6, ld, COL.concreteLight, SURFACE.CONCRETE, 2);
      // 경고 스트라이프
      painted.push(box(lx, wallH - 1.45, lz, lw, 0.3, ld + 0.12, COL.wallStripe, 2));

      // 게이트 밖 스폰 위치 (3지점)
      const outward = d.ax === 'z' ? new Vector3(0, 0, d.sign) : new Vector3(d.sign, 0, 0);
      const lateral = d.ax === 'z' ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1);
      const gate = {
        name: d.n,
        center: new Vector3(lx, 0, lz),
        outward,
        lateral,
        spawns: [],
      };
      for (const off of [-2.6, 0, 2.6]) {
        const p = new Vector3(lx, 0, lz)
          .addScaledVector(outward, 5.5)
          .addScaledVector(lateral, off);
        gate.spawns.push(p);
        this.spawnPoints.push({ pos: p, gate });
      }
      this.gates.push(gate);

      // 게이트 바깥 접근로 (짧은 통로 벽)
      for (const s of [-1, 1]) {
        const bx = d.ax === 'z' ? s * (g + 0.5) : d.sign * (half + 5);
        const bz = d.ax === 'z' ? d.sign * (half + 5) : s * (g + 0.5);
        const bw = d.ax === 'z' ? wallT : 10;
        const bd = d.ax === 'z' ? 10 : wallT;
        this._solid(concrete, bx, 2.2, bz, bw, 4.4, bd, COL.concreteDark, SURFACE.CONCRETE, 2.5);
      }
      // 통로 끝 마감벽 (스폰 지점 뒤)
      const ex = d.ax === 'z' ? 0 : d.sign * (half + 10);
      const ez = d.ax === 'z' ? d.sign * (half + 10) : 0;
      const ew = d.ax === 'z' ? gateW + 2 : wallT;
      const ed = d.ax === 'z' ? wallT : gateW + 2;
      this._solid(concrete, ex, 2.2, ez, ew, 4.4, ed, COL.concreteDark, SURFACE.CONCRETE, 2.5);
    }
  }

  _platform(concrete) {
    const { platHalf: p, platH: h } = ARENA;
    this._solid(concrete, 0, h / 2, 0, p * 2, h, p * 2, COL.concreteLight, SURFACE.CONCRETE, 3);
    // 가장자리 몰딩
    concrete.push(box(0, h + 0.07, 0, p * 2 + 0.5, 0.14, p * 2 + 0.5, COL.concrete, 3));

    // 북/남 램프 (시각 메시 + 계단형 충돌)
    const rampLen = 5;
    for (const dir of [-1, 1]) {
      const z0 = dir * (p + rampLen);   // 아래쪽 끝
      const zc = dir * (p + rampLen / 2);
      const g = ramp(0, zc, 6, rampLen, dir > 0 ? h : 0, dir > 0 ? 0 : h, 1, COL.concrete, 2.5);
      concrete.push(g);
      // 계단형 충돌 (16단 → 단차 0.11, 스텝업이 자연스럽게 흡수)
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.5) / steps;                 // 0=바깥, 1=플랫폼쪽
        const zz = dir * (p + rampLen * (1 - t));
        const hh = h * t;
        this.collision.addBox(0, hh / 2, zz, 3, hh / 2, (rampLen / steps) / 2 + 0.02, SURFACE.CONCRETE);
      }
      // 램프 측벽
      for (const s of [-1, 1]) {
        this._solid(concrete, s * 3.25, 0.45, zc, 0.5, 0.9, rampLen, COL.concreteDark, SURFACE.CONCRETE, 2);
      }
    }

    // 플랫폼 위 낮은 엄폐물
    for (const [x, z] of [[-4.6, -4.6], [4.6, 4.6], [-4.6, 4.6], [4.6, -4.6]]) {
      this._solid(concrete, x, h + 0.55, z, 2.4, 1.1, 0.6, COL.concreteDark, SURFACE.CONCRETE, 1.5);
    }
  }

  _containers(painted) {
    // [x, z, rotY, y(적재 높이), 색]
    const list = [
      [-17, -13, 0, 0, COL.containerA],
      [-17, -13, 0, 2.62, COL.containerB],
      [-17.6, -19.2, Math.PI / 2, 0, COL.containerC],
      [13.5, -17, Math.PI / 2, 0, COL.containerD],
      [19.5, -10.5, 0, 0, COL.containerB],
      [-20, 11, Math.PI / 2, 0, COL.containerE],
      [-13.5, 18.5, 0, 0, COL.containerA],
      [16, 15, Math.PI / 2, 0, COL.containerC],
      [16, 15, Math.PI / 2, 2.62, COL.containerD],
      [1.5, -22.5, 0, 0, COL.containerE],
      [-2.5, 23, 0, 0, COL.containerB],
      [22.5, 3, Math.PI / 2, 0, COL.containerA],
    ];
    const L = 6.1, H = 2.6, W = 2.45;
    for (const [x, z, rot, y, color] of list) {
      this._solidRot(painted, x, y + H / 2, z, L, H, W, rot, color, SURFACE.METAL, 2);
      // 골판 리브 — 실루엣에 디테일을 준다
      const ribs = 9;
      for (let i = 0; i < ribs; i++) {
        const t = (i / (ribs - 1) - 0.5) * (L - 0.5);
        const c = new Color(color).multiplyScalar(0.82).getHexString();
        painted.push(boxRot(
          x + Math.cos(rot) * t, y + H / 2, z - Math.sin(rot) * t,
          0.12, H - 0.24, W + 0.06, rot, '#' + c, 1.5,
        ));
      }
      // 상단 프레임
      const c2 = new Color(color).multiplyScalar(0.7).getHexString();
      painted.push(boxRot(x, y + H - 0.06, z, L + 0.1, 0.14, W + 0.1, rot, '#' + c2, 2));
      painted.push(boxRot(x, y + 0.08, z, L + 0.1, 0.16, W + 0.1, rot, '#' + c2, 2));
    }
  }

  _barriers(concrete) {
    const spots = [
      [-8, -18, 0], [-4.5, -18, 0], [8, -19.5, 0.35],
      [10.5, 8, Math.PI / 2], [10.5, 11.5, Math.PI / 2],
      [-10, 6, Math.PI / 2], [-10, 9.5, Math.PI / 2],
      [22, -21, -0.5], [-23, 20, 0.4], [4, 20, 0],
      [7.6, 20, 0], [-22, -6, Math.PI / 2],
    ];
    for (const [x, z, rot] of spots) {
      // 저지 배리어: 아래가 넓고 위가 좁은 2단
      this._solidRot(concrete, x, 0.28, z, 2.3, 0.56, 0.72, rot, COL.concrete, SURFACE.CONCRETE, 1.6);
      concrete.push(boxRot(x, 0.78, z, 2.3, 0.46, 0.4, rot, COL.concreteLight, 1.6));
      this.collision.addBox(
        x, 0.78, z,
        Math.abs(Math.cos(rot)) > 0.7 ? 1.15 : 0.2, 0.23,
        Math.abs(Math.cos(rot)) > 0.7 ? 0.2 : 1.15,
        SURFACE.CONCRETE,
      );
    }
  }

  _tower(concrete, metal) {
    // 남서 코너의 감시탑 — 위험/보상이 있는 저격 포인트
    const tx = -22.5, tz = 22.5, topY = 4.2;
    for (const [ox, oz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
      this._solid(concrete, tx + ox, topY / 2, tz + oz, 0.6, topY, 0.6, COL.concreteDark, SURFACE.CONCRETE, 2);
    }
    this._solid(concrete, tx, topY + 0.2, tz, 5.4, 0.4, 5.4, COL.concreteLight, SURFACE.CONCRETE, 2.5);
    // 난간
    for (const [ox, oz, w, d] of [[0, -2.6, 5.4, 0.2], [0, 2.6, 5.4, 0.2], [-2.6, 0, 0.2, 5.4], [2.6, 0, 0.2, 5.4]]) {
      if (ox === 2.6) continue; // 계단 진입구
      metal.push(box(tx + ox, topY + 0.95, tz + oz, w, 1.1, d, COL.rust, 1.5));
      this.collision.addBox(tx + ox, topY + 0.95, tz + oz, w / 2, 0.55, d / 2, SURFACE.METAL);
    }
    // 계단 (동쪽으로 내려감)
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const sx = tx + 2.7 + (1 - t) * 4.6;
      const hh = topY * t + 0.2;
      metal.push(box(sx, hh / 2, tz, 4.6 / steps + 0.02, hh, 1.5, COL.metal, 1.5));
      this.collision.addBox(sx, hh / 2, tz, (4.6 / steps) / 2 + 0.01, hh / 2, 0.75, SURFACE.METAL);
    }
  }

  _pipes(metal) {
    // 벽을 따라 흐르는 배관 — 공간에 산업적인 밀도를 준다
    for (const [x, z, rot, len] of [
      [-29, -6, 0, 20], [29, 7, 0, 22], [-6, -29, Math.PI / 2, 18], [9, 29, Math.PI / 2, 20],
    ]) {
      for (let i = 0; i < 2; i++) {
        const y = 4.4 + i * 0.75;
        const g = cylinder(0, 0, 0, 0.16, 0.16, len, 10, COL.rust, 1.2);
        g.rotateZ(Math.PI / 2);
        if (Math.abs(rot) > 0.1) g.rotateY(Math.PI / 2);
        g.translate(x + (Math.abs(rot) > 0.1 ? 0 : (i === 0 ? 0.35 : -0.1)), y, z);
        metal.push(g);
      }
      // 배관 브래킷
      for (let i = 0; i < 5; i++) {
        const t = (i / 4 - 0.5) * (len - 2);
        const bx = Math.abs(rot) > 0.1 ? x + t : x;
        const bz = Math.abs(rot) > 0.1 ? z : z + t;
        metal.push(box(bx, 5.0, bz, 0.5, 0.12, 0.5, COL.metal, 1));
      }
    }
  }

  _props() {
    // 나무 상자 — InstancedMesh 하나로 처리
    const crates = [];
    const r = this._rng;
    const clusters = [
      [-12, -6], [11, -8], [-6, 13], [20, 20], [-24, -22], [24, -24],
      [6, -12], [-19, 3], [3, 9], [-3, -9],
    ];
    for (const [cx, cz] of clusters) {
      const n = r.irange(2, 4);
      for (let i = 0; i < n; i++) {
        const s = r.range(0.72, 1.05);
        const x = cx + r.range(-1.4, 1.4);
        const z = cz + r.range(-1.4, 1.4);
        const stacked = i > 0 && r.chance(0.35);
        const y = stacked ? s / 2 + 0.9 : s / 2;
        crates.push({ x, y, z, s, rot: r.range(0, Math.PI * 2) });
      }
    }
    this._makeCrates(crates);
    this._makeBarrels();
  }

  _makeCrates(crates) {
    const geo = new BoxGeometry(1, 1, 1);
    scaleBoxUV(geo, 1, 1, 1, 1);
    setVertexColor(geo, COL.crate);
    const mat = this.matPainted.clone();
    mat.color = new Color(COL.crate).convertSRGBToLinear();
    mat.vertexColors = false;
    mat.roughness = 0.9;
    mat.metalness = 0.02;
    const mesh = new InstancedMesh(geo, mat, crates.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const dummy = new Object3D();
    crates.forEach((c, i) => {
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(0, c.rot, 0);
      dummy.scale.setScalar(c.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const h = c.s / 2;
      this.collision.addBox(c.x, c.y, c.z, h * 0.78, h, h * 0.78, SURFACE.WOOD);
    });
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);
    this.crateMesh = mesh;
  }

  _makeBarrels() {
    const r = this._rng;
    const spots = [];
    const zones = [[-14, -20], [15, -12], [-21, 8], [8, 17], [23, -18], [-25, -10], [0, -15], [-9, 20], [19, 8]];
    for (const [cx, cz] of zones) {
      const n = r.irange(1, 3);
      for (let i = 0; i < n; i++) {
        spots.push({
          x: cx + r.range(-1.2, 1.2),
          z: cz + r.range(-1.2, 1.2),
          rot: r.range(0, Math.PI * 2),
          explosive: r.chance(0.55),
        });
      }
    }
    const geo = new CylinderGeometry(0.34, 0.34, 0.92, 14, 1);
    const mat = this.matMetal.clone();
    mat.vertexColors = false;
    mat.roughness = 0.66;
    mat.metalness = 0.5;
    const mesh = new InstancedMesh(geo, mat, spots.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceColor = null;
    const dummy = new Object3D();
    const cExp = new Color('#a8281c').convertSRGBToLinear();
    const cNorm = new Color('#4d5b4a').convertSRGBToLinear();
    spots.forEach((s, i) => {
      dummy.position.set(s.x, 0.46, s.z);
      dummy.rotation.set(0, s.rot, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, s.explosive ? cExp : cNorm);
      this.collision.addBox(s.x, 0.46, s.z, 0.32, 0.46, 0.32, SURFACE.METAL);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.group.add(mesh);
    this.barrelMesh = mesh;
    this.barrels = spots;
  }

  _floodlights(metal) {
    const spots = [[-20, -20], [20, -20], [-20, 20], [20, 20], [0, 0]];
    for (const [x, z] of spots) {
      const isCenter = x === 0 && z === 0;
      const baseY = isCenter ? ARENA.platH : 0;
      const poleH = isCenter ? 5.5 : 7.2;
      metal.push(cylinder(x, baseY + poleH / 2, z, 0.13, 0.18, poleH, 8, COL.metal, 1.5));
      this.collision.addBox(x, baseY + poleH / 2, z, 0.2, poleH / 2, 0.2, SURFACE.METAL);
      // 램프 헤드
      const head = box(x, baseY + poleH + 0.2, z, 0.9, 0.42, 0.6, '#3a3d40', 1);
      metal.push(head);

      const light = new PointLight(0xffb861, isCenter ? 26 : 20, isCenter ? 24 : 26, 2);
      light.position.set(x, baseY + poleH + 0.05, z);
      light.castShadow = false;
      this.group.add(light);
      this.lights.push({ light, base: light.intensity, phase: Math.random() * 10 });

      // 발광 렌즈 (블룸 소스)
      const lens = new Mesh(
        new PlaneGeometry(0.78, 0.5),
        new MeshStandardMaterial({
          color: 0x110c05, emissive: new Color(COL.lamp), emissiveIntensity: 6,
          roughness: 0.4, metalness: 0, side: DoubleSide, fog: true,
        }),
      );
      lens.position.set(x, baseY + poleH + 0.02, z);
      lens.rotation.x = Math.PI / 2;
      this.group.add(lens);
      this.lights[this.lights.length - 1].lens = lens;
    }
  }

  /** 조명 깜빡임 — 공간에 생동감을 준다 */
  update(t) {
    for (const l of this.lights) {
      const n = Math.sin(t * 9 + l.phase) * Math.sin(t * 3.7 + l.phase * 2.1);
      const flick = n > 0.86 ? MathUtils.lerp(0.25, 1, Math.random()) : 1;
      l.light.intensity = l.base * flick;
      if (l.lens) l.lens.material.emissiveIntensity = 6 * flick;
    }
  }
}
