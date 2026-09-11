/* =========================================================================
 *  main.js — 부트스트랩 / 입력 / 게임 루프
 * ========================================================================= */
'use strict';

/* ------------------------------------------------------------- 입력 */
class InputManager {
  constructor(game) {
    this.game = game;
    this.keys = Object.create(null);
    this.mouseDown = [false, false, false];
    this.locked = false;
    this.sensitivity = 0.0022;
    this.invertY = false;
    this.state = {
      forward: false, back: false, left: false, right: false,
      jump: false, sneak: false, sprint: false, attack: false, use: false,
    };
    this.lastSpace = 0;
    this.lastW = 0;
    this.touch = { active: false, lookId: null, lastX: 0, lastY: 0 };
    this._bind();
  }

  _bind() {
    const g = this.game;
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => { this.keys = Object.create(null); this.resetState(); });

    const cv = g.overlayEl;
    cv.addEventListener('mousemove', (e) => this.onMouseMove(e));
    cv.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === g.overlayEl;
      if (!this.locked && g.state === 'play' && !g.gui.open && !g.paused && !g.chatOpen) {
        g.pause();
      }
    });

    /* 터치 */
    cv.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    cv.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    cv.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
  }

  resetState() {
    for (const k in this.state) this.state[k] = false;
  }

  requestPointerLock() {
    const g = this.game;
    if (g.state !== 'play' || g.gui.open || g.paused || g.chatOpen) return;
    if (g.isTouch) return;
    const el = g.overlayEl;
    if (el.requestPointerLock) el.requestPointerLock();
  }
  exitPointerLock() {
    if (document.exitPointerLock) document.exitPointerLock();
  }

  onKeyDown(e) {
    const g = this.game;
    const code = e.code;

    /* 채팅 입력 중 */
    if (g.chatOpen) {
      e.preventDefault();
      if (code === 'Escape') { g.closeChat(false); return; }
      if (code === 'Enter') { g.closeChat(true); return; }
      if (code === 'Backspace') { g.chatInput = g.chatInput.slice(0, -1); return; }
      if (e.key.length === 1) g.chatInput += e.key;
      return;
    }

    if (this.keys[code]) { e.preventDefault(); return; }
    this.keys[code] = true;

    switch (code) {
      case 'Escape':
        e.preventDefault();
        if (g.gui.open) g.gui.close();
        else if (g.state === 'play') g.paused ? g.resume() : g.pause();
        break;
      case 'KeyE':
        if (g.state !== 'play' || g.paused) break;
        e.preventDefault();
        g.gui.toggleInventory();
        break;
      case 'KeyT':
        if (g.state !== 'play' || g.paused || g.gui.open) break;
        e.preventDefault();
        g.openChat('');
        break;
      case 'Slash':
        if (g.state !== 'play' || g.paused || g.gui.open) break;
        e.preventDefault();
        g.openChat('/');
        break;
      case 'F3':
        e.preventDefault();
        g.hud.showDebug = !g.hud.showDebug;
        break;
      case 'F1':
        e.preventDefault();
        g.hideHud = !g.hideHud;
        break;
      case 'KeyR':
        if (g.player && g.player.dead) g.respawn();
        break;
      case 'KeyQ':
        if (g.state === 'play' && !g.gui.open && !g.paused) g.dropHeld(e.shiftKey);
        break;
      case 'KeyF':
        if (g.state === 'play' && g.player && g.player.gameMode === GM_CREATIVE) {
          g.player.flying = !g.player.flying;
          g.hud.addMessage(g.player.flying ? '비행 모드 켜짐' : '비행 모드 꺼짐', '#9fd');
        }
        break;
      case 'Space': {
        const t = now();
        if (g.player && g.player.gameMode === GM_CREATIVE && t - this.lastSpace < 300) {
          g.player.flying = !g.player.flying;
          g.player.vy = 0;
        }
        this.lastSpace = t;
        break;
      }
      default: break;
    }

    /* 핫바 숫자 */
    if (code.startsWith('Digit')) {
      const n = parseInt(code.slice(5), 10);
      if (n >= 1 && n <= 9 && g.player) {
        g.player.inventory.selected = n - 1;
        g.hud.onSelectItem();
      }
    }
    this.updateState();
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
    this.updateState();
  }

  updateState() {
    const k = this.keys;
    const s = this.state;
    s.forward = !!(k.KeyW || k.ArrowUp);
    s.back = !!(k.KeyS || k.ArrowDown);
    s.left = !!(k.KeyA || k.ArrowLeft);
    s.right = !!(k.KeyD || k.ArrowRight);
    s.jump = !!k.Space;
    s.sneak = !!(k.ShiftLeft || k.ShiftRight);
    s.sprint = !!(k.ControlLeft || k.ControlRight);
  }

  onMouseMove(e) {
    const g = this.game;
    if (g.state === 'intro') {
      g.intro.onMove(e.clientX, e.clientY);
      return;
    }
    if (g.gui.open) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      g.gui.updateMouse(e.clientX * dpr, e.clientY * dpr);
      return;
    }
    if (!this.locked) return;
    const p = g.player;
    if (!p) return;
    const dx = e.movementX || 0, dy = e.movementY || 0;
    p.yaw += dx * this.sensitivity;
    p.pitch += (this.invertY ? -dy : dy) * this.sensitivity;
    p.pitch = clamp(p.pitch, -Math.PI / 2 + 0.001, Math.PI / 2 - 0.001);
    p.yaw = mod(p.yaw, TAU);
  }

  onMouseDown(e) {
    const g = this.game;
    this.mouseDown[e.button] = true;
    AudioSys.resume();

    if (g.state === 'intro') {
      const action = g.intro.onClick(e.clientX, e.clientY);
      if (action) g.onTitleAction(action);
      return;
    }
    if (g.paused) return;
    if (g.gui.open) {
      g.gui.click(e.button, e.shiftKey);
      return;
    }
    if (g.player && g.player.dead) {
      g.respawn();
      return;
    }
    if (!this.locked) { this.requestPointerLock(); return; }
    if (e.button === 0) this.state.attack = true;
    if (e.button === 2) this.state.use = true;
    if (e.button === 1 && g.player) { e.preventDefault(); g.pickBlock(); }
  }

  onMouseUp(e) {
    this.mouseDown[e.button] = false;
    if (e.button === 0) this.state.attack = false;
    if (e.button === 2) this.state.use = false;
  }

  onWheel(e) {
    const g = this.game;
    if (g.gui.open) { g.gui.scroll(e.deltaY); e.preventDefault(); return; }
    if (g.state !== 'play' || !g.player) return;
    e.preventDefault();
    const inv = g.player.inventory;
    inv.selected = mod(inv.selected + (e.deltaY > 0 ? 1 : -1), 9);
    g.hud.onSelectItem();
  }

  /* ---------------------------------------------------------- 터치 */
  onTouchStart(e) {
    const g = this.game;
    g.isTouch = true;
    AudioSys.resume();
    for (const t of e.changedTouches) {
      if (g.state === 'intro') {
        const action = g.intro.onClick(t.clientX, t.clientY);
        if (action) g.onTitleAction(action);
        continue;
      }
      if (g.gui.open) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        g.gui.updateMouse(t.clientX * dpr, t.clientY * dpr);
        g.gui.click(0, false);
        continue;
      }
      if (this.touch.lookId === null) {
        this.touch.lookId = t.identifier;
        this.touch.lastX = t.clientX; this.touch.lastY = t.clientY;
        this.touch.startT = now();
      }
    }
    e.preventDefault();
  }

  onTouchMove(e) {
    const g = this.game;
    for (const t of e.changedTouches) {
      if (t.identifier !== this.touch.lookId) continue;
      const dx = t.clientX - this.touch.lastX;
      const dy = t.clientY - this.touch.lastY;
      this.touch.lastX = t.clientX; this.touch.lastY = t.clientY;
      const p = g.player;
      if (p) {
        p.yaw += dx * 0.006;
        p.pitch = clamp(p.pitch + dy * 0.006, -Math.PI / 2 + 0.001, Math.PI / 2 - 0.001);
      }
    }
    e.preventDefault();
  }

  onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.touch.lookId) this.touch.lookId = null;
    }
    e.preventDefault();
  }
}

