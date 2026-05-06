# StoreStudio AI

StoreStudio AI는 한국 SmartStore, Coupang, Instagram 판매자를 가정한 상품 이미지 생성 SaaS MVP입니다. 1-5장의 원본 상품 이미지를 업로드하면 흰 배경 컷, 썸네일, 라이프스타일 컷, 상세페이지 히어로 이미지를 하나의 커머스 이미지 세트로 만들도록 설계했습니다.

## 문제 의식

소규모 셀러는 상품 하나를 등록할 때도 채널별 이미지 규격, 배경 정리, 썸네일, 상세페이지용 대표 이미지를 반복해서 준비해야 합니다. StoreStudio AI는 업로드, 생성 작업, 크레딧, 내보내기, 운영 상태 점검을 한 화면에서 연결해 이미지 제작 흐름을 SaaS 형태로 검증합니다.

## 주요 기능

- 상품명, 카테고리, 판매 채널, 스타일 입력
- 프로젝트별 원본 이미지 업로드
- 기본 4종 결과물 생성: white-background, thumbnail, lifestyle, detail hero
- OpenAI 이미지 API provider와 로컬 mock fallback
- JSON 기반 로컬 스토어와 Supabase driver 분리
- 로컬 파일 저장과 R2 호환 스토리지 driver 분리
- 즉시 실행 job과 Trigger.dev driver 분리
- 크레딧 차감/환불, Toss Payments checkout/webhook 흐름
- 생성 결과 ZIP 내보내기
- 운영용 jobs/admin 화면과 환경변수 상태 점검 로직

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 앱 | Next.js App Router, React 19, TypeScript |
| 이미지 생성 | OpenAI Image API, local mock provider |
| 데이터 | 로컬 JSON store, Supabase Auth/Postgres driver |
| 스토리지 | 로컬 파일 저장, Cloudflare R2 호환 driver |
| 작업 실행 | 로컬 job runner, Trigger.dev driver |
| 결제 | Toss Payments 흐름 |
| 테스트 | Vitest |

## 프로젝트 구조

```text
storestudio-ai/
├── src/
│   ├── app/               # Next.js 페이지와 API routes
│   ├── components/        # StoreStudio 앱 UI
│   └── lib/               # 생성, 크레딧, export, server driver
├── supabase/migrations/   # Supabase 초기 스키마
├── docs/                  # 배포, smoke, beta QA 문서
├── scripts/               # 운영/검증 보조 스크립트
├── tests/                 # Vitest 테스트
└── .env.example
```

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:3000`을 엽니다.

개발 기본값은 로컬 저장소, JSON store, 로컬 job 실행, mock 이미지 생성을 사용합니다. `OPENAI_API_KEY`가 없으면 실제 이미지 API 대신 mock provider로 흐름을 확인할 수 있습니다.

## 환경변수

프로덕션 driver를 사용하려면 `.env.example`을 `.env.local`로 복사한 뒤 필요한 값을 채웁니다.

```bash
cp .env.example .env.local
```

주요 driver 설정:

```env
DATA_DRIVER=supabase
STORAGE_DRIVER=r2
JOB_DRIVER=trigger
AUTH_REQUIRED=true
ADMIN_UI_ENABLED=false
```

Supabase, R2, Trigger.dev, Toss Payments, OpenAI 관련 비밀키는 서버 환경변수로만 설정합니다.

## 검증

```bash
npm test
npx tsc --noEmit
npm run build
```

## 운영 메모

`docs/production-smoke.md`, `docs/vercel-deployment.md`, `docs/beta-qa-template.csv`에 배포 후 확인 항목과 베타 운영 메모가 정리되어 있습니다. 실제 운영 전에는 OpenAI 예산 제한, 사용자별 작업 제한, 관리자 토큰, 인증 필수 여부를 먼저 설정해야 합니다.
