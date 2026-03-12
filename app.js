/* =============================================
   app.js — OrumBrain SPA 라우터 + 상태관리
   ============================================= */

/* ─────────── localStorage 키 ─────────── */
const LS = {
  NICKNAME:   'ob_nickname',
  VISITED:    'ob_visited',
  STREAK:     'ob_streak',
  LAST_DATE:  'ob_last_date',
  NBACK_LEVEL:'ob_nback_level',
  SESSIONS:   'ob_sessions',
  THEME:      'ob_theme',  // 'light' | 'dark'
};

/* ─────────── 상태 읽기/쓰기 ─────────── */
const State = {
  get nickname()   { return localStorage.getItem(LS.NICKNAME) || ''; },
  get visited()    { return !!localStorage.getItem(LS.VISITED); },
  get streak()     { return parseInt(localStorage.getItem(LS.STREAK) || '0', 10); },
  get lastDate()   { return localStorage.getItem(LS.LAST_DATE) || ''; },
  get nbackLevel() { return parseInt(localStorage.getItem(LS.NBACK_LEVEL) || '2', 10); },
  get sessions()   { return JSON.parse(localStorage.getItem(LS.SESSIONS) || '[]'); },
  get theme()      { return localStorage.getItem(LS.THEME) || 'auto'; },

  set nickname(v)   { localStorage.setItem(LS.NICKNAME, v); },
  set visited(v)    { localStorage.setItem(LS.VISITED, v ? '1' : ''); },
  set streak(v)     { localStorage.setItem(LS.STREAK, String(v)); },
  set lastDate(v)   { localStorage.setItem(LS.LAST_DATE, v); },
  set nbackLevel(v) { localStorage.setItem(LS.NBACK_LEVEL, String(v)); },
  set theme(v)      { localStorage.setItem(LS.THEME, v); },

  pushSession(s) {
    const sessions = State.sessions;
    sessions.push(s);
    if (sessions.length > 20) sessions.shift();
    localStorage.setItem(LS.SESSIONS, JSON.stringify(sessions));
  },
};

/* ─────────── 테마 관리 ─────────── */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('btn-theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  // 현재 실제 적용된 테마 기준으로 전환
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next    = current === 'dark' ? 'light' : 'dark';
  State.theme   = next;
  applyTheme(next);
}

function initTheme() {
  const saved = State.theme;
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved);
  } else {
    // 시스템 설정 따름
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

/* ─────────── 스트릭 업데이트 ─────────── */
function updateStreak() {
  const today    = new Date().toISOString().slice(0, 10);
  const lastDate = State.lastDate;
  if (lastDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  State.streak    = lastDate === yesterday ? State.streak + 1 : 1;
  State.lastDate  = today;
}

/* ─────────── 화면 전환 ─────────── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + id);
  if (el) el.classList.add('active');
}

/* ─────────── 뇌 나이 추정 ─────────── */
function calcBrainAge(avgAccuracy) {
  return Math.max(20, Math.min(70, Math.round((100 - avgAccuracy) * 0.5 + 25)));
}

/* ─────────── AI 추천 메시지 ─────────── */
function getAiMessage(results) {
  if (!results.nback && !results.stroop && !results.gonogo)
    return STIMULI.AI_MESSAGES.firstTime;

  const mem     = results.nback   ? results.nback.accuracy   : 0;
  const speed   = results.stroop  ? results.stroop.speedScore : 0;
  const inhibit = results.gonogo  ? results.gonogo.inhibitionRate : 0;

  if (mem >= 80 && speed >= 70 && inhibit >= 80)
    return STIMULI.AI_MESSAGES.allGood;
  if (mem < 60)   return STIMULI.AI_MESSAGES.lowMemory;
  if (speed < 50) return STIMULI.AI_MESSAGES.lowInhibit;
  if (inhibit < 60) return STIMULI.AI_MESSAGES.lowGonogo;
  if (mem >= 80)  return STIMULI.AI_MESSAGES.highMemory;
  if (speed >= 80) return STIMULI.AI_MESSAGES.highInhibit;
  return STIMULI.AI_MESSAGES.highGonogo;
}

/* ─────────── 게임 결과 버퍼 ─────────── */
const GameResults = { nback: null, stroop: null, gonogo: null };

/* ============================================
   온보딩 화면 초기화
   ============================================ */
function initOnboarding() {
  const input    = document.getElementById('input-nickname');
  const btnStart = document.getElementById('btn-start');

  input.addEventListener('input', () => {
    btnStart.disabled = input.value.trim().length === 0;
  });

  btnStart.addEventListener('click', () => {
    const nick = input.value.trim();
    if (!nick) return;
    State.nickname = nick;
    State.visited  = true;
    updateStreak();
    initHome();
    showScreen('home');
  });
}

/* ============================================
   홈 화면 초기화
   ============================================ */
function initHome() {
  const nick = State.nickname;
  document.getElementById('greeting-text').textContent = `${nick}님, 안녕하세요 👋`;

  const sessions = State.sessions;
  if (sessions.length > 0) {
    const avgAcc = Math.round(
      sessions.reduce((a, s) => a + (s.accuracy || 0), 0) / sessions.length
    );
    const brainAge = calcBrainAge(avgAcc);
    document.getElementById('brain-age-text').textContent = `오늘의 뇌 나이: ${brainAge}세 (참고용)`;
  } else {
    document.getElementById('brain-age-text').textContent = '첫 훈련을 시작해보세요!';
  }

  document.getElementById('streak-count').textContent = String(State.streak);

  // N-back 레벨 표시
  document.getElementById('nback-level-label').textContent = `난이도: ${State.nbackLevel}-back`;

  // 랜덤 뇌과학 팁
  const tips = STIMULI.BRAIN_TIPS;
  document.getElementById('brain-tip').textContent =
    tips[Math.floor(Math.random() * tips.length)];

  // 게임 카드 클릭
  document.querySelectorAll('[data-action="start-game"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const game = btn.dataset.game;
      startGame(game);
    });
  });
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => startGame(card.dataset.game));
  });

  // 전체 훈련
  document.getElementById('btn-all-games').addEventListener('click', () => {
    startGame('nback');
  });

  // 테마 토글
  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    themeBtn.onclick = toggleTheme;
    // 현재 테마에 맞게 아이콘 업데이트
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    themeBtn.textContent = current === 'dark' ? '☀️' : '🌙';
  }
}

