/* =========================================================================
 *  blocks.js — 블록 레지스트리
 *  단단함(hardness) / 도구 종류·등급 / 드롭 / 광원 / 충돌 / 렌더 타입
 * ========================================================================= */
'use strict';

/* 렌더 타입 */
const RENDER_NONE = 0;   // 공기
const RENDER_CUBE = 1;   // 일반 정육면체
const RENDER_CROSS = 2;  // 십자 (풀/꽃/묘목)
const RENDER_LIQUID = 3; // 물/용암
const RENDER_TORCH = 4;  // 횃불 (작은 기둥)
const RENDER_CROP = 5;   // 농작물 (십자 + 단계)

/* 도구 등급 */
const TIER_HAND = 0, TIER_WOOD = 1, TIER_STONE = 2, TIER_IRON = 3, TIER_DIAMOND = 4;

const Blocks = [];                 // id → 정의
const BlockIds = Object.create(null); // name → id

/** 블록 정의 */
function defBlock(id, name, o = {}) {
  const b = {
    id, name,
    display: o.display || name,
    render: o.render === undefined ? RENDER_CUBE : o.render,
    /* 텍스처: 문자열 | {all} | {top,bottom,side} | {top,bottom,north,south,east,west} */
    texSpec: o.tex || name,
    tiles: null,                       // buildTextures 후 resolveBlockTextures()에서 채움
    solid: o.solid === undefined ? true : o.solid,       // 충돌 여부
    opaque: o.opaque === undefined ? true : o.opaque,    // 빛 차단 + 면 컬링
    opacity: o.opacity === undefined ? 15 : o.opacity,   // 비불투명 블록의 빛 감쇠
    light: o.light || 0,                                 // 발광 레벨 0..15
    hardness: o.hardness === undefined ? 1 : o.hardness, // 초 단위 기준값(-1 = 부술 수 없음)
    tool: o.tool || null,              // 'pickaxe' | 'axe' | 'shovel' | 'sword' | null
    tier: o.tier || TIER_HAND,         // 드롭에 필요한 최소 등급
    drops: o.drops === undefined ? [{ name, min: 1, max: 1 }] : o.drops,
    liquid: !!o.liquid,
    gravity: !!o.gravity,              // 모래/자갈 낙하
    flammable: !!o.flammable,
    replaceable: !!o.replaceable,      // 물/풀 위에 바로 설치 가능
    plant: !!o.plant,                  // 흙 위에만 설치
    material: o.material || 'stone',   // 소리/파티클
    tint: o.tint || null,              // 렌더 색 보정 [r,g,b]
    fullCube: o.fullCube === undefined ? (o.render === undefined || o.render === RENDER_CUBE) : o.fullCube,
    aabb: o.aabb || null,              // 커스텀 충돌 박스 [x0,y0,z0,x1,y1,z1]
    itemTex: o.itemTex || null,        // 인벤토리 아이콘(2D) — 없으면 아이소 큐브
    stackSize: o.stackSize || 64,
    entity: o.entity || null,          // 'chest' | 'furnace'
    interact: o.interact || null,      // 우클릭 GUI
    fuel: o.fuel || 0,                 // 화로 연료 시간(틱)
    xp: o.xp || 0,                     // 채굴 경험치
    damage: o.damage || 0,             // 접촉 피해 (선인장 등)
    climb: !!o.climb,                  // 사다리
  };
  Blocks[id] = b;
  BlockIds[name] = id;
  return b;
}

/* ------------------------------------------------------------------ 정의 */
defBlock(0, 'air', {
  render: RENDER_NONE, solid: false, opaque: false, opacity: 0,
  hardness: 0, drops: [], replaceable: true, fullCube: false, material: 'none',
});