/* =========================================================================
 *  게임
 * ========================================================================= */
class Game {
  constructor() {
    this.glCanvas = document.getElementById('gl');
    this.hudCanvas = document.getElementById('hud');
    this.guiCanvas = document.getElementById('gui');
    this.introCanvas = document.getElementById('intro');
    this.overlayEl = document.getElementById('overlay');

    this.state = 'intro';        // 'intro' | 'play'
    this.paused = false;
    this.chatOpen = false;
    this.chatInput = '';
    this.hideHud = false;
    this.isTouch = ('ontouchstart' in window);
    this.loading = false;
    this.lastTime = 0;
    this.accumulator = 0;
    this.tickRate = 1 / 20;
    this.frameCount = 0;
    this.autosaveTimer = 0;

    this.settings = Object.assign({
      renderDistance: 6, fov: 70, sensitivity: 2.2, volume: 70, music: 35,
      smoothLighting: true, showFps: false, invertY: false,
    }, SaveSystem.loadSettings() || {});

    buildTextures();
    resolveBlockTextures();

    this.renderer = new Renderer(this.glCanvas);
    this.renderer.renderDistance = this.settings.renderDistance;
    this.renderer.fov = this.settings.fov;

    this.gui = new GUI(this.guiCanvas, this);
    this.hud = new HUD(this.hudCanvas, this);
    this.intro = new Intro(this.introCanvas, this);
    this.input = new InputManager(this);
    this.input.sensitivity = this.settings.sensitivity * 0.001;
    this.input.invertY = this.settings.invertY;

    AudioSys.init();
    AudioSys.setVolume(this.settings.volume / 100);
    AudioSys.setMusicVolume(this.settings.music / 100);

    this.intro.start(SaveSystem.hasSave());
    this._setupDomUI();

    window.addEventListener('resize', () => this.renderer.resize());
    window.addEventListener('beforeunload', () => {
      if (this.state === 'play' && this.world) SaveSystem.save(this);
    });
  }

