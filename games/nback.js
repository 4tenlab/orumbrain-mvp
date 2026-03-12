/* =============================================
   nback.js — N-back 게임 모듈 v2.0
   
   뇌과학 근거:
   - Owen et al. (2005) Nature Reviews Neurosci — 전두-두정엽 활성화
   - Jaeggi et al. (2008) PNAS — 유동성 지능 향상 (훈련 기반)
   - Sprenger et al. (2013) J Cognitive Neurosci — 적응형 N-back 효과
   - fMRI meta (2024) — 전전두피질(PFC) + 두정엽 패턴 변화
   
   v2 변경사항:
   - 타겟 비율 30% → 33% (최적 d' 추구)
   - 자극 표시 2000ms → 1500ms (빠른 업데이트, 긴장감↑)
   - 응답 1000ms → 1500ms (넉넉한 응답 window)
   - 총 시행 20 → 24회 (더 많은 데이터 포인트)
   - 콤보 시스템 (연속 정답 추적)
   - 인터벌 공백(ISI) 300ms (실험적 표준)
   - d' (discriminability) 계산
   ============================================= */

class NBackGame {
  constructor(opts = {}) {
    this.n          = opts.n         || 2;
    this.total      = opts.total     || 24;      // ↑ 20 → 24 (더 많은 데이터)
    this.stimuliMs  = opts.stimuliMs || 1500;    // ↓ 2000 → 1500ms (긴장감)
    this.isiMs      = opts.isiMs     || 300;     // ISI (inter-stimulus interval)
    this.responseMs = opts.responseMs|| 1500;    // 응답 가능 시간

    // 게임 상태
    this.stimuliSeq     = [];
    this.currentIdx     = 0;
    this.responded      = false;
    this.hits           = 0;
    this.misses         = 0;
    this.falseAlarms    = 0;
    this.correctRejects = 0;
    this.combo          = 0;
    this.maxCombo       = 0;
    this.rtList         = [];
    this.stimulusStartTime = 0;

    // UI 콜백
    this.onShowStimulus  = null;  // (char, isTarget, trialNum) => void
    this.onHideStimulus  = null;  // () => void — ISI 기간
    this.onShowResponse  = null;  // () => void
    this.onFeedback      = null;  // (isCorrect, combo) => void
    this.onComplete      = null;  // (result) => void
    this.onProgress      = null;  // (current, total) => void

    this._timer = null;
  }

  /* 자극 시퀀스 생성 — 타겟 비율 33% (0.33) */
  _buildSequence() {
    const syllables = STIMULI.HANGUL;
    const seq = [];
    for (let i = 0; i < this.total; i++) {
      if (i >= this.n && Math.random() < 0.33) {
        // 타겟: N칸 전과 동일
        seq.push(seq[i - this.n]);
      } else {
        // 비타겟: 반드시 N칸 전과 다른 글자
        let ch;
        do {
          ch = syllables[Math.floor(Math.random() * syllables.length)];
        } while (i >= this.n && ch === seq[i - this.n]);
        seq.push(ch);
      }
    }
    return seq;
  }

  /* 게임 시작 */
  start() {
    this.stimuliSeq  = this._buildSequence();
    this.currentIdx  = 0;
    this.hits = this.misses = this.falseAlarms = this.correctRejects = 0;
    this.combo = this.maxCombo = 0;
    this.rtList = [];
    this._runTrial();
  }

