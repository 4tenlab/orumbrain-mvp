# 🧠 OrumBrain MVP

뇌과학 기반 인지훈련 웹앱 — Tistory 블로그 iframe 임베드용

## 기술 스택

- **HTML5 / Vanilla JS / CSS3** (Zero Dependencies)
- **localStorage** 기반 상태관리
- **GitHub Pages** 호스팅

## 게임 3종

| 게임 | 훈련 목표 | 근거 논문 |
|------|----------|-----------|
| 🔵 N-back | 작업기억 | Owen et al. (2005) |
| 🟡 Stroop | 인지 억제 | Nature Neurosci. (2023) |
| 🟢 Go/No-Go | 반응 억제 | PMC (2012) |

## 파일 구조

```
orumbrain-mvp/
├── index.html          ← SPA 진입점
├── style.css           ← 전체 스타일 (CSS 변수 디자인 토큰)
├── app.js              ← SPA 라우터 + 상태관리
├── games/
│   ├── nback.js        ← N-back 게임 모듈
│   ├── stroop.js       ← Stroop 게임 모듈
│   └── gonogo.js       ← Go/No-Go 게임 모듈
└── data/
    └── stimuli.js      ← 한글 자극 데이터 + 뇌과학 팁
```

## 로컬 실행

별도 서버 불필요. `index.html` 파일을 브라우저에서 바로 열거나:

```bash
# Python 3 간이 서버
python -m http.server 8080
# 이후 http://localhost:8080 접속
```

## Tistory 임베드 코드

배포 후 아래 코드를 Tistory 포스트 HTML 편집 모드에 붙여넣기:

```html
<iframe
  src="https://[USERNAME].github.io/orumbrain-mvp/"
  width="100%"
  height="720"
  frameborder="0"
  scrolling="no"
  style="border-radius:16px; max-width:480px; display:block; margin:0 auto;">
</iframe>
```

## ⚠️ 법적 고지

이 앱은 과학적 흥미를 위한 콘텐츠이며, 의료기기 또는 치료 목적이 아닙니다.