defBlock(1, 'stone', {
  display: '돌', tex: 'stone', hardness: 1.5, tool: 'pickaxe', tier: TIER_WOOD,
  drops: [{ name: 'cobblestone', min: 1, max: 1 }], material: 'stone',
});
defBlock(2, 'grass_block', {
  display: '잔디 블록', tex: { top: 'grass_top', bottom: 'dirt', side: 'grass_side' },
  hardness: 0.6, tool: 'shovel', drops: [{ name: 'dirt', min: 1, max: 1 }], material: 'grass',
});
defBlock(3, 'dirt', { display: '흙', tex: 'dirt', hardness: 0.5, tool: 'shovel', material: 'dirt' });
defBlock(4, 'cobblestone', {
  display: '조약돌', tex: 'cobblestone', hardness: 2, tool: 'pickaxe', tier: TIER_WOOD, material: 'stone',
});
defBlock(5, 'bedrock', {
  display: '기반암', tex: 'bedrock', hardness: -1, drops: [], material: 'stone',
});
defBlock(6, 'sand', {
  display: '모래', tex: 'sand', hardness: 0.5, tool: 'shovel', gravity: true, material: 'sand',
});
defBlock(7, 'gravel', {
  display: '자갈', tex: 'gravel', hardness: 0.6, tool: 'shovel', gravity: true, material: 'gravel',
  drops: [{ name: 'gravel', min: 1, max: 1 }, { name: 'flint', min: 1, max: 1, chance: 0.12 }],
});
defBlock(8, 'clay', {
  display: '점토', tex: 'clay', hardness: 0.6, tool: 'shovel', material: 'dirt',
  drops: [{ name: 'clay_ball', min: 4, max: 4 }],
});
defBlock(9, 'snow_block', { display: '눈 블록', tex: 'snow', hardness: 0.2, tool: 'shovel', material: 'snow' });
defBlock(10, 'ice', {
  display: '얼음', tex: 'ice', hardness: 0.5, tool: 'pickaxe', opaque: false, opacity: 3,
  drops: [], material: 'glass',
});
defBlock(11, 'obsidian', {
  display: '흑요석', tex: 'obsidian', hardness: 25, tool: 'pickaxe', tier: TIER_DIAMOND, material: 'stone',
});

defBlock(12, 'water', {
  display: '물', tex: 'water', render: RENDER_LIQUID, solid: false, opaque: false, opacity: 2,
  liquid: true, hardness: -1, drops: [], replaceable: true, fullCube: false, material: 'liquid',
});
defBlock(13, 'lava', {
  display: '용암', tex: 'lava', render: RENDER_LIQUID, solid: false, opaque: false, opacity: 1,
  liquid: true, light: 15, hardness: -1, drops: [], replaceable: true, fullCube: false, material: 'liquid',
});

/* 원목 / 잎 / 판자 */
defBlock(14, 'oak_log', {
  display: '참나무 원목', tex: { top: 'oak_log_top', bottom: 'oak_log_top', side: 'oak_log_side' },
  hardness: 2, tool: 'axe', material: 'wood', flammable: true, fuel: 300,
});
defBlock(15, 'birch_log', {
  display: '자작나무 원목', tex: { top: 'birch_log_top', bottom: 'birch_log_top', side: 'birch_log_side' },
  hardness: 2, tool: 'axe', material: 'wood', flammable: true, fuel: 300,
});
defBlock(16, 'spruce_log', {
  display: '가문비나무 원목', tex: { top: 'spruce_log_top', bottom: 'spruce_log_top', side: 'spruce_log_side' },
  hardness: 2, tool: 'axe', material: 'wood', flammable: true, fuel: 300,
});
const LEAF_DROPS = (sapling) => [
  { name: sapling, min: 1, max: 1, chance: 0.06 },
  { name: 'apple', min: 1, max: 1, chance: 0.015 },
  { name: 'stick', min: 1, max: 2, chance: 0.1 },
];
defBlock(17, 'oak_leaves', {
  display: '참나무 잎', tex: 'oak_leaves', hardness: 0.2, opaque: false, opacity: 1,
  drops: LEAF_DROPS('oak_sapling'), material: 'grass', flammable: true, fullCube: true,
});
defBlock(18, 'birch_leaves', {
  display: '자작나무 잎', tex: 'birch_leaves', hardness: 0.2, opaque: false, opacity: 1,
  drops: LEAF_DROPS('birch_sapling'), material: 'grass', flammable: true, fullCube: true,
});
defBlock(19, 'spruce_leaves', {
  display: '가문비나무 잎', tex: 'spruce_leaves', hardness: 0.2, opaque: false, opacity: 1,
  drops: LEAF_DROPS('spruce_sapling'), material: 'grass', flammable: true, fullCube: true,
});
defBlock(20, 'oak_planks', { display: '참나무 판자', tex: 'oak_planks', hardness: 2, tool: 'axe', material: 'wood', flammable: true, fuel: 300 });
defBlock(21, 'birch_planks', { display: '자작나무 판자', tex: 'birch_planks', hardness: 2, tool: 'axe', material: 'wood', flammable: true, fuel: 300 });
defBlock(22, 'spruce_planks', { display: '가문비나무 판자', tex: 'spruce_planks', hardness: 2, tool: 'axe', material: 'wood', flammable: true, fuel: 300 });

