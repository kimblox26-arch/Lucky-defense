# 텍스처 출처 (Texture Credits)

이 폴더의 모든 표면 맵은 **실제 탐사선·망원경이 촬영한 자료**를 정사영(equirectangular)으로 정리한
공개 데이터셋에서 가져왔습니다. 원 자료는 NASA / JPL-Caltech / USGS Astrogeology / ESA 가 공개한
퍼블릭 도메인 이미지입니다.

| 파일 | 원본 자료 | 경유 배포본 |
|---|---|---|
| `earth.jpg` | NASA Visible Earth — **Blue Marble** (MODIS/Terra) | three.js `examples/textures/planets` |
| `earth_night.jpg` | NASA Earth Observatory — **Earth at Night / City Lights** (DMSP·VIIRS) | three.js |
| `earth_spec.jpg`, `earth_normal` | NASA Blue Marble 파생 반사·법선 맵 | three.js |
| `earth_bump.jpg`, `earth_clouds.jpg` | NASA 지형(SRTM/ETOPO)·구름 관측 자료 파생 | Planet Pixel Emporium |
| `mercury.jpg` | NASA **MESSENGER** 전구 모자이크 | Stellarium |
| `venus.jpg` | NASA **Magellan** 레이더 표면 지도 | Planet Pixel Emporium |
| `moon.jpg`, `moon_bump.jpg` | NASA **Lunar Reconnaissance Orbiter / Clementine** | Planet Pixel Emporium |
| `mars.jpg`, `mars_bump.jpg` | NASA **Viking / MGS MOLA** 전구 모자이크 | Planet Pixel Emporium |
| `jupiter.jpg` | NASA **Cassini / Voyager** 구름 상층 모자이크 | Planet Pixel Emporium |
| `saturn.jpg`, `rings_saturn.png` | NASA **Cassini** 토성·고리 관측 | Planet Pixel Emporium |
| `uranus.jpg`, `neptune.jpg` | NASA **Voyager 2** | Planet Pixel Emporium |
| `pluto.jpg`, `charon.jpg` | NASA **New Horizons** (2015) | Stellarium |
| `io/europa/ganymede/callisto/amalthea` | NASA **Galileo / Voyager** | Stellarium |
| `mimas/enceladus/tethys/dione/rhea/titan/hyperion/iapetus/phoebe` | NASA **Cassini-Huygens** | Stellarium |
| `miranda/ariel/umbriel/titania/oberon` | NASA **Voyager 2** | Stellarium |
| `triton/nereid/proteus` | NASA **Voyager 2** | Stellarium |
| `ceres/vesta` | NASA **Dawn** | Stellarium |
| `bennu` | NASA **OSIRIS-REx** | Stellarium |
| `eros` | NASA **NEAR Shoemaker** | Stellarium |
| `gaspra/ida` | NASA **Galileo** | Stellarium |
| `eris/haumea/sedna` | 관측 기반 추정 표면도 | Stellarium |
| `phobos/deimos` | NASA **Mars Reconnaissance Orbiter / Viking** | Stellarium |
| `sun.jpg` | 태양 광구(백색광) 관측 이미지 | Planet Pixel Emporium |
| `milkyway.jpg` | 은하수 전천 파노라마 (지상 광시야 촬영 합성) | Stellarium |

- Stellarium: <https://github.com/Stellarium/stellarium> (GPL, 텍스처는 NASA/USGS 공개 자료 기반)
- Planet Pixel Emporium (James Hastings-Trew): 실제 탐사선 모자이크를 정리한 맵, 비상업적 사용 허용
- three.js: <https://github.com/mrdoob/three.js> (MIT)

`textures.data.js` 는 위 이미지들을 base64 로 묶은 것으로, 파일을 직접 열었을 때(`file://`)도
브라우저 보안 정책(CORS) 없이 동작하도록 하기 위한 사본입니다.

블랙홀·중성자별처럼 실제 표면 사진이 존재하지 않는 천체와, 사진이 없는 외계행성·가상 천체는
가장 닮은 실제 천체의 사진을 사용하거나(색조 보정), 물리 기반 렌더링(강착 원반·사건의 지평선)으로 표현합니다.
