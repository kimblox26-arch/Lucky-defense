/* =========================================================================
 *  items.js — 아이템 / 도구 / 방어구 / 음식 / 조합법 / 제련 / 연료
 *  블록 id(0..255)와 아이템 id(256~)을 하나의 네임스페이스로 사용한다.
 * ========================================================================= */
'use strict';

const ITEM_ID_BASE = 256;
const Items = Object.create(null);       // id → def
const ItemIds = Object.create(null);     // name → id
let _nextItemId = ITEM_ID_BASE;

/* 도구 재료 스펙 */
const TOOL_MATERIALS = {
  wooden: { tier: TIER_WOOD, speed: 2, durability: 59, dmg: 0, ko: '나무' },
  stone: { tier: TIER_STONE, speed: 4, durability: 131, dmg: 1, ko: '돌' },
  iron: { tier: TIER_IRON, speed: 6, durability: 250, dmg: 2, ko: '철' },
  golden: { tier: TIER_WOOD, speed: 12, durability: 32, dmg: 0, ko: '금' },
  diamond: { tier: TIER_DIAMOND, speed: 8, durability: 1561, dmg: 3, ko: '다이아몬드' },
};
const TOOL_KINDS = {
  sword: { ko: '검', baseDmg: 4, speed: 1.5 },
  pickaxe: { ko: '곡괭이', baseDmg: 2, speed: 1 },
  axe: { ko: '도끼', baseDmg: 3, speed: 1 },
  shovel: { ko: '삽', baseDmg: 1.5, speed: 1 },
  hoe: { ko: '괭이', baseDmg: 1, speed: 1 },
};
const ARMOR_MATERIALS = {
  leather: { ko: '가죽', dur: 55, def: { helmet: 1, chestplate: 3, leggings: 2, boots: 1 } },
  iron: { ko: '철', dur: 165, def: { helmet: 2, chestplate: 6, leggings: 5, boots: 2 } },
  golden: { ko: '금', dur: 77, def: { helmet: 2, chestplate: 5, leggings: 3, boots: 1 } },
  diamond: { ko: '다이아몬드', dur: 363, def: { helmet: 3, chestplate: 8, leggings: 6, boots: 3 } },
};
const ARMOR_SLOT_KO = { helmet: '투구', chestplate: '흉갑', leggings: '각반', boots: '부츠' };
const ARMOR_SLOT_INDEX = { helmet: 0, chestplate: 1, leggings: 2, boots: 3 };

function defItem(name, o = {}) {
  const id = _nextItemId++;
  const def = {
    id, name,
    display: o.display || name,
    tex: o.tex || name,
    stackSize: o.stackSize || 64,
    tool: o.tool || null,               // {kind, tier, speed, dmg}
    durability: o.durability || 0,
    food: o.food || null,               // {hunger, saturation}
    armor: o.armor || null,             // {slot, defense}
    fuel: o.fuel || 0,
    placeBlock: o.placeBlock || null,    // 설치되는 블록 이름
    liquid: o.liquid || null,
    isBlock: false,
    attack: o.attack || 1,
    ranged: !!o.ranged,
  };
  Items[id] = def;
  ItemIds[name] = id;
  return def;
}

/* ---------------------------------------------------------------- 재료 */
defItem('stick', { display: '막대기', fuel: 100 });
defItem('coal', { display: '석탄', fuel: 1600 });
defItem('charcoal', { display: '목탄', tex: 'charcoal', fuel: 1600 });
defItem('iron_ingot', { display: '철괴' });
defItem('gold_ingot', { display: '금괴' });
defItem('diamond', { display: '다이아몬드' });
defItem('emerald', { display: '에메랄드' });
defItem('redstone', { display: '레드스톤 가루' });
defItem('lapis_lazuli', { display: '청금석' });
defItem('gunpowder', { display: '화약' });
defItem('bone', { display: '뼈' });
defItem('feather', { display: '깃털' });
defItem('string', { display: '실' });
defItem('leather', { display: '가죽' });
defItem('paper', { display: '종이' });
defItem('book', { display: '책', tex: 'paper' });
defItem('flint', { display: '부싯돌' });
defItem('clay_ball', { display: '점토 덩이' });
defItem('brick_item', { display: '벽돌', tex: 'brick_item' });
defItem('seeds', { display: '씨앗', placeBlock: 'wheat' });
defItem('wheat_item', { display: '밀', tex: 'wheat_item' });