/* ─────────── 게임 라우팅 ─────────── */
function startGame(type) {
  if (type === 'nback')   initNBack();
  else if (type === 'stroop') initStroop();
  else if (type === 'gonogo') initGoNoGo();
}

function nextGameAfter(current) {
  if (current === 'nback')  startGame('stroop');
  else if (current === 'stroop') startGame('gonogo');
  else showResult();
}

/* ============================================
   N-back 화면
   ============================================ */
function initNBack() {
  showScreen('nback');

  const n = State.nbackLevel;
  const game = new NBackGame({ n });

  // DOM 요소
  const ruleEl       = document.getElementById('nback-rule');
  const countdownEl  = document.getElementById('nback-countdown');
  const nbackPlay    = document.getElementById('nback-play');
  const stimPhase    = document.getElementById('nback-stimulus-phase');
  const respPhase    = document.getElementById('nback-response-phase');
  const charEl       = document.getElementById('nback-char');
  const stimCard     = document.getElementById('nback-stimulus');
  const phaseLabel   = document.getElementById('nback-phase-label');
  const feedback     = document.getElementById('nback-feedback');
  const countNum     = document.getElementById('countdown-num');
  const curEl        = document.getElementById('nback-current');
  const nEl          = document.getElementById('nback-n-display');
  const nHintEl      = document.getElementById('nback-n-hint');
  const nTipEl       = document.getElementById('nback-tip-n');

  // N값 표시
  nEl.textContent   = String(n);
  nHintEl.textContent = String(n);
  if (nTipEl) nTipEl.textContent = String(n);

  // 나가기 버튼
  document.getElementById('btn-nback-back').onclick = () => {
    game.stop();
    showScreen('home');
  };

  // 응답 버튼 (응답 단계에서만 활성)
  document.getElementById('btn-nback-same').onclick = () => game.respond(true);
  document.getElementById('btn-nback-diff').onclick = () => game.respond(false);

  /* ── 게임 콜백 ── */

  // 자극 표시 단계: 글자 보여주고 버튼 숨김
  game.onShowStimulus = (char) => {
    charEl.textContent = char;
    stimCard.classList.remove('correct', 'wrong');
    feedback.className = 'feedback-bar';
    phaseLabel.textContent = '기억하세요...';

    // 자극 단계 보이기 / 응답 단계 숨기기
    stimPhase.classList.remove('hidden');
    respPhase.classList.add('hidden');
  };

  // 응답 단계: 글자 사라지고 버튼 활성화
  game.onShowResponse = () => {
    stimPhase.classList.add('hidden');
    respPhase.classList.remove('hidden');
  };

  // 진행 카운터
  game.onProgress = (cur) => { curEl.textContent = String(cur); };

  // 피드백 (정답/오답)
  game.onFeedback = (correct) => {
    if (correct === true) {
      feedback.classList.add('correct');
    } else if (correct === false) {
      feedback.classList.add('wrong');
    }
    // 피드백 보여준 후 자극 단계로 복귀 준비
    respPhase.classList.add('hidden');
    stimPhase.classList.remove('hidden');
    phaseLabel.textContent = '다음 글자를 기억하세요...';
  };

  // 완료
  game.onComplete = (result) => {
    GameResults.nback = result;
    const sessions = State.sessions;
    sessions.push({ accuracy: result.accuracy });
    State.nbackLevel = NBackGame.adaptLevel(sessions, State.nbackLevel);
    State.pushSession({ accuracy: result.accuracy, game: 'nback' });
    nextGameAfter('nback');
  };

  /* ── 규칙 설명 → 카운트다운 → 게임 시작 ── */

  // 규칙 화면 표시 (카운트다운, 플레이는 숨김)
  ruleEl.classList.remove('hidden');
  countdownEl.classList.add('hidden');
  nbackPlay.classList.add('hidden');

  document.getElementById('btn-nback-rule-start').onclick = () => {
    // 규칙 숨기고 카운트다운 시작
    ruleEl.classList.add('hidden');
    countdownEl.classList.remove('hidden');

    let count = 3;
    countNum.textContent = String(count);

    const cdInterval = setInterval(() => {
      count--;
      if (count > 0) {
        countNum.textContent = String(count);
      } else if (count === 0) {
        countNum.textContent = '시작!';
      } else {
        clearInterval(cdInterval);
        countdownEl.classList.add('hidden');
        nbackPlay.classList.remove('hidden');
        // 초기 상태: 자극 단계 보이기
        stimPhase.classList.remove('hidden');
        respPhase.classList.add('hidden');
        game.start();
      }
    }, 1000);
  };
}

