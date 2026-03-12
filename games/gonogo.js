/* =============================================
   gonogo.js — Go/No-Go 게임 모듈
   뇌과학 근거: PMC 2012 — 우측 하전두이랑(rIFG) 억제 회로
   ============================================= */

class GoNoGoGame {
  constructor(opts = {}) {
    this.duration   = opts.duration   || 60;   // 게임 시간 (초)
    this.nogoRatio  = opts.nogoRatio  || 0.25; // No-Go 비율

    // 게임 상태
    this.timeLeft    = this.duration;
    this.goCount     = 0;   // Go 성공 횟수
    this.nogoSuccess = 0;   // No-Go 억제 성공
    this.nogoTotal   = 0;   // No-Go 총 시행
    this.commissionErrors = 0;  // 오반응 (No-Go 탭)
    this.omissionErrors   = 0;  // 누락 (Go 미탭)
    this.goRTs       = [];
    this.currentStimulus = null;
    this.stimulusStart   = 0;

    // UI 콜백
    this.onShowStimulus  = null;  // ({type: 'go'|'nogo'}) => void
    this.onHideStimulus  = null;  // () => void
    this.onTick          = null;  // (timeLeft) => void
    this.onCommission    = null;  // () => void  — 오반응 피드백
    this.onStats         = null;  // (goCount, errors) => void
    this.onComplete      = null;  // (result) => void

    this._timerInterval  = null;
    this._stimulusTimeout = null;
    this._visible = false;
  }

  /* 게임 시작 */
  start() {
    this.timeLeft = this.duration;
    this.goCount = this.nogoSuccess = this.nogoTotal = 0;
    this.commissionErrors = this.omissionErrors = 0;
    this.goRTs = [];
    this._startTimer();
    this._scheduleNextStimulus();
  }

  _startTimer() {
    this._timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.onTick) this.onTick(this.timeLeft);
      if (this.timeLeft <= 0) {
        clearInterval(this._timerInterval);
        clearTimeout(this._stimulusTimeout);
        this._hideStimulus();
        this._finish();
      }
    }, 1000);
  }

  _scheduleNextStimulus() {
    if (this.timeLeft <= 0) return;
    // 600ms ~ 2000ms 랜덤 인터벌
    const delay = 600 + Math.floor(Math.random() * 1400);
    this._stimulusTimeout = setTimeout(() => {
      this._showStimulus();
    }, delay);
  }

  _showStimulus() {
    if (this.timeLeft <= 0) return;
    const isNogo = Math.random() < this.nogoRatio;
    this.currentStimulus = isNogo ? 'nogo' : 'go';
    this.stimulusStart   = Date.now();
    this._visible        = true;
    if (isNogo) this.nogoTotal++;

    if (this.onShowStimulus) this.onShowStimulus({ type: this.currentStimulus });

    // 자극 표시 시간: Go=700ms, No-Go=900ms 후 자동 숨김
    const displayDur = isNogo ? 900 : 700;
    this._stimulusTimeout = setTimeout(() => {
      if (this._visible) {
        // 응답 없이 사라진 경우
        if (this.currentStimulus === 'go') this.omissionErrors++;
        else                                this.nogoSuccess++;
        this._hideStimulus();
        this._scheduleNextStimulus();
      }
    }, displayDur);
  }

  _hideStimulus() {
    this._visible = false;
    this.currentStimulus = null;
    if (this.onHideStimulus) this.onHideStimulus();
  }

  /* 사용자 탭 처리 (pointerdown 사용 권장) */
  tap() {
    if (!this._visible || this.timeLeft <= 0) return;

    const rt = Date.now() - this.stimulusStart;

    if (this.currentStimulus === 'go') {
      this.goCount++;
      this.goRTs.push(rt);
      if (this.onStats) this.onStats(this.goCount, this.commissionErrors);
    } else {
      // No-Go 탭 → 오반응
      this.commissionErrors++;
      if (this.onCommission) this.onCommission();
      if (this.onStats) this.onStats(this.goCount, this.commissionErrors);
    }

    clearTimeout(this._stimulusTimeout);
    this._hideStimulus();
    this._scheduleNextStimulus();
  }

  /* 강제 종료 */
  stop() {
    clearInterval(this._timerInterval);
    clearTimeout(this._stimulusTimeout);
  }

  /* 결과 계산 */
  _finish() {
    const inhibitionRate = this.nogoTotal > 0
      ? Math.round(this.nogoSuccess / this.nogoTotal * 100)
      : 100;

    const avgGoRT = this.goRTs.length > 0
      ? Math.round(this.goRTs.reduce((a, b) => a + b, 0) / this.goRTs.length)
      : 0;

    const result = {
      inhibitionRate,   // % — 결과 화면 '억제정확도'
      avgGoRT,          // ms
      goCount:          this.goCount,
      commissionErrors: this.commissionErrors,
      omissionErrors:   this.omissionErrors,
    };

    if (this.onComplete) this.onComplete(result);
  }
}