/* ---------------------------------------------------------------- 음식 */
defItem('apple', { display: '사과', food: { hunger: 4, saturation: 2.4 } });
defItem('bread', { display: '빵', food: { hunger: 5, saturation: 6 } });
defItem('porkchop', { display: '생 돼지고기', food: { hunger: 3, saturation: 1.8 } });
defItem('cooked_porkchop', { display: '익힌 돼지고기', food: { hunger: 8, saturation: 12.8 } });
defItem('beef', { display: '생 소고기', food: { hunger: 3, saturation: 1.8 } });
defItem('cooked_beef', { display: '스테이크', food: { hunger: 8, saturation: 12.8 } });
defItem('chicken', { display: '생 닭고기', food: { hunger: 2, saturation: 1.2 } });
defItem('cooked_chicken', { display: '구운 닭고기', food: { hunger: 6, saturation: 7.2 } });
defItem('mutton', { display: '생 양고기', food: { hunger: 2, saturation: 1.2 } });
defItem('cooked_mutton', { display: '익힌 양고기', food: { hunger: 6, saturation: 9.6 } });

/* ---------------------------------------------------------------- 도구 */
for (const mat in TOOL_MATERIALS) {
  const m = TOOL_MATERIALS[mat];
  for (const kind in TOOL_KINDS) {
    const k = TOOL_KINDS[kind];
    defItem(`${mat}_${kind}`, {
      display: `${m.ko} ${k.ko}`,
      tex: `${mat}_${kind}`,
      stackSize: 1,
      durability: Math.round(m.durability * (kind === 'sword' ? 1 : 1)),
      attack: k.baseDmg + m.dmg,
      tool: { kind, tier: m.tier, speed: m.speed * k.speed },
    });
  }
}
/* -------------------------------------------------------------- 방어구 */
for (const mat in ARMOR_MATERIALS) {
  const m = ARMOR_MATERIALS[mat];
  for (const slot in m.def) {
    defItem(`${mat}_${slot}`, {
      display: `${m.ko} ${ARMOR_SLOT_KO[slot]}`,
      tex: `${mat}_${slot}`,
      stackSize: 1,
      durability: Math.round(m.dur * (slot === 'chestplate' ? 1.6 : slot === 'leggings' ? 1.5 : 1)),
      armor: { slot: ARMOR_SLOT_INDEX[slot], defense: m.def[slot] },
    });
  }
}

/* ------------------------------------------------------------ 기타 도구 */
defItem('bucket', { display: '양동이', stackSize: 1 });
defItem('water_bucket', { display: '물 양동이', stackSize: 1, liquid: 'water' });
defItem('lava_bucket', { display: '용암 양동이', stackSize: 1, liquid: 'lava', fuel: 20000 });
defItem('bow', { display: '활', stackSize: 1, durability: 384, ranged: true, attack: 1 });
defItem('arrow', { display: '화살' });

/* ================================================================== 조회 */
/** 블록/아이템 공용 id 조회 */
function idOf(name) {
  if (name in BlockIds) return BlockIds[name];
  if (name in ItemIds) return ItemIds[name];
  console.warn('[items] 알 수 없는 이름:', name);
  return 0;
}

const _blockItemCache = Object.create(null);
/** id → 통합 아이템 정의 */
function getItem(id) {
  if (id >= ITEM_ID_BASE) return Items[id] || null;
  if (_blockItemCache[id]) return _blockItemCache[id];
  const b = Blocks[id];
  if (!b) return null;
  const def = {
    id, name: b.name, display: b.display, tex: b.itemTex, stackSize: b.stackSize,
    tool: null, durability: 0, food: null, armor: null, fuel: b.fuel,
    placeBlock: b.name, isBlock: true, blockId: id, attack: 1, liquid: null, ranged: false,
  };
  _blockItemCache[id] = def;
  return def;
}
function itemDisplay(id) { const d = getItem(id); return d ? d.display : '???'; }

/* ================================================================ 아이템 스택 */
function makeStack(nameOrId, count = 1, damage = 0) {
  const id = typeof nameOrId === 'string' ? idOf(nameOrId) : nameOrId;
  return { id, count, damage };
}
function stackMaxSize(st) { const d = getItem(st.id); return d ? d.stackSize : 64; }
function sameItem(a, b) {
  if (!a || !b) return false;
  return a.id === b.id && (a.damage || 0) === (b.damage || 0);
}
function copyStack(s) { return s ? { id: s.id, count: s.count, damage: s.damage || 0 } : null; }

/* ================================================================== 조합법 */
const Recipes = [];

/**
 * shaped: pattern(문자열 배열) + key(문자 → 이름 또는 이름 배열)
 * shapeless: 재료 이름 배열
 */
function recipe(result, count, pattern, key) {
  Recipes.push({ shaped: true, result, count, pattern, key });
}
function shapeless(result, count, ingredients) {
  Recipes.push({ shaped: false, result, count, ingredients });
}