/* ============================================
   Stroop 화면
   ============================================ */
function initStroop() {
  showScreen('stroop');

  const ruleEl  = document.getElementById('stroop-rule');
  const playEl  = document.getElementById('stroop-play');
  const wordEl  = document.getElementById('stroop-word');
  const scoreEl = document.getElementById('stroop-score');
  const comboEl = document.getElementById('stroop-combo');
  const timerEl = document.getElementById('stroop-timer');

  let game;

  // 나가기
  document.getElementById('btn-stroop-back').onclick = () => {
    if (game) game.stop();
    showScreen('home');
  };

  // 색맹 토글 (간단 구현: 텍스트 패턴 추가)
  let colorblind = false;
  document.getElementById('colorblind-toggle').addEventListener('change', e => {
    colorblind = e.target.checked;
    document.body.classList.toggle('colorblind-mode', colorblind);
  });

  // 준비됐어요 버튼
  document.getElementById('btn-stroop-start').onclick = () => {
    ruleEl.classList.add('hidden');
    playEl.classList.remove('hidden');

    game = new StroopGame({ colorblind });
    game.onShowTrial = ({ word, hex }) => {
      wordEl.textContent  = word;
      wordEl.style.color  = hex;
    };
    game.onScore = (score, combo) => {
      scoreEl.textContent = String(score);
      comboEl.textContent = String(combo);
    };
    game.onTick = (t, urgency) => {
      timerEl.textContent = String(t);
      timerEl.classList.remove('timer-warn', 'timer-danger');
      if (urgency === 'danger')    timerEl.classList.add('timer-danger');
      else if (urgency === 'warn') timerEl.classList.add('timer-warn');
    };
    game.onComplete = (result) => {
      GameResults.stroop = result;
      nextGameAfter('stroop');
    };
    game.start();
  };

  // 색상 버튼 응답
  document.querySelectorAll('.stroop-color-btn').forEach(btn => {
    btn.addEventListener('pointerdown', () => {
      if (game) game.respond(btn.dataset.color);
    });
  });
}

/* ============================================
   Go/No-Go 화면 v2
   ============================================ */
