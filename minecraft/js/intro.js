/* =========================================================================
 *  intro.js — 인트로 / 타이틀 / 아웃트로
 *  ① 모장 스튜디오 픽셀 로고가 블록으로 조립되는 오프닝
 *  ② 월드 생성 로딩 바
 *  ③ 파노라마 배경 + MINECRAFT 로고 타이틀 화면
 *  ④ 게임 종료 시 채널 아웃트로 (블록 와이프 + 엔드 카드)
 * ========================================================================= */
'use strict';

const INTRO_BLACK = 'black';
const INTRO_MOJANG = 'mojang';
const INTRO_LOADING = 'loading';
const INTRO_TITLE = 'title';
const INTRO_OUTRO = 'outro';
const INTRO_DONE = 'done';

const SPLASH_TEXTS = [
  '100% 순수 자바스크립트!', '외부 라이브러리 0개!', '블록을 캐세요!', '크리퍼 조심!',
  '무한한 세계!', '밤에는 횃불을!', 'WebGL2로 제작!', '다이아몬드는 Y=12 아래에!',
  '물은 흐릅니다!', '좀비가 불탑니다!', '제작대를 만드세요!', '높은 곳에서 떨어지지 마세요!',
  '동굴을 탐험하세요!', '양털로 침대를... 는 없어요!', '절차적 텍스처!', '광원 전파 엔진!',
  'F3으로 디버그!', '씨앗을 심어보세요!', '용암 조심!', '나무를 베어보세요!',
];

