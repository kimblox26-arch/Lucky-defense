/* =========================================================================
 *  inventory.js — 인벤토리 / 상자 / 제작 그리드 / 화로 슬롯 처리
 * ========================================================================= */
'use strict';

class Container {
  constructor(size) { this.slots = new Array(size).fill(null); }
  get size() { return this.slots.length; }
  get(i) { return this.slots[i] || null; }
  set(i, st) { this.slots[i] = (st && st.count > 0) ? st : null; }

  /** 스택 추가. 남은 수량이 있는 스택을 반환(없으면 null) */
  addStack(stack, from = 0, to = -1) {
    if (!stack) return null;
    const end = to < 0 ? this.slots.length : to;
    const max = stackMaxSize(stack);
    /* 1) 기존 스택에 합치기 */
    for (let i = from; i < end; i++) {
      const s = this.slots[i];
      if (!s || !sameItem(s, stack)) continue;
      const space = max - s.count;
      if (space <= 0) continue;
      const move = Math.min(space, stack.count);
      s.count += move; stack.count -= move;
      if (stack.count <= 0) return null;
    }
    /* 2) 빈 칸 */
    for (let i = from; i < end; i++) {
      if (this.slots[i]) continue;
      const move = Math.min(max, stack.count);
      this.slots[i] = { id: stack.id, count: move, damage: stack.damage || 0 };
      stack.count -= move;
      if (stack.count <= 0) return null;
    }
    return stack;
  }

  /** 해당 아이템을 n개 소비. 성공 여부 */
  consume(id, n) {
    let need = n;
    for (let i = 0; i < this.slots.length && need > 0; i++) {
      const s = this.slots[i];
      if (!s || s.id !== id) continue;
      const take = Math.min(need, s.count);
      s.count -= take; need -= take;
      if (s.count <= 0) this.slots[i] = null;
    }
    return need === 0;
  }

  count(id) {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.count;
    return n;
  }
  has(id, n = 1) { return this.count(id) >= n; }

  clear() { this.slots.fill(null); }

  serialize() {
    return this.slots.map((s) => (s ? [s.id, s.count, s.damage || 0] : 0));
  }
  deserialize(arr) {
    if (!arr) return;
    for (let i = 0; i < this.slots.length; i++) {
      const v = arr[i];
      this.slots[i] = (v && v !== 0) ? { id: v[0], count: v[1], damage: v[2] || 0 } : null;
    }
  }
}

/** 플레이어 인벤토리: 0-8 핫바, 9-35 보관, armor 4칸 */
class Inventory extends Container {
  constructor() {
    super(36);
    this.armor = new Array(4).fill(null);
    this.selected = 0;
  }
  get held() { return this.slots[this.selected]; }
  setHeld(st) { this.slots[this.selected] = st; }

  /** 핫바 우선으로 추가 */
  addStack(stack) {
    if (!stack) return null;
    let left = super.addStack(stack, 0, 9);
    if (!left) return null;
    return super.addStack(left, 9, 36);
  }

  /** 방어력 합계 */
  get defense() {
    let d = 0;
    for (const a of this.armor) {
      if (!a) continue;
      const def = getItem(a.id);
      if (def && def.armor) d += def.armor.defense;
    }
    return d;
  }

  /** 방어구 내구도 소모 */
  damageArmor(amount) {
    for (let i = 0; i < 4; i++) {
      const a = this.armor[i];
      if (!a) continue;
      const def = getItem(a.id);
      if (!def || !def.durability) continue;
      a.damage = (a.damage || 0) + amount;
      if (a.damage >= def.durability) this.armor[i] = null;
    }
  }

  serialize() {
    return {
      main: super.serialize(),
      armor: this.armor.map((s) => (s ? [s.id, s.count, s.damage || 0] : 0)),
      selected: this.selected,
    };
  }
  deserialize(d) {
    if (!d) return;
    super.deserialize(d.main);
    if (d.armor) {
      for (let i = 0; i < 4; i++) {
        const v = d.armor[i];
        this.armor[i] = (v && v !== 0) ? { id: v[0], count: v[1], damage: v[2] || 0 } : null;
      }
    }
    this.selected = d.selected || 0;
  }
}

/** 제작 그리드 (2x2 또는 3x3) */
class CraftingGrid {
  constructor(size) {
    this.size = size;
    this.slots = new Array(size * size).fill(null);
    this.result = null;
    this.matched = null;
  }
  update() {
    const m = findRecipe(this.slots, this.size);
    this.matched = m;
    this.result = m ? m.result : null;
    return this.result;
  }
  /** 결과를 1회 가져가며 재료 소비 */
  takeResult() {
    if (!this.result) return null;
    const out = copyStack(this.result);
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s) continue;
      s.count--;
      if (s.count <= 0) this.slots[i] = null;
    }
    this.update();
    return out;
  }
  clearInto(inv, mgr, x, y, z) {
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s) continue;
      const left = inv.addStack(s);
      if (left && mgr) mgr.spawnItem(x, y, z, left);
      this.slots[i] = null;
    }
    this.result = null;
  }
}

/* =========================================================================
 *  GUI 슬롯 상호작용 (좌클릭 집기/놓기, 우클릭 반개, 시프트 이동)
 * ========================================================================= */
const SlotOps = {
  /** cursor 와 슬롯 사이 좌클릭 상호작용. 새 cursor 반환 */
  leftClick(getSlot, setSlot, cursor) {
    const slot = getSlot();
    if (!cursor) {
      setSlot(null);
      return slot;
    }
    if (!slot) { setSlot(cursor); return null; }
    if (sameItem(slot, cursor)) {
      const max = stackMaxSize(slot);
      const move = Math.min(max - slot.count, cursor.count);
      if (move > 0) {
        slot.count += move; cursor.count -= move;
        setSlot(slot);
        return cursor.count > 0 ? cursor : null;
      }
    }
    setSlot(cursor);
    return slot;
  },

  /** 우클릭: 슬롯이 비었으면 절반 집기, 커서가 있으면 1개 놓기 */
  rightClick(getSlot, setSlot, cursor) {
    const slot = getSlot();
    if (!cursor) {
      if (!slot) return null;
      const half = Math.ceil(slot.count / 2);
      const taken = { id: slot.id, count: half, damage: slot.damage || 0 };
      slot.count -= half;
      setSlot(slot.count > 0 ? slot : null);
      return taken;
    }
    if (!slot) {
      setSlot({ id: cursor.id, count: 1, damage: cursor.damage || 0 });
      cursor.count--;
      return cursor.count > 0 ? cursor : null;
    }
    if (sameItem(slot, cursor) && slot.count < stackMaxSize(slot)) {
      slot.count++; cursor.count--;
      setSlot(slot);
      return cursor.count > 0 ? cursor : null;
    }
    return cursor;
  },
};
