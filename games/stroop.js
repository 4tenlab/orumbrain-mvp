/* =============================================
   stroop.js — Stroop Effect 게임 모듈
   뇌과학 근거: Nature Neurosci. 2023 — lPFC-소뇌 억제 루프
   ============================================= */

class StroopGame {
  constructor(opts = {}) {
    this.duration   = opts.duration   || 45;   // 게임 제한 시간 (초)
    this.colorblind = opts.colorblind || false;

    // 게임 상태
    this.score       = 0;
    this.combo       = 0;
    this.maxCombo    = 0;
    this.timeLeft    = this.duration;
    this.correct     = 0;
    this.wrong       = 0;
    this.congruentRTs   = [];
    this.incongruentRTs = [];
    this.currentTrial   = null;
    this.trialStart     = 0;

    // UI 콜백
    this.onShowTrial  = null;  // ({word, color, hex, congruent}) => void
    this.onTick       = null;  // (timeLeft) => void
    this.onScore      = null;  // (score, combo) => void
    this.onComplete   = null;  // (result) => void

    this._interval = null;
  }

  /* 새 시행 생성 */
  _buildTrial(forceIncongruent = false) {
    const words = STIMULI.COLOR_WORDS;
    const wordIdx  = Math.floor(Math.random() * words.length);
    let   colorIdx = Math.floor(Math.random() * words.length);

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
    // 후반부(1/3 지남) 이후 불일치 비율 80%
    const elapsed  = this.duration - this.timeLeft;
    const halfTime = Math.floor(this.duration / 3);
    const incon    = elapsed > halfTime ? Math.random() < 0.8 : Math.random() < 0.5;
    this.currentTrial  = this._buildTrial(incon);
    this.trialStart    = Date.now();
    if (this.onShowTrial) this.onShowTrial(this.currentTrial);
  }

  _startTimer() {
    this._interval = setInterval(() => {
      this.timeLeft--;
      if (this.onTick) this.onTick(this.timeLeft);
      if (this.timeLeft <= 0) {
        clearInterval(this._interval);
        this._finish();
      }
    }, 1000);
  }

  /* 사용자 응답 */
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
      this.score++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.correct++;
    } else {
      this.combo = 0;
      this.wrong++;
    }

    if (this.onScore) this.onScore(this.score, this.combo, correct);
    this._nextTrial();
  }

  /* 강제 종료 */
  stop() { clearInterval(this._interval); }

  /* 결과 계산 */
  _finish() {
    const avg = arr => arr.length
      ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
      : 0;

    const avgCon = avg(this.congruentRTs);
    const avgInc = avg(this.incongruentRTs);
    const interferenceScore = avgInc - avgCon; // 클수록 간섭 강함

    const accuracy = (this.correct + this.wrong) > 0
      ? Math.round(this.correct / (this.correct + this.wrong) * 100)
      : 0;

    // 억제속도 점수: 간섭이 작을수록 높음 (0~100점 환산)
    const speedScore = Math.max(0, Math.min(100,
      100 - Math.round(interferenceScore / 10)
    ));

    const result = {
      score:            this.score,
      correct:          this.correct,
      accuracy,
      maxCombo:         this.maxCombo,
      interferenceScore,
      speedScore,       // % 형태로 결과 화면에 사용
    };

    if (this.onComplete) this.onComplete(result);
  }
}
