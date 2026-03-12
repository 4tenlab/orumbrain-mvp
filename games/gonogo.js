/* =============================================
   gonogo.js — Go/No-Go 게임 모듈 v2.0
   
   뇌과학 근거:
   - PMC 2012 — 우측 하전두이랑(rIFG) 억제 회로
   - NIH 2024 — No-Go 비율 30%, RTD 600ms 최적 난이도 설계
   - SART (Robertson et al., 1997) — 지속주의력 측정 패러다임
   
   v2 변경사항:
   - No-Go 비율 25% → 30% (억제 부담 증가)
   - 자극 표시 시간 700→500ms / No-Go 900→700ms
   - 반응 마감 데드라인(RTD) 600ms — 늦은 반응도 오반응 처리
   - 게임 후반부(30초~) No-Go 비율 자동 상승 (35%)
   - 연속 성공 콤보 시스템
   ============================================= */

class GoNoGoGame {
  constructor(opts = {}) {
    this.duration    = opts.duration    || 60;    // 게임 시간 (초)
    this.nogoRatio   = opts.nogoRatio   || 0.30;  // No-Go 비율 30% (↑ from 25%)

    // 게임 상태
    this.timeLeft         = this.duration;
    this.goCount          = 0;    // Go 성공 횟수
    this.nogoSuccess      = 0;    // No-Go 억제 성공
    this.nogoTotal        = 0;    // No-Go 총 시행
    this.commissionErrors = 0;    // 오반응 (No-Go 탭)
    this.omissionErrors   = 0;    // 누락 (Go 미탭)
    this.lateErrors       = 0;    // RTD 초과 늦은 반응
    this.goRTs            = [];   // Go 반응시간 목록
    this.combo            = 0;    // 연속 성공 콤보
    this.maxCombo         = 0;
    this.currentStimulus  = null;
    this.stimulusStart    = 0;

    // UI 콜백
    this.onShowStimulus   = null; // ({type: 'go'|'nogo'}) => void
    this.onHideStimulus   = null; // () => void
    this.onTick           = null; // (timeLeft) => void  → 긴장감용 색상 전환
    this.onCommission     = null; // () => void — 오반응 피드백
    this.onLateError      = null; // () => void — RTD 초과 피드백
    this.onStats          = null; // (goCount, errors, combo) => void
    this.onComplete       = null; // (result) => void

    this._timerInterval   = null;
    this._stimulusTimeout = null;
    this._rtdTimeout      = null;  // 반응 마감 데드라인 타이머
    this._visible         = false;
  }

