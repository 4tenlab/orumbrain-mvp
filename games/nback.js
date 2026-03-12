/* =============================================
   nback.js — N-back 게임 모듈
   뇌과학 근거: Owen et al. (2005) — 전두-두정엽 활성화
   ============================================= */

class NBackGame {
  constructor(opts = {}) {
    this.n         = opts.n         || 2;       // N-back 레벨
    this.total     = opts.total     || 20;      // 총 시행 횟수
    this.stimuliMs = opts.stimuliMs || 2000;    // 자극 표시 시간 ms
    this.responseMs= opts.responseMs|| 1000;    // 응답 대기 시간 ms

    // 게임 상태
    this.stimuliSeq  = [];   // 자극 배열
    this.currentIdx  = 0;    // 현재 시행 인덱스
    this.responded   = false;
    this.hits        = 0;
    this.misses      = 0;
    this.falseAlarms = 0;
    this.correctRejects = 0;
    this.rtList      = [];   // 반응시간 목록 (ms)
    this.stimulusStartTime = 0;

    // UI 콜백
    this.onShowStimulus  = null;  // (char, isTarget) => void
    this.onShowResponse  = null;  // () => void
    this.onFeedback      = null;  // (isCorrect) => void
    this.onComplete      = null;  // (result) => void
    this.onProgress      = null;  // (current, total) => void

    this._timer = null;
  }

  /* 자극 시퀀스 생성 */
  _buildSequence() {
    const syllables = STIMULI.HANGUL;
    const seq = [];
    for (let i = 0; i < this.total; i++) {
      // 앞 n개 이후부터 30% 확률로 target
      if (i >= this.n && Math.random() < 0.3) {
        seq.push(seq[i - this.n]);
      } else {
        let ch;
        do { ch = syllables[Math.floor(Math.random() * syllables.length)]; }
        while (i >= this.n && ch === seq[i - this.n]);
        seq.push(ch);
      }
    }
    return seq;
  }

  /* 게임 시작 */
  start() {
    this.stimuliSeq = this._buildSequence();
    this.currentIdx = 0;
    this.hits = this.misses = this.falseAlarms = this.correctRejects = 0;
    this.rtList = [];
    this._runTrial();
  }

  /* 단일 시행 */
  _runTrial() {
    if (this.currentIdx >= this.total) { this._finish(); return; }

    const idx       = this.currentIdx;
    const char      = this.stimuliSeq[idx];
    const isTarget  = idx >= this.n && this.stimuliSeq[idx] === this.stimuliSeq[idx - this.n];

    this.responded          = false;
    this.stimulusStartTime  = Date.now();

    if (this.onProgress) this.onProgress(idx + 1, this.total);
    if (this.onShowStimulus) this.onShowStimulus(char, isTarget);

    this._timer = setTimeout(() => {
      if (this.onShowResponse) this.onShowResponse();
      this._timer = setTimeout(() => {
        // 응답 안 함 처리
        if (!this.responded) {
          if (isTarget) this.misses++;
          else          this.correctRejects++;
          if (this.onFeedback) this.onFeedback(null); // 미응답
        }
        this.currentIdx++;
        this._runTrial();
      }, this.responseMs);
    }, this.stimuliMs);
  }

  /* 사용자 응답 처리 */
  respond(answerSame) {
    if (this.responded) return;
    this.responded = true;

    const idx      = this.currentIdx;
    const isTarget = idx >= this.n && this.stimuliSeq[idx] === this.stimuliSeq[idx - this.n];
    const correct  = (answerSame === isTarget);
    const rt       = Date.now() - this.stimulusStartTime;
    this.rtList.push(rt);

    if (correct) {
      if (isTarget) this.hits++;
      else          this.correctRejects++;
    } else {
      if (isTarget) this.misses++;
      else          this.falseAlarms++;
    }

    if (this.onFeedback) this.onFeedback(correct);
  }

  /* 강제 종료 */
  stop() {
    clearTimeout(this._timer);
  }

  /* 결과 계산 */
  _finish() {
    const total    = this.hits + this.misses + this.falseAlarms + this.correctRejects;
    const accuracy = total > 0 ? (this.hits + this.correctRejects) / total : 0;
    const hitRate  = (this.hits + this.misses) > 0
      ? this.hits / (this.hits + this.misses) : 0;
    const avgRT    = this.rtList.length > 0
      ? Math.round(this.rtList.reduce((a, b) => a + b, 0) / this.rtList.length) : 0;

    const result = {
      accuracy:    Math.round(accuracy * 100),  // %
      hitRate:     Math.round(hitRate * 100),   // %
      falseAlarms: this.falseAlarms,
      avgRT,
      nLevel:      this.n,
    };

    if (this.onComplete) this.onComplete(result);
  }

  /* 난이도 적응 (3세션 평균 기반) */
  static adaptLevel(sessions, currentN) {
    if (sessions.length < 3) return currentN;
    const recent = sessions.slice(-3).map(s => s.accuracy);
    const avg    = recent.reduce((a, b) => a + b, 0) / 3;
    if (avg >= 80 && currentN < 5) return currentN + 1;
    if (avg <  58 && currentN > 1) return currentN - 1;
    return currentN;
  }
}
