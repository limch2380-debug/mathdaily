# 📐 MathDaily — AI 수학 학습지

매일 맞춤형 수학 문제를 풀어보는 학습 앱입니다.

## ✨ 주요 기능

- **📝 일일 수학 학습지** — 학년/학교급별 맞춤 문제 10문제 자동 생성
- **🎯 4지선다 객관식** — 직관적인 4지선다 보기 + 정답 확인 2단계 UI
- **📊 난이도 조절** — 쉬움/보통/어려움 3단계 난이도 혼합
- **🔄 다시 풀기** — 틀린 문제만 모아서 복습
- **🤖 AI 유사 문제** — 틀린 문제와 비슷한 새 문제 자동 생성 (Python 백엔드 필요)
- **📈 학습 통계** — 달력 기반 학습 기록 & 점수 추이
- **📚 SVG 시각화** — 수직선, 도형, 좌표평면 등 시각적 문제 표시

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| **프론트엔드** | Next.js 16, React 19, TypeScript |
| **스타일링** | CSS (globals.css, Styled JSX) |
| **문제 생성** | 로컬 problemBank + Python FastAPI + OpenAI GPT |
| **배포** | Vercel (프론트) |

## 🚀 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저에서 열기
# http://localhost:3000
```

### AI 문제 생성 (선택사항)

```bash
# Python 백엔드 실행 (별도 터미널)
cd server
pip install -r requirements.txt
python main.py
```

`server/.env`에 OpenAI API 키 설정 필요:
```
OPENAI_API_KEY=sk-your-key-here
```

## 📁 프로젝트 구조

```
newhack/
├── src/
│   ├── app/
│   │   ├── page.tsx          # 메인 페이지 (대시보드 + 학습지)
│   │   ├── layout.tsx        # 레이아웃
│   │   └── globals.css       # 글로벌 스타일
│   ├── components/
│   │   ├── WorksheetView.tsx  # 학습지 UI (객관식 + 채점)
│   │   └── LoadingOverlay.tsx # 로딩 화면
│   └── lib/
│       ├── problemBank.ts    # 로컬 문제 은행
│       ├── types.ts          # 타입 정의
│       └── api.ts            # API 통신
├── server/                   # Python FastAPI 백엔드
│   ├── main.py
│   ├── ai_engine.py
│   └── curriculum_data.py
├── package.json
└── README.md
```

## 🌐 배포 (Vercel)

1. GitHub에 코드 Push
2. [Vercel](https://vercel.com)에서 GitHub 저장소 Import
3. Framework Preset: **Next.js** (자동 감지)
4. 배포 완료 → 이후 push 시 자동 업데이트

> ⚠️ Python 백엔드는 Vercel에서 동작하지 않습니다. AI 문제 생성 기능이 필요하면 [Railway](https://railway.app) 또는 [Render](https://render.com)에 별도 배포하세요.

## 📜 라이선스

MIT License
