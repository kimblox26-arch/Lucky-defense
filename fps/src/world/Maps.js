// 맵 프리셋. Arena가 이 config를 받아 크기·색조·프롭 밀도를 구성한다.
// palette는 Lighting.applyMapPalette로 전달되어 하늘/태양/안개 색을 정한다.

export const MAPS = [
  {
    id: 'quarantine',
    name: '격리 구역',
    desc: '콤팩트한 폐쇄 안뜰. 근접전이 잦고 템포가 빠르다.',
    size: '표준', difficulty: '보통',
    half: 30, wallH: 7, gateW: 9, density: 1.0,
    thumb: ['#7c8a63', '#39432d'],
    palette: {
      zenith: 0x3b78c4, horizon: 0xd3e0e8, ground: 0x76705c,
      sun: 0xfff3d8, sunColor: 0xfff2dc, sunI: 3.4,
      hemiSky: 0xbcd7f0, hemiGround: 0x6a5f4a, hemiI: 1.28,
      haze: 0.72, fog: 0xaec3d4, fogD: 0.0072,
      moodHorizon: 0xe6a85a, moodZenith: 0x2c548a, moodHaze: 1.3, moodFog: 0xc7a878,
    },
  },
  {
    id: 'factory',
    name: '폐공장 지대',
    desc: '거대한 야외 공장. 컨테이너와 배관이 얽힌 넓은 전장.',
    size: '대형', difficulty: '어려움',
    half: 44, wallH: 8, gateW: 11, density: 1.5,
    thumb: ['#a5824f', '#463523'],
    palette: {
      zenith: 0x4a7bb0, horizon: 0xe4d8c2, ground: 0x8a7a5c,
      sun: 0xfff0cc, sunColor: 0xffe9c4, sunI: 3.5,
      hemiSky: 0xcdd6e0, hemiGround: 0x7a6a50, hemiI: 1.3,
      haze: 0.95, fog: 0xd8cbb0, fogD: 0.0062,
      moodHorizon: 0xe89a48, moodZenith: 0x315a86, moodHaze: 1.4, moodFog: 0xcaa878,
    },
  },
  {
    id: 'yard',
    name: '개활 야적장',
    desc: '탁 트인 초대형 부지. 엄폐물이 드물어 사거리 관리가 관건.',
    size: '초대형', difficulty: '극악',
    half: 60, wallH: 8, gateW: 13, density: 1.9,
    thumb: ['#8fb0c8', '#3f5668'],
    palette: {
      zenith: 0x357cc8, horizon: 0xdce8ef, ground: 0x8f8468,
      sun: 0xfff6e0, sunColor: 0xfff4dc, sunI: 3.6,
      hemiSky: 0xc6ddf2, hemiGround: 0x807356, hemiI: 1.34,
      haze: 0.6, fog: 0xbcd0de, fogD: 0.0048,
      moodHorizon: 0xefb35e, moodZenith: 0x2b568c, moodHaze: 1.25, moodFog: 0xc9b088,
    },
  },
];

export function mapById(id) {
  return MAPS.find((m) => m.id === id) || MAPS[0];
}
