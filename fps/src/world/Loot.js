// 배틀그라운드식 지상 보급. 맵에 무기/탄약/구급킷/방어구가 흩어져 있고,
// 가까이 가면 [E] 획득 프롬프트가 뜬다. game.systems에 등록해 사용한다.

import {
  Group, Mesh, BoxGeometry, CylinderGeometry,
  MeshStandardMaterial, MeshBasicMaterial, Color, DoubleSide,
} from 'three';
import { Rng, clamp01 } from '../core/Util.js';
import { ARENA } from './Arena.js';

const PICKUP_RADIUS = 2.6;

// 소모품 정의
const CONSUMABLE = {
  ammo: { color: 0x8a9a55, beam: 0x9dff5c, label: '탄약 보급', tag: '탄약' },
  medkit: { color: 0xb5352c, beam: 0xff5a4a, label: '구급 키트', tag: '치료' },
  armor: { color: 0x2b7f92, beam: 0x5ad4e6, label: '방어 조끼', tag: '방어구' },
};

// 무기 루트: 무기 id → 표식 색
const WEAPON_LOOT = {
  smg: 0x6a8fbf, shotgun: 0xbf6a3a, rifle: 0x9a7b52, sniper: 0xa24a72,
};

export class Loot {
  constructor(game) {
    this.game = game;
    this.group = new Group();
    this.group.name = 'loot';
    game.engine.scene.add(this.group);
    this.items = [];
    this.rng = new Rng(0x100c + 7);
    this._near = null;
    this._matCache = {};
  }

