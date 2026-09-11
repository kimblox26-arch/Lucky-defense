/* =========================================================================
 *  hud.js — 화면 표시
 *  조준점 · 핫바 · 체력/허기/방어구/산소/경험치 · 아이템 이름 ·
 *  F3 디버그 · 채팅 · 피격 오버레이 · 사망 화면 · 수중 필터
 * ========================================================================= */
'use strict';

/* 작은 아이콘을 코드로 생성 */
const HUD_ICONS = {};
function buildHudIcons() {
  const make = (name, rows, map) => {
    const c = document.createElement('canvas');
    c.width = 9; c.height = 9;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let r = 0; r < rows.length; r++) {
      for (let x = 0; x < rows[r].length; x++) {
        const col = map[rows[r][x]];
        if (!col) continue;
        g.fillStyle = col; g.fillRect(x, r, 1, 1);
      }
    }
    HUD_ICONS[name] = c;
  };

  const heartShape = [
    '.oo.ooo..',
    'ohhohhho.',
    'ohhhhhho.',
    'ohhhhhho.',
    '.ohhhhho.',
    '..ohhho..',
    '...oho...',
    '....o....',
    '.........',
  ];
  make('heart_full', heartShape, { o: '#3b0b0b', h: '#e02b2b' });
  make('heart_half', heartShape.map((r, i) => r.split('').map((ch, x) => (x > 4 && ch === 'h' ? 'd' : ch)).join('')),
    { o: '#3b0b0b', h: '#e02b2b', d: '#5a5a5a' });
  make('heart_empty', heartShape, { o: '#2a2a2a', h: '#4a4a4a' });

  const foodShape = [
    '...ooo...',
    '..offfo..',
    '.offfffo.',
    'offfffffo',
    'offfffffo',
    '.ooffffo.',
    '...offo..',
    '...ooo...',
    '.........',
  ];
  make('food_full', foodShape, { o: '#3a2410', f: '#c68a3a' });
  make('food_half', foodShape.map((r, i) => r.split('').map((ch, x) => (x > 4 && ch === 'f' ? 'd' : ch)).join('')),
    { o: '#3a2410', f: '#c68a3a', d: '#4a4a4a' });
  make('food_empty', foodShape, { o: '#2a2a2a', f: '#4a4a4a' });

  const armorShape = [
    '..ooooo..',
    '.ooaaaoo.',
    'ooaaaaaoo',
    'oaaaaaaao',
    'oaaaaaaao',
    '.oaaaaao.',
    '..oaaao..',
    '...ooo...',
    '.........',
  ];
  make('armor_full', armorShape, { o: '#2a2a2a', a: '#d8d8d8' });
  make('armor_half', armorShape.map((r) => r.split('').map((ch, x) => (x > 4 && ch === 'a' ? 'd' : ch)).join('')),
    { o: '#2a2a2a', a: '#d8d8d8', d: '#4a4a4a' });
  make('armor_empty', armorShape, { o: '#2a2a2a', a: '#3a3a3a' });

  make('bubble', [
    '..ooo....',
    '.owwwo...',
    'owwwwwo..',
    'owwwwwo..',
    'owwwwwo..',
    '.owwwo...',
    '..ooo....',
    '.........',
    '.........',
  ], { o: '#0a2a4a', w: '#bde4ff' });
}