  /* 게임 시작 */
  start() {
    this.timeLeft = this.duration;
    this.goCount = this.nogoSuccess = this.nogoTotal = 0;
    this.commissionErrors = this.omissionErrors = this.lateErrors = 0;
    this.goRTs = [];
    this.combo = this.maxCombo = 0;
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
        clearTimeout(this._rtdTimeout);
        this._hideStimulus();
        this._finish();
      }
    }, 1000);
  }

  _scheduleNextStimulus() {
    if (this.timeLeft <= 0) return;
    // 400ms ~ 1400ms 짧은 랜덤 인터벌 (↑ 긴장감 — 이전 600~2000ms)
    const minDelay  = 400;
    const maxDelay  = 1400;
    const delay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
    this._stimulusTimeout = setTimeout(() => {
      this._showStimulus();
    }, delay);
  }

  _showStimulus() {
    if (this.timeLeft <= 0) return;

    // 후반부(30초 이후) No-Go 비율 자동 상승: 30% → 35%
    const elapsed   = this.duration - this.timeLeft;
    const nogoProb  = elapsed >= 30 ? 0.35 : this.nogoRatio;
    const isNogo    = Math.random() < nogoProb;

    this.currentStimulus = isNogo ? 'nogo' : 'go';
    this.stimulusStart   = Date.now();
    this._visible        = true;
    if (isNogo) this.nogoTotal++;

    if (this.onShowStimulus) this.onShowStimulus({ type: this.currentStimulus });

    // 자극 표시 시간: Go=500ms, No-Go=700ms (↓ from 700/900ms — 더 빠름)
    const displayDur = isNogo ? 700 : 500;

    this._stimulusTimeout = setTimeout(() => {
      if (this._visible) {
        if (this.currentStimulus === 'go') {
          // Go인데 반응 안 함 → 누락 오류
          this.omissionErrors++;
          this.combo = 0;
          if (this.onStats) this.onStats(this.goCount, this.commissionErrors, this.combo);
        } else {
          // No-Go 탭 안 함 → 억제 성공!
          this.nogoSuccess++;
          this.combo++;
          if (this.combo > this.maxCombo) this.maxCombo = this.combo;
          if (this.onStats) this.onStats(this.goCount, this.commissionErrors, this.combo);
        }
        this._hideStimulus();
        this._scheduleNextStimulus();
      }
    }, displayDur);

    // RTD(반응 마감 데드라인): Go 자극에서 600ms 이내 미반응 → 늦은 반응 처리
    if (!isNogo) {
      clearTimeout(this._rtdTimeout);
      this._rtdTimeout = setTimeout(() => {
        if (this._visible && this.currentStimulus === 'go') {
          // 이 시점은 displayDur(500ms) 이후라 _stimulusTimeout이 먼저 처리하지만
          // 혹시 타이밍 경합 방지용으로 유지
        }
      }, 600);
    }
  }

  _hideStimulus() {
    this._visible = false;
    this.currentStimulus = null;
    if (this.onHideStimulus) this.onHideStimulus();
  }

  /* 사용자 탭 처리 (pointerdown 사용) */
  tap() {
    if (!this._visible || this.timeLeft <= 0) return;

    const rt = Date.now() - this.stimulusStart;

    if (this.currentStimulus === 'go') {
      // RTD 체크: 500ms(표시) 이후 탭은 늦은 반응
      if (rt > 600) {
        this.lateErrors++;
        this.combo = 0;
        if (this.onLateError) this.onLateError();
      } else {
        this.goCount++;
        this.goRTs.push(rt);
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      }
      if (this.onStats) this.onStats(this.goCount, this.commissionErrors, this.combo);

    } else {
      // No-Go 탭 → 오반응!
      this.commissionErrors++;
      this.combo = 0;
      if (this.onCommission) this.onCommission();
      if (this.onStats) this.onStats(this.goCount, this.commissionErrors, this.combo);
    }

    clearTimeout(this._stimulusTimeout);
    clearTimeout(this._rtdTimeout);
    this._hideStimulus();
    this._scheduleNextStimulus();
  }

  /* 강제 종료 */
  stop() {
    clearInterval(this._timerInterval);
    clearTimeout(this._stimulusTimeout);
    clearTimeout(this._rtdTimeout);
  }

  /* 결과 계산 */
  _finish() {
    const inhibitionRate = this.nogoTotal > 0
      ? Math.round(this.nogoSuccess / this.nogoTotal * 100)
      : 100;

    const avgGoRT = this.goRTs.length > 0
      ? Math.round(this.goRTs.reduce((a, b) => a + b, 0) / this.goRTs.length)
      : 0;

    // 속도 점수: 평균 RT가 낮을수록 높음 (250ms 기준)
    const speedScore = avgGoRT > 0
      ? Math.max(0, Math.min(100, Math.round((600 - avgGoRT) / 4)))
      : 0;

    const result = {
      inhibitionRate,       // % — '억제정확도'
      avgGoRT,              // ms
      speedScore,           // 속도 점수 0~100
      goCount:              this.goCount,
      commissionErrors:     this.commissionErrors,
      omissionErrors:       this.omissionErrors,
      lateErrors:           this.lateErrors,
      maxCombo:             this.maxCombo,
      // 뇌과학 논문 정확도 척도
      dPrime: this._calcDPrime(),
    };

    if (this.onComplete) this.onComplete(result);
  }

  /* d' (discriminability index) 계산 — signal detection theory */
  _calcDPrime() {
    const totalGo   = this.goCount + this.omissionErrors || 1;
    const hitRate   = Math.max(0.01, Math.min(0.99, this.goCount / totalGo));
    const faRate    = this.nogoTotal > 0
      ? Math.max(0.01, Math.min(0.99, this.commissionErrors / this.nogoTotal))
      : 0.01;
    // d' = Z(hit) - Z(FA) — 정규분포 역함수 간이 근사
    const zHit = this._zScore(hitRate);
    const zFA  = this._zScore(faRate);
    return Math.round((zHit - zFA) * 100) / 100;
  }

  _zScore(p) {
    // Beasley-Springer-Moro algorithm 근사
    const a = [2.515517, 0.802853, 0.010328];
    const b = [1.432788, 0.189269, 0.001308];
    const t = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
    const num = a[0] + a[1]*t + a[2]*t*t;
    const den = 1 + b[0]*t + b[1]*t*t + b[2]*t*t*t;
    const z = t - num/den;
    return p < 0.5 ? -z : z;
  }
}