  /* 단일 시행 */
  _runTrial() {
    if (this.currentIdx >= this.total) { this._finish(); return; }

    const idx      = this.currentIdx;
    const char     = this.stimuliSeq[idx];
    const isTarget = idx >= this.n && this.stimuliSeq[idx] === this.stimuliSeq[idx - this.n];
    const canRespond = idx >= this.n; // 첫 N개는 응답 없음

    this.responded         = false;
    this.stimulusStartTime = Date.now();

    if (this.onProgress) this.onProgress(idx + 1, this.total);
    if (this.onShowStimulus) this.onShowStimulus(char, isTarget, idx + 1);

    // 자극 표시 → [응답 단계] → ISI → 다음 시행
    this._timer = setTimeout(() => {
      if (canRespond) {
        // 응답 단계
        if (this.onShowResponse) this.onShowResponse();
        this._timer = setTimeout(() => {
          if (!this.responded) {
            // 미응답 처리
            if (isTarget) { this.misses++; this.combo = 0; }
            else          { this.correctRejects++; }
            if (this.onFeedback) this.onFeedback(null, this.combo);
          }
          this._isi();
        }, this.responseMs);
      } else {
        // N 이전: 그냥 ISI로
        this._isi();
      }
    }, this.stimuliMs);
  }

  _isi() {
    if (this.onHideStimulus) this.onHideStimulus();
    this._timer = setTimeout(() => {
      this.currentIdx++;
      this._runTrial();
    }, this.isiMs);
  }

  /* 사용자 응답 */
  respond(answerSame) {
    if (this.responded) return;
    const idx      = this.currentIdx;
    if (idx < this.n) return; // 첫 N개는 응답 불가

    this.responded = true;
    const isTarget = idx >= this.n && this.stimuliSeq[idx] === this.stimuliSeq[idx - this.n];
    const correct  = (answerSame === isTarget);
    const rt       = Date.now() - this.stimulusStartTime;
    this.rtList.push(rt);

    if (correct) {
      if (isTarget) this.hits++;
      else          this.correctRejects++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    } else {
      if (isTarget) this.misses++;
      else          this.falseAlarms++;
      this.combo = 0;
    }

    if (this.onFeedback) this.onFeedback(correct, this.combo);
  }

  stop() { clearTimeout(this._timer); }

  /* 결과 계산 + d' */
  _finish() {
    const total    = this.hits + this.misses + this.falseAlarms + this.correctRejects;
    const accuracy = total > 0 ? Math.round((this.hits + this.correctRejects) / total * 100) : 0;
    const hitRate  = (this.hits + this.misses) > 0
      ? this.hits / (this.hits + this.misses) : 0;
    const faRate   = (this.falseAlarms + this.correctRejects) > 0
      ? this.falseAlarms / (this.falseAlarms + this.correctRejects) : 0;
    const avgRT    = this.rtList.length > 0
      ? Math.round(this.rtList.reduce((a, b) => a + b, 0) / this.rtList.length) : 0;

    const result = {
      accuracy,
      hitRate:     Math.round(hitRate * 100),
      faRate:      Math.round(faRate * 100),
      falseAlarms: this.falseAlarms,
      misses:      this.misses,
      avgRT,
      maxCombo:    this.maxCombo,
      nLevel:      this.n,
      dPrime:      this._dPrime(hitRate, faRate),
    };

    if (this.onComplete) this.onComplete(result);
  }

  /* d' = Z(hit) - Z(FA) — 신호검출이론 */
  _dPrime(hr, far) {
    const z = p => {
      const pp = Math.max(0.01, Math.min(0.99, p));
      const a = [2.515517, 0.802853, 0.010328];
      const b = [1.432788, 0.189269, 0.001308];
      const t = Math.sqrt(-2 * Math.log(pp < 0.5 ? pp : 1 - pp));
      const val = t - (a[0] + a[1]*t + a[2]*t*t) / (1 + b[0]*t + b[1]*t*t + b[2]*t*t*t);
      return pp < 0.5 ? -val : val;
    };
    return Math.round((z(hr) - z(far)) * 100) / 100;
  }

  /* 난이도 적응 (3세션 평균, 기준 정확도 조정) */
  static adaptLevel(sessions, currentN) {
    if (sessions.length < 3) return currentN;
    const recent = sessions.slice(-3).map(s => s.accuracy);
    const avg    = recent.reduce((a, b) => a + b, 0) / 3;
    if (avg >= 82 && currentN < 5) return currentN + 1;
    if (avg <  55 && currentN > 1) return currentN - 1;
    return currentN;
  }
}
