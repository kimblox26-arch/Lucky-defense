/* =========================================================================
 *  gui.js — 인벤토리 계열 화면
 *  인벤토리 / 제작대 / 화로 / 상자 / 크리에이티브 목록
 *  아이템 아이콘은 블록이면 아이소메트릭 큐브로 즉석 렌더 후 캐시
 * ========================================================================= */
'use strict';

/* ------------------------------------------------------- 아이템 아이콘 */
const ItemIcons = {
  cache: new Map(),
  SIZE: 48,

  /**
   * 아이콘 캔버스를 얻는다.
   * size 는 "화면에 실제로 그려질 디바이스 픽셀 크기". 16의 배수로 맞춰서 캐시하므로
   * 16x16 원본이 정수 배율로만 확대되어 픽셀이 일그러지지 않는다.
   */
  get(id, size) {
    const px = Math.max(16, Math.round((size || this.SIZE) / TILE_SIZE) * TILE_SIZE);
    const key = id + ':' + px;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const c = document.createElement('canvas');
    c.width = c.height = px;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const def = getItem(id);
    if (!def) { this.cache.set(key, c); return c; }

    if (def.isBlock) {
      const b = Blocks[id];
      if (b.render === RENDER_CUBE && !b.itemTex) this._drawIsoCube(g, b, px);
      else this._drawFlat(g, b.itemTex || Textures.tiles[b.tiles[FACE_SOUTH]].name, px);
    } else {
      this._drawFlat(g, def.tex, px);
    }
    this.cache.set(key, c);
    return c;
  },

  /** 평면 아이템: 16x16 을 정확히 N배로 확대 (여백 없음 = 배율이 정수) */
  _drawFlat(g, texName, px) {
    const img = Textures.canvasOf(texName || 'missing');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE, 0, 0, px, px);
  },

  _drawIsoCube(g, block, px) {
    const S = px;
    const u = Math.round(S * 0.42);
    const cx = S / 2, cy = S / 2 + u * 0.18;
    const top = Textures.tiles[block.tiles[FACE_TOP]].canvas;
    const left = Textures.tiles[block.tiles[FACE_SOUTH]].canvas;
    const right = Textures.tiles[block.tiles[FACE_EAST]].canvas;

    const face = (img, ox, oy, vux, vuy, vvx, vvy, shade) => {
      g.save();
      g.beginPath();
      g.moveTo(cx + ox, cy + oy);
      g.lineTo(cx + ox + vux, cy + oy + vuy);
      g.lineTo(cx + ox + vux + vvx, cy + oy + vuy + vvy);
      g.lineTo(cx + ox + vvx, cy + oy + vvy);
      g.closePath();
      g.clip();
      g.transform(vux / 16, vuy / 16, vvx / 16, vvy / 16, cx + ox, cy + oy);
      g.drawImage(img, 0, 0, 16, 16, 0, 0, 16, 16);
      g.restore();
      if (shade > 0) {
        g.save();
        g.beginPath();
        g.moveTo(cx + ox, cy + oy);
        g.lineTo(cx + ox + vux, cy + oy + vuy);
        g.lineTo(cx + ox + vux + vvx, cy + oy + vuy + vvy);
        g.lineTo(cx + ox + vvx, cy + oy + vvy);
        g.closePath();
        g.fillStyle = `rgba(0,0,0,${shade})`;
        g.fill();
        g.restore();
      }
    };
    /* 윗면 */
    face(top, 0, -u, u, u * 0.5, -u, u * 0.5, 0);
    /* 왼쪽(남쪽) 면 */
    face(left, -u, -u * 0.5, u, u * 0.5, 0, u, 0.22);
    /* 오른쪽(동쪽) 면 */
    face(right, u, -u * 0.5, -u, u * 0.5, 0, u, 0.38);
  },
};

/* =========================================================================
 *  GUI 매니저
 * ========================================================================= */