  /* ------------------------------------------------------- DOM 패널 */
  _setupDomUI() {
    const $ = (id) => document.getElementById(id);
    this.dom = {
      pause: $('pauseMenu'), options: $('optionsPanel'), help: $('helpPanel'),
      toast: $('toast'),
    };

    $('btnResume').onclick = () => this.resume();
    $('btnOptions').onclick = () => this.showPanel('options');
    $('btnHelp').onclick = () => this.showPanel('help');
    $('btnSaveQuit').onclick = () => this.saveAndQuit();
    $('btnCloseOptions').onclick = () => this.hidePanels();
    $('btnCloseHelp').onclick = () => this.hidePanels();

    const bind = (id, key, fmt, apply) => {
      const el = $(id);
      if (!el) return;
      el.value = this.settings[key];
      const label = $(id + 'Val');
      const upd = () => {
        const v = el.type === 'checkbox' ? el.checked : Number(el.value);
        this.settings[key] = v;
        if (label) label.textContent = fmt ? fmt(v) : v;
        if (apply) apply(v);
        SaveSystem.saveSettings(this.settings);
      };
      el.oninput = upd;
      el.onchange = upd;
      if (el.type === 'checkbox') el.checked = !!this.settings[key];
      upd();
    };
    bind('optRender', 'renderDistance', (v) => `${v} 청크`, (v) => {
      this.renderer.renderDistance = v;
      if (this.world) this.world.renderDistance = v;
    });
    bind('optFov', 'fov', (v) => `${v}°`, (v) => { this.renderer.fov = v; });
    bind('optSens', 'sensitivity', (v) => `${v.toFixed(1)}`, (v) => { this.input.sensitivity = v * 0.001; });
    bind('optVolume', 'volume', (v) => `${v}%`, (v) => AudioSys.setVolume(v / 100));
    bind('optMusic', 'music', (v) => `${v}%`, (v) => AudioSys.setMusicVolume(v / 100));
    bind('optInvert', 'invertY', null, (v) => { this.input.invertY = v; });
  }

  showPanel(name) {
    this.hidePanels();
    if (name === 'options') this.dom.options.classList.add('show');
    if (name === 'help') this.dom.help.classList.add('show');
  }
  hidePanels() {
    this.dom.options.classList.remove('show');
    this.dom.help.classList.remove('show');
  }

