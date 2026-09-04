// 지오메트리 생성 헬퍼. 박스 UV를 실제 크기에 맞춰 타일링하고
// 버텍스 컬러로 색을 실어 여러 오브젝트를 하나의 머티리얼로 병합할 수 있게 한다.

import { BoxGeometry, PlaneGeometry, CylinderGeometry, Color, Float32BufferAttribute } from 'three';

const _c = new Color();

/**
 * BoxGeometry의 각 면 UV를 월드 크기에 비례하도록 스케일한다.
 * 면 순서: +X, -X, +Y, -Y, +Z, -Z (각 4버텍스)
 */
export function scaleBoxUV(geo, w, h, d, tile = 2) {
  const uv = geo.attributes.uv;
  const su = [d, d, w, w, w, w];
  const sv = [h, h, d, d, h, h];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * (su[f] / tile), uv.getY(k) * (sv[f] / tile));
    }
  }
  uv.needsUpdate = true;
  return geo;
}

export function setVertexColor(geo, color) {
  _c.set(color).convertSRGBToLinear();
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new Float32BufferAttribute(arr, 3));
  return geo;
}

/** 위치·크기·색이 적용된 박스 지오메트리 */
export function box(x, y, z, w, h, d, color, tile = 2) {
  const g = new BoxGeometry(w, h, d);
  scaleBoxUV(g, w, h, d, tile);
  setVertexColor(g, color);
  g.translate(x, y, z);
  return g;
}

/** Y축 회전이 적용된 박스 */
export function boxRot(x, y, z, w, h, d, rotY, color, tile = 2) {
  const g = new BoxGeometry(w, h, d);
  scaleBoxUV(g, w, h, d, tile);
  setVertexColor(g, color);
  g.rotateY(rotY);
  g.translate(x, y, z);
  return g;
}

export function plane(x, y, z, w, d, color, tile = 2) {
  const g = new PlaneGeometry(w, d, 1, 1);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / tile), uv.getY(i) * (d / tile));
  g.rotateX(-Math.PI / 2);
  setVertexColor(g, color);
  g.translate(x, y, z);
  return g;
}

export function cylinder(x, y, z, rTop, rBot, h, seg, color, tile = 2) {
  const g = new CylinderGeometry(rTop, rBot, h, seg, 1);
  const uv = g.attributes.uv;
  const circ = Math.PI * (rTop + rBot);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (circ / tile), uv.getY(i) * (h / tile));
  setVertexColor(g, color);
  g.translate(x, y, z);
  return g;
}

/**
 * 경사면 시각 메시 — 두 높이 사이를 잇는 램프.
 * 충돌은 별도의 계단형 박스로 처리한다(스텝업이 자연스럽게 흡수).
 */
export function ramp(x, z, w, len, y0, y1, dirZ, color, tile = 2) {
  const g = new PlaneGeometry(w, len, 1, 1);
  const pos = g.attributes.position;
  // PlaneGeometry는 XY 평면. 회전 전에 Z를 높이로 쓰기 위해 수동 배치.
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / tile), uv.getY(i) * (len / tile));
  const half = len / 2;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i);
    // rotateX(-90°)와 동일한 매핑(z = -y)이라야 노멀이 위를 향한다.
    const zz = -py;
    const t = (zz + half) / len;              // z=-half에서 0, z=+half에서 1
    const hh = dirZ > 0 ? y0 + (y1 - y0) * t : y1 + (y0 - y1) * t;
    pos.setXYZ(i, px, hh, zz);
  }
  g.computeVertexNormals();
  setVertexColor(g, color);
  g.translate(x, 0, z);
  return g;
}