const PLANKS = ['oak_planks', 'birch_planks', 'spruce_planks'];

/* 원목 → 판자 */
shapeless('oak_planks', 4, ['oak_log']);
shapeless('birch_planks', 4, ['birch_log']);
shapeless('spruce_planks', 4, ['spruce_log']);
/* 막대기 */
recipe('stick', 4, ['#', '#'], { '#': PLANKS });
/* 제작대 / 상자 / 화로 */
recipe('crafting_table', 1, ['##', '##'], { '#': PLANKS });
recipe('chest', 1, ['###', '# #', '###'], { '#': PLANKS });
recipe('furnace', 1, ['###', '# #', '###'], { '#': ['cobblestone'] });
/* 횃불 */
recipe('torch', 4, ['C', 'S'], { C: ['coal', 'charcoal'], S: ['stick'] });
/* 사다리 */
recipe('ladder', 3, ['# #', '###', '# #'], { '#': ['stick'] });
/* 책장 / 책 / 종이 */
recipe('paper', 3, ['###'], { '#': ['sugar_cane'] });
recipe('book', 1, ['#', '#', 'L'], { '#': ['paper'], L: ['leather'] });
recipe('bookshelf', 1, ['###', 'BBB', '###'], { '#': PLANKS, B: ['book'] });
/* 건축 자재 */
recipe('stone_bricks', 4, ['##', '##'], { '#': ['stone'] });
recipe('bricks', 1, ['##', '##'], { '#': ['brick_item'] });
recipe('sandstone', 1, ['##', '##'], { '#': ['sand'] });
recipe('wool_white', 1, ['##', '##'], { '#': ['string'] });
/* 압축 블록 */
const COMPRESS = [
  ['iron_ingot', 'iron_block'], ['gold_ingot', 'gold_block'], ['diamond', 'diamond_block'],
  ['emerald', 'emerald_block'], ['lapis_lazuli', 'lapis_block'], ['coal', 'coal_block'],
];
for (const [ing, blk] of COMPRESS) {
  recipe(blk, 1, ['###', '###', '###'], { '#': [ing] });
  shapeless(ing, 9, [blk]);
}
/* TNT */
recipe('tnt', 1, ['GSG', 'SGS', 'GSG'], { G: ['gunpowder'], S: ['sand'] });
/* 양동이 / 활 / 화살 */
recipe('bucket', 1, ['# #', ' # '], { '#': ['iron_ingot'] });
recipe('bow', 1, [' #S', '# S', ' #S'], { '#': ['stick'], S: ['string'] });
recipe('arrow', 4, ['F', 'S', 'P'], { F: ['flint'], S: ['stick'], P: ['feather'] });
/* 음식 */
recipe('bread', 1, ['###'], { '#': ['wheat_item'] });

/* 도구 / 방어구 자동 등록 */
const TOOL_INGREDIENT = {
  wooden: PLANKS, stone: ['cobblestone'], iron: ['iron_ingot'],
  golden: ['gold_ingot'], diamond: ['diamond'],
};
const TOOL_PATTERNS = {
  pickaxe: ['###', ' S ', ' S '],
  axe: ['##', '#S', ' S'],
  shovel: ['#', 'S', 'S'],
  sword: ['#', '#', 'S'],
  hoe: ['##', ' S', ' S'],
};
const ARMOR_PATTERNS = {
  helmet: ['###', '# #'],
  chestplate: ['# #', '###', '###'],
  leggings: ['###', '# #', '# #'],
  boots: ['# #', '# #'],
};
for (const mat in TOOL_INGREDIENT) {
  for (const kind in TOOL_PATTERNS) {
    recipe(`${mat}_${kind}`, 1, TOOL_PATTERNS[kind], { '#': TOOL_INGREDIENT[mat], S: ['stick'] });
  }
}
const ARMOR_INGREDIENT = {
  leather: ['leather'], iron: ['iron_ingot'], golden: ['gold_ingot'], diamond: ['diamond'],
};
for (const mat in ARMOR_INGREDIENT) {
  for (const slot in ARMOR_PATTERNS) {
    recipe(`${mat}_${slot}`, 1, ARMOR_PATTERNS[slot], { '#': ARMOR_INGREDIENT[mat] });
  }
}

/* ------------------------------------------------------- 조합 매칭 엔진 */
function _matchIngredient(spec, id) {
  if (id === 0 || id == null) return false;
  if (typeof spec === 'string') return idOf(spec) === id;
  for (const s of spec) if (idOf(s) === id) return true;
  return false;
}

/**
 * grid: 길이 size*size 의 스택 배열 (null 가능)
 * 반환: {result: stack, recipe} | null
 */