  toast(msg) {
    const el = this.dom.toast;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* ==================================================================
   *  타이틀 액션
   * ================================================================ */
  onTitleAction(action) {
    switch (action) {
      case 'new': this.startNewWorld(); break;
      case 'continue': this.startLoadWorld(); break;
      case 'options': this.showPanel('options'); break;
      case 'help': this.showPanel('help'); break;
      default: break;
    }
  }

  startNewWorld() {
    const seed = (Math.random() * 2147483647) | 0;
    SaveSystem.deleteSave();
    this._createWorld(seed, null);
    this.intro.beginLoading('새로운 세계를 만드는 중...');
  }

  startLoadWorld() {
    const data = SaveSystem.load();
    if (!data) { this.startNewWorld(); return; }
    this._createWorld(data.world.seed, data);
    this.intro.beginLoading('저장된 세계를 불러오는 중...');
  }

  _createWorld(seed, saveData) {
    this.world = new World(seed, { renderDistance: this.settings.renderDistance });
    this.world.renderer = this.renderer;
    if (saveData) this.world.loadSave(saveData.world);

    this.particles = new ParticleSystem(this.world);
    this.entities = new EntityManager(this.world, this.particles);

    const spawn = this.world.gen.findSpawn();
    this.player = new Player(this.world, spawn.x, spawn.y, spawn.z);
    this.player.respawnPoint = { x: spawn.x, y: spawn.y, z: spawn.z };
    if (saveData && saveData.player) this.player.deserialize(saveData.player);
    this.entities.player = this.player;

    this.gui.cursor = null;
    this.loading = true;
    this.loadProgress = 0;
    this._loadStart = now();
    this.world.updateChunkQueue(this.player.x, this.player.z);
  }

  /** 로딩 중 청크 생성 진행 */
  tickLoading() {
    const w = this.world, p = this.player;
    w.updateChunkQueue(p.x, p.z);
    w.processGeneration(14);

    const jobs = w.collectMeshJobs(p.x, p.z, 6);
    for (const c of jobs) {
      const data = meshChunk(w, c);
      this.renderer.uploadChunkMesh(c, data);
      c.meshDirty = false;
    }

    /* 진행률: 스폰 주변 5x5 청크가 준비되면 완료 */
    const pcx = Math.floor(p.x) >> 4, pcz = Math.floor(p.z) >> 4;
    let ready = 0, total = 0;
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        total++;
        const c = w.getChunk(pcx + dx, pcz + dz);
        if (c && c.generated && c.lit && !c.meshDirty) ready++;
      }
    }
    this.loadProgress = ready / total;
    this.intro.progress = this.loadProgress * 0.96 +
      Math.min(0.04, (now() - this._loadStart) / 12000);