/* 광석 */
defBlock(23, 'coal_ore', {
  display: '석탄 광석', tex: 'coal_ore', hardness: 3, tool: 'pickaxe', tier: TIER_WOOD,
  drops: [{ name: 'coal', min: 1, max: 1 }], xp: 1,
});
defBlock(24, 'iron_ore', {
  display: '철 광석', tex: 'iron_ore', hardness: 3, tool: 'pickaxe', tier: TIER_STONE,
  drops: [{ name: 'iron_ore', min: 1, max: 1 }],
});
defBlock(25, 'gold_ore', {
  display: '금 광석', tex: 'gold_ore', hardness: 3, tool: 'pickaxe', tier: TIER_IRON,
  drops: [{ name: 'gold_ore', min: 1, max: 1 }],
});
defBlock(26, 'diamond_ore', {
  display: '다이아몬드 광석', tex: 'diamond_ore', hardness: 3, tool: 'pickaxe', tier: TIER_IRON,
  drops: [{ name: 'diamond', min: 1, max: 1 }],
});
defBlock(27, 'redstone_ore', {
  display: '레드스톤 광석', tex: 'redstone_ore', hardness: 3, tool: 'pickaxe', tier: TIER_IRON,
  drops: [{ name: 'redstone', min: 4, max: 5 }], light: 0,
});
defBlock(28, 'lapis_ore', {
  display: '청금석 광석', tex: 'lapis_ore', hardness: 3, tool: 'pickaxe', tier: TIER_STONE,
  drops: [{ name: 'lapis_lazuli', min: 4, max: 8 }],
});
defBlock(29, 'emerald_ore', {
  display: '에메랄드 광석', tex: 'emerald_ore', hardness: 3, tool: 'pickaxe', tier: TIER_IRON,
  drops: [{ name: 'emerald', min: 1, max: 1 }],
});

/* 압축 블록 */
defBlock(30, 'coal_block', { display: '석탄 블록', tex: 'coal_block', hardness: 5, tool: 'pickaxe', tier: TIER_WOOD, fuel: 16000 });
defBlock(31, 'iron_block', { display: '철 블록', tex: 'iron_block', hardness: 5, tool: 'pickaxe', tier: TIER_STONE, material: 'metal' });
defBlock(32, 'gold_block', { display: '금 블록', tex: 'gold_block', hardness: 3, tool: 'pickaxe', tier: TIER_IRON, material: 'metal' });
defBlock(33, 'diamond_block', { display: '다이아몬드 블록', tex: 'diamond_block', hardness: 5, tool: 'pickaxe', tier: TIER_IRON, material: 'metal' });
defBlock(34, 'emerald_block', { display: '에메랄드 블록', tex: 'emerald_block', hardness: 5, tool: 'pickaxe', tier: TIER_IRON, material: 'metal' });
defBlock(35, 'lapis_block', { display: '청금석 블록', tex: 'lapis_block', hardness: 3, tool: 'pickaxe', tier: TIER_STONE, material: 'stone' });

