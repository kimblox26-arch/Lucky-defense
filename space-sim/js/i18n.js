/* ===== 다국어 (i18n) ===== */
(function (root) {
  const L = {
    ko: {
      _name: '한국어',
      title: 'SpaceSim', subtitle: '천체물리학 시뮬레이션 플랫폼',
      terrain: '지형 높낮이 과장', planetSet: '행성 설정', pressure: '대기압', greenhouse: '온실 효과', albedo: '반사율', waterL: '표면 물', iceL: '얼음', rotper: '자전 주기', axtilt: '자전축 기울기', magfield: '자기장', compos: '구성 성분', rock: '암석', iron: '철', iceC: '얼음', gasC: '가스', addWater: '물 추가', addAtmo: '대기 추가', heat: '가열', cool: '냉각', terraform: '지구화', atmoLost: '대기가 우주로 빠져나감',

      viewOpts: '표시 옵션', rocheShow: '로슈 한계 표시',

      preset_sn: '초신성 폭발', preset_tde: '블랙홀 조석 파괴',

      ev_tde: '블랙홀 조석 파괴!', ev_supernova: '초신성 폭발!', ev_giant: '적색거성으로 팽창', supernova: '초신성', redgiant: '적색거성화', evolution: '항성 진화', evorate: '진화 속도', bloom: '발광(블룸)', tidalDeform: '조석 변형', physicsAlways: '물리 효과는 항상 적용됩니다 (표시 버튼은 화면 표시만 전환)',

      st_stable: '안정', st_tidal: '조석 변형', st_break: '붕괴 진행', primary: '중심 천체', fluidL: '유체 한계', rigidL: '강체 한계', frag: '조각', newmoon: '새 위성',

      bname: '이름', surface: '표면', color: '색', spin: '자전', fixed: '위치 고정',
      atmo: '대기', cloudsL: '구름', tail: '꼬리', irr: '불규칙 형태', edit: '천체 편집',
      appearance: '외형', motion: '운동', autoOrbit: '자동 원궤도', help: '조작법',

      play: '플레이', settings: '설정', language: '언어', quit: '나가기', resume: '계속하기',
      back: '뒤로', close: '닫기', apply: '적용', reset: '초기화', confirm: '확인', cancel: '취소',
      // 카테고리
      cat_all: '전체', cat_star: '항성', cat_planet: '행성', cat_moon: '위성', cat_dwarf: '왜소행성',
      cat_asteroid: '소행성', cat_comet: '혜성', cat_meteoroid: '운석', cat_exo: '외계행성',
      cat_bh: '블랙홀', cat_ns: '중성자별', cat_wd: '백색왜성', cat_bd: '갈색왜성', cat_custom: '사용자 정의',
      // 툴
      spawn: '천체 소환', inspector: '천체 정보', presets: '시나리오', tools: '도구',
      tool_select: '선택', tool_place: '배치', tool_launch: '발사', tool_measure: '측정', tool_paint: '구슬 뿌리기',
      trails: '궤적', roche: '로슈 한계', grid: '중력장 격자', labels: '이름표', hz: '거주가능영역',
      vectors: '속도 벡터', marble: '구슬 모드', collide: '충돌', debris: '파편',
      // 시간
      pause: '일시정지', playSim: '재생', speed: '속도', reverse: '역재생', elapsed: '경과 시간',
      // 정보
      mass: '질량', radius: '반지름', density: '밀도', temp: '온도', velocity: '속도',
      distance: '거리', type: '종류', composition: '구성', gravity: '표면 중력', escape: '탈출 속도',
      period: '공전 주기', apo: '원점', peri: '근점', ecc: '이심률', semi: '긴반지름',
      follow: '추적', unfollow: '추적 해제', del: '삭제', explode: '폭발', fragment: '파편화',
      duplicate: '복제', addring: '고리 추가', center: '중심으로', orbitit: '이 천체 공전',
      // 설정
      graphics: '그래픽', quality: '품질', trailLen: '궤적 길이', physics: '물리', substeps: '정밀도',
      gmul: '중력 상수 배율', maxbody: '최대 천체 수', colmode: '충돌 방식',
      merge: '합체', bounce: '튕김', shatter: '파쇄', realistic: '현실적',
      sizescale: '천체 크기 배율', bloom: '발광 효과', sound: '효과음', showfps: 'FPS 표시',
      selfgrav: '파편 자체 중력', accretion: '파편 강착(위성 생성)', tidal: '조석 가열',
      // 안내
      hint_place: '화면을 눌러 천체를 배치하세요 (드래그: 속도 지정)',
      hint_launch: '드래그해서 속도와 방향을 지정하고 놓으세요',
      hint_measure: '두 지점을 눌러 거리를 측정합니다',
      hint_cam: '드래그: 회전 · 휠/두 손가락: 확대 · 우클릭/두 손가락 드래그: 이동',
      quitMsg: '시뮬레이션을 종료하고 메인 화면으로 돌아갑니다.',
      // 이벤트
      ev_merge: '합체', ev_shatter: '충돌 파쇄', ev_roche: '로슈 한계 붕괴!', ev_moonborn: '파편이 뭉쳐 위성 탄생!',
      ev_swallow: '블랙홀이 삼켰습니다', ev_spawn: '소환', ev_del: '삭제됨', ev_saved: '저장됨', ev_loaded: '불러옴',
      save: '저장', load: '불러오기', clearAll: '전체 삭제', randomSys: '무작위 계',
      searchPH: '천체 이름 검색…',
      preset_solar: '태양계', preset_em: '지구 - 달', preset_jup: '목성계', preset_sat: '토성계',
      preset_binary: '쌍성계', preset_bh: '블랙홀 강착 원반', preset_roche: '로슈 한계 실험',
      preset_moonmake: '충돌 → 위성 형성', preset_trappist: 'TRAPPIST-1', preset_chaos: '난장판 은하',
      preset_marble: '구슬 상자', preset_empty: '빈 우주',
      bodies: '천체', debrisN: '파편', fps: 'FPS', scale: '배율', tscale: '시간'
    },
    en: {
      _name: 'English',
      title: 'SpaceSim', subtitle: 'Astrophysical Simulation Platform',
      terrain: 'Terrain Relief', planetSet: 'Planet Settings', pressure: 'Pressure', greenhouse: 'Greenhouse', albedo: 'Albedo', waterL: 'Surface Water', iceL: 'Ice', rotper: 'Rotation Period', axtilt: 'Axial Tilt', magfield: 'Magnetic Field', compos: 'Composition', rock: 'Rock', iron: 'Iron', iceC: 'Ice', gasC: 'Gas', addWater: 'Add Water', addAtmo: 'Add Atmosphere', heat: 'Heat', cool: 'Cool', terraform: 'Terraform', atmoLost: 'Atmosphere escaping to space',

      viewOpts: 'View Options', rocheShow: 'Roche Limit Overlay',

      preset_sn: 'Supernova', preset_tde: 'Black Hole Tidal Disruption',

      ev_tde: 'Tidal disruption by black hole!', ev_supernova: 'SUPERNOVA!', ev_giant: 'Expanded into a red giant', supernova: 'Supernova', redgiant: 'Red Giant', evolution: 'Stellar Evolution', evorate: 'Evolution Rate', bloom: 'Bloom', tidalDeform: 'Tidal Deformation', physicsAlways: 'Physics is always on — these buttons only toggle the overlay',

      st_stable: 'Stable', st_tidal: 'Tidally stressed', st_break: 'Breaking up', primary: 'Primary', fluidL: 'Fluid limit', rigidL: 'Rigid limit', frag: 'frag', newmoon: 'New Moon',

      bname: 'Name', surface: 'Surface', color: 'Color', spin: 'Spin', fixed: 'Pin Position',
      atmo: 'Atmosphere', cloudsL: 'Clouds', tail: 'Tail', irr: 'Irregular Shape', edit: 'Edit Body',
      appearance: 'Appearance', motion: 'Motion', autoOrbit: 'Auto Circular Orbit', help: 'Controls',

      play: 'PLAY', settings: 'SETTINGS', language: 'LANGUAGE', quit: 'QUIT', resume: 'RESUME',
      back: 'Back', close: 'Close', apply: 'Apply', reset: 'Reset', confirm: 'OK', cancel: 'Cancel',
      cat_all: 'All', cat_star: 'Stars', cat_planet: 'Planets', cat_moon: 'Moons', cat_dwarf: 'Dwarfs',
      cat_asteroid: 'Asteroids', cat_comet: 'Comets', cat_meteoroid: 'Meteoroids', cat_exo: 'Exoplanets',
      cat_bh: 'Black Holes', cat_ns: 'Neutron Stars', cat_wd: 'White Dwarfs', cat_bd: 'Brown Dwarfs', cat_custom: 'Custom',
      spawn: 'Spawn Body', inspector: 'Body Info', presets: 'Scenarios', tools: 'Tools',
      tool_select: 'Select', tool_place: 'Place', tool_launch: 'Launch', tool_measure: 'Measure', tool_paint: 'Marble Spray',
      trails: 'Trails', roche: 'Roche Limit', grid: 'Gravity Grid', labels: 'Labels', hz: 'Habitable Zone',
      vectors: 'Velocity', marble: 'Marble Mode', collide: 'Collisions', debris: 'Debris',
      pause: 'Pause', playSim: 'Play', speed: 'Speed', reverse: 'Reverse', elapsed: 'Elapsed',
      mass: 'Mass', radius: 'Radius', density: 'Density', temp: 'Temp', velocity: 'Velocity',
      distance: 'Distance', type: 'Type', composition: 'Composition', gravity: 'Surface g', escape: 'Escape v',
      period: 'Period', apo: 'Apoapsis', peri: 'Periapsis', ecc: 'Eccentricity', semi: 'Semi-major',
      follow: 'Follow', unfollow: 'Unfollow', del: 'Delete', explode: 'Explode', fragment: 'Shatter',
      duplicate: 'Duplicate', addring: 'Add Ring', center: 'Center', orbitit: 'Orbit This',
      graphics: 'Graphics', quality: 'Quality', trailLen: 'Trail Length', physics: 'Physics', substeps: 'Accuracy',
      gmul: 'G Multiplier', maxbody: 'Max Bodies', colmode: 'Collision Mode',
      merge: 'Merge', bounce: 'Bounce', shatter: 'Shatter', realistic: 'Realistic',
      sizescale: 'Body Size Scale', bloom: 'Glow', sound: 'Sound', showfps: 'Show FPS',
      selfgrav: 'Debris Self-Gravity', accretion: 'Debris Accretion (Moons)', tidal: 'Tidal Heating',
      hint_place: 'Tap to place a body (drag to set velocity)',
      hint_launch: 'Drag to aim and release to launch',
      hint_measure: 'Tap two points to measure distance',
      hint_cam: 'Drag: orbit · Wheel/pinch: zoom · Right-drag/2-finger: pan',
      quitMsg: 'Return to the main menu?',
      ev_merge: 'Merged', ev_shatter: 'Shattered', ev_roche: 'Roche limit breakup!', ev_moonborn: 'Debris accreted into a moon!',
      ev_swallow: 'Devoured by black hole', ev_spawn: 'Spawned', ev_del: 'Deleted', ev_saved: 'Saved', ev_loaded: 'Loaded',
      save: 'Save', load: 'Load', clearAll: 'Clear All', randomSys: 'Random System',
      searchPH: 'Search bodies…',
      preset_solar: 'Solar System', preset_em: 'Earth - Moon', preset_jup: 'Jupiter System', preset_sat: 'Saturn System',
      preset_binary: 'Binary Stars', preset_bh: 'Black Hole Disk', preset_roche: 'Roche Limit Lab',
      preset_moonmake: 'Impact → Moon', preset_trappist: 'TRAPPIST-1', preset_chaos: 'Chaos Galaxy',
      preset_marble: 'Marble Box', preset_empty: 'Empty Space',
      bodies: 'Bodies', debrisN: 'Debris', fps: 'FPS', scale: 'Scale', tscale: 'Time'
    },
    ja: {
      _name: '日本語',
      title: 'MARBLE COSMOS', subtitle: 'ビー玉宇宙シミュレーター',
      terrain: '地形の起伏', planetSet: '惑星設定', pressure: '気圧', greenhouse: '温室効果', albedo: 'アルベド', waterL: '表面の水', iceL: '氷', rotper: '自転周期', axtilt: '自転軸傾斜', magfield: '磁場', compos: '組成', rock: '岩石', iron: '鉄', iceC: '氷', gasC: 'ガス', addWater: '水を追加', addAtmo: '大気を追加', heat: '加熱', cool: '冷却', terraform: 'テラフォーム', atmoLost: '大気が宇宙へ流出中',

      viewOpts: '表示オプション', rocheShow: 'ロッシュ限界表示',

      preset_sn: '超新星爆発', preset_tde: 'ブラックホール潮汐破壊',

      ev_tde: 'ブラックホールの潮汐破壊!', ev_supernova: '超新星爆発!', ev_giant: '赤色巨星に膨張', supernova: '超新星', redgiant: '赤色巨星化', evolution: '恒星進化', evorate: '進化速度', bloom: 'ブルーム', tidalDeform: '潮汐変形', physicsAlways: '物理は常に有効 — ボタンは表示の切替のみ',

      st_stable: '安定', st_tidal: '潮汐変形', st_break: '崩壊進行', primary: '中心天体', fluidL: '流体限界', rigidL: '剛体限界', frag: '破片', newmoon: '新衛星',

      bname: '名前', surface: '表面', color: '色', spin: '自転', fixed: '位置固定',
      atmo: '大気', cloudsL: '雲', tail: '尾', irr: '不規則な形', edit: '天体編集',
      appearance: '外観', motion: '運動', autoOrbit: '自動円軌道', help: '操作方法',

      play: 'プレイ', settings: '設定', language: '言語', quit: '終了', resume: '再開',
      back: '戻る', close: '閉じる', apply: '適用', reset: 'リセット', confirm: 'OK', cancel: 'キャンセル',
      cat_all: 'すべて', cat_star: '恒星', cat_planet: '惑星', cat_moon: '衛星', cat_dwarf: '準惑星',
      cat_asteroid: '小惑星', cat_comet: '彗星', cat_meteoroid: '流星体', cat_exo: '系外惑星',
      cat_bh: 'ブラックホール', cat_ns: '中性子星', cat_wd: '白色矮星', cat_bd: '褐色矮星', cat_custom: 'カスタム',
      spawn: '天体召喚', inspector: '天体情報', presets: 'シナリオ', tools: 'ツール',
      tool_select: '選択', tool_place: '配置', tool_launch: '発射', tool_measure: '計測', tool_paint: 'ビー玉散布',
      trails: '軌跡', roche: 'ロッシュ限界', grid: '重力格子', labels: 'ラベル', hz: 'ハビタブルゾーン',
      vectors: '速度ベクトル', marble: 'ビー玉モード', collide: '衝突', debris: '破片',
      pause: '一時停止', playSim: '再生', speed: '速度', reverse: '逆再生', elapsed: '経過時間',
      mass: '質量', radius: '半径', density: '密度', temp: '温度', velocity: '速度',
      distance: '距離', type: '種類', composition: '組成', gravity: '表面重力', escape: '脱出速度',
      period: '公転周期', apo: '遠点', peri: '近点', ecc: '離心率', semi: '長半径',
      follow: '追跡', unfollow: '追跡解除', del: '削除', explode: '爆発', fragment: '破砕',
      duplicate: '複製', addring: '環を追加', center: '中心へ', orbitit: 'この天体を周回',
      graphics: 'グラフィック', quality: '品質', trailLen: '軌跡の長さ', physics: '物理', substeps: '精度',
      gmul: '重力定数倍率', maxbody: '最大天体数', colmode: '衝突モード',
      merge: '合体', bounce: '跳ね返り', shatter: '破砕', realistic: 'リアル',
      sizescale: '天体サイズ倍率', bloom: '発光', sound: '効果音', showfps: 'FPS表示',
      selfgrav: '破片の自己重力', accretion: '破片降着(衛星形成)', tidal: '潮汐加熱',
      hint_place: 'タップで天体を配置(ドラッグで速度)',
      hint_launch: 'ドラッグして離すと発射',
      hint_measure: '2点をタップして距離を計測',
      hint_cam: 'ドラッグ:回転 · ホイール/ピンチ:ズーム · 右ドラッグ:移動',
      quitMsg: 'メインメニューに戻りますか?',
      ev_merge: '合体', ev_shatter: '衝突破砕', ev_roche: 'ロッシュ限界で崩壊!', ev_moonborn: '破片が集まり衛星誕生!',
      ev_swallow: 'ブラックホールに飲み込まれた', ev_spawn: '召喚', ev_del: '削除', ev_saved: '保存', ev_loaded: '読込',
      save: '保存', load: '読込', clearAll: '全消去', randomSys: 'ランダム系',
      searchPH: '天体を検索…',
      preset_solar: '太陽系', preset_em: '地球 - 月', preset_jup: '木星系', preset_sat: '土星系',
      preset_binary: '連星', preset_bh: 'ブラックホール円盤', preset_roche: 'ロッシュ限界実験',
      preset_moonmake: '衝突→衛星形成', preset_trappist: 'TRAPPIST-1', preset_chaos: 'カオス銀河',
      preset_marble: 'ビー玉箱', preset_empty: '空の宇宙',
      bodies: '天体', debrisN: '破片', fps: 'FPS', scale: '倍率', tscale: '時間'
    }
  };

  const I18N = {
    langs: Object.keys(L),
    cur: 'ko',
    set(l) { if (L[l]) { this.cur = l; try { localStorage.setItem('mc_lang', l); } catch (e) {} this.refresh(); } },
    name(l) { return L[l]._name; },
    t(k) { return (L[this.cur] && L[this.cur][k]) || (L.en[k]) || k; },
    // 천체 이름 현지화: 카탈로그에 name/name_en/name_ja 보관
    bodyName(b) {
      if (!b) return '';
      if (this.cur === 'ko') return b.ko || b.en || b.id;
      if (this.cur === 'ja') return b.ja || b.en || b.id;
      return b.en || b.id;
    },
    refresh() {
      document.querySelectorAll('[data-t]').forEach(e => { e.textContent = I18N.t(e.dataset.t); });
      document.querySelectorAll('[data-tp]').forEach(e => { e.placeholder = I18N.t(e.dataset.tp); });
      document.documentElement.lang = I18N.cur;
      if (root.onLangChange) root.onLangChange();
    },
    init() {
      let l = null;
      try { l = localStorage.getItem('mc_lang'); } catch (e) {}
      if (!l) { const n = (navigator.language || 'en').slice(0, 2); l = L[n] ? n : 'en'; }
      this.cur = L[l] ? l : 'en';
    }
  };
  root.I18N = I18N;
})(window);