function findRecipe(grid, size) {
  for (const r of Recipes) {
    if (r.shaped) {
      const h = r.pattern.length, w = Math.max(...r.pattern.map((p) => p.length));
      if (h > size || w > size) continue;
      for (let oy = 0; oy + h <= size; oy++) {
        for (let ox = 0; ox + w <= size; ox++) {
          if (_shapedMatch(grid, size, r, ox, oy, w, h)) {
            return { result: makeStack(r.result, r.count), recipe: r };
          }
        }
      }
    } else {
      const need = r.ingredients.slice();
      const have = [];
      for (let i = 0; i < size * size; i++) if (grid[i]) have.push(grid[i].id);
      if (have.length !== need.length) continue;
      const used = new Array(have.length).fill(false);
      let ok = true;
      for (const n of need) {
        let found = -1;
        for (let i = 0; i < have.length; i++) {
          if (!used[i] && _matchIngredient([n], have[i])) { found = i; break; }
        }
        if (found < 0) { ok = false; break; }
        used[found] = true;
      }
      if (ok) return { result: makeStack(r.result, r.count), recipe: r };
    }
  }
  return null;
}

function _shapedMatch(grid, size, r, ox, oy, w, h) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const st = grid[y * size + x];
      const inside = x >= ox && x < ox + w && y >= oy && y < oy + h;
      let ch = ' ';
      if (inside) {
        const row = r.pattern[y - oy];
        ch = (row && row[x - ox]) || ' ';
      }
      if (ch === ' ') { if (st) return false; continue; }
      if (!st) return false;
      const spec = r.key[ch];
      if (!spec || !_matchIngredient(spec, st.id)) return false;
    }
  }
  return true;
}

/* ==================================================================== 제련 */
const Smelting = Object.create(null);
function smelt(input, output, count = 1, xp = 0.1, time = 200) {
  Smelting[idOf(input)] = { out: idOf(output), count, xp, time };
}
smelt('iron_ore', 'iron_ingot', 1, 0.7);
smelt('gold_ore', 'gold_ingot', 1, 1.0);
smelt('sand', 'glass', 1, 0.1);
smelt('cobblestone', 'stone', 1, 0.1);
smelt('clay_ball', 'brick_item', 1, 0.3);
smelt('clay', 'bricks', 1, 0.3);
smelt('oak_log', 'charcoal', 1, 0.15);
smelt('birch_log', 'charcoal', 1, 0.15);
smelt('spruce_log', 'charcoal', 1, 0.15);
smelt('porkchop', 'cooked_porkchop', 1, 0.35);
smelt('beef', 'cooked_beef', 1, 0.35);
smelt('chicken', 'cooked_chicken', 1, 0.35);
smelt('mutton', 'cooked_mutton', 1, 0.35);
smelt('diamond_ore', 'diamond', 1, 1.0);
smelt('emerald_ore', 'emerald', 1, 1.0);

function smeltResult(id) { return Smelting[id] || null; }
function fuelValue(id) {
  const d = getItem(id);
  return d ? (d.fuel || 0) : 0;
}

/* ============================================================ 채굴 시간 계산 */
/**
 * 블록을 부수는 데 걸리는 시간(초).
 * heldTool: 아이템 정의 (null = 맨손)
 */
function breakTime(block, heldItem, inWater, onGround) {
  if (block.hardness < 0) return Infinity;
  if (block.hardness === 0) return 0;
  let speed = 1;
  let canHarvest = block.tool === null || block.tier === TIER_HAND;
  if (heldItem && heldItem.tool) {
    if (heldItem.tool.kind === block.tool) {
      speed = heldItem.tool.speed;
      canHarvest = heldItem.tool.tier >= block.tier;
    } else if (block.tool === null) {
      speed = 1;
    }
  }
  if (block.tool === null) canHarvest = true;
  let damage = speed / block.hardness;
  damage /= canHarvest ? 30 : 100;
  if (inWater) damage /= 5;
  if (!onGround) damage /= 5;
  if (damage > 1) return 0;
  return 1 / (damage * 20) / 20;   // 초
}

function canHarvestBlock(block, heldItem) {
  if (block.tool === null || block.tier === TIER_HAND) return true;
  if (!heldItem || !heldItem.tool) return false;
  return heldItem.tool.kind === block.tool && heldItem.tool.tier >= block.tier;
}

/** 드롭 계산 */
function computeDrops(block, heldItem, rng) {
  const out = [];
  if (!canHarvestBlock(block, heldItem)) return out;
  for (const d of block.drops) {
    if (d.chance !== undefined && rng() > d.chance) continue;
    const n = d.min === d.max ? d.min : randInt(rng, d.min, d.max);
    if (n <= 0) continue;
    out.push(makeStack(d.name, n));
  }
  return out;
}