/* 투명 / 장식 */
defBlock(36, 'glass', {
  display: '유리', tex: 'glass', hardness: 0.3, opaque: false, opacity: 0,
  drops: [], material: 'glass', fullCube: true,
});
defBlock(37, 'bricks', { display: '벽돌', tex: 'bricks', hardness: 2, tool: 'pickaxe', tier: TIER_WOOD });
defBlock(38, 'stone_bricks', { display: '돌 벽돌', tex: 'stone_bricks', hardness: 1.5, tool: 'pickaxe', tier: TIER_WOOD });
defBlock(39, 'mossy_cobblestone', { display: '이끼 낀 조약돌', tex: 'mossy_cobblestone', hardness: 2, tool: 'pickaxe', tier: TIER_WOOD });
defBlock(40, 'sandstone', {
  display: '사암', tex: { top: 'sandstone_top', bottom: 'sandstone_top', side: 'sandstone_side' },
  hardness: 0.8, tool: 'pickaxe', tier: TIER_WOOD, material: 'sand',
});
defBlock(41, 'cactus', {
  display: '선인장', tex: { top: 'cactus_top', bottom: 'cactus_top', side: 'cactus_side' },
  hardness: 0.4, material: 'grass', aabb: [0.0625, 0, 0.0625, 0.9375, 1, 0.9375], damage: 1,
});
defBlock(42, 'crafting_table', {
  display: '제작대', tex: {
    top: 'crafting_table_top', bottom: 'oak_planks',
    north: 'crafting_table_front', south: 'crafting_table_front',
    east: 'crafting_table_side', west: 'crafting_table_side',
  },
  hardness: 2.5, tool: 'axe', material: 'wood', interact: 'crafting', flammable: true, fuel: 300,
});
defBlock(43, 'furnace', {
  display: '화로', tex: {
    top: 'furnace_top', bottom: 'furnace_top', north: 'furnace_front',
    south: 'furnace_side', east: 'furnace_side', west: 'furnace_side',
  },
  hardness: 3.5, tool: 'pickaxe', tier: TIER_WOOD, interact: 'furnace', entity: 'furnace',
});
defBlock(44, 'furnace_lit', {
  display: '화로', tex: {
    top: 'furnace_top', bottom: 'furnace_top', north: 'furnace_front_on',
    south: 'furnace_side', east: 'furnace_side', west: 'furnace_side',
  },
  hardness: 3.5, tool: 'pickaxe', tier: TIER_WOOD, light: 13, interact: 'furnace', entity: 'furnace',
  drops: [{ name: 'furnace', min: 1, max: 1 }],
});
defBlock(45, 'chest', {
  display: '상자', tex: {
    top: 'chest_top', bottom: 'chest_top', north: 'chest_front',
    south: 'chest_side', east: 'chest_side', west: 'chest_side',
  },
  hardness: 2.5, tool: 'axe', material: 'wood', interact: 'chest', entity: 'chest',
  aabb: [0.0625, 0, 0.0625, 0.9375, 0.875, 0.9375], fullCube: false, opaque: false, opacity: 15,
  flammable: true, fuel: 300,
});
defBlock(46, 'tnt', {
  display: 'TNT', tex: { top: 'tnt_top', bottom: 'tnt_bottom', side: 'tnt_side' },
  hardness: 0, material: 'grass',
});
defBlock(47, 'bookshelf', {
  display: '책장', tex: { top: 'oak_planks', bottom: 'oak_planks', side: 'bookshelf' },
  hardness: 1.5, tool: 'axe', material: 'wood', drops: [{ name: 'book', min: 3, max: 3 }],
  flammable: true, fuel: 300,
});
defBlock(48, 'glowstone', {
  display: '발광석', tex: 'glowstone', hardness: 0.3, light: 15, material: 'glass',
  drops: [{ name: 'glowstone', min: 1, max: 1 }],
});
defBlock(49, 'pumpkin', {
  display: '호박', tex: {
    top: 'pumpkin_top', bottom: 'pumpkin_top', north: 'pumpkin_face',
    south: 'pumpkin_side', east: 'pumpkin_side', west: 'pumpkin_side',
  },
  hardness: 1, tool: 'axe', material: 'grass',
});
defBlock(50, 'torch', {
  display: '횃불', tex: 'torch', render: RENDER_TORCH, solid: false, opaque: false, opacity: 0,
  light: 14, hardness: 0, material: 'wood', fullCube: false, plant: true, itemTex: 'torch',
});
defBlock(51, 'ladder', {
  display: '사다리', tex: 'ladder', render: RENDER_CUBE, solid: false, opaque: false, opacity: 0,
  hardness: 0.4, material: 'wood', fullCube: false, aabb: [0, 0, 0, 1, 1, 0.15], climb: true,
});

