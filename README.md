# StoreStudio AI

AI product-photo SaaS MVP for Korean SmartStore, Coupang, and Instagram sellers.

StoreStudio AI turns 1-5 source product images into a fixed commerce image set:

- White-background product cut
- 1:1 thumbnail
- Lifestyle cut
- Detail-page hero image

The app is built as a web SaaS first. It keeps local mock drivers for development, while production can use Supabase, Cloudflare R2, Trigger.dev, Toss Payments, and OpenAI image generation.

## Stack

- Next.js App Router
- TypeScript
- Supabase Auth/Postgres driver
- Cloudflare R2-compatible storage driver
- OpenAI Image API provider with local mock fallback
- Toss Payments credit flow
- Vitest

## Local Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

By default, development uses local storage, a JSON-backed store, local job execution, and mock image generation when `OPENAI_API_KEY` is not set.

## Environment

Copy `.env.example` to `.env.local` and fill production credentials when moving beyond local development.

Important production drivers:

- `DATA_DRIVER=supabase`
- `STORAGE_DRIVER=r2`
- `JOB_DRIVER=trigger`
- `AUTH_REQUIRED=true`

## Verification

```bash
npm test
npx tsc --noEmit
npm run build
```

## Production Setup Checklist

Use GitHub `main` as the production source branch and keep Vercel connected to this repository.

1. Create a Vercel project from `jinhyuk9714/storestudio-ai`.
2. Add the production and preview environment variables from `.env.example`.
3. Create a Supabase project and apply `supabase/migrations/0001_initial.sql`.
4. Enable Supabase email magic-link auth and set the Vercel production URL as an allowed redirect URL.
5. Create a Cloudflare R2 bucket and access key, then set `STORAGE_DRIVER=r2`.
6. Configure Trigger.dev or the `/api/jobs/generations/run` endpoint and set `JOB_DRIVER=trigger`.
7. Add Toss Payments test keys first and verify `starter_30` before live keys are used.
8. Add `OPENAI_API_KEY` only after budget limits are set.
9. Set `AUTH_REQUIRED=true`, `ADMIN_UI_ENABLED=false`, and a strong `ADMIN_TOKEN`.
10. Set `DAILY_OPENAI_BUDGET_KRW`, `MAX_JOBS_PER_USER_PER_DAY`, and `MAX_CONCURRENT_JOBS_PER_USER`.

## Beta Operations

- Run the production smoke checklist in `docs/production-smoke.md` after every deploy.
- Track Vercel deployment state and missing secrets in `docs/vercel-deployment.md`.
- Track output quality in `docs/beta-qa-template.csv`.
- Invite up to 20 beta users manually and keep trial grants at 3 credits per user.
- Treat 40% download rate and 50% "그대로 업로드 가능" decisions as the first success gate.