class Intro {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.phase = INTRO_BLACK;
    this.t = 0;
    this.buttons = [];
    this.hover = -1;
    this.progress = 0;
    this.progressLabel = '월드를 생성하는 중...';
    this.splash = SPLASH_TEXTS[Math.floor(Math.random() * SPLASH_TEXTS.length)];
    this.onStart = null;
    this.onContinue = null;
    this.onQuitDone = null;
    this.pixels = null;
    this.skipped = false;
    this.panoramaT = 0;
    this.hasSave = false;
    this.outroDone = false;
    this._initMojangPixels();
    this._initPanorama();
  }

  get active() { return this.phase !== INTRO_DONE; }

  /* ------------------------------------------------- 모장 로고 픽셀 */
  _initMojangPixels() {
    const scale = 1;
    const line1 = PixelFont.pixels('MOJANG', scale, 1);
    const line2 = PixelFont.pixels('STUDIOS', scale, 1);
    const w1 = PixelFont.measure('MOJANG', scale, 1);
    const w2 = PixelFont.measure('STUDIOS', scale, 1);
    const px = [];
    const rng = mulberry32(77);
    for (const p of line1) px.push({ tx: p.x - w1 / 2, ty: p.y - 9, r: rng() });
    for (const p of line2) px.push({ tx: p.x - w2 / 2, ty: p.y + 2, r: rng() });
    /* 시작 위치: 화면 밖 랜덤 */
    for (const p of px) {
      const a = rng() * TAU;
      const d = 60 + rng() * 90;
      p.sx = p.tx + Math.cos(a) * d;
      p.sy = p.ty + Math.sin(a) * d;
      p.delay = rng() * 0.55;
      p.rot = (rng() - 0.5) * 6;
    }
    this.pixels = px;
  }

  /* --------------------------------------------------- 파노라마 배경 */
  _initPanorama() {
    const rng = mulberry32(20260911);
    this.hills = [];
    for (let layer = 0; layer < 4; layer++) {
      const cols = [];
      let h = 6 + rng() * 4;
      for (let i = 0; i < 220; i++) {
        h += (rng() - 0.5) * (2.2 - layer * 0.3);
        h = clamp(h, 3, 12 + layer * 2);
        cols.push(Math.round(h));
      }
      this.hills.push(cols);
    }
    this.cloudsP = [];
    for (let i = 0; i < 26; i++) {
      this.cloudsP.push({
        x: rng() * 1600, y: 20 + rng() * 90, w: 40 + rng() * 90, h: 8 + rng() * 10, s: 4 + rng() * 8,
      });
    }
    this.trees = [];
    for (let i = 0; i < 40; i++) {
      this.trees.push({ x: rng() * 2000, layer: Math.floor(rng() * 2) + 2, h: 3 + Math.floor(rng() * 3) });
    }
  }

  /* ================================================================= */
  start(hasSave) {
    this.hasSave = hasSave;
    this.phase = INTRO_BLACK;
    this.t = 0;
    AudioSys.init();
  }

  skip() {
    if (this.phase === INTRO_BLACK || this.phase === INTRO_MOJANG) {
      this.phase = INTRO_TITLE;
      this.t = 0;
      this.skipped = true;
      AudioSys.startMusic();
    } else if (this.phase === INTRO_OUTRO) {
      this._finishOutro();
    }
  }

  startOutro() {
    this.phase = INTRO_OUTRO;
    this.t = 0;
    this.outroDone = false;
  }

  _finishOutro() {
    this.phase = INTRO_TITLE;
    this.t = 0;
    this.splash = SPLASH_TEXTS[Math.floor(Math.random() * SPLASH_TEXTS.length)];
    if (this.onQuitDone) this.onQuitDone();
  }

  beginLoading(label) {
    this.phase = INTRO_LOADING;
    this.t = 0;
    this.progress = 0;
    this.progressLabel = label || '월드를 생성하는 중...';
  }

  finishLoading() {
    this.phase = INTRO_DONE;
    this.t = 0;
  }

  showTitle() {
    this.phase = INTRO_TITLE;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    this.panoramaT += dt;
    switch (this.phase) {
      case INTRO_BLACK:
        if (this.t > 0.45) { this.phase = INTRO_MOJANG; this.t = 0; AudioSys.resume(); }
        break;
      case INTRO_MOJANG:
        if (this.t > 4.1) {
          this.phase = INTRO_TITLE; this.t = 0;
          AudioSys.startMusic();
        }
        /* 조립 완료 순간 효과음 */
        if (!this._thud && this.t > 1.45) {
          this._thud = true;
          AudioSys.dig('stone', 0.5);
          AudioSys.dig('stone', 0.35);
        }
        break;
      case INTRO_OUTRO:
        if (this.t > 5.0) this._finishOutro();
        break;
      default: break;
    }
  }

  /* ================================================================= */
  render() {
    const c = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.floor(c.clientWidth * dpr), H = Math.floor(c.clientHeight * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    this.W = W; this.H = H; this.dpr = dpr;

    switch (this.phase) {
      case INTRO_BLACK: ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); break;
      case INTRO_MOJANG: this._renderMojang(ctx, W, H); break;
      case INTRO_LOADING: this._renderLoading(ctx, W, H); break;
      case INTRO_TITLE: this._renderTitle(ctx, W, H); break;
      case INTRO_OUTRO: this._renderOutro(ctx, W, H); break;
      default: break;
    }
  }

  /* ------------------------------------------------- ① 모장 스튜디오 */
  _renderMojang(ctx, W, H) {
    const t = this.t;
    /* 배경: 붉은색이 위에서 아래로 쓸려 내려옴 */
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const sweep = clamp(t / 0.55, 0, 1);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#e8322c');
    grad.addColorStop(1, '#b81d1d');
    ctx.fillStyle = grad;
    /* 블록 단위 와이프 */
    const bs = Math.max(8, Math.floor(H / 26));
    const rows = Math.ceil(H / bs), cols = Math.ceil(W / bs);
    for (let r = 0; r < rows; r++) {
      for (let cx = 0; cx < cols; cx++) {
        const delay = (r / rows) * 0.7 + hash2(cx, r, 7) * 0.3;
        if (sweep > delay) ctx.fillRect(cx * bs, r * bs, bs, bs);
      }
    }

    /* 픽셀 로고 조립 */
    const S = Math.max(2, Math.floor(Math.min(W / 160, H / 110)));
    const cxp = W / 2, cyp = H / 2;
    ctx.save();
    for (const p of this.pixels) {
      const local = clamp((t - 0.45 - p.delay) / 0.85, 0, 1);
      const e = 1 - Math.pow(1 - local, 3);
      if (local <= 0) continue;
      const x = lerp(p.sx, p.tx, e) * S;
      const y = lerp(p.sy, p.ty, e) * S;
      const a = clamp(local * 1.6, 0, 1);
      /* 조립 후 미세한 진동 */
      const settle = t > 1.45 ? Math.sin((t - 1.45) * 12 + p.r * 6) * Math.max(0, 1 - (t - 1.45) * 2.2) * S * 0.25 : 0;
      ctx.globalAlpha = a * (t > 3.4 ? Math.max(0, 1 - (t - 3.4) / 0.7) : 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(cxp + x), Math.round(cyp + y + settle), S, S);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(Math.round(cxp + x), Math.round(cyp + y + settle + S - Math.max(1, S * 0.18)), S, Math.max(1, S * 0.18));
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    /* 하단 문구 */
    if (t > 1.8) {
      const a = clamp((t - 1.8) / 0.6, 0, 1) * (t > 3.4 ? Math.max(0, 1 - (t - 3.4) / 0.7) : 1);
      ctx.globalAlpha = a;
      PixelFont.draw(ctx, 'REIMAGINED INTRO', W / 2, H / 2 + S * 16, Math.max(1, S / 2),
        { color: 'rgba(255,255,255,0.85)', align: 'center', spacing: 1 });
      ctx.globalAlpha = 1;
    }

    /* 흰 섬광 후 암전 */
    if (t > 3.55) {
      ctx.fillStyle = `rgba(0,0,0,${clamp((t - 3.55) / 0.5, 0, 1)})`;
      ctx.fillRect(0, 0, W, H);
    }
    /* 스킵 안내 */
    ctx.globalAlpha = 0.5;
    PixelFont.draw(ctx, 'CLICK TO SKIP', W - 12, H - 20, Math.max(1, Math.floor(S / 2.5)),
      { color: '#ffffff', align: 'right' });
    ctx.globalAlpha = 1;
  }

  /* ------------------------------------------------------ ② 로딩 화면 */
  _renderLoading(ctx, W, H) {
    /* 흙 블록 타일 배경 */
    const dirt = Textures.canvasOf('dirt');
    const size = Math.max(32, Math.floor(H / 14));
    for (let y = 0; y < H; y += size) {
      for (let x = 0; x < W; x += size) ctx.drawImage(dirt, x, y, size, size);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    const S = Math.max(2, Math.floor(Math.min(W / 220, H / 150)));
    PixelFont.draw(ctx, this.progressLabel.toUpperCase().replace(/[^A-Z0-9 .]/g, ''), W / 2, H / 2 - S * 22, S,
      { color: '#ffffff', align: 'center', shadow: true });

    ctx.font = `${Math.round(S * 7)}px "DungGeunMo", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillText(this.progressLabel, W / 2 + 2, H / 2 - S * 8 + 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.progressLabel, W / 2, H / 2 - S * 8);
    ctx.textAlign = 'left';

    /* 진행 바 */
    const bw = Math.min(W * 0.6, 420), bh = Math.max(8, S * 4);
    const bx = (W - bw) / 2, by = H / 2 + S * 4;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#7ce23a';
    ctx.fillRect(bx, by, Math.round(bw * clamp(this.progress, 0, 1)), bh);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(bx, by, Math.round(bw * clamp(this.progress, 0, 1)), Math.max(1, bh / 3));

    PixelFont.draw(ctx, `${Math.round(this.progress * 100)}%`, W / 2, by + bh + S * 4, S,
      { color: '#e8e8e8', align: 'center', shadow: true });
  }

  /* ----------------------------------------------------- ③ 타이틀 화면 */
  _renderTitle(ctx, W, H) {
    this._drawPanorama(ctx, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(0, 0, W, H);

    const S = Math.max(2, Math.floor(Math.min(W / 112, H / 84)));
    const logoY = H * 0.13;

    /* MINECRAFT 로고 — 돌 텍스처로 채운 픽셀 글자 */
    this._blockText(ctx, 'MINECRAFT', W / 2, logoY, S, 'stone');

    /* 스플래시 문구 */
    const bob = 1 + Math.sin(this.panoramaT * 4) * 0.08;
    ctx.save();
    let fs = Math.round(S * 4.6);
    ctx.font = `bold ${fs}px "DungGeunMo", system-ui, sans-serif`;
    const maxW = W * 0.34;
    const tw = ctx.measureText(this.splash).width;
    if (tw > maxW) {
      fs = Math.max(9, Math.round(fs * maxW / tw));
      ctx.font = `bold ${fs}px "DungGeunMo", system-ui, sans-serif`;
    }
    ctx.translate(Math.min(W / 2 + S * 26, W - W * 0.2), logoY + S * 8);
    ctx.rotate(-0.3);
    ctx.scale(bob, bob);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3a3100';
    ctx.fillText(this.splash, 2, 2);
    ctx.fillStyle = '#ffff55';
    ctx.fillText(this.splash, 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';

    /* 버튼 */
    const bw = Math.min(W * 0.5, 280 * this.dpr), bh = Math.max(26, S * 9);
    const bx = W / 2 - bw / 2;
    let by = H * 0.46;
    const gap = bh + Math.max(6, S * 2.2);
    this.buttons = [];
    this._button(ctx, '새로운 세계 시작', bx, by, bw, bh, 'new');
    by += gap;
    this._button(ctx, '이어서 하기', bx, by, bw, bh, 'continue', !this.hasSave);
    by += gap;
    this._button(ctx, '설정', bx, by, bw * 0.48 - 4, bh, 'options');
    this._button(ctx, '조작법', bx + bw * 0.52 + 4, by, bw * 0.48 - 4, bh, 'help');

    /* 하단 표기 */
    ctx.font = `${Math.round(S * 3.4)}px "DungGeunMo", system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.textBaseline = 'bottom';
    ctx.fillText('JavaScript + WebGL2 · 절차적 생성 · 물리 · 조명 · 몹 · 제작', 8 * this.dpr, H - 8 * this.dpr);
    ctx.textAlign = 'right';
    ctx.fillText('v1.0', W - 8 * this.dpr, H - 8 * this.dpr);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /** 블록 텍스처로 채운 픽셀 글자 */
  _blockText(ctx, text, cx, y, S, texName) {
    const tex = Textures.canvasOf(texName);
    const w = PixelFont.measure(text, S, 1);
    const x0 = cx - w / 2;
    const pixels = PixelFont.pixels(text, S, 1);
    /* 아래로 떨어지는 두꺼운 그림자 */
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    for (const p of pixels) ctx.fillRect(x0 + p.x + S * 1.7, y + p.y + S * 1.7, S, S);
    /* 검은 테두리 — 글자 전체를 8방향으로 확장 (내부를 갉아먹지 않음) */
    const ow = Math.max(1, Math.round(S * 0.3));
    ctx.fillStyle = '#121212';
    for (const [dx, dy] of [[-ow, 0], [ow, 0], [0, -ow], [0, ow], [-ow, -ow], [ow, ow], [-ow, ow], [ow, -ow]]) {
      for (const p of pixels) ctx.fillRect(x0 + p.x + dx, y + p.y + dy, S, S);
    }
    /* 블록 텍스처 본체 */
    for (const p of pixels) {
      ctx.drawImage(tex, (p.col * 3) % 16, (p.row * 3) % 16, 4, 4, x0 + p.x, y + p.y, S, S);
    }
    /* 밝기 보정 + 입체감 */
    for (const p of pixels) {
      ctx.fillStyle = 'rgba(255,255,255,0.24)';
      ctx.fillRect(x0 + p.x, y + p.y, S, S);
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.fillRect(x0 + p.x, y + p.y, S, Math.max(1, S * 0.22));
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.fillRect(x0 + p.x, y + p.y + S - Math.max(1, S * 0.22), S, Math.max(1, S * 0.22));
    }
  }

  _button(ctx, label, x, y, w, h, action, disabled) {
    const hovered = !disabled && this.mouseX >= x && this.mouseX <= x + w &&
      this.mouseY >= y && this.mouseY <= y + h;
    this.buttons.push({ x, y, w, h, action, disabled });
    ctx.fillStyle = disabled ? '#4a4a4a' : (hovered ? '#8b9aca' : '#6a6a6a');
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = disabled ? '#5a5a5a' : (hovered ? '#aab7e0' : '#8a8a8a');
    ctx.fillRect(x, y, w, Math.max(1, h * 0.12));
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x, y + h - Math.max(1, h * 0.12), w, Math.max(1, h * 0.12));
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = Math.max(1, this.dpr);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    ctx.font = `${Math.round(h * 0.46)}px "DungGeunMo", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(label, x + w / 2 + 1, y + h / 2 + 1);
    ctx.fillStyle = disabled ? '#9a9a9a' : '#ffffff';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /* ------------------------------------------------------ 파노라마 */
  _drawPanorama(ctx, W, H) {
    const t = this.panoramaT;
    /* 하늘 */
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#3a72d8');
    grad.addColorStop(0.55, '#79aef5');
    grad.addColorStop(1, '#c9e2ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    /* 태양 */
    ctx.fillStyle = '#fff6d0';
    const sunX = W * 0.78, sunY = H * 0.18, sunR = Math.max(18, H * 0.05);
    ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
    ctx.fillStyle = 'rgba(255,255,220,0.28)';
    ctx.fillRect(sunX - sunR * 1.6, sunY - sunR * 1.6, sunR * 3.2, sunR * 3.2);

    /* 구름 */
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const c of this.cloudsP) {
      const x = mod(c.x - t * c.s, W + 300) - 150;
      const sc = H / 400;
      ctx.fillRect(x, c.y * sc, c.w * sc, c.h * sc);
      ctx.fillRect(x + c.w * sc * 0.2, (c.y - c.h * 0.6) * sc, c.w * sc * 0.6, c.h * sc * 0.7);
    }

    /* 언덕 레이어 (뒤 → 앞) */
    const grass = Textures.canvasOf('grass_top');
    const grassSide = Textures.canvasOf('grass_side');
    const dirt = Textures.canvasOf('dirt');
    const leaves = Textures.canvasOf('oak_leaves');
    const log = Textures.canvasOf('oak_log_side');

    for (let layer = 0; layer < 4; layer++) {
      const depth = 4 - layer;
      const bs = Math.max(6, Math.round(H / (28 + depth * 10)));
      const speed = 6 + layer * 9;
      const offset = mod(t * speed, bs * 220);
      const baseY = H * (0.58 + layer * 0.09);
      const shade = 0.55 + layer * 0.15;
      const cols = this.hills[layer];

      for (let i = -1; i < Math.ceil(W / bs) + 2; i++) {
        const idx = mod(Math.floor(i + offset / bs), cols.length);
        const h = cols[idx];
        const x = i * bs - (offset % bs);
        const topY = baseY - h * bs * 0.35;
        /* 잔디 윗면 */
        ctx.globalAlpha = 1;
        ctx.drawImage(grassSide, x, topY, bs, bs);
        ctx.fillStyle = `rgba(0,0,0,${1 - shade})`;
        ctx.fillRect(x, topY, bs, bs);
        /* 흙 */
        for (let y = topY + bs; y < H; y += bs) {
          ctx.drawImage(dirt, x, y, bs, bs);
          ctx.fillStyle = `rgba(0,0,0,${1 - shade + 0.12})`;
          ctx.fillRect(x, y, bs, bs);
        }
        void grass;
      }

      /* 나무 */
      if (layer >= 2) {
        for (const tr of this.trees) {
          if (tr.layer !== layer) continue;
          const x = mod(tr.x - t * speed, bs * 220) - bs * 4;
          if (x < -bs * 4 || x > W + bs * 4) continue;
          const idx = mod(Math.floor((x + offset) / bs), cols.length);
          const h = cols[idx];
          const groundY = baseY - h * bs * 0.35;
          for (let i = 0; i < tr.h; i++) {
            ctx.drawImage(log, x, groundY - (i + 1) * bs, bs, bs);
          }
          const canopy = [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
          [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 2], [0, 2], [1, 2]];
          for (const [lx, ly] of canopy) {
            ctx.drawImage(leaves, x + lx * bs, groundY - (tr.h + 1 + ly) * bs, bs, bs);
            ctx.fillStyle = `rgba(0,0,0,${(1 - shade) * 0.8})`;
            ctx.fillRect(x + lx * bs, groundY - (tr.h + 1 + ly) * bs, bs, bs);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ------------------------------------------------------- ④ 아웃트로 */
  _renderOutro(ctx, W, H) {
    const t = this.t;
    ctx.fillStyle = '#0c0c10';
    ctx.fillRect(0, 0, W, H);

    /* 블록 와이프 인 */
    const bs = Math.max(10, Math.floor(H / 22));
    const rows = Math.ceil(H / bs), cols = Math.ceil(W / bs);
    const p = clamp(t / 0.9, 0, 1);
    const stone = Textures.canvasOf('stone');
    for (let r = 0; r < rows; r++) {
      for (let cx = 0; cx < cols; cx++) {
        const d = hash2(cx, r, 13);
        if (p > d) {
          ctx.drawImage(stone, cx * bs, r * bs, bs, bs);
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(cx * bs, r * bs, bs, bs);
        }
      }
    }

    const S = Math.max(2, Math.floor(Math.min(W / 150, H / 100)));
    if (t > 0.8) {
      const a = clamp((t - 0.8) / 0.5, 0, 1);
      ctx.globalAlpha = a;
      this._blockText(ctx, 'MINECRAFT', W / 2, H * 0.3, S, 'grass_side');
      ctx.globalAlpha = 1;
    }
    if (t > 1.5) {
      const a = clamp((t - 1.5) / 0.5, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `${Math.round(S * 7)}px "DungGeunMo", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillText('플레이해 주셔서 감사합니다!', W / 2 + 2, H * 0.52 + 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('플레이해 주셔서 감사합니다!', W / 2, H * 0.52);
      ctx.font = `${Math.round(S * 5)}px "DungGeunMo", system-ui, sans-serif`;
      ctx.fillStyle = '#c8c8c8';
      ctx.fillText('진행 상황은 자동으로 저장되었습니다', W / 2, H * 0.52 + S * 10);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
    /* 엔드 카드 (블록이 튀어오르는 연출) */
    if (t > 2.2) {
      const cards = ['grass_block', 'oak_planks', 'diamond_block', 'furnace', 'crafting_table'];
      const cs = Math.max(28, Math.floor(H / 9));
      const totalW = cards.length * (cs + 8) - 8;
      for (let i = 0; i < cards.length; i++) {
        const lt = clamp((t - 2.2 - i * 0.12) / 0.45, 0, 1);
        if (lt <= 0) continue;
        const e = 1 - Math.pow(1 - lt, 3);
        const y = H * 0.72 + (1 - e) * 60;
        const icon = ItemIcons.get(BlockIds[cards[i]]);
        ctx.globalAlpha = e;
        ctx.drawImage(icon, W / 2 - totalW / 2 + i * (cs + 8), y, cs, cs);
        ctx.globalAlpha = 1;
      }
    }
    if (t > 4.4) {
      ctx.fillStyle = `rgba(0,0,0,${clamp((t - 4.4) / 0.6, 0, 1)})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 0.5;
    PixelFont.draw(ctx, 'CLICK TO CONTINUE', W - 12, H - 20, Math.max(1, Math.floor(S / 2.5)),
      { color: '#ffffff', align: 'right' });
    ctx.globalAlpha = 1;
  }

  /* --------------------------------------------------------- 입력 */
  onMove(x, y) {
    this.mouseX = x * this.dpr; this.mouseY = y * this.dpr;
  }

  onClick(x, y) {
    const mx = x * this.dpr, my = y * this.dpr;
    if (this.phase === INTRO_MOJANG || this.phase === INTRO_BLACK) { this.skip(); return null; }
    if (this.phase === INTRO_OUTRO) { this._finishOutro(); return null; }
    if (this.phase !== INTRO_TITLE) return null;
    for (const b of this.buttons) {
      if (b.disabled) continue;
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        AudioSys.click();
        return b.action;
      }
    }
    return null;
  }
}
