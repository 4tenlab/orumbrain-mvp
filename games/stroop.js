/* =============================================
   stroop.js — Stroop Effect 게임 모듈 v2.0
   
   뇌과학 근거:
   - MacLeod (1991) Psychol Bull — Stroop 효과 리뷰 고전
   - Kerns et al. (2004) Science — ACC-PFC 갈등 감지 루프
   - NIH 2023 — ISI 최적화: 750ms 자극 / 1500~2500ms 인터벌
   - 색-단어 불일치 비율: 초반 50% → 후반 75% 단계적 상승
   
   v2 변경사항:
   - 불일치(Incongruent) 비율: 후반부 80% → 75% (최적 어려움)
   - 타이머 긴장감: onTick에 urgency 레벨 전달
   - 콤보 x배율 점수 시스템 (동기부여)
   - 반응시간 기록 강화 (congruent / incongruent 분리)
   - Stroop 효과 점수 계산 개선
   ============================================= */

class StroopGame {
  constructor(opts = {}) {
    this.duration   = opts.duration   || 45;
    this.colorblind = opts.colorblind || false;

    this.score          = 0;
    this.combo          = 0;
    this.maxCombo       = 0;
    this.timeLeft       = this.duration;
    this.correct        = 0;
    this.wrong          = 0;
    this.congruentRTs   = [];
    this.incongruentRTs = [];
    this.currentTrial   = null;
    this.trialStart     = 0;

    // UI 콜백
    this.onShowTrial  = null;  // (trial) => void
    this.onTick       = null;  // (timeLeft, urgency:'normal'|'warn'|'danger') => void
    this.onScore      = null;  // (score, combo, correct) => void
    this.onComplete   = null;  // (result) => void
    this.onFeedback   = null;  // (correct) => void — 즉각 피드백용

    this._interval = null;
  }

  /* 시행 생성 */
  _buildTrial(forceIncongruent = false) {
    const words = STIMULI.COLOR_WORDS;
    const wordIdx   = Math.floor(Math.random() * words.length);
    let   colorIdx  = Math.floor(Math.random() * words.length);

    if (forceIncongruent) {
      while (colorIdx === wordIdx) {
        colorIdx = Math.floor(Math.random() * words.length);
      }
    }

    const congruent = wordIdx === colorIdx;
    return {
      word:      words[wordIdx],
      colorWord: words[colorIdx],
      hex:       STIMULI.COLOR_HEX[words[colorIdx]],
      congruent,
    };
  }

  /* 게임 시작 */
  start() {
    this.score = this.combo = this.maxCombo = 0;
    this.correct = this.wrong = 0;
    this.timeLeft = this.duration;
    this.congruentRTs = [];
    this.incongruentRTs = [];

    this._nextTrial();
    this._startTimer();
  }

  _nextTrial() {
    // 불일치 비율: 초반 50% → 후반(15초~) 70% → 막판(10초~) 75%
    const elapsed = this.duration - this.timeLeft;
    let inconProb;
    if (elapsed < 15)       inconProb = 0.50;  // 초반: 완만
    else if (elapsed < 30)  inconProb = 0.70;  // 중반: 상승
    else                    inconProb = 0.75;  // 후반: 강도 높음

    this.currentTrial = this._buildTrial(Math.random() < inconProb);
    this.trialStart   = Date.now();
    if (this.onShowTrial) this.onShowTrial(this.currentTrial);
  }

  _startTimer() {
    this._interval = setInterval(() => {
      this.timeLeft--;
      // 긴장감 레벨 전달
      let urgency = 'normal';
      if (this.timeLeft <= 10)      urgency = 'danger';
      else if (this.timeLeft <= 15) urgency = 'warn';

      if (this.onTick) this.onTick(this.timeLeft, urgency);
      if (this.timeLeft <= 0) {
        clearInterval(this._interval);
        this._finish();
      }
    }, 1000);
  }

  /* 응답 처리 */
  respond(selectedColorWord) {
    if (!this.currentTrial || this.timeLeft <= 0) return;

    const rt      = Date.now() - this.trialStart;
    const correct = selectedColorWord === this.currentTrial.colorWord;

    if (this.currentTrial.congruent) {
      this.congruentRTs.push(rt);
    } else {
      this.incongruentRTs.push(rt);
    }

    if (correct) {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.correct++;
      // 콤보 배율 점수 (1연속=1점, 5연속=2점, 10연속=3점)
      const bonus = this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
      this.score += bonus;
    } else {
      this.combo = 0;
      this.wrong++;
    }

    if (this.onFeedback) this.onFeedback(correct);
    if (this.onScore) this.onScore(this.score, this.combo, correct);
    this._nextTrial();
  }

  stop() { clearInterval(this._interval); }

  /* 결과 계산 */
  _finish() {
    const avg = arr => arr.length
      ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    const avgCon  = avg(this.congruentRTs);
    const avgInc  = avg(this.incongruentRTs);
    // Stroop 효과 = 불일치 - 일치 RT 차이 (신경과학적 핵심 지표)
    const strokeEffect = avgInc > 0 && avgCon > 0 ? avgInc - avgCon : 0;

    const accuracy = (this.correct + this.wrong) > 0
      ? Math.round(this.correct / (this.correct + this.wrong) * 100) : 0;

    // 억제속도 점수: 간섭 적을수록 높음 (ms 간섭 → 0~100 환산)
    const speedScore = Math.max(0, Math.min(100,
      100 - Math.round(Math.max(0, strokeEffect) / 8)
    ));

    const result = {
      score:         this.score,
      correct:       this.correct,
      accuracy,
      maxCombo:      this.maxCombo,
      strokeEffect,  // ms — Stroop 간섭 지표
      speedScore,
      avgConRT:      avgCon,
      avgIncRT:      avgInc,
    };

    if (this.onComplete) this.onComplete(result);
  }
}