    if (ready === total || now() - this._loadStart > 25000) {
      this.finishLoading();
    }
  }

  finishLoading() {
    const p = this.player;
    /* 지면 위로 올리기 */
    let y = this.world.surfaceHeight(Math.floor(p.x), Math.floor(p.z));
    if (p.y < y || p.y > CHUNK_HEIGHT) p.y = y + 0.2;
    this.loading = false;
    this.state = 'play';
    this.paused = false;
    this.intro.finishLoading();
    AudioSys.startMusic();
    this.hud.addMessage('환영합니다! WASD 이동 · 마우스 시점 · E 인벤토리 · T 채팅', '#ffe08a');
    this.hud.addMessage('도움말은 ESC → 조작법에서 확인하세요.', '#a8d8ff');
    this.hud.onSelectItem();
    setTimeout(() => this.input.requestPointerLock(), 60);
  }

  /* ==================================================================
   *  일시정지 / 저장
   * ================================================================ */
  pause() {
    if (this.state !== 'play' || this.paused) return;
    this.paused = true;
    this.input.exitPointerLock();
    this.input.resetState();
    this.dom.pause.classList.add('show');
  }
  resume() {
    this.paused = false;
    this.hidePanels();
    this.dom.pause.classList.remove('show');
    this.input.requestPointerLock();
  }

  saveAndQuit() {
    const r = SaveSystem.save(this);
    this.dom.pause.classList.remove('show');
    this.hidePanels();
    this.paused = false;
    this.state = 'intro';
    this.input.exitPointerLock();
    AudioSys.stopMusic();
    this.intro.hasSave = true;
    this.intro.startOutro();
    this.intro.onQuitDone = () => {
      this.world = null; this.player = null; this.entities = null; this.particles = null;
      this.renderer.chunkMeshes.forEach((m, k) => {
        void k;
        const gl = this.renderer.gl;
        for (const o of [m.opaque, m.water]) {
          gl.deleteVertexArray(o.vao); gl.deleteBuffer(o.vbo); gl.deleteBuffer(o.ebo);
        }
      });
      this.renderer.chunkMeshes.clear();
      AudioSys.startMusic();
    };
    if (r.ok) this.toast(`저장 완료 (${(r.bytes / 1024).toFixed(1)} KB)`);
  }

  respawn() {
    if (!this.player || !this.player.dead) return;
    this.player.die(this);
    this.player.respawn();
    this.hud.addMessage('리스폰했습니다.', '#9fd');
    this.input.requestPointerLock();
  }

  /* ==================================================================
   *  채팅 / 명령어
   * ================================================================ */
  openChat(prefix) {
    this.chatOpen = true;
    this.chatInput = prefix || '';
    this.input.exitPointerLock();
    this.input.resetState();
  }
  closeChat(send) {
    const text = this.chatInput.trim();
    this.chatOpen = false;
    this.chatInput = '';
    if (send && text) {
      if (text.startsWith('/')) this.runCommand(text.slice(1));
      else this.hud.addMessage('<플레이어> ' + text);
    }
    this.input.requestPointerLock();
  }

  runCommand(cmd) {
    const parts = cmd.split(/\s+/);
    const c = parts[0].toLowerCase();
    const p = this.player;
    const say = (m, col) => this.hud.addMessage(m, col || '#ffd479');

    switch (c) {
      case 'help':
        say('/gamemode <0|1> · /time <day|night|숫자> · /tp <x> <y> <z>');
        say('/give <아이템> [개수] · /summon <몹> · /kill · /clear · /seed · /save · /speed <배율>');
        break;
      case 'gamemode': case 'gm': {
        const m = parts[1] === '1' || parts[1] === 'creative' ? GM_CREATIVE : GM_SURVIVAL;
        p.gameMode = m;
        if (m === GM_SURVIVAL) p.flying = false;
        say(`게임 모드: ${m === GM_CREATIVE ? '크리에이티브' : '서바이벌'}`);
        break;
      }
      case 'time': {
        const a = (parts[1] || '').toLowerCase();
        if (a === 'day') this.world.time = 1000;
        else if (a === 'night') this.world.time = 14000;
        else if (a === 'noon') this.world.time = 6000;
        else if (a === 'midnight') this.world.time = 18000;
        else if (!isNaN(Number(a))) this.world.time = mod(Number(a), 24000);
        say(`시간: ${formatTime(this.world.time)}`);
        break;
      }
      case 'tp': {
        const x = Number(parts[1]), y = Number(parts[2]), z = Number(parts[3]);
        if ([x, y, z].some(isNaN)) { say('사용법: /tp <x> <y> <z>', '#f88'); break; }
        p.x = x; p.y = y; p.z = z; p.vx = p.vy = p.vz = 0;
        say(`이동: ${x} ${y} ${z}`);
        break;
      }
      case 'give': {
        const name = parts[1];
        const n = parts[2] ? parseInt(parts[2], 10) : 1;
        if (!name || (!(name in BlockIds) && !(name in ItemIds))) {
          say('알 수 없는 아이템: ' + name, '#f88');
          break;
        }
        let left = n;
        while (left > 0) {
          const st = makeStack(name, Math.min(left, 64));
          left -= st.count;
          const rem = p.inventory.addStack(st);
          if (rem) { this.entities.spawnItem(p.x, p.y + 1, p.z, rem); break; }
        }
        say(`${itemDisplay(idOf(name))} x${n} 지급`);
        break;
      }
      case 'summon': {
        const kind = parts[1];
        if (!MOB_DEFS[kind]) { say('알 수 없는 몹: ' + kind, '#f88'); break; }
        const d = p.lookDir();
        this.entities.spawnMob(kind, p.x + d[0] * 3, p.y + 1, p.z + d[2] * 3);
        say(`${MOB_DEFS[kind].ko} 소환`);
        break;
      }
      case 'kill':
        this.entities.entities.forEach((e) => { if (e.type === 'mob') e.dead = true; });
        say('주변 몹 제거');
        break;
      case 'clear':
        p.inventory.clear();
        say('인벤토리를 비웠습니다');
        break;
      case 'seed': say(`시드: ${this.world.seed}`); break;
      case 'save': {
        const r = SaveSystem.save(this);
        say(r.ok ? `저장 완료 (${(r.bytes / 1024).toFixed(1)} KB)` : '저장 실패: ' + r.error);
        break;
      }
      case 'speed': {
        const v = Number(parts[1]);
        if (!isNaN(v)) { this.speedMul = clamp(v, 0.1, 10); say(`속도 배율 ${this.speedMul}`); }
        break;
      }
      case 'heal': p.health = p.maxHealth; p.food = 20; say('체력/허기 회복'); break;
      default: say('알 수 없는 명령어입니다. /help 를 입력해 보세요.', '#f88');
    }
  }

  /* ==================================================================
   *  플레이어 보조 동작
   * ================================================================ */
  dropHeld(all) {
    const p = this.player;
    const held = p.inventory.held;
    if (!held) return;
    const n = all ? held.count : 1;
    const st = { id: held.id, count: n, damage: held.damage || 0 };
    held.count -= n;
    if (held.count <= 0) p.inventory.setHeld(null);
    const d = p.lookDir();
    const e = this.entities.spawnItem(p.x + d[0] * 0.4, p.eyeY - 0.3, p.z + d[2] * 0.4, st);
    if (e) {
      e.vx = d[0] * 6; e.vy = d[1] * 6 + 1.4; e.vz = d[2] * 6;
      e.pickupDelay = 1.2;
    }
  }

  pickBlock() {
    const p = this.player;
    if (!p.target) return;
    const id = this.world.getBlock(p.target.x, p.target.y, p.target.z);
    if (!id) return;
    const b = Blocks[id];
    const wanted = b.drops && b.drops.length ? idOf(b.drops[0].name) : id;
    /* 이미 가지고 있으면 그 슬롯 선택 */
    for (let i = 0; i < 9; i++) {
      const s = p.inventory.get(i);
      if (s && s.id === wanted) { p.inventory.selected = i; this.hud.onSelectItem(); return; }
    }
    if (p.gameMode === GM_CREATIVE) {
      p.inventory.set(p.inventory.selected, makeStack(wanted, 1));
      this.hud.onSelectItem();
    }
  }

  /* ==================================================================
   *  루프
   * ================================================================ */
  start() {
    const loop = (ts) => {
      requestAnimationFrame(loop);
      const dt = Math.min((ts - this.lastTime) / 1000 || 0, 0.1);
      this.lastTime = ts;
      try { this.frame(dt); } catch (e) {
        console.error('프레임 오류', e);
      }
    };
    requestAnimationFrame(loop);
  }

  frame(dt) {
    this.frameCount++;

    /* 인트로 / 로딩 */
    if (this.state === 'intro') {
      this.intro.update(dt);
      if (this.loading && this.intro.phase === INTRO_LOADING) this.tickLoading();
      if (this.world && this.loading) {
        /* 로딩 중에도 배경으로 월드를 그려 부드럽게 전환 */
      }
      this.intro.render();
      this.hud.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.hud.ctx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
      this.gui.render();
      return;
    }

    const p = this.player;
    const w = this.world;
    if (!p || !w) return;

    const active = !this.paused && !this.chatOpen;

    /* --- 고정 틱 (20 TPS) --- */
    if (active) {
      this.accumulator += dt;
      let ticks = 0;
      while (this.accumulator >= this.tickRate && ticks < 5) {
        this.accumulator -= this.tickRate;
        w.tick();
        ticks++;
      }
    }

    /* --- 가변 업데이트 --- */
    if (active) {
      const inputState = this.gui.open ? {
        forward: false, back: false, left: false, right: false,
        jump: false, sneak: false, sprint: false, attack: false, use: false,
      } : this.input.state;
      p.update(dt, inputState, this);
      this.entities.update(dt);
      this.particles.update(dt);
      this.hud.update(dt);

      /* 청크 스트리밍 */
      w.updateChunkQueue(p.x, p.z);
      w.processGeneration(4);
      const jobs = w.collectMeshJobs(p.x, p.z, 2);
      for (const c of jobs) {
        const data = meshChunk(w, c);
        this.renderer.uploadChunkMesh(c, data);
        c.meshDirty = false;
      }

      /* 자동 저장 (60초) */
      this.autosaveTimer += dt;
      if (this.autosaveTimer > 60) {
        this.autosaveTimer = 0;
        const r = SaveSystem.save(this);
        if (r.ok) this.hud.addMessage('자동 저장됨', '#9fd');
      }
    }

    this.render(dt);
  }

  render(dt) {
    const r = this.renderer, w = this.world, p = this.player;
    const cam = p.camera;
    /* 시점 흔들림 */
    if (p.bobAmount > 0.01 && !this.gui.open) {
      cam.x += Math.cos(p.bobPhase) * 0.035 * p.bobAmount;
      cam.y += Math.abs(Math.sin(p.bobPhase)) * -0.045 * p.bobAmount;
    }
    if (p.hurtTime > 0) {
      cam.y += Math.sin(p.hurtTime * 40) * 0.02;
    }
    const camBlock = w.getBlock(Math.floor(cam.x), Math.floor(cam.y), Math.floor(cam.z));
    const underwater = camBlock === BlockIds.water;
    r.renderDistance = this.settings.renderDistance;

    r.beginFrame(cam, w, { underwater, fov: this.settings.fov + (p.sprinting ? 6 : 0) });
    r.drawSky(w, underwater);
    r.drawCelestial(w);
    r.drawClouds(w, underwater);
    r.drawTerrain(w);

    /* 엔티티 + 파티클 */
    r.drawDynamicScene((mb) => {
      this.entities.buildMesh(mb, cam);
      this.particles.build(mb, cam);
    }, { alphaTest: 0.15 });

    /* 채굴 크랙 오버레이 */
    if (p.mining && p.miningProgress > 0.02 && p.target) {
      const stage = clamp(Math.floor(p.miningProgress * 10), 0, 9);
      const layer = Textures.id('crack' + stage);
      r.drawDynamicScene((mb) => {
        const m = Mat4.create();
        Mat4.identity(m);
        Mat4.translate(m, m, p.target.x - 0.004, p.target.y - 0.004, p.target.z - 0.004);
        pushBox(mb, m, 0, 0, 0, 1.008, 1.008, 1.008, layer, 1, 1, 1.0);
      }, { alphaTest: 0.02, blend: true });
    }

    r.drawWater();

    /* 선택 상자 */
    if (p.target && !this.gui.open && !p.dead) {
      const id = w.getBlock(p.target.x, p.target.y, p.target.z);
      const b = Blocks[id];
      r.drawSelectionBox(p.target.x, p.target.y, p.target.z, b ? b.aabb : null);
    }

    /* 1인칭 손 */
    if (!this.hideHud && !p.dead) {
      r.drawHand((mb) => p.buildHand(mb));
    }

    /* 2D */
    if (!this.hideHud) this.hud.render(dt);
    else {
      this.hud.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.hud.ctx.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
    }
    this.gui.render();
    /* 일시정지 중엔 인트로 캔버스 비우기 */
    const ic = this.introCanvas.getContext('2d');
    ic.setTransform(1, 0, 0, 1, 0, 0);
    ic.clearRect(0, 0, this.introCanvas.width, this.introCanvas.height);
  }
}

/* ------------------------------------------------------------- 시작 */
window.addEventListener('DOMContentLoaded', () => {
  const loadingEl = document.getElementById('boot');
  try {
    const game = new Game();
    window.game = game;
    game.start();
    if (loadingEl) loadingEl.style.display = 'none';
  } catch (e) {
    console.error(e);
    if (loadingEl) {
      loadingEl.innerHTML = `<div style="color:#ff8080;padding:24px;font-family:monospace">
        게임을 시작할 수 없습니다.<br><br>${e.message}<br><br>
        WebGL2를 지원하는 최신 브라우저(Chrome/Edge/Firefox)에서 실행해 주세요.</div>`;
    }
  }
});