/* 농사 */
defBlock(52, 'farmland', {
  display: '경작지', tex: { top: 'farmland', bottom: 'dirt', side: 'dirt' },
  hardness: 0.6, tool: 'shovel', material: 'dirt', drops: [{ name: 'dirt', min: 1, max: 1 }],
  aabb: [0, 0, 0, 1, 0.9375, 1], fullCube: true,
});
defBlock(53, 'wheat', {
  display: '밀', tex: 'wheat0', render: RENDER_CROP, solid: false, opaque: false, opacity: 0,
  hardness: 0, material: 'grass', fullCube: false, plant: true, drops: [],
  itemTex: 'seeds',
});

/* 식물 */
const PLANT = {
  render: RENDER_CROSS, solid: false, opaque: false, opacity: 0, hardness: 0,
  material: 'grass', fullCube: false, plant: true, replaceable: false, flammable: true,
};
defBlock(54, 'tall_grass', {
  ...PLANT, display: '풀', tex: 'tall_grass', replaceable: true,
  drops: [{ name: 'seeds', min: 1, max: 1, chance: 0.25 }], itemTex: 'tall_grass',
});
defBlock(55, 'dandelion', { ...PLANT, display: '민들레', tex: 'dandelion', itemTex: 'dandelion' });
defBlock(56, 'poppy', { ...PLANT, display: '양귀비', tex: 'poppy', itemTex: 'poppy' });
defBlock(57, 'blue_orchid', { ...PLANT, display: '파란 난초', tex: 'blue_orchid', itemTex: 'blue_orchid' });
defBlock(58, 'dead_bush', {
  ...PLANT, display: '죽은 덤불', tex: 'dead_bush', itemTex: 'dead_bush',
  drops: [{ name: 'stick', min: 0, max: 2 }],
});
defBlock(59, 'sugar_cane', {
  ...PLANT, display: '사탕수수', tex: 'sugar_cane', itemTex: 'sugar_cane',
  drops: [{ name: 'sugar_cane', min: 1, max: 1 }],
});
defBlock(60, 'red_mushroom', { ...PLANT, display: '붉은 버섯', tex: 'red_mushroom', itemTex: 'red_mushroom', light: 1 });
defBlock(61, 'brown_mushroom', { ...PLANT, display: '갈색 버섯', tex: 'brown_mushroom', itemTex: 'brown_mushroom', light: 1 });
defBlock(62, 'oak_sapling', { ...PLANT, display: '참나무 묘목', tex: 'oak_sapling', itemTex: 'oak_sapling' });
defBlock(63, 'birch_sapling', { ...PLANT, display: '자작나무 묘목', tex: 'birch_sapling', itemTex: 'birch_sapling' });
defBlock(64, 'spruce_sapling', { ...PLANT, display: '가문비나무 묘목', tex: 'spruce_sapling', itemTex: 'spruce_sapling' });

