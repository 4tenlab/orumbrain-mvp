/* =============================================
   stimuli.js — 한글 자극 데이터
   ============================================= */

const STIMULI = {
  // N-back 한글 음절 자극
  HANGUL: ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차'],

  // Stroop 색상어 & HEX
  COLOR_WORDS: ['빨강', '파랑', '노랑', '초록'],
  COLOR_HEX: {
    '빨강': '#EF4444',
    '파랑': '#3B82F6',
    '노랑': '#F59E0B',
    '초록': '#10B981',
  },

  // 뇌과학 팁 (5개 논문 기반)
  BRAIN_TIPS: [
    'N-back 훈련은 전두-두정엽 네트워크를 활성화합니다.\n(Owen et al., 2005, Nature Reviews Neuroscience)',
    'Stroop 과제는 lPFC-소뇌 억제 루프를 강화합니다.\n(Nature Neuroscience, 2023)',
    'Go/No-Go 훈련은 우측 하전두이랑(rIFG) 억제 회로를 발달시킵니다.\n(PMC, 2012)',
    '인지 훈련을 꾸준히 지속하면 작업기억 용량이 향상됩니다.\n(Jaeggi et al., 2008, PNAS)',
    '규칙적인 뇌 훈련은 집행 기능 유지에 도움이 될 수 있습니다.\n(Lampit et al., 2019, npj Digital Medicine)',
  ],

  // AI 코멘트 템플릿
  AI_MESSAGES: {
    highMemory:   '작업기억이 탁월해요! N-back 레벨을 한 단계 올려볼까요? 🎯',
    lowMemory:    '작업기억 훈련을 더 해봐요. 2-back부터 꾸준히 시작해보세요! 💪',
    highInhibit:  'Stroop 억제 속도가 인상적이에요! 불일치 비율을 높여보세요 🔥',
    lowInhibit:   '색상 억제 훈련이 필요해요. 천천히, 규칙에 집중해서 다시 도전! 🧘',
    highGonogo:   'Go/No-Go 억제 정확도가 훌륭해요! 반응 속도도 챙겨보세요 ⚡',
    lowGonogo:    '충동 억제 훈련이 도움이 될 것 같아요. 빨간 X는 꼭 참기! 🛑',
    allGood:      '세 가지 훈련 모두 잘 하셨어요! 내일도 연속 훈련 도전해보세요 🧠',
    firstTime:    '첫 훈련 완료! 뇌과학 기반 인지 훈련을 시작한 것만으로도 훌륭해요 🎉',
  },
};