function initGoNoGo() {
  showScreen('gonogo');

  const ruleEl    = document.getElementById('gonogo-rule');
  const playEl    = document.getElementById('gonogo-play');
  const stimEl    = document.getElementById('gonogo-stimulus');
  const arenaEl   = document.getElementById('gonogo-arena');
  const timerEl   = document.getElementById('gonogo-timer');
  const goEl      = document.getElementById('gonogo-go-count');
  const comboEl   = document.getElementById('gonogo-combo');
  const errEl     = document.getElementById('gonogo-errors');
  const screenEl  = document.getElementById('screen-gonogo');
  const comboPopup= document.getElementById('gonogo-combo-popup');

  let game;

  // 나가기
  document.getElementById('btn-gonogo-back').onclick = () => {
    if (game) game.stop();
    showScreen('home');
  };

  // 콤보 팝업 표시 헬퍼
  function showComboPopup(text, color) {
    if (!comboPopup) return;
    comboPopup.textContent = text;
    comboPopup.style.color = color;
    comboPopup.classList.remove('hidden');
    comboPopup.classList.add('combo-pop');
    setTimeout(() => {
      comboPopup.classList.add('hidden');
      comboPopup.classList.remove('combo-pop');
    }, 700);
  }

  // 준비됐어요 버튼
  document.getElementById('btn-gonogo-start').onclick = () => {
    ruleEl.classList.add('hidden');
    playEl.classList.remove('hidden');

    game = new GoNoGoGame();

    // 자극 표시
    game.onShowStimulus = ({ type }) => {
      stimEl.className = `gonogo-stimulus ${type}`;
      stimEl.textContent = type === 'go' ? '●' : '✕';
      stimEl.classList.remove('hidden');
    };
    game.onHideStimulus = () => { stimEl.classList.add('hidden'); };

    // 타이머 — 긴장감 색상 전환
    game.onTick = (t) => {
      timerEl.textContent = String(t);
      timerEl.classList.remove('timer-warn', 'timer-danger');
      if (t <= 10)      timerEl.classList.add('timer-danger');
      else if (t <= 15) timerEl.classList.add('timer-warn');
    };

    // 스탯 업데이트 (goCount, errors, combo)
    game.onStats = (goCount, errors, combo) => {
      goEl.textContent    = String(goCount);
      errEl.textContent   = String(errors);
      comboEl.textContent = String(combo);
      // 콤보 달성 시 팝업
      if (combo >= 3 && combo % 3 === 0) {
        showComboPopup(`🔥 ${combo}연속!`, '#F97316');
      }
    };

    // 오반응 (No-Go 탭)
    game.onCommission = () => {
      screenEl.classList.add('gonogo-flash');
      setTimeout(() => screenEl.classList.remove('gonogo-flash'), 500);
      showComboPopup('❌ 참으세요!', '#EF4444');
    };

    // 늦은 반응 (RTD 초과)
    game.onLateError = () => {
      showComboPopup('⚡ 더 빠르게!', '#7C3AED');
    };

    game.onComplete = (result) => {
      GameResults.gonogo = result;
      nextGameAfter('gonogo');
    };

    game.start();
  };

  // 탭 이벤트 (arena 전체)
  arenaEl.addEventListener('pointerdown', () => {
    if (game) game.tap();
  });
}

/* ============================================
   결과 화면
   ============================================ */
function showResult() {
  showScreen('result');
  updateStreak(); // 전체 완료 → 스트릭 갱신

  const nick = State.nickname;
  document.getElementById('result-title').textContent = `🧠 ${nick}님의 오늘 결과`;

  const nr = GameResults.nback;
  const sr = GameResults.stroop;
  const gr = GameResults.gonogo;

  // 바 차트 (지연 애니메이션)
  setTimeout(() => {
    setBar('bar-memory',  'val-memory',  nr ? nr.accuracy         : 0);
    setBar('bar-speed',   'val-speed',   sr ? sr.speedScore       : 0);
    setBar('bar-inhibit', 'val-inhibit', gr ? gr.inhibitionRate   : 0);
  }, 200);

  // 뇌 나이
  const vals = [
    nr ? nr.accuracy : 0,
    sr ? sr.accuracy : 0,
    gr ? gr.inhibitionRate : 0,
  ].filter(v => v > 0);
  const avgAcc  = vals.length > 0 ? vals.reduce((a,b)=>a+b,0)/vals.length : 50;
  const brainAge = calcBrainAge(avgAcc);
  document.getElementById('result-brain-age').textContent = String(brainAge);

  // AI 메시지
  document.getElementById('ai-message').textContent = getAiMessage(GameResults);

  // 공유
  document.getElementById('btn-copy-link').onclick = () => {
    const text = `오름브래인에서 내 뇌 나이가 ${brainAge}세! 당신도 테스트해보세요 🧠`;
    navigator.clipboard.writeText(text).then(() => alert('링크가 복사되었습니다!'));
  };
  document.getElementById('btn-share-kakao').onclick = () => {
    alert('카카오 공유: 카카오 개발자 앱 키를 연동하면 활성화됩니다.');
  };

  // CTA
  document.getElementById('btn-retry').onclick = () => {
    GameResults.nback = GameResults.stroop = GameResults.gonogo = null;
    initHome();
    showScreen('home');
  };
  document.getElementById('btn-subscribe').onclick = () => {
    window.open('https://your-tistory-blog.tistory.com', '_blank');
  };
}

function setBar(barId, valId, pct) {
  document.getElementById(barId).style.width = pct + '%';
  document.getElementById(valId).textContent = pct + '%';
}

/* ============================================
   앱 진입점
   ============================================ */
(function init() {
  initTheme();      // 다크/라이트 모드 초기화
  initOnboarding();

  // 재방문이면 바로 홈
  if (State.visited) {
    updateStreak();
    initHome();
    showScreen('home');
  }
})();
