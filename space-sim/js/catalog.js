/* ===== 천체 카탈로그 =====
   단위:  질량 = 1e24 kg   /   반지름 = 1000 km (Mm)   /   온도 = K
   행:   [id, 한국어, English, 日本語, 분류, 질량, 반지름, 온도, 표면타입, 색, 옵션] */
(function (root) {
  const MS = 1988400;      // 태양질량 (1e24 kg)
  const MJ = 1898.19;      // 목성질량
  const ME = 5.97237;      // 지구질량
  const RS = 696.34;       // 태양반지름 (Mm)
  const RJ = 69.911;
  const RE = 6.371;

  const R = [
    /* ---------- 항성 (star) ---------- */
    ['sun', '태양', 'Sun', '太陽', 'star', MS, RS, 5772, 'sun', 0xffd76b, { lum: 1, glow: 2.4 }],
    ['proxima', '프록시마 켄타우리', 'Proxima Centauri', 'プロキシマ・ケンタウリ', 'star', 0.1221 * MS, 0.1542 * RS, 3042, 'star_red', 0xff8a55, { lum: 0.0017, glow: 1.8 }],
    ['alphacenA', '알파 켄타우리 A', 'Alpha Centauri A', 'アルファ・ケンタウリA', 'star', 1.079 * MS, 1.2234 * RS, 5790, 'sun', 0xffe08a, { lum: 1.519, glow: 2.3 }],
    ['alphacenB', '알파 켄타우리 B', 'Alpha Centauri B', 'アルファ・ケンタウリB', 'star', 0.909 * MS, 0.8632 * RS, 5260, 'sun', 0xffc978, { lum: 0.5, glow: 2.1 }],
    ['siriusA', '시리우스 A', 'Sirius A', 'シリウスA', 'star', 2.063 * MS, 1.711 * RS, 9940, 'star_blue', 0xcfe4ff, { lum: 25.4, glow: 2.8 }],
    ['vega', '베가 (직녀성)', 'Vega', 'ベガ', 'star', 2.135 * MS, 2.362 * RS, 9602, 'star_blue', 0xdbe9ff, { lum: 40, glow: 2.7 }],
    ['altair', '알타이르 (견우성)', 'Altair', 'アルタイル', 'star', 1.86 * MS, 1.79 * RS, 7550, 'sun', 0xfff0d0, { lum: 10.6, glow: 2.4 }],
    ['arcturus', '아르크투루스', 'Arcturus', 'アークトゥルス', 'star', 1.08 * MS, 25.4 * RS, 4286, 'star_red', 0xffb367, { lum: 170, glow: 2.2 }],
    ['aldebaran', '알데바란', 'Aldebaran', 'アルデバラン', 'star', 1.16 * MS, 44.13 * RS, 3900, 'star_red', 0xff9d55, { lum: 439, glow: 2.2 }],
    ['pollux', '폴룩스', 'Pollux', 'ポルックス', 'star', 1.91 * MS, 8.8 * RS, 4666, 'star_red', 0xffc182, { lum: 43, glow: 2.1 }],
    ['capella', '카펠라', 'Capella Aa', 'カペラ', 'star', 2.57 * MS, 11.98 * RS, 4970, 'sun', 0xffe3a8, { lum: 78.7, glow: 2.2 }],
    ['polaris', '북극성', 'Polaris', '北極星', 'star', 5.13 * MS, 37.5 * RS, 6015, 'sun', 0xfff3dc, { lum: 1260, glow: 2.5 }],
    ['betelgeuse', '베텔게우스', 'Betelgeuse', 'ベテルギウス', 'star', 16.5 * MS, 764 * RS, 3600, 'star_red', 0xff7a3c, { lum: 126000, glow: 2.0 }],
    ['antares', '안타레스', 'Antares', 'アンタレス', 'star', 12 * MS, 680 * RS, 3660, 'star_red', 0xff8140, { lum: 75900, glow: 2.0 }],
    ['rigel', '리겔', 'Rigel', 'リゲル', 'star', 21 * MS, 78.9 * RS, 12100, 'star_blue', 0xbcd8ff, { lum: 120000, glow: 3.0 }],
    ['deneb', '데네브', 'Deneb', 'デネブ', 'star', 19 * MS, 203 * RS, 8525, 'star_blue', 0xdcecff, { lum: 196000, glow: 2.8 }],
    ['spica', '스피카', 'Spica', 'スピカ', 'star', 11.43 * MS, 7.47 * RS, 25300, 'star_blue', 0xaecdff, { lum: 20500, glow: 3.2 }],
    ['vycma', 'VY 큰개자리', 'VY Canis Majoris', 'VYおおいぬ座', 'star', 17 * MS, 1420 * RS, 3490, 'star_red', 0xff6f30, { lum: 270000, glow: 1.9 }],
    ['uyscuti', 'UY 방패자리', 'UY Scuti', 'UYたて座', 'star', 7 * MS, 1708 * RS, 3365, 'star_red', 0xff6a2c, { lum: 340000, glow: 1.9 }],
    ['etacar', '용골자리 에타', 'Eta Carinae', 'りゅうこつ座エータ', 'star', 100 * MS, 240 * RS, 9400, 'star_blue', 0xffd9c0, { lum: 5e6, glow: 3.4 }],
    ['r136a1', 'R136a1', 'R136a1', 'R136a1', 'star', 196 * MS, 39.2 * RS, 46000, 'star_blue', 0x9fc4ff, { lum: 4.7e6, glow: 3.6 }],
    ['barnard', '바너드 별', "Barnard's Star", 'バーナード星', 'star', 0.144 * MS, 0.196 * RS, 3134, 'star_red', 0xff8f5a, { lum: 0.0035, glow: 1.7 }],
    ['trappist1', 'TRAPPIST-1', 'TRAPPIST-1', 'トラピスト1', 'star', 0.0898 * MS, 0.1192 * RS, 2566, 'star_red', 0xff7b48, { lum: 0.00055, glow: 1.6 }],
    ['kepler452', '케플러-452', 'Kepler-452', 'ケプラー452', 'star', 1.037 * MS, 1.11 * RS, 5757, 'sun', 0xffe3a0, { lum: 1.2, glow: 2.3 }],

    /* ---------- 행성 (planet) ---------- */
    ['mercury', '수성', 'Mercury', '水星', 'planet', 0.33011, 2.4397, 440, 'crater', 0x9a8f86, { au: 0.387 }],
    ['venus', '금성', 'Venus', '金星', 'planet', 4.8675, 6.0518, 737, 'venus', 0xe8cd94, { au: 0.723, atmo: 0.9 }],
    ['earth', '지구', 'Earth', '地球', 'planet', 5.97237, 6.371, 288, 'earth', 0x3b7fd4, { au: 1, atmo: 0.6, clouds: 1 }],
    ['mars', '화성', 'Mars', '火星', 'planet', 0.64171, 3.3895, 210, 'mars', 0xc1502e, { au: 1.524, atmo: 0.15 }],
    ['jupiter', '목성', 'Jupiter', '木星', 'planet', 1898.19, 69.911, 165, 'gas_j', 0xd8a878, { au: 5.203, rings: 0.2 }],
    ['saturn', '토성', 'Saturn', '土星', 'planet', 568.34, 58.232, 134, 'gas_s', 0xe4cb92, { au: 9.537, rings: 1 }],
    ['uranus', '천왕성', 'Uranus', '天王星', 'planet', 86.813, 25.362, 76, 'gas_u', 0x9fe3ea, { au: 19.19, rings: 0.35, tilt: 97.8 }],
    ['neptune', '해왕성', 'Neptune', '海王星', 'planet', 102.413, 24.622, 72, 'gas_n', 0x3f68d8, { au: 30.07, rings: 0.2 }],

    /* ---------- 왜소행성 (dwarf) ---------- */
    ['pluto', '명왕성', 'Pluto', '冥王星', 'dwarf', 0.01303, 1.1883, 44, 'pluto', 0xcbb49a, { au: 39.48 }],
    ['eris', '에리스', 'Eris', 'エリス', 'dwarf', 0.01646, 1.163, 42, 'ice', 0xe6e6ea, { au: 67.8 }],
    ['ceres', '세레스', 'Ceres', 'ケレス', 'dwarf', 9.3835e-4, 0.4696, 168, 'ceres', 0x8f8a82, { au: 2.77 }],
    ['haumea', '하우메아', 'Haumea', 'ハウメア', 'dwarf', 4.006e-3, 0.816, 32, 'ice', 0xdfe4e8, { au: 43.1, rings: 0.3 }],
    ['makemake', '마케마케', 'Makemake', 'マケマケ', 'dwarf', 3.1e-3, 0.715, 32, 'ice', 0xc2a189, { au: 45.4 }],
    ['gonggong', '공공', 'Gonggong', 'グンググ', 'dwarf', 1.75e-3, 0.615, 30, 'ice', 0xb98a76, { au: 67.5 }],
    ['quaoar', '콰오아', 'Quaoar', 'クワオアー', 'dwarf', 1.4e-3, 0.5555, 44, 'ice', 0xb59a86, { au: 43.7, rings: 0.25 }],
    ['sedna', '세드나', 'Sedna', 'セドナ', 'dwarf', 1.0e-3, 0.4995, 12, 'ice', 0xc4553f, { au: 506 }],
    ['orcus', '오르쿠스', 'Orcus', 'オルクス', 'dwarf', 6.41e-4, 0.4585, 44, 'ice', 0xa9b0b8, { au: 39.4 }],
    ['salacia', '살라시아', 'Salacia', 'サラキア', 'dwarf', 4.92e-4, 0.423, 44, 'ice', 0x9aa1a8, { au: 42 }],
    ['varuna', '바루나', 'Varuna', 'ヴァルナ', 'dwarf', 3.7e-4, 0.3345, 40, 'rock', 0xa4796a, { au: 43 }],
    ['ixion', '익시온', 'Ixion', 'イクシオン', 'dwarf', 3.0e-4, 0.3545, 42, 'rock', 0x9d7b6c, { au: 39.6 }],

    /* ---------- 위성 (moon) ---------- */
    ['moon', '달', 'Moon', '月', 'moon', 0.0734767, 1.7374, 250, 'crater', 0xb8b3aa, { par: 'earth', d: 384.4 }],
    ['phobos', '포보스', 'Phobos', 'フォボス', 'moon', 1.0659e-8, 0.0111, 233, 'rock', 0x7d6f63, { par: 'mars', d: 9.376, irr: 1 }],
    ['deimos', '데이모스', 'Deimos', 'ダイモス', 'moon', 1.4762e-9, 0.0062, 233, 'rock', 0x86786a, { par: 'mars', d: 23.46, irr: 1 }],
    ['io', '이오', 'Io', 'イオ', 'moon', 0.0893, 1.8216, 110, 'io', 0xe8d95c, { par: 'jupiter', d: 421.7 }],
    ['europa', '유로파', 'Europa', 'エウロパ', 'moon', 0.048, 1.5608, 102, 'europa', 0xd9c9ad, { par: 'jupiter', d: 671.1 }],
    ['ganymede', '가니메데', 'Ganymede', 'ガニメデ', 'moon', 0.14819, 2.6341, 110, 'ganymede', 0x9c8f80, { par: 'jupiter', d: 1070.4 }],
    ['callisto', '칼리스토', 'Callisto', 'カリスト', 'moon', 0.10759, 2.4103, 134, 'crater', 0x6d6055, { par: 'jupiter', d: 1882.7 }],
    ['amalthea', '아말테아', 'Amalthea', 'アマルテア', 'moon', 2.08e-9, 0.0832, 165, 'rock', 0xa8503a, { par: 'jupiter', d: 181.4, irr: 1 }],
    ['titan', '타이탄', 'Titan', 'タイタン', 'moon', 0.13452, 2.5747, 94, 'titan', 0xdb9d4a, { par: 'saturn', d: 1221.9, atmo: 0.8 }],
    ['enceladus', '엔셀라두스', 'Enceladus', 'エンケラドゥス', 'moon', 1.08e-4, 0.2521, 75, 'ice', 0xf2f6f8, { par: 'saturn', d: 238 }],
    ['mimas', '미마스', 'Mimas', 'ミマス', 'moon', 3.75e-5, 0.1982, 64, 'crater', 0xcfd2d4, { par: 'saturn', d: 185.5 }],
    ['rhea', '레아', 'Rhea', 'レア', 'moon', 2.3065e-3, 0.7638, 76, 'ice', 0xc9cbcc, { par: 'saturn', d: 527 }],
    ['iapetus', '이아페투스', 'Iapetus', 'イアペトゥス', 'moon', 1.8056e-3, 0.7345, 110, 'iapetus', 0x8c7f6d, { par: 'saturn', d: 3560.8 }],
    ['dione', '디오네', 'Dione', 'ディオネ', 'moon', 1.0955e-3, 0.5614, 87, 'ice', 0xc6c8ca, { par: 'saturn', d: 377.4 }],
    ['tethys', '테티스', 'Tethys', 'テティス', 'moon', 6.174e-4, 0.5311, 86, 'ice', 0xd3d5d6, { par: 'saturn', d: 294.6 }],
    ['hyperion', '히페리온', 'Hyperion', 'ヒペリオン', 'moon', 5.62e-6, 0.135, 93, 'rock', 0xa9927a, { par: 'saturn', d: 1481, irr: 1 }],
    ['phoebe', '포이베', 'Phoebe', 'フェーベ', 'moon', 8.29e-6, 0.1066, 73, 'rock', 0x5d564e, { par: 'saturn', d: 12952, irr: 1 }],
    ['triton', '트리톤', 'Triton', 'トリトン', 'moon', 0.02139, 1.3534, 38, 'triton', 0xdcc9bd, { par: 'neptune', d: 354.8 }],
    ['nereid', '네레이드', 'Nereid', 'ネレイド', 'moon', 3.1e-6, 0.17, 50, 'rock', 0x9a9086, { par: 'neptune', d: 5513, irr: 1 }],
    ['proteus', '프로테우스', 'Proteus', 'プロテウス', 'moon', 4.4e-6, 0.21, 51, 'rock', 0x6b645c, { par: 'neptune', d: 117.6, irr: 1 }],
    ['charon', '카론', 'Charon', 'カロン', 'moon', 1.586e-3, 0.606, 53, 'crater', 0xa9a49c, { par: 'pluto', d: 19.6 }],
    ['miranda', '미란다', 'Miranda', 'ミランダ', 'moon', 6.59e-5, 0.2357, 60, 'ice', 0xb9bcbe, { par: 'uranus', d: 129.9 }],
    ['ariel', '아리엘', 'Ariel', 'アリエル', 'moon', 1.353e-3, 0.5789, 60, 'ice', 0xc3c6c8, { par: 'uranus', d: 190.9 }],
    ['umbriel', '움브리엘', 'Umbriel', 'ウンブリエル', 'moon', 1.172e-3, 0.5847, 75, 'crater', 0x7d7b78, { par: 'uranus', d: 266 }],
    ['titania', '티타니아', 'Titania', 'チタニア', 'moon', 3.527e-3, 0.7884, 70, 'ice', 0xb0aca6, { par: 'uranus', d: 436.3 }],
    ['oberon', '오베론', 'Oberon', 'オベロン', 'moon', 3.014e-3, 0.7614, 75, 'crater', 0x9e988f, { par: 'uranus', d: 583.5 }],

    /* ---------- 소행성 (asteroid) ---------- */
    ['vesta', '베스타', '4 Vesta', 'ベスタ', 'asteroid', 2.59076e-4, 0.2626, 165, 'rock', 0x9b9188, { au: 2.36, irr: 1 }],
    ['pallas', '팔라스', '2 Pallas', 'パラス', 'asteroid', 2.04e-4, 0.256, 164, 'rock', 0x8d8a86, { au: 2.77, irr: 1 }],
    ['hygiea', '히기에이아', '10 Hygiea', 'ヒギエア', 'asteroid', 8.32e-5, 0.2172, 164, 'rock', 0x6f6a64, { au: 3.14, irr: 1 }],
    ['psyche', '프시케', '16 Psyche', 'プシケ', 'asteroid', 2.29e-5, 0.111, 160, 'iron', 0x9a8a72, { au: 2.92, irr: 1 }],
    ['ida', '이다', '243 Ida', 'イダ', 'asteroid', 4.2e-8, 0.0158, 200, 'rock', 0x8a7e6e, { au: 2.86, irr: 1 }],
    ['gaspra', '가스프라', '951 Gaspra', 'ガスプラ', 'asteroid', 2.5e-9, 0.0063, 200, 'rock', 0x94836d, { au: 2.21, irr: 1 }],
    ['mathilde', '마틸데', '253 Mathilde', 'マチルド', 'asteroid', 1.033e-7, 0.0265, 174, 'rock', 0x4f4740, { au: 2.65, irr: 1 }],
    ['lutetia', '루테티아', '21 Lutetia', 'ルテティア', 'asteroid', 1.7e-6, 0.0489, 170, 'rock', 0x8b8073, { au: 2.44, irr: 1 }],
    ['eros', '에로스', '433 Eros', 'エロス', 'asteroid', 6.687e-12, 0.00841, 227, 'rock', 0xa08a6e, { au: 1.46, irr: 1 }],
    ['bennu', '베누', '101955 Bennu', 'ベンヌ', 'asteroid', 7.329e-14, 0.000245, 260, 'rock', 0x4a443e, { au: 1.13, irr: 1 }],
    ['ryugu', '류구', '162173 Ryugu', 'リュウグウ', 'asteroid', 4.5e-13, 0.00045, 250, 'rock', 0x453f3a, { au: 1.19, irr: 1 }],
    ['itokawa', '이토카와', '25143 Itokawa', 'イトカワ', 'asteroid', 3.51e-14, 0.000165, 206, 'rock', 0x7d7160, { au: 1.32, irr: 1 }],
    ['apophis', '아포피스', '99942 Apophis', 'アポフィス', 'asteroid', 6.1e-14, 0.00017, 270, 'rock', 0x6e6355, { au: 0.92, irr: 1 }],
    ['chariklo', '카리클로', '10199 Chariklo', 'カリクロー', 'asteroid', 6.3e-6, 0.129, 60, 'rock', 0x6a5c50, { au: 15.8, rings: 0.4 }],
    ['chiron', '키론', '2060 Chiron', 'キロン', 'asteroid', 2.4e-6, 0.1, 73, 'comet', 0x6d6a66, { au: 13.6, rings: 0.3 }],

    /* ---------- 혜성 (comet) ---------- */
    ['halley', '핼리 혜성', "Halley's Comet", 'ハレー彗星', 'comet', 2.2e-10, 0.0055, 200, 'comet', 0x50504e, { au: 17.8, irr: 1, tail: 1 }],
    ['halebopp', '헤일-밥 혜성', 'Hale-Bopp', 'ヘール・ボップ彗星', 'comet', 1.3e-8, 0.03, 180, 'comet', 0x585754, { au: 186, irr: 1, tail: 1 }],
    ['c67p', '추류모프-게라시멘코', '67P/C-G', 'チュリュモフ彗星', 'comet', 9.982e-12, 0.002, 180, 'comet', 0x3f3b37, { au: 3.46, irr: 1, tail: 1 }],
    ['encke', '엔케 혜성', 'Comet Encke', 'エンケ彗星', 'comet', 9.2e-12, 0.0024, 200, 'comet', 0x4a4744, { au: 2.22, irr: 1, tail: 1 }],
    ['neowise', '니오와이즈', 'NEOWISE', 'ネオワイズ彗星', 'comet', 5e-11, 0.0025, 190, 'comet', 0x55534f, { au: 358, irr: 1, tail: 1 }],
    ['sl9', '슈메이커-레비 9', 'Shoemaker-Levy 9', 'シューメーカー・レヴィ第9', 'comet', 2e-12, 0.0016, 150, 'comet', 0x59554f, { irr: 1, tail: 1, note: 'roche' }],
    ['oumuamua', '오무아무아', '1I/ʻOumuamua', 'オウムアムア', 'comet', 1e-13, 0.00011, 200, 'rock', 0x7a5a44, { irr: 2 }],
    ['borisov', '보리소프', '2I/Borisov', 'ボリソフ彗星', 'comet', 1e-11, 0.0005, 180, 'comet', 0x4c4b48, { irr: 1, tail: 1 }],

    /* ---------- 운석 (meteoroid) ---------- */
    ['meteor_s', '작은 운석', 'Small Meteoroid', '小流星体', 'meteoroid', 5e-18, 2e-5, 250, 'rock', 0x6b6155, { irr: 1 }],
    ['meteor_m', '중형 운석', 'Meteoroid', '流星体', 'meteoroid', 4e-15, 2e-4, 250, 'rock', 0x6b6155, { irr: 1 }],
    ['meteor_iron', '철운석', 'Iron Meteorite', '鉄隕石', 'meteoroid', 2e-14, 3e-4, 250, 'iron', 0x8f8577, { irr: 1 }],
    ['chelyabinsk', '첼랴빈스크 운석', 'Chelyabinsk Meteor', 'チェリャビンスク隕石', 'meteoroid', 1.2e-14, 9.5e-6, 250, 'rock', 0x5b544b, { irr: 1 }],
    ['tunguska', '퉁구스카 천체', 'Tunguska Object', 'ツングースカ天体', 'meteoroid', 1e-13, 3e-5, 250, 'rock', 0x554e46, { irr: 1 }],
    ['chicxulub', '칙술루브 충돌체', 'Chicxulub Impactor', 'チクシュルーブ衝突体', 'meteoroid', 4.6e-10, 0.0055, 250, 'rock', 0x4d453d, { irr: 1 }],

    /* ---------- 외계행성 (exo) ---------- */
    ['proximab', '프록시마 b', 'Proxima b', 'プロキシマb', 'exo', 1.07 * ME, 1.03 * RE, 234, 'earth', 0x6d8f9e, { atmo: 0.4 }],
    ['proximac', '프록시마 c', 'Proxima c', 'プロキシマc', 'exo', 7 * ME, 2.3 * RE, 39, 'gas_n', 0x6b8fd0, {}],
    ['trap1b', 'TRAPPIST-1 b', 'TRAPPIST-1 b', 'トラピスト1b', 'exo', 1.374 * ME, 1.116 * RE, 400, 'lava', 0xc4553a, {}],
    ['trap1c', 'TRAPPIST-1 c', 'TRAPPIST-1 c', 'トラピスト1c', 'exo', 1.308 * ME, 1.097 * RE, 342, 'venus', 0xd0a877, {}],
    ['trap1d', 'TRAPPIST-1 d', 'TRAPPIST-1 d', 'トラピスト1d', 'exo', 0.388 * ME, 0.788 * RE, 288, 'desert', 0xb99a72, {}],
    ['trap1e', 'TRAPPIST-1 e', 'TRAPPIST-1 e', 'トラピスト1e', 'exo', 0.692 * ME, 0.92 * RE, 251, 'ocean', 0x3e7fa8, { atmo: 0.5 }],
    ['trap1f', 'TRAPPIST-1 f', 'TRAPPIST-1 f', 'トラピスト1f', 'exo', 1.039 * ME, 1.045 * RE, 219, 'ice', 0xa9c2cf, {}],
    ['trap1g', 'TRAPPIST-1 g', 'TRAPPIST-1 g', 'トラピスト1g', 'exo', 1.321 * ME, 1.129 * RE, 199, 'ice', 0xb5c8d2, {}],
    ['trap1h', 'TRAPPIST-1 h', 'TRAPPIST-1 h', 'トラピスト1h', 'exo', 0.326 * ME, 0.755 * RE, 173, 'ice', 0xc6d4dc, {}],
    ['kepler186f', '케플러-186f', 'Kepler-186f', 'ケプラー186f', 'exo', 1.44 * ME, 1.17 * RE, 188, 'ice', 0x87a5a0, {}],
    ['kepler452b', '케플러-452b', 'Kepler-452b', 'ケプラー452b', 'exo', 5 * ME, 1.63 * RE, 265, 'earth', 0x4c86b8, { atmo: 0.7, clouds: 1 }],
    ['kepler22b', '케플러-22b', 'Kepler-22b', 'ケプラー22b', 'exo', 9.1 * ME, 2.38 * RE, 262, 'ocean', 0x2f6f9e, { atmo: 0.8 }],
    ['kepler16b', '케플러-16b', 'Kepler-16b', 'ケプラー16b', 'exo', 0.333 * MJ, 0.754 * RJ, 200, 'gas_u', 0x8fb0c4, {}],
    ['gliese581g', '글리제 581g', 'Gliese 581g', 'グリーゼ581g', 'exo', 3.1 * ME, 1.5 * RE, 236, 'desert', 0x9a7a5c, {}],
    ['gj1214b', 'GJ 1214 b', 'GJ 1214 b', 'GJ 1214 b', 'exo', 6.55 * ME, 2.68 * RE, 555, 'gas_n', 0x6f9ab0, {}],
    ['k218b', 'K2-18 b', 'K2-18 b', 'K2-18 b', 'exo', 8.63 * ME, 2.61 * RE, 265, 'gas_u', 0x7fb8c4, { atmo: 1 }],
    ['c55e', '게자리 55 e', '55 Cancri e', 'かに座55e', 'exo', 8.08 * ME, 1.875 * RE, 2400, 'lava', 0xff6a2a, { glow: 0.5 }],
    ['hd209458b', 'HD 209458 b (오시리스)', 'HD 209458 b', 'HD 209458 b', 'exo', 0.69 * MJ, 1.38 * RJ, 1130, 'gas_j', 0xd8a08a, { atmo: 1 }],
    ['hd189733b', 'HD 189733 b', 'HD 189733 b', 'HD 189733 b', 'exo', 1.13 * MJ, 1.138 * RJ, 1200, 'gas_n', 0x2b56c8, { atmo: 1 }],
    ['peg51b', '페가수스자리 51 b', '51 Pegasi b', 'ペガスス座51b', 'exo', 0.46 * MJ, 1.9 * RJ, 1284, 'gas_j', 0xe0b07a, {}],
    ['wasp12b', 'WASP-12b', 'WASP-12b', 'WASP-12b', 'exo', 1.47 * MJ, 1.9 * RJ, 2580, 'carbon', 0x2a1a18, { glow: 0.4 }],
    ['wasp121b', 'WASP-121b', 'WASP-121b', 'WASP-121b', 'exo', 1.18 * MJ, 1.865 * RJ, 2360, 'lava', 0xff8040, { glow: 0.5 }],
    ['kelt9b', 'KELT-9b', 'KELT-9b', 'KELT-9b', 'exo', 2.88 * MJ, 1.891 * RJ, 4600, 'lava', 0xff5a2a, { glow: 0.9 }],
    ['methuselah', '므두셀라 (PSR B1620-26 b)', 'Methuselah', 'メトシェラ', 'exo', 2.5 * MJ, 1.3 * RJ, 100, 'gas_j', 0xa08a70, {}],
    ['hd106906b', 'HD 106906 b', 'HD 106906 b', 'HD 106906 b', 'exo', 11 * MJ, 1.6 * RJ, 1800, 'gas_j', 0xd06a40, { glow: 0.3 }],

    /* ---------- 블랙홀 (bh) ---------- */
    ['bh_stellar', '항성질량 블랙홀', 'Stellar Black Hole', '恒星質量ブラックホール', 'bh', 10 * MS, 0.0295, 0, 'bh', 0x000000, { disk: 1 }],
    ['cygx1', '백조자리 X-1', 'Cygnus X-1', 'はくちょう座X-1', 'bh', 21.2 * MS, 0.0626, 0, 'bh', 0x000000, { disk: 1 }],
    ['gaiabh1', '가이아 BH1', 'Gaia BH1', 'ガイアBH1', 'bh', 9.62 * MS, 0.0284, 0, 'bh', 0x000000, { disk: 1 }],
    ['sgra', '궁수자리 A*', 'Sagittarius A*', 'いて座A*', 'bh', 4.297e6 * MS, 12700, 0, 'bh', 0x000000, { disk: 1 }],
    ['m87', 'M87* (포웨히)', 'M87*', 'M87*', 'bh', 6.5e9 * MS, 1.92e7, 0, 'bh', 0x000000, { disk: 1 }],
    ['ton618', 'TON 618', 'TON 618', 'TON 618', 'bh', 6.6e10 * MS, 1.95e8, 0, 'bh', 0x000000, { disk: 1 }],
    ['bh_micro', '초소형 블랙홀', 'Micro Black Hole', 'マイクロブラックホール', 'bh', 5.97e-3, 8.9e-24, 0, 'bh', 0x000000, {}],

    /* ---------- 중성자별 (ns) ---------- */
    ['ns_generic', '중성자별', 'Neutron Star', '中性子星', 'ns', 1.4 * MS, 0.011, 6e5, 'ns', 0xdfe9ff, { glow: 3, pulsar: 1 }],
    ['crabpulsar', '게 성운 펄서', 'Crab Pulsar', 'かに星雲パルサー', 'ns', 1.4 * MS, 0.0105, 1e6, 'ns', 0xcfe0ff, { glow: 3.2, pulsar: 1 }],
    ['j0740', 'PSR J0740+6620', 'PSR J0740+6620', 'PSR J0740+6620', 'ns', 2.08 * MS, 0.0128, 5e5, 'ns', 0xd7e5ff, { glow: 3, pulsar: 1 }],
    ['magnetar', '마그네타 SGR 1806-20', 'Magnetar SGR 1806-20', 'マグネター', 'ns', 1.5 * MS, 0.01, 1e7, 'ns', 0xc0d8ff, { glow: 3.6, pulsar: 1 }],
    ['b1919', 'PSR B1919+21', 'PSR B1919+21', 'PSR B1919+21', 'ns', 1.4 * MS, 0.01, 6e5, 'ns', 0xd0e0ff, { glow: 3, pulsar: 1 }],

    /* ---------- 백색왜성 (wd) ---------- */
    ['siriusB', '시리우스 B', 'Sirius B', 'シリウスB', 'wd', 1.018 * MS, 0.0084 * RS, 25000, 'wd', 0xeaf2ff, { glow: 2.6 }],
    ['procyonB', '프로키온 B', 'Procyon B', 'プロキオンB', 'wd', 0.602 * MS, 0.0123 * RS, 7740, 'wd', 0xf0f4ff, { glow: 2.2 }],
    ['vanmaanen', '판 마넨의 별', "Van Maanen's Star", 'ファン・マーネン星', 'wd', 0.68 * MS, 0.0114 * RS, 6220, 'wd', 0xeef2ff, { glow: 2.0 }],

    /* ---------- 갈색왜성 (bd) ---------- */
    ['luhman16a', '루만 16A', 'Luhman 16A', 'ルーマン16A', 'bd', 34 * MJ, 1.0 * RJ, 1350, 'bd', 0x8c4a3a, { glow: 0.4 }],
    ['wise0855', 'WISE 0855-0714', 'WISE 0855-0714', 'WISE 0855', 'bd', 5 * MJ, 1.0 * RJ, 250, 'bd', 0x4a3e55, {}],
    ['m1207', '2M1207', '2M1207', '2M1207', 'bd', 25 * MJ, 1.5 * RJ, 2550, 'bd', 0xb45a30, { glow: 0.6 }],
    ['teide1', '테이데 1', 'Teide 1', 'テイデ1', 'bd', 55 * MJ, 1.0 * RJ, 2600, 'bd', 0xc06030, { glow: 0.6 }],

    /* ---------- 사용자 정의 (custom) ---------- */
    ['c_terra', '지구형 행성', 'Terrestrial Planet', '地球型惑星', 'custom', 5.97, 6.371, 288, 'earth', 0x3b7fd4, { atmo: 0.6, clouds: 1 }],
    ['c_ocean', '해양 행성', 'Ocean World', '海洋惑星', 'custom', 9, 8.2, 290, 'ocean', 0x2f6f9e, { atmo: 0.8 }],
    ['c_desert', '사막 행성', 'Desert World', '砂漠惑星', 'custom', 4.2, 5.9, 320, 'desert', 0xc39a63, {}],
    ['c_ice', '얼음 행성', 'Ice World', '氷惑星', 'custom', 3.1, 5.2, 60, 'ice', 0xc9e2ee, {}],
    ['c_lava', '용암 행성', 'Lava World', '溶岩惑星', 'custom', 6.4, 6.6, 1400, 'lava', 0xff5a20, { glow: 0.6 }],
    ['c_gas', '가스 행성', 'Gas Giant', 'ガス惑星', 'custom', 1200, 62, 150, 'gas_j', 0xc9a37a, { rings: 0.4 }],
    ['c_ring', '고리 행성', 'Ringed Giant', '環惑星', 'custom', 500, 55, 130, 'gas_s', 0xdfc48e, { rings: 1 }],
    ['c_rock', '암석 소행성', 'Rocky Asteroid', '岩石小惑星', 'custom', 1e-6, 0.05, 200, 'rock', 0x7b7166, { irr: 1 }],
    ['c_iron', '철 천체', 'Iron Body', '鉄天体', 'custom', 1e-5, 0.06, 200, 'iron', 0x8f8577, { irr: 1 }],
    ['c_marble', '거대 구슬', 'Giant Marble', '巨大ビー玉', 'custom', 5.97, 6.371, 288, 'marble', 0x66ddff, { marble: 1 }],
    ['c_star', '일반 항성', 'Generic Star', '一般恒星', 'custom', MS, RS, 5772, 'sun', 0xffd76b, { lum: 1, glow: 2.4 }]
  ];

  const KEYS = ['id', 'ko', 'en', 'ja', 'cat', 'm', 'r', 'T', 'tex', 'col', 'x'];
  const CATALOG = R.map(row => {
    const o = {};
    KEYS.forEach((k, i) => o[k] = row[i]);
    o.x = o.x || {};
    o.rho = o.m * 1e24 / ((4 / 3) * Math.PI * Math.pow(o.r * 1e6, 3)); // kg/m^3
    return o;
  });
  const BY_ID = {};
  CATALOG.forEach(c => BY_ID[c.id] = c);

  root.CATALOG = CATALOG;
  root.CAT_BY_ID = BY_ID;
  root.CAT_ORDER = ['all', 'star', 'planet', 'moon', 'dwarf', 'asteroid', 'comet', 'meteoroid', 'exo', 'bh', 'ns', 'wd', 'bd', 'custom'];
  root.UNITS = { MS, MJ, ME, RS, RJ, RE };
})(window);