/* 양털 16색 */
const WOOL_COLORS = [
  ['white', '하얀색'], ['orange', '주황색'], ['magenta', '자홍색'], ['light_blue', '하늘색'],
  ['yellow', '노란색'], ['lime', '연두색'], ['pink', '분홍색'], ['gray', '회색'],
  ['light_gray', '밝은 회색'], ['cyan', '청록색'], ['purple', '보라색'], ['blue', '파란색'],
  ['brown', '갈색'], ['green', '초록색'], ['red', '빨간색'], ['black', '검은색'],
];
WOOL_COLORS.forEach(([key, ko], i) => {
  defBlock(65 + i, 'wool_' + key, {
    display: ko + ' 양털', tex: 'wool_' + key, hardness: 0.8, material: 'wool', flammable: true, fuel: 100,
  });
});

const BLOCK_COUNT = Blocks.length;

/* ------------------------------------------------------ 텍스처 인덱스 해석 */
function resolveBlockTextures() {
  for (const b of Blocks) {
    if (!b) continue;
    if (b.id === 0) { b.tiles = new Int32Array(6); continue; }   // 공기는 텍스처 없음
    const s = b.texSpec;
    const t = new Int32Array(6);
    const g = (n) => Textures.id(n);
    if (typeof s === 'string') {
      t.fill(g(s));
    } else if (s.all) {
      t.fill(g(s.all));
    } else {
      const side = s.side || s.all || 'missing';
      t[FACE_EAST] = g(s.east || side);
      t[FACE_WEST] = g(s.west || side);
      t[FACE_TOP] = g(s.top || side);
      t[FACE_BOTTOM] = g(s.bottom || s.top || side);
      t[FACE_SOUTH] = g(s.south || side);
      t[FACE_NORTH] = g(s.north || side);
    }
    b.tiles = t;
  }
  // 밀 성장 단계 타일
  Blocks[BlockIds.wheat].cropTiles = [0, 1, 2, 3].map((i) => Textures.id('wheat' + i));
  Blocks[BlockIds.farmland].wetTile = Textures.id('farmland_wet');
}

/* -------------------------------------------------------------- 조회 유틸 */
function blockById(id) { return Blocks[id] || Blocks[0]; }
function isAir(id) { return id === 0; }
function isOpaque(id) { const b = Blocks[id]; return b ? b.opaque : false; }
function isSolid(id) { const b = Blocks[id]; return b ? b.solid : false; }
function isLiquid(id) { const b = Blocks[id]; return b ? b.liquid : false; }
function isFullCube(id) { const b = Blocks[id]; return b ? b.fullCube : false; }
function blockLightLevel(id) { const b = Blocks[id]; return b ? b.light : 0; }
function blockOpacity(id) {
  const b = Blocks[id];
  if (!b) return 0;
  return b.opaque ? 15 : b.opacity;
}
function isReplaceable(id) { const b = Blocks[id]; return b ? b.replaceable : false; }

/** 블록 충돌 AABB 목록 (월드 좌표) */
function blockAABBs(id, x, y, z, out) {
  const b = Blocks[id];
  if (!b || !b.solid) return out;
  if (b.aabb) {
    out.push(new AABB(x + b.aabb[0], y + b.aabb[1], z + b.aabb[2],
      x + b.aabb[3], y + b.aabb[4], z + b.aabb[5]));
  } else {
    out.push(new AABB(x, y, z, x + 1, y + 1, z + 1));
  }
  return out;
}

/** 블록 이름 배열 (크리에이티브 탭 등) */
function allPlaceableBlockIds() {
  const out = [];
  for (const b of Blocks) {
    if (!b || b.id === 0 || b.liquid || b.id === BlockIds.wheat ||
      b.id === BlockIds.furnace_lit || b.id === BlockIds.farmland) continue;
    out.push(b.id);
  }
  return out;
}