  _mat(color, emissive = false) {
    const key = color + (emissive ? 'e' : '');
    if (this._matCache[key]) return this._matCache[key];
    const m = emissive
      ? new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.5, depthWrite: false, side: DoubleSide, fog: true })
      : new MeshStandardMaterial({ color: new Color(color), roughness: 0.7, metalness: 0.15, envMapIntensity: 0.8, emissive: new Color(color).multiplyScalar(0.12) });
    this._matCache[key] = m;
    return m;
  }

  _makeMesh(kind, color, beam) {
    const g = new Group();
    // 상자 본체
    const box = new Mesh(new BoxGeometry(0.7, 0.5, 0.7), this._mat(color));
    box.position.y = 0.25;
    box.castShadow = true;
    g.add(box);
    // 뚜껑 테두리
    const lid = new Mesh(new BoxGeometry(0.78, 0.09, 0.78), this._mat(new Color(color).multiplyScalar(1.3).getHex()));
    lid.position.y = 0.52;
    g.add(lid);
    // 떠 있는 아이콘 큐브 (회전/부유)
    const icon = new Mesh(new BoxGeometry(0.26, 0.26, 0.26), this._mat(beam, false));
    icon.material = new MeshStandardMaterial({
      color: new Color(beam), emissive: new Color(beam), emissiveIntensity: 1.4,
      roughness: 0.4, metalness: 0.1,
    });
    icon.position.y = 1.15;
    g.add(icon);
    // 광주 (멀리서 보이는 기둥)
    const beamMesh = new Mesh(new CylinderGeometry(0.13, 0.13, 6, 8, 1, true), this._mat(beam, true));
    beamMesh.position.y = 3;
    g.add(beamMesh);
    g.userData.icon = icon;
    g.userData.beam = beamMesh;
    return g;
  }

  _spawn(kind, weaponId, x, z) {
    const isWeapon = kind === 'weapon';
    const color = isWeapon ? WEAPON_LOOT[weaponId] : CONSUMABLE[kind].color;
    const beam = isWeapon ? new Color(color).multiplyScalar(1.5).getHex() : CONSUMABLE[kind].beam;
    const y = this.game.collision.groundHeight(x, z, 6);
    const mesh = this._makeMesh(kind, color, beam);
    mesh.position.set(x, isFinite(y) ? y : 0, z);
    this.group.add(mesh);
    const item = { kind, weaponId, x, z, y: mesh.position.y, mesh, phase: this.rng.range(0, 6.28), taken: false };
    this.items.push(item);
    return item;
  }

  /** 유효한 지상 위치를 찾는다 (중앙 플랫폼/벽 근처 회피) */
  _findSpot() {
    const r = this.rng;
    for (let tries = 0; tries < 24; tries++) {
      const ang = r.range(0, Math.PI * 2);
      const rad = r.range(ARENA.half * 0.14, ARENA.half * 0.86);
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      if (Math.hypot(x, z) < 9) continue;            // 중앙 플랫폼 회피
      const y = this.game.collision.groundHeight(x, z, 6);
      if (!isFinite(y) || y > 1.5) continue;         // 지형 위/구조물 위 회피
      return { x, z };
    }
    return { x: r.range(-10, 10), z: r.range(12, 20) };
  }

  onRunStart() {
    this.clear();
    const density = this.game.arena?.density ?? 1;
    // 잠긴 무기를 지상에 배치 (배그식 무기 획득)
    const locked = this.game.weapons.list
      .filter((w) => !w.def.unlocked && WEAPON_LOOT[w.def.id]);
    for (const w of locked) {
      const s = this._findSpot();
      this._spawn('weapon', w.def.id, s.x, s.z);
    }
    // 소모품 스캐터 — 맵이 클수록 많이
    const kinds = ['ammo', 'ammo', 'medkit', 'armor'];
    const n = Math.round(6 + density * 4);
    for (let i = 0; i < n; i++) {
      const s = this._findSpot();
      this._spawn(this.rng.pick(kinds), null, s.x, s.z);
    }
  }

  /** 웨이브 클리어 시 소모품 일부 재보급 */
  restock() {
    const density = this.game.arena?.density ?? 1;
    const n = Math.round(2 + density * 1.5);
    const kinds = ['ammo', 'medkit', 'armor', 'ammo'];
    for (let i = 0; i < n; i++) {
      const s = this._findSpot();
      this._spawn(this.rng.pick(kinds), null, s.x, s.z);
    }
  }

  onRunEnd() { this.clear(); }

  clear() {
    for (const it of this.items) this.group.remove(it.mesh);
    this.items.length = 0;
    this._near = null;
    this.game.hud?.prompt(null);
  }

  _label(item) {
    if (item.kind === 'weapon') {
      const w = this.game.weapons.list.find((x) => x.def.id === item.weaponId);
      return `${w?.def.short || '무기'} · ${w?.def.name || ''}`;
    }
    return CONSUMABLE[item.kind].label;
  }

  _pickup(item) {
    item.taken = true;
    this.group.remove(item.mesh);
    const g = this.game;
    const p = g.player;
    let msg = '';
    if (item.kind === 'weapon') {
      const w = g.weapons.list.find((x) => x.def.id === item.weaponId);
      if (w) {
        g.weapons.unlock(item.weaponId);
        w.reserve = w.def.reserveMax === Infinity ? Infinity : w.def.reserveMax;
        g.hud?.refreshSlots();
        msg = `${w.def.name} 확보`;
      }
    } else if (item.kind === 'ammo') {
      g.weapons.giveAmmo(0.85);
      msg = '탄약 보급 완료';
    } else if (item.kind === 'medkit') {
      p.heal(60);
      msg = '체력 회복';
    } else if (item.kind === 'armor') {
      p.armorMax = Math.max(p.armorMax, 100);
      p.armor = p.armorMax;
      msg = '방어구 장착';
    }
    g.audio?.pickup?.(item.kind);
    g.fx?.particles.sparkle(item.x, item.y + 0.8, item.z, [0.6, 2.2, 1.0], 8);
    g.hud?.banner_(msg);
    // 배열에서 제거
    const idx = this.items.indexOf(item);
    if (idx >= 0) this.items.splice(idx, 1);
    this._near = null;
    g.hud?.prompt(null);
  }

  update(dt, intent, playing) {
    if (!playing) { if (this._near) { this._near = null; this.game.hud?.prompt(null); } return; }
    const p = this.game.player.position;
    // 가장 가까운 획득 가능 아이템
    let near = null, nd = PICKUP_RADIUS * PICKUP_RADIUS;
    for (const it of this.items) {
      const dx = it.x - p.x, dz = it.z - p.z;
      const d = dx * dx + dz * dz;
      if (d < nd) { nd = d; near = it; }
    }
    if (near !== this._near) {
      this._near = near;
      this.game.hud?.prompt(near ? `<b>[E]</b> ${this._label(near)} 획득` : null);
    }
    if (near && intent.interactPressed) this._pickup(near);
  }

  preRender(d, raw) {
    for (const it of this.items) {
      const icon = it.mesh.userData.icon;
      icon.rotation.y = raw * 1.6 + it.phase;
      icon.position.y = 1.15 + Math.sin(raw * 2 + it.phase) * 0.09;
      const beam = it.mesh.userData.beam;
      beam.material.opacity = 0.32 + 0.16 * clamp01(0.5 + 0.5 * Math.sin(raw * 2.4 + it.phase));
    }
  }
}