class GUI {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.screen = null;              // null | 'inventory' | 'crafting' | 'furnace' | 'chest' | 'creative'
    this.slots = [];
    this.cursor = null;              // 마우스에 들고 있는 스택
    this.mouse = { x: 0, y: 0, gx: 0, gy: 0 };
    this.scale = 3;
    this.panelW = 176; this.panelH = 166;
    this.blockPos = null;
    this.creativePage = 0;
    this.creativeItems = [];
    this.hoverSlot = -1;
    this._buildCreativeList();
  }

  get open() { return this.screen !== null; }

  _buildCreativeList() {
    const list = [];
    for (const id of allPlaceableBlockIds()) list.push(id);
    for (const name in ItemIds) list.push(ItemIds[name]);
    this.creativeItems = list;
  }

  /* --------------------------------------------------------- 열기/닫기 */
  openScreen(type, x, y, z) {
    this.screen = type;
    this.blockPos = (x !== undefined) ? { x, y, z } : null;
    this.game.input.exitPointerLock();
    if (type === 'crafting') this.game.player.craftGrid3 = this.game.player.craftGrid3 || new CraftingGrid(3);
    this.layout();
  }

  close() {
    const p = this.game.player;
    /* 제작 그리드 아이템 반환 */
    if (p) {
      p.craftGrid.clearInto(p.inventory, this.game.entities, p.x, p.y + 1, p.z);
      if (p.craftGrid3) p.craftGrid3.clearInto(p.inventory, this.game.entities, p.x, p.y + 1, p.z);
      if (this.cursor) {
        const left = p.inventory.addStack(this.cursor);
        if (left) this.game.entities.spawnItem(p.x, p.y + 1, p.z, left);
        this.cursor = null;
      }
    }
    this.screen = null;
    this.blockPos = null;
    this.game.input.requestPointerLock();
  }

  toggleInventory() {
    if (this.screen === 'inventory' || this.screen === 'creative') this.close();
    else this.openScreen(this.game.player.gameMode === GM_CREATIVE ? 'creative' : 'inventory');
  }

  /* ---------------------------------------------------------- 레이아웃 */
  layout() {
    const p = this.game.player;
    const inv = p.inventory;
    this.slots = [];
    const S = this.slots;
    const addSlot = (x, y, get, set, tag) => S.push({ x, y, get, set, tag });

    const addInvSlots = (oy) => {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
          const i = 9 + r * 9 + c;
          addSlot(8 + c * 18, oy + r * 18, () => inv.get(i), (v) => inv.set(i, v), 'inv');
        }
      }
      for (let c = 0; c < 9; c++) {
        const i = c;
        addSlot(8 + c * 18, oy + 58, () => inv.get(i), (v) => inv.set(i, v), 'hotbar');
      }
    };

    switch (this.screen) {
      case 'inventory': {
        this.panelW = 176; this.panelH = 166;
        this.title = '제작';
        for (let i = 0; i < 4; i++) {
          addSlot(8, 8 + i * 18, () => inv.armor[i], (v) => { inv.armor[i] = v; }, 'armor' + i);
        }
        const g = p.craftGrid;
        for (let i = 0; i < 4; i++) {
          const ix = i % 2, iy = (i / 2) | 0;
          addSlot(98 + ix * 18, 18 + iy * 18,
            () => g.slots[i], (v) => { g.slots[i] = v; g.update(); }, 'craft');
        }
        addSlot(154, 28, () => { g.update(); return g.result; }, () => { }, 'result');
        addInvSlots(84);
        break;
      }
      case 'crafting': {
        this.panelW = 176; this.panelH = 166;
        this.title = '제작대';
        const g = p.craftGrid3;
        for (let i = 0; i < 9; i++) {
          const ix = i % 3, iy = (i / 3) | 0;
          addSlot(30 + ix * 18, 17 + iy * 18,
            () => g.slots[i], (v) => { g.slots[i] = v; g.update(); }, 'craft');
        }
        addSlot(124, 35, () => { g.update(); return g.result; }, () => { }, 'result');
        addInvSlots(84);
        break;
      }
      case 'furnace': {
        this.panelW = 176; this.panelH = 166;
        this.title = '화로';
        const be = this.game.world.getBlockEntity(this.blockPos.x, this.blockPos.y, this.blockPos.z);
        this.furnace = be;
        addSlot(56, 17, () => be.input, (v) => { be.input = v; }, 'furnace_in');
        addSlot(56, 53, () => be.fuel, (v) => { be.fuel = v; }, 'furnace_fuel');
        addSlot(116, 35, () => be.output, (v) => { be.output = v; }, 'furnace_out');
        addInvSlots(84);
        break;
      }
      case 'chest': {
        this.panelW = 176; this.panelH = 184;
        this.title = '상자';
        const be = this.game.world.getBlockEntity(this.blockPos.x, this.blockPos.y, this.blockPos.z);
        this.chest = be;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 9; c++) {
            const i = r * 9 + c;
            addSlot(8 + c * 18, 18 + r * 18, () => be.items[i] || null, (v) => { be.items[i] = v; }, 'chest');
          }
        }
        addInvSlots(102);
        break;
      }
      case 'creative': {
        this.panelW = 195; this.panelH = 186;
        this.title = '크리에이티브 아이템';
        const perPage = 45;
        const start = this.creativePage * perPage;
        for (let i = 0; i < perPage; i++) {
          const id = this.creativeItems[start + i];
          if (id === undefined) break;
          const ix = i % 9, iy = (i / 9) | 0;
          addSlot(9 + ix * 18, 18 + iy * 18,
            () => makeStack(id, stackMaxSize({ id })), () => { }, 'creative');
        }
        for (let c = 0; c < 9; c++) {
          const i = c;
          addSlot(9 + c * 18, 154, () => inv.get(i), (v) => inv.set(i, v), 'hotbar');
        }
        break;
      }
      default: break;
    }
  }

  /* ------------------------------------------------------------ 입력 */
  guiOrigin() {
    const w = this.canvas.width, h = this.canvas.height;
    return {
      x: Math.floor((w / this.scale - this.panelW) / 2),
      y: Math.floor((h / this.scale - this.panelH) / 2),
    };
  }

  updateMouse(cx, cy) {
    this.mouse.x = cx; this.mouse.y = cy;
    const o = this.guiOrigin();
    this.mouse.gx = cx / this.scale - o.x;
    this.mouse.gy = cy / this.scale - o.y;
    this.hoverSlot = this.slotAt(this.mouse.gx, this.mouse.gy);
  }

  slotAt(gx, gy) {
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (gx >= s.x && gx < s.x + 18 && gy >= s.y && gy < s.y + 18) return i;
    }
    return -1;
  }

  click(button, shift) {
    const i = this.hoverSlot;
    if (i < 0) {
      /* 패널 밖 클릭 → 아이템 버리기 */
      if (this.cursor && (this.mouse.gx < 0 || this.mouse.gy < 0 ||
        this.mouse.gx > this.panelW || this.mouse.gy > this.panelH)) {
        const p = this.game.player;
        this.game.entities.spawnItem(p.x, p.eyeY - 0.3, p.z, this.cursor);
        this.cursor = null;
      }
      return;
    }
    const slot = this.slots[i];
    const p = this.game.player;

    /* 제작 결과 슬롯 */
    if (slot.tag === 'result') {
      const grid = this.screen === 'crafting' ? p.craftGrid3 : p.craftGrid;
      grid.update();
      if (!grid.result) return;
      if (shift) {
        let guard = 0;
        while (grid.result && guard++ < 64) {
          const out = grid.takeResult();
          const left = p.inventory.addStack(out);
          if (left) { this.game.entities.spawnItem(p.x, p.y + 1, p.z, left); break; }
        }
        AudioSys.click();
        return;
      }
      if (!this.cursor) { this.cursor = grid.takeResult(); AudioSys.click(); }
      else if (sameItem(this.cursor, grid.result) &&
        this.cursor.count + grid.result.count <= stackMaxSize(this.cursor)) {
        const out = grid.takeResult();
        this.cursor.count += out.count;
        AudioSys.click();
      }
      return;
    }

    /* 크리에이티브 목록 */
    if (slot.tag === 'creative') {
      const st = slot.get();
      if (shift) { p.inventory.addStack(copyStack(st)); return; }
      this.cursor = copyStack(st);
      return;
    }

    /* 화로 결과 */
    if (slot.tag === 'furnace_out') {
      const st = slot.get();
      if (!st) return;
      if (shift || !this.cursor) {
        if (shift) {
          const left = p.inventory.addStack(st);
          slot.set(left);
        } else {
          this.cursor = st; slot.set(null);
        }
        if (this.furnace && this.furnace.xp) {
          p.addXP(Math.max(1, Math.floor(this.furnace.xp)));
          this.furnace.xp = 0;
        }
        AudioSys.click();
      } else if (sameItem(this.cursor, st)) {
        const max = stackMaxSize(st);
        const move = Math.min(max - this.cursor.count, st.count);
        this.cursor.count += move; st.count -= move;
        slot.set(st.count > 0 ? st : null);
      }
      return;
    }

    /* 시프트 클릭 = 빠른 이동 */
    if (shift) {
      this.quickMove(slot);
      AudioSys.click();
      return;
    }

    /* 방어구 슬롯: 방어구만 */
    if (slot.tag && slot.tag.startsWith('armor')) {
      const idx = parseInt(slot.tag.slice(5), 10);
      if (this.cursor) {
        const def = getItem(this.cursor.id);
        if (!def || !def.armor || def.armor.slot !== idx) return;
      }
    }

    if (button === 2) {
      this.cursor = SlotOps.rightClick(slot.get, slot.set, this.cursor);
    } else {
      this.cursor = SlotOps.leftClick(slot.get, slot.set, this.cursor);
    }
    AudioSys.click();
  }

  quickMove(slot) {
    const p = this.game.player;
    const st = slot.get();
    if (!st) return;
    const inv = p.inventory;

    if (slot.tag === 'inv' || slot.tag === 'hotbar') {
      /* 다른 컨테이너로 */
      if (this.screen === 'chest' && this.chest) {
        const cont = new Container(27);
        cont.slots = this.chest.items;
        const left = cont.addStack(st);
        slot.set(left);
        return;
      }
      if (this.screen === 'furnace' && this.furnace) {
        if (fuelValue(st.id) > 0 && !this.furnace.fuel) { this.furnace.fuel = st; slot.set(null); return; }
        if (smeltResult(st.id) && !this.furnace.input) { this.furnace.input = st; slot.set(null); return; }
      }
      /* 인벤 ↔ 핫바 */
      const from = slot.tag === 'hotbar' ? 9 : 0;
      const to = slot.tag === 'hotbar' ? 36 : 9;
      const left = inv.addStack ? (() => {
        const container = new Container(0);
        container.slots = inv.slots;
        return container.addStack(st, from, to);
      })() : st;
      slot.set(left);
      return;
    }
    /* 컨테이너 → 인벤토리 */
    const left = inv.addStack(st);
    slot.set(left);
  }

  scroll(dy) {
    if (this.screen !== 'creative') return;
    const perPage = 45;
    const maxPage = Math.ceil(this.creativeItems.length / perPage) - 1;
    this.creativePage = clamp(this.creativePage + (dy > 0 ? 1 : -1), 0, maxPage);
    this.layout();
  }

  /* ==================================================================
   *  렌더링
   * ================================================================ */
  render() {
    const ctx = this.ctx;
    const c = this.canvas;
    /* 백버퍼 크기를 CSS 크기 × DPR 로 맞춘다 (놓치면 화면 전체가 늘어난다) */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.floor(c.clientWidth * dpr));
    const H = Math.max(1, Math.floor(c.clientHeight * dpr));
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!this.open) return;

    this.scale = clamp(Math.floor(Math.min(W / 400, H / 300)), 2, 5);
    ctx.imageSmoothingEnabled = false;

    /* 어두운 배경 */
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    const o = this.guiOrigin();
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.translate(o.x, o.y);

    this._panel(ctx, 0, 0, this.panelW, this.panelH);

    /* 제목 */
    ctx.fillStyle = '#3f3f3f';
    ctx.font = '9px "DungGeunMo", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title || '', 8, 10);
    ctx.font = '8px "DungGeunMo", monospace';
    ctx.textBaseline = 'top';

    /* 화로 진행 표시 */
    if (this.screen === 'furnace' && this.furnace) this._furnaceProgress(ctx, this.furnace);
    if (this.screen === 'creative') {
      ctx.fillStyle = '#3f3f3f';
      const perPage = 45;
      const maxPage = Math.ceil(this.creativeItems.length / perPage);
      ctx.fillText(`페이지 ${this.creativePage + 1}/${maxPage}  (휠로 이동)`, 9, 140);
    }

    /* 슬롯 */
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      this._slotBg(ctx, s.x, s.y);
      const st = s.get();
      if (st) this._drawItem(ctx, st, s.x + 1, s.y + 1);
      if (i === this.hoverSlot) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(s.x + 1, s.y + 1, 16, 16);
      }
    }

    /* 커서 아이템 */
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    if (this.cursor) {
      this._drawItem(ctx, this.cursor,
        this.mouse.x / this.scale - 8, this.mouse.y / this.scale - 8);
    }

    /* 툴팁 */
    if (!this.cursor && this.hoverSlot >= 0) {
      const st = this.slots[this.hoverSlot].get();
      if (st) this._tooltip(ctx, st, this.mouse.x / this.scale, this.mouse.y / this.scale);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  _panel(ctx, x, y, w, h) {
    ctx.fillStyle = '#c6c6c6';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = '#565656';
    ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x + w - 2, y, 2, h);
  }

  _slotBg(ctx, x, y) {
    ctx.fillStyle = '#8b8b8b';
    ctx.fillRect(x, y, 18, 18);
    ctx.fillStyle = '#373737';
    ctx.fillRect(x, y, 17, 1); ctx.fillRect(x, y, 1, 17);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 1, y + 17, 17, 1); ctx.fillRect(x + 17, y + 1, 1, 17);
  }

  _drawItem(ctx, st, x, y) {
    /* 슬롯 한 칸은 화면에서 16 * scale 픽셀 → 같은 크기의 아이콘을 써서 1:1 로 찍는다 */
    const icon = ItemIcons.get(st.id, 16 * this.scale);
    ctx.drawImage(icon, x, y, 16, 16);
    const def = getItem(st.id);
    if (st.count > 1) {
      ctx.font = '8px "DungGeunMo", monospace';
      ctx.textBaseline = 'top';
      const s = String(st.count);
      const tw = ctx.measureText(s).width;
      ctx.fillStyle = '#000000';
      ctx.fillText(s, x + 17 - tw, y + 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s, x + 16 - tw, y + 9);
    }
    if (def && def.durability && st.damage > 0) {
      const f = 1 - st.damage / def.durability;
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 1, y + 13, 14, 2);
      ctx.fillStyle = `hsl(${Math.round(f * 110)},90%,45%)`;
      ctx.fillRect(x + 1, y + 13, Math.max(0, Math.round(14 * f)), 1);
    }
  }

  _tooltip(ctx, st, gx, gy) {
    const def = getItem(st.id);
    if (!def) return;
    const lines = [def.display];
    if (def.tool) lines.push(`도구 · 등급 ${def.tool.tier}`);
    if (def.armor) lines.push(`방어력 +${def.armor.defense}`);
    if (def.food) lines.push(`허기 +${def.food.hunger}`);
    if (def.durability) lines.push(`내구도 ${def.durability - (st.damage || 0)}/${def.durability}`);
    if (def.fuel) lines.push(`연료 ${Math.round(def.fuel / 200)}회 제련`);

    ctx.font = '8px "DungGeunMo", monospace';
    let w = 0;
    for (const l of lines) w = Math.max(w, ctx.measureText(l).width);
    const h = lines.length * 10 + 6;
    let x = gx + 8, y = gy - 12;
    const o = this.guiOrigin();
    x -= o.x; y -= o.y;
    ctx.fillStyle = 'rgba(16,0,32,0.92)';
    ctx.fillRect(x, y, w + 8, h);
    ctx.strokeStyle = 'rgba(80,0,160,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w + 7, h - 1);
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = i === 0 ? '#ffffff' : '#a0a0b0';
      ctx.fillText(lines[i], x + 4, y + 4 + i * 10);
    }
  }

  _furnaceProgress(ctx, be) {
    /* 불꽃 */
    if (be.burnTime > 0 && be.burnTotal > 0) {
      const f = be.burnTime / be.burnTotal;
      const h = Math.round(13 * f);
      ctx.fillStyle = '#ffb02a';
      ctx.fillRect(57, 36 + (13 - h), 14, h);
      ctx.fillStyle = '#ff6a12';
      ctx.fillRect(59, 38 + (13 - h), 10, Math.max(0, h - 2));
    }
    /* 화살표 */
    ctx.fillStyle = '#8b8b8b';
    ctx.fillRect(80, 38, 22, 10);
    const p = clamp(be.cookTime / 200, 0, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(80, 38, Math.round(22 * p), 10);
    ctx.fillStyle = '#565656';
    ctx.fillRect(80, 43, 22, 1);
  }
}