class HUD {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.scale = 3;
    this.itemNameTimer = 0;
    this.itemName = '';
    this.messages = [];
    this.showDebug = false;
    this.fps = new Averager(40);
    this.pickups = [];
    this.hurtFlash = 0;
    buildHudIcons();
  }

  addMessage(text, color = '#ffffff') {
    this.messages.push({ text, color, time: 10 });
    if (this.messages.length > 60) this.messages.shift();
  }

  showPickup(stack) {
    const def = getItem(stack.id);
    if (!def) return;
    for (const p of this.pickups) {
      if (p.id === stack.id) { p.count += stack.count; p.time = 3; return; }
    }
    this.pickups.push({ id: stack.id, count: stack.count, time: 3 });
    if (this.pickups.length > 6) this.pickups.shift();
  }

  onSelectItem() {
    const p = this.game.player;
    const held = p.inventory.held;
    if (held) {
      const def = getItem(held.id);
      this.itemName = def ? def.display : '';
      this.itemNameTimer = 2.2;
    } else this.itemNameTimer = 0;
  }

  update(dt) {
    if (this.itemNameTimer > 0) this.itemNameTimer -= dt;
    for (const m of this.messages) m.time -= dt;
    for (const p of this.pickups) p.time -= dt;
    this.pickups = this.pickups.filter((p) => p.time > 0);
    if (this.hurtFlash > 0) this.hurtFlash -= dt * 2;
  }

  render(dt) {
    const ctx = this.ctx;
    const c = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.floor(c.clientWidth * dpr), H = Math.floor(c.clientHeight * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;

    this.scale = clamp(Math.floor(Math.min(W / 420, H / 300)), 2, 5);
    const S = this.scale;
    const vw = W / S, vh = H / S;
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.font = '8px "DungGeunMo", monospace';
    ctx.textBaseline = 'top';

    const g = this.game;
    const p = g.player;
    if (!p) return;

    /* 수중 / 피격 오버레이 */
    if (p.headInWater) {
      ctx.fillStyle = 'rgba(30,80,170,0.28)';
      ctx.fillRect(0, 0, vw, vh);
    }
    if (p.inLava) {
      ctx.fillStyle = 'rgba(200,60,10,0.55)';
      ctx.fillRect(0, 0, vw, vh);
    }
    if (p.damageTint > 0) {
      ctx.fillStyle = `rgba(190,20,20,${0.35 * p.damageTint})`;
      ctx.fillRect(0, 0, vw, vh);
    }
    if (p.food <= 0) {
      ctx.fillStyle = 'rgba(60,30,0,0.18)';
      ctx.fillRect(0, 0, vw, vh);
    }

    if (p.dead) { this._deathScreen(ctx, vw, vh); return; }

    /* 조준점 */
    if (!g.gui.open) this._crosshair(ctx, vw, vh);

    /* 핫바 */
    this._hotbar(ctx, vw, vh, p);

    /* 상태 바 (서바이벌만) */
    if (p.gameMode === GM_SURVIVAL) this._status(ctx, vw, vh, p);
    this._xpBar(ctx, vw, vh, p);

    /* 아이템 이름 */
    if (this.itemNameTimer > 0) {
      const a = Math.min(1, this.itemNameTimer);
      ctx.globalAlpha = a;
      this._centerText(ctx, this.itemName, vw / 2, vh - 63, '#ffffff');
      ctx.globalAlpha = 1;
    }

    /* 획득 알림 */
    let py = vh - 80;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pu = this.pickups[i];
      const a = clamp(pu.time, 0, 1);
      ctx.globalAlpha = a;
      const icon = ItemIcons.get(pu.id);
      ctx.drawImage(icon, vw - 90, py, 10, 10);
      ctx.fillStyle = '#ffffff';
      this._shadowText(ctx, `${getItem(pu.id).display} x${pu.count}`, vw - 76, py + 1);
      ctx.globalAlpha = 1;
      py -= 12;
    }

    /* 채팅 */
    this._chat(ctx, vw, vh);

    /* 디버그 */
    if (this.showDebug) this._debug(ctx, vw, vh, dt);

    /* 채굴 진행 원 (모바일/보조) */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  _crosshair(ctx, vw, vh) {
    const x = Math.floor(vw / 2), y = Math.floor(vh / 2);
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 5, y - 0.5, 10, 1);
    ctx.fillRect(x - 0.5, y - 5, 1, 10);
    ctx.restore();
  }

  _hotbar(ctx, vw, vh, p) {
    const x0 = Math.floor(vw / 2 - 91);
    const y0 = Math.floor(vh - 22);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x0, y0, 182, 22);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, 181, 21);

    for (let i = 0; i < 9; i++) {
      const sx = x0 + 3 + i * 20;
      const st = p.inventory.get(i);
      if (st) {
        const icon = ItemIcons.get(st.id);
        ctx.drawImage(icon, sx, y0 + 3, 16, 16);
        if (st.count > 1) {
          const s = String(st.count);
          const tw = ctx.measureText(s).width;
          ctx.fillStyle = '#000';
          ctx.fillText(s, sx + 17 - tw, y0 + 13);
          ctx.fillStyle = '#fff';
          ctx.fillText(s, sx + 16 - tw, y0 + 12);
        }
        const def = getItem(st.id);
        if (def && def.durability && st.damage > 0) {
          const f = 1 - st.damage / def.durability;
          ctx.fillStyle = '#000';
          ctx.fillRect(sx + 1, y0 + 16, 14, 2);
          ctx.fillStyle = `hsl(${Math.round(f * 110)},90%,45%)`;
          ctx.fillRect(sx + 1, y0 + 16, Math.max(0, Math.round(14 * f)), 1);
        }
      }
      if (i === p.inventory.selected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx - 2.5, y0 + 0.5, 21, 21);
      }
    }
  }

  _status(ctx, vw, vh, p) {
    const x0 = Math.floor(vw / 2 - 91);
    const yH = Math.floor(vh - 34);
    /* 체력 */
    const hp = Math.ceil(p.health);
    const shake = p.health <= 4 ? Math.sin(now() / 60) * 0.6 : 0;
    for (let i = 0; i < 10; i++) {
      const v = hp - i * 2;
      const icon = v >= 2 ? 'heart_full' : (v === 1 ? 'heart_half' : 'heart_empty');
      ctx.drawImage(HUD_ICONS[icon], x0 + i * 8, yH + (v > 0 ? shake : 0));
    }
    /* 방어구 */
    const def = p.inventory.defense;
    if (def > 0) {
      for (let i = 0; i < 10; i++) {
        const v = def - i * 2;
        const icon = v >= 2 ? 'armor_full' : (v === 1 ? 'armor_half' : 'armor_empty');
        if (v <= 0) continue;
        ctx.drawImage(HUD_ICONS[icon], x0 + i * 8, yH - 9);
      }
    }
    /* 허기 */
    const food = Math.ceil(p.food);
    for (let i = 0; i < 10; i++) {
      const v = food - (9 - i) * 2;
      const icon = v >= 2 ? 'food_full' : (v === 1 ? 'food_half' : 'food_empty');
      ctx.drawImage(HUD_ICONS[icon], x0 + 91 + i * 8 + 0, yH);
    }
    /* 산소 */
    if (p.air < 300) {
      const n = Math.ceil(p.air / 30);
      for (let i = 0; i < n; i++) {
        ctx.drawImage(HUD_ICONS.bubble, x0 + 91 + i * 8, yH - 9);
      }
    }
  }

  _xpBar(ctx, vw, vh, p) {
    if (p.gameMode === GM_CREATIVE) return;
    const x0 = Math.floor(vw / 2 - 91);
    const y = Math.floor(vh - 27);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x0, y, 182, 5);
    const f = p.xpForNextLevel > 0 ? clamp(p.xp / p.xpForNextLevel, 0, 1) : 0;
    ctx.fillStyle = '#7ce23a';
    ctx.fillRect(x0 + 1, y + 1, Math.round(180 * f), 3);
    if (p.xpLevel > 0) {
      const s = String(p.xpLevel);
      const tw = ctx.measureText(s).width;
      ctx.fillStyle = '#000';
      this._outlineText(ctx, s, vw / 2 - tw / 2, y - 8, '#7ce23a');
    }
  }

  _chat(ctx, vw, vh) {
    const visible = this.messages.filter((m) => m.time > 0 || this.game.chatOpen);
    const list = this.game.chatOpen ? this.messages.slice(-12) : visible.slice(-8);
    let y = vh - 44;
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      const a = this.game.chatOpen ? 1 : clamp(m.time, 0, 1);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      const w = ctx.measureText(m.text).width + 4;
      ctx.fillRect(2, y - 1, w, 10);
      this._shadowText(ctx, m.text, 4, y, m.color);
      ctx.globalAlpha = 1;
      y -= 10;
    }
    if (this.game.chatOpen) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(2, vh - 14, vw - 4, 12);
      this._shadowText(ctx, '> ' + this.game.chatInput + (Math.floor(now() / 400) % 2 ? '_' : ''), 4, vh - 12, '#ffffff');
    }
  }

  _debug(ctx, vw, vh, dt) {
    const g = this.game, p = g.player, w = g.world;
    const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
    const biome = BIOME_INFO[w.getBiome(bx, bz)];
    const fps = Math.round(1 / Math.max(dt, 1e-5));
    this.fps.push(fps);
    const t = w.target;
    void t;

    const lines = [
      `마인크래프트 클론 (WebGL2)  ${Math.round(this.fps.avg)} fps`,
      `XYZ: ${p.x.toFixed(2)} / ${p.y.toFixed(2)} / ${p.z.toFixed(2)}`,
      `블록: ${bx} ${by} ${bz}   청크: ${bx >> 4} ${bz >> 4}`,
      `방향: ${this._facing(p.yaw)}  (yaw ${(p.yaw / DEG).toFixed(1)}, pitch ${(p.pitch / DEG).toFixed(1)})`,
      `바이옴: ${biome ? biome.name : '?'}   시간: ${formatTime(w.time)} (${w.time})  ${w.dayCount}일차`,
      `밝기: 하늘 ${w.getSkyLight(bx, by + 1, bz)} / 블록 ${w.getBlockLight(bx, by + 1, bz)}`,
      `청크: ${w.chunks.size}개 로드, ${g.renderer.stats.chunksDrawn}개 렌더`,
      `드로우콜: ${g.renderer.stats.drawCalls}  삼각형: ${Math.round(g.renderer.stats.triangles)}`,
      `엔티티: ${g.entities.entities.length}  (적대 ${g.entities.countType(true)} / 우호 ${g.entities.countType(false)})`,
      `모드: ${p.gameMode === GM_CREATIVE ? '크리에이티브' : '서바이벌'}${p.flying ? ' (비행)' : ''}`,
      `시드: ${w.seed}`,
    ];
    if (p.target) {
      const id = w.getBlock(p.target.x, p.target.y, p.target.z);
      lines.push(`바라보는 블록: ${Blocks[id].display} (${p.target.x} ${p.target.y} ${p.target.z})`);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    let maxw = 0;
    for (const l of lines) maxw = Math.max(maxw, ctx.measureText(l).width);
    ctx.fillRect(2, 2, maxw + 6, lines.length * 10 + 4);
    for (let i = 0; i < lines.length; i++) {
      this._shadowText(ctx, lines[i], 4, 4 + i * 10, '#e8f0e0');
    }
    void vw; void vh;
  }

  _facing(yaw) {
    const deg = mod(yaw / DEG, 360);
    if (deg < 45 || deg >= 315) return '북 (-Z)';
    if (deg < 135) return '동 (+X)';
    if (deg < 225) return '남 (+Z)';
    return '서 (-X)';
  }

  _deathScreen(ctx, vw, vh) {
    ctx.fillStyle = 'rgba(120,0,0,0.5)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.textAlign = 'center';
    ctx.font = '16px "DungGeunMo", monospace';
    this._shadowText(ctx, '당신은 죽었습니다', vw / 2, vh / 2 - 30, '#ffffff', true);
    ctx.font = '8px "DungGeunMo", monospace';
    this._shadowText(ctx, `점수: ${this.game.player.xpLevel * 7 + this.game.player.stats.blocksMined}`, vw / 2, vh / 2 - 6, '#dddddd', true);
    const bw = 100, bh = 16;
    const bx = vw / 2 - bw / 2, by = vh / 2 + 12;
    ctx.fillStyle = '#6a6a6a';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx, by, bw, 1); ctx.fillRect(bx, by, 1, bh);
    ctx.fillStyle = '#303030';
    ctx.fillRect(bx, by + bh - 1, bw, 1); ctx.fillRect(bx + bw - 1, by, 1, bh);
    this._shadowText(ctx, '리스폰 (R 키)', vw / 2, by + 4, '#ffffff', true);
    ctx.textAlign = 'left';
    this.respawnButton = { x: bx, y: by, w: bw, h: bh };
  }

  _shadowText(ctx, text, x, y, color, centered) {
    if (centered) ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color || '#ffffff';
    ctx.fillText(text, x, y);
    if (centered) ctx.textAlign = 'left';
  }
  _outlineText(ctx, text, x, y, color) {
    ctx.fillStyle = '#000';
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(text, x + dx, y + dy);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
  _centerText(ctx, text, x, y, color) {
    ctx.textAlign = 'center';
    this._shadowText(ctx, text, x, y, color);
    ctx.textAlign = 'left';
  }
}
